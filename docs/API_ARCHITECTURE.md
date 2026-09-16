# Kenzo EHS — API Architecture & Contracts Specification

**Base Path:** `/api/v1`  
**Protocol:** HTTPS REST / JSON  
**Documentation:** OpenAPI 3.0 via Swagger UI (`http://localhost:4000/docs`)  

---

## 1. Response Envelope Formats

### Standard Success Envelope
```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "statusCode": 400,
  "message": "HIRA study must contain at least one hazard assessment before submission",
  "error": {
    "code": "BadRequestException",
    "message": "HIRA study must contain at least one hazard assessment before submission",
    "details": []
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-09-16T11:00:00.000Z",
    "path": "/api/v1/hira/123/actions/submit"
  }
}
```

---

## 2. Core API Endpoint Matrix

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate user, issue access/refresh tokens | Public |
| `POST` | `/auth/refresh`| Rotate refresh token | Public |
| `POST` | `/auth/logout` | Revoke active server session | Bearer JWT |
| `GET` | `/auth/me` | Current user profile, roles, permissions | Bearer JWT |
| `GET` | `/health` | Liveness health probe | Public |
| `GET` | `/health/ready`| Readiness health probe (checks DB connectivity)| Public |
| `GET` | `/plants` | List plants in organization | Bearer JWT |
| `GET` | `/departments`| List departments in organization | Bearer JWT |
| `GET` | `/inbox` | Unified inbox task aggregation | Bearer JWT |
| `GET` | `/hira` | List HIRA studies | `HIRA.READ` |
| `POST` | `/hira` | Create new HIRA study | `HIRA.CREATE` |
| `GET` | `/hira/:id` | Get HIRA details & hazards | `HIRA.READ` |
| `POST` | `/hira/:id/activities` | Add operational activity | `HIRA.UPDATE` |
| `POST` | `/hira/:id/activities/:activityId/hazards` | Add hazard, controls, evaluate risk | `HIRA.UPDATE` |
| `POST` | `/hira/:id/actions/submit` | Submit study for team review | `HIRA.SUBMIT` |
| `POST` | `/hira/:id/actions/review` | Recommend study for approval | `HIRA.REVIEW` |
| `POST` | `/hira/:id/actions/approve` | Formally approve study | `HIRA.APPROVE` |
| `POST` | `/hira/:id/actions/reject` | Reject study back for rework | `HIRA.APPROVE` |
| `POST` | `/hira/:id/actions/activate` | Activate approved study for site ops | `HIRA.ACTIVATE` |
| `GET` | `/audit/entities/:type/:id` | Immutable audit trail for entity | `AUDIT_LOG.READ` |
