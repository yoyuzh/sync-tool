import { randomUUID } from "node:crypto";
import type { WebSocket } from "@fastify/websocket";
import type { ClipboardRecord, DeviceSession, ServerMessage } from "@sync-tool/shared";
import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import { toDeviceSession, type StoredDevice } from "../storage/deviceRepository";

interface SessionEntry {
  sessionId: string;
  device: StoredDevice;
  socket: WebSocket;
  connectedAt: string;
}

export class SessionRegistry {
  private readonly sessions = new Map<string, SessionEntry>();

  add(device: StoredDevice, socket: WebSocket) {
    const session: SessionEntry = {
      sessionId: randomUUID(),
      device,
      socket,
      connectedAt: new Date().toISOString()
    };
    this.sessions.set(session.sessionId, session);
    return session.sessionId;
  }

  remove(sessionId: string) {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    return session?.device;
  }

  onlineDeviceIds() {
    return new Set([...this.sessions.values()].map((session) => session.device.deviceId));
  }

  snapshot(devices: DeviceSession[]) {
    const online = this.onlineDeviceIds();
    return devices.map((device) => ({
      ...device,
      online: online.has(device.deviceId)
    }));
  }

  broadcast(message: ServerMessage, exceptSessionId?: string) {
    const data = JSON.stringify(message);
    for (const session of this.sessions.values()) {
      if (session.sessionId === exceptSessionId || session.socket.readyState !== 1) {
        continue;
      }
      session.socket.send(data);
    }
  }

  send(sessionId: string, message: ServerMessage) {
    const session = this.sessions.get(sessionId);
    if (!session || session.socket.readyState !== 1) {
      return;
    }
    session.socket.send(JSON.stringify(message));
  }
}

export function makeServerMessage<TType extends ServerMessage["type"]>(
  type: TType,
  payload: Extract<ServerMessage, { type: TType }>["payload"],
  requestId?: string
): Extract<ServerMessage, { type: TType }> {
  return {
    protocolVersion: SYNC_PROTOCOL_VERSION,
    type,
    messageId: randomUUID(),
    sentAt: new Date().toISOString(),
    ...(requestId ? { requestId } : {}),
    payload
  } as Extract<ServerMessage, { type: TType }>;
}

export function sessionForDevice(device: StoredDevice, online: boolean): DeviceSession {
  return toDeviceSession(device, online);
}

export function recordPublishedMessage(record: ClipboardRecord) {
  return makeServerMessage(SYNC_MESSAGE_TYPES.recordPublished, { record });
}
