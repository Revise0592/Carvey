FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CARVEY_DATA_DIR=/app/data
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

LABEL org.opencontainers.image.title="Carvey"
LABEL org.opencontainers.image.description="Self-hosted car maintenance dashboard"
LABEL org.opencontainers.image.source="https://github.com/Revise0592/Carvey"

RUN useradd --system --uid 1001 --create-home carvey
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
RUN mkdir -p /app/data && chown -R carvey:carvey /app

USER carvey
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"
CMD ["node", "server.js"]
