# 01 — EHS_KENZO Foundation Audit

**Document Reference:** `DOCS-PHASE1-001`  
**Status:** VERIFIED & COMPLETE  
**Date:** September 2026  
**Auditors:** Principal Software Architect, IAM/Security Architect, Database Architect

---

## 1. Executive Summary

This document establishes the empirical, line-by-line inspection of the **EHS_KENZO** enterprise monorepo located at `c:\Users\sujal.kumar\Downloads\EHS`. The objective is to identify all architectural vulnerabilities, transaction gaps, tenant isolation flaws, and security deficiencies before implementing the hardened Phase 1 foundation.

The codebase is an enterprise-grade TypeScript monorepo managed via `pnpm` workspaces:
- **Backend (`apps/api`):** NestJS 11, Express 5, Prisma ORM 6, PostgreSQL (Neon / RDS), Redis, Passport JWT.
- **Frontend (`apps/web`):** Next.js 15.5 App Router, Tailwind CSS, React 19.
- **Domain Packages (`packages/*`):** `@kenzo-ehs/types`, `@kenzo-ehs/config`, `@kenzo-ehs/utils`, `@kenzo-ehs/validation`, `@kenzo-ehs/ui`.
- **Database Schema (`prisma/schema.prisma`):** 1,855 lines containing 40+ models across 19 modules.

---

## 2. Empirical Vulnerability & Defect Register

### 2.1 Critical Security Vulnerabilities (P0)

| ID | Component | Location | Risk & Finding |
|---|---|---|---|
| **SEC-01** | API Auth Module | `apps/api/src/modules/auth/auth.module.ts:17-18` | **Fallback Production JWT Secret:** Code uses `configService.get("JWT_ACCESS_SECRET") || "kenzo_ehs_dev_jwt_access_secret_super_secure_key_2026_min32"`. If omitted in production, the system silently boots with a publicly exposed key. |
| **SEC-02** | Passport Strategy | `apps/api/src/modules/auth/strategies/jwt.strategy.ts:23-24` | **Duplicate Fallback Secret:** Hardcoded secret fallback repeated in Passport strategy validation. |
| **SEC-03** | Production Deployment | `docker-compose.prod.yml:50-51` | **Hardcoded Secrets in Docker Compose:** `JWT_SECRET:-super-secret-production-jwt-key-2026` and `JWT_REFRESH_SECRET:-super-secret-production-refresh-key-2026`. |
| **SEC-04** | Auth Gateway | `apps/api/src/main.ts`, `apps/api/src/modules/auth/` | **Missing Rate Limiting / Brute-Force Protection:** Neither `@nestjs/throttler` nor IP/user login attempt backoff is implemented. Login and refresh endpoints are vulnerable to credential stuffing and distributed denial-of-service. |
| **SEC-05** | Permissions Guard | `apps/api/src/common/guards/permissions.guard.ts:209` | **Hardcoded Role Superuser Bypass:** Contains `if (user.roles?.some((r) => ["SYSTEM_ADMIN", "ADMIN"].includes(r))) return true;`. Violates Principle 5: *Never implement security using if (role === 'admin')*. |

### 2.2 Multi-Tenancy & Tenant Isolation Flaws (P0)

| ID | Component | Location | Risk & Finding |
|---|---|---|---|
| **TEN-01** | Observations Service | `apps/api/src/modules/observations/observations.service.ts:641, 666, 715, 736` | **Tenant-Blind Update Operations:** `prisma.safetyObservation.update({ where: { id } })` executes without checking `organizationId: user.organizationId`. Users can mutate records belonging to other tenants (IDOR). |
| **TEN-02** | Database Models | `prisma/schema.prisma` | **Missing Composite Tenant Keys:** Operational tables (`SafetyObservation`, `Incident`, `PermitToWork`, `CapaRecord`) lack `@@unique([id, organizationId])` compound keys, allowing potential cross-tenant foreign key linkages. |
| **TEN-03** | Geographic Hierarchy | `prisma/schema.prisma:309-359` | **Cross-Site Tenant Drift:** `Department` has both `organizationId` and `plantId`, but lacks a composite foreign key ensuring `plant.organizationId === department.organizationId`. |

### 2.3 Workflow State & Transactional Deficiencies (P1)

| ID | Component | Location | Risk & Finding |
|---|---|---|---|
| **WKF-01** | Observations Service | `apps/api/src/modules/observations/observations.service.ts:644, 670, 717, 740` | **Direct Status Mutation Bypass:** Methods `review()`, `requireAction()`, `verify()`, and `close()` update `status` directly instead of invoking `WorkflowService.executeTransition()`. |
| **WKF-02** | Inspections / Actions | `apps/api/src/modules/inspections/`, `apps/api/src/modules/actions/` | **Incomplete Transaction Bundling:** Certain write operations execute outside a unified `$transaction` that combines business change, workflow step, audit log, and outbox event. |

### 2.4 Frontend Security & Client State Authority (P1)

| ID | Component | Location | Risk & Finding |
|---|---|---|---|
| **FE-01** | Auth Context | `apps/web/src/lib/auth-context.tsx:119-125` | **Client-Side Cache Hydration:** The web app hydrates user profile and permissions directly from `localStorage.getItem("kenzo_user_profile")` before server validation. |
| **FE-02** | Token Persistence | `apps/web/src/lib/auth-context.tsx:42-45` | **Plaintext Tokens in LocalStorage:** JWT access tokens and raw refresh tokens are persisted in browser `localStorage`. |

---

## 3. Inventory of Valid Architectural Patterns

The codebase already features several high-quality architectural foundations that will be preserved and hardened:
1. **Prisma Session Management:** Active database sessions track `refreshTokenHash` (SHA-256), IP address, User-Agent, and revocation flags (`isRevoked`, `revokedAt`).
2. **Immutable Audit Ledger:** `AuditService.log()` records `organizationId`, `plantId`, `actorId`, `action`, `entityType`, `entityId`, `beforeState`, `afterState`, computed `diff`, and `metadata`.
3. **Outbox Pattern:** `OutboxService.emit()` stages `OutboxEvent` records atomically within Prisma transactions.
4. **ScopeGuard RBAC/ABAC:** Enforces organizational and plant boundaries using `AccessScope` (`SYSTEM`, `ORGANIZATION`, `ALL_PLANTS`, `OWN_PLANT`, `OWN_DEPARTMENT`).
5. **HIRA Risk Engine:** Full server-side risk matrix calculation (`HiraRiskEngine`) with ALARP evaluation and unacceptable risk overrides.
