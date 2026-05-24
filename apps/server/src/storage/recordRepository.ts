import type { DatabaseSync } from "node:sqlite";
import type {
  ClipboardRecord,
  ClipboardRecordDraft,
  PublishState,
  RecordKind,
  StorageMode
} from "@sync-tool/shared";

interface RecordRow {
  id: string;
  created_at: string;
  updated_at: string;
  source_device_id: string;
  kind: RecordKind;
  title: string;
  text_preview: string | null;
  text_content: string | null;
  mime_type: string | null;
  size_bytes: number;
  storage_mode: StorageMode;
  publish_state: PublishState;
  blob_key: string | null;
  content_hash: string | null;
  client_request_id: string;
  accepted_at: string;
}

export interface StoredRecord {
  record: ClipboardRecord;
  blobKey?: string;
  clientRequestId: string;
  acceptedAt: string;
}

export class RecordRepository {
  constructor(private readonly db: DatabaseSync) {}

  createPublished(input: {
    draft: ClipboardRecordDraft;
    sourceDeviceId: string;
    clientRequestId: string;
    acceptedAt: string;
  }) {
    const updatedAt = input.acceptedAt;

    this.db
      .prepare(`
        INSERT INTO records (
          id,
          created_at,
          updated_at,
          source_device_id,
          kind,
          title,
          text_preview,
          text_content,
          mime_type,
          size_bytes,
          storage_mode,
          publish_state,
          content_hash,
          client_request_id,
          accepted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.draft.id,
        input.draft.createdAt,
        updatedAt,
        input.sourceDeviceId,
        input.draft.kind,
        input.draft.title,
        input.draft.textPreview ?? null,
        input.draft.textContent ?? null,
        input.draft.mimeType ?? null,
        input.draft.sizeBytes,
        input.draft.storageMode,
        "published",
        input.draft.contentHash ?? null,
        input.clientRequestId,
        input.acceptedAt
      );

    return this.findById(input.draft.id);
  }

  findById(recordId: string) {
    const row = this.db
      .prepare("SELECT * FROM records WHERE id = ?")
      .get(recordId) as RecordRow | undefined;
    return row ? mapRecord(row) : undefined;
  }

  findByClientRequest(sourceDeviceId: string, clientRequestId: string) {
    const row = this.db
      .prepare(`
        SELECT * FROM records
        WHERE source_device_id = ? AND client_request_id = ?
      `)
      .get(sourceDeviceId, clientRequestId) as RecordRow | undefined;
    return row ? mapRecord(row) : undefined;
  }

  listHistory(input: { since: string; limit: number; cursor?: string }) {
    const params: (string | number)[] = [input.since];
    let cursorClause = "";
    if (input.cursor) {
      cursorClause = "AND created_at < ?";
      params.push(input.cursor);
    }
    params.push(input.limit);

    const rows = this.db
      .prepare(`
        SELECT * FROM records
        WHERE created_at >= ? ${cursorClause}
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(...params) as unknown as RecordRow[];
    return rows.map(mapRecord);
  }

  attachBlob(input: {
    recordId: string;
    blobKey: string;
    sizeBytes: number;
    mimeType?: string;
    now: string;
  }) {
    this.db
      .prepare(`
        UPDATE records
        SET blob_key = ?, size_bytes = ?, mime_type = COALESCE(?, mime_type), updated_at = ?
        WHERE id = ?
      `)
      .run(
        input.blobKey,
        input.sizeBytes,
        input.mimeType ?? null,
        input.now,
        input.recordId
      );

    this.db
      .prepare(`
        INSERT INTO blob_metadata (record_id, blob_key, size_bytes, mime_type, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(record_id) DO UPDATE SET
          blob_key = excluded.blob_key,
          size_bytes = excluded.size_bytes,
          mime_type = excluded.mime_type,
          created_at = excluded.created_at
      `)
      .run(
        input.recordId,
        input.blobKey,
        input.sizeBytes,
        input.mimeType ?? null,
        input.now
      );

    return this.findById(input.recordId);
  }

  deleteExpired(cutoffIso: string) {
    const rows = this.db
      .prepare("SELECT * FROM records WHERE created_at < ?")
      .all(cutoffIso) as unknown as RecordRow[];
    this.db.prepare("DELETE FROM records WHERE created_at < ?").run(cutoffIso);
    return rows.map(mapRecord);
  }

  listBlobBackedOldest() {
    const rows = this.db
      .prepare(`
        SELECT * FROM records
        WHERE blob_key IS NOT NULL
        ORDER BY created_at ASC
      `)
      .all() as unknown as RecordRow[];
    return rows.map(mapRecord);
  }

  delete(recordId: string) {
    this.db.prepare("DELETE FROM records WHERE id = ?").run(recordId);
  }
}

function mapRecord(row: RecordRow): StoredRecord {
  return {
    record: {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourceDeviceId: row.source_device_id,
      kind: row.kind,
      title: row.title,
      ...(row.text_preview === null ? {} : { textPreview: row.text_preview }),
      ...(row.text_content === null ? {} : { textContent: row.text_content }),
      ...(row.mime_type === null ? {} : { mimeType: row.mime_type }),
      sizeBytes: row.size_bytes,
      storageMode: row.storage_mode,
      publishState: row.publish_state,
      ...(row.content_hash === null ? {} : { contentHash: row.content_hash })
    },
    ...(row.blob_key === null ? {} : { blobKey: row.blob_key }),
    clientRequestId: row.client_request_id,
    acceptedAt: row.accepted_at
  };
}
