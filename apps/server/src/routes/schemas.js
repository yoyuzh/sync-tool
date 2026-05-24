import { API_ERROR_CODES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
export const deviceTypes = ["desktop", "android"];
export const deviceCapabilities = [
    "clipboard.read.text",
    "clipboard.write.text",
    "clipboard.read.image",
    "clipboard.write.image",
    "history.query",
    "record.publish"
];
export const apiErrorSchema = {
    type: "object",
    required: ["error"],
    properties: {
        error: {
            type: "object",
            required: ["code", "message"],
            properties: {
                code: { enum: Object.values(API_ERROR_CODES) },
                message: { type: "string" },
                details: {}
            }
        }
    }
};
export const deviceSessionSchema = {
    type: "object",
    required: ["deviceId", "deviceName", "deviceType", "online", "lastSeenAt"],
    properties: {
        deviceId: { type: "string" },
        deviceName: { type: "string" },
        deviceType: { enum: deviceTypes },
        capabilities: {
            type: "array",
            items: { enum: deviceCapabilities }
        },
        online: { type: "boolean" },
        lastSeenAt: { type: "string" }
    }
};
export const recordSchema = {
    type: "object",
    required: [
        "id",
        "createdAt",
        "sourceDeviceId",
        "kind",
        "title",
        "sizeBytes",
        "storageMode",
        "publishState"
    ],
    properties: {
        id: { type: "string" },
        createdAt: { type: "string" },
        updatedAt: { type: "string" },
        sourceDeviceId: { type: "string" },
        kind: { enum: ["text", "image", "document"] },
        title: { type: "string" },
        textPreview: { type: "string" },
        textContent: { type: "string" },
        mimeType: { type: "string" },
        sizeBytes: { type: "number", minimum: 0 },
        storageMode: { enum: ["source_file", "metadata_only"] },
        publishState: { enum: ["local", "published", "broadcast"] },
        contentHash: { type: "string" }
    }
};
export const recordDraftSchema = {
    type: "object",
    required: [
        "id",
        "createdAt",
        "sourceDeviceId",
        "kind",
        "title",
        "sizeBytes",
        "storageMode"
    ],
    properties: {
        id: { type: "string" },
        createdAt: { type: "string" },
        sourceDeviceId: { type: "string" },
        kind: { enum: ["text", "image", "document"] },
        title: { type: "string" },
        textPreview: { type: "string" },
        textContent: { type: "string" },
        mimeType: { type: "string" },
        sizeBytes: { type: "number", minimum: 0 },
        storageMode: { enum: ["source_file", "metadata_only"] },
        contentHash: { type: "string" }
    }
};
export const protocolVersionSchema = {
    type: "number",
    const: SYNC_PROTOCOL_VERSION
};
