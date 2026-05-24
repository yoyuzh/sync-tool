import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("SettingsStore", () => {
  it("migrates the old open-panel shortcut away from the paste-latest shortcut", async () => {
    const { SettingsStore } = await import("../electron/settings/settingsStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-settings-"));
    const settingsPath = path.join(dir, "settings.json");
    await writeFile(
      settingsPath,
      JSON.stringify({
        serverUrl: "http://127.0.0.1:8787",
        deviceName: "Desktop",
        deviceId: "desktop-1",
        clipboardPollingEnabled: true,
        clipboardPollingIntervalMs: 1200,
        autoPublishEnabled: false,
        globalShortcutOpen: "CommandOrControl+Shift+V",
        globalShortcutPublish: "CommandOrControl+Shift+U",
        notificationPreviewEnabled: false,
        openWindowAfterCopyVerificationCode: false,
        maxLocalHistoryItems: 200
      }),
      "utf8"
    );

    const store = new SettingsStore(settingsPath);
    const settings = await store.get();

    expect(settings.globalShortcutOpen).toBe("Control+Command+V");
    expect(settings.globalShortcutPasteLatestOnline).toBe("Command+Shift+V");
    const persisted = await readFile(settingsPath, "utf8");
    expect(persisted).toContain('"globalShortcutOpen": "Control+Command+V"');
    expect(persisted).toContain('"globalShortcutPasteLatestOnline": "Command+Shift+V"');
  });

  it("uses platform-specific default shortcuts", async () => {
    const { getDefaultShortcutSettings } = await import("../electron/settings/settingsStore");

    expect(getDefaultShortcutSettings("darwin")).toEqual({
      globalShortcutOpen: "Control+Command+V",
      globalShortcutPublish: "Control+Command+C",
      globalShortcutPasteLatestOnline: "Command+Shift+V"
    });
    expect(getDefaultShortcutSettings("win32")).toEqual({
      globalShortcutOpen: "Control+Alt+V",
      globalShortcutPublish: "Control+Alt+C",
      globalShortcutPasteLatestOnline: "Control+Shift+V"
    });
  });

  it("persists the server-assigned device id with the device token", async () => {
    const { SettingsStore } = await import("../electron/settings/settingsStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-settings-"));
    const settingsPath = path.join(dir, "settings.json");

    const store = new SettingsStore(settingsPath);
    await store.setDeviceRegistration("http://127.0.0.1:8787", "token-1", "server-device-1");

    const settings = await store.get();
    expect(settings.deviceId).toBe("server-device-1");
    expect(await store.getDeviceToken("http://127.0.0.1:8787")).toBe("token-1");

    const persisted = JSON.parse(await readFile(settingsPath, "utf8")) as {
      deviceId: string;
      registeredDeviceId?: string;
      deviceToken?: string;
      deviceTokenServerUrl?: string;
    };
    expect(persisted.deviceId).toBe("server-device-1");
    expect(persisted.registeredDeviceId).toBe("server-device-1");
    expect(persisted.deviceToken).toBe("token-1");
    expect(persisted.deviceTokenServerUrl).toBe("http://127.0.0.1:8787");
  });

  it("clears registration state when the configured server changes", async () => {
    const { SettingsStore } = await import("../electron/settings/settingsStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-settings-"));
    const settingsPath = path.join(dir, "settings.json");

    const store = new SettingsStore(settingsPath);
    await store.setDeviceRegistration("http://127.0.0.1:8787", "token-1", "server-device-1");
    await store.update({ serverUrl: "http://127.0.0.1:8788" });

    expect(await store.getDeviceToken("http://127.0.0.1:8787")).toBeUndefined();
    expect(await store.getDeviceToken("http://127.0.0.1:8788")).toBeUndefined();

    const persisted = await readFile(settingsPath, "utf8");
    expect(persisted).not.toContain("token-1");
    expect(persisted).not.toContain("registeredDeviceId");
  });

  it("defaults copy-code window opening to disabled and persists updates", async () => {
    const { SettingsStore } = await import("../electron/settings/settingsStore");
    const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-settings-"));
    const settingsPath = path.join(dir, "settings.json");

    const store = new SettingsStore(settingsPath);
    const initial = await store.get();
    expect(initial.openWindowAfterCopyVerificationCode).toBe(false);

    const updated = await store.update({ openWindowAfterCopyVerificationCode: true });
    expect(updated.openWindowAfterCopyVerificationCode).toBe(true);

    const persisted = await readFile(settingsPath, "utf8");
    expect(persisted).toContain('"openWindowAfterCopyVerificationCode": true');
  });
});
