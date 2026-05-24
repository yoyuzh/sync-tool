import { ipcMain, type BrowserWindow } from "electron";
import type { ClipboardRecord } from "@sync-tool/shared";
import { DEFAULT_RECENT_HISTORY_LIMIT } from "@sync-tool/shared";
import { IPC_CHANNELS } from "./channels";
import type { ClipboardWatcher } from "../clipboard/clipboardWatcher";
import type { LocalHistoryStore } from "../history/localHistoryStore";
import type { NotificationItem } from "../notifications/notificationService";
import type { ServerSessionClient } from "../server/serverSessionClient";
import type { DesktopSettings, SettingsStore } from "../settings/settingsStore";
import type { ShortcutRegistry } from "../shortcuts/shortcutRegistry";

interface RegisterIpcOptions {
  getWindow: () => BrowserWindow | null;
  historyStore: LocalHistoryStore;
  settingsStore: SettingsStore;
  clipboardWatcher: ClipboardWatcher;
  serverSessionClient: ServerSessionClient;
  shortcutRegistry: ShortcutRegistry;
  onSettingsChanged?: (settings: DesktopSettings) => void;
}

export function registerIpc(options: RegisterIpcOptions): void {
  ipcMain.handle(IPC_CHANNELS.historyList, async () => options.historyStore.list());

  ipcMain.handle(IPC_CHANNELS.historyGet, async (_event, recordId: unknown) => {
    if (!isRecordId(recordId)) {
      return null;
    }

    return options.historyStore.get(recordId);
  });

  ipcMain.handle(IPC_CHANNELS.historyCopy, async (_event, recordId: unknown) => {
    if (!isRecordId(recordId)) {
      throw new Error("无效的记录 ID");
    }

    const record = await options.historyStore.get(recordId);
    if (!record) {
      throw new Error("记录不存在");
    }

    if (typeof record.textContent !== "string" || record.textContent.length === 0) {
      throw new Error("该记录没有可复制文本");
    }

    options.clipboardWatcher.writeRawText(record.textContent);
  });

  ipcMain.handle(IPC_CHANNELS.historyPublish, async (_event, recordId: unknown) => {
    if (!isRecordId(recordId)) {
      throw new Error("无效的记录 ID");
    }

    const record = await options.historyStore.get(recordId);
    if (!record) {
      throw new Error("记录不存在");
    }

    const publishedRecord = await options.serverSessionClient.publish(record);
    await options.historyStore.markPublished(publishedRecord);
    await emitHistoryChanged(options);
    return publishedRecord;
  });

  ipcMain.handle(IPC_CHANNELS.clipboardCaptureCurrent, async () => {
    const record = await options.clipboardWatcher.captureCurrent();
    if (record) {
      await emitHistoryChanged(options);
    }
    return record;
  });

  ipcMain.handle(IPC_CHANNELS.clipboardWriteText, (_event, text: unknown) => {
    if (typeof text !== "string" || text.length === 0 || text.length > 1000) {
      throw new Error("无效的剪贴板文本");
    }

    options.clipboardWatcher.writeRawText(text);
  });

  ipcMain.handle(IPC_CHANNELS.settingsGet, async () => options.settingsStore.get());

  ipcMain.handle(IPC_CHANNELS.settingsShortcuts, () => options.shortcutRegistry.getStatus());

  ipcMain.handle(IPC_CHANNELS.settingsUpdate, async (_event, patch: unknown) => {
    const settings = await options.settingsStore.update(sanitizeSettingsPatch(patch));
    await options.clipboardWatcher.start();
    options.onSettingsChanged?.(settings);
    return settings;
  });

  ipcMain.handle(IPC_CHANNELS.connectionStatus, () => options.serverSessionClient.getStatus());

  ipcMain.handle(IPC_CHANNELS.connectionReconnect, async () => {
    await options.serverSessionClient.reconnect();
    const status = options.serverSessionClient.getStatus();
    if (status.state === "error") {
      throw new Error(status.lastError ?? "服务端连接失败");
    }

    try {
      const records = await options.serverSessionClient.fetchHistory(15, DEFAULT_RECENT_HISTORY_LIMIT);
      await options.historyStore.mergeMany(records);
      await emitHistoryChanged(options);
    } catch (error) {
      const nextStatus = {
        ...options.serverSessionClient.getStatus(),
        state: "error",
        lastError: error instanceof Error ? error.message : "服务器历史记录不可用"
      } as const;
      emitConnectionChanged(options.getWindow(), nextStatus);
      throw error;
    }
  });
}

export async function emitHistoryChanged(options: {
  getWindow: () => BrowserWindow | null;
  historyStore: LocalHistoryStore;
}): Promise<void> {
  const win = options.getWindow();
  if (!win) {
    return;
  }

  win.webContents.send(IPC_CHANNELS.eventHistoryChanged, await options.historyStore.list());
}

export function emitConnectionChanged(
  win: BrowserWindow | null,
  status: ReturnType<ServerSessionClient["getStatus"]>
): void {
  win?.webContents.send(IPC_CHANNELS.eventConnectionChanged, status);
}

export function emitShortcutsChanged(
  win: BrowserWindow | null,
  status: ReturnType<ShortcutRegistry["getStatus"]>
): void {
  win?.webContents.send(IPC_CHANNELS.eventShortcutsChanged, status);
}

export function emitNotification(win: BrowserWindow | null, item: NotificationItem): void {
  win?.webContents.send(IPC_CHANNELS.eventNotification, item);
}

function isRecordId(value: unknown): value is ClipboardRecord["id"] {
  return typeof value === "string" && value.length > 0 && value.length < 200;
}

function sanitizeSettingsPatch(value: unknown): Partial<DesktopSettings> {
  if (typeof value !== "object" || value === null) {
    return {};
  }

  const patch = value as Partial<DesktopSettings>;
  return compactSettingsPatch({
    serverUrl: typeof patch.serverUrl === "string" ? normalizeServerUrl(patch.serverUrl) : undefined,
    deviceName: typeof patch.deviceName === "string" ? patch.deviceName : undefined,
    clipboardPollingEnabled:
      typeof patch.clipboardPollingEnabled === "boolean" ? patch.clipboardPollingEnabled : undefined,
    clipboardPollingIntervalMs:
      typeof patch.clipboardPollingIntervalMs === "number" ? patch.clipboardPollingIntervalMs : undefined,
    autoPublishEnabled: false,
    globalShortcutOpen: typeof patch.globalShortcutOpen === "string" ? patch.globalShortcutOpen : undefined,
    globalShortcutPublish:
      typeof patch.globalShortcutPublish === "string" ? patch.globalShortcutPublish : undefined,
    globalShortcutPasteLatestOnline:
      typeof patch.globalShortcutPasteLatestOnline === "string"
        ? patch.globalShortcutPasteLatestOnline
        : undefined,
    notificationPreviewEnabled:
      typeof patch.notificationPreviewEnabled === "boolean" ? patch.notificationPreviewEnabled : undefined,
    openWindowAfterCopyVerificationCode:
      typeof patch.openWindowAfterCopyVerificationCode === "boolean"
        ? patch.openWindowAfterCopyVerificationCode
        : undefined,
    maxLocalHistoryItems: typeof patch.maxLocalHistoryItems === "number" ? patch.maxLocalHistoryItems : undefined
  });
}

function compactSettingsPatch(patch: Partial<DesktopSettings>): Partial<DesktopSettings> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined)
  ) as Partial<DesktopSettings>;
}

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "http://127.0.0.1:8787";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
}
