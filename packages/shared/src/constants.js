export const SYNC_PROTOCOL_VERSION = 1;
export const API_V1_PREFIX = "/api/v1";
export const HISTORY_RETENTION_DAYS = 15;
export const HISTORY_MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024;
export const INLINE_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const DEFAULT_RECENT_HISTORY_LIMIT = 20;
export const SYNC_MESSAGE_TYPES = {
    clientHello: "client.hello",
    clientPing: "client.ping",
    historyRefresh: "history.refresh",
    recordAck: "record.ack",
    serverHello: "server.hello",
    serverPong: "server.pong",
    presenceSnapshot: "presence.snapshot",
    presenceChanged: "presence.changed",
    recordPublished: "record.published",
    recordUpdated: "record.updated",
    serverError: "server.error"
};
export const API_ERROR_CODES = {
    unauthorized: "unauthorized",
    forbidden: "forbidden",
    protocolVersionUnsupported: "protocol_version_unsupported",
    validationFailed: "validation_failed",
    recordNotFound: "record_not_found",
    blobTooLarge: "blob_too_large",
    storageLimitExceeded: "storage_limit_exceeded",
    conflict: "conflict",
    rateLimited: "rate_limited",
    internalError: "internal_error"
};
