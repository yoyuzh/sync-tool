import { unauthorized } from "../errors";
import { parseBearerToken } from "../services/tokenService";
export async function requireDevice(request) {
    const token = parseBearerToken(request.headers.authorization);
    if (!token) {
        throw unauthorized();
    }
    const device = request.server.services.devices.authenticateToken(token);
    if (!device) {
        throw unauthorized();
    }
    return device;
}
export function getTokenFromRequest(request) {
    const headerToken = parseBearerToken(request.headers.authorization);
    if (headerToken) {
        return headerToken;
    }
    const url = new URL(request.url, "http://localhost");
    return url.searchParams.get("token") ?? undefined;
}
