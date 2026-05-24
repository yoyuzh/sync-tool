import type { FastifyBaseLogger } from "fastify";
import type { StoredDevice } from "./storage/deviceRepository";
import type { DeviceService } from "./services/deviceService";
import type { RecordService } from "./services/recordService";
import type { SessionRegistry } from "./realtime/sessionRegistry";
import type { RetentionService } from "./storage/retentionService";

export interface AppServices {
  devices: DeviceService;
  records: RecordService;
  sessions: SessionRegistry;
  retention: RetentionService;
  logger: FastifyBaseLogger;
  close: () => void;
}

export interface AuthenticatedRequest {
  device: StoredDevice;
}
