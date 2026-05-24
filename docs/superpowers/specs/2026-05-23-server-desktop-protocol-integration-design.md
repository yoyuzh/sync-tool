# Server Desktop Protocol Integration Design

## Summary

This spec defines how `apps/server`, `apps/desktop`, and `packages/shared` should integrate for the first real sync path.

The goal is to move from a mock Electron UI and a hello-only WebSocket server to a stable protocol where desktop clients can register, connect, publish clipboard records, receive broadcasts, and query retained history.

## Current State

Current shared package:

- exports `ClipboardRecord`
- exports `DeviceSession`
- exports retention and size constants

Current server:

- has `GET /health`
- has `GET /ws`
- sends a hello message
- logs received WebSocket messages
- does not authenticate sessions
- does not persist records

Current desktop:

- has a responsive renderer UI shell
- has mock records
- has no server client yet
- has no native clipboard flow wired yet

## Research Basis

This integration uses the documented boundaries from Electron and Fastify:

- Electron renderer access to native APIs should go through preload and `contextBridge`.
- Main-process IPC should expose app-specific handlers.
- Fastify routes should validate JSON payloads with route schemas.
- `@fastify/websocket` should own WebSocket route handling inside the Fastify lifecycle.

References:

- https://www.electronjs.org/docs/latest/tutorial/context-isolation
- https://www.electronjs.org/docs/latest/api/ipc-main
- https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/
- https://github.com/fastify/fastify-websocket

## Goals

- Make `packages/shared` the source of truth for protocol DTOs and message names.
- Use HTTP for request/response operations that need validation, persistence, or binary transfer.
- Use WebSocket for session presence and realtime events.
- Keep desktop network code in Electron main, not React renderer.
- Support reconnect and dedupe without relying on exactly-once delivery.
- Keep the first protocol useful for desktop now and compatible with Android later.

## Non-Goals

- Do not implement peer-to-peer LAN transfer in this protocol pass.
- Do not implement SMS task dispatch in this protocol pass.
- Do not create a public multi-user API.
- Do not expose server secrets or device tokens to renderer UI state.
- Do not make WebSocket the only way to publish records; HTTP remains the durable publish path.

## Core Decisions

### Protocol Versioning

Add a shared protocol version:

```ts
export const SYNC_PROTOCOL_VERSION = 1;
```

Every WebSocket envelope includes the protocol version. HTTP routes are versioned by path under `/api/v1`.

### Shared Package Ownership

`packages/shared` owns:

- protocol constants
- message type string literals
- public DTO interfaces
- API request/response interfaces
- size and retention constants
- device and record domain types

`apps/server` owns:

- token hashes
- database row shapes
- blob filesystem keys
- retention implementation
- socket registry implementation

`apps/desktop` owns:

- renderer UI record shape
- local-only settings
- local history storage details
- main/preload bridge types that are not server protocol types

### Transport Split

Use this split:

```text
HTTP
  device registration
  retained history query
  durable record publish
  record detail query
  blob upload/download

WebSocket
  authenticated live session
  presence snapshot and changes
  record broadcast notifications
  client acknowledgements
  lightweight ping/pong
```

Publishing should go through HTTP first. After the server commits the record, the server broadcasts a WebSocket event.

This avoids losing published records when a WebSocket reconnects mid-send.

## HTTP API Contract

### Device Registration

```text
POST /api/v1/devices/register
```

Request:

```ts
interface RegisterDeviceRequest {
  deviceName: string;
  deviceType: "desktop" | "android";
  capabilities: DeviceCapability[];
}
```

Response:

```ts
interface RegisterDeviceResponse {
  device: DeviceSession;
  token: string;
  protocolVersion: number;
}
```

Desktop stores the token in main-process settings storage. The React renderer should not receive the token.

### History Query

```text
GET /api/v1/history?days=1|3|7|15&limit=20&cursor=<cursor>
```

Response:

```ts
interface HistoryResponse {
  records: ClipboardRecord[];
  nextCursor?: string;
  serverTime: string;
}
```

Server returns records sorted newest first. Cursor format is opaque to clients.

### Publish Record

```text
POST /api/v1/records/publish
```

Request:

```ts
interface PublishRecordRequest {
  record: ClipboardRecordDraft;
  clientRequestId: string;
}
```

Response:

```ts
interface PublishRecordResponse {
  record: ClipboardRecord;
  acceptedAt: string;
}
```

Desktop generates `clientRequestId` for idempotency. Server should return the existing result if the same device repeats the same request id.

### Blob Transfer

```text
POST /api/v1/records/:recordId/blob
GET  /api/v1/records/:recordId/blob
```

Blob storage is only for source files/images within server storage limits. Large files use metadata-only records until peer transfer exists.

## WebSocket Contract

### Envelope

Every WebSocket message uses one envelope:

```ts
interface SyncMessage<TType extends string = string, TPayload = unknown> {
  protocolVersion: number;
  type: TType;
  messageId: string;
  sentAt: string;
  requestId?: string;
  payload: TPayload;
}
```

`messageId` is unique per message. `requestId` correlates replies or acknowledgements.

### Client To Server Messages

```ts
type ClientMessage =
  | SyncMessage<"client.hello", ClientHelloPayload>
  | SyncMessage<"client.ping", ClientPingPayload>
  | SyncMessage<"history.refresh", HistoryRefreshPayload>
  | SyncMessage<"record.ack", RecordAckPayload>;
```

