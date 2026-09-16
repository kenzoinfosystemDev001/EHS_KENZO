import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayload, AuthenticatedUserContext, UserRoleScope } from '../interfaces/auth.interface';
import { AccessScope } from '@kenzo-ehs/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'kenzo_ehs_dev_jwt_access_secret_super_secure_key_2026_min32',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUserContext> {
    // 1. Verify session validity in PostgreSQL
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
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
                plant: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const { user } = session;
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive');
    }

    // 2. Extract current live permissions & scopes
    const roleCodes = Array.from(new Set(user.userRoles.map((ur) => ur.role.code as string)));
    const permissionCodesSet = new Set<string>();
    const roleScopes: UserRoleScope[] = [];

    for (const ur of user.userRoles) {
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
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      sessionId: session.id,
      roles: roleCodes,
      permissions: Array.from(permissionCodesSet),
      roleScopes,
    };
  }
}
