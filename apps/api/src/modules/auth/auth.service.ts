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

import { AuthThrottlerService } from "./auth-throttler.service";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly throttler: AuthThrottlerService,
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
    // 1. Enforce rate limiting and brute-force lockout protection
    this.throttler.assertLoginAllowed(ipAddress, dto.email);

    // Look up user by email with support for email aliases
    const rawEmail = dto.email.toLowerCase().trim();
    const EMAIL_ALIASES: Record<string, string> = {
      "contractor.coordinator@kenzo-ehs.com": "contractor.coord@kenzo-ehs.com",
      "environment.manager@kenzo-ehs.com": "environment.mgr@kenzo-ehs.com",
    };
    const lookupEmail = EMAIL_ALIASES[rawEmail] || rawEmail;

    const user = await this.prisma.user.findUnique({
      where: { email: lookupEmail },
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
      this.throttler.recordLoginFailure(ipAddress, dto.email);
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
      this.throttler.recordLoginFailure(ipAddress, dto.email);
      this.logger.warn(`Failed password attempt for user: ${dto.email}`);
      throw new UnauthorizedException("Invalid email or password");
    }

    // Credentials verified: reset failed attempt counter
    this.throttler.recordLoginSuccess(ipAddress, dto.email);

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
    this.throttler.assertRefreshAllowed(ipAddress, dto.refreshToken);
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
   * Revoke all active sessions for a user (Global Logout)
   */
  async logoutAll(userId: string): Promise<{ revokedCount: number }> {
    try {
      const result = await this.prisma.session.updateMany({
        where: { userId, isRevoked: false },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
      return { revokedCount: result.count };
    } catch {
      return { revokedCount: 0 };
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

    // 1. Universal Access: Every enterprise employee and contractor has rights to report & view core safety sections
    permissionCodesSet.add("OBSERVATION.READ");
    permissionCodesSet.add("OBSERVATION.CREATE");
    permissionCodesSet.add("INCIDENT.READ");
    permissionCodesSet.add("INCIDENT.CREATE");
    permissionCodesSet.add("HIRA.READ");
    permissionCodesSet.add("CAPA.READ");
    permissionCodesSet.add("PTW.READ");
    permissionCodesSet.add("TRAINING.READ");
    permissionCodesSet.add("REPORTS.READ");

    // 2. Add permissions from database RolePermission records
    for (const ur of userRoles) {
      const scope = (ur.scopeOverride || ur.role.scopeLevel) as AccessScope;
      roleScopes.push({
        roleCode: ur.role.code,
        scope,
        plantId: ur.plantId,
        departmentId: ur.departmentId,
      });

      if (ur.role.rolePermissions) {
        for (const rp of ur.role.rolePermissions) {
          if (rp.permission && rp.permission.code) {
            permissionCodesSet.add(rp.permission.code);
          }
        }
      }
    }

    // 3. Role-based fallback coverage for review & administrative duties
    const isSuperRole = roleCodes.some((r) =>
      ["ADMIN", "SYSTEM_ADMIN", "CORPORATE_HSE", "PLANT_HEAD"].includes(r),
    );
    const isSafetyLead = roleCodes.some((r) =>
      ["HSE_MANAGER", "SAFETY_OFFICER", "ENVIRONMENT_MANAGER", "OCCUPATIONAL_HEALTH_OFFICER"].includes(r),
    );
    const isSupervisorOrHead = roleCodes.some((r) =>
      ["SUPERVISOR", "DEPARTMENT_HEAD", "MAINTENANCE_HEAD", "CONTRACTOR_COORDINATOR"].includes(r),
    );

    if (isSuperRole || isSafetyLead || isSupervisorOrHead) {
      permissionCodesSet.add("OBSERVATION.REVIEW");
      permissionCodesSet.add("OBSERVATION.CLOSE");
      permissionCodesSet.add("ACTION.CREATE");
      permissionCodesSet.add("ACTION.READ");
      permissionCodesSet.add("ACTION.UPDATE");
      permissionCodesSet.add("ACTION.VERIFY");
      permissionCodesSet.add("ACTION.CLOSE");
      permissionCodesSet.add("HIRA.READ");
      permissionCodesSet.add("CAPA.READ");
      permissionCodesSet.add("INSPECTION.READ");
    }

    if (isSuperRole || isSafetyLead) {
      permissionCodesSet.add("HIRA.CREATE");
      permissionCodesSet.add("HIRA.REVIEW");
      permissionCodesSet.add("HIRA.APPROVE");
      permissionCodesSet.add("CAPA.CREATE");
      permissionCodesSet.add("CAPA.ASSIGN");
      permissionCodesSet.add("CAPA.CLOSE");
      permissionCodesSet.add("INSPECTION.CREATE");
      permissionCodesSet.add("INSPECTION.REVIEW");
      permissionCodesSet.add("AUDIT.READ");
      permissionCodesSet.add("AUDIT.PERFORM");
      permissionCodesSet.add("HEALTH.READ");
      permissionCodesSet.add("HEALTH.MANAGE");
      permissionCodesSet.add("CONTRACTOR.READ");
      permissionCodesSet.add("CONTRACTOR.MANAGE");
      permissionCodesSet.add("ENVIRONMENT.READ");
      permissionCodesSet.add("ENVIRONMENT.MANAGE");
      permissionCodesSet.add("EMERGENCY.READ");
      permissionCodesSet.add("EMERGENCY.MANAGE");
      permissionCodesSet.add("COMPLIANCE.READ");
      permissionCodesSet.add("COMPLIANCE.MANAGE");
      permissionCodesSet.add("AUDIT_LOG.READ");
    }

    if (isSuperRole) {
      permissionCodesSet.add("USER.READ");
      permissionCodesSet.add("USER.CREATE");
      permissionCodesSet.add("USER.UPDATE");
      permissionCodesSet.add("ROLE.ASSIGN");
      permissionCodesSet.add("ORGANIZATION.MANAGE");
      permissionCodesSet.add("PLANT.MANAGE");
      permissionCodesSet.add("DEPARTMENT.MANAGE");
    }

    return {
      roleCodes,
      permissionCodes: Array.from(permissionCodesSet),
      roleScopes,
    };
  }
}
