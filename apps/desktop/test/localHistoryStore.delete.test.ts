import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ClipboardRecord } from "@sync-tool/shared";
import { describe, expect, it } from "vitest";

describe("LocalHistoryStore delete", () => {
  it("removes a record from local history", async () => {
    const { LocalHistoryStore } = await import("../electron/history/localHistoryStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-history-delete-"));
    const store = new LocalHistoryStore(path.join(dir, "history.json"), 20);

    await store.merge(makeRecord("record-1"));
    await store.merge(makeRecord("record-2"));
    await store.remove("record-1");

    const records = await store.list();
    expect(records.map((record) => record.id)).toEqual(["record-2"]);
  });
});

function makeRecord(id: string): ClipboardRecord {
  return {
    id,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    sourceDeviceId: "device-1",
    kind: "text",
    title: id,
    textPreview: id,
    textContent: id,
    sizeBytes: id.length,
    storageMode: "metadata_only",
    publishState: "local"
  };
}
