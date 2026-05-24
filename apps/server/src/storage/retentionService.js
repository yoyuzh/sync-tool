export class RetentionService {
    records;
    blobs;
    options;
    constructor(records, blobs, options) {
        this.records = records;
        this.blobs = blobs;
        this.options = options;
    }
    async run() {
        const cutoff = new Date(Date.now() - this.options.retentionDays * 24 * 60 * 60 * 1000).toISOString();
        const expired = this.records.deleteExpired(cutoff);
        for (const item of expired) {
            await this.blobs.remove(item.blobKey);
        }
        let storageBytes = 0;
        const blobBacked = this.records.listBlobBackedOldest();
        for (const item of blobBacked) {
            storageBytes += await this.blobs.sizeOf(item.blobKey);
        }
        let evictedForSize = 0;
        for (const item of blobBacked) {
            if (storageBytes <= this.options.maxStorageBytes) {
                break;
            }
            const size = await this.blobs.sizeOf(item.blobKey);
            this.records.delete(item.record.id);
            await this.blobs.remove(item.blobKey);
            storageBytes -= size;
            evictedForSize += 1;
        }
        this.options.logger.info({
            expiredRecords: expired.length,
            evictedForSize,
            storageBytes
        }, "retention run completed");
    }
}
