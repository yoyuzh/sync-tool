import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
export class BlobStore {
    rootPath;
    constructor(storagePath) {
        this.rootPath = join(storagePath, "blobs");
    }
    async initialize() {
        await mkdir(this.rootPath, { recursive: true });
    }
    async write(recordId, createdAt, data) {
        const month = createdAt.slice(0, 7);
        const blobKey = join(month, recordId, "source");
        const absolutePath = this.resolve(blobKey);
        await mkdir(dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, data);
        await writeFile(this.resolve(join(month, recordId, "metadata.json")), JSON.stringify({ recordId, sizeBytes: data.byteLength }, null, 2));
        return blobKey;
    }
    async read(blobKey) {
        return readFile(this.resolve(blobKey));
    }
    async remove(blobKey) {
        if (!blobKey) {
            return;
        }
        await rm(dirname(this.resolve(blobKey)), { recursive: true, force: true });
    }
    async sizeOf(blobKey) {
        if (!blobKey) {
            return 0;
        }
        try {
            const info = await stat(this.resolve(blobKey));
            return info.size;
        }
        catch {
            return 0;
        }
    }
    resolve(blobKey) {
        return join(this.rootPath, blobKey);
    }
}
