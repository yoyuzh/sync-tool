import { createHash, randomBytes } from "node:crypto";

export function createDeviceToken() {
  return `st_${randomBytes(32).toString("base64url")}`;
}

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function parseBearerToken(authorization: string | undefined) {
  if (!authorization) {
    return undefined;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }

  return token;
}
