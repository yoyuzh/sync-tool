import { SYNC_MESSAGE_TYPES, SYNC_PROTOCOL_VERSION } from "@sync-tool/shared";
import { makeServerMessage } from "./sessionRegistry";
export function handleClientMessage(input) {
    let message;
    try {
        message = JSON.parse(input.raw.toString());
    }
    catch {
        input.sessions.send(input.sessionId, makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
            code: "validation_failed",
            message: "WebSocket message must be valid JSON",
            retryable: false
        }));
        return;
    }
    if (message.protocolVersion !== SYNC_PROTOCOL_VERSION) {
        input.sessions.send(input.sessionId, makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
            code: "protocol_version_unsupported",
            message: "Unsupported protocol version",
            details: { protocolVersion: message.protocolVersion },
            retryable: false
        }, message.messageId));
        return;
    }
    switch (message.type) {
        case SYNC_MESSAGE_TYPES.clientPing:
            input.sessions.send(input.sessionId, makeServerMessage(SYNC_MESSAGE_TYPES.serverPong, {
                clientTime: message.payload.clientTime,
                serverTime: new Date().toISOString()
            }, message.messageId));
            break;
        case SYNC_MESSAGE_TYPES.clientHello:
            input.logger.info({ sessionId: input.sessionId, capabilities: message.payload.capabilities }, "client hello received");
            break;
        case SYNC_MESSAGE_TYPES.historyRefresh:
            input.logger.info({ sessionId: input.sessionId }, "history refresh requested");
            break;
        case SYNC_MESSAGE_TYPES.recordAck:
            input.logger.info({ sessionId: input.sessionId, recordId: message.payload.recordId }, "record acknowledgement received");
            break;
        default:
            input.sessions.send(input.sessionId, makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
                code: "validation_failed",
                message: "Unsupported WebSocket message type",
                retryable: false
            }));
    }
}
