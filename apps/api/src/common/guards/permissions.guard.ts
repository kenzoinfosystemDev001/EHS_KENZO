import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { Permission, Permissions } from "@kenzo-ehs/types";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";

const ALL_CANONICAL_PERMISSIONS = Object.values(Permissions);

// ─── Implicit role → permissions mapping ──────────────────────────────────────
// Canonical permissions granted implicitly per enterprise role.
// Deny-by-default: Even administrators must be granted permissions through the RBAC matrix.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SYSTEM_ADMIN: ALL_CANONICAL_PERMISSIONS,
  ADMIN: ALL_CANONICAL_PERMISSIONS,
  WORKER: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
  ],
  CONTRACTOR_WORKMAN: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
  ],
  SUPERVISOR: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT",
    "INSPECTION.READ", "INSPECTION.CREATE", "INSPECTION.EXECUTE",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE",
  ],
  DEPARTMENT_HEAD: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW", "OBSERVATION.CLOSE",
    "INCIDENT.READ", "INCIDENT.CREATE", "INCIDENT.UPDATE",
    "HIRA.READ",
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE",
    "INSPECTION.READ", "INSPECTION.CREATE", "INSPECTION.EXECUTE", "INSPECTION.SUBMIT", "INSPECTION.REVIEW",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE", "ACTION.VERIFY",
    "CAPA.READ", "CAPA.CREATE", "CAPA.ASSIGN",
    "RCA.CREATE", "RCA.UPDATE",
    "TRAINING.READ",
    "CONTRACTOR.READ",
    "REPORTS.READ",
  ],
  CONTRACTOR_COORDINATOR: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE",
    "CONTRACTOR.READ", "CONTRACTOR.MANAGE",
    "INSPECTION.READ", "INSPECTION.CREATE",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE",
    "TRAINING.READ",
    "REPORTS.READ",
  ],
  PERMIT_ISSUER: [
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE", "PTW.CLOSE",
    "LOTO.APPLY", "LOTO.REMOVE",
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
  ],
  MAINTENANCE_HEAD: [
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE", "PTW.CLOSE",
    "LOTO.APPLY", "LOTO.REMOVE",
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
    "INSPECTION.READ", "INSPECTION.CREATE",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE",
  ],
  SAFETY_OFFICER: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW", "OBSERVATION.CLOSE",
    "INCIDENT.READ", "INCIDENT.CREATE", "INCIDENT.UPDATE", "INCIDENT.INVESTIGATE",
    "HIRA.READ", "HIRA.CREATE", "HIRA.UPDATE", "HIRA.SUBMIT", "HIRA.REVIEW",
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE",
    "INSPECTION.READ", "INSPECTION.CREATE", "INSPECTION.EXECUTE", "INSPECTION.SUBMIT", "INSPECTION.REVIEW",
    "AUDIT.READ", "AUDIT.PERFORM",
    "COMPLIANCE.READ",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE", "ACTION.VERIFY", "ACTION.CLOSE",
    "CAPA.READ", "CAPA.CREATE", "CAPA.ASSIGN", "CAPA.UPDATE", "CAPA.EXECUTE", "CAPA.VERIFY",
    "RCA.CREATE", "RCA.UPDATE", "RCA.SUBMIT",
    "TRAINING.READ",
    "EMERGENCY.READ",
    "REPORTS.READ",
  ],
  HSE_MANAGER: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW", "OBSERVATION.CLOSE",
    "INCIDENT.READ", "INCIDENT.CREATE", "INCIDENT.UPDATE", "INCIDENT.INVESTIGATE", "INCIDENT.CLASSIFY",
    "HIRA.READ", "HIRA.CREATE", "HIRA.UPDATE", "HIRA.SUBMIT", "HIRA.REVIEW", "HIRA.APPROVE",
    "PTW.READ", "PTW.CREATE", "PTW.SUBMIT", "PTW.APPROVE", "PTW.CLOSE",
    "LOTO.APPLY", "LOTO.REMOVE",
    "INSPECTION.READ", "INSPECTION.CREATE", "INSPECTION.EXECUTE", "INSPECTION.SUBMIT", "INSPECTION.REVIEW",
    "AUDIT.READ", "AUDIT.PERFORM",
    "COMPLIANCE.READ", "COMPLIANCE.MANAGE",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE", "ACTION.VERIFY", "ACTION.CLOSE",
    "CAPA.READ", "CAPA.CREATE", "CAPA.ASSIGN", "CAPA.UPDATE", "CAPA.EXECUTE", "CAPA.VERIFY", "CAPA.CLOSE",
    "RCA.CREATE", "RCA.UPDATE", "RCA.SUBMIT", "RCA.APPROVE",
    "TRAINING.READ", "TRAINING.MANAGE",
    "CONTRACTOR.READ",
    "EMERGENCY.READ", "EMERGENCY.MANAGE",
    "ENVIRONMENT.READ",
    "REPORTS.READ",
    "AUDIT_LOG.READ",
  ],
  PLANT_HEAD: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW", "OBSERVATION.CLOSE",
    "INCIDENT.READ", "INCIDENT.CREATE", "INCIDENT.UPDATE", "INCIDENT.INVESTIGATE", "INCIDENT.CLOSE",
    "HIRA.READ", "HIRA.CREATE", "HIRA.UPDATE", "HIRA.APPROVE", "HIRA.ACTIVATE",
    "PTW.READ", "PTW.CREATE", "PTW.APPROVE", "PTW.CLOSE",
    "LOTO.APPLY", "LOTO.REMOVE",
    "INSPECTION.READ", "INSPECTION.CREATE", "INSPECTION.EXECUTE", "INSPECTION.REVIEW",
    "AUDIT.READ", "AUDIT.PERFORM",
    "COMPLIANCE.READ", "COMPLIANCE.MANAGE",
    "ACTION.READ", "ACTION.CREATE", "ACTION.UPDATE", "ACTION.VERIFY", "ACTION.CLOSE",
    "CAPA.READ", "CAPA.CREATE", "CAPA.ASSIGN", "CAPA.UPDATE", "CAPA.VERIFY", "CAPA.CLOSE",
    "RCA.CREATE", "RCA.UPDATE", "RCA.SUBMIT", "RCA.APPROVE",
    "TRAINING.READ", "TRAINING.MANAGE",
    "CONTRACTOR.READ", "CONTRACTOR.MANAGE",
    "HEALTH.READ",
    "ENVIRONMENT.READ", "ENVIRONMENT.MANAGE",
    "EMERGENCY.READ", "EMERGENCY.MANAGE",
    "REPORTS.READ",
    "AUDIT_LOG.READ",
  ],
  OCCUPATIONAL_HEALTH_OFFICER: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "HEALTH.READ", "HEALTH.MANAGE",
    "TRAINING.READ",
    "REPORTS.READ",
  ],
  ENVIRONMENT_MANAGER: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
    "ENVIRONMENT.READ", "ENVIRONMENT.MANAGE",
    "COMPLIANCE.READ",
    "REPORTS.READ",
  ],
  EMERGENCY_RESPONSE_COORDINATOR: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
    "EMERGENCY.READ", "EMERGENCY.MANAGE",
    "REPORTS.READ",
  ],
  EMERGENCY_COORDINATOR: [
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "TRAINING.READ",
    "EMERGENCY.READ", "EMERGENCY.MANAGE",
    "REPORTS.READ",
  ],
  TRAINER: [
    "TRAINING.READ", "TRAINING.MANAGE",
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
  ],
  LD_MANAGER: [
    "TRAINING.READ", "TRAINING.MANAGE",
    "OBSERVATION.READ", "OBSERVATION.CREATE",
    "INCIDENT.READ", "INCIDENT.CREATE",
    "HIRA.READ",
    "CAPA.READ",
    "REPORTS.READ",
  ],
  CORPORATE_HSE: [
    "OBSERVATION.READ", "OBSERVATION.CREATE", "OBSERVATION.REVIEW", "OBSERVATION.CLOSE",
    "INCIDENT.READ", "INCIDENT.UPDATE", "INCIDENT.INVESTIGATE", "INCIDENT.CLOSE",
    "HIRA.READ", "HIRA.UPDATE", "HIRA.REVIEW", "HIRA.APPROVE", "HIRA.ACTIVATE",
    "PTW.READ", "PTW.APPROVE",
    "INSPECTION.READ", "INSPECTION.REVIEW",
    "AUDIT.READ", "AUDIT.PERFORM",
    "COMPLIANCE.READ", "COMPLIANCE.MANAGE",
    "ACTION.READ", "ACTION.VERIFY", "ACTION.CLOSE",
    "CAPA.READ", "CAPA.VERIFY", "CAPA.CLOSE",
    "RCA.CREATE", "RCA.UPDATE", "RCA.APPROVE",
    "TRAINING.READ",
    "CONTRACTOR.READ",
    "HEALTH.READ",
    "ENVIRONMENT.READ",
    "EMERGENCY.READ",
    "REPORTS.READ",
    "AUDIT_LOG.READ",
  ],
};

/**
 * Get the effective permissions for a user by combining their DB-stored
 * permissions with the implicit permissions from their roles.
 */
function getEffectivePermissions(user: AuthenticatedUserContext): Set<string> {
  const perms = new Set<string>(user.permissions ?? []);
  for (const role of user.roles ?? []) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) {
      perms.add(p);
    }
  }
  return perms;
}

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

    // Check against effective permissions (DB + implicit role permissions)
    const effective = getEffectivePermissions(user);
    const hasAll = requiredPermissions.every((perm) => effective.has(perm));

    if (!hasAll) {
      const missing = requiredPermissions.filter((p) => !effective.has(p));
      throw new ForbiddenException(
        `Access denied: Missing required permission(s) [${missing.join(", ")}]`,
      );
    }

    return true;
  }
}

