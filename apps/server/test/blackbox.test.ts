import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import {
  SYNC_MESSAGE_TYPES,
  SYNC_PROTOCOL_VERSION,
  type ClipboardRecordDraft,
  type RegisterDeviceResponse,
  type ServerMessage
} from "@sync-tool/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

describe("server black-box API and WebSocket behavior", () => {
  let app: FastifyInstance;
  let storagePath: string;
  let baseUrl: string;

  beforeEach(async () => {
    storagePath = await mkdtemp(join(tmpdir(), "sync-tool-server-test-"));
    app = await buildApp(
      {
        host: "127.0.0.1",
        port: 0,
        storagePath,
        retentionDays: 15,
        maxStorageBytes: 1024 * 1024
      },
      { logger: false }
    );
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an ephemeral TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await app.close();
    await rm(storagePath, { recursive: true, force: true });
  });

  it("registers a device and protects history with bearer auth", async () => {
    const unauthorized = await fetch(`${baseUrl}/api/v1/history?days=1&limit=20`);
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({
      error: { code: "unauthorized" }
    });

    const registration = await registerDevice(baseUrl, "Desktop A");
    expect(registration.protocolVersion).toBe(SYNC_PROTOCOL_VERSION);
    expect(registration.token).toMatch(/^st_/);
    expect(registration.device).toMatchObject({
      deviceName: "Desktop A",
      deviceType: "desktop",
      online: false
    });

    const history = await fetch(`${baseUrl}/api/v1/history?days=1&limit=20`, {
      headers: authHeaders(registration.token)
    });
    expect(history.status).toBe(200);
    await expect(history.json()).resolves.toMatchObject({
      records: []
    });

    const invalidScheme = await fetch(`${baseUrl}/api/v1/history?days=1&limit=20`, {
      headers: { authorization: `Token ${registration.token}` }
    });
    expect(invalidScheme.status).toBe(401);

    const invalidDays = await fetch(`${baseUrl}/api/v1/history?days=2&limit=20`, {
      headers: authHeaders(registration.token)
    });
    expect(invalidDays.status).toBe(400);
    await expect(invalidDays.json()).resolves.toMatchObject({
      error: { code: "validation_failed" }
    });
  });

  it("publishes a text record durably, lists it in retained history, and enforces idempotency conflicts", async () => {
    const registration = await registerDevice(baseUrl, "Publisher");
    const draft = makeTextDraft(registration.device.deviceId);

    const published = await publishRecord(baseUrl, registration.token, draft, "request-1");
    expect(published.status).toBe(200);
    const publishedBody = await published.json();
    expect(publishedBody).toMatchObject({
      record: {
        id: draft.id,
        sourceDeviceId: registration.device.deviceId,
        publishState: "published",
        textContent: "hello black-box"
      }
    });

    const replay = await publishRecord(baseUrl, registration.token, draft, "request-1");
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      record: { id: draft.id }
    });

    const conflicting = await publishRecord(
      baseUrl,
      registration.token,
      { ...draft, title: "Different" },
      "request-1"
    );
    expect(conflicting.status).toBe(409);
    await expect(conflicting.json()).resolves.toMatchObject({
      error: { code: "conflict" }
    });

    const detail = await fetch(`${baseUrl}/api/v1/records/${draft.id}`, {
      headers: authHeaders(registration.token)
    });
    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toMatchObject({
      record: { id: draft.id, textPreview: "hello black-box" }
    });

    const history = await fetch(`${baseUrl}/api/v1/history?days=1&limit=20`, {
      headers: authHeaders(registration.token)
    });
    expect(history.status).toBe(200);
    const historyBody = await history.json();
    expect(historyBody.records).toHaveLength(1);
    expect(historyBody.records[0]).toMatchObject({ id: draft.id });
  });

  it("stores and downloads a blob through authenticated record blob endpoints", async () => {
    const registration = await registerDevice(baseUrl, "Blob Publisher");
    const draft: ClipboardRecordDraft = {
      ...makeTextDraft(registration.device.deviceId),
      id: "blob-record-1",
      kind: "document",
      title: "Blob",
      textPreview: undefined,
      textContent: undefined,
      mimeType: "text/plain",
      sizeBytes: 0,
      storageMode: "source_file"
    };

    const published = await publishRecord(baseUrl, registration.token, draft, "blob-request");
    expect(published.status).toBe(200);

    const upload = await fetch(`${baseUrl}/api/v1/records/${draft.id}/blob`, {
      method: "POST",
      headers: {
        ...authHeaders(registration.token),
        "content-type": "application/octet-stream"
      },
      body: Buffer.from("blob body")
    });
    expect(upload.status).toBe(200);
    await expect(upload.json()).resolves.toMatchObject({
      record: { id: draft.id, sizeBytes: 9 }
    });

    const download = await fetch(`${baseUrl}/api/v1/records/${draft.id}/blob`, {
      headers: authHeaders(registration.token)
    });
    expect(download.status).toBe(200);
    expect(await download.text()).toBe("blob body");
  });

  it("returns stable error shapes for validation failures, missing records, and blob limits", async () => {
    const invalidRegistration = await fetch(`${baseUrl}/api/v1/devices/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        deviceName: "",
        deviceType: "desktop",
        capabilities: ["history.query"]
      })
    });
    expect(invalidRegistration.status).toBe(400);
    await expect(invalidRegistration.json()).resolves.toMatchObject({
      error: { code: "validation_failed" }
    });

    const registration = await registerDevice(baseUrl, "Error Paths");
    const missingRecord = await fetch(`${baseUrl}/api/v1/records/missing-record`, {
      headers: authHeaders(registration.token)
    });
    expect(missingRecord.status).toBe(404);
    await expect(missingRecord.json()).resolves.toMatchObject({
      error: { code: "record_not_found" }
    });

    const mismatchedDraft = makeTextDraft("not-the-authenticated-device", "mismatch");
    const mismatchedPublish = await publishRecord(
      baseUrl,
      registration.token,
      mismatchedDraft,
      "mismatch-request"
    );
    expect(mismatchedPublish.status).toBe(400);
    await expect(mismatchedPublish.json()).resolves.toMatchObject({
      error: { code: "validation_failed" }
    });

    const sourceFileWithText = {
      ...makeTextDraft(registration.device.deviceId, "bad-source-file"),
      storageMode: "source_file" as const
    };
    const invalidSourceFile = await publishRecord(
      baseUrl,
      registration.token,
      sourceFileWithText,
      "bad-source-file-request"
    );
    expect(invalidSourceFile.status).toBe(400);
    await expect(invalidSourceFile.json()).resolves.toMatchObject({
      error: { code: "validation_failed" }
    });

    const blobWithoutRecord = await fetch(`${baseUrl}/api/v1/records/missing-record/blob`, {
      method: "POST",
      headers: {
        ...authHeaders(registration.token),
        "content-type": "application/octet-stream"
      },
      body: Buffer.from("missing")
    });
    expect(blobWithoutRecord.status).toBe(404);
    await expect(blobWithoutRecord.json()).resolves.toMatchObject({
      error: { code: "record_not_found" }
    });

    const draft = {
      ...makeTextDraft(registration.device.deviceId, "blob-too-large"),
      textContent: undefined,
      storageMode: "source_file" as const
    };
    expect((await publishRecord(baseUrl, registration.token, draft, "large-blob-record")).status).toBe(200);
    const tooLargeBlob = await fetch(`${baseUrl}/api/v1/records/${draft.id}/blob`, {
      method: "POST",
      headers: {
        ...authHeaders(registration.token),
        "content-type": "application/octet-stream"
      },
      body: Buffer.alloc(10 * 1024 * 1024 + 1)
    });
    expect(tooLargeBlob.status).toBe(413);
  });

  it("paginates retained history and evicts records outside retention", async () => {
    await app.close();
    await rm(storagePath, { recursive: true, force: true });
    storagePath = await mkdtemp(join(tmpdir(), "sync-tool-server-test-"));
    app = await buildApp(
      {
        host: "127.0.0.1",
        port: 0,
        storagePath,
        retentionDays: 1,
        maxStorageBytes: 1024 * 1024
      },
      { logger: false }
    );
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an ephemeral TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;

    const registration = await registerDevice(baseUrl, "Paginator");
    const oldDraft = {
      ...makeTextDraft(registration.device.deviceId, "old-record"),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    };
    expect((await publishRecord(baseUrl, registration.token, oldDraft, "old-request")).status).toBe(200);

    const firstDraft = makeTextDraft(registration.device.deviceId, "first-record");
    const secondDraft = makeTextDraft(registration.device.deviceId, "second-record");
    expect((await publishRecord(baseUrl, registration.token, firstDraft, "first-request")).status).toBe(200);
    expect((await publishRecord(baseUrl, registration.token, secondDraft, "second-request")).status).toBe(200);

    const firstPage = await fetch(`${baseUrl}/api/v1/history?days=1&limit=1`, {
      headers: authHeaders(registration.token)
    });
    expect(firstPage.status).toBe(200);
    const firstPageBody = await firstPage.json();
    expect(firstPageBody.records).toHaveLength(1);
    expect(firstPageBody.nextCursor).toBeDefined();

    const secondPage = await fetch(
      `${baseUrl}/api/v1/history?days=1&limit=10&cursor=${encodeURIComponent(firstPageBody.nextCursor)}`,
      { headers: authHeaders(registration.token) }
    );
    expect(secondPage.status).toBe(200);
    const secondPageBody = await secondPage.json();
    expect(secondPageBody.records.map((record: { id: string }) => record.id)).not.toContain("old-record");
  });

  it("marks registered devices online while a WebSocket session is active", async () => {
    const registration = await registerDevice(baseUrl, "Presence Device");
    const socket = await app.injectWS("/ws", {
      headers: authHeaders(registration.token)
    });
    await expectDeviceOnline(baseUrl, registration.token, registration.device.deviceId);

    socket.close();
  });

  it("evicts oldest blob-backed records when storage exceeds the configured cap", async () => {
    await app.close();
    await rm(storagePath, { recursive: true, force: true });
    storagePath = await mkdtemp(join(tmpdir(), "sync-tool-server-test-"));
    app = await buildApp(
      {
        host: "127.0.0.1",
        port: 0,
        storagePath,
        retentionDays: 15,
        maxStorageBytes: 8
      },
      { logger: false }
    );
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected an ephemeral TCP address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;

    const registration = await registerDevice(baseUrl, "Storage Cap");
    const first = {
      ...makeTextDraft(registration.device.deviceId, "blob-cap-1"),
      createdAt: "2026-05-23T00:00:00.000Z",
      textContent: undefined,
      storageMode: "source_file" as const
    };
    const second = {
      ...makeTextDraft(registration.device.deviceId, "blob-cap-2"),
      createdAt: "2026-05-23T00:00:01.000Z",
      textContent: undefined,
      storageMode: "source_file" as const
    };
    expect((await publishRecord(baseUrl, registration.token, first, "blob-cap-1")).status).toBe(200);
    expect((await uploadBlob(baseUrl, registration.token, first.id, "123456")).status).toBe(200);
    expect((await publishRecord(baseUrl, registration.token, second, "blob-cap-2")).status).toBe(200);
    expect((await uploadBlob(baseUrl, registration.token, second.id, "abcdef")).status).toBe(200);

    const firstDetail = await fetch(`${baseUrl}/api/v1/records/${first.id}`, {
      headers: authHeaders(registration.token)
    });
    expect(firstDetail.status).toBe(404);
  });

  it("authenticates WebSocket sessions, sends presence messages, handles ping, and broadcasts published records", async () => {
    const listener = await registerDevice(baseUrl, "Listener");
    const publisher = await registerDevice(baseUrl, "Publisher");
    const socket = new WebSocket(
      `${baseUrl.replace("http://", "ws://")}/ws?token=${encodeURIComponent(listener.token)}`
    );

    const firstMessages = await collectMessages(socket, 2);
    expect(firstMessages.map((message) => message.type)).toEqual([
      SYNC_MESSAGE_TYPES.serverHello,
      SYNC_MESSAGE_TYPES.presenceSnapshot
    ]);

    socket.send(
      JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.clientPing,
        messageId: "ping-1",
        sentAt: new Date().toISOString(),
        payload: { clientTime: "2026-05-23T00:00:00.000Z" }
      })
    );
    const pong = await collectUntil(socket, SYNC_MESSAGE_TYPES.serverPong);
    expect(pong).toMatchObject({
      type: SYNC_MESSAGE_TYPES.serverPong,
      requestId: "ping-1",
      payload: { clientTime: "2026-05-23T00:00:00.000Z" }
    });

    socket.send("not json");
    const invalidJson = await collectUntil(socket, SYNC_MESSAGE_TYPES.serverError);
    expect(invalidJson).toMatchObject({
      payload: { code: "validation_failed", retryable: false }
    });

    socket.send(
      JSON.stringify({
        protocolVersion: 999,
        type: SYNC_MESSAGE_TYPES.clientPing,
        messageId: "bad-version",
        sentAt: new Date().toISOString(),
        payload: { clientTime: "2026-05-23T00:00:00.000Z" }
      })
    );
    const badVersion = await collectUntil(socket, SYNC_MESSAGE_TYPES.serverError);
    expect(badVersion).toMatchObject({
      requestId: "bad-version",
      payload: { code: "protocol_version_unsupported", retryable: false }
    });

    socket.send(
      JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.clientPing,
        messageId: "missing-payload",
        sentAt: new Date().toISOString(),
        payload: null
      })
    );
    const missingPayload = await collectUntil(socket, SYNC_MESSAGE_TYPES.serverError);
    expect(missingPayload).toMatchObject({
      requestId: "missing-payload",
      payload: { code: "validation_failed", retryable: false }
    });

    socket.send(
      JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.clientHello,
        messageId: "hello-1",
        sentAt: new Date().toISOString(),
        payload: { device: listener.device, capabilities: ["history.query"] }
      })
    );
    socket.send(
      JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.historyRefresh,
        messageId: "refresh-1",
        sentAt: new Date().toISOString(),
        payload: { days: 1, limit: 20 }
      })
    );
    socket.send(
      JSON.stringify({
        protocolVersion: SYNC_PROTOCOL_VERSION,
        type: SYNC_MESSAGE_TYPES.recordAck,
        messageId: "ack-1",
        sentAt: new Date().toISOString(),
        payload: { recordId: "any", receivedAt: new Date().toISOString() }
      })
    );

    const draft = makeTextDraft(publisher.device.deviceId, "ws-record-1");
    const broadcastPromise = collectUntil(socket, SYNC_MESSAGE_TYPES.recordPublished);
    const published = await publishRecord(baseUrl, publisher.token, draft, "ws-request");
    expect(published.status).toBe(200);

    const broadcast = await broadcastPromise;
    expect(broadcast).toMatchObject({
      type: SYNC_MESSAGE_TYPES.recordPublished,
      payload: { record: { id: "ws-record-1" } }
    });

    socket.close();
  });

  it("rejects unauthenticated WebSocket connections with a protocol error", async () => {
    const socket = new WebSocket(`${baseUrl.replace("http://", "ws://")}/ws`);
    const error = await collectUntil(socket, SYNC_MESSAGE_TYPES.serverError);
    expect(error).toMatchObject({
      payload: { code: "unauthorized", retryable: false }
    });
  });
});

async function registerDevice(baseUrl: string, deviceName: string) {
  const response = await fetch(`${baseUrl}/api/v1/devices/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      deviceName,
      deviceType: "desktop",
      capabilities: ["history.query", "record.publish", "clipboard.read.text"]
    })
  });
  expect(response.status).toBe(200);
  return (await response.json()) as RegisterDeviceResponse;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

