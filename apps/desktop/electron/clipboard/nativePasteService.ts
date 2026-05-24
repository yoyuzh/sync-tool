import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type KeyTap = (key: string, modifier: string) => void | Promise<void>;

interface PasteTextOptions {
  platform?: NodeJS.Platform;
  keyTap?: KeyTap;
}

export async function pasteIntoActiveApp(options: PasteTextOptions = {}): Promise<void> {
  const platform = options.platform ?? process.platform;
  if (platform === "darwin") {
    const keyTap = options.keyTap ?? pasteWithAppleScript;
    await keyTap("v", "command");
    return;
  }

  if (platform === "win32") {
    const keyTap = options.keyTap ?? pasteWithPowerShell;
    await keyTap("v", "control");
    return;
  }

  throw new Error("当前系统暂不支持自动粘贴");
}

async function pasteWithAppleScript(key: string, modifier: string): Promise<void> {
  await execFileAsync("osascript", [
    "-e",
    `tell application "System Events" to keystroke "${key}" using ${modifier} down`
  ]);
}

async function pasteWithPowerShell(key: string, modifier: string): Promise<void> {
  if (modifier !== "control") {
    throw new Error("Windows 当前仅支持 Ctrl 粘贴");
  }

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    'Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait("^v")'
  ]);
}
