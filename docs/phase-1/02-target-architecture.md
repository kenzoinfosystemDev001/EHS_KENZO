# 02 — Target Architecture Specification

**Document Reference:** `DOCS-PHASE1-002`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Enterprise Systems Architect, IAM Architect, Database Architect

---

## 1. System Architecture Overview

The target architecture establishes a resilient, modular foundation for all present and future EHS modules (HIRA, Incidents, PTW, CAPA, Observations, Audits, Inspections, etc.).

```
                    ┌────────────────────────────────────────┐
                    │          Next.js Web Client            │
                    │   Permission-Aware UI (Client State)   │
                    └───────────────────┬────────────────────┘
                                        │ HTTPS / JSON / Cookie
                                        ▼
                    ┌────────────────────────────────────────┐
                    │            API / REST Gateway          │
                    │                /api/v1                 │
                    │   Helmet, Rate Limiter, RequestId      │
                    └───────────────────┬────────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             ▼                          ▼                          ▼
      ┌─────────────┐            ┌─────────────┐            ┌─────────────┐
      │ Auth / IAM  │            │ AuthZ Guard │            │  Workflow   │
      │ Session Mgr │            │ RBAC + ABAC │            │   Engine    │
      └──────┬──────┘            └──────┬──────┘            └──────┬──────┘
             │                          │                          │
             └──────────────────────────┼──────────────────────────┘
                                        ▼
                    ┌────────────────────────────────────────┐
                    │            Domain Services             │
                    │   HIRA, Incident, PTW, CAPA, Obs, etc  │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │           Prisma ORM Layer             │
                    │    $transaction Atomic Operations      │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      PostgreSQL (System of Record)     │
                    │                                        │
                    │  - Tenant Data (Composite Keys)        │
                    │  - Workflow Instances & Tasks          │
                    │  - Immutable Audit Logs & Diffs        │
                    │  - Server Sessions & Revocation        │
                    │  - Outbox Events Table                 │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │         Outbox Worker / Redis          │
                    │   Event Dispatch & Webhooks / Alerts   │
                    └────────────────────────────────────────┘
```

---

## 2. Core Subsystems

### 2.1 Identity, Session & Token Management
- **Stateless Access Tokens:** Signed JWTs (15-minute lifespan) containing `sub` (userId), `organizationId`, `sessionId`, `roles`, and initial permissions.
- **Stateful Database Sessions:** Active sessions stored in `Session` table with SHA-256 hashed refresh tokens (`refreshTokenHash`), user agent, IP address, expiration date, and revocation timestamps.
- **Refresh Token Rotation:** Every refresh invocation consumes the old refresh token, generates a new cryptographic 40-byte hex token, hashes it, updates the session, and issues a new access token.
- **Replay Detection:** If a revoked or consumed refresh token hash is presented, the entire session tree is immediately invalidated and logged as a security alert.

### 2.2 Dual-Layer Authorization (RBAC + ABAC)
- **Layer 1: Action-Oriented Permission Guard (`PermissionsGuard`):** Validates that the active user possesses the required `RESOURCE.ACTION` canonical permission (e.g., `HIRA.APPROVE`, `PTW.CREATE`, `INCIDENT.CLOSE`).
- **Layer 2: Multi-Plant & Organizational Scope Guard (`ScopeGuard`):** Validates that the target resource's `organizationId`, `plantId`, and `departmentId` match the user's role scope hierarchy (`SYSTEM`, `ORGANIZATION`, `ALL_PLANTS`, `OWN_PLANT`, `OWN_DEPARTMENT`, `OWN_AREA`, `ASSIGNED_RECORDS`, `OWN_RECORDS`).

### 2.3 Universal Workflow Engine
- All regulated status changes are driven by explicit domain actions rather than generic `PATCH /resource/:id { status }`.
- Validations, transitions, and task assignments are orchestrated via `WorkflowService.executeTransition()`.
- State machines are explicitly declared with strict transition dictionaries.

### 2.4 Transactional Integrity & Auditability
Every critical mutation must execute inside a PostgreSQL transaction (`prisma.$transaction`) bundling:
1. **Business Entity Mutation:** Data update or creation.
2. **Workflow Transition:** Advancement of `WorkflowInstance` and generation of `WorkflowAction`.
3. **Task Assignment / Completion:** Marking prior `WorkflowTask` records as completed and generating next-step tasks.
4. **Immutable Audit Entry:** Creation of `AuditLog` containing before/after states and calculated field diffs.
5. **Outbox Event Stage:** Creation of `OutboxEvent` staging the domain event for downstream asynchronous delivery.
