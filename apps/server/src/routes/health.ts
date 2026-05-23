import type { FastifyPluginAsync } from "fastify";

export const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    return {
      name: "sync-tool-server",
      status: "ok",
      uptime: process.uptime()
    };
  });
};

