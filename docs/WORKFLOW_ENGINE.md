# Kenzo EHS — Authoritative Workflow Engine Specification

---

## 1. Principle of Explicit State Transitions

To ensure compliance with OSHA, ISO 45001, and statutory safety mandates, the Kenzo EHS platform forbids arbitrary `PATCH` requests on entity statuses.

Transitions must follow explicit lifecycle graphs enforced by the backend `WorkflowService`.

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Create Study
    DRAFT --> IN_PROGRESS : Add Activity / Hazard
    IN_PROGRESS --> TEAM_REVIEW : POST /actions/submit
    TEAM_REVIEW --> APPROVAL_PENDING : POST /actions/review (RECOMMEND)
    TEAM_REVIEW --> IN_PROGRESS : POST /actions/review (REQUEST_REWORK)
    APPROVAL_PENDING --> APPROVED : POST /actions/approve
    APPROVAL_PENDING --> IN_PROGRESS : POST /actions/reject
    APPROVED --> ACTIVE : POST /actions/activate
    ACTIVE --> SUPERSEDED : Re-assessment / New Revision
```

---

## 2. Transition Verification Pipeline

When a workflow transition endpoint is called:

1. **Active State Verification**: Confirms the entity's current state in PostgreSQL matches the expected origin state.
2. **Permission Check**: Verifies the actor has the specific action permission (e.g. `HIRA.APPROVE`).
3. **Scope Check**: Verifies the actor has plant-level or organizational authority over the target site.
4. **Pre-condition Validation**:
   - At least 1 hazard must exist before submission.
   - Any `CRITICAL` residual risk requires explicit override justification and the `HIRA.OVERRIDE_UNACCEPTABLE` permission.
5. **Atomic Execution**: Updates the record state, completes existing pending tasks, spawns next tasks, writes an immutable audit record, and registers an outbox event.
