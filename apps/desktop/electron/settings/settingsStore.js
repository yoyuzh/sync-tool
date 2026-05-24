import os from "node:os";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
export class SettingsStore {
    filePath;
    settings = null;
    constructor(filePath) {
        this.filePath = filePath;
    }
    async get() {
        const settings = await this.getInternal();
        return withoutToken(settings);
    }
    async getDeviceToken(serverUrl) {
        const settings = await this.getInternal();
        if (settings.deviceTokenServerUrl !== serverUrl) {
            return undefined;
        }
        return settings.deviceToken;
    }
    async setDeviceToken(serverUrl, deviceToken) {
        const settings = await this.getInternal();
        this.settings = { ...settings, deviceToken, deviceTokenServerUrl: serverUrl };
        await this.persist(this.settings);
    }
    async clearDeviceToken(serverUrl) {
        const settings = await this.getInternal();
        if (serverUrl && settings.deviceTokenServerUrl !== serverUrl) {
            return;
        }
        this.settings = {
            ...settings,
            deviceToken: undefined,
            deviceTokenServerUrl: undefined
        };
        await this.persist(this.settings);
    }
    async update(patch) {
        const settings = await this.getInternal();
        const serverUrlChanged = typeof patch.serverUrl === "string" && patch.serverUrl !== settings.serverUrl;
        const nextSettings = sanitizeSettings({
            ...settings,
            ...patch,
            autoPublishEnabled: false,
            deviceToken: serverUrlChanged ? undefined : settings.deviceToken,
            deviceTokenServerUrl: serverUrlChanged ? undefined : settings.deviceTokenServerUrl
        });
        this.settings = nextSettings;
        await this.persist(nextSettings);
        return withoutToken(nextSettings);
    }
    async getInternal() {
        if (this.settings) {
            return this.settings;
        }
        try {
            const contents = await readFile(this.filePath, "utf8");
            const parsed = JSON.parse(contents);
            this.settings = sanitizeSettings(applyShortcutDefaults(parsed));
            if (JSON.stringify(parsed) !== JSON.stringify(this.settings)) {
                await this.persist(this.settings);
            }
        }
        catch {
            this.settings = createDefaultSettings();
            await this.persist(this.settings);
        }
        return this.settings;
    }
    async persist(settings) {
        await mkdir(path.dirname(this.filePath), { recursive: true });
        const tmpPath = `${this.filePath}.tmp`;
        await writeFile(tmpPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
        await rename(tmpPath, this.filePath);
    }
}
function applyShortcutDefaults(settings) {
    const defaults = createDefaultSettings();
    const hadPasteLatestOnlineShortcut = typeof settings.globalShortcutPasteLatestOnline === "string";
    const merged = {
        ...defaults,
        ...settings
    };
    if (!hadPasteLatestOnlineShortcut && merged.globalShortcutOpen === "CommandOrControl+Shift+V") {
        merged.globalShortcutOpen = defaults.globalShortcutOpen;
    }
    return merged;
}
function createDefaultSettings() {
    return {
        serverUrl: "http://127.0.0.1:8787",
        deviceName: os.hostname() || "Desktop",
        deviceId: `desktop-${randomUUID()}`,
        clipboardPollingEnabled: true,
        clipboardPollingIntervalMs: 1200,
        autoPublishEnabled: false,
        globalShortcutOpen: "Control+Command+V",
        globalShortcutPublish: "Control+Command+C",
        globalShortcutPasteLatestOnline: "Command+Shift+V",
        notificationPreviewEnabled: false,
        maxLocalHistoryItems: 200
    };
}
function sanitizeSettings(settings) {
    return {
        serverUrl: typeof settings.serverUrl === "string" ? settings.serverUrl : "http://127.0.0.1:8787",
        deviceName: typeof settings.deviceName === "string" ? settings.deviceName : "Desktop",
        deviceId: typeof settings.deviceId === "string" ? settings.deviceId : `desktop-${randomUUID()}`,
        deviceToken: typeof settings.deviceToken === "string" ? settings.deviceToken : undefined,
        deviceTokenServerUrl: typeof settings.deviceTokenServerUrl === "string" ? settings.deviceTokenServerUrl : undefined,
        clipboardPollingEnabled: Boolean(settings.clipboardPollingEnabled),
        clipboardPollingIntervalMs: clampNumber(settings.clipboardPollingIntervalMs, 500, 10000, 1200),
        autoPublishEnabled: false,
        globalShortcutOpen: typeof settings.globalShortcutOpen === "string"
            ? settings.globalShortcutOpen
            : "Control+Command+V",
        globalShortcutPublish: typeof settings.globalShortcutPublish === "string"
            ? settings.globalShortcutPublish
            : "Control+Command+C",
        globalShortcutPasteLatestOnline: typeof settings.globalShortcutPasteLatestOnline === "string"
            ? settings.globalShortcutPasteLatestOnline
            : "Command+Shift+V",
        notificationPreviewEnabled: Boolean(settings.notificationPreviewEnabled),
        maxLocalHistoryItems: clampNumber(settings.maxLocalHistoryItems, 20, 2000, 200)
    };
}
function clampNumber(value, min, max, fallback) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
    }
    return Math.min(max, Math.max(min, Math.round(value)));
}
function withoutToken(settings) {
    const { deviceToken: _deviceToken, deviceTokenServerUrl: _deviceTokenServerUrl, ...publicSettings } = settings;
    return publicSettings;
}
