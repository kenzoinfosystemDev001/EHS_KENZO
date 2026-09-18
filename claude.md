# Kenzo EHS — Claude Code Instructions

## Project

Enterprise EHS management platform for Kenzo Infosystems.

## Architecture

- Modular monolith
- PNPM monorepo
- Next.js frontend
- NestJS backend
- PostgreSQL
- Prisma
- REST API
- RBAC + permission + scope authorization

## Core principle

PostgreSQL is the system of record.

Never use:
- localStorage as business-data storage
- sessionStorage as business-data storage
- mock data in production workflows
- frontend-only authorization
- arbitrary status PATCH operations

## Security

Every protected operation must enforce:

User
→ Organization
→ Plant
→ Department/Area
→ Permission
→ Scope
→ Resource

Never trust frontend permissions.

## Workflow

Critical workflow changes must happen through explicit backend actions.

Example:

DRAFT
→ SUBMIT
→ REVIEW
→ APPROVE
→ ACTIVE

## EHS domains

- Safety Operations
- Risk Management
- Incident Management
- RCA
- CAPA
- PTW
- LOTO
- Inspections
- Audits
- Training
- Contractors
- Occupational Health
- Environment
- Emergency
- Compliance
- Documents
- Analytics
- Administration

## Engineering rules

Before modifying architecture:

1. Inspect existing implementation.
2. Use Graphify where useful.
3. Search existing code before creating new abstractions.
4. Reuse existing utilities/components.
5. Follow Ponytail/YAGNI principles.
6. Don't introduce unnecessary dependencies.
7. Don't rewrite working modules without evidence.
8. Preserve backward compatibility where possible.
9. Add tests for important changes.
10. Never claim completion without verification.

## Database

All important business state must be persisted in PostgreSQL.

Critical mutations should maintain:

Entity
+ Workflow transition
+ Audit log
+ Outbox event

atomically where applicable.

## EHS safety rules

Closed regulated records are read-only.

CAPA owner cannot independently verify their own CAPA.

Incident/RCA/CAPA workflow must maintain complete audit history.

No hard delete for regulated/auditable records unless explicitly permitted.