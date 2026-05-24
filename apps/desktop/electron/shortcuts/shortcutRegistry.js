import { globalShortcut } from "electron";
export class ShortcutRegistry {
    options;
    status = {
        open: { accelerator: "", registered: false, conflict: false },
        publish: { accelerator: "", registered: false, conflict: false },
        pasteLatestOnline: { accelerator: "", registered: false, conflict: false }
    };
    constructor(options) {
        this.options = options;
    }
    register(settings) {
        this.unregisterAll();
        this.status = {
            open: this.registerOne(settings.globalShortcutOpen, this.options.onOpenPanel),
            publish: this.registerOne(settings.globalShortcutPublish, this.options.onPublishCurrent),
            pasteLatestOnline: this.registerOne(settings.globalShortcutPasteLatestOnline, this.options.onPasteLatestOnline)
        };
        return this.status;
    }
    unregisterAll() {
        globalShortcut.unregisterAll();
    }
    getStatus() {
        return this.status;
    }
    registerOne(accelerator, callback) {
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
