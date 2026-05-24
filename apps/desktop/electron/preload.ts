import { contextBridge, ipcRenderer } from "electron";
import type { ClipboardRecord, ConnectionStatus } from "@sync-tool/shared";
import { IPC_CHANNELS } from "./ipc/channels";
import type { NotificationItem } from "./notifications/notificationService";
import type {
  DesktopSettings,
  ShortcutRegistrationStatus,
  SyncToolApi,
  Unsubscribe
} from "../src/types/syncToolApi";

const api: SyncToolApi = {
  version: "0.1.0",
  history: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.historyList) as Promise<ClipboardRecord[]>,
    get: (recordId) => ipcRenderer.invoke(IPC_CHANNELS.historyGet, recordId) as Promise<ClipboardRecord | null>,
    copy: (recordId) => ipcRenderer.invoke(IPC_CHANNELS.historyCopy, recordId) as Promise<void>,
    publish: (recordId) =>
      ipcRenderer.invoke(IPC_CHANNELS.historyPublish, recordId) as Promise<ClipboardRecord>
  },
  clipboard: {
    captureCurrent: () =>
      ipcRenderer.invoke(IPC_CHANNELS.clipboardCaptureCurrent) as Promise<ClipboardRecord | null>,
    writeText: (text) => ipcRenderer.invoke(IPC_CHANNELS.clipboardWriteText, text) as Promise<void>
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet) as Promise<DesktopSettings>,
    update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch) as Promise<DesktopSettings>,
    shortcuts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsShortcuts) as Promise<ShortcutRegistrationStatus>
  },
  connection: {
    status: () => ipcRenderer.invoke(IPC_CHANNELS.connectionStatus) as Promise<ConnectionStatus>,
    reconnect: () => ipcRenderer.invoke(IPC_CHANNELS.connectionReconnect) as Promise<void>,
    onStatusChanged: (listener) =>
      subscribe<ConnectionStatus>(IPC_CHANNELS.eventConnectionChanged, listener)
  },
  events: {
    onHistoryChanged: (listener) => subscribe<ClipboardRecord[]>(IPC_CHANNELS.eventHistoryChanged, listener),
    onNotification: (listener) => subscribe<NotificationItem>(IPC_CHANNELS.eventNotification, listener)
  }
};

contextBridge.exposeInMainWorld("syncTool", api);

function subscribe<TPayload>(
  channel: string,
  listener: (payload: TPayload) => void
): Unsubscribe {
  const handler = (_event: Electron.IpcRendererEvent, payload: TPayload) => {
    listener(payload);
  };

  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}
