# 11 — Enterprise API Contracts Specification

**Document Reference:** `DOCS-PHASE1-011`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** API Architect, Integration Engineer

---

## 1. Uniform Response Protocol

All endpoints exposed under `/api/v1` adhere to a standardized JSON envelope structure:

### 1.1 Success Response (`200 OK`, `201 Created`)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01HPX7K92M45NBZ...",
    "timestamp": "2026-09-21T10:30:00.000Z",
    "total": 120,
    "page": 1,
    "pageSize": 20
  }
}
```

### 1.2 Error Response (`400`, `401`, `403`, `404`, `500`)
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied: Missing required permission [HIRA.APPROVE]",
    "details": [
      {
        "field": "scope",
        "issue": "User does not have plant scope for target plantId"
      }
    ]
  },
  "meta": {
    "requestId": "req_01HPX7K92M45NBZ...",
    "timestamp": "2026-09-21T10:30:00.000Z"
  }
}
```

---

## 2. Core Endpoint Specifications

### 2.1 Authentication & Session Management
- `POST /api/v1/auth/login`: Authenticates credentials with rate limiting and returns JWT access token + refresh token.
- `POST /api/v1/auth/refresh`: Consumes old refresh token, emits rotated refresh token + fresh access token.
- `POST /api/v1/auth/logout`: Revokes active session.
- `POST /api/v1/auth/logout-all`: Revokes all sessions for authenticated user.
- `GET /api/v1/auth/me`: Returns live profile, roles, permissions, and plant scopes directly from PostgreSQL.

### 2.2 Workflow Action Contracts
- `POST /api/v1/:module/:id/actions/:actionName`:
  - Payload: `{ comments?: string, payload?: Record<string, unknown> }`
  - Validates: Current state, action permission, user role, and business rules.
  - Returns: `{ success: true, fromState: "...", toState: "...", workflowInstance: { ... } }`
