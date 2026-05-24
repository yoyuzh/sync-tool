import { clipboard } from "electron";
import { createTextRecordDraft, hashClipboardText, normalizeClipboardText } from "./clipboardNormalizer";
export class ClipboardWatcher {
    options;
    timer = null;
    lastHash = null;
    constructor(options) {
        this.options = options;
    }
    async start() {
        this.stop();
        const settings = await this.options.settingsStore.get();
        if (!settings.clipboardPollingEnabled) {
            return;
        }
        this.timer = setInterval(() => {
            void this.captureCurrent();
        }, settings.clipboardPollingIntervalMs);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async captureCurrent() {
        const text = clipboard.readText();
        const normalized = normalizeClipboardText(text);
        if (!normalized) {
            return null;
        }
        if (normalized.contentHash === this.lastHash) {
            return null;
        }
        const settings = await this.options.settingsStore.get();
        const draft = createTextRecordDraft(normalized, settings.deviceId);
        const record = await this.options.historyStore.addLocalDraft(draft);
        this.lastHash = normalized.contentHash;
        this.options.onRecordCaptured(record);
        return record;
    }
    writeText(record) {
        if (typeof record.textContent !== "string") {
            return;
        }
        this.writeRawText(record.textContent);
    }
    writeRawText(text) {
        clipboard.writeText(text);
        this.lastHash = hashClipboardText(text);
    }
}
