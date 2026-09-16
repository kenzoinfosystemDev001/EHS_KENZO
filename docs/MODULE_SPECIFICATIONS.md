# Kenzo EHS — Module Specifications & Phase 1 Scope

---

## 1. Phase 1 Fully Implemented Modules

### Module 1: Hazard Identification & Risk Assessment (HIRA)

- **Status:** Complete Vertical Slice (Production-Ready)
- **Entities:** `HiraStudy`, `HiraTeamMember`, `HiraActivity`, `HiraHazard`, `HiraControl`, `HiraReview`, `HiraApproval`, `HiraVersion`
- **Capabilities:**
  - Multi-tier plant scoping.
  - Hierarchy of controls weighting (Elimination, Substitution, Engineering, Administrative, PPE).
  - ALARP compliance verification.
  - Mandatory leadership override on critical residual risk.
  - Formal workflow lifecycle (`DRAFT` $\to$ `IN_PROGRESS` $\to$ `TEAM_REVIEW` $\to$ `APPROVAL_PENDING` $\to$ `APPROVED` $\to$ `ACTIVE`).

### Module 2: Unified Inbox & Workflow Engine

- **Status:** Complete Vertical Slice
- **Entities:** `WorkflowDefinition`, `WorkflowInstance`, `WorkflowStep`, `WorkflowTask`
- **Capabilities:**
  - Aggregates tasks across all plants filtered by user roles.
  - Real-time count metrics: `myTasks`, `pendingApprovals`, `hiraReviews`, `overdue`.
  - Immutable step history.

### Module 3: Authentication, Sessions & RBAC

- **Status:** Complete
- **Entities:** `User`, `Session`, `Role`, `Permission`, `RolePermission`, `UserRole`
- **Capabilities:**
  - 19 Operational Roles.
  - 52 Granular Permissions.
  - Cryptographic session rotation and server revocation.

### Module 4: Audit & Outbox Engine

- **Status:** Complete
- **Entities:** `AuditLog`, `OutboxEvent`
- **Capabilities:**
  - Atomic JSONB diff logging.
  - Transactional outbox event emission.

---

## 2. Phase 2 & 3 Roadmap Modules

1. **Incident & Spill Management**: Statutory filing, 5-Why & Fishbone RCA.
2. **Corrective & Preventive Action (CAPA)**: Independent verification pipeline.
3. **Permit to Work (PTW) & LOTO**: Digital isolation certificates & gas testing logs.
4. **Safety Observations (BBS / Near-Miss)**: Mobile field reporting.
5. **ESG, Carbon & Environmental Compliance**: Scope 1/2 emissions tracking, effluent discharge logs.
