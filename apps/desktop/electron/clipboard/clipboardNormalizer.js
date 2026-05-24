import { createHash, randomUUID } from "node:crypto";
export function normalizeClipboardText(rawText) {
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
export function createTextRecordDraft(normalized, sourceDeviceId) {
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
export function hashClipboardText(rawText) {
    return createHash("sha256").update(rawText).digest("hex");
}
function createTitle(preview) {
    if (preview.length <= 32) {
        return preview;
    }
    return `${preview.slice(0, 32)}...`;
}
