# Server Development Design

## Summary

This spec defines the server-side development direction for `sync-tool-cs` after the Android repository split.

The server remains the central control-plane authority for device sessions, retained clipboard history, realtime broadcasts, file/blob metadata, and future cross-device task routing. Android client implementation belongs in `sync-tool-android`; this server may expose protocol surface used by Android, but it must not contain Android production code.

## Current State

The current server package is `@sync-tool/server`.

- Entry point: `apps/server/src/index.ts`
- Config: `apps/server/src/config.ts`
- Health route: `apps/server/src/routes/health.ts`
- Realtime route: `apps/server/src/realtime/socketServer.ts`
- Stack: Node.js, TypeScript, Fastify, `@fastify/websocket`
- Existing routes:
  - `GET /health`
  - `GET /ws`
- Existing persistence:
  - creates `SYNC_STORAGE_PATH` or `./data`
  - no durable metadata database yet
  - no blob layout yet

## Research Basis

This design follows the current primary docs:

- Fastify validation and serialization should use route schemas and JSON Schema.
- Fastify plugins provide the right boundary for encapsulated route groups and shared services.
- `@fastify/websocket` integrates websocket routes with Fastify routing and lifecycle.
- Fastify TypeScript support is compatible with typed route handlers and plugin modules.

References:

- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- https://fastify.dev/docs/latest/Reference/Plugins/
- https://fastify.dev/docs/latest/Reference/TypeScript/
- https://github.com/fastify/fastify-websocket

## Goals

- Provide durable retained history for published clipboard records.
- Provide realtime presence and record broadcast over WebSocket.
- Provide HTTP APIs for device registration, publish, history query, and blob access.
- Keep server protocol and DTO definitions aligned with `packages/shared`.
- Support desktop first while leaving protocol room for the separate Android repo.
- Keep the first deploy simple enough for a single-user controlled server.

## Non-Goals

- Do not implement Android client code in this repository.
- Do not build SMS execution logic in the server in this phase.
- Do not add multi-tenant admin features in this phase.
- Do not implement LAN peer-to-peer transfer in the server.
- Do not expose unauthenticated history or blob APIs.

## Core Decisions

### Server Structure

Keep Fastify as the application shell and split server code into focused modules:

```text
apps/server/src/
  index.ts
  config.ts
  app.ts
  plugins/
    auth.ts
    schemas.ts
    storage.ts
  routes/
    health.ts
    devices.ts
    history.ts
    records.ts
    blobs.ts
  realtime/
    socketServer.ts
    sessionRegistry.ts
    protocolHandlers.ts
  storage/
    database.ts
    recordRepository.ts
    deviceRepository.ts
    blobStore.ts
    retentionService.ts
```

`index.ts` should only load config, create the app, start listening, and handle fatal startup failures.

`app.ts` should build the Fastify instance, register plugins, and return the app for tests.

### Persistence

Use SQLite metadata plus filesystem blob storage for phase one.

The repository docs already require Node.js 24+. Prefer Node's built-in `node:sqlite` for the server metadata store to avoid native dependency management during the first deployment. Wrap it behind repository interfaces so the implementation can move to an async driver or worker-backed storage later without changing route handlers.

SQLite should store:

- devices
- retained clipboard records
- optional blob metadata
- publish delivery metadata when needed

Filesystem storage should store source blobs under the configured storage directory.

```text
data/
  sync-tool.sqlite
  blobs/
    <yyyy-mm>/
      <record-id>/
        source
        metadata.json
```

### Retention

The server owns retention.

Current shared defaults:

- `HISTORY_RETENTION_DAYS = 15`
- `HISTORY_MAX_STORAGE_BYTES = 5 GB`
- `INLINE_FILE_MAX_BYTES = 10 MB`

Retention must:

1. delete expired records first
2. remove associated blobs for deleted records
3. if storage still exceeds the byte cap, evict oldest blob-backed records until under the cap
4. keep metadata-only records small and queryable until they expire by age

Run retention:

- on startup
- after successful publish
- on a periodic interval while the server is running

### Authentication

Use a simple bearer-token device model for the first production path.

Device registration returns a generated token. Subsequent HTTP and WebSocket calls use:

```text
Authorization: Bearer <device-token>
```

For local development, allow a configured bootstrap token or local-only registration mode through `.env`. Do not hardcode secrets in source files.

