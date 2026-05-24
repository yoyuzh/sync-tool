import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ClipboardRecord, ClipboardRecordDraft } from "@sync-tool/shared";

interface HistoryFile {
  records: ClipboardRecord[];
}

export class LocalHistoryStore {
  private records: ClipboardRecord[] = [];
  private loaded = false;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly maxItems: number
  ) {}

  async list(): Promise<ClipboardRecord[]> {
    await this.ensureLoaded();
    return [...this.records];
  }

  async get(recordId: string): Promise<ClipboardRecord | null> {
    await this.ensureLoaded();
    return this.records.find((record) => record.id === recordId) ?? null;
  }

  async getByContentHash(contentHash: string): Promise<ClipboardRecord | null> {
    await this.ensureLoaded();
    return this.records.find((record) => record.contentHash === contentHash) ?? null;
  }

  async addLocalDraft(draft: ClipboardRecordDraft): Promise<ClipboardRecord> {
    const record: ClipboardRecord = {
      ...draft,
      publishState: "local"
    };
    await this.merge(record);
    return record;
  }

  async merge(record: ClipboardRecord): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueWrite(() => {
      const existingIndex = this.records.findIndex((item) => item.id === record.id);
      if (existingIndex >= 0) {
        this.records[existingIndex] = { ...this.records[existingIndex], ...record };
      } else {
        this.records.unshift(record);
      }
      this.sortAndTrim();
    });
  }

  async mergeMany(records: ClipboardRecord[]): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueWrite(() => {
      for (const record of records) {
        const existingIndex = this.records.findIndex((item) => item.id === record.id);
        if (existingIndex >= 0) {
          this.records[existingIndex] = { ...this.records[existingIndex], ...record };
        } else {
          this.records.push(record);
        }
      }
      this.sortAndTrim();
    });
  }

  async markPublished(record: ClipboardRecord): Promise<void> {
    await this.merge({ ...record, publishState: "published" });
  }

  async remove(recordId: string): Promise<void> {
    await this.ensureLoaded();
    await this.enqueueWrite(() => {
      this.records = this.records.filter((record) => record.id !== recordId);
    });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(contents) as Partial<HistoryFile>;
      this.records = Array.isArray(parsed.records) ? parsed.records.filter(isClipboardRecord) : [];
      this.sortAndTrim();
    } catch {
      this.records = [];
    }

    this.loaded = true;
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    const payload: HistoryFile = { records: this.records };
    await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    await rename(tmpPath, this.filePath);
  }

  private enqueueWrite(mutate: () => void): Promise<void> {
    const write = this.writeQueue.then(async () => {
      mutate();
      await this.persist();
    });
    this.writeQueue = write.catch(() => {});
    return write;
  }

  private sortAndTrim(): void {
    this.records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    this.records = this.records.slice(0, this.maxItems);
  }
}

function isClipboardRecord(value: unknown): value is ClipboardRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Partial<ClipboardRecord>;
  return (
    typeof record.id === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.sourceDeviceId === "string" &&
    typeof record.title === "string" &&
    typeof record.kind === "string" &&
    typeof record.sizeBytes === "number" &&
    typeof record.storageMode === "string" &&
    typeof record.publishState === "string"
  );
}
