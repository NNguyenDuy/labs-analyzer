# Multi-stage Dockerfile for Backend
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root configurations (for pnpm workspaces)
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/

# Only install dependencies first (leverage Docker cache)
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code using workspace context
COPY backend/ backend/
COPY shared/ shared/

# Build the backend
RUN pnpm --filter labs-analyzer-backend build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/

# Install only production dependencies
# Since pnpm workspace requires the whole workspace, we just install normally
RUN pnpm install --prod

# Copy built artifacts from builder
COPY --from=builder /app/backend/dist ./dist

# Defaults to running the api
CMD ["node", "dist/backend/src/index.js"]