### HTTP API Surface

Use `/api/v1` for all non-health APIs.

Required first endpoints:

```text
GET  /health
POST /api/v1/devices/register
GET  /api/v1/devices
GET  /api/v1/history?days=1|3|7|15&limit=20
POST /api/v1/records/publish
GET  /api/v1/records/:recordId
POST /api/v1/records/:recordId/blob
GET  /api/v1/records/:recordId/blob
```

`POST /api/v1/records/publish` accepts metadata and text payloads. Blob upload uses a separate endpoint so publish metadata can be validated before accepting binary data.

If multipart support is added, use `@fastify/multipart` only inside the blob route module. Do not mix multipart parsing into general JSON routes.

### WebSocket API Surface

Keep WebSocket at:

```text
GET /ws
```

The client authenticates with a bearer token during connection setup. The socket route should bind message/error/close handlers synchronously, then perform async session work behind those handlers to avoid losing early messages.

The server should send:

- `server.hello`
- `presence.snapshot`
- `presence.changed`
- `record.published`
- `record.updated`
- `server.error`

The client may send:

- `client.hello`
- `record.ack`
- `history.refresh`
- `client.ping`

Durable publish should use `POST /api/v1/records/publish` in the first implementation. A future `record.publish` WebSocket command may be added only if it reuses the same validation, persistence, and idempotency semantics as the HTTP endpoint.

The protocol envelope is defined in the server-desktop protocol integration spec.

### Error Model

All HTTP errors should use one response shape:

```ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

Use stable error codes such as:

- `unauthorized`
- `forbidden`
- `validation_failed`
- `record_not_found`
- `blob_too_large`
- `storage_limit_exceeded`
- `conflict`
- `internal_error`

WebSocket errors should use the same code vocabulary inside a protocol message.

## Data Model

### Device

```ts
interface StoredDevice {
  deviceId: string;
  deviceName: string;
  deviceType: "desktop" | "android";
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}
```

### Clipboard Record

```ts
interface StoredClipboardRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  sourceDeviceId: string;
  kind: "text" | "image" | "document";
  title: string;
  textPreview?: string;
  textContent?: string;
  mimeType?: string;
  sizeBytes: number;
  storageMode: "source_file" | "metadata_only";
  publishState: "local" | "published" | "broadcast";
  blobKey?: string;
  contentHash?: string;
}
```

The shared package should define public DTOs. Server-only persistence details, such as `tokenHash` and `blobKey`, stay in `apps/server`.

## Module Boundaries

Route handlers should not perform storage details directly.

Preferred call flow:

```text
route -> service -> repository/blobStore -> sqlite/filesystem
```

Realtime handlers should not mutate database state directly. They should use the same services as HTTP routes.

The session registry remains in memory in phase one. Durable presence is not required; durable devices are required.

## Observability

Use Fastify logger for structured logs.

Log these events:

- server startup config summary without secrets
- device registration
- WebSocket connect/disconnect
- publish success/failure
- retention run summary
- blob upload success/failure

Do not log clipboard text content or raw blob data.

## Security Rules

- Never expose history, records, or blobs without authentication.
- Never store raw device tokens; store a hash.
- Reject blobs larger than `INLINE_FILE_MAX_BYTES` for direct server storage.
- Validate all JSON route input with Fastify schemas.
- Keep async database or filesystem work out of schema validation. Use route handlers or `preHandler` hooks.
- Do not silently publish clipboard data. Server APIs accept published records only when a client explicitly sends them.

## Testing And Verification

Server implementation should add tests as behavior becomes real.

Minimum checks for server work:

```bash
rtk pnpm --filter @sync-tool/server typecheck
rtk pnpm --filter @sync-tool/server build
```

When storage and routes are implemented, add route-level tests for:

- health route
- device registration
- unauthorized access rejection
- publish text record
- query history by days and limit
- metadata-only large record
- blob upload size rejection
- retention deletion
- websocket hello and broadcast message shape

## Acceptance Criteria

- Server has a testable app factory.
- Routes are split by domain and use JSON schemas.
- Device tokens protect history, publish, blob, and WebSocket access.
- Published text records persist durably and can be queried.
- File/image metadata can be stored even before full blob transfer is complete.
- WebSocket sessions can receive record broadcasts.
- Retention policy is centralized and can be invoked deterministically.
