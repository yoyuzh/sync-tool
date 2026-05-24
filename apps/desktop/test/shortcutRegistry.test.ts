import { beforeEach, describe, expect, it, vi } from "vitest";

const registerMock = vi.fn();
const unregisterAllMock = vi.fn();

vi.mock("electron", () => ({
  globalShortcut: {
    register: registerMock,
    unregisterAll: unregisterAllMock
  }
}));

describe("ShortcutRegistry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerMock.mockReturnValue(true);
  });

  it("binds publish, open, and paste latest online shortcuts to distinct actions", async () => {
    const { ShortcutRegistry } = await import("../electron/shortcuts/shortcutRegistry");
    const onOpenPanel = vi.fn();
    const onPublishCurrent = vi.fn();
    const onPasteLatestOnline = vi.fn();
    const registry = new ShortcutRegistry({
      onOpenPanel,
      onPublishCurrent,
      onPasteLatestOnline,
      onFailure: vi.fn()
    });

    registry.register({
      serverUrl: "http://127.0.0.1:8787",
      deviceName: "Desktop",
      deviceId: "desktop-1",
      clipboardPollingEnabled: true,
      clipboardPollingIntervalMs: 1200,
      autoPublishEnabled: false,
      globalShortcutOpen: "Control+Command+V",
      globalShortcutPublish: "Control+Command+C",
      globalShortcutPasteLatestOnline: "Command+Shift+V",
      notificationPreviewEnabled: false,
      maxLocalHistoryItems: 200
    });

    const openCallback = registerMock.mock.calls.find(
      ([accelerator]) => accelerator === "Control+Command+V"
    )?.[1] as (() => void) | undefined;
    const publishCallback = registerMock.mock.calls.find(
      ([accelerator]) => accelerator === "Control+Command+C"
    )?.[1] as (() => void) | undefined;
    const pasteLatestOnlineCallback = registerMock.mock.calls.find(
      ([accelerator]) => accelerator === "Command+Shift+V"
    )?.[1] as (() => void) | undefined;

    openCallback?.();
    publishCallback?.();
    pasteLatestOnlineCallback?.();

    expect(onOpenPanel).toHaveBeenCalledTimes(1);
    expect(onPublishCurrent).toHaveBeenCalledTimes(1);
    expect(onPasteLatestOnline).toHaveBeenCalledTimes(1);
  });
});
