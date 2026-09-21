# 09 — Transactional Outbox Pattern Architecture

**Document Reference:** `DOCS-PHASE1-009`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** DevOps/SRE Engineer, Principal Software Architect

---

## 1. Problem Statement & Guarantees

In distributed enterprise EHS systems, business mutations frequently trigger downstream actions:
- In-app notification to supervisors when an observation is logged.
- Email alerts to plant heads when a critical incident occurs.
- Webhook dispatch to external ERP or corporate compliance systems.
- Asynchronous updates to safety analytics dashboards and KPI metrics.

**Dual-Write Vulnerability:** If a service writes to PostgreSQL and subsequently calls Redis, an external API, or an email service:
- If the database write succeeds but the network call fails, the event is lost.
- If the network call succeeds but the database transaction rolls back, external systems act upon invalid data.

**The Solution:** The **Transactional Outbox Pattern** stages all events inside the PostgreSQL database within the same physical transaction as the business mutation.

---

## 2. Outbox Schema & Execution Flow

```
                      [ Client Mutation Request ]
                                  │
                                  ▼
      ┌───────────────────────────────────────────────────────┐
      │         BEGIN PostgreSQL Physical Transaction         │
      │                                                       │
      │  1. INSERT/UPDATE Entity (e.g. Incident)              │
      │  2. UPDATE WorkflowInstance & INSERT WorkflowAction   │
      │  3. INSERT AuditLog                                   │
      │  4. INSERT OutboxEvent                                │
      │                                                       │
      │         COMMIT Transaction                            │
      └───────────────────────────┬───────────────────────────┘
                                  │ Guaranteed Persistence
                                  ▼
                      ┌───────────────────────┐
                      │   OutboxEvent Table   │
                      │  (processedAt: null)  │
                      └───────────┬───────────┘
                                  │
                                  ▼ Polling / CDC Worker
                      ┌───────────────────────┐
                      │   Outbox Dispatcher   │
                      │  (Batches of 20 - 50) │
                      └───────────┬───────────┘
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
     [ In-App Alerts ]     [ Email / SMS ]     [ Redis / Webhook ]
             │                    │                    │
             └────────────────────┬────────────────────┘
                                  │ Success
                                  ▼
                      ┌───────────────────────┐
                      │ UPDATE OutboxEvent    │
                      │ SET processedAt = NOW │
                      └───────────────────────┘
```

---

## 3. Outbox Event Schema

```prisma
model OutboxEvent {
  id             String       @id @default(uuid())
  organizationId String
  aggregateType  String       // e.g. INCIDENT, HIRA, CAPA, OBSERVATION
  aggregateId    String       // Entity UUID
  eventType      String       // e.g. INCIDENT_CREATED, HIRA_APPROVED
  payload        Json         // Structured event data
  headers        Json?        // Correlation ID, trace headers
  createdAt      DateTime     @default(now())
  processedAt    DateTime?    // Null until successfully dispatched
  retryCount     Int          @default(0)
  lastError      String?      // Failure stack trace for debugging

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)

  @@index([processedAt, createdAt])
  @@index([organizationId])
  @@index([aggregateType, aggregateId])
}
```

---

## 4. Idempotency & At-Least-Once Delivery

- Events are processed with **At-Least-Once** semantics.
- Downstream handlers (notifications, email, analytics) must implement idempotency checks using the unique `OutboxEvent.id`.
- Failed dispatches increment `retryCount` and record `lastError`, leaving `processedAt = null` for exponential backoff retries.
