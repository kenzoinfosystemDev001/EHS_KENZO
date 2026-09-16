import { AccessScope } from "@kenzo-ehs/types";

export interface JwtPayload {
  sub: string; // User UUID
  email: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

export interface UserRoleScope {
  roleCode: string;
  scope: AccessScope;
  plantId?: string | null;
  departmentId?: string | null;
}

export interface AuthenticatedUserContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  roleScopes: UserRoleScope[];
}
