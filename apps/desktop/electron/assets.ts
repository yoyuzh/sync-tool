import path from "node:path";

interface AssetPathOptions {
  baseDir?: string;
  platform?: NodeJS.Platform;
}

export function resolveBaseAssetDir(baseDir = __dirname): string {
  return path.join(baseDir, "assets", "icons");
}

export function resolveAppIconPath(options: AssetPathOptions = {}): string {
  return path.join(resolveBaseAssetDir(options.baseDir), "icon.png");
}

export function resolveTrayIconPath(options: AssetPathOptions = {}): string {
  const platform = options.platform ?? process.platform;
  const fileName = platform === "darwin" ? "trayTemplate.png" : "icon.png";
  return path.join(resolveBaseAssetDir(options.baseDir), fileName);
}

export function resolveWindowIconPath(options: AssetPathOptions = {}): string | undefined {
  const platform = options.platform ?? process.platform;
  if (platform === "darwin") {
    return undefined;
  }

  return resolveAppIconPath(options);
}
