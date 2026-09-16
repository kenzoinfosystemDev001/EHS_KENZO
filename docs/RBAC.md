# KENZO EHS — Role-Based Access Control (RBAC) Specification

> **Company**: Kenzo Infosystems Pvt Ltd  
> **Standard**: Permission-Based & Scope-Based Authorization  
> **Rule**: Naming convention `MODULE.ACTION`. Direct role checks (`if (role === '...')`) are strictly forbidden.

---

## 1. Architectural Principles

1. **Permission as the Atomic Unit**:
   - Access is determined by whether an identity possesses a specific permission (e.g., `HIRA.APPROVE`, `INCIDENT.INVESTIGATE`, `CAPA.VERIFY`).
2. **Scope as the Geographic/Organizational Boundary**:
   - Every permission evaluation is bound to an `AccessScope`:
     - `SYSTEM`: Platform-wide administrative authority.
     - `ORGANIZATION`: Entire corporate tenant across all plants.
     - `ALL_PLANTS`: Multi-site operational authority across all plants in the tenant.
     - `OWN_PLANT`: Restricted strictly to the plant(s) assigned to the user.
     - `OWN_DEPARTMENT`: Restricted strictly to the department assigned to the user.
     - `OWN_AREA`: Restricted to specific physical areas/processes.
     - `OWN_RECORDS`: Restricted to records created by or involving the user.
     - `ASSIGNED_RECORDS`: Restricted to records where the user is formally assigned (e.g. Investigation Lead, CAPA Owner, Verifier).
3. **Multi-Tenancy Hierarchy**:
   ```
   Organization (Tenant)
     └── Plant (Site)
           └── Department
                 └── Area
                       └── EHS Business Record (HIRA, Incident, CAPA, PTW, etc.)
   ```

---

## 2. 19 Canonical Roles & Default Scopes

| # | Role Key | Display Name | Default Scope | Primary Functional Responsibility |
|---|---|---|---|---|
| 1 | `WORKER` | Worker | `OWN_RECORDS` | Operational reporting of hazards/incidents, PTW receiver, assigned trainings. |
| 2 | `CONTRACTOR_WORKMAN` | Contractor Workman | `OWN_RECORDS` | Contractor hazard reporting, permit execution, contractor site safety. |
| 3 | `SUPERVISOR` | Supervisor | `OWN_DEPARTMENT` | First-line incident triage, departmental inspections, permit verification. |
| 4 | `DEPARTMENT_HEAD` | Department Head | `OWN_DEPARTMENT` | Departmental HIRA approvals, incident sign-offs, CAPA resource allocation. |
| 5 | `PERMIT_ISSUER` | Permit Issuer | `OWN_PLANT` | PTW risk evaluation, site checks, permit issuance/suspension/closure, LOTO. |
| 6 | `SAFETY_OFFICER` | Safety Officer | `OWN_PLANT` | Daily audits, incident investigations, independent CAPA verification. |
| 7 | `HSE_MANAGER` | HSE Manager | `OWN_PLANT` | Plant-level HIRA approval, incident classification, investigation lead appointment. |
| 8 | `PLANT_HEAD` | Plant Head | `OWN_PLANT` | Highest plant authority; high-severity incident sign-off, major risk reviews. |
| 9 | `MAINTENANCE_HEAD` | Maintenance Head | `OWN_PLANT` | Engineering controls, plant-wide LOTO protocols, maintenance safety. |
| 10 | `TRAINER` | Trainer | `OWN_PLANT` | Safety training delivery, attendance logging, competency assessment. |
| 11 | `LD_MANAGER` | L&D Manager | `ALL_PLANTS` | Enterprise curriculum management, training matrices, compliance certification. |
| 12 | `ENVIRONMENT_MANAGER` | Environment Manager | `OWN_PLANT` | Environmental monitoring, emissions, waste manifests, statutory reporting. |
| 13 | `CONTRACTOR_COORDINATOR` | Contractor Coordinator | `OWN_PLANT` | Contractor induction, safety compliance, pre-qualification audits. |
| 14 | `OCCUPATIONAL_HEALTH_OFFICER` | Occupational Health Officer | `OWN_PLANT` | First-aid logging, medical injury assessments, hygiene records. |
| 15 | `EMERGENCY_RESPONSE_COORDINATOR` | Emergency Response Coordinator| `OWN_PLANT` | Mock drills, emergency action plans, evacuation procedures. |
| 16 | `INDUSTRIAL_HYGIENIST` | Industrial Hygienist | `ALL_PLANTS` | Noise, dust, chemical exposure surveys, IH risk assessments. |
| 17 | `CORPORATE_HSE` | Corporate HSE Head | `ORGANIZATION` | Enterprise governance, multi-plant analytics, corporate incident reviews. |
| 18 | `ADMIN` | Organization Admin | `ORGANIZATION` | Tenant user provisioning, plant setup, role assignments, system master data. |
| 19 | `SYSTEM_ADMIN` | System Admin | `SYSTEM` | Platform multi-tenant provisioning, database maintenance, system health. |

