import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RecordCard } from "./RecordCard";
export function HistoryList({ records, viewMode, onCopyRecord, onRequestTransfer }) {
    if (records.length === 0) {
        return (_jsxs("section", { className: "empty-state", children: [_jsx("h2", { children: "\u6CA1\u6709\u5339\u914D\u7684\u8BB0\u5F55" }), _jsx("p", { children: "\u8BD5\u8BD5\u66F4\u6362\u7B5B\u9009\u6761\u4EF6\uFF0C\u6216\u8005\u7F29\u77ED\u641C\u7D22\u8BCD\u3002" })] }));
    }
    const columns = splitRecords(records, viewMode);
    return (_jsx("section", { className: `history-list history-list--${viewMode}`, children: columns.map((columnRecords, columnIndex) => (_jsx("div", { className: "history-list__column", children: columnRecords.map((record) => (_jsx(RecordCard, { record: record, viewMode: viewMode, onCopyRecord: onCopyRecord, onRequestTransfer: onRequestTransfer }, record.id))) }, `column-${columnIndex}`))) }));
}
function splitRecords(records, viewMode) {
    if (viewMode === "mobile") {
        return [records];
    }
    return records.reduce((columns, record, index) => {
        columns[index % 2].push(record);
        return columns;
    }, [[], []]);
}
