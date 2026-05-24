import { clipboard } from "electron";
import type { ClipboardRecord } from "@sync-tool/shared";
import {
  createFileRecordDraft,
  createImageRecordDraft,
  createTextRecordDraft,
  extractClipboardFilePath,
  hashClipboardText,
  normalizeClipboardFile,
  normalizeClipboardImage,
  normalizeClipboardText
} from "./clipboardNormalizer";
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
    const draft = await this.createCurrentClipboardDraft();
    if (!draft) {
      return null;
    }

    if (draft.contentHash && draft.contentHash === this.lastHash) {
      return this.options.historyStore.getByContentHash(draft.contentHash);
    }

    if (draft.contentHash) {
      const existingRecord = await this.options.historyStore.getByContentHash(draft.contentHash);
      if (existingRecord) {
        this.lastHash = draft.contentHash;
        return existingRecord;
      }
    }

    const record = await this.options.historyStore.addLocalDraft(draft);
    this.lastHash = draft.contentHash ?? null;
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

  private async createCurrentClipboardDraft() {
    const text = clipboard.readText();
    const settings = await this.options.settingsStore.get();
    const normalizedText = normalizeClipboardText(text);
    if (normalizedText) {
      return createTextRecordDraft(normalizedText, settings.deviceId);
    }

    const filePath = extractClipboardFilePath(text, clipboard.readHTML());
    if (filePath) {
      const normalizedFile = normalizeClipboardFile(filePath);
      if (normalizedFile) {
        return createFileRecordDraft(normalizedFile, settings.deviceId);
      }
    }

    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const normalizedImage = normalizeClipboardImage(image.toDataURL());
      if (normalizedImage) {
        return createImageRecordDraft(normalizedImage, settings.deviceId);
      }
    }

    return null;
  }
}
