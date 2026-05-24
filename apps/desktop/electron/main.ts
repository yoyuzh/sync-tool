import { app, type BrowserWindow } from "electron";
import path from "node:path";
import { ClipboardWatcher } from "./clipboard/clipboardWatcher";
import { pasteIntoActiveApp } from "./clipboard/nativePasteService";
import { createAppWindow, showAppWindow } from "./appWindow";
import { LocalHistoryStore } from "./history/localHistoryStore";
import {
  emitConnectionChanged,
  emitHistoryChanged,
  emitNotification,
  registerIpc
} from "./ipc/registerIpc";
import { NotificationService } from "./notifications/notificationService";
import { ServerSessionClient } from "./server/serverSessionClient";
import { SettingsStore, type DesktopSettings } from "./settings/settingsStore";
import { ShortcutRegistry } from "./shortcuts/shortcutRegistry";
import { TrayService } from "./tray/trayService";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

app.whenReady().then(async () => {
  const userDataPath = app.getPath("userData");
  const settingsStore = new SettingsStore(path.join(userDataPath, "settings.json"));
  const initialSettings = await settingsStore.get();
  const historyStore = new LocalHistoryStore(
    path.join(userDataPath, "history.json"),
    initialSettings.maxLocalHistoryItems
  );

  const notificationService = new NotificationService({
    onNotificationClick: () => showAppWindow(mainWindow),
    onCopyVerificationCode: async (verificationCode) => {
      clipboardWatcher.writeRawText(verificationCode);
      notificationService.showStatus("已复制验证码", verificationCode);
      const settings = await settingsStore.get();
      if (settings.openWindowAfterCopyVerificationCode) {
        showAppWindow(mainWindow);
      }
    },
    onNotification: (item) => emitNotification(mainWindow, item)
  });

  const serverSessionClient = new ServerSessionClient({
    settingsStore,
    onStatusChanged: (status) => emitConnectionChanged(mainWindow, status),
    onRemoteRecord: async (record) => {
      await historyStore.merge(record);
      await emitHistoryChanged({ getWindow: () => mainWindow, historyStore });
      notificationService.showRemoteRecord(record, await settingsStore.get());
    }
  });

  const clipboardWatcher = new ClipboardWatcher({
    settingsStore,
    historyStore,
    onRecordCaptured: () => {
      void emitHistoryChanged({ getWindow: () => mainWindow, historyStore });
    }
  });

  async function publishCurrentClipboard(): Promise<void> {
    const record = await clipboardWatcher.captureCurrent();
    if (!record) {
      notificationService.showStatus("发送失败", "当前剪贴板没有可发送的文本内容");
      return;
    }

    try {
      const publishedRecord = await serverSessionClient.publish(record);
      await historyStore.markPublished(publishedRecord);
      await emitHistoryChanged({ getWindow: () => mainWindow, historyStore });
      notificationService.showStatus("发送成功", "当前剪贴板已发送到线上");
    } catch (error) {
      notificationService.showStatus(
        "发送失败",
        error instanceof Error ? error.message : "服务端暂不可用，记录已保留在本地"
      );
    }
  }

  async function pasteLatestOnlineRecord(): Promise<void> {
    try {
      const records = await historyStore.list();
      const record = records.find(
        (item) => (item.publishState === "published" || item.publishState === "broadcast") && item.textContent
      );
      if (!record) {
        notificationService.showStatus("粘贴失败", "还没有可粘贴的线上文本记录");
        return;
      }

      clipboardWatcher.writeText(record);
      await pasteIntoActiveApp();
      notificationService.showStatus("已粘贴", "最近线上文本已粘贴到当前应用");
    } catch (error) {
      notificationService.showStatus(
        "粘贴失败",
        error instanceof Error ? error.message : "无法读取最近线上记录"
      );
    }
  }

  const shortcutRegistry = new ShortcutRegistry({
    onOpenPanel: () => {
      showAppWindow(mainWindow);
    },
    onPublishCurrent: () => {
      void publishCurrentClipboard();
    },
    onPasteLatestOnline: () => {
      void pasteLatestOnlineRecord();
    },
    onFailure: (message) => notificationService.showStatus("快捷键不可用", message)
  });

  const trayService = new TrayService({
    onShowPanel: () => showAppWindow(mainWindow),
    onPublishClipboard: () => {
      void publishCurrentClipboard();
    },
    onPasteLatestOnline: () => {
      void pasteLatestOnlineRecord();
    },
    onQuit: () => {
      isQuitting = true;
      app.quit();
    }
  });

  function registerShortcuts(settings: DesktopSettings): void {
    shortcutRegistry.register(settings);
  }

  registerIpc({
    getWindow: () => mainWindow,
    historyStore,
    settingsStore,
    clipboardWatcher,
    serverSessionClient,
    shortcutRegistry,
    onSettingsChanged: (settings) => {
      registerShortcuts(settings);
    }
  });

  mainWindow = createAppWindow(() => isQuitting);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  trayService.create();

  await clipboardWatcher.start();
  registerShortcuts(initialSettings);
  void serverSessionClient.reconnect();

  app.on("activate", () => {
    if (!mainWindow) {
      mainWindow = createAppWindow(() => isQuitting);
    }
    showAppWindow(mainWindow);
  });

  app.on("before-quit", () => {
    isQuitting = true;
    clipboardWatcher.stop();
    shortcutRegistry.unregisterAll();
    serverSessionClient.close();
    trayService.destroy();
  });
});

app.on("window-all-closed", () => {
  // Keep the app resident so clipboard watching and global shortcuts continue running.
});
