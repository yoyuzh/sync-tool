import { setInterval } from "node:timers";
import { loadConfig } from "./config";
import { buildApp } from "./app";

async function start() {
  const config = loadConfig();
  const app = await buildApp(config);
  const retentionInterval = setInterval(
    () => {
      app.services.retention.run().catch((error) => {
        app.log.error({ error }, "retention interval failed");
      });
    },
    60 * 60 * 1000
  );
  retentionInterval.unref();

  await app.listen({
    host: config.host,
    port: config.port
  });

  app.log.info(
    {
      host: config.host,
      port: config.port,
      storagePath: config.storagePath,
      retentionDays: config.retentionDays,
      maxStorageBytes: config.maxStorageBytes
    },
    "sync-tool server started"
  );
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
