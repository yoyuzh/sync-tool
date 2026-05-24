import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from "./StatusBadge";
const KIND_LABELS = {
    document: "文件",
    image: "图片",
    text: "文本"
};
const KIND_ICONS = {
    document: "DOC",
    image: "IMG",
    text: "TXT"
};
const DEVICE_ICONS = {
    android: "AD",
    desktop: "PC",
    ios: "IP"
};
const STATUS_ICONS = {
    "download-ready": "DR",
    failed: "ER",
    "local-only": "LO",
    "metadata-only": "MO",
    synced: "OK",
    "transfer-pending": "TP"
};
export function RecordCard({ record, viewMode, onCopyRecord, onRequestTransfer }) {
    const hasImage = Boolean(record.previewImageUrl);
    const isCode = record.kind === "text" && record.previewText?.includes("{");
    const canRequestTransfer = record.metadataOnly || record.status === "transfer-pending";
    return (_jsxs("article", { className: `record-card record-card--${viewMode}`, onClick: () => onCopyRecord(record.id), role: "button", tabIndex: 0, onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onCopyRecord(record.id);
            }
        }, "aria-label": `复制 ${record.title}`, children: [_jsxs("div", { className: "record-card__header", children: [_jsxs("div", { className: "record-card__identity", children: [_jsx("div", { className: "record-card__kind-icon", "aria-hidden": "true", children: KIND_ICONS[record.kind] }), _jsxs("div", { className: "record-card__info", children: [_jsx("div", { className: "record-card__eyebrow", children: KIND_LABELS[record.kind] }), _jsxs("div", { className: "record-card__meta", children: [_jsx("span", { className: "device-chip", title: record.sourceDeviceType, children: DEVICE_ICONS[record.sourceDeviceType] }), _jsx("span", { children: record.sourceDeviceName }), _jsx("span", { className: "meta-separator", children: "\u2022" }), _jsx("span", { children: record.timestampLabel })] })] })] }), _jsx(StatusBadge, { icon: STATUS_ICONS[record.status], label: record.statusLabel, tone: record.statusTone })] }), hasImage ? (_jsx("div", { className: "record-card__media", children: _jsx("img", { src: record.previewImageUrl, alt: record.title }) })) : null, _jsxs("div", { className: isCode ? "record-card__content is-code" : "record-card__content", children: [record.fileName ? _jsx("div", { className: "record-card__title", children: record.fileName }) : null, _jsx("p", { children: record.previewText }), record.metadataOnly ? (_jsxs("div", { className: "record-card__subtext", children: [record.sizeLabel, " \u00B7 \u4EC5\u540C\u6B65\u5143\u4FE1\u606F"] })) : record.sizeLabel ? (_jsx("div", { className: "record-card__subtext", children: record.sizeLabel })) : null] }), canRequestTransfer ? (_jsx("button", { type: "button", className: "secondary-button record-card__transfer", onClick: (event) => {
                    event.stopPropagation();
                    onRequestTransfer(record.id);
                }, children: "\u8BF7\u6C42\u4F20\u8F93" })) : null] }));
}
