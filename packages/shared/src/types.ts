import type { SYNC_MESSAGE_TYPES } from "./constants";

export type RecordKind = "text" | "image" | "document";

export type StorageMode = "source_file" | "metadata_only";

export type PublishState = "local" | "published" | "broadcast";

export type DeviceType = "desktop" | "android";

export type DeviceCapability =
  | "clipboard.read.text"
  | "clipboard.write.text"
  | "clipboard.read.image"
  | "clipboard.write.image"
  | "history.query"
  | "record.publish";

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "protocol_version_unsupported"
  | "validation_failed"
  | "record_not_found"
  | "blob_too_large"
  | "storage_limit_exceeded"
  | "conflict"
  | "rate_limited"
  | "internal_error";

export type ConnectionState = "offline" | "connecting" | "online" | "error";

export interface ClipboardRecord {
  id: string;
  createdAt: string;
  updatedAt?: string;
  sourceDeviceId: string;
  kind: RecordKind;
  title: string;
  textPreview?: string;
  textContent?: string;
  mimeType?: string;
  sizeBytes: number;
  storageMode: StorageMode;
  publishState: PublishState;
  contentHash?: string;
}

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

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities?: DeviceCapability[];
  online: boolean;
  lastSeenAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface RegisterDeviceRequest {
  deviceName: string;
  deviceType: DeviceType;
  capabilities: DeviceCapability[];
}

export interface RegisterDeviceResponse {
  device: DeviceSession;
  token: string;
  protocolVersion: number;
}

export interface HistoryResponse {
  records: ClipboardRecord[];
  nextCursor?: string;
  serverTime: string;
}

export interface PublishRecordRequest {
  record: ClipboardRecordDraft;
  clientRequestId: string;
}

export interface PublishRecordResponse {
  record: ClipboardRecord;
  acceptedAt: string;
}

export interface SyncMessage<TType extends string = string, TPayload = unknown> {
  protocolVersion: number;
  type: TType;
  messageId: string;
  sentAt: string;
  requestId?: string;
  payload: TPayload;
}

export interface ClientHelloPayload {
  device: DeviceSession;
  capabilities: DeviceCapability[];
  lastSyncAt?: string;
}

export interface ClientPingPayload {
  clientTime: string;
}

export interface HistoryRefreshPayload {
  days?: number;
  limit?: number;
  cursor?: string;
}

export interface RecordAckPayload {
  recordId: string;
  receivedAt: string;
}

export interface ServerHelloPayload {
  device: DeviceSession;
  protocolVersion: number;
  serverTime: string;
}

export interface ServerPongPayload {
  clientTime?: string;
  serverTime: string;
}

export interface PresenceSnapshotPayload {
  devices: DeviceSession[];
}

export interface PresenceChangedPayload {
  device: DeviceSession;
  online: boolean;
}

export interface RecordPublishedPayload {
  record: ClipboardRecord;
}

export interface RecordUpdatedPayload {
  record: ClipboardRecord;
}

export interface ServerErrorPayload {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
  retryable: boolean;
}

export interface ConnectionStatus {
  state: ConnectionState;
  serverUrl: string;
  lastConnectedAt?: string;
  lastError?: string;
  onlineDevices: number;
}

export type ClientMessage =
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.clientHello, ClientHelloPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.clientPing, ClientPingPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.historyRefresh, HistoryRefreshPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.recordAck, RecordAckPayload>;

export type ServerMessage =
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.serverHello, ServerHelloPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.serverPong, ServerPongPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.presenceSnapshot, PresenceSnapshotPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.presenceChanged, PresenceChangedPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.recordPublished, RecordPublishedPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.recordUpdated, RecordUpdatedPayload>
  | SyncMessage<typeof SYNC_MESSAGE_TYPES.serverError, ServerErrorPayload>;
