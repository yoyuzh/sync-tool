import type { FastifyInstance } from "fastify";

export async function registerSocketServer(app: FastifyInstance) {
  app.get(
    "/ws",
    { websocket: true },
    (connection) => {
      connection.socket.send(
        JSON.stringify({
          type: "hello",
          message: "sync-tool realtime channel is ready"
        })
      );

      connection.socket.on(
        "message",
        (message: string | Buffer | ArrayBuffer | Buffer[]) => {
        app.log.info({ message: message.toString() }, "received realtime message");
        }
      );
    }
  );
}
