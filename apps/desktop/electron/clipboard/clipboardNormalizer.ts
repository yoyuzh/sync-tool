import { createHash, randomUUID } from "node:crypto";
import type { ClipboardRecordDraft } from "@sync-tool/shared";

export interface NormalizedClipboardText {
  rawText: string;
  preview: string;
  title: string;
  contentHash: string;
  sizeBytes: number;
}

export function normalizeClipboardText(rawText: string): NormalizedClipboardText | null {
  if (rawText.length === 0) {
    return null;
  }

  const preview = rawText.replace(/\s+/g, " ").trim();
  if (preview.length === 0) {
    return null;
  }

  const truncatedPreview = preview.slice(0, 240);
  return {
    rawText,
    preview: truncatedPreview,
    title: createTitle(truncatedPreview),
    contentHash: hashClipboardText(rawText),
    sizeBytes: Buffer.byteLength(rawText, "utf8")
  };
}

export function createTextRecordDraft(
  normalized: NormalizedClipboardText,
  sourceDeviceId: string
): ClipboardRecordDraft {
  return {
    id: `local-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    sourceDeviceId,
    kind: "text",
    title: normalized.title,
    textPreview: normalized.preview,
    textContent: normalized.rawText,
    mimeType: "text/plain",
    sizeBytes: normalized.sizeBytes,
    storageMode: "metadata_only",
    contentHash: normalized.contentHash
  };
}

export function hashClipboardText(rawText: string): string {
  return createHash("sha256").update(rawText).digest("hex");
}

function createTitle(preview: string): string {
  if (preview.length <= 32) {
    return preview;
  }

  return `${preview.slice(0, 32)}...`;
}
