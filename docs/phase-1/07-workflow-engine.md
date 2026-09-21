# 07 — Universal Workflow Engine Architecture

**Document Reference:** `DOCS-PHASE1-007`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** Workflow Engine Architect, Principal Software Architect

---

## 1. Declarative State Machine Model

Regulated EHS processes (HIRA approvals, incident investigations, permit sign-offs, CAPA verification, observation escalations) cannot be treated as arbitrary database fields. Status changes can only occur through deterministic, auditable domain actions executed inside the workflow engine.

```
       [ DRAFT ]
           │
           │ action: "SUBMIT"
           ▼
     [ IN_PROGRESS ] ◄──────────┐
           │                     │ action: "REQUEST_REWORK"
           │ action: "SUBMIT_REVIEW"
           ▼                     │
     [ TEAM_REVIEW ] ────────────┘
           │
           │ action: "RECOMMEND"
           ▼
  [ APPROVAL_PENDING ] ─────────┐
           │                     │ action: "REJECT"
           │ action: "APPROVE"   ▼
           ▼               [ IN_PROGRESS ]
      [ APPROVED ]
           │
           │ action: "ACTIVATE"
           ▼
       [ ACTIVE ]
```

---

## 2. Invariant Rules of Workflow Execution

1. **No Direct Status Modification:** Endpoints like `PATCH /resource/:id { status: "APPROVED" }` are strictly forbidden. Mutations occur only via explicit domain action endpoints:
   - `POST /hira/studies/:id/actions/submit`
   - `POST /hira/studies/:id/actions/review`
   - `POST /hira/studies/:id/actions/approve`
   - `POST /ptw/:id/actions/safety-review`
   - `POST /observations/:id/escalate`
2. **Current State Precondition Validation:** An action is only executed if `allowedTransitions[currentState][action]` resolves to a defined target state. Any illegal transition throws a `400 Bad Request`.
3. **Permission Precondition:** Performing an action requires the corresponding permission (e.g. action `APPROVE` requires `HIRA.APPROVE` or `PTW.APPROVE`).
4. **Business Precondition Checks:** Before executing the state transition, the domain service verifies all regulatory and business constraints (e.g. HIRA must contain at least one hazard; critical residual risk requires override flag).

---

## 3. Transactional Task & SLA Orchestration

Every transition executed via `WorkflowService.executeTransition()`:
1. Updates `WorkflowInstance.currentState` to `nextState`.
2. Marks pending `WorkflowTask` records for the previous step as `APPROVED` or `COMPLETED`.
3. Creates a new immutable `WorkflowAction` audit record with `actorId`, `actorRoleCode`, `comments`, and `payload`.
4. Automatically schedules next-step `WorkflowTask` records assigned to specific user IDs or required role codes with configured SLA due dates.
