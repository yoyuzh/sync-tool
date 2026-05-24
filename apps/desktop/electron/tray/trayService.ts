import { Menu, Tray, nativeImage, type NativeImage } from "electron";
import { resolveTrayIconPath } from "../assets";

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
  const icon = nativeImage.createFromPath(resolveTrayIconPath());
  if (process.platform === "darwin") {
    icon.setTemplateImage(true);
  }
  return icon;
}
