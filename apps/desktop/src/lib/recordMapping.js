export function toUiRecord(record) {
    const status = toRecordStatus(record.publishState);
    const statusMeta = STATUS_META[status];
    const title = record.title || record.textPreview || "未命名记录";
    return {
        id: record.id,
        kind: record.kind,
        title,
        previewText: record.textPreview,
        fileName: record.kind === "document" ? title : undefined,
        sizeLabel: formatSize(record.sizeBytes),
        sourceDeviceName: record.sourceDeviceId,
        sourceDeviceType: "desktop",
        timestampLabel: formatTimestamp(record.createdAt),
        filterTags: buildFilterTags(record, status),
        status,
        statusTone: statusMeta.tone,
        statusLabel: statusMeta.label,
        metadataOnly: record.storageMode === "metadata_only" && record.kind !== "text",
        primaryActionLabel: record.publishState === "local" ? "发布" : "复制",
        secondaryActions: [
            { id: "details", label: "查看详情" },
            { id: "copy", label: "复制" }
        ]
    };
}
function toRecordStatus(publishState) {
    if (publishState === "published" || publishState === "broadcast") {
        return "synced";
    }
    return "local-only";
}
const STATUS_META = {
    "download-ready": { label: "可下载", tone: "accent" },
    failed: { label: "同步失败", tone: "danger" },
    "local-only": { label: "仅本地", tone: "neutral" },
    "metadata-only": { label: "仅元信息", tone: "warning" },
    synced: { label: "已同步", tone: "success" },
    "transfer-pending": { label: "等待传输", tone: "warning" }
};
function buildFilterTags(record, status) {
    const tags = ["all"];
    if (status === "local-only") {
        tags.push("local");
    }
    else {
        tags.push("synced");
    }
    if (record.kind === "image") {
        tags.push("images", "files");
    }
    if (record.kind === "document") {
        tags.push("files");
    }
    return tags;
}
function formatTimestamp(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "未知时间";
    }
    const diffMs = Date.now() - date.getTime();
    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    if (diffMs < minuteMs) {
        return "刚刚";
    }
    if (diffMs < hourMs) {
        return `${Math.max(1, Math.round(diffMs / minuteMs))} 分钟前`;
    }
    if (diffMs < dayMs) {
        return `${Math.round(diffMs / hourMs)} 小时前`;
    }
    return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
function formatSize(sizeBytes) {
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return undefined;
    }
    if (sizeBytes < 1024) {
        return `${sizeBytes} B`;
    }
    if (sizeBytes < 1024 * 1024) {
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
