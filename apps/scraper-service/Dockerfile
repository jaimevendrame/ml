# Build context: . (repo root)
FROM mcr.microsoft.com/playwright:v1.48.0-jammy AS builder
WORKDIR /build
COPY apps/scraper-service/package.json ./
RUN npm install
COPY apps/scraper-service/ .
RUN npx tsc

FROM mcr.microsoft.com/playwright:v1.48.0-jammy
WORKDIR /app
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/package.json ./package.json
ENV PORT=8081
EXPOSE 8081
ENTRYPOINT ["node", "dist/index.js"]
