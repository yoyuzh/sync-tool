import { describe, expect, it, vi } from "vitest";

describe("pasteTextIntoActiveApp", () => {
  it("sends the macOS paste accelerator", async () => {
    const keyTap = vi.fn();
    vi.doMock("electron", () => ({
      clipboard: { writeText: vi.fn() },
      nativeImage: {},
      Notification: vi.fn(),
      globalShortcut: { register: vi.fn(), unregisterAll: vi.fn() }
    }));
    vi.doMock("node:child_process", () => ({
      execFile: vi.fn()
    }));

    const { pasteIntoActiveApp } = await import("../electron/clipboard/nativePasteService");

    await pasteIntoActiveApp({
      platform: "darwin",
      keyTap
    });

    expect(keyTap).toHaveBeenCalledWith("v", "command");
  });
});
