import type { AppServices } from "../serverTypes";

declare module "fastify" {
  interface FastifyInstance {
    services: AppServices;
  }
}
