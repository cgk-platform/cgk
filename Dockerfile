# CGK Platform - Multi-stage Docker Build
# Builds all apps for production deployment

# =============================================================================
# Base stage - Node.js 22 with pnpm
# =============================================================================
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy all package.json files to enable proper installation
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/ui/package.json ./packages/ui/
COPY packages/commerce/package.json ./packages/commerce/
COPY packages/shopify/package.json ./packages/shopify/
COPY packages/payments/package.json ./packages/payments/
COPY packages/jobs/package.json ./packages/jobs/
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/analytics/package.json ./packages/analytics/
COPY packages/logging/package.json ./packages/logging/
COPY packages/integrations/package.json ./packages/integrations/
COPY packages/feature-flags/package.json ./packages/feature-flags/
COPY packages/onboarding/package.json ./packages/onboarding/
COPY packages/dam/package.json ./packages/dam/
COPY packages/cli/package.json ./packages/cli/

# Copy app package.json files
COPY apps/admin/package.json ./apps/admin/
COPY apps/storefront/package.json ./apps/storefront/
COPY apps/orchestrator/package.json ./apps/orchestrator/
COPY apps/creator-portal/package.json ./apps/creator-portal/
COPY apps/contractor-portal/package.json ./apps/contractor-portal/
COPY apps/mcp-server/package.json ./apps/mcp-server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================================================
# Builder stage - Build all packages and apps
# =============================================================================
FROM base AS builder

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps

# Copy source code
COPY . .

# Build all packages first, then apps
RUN pnpm turbo build

# =============================================================================
# Admin runner stage
# =============================================================================
FROM base AS admin-runner
ENV NODE_ENV=production

# Copy built admin app
COPY --from=builder /app/apps/admin/.next/standalone ./
COPY --from=builder /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=builder /app/apps/admin/public ./apps/admin/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]

# =============================================================================
# Orchestrator runner stage
# =============================================================================
FROM base AS orchestrator-runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/orchestrator/.next/standalone ./
COPY --from=builder /app/apps/orchestrator/.next/static ./apps/orchestrator/.next/static
COPY --from=builder /app/apps/orchestrator/public ./apps/orchestrator/public

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/orchestrator/server.js"]

# =============================================================================
# Storefront runner stage
# =============================================================================
FROM base AS storefront-runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/storefront/.next/standalone ./
COPY --from=builder /app/apps/storefront/.next/static ./apps/storefront/.next/static
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public

EXPOSE 3002
ENV PORT=3002
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/storefront/server.js"]

# =============================================================================
# Creator Portal runner stage
# =============================================================================
FROM base AS creator-portal-runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/creator-portal/.next/standalone ./
COPY --from=builder /app/apps/creator-portal/.next/static ./apps/creator-portal/.next/static
COPY --from=builder /app/apps/creator-portal/public ./apps/creator-portal/public

EXPOSE 3003
ENV PORT=3003
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/creator-portal/server.js"]

# =============================================================================
# Contractor Portal runner stage
# =============================================================================
FROM base AS contractor-portal-runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/contractor-portal/.next/standalone ./
COPY --from=builder /app/apps/contractor-portal/.next/static ./apps/contractor-portal/.next/static
COPY --from=builder /app/apps/contractor-portal/public ./apps/contractor-portal/public

EXPOSE 3004
ENV PORT=3004
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/contractor-portal/server.js"]

# =============================================================================
# MCP Server runner stage
# =============================================================================
FROM base AS mcp-server-runner
ENV NODE_ENV=production

COPY --from=builder /app/apps/mcp-server/dist ./dist
COPY --from=builder /app/apps/mcp-server/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3005
ENV PORT=3005

CMD ["node", "dist/index.js"]

# =============================================================================
# Default target - Admin app
# =============================================================================
FROM admin-runner AS runner