---

## 3. Comprehensive Role-Permission Matrix

### 3.1 Risk & HIRA (Hazard Identification & Risk Assessment)

| Role | `HIRA.CREATE` | `HIRA.READ` | `HIRA.UPDATE` | `HIRA.SUBMIT` | `HIRA.REVIEW` | `HIRA.APPROVE` | `HIRA.OVERRIDE` | Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `WORKER` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `OWN_PLANT` (Read-only) |
| `SUPERVISOR` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_DEPARTMENT` |
| `DEPARTMENT_HEAD` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | `OWN_DEPARTMENT` |
| `SAFETY_OFFICER` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `OWN_PLANT` |
| `HSE_MANAGER` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `PLANT_HEAD` | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `CORPORATE_HSE` | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | `ORGANIZATION` |
| `ADMIN` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | `ORGANIZATION` |

---

### 3.2 Incidents, Investigation & RCA

| Role | `INCIDENT.CREATE` | `INCIDENT.READ` | `INCIDENT.CLASSIFY` | `INCIDENT.INVESTIGATE` | `RCA.CREATE` | `RCA.APPROVE` | `INCIDENT.APPROVE` | `INCIDENT.CLOSE` | Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `WORKER` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `OWN_RECORDS` |
| `SUPERVISOR` | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | `OWN_DEPARTMENT` |
| `SAFETY_OFFICER` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_PLANT` |
| `HSE_MANAGER` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `PLANT_HEAD` | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `CORPORATE_HSE` | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `ORGANIZATION` |

*Note: High-severity incidents require dual sign-off from both `PLANT_HEAD` and `CORPORATE_HSE` before closure.*

---

### 3.3 CAPA (Corrective and Preventive Action)

| Role | `CAPA.CREATE` | `CAPA.ASSIGN` | `CAPA.UPDATE` | `CAPA.EXECUTE` | `CAPA.VERIFY` | `CAPA.CLOSE` | Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `WORKER` / Actionee | ❌ | ❌ | ❌ | ✅ (Evidence) | ❌ | ❌ | `ASSIGNED_RECORDS` |
| `SUPERVISOR` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | `OWN_DEPARTMENT` |
| `DEPARTMENT_HEAD` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_DEPARTMENT` |
| `SAFETY_OFFICER` | ✅ | ✅ | ✅ | ❌ | ✅ (Independent) | ❌ | `OWN_PLANT` |
| `HSE_MANAGER` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | `OWN_PLANT` |
| `PLANT_HEAD` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `OWN_PLANT` |
| `CORPORATE_HSE` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `ORGANIZATION` |

*Security Constraint: Actionee (`CAPA.EXECUTE`) is strictly disallowed from performing `CAPA.VERIFY` on their own action.*

---

### 3.4 Permit To Work (PTW) & LOTO

| Role | `PTW.CREATE` | `PTW.READ` | `PTW.UPDATE` | `PTW.SUBMIT` | `PTW.APPROVE` | `PTW.CLOSE` | `LOTO.APPLY` | Scope |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `WORKER` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_RECORDS` |
| `CONTRACTOR_WORKMAN`| ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_RECORDS` |
| `SUPERVISOR` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | `OWN_DEPARTMENT` |
| `PERMIT_ISSUER` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `SAFETY_OFFICER` | ❌ | ✅ | ❌ | ❌ | ✅ (Review) | ❌ | ✅ | `OWN_PLANT` |
| `MAINTENANCE_HEAD` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `OWN_PLANT` |
| `HSE_MANAGER` | ❌ | ✅ | ❌ | ❌ | ✅ (High-Risk) | ✅ | ✅ | `OWN_PLANT` |

---

### 3.5 Administration & Governance

| Role | `USER.CREATE` | `USER.READ` | `USER.UPDATE` | `ROLE.ASSIGN` | `ORGANIZATION.MANAGE` | `PLANT.MANAGE` | `AUDIT_LOG.READ` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `HSE_MANAGER` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (`OWN_PLANT`) |
| `PLANT_HEAD` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (`OWN_PLANT`) |
| `CORPORATE_HSE` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ (`ORGANIZATION`) |
| `ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (`ORGANIZATION`) |
| `SYSTEM_ADMIN` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (`SYSTEM`) |

---

## 4. Enforcement Strategy in Code

### Backend Controller Example:
```typescript
@Controller('hira')
@UseGuards(JwtAuthGuard, PermissionsGuard, ScopeGuard)
export class HiraController {
  @Post(':id/actions/approve')
  @RequirePermissions('HIRA.APPROVE')
  async approveHira(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: WorkflowActionDto,
  ) {
    // 1. Authenticated via JwtAuthGuard
    // 2. Verified permission via PermissionsGuard ('HIRA.APPROVE')
    // 3. Verified scope via ScopeGuard (user plant matches study plant)
    // 4. Executes state transition atomically inside a database transaction
    return this.hiraService.approveStudy(id, user, dto);
  }
}
```
