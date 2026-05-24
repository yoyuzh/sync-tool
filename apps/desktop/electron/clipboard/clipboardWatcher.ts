import { clipboard } from "electron";
import type { ClipboardRecord } from "@sync-tool/shared";
import { createTextRecordDraft, hashClipboardText, normalizeClipboardText } from "./clipboardNormalizer";
import type { LocalHistoryStore } from "../history/localHistoryStore";
import type { SettingsStore } from "../settings/settingsStore";

interface ClipboardWatcherOptions {
  settingsStore: SettingsStore;
  historyStore: LocalHistoryStore;
  onRecordCaptured: (record: ClipboardRecord) => void;
}

export class ClipboardWatcher {
  private timer: NodeJS.Timeout | null = null;
  private lastHash: string | null = null;

  constructor(private readonly options: ClipboardWatcherOptions) {}

  async start(): Promise<void> {
    this.stop();
    const settings = await this.options.settingsStore.get();
    if (!settings.clipboardPollingEnabled) {
      return;
    }

    this.timer = setInterval(() => {
      void this.captureCurrent();
    }, settings.clipboardPollingIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async captureCurrent(): Promise<ClipboardRecord | null> {
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

  writeText(record: ClipboardRecord): void {
    if (typeof record.textContent !== "string") {
      return;
    }

    this.writeRawText(record.textContent);
  }

  writeRawText(text: string): void {
    clipboard.writeText(text);
    this.lastHash = hashClipboardText(text);
  }
}
