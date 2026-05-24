FROM node:24-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY apps/server/package.json apps/server/package.json
COPY apps/server/tsconfig.json apps/server/tsconfig.json
COPY apps/server/src apps/server/src

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @sync-tool/shared build
RUN pnpm --filter @sync-tool/server build

FROM node:24-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/shared/src packages/shared/src
COPY apps/server/package.json apps/server/package.json

RUN pnpm install --frozen-lockfile --prod --filter @sync-tool/server...

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/server/dist apps/server/dist

ENV SYNC_SERVER_HOST=0.0.0.0
ENV SYNC_SERVER_PORT=8787
ENV SYNC_STORAGE_PATH=/var/lib/sync-tool/data

EXPOSE 8787

CMD ["node", "apps/server/dist/index.js"]
