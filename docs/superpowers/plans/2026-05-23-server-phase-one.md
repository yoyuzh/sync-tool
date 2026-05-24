# Server Phase One Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first real server surface for device registration, bearer auth, retained history, publish, WebSocket presence, broadcast, and retention.

**Architecture:** `apps/server/src/app.ts` creates a Fastify app from injected config and services. Route modules call focused services; services call SQLite-backed repositories and filesystem blob storage. `packages/shared` owns the public DTOs, protocol constants, message names, and shared error shape.

**Tech Stack:** TypeScript, Fastify, `@fastify/websocket`, Node.js 24 `node:sqlite`, Node filesystem APIs, pnpm workspace.

---

### Task 1: Shared Protocol Types

**Files:**
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] Add protocol version, capability strings, message names, API DTOs, `ClipboardRecordDraft`, `ApiErrorResponse`, and WebSocket envelope types.
- [ ] Run `rtk pnpm --filter @sync-tool/shared build`.

### Task 2: Server App Factory And Services

**Files:**
- Create: `apps/server/src/app.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/config.ts`
- Create: `apps/server/src/services/*.ts`
- Create: `apps/server/src/storage/*.ts`
- Create: `apps/server/src/realtime/sessionRegistry.ts`

- [ ] Add `buildApp` with Fastify, websocket registration, app service decoration, health route, authenticated API routes, and WebSocket route.
- [ ] Keep `index.ts` as config + startup only.
- [ ] Use `node:sqlite` for metadata and `data/blobs` for blob payload boundaries.

### Task 3: Device Registration And Bearer Auth

**Files:**
- Create: `apps/server/src/routes/devices.ts`
- Create: `apps/server/src/plugins/auth.ts`
- Create: `apps/server/src/services/deviceService.ts`
- Create: `apps/server/src/storage/deviceRepository.ts`

- [ ] Implement `POST /api/v1/devices/register`, token generation, token hashing, and durable device rows.
- [ ] Implement authenticated `GET /api/v1/devices`.
- [ ] Reject protected APIs without `Authorization: Bearer <token>`.

### Task 4: Retained History And Publish

**Files:**
- Create: `apps/server/src/routes/history.ts`
- Create: `apps/server/src/routes/records.ts`
- Create: `apps/server/src/services/recordService.ts`
- Create: `apps/server/src/storage/recordRepository.ts`
- Create: `apps/server/src/storage/blobStore.ts`
- Create: `apps/server/src/storage/retentionService.ts`

- [ ] Implement `GET /api/v1/history`, `GET /api/v1/records/:recordId`, and `POST /api/v1/records/publish`.
- [ ] Enforce idempotency by `(source_device_id, client_request_id)`.
- [ ] Broadcast `record.published` after durable publish.
- [ ] Run retention on startup, after publish, and periodically.

### Task 5: Blob API Boundary

**Files:**
- Create: `apps/server/src/routes/blobs.ts`
- Modify: `apps/server/src/services/recordService.ts`

- [ ] Implement authenticated `POST /api/v1/records/:recordId/blob` for raw body uploads up to `INLINE_FILE_MAX_BYTES`.
- [ ] Implement authenticated `GET /api/v1/records/:recordId/blob`.
- [ ] Keep large-file and peer-transfer support out of phase one.

### Task 6: WebSocket Auth, Presence, And Protocol

**Files:**
- Modify: `apps/server/src/realtime/socketServer.ts`
- Create: `apps/server/src/realtime/protocolHandlers.ts`
- Modify: `apps/server/src/realtime/sessionRegistry.ts`

- [ ] Authenticate `/ws` with bearer token in headers or `token` query param.
- [ ] Send `server.hello` and `presence.snapshot` on connect.
- [ ] Broadcast `presence.changed` on connect/disconnect.
- [ ] Handle `client.ping`, `history.refresh`, and `record.ack`.

### Task 7: Verification

**Files:**
- Optional create: `apps/server/src/**/*.test.ts` or `apps/server/scripts/*.ts` if package test tooling is added.

- [ ] Run `rtk pnpm --filter @sync-tool/shared build`.
- [ ] Run `rtk pnpm --filter @sync-tool/server typecheck`.
- [ ] Run `rtk pnpm --filter @sync-tool/server build`.
- [ ] Run `rtk pnpm build`.
- [ ] Record any unimplemented scope clearly.
