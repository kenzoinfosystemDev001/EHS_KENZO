import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUserContext } from '../../modules/auth/interfaces/auth.interface';
import { AccessScope } from '@kenzo-ehs/types';

@Injectable()
export class ScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUserContext;

    if (!user) {
      throw new ForbiddenException('User context missing');
    }

    // Determine target plantId & departmentId from body, params, or query
    const targetOrgId = request.params?.organizationId || request.body?.organizationId || user.organizationId;
    const targetPlantId = request.params?.plantId || request.body?.plantId || request.query?.plantId;
    const targetDeptId = request.params?.departmentId || request.body?.departmentId || request.query?.departmentId;

    // Strict Tenant Isolation: User can never access a different organization
    if (targetOrgId && targetOrgId !== user.organizationId) {
      throw new ForbiddenException('Cross-tenant data access strictly prohibited');
    }

    // If no specific plant is targeted, organization-level check passed
    if (!targetPlantId && !targetDeptId) {
      return true;
    }

    // Check user's role scopes
    const hasOrgOrGlobalScope = user.roleScopes.some(
      (s) => s.scope === AccessScope.SYSTEM || s.scope === AccessScope.ORGANIZATION || s.scope === AccessScope.ALL_PLANTS,
    );

    if (hasOrgOrGlobalScope) {
      return true;
    }

    // Check plant-level scope
    if (targetPlantId) {
      const allowedPlants = new Set(
        user.roleScopes
          .filter((s) => s.scope === AccessScope.OWN_PLANT && s.plantId)
          .map((s) => s.plantId),
      );

      if (!allowedPlants.has(targetPlantId)) {
        throw new ForbiddenException(`Access denied for Plant [${targetPlantId}] outside user scope`);
      }
    }

    // Check department-level scope
    if (targetDeptId) {
      const allowedDepts = new Set(
        user.roleScopes
          .filter((s) => s.scope === AccessScope.OWN_DEPARTMENT && s.departmentId)
          .map((s) => s.departmentId),
      );

      if (!allowedDepts.has(targetDeptId)) {
        throw new ForbiddenException(`Access denied for Department [${targetDeptId}] outside user scope`);
      }
    }

    return true;
  }
}
