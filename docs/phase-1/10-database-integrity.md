# 10 — Database Integrity & Relational Hardening

**Document Reference:** `DOCS-PHASE1-010`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** PostgreSQL/Prisma Architect, Senior Database Engineer

---

## 1. Relational Integrity Challenges in Enterprise Multi-Tenancy

In multi-tenant schemas where all tenants share a common PostgreSQL database:
- Relying exclusively on single-column UUID primary keys (`id @id @default(uuid())`) makes it syntactically possible to link a child record belonging to Organization A with a parent record belonging to Organization B.
- Example: An `Incident` in Organization A linking to an `Employee` or `Plant` in Organization B.
- To prevent this class of bug, PostgreSQL foreign keys and Prisma relations must enforce composite constraints wherever feasible.

---

## 2. Hardened Entity Hierarchy & Composite Keys

### 2.1 Geographic Hierarchy Hardening
1. **`Plant` Table:**
   - Composite unique constraint: `@@unique([organizationId, code])`
   - Primary key: `id`
   - Composite unique key: `@@unique([id, organizationId])`
2. **`Department` Table:**
   - Relation to Plant: Ensures `plant.organizationId === department.organizationId`
   - Composite unique constraint: `@@unique([plantId, code])`
   - Composite unique key: `@@unique([id, organizationId])`
3. **`Area` Table:**
   - Belongs to Department and Plant
   - Composite unique constraint: `@@unique([departmentId, code])`

### 2.2 Domain Entities & Soft Deletion

All regulated operational tables implement soft deletion:

| Model | Primary Key | Composite Key | Soft Delete Column | Index Strategy |
|---|---|---|---|---|
| `SafetyObservation` | `id` | `@@unique([id, organizationId])` | `deletedAt DateTime?` | `[organizationId], [plantId], [status], [deletedAt]` |
| `Incident` | `id` | `@@unique([id, organizationId])` | `deletedAt DateTime?` | `[organizationId], [plantId], [status], [incidentDate]` |
| `PermitToWork` | `id` | `@@unique([id, organizationId])` | `deletedAt DateTime?` | `[organizationId], [plantId], [status], [plannedStartDate]` |
| `CapaRecord` | `id` | `@@unique([id, organizationId])` | `deletedAt DateTime?` | `[organizationId], [plantId], [status], [dueDate]` |
| `HiraStudy` | `id` | `@@unique([id, organizationId])` | `deletedAt DateTime?` | `[organizationId], [plantId], [status], [version]` |

---

## 3. Query Guidelines for Zero Tenant Leakage

When querying by ID in services:

```typescript
// NEVER DO:
await prisma.safetyObservation.findUnique({ where: { id } });

// ALWAYS DO:
await prisma.safetyObservation.findFirst({
  where: {
    id,
    organizationId: user.organizationId,
    deletedAt: null,
  },
});
```

When updating records:

```typescript
// NEVER DO:
await prisma.safetyObservation.update({ where: { id }, data: { ... } });

// ALWAYS DO (Enforcing tenant boundary during mutation):
const count = await prisma.safetyObservation.count({
  where: { id, organizationId: user.organizationId },
});
if (count === 0) throw new NotFoundException('Observation not found');

await prisma.safetyObservation.update({
  where: { id },
  data: { ... },
});
```
