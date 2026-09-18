import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh.dto";
import {
  AuthenticatedUserContext,
  JwtPayload,
  UserRoleScope,
} from "./interfaces/auth.interface";
import { AccessScope } from "@kenzo-ehs/types";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Enterprise Login
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: AuthenticatedUserContext;
  }> {
    // Look up user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            plant: true,
            department: true,
          },
        },
      },
    });

    // Uniform authentication failure response to prevent user enumeration
    if (!user) {
      this.logger.warn(
        `Failed login attempt for non-existent user: ${dto.email}`,
      );
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(`Failed password attempt for user: ${dto.email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    // Verify account status
    if (user.status !== "ACTIVE") {
      this.logger.warn(
        `Login rejected for inactive/suspended account: ${dto.email} [${user.status}]`,
      );
      throw new ForbiddenException(
        `Account is ${user.status.toLowerCase()}. Please contact administrator.`,
      );
    }

    // Compile roles, permissions, and scopes
    const { roleCodes, permissionCodes, roleScopes } = this.extractAuthData(
      user.userRoles,
    );

    // Generate cryptographic refresh token & hash
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const refreshTokenHash = this.hashToken(rawRefreshToken);

    const refreshExpiryDays = 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);

    // Create database-backed server session
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt,
      },
    });

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate short-lived JWT Access Token
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      sessionId: session.id,
      roles: roleCodes,
      permissions: permissionCodes,
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    const userContext: AuthenticatedUserContext = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      sessionId: session.id,
      roles: roleCodes,
      permissions: permissionCodes,
      roleScopes,
    };

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      user: userContext,
    };
  }

  /**
   * Rotating Refresh Token Exchange with Reuse Detection
   */
  async refresh(
    dto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException("Refresh token is required");
    }
    const incomingTokenHash = this.hashToken(dto.refreshToken);

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: incomingTokenHash },
      include: {
        user: {
          include: {
            userRoles: {
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Reuse detection or invalid session
    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      if (session && session.isRevoked) {
        this.logger.error(
          `Suspicious refresh token reuse detected for session: ${session.id}!`,
        );
      }
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    if (session.user.status !== "ACTIVE") {
      throw new ForbiddenException("User account is no longer active");
    }

    // Rotate refresh token
    const newRawRefreshToken = crypto.randomBytes(40).toString("hex");
    const newRefreshTokenHash = this.hashToken(newRawRefreshToken);

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    // Update active session with rotated token
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        ipAddress: ipAddress ?? session.ipAddress,
        userAgent: userAgent ?? session.userAgent,
      },
    });

    const { roleCodes, permissionCodes } = this.extractAuthData(
      session.user.userRoles,
    );

    const jwtPayload: JwtPayload = {
      sub: session.user.id,
      email: session.user.email,
      organizationId: session.user.organizationId,
      sessionId: session.id,
      roles: roleCodes,
      permissions: permissionCodes,
    };

    const accessToken = this.jwtService.sign(jwtPayload);

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  /**
   * Session Revocation (Logout)
   */
  async logout(sessionId: string): Promise<{ revoked: boolean }> {
    try {
      await this.prisma.session.update({
        where: { id: sessionId },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
      return { revoked: true };
    } catch {
      return { revoked: false };
    }
  }

  /**
   * Get Current User Profile, Permissions & Scopes
   */
  async getCurrentUser(
    userId: string,
    sessionId: string,
  ): Promise<AuthenticatedUserContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            plant: true,
            department: true,
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("User not found or inactive");
    }

    const { roleCodes, permissionCodes, roleScopes } = this.extractAuthData(
      user.userRoles,
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      sessionId,
      roles: roleCodes,
      permissions: permissionCodes,
      roleScopes,
    };
  }

  /**
   * Helpers
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private extractAuthData(userRoles: any[]) {
    const roleCodes = Array.from(
      new Set(userRoles.map((ur) => ur.role.code as string)),
    );

    const permissionCodesSet = new Set<string>();
    const roleScopes: UserRoleScope[] = [];

    for (const ur of userRoles) {
      const scope = (ur.scopeOverride || ur.role.scopeLevel) as AccessScope;
      roleScopes.push({
        roleCode: ur.role.code,
        scope,
        plantId: ur.plantId,
        departmentId: ur.departmentId,
      });

      for (const rp of ur.role.rolePermissions) {
        permissionCodesSet.add(rp.permission.code);
      }
    }

    return {
      roleCodes,
      permissionCodes: Array.from(permissionCodesSet),
      roleScopes,
    };
  }
}
