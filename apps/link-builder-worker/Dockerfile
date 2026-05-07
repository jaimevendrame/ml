# Single stage: uses tsx to run TypeScript directly (no compile step).
# Workspace packages (@ofertaml/db) resolved via pnpm symlinks.
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# Workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json ./

# Copy source BEFORE install so workspace symlinks resolve
COPY packages/db/ ./packages/db/
COPY apps/link-builder-worker/ ./apps/link-builder-worker/

# Install only this service + its workspace deps
RUN pnpm install --filter @ofertaml/link-builder-worker...

ENV PORT=8082
EXPOSE 8082
WORKDIR /app/apps/link-builder-worker
CMD ["node_modules/.bin/tsx", "src/index.ts"]
