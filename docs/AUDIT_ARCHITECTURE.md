# Kenzo EHS — Audit & Compliance Architecture

---

## 1. Immutable Audit Logging Standard

Every critical business action inside Kenzo EHS writes an immutable entry into the `audit_logs` table within the same database transaction as the mutation itself.

### Key Audit Attributes Captured:

1. **`id`**: Unique UUID PK.
2. **`organizationId`**: Tenant partition.
3. **`plantId`**: Geographic facility identifier.
4. **`actorId`**: Authenticated user UUID.
5. **`action`**: Standardized permission-aligned action verb (e.g. `HIRA.CREATE`, `HIRA.SUBMIT`, `HIRA.APPROVE`).
6. **`entityType`** & **`entityId`**: Target entity.
7. **`beforeState`** & **`afterState`**: JSONB snapshots.
8. **`diff`**: Pre-computed structured JSON delta of mutated fields.
9. **`ipAddress`** & **`userAgent`**: Network origin telemetry.
10. **`requestId`**: Correlating HTTP request identifier (`x-request-id`).
11. **`createdAt`**: Authoritative database timestamp.

---

## 2. Immutability Enforcements

- No `UPDATE` or `DELETE` API endpoints exist for the `audit_logs` table.
- Database roles configured for application connections can be restricted from issuing `UPDATE` or `DELETE` on `audit_logs`.
- Pre-computed diffs allow direct compliance inspection without reconstructing historical state.
