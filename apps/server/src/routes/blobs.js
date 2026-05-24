import { INLINE_FILE_MAX_BYTES } from "@sync-tool/shared";
import { requireDevice } from "../plugins/auth";
import { apiErrorSchema, recordSchema } from "./schemas";
const BLOB_REJECTION_BUFFER_BYTES = 64 * 1024;
export const blobsRoutes = async (app) => {
    app.addContentTypeParser("application/octet-stream", { parseAs: "buffer", bodyLimit: INLINE_FILE_MAX_BYTES + BLOB_REJECTION_BUFFER_BYTES }, (_request, body, done) => {
        done(null, body);
    });
    app.post("/api/v1/records/:recordId/blob", {
        bodyLimit: INLINE_FILE_MAX_BYTES + BLOB_REJECTION_BUFFER_BYTES,
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
                404: apiErrorSchema,
                413: apiErrorSchema
            }
        }
    }, async (request) => {
        await requireDevice(request);
        return {
            record: await app.services.records.writeBlob({
                recordId: request.params.recordId,
                data: request.body,
                mimeType: request.headers["content-type"]
            })
        };
    });
    app.get("/api/v1/records/:recordId/blob", {
        schema: {
            params: {
                type: "object",
                required: ["recordId"],
                properties: {
                    recordId: { type: "string" }
                }
            },
            response: {
                401: apiErrorSchema,
                404: apiErrorSchema
            }
        }
    }, async (request, reply) => {
        await requireDevice(request);
        const blob = await app.services.records.readBlob(request.params.recordId);
        return reply
            .header("content-type", blob.record.mimeType ?? "application/octet-stream")
            .send(blob.data);
    });
};
