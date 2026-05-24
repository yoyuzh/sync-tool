import { Notification } from "electron";
export class NotificationService {
    options;
    constructor(options) {
        this.options = options;
    }
    showRemoteRecord(record, settings) {
        const verificationCode = extractVerificationCode(record.textContent ?? record.textPreview ?? record.title);
        const item = {
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
            body: item.body
        });
        notification.on("click", () => this.options.onNotificationClick(record.id));
        notification.show();
    }
    showStatus(title, body) {
        const item = {
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
function createRemoteRecordBody(record, settings, verificationCode) {
    if (verificationCode) {
        return `验证码 ${verificationCode}`;
    }
    if (settings.notificationPreviewEnabled) {
        return record.textPreview ?? record.title;
    }
    return "新的剪贴板记录已保存";
}
function extractVerificationCode(text) {
    const match = text.match(/(?:验证码|校验码|动态码|code|Code|CODE)?\D*(\d{4,8})/);
    return match?.[1];
}
