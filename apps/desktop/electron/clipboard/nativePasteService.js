import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
export async function pasteIntoActiveApp(options = {}) {
    const platform = options.platform ?? process.platform;
    if (platform === "darwin") {
        const keyTap = options.keyTap ?? pasteWithAppleScript;
        await keyTap("v", "command");
        return;
    }
    throw new Error("当前系统暂不支持自动粘贴");
}
async function pasteWithAppleScript(key, modifier) {
    await execFileAsync("osascript", [
        "-e",
        `tell application "System Events" to keystroke "${key}" using ${modifier} down`
    ]);
}
