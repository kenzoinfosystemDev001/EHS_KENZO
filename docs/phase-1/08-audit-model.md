# 08 — Immutable Audit Trail Architecture

**Document Reference:** `DOCS-PHASE1-008`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** EHS Compliance Architect, Security Engineer

---

## 1. Compliance Requirements (ISO 45001, OSHA, EPA)

In enterprise EHS systems, auditability is a primary statutory requirement. Under ISO 45001:2018 (Clause 9.1) and OSHA 1904/1910 regulations:
- Every privileged operation, hazard report, risk assessment revision, and permit approval must produce an immutable electronic record.
- Records must record: **Who** (actor identity), **When** (timestamp with millisecond precision), **What** (entity type and ID), **Where** (plant/site context, IP address), **Why** (mandatory business justification), and **Which values changed** (field-level delta).
- Hard deletion of regulated safety records is strictly prohibited.

---

## 2. Audit Ledger Schema & Integrity

The `AuditLog` model in PostgreSQL provides the authoritative historical ledger:

```prisma
model AuditLog {
  id              String       @id @default(uuid())
  organizationId  String
  plantId         String?
  actorId         String
  action          String       // e.g. HIRA.APPROVE, INCIDENT.CLASSIFY
  entityType      String       // e.g. HiraStudy, Incident, SafetyObservation
  entityId        String
  requestId       String?      // Correlation ID from X-Request-Id header
  ipAddress       String?
  userAgent       String?
  beforeState     Json?        // Full snapshot before mutation
  afterState      Json?        // Full snapshot after mutation
  diff            Json?        // Structured field delta: { field: { before, after } }
  reason          String?      // Business justification
  metadata        Json?
  timestamp       DateTime     @default(now())

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)
  plant           Plant?       @relation(fields: [plantId], references: [id], onDelete: Restrict)
  actor           User         @relation(fields: [actorId], references: [id], onDelete: Restrict)

  @@index([organizationId])
  @@index([plantId])
  @@index([entityType, entityId])
  @@index([actorId, timestamp])
  @@index([timestamp])
}
```

---

## 3. Automated State Diffing

`AuditService` computes structured JSON field differences:

```typescript
private calculateDiff(
  before?: Record<string, unknown> | null,
  after?: Record<string, unknown> | null,
): Record<string, { before: unknown; after: unknown }> | null {
  if (!before || !after) return null;
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diff[key] = {
        before: before[key] ?? null,
        after: after[key] ?? null,
      };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}
```

---

## 4. Transactional Immutability Guarantee

`AuditService.log()` accepts an optional `tx: Prisma.TransactionClient`. When called within a transaction, the audit record is committed synchronously with the business mutation. If the business mutation fails, the audit write rolls back; if the audit write fails, the business mutation rolls back.
