# syntax=docker/dockerfile:1.7
#
# Pulse — Interval Timer
# Multi-stage build that produces a minimal (< 200 MB) production image.
#
# Build:  docker build -t ak20001701/interval-timer:latest .
# Run:    docker run --rm -p 3000:3000 ak20001701/interval-timer:latest
#
# The runtime stage is built on top of Next.js' "standalone" output
# (configured in next.config.ts), which bundles only the node_modules that
# are actually required at runtime, drastically shrinking the final image.

ARG NODE_VERSION=22-alpine

# ─── Stage 1: install dependencies ─────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
# `libc6-compat` is needed by some native modules under Alpine.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only the lockfile + package.json so this layer is cached independently
# of source-code changes.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ─── Stage 2: build the Next.js app ────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

# Reuse cached node_modules.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# ─── Stage 3: minimal runtime ──────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 --ingroup nodejs nextjs

# Standalone output already contains a minimal node_modules + server.js.
# We still need to ship `public/` and `.next/static/` separately because
# Next intentionally omits them from the standalone bundle (they're meant
# to be served by a CDN; we serve them ourselves).
COPY --from=builder --chown=nextjs:nodejs /app/public            ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone  ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static      ./.next/static

USER nextjs

EXPOSE 3000

# tini-style PID-1 handling is provided implicitly by `node`.
CMD ["node", "server.js"]
