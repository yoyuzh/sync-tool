export type RecordKind = "text" | "image" | "document";

export type StorageMode = "source_file" | "metadata_only";

export type PublishState = "local" | "published" | "broadcast";

export interface ClipboardRecord {
  id: string;
  createdAt: string;
  sourceDeviceId: string;
  kind: RecordKind;
  title: string;
  textPreview?: string;
  mimeType?: string;
  sizeBytes: number;
  storageMode: StorageMode;
  publishState: PublishState;
}

export interface DeviceSession {
  deviceId: string;
  deviceName: string;
  deviceType: "desktop" | "android";
  online: boolean;
  lastSeenAt: string;
}

