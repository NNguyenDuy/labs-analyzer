# Multi-stage Dockerfile for Backend
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root configurations (for pnpm workspaces)
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/
COPY shared/ shared/

# Install ALL deps (including devDeps like typescript, @types/node)
# --shamefully-hoist ensures binaries and modules are accessible from workspace root
RUN pnpm install --no-frozen-lockfile --shamefully-hoist

# Copy backend source code
COPY backend/ backend/

# Build: tsc now finds all modules because they're hoisted to /app/node_modules
RUN /app/node_modules/.bin/tsc -p backend/tsconfig.json

# ── Runner stage ──────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/

# Install only production dependencies (hoisted so node can find them)
RUN pnpm install --prod --no-frozen-lockfile --shamefully-hoist

# Copy built artifacts and schema
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend/schema.sql ./backend/schema.sql

# Defaults to running the api
CMD ["node", "backend/dist/backend/src/index.js"]