`record.publish` is intentionally not required for the first durable publish path. If added later, it must use the same service and idempotency semantics as HTTP publish.

### Server To Client Messages

```ts
type ServerMessage =
  | SyncMessage<"server.hello", ServerHelloPayload>
  | SyncMessage<"server.pong", ServerPongPayload>
  | SyncMessage<"presence.snapshot", PresenceSnapshotPayload>
  | SyncMessage<"presence.changed", PresenceChangedPayload>
  | SyncMessage<"record.published", RecordPublishedPayload>
  | SyncMessage<"record.updated", RecordUpdatedPayload>
  | SyncMessage<"server.error", ServerErrorPayload>;
```

### Session Start

1. Desktop opens `/ws` with bearer-token authentication.
2. Server authenticates token.
3. Server registers the socket in the in-memory session registry.
4. Server sends `server.hello`.
5. Server sends `presence.snapshot`.
6. Desktop sends `client.hello` with capabilities and last known sync position.
7. Desktop performs HTTP history query if it needs backfill.

### Reconnect

WebSocket delivery is at-least-once.

Desktop reconnect behavior:

1. reconnect with stored token
2. wait for `server.hello`
3. fetch history using the latest local `lastSyncAt` or chosen day window
4. merge by record id
5. update local connection status

Server should not rely on a live socket to guarantee history sync. Retained HTTP history is the recovery source.

## Record Identity And Dedupe

Desktop creates a local record id when clipboard content is captured.

Server stores the client record id as the canonical record id if it is unique. If the same source device publishes the same record id again with the same idempotency key, return the existing record. If the same id appears with conflicting content, return `409 conflict`.

Clients dedupe by:

- `record.id`
- fallback `contentHash` when present

## Publish Flow

```text
desktop main
  local clipboard record selected by user
  POST /api/v1/records/publish

server
  validates token and schema
  stores record metadata and optional text content
  applies retention if needed
  broadcasts record.published to online sessions
  returns PublishRecordResponse

desktop main
  marks local record as published
  forwards history update to renderer
```

No automatic upload occurs from clipboard watcher alone.

## Remote Receive Flow

```text
server
  sends record.published over WebSocket

desktop main
  validates protocol version and message type
  stores/merges remote record into local history
  optionally shows native notification
  notifies renderer history changed
  sends record.ack
```

Renderer receives display-ready history through preload subscriptions, not raw socket messages.

## History Expansion Flow

```text
renderer
  user selects 1 / 3 / 7 / 15 days

desktop main
  GET /api/v1/history
  merge records into local history
  notify renderer

renderer
  display merged local + remote list newest first
```

The server returns retained remote history. The desktop merges it with local-only records.

## Error Semantics

HTTP uses:

```ts
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

WebSocket uses:

```ts
interface ServerErrorPayload {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}
```

Shared error codes:

- `unauthorized`
- `protocol_version_unsupported`
- `validation_failed`
- `record_not_found`
- `conflict`
- `storage_limit_exceeded`
- `rate_limited`
- `internal_error`

Desktop behavior:

- retry only when `retryable` is true or when HTTP/network failure is transient
- never retry a validation failure without user or code changes
- keep local records visible when publish fails

## Shared Type Additions

Add these to `packages/shared` during implementation:

```ts
export const SYNC_PROTOCOL_VERSION = 1;

export type DeviceCapability =
  | "clipboard.read.text"
  | "clipboard.write.text"
  | "clipboard.read.image"
  | "clipboard.write.image"
  | "history.query"
  | "record.publish";

export interface ClipboardRecordDraft {
  id: string;
  createdAt: string;
  sourceDeviceId: string;
  kind: RecordKind;
  title: string;
  textPreview?: string;
  textContent?: string;
  mimeType?: string;
  sizeBytes: number;
  storageMode: StorageMode;
  contentHash?: string;
}
```

Keep server persistence-only fields out of these public DTOs.

## Security Rules

- HTTP and WebSocket both require device authentication except `GET /health` and device registration.
- Desktop main process stores tokens; renderer does not.
- Server never logs raw clipboard content.
- Desktop never sends local clipboard records until user explicitly publishes.
- Protocol messages must reject unsupported `protocolVersion`.
- Blob endpoints must enforce size and ownership rules.

## Testing And Verification

Minimum checks when protocol types change:

```bash
rtk pnpm --filter @sync-tool/shared build
rtk pnpm --filter @sync-tool/server typecheck
rtk pnpm --filter @sync-tool/desktop typecheck
rtk pnpm build
```

Add integration coverage for:

- shared type imports in server and desktop
- device registration and authenticated history call
- publish text record over HTTP
- server broadcasts `record.published`
- desktop merge logic dedupes record ids
- reconnect backfills from history
- unauthorized WebSocket connection is rejected
- unsupported protocol version returns a stable error

## Acceptance Criteria

- Shared protocol constants and DTOs exist in `packages/shared`.
- Server validates all HTTP protocol input with schemas.
- Desktop main process owns HTTP/WebSocket communication.
- Renderer receives local API data through preload, not raw network calls.
- Publish is durable over HTTP before broadcast.
- WebSocket reconnect can recover through retained history.
- Android remains a protocol consumer only from this repository perspective.
