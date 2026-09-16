FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY prisma/ ./prisma/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kenzo-ehs/api run prisma:generate
RUN pnpm --filter @kenzo-ehs/types run build
RUN pnpm --filter @kenzo-ehs/utils run build
RUN pnpm --filter @kenzo-ehs/config run build
RUN pnpm --filter @kenzo-ehs/validation run build
RUN pnpm --filter @kenzo-ehs/api run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app /app

EXPOSE 4000

CMD ["node", "apps/api/dist/apps/api/src/main"]
