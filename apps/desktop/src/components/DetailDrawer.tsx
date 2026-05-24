import type { UiRecord } from "../types/ui";
import { StatusBadge } from "./StatusBadge";

interface DetailDrawerProps {
  record: UiRecord | null;
  open: boolean;
  onClose: () => void;
}

const DEVICE_LABELS = {
  android: "Android 移动端",
  desktop: "Desktop 桌面端",
  ios: "iPhone 移动端"
} as const;

const STATUS_ICONS = {
  "download-ready": "DR",
  failed: "ER",
  "local-only": "LO",
  "metadata-only": "MO",
  synced: "OK",
  "transfer-pending": "TP"
} as const;

export function DetailDrawer({ record, open, onClose }: DetailDrawerProps) {
  return (
    <div className={open ? "overlay-shell is-open" : "overlay-shell"} aria-hidden={!open}>
      <div className={open ? "detail-drawer is-open" : "detail-drawer"}>
        <div className="overlay-header">
          <div>
            <div className="overlay-eyebrow">CLIP DETAIL</div>
            <h2>{record?.title ?? "记录详情"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="关闭">
            X
          </button>
        </div>

        {record ? (
          <div className="drawer-body">
            <div className="drawer-status">
              <StatusBadge
                icon={STATUS_ICONS[record.status]}
                label={record.statusLabel}
                tone={record.statusTone}
              />
            </div>

            <dl className="meta-grid">
              <div>
                <dt>来源设备</dt>
                <dd>
                  <strong>{record.sourceDeviceName}</strong>
                  <br />
                  <small>{DEVICE_LABELS[record.sourceDeviceType]}</small>
                </dd>
              </div>
              <div>
                <dt>创建时间</dt>
                <dd>{record.timestampLabel}</dd>
              </div>
              <div>
                <dt>记录类型</dt>
                <dd>{record.kind.toUpperCase()}</dd>
              </div>
              <div>
                <dt>数据大小</dt>
                <dd>{record.sizeLabel || "—"}</dd>
              </div>
            </dl>

            {record.previewImageUrl ? (
              <div className="drawer-preview">
                <img src={record.previewImageUrl} alt={record.title} />
              </div>
            ) : null}

            <section className="drawer-section">
              <h3>内容内容预览</h3>
              <div className={record.kind === "text" ? "content-box is-code" : "content-box"}>
                {record.previewText ?? "该记录没有可展示的文本预览。"}
              </div>
            </section>

            {record.metadataOnly ? (
              <section className="drawer-section warning-box">
                <h3>传输说明</h3>
                <p>该文件当前仅同步元信息，需要双方设备在线后再发起传输。</p>
              </section>
            ) : null}
          </div>
        ) : (
          <div className="drawer-empty">请选择一条记录查看详情。</div>
        )}
      </div>
    </div>
  );
}

