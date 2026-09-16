# Kenzo EHS — Enterprise Deployment Guide

This guide provides step-by-step instructions for deploying the **Kenzo EHS** platform into staging and production environments.

---

## Architecture Overview

```
                          ┌───────────────────────┐
                          │   Client Browser /    │
                          │      Mobile App       │
                          └───────────┬───────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   │                                     │
           (HTTP / SSR Pages)                    (REST API Calls / Bearer)
                   │                                     │
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │   Next.js 15 Web    │               │    NestJS 11 API    │
        │   Port 3000 / Vercel│               │  Port 4000 / Render │
        └─────────────────────┘               └──────────┬──────────┘
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    │                                         │
                                    ▼                                         ▼
                         ┌────────────────────┐                    ┌────────────────────┐
                         │   PostgreSQL DB    │                    │    Redis Cache     │
                         │   (Neon / RDS)     │                    │     (Optional)     │
                         └────────────────────┘                    └────────────────────┘
```

---

## Strategy A: Managed Cloud PaaS (Recommended)

This strategy deploys the database on **Neon**, the NestJS backend on **Render / Railway**, and the Next.js frontend on **Vercel**.

### 1. Database (Neon PostgreSQL)
1. Log in to [Neon](https://neon.tech) and create a PostgreSQL database named `kenzo_ehs`.
2. Copy your pooled connection string:
   ```
   postgresql://<user>:<password>@<host>/<database>?sslmode=require
   ```
3. Run the migrations from your machine or CI:
   ```bash
   pnpm run prisma:push
   pnpm run prisma:seed
   ```

---

### 2. Backend API Deployment (Render / Railway / AWS App Runner)

#### Render Setup:
1. Create a **New Web Service** connected to your GitHub repository `kenzoinfosystemDev001/EHS_KENZO`.
2. Configure settings:
   - **Root Directory**: Leave blank (monorepo root)
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install -g pnpm@12.3.4 && pnpm install --frozen-lockfile && pnpm --filter @kenzo-ehs/api run prisma:generate && pnpm run build
     ```
   - **Start Command**:
     ```bash
     node apps/api/dist/apps/api/src/main
     ```
3. Add Environment Variables:
   | Variable | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `4000` (or leave default) | Application port |
   | `DATABASE_URL` | `<your-neon-database-url>` | PostgreSQL connection |
   | `JWT_SECRET` | `<secure-random-64-char-string>` | Token signing secret |
   | `JWT_REFRESH_SECRET` | `<secure-random-64-char-string>` | Refresh token secret |
   | `CORS_ORIGIN` | `https://your-web-domain.vercel.app` | Allowed frontend origin |

---

### 3. Frontend Deployment (Vercel)

The repository includes pre-configured `vercel.json` files for automatic deployment.

#### Option A: Zero-Config (Root Directory = `.`)
If you imported the repository with the default Root Directory (`.`):
1. **Framework Preset**: `Next.js` (defined in `vercel.json`)
2. **Build Command**: `pnpm -r --filter=!@kenzo-ehs/mobile run build` (auto-detected from `vercel.json`)
3. **Output Directory**: `apps/web/.next` (auto-detected from `vercel.json`)

#### Option B: Set Root Directory to `apps/web` (Standard Vercel Monorepo Setup)
In your Vercel Project Dashboard:
1. Go to **Settings** > **General** > **Root Directory**: Click **Edit** and set to `apps/web`.
2. Ensure **Framework Preset** is set to `Next.js`.
3. Vercel will automatically resolve monorepo packages and deploy `.next`.

#### Environment Variables
In Vercel **Settings** > **Environment Variables**, add:
| Variable | Value | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-api-domain.onrender.com/api/v1` | URL pointing to deployed API |

---

## Strategy B: Docker & Docker Compose (Self-Hosted / VPS / EC2)

Deploy the complete stack (Postgres, Redis, NestJS API, and Next.js Web) on an Ubuntu / Debian VPS or AWS EC2 instance.

### Prerequisites
- Docker Engine $\ge 24.0$
- Docker Compose $\ge v2.20$

### 1. Clone the Repository
```bash
git clone https://github.com/kenzoinfosystemDev001/EHS_KENZO.git
cd EHS_KENZO
```

### 2. Configure Environment Variables
Create a `.env.production` file:
```env
# Database & Redis
POSTGRES_USER=postgres
POSTGRES_PASSWORD=StrongProductionPassword2026!
POSTGRES_DB=kenzo_ehs
DATABASE_URL=postgresql://postgres:StrongProductionPassword2026!@postgres:5432/kenzo_ehs?schema=public

# Security Secrets
JWT_SECRET=production-access-secret-replace-with-uuid-or-openssl-rand
JWT_REFRESH_SECRET=production-refresh-secret-replace-with-uuid-or-openssl-rand

# Hostnames & Ports
CORS_ORIGIN=http://your-server-ip:3000
NEXT_PUBLIC_API_URL=http://your-server-ip:4000/api/v1
```

### 3. Build and Launch Containers
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 4. Run Initial Database Seed
Execute the seeder inside the running API container:
```bash
docker compose -f docker-compose.prod.yml exec api node -e "require('./prisma/seed.ts')"
# OR from host with local pnpm
pnpm run prisma:push
pnpm run prisma:seed
```

### 5. Verify Running Services
```bash
docker compose -f docker-compose.prod.yml ps
```
- **Web App**: `http://<server-ip>:3000`
- **Backend API**: `http://<server-ip>:4000/api/v1`
- **Swagger Docs**: `http://<server-ip>:4000/docs`

---

## Post-Deployment Quality Checklist

1. **Verify Health Check**:
   ```bash
   curl -I https://<your-api-domain>/api/v1/health
   # Expected: HTTP/1.1 200 OK
   ```
2. **Verify User Login**:
   - Access `https://<your-web-domain>/login`
   - Log in with default test credentials:
     - Email: `admin@kenzo-ehs.com`
     - Password: `KenzoEHS@2026!`
3. **Change Default Passwords in Production**:
   Once logged in as Admin, update passwords for default accounts or create your company's actual user profiles under `/users`.
