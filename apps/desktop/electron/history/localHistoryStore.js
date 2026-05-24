import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
export class LocalHistoryStore {
    filePath;
    maxItems;
    records = [];
    loaded = false;
    constructor(filePath, maxItems) {
        this.filePath = filePath;
        this.maxItems = maxItems;
    }
    async list() {
        await this.ensureLoaded();
        return [...this.records];
    }
    async get(recordId) {
        await this.ensureLoaded();
        return this.records.find((record) => record.id === recordId) ?? null;
    }
    async addLocalDraft(draft) {
        const record = {
            ...draft,
            publishState: "local"
        };
        await this.merge(record);
        return record;
    }
    async merge(record) {
        await this.ensureLoaded();
        const existingIndex = this.records.findIndex((item) => item.id === record.id);
        if (existingIndex >= 0) {
            this.records[existingIndex] = { ...this.records[existingIndex], ...record };
        }
        else {
            this.records.unshift(record);
        }
        this.sortAndTrim();
        await this.persist();
    }
    async mergeMany(records) {
        await this.ensureLoaded();
        for (const record of records) {
            const existingIndex = this.records.findIndex((item) => item.id === record.id);
            if (existingIndex >= 0) {
                this.records[existingIndex] = { ...this.records[existingIndex], ...record };
            }
            else {
                this.records.push(record);
            }
        }
        this.sortAndTrim();
        await this.persist();
    }
    async markPublished(record) {
        await this.merge({ ...record, publishState: "published" });
    }
    async ensureLoaded() {
        if (this.loaded) {
            return;
        }
        try {
            const contents = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(contents);
            this.records = Array.isArray(parsed.records) ? parsed.records.filter(isClipboardRecord) : [];
            this.sortAndTrim();
        }
        catch {
            this.records = [];
        }
        this.loaded = true;
    }
    async persist() {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        const tmpPath = `${this.filePath}.tmp`;
        const payload = { records: this.records };
        await writeFile(tmpPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
        await rename(tmpPath, this.filePath);
    }
    sortAndTrim() {
        this.records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        this.records = this.records.slice(0, this.maxItems);
    }
}
function isClipboardRecord(value) {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const record = value;
    return (typeof record.id === "string" &&
        typeof record.createdAt === "string" &&
        typeof record.sourceDeviceId === "string" &&
        typeof record.title === "string" &&
        typeof record.kind === "string" &&
        typeof record.sizeBytes === "number" &&
        typeof record.storageMode === "string" &&
        typeof record.publishState === "string");
}
