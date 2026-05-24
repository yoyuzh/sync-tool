import type { FastifyPluginAsync } from "fastify";
import type { RegisterDeviceRequest } from "@sync-tool/shared";
import { requireDevice } from "../plugins/auth";
import { apiErrorSchema, deviceCapabilities, deviceSessionSchema, deviceTypes } from "./schemas";

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: RegisterDeviceRequest }>(
    "/api/v1/devices/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["deviceName", "deviceType", "capabilities"],
          properties: {
            deviceName: { type: "string", minLength: 1, maxLength: 120 },
            deviceType: { enum: deviceTypes },
            capabilities: {
              type: "array",
              items: { enum: deviceCapabilities },
              uniqueItems: true
            }
          }
        },
        response: {
          200: {
            type: "object",
            required: ["device", "token", "protocolVersion"],
            properties: {
              device: deviceSessionSchema,
              token: { type: "string" },
              protocolVersion: { type: "number" }
            }
          },
          400: apiErrorSchema
        }
      }
    },
    async (request) => {
      const response = app.services.devices.register(request.body);
      app.log.info(
        { deviceId: response.device.deviceId, deviceType: response.device.deviceType },
        "device registered"
      );
      return response;
    }
  );

  app.get(
    "/api/v1/devices",
    {
      schema: {
        response: {
          200: {
            type: "object",
            required: ["devices"],
            properties: {
              devices: {
                type: "array",
                items: deviceSessionSchema
              }
            }
          },
          401: apiErrorSchema
        }
      }
    },
    async (request) => {
      await requireDevice(request);
      return {
        devices: app.services.devices.listSessions(app.services.sessions.onlineDeviceIds())
      };
    }
  );
};
