import { describe, expect, it } from "vitest";

describe("desktop asset paths", () => {
  it("uses the template tray icon on macOS", async () => {
    const { resolveTrayIconPath } = await import("../electron/assets");

    expect(resolveTrayIconPath({ platform: "darwin", baseDir: "/tmp/app-root" })).toBe(
      "/tmp/app-root/assets/icons/trayTemplate.png"
    );
  });

  it("uses the color app icon on Windows tray and window", async () => {
    const { resolveAppIconPath, resolveTrayIconPath, resolveWindowIconPath } = await import(
      "../electron/assets"
    );

    expect(resolveAppIconPath({ baseDir: "/tmp/app-root" })).toBe(
      "/tmp/app-root/assets/icons/icon.png"
    );
    expect(resolveTrayIconPath({ platform: "win32", baseDir: "/tmp/app-root" })).toBe(
      "/tmp/app-root/assets/icons/icon.png"
    );
    expect(resolveWindowIconPath({ platform: "win32", baseDir: "/tmp/app-root" })).toBe(
      "/tmp/app-root/assets/icons/icon.png"
    );
  });

  it("does not force a BrowserWindow icon on macOS", async () => {
    const { resolveWindowIconPath } = await import("../electron/assets");

    expect(resolveWindowIconPath({ platform: "darwin", baseDir: "/tmp/app-root" })).toBeUndefined();
  });
});
