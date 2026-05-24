import type { ApiErrorCode, ApiErrorResponse } from "@sync-tool/shared";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly statusCode = 500,
    public readonly details?: unknown,
    public readonly retryable = false
  ) {
    super(message);
  }
}

export function apiError(error: AppError): ApiErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details })
    }
  };
}

export function unauthorized(message = "Missing or invalid bearer token") {
  return new AppError("unauthorized", message, 401);
}

export function forbidden(message = "Forbidden") {
  return new AppError("forbidden", message, 403);
}

export function validationFailed(details?: unknown) {
  return new AppError("validation_failed", "Request validation failed", 400, details);
}

export function recordNotFound(recordId: string) {
  return new AppError("record_not_found", "Record not found", 404, { recordId });
}

export function conflict(message: string, details?: unknown) {
  return new AppError("conflict", message, 409, details);
}

export function blobTooLarge(maxBytes: number) {
  return new AppError("blob_too_large", "Blob exceeds server upload limit", 413, {
    maxBytes
  });
}
