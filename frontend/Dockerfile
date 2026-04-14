FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json frontend/

# Install dependencies (ignoring missing packages locally)
RUN pnpm install --frozen-lockfile || pnpm install

COPY shared/ shared/
COPY frontend/ frontend/

RUN pnpm --filter labs-analyzer-frontend build

FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json frontend/

RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next-i18next.config.js ./frontend/
COPY --from=builder /app/frontend/next.config.js ./frontend/
COPY shared/ shared/

WORKDIR /app/frontend
EXPOSE 3000

CMD ["pnpm", "start"]
