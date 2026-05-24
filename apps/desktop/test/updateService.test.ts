import { describe, expect, it, vi } from "vitest";

describe("startAutoUpdate", () => {
  it("skips auto updates for unpackaged builds", async () => {
    const { startAutoUpdate } = await import("../electron/update/updateService");
    const updater = createUpdater();

    const started = startAutoUpdate({
      isPackaged: false,
      platform: "win32",
      updater,
      showStatus: vi.fn()
    });

    expect(started).toBe(false);
    expect(updater.checkForUpdates).not.toHaveBeenCalled();
  });

  it("configures and starts auto updates for packaged Windows builds", async () => {
    const { startAutoUpdate } = await import("../electron/update/updateService");
    const updater = createUpdater();
    const showStatus = vi.fn();

    const started = startAutoUpdate({
      isPackaged: true,
      platform: "win32",
      updater,
      showStatus
    });

    expect(started).toBe(true);
    expect(updater.autoDownload).toBe(true);
    expect(updater.autoInstallOnAppQuit).toBe(true);
    expect(updater.checkForUpdates).toHaveBeenCalledTimes(1);

    updater.emit("update-available");
    updater.emit("update-downloaded");

    expect(showStatus).toHaveBeenCalledWith("发现新版本", "正在后台下载更新");
    expect(showStatus).toHaveBeenCalledWith("更新已就绪", "退出应用后会自动安装新版本");
  });
});

function createUpdater() {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  return {
    autoDownload: false,
    autoInstallOnAppQuit: false,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return undefined;
    }),
    checkForUpdates: vi.fn(async () => undefined),
    emit: (event: string, ...args: unknown[]) => {
      handlers.get(event)?.(...args);
    }
  };
}
