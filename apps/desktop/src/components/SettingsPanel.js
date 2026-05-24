import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
export function SettingsPanel({ open, settings, shortcutStatus, connectionState, onUpdateSettings, onClose }) {
    const [serverUrl, setServerUrl] = useState(settings?.serverUrl ?? "");
    const [publishShortcut, setPublishShortcut] = useState(settings?.globalShortcutPublish ?? "");
    const [openShortcut, setOpenShortcut] = useState(settings?.globalShortcutOpen ?? "");
    const [pasteLatestOnlineShortcut, setPasteLatestOnlineShortcut] = useState(settings?.globalShortcutPasteLatestOnline ?? "");
    useEffect(() => {
        setServerUrl(settings?.serverUrl ?? "");
    }, [settings?.serverUrl]);
    useEffect(() => {
        setPublishShortcut(settings?.globalShortcutPublish ?? "");
        setOpenShortcut(settings?.globalShortcutOpen ?? "");
        setPasteLatestOnlineShortcut(settings?.globalShortcutPasteLatestOnline ?? "");
    }, [
        settings?.globalShortcutOpen,
        settings?.globalShortcutPasteLatestOnline,
        settings?.globalShortcutPublish
    ]);
    useEffect(() => {
        if (!open) {
            return;
        }
        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose, open]);
    async function saveServerUrl() {
        await onUpdateSettings({ serverUrl: serverUrl.trim() });
    }
    async function saveShortcuts() {
        await onUpdateSettings({
            globalShortcutPublish: publishShortcut.trim(),
            globalShortcutOpen: openShortcut.trim(),
            globalShortcutPasteLatestOnline: pasteLatestOnlineShortcut.trim()
        });
    }
    function stopPanelClick(event) {
        event.stopPropagation();
    }
    return (_jsx("div", { className: open ? "overlay-shell is-open no-drag" : "overlay-shell no-drag", "aria-hidden": !open, onClick: onClose, children: _jsxs("aside", { className: open ? "settings-panel is-open no-drag" : "settings-panel no-drag", onClick: stopPanelClick, children: [_jsxs("div", { className: "overlay-header", children: [_jsxs("div", { children: [_jsx("div", { className: "overlay-eyebrow", children: "PREFERENCES" }), _jsx("h2", { children: "\u684C\u9762\u7AEF\u8BBE\u7F6E" })] }), _jsx("button", { type: "button", className: "icon-button", onClick: onClose, title: "\u5173\u95ED", children: "X" })] }), _jsxs("div", { className: "settings-list", children: [_jsxs("section", { className: "settings-card", children: [_jsx("h3", { children: "\u8FDE\u63A5\u4E0E\u670D\u52A1" }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u670D\u52A1\u7AEF\u5730\u5740" }), _jsx("input", { value: serverUrl, onChange: (event) => setServerUrl(event.target.value), placeholder: "http://127.0.0.1:8787" })] }), _jsx("button", { type: "button", className: "primary-button settings-save", onClick: saveServerUrl, children: "\u4FDD\u5B58\u670D\u52A1\u5668" }), _jsxs("div", { className: "settings-row", children: [_jsx("span", { children: "\u5F53\u524D\u8FDE\u63A5\u72B6\u6001" }), _jsx("span", { className: "status-indicator", children: connectionState })] }), _jsxs("div", { className: "settings-row", children: [_jsx("span", { children: "\u526A\u8D34\u677F\u8F6E\u8BE2" }), _jsx("span", { className: settings?.clipboardPollingEnabled === false ? "toggle-off" : "toggle-on", children: settings?.clipboardPollingEnabled === false ? "已禁用" : "运行中" })] })] }), _jsxs("section", { className: "settings-card", children: [_jsx("h3", { children: "\u5FEB\u6377\u952E" }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u53D1\u9001\u5F53\u524D\u526A\u8D34\u677F" }), _jsx("input", { value: publishShortcut, onChange: (event) => setPublishShortcut(event.target.value), placeholder: "Control+Command+C" })] }), _jsx(ShortcutStateView, { state: shortcutStatus?.publish }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u6253\u5F00\u9762\u677F" }), _jsx("input", { value: openShortcut, onChange: (event) => setOpenShortcut(event.target.value), placeholder: "Control+Command+V" })] }), _jsx(ShortcutStateView, { state: shortcutStatus?.open }), _jsxs("label", { className: "settings-field", children: [_jsx("span", { children: "\u7C98\u8D34\u6700\u8FD1\u7EBF\u4E0A\u5185\u5BB9" }), _jsx("input", { value: pasteLatestOnlineShortcut, onChange: (event) => setPasteLatestOnlineShortcut(event.target.value), placeholder: "Command+Shift+V" })] }), _jsx(ShortcutStateView, { state: shortcutStatus?.pasteLatestOnline }), _jsx("button", { type: "button", className: "primary-button settings-save", onClick: saveShortcuts, children: "\u4FDD\u5B58\u5FEB\u6377\u952E" })] }), _jsx("div", { className: "settings-footer", children: "ClipBridge Desktop v1.0.0" })] })] }) }));
}
function ShortcutStateView({ state }) {
    if (!state?.accelerator) {
        return _jsx("div", { className: "shortcut-state shortcut-state--muted", children: "\u672A\u8BBE\u7F6E" });
    }
    if (state.conflict) {
        return _jsx("div", { className: "shortcut-state shortcut-state--danger", children: "\u51B2\u7A81\u6216\u5DF2\u88AB\u7CFB\u7EDF\u5360\u7528" });
    }
    return _jsx("div", { className: "shortcut-state shortcut-state--ok", children: "\u53EF\u7528" });
}
