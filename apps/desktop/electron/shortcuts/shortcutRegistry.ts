import { globalShortcut } from "electron";
import type { DesktopSettings } from "../settings/settingsStore";

interface ShortcutRegistryOptions {
  onOpenPanel: () => void;
  onPublishCurrent: () => void;
  onPasteLatestOnline: () => void;
  onFailure: (message: string) => void;
}

export interface ShortcutRegistrationStatus {
  open: ShortcutState;
  publish: ShortcutState;
  pasteLatestOnline: ShortcutState;
}

interface ShortcutState {
  accelerator: string;
  registered: boolean;
  conflict: boolean;
}

export class ShortcutRegistry {
  private status: ShortcutRegistrationStatus = {
    open: { accelerator: "", registered: false, conflict: false },
    publish: { accelerator: "", registered: false, conflict: false },
    pasteLatestOnline: { accelerator: "", registered: false, conflict: false }
  };

  constructor(private readonly options: ShortcutRegistryOptions) {}

  register(settings: DesktopSettings): ShortcutRegistrationStatus {
    this.unregisterAll();
    this.status = {
      open: this.registerOne(settings.globalShortcutOpen, this.options.onOpenPanel),
      publish: this.registerOne(settings.globalShortcutPublish, this.options.onPublishCurrent),
      pasteLatestOnline: this.registerOne(
        settings.globalShortcutPasteLatestOnline,
        this.options.onPasteLatestOnline
      )
    };
    return this.status;
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
  }

  getStatus(): ShortcutRegistrationStatus {
    return this.status;
  }

  private registerOne(accelerator: string, callback: () => void): ShortcutState {
    if (!accelerator) {
      return { accelerator, registered: false, conflict: false };
    }

    const registered = globalShortcut.register(accelerator, callback);
    if (!registered) {
      this.options.onFailure(`快捷键注册失败：${accelerator}`);
    }
    return { accelerator, registered, conflict: !registered };
  }
}
