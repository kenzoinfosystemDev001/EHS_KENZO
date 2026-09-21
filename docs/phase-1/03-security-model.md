# 03 — Security Model Specification

**Document Reference:** `DOCS-PHASE1-003`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Enterprise Security Engineer, IAM Architect

---

## 1. Zero-Trust Principles & Invariants

1. **Deny by Default:** Every endpoint, service method, and database query rejects access unless an explicit permission, tenant match, and valid scope grant it.
2. **Backend as Sole Authority:** The browser client is treated as completely untrusted. No permission, role, or tenant context supplied by the client headers, body, or URL params overrides the server-side JWT context and database-validated session.
3. **No Unrestricted Role Bypasses:** The pattern `if (role === "admin")` is prohibited. Administrators must have explicit permissions (`USER.CREATE`, `ORGANIZATION.MANAGE`, etc.) and system/organization scope.
4. **Fail-Fast Environment Validation:** If any required secret (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) is missing or invalid at application startup, the application throws a fatal configuration error and terminates. No silent defaults or fallback strings are permitted.

---

## 2. Authentication Protection & Rate Limiting

### 2.1 Configuration Parameters
The authentication engine relies on configurable security thresholds validated at boot:

```ini
AUTH_LOGIN_MAX_ATTEMPTS=5
AUTH_LOGIN_WINDOW_SECONDS=300
AUTH_LOGIN_LOCK_SECONDS=900
AUTH_REFRESH_MAX_ATTEMPTS=20
AUTH_REFRESH_WINDOW_SECONDS=60
```

### 2.2 Brute-Force & Credential Stuffing Prevention
- **IP-Based & Account-Based Throttling:** Track consecutive failed login attempts by composite key `ipAddress + email`.
- **Progressive Backoff & Temporary Lockout:** Upon reaching `AUTH_LOGIN_MAX_ATTEMPTS` (5 attempts in 5 minutes), the account/IP combination is locked out for `AUTH_LOGIN_LOCK_SECONDS` (15 minutes).
- **Uniform Authentication Error Responses:** To prevent user enumeration, failed login attempts return a uniform generic message: `"Invalid email or password"`.
- **Security Audit Logging:** All failed login attempts, lockout events, and suspicious refresh attempts are recorded in `AuditLog` with `action: "AUTH.LOGIN_FAILED"`, IP address, and User-Agent.

---

## 3. Session Security & Token Lifecycle

### 3.1 Access Tokens
- **Algorithm:** RS256 or HS256 (minimum 256-bit cryptographic entropy).
- **Lifespan:** 15 minutes (`JWT_ACCESS_EXPIRATION=15m`).
- **Payload:** `sub` (userId), `organizationId`, `sessionId`, `roles: string[]`, `permissions: string[]`.

### 3.2 Refresh Tokens & Server Sessions
- **Entropy:** 40 bytes generated via `crypto.randomBytes(40).toString('hex')`.
- **Storage:** Only the SHA-256 hash (`crypto.createHash('sha256').update(rawToken).digest('hex')`) is stored in PostgreSQL.
- **Rotation:** Every call to `/api/v1/auth/refresh` issues a new refresh token and replaces the hash in the database.
- **Revocation:** Logout invalidates the session record (`isRevoked = true, revokedAt = NOW()`).
- **Global Logout:** A user or admin can invoke `/auth/logout-all`, which revokes all active sessions for that `userId`.

---

## 4. Multi-Factor Authentication (MFA) Foundation

### 4.1 Architecture
The database model includes `User.isMfaEnabled` and session flags. The Phase 1 foundation defines:
- **TOTP Secret Generation:** Cryptographic base32 secret paired with RFC 6238 time-based one-time password algorithm.
- **Recovery Codes:** Set of single-use, cryptographically hashed recovery codes generated during enrollment.
- **Two-Step Login Flow:**
  1. `POST /auth/login` verifies credentials. If `isMfaEnabled === true`, returns `{ mfaRequired: true, mfaToken: "..." }` with a temporary, limited-scope token.
  2. `POST /auth/mfa/verify` consumes the TOTP code or recovery code and completes session creation.
- **No Pseudo-MFA:** Setting `isMfaEnabled = true` without verified TOTP secret enrollment is strictly disallowed.
