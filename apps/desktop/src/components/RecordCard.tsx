import { useEffect, useRef, useState } from "react";
import type { UiRecord, ViewMode } from "../types/ui";
import { StatusBadge } from "./StatusBadge";

interface RecordCardProps {
  record: UiRecord;
  viewMode: ViewMode;
  onCopyRecord: (recordId: string) => void;
  onRequestTransfer: (recordId: string) => void;
  onDeleteRecord: (recordId: string) => void;
}

const KIND_LABELS = {
  document: "文件",
  image: "图片",
  text: "文本"
} as const;

const KIND_ICONS = {
  document: "DOC",
  image: "IMG",
  text: "TXT"
} as const;

const DEVICE_ICONS = {
  android: "AD",
  desktop: "PC",
  ios: "IP"
} as const;

const STATUS_ICONS = {
  "download-ready": "DR",
  failed: "ER",
  "local-only": "LO",
  "metadata-only": "MO",
  synced: "OK",
  "transfer-pending": "TP"
} as const;

export function RecordCard({
  record,
  viewMode,
  onCopyRecord,
  onRequestTransfer,
  onDeleteRecord
}: RecordCardProps) {
  const hasImage = Boolean(record.previewImageUrl);
  const isCode = record.kind === "text" && record.previewText?.includes("{");
  const canRequestTransfer = record.metadataOnly || record.status === "transfer-pending";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const closeMenu = () => setMenuOpen(false);
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <article
      className={`record-card record-card--${viewMode}`}
      onClick={() => onCopyRecord(record.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        setMenuOpen(true);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onCopyRecord(record.id);
          return;
        }

        if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
          event.preventDefault();
          setMenuOpen(true);
        }
      }}
      aria-label={`复制 ${record.title}`}
    >
      <button
        type="button"
        className="record-card__menu-trigger"
        aria-label={`打开 ${record.title} 操作菜单`}
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((current) => !current);
        }}
      >
        ⋯
      </button>

      {menuOpen ? (
        <div
          ref={menuRef}
          className="record-card__menu"
          role="menu"
          aria-label={`${record.title} 操作`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="record-card__menu-item"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onRequestTransfer(record.id);
            }}
          >
            发送
          </button>
          <button
            type="button"
            className="record-card__menu-item record-card__menu-item--danger"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              onDeleteRecord(record.id);
            }}
          >
            删除
          </button>
        </div>
      ) : null}

      <div className="record-card__header">
        <div className="record-card__identity">
          <div className="record-card__kind-icon" aria-hidden="true">
            {KIND_ICONS[record.kind]}
          </div>
          <div className="record-card__info">
            <div className="record-card__eyebrow">{KIND_LABELS[record.kind]}</div>
            <div className="record-card__meta">
              <span className="device-chip" title={record.sourceDeviceType}>
                {DEVICE_ICONS[record.sourceDeviceType]}
              </span>
              <span>{record.sourceDeviceName}</span>
              <span className="meta-separator">•</span>
              <span>{record.timestampLabel}</span>
            </div>
          </div>
        </div>

        <StatusBadge
          icon={STATUS_ICONS[record.status]}
          label={record.statusLabel}
          tone={record.statusTone}
        />
      </div>

      {hasImage ? (
        <div className="record-card__media">
          <img src={record.previewImageUrl} alt={record.title} />
        </div>
      ) : null}

      <div className={isCode ? "record-card__content is-code" : "record-card__content"}>
        {record.fileName ? <div className="record-card__title">{record.fileName}</div> : null}
        <p>{record.previewText}</p>
        {record.metadataOnly ? (
          <div className="record-card__subtext">{record.sizeLabel} · 仅同步元信息</div>
        ) : record.sizeLabel ? (
          <div className="record-card__subtext">{record.sizeLabel}</div>
        ) : null}
      </div>

      {canRequestTransfer ? (
        <button
          type="button"
          className="secondary-button record-card__transfer"
          onClick={(event) => {
            event.stopPropagation();
            onRequestTransfer(record.id);
          }}
        >
          请求传输
        </button>
      ) : null}
    </article>
  );
}
