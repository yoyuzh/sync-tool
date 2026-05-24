import { randomUUID } from "node:crypto";
import { API_V1_PREFIX, SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
export class ServerSessionClient {
    options;
    status = {
        state: "offline",
        serverUrl: "http://127.0.0.1:8787",
        onlineDevices: 0
    };
    socket = null;
    recoveringAuth = false;
    constructor(options) {
        this.options = options;
    }
    getStatus() {
        return this.status;
    }
    async reconnect() {
        const settings = await this.options.settingsStore.get();
        this.setStatus({
            state: "connecting",
            serverUrl: settings.serverUrl,
            onlineDevices: this.status.onlineDevices
        });
        try {
            await this.healthCheck(settings.serverUrl);
            const token = await this.ensureDeviceToken();
            this.openSocket(settings.serverUrl, token);
        }
        catch (error) {
            this.setStatus({
                state: "error",
                serverUrl: settings.serverUrl,
                lastError: error instanceof Error ? error.message : "连接失败",
                onlineDevices: 0
            });
        }
    }
    async healthCheck(serverUrl) {
        const settings = await this.options.settingsStore.get();
        const targetUrl = serverUrl ?? settings.serverUrl;
        const response = await fetch(new URL("/health", targetUrl));
        if (!response.ok) {
            throw new Error(`健康检查失败：${response.status}`);
        }
    }
    async fetchHistory(days, limit) {
        const settings = await this.options.settingsStore.get();
        let token = await this.ensureDeviceToken();
        const url = new URL(`${API_V1_PREFIX}/history`, settings.serverUrl);
        url.searchParams.set("days", String(days));
        url.searchParams.set("limit", String(limit));
        let response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        if (response.status === 401) {
            await this.options.settingsStore.clearDeviceToken(settings.serverUrl);
            token = await this.ensureDeviceToken();
            response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
        }
        if (!response.ok) {
            throw new Error(`历史记录拉取失败：${response.status}`);
        }
        const payload = (await response.json());
        return Array.isArray(payload.records) ? payload.records : [];
    }
    async publish(record) {
        const settings = await this.options.settingsStore.get();
        const token = await this.ensureDeviceToken();
        const request = {
            record: toDraft(record),
            clientRequestId: randomUUID()
        };
        const response = await fetch(new URL(`${API_V1_PREFIX}/records/publish`, settings.serverUrl), {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            throw new Error(`发布失败：${response.status}`);
        }
        const payload = (await response.json());
        return payload.record;
    }
    close() {
        this.socket?.close();
        this.socket = null;
        this.setStatus({ ...this.status, state: "offline" });
    }
    async ensureDeviceToken() {
        const settings = await this.options.settingsStore.get();
        const existingToken = await this.options.settingsStore.getDeviceToken(settings.serverUrl);
        if (existingToken) {
            return existingToken;
        }
        const request = {
            deviceName: settings.deviceName,
            deviceType: "desktop",
            capabilities: ["clipboard.read.text", "clipboard.write.text", "history.query", "record.publish"]
        };
        const response = await fetch(new URL(`${API_V1_PREFIX}/devices/register`, settings.serverUrl), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(request)
        });
        if (!response.ok) {
            throw new Error(`设备注册失败：${response.status}`);
        }
        const payload = (await response.json());
        if (payload.protocolVersion !== SYNC_PROTOCOL_VERSION) {
            throw new Error("服务端协议版本不兼容");
        }
        await this.options.settingsStore.setDeviceToken(settings.serverUrl, payload.token);
        return payload.token;
    }
    openSocket(serverUrl, token) {
        this.socket?.close();
        const wsUrl = toWebSocketUrl(serverUrl, token);
        const socket = new WebSocket(wsUrl);
        this.socket = socket;
        socket.addEventListener("open", () => {
            this.recoveringAuth = false;
            this.setStatus({
                state: "online",
                serverUrl,
                lastConnectedAt: new Date().toISOString(),
                onlineDevices: this.status.onlineDevices
            });
        });
        socket.addEventListener("message", (event) => {
            this.handleMessage(event.data);
        });
        socket.addEventListener("error", () => {
            this.setStatus({
                state: "error",
                serverUrl,
                lastError: "WebSocket 连接错误",
                onlineDevices: this.status.onlineDevices
            });
        });
        socket.addEventListener("close", () => {
            if (this.status.state === "online" || this.status.state === "connecting") {
                this.setStatus({
                    state: "offline",
                    serverUrl,
                    onlineDevices: 0
                });
            }
        });
    }
    handleMessage(data) {
        if (typeof data !== "string") {
            return;
        }
        let message;
        try {
            message = JSON.parse(data);
        }
        catch {
            return;
        }
        if (message.protocolVersion !== SYNC_PROTOCOL_VERSION) {
            this.setStatus({ ...this.status, state: "error", lastError: "服务端协议版本不兼容" });
            return;
        }
        if (message.type === SYNC_MESSAGE_TYPES.recordPublished || message.type === SYNC_MESSAGE_TYPES.recordUpdated) {
            this.options.onRemoteRecord(message.payload.record);
            return;
        }
        if (message.type === SYNC_MESSAGE_TYPES.presenceSnapshot) {
            this.setStatus({ ...this.status, onlineDevices: message.payload.devices.filter((device) => device.online).length });
            return;
        }
        if (message.type === SYNC_MESSAGE_TYPES.serverError) {
            if (message.payload.code === "unauthorized") {
                void this.recoverFromUnauthorizedSocket();
                return;
            }
            this.setStatus({ ...this.status, state: "error", lastError: message.payload.message });
        }
    }
    async recoverFromUnauthorizedSocket() {
        if (this.recoveringAuth) {
            return;
        }
        this.recoveringAuth = true;
        const settings = await this.options.settingsStore.get();
        await this.options.settingsStore.clearDeviceToken(settings.serverUrl);
        await this.reconnect();
    }
    setStatus(status) {
        this.status = status;
        this.options.onStatusChanged(status);
    }
}
function toDraft(record) {
    const { publishState: _publishState, updatedAt: _updatedAt, ...draft } = record;
    return draft;
}
function toWebSocketUrl(serverUrl, token) {
    const url = new URL("/ws", serverUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    return url.toString();
}
