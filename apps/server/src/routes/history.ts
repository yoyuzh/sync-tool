import type { FastifyPluginAsync } from "fastify";
import { requireDevice } from "../plugins/auth";
import { apiErrorSchema, recordSchema } from "./schemas";

export const historyRoutes: FastifyPluginAsync = async (app) => {
  app.get<{
    Querystring: {
      days?: number;
      limit?: number;
      cursor?: string;
    };
  }>(
    "/api/v1/history",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            days: { type: "number", enum: [1, 3, 7, 15] },
            limit: { type: "number", minimum: 1, maximum: 100 },
            cursor: { type: "string" }
          }
        },
        response: {
          200: {
            type: "object",
            required: ["records", "serverTime"],
            properties: {
              records: { type: "array", items: recordSchema },
              nextCursor: { type: "string" },
              serverTime: { type: "string" }
            }
          },
          401: apiErrorSchema
        }
      }
    },
    async (request) => {
      await requireDevice(request);
      return app.services.records.history(request.query);
    }
  );
};
