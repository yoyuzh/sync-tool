export class AppError extends Error {
    code;
    statusCode;
    details;
    retryable;
    constructor(code, message, statusCode = 500, details, retryable = false) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.retryable = retryable;
    }
}
export function apiError(error) {
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
export function validationFailed(details) {
    return new AppError("validation_failed", "Request validation failed", 400, details);
}
export function recordNotFound(recordId) {
    return new AppError("record_not_found", "Record not found", 404, { recordId });
}
export function conflict(message, details) {
    return new AppError("conflict", message, 409, details);
}
export function blobTooLarge(maxBytes) {
    return new AppError("blob_too_large", "Blob exceeds server upload limit", 413, {
        maxBytes
    });
}
