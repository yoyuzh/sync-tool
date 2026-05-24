import type { FastifyBaseLogger } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import type { ClientMessage } from "@sync-tool/shared";
import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import { makeServerMessage, type SessionRegistry } from "./sessionRegistry";

export function handleClientMessage(input: {
  raw: Buffer | ArrayBuffer | Buffer[] | string;
  socket: WebSocket;
  sessionId: string;
  sessions: SessionRegistry;
  logger: FastifyBaseLogger;
}) {
  let message: ClientMessage;
  try {
    message = JSON.parse(input.raw.toString()) as ClientMessage;
  } catch {
    input.sessions.send(
      input.sessionId,
      makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
        code: "validation_failed",
        message: "WebSocket message must be valid JSON",
        retryable: false
      })
    );
    return;
  }

  if (message.protocolVersion !== SYNC_PROTOCOL_VERSION) {
    input.sessions.send(
      input.sessionId,
      makeServerMessage(
        SYNC_MESSAGE_TYPES.serverError,
        {
          code: "protocol_version_unsupported",
          message: "Unsupported protocol version",
          details: { protocolVersion: message.protocolVersion },
          retryable: false
        },
        message.messageId
      )
    );
    return;
  }

  switch (message.type) {
    case SYNC_MESSAGE_TYPES.clientPing:
      if (!hasStringField(message.payload, "clientTime")) {
        sendValidationError(input, message.messageId, "client.ping payload.clientTime is required");
        return;
      }
      input.sessions.send(
        input.sessionId,
        makeServerMessage(
          SYNC_MESSAGE_TYPES.serverPong,
          {
            clientTime: message.payload.clientTime,
            serverTime: new Date().toISOString()
          },
          message.messageId
        )
      );
      break;
    case SYNC_MESSAGE_TYPES.clientHello:
      if (!isRecord(message.payload) || !Array.isArray(message.payload.capabilities)) {
        sendValidationError(input, message.messageId, "client.hello payload.capabilities is required");
        return;
      }
      input.logger.info(
        { sessionId: input.sessionId, capabilities: message.payload.capabilities },
        "client hello received"
      );
      break;
    case SYNC_MESSAGE_TYPES.historyRefresh:
      input.logger.info({ sessionId: input.sessionId }, "history refresh requested");
      break;
    case SYNC_MESSAGE_TYPES.recordAck:
      if (!hasStringField(message.payload, "recordId")) {
        sendValidationError(input, message.messageId, "record.ack payload.recordId is required");
        return;
      }
      input.logger.info(
        { sessionId: input.sessionId, recordId: message.payload.recordId },
        "record acknowledgement received"
      );
      break;
    default:
      input.sessions.send(
        input.sessionId,
        makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
          code: "validation_failed",
          message: "Unsupported WebSocket message type",
          retryable: false
        })
      );
  }
}

function sendValidationError(
  input: {
    sessionId: string;
    sessions: SessionRegistry;
  },
  requestId: string | undefined,
  message: string
) {
  input.sessions.send(
    input.sessionId,
    makeServerMessage(
      SYNC_MESSAGE_TYPES.serverError,
      {
        code: "validation_failed",
        message,
        retryable: false
      },
      requestId
    )
  );
}

function hasStringField(value: unknown, field: string): value is Record<string, string> {
  return isRecord(value) && typeof value[field] === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
