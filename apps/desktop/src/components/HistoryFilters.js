import { jsx as _jsx } from "react/jsx-runtime";
const FILTERS = [
    { value: "all", label: "全部" },
    { value: "local", label: "本地" },
    { value: "synced", label: "已同步" },
    { value: "files", label: "文件" },
    { value: "images", label: "图片" },
    { value: "failed", label: "失败" }
];
export function HistoryFilters({ viewMode, activeFilter, onFilterChange }) {
    return (_jsx("nav", { className: `history-filters history-filters--${viewMode}`, "aria-label": "\u8BB0\u5F55\u7B5B\u9009", children: FILTERS.map((filter) => {
            const active = filter.value === activeFilter;
            return (_jsx("button", { type: "button", className: active ? "filter-button is-active" : "filter-button", onClick: () => onFilterChange(filter.value), children: filter.label }, filter.value));
        }) }));
}
