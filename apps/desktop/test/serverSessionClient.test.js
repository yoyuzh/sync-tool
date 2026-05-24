import { beforeEach, describe, expect, it, vi } from "vitest";
import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
class FakeWebSocket {
    static instances = [];
    listeners = new Map();
    url;
    constructor(url) {
        this.url = url;
        FakeWebSocket.instances.push(this);
    }
    addEventListener(eventName, listener) {
        const listeners = this.listeners.get(eventName) ?? [];
        listeners.push(listener);
        this.listeners.set(eventName, listeners);
    }
    emit(eventName, event = {}) {
        for (const listener of this.listeners.get(eventName) ?? []) {
            listener(event);
        }
    }
    close() { }
}
describe("ServerSessionClient", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        FakeWebSocket.instances = [];
        vi.stubGlobal("WebSocket", FakeWebSocket);
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
        let token = "stale-token";
        const settingsStore = {
            get: vi.fn(async () => ({
                serverUrl: "http://127.0.0.1:8787",
                deviceName: "Desktop",
                deviceId: "desktop-1",
                clipboardPollingEnabled: true,
                clipboardPollingIntervalMs: 1200,
                autoPublishEnabled: false,
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
            setDeviceToken: vi.fn(async (_serverUrl, nextToken) => {
                token = nextToken;
            })
        };
        const { ServerSessionClient } = await import("../electron/server/serverSessionClient");
        const client = new ServerSessionClient({
            settingsStore: settingsStore,
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
        expect(settingsStore.setDeviceToken).toHaveBeenCalledWith("http://127.0.0.1:8787", "fresh-token");
        expect(FakeWebSocket.instances[1]?.url).toContain("fresh-token");
    });
});
