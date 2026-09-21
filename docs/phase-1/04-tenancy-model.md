# 04 — Multi-Tenancy & Isolation Model

**Document Reference:** `DOCS-PHASE1-004`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Database Architect, Enterprise Systems Architect

---

## 1. Multi-Tenant Organizational Hierarchy

The Kenzo EHS platform enforces a strict five-tier organizational and geographic containment hierarchy:

```
                      ┌────────────────────────┐
                      │      Organization      │  (Tenant Boundary)
                      └───────────┬────────────┘
                                  │ 1:N
                                  ▼
                      ┌────────────────────────┐
                      │         Plant          │  (Site / Facility)
                      └───────────┬────────────┘
                                  │ 1:N
                                  ▼
                      ┌────────────────────────┐
                      │       Department       │  (Functional Division)
                      └───────────┬────────────┘
                                  │ 1:N
                                  ▼
                      ┌────────────────────────┐
                      │          Area          │  (Specific Physical Zone)
                      └───────────┬────────────┘
                                  │ 1:N
                                  ▼
                      ┌────────────────────────┐
                      │   Regulated Records    │  (HIRA, Incidents, PTW, etc.)
                      └────────────────────────┘
```

---

## 2. Invariant Rules of Tenant Isolation

1. **Organization as Sovereign Boundary:** An authenticated request belonging to Organization A can never read, create, mutate, or link data belonging to Organization B under any circumstance.
2. **Server-Derived Context:** The tenant ID (`organizationId`) must **never** be accepted from client request bodies, query strings, or unvalidated parameters. It must always be resolved from the authenticated JWT session (`user.organizationId`).
3. **Database-Level Isolation:** Every Prisma query must include `organizationId: user.organizationId` in its `where` clause.
4. **Hierarchical Consistency Enforcement:**
   - A Plant must belong to the record's `organizationId`.
   - A Department must belong to both the record's `organizationId` and `plantId`.
   - An Area must belong to the record's `departmentId` and `plantId`.
   - Any attempt to create a record with mismatched hierarchy (e.g. `plantId` of Org B inside a record of Org A) is rejected at both the service and database layers.
5. **No IDOR (Insecure Direct Object Reference):** Knowing or guessing a UUID belonging to another organization returns a standard `404 Not Found`, identical to a non-existent record, preventing tenant enumeration.

---

## 3. Request Context Pattern

Services consume an immutable `AuthenticatedUserContext` injected via `@CurrentUser()`:

```typescript
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

export interface UserRoleScope {
  roleCode: string;
  scope: AccessScope;
  plantId?: string | null;
  departmentId?: string | null;
}
```

All data queries apply tenant filtering:

```typescript
// CANONICAL SAFE QUERY PATTERN
const record = await this.prisma.safetyObservation.findFirst({
  where: {
    id: recordId,
    organizationId: user.organizationId,
    deletedAt: null,
  },
});
if (!record) {
  throw new NotFoundException(`Record [${recordId}] not found`);
}
```
