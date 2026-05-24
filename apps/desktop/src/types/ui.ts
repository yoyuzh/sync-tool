export type ViewMode = "desktop" | "mobile";

export type HistoryFilter = "all" | "local" | "synced" | "files" | "images" | "failed";

export type HistoryRange = 1 | 3 | 7 | 15;

export type DeviceType = "desktop" | "android" | "ios";

export type RecordStatus =
  | "local-only"
  | "synced"
  | "metadata-only"
  | "transfer-pending"
  | "download-ready"
  | "failed";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

export interface RecordAction {
  id: string;
  label: string;
}

export interface UiRecord {
  id: string;
  kind: "text" | "image" | "document";
  title: string;
  previewText?: string;
  previewImageUrl?: string;
  fileName?: string;
  sizeLabel?: string;
  sourceDeviceName: string;
  sourceDeviceType: DeviceType;
  timestampLabel: string;
  filterTags: HistoryFilter[];
  status: RecordStatus;
  statusTone: StatusTone;
  statusLabel: string;
  metadataOnly?: boolean;
  primaryActionLabel: string;
  secondaryActions: RecordAction[];
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  verificationCode?: string;
}
