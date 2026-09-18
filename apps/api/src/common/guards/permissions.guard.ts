import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { Permission } from "@kenzo-ehs/types";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user) {
      throw new ForbiddenException("Access denied: User authentication missing");
    }

    // Superusers have access across all endpoints
    if (user.roles?.some((r) => ["SYSTEM_ADMIN", "ADMIN"].includes(r))) {
      return true;
    }

    // Universal hazard reporting: All enterprise roles can read and create safety observations
    const isOnlyObservationAccess = requiredPermissions.every((p) =>
      p === "OBSERVATION.READ" || p === "OBSERVATION.CREATE"
    );
    if (isOnlyObservationAccess) {
      return true;
    }

    if (!user.permissions) {
      throw new ForbiddenException("Access denied: User permissions missing");
    }

    // Check if user has ALL required permissions
    const userPermissionsSet = new Set(user.permissions);
    const hasAll = requiredPermissions.every((perm) =>
      userPermissionsSet.has(perm),
    );

    if (!hasAll) {
      const missing = requiredPermissions.filter(
        (p) => !userPermissionsSet.has(p),
      );
      throw new ForbiddenException(
        `Access denied: Missing required permission(s) [${missing.join(", ")}]`,
      );
    }

    return true;
  }
}
