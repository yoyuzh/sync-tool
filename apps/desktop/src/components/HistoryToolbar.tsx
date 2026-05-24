import type { HistoryRange, ViewMode } from "../types/ui";

interface HistoryToolbarProps {
  viewMode: ViewMode;
  searchQuery: string;
  historyRange: HistoryRange;
  onSearchChange: (value: string) => void;
  onRangeChange: (value: HistoryRange) => void;
  onPublish: () => void;
  onReconnect: () => void;
}

const RANGE_OPTIONS: HistoryRange[] = [15, 7, 3, 1];
export const TOOLBAR_CAPTURE_BUTTON_LABEL = "+ 捕获";

export function HistoryToolbar({
  viewMode,
  searchQuery,
  historyRange,
  onSearchChange,
  onRangeChange,
  onPublish,
  onReconnect
}: HistoryToolbarProps) {
  return (
    <section className={`toolbar toolbar--${viewMode}`}>
      <label className="search-field">
        <span className="field-icon" aria-hidden="true">
          Q
        </span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={viewMode === "desktop" ? "搜索剪贴板历史..." : "搜索历史..."}
        />
      </label>

      <div className="toolbar-actions">
        <select
          className="range-select"
          value={historyRange}
          onChange={(event) => onRangeChange(Number(event.target.value) as HistoryRange)}
          title="时间范围"
        >
          {RANGE_OPTIONS.map((range) => (
            <option key={range} value={range}>
              最近 {range} 天
            </option>
          ))}
        </select>

        {viewMode === "desktop" && (
          <button type="button" className="primary-button toolbar__publish" onClick={onPublish}>
            {TOOLBAR_CAPTURE_BUTTON_LABEL}
          </button>
        )}

        <button type="button" className="secondary-button" onClick={onReconnect} title="重新连接服务器">
          R
        </button>
      </div>
    </section>
  );
}
