import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { INLINE_FILE_MAX_BYTES } from "@sync-tool/shared";
import { AppError, apiError, blobTooLarge, validationFailed } from "./errors";
import { healthRoute } from "./routes/health";
import { devicesRoutes } from "./routes/devices";
import { historyRoutes } from "./routes/history";
import { recordsRoutes } from "./routes/records";
import { blobsRoutes } from "./routes/blobs";
import { registerSocketServer } from "./realtime/socketServer";
import { recordPublishedMessage, SessionRegistry } from "./realtime/sessionRegistry";
import { DeviceService } from "./services/deviceService";
import { RecordService } from "./services/recordService";
import { DeviceRepository } from "./storage/deviceRepository";
import { RecordRepository } from "./storage/recordRepository";
import { BlobStore } from "./storage/blobStore";
import { openDatabase } from "./storage/database";
import { RetentionService } from "./storage/retentionService";
export async function buildApp(config, options = { logger: true }) {
    const app = Fastify(options);
    const database = await openDatabase(config.storagePath);
    const blobStore = new BlobStore(config.storagePath);
    await blobStore.initialize();
    const deviceRepository = new DeviceRepository(database.db);
    const recordRepository = new RecordRepository(database.db);
    const sessions = new SessionRegistry();
    const retention = new RetentionService(recordRepository, blobStore, {
        retentionDays: config.retentionDays,
        maxStorageBytes: config.maxStorageBytes,
        logger: app.log
    });
    const devices = new DeviceService(deviceRepository);
    const records = new RecordService(recordRepository, blobStore, retention);
    records.setPublishListener((record) => {
        sessions.broadcast(recordPublishedMessage(record));
    });
    app.decorate("services", {
        devices,
        records,
        sessions,
        retention,
        logger: app.log,
        close: () => database.close()
    });
    app.setErrorHandler((error, request, reply) => {
        if (error instanceof AppError) {
            reply.status(error.statusCode).send(apiError(error));
            return;
        }
        const validation = typeof error === "object" && error !== null && "validation" in error
            ? error.validation
            : undefined;
        if (validation) {
            const appError = validationFailed(validation);
            reply.status(appError.statusCode).send(apiError(appError));
            return;
        }
        const errorCode = typeof error === "object" && error !== null && "code" in error
            ? error.code
            : undefined;
        if (errorCode === "FST_ERR_CTP_BODY_TOO_LARGE") {
            const appError = blobTooLarge(INLINE_FILE_MAX_BYTES);
            reply.status(appError.statusCode).send(apiError(appError));
            return;
        }
        request.log.error({ error }, "request failed");
        const appError = new AppError("internal_error", "Internal server error", 500);
        reply.status(500).send(apiError(appError));
    });
    app.addHook("onClose", async () => {
        database.close();
    });
    await app.register(websocket);
    await app.register(healthRoute);
    await app.register(devicesRoutes);
    await app.register(historyRoutes);
    await app.register(recordsRoutes);
    await app.register(blobsRoutes);
    await registerSocketServer(app);
    await retention.run();
    return app;
}
