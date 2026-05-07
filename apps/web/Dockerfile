# Build stage
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./
COPY packages/db/package.json ./packages/db/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --filter @ofertaml/web...

COPY packages/db/ ./packages/db/
COPY apps/web/ ./apps/web/

WORKDIR /app/apps/web
# Env placeholders para Next.js build (valores reais injectados em runtime)
RUN DATABASE_URL="postgres://x:x@localhost:5432/x" \
    BETTER_AUTH_SECRET="00000000000000000000000000000000" \
    BETTER_AUTH_URL="http://localhost:3500" \
    pnpm build

# Runtime stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web/server.js"]
