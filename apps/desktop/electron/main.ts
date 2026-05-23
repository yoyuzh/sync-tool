import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function createWindow() {
  const win = new BrowserWindow({
    width: 420,
    height: 640,
    title: "sync-tool",
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  const htmlPath = path.join(__dirname, "../dist/index.html");
  void win.loadFile(htmlPath);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

