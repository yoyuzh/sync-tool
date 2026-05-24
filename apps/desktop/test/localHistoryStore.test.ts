import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ClipboardRecord } from "@sync-tool/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  let activeRename = false;

  return {
    ...actual,
    rename: vi.fn(async (from: string, to: string) => {
      if (activeRename) {
        throw new Error("history writes are not serialized");
      }
      activeRename = true;
      await new Promise((resolve) => setTimeout(resolve, 10));
      try {
        return await actual.rename(from, to);
      } finally {
        activeRename = false;
      }
    })
  };
});

describe("LocalHistoryStore", () => {
  it("serializes concurrent writes to the same history file", async () => {
    const { LocalHistoryStore } = await import("../electron/history/localHistoryStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-history-"));
    const store = new LocalHistoryStore(path.join(dir, "history.json"), 20);

    await expect(
      Promise.all([
        store.merge(makeRecord("record-1")),
        store.merge(makeRecord("record-2"))
      ])
    ).resolves.toHaveLength(2);
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
