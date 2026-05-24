import type { ClipboardRecord } from "@sync-tool/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashClipboardText } from "../electron/clipboard/clipboardNormalizer";

const clipboardState = {
  text: "",
  html: "",
  imageDataUrl: ""
};

vi.mock("electron", () => ({
  clipboard: {
    readText: () => clipboardState.text,
    readHTML: () => clipboardState.html,
    readImage: () => ({
      isEmpty: () => clipboardState.imageDataUrl.length === 0,
      toDataURL: () => clipboardState.imageDataUrl
    }),
    writeText: (text: string) => {
      clipboardState.text = text;
    }
  }
}));

describe("ClipboardWatcher", () => {
  beforeEach(() => {
    clipboardState.text = "";
    clipboardState.html = "";
    clipboardState.imageDataUrl = "";
  });

  it("returns the existing local record when the same clipboard text is captured again", async () => {
    const { ClipboardWatcher } = await import("../electron/clipboard/clipboardWatcher");
    type ClipboardWatcherOptions = ConstructorParameters<typeof ClipboardWatcher>[0];
    const historyStore = createHistoryStore();
    const watcher = new ClipboardWatcher({
      settingsStore: createSettingsStore() as unknown as ClipboardWatcherOptions["settingsStore"],
      historyStore: historyStore as unknown as ClipboardWatcherOptions["historyStore"],
      onRecordCaptured: vi.fn()
    });

    clipboardState.text = "repeat me";
    const first = await watcher.captureCurrent();
    const second = await watcher.captureCurrent();

    expect(first).toBeTruthy();
    expect(second).toEqual(first);
    expect(historyStore.addLocalDraft).toHaveBeenCalledTimes(1);
  });

  it("creates a new local record when the same clipboard text only matches a published record", async () => {
    const { ClipboardWatcher } = await import("../electron/clipboard/clipboardWatcher");
    type ClipboardWatcherOptions = ConstructorParameters<typeof ClipboardWatcher>[0];
    const historyStore = createHistoryStore([
      {
        id: "remote-1",
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
        sourceDeviceId: "desktop-remote",
        kind: "text",
        title: "repeat me",
        textPreview: "repeat me",
        textContent: "repeat me",
        mimeType: "text/plain",
        sizeBytes: 9,
        storageMode: "metadata_only",
        publishState: "published",
        contentHash: hashClipboardText("repeat me")
      }
    ]);
    const onRecordCaptured = vi.fn();
    const watcher = new ClipboardWatcher({
      settingsStore: createSettingsStore() as unknown as ClipboardWatcherOptions["settingsStore"],
      historyStore: historyStore as unknown as ClipboardWatcherOptions["historyStore"],
      onRecordCaptured
    });

    clipboardState.text = "repeat me";
    const captured = await watcher.captureCurrent();

    expect(captured).toBeTruthy();
    expect(captured?.id).not.toBe("remote-1");
    expect(captured?.publishState).toBe("local");
    expect(historyStore.addLocalDraft).toHaveBeenCalledTimes(1);
    expect(onRecordCaptured).toHaveBeenCalledWith(
      expect.objectContaining({
        publishState: "local"
      })
    );
  });
});

function createSettingsStore() {
  return {
    get: vi.fn(async () => ({
      serverUrl: "http://127.0.0.1:8787",
      deviceName: "Desktop",
      deviceId: "desktop-1",
      clipboardPollingEnabled: true,
      clipboardPollingIntervalMs: 1200,
      autoPublishEnabled: false as const,
      globalShortcutOpen: "Control+Command+V",
      globalShortcutPublish: "Control+Command+C",
      globalShortcutPasteLatestOnline: "Command+Shift+V",
      notificationPreviewEnabled: false,
      openWindowAfterCopyVerificationCode: false,
      maxLocalHistoryItems: 200
    }))
  };
}

function createHistoryStore(seedRecords: ClipboardRecord[] = []) {
  const records = new Map<string, ClipboardRecord>();
  for (const record of seedRecords) {
    records.set(record.contentHash ?? record.id, record);
  }

  return {
    addLocalDraft: vi.fn(async (draft) => {
      const record = { ...draft, publishState: "local" as const };
      records.set(record.contentHash ?? record.id, record);
      return record;
    }),
    getByContentHash: vi.fn(async (contentHash: string) => records.get(contentHash) ?? null)
  };
}
