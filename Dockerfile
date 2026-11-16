# Pinned by digest for reproducible builds; Dependabot (.github/dependabot.yml) proposes updates.
FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:26-bookworm-slim@sha256:5df79989ed685e09f0a98019db4cebfb22fb9df1a53c0161664a011f7ff6b0f1 AS runner
WORKDIR /app
# Set by the release workflow from the Git tag (e.g. V1.7.0 -> 1.7.0), so the app reports the version
# it was released as. Left empty for local builds, which fall back to package.json.
ARG CARVEY_VERSION=""
ARG CARVEY_COMMIT=""
ENV CARVEY_VERSION=${CARVEY_VERSION}
ENV CARVEY_COMMIT=${CARVEY_COMMIT}
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
# Account recovery (`docker exec <container> node scripts/reset-password.mjs`) runs outside Next,
# so neither the script nor bcryptjs is part of the traced standalone output: copy them in.
COPY --from=builder /app/scripts/reset-password.mjs ./scripts/reset-password.mjs
COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs
RUN mkdir -p /app/data && chown -R carvey:carvey /app

USER carvey
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"
CMD ["node", "server.js"]
