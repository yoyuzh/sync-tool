import { BrowserWindow } from "electron";
import path from "node:path";
export function createAppWindow(shouldQuit) {
    const win = new BrowserWindow({
        width: 980,
        height: 760,
        minWidth: 720,
        minHeight: 560,
        title: "sync-tool",
        show: true,
        titleBarStyle: "hiddenInset",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.on("close", (event) => {
        if (!shouldQuit()) {
            event.preventDefault();
            win.hide();
        }
    });
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    if (devServerUrl) {
        void win.loadURL(devServerUrl);
    }
    else {
        void win.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    return win;
}
export function showAppWindow(win) {
    if (!win) {
        return;
    }
    if (win.isMinimized()) {
        win.restore();
    }
    win.show();
    win.focus();
}
