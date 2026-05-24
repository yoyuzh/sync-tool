import type { ClipboardRecord, ConnectionStatus } from "@sync-tool/shared";

export type Unsubscribe = () => void;

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

export interface ShortcutRegistrationStatus {
  open: {
    accelerator: string;
    registered: boolean;
    conflict: boolean;
  };
  publish: {
    accelerator: string;
    registered: boolean;
    conflict: boolean;
  };
  pasteLatestOnline: {
    accelerator: string;
    registered: boolean;
    conflict: boolean;
  };
}

export interface DesktopNotificationItem {
  id: string;
  title: string;
  body: string;
  recordId?: string;
  verificationCode?: string;
}

export interface SyncToolApi {
  version: string;
  history: {
    list(): Promise<ClipboardRecord[]>;
    get(recordId: string): Promise<ClipboardRecord | null>;
    copy(recordId: string): Promise<void>;
    publish(recordId: string): Promise<ClipboardRecord>;
  };
  clipboard: {
    captureCurrent(): Promise<ClipboardRecord | null>;
    writeText(text: string): Promise<void>;
  };
  settings: {
    get(): Promise<DesktopSettings>;
    update(patch: Partial<DesktopSettings>): Promise<DesktopSettings>;
    shortcuts(): Promise<ShortcutRegistrationStatus>;
  };
  connection: {
    status(): Promise<ConnectionStatus>;
    reconnect(): Promise<void>;
    onStatusChanged(listener: (status: ConnectionStatus) => void): Unsubscribe;
  };
  events: {
    onHistoryChanged(listener: (records: ClipboardRecord[]) => void): Unsubscribe;
    onShortcutsChanged(listener: (status: ShortcutRegistrationStatus) => void): Unsubscribe;
    onNotification(listener: (item: DesktopNotificationItem) => void): Unsubscribe;
  };
}

declare global {
  interface Window {
    syncTool?: SyncToolApi;
  }
}
