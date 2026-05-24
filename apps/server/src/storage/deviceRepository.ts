import type { DatabaseSync } from "node:sqlite";
import type { DeviceCapability, DeviceSession, DeviceType } from "@sync-tool/shared";

interface DeviceRow {
  device_id: string;
  device_name: string;
  device_type: DeviceType;
  capabilities_json: string;
  token_hash: string;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface StoredDevice {
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  capabilities: DeviceCapability[];
  tokenHash: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt?: string;
}

export class DeviceRepository {
  constructor(private readonly db: DatabaseSync) {}

  create(input: {
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    capabilities: DeviceCapability[];
    tokenHash: string;
    now: string;
  }) {
    this.db
      .prepare(`
        INSERT INTO devices (
          device_id,
          device_name,
          device_type,
          capabilities_json,
          token_hash,
          created_at,
          last_seen_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.deviceId,
        input.deviceName,
        input.deviceType,
        JSON.stringify(input.capabilities),
        input.tokenHash,
        input.now,
        input.now
      );

    return this.findById(input.deviceId);
  }

  findByTokenHash(tokenHash: string) {
    const row = this.db
      .prepare("SELECT * FROM devices WHERE token_hash = ? AND revoked_at IS NULL")
      .get(tokenHash) as DeviceRow | undefined;
    return row ? mapDevice(row) : undefined;
  }

  findById(deviceId: string) {
    const row = this.db
      .prepare("SELECT * FROM devices WHERE device_id = ?")
      .get(deviceId) as DeviceRow | undefined;
    return row ? mapDevice(row) : undefined;
  }

  list() {
    const rows = this.db
      .prepare("SELECT * FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC")
      .all() as unknown as DeviceRow[];
    return rows.map(mapDevice);
  }

  touch(deviceId: string, now: string) {
    this.db
      .prepare("UPDATE devices SET last_seen_at = ? WHERE device_id = ?")
      .run(now, deviceId);
  }
}

export function toDeviceSession(device: StoredDevice, online = false): DeviceSession {
  return {
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    deviceType: device.deviceType,
    capabilities: device.capabilities,
    online,
    lastSeenAt: device.lastSeenAt
  };
}

function mapDevice(row: DeviceRow): StoredDevice {
  return {
    deviceId: row.device_id,
    deviceName: row.device_name,
    deviceType: row.device_type,
    capabilities: JSON.parse(row.capabilities_json) as DeviceCapability[],
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    ...(row.revoked_at ? { revokedAt: row.revoked_at } : {})
  };
}
