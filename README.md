# Kenzo EHS — Enterprise Environment, Health & Safety Management Platform

> **Company**: Kenzo Infosystems Pvt Ltd  
> **Platform**: Kenzo EHS  
> **Architecture**: Modular Monolith Monorepo (PNPM Workspaces)

---

## 1. Architectural Vision & Non-Negotiable Rules

Kenzo EHS is designed as an enterprise-grade Environment, Health & Safety Management Platform built for multi-tenant enterprise operations: multiple organizations, plants/sites, departments, thousands of employees, contractors, auditable workflows, and strict regulatory compliance.

### Core Architectural Principles

1. **PostgreSQL is the Sole System of Record**:
   - Every authoritative business entity, workflow state, audit trail, and outbox event is persisted in PostgreSQL via Prisma ORM.
2. **Backend Authoritative Enforcement**:
   - Backend (NestJS) enforces authentication, authorization, scopes, business rules, validation, and state machines.
   - Frontend (Next.js) NEVER directly determines authoritative state.
3. **Permission-Based & Scope-Based Authorization**:
   - RBAC is defined by granular permissions (`RESOURCE.ACTION`, e.g., `HIRA.APPROVE`, `INCIDENT.INVESTIGATE`).
   - Permissions are strictly evaluated within geographic and organizational scopes (`ALL_PLANTS`, `OWN_PLANT`, `OWN_DEPARTMENT`, `ASSIGNED`).
   - Role checks such as `if (user.role === 'admin')` are strictly prohibited.
4. **Explicit Workflow State Transitions**:
   - State changes happen through explicit backend actions (e.g., `POST /incidents/:id/actions/close`), accompanied by precondition checks, role checks, and reason codes.
   - Arbitrary status modifications like `PATCH { status: "APPROVED" }` are strictly rejected.
5. **Auditability & Immutability**:
   - Closed regulatory records and investigation reports become immutable.
   - Every critical mutation produces an entity update, workflow transition, audit log entry, and transactional outbox event inside a single atomic database transaction.

---

## 2. Monorepo Structure

```
kenzo-ehs/
├── apps/
│   ├── api/          # NestJS modular monolith backend (/api/v1, Swagger, BullMQ)
│   ├── web/          # Next.js enterprise frontend shell (React 19, Tailwind)
│   └── mobile/       # Reserved placeholder for future mobile client
│
├── packages/
│   ├── config/       # Shared TypeScript, linting, and prettier configurations
│   ├── types/        # Shared TypeScript domain types, enums, interfaces
│   ├── utils/        # Shared pure utility functions, date & cryptographic helpers
│   ├── validation/   # Shared Zod validation schemas
│   └── ui/           # Shared UI component library and design tokens
│
├── prisma/           # PostgreSQL schema, migrations, and seed scripts
├── docs/             # Technical specifications, architecture blueprints, and ADRs
├── infrastructure/   # Docker Compose and container manifests
├── scripts/          # Database and developer utility scripts
├── .github/          # CI/CD workflows
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 3. Getting Started

### Prerequisites

- **Node.js**: `>= 20.0.0` (LTS recommended)
- **pnpm**: `>= 9.0.0` (recommended: `pnpm@12.x`)
- **Docker**: For PostgreSQL and Redis local infrastructure

### Installation

```bash
# On Linux / macOS
pnpm install

# On Windows PowerShell
pnpm.cmd install
```

### Environment Configuration

```bash
cp .env.example .env
```

### Development Scripts

```bash
# Build all packages and applications
pnpm run build

# Typecheck across monorepo
pnpm run typecheck

# Run NestJS API in development mode
pnpm run dev:api

# Run Next.js Web in development mode
pnpm run dev:web
```

---

## 4. Documentation Index

- [Initial Codebase Audit](file:///c:/Users/sujal.kumar/Downloads/EHS/docs/INITIAL_CODEBASE_AUDIT.md)
- Work Plan & Specifications: `ESP-WorkPlan.docx`, `Phase-Implementation .docx`
