import { describe, expect, it, vi } from "vitest";
import type { ClipboardRecord } from "@sync-tool/shared";
import type { DesktopSettings } from "../electron/settings/settingsStore";

const notificationShow = vi.fn();
const notificationOn = vi.fn();
const notificationHandlers = new Map<string, (...args: unknown[]) => void>();
const notificationConstructor = vi.fn(function Notification(this: unknown) {
  return {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      notificationOn(event, handler);
      notificationHandlers.set(event, handler);
    },
    show: notificationShow
  };
});

vi.mock("electron", () => ({
  Notification: Object.assign(notificationConstructor, {
    isSupported: vi.fn(() => true)
  })
}));

describe("NotificationService", () => {
  it("adds a copy-code action for remote SMS-like records", async () => {
    const pushed = vi.fn();
    const clicked = vi.fn();
    const copied = vi.fn();
    const { NotificationService } = await import("../electron/notifications/notificationService");
    const service = new NotificationService({
      onNotificationClick: clicked,
      onCopyVerificationCode: copied,
      onNotification: pushed
    });

    service.showRemoteRecord(makeSmsRecord("【银行】验证码 482913，5 分钟内有效。"), makeSettings());

    expect(notificationConstructor).toHaveBeenCalledWith({
      title: "收到手机验证码",
      body: "验证码 482913",
      actions: [{ type: "button", text: "复制验证码" }]
    });

    const actionHandler = notificationHandlers.get("action");
    expect(actionHandler).toBeTypeOf("function");
    actionHandler?.({}, 0);
    expect(copied).toHaveBeenCalledWith("482913", "sms-record-1");
  });

  it("shows a verification-code notification for remote SMS-like records", async () => {
    const pushed = vi.fn();
    const clicked = vi.fn();
    const copied = vi.fn();
    const { NotificationService } = await import("../electron/notifications/notificationService");
    const service = new NotificationService({
      onNotificationClick: clicked,
      onCopyVerificationCode: copied,
      onNotification: pushed
    });

    service.showRemoteRecord(makeSmsRecord("【银行】验证码 482913，5 分钟内有效。"), makeSettings());

    expect(pushed).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "收到手机验证码",
        body: "验证码 482913",
        recordId: "sms-record-1",
        verificationCode: "482913"
      })
    );
    expect(notificationConstructor).toHaveBeenCalledWith({
      title: "收到手机验证码",
      body: "验证码 482913",
      actions: [{ type: "button", text: "复制验证码" }]
    });
    expect(notificationShow).toHaveBeenCalled();
  });
});

function makeSmsRecord(text: string): ClipboardRecord {
  return {
    id: "sms-record-1",
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    sourceDeviceId: "android-1",
    kind: "text",
    title: text,
    textPreview: text,
    textContent: text,
    mimeType: "text/plain",
    sizeBytes: Buffer.byteLength(text),
    storageMode: "metadata_only",
    publishState: "broadcast"
  };
}

function makeSettings(): DesktopSettings {
  return {
    serverUrl: "http://127.0.0.1:8787",
    deviceName: "Desktop",
    deviceId: "desktop-1",
    clipboardPollingEnabled: true,
    clipboardPollingIntervalMs: 1200,
    autoPublishEnabled: false,
    globalShortcutOpen: "Control+Command+V",
    globalShortcutPublish: "Control+Command+C",
    globalShortcutPasteLatestOnline: "Command+Shift+V",
    notificationPreviewEnabled: false,
    openWindowAfterCopyVerificationCode: false,
    maxLocalHistoryItems: 200
  };
}
