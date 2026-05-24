import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readonly listeners = new Map<string, Array<(event: { data?: string }) => void>>();
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(eventName: string, listener: (event: { data?: string }) => void): void {
    const listeners = this.listeners.get(eventName) ?? [];
    listeners.push(listener);
    this.listeners.set(eventName, listeners);
  }

  emit(eventName: string, event: { data?: string } = {}): void {
    for (const listener of this.listeners.get(eventName) ?? []) {
      listener(event);
    }
  }

  close(): void {}
}

describe("ServerSessionClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  it("delivers SMS-like published records received over WebSocket", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const settingsStore = {
      get: vi.fn(async () => makeSettings()),
      getDeviceToken: vi.fn(async () => "desktop-token"),
      clearDeviceToken: vi.fn(),
      setDeviceToken: vi.fn(),
      setDeviceRegistration: vi.fn()
    };
    const onRemoteRecord = vi.fn();
    const { ServerSessionClient } = await import("../electron/server/serverSessionClient");
    type ServerSessionClientOptions = ConstructorParameters<typeof ServerSessionClient>[0];
    type SettingsStoreLike = ServerSessionClientOptions["settingsStore"];
    const client = new ServerSessionClient({
      settingsStore: settingsStore as unknown as SettingsStoreLike,
      onStatusChanged: vi.fn(),
      onRemoteRecord
    });

    await client.reconnect();
    FakeWebSocket.instances[0]?.emit("message", {
      data: JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.recordPublished,
        messageId: "sms-message",
        sentAt: "2026-05-24T08:14:54.000Z",
        payload: {
          record: {
            id: "sms-record-1",
            createdAt: "2026-05-24T08:14:53.994Z",
            updatedAt: "2026-05-24T08:14:54.018Z",
            sourceDeviceId: "android-device-1",
            kind: "text",
            title: "短信来自 +***5678",
            textPreview: "短信来自 +***5678\n【ClipLink】验证码 739251，5 分钟内有效。",
            textContent: "短信来自 +***5678\n【ClipLink】验证码 739251，5 分钟内有效。",
            mimeType: "text/plain",
            sizeBytes: 75,
            storageMode: "metadata_only",
            publishState: "published",
            contentHash: "sms-hash"
          }
        }
      })
    });

    expect(onRemoteRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "sms-record-1",
        sourceDeviceId: "android-device-1",
        textContent: expect.stringContaining("739251")
      })
    );
  });

  it("clears a stale device token and reconnects when WebSocket auth is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          device: {
            deviceId: "device-new",
            deviceName: "Desktop",
            deviceType: "desktop",
            online: false,
            lastSeenAt: "2026-05-24T00:00:00.000Z"
          },
          token: "fresh-token",
          protocolVersion: SYNC_PROTOCOL_VERSION
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    let token: string | undefined = "stale-token";
    const settingsStore = {
      get: vi.fn(async () => ({
        serverUrl: "http://127.0.0.1:8787",
        deviceName: "Desktop",
        deviceId: "desktop-1",
        clipboardPollingEnabled: true,
        clipboardPollingIntervalMs: 1200,
        autoPublishEnabled: false as const,
        globalShortcutOpen: "CommandOrControl+Shift+V",
        globalShortcutPublish: "CommandOrControl+Shift+U",
        globalShortcutPasteLatestOnline: "Command+Shift+V",
        notificationPreviewEnabled: false,
        maxLocalHistoryItems: 200
      })),
      getDeviceToken: vi.fn(async () => token),
      clearDeviceToken: vi.fn(async () => {
        token = undefined;
      }),
      setDeviceToken: vi.fn(async (_serverUrl: string, nextToken: string) => {
        token = nextToken;
      }),
      setDeviceRegistration: vi.fn(async (_serverUrl: string, nextToken: string) => {
        token = nextToken;
      })
    };
    const { ServerSessionClient } = await import("../electron/server/serverSessionClient");
    type ServerSessionClientOptions = ConstructorParameters<typeof ServerSessionClient>[0];
    type SettingsStoreLike = ServerSessionClientOptions["settingsStore"];
    const client = new ServerSessionClient({
      settingsStore: settingsStore as unknown as SettingsStoreLike,
      onStatusChanged: vi.fn(),
      onRemoteRecord: vi.fn()
    });

    await client.reconnect();
    expect(FakeWebSocket.instances[0]?.url).toContain("stale-token");

    FakeWebSocket.instances[0]?.emit("message", {
      data: JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.serverError,
        messageId: "auth-error",
        sentAt: "2026-05-24T00:00:00.000Z",
        payload: {
          code: "unauthorized",
          message: "Missing or invalid bearer token",
          retryable: false
        }
      })
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(settingsStore.clearDeviceToken).toHaveBeenCalledWith("http://127.0.0.1:8787");
    expect(settingsStore.setDeviceRegistration).toHaveBeenCalledWith(
      "http://127.0.0.1:8787",
      "fresh-token",
      "device-new"
    );
    expect(FakeWebSocket.instances[1]?.url).toContain("fresh-token");
  });

  it("publishes records with the registered server device id", async () => {
    let settingsDeviceId = "local-before-registration";
    let requestBody: unknown;
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        record: {
          id: "record-1",
          createdAt: "2026-05-24T00:00:00.000Z",
          updatedAt: "2026-05-24T00:00:00.000Z",
          sourceDeviceId: "server-device-1",
          kind: "text",
          title: "Hello",
          textPreview: "Hello",
          textContent: "Hello",
          sizeBytes: 5,
          storageMode: "metadata_only",
          publishState: "published"
        },
        acceptedAt: "2026-05-24T00:00:00.000Z"
      })
    });
    vi.stubGlobal("fetch", async (_url: unknown, init?: RequestInit) => {
      requestBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      return fetchMock();
    });

    const settingsStore = {
      get: vi.fn(async () => ({
        serverUrl: "http://127.0.0.1:8787",
        deviceName: "Desktop",
        deviceId: settingsDeviceId,
        clipboardPollingEnabled: true,
        clipboardPollingIntervalMs: 1200,
        autoPublishEnabled: false as const,
        globalShortcutOpen: "CommandOrControl+Shift+V",
        globalShortcutPublish: "CommandOrControl+Shift+U",
        globalShortcutPasteLatestOnline: "Command+Shift+V",
        notificationPreviewEnabled: false,
        maxLocalHistoryItems: 200
      })),
      getDeviceToken: vi.fn(async () => "token-1"),
      clearDeviceToken: vi.fn(),
      setDeviceToken: vi.fn(),
      setDeviceRegistration: vi.fn()
    };
    const { ServerSessionClient } = await import("../electron/server/serverSessionClient");
    type ServerSessionClientOptions = ConstructorParameters<typeof ServerSessionClient>[0];
    type SettingsStoreLike = ServerSessionClientOptions["settingsStore"];
    const client = new ServerSessionClient({
      settingsStore: settingsStore as unknown as SettingsStoreLike,
      onStatusChanged: vi.fn(),
      onRemoteRecord: vi.fn()
    });

    settingsDeviceId = "server-device-1";
    await client.publish({
      id: "record-1",
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
      sourceDeviceId: "local-before-registration",
      kind: "text",
      title: "Hello",
      textPreview: "Hello",
      textContent: "Hello",
      sizeBytes: 5,
      storageMode: "metadata_only",
      publishState: "local"
    });

    expect((requestBody as { record: { sourceDeviceId: string } }).record.sourceDeviceId).toBe(
      "server-device-1"
    );
  });
});

function makeSettings() {
  return {
    serverUrl: "http://127.0.0.1:8787",
    deviceName: "Desktop",
    deviceId: "desktop-1",
    clipboardPollingEnabled: true,
    clipboardPollingIntervalMs: 1200,
    autoPublishEnabled: false as const,
    globalShortcutOpen: "CommandOrControl+Shift+V",
    globalShortcutPublish: "CommandOrControl+Shift+U",
    globalShortcutPasteLatestOnline: "Command+Shift+V",
    notificationPreviewEnabled: false,
    maxLocalHistoryItems: 200
  };
}
