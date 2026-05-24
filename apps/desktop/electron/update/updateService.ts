interface AutoUpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on(event: string, handler: (...args: unknown[]) => void): void;
  checkForUpdates(): Promise<unknown>;
}

interface StartAutoUpdateOptions {
  isPackaged: boolean;
  platform?: NodeJS.Platform;
  updater: AutoUpdaterLike;
  showStatus: (title: string, body: string) => void;
}

export function startAutoUpdate(options: StartAutoUpdateOptions): boolean {
  if (!options.isPackaged) {
    return false;
  }

  const platform = options.platform ?? process.platform;
  if (platform !== "darwin" && platform !== "win32") {
    return false;
  }

  const { updater, showStatus } = options;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;

  updater.on("update-available", () => {
    showStatus("发现新版本", "正在后台下载更新");
  });
  updater.on("update-not-available", () => {
    showStatus("已经是最新版本", "当前安装版本无需更新");
  });
  updater.on("update-downloaded", () => {
    showStatus("更新已就绪", "退出应用后会自动安装新版本");
  });
  updater.on("error", (error) => {
    const message = error instanceof Error ? error.message : "自动更新失败";
    showStatus("更新失败", message);
  });

  void updater.checkForUpdates();
  return true;
}
