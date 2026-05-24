import { Menu, Tray, nativeImage, type NativeImage } from "electron";

interface TrayServiceOptions {
  onShowPanel: () => void;
  onPublishClipboard: () => void;
  onPasteLatestOnline: () => void;
  onQuit: () => void;
}

export class TrayService {
  private tray: Tray | null = null;

  constructor(private readonly options: TrayServiceOptions) {}

  create(): void {
    if (this.tray) {
      return;
    }

    this.tray = new Tray(createTrayIcon());
    this.tray.setToolTip("ClipBridge");
    this.tray.setContextMenu(this.createMenu());
    this.tray.on("click", this.options.onShowPanel);
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private createMenu(): Menu {
    return Menu.buildFromTemplate([
      {
        label: "打开 ClipBridge",
        click: this.options.onShowPanel
      },
      {
        label: "发送当前剪贴板",
        click: this.options.onPublishClipboard
      },
      {
        label: "粘贴最近线上内容",
        click: this.options.onPasteLatestOnline
      },
      { type: "separator" },
      {
        label: "退出",
        click: this.options.onQuit
      }
    ]);
  }
}

function createTrayIcon(): NativeImage {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <rect x="2" y="2" width="14" height="14" rx="4" fill="#111827"/>
      <path d="M5 6.2A2.2 2.2 0 0 1 7.2 4h2.4v2H7.2a.2.2 0 0 0-.2.2v5.6c0 .1.1.2.2.2h3.6c.1 0 .2-.1.2-.2v-1.6h2v1.6a2.2 2.2 0 0 1-2.2 2.2H7.2A2.2 2.2 0 0 1 5 11.8V6.2Z" fill="#f9fafb"/>
      <path d="M10 4h4v4h-2V6.9L8.6 10.3 7.2 8.9 10.7 5.4H10V4Z" fill="#38bdf8"/>
    </svg>
  `);
  return nativeImage.createFromDataURL(`data:image/svg+xml,${svg}`);
}
