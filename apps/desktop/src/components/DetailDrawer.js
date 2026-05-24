import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StatusBadge } from "./StatusBadge";
const DEVICE_LABELS = {
    android: "Android 移动端",
    desktop: "Desktop 桌面端",
    ios: "iPhone 移动端"
};
const STATUS_ICONS = {
    "download-ready": "DR",
    failed: "ER",
    "local-only": "LO",
    "metadata-only": "MO",
    synced: "OK",
    "transfer-pending": "TP"
};
export function DetailDrawer({ record, open, onClose }) {
    return (_jsx("div", { className: open ? "overlay-shell is-open" : "overlay-shell", "aria-hidden": !open, children: _jsxs("div", { className: open ? "detail-drawer is-open" : "detail-drawer", children: [_jsxs("div", { className: "overlay-header", children: [_jsxs("div", { children: [_jsx("div", { className: "overlay-eyebrow", children: "CLIP DETAIL" }), _jsx("h2", { children: record?.title ?? "记录详情" })] }), _jsx("button", { type: "button", className: "icon-button", onClick: onClose, title: "\u5173\u95ED", children: "X" })] }), record ? (_jsxs("div", { className: "drawer-body", children: [_jsx("div", { className: "drawer-status", children: _jsx(StatusBadge, { icon: STATUS_ICONS[record.status], label: record.statusLabel, tone: record.statusTone }) }), _jsxs("dl", { className: "meta-grid", children: [_jsxs("div", { children: [_jsx("dt", { children: "\u6765\u6E90\u8BBE\u5907" }), _jsxs("dd", { children: [_jsx("strong", { children: record.sourceDeviceName }), _jsx("br", {}), _jsx("small", { children: DEVICE_LABELS[record.sourceDeviceType] })] })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u521B\u5EFA\u65F6\u95F4" }), _jsx("dd", { children: record.timestampLabel })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u8BB0\u5F55\u7C7B\u578B" }), _jsx("dd", { children: record.kind.toUpperCase() })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6570\u636E\u5927\u5C0F" }), _jsx("dd", { children: record.sizeLabel || "—" })] })] }), record.previewImageUrl ? (_jsx("div", { className: "drawer-preview", children: _jsx("img", { src: record.previewImageUrl, alt: record.title }) })) : null, _jsxs("section", { className: "drawer-section", children: [_jsx("h3", { children: "\u5185\u5BB9\u5185\u5BB9\u9884\u89C8" }), _jsx("div", { className: record.kind === "text" ? "content-box is-code" : "content-box", children: record.previewText ?? "该记录没有可展示的文本预览。" })] }), record.metadataOnly ? (_jsxs("section", { className: "drawer-section warning-box", children: [_jsx("h3", { children: "\u4F20\u8F93\u8BF4\u660E" }), _jsx("p", { children: "\u8BE5\u6587\u4EF6\u5F53\u524D\u4EC5\u540C\u6B65\u5143\u4FE1\u606F\uFF0C\u9700\u8981\u53CC\u65B9\u8BBE\u5907\u5728\u7EBF\u540E\u518D\u53D1\u8D77\u4F20\u8F93\u3002" })] })) : null] })) : (_jsx("div", { className: "drawer-empty", children: "\u8BF7\u9009\u62E9\u4E00\u6761\u8BB0\u5F55\u67E5\u770B\u8BE6\u60C5\u3002" }))] }) }));
}
