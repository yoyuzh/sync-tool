import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
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

export interface NormalizedClipboardFile {
  filePath: string;
  title: string;
  contentHash: string;
  sizeBytes: number;
  mimeType?: string;
}

export interface NormalizedClipboardImage {
  title: string;
  contentHash: string;
  sizeBytes: number;
}

export function normalizeClipboardFile(filePath: string): NormalizedClipboardFile | null {
  const normalizedPath = filePath.trim();
  if (!normalizedPath) {
    return null;
  }

  const title = path.basename(normalizedPath) || normalizedPath;
  return {
    filePath: normalizedPath,
    title,
    contentHash: hashClipboardText(`file:${normalizedPath}`),
    sizeBytes: Buffer.byteLength(normalizedPath, "utf8"),
    mimeType: mimeTypeFromPath(normalizedPath)
  };
}

export function createFileRecordDraft(
  normalized: NormalizedClipboardFile,
  sourceDeviceId: string
): ClipboardRecordDraft {
  return {
    id: `local-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    sourceDeviceId,
    kind: normalized.mimeType?.startsWith("image/") ? "image" : "document",
    title: normalized.title,
    textPreview: normalized.filePath,
    mimeType: normalized.mimeType,
    sizeBytes: normalized.sizeBytes,
    storageMode: "source_file",
    contentHash: normalized.contentHash
  };
}

export function normalizeClipboardImage(imageDataUrl: string): NormalizedClipboardImage | null {
  if (!imageDataUrl.startsWith("data:image/")) {
    return null;
  }

  return {
    title: "剪贴板图片",
    contentHash: hashClipboardText(imageDataUrl),
    sizeBytes: Buffer.byteLength(imageDataUrl, "utf8")
  };
}

export function createImageRecordDraft(
  normalized: NormalizedClipboardImage,
  sourceDeviceId: string
): ClipboardRecordDraft {
  return {
    id: `local-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    sourceDeviceId,
    kind: "image",
    title: normalized.title,
    textPreview: "剪贴板图片",
    mimeType: "image/png",
    sizeBytes: normalized.sizeBytes,
    storageMode: "metadata_only",
    contentHash: normalized.contentHash
  };
}

export function extractClipboardFilePath(text: string, html = ""): string | null {
  const candidates = [text, html].flatMap((value) => extractFilePathCandidates(value));
  return candidates[0] ?? null;
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

function extractFilePathCandidates(value: string): string[] {
  if (!value) {
    return [];
  }

  const candidates = new Set<string>();
  for (const line of value.split(/\r?\n/)) {
    const decoded = decodeFileUrl(line.trim());
    if (decoded) {
      candidates.add(decoded);
    }
  }

  const fileUrlPattern = /file:\/\/(?:localhost)?\/[^\s"'<>]+/gi;
  for (const match of value.matchAll(fileUrlPattern)) {
    const decoded = decodeFileUrl(match[0]);
    if (decoded) {
      candidates.add(decoded);
    }
  }

  return [...candidates];
}

function decodeFileUrl(value: string): string | null {
  if (!value.toLowerCase().startsWith("file://")) {
    return null;
  }

  try {
    return decodeURIComponent(value.replace(/^file:\/\/(?:localhost)?/i, ""));
  } catch {
    return value.replace(/^file:\/\/(?:localhost)?/i, "");
  }
}

function mimeTypeFromPath(filePath: string): string | undefined {
  const extension = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".txt": "text/plain",
    ".webp": "image/webp"
  };
  return mimeTypes[extension];
}
