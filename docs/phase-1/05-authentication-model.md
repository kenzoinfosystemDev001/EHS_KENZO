# 05 — Authentication & IAM Architecture

**Document Reference:** `DOCS-PHASE1-005`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Senior NestJS Engineer, IAM Architect

---

## 1. Authentication Engine Architecture

The authentication subsystem is split into two complementary layers:
1. **Stateless Edge Verification:** High-throughput, low-latency validation via short-lived JWT Access Tokens (15-minute TTL).
2. **Stateful Database Session Ledger:** Centralized session control, token revocation, device tracking, and refresh token rotation in PostgreSQL.

---

## 2. Token Lifecycle & Rotation Specifications

```
  Client (Web / Mobile)                       Auth API (/api/v1/auth)                     PostgreSQL (Session Table)
      │                                                 │                                             │
      │── 1. POST /auth/login (email, password) ───────>│                                             │
      │                                                 │── Validate credentials & status ───────────>│
      │                                                 │── Create Session (hash(rawRefreshToken)) ──>│
      │<─ 2. Returns { accessToken, refreshToken } ─────│                                             │
      │                                                 │                                             │
      │   (15 minutes pass; Access Token expires)       │                                             │
      │                                                 │                                             │
      │── 3. POST /auth/refresh (refreshToken) ────────>│                                             │
      │                                                 │── Lookup session by hash(refreshToken) ────>│
      │                                                 │── Check: isRevoked? expiresAt < now? ───────│
      │                                                 │── Generate newRefreshToken ─────────────────│
      │                                                 │── UPDATE session SET hash = newHash ───────>│
      │<─ 4. Returns { newAccessToken, newRefreshToken }│                                             │
      │                                                 │                                             │
      │── 5. POST /auth/logout ────────────────────────>│                                             │
      │                                                 │── UPDATE session SET isRevoked=true ───────>│
      │<─ 6. Returns { revoked: true } ─────────────────│                                             │
```

---

## 3. Strict Environment Validation (No Fallbacks)

At NestJS initialization, `ConfigModule` validates all required environment variables using class-validator or a Joi/Zod schema:

```typescript
export class EnvironmentVariables {
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsNotEmpty()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @IsNotEmpty()
  @MinLength(32)
  JWT_REFRESH_SECRET: string;

  @IsEnum(['development', 'production', 'test'])
  NODE_ENV: string;
}
```

If `JWT_ACCESS_SECRET` is undefined, the server halts immediately with exit code 1.

---

## 4. Account Lifecycle & Security States

The `UserStatus` enum in PostgreSQL governs access:
- `ACTIVE`: Normal access permitted.
- `INACTIVE`: Login rejected immediately with `403 Forbidden: Account is inactive`.
- `SUSPENDED`: Login rejected with `403 Forbidden: Account is suspended`. Active sessions revoked immediately.
- `INVITED`: Account created but password not yet initialized. Requires setup before login.

---

## 5. Security Headers & Cookie Policy

All authentication responses enforce standard HTTP security:
- `HttpOnly`: Accessible only to the HTTP server (prevents XSS exfiltration).
- `Secure`: Transmitted only over HTTPS in production.
- `SameSite=Lax` or `SameSite=Strict`: Mitigates Cross-Site Request Forgery (CSRF).
- `Path=/api/v1/auth`: Cookie scoped strictly to authentication routes.
