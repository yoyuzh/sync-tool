import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { HistoryFilters } from "./components/HistoryFilters";
import { HistoryList } from "./components/HistoryList";
import { HistoryToolbar } from "./components/HistoryToolbar";
import { NotificationStack } from "./components/NotificationStack";
import { SettingsPanel } from "./components/SettingsPanel";
import { mockRecords } from "./data/mockRecords";
import { useResponsiveMode } from "./hooks/useResponsiveMode";
import { toUiRecord } from "./lib/recordMapping";
const FALLBACK_CONNECTION = {
    state: "offline",
    serverUrl: "browser-preview",
    onlineDevices: 0
};
export default function App() {
    const syncTool = typeof window !== "undefined" ? window.syncTool : undefined;
    const viewMode = useResponsiveMode();
    const [records, setRecords] = useState(() => (syncTool ? [] : mockRecords));
    const [settings, setSettings] = useState(null);
    const [shortcutStatus, setShortcutStatus] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState(FALLBACK_CONNECTION);
    const [notifications, setNotifications] = useState([]);
    const [activeFilter, setActiveFilter] = useState("all");
    const [historyRange, setHistoryRange] = useState(15);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const pushToast = useCallback((title, body) => {
        const item = {
            id: `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title,
            body
        };
        setNotifications((current) => [item, ...current].slice(0, 3));
    }, []);
    const loadNativeState = useCallback(async (api) => {
        const [nativeRecords, nativeSettings, nativeStatus, nativeShortcutStatus] = await Promise.allSettled([
            api.history.list(),
            api.settings.get(),
            api.connection.status(),
            api.settings.shortcuts()
        ]);
        if (nativeRecords.status === "fulfilled") {
            setRecords(mapRecords(nativeRecords.value));
        }
        else {
            setRecords([]);
        }
        if (nativeSettings.status === "fulfilled") {
            setSettings(nativeSettings.value);
        }
        if (nativeStatus.status === "fulfilled") {
            setConnectionStatus(nativeStatus.value);
        }
        if (nativeShortcutStatus.status === "fulfilled") {
            setShortcutStatus(nativeShortcutStatus.value);
        }
    }, []);
    useEffect(() => {
        if (!syncTool) {
            return;
        }
        void loadNativeState(syncTool);
        const unsubscribeHistory = syncTool.events.onHistoryChanged((nativeRecords) => {
            setRecords(mapRecords(nativeRecords));
        });
        const unsubscribeConnection = syncTool.connection.onStatusChanged(setConnectionStatus);
        const unsubscribeNotification = syncTool.events.onNotification((item) => {
            setNotifications((current) => [item, ...current].slice(0, 3));
        });
        return () => {
            unsubscribeHistory();
            unsubscribeConnection();
            unsubscribeNotification();
        };
    }, [loadNativeState, syncTool]);
    useEffect(() => {
        if (notifications.length === 0) {
            return;
        }
        const timer = window.setTimeout(() => {
            setNotifications((current) => current.slice(0, -1));
        }, 5000);
        return () => window.clearTimeout(timer);
    }, [notifications]);
    const filteredRecords = useMemo(() => {
        return records.filter((record) => {
            const matchesFilter = activeFilter === "all" || record.filterTags.includes(activeFilter);
            const haystack = `${record.title} ${record.previewText ?? ""} ${record.sourceDeviceName}`.toLowerCase();
            const matchesSearch = haystack.includes(searchQuery.toLowerCase().trim());
            return matchesFilter && matchesSearch;
        });
    }, [activeFilter, records, searchQuery]);
    const captureCurrentClipboard = useCallback(async () => {
        if (!syncTool) {
            return;
        }
        await syncTool.clipboard.captureCurrent();
    }, [syncTool]);
    const copyRecord = useCallback(async (recordId) => {
        const record = records.find((item) => item.id === recordId);
        const fallbackText = record?.kind === "text" ? record.previewText ?? record.title : undefined;
        if (!syncTool) {
            if (fallbackText && navigator.clipboard?.writeText) {
                try {
                    await navigator.clipboard.writeText(fallbackText);
                    pushToast("已复制", "内容已写入剪贴板");
                }
                catch {
                    pushToast("复制失败", "当前环境没有剪贴板权限");
                }
                return;
            }
            pushToast("复制失败", "该记录不是可复制的文本内容");
            return;
        }
        try {
            await syncTool.history.copy(recordId);
            pushToast("已复制", "内容已写入剪贴板");
        }
        catch {
            if (fallbackText) {
                await syncTool.clipboard.writeText(fallbackText);
                pushToast("已复制", "内容已写入剪贴板");
                return;
            }
            pushToast("复制失败", "该记录不是可复制的文本内容");
        }
    }, [pushToast, records, syncTool]);
    const copyVerificationCode = useCallback(async (code) => {
        if (!syncTool) {
            pushToast("已复制验证码", code);
            return;
        }
        try {
            await syncTool.clipboard.writeText(code);
            pushToast("已复制验证码", code);
        }
        catch {
            pushToast("复制失败", "验证码无法写入剪贴板");
        }
    }, [pushToast, syncTool]);
    const requestTransfer = useCallback(async (recordId) => {
        if (!syncTool) {
            return;
        }
        try {
            await syncTool.history.publish(recordId);
        }
        catch {
            setConnectionStatus((current) => ({
                ...current,
                state: "offline",
                lastError: "服务端离线，记录仍保留在本地"
            }));
        }
    }, [syncTool]);
    const reconnect = useCallback(async () => {
        if (!syncTool) {
            return;
        }
        await syncTool.connection.reconnect();
        await loadNativeState(syncTool);
    }, [loadNativeState, syncTool]);
    const updateSettings = useCallback(async (patch) => {
        if (!syncTool) {
            pushToast("保存失败", "当前窗口没有连接 Electron 原生能力");
            return;
        }
        const nextSettings = await syncTool.settings.update(patch);
        setSettings(nextSettings);
        setShortcutStatus(await syncTool.settings.shortcuts());
        pushToast("设置已保存", "正在检查服务器连接");
        try {
            await syncTool.connection.reconnect();
            await loadNativeState(syncTool);
            const status = await syncTool.connection.status();
            pushToast(status.state === "online" ? "服务器已连接" : "服务器已检查", status.lastError ?? "已刷新服务器历史记录");
        }
        catch {
            const status = await syncTool.connection.status();
            setConnectionStatus((current) => ({
                ...current,
                ...status,
                state: "error",
                lastError: status.lastError ?? "配置已保存，服务端暂不可连接"
            }));
            pushToast("连接失败", status.lastError ?? "配置已保存，服务端暂不可连接");
        }
    }, [loadNativeState, pushToast, syncTool]);
    const onlineCount = connectionStatus.onlineDevices;
    const connectionLabel = CONNECTION_LABELS[connectionStatus.state];
    return (_jsxs("div", { className: `app-frame app-frame--${viewMode}`, children: [_jsx(NotificationStack, { items: viewMode === "desktop" ? notifications : [], onCopyVerificationCode: copyVerificationCode }), _jsxs("main", { className: `app-shell app-shell--${viewMode}`, children: [_jsx(Header, { onlineCount: onlineCount, connectionLabel: connectionLabel, onOpenSettings: () => setIsSettingsOpen(true) }), _jsxs("div", { className: "app-body", children: [_jsx(HistoryToolbar, { viewMode: viewMode, searchQuery: searchQuery, historyRange: historyRange, onSearchChange: setSearchQuery, onRangeChange: setHistoryRange, onPublish: captureCurrentClipboard, onReconnect: reconnect }), _jsx(HistoryFilters, { viewMode: viewMode, activeFilter: activeFilter, onFilterChange: setActiveFilter }), connectionStatus.lastError ? (_jsx("div", { className: "inline-error", children: connectionStatus.lastError })) : null, _jsx(HistoryList, { records: filteredRecords, viewMode: viewMode, onCopyRecord: copyRecord, onRequestTransfer: requestTransfer })] })] }), _jsx(SettingsPanel, { open: isSettingsOpen, settings: settings, shortcutStatus: shortcutStatus, connectionState: connectionLabel, onUpdateSettings: updateSettings, onClose: () => setIsSettingsOpen(false) })] }));
}
const CONNECTION_LABELS = {
    connecting: "连接中",
    error: "连接异常",
    offline: "离线可用",
    online: "已连接"
};
function mapRecords(nativeRecords) {
    return nativeRecords.map(toUiRecord);
}
