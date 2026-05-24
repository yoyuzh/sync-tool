import type { FastifyPluginAsync } from "fastify";
import type { PublishRecordRequest } from "@sync-tool/shared";
import { requireDevice } from "../plugins/auth";
import { apiErrorSchema, recordDraftSchema, recordSchema } from "./schemas";

export const recordsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: PublishRecordRequest }>(
    "/api/v1/records/publish",
    {
      schema: {
        body: {
          type: "object",
          required: ["record", "clientRequestId"],
          properties: {
            record: recordDraftSchema,
            clientRequestId: { type: "string", minLength: 1, maxLength: 160 }
          }
        },
        response: {
          200: {
            type: "object",
            required: ["record", "acceptedAt"],
            properties: {
              record: recordSchema,
              acceptedAt: { type: "string" }
            }
          },
          400: apiErrorSchema,
          401: apiErrorSchema,
          409: apiErrorSchema
        }
      }
    },
    async (request) => {
      const device = await requireDevice(request);
      const response = await app.services.records.publish(device.deviceId, request.body);
      app.log.info(
        { recordId: response.record.id, sourceDeviceId: device.deviceId },
        "record published"
      );
      return response;
    }
  );

  app.get<{ Params: { recordId: string } }>(
    "/api/v1/records/:recordId",
    {
      schema: {
        params: {
          type: "object",
          required: ["recordId"],
          properties: {
            recordId: { type: "string" }
          }
        },
        response: {
          200: {
            type: "object",
            required: ["record"],
            properties: {
              record: recordSchema
            }
          },
          401: apiErrorSchema,
          404: apiErrorSchema
        }
      }
    },
    async (request) => {
      await requireDevice(request);
      return {
        record: app.services.records.get(request.params.recordId)
      };
    }
  );
};
