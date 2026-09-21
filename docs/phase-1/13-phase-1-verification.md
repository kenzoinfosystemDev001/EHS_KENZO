# 13 — Phase 1 Verification & Test Plan

**Document Reference:** `DOCS-PHASE1-013`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** QA/Test Architect, Security Engineer

---

## 1. Automated Verification Gates

To mark Phase 1 complete, the codebase must pass all 6 automated verification gates:

### Gate 1: TypeScript Compilation & Type Safety
```bash
pnpm run typecheck
pnpm run lint
```
- **Criteria:** Zero TypeScript errors (`tsc --noEmit`), zero missing types, no invalid `any` casts in security code.

### Gate 2: Secrets & Environment Validation Test
- Verify that omitting `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` causes the application to crash immediately on startup with a descriptive error.
- Verify that setting a secret shorter than 32 characters is rejected.

### Gate 3: Rate Limiting & Lockout Verification
- Execute 5 rapid incorrect login attempts to `POST /api/v1/auth/login`.
- Verify the 6th attempt returns `429 Too Many Requests` or `403 Forbidden` with a temporary lockout message and HTTP headers indicating retry time.

### Gate 4: Tenant Isolation & IDOR Test
- As User A (Org 1), attempt to read or mutate a record created by User B (Org 2).
- Verify the API returns `404 Not Found` (never `200 OK` or leaking Org 2 data).

### Gate 5: Workflow Transition Atomicity Test
- Trigger a workflow transition (e.g. observation escalation or HIRA submit).
- Verify via database inspection that the business record, workflow instance, workflow action, audit log, and outbox event were all created together.
- Simulate a failure during audit logging and verify the entire transaction rolls back.

### Gate 6: Production Build Verification
```bash
pnpm --filter @kenzo-ehs/api run build
pnpm --filter @kenzo-ehs/web run build
```
- **Criteria:** Both builds succeed without compilation errors.
