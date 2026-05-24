import type { HistoryFilter, ViewMode } from "../types/ui";

interface HistoryFiltersProps {
  viewMode: ViewMode;
  activeFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
}

const FILTERS: Array<{ value: HistoryFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "local", label: "本地" },
  { value: "synced", label: "已同步" },
  { value: "files", label: "文件" },
  { value: "images", label: "图片" },
  { value: "failed", label: "失败" }
];

export function HistoryFilters({
  viewMode,
  activeFilter,
  onFilterChange
}: HistoryFiltersProps) {
  return (
    <nav className={`history-filters history-filters--${viewMode}`} aria-label="记录筛选">
      {FILTERS.map((filter) => {
        const active = filter.value === activeFilter;
        return (
          <button
            key={filter.value}
            type="button"
            className={active ? "filter-button is-active" : "filter-button"}
            onClick={() => onFilterChange(filter.value)}
          >
            {filter.label}
          </button>
        );
      })}
    </nav>
  );
}
