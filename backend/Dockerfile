FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY backend/package.json ./backend/
COPY shared/ ./shared/
WORKDIR /app/backend
RUN pnpm install --frozen-lockfile

FROM base AS runner
WORKDIR /app
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/
COPY shared/ ./shared/
WORKDIR /app/backend
EXPOSE 3001
CMD ["npx", "tsx", "src/index.ts"]
