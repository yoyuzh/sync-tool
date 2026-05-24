import { Notification } from "electron";
import type { ClipboardRecord } from "@sync-tool/shared";
import type { DesktopSettings } from "../settings/settingsStore";

interface NotificationServiceOptions {
  onNotificationClick: (recordId?: string) => void;
  onCopyVerificationCode: (verificationCode: string, recordId?: string) => void;
  onNotification: (item: NotificationItem) => void;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  recordId?: string;
  verificationCode?: string;
}

export class NotificationService {
  constructor(private readonly options: NotificationServiceOptions) {}

  showRemoteRecord(record: ClipboardRecord, settings: DesktopSettings): void {
    const verificationCode = extractVerificationCode(record.textContent ?? record.textPreview ?? record.title);
    const item: NotificationItem = {
      id: `notification-${record.id}`,
      title: verificationCode ? "收到手机验证码" : "收到远程记录",
      body: createRemoteRecordBody(record, settings, verificationCode),
      recordId: record.id,
      verificationCode
    };
    this.options.onNotification(item);

    if (!Notification.isSupported()) {
      return;
    }

    const notification = new Notification({
      title: item.title,
      body: item.body,
      actions: verificationCode
        ? [
            {
              type: "button",
              text: "复制验证码"
            }
          ]
        : undefined
    });
    notification.on("click", () => this.options.onNotificationClick(record.id));
    notification.on("action", (_event, index) => {
      if (index === 0 && verificationCode) {
        this.options.onCopyVerificationCode(verificationCode, record.id);
      }
    });
    notification.show();
  }

  showStatus(title: string, body: string): void {
    const item: NotificationItem = {
      id: `notification-${Date.now()}`,
      title,
      body
    };
    this.options.onNotification(item);

    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  }
}

function createRemoteRecordBody(
  record: ClipboardRecord,
  settings: DesktopSettings,
  verificationCode?: string
): string {
  if (verificationCode) {
    return `验证码 ${verificationCode}`;
  }

  if (settings.notificationPreviewEnabled) {
    return record.textPreview ?? record.title;
  }

  return "新的剪贴板记录已保存";
}

function extractVerificationCode(text: string): string | undefined {
  const match = text.match(/(?:验证码|校验码|动态码|code|Code|CODE)?\D*(\d{4,8})/);
  return match?.[1];
}
