# Kenzo EHS — Security Architecture & Baseline

---

## 1. Authentication & Session Management

1. **Password Hashing**: Bcrypt with work factor of 12 rounds.
2. **Access Tokens**: Short-lived JSON Web Tokens (JWT) signed with secret key; 15-minute expiration window.
3. **Refresh Tokens**: Cryptographically secure rotating refresh tokens (7-day lifetime) stored with SHA-256 hash in the database `sessions` table.
4. **Server-Side Revocation**: Logout instantly sets `revoked = true` on the database session record.
5. **Brute Force Defense**: Account lockout after 5 consecutive failed attempts.

---

## 2. Authorization & Scope Isolation

1. **Role-Based Access Control (RBAC)**: 19 predefined operational roles mapped to 52 granular permissions.
2. **No Role String Checks**: Business logic and guards strictly evaluate `user.permissions.includes(Permissions.X)`.
3. **Geographic Scope Boundaries**: `ScopeGuard` enforces that users can only operate on plants and departments within their assigned scope level (`SYSTEM`, `ORGANIZATION`, `ALL_PLANTS`, `OWN_PLANT`, `OWN_DEPARTMENT`, `OWN_RECORDS`).

---

## 3. Network & Transport Security

1. **HTTP Security Headers**: Powered by `helmet` (X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security).
2. **CORS Isolation**: Strict origin matching via `CORS_ORIGIN` environment variable.
3. **Rate Limiting**: Throttling on `/auth/login` and sensitive mutation endpoints.
