import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export class BlobStore {
  private readonly rootPath: string;

  constructor(storagePath: string) {
    this.rootPath = join(storagePath, "blobs");
  }

  async initialize() {
    await mkdir(this.rootPath, { recursive: true });
  }

  async write(recordId: string, createdAt: string, data: Buffer) {
    const month = createdAt.slice(0, 7);
    const blobKey = join(month, recordId, "source");
    const absolutePath = this.resolve(blobKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, data);
    await writeFile(
      this.resolve(join(month, recordId, "metadata.json")),
      JSON.stringify({ recordId, sizeBytes: data.byteLength }, null, 2)
    );
    return blobKey;
  }

  async read(blobKey: string) {
    return readFile(this.resolve(blobKey));
  }

  async remove(blobKey: string | undefined) {
    if (!blobKey) {
      return;
    }

    await rm(dirname(this.resolve(blobKey)), { recursive: true, force: true });
  }

  async sizeOf(blobKey: string | undefined) {
    if (!blobKey) {
      return 0;
    }

    try {
      const info = await stat(this.resolve(blobKey));
      return info.size;
    } catch {
      return 0;
    }
  }

  private resolve(blobKey: string) {
    return join(this.rootPath, blobKey);
  }
}
