import type { FastifyInstance } from "fastify";
import { SYNC_MESSAGE_TYPES } from "@sync-tool/shared";
import { getTokenFromRequest } from "../plugins/auth";
import { unauthorized } from "../errors";
import { handleClientMessage } from "./protocolHandlers";
import { makeServerMessage, sessionForDevice } from "./sessionRegistry";

export async function registerSocketServer(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, request) => {
    const token = getTokenFromRequest(request);
    const device = token
      ? app.services.devices.authenticateToken(token)
      : undefined;

    if (!device) {
      socket.send(
        JSON.stringify(
          makeServerMessage(SYNC_MESSAGE_TYPES.serverError, {
            code: "unauthorized",
            message: unauthorized().message,
            retryable: false
          })
        )
      );
      socket.close(1008, "unauthorized");
      return;
    }

    const sessionId = app.services.sessions.add(device, socket);
    const onlineDevice = sessionForDevice(device, true);
    app.log.info({ sessionId, deviceId: device.deviceId }, "websocket connected");

    app.services.sessions.send(
      sessionId,
      makeServerMessage(SYNC_MESSAGE_TYPES.serverHello, {
        device: onlineDevice,
        protocolVersion: 1,
        serverTime: new Date().toISOString()
      })
    );
    app.services.sessions.send(
      sessionId,
      makeServerMessage(SYNC_MESSAGE_TYPES.presenceSnapshot, {
        devices: app.services.devices.listSessions(app.services.sessions.onlineDeviceIds())
      })
    );
    app.services.sessions.broadcast(
      makeServerMessage(SYNC_MESSAGE_TYPES.presenceChanged, {
        device: onlineDevice,
        online: true
      }),
      sessionId
    );

    socket.on("message", (raw: Buffer | ArrayBuffer | Buffer[] | string) => {
      handleClientMessage({
        raw,
        socket,
        sessionId,
        sessions: app.services.sessions,
        logger: app.log
      });
    });

    socket.on("close", () => {
      const removed = app.services.sessions.remove(sessionId);
      if (!removed) {
        return;
      }
      app.log.info({ sessionId, deviceId: removed.deviceId }, "websocket disconnected");
      app.services.sessions.broadcast(
        makeServerMessage(SYNC_MESSAGE_TYPES.presenceChanged, {
          device: sessionForDevice(removed, false),
          online: false
        })
      );
    });

    socket.on("error", (error: Error) => {
      app.log.warn({ sessionId, error }, "websocket error");
    });
  });
}
