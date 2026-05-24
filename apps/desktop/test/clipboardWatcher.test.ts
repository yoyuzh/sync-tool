import type { ClipboardRecord } from "@sync-tool/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function createHistoryStore() {
  const records = new Map<string, ClipboardRecord>();
  return {
    addLocalDraft: vi.fn(async (draft) => {
      const record = { ...draft, publishState: "local" as const };
      records.set(record.contentHash ?? record.id, record);
      return record;
    }),
    getByContentHash: vi.fn(async (contentHash: string) => records.get(contentHash) ?? null)
  };
}
