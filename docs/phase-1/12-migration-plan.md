# 12 — Migration & Implementation Plan

**Document Reference:** `DOCS-PHASE1-012`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Principal Software Architect, Release Engineer

---

## 1. Zero-Downtime Migration Philosophy

1. **Non-Destructive Schema Evolution:** Prisma schema alterations must preserve all existing production rows. Column additions must be nullable or provide safe defaults.
2. **Backward Compatibility:** Existing login credentials (e.g. `KenzoEHS@2026!`), user accounts, and test workflows must continue operating seamlessly.
3. **Fail-Fast Safeguards:** Code changes must fail compilation immediately (`tsc --noEmit`) if any typing or contractual invariant is broken.

---

## 2. Step-by-Step Execution Sequence

### Phase 1.1: Security & Environment Hardening
1. Create `apps/api/src/config/env.validation.ts` to strictly validate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL` at NestJS bootstrap.
2. Remove all fallback secrets in `auth.module.ts`, `jwt.strategy.ts`, and `docker-compose.prod.yml`.
3. Implement `AuthThrottlerService` or `@nestjs/throttler` in `AuthModule` with configurable limits (`AUTH_LOGIN_MAX_ATTEMPTS=5`, `AUTH_LOGIN_WINDOW_SECONDS=300`, `AUTH_LOGIN_LOCK_SECONDS=900`).

### Phase 1.2: Authorization Hardening
1. Cleanse `PermissionsGuard` of arbitrary role bypasses (`if (role === 'admin')`).
2. Replace hardcoded role overrides with unified permission derivation where every role maps to standard permissions stored in DB or loaded dynamically.
3. Ensure `ScopeGuard` validates resource ownership and plant scopes on all write/update endpoints.

### Phase 1.3: Multi-Tenancy & IDOR Prevention
1. Refactor `ObservationsService.review()`, `requireAction()`, `verify()`, and `close()` to enforce `organizationId: user.organizationId`.
2. Refactor state changes in `ObservationsService` to route through atomic transactions and the workflow engine.
3. Verify all other services (`IncidentService`, `PtwService`, `CapaService`, `HiraService`, `ActionsService`) apply consistent tenant filtering on `findUnique`/`findFirst` and `update`.

### Phase 1.4: Client-Side State Alignment
1. In `apps/web/src/lib/auth-context.tsx`, remove reliance on `localStorage` as the source of truth for permissions. Permissions and roles must be sourced from `/auth/me` on session initialization.
2. Ensure UI components handle loading and permission checks gracefully without flashing unauthorized states.
