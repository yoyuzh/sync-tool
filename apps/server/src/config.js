import { HISTORY_MAX_STORAGE_BYTES, HISTORY_RETENTION_DAYS } from "@sync-tool/shared";
export function loadConfig() {
    return {
        host: process.env.SYNC_SERVER_HOST ?? "0.0.0.0",
        port: Number(process.env.SYNC_SERVER_PORT ?? 8787),
        storagePath: process.env.SYNC_STORAGE_PATH ?? "./data",
        retentionDays: Number(process.env.SYNC_RETENTION_DAYS ?? HISTORY_RETENTION_DAYS),
        maxStorageBytes: Number(process.env.SYNC_MAX_STORAGE_BYTES ?? HISTORY_MAX_STORAGE_BYTES)
    };
}