function makeTextDraft(sourceDeviceId: string, id = "record-1"): ClipboardRecordDraft {
  return {
    id,
    createdAt: new Date().toISOString(),
    sourceDeviceId,
    kind: "text",
    title: "Black-box text",
    textPreview: "hello black-box",
    textContent: "hello black-box",
    sizeBytes: 15,
    storageMode: "metadata_only",
    contentHash: `sha256-${id}`
  };
}

async function publishRecord(
  baseUrl: string,
  token: string,
  record: ClipboardRecordDraft,
  clientRequestId: string
) {
  return fetch(`${baseUrl}/api/v1/records/publish`, {
    method: "POST",
    headers: { ...authHeaders(token), "content-type": "application/json" },
    body: JSON.stringify({ record, clientRequestId })
  });
}

function uploadBlob(baseUrl: string, token: string, recordId: string, body: string) {
  return fetch(`${baseUrl}/api/v1/records/${recordId}/blob`, {
    method: "POST",
    headers: {
      ...authHeaders(token),
      "content-type": "application/octet-stream"
    },
    body: Buffer.from(body)
  });
}

async function expectDeviceOnline(baseUrl: string, token: string, deviceId: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const devices = await fetch(`${baseUrl}/api/v1/devices`, {
      headers: authHeaders(token)
    });
    expect(devices.status).toBe(200);
    const body = await devices.json();
    if (
      body.devices.some(
        (device: { deviceId: string; online: boolean }) =>
          device.deviceId === deviceId && device.online
      )
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  throw new Error(`Device ${deviceId} was not marked online`);
}

function collectMessages(socket: WebSocket, count: number) {
  return new Promise<ServerMessage[]>((resolve, reject) => {
    const messages: ServerMessage[] = [];
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for messages")), 3000);
    socket.addEventListener("message", (event) => {
      messages.push(JSON.parse(event.data.toString()) as ServerMessage);
      if (messages.length >= count) {
        clearTimeout(timeout);
        resolve(messages);
      }
    });
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket failed"));
    });
  });
}

function collectUntil(socket: WebSocket, type: ServerMessage["type"]) {
  return new Promise<ServerMessage>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${type}`)), 3000);
    const listener = (event: MessageEvent) => {
      const message = JSON.parse(event.data.toString()) as ServerMessage;
      if (message.type === type) {
        clearTimeout(timeout);
        socket.removeEventListener("message", listener);
        resolve(message);
      }
    };
    socket.addEventListener("message", listener);
    socket.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("WebSocket failed"));
    });
  });
}
