# Kenzo EHS — Data Flow & Transactional Pipeline

---

## 1. End-to-End Vertical Slice Mutation Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User as HSE Manager
    participant Web as Next.js Web App
    participant API as NestJS API Gateway
    participant Guard as Auth & Scope Guards
    participant Service as HiraService
    participant Engine as HiraRiskEngine
    participant DB as PostgreSQL Transaction
    participant Outbox as Transactional Outbox
    participant Worker as Background Worker
    participant Inbox as Unified Inbox

    User->>Web: Input Hazard & Hierarchy Controls
    Web->>API: POST /api/v1/hira/:id/activities/:actId/hazards
    API->>Guard: Verify JWT & Plant Scope
    Guard-->>API: Authorized
    API->>Service: addHazard(dto)
    Service->>Engine: calculateRisk(sev, lik, controls)
    Engine-->>Service: Initial Score (20) & Residual Score (4)
    Service->>DB: BEGIN TRANSACTION
    DB->>DB: INSERT hira_hazards & controls
    DB->>DB: UPDATE hira_studies status = IN_PROGRESS
    DB->>DB: INSERT audit_logs (before/after diff)
    DB->>DB: INSERT outbox_events
    DB-->>Service: COMMIT
    Service-->>API: 201 Created (with calculated risk)
    API-->>Web: Render Risk Assessment Result
    DB->>Outbox: Event Polled
    Outbox->>Worker: Dispatch Event
    Worker->>Inbox: Update Pending Tasks
```

---

## 2. Server-Side Risk Math Flow

$$\text{Initial Risk Score} = \text{Severity} \times \text{Likelihood}$$

$$\text{Control Hierarchy Reduction} = \sum (\text{Hierarchy Weight} \times \text{Effectiveness \%} \times 0.40)$$

$$\text{Residual Likelihood} = \max(1, \text{round}(\text{Initial Likelihood} \times (1 - \text{Reduction})))$$

$$\text{Residual Risk Score} = \max(1, \text{Residual Severity} \times \text{Residual Likelihood})$$
