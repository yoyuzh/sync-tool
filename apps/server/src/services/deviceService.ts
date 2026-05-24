import { randomUUID } from "node:crypto";
import type {
  DeviceSession,
  RegisterDeviceRequest,
  RegisterDeviceResponse
} from "@sync-tool/shared";
import { SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import {
  DeviceRepository,
  toDeviceSession,
  type StoredDevice
} from "../storage/deviceRepository";
import { createDeviceToken, hashDeviceToken } from "./tokenService";

export class DeviceService {
  constructor(private readonly devices: DeviceRepository) {}

  register(request: RegisterDeviceRequest): RegisterDeviceResponse {
    const now = new Date().toISOString();
    const token = createDeviceToken();
    const device = this.devices.create({
      deviceId: randomUUID(),
      deviceName: request.deviceName,
      deviceType: request.deviceType,
      capabilities: request.capabilities,
      tokenHash: hashDeviceToken(token),
      now
    });

    if (!device) {
      throw new Error("Device registration failed");
    }

    return {
      device: toDeviceSession(device, false),
      token,
      protocolVersion: SYNC_PROTOCOL_VERSION
    };
  }

  authenticateToken(token: string): StoredDevice | undefined {
    const device = this.devices.findByTokenHash(hashDeviceToken(token));
    if (!device) {
      return undefined;
    }

    const now = new Date().toISOString();
    this.devices.touch(device.deviceId, now);
    return {
      ...device,
      lastSeenAt: now
    };
  }

  listSessions(onlineDeviceIds: ReadonlySet<string>): DeviceSession[] {
    return this.devices
      .list()
      .map((device) => toDeviceSession(device, onlineDeviceIds.has(device.deviceId)));
  }
}
