import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { mkdir } from "node:fs/promises";
import { loadConfig } from "./config";
import { healthRoute } from "./routes/health";
import { registerSocketServer } from "./realtime/socketServer";

async function start() {
  const config = loadConfig();
  await mkdir(config.storagePath, { recursive: true });

  const app = Fastify({
    logger: true
  });

  await app.register(websocket);
  await app.register(healthRoute);
  await registerSocketServer(app);

  await app.listen({
    host: config.host,
    port: config.port
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

