# 06 — RBAC + ABAC Authorization Architecture

**Document Reference:** `DOCS-PHASE1-006`  
**Status:** APPROVED FOR IMPLEMENTATION  
**Date:** September 2026  
**Auditors:** IAM Architect, Principal Software Architect

---

## 1. Dual-Axis Authorization Framework

Authorization in Kenzo EHS operates on two orthogonal axes:
1. **Functional Permissions (RBAC):** *What action can the user perform on what entity type?* (e.g., `HIRA.APPROVE`, `INCIDENT.CLOSE`).
2. **Contextual Scope & Boundaries (ABAC):** *In which organizational or physical boundary can the action be applied?* (e.g., `OWN_PLANT`, `OWN_DEPARTMENT`, `ASSIGNED_RECORDS`).

An operation is authorized **if and only if**:
$$\text{Authorized} = \text{HasPermission}(p) \land \text{SatisfiesScope}(s, \text{resource}) \land \text{TenantMatch}(org)$$

---

## 2. Canonical Enterprise Roles (19 Operational Roles)

The platform defines 19 canonical roles (`UserRoleType`):

| Level | Role Code | Role Name | Default Scope | Primary Purpose |
|---|---|---|---|---|
| **System** | `SYSTEM_ADMIN` | System Administrator | `SYSTEM` | Cross-tenant platform maintenance & configuration |
| **Org** | `ADMIN` | Organization Administrator | `ORGANIZATION` | Enterprise user & master data management |
| **Org** | `CORPORATE_HSE` | Corporate HSE Head | `ORGANIZATION` | Enterprise-wide compliance, safety policy & oversight |
| **Plant** | `PLANT_HEAD` | Plant Head / General Manager | `OWN_PLANT` | Final plant-level approvals, critical risk overrides |
| **Plant** | `HSE_MANAGER` | HSE Manager | `OWN_PLANT` | Daily plant safety management, HIRA review, audits |
| **Plant** | `SAFETY_OFFICER` | Safety Officer | `OWN_PLANT` | Site inspections, hazard investigations, HIRA creation |
| **Plant** | `DEPARTMENT_HEAD` | Department Head | `OWN_DEPARTMENT` | Departmental approvals, CAPA execution, team review |
| **Plant** | `SUPERVISOR` | Shift Supervisor / Worker Head | `OWN_DEPARTMENT` | Initial observation review, shift inspections, PTW request |
| **Operations** | `PERMIT_ISSUER` | Permit Issuer | `OWN_PLANT` | PTW authorization, isolation review, LOTO execution |
| **Operations** | `MAINTENANCE_HEAD` | Maintenance Head | `OWN_PLANT` | LOTO management, equipment fix scheduling |
| **Specialized** | `OCCUPATIONAL_HEALTH_OFFICER` | Health Officer / Inspector | `OWN_PLANT` | Medical surveillance, health records, clinical clearance |
| **Specialized** | `INDUSTRIAL_HYGIENIST` | Industrial Hygienist | `OWN_PLANT` | Chemical/exposure monitoring, ergonomics assessment |
| **Specialized** | `ENVIRONMENT_MANAGER` | Environment Manager | `OWN_PLANT` | Emissions, waste, environmental compliance & ESG |
| **Specialized** | `EMERGENCY_RESPONSE_COORDINATOR` | Emergency Coordinator | `OWN_PLANT` | Mock drills, emergency response plans, incident triage |
| **Training** | `TRAINER` | Certified EHS Trainer | `OWN_PLANT` | Course delivery, session evaluation, competency checks |
| **Training** | `LD_MANAGER` | Learning & Development Mgr | `ORGANIZATION` | Training matrix configuration, course curricula |
| **Contractor** | `CONTRACTOR_COORDINATOR` | Contractor Coordinator | `OWN_PLANT` | Vendor safety vetting, contractor compliance |
| **Field** | `WORKER` | Plant Worker / Operator | `OWN_AREA` | Hazard reporting, safety observations, participation |
| **Field** | `CONTRACTOR_WORKMAN` | Contractor Workman | `OWN_AREA` | Field reporting, permit recipient |

---

## 3. Scope Hierarchy & Enforcement Matrix

```
  SYSTEM
    ↓
  ORGANIZATION
    ↓
  ALL_PLANTS
    ↓
  OWN_PLANT
    ↓
  OWN_DEPARTMENT
    ↓
  OWN_AREA
    ↓
  ASSIGNED_RECORDS / OWN_RECORDS
```

### Scope Definitions:
- `SYSTEM`: Superuser administrative access (limited to maintenance tasks).
- `ORGANIZATION`: All plants, departments, and records within user's `organizationId`.
- `ALL_PLANTS`: Multi-plant access within organization.
- `OWN_PLANT`: Restricted to records where `record.plantId === user.plantId`.
- `OWN_DEPARTMENT`: Restricted to records where `record.departmentId === user.departmentId`.
- `OWN_AREA`: Restricted to records in assigned physical areas.
- `ASSIGNED_RECORDS`: User must be explicitly assigned (e.g. CAPA assignee, lead auditor, investigator).
- `OWN_RECORDS`: User must be the author (`createdById === user.id` or `observerId === user.id`).
