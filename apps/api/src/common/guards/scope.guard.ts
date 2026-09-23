import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { AuthenticatedUserContext } from "../../modules/auth/interfaces/auth.interface";
import { AccessScope } from "@kenzo-ehs/types";

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user) {
      throw new ForbiddenException("User context missing");
    }

    // Determine target plantId & departmentId from body, params, or query
    const targetOrgId =
      request.params?.organizationId ||
      request.body?.organizationId ||
      user.organizationId;
    const targetPlantId =
      request.params?.plantId ||
      request.body?.plantId ||
      request.query?.plantId;
    const targetDeptId =
      request.params?.departmentId ||
      request.body?.departmentId ||
      request.query?.departmentId;

    // Strict Tenant Isolation: User can never access a different organization
    if (targetOrgId && targetOrgId !== user.organizationId) {
      throw new ForbiddenException(
        "Cross-tenant data access strictly prohibited",
      );
    }

    // If no specific plant is targeted, organization-level check passed
    if (!targetPlantId && !targetDeptId) {
      return true;
    }

    // Emergency SOS endpoints are strictly exempt from plant/department scope restrictions
    // (Life safety emergency alerts are universally permitted across the organization)
    const url = request.url || "";
    if (url.includes("/emergency/sos") || url.includes("/sos")) {
      return true;
    }

    // Creating/Reporting safety records (Incidents, Near Misses, Observations, CAPA, HIRA)
    // within the user's organization is universally permitted so any worker can report hazards.
    if (request.method === "POST") {
      return true;
    }

    // Check user's role scopes
    const hasOrgOrGlobalScope = user.roleScopes.some(
      (s) =>
        s.scope === AccessScope.SYSTEM ||
        s.scope === AccessScope.ORGANIZATION ||
        s.scope === AccessScope.ALL_PLANTS,
    );

    if (hasOrgOrGlobalScope) {
      return true;
    }

    const userPlantScopes = user.roleScopes.filter(
      (s) => s.scope === AccessScope.OWN_PLANT && s.plantId,
    );
    const userDeptScopes = user.roleScopes.filter(
      (s) => s.scope === AccessScope.OWN_DEPARTMENT && s.departmentId,
    );

    // Check plant-level scope only if user is explicitly restricted to specific plants
    if (targetPlantId) {
      const allowedPlants = new Set([
        ...userPlantScopes.map((s) => s.plantId),
        ...userDeptScopes
          .map((s) => s.plantId)
          .filter((id): id is string => Boolean(id)),
      ]);

      if (allowedPlants.size > 0 && !allowedPlants.has(targetPlantId)) {
        throw new ForbiddenException(
          `Access denied for Plant [${targetPlantId}] outside user scope`,
        );
      }
    }

    // Check department-level scope:
    // If user has OWN_PLANT scope covering this plant, all departments within that plant are accessible.
    // If user is restricted to OWN_DEPARTMENT, they may only access their specific assigned department.
    if (targetDeptId) {
      const hasPlantCoverage = targetPlantId
        ? userPlantScopes.some((s) => s.plantId === targetPlantId)
        : userPlantScopes.length > 0;

      if (!hasPlantCoverage) {
        const allowedDepts = new Set(userDeptScopes.map((s) => s.departmentId));
        if (!allowedDepts.has(targetDeptId)) {
          throw new ForbiddenException(
            `Access denied for Department [${targetDeptId}] outside user scope`,
          );
        }
      }
    }

    return true;
  }
}
