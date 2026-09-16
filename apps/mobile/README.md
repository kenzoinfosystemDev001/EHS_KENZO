# Kenzo EHS Mobile Client

> **Status**: Reserved for future development (Post-Phase 0)  
> **Target Framework**: Flutter / Native PWA

### Architectural Mandate

Per Rule 24 in the authoritative work plan (`ESP-WorkPlan.docx`):

- The mobile application will connect directly to the NestJS `/api/v1` backend endpoints.
- Mobile clients must NEVER hold independent authoritative business truth or circumvent workflow validation.
- All authorization, state transitions, and audit records will originate from PostgreSQL through the API.
