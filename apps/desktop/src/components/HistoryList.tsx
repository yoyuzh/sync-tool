import type { UiRecord, ViewMode } from "../types/ui";
import { RecordCard } from "./RecordCard";

interface HistoryListProps {
  records: UiRecord[];
  viewMode: ViewMode;
  onCopyRecord: (recordId: string) => void;
  onRequestTransfer: (recordId: string) => void;
}

export function HistoryList({
  records,
  viewMode,
  onCopyRecord,
  onRequestTransfer
}: HistoryListProps) {
  if (records.length === 0) {
    return (
      <section className="empty-state">
        <h2>没有匹配的记录</h2>
        <p>试试更换筛选条件，或者缩短搜索词。</p>
      </section>
    );
  }

  const columns = splitRecords(records, viewMode);

  return (
    <section className={`history-list history-list--${viewMode}`}>
      {columns.map((columnRecords, columnIndex) => (
        <div className="history-list__column" key={`column-${columnIndex}`}>
          {columnRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              viewMode={viewMode}
              onCopyRecord={onCopyRecord}
              onRequestTransfer={onRequestTransfer}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function splitRecords(records: UiRecord[], viewMode: ViewMode): UiRecord[][] {
  if (viewMode === "mobile") {
    return [records];
  }

  return records.reduce<UiRecord[][]>(
    (columns, record, index) => {
      columns[index % 2].push(record);
      return columns;
    },
    [[], []]
  );
}
