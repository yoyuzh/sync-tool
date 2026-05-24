import os from "node:os";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export interface DesktopSettings {
  serverUrl: string;
  deviceName: string;
  deviceId: string;
  clipboardPollingEnabled: boolean;
  clipboardPollingIntervalMs: number;
  autoPublishEnabled: false;
  globalShortcutOpen: string;
  globalShortcutPublish: string;
  globalShortcutPasteLatestOnline: string;
  notificationPreviewEnabled: boolean;
  openWindowAfterCopyVerificationCode: boolean;
  maxLocalHistoryItems: number;
}

interface SettingsFile extends DesktopSettings {
  deviceToken?: string;
  deviceTokenServerUrl?: string;
  registeredDeviceId?: string;
}

export class SettingsStore {
  private settings: SettingsFile | null = null;

  constructor(private readonly filePath: string) {}

  async get(): Promise<DesktopSettings> {
    const settings = await this.getInternal();
    return withoutToken(settings);
  }

  async getDeviceToken(serverUrl: string): Promise<string | undefined> {
    const settings = await this.getInternal();
    if (settings.deviceTokenServerUrl !== serverUrl) {
      return undefined;
    }

    return settings.deviceToken;
  }

  async setDeviceToken(serverUrl: string, deviceToken: string): Promise<void> {
    const settings = await this.getInternal();
    this.settings = { ...settings, deviceToken, deviceTokenServerUrl: serverUrl };
    await this.persist(this.settings);
  }

  async setDeviceRegistration(serverUrl: string, deviceToken: string, deviceId: string): Promise<void> {
    const settings = await this.getInternal();
    this.settings = {
      ...settings,
      deviceId,
      deviceToken,
      deviceTokenServerUrl: serverUrl,
      registeredDeviceId: deviceId
    };
    await this.persist(this.settings);
  }

  async clearDeviceToken(serverUrl?: string): Promise<void> {
    const settings = await this.getInternal();
    if (serverUrl && settings.deviceTokenServerUrl !== serverUrl) {
      return;
    }

    this.settings = {
      ...settings,
      deviceToken: undefined,
      deviceTokenServerUrl: undefined,
      registeredDeviceId: undefined
    };
    await this.persist(this.settings);
  }

  async update(patch: Partial<DesktopSettings>): Promise<DesktopSettings> {
    const settings = await this.getInternal();
    const serverUrlChanged = typeof patch.serverUrl === "string" && patch.serverUrl !== settings.serverUrl;
    const nextSettings = sanitizeSettings({
      ...settings,
      ...patch,
      autoPublishEnabled: false,
      deviceToken: serverUrlChanged ? undefined : settings.deviceToken,
      deviceTokenServerUrl: serverUrlChanged ? undefined : settings.deviceTokenServerUrl,
      registeredDeviceId: serverUrlChanged ? undefined : settings.registeredDeviceId
    });
    this.settings = nextSettings;
    await this.persist(nextSettings);
    return withoutToken(nextSettings);
  }

  private async getInternal(): Promise<SettingsFile> {
    if (this.settings) {
      return this.settings;
    }

    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(contents) as Partial<SettingsFile>;
      this.settings = sanitizeSettings(applyShortcutDefaults(parsed));
      if (JSON.stringify(parsed) !== JSON.stringify(this.settings)) {
        await this.persist(this.settings);
      }
    } catch {
      this.settings = createDefaultSettings();
      await this.persist(this.settings);
    }

    return this.settings;
  }

  private async persist(settings: SettingsFile): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmpPath = `${this.filePath}.tmp`;
    await writeFile(tmpPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(tmpPath, this.filePath);
  }
}

function applyShortcutDefaults(settings: Partial<SettingsFile>): SettingsFile {
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

function createDefaultSettings(): SettingsFile {
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
    openWindowAfterCopyVerificationCode: false,
    maxLocalHistoryItems: 200
  };
}

function sanitizeSettings(settings: SettingsFile): SettingsFile {
  return {
    serverUrl: typeof settings.serverUrl === "string" ? settings.serverUrl : "http://127.0.0.1:8787",
    deviceName: typeof settings.deviceName === "string" ? settings.deviceName : "Desktop",
    deviceId: typeof settings.deviceId === "string" ? settings.deviceId : `desktop-${randomUUID()}`,
    deviceToken: typeof settings.deviceToken === "string" ? settings.deviceToken : undefined,
    deviceTokenServerUrl:
      typeof settings.deviceTokenServerUrl === "string" ? settings.deviceTokenServerUrl : undefined,
    registeredDeviceId: typeof settings.registeredDeviceId === "string" ? settings.registeredDeviceId : undefined,
    clipboardPollingEnabled: Boolean(settings.clipboardPollingEnabled),
    clipboardPollingIntervalMs: clampNumber(settings.clipboardPollingIntervalMs, 500, 10000, 1200),
    autoPublishEnabled: false,
    globalShortcutOpen:
      typeof settings.globalShortcutOpen === "string"
        ? settings.globalShortcutOpen
        : "Control+Command+V",
    globalShortcutPublish:
      typeof settings.globalShortcutPublish === "string"
        ? settings.globalShortcutPublish
        : "Control+Command+C",
    globalShortcutPasteLatestOnline:
      typeof settings.globalShortcutPasteLatestOnline === "string"
        ? settings.globalShortcutPasteLatestOnline
        : "Command+Shift+V",
    notificationPreviewEnabled: Boolean(settings.notificationPreviewEnabled),
    openWindowAfterCopyVerificationCode: Boolean(settings.openWindowAfterCopyVerificationCode),
    maxLocalHistoryItems: clampNumber(settings.maxLocalHistoryItems, 20, 2000, 200)
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function withoutToken(settings: SettingsFile): DesktopSettings {
  const {
    deviceToken: _deviceToken,
    deviceTokenServerUrl: _deviceTokenServerUrl,
    ...publicSettings
  } = settings;
  return publicSettings;
}
