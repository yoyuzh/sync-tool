export class RecordRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    createPublished(input) {
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
            .run(input.draft.id, input.draft.createdAt, updatedAt, input.sourceDeviceId, input.draft.kind, input.draft.title, input.draft.textPreview ?? null, input.draft.textContent ?? null, input.draft.mimeType ?? null, input.draft.sizeBytes, input.draft.storageMode, "published", input.draft.contentHash ?? null, input.clientRequestId, input.acceptedAt);
        return this.findById(input.draft.id);
    }
    findById(recordId) {
        const row = this.db
            .prepare("SELECT * FROM records WHERE id = ?")
            .get(recordId);
        return row ? mapRecord(row) : undefined;
    }
    findByClientRequest(sourceDeviceId, clientRequestId) {
        const row = this.db
            .prepare(`
        SELECT * FROM records
        WHERE source_device_id = ? AND client_request_id = ?
      `)
            .get(sourceDeviceId, clientRequestId);
        return row ? mapRecord(row) : undefined;
    }
    listHistory(input) {
        const params = [input.since];
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
            .all(...params);
        return rows.map(mapRecord);
    }
    attachBlob(input) {
        this.db
            .prepare(`
        UPDATE records
        SET blob_key = ?, size_bytes = ?, mime_type = COALESCE(?, mime_type), updated_at = ?
        WHERE id = ?
      `)
            .run(input.blobKey, input.sizeBytes, input.mimeType ?? null, input.now, input.recordId);
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
            .run(input.recordId, input.blobKey, input.sizeBytes, input.mimeType ?? null, input.now);
        return this.findById(input.recordId);
    }
    deleteExpired(cutoffIso) {
        const rows = this.db
            .prepare("SELECT * FROM records WHERE created_at < ?")
            .all(cutoffIso);
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
            .all();
        return rows.map(mapRecord);
    }
    delete(recordId) {
        this.db.prepare("DELETE FROM records WHERE id = ?").run(recordId);
    }
}
function mapRecord(row) {
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
