export class DeviceRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    create(input) {
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
            .run(input.deviceId, input.deviceName, input.deviceType, JSON.stringify(input.capabilities), input.tokenHash, input.now, input.now);
        return this.findById(input.deviceId);
    }
    findByTokenHash(tokenHash) {
        const row = this.db
            .prepare("SELECT * FROM devices WHERE token_hash = ? AND revoked_at IS NULL")
            .get(tokenHash);
        return row ? mapDevice(row) : undefined;
    }
    findById(deviceId) {
        const row = this.db
            .prepare("SELECT * FROM devices WHERE device_id = ?")
            .get(deviceId);
        return row ? mapDevice(row) : undefined;
    }
    list() {
        const rows = this.db
            .prepare("SELECT * FROM devices WHERE revoked_at IS NULL ORDER BY last_seen_at DESC")
            .all();
        return rows.map(mapDevice);
    }
    touch(deviceId, now) {
        this.db
            .prepare("UPDATE devices SET last_seen_at = ? WHERE device_id = ?")
            .run(now, deviceId);
    }
}
export function toDeviceSession(device, online = false) {
    return {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        capabilities: device.capabilities,
        online,
        lastSeenAt: device.lastSeenAt
    };
}
function mapDevice(row) {
    return {
        deviceId: row.device_id,
        deviceName: row.device_name,
        deviceType: row.device_type,
        capabilities: JSON.parse(row.capabilities_json),
        tokenHash: row.token_hash,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        ...(row.revoked_at ? { revokedAt: row.revoked_at } : {})
    };
}
