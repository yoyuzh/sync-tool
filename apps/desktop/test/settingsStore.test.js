import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
describe("SettingsStore", () => {
    it("migrates the old open-panel shortcut away from the paste-latest shortcut", async () => {
        const { SettingsStore } = await import("../electron/settings/settingsStore");
        const dir = await mkdtemp(path.join(os.tmpdir(), "clipbridge-settings-"));
        const settingsPath = path.join(dir, "settings.json");
        await writeFile(settingsPath, JSON.stringify({
            serverUrl: "http://127.0.0.1:8787",
            deviceName: "Desktop",
            deviceId: "desktop-1",
            clipboardPollingEnabled: true,
            clipboardPollingIntervalMs: 1200,
            autoPublishEnabled: false,
            globalShortcutOpen: "CommandOrControl+Shift+V",
            globalShortcutPublish: "CommandOrControl+Shift+U",
            notificationPreviewEnabled: false,
            maxLocalHistoryItems: 200
        }), "utf8");
        const store = new SettingsStore(settingsPath);
        const settings = await store.get();
        expect(settings.globalShortcutOpen).toBe("Control+Command+V");
        expect(settings.globalShortcutPasteLatestOnline).toBe("Command+Shift+V");
        const persisted = await readFile(settingsPath, "utf8");
        expect(persisted).toContain('"globalShortcutOpen": "Control+Command+V"');
        expect(persisted).toContain('"globalShortcutPasteLatestOnline": "Command+Shift+V"');
    });
});
