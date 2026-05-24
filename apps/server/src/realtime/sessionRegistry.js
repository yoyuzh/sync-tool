import { randomUUID } from "node:crypto";
import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import { toDeviceSession } from "../storage/deviceRepository";
export class SessionRegistry {
    sessions = new Map();
    add(device, socket) {
        const session = {
            sessionId: randomUUID(),
            device,
            socket,
            connectedAt: new Date().toISOString()
        };
        this.sessions.set(session.sessionId, session);
        return session.sessionId;
    }
    remove(sessionId) {
        const session = this.sessions.get(sessionId);
        this.sessions.delete(sessionId);
        return session?.device;
    }
    onlineDeviceIds() {
        return new Set([...this.sessions.values()].map((session) => session.device.deviceId));
    }
    snapshot(devices) {
        const online = this.onlineDeviceIds();
        return devices.map((device) => ({
            ...device,
            online: online.has(device.deviceId)
        }));
    }
    broadcast(message, exceptSessionId) {
        const data = JSON.stringify(message);
        for (const session of this.sessions.values()) {
            if (session.sessionId === exceptSessionId || session.socket.readyState !== 1) {
                continue;
            }
            session.socket.send(data);
        }
    }
    send(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session || session.socket.readyState !== 1) {
            return;
        }
        session.socket.send(JSON.stringify(message));
    }
}
export function makeServerMessage(type, payload, requestId) {
    return {
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type,
        messageId: randomUUID(),
        sentAt: new Date().toISOString(),
        ...(requestId ? { requestId } : {}),
        payload
    };
}
export function sessionForDevice(device, online) {
    return toDeviceSession(device, online);
}
export function recordPublishedMessage(record) {
    return makeServerMessage(SYNC_MESSAGE_TYPES.recordPublished, { record });
}
