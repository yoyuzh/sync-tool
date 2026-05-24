import type {
  ClipboardRecord,
  ClipboardRecordDraft,
  HistoryResponse,
  PublishRecordRequest,
  PublishRecordResponse
} from "@sync-tool/shared";
import { DEFAULT_RECENT_HISTORY_LIMIT, INLINE_FILE_MAX_BYTES } from "@sync-tool/shared";
import { blobTooLarge, conflict, recordNotFound, validationFailed } from "../errors";
import type { BlobStore } from "../storage/blobStore";
import type { RecordRepository } from "../storage/recordRepository";
import type { RetentionService } from "../storage/retentionService";

export class RecordService {
  private onPublish?: (record: ClipboardRecord) => void | Promise<void>;

  constructor(
    private readonly records: RecordRepository,
    private readonly blobs: BlobStore,
    private readonly retention: RetentionService
  ) {}

  setPublishListener(listener: (record: ClipboardRecord) => void | Promise<void>) {
    this.onPublish = listener;
  }

  history(input: { days?: number; limit?: number; cursor?: string }): HistoryResponse {
    const days = normalizeDays(input.days);
    const limit = normalizeLimit(input.limit);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const rows = this.records.listHistory({ since, limit: limit + 1, cursor: input.cursor });
    const page = rows.slice(0, limit);
    const next = rows.length > limit ? page.at(-1)?.record.createdAt : undefined;

    return {
      records: page.map((row) => row.record),
      ...(next ? { nextCursor: next } : {}),
      serverTime: new Date().toISOString()
    };
  }

  async publish(
    sourceDeviceId: string,
    request: PublishRecordRequest
  ): Promise<PublishRecordResponse> {
    validateDraft(request.record, sourceDeviceId);

    const existing = this.records.findByClientRequest(
      sourceDeviceId,
      request.clientRequestId
    );
    if (existing) {
      ensureSameRecord(existing.record, request.record);
      return {
        record: existing.record,
        acceptedAt: existing.acceptedAt
      };
    }

    const sameId = this.records.findById(request.record.id);
    if (sameId) {
      throw conflict("Record id already exists with a different request", {
        recordId: request.record.id
      });
    }

    const acceptedAt = new Date().toISOString();
    const created = this.records.createPublished({
      draft: request.record,
      sourceDeviceId,
      clientRequestId: request.clientRequestId,
      acceptedAt
    });

    if (!created) {
      throw new Error("Record publish failed");
    }

    await this.retention.run();
    await this.onPublish?.(created.record);

    return {
      record: created.record,
      acceptedAt
    };
  }

  get(recordId: string) {
    const record = this.records.findById(recordId);
    if (!record) {
      throw recordNotFound(recordId);
    }

    return record.record;
  }

  async writeBlob(input: {
    recordId: string;
    data: Buffer;
    mimeType?: string;
  }) {
    if (input.data.byteLength > INLINE_FILE_MAX_BYTES) {
      throw blobTooLarge(INLINE_FILE_MAX_BYTES);
    }

    const stored = this.records.findById(input.recordId);
    if (!stored) {
      throw recordNotFound(input.recordId);
    }

    const blobKey = await this.blobs.write(
      input.recordId,
      stored.record.createdAt,
      input.data
    );
    const updated = this.records.attachBlob({
      recordId: input.recordId,
      blobKey,
      sizeBytes: input.data.byteLength,
      mimeType: input.mimeType,
      now: new Date().toISOString()
    });

    if (!updated) {
      throw recordNotFound(input.recordId);
    }

    await this.retention.run();
    return updated.record;
  }

  async readBlob(recordId: string) {
    const stored = this.records.findById(recordId);
    if (!stored) {
      throw recordNotFound(recordId);
    }
    if (!stored.blobKey) {
      throw recordNotFound(recordId);
    }

    return {
      record: stored.record,
      data: await this.blobs.read(stored.blobKey)
    };
  }
}

function validateDraft(draft: ClipboardRecordDraft, sourceDeviceId: string) {
  if (draft.sourceDeviceId !== sourceDeviceId) {
    throw validationFailed({
      sourceDeviceId: "record.sourceDeviceId must match authenticated device"
    });
  }
  if (draft.storageMode === "source_file" && draft.textContent) {
    throw validationFailed({
      textContent: "source_file records must upload blob content separately"
    });
  }
}

function ensureSameRecord(existing: ClipboardRecord, draft: ClipboardRecordDraft) {
  const fields: (keyof ClipboardRecordDraft)[] = [
    "id",
    "createdAt",
    "sourceDeviceId",
    "kind",
    "title",
    "textPreview",
    "textContent",
    "mimeType",
    "sizeBytes",
    "storageMode",
    "contentHash"
  ];

  for (const field of fields) {
    if (existing[field] !== draft[field]) {
      throw conflict("Idempotency key reused with different record content", {
        field
      });
    }
  }
}

function normalizeDays(days = 1) {
  if ([1, 3, 7, 15].includes(days)) {
    return days;
  }
  throw validationFailed({ days: "days must be one of 1, 3, 7, 15" });
}

function normalizeLimit(limit = DEFAULT_RECENT_HISTORY_LIMIT) {
  if (Number.isInteger(limit) && limit > 0 && limit <= 100) {
    return limit;
  }
  throw validationFailed({ limit: "limit must be an integer from 1 to 100" });
}
