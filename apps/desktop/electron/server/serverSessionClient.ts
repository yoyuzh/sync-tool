import { randomUUID } from "node:crypto";
import type {
  ClipboardRecord,
  ClipboardRecordDraft,
  ConnectionStatus,
  HistoryResponse,
  PublishRecordRequest,
  PublishRecordResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  ServerMessage
} from "@sync-tool/shared";
import { API_V1_PREFIX, SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import type { SettingsStore } from "../settings/settingsStore";

interface ServerSessionClientOptions {
  settingsStore: SettingsStore;
  onStatusChanged: (status: ConnectionStatus) => void;
  onRemoteRecord: (record: ClipboardRecord) => void;
}

export class ServerSessionClient {
  private status: ConnectionStatus = {
    state: "offline",
    serverUrl: "http://127.0.0.1:8787",
    onlineDevices: 0
  };

  private socket: WebSocket | null = null;
  private recoveringAuth = false;

  constructor(private readonly options: ServerSessionClientOptions) {}

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async reconnect(): Promise<void> {
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
    } catch (error) {
      this.setStatus({
        state: "error",
        serverUrl: settings.serverUrl,
        lastError: error instanceof Error ? error.message : "连接失败",
        onlineDevices: 0
      });
    }
  }

  async healthCheck(serverUrl?: string): Promise<void> {
    const settings = await this.options.settingsStore.get();
    const targetUrl = serverUrl ?? settings.serverUrl;
    const response = await fetch(new URL("/health", targetUrl));
    if (!response.ok) {
      throw new Error(`健康检查失败：${response.status}`);
    }
  }

  async fetchHistory(days: number, limit: number): Promise<ClipboardRecord[]> {
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

    const payload = (await response.json()) as HistoryResponse;
    return Array.isArray(payload.records) ? payload.records : [];
  }

  async publish(record: ClipboardRecord): Promise<ClipboardRecord> {
    const settings = await this.options.settingsStore.get();
    const token = await this.ensureDeviceToken();
    const registeredSettings = await this.options.settingsStore.get();
    const request: PublishRecordRequest = {
      record: toDraft(record, registeredSettings.deviceId),
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

    const payload = (await response.json()) as PublishRecordResponse;
    return payload.record;
  }

  close(): void {
    this.socket?.close();
    this.socket = null;
    this.setStatus({ ...this.status, state: "offline" });
  }

  private async ensureDeviceToken(): Promise<string> {
    const settings = await this.options.settingsStore.get();
    const existingToken = await this.options.settingsStore.getDeviceToken(settings.serverUrl);
    if (existingToken) {
      return existingToken;
    }

    const request: RegisterDeviceRequest = {
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

    const payload = (await response.json()) as RegisterDeviceResponse;
    if (payload.protocolVersion !== SYNC_PROTOCOL_VERSION) {
      throw new Error("服务端协议版本不兼容");
    }

    await this.options.settingsStore.setDeviceRegistration(
      settings.serverUrl,
      payload.token,
      payload.device.deviceId
    );
    return payload.token;
  }

  private openSocket(serverUrl: string, token: string): void {
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

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") {
      return;
    }

    let message: ServerMessage;
    try {
      message = JSON.parse(data) as ServerMessage;
    } catch {
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

  private async recoverFromUnauthorizedSocket(): Promise<void> {
    if (this.recoveringAuth) {
      return;
    }

    this.recoveringAuth = true;
    const settings = await this.options.settingsStore.get();
    await this.options.settingsStore.clearDeviceToken(settings.serverUrl);
    await this.reconnect();
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChanged(status);
  }
}

function toDraft(record: ClipboardRecord, sourceDeviceId: string): ClipboardRecordDraft {
  const {
    publishState: _publishState,
    updatedAt: _updatedAt,
    ...draft
  } = record;
  return { ...draft, sourceDeviceId };
}

function toWebSocketUrl(serverUrl: string, token: string): string {
  const url = new URL("/ws", serverUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.toString();
}
