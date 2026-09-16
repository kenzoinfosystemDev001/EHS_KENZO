FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kenzo-ehs/types run build
RUN pnpm --filter @kenzo-ehs/utils run build
RUN pnpm --filter @kenzo-ehs/ui run build
RUN pnpm --filter @kenzo-ehs/config run build
RUN pnpm --filter @kenzo-ehs/validation run build
RUN pnpm --filter @kenzo-ehs/web run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app /app

EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "apps/web"]
