import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "./ipc/channels";
const api = {
    version: "0.1.0",
    history: {
        list: () => ipcRenderer.invoke(IPC_CHANNELS.historyList),
        get: (recordId) => ipcRenderer.invoke(IPC_CHANNELS.historyGet, recordId),
        copy: (recordId) => ipcRenderer.invoke(IPC_CHANNELS.historyCopy, recordId),
        publish: (recordId) => ipcRenderer.invoke(IPC_CHANNELS.historyPublish, recordId)
    },
    clipboard: {
        captureCurrent: () => ipcRenderer.invoke(IPC_CHANNELS.clipboardCaptureCurrent),
        writeText: (text) => ipcRenderer.invoke(IPC_CHANNELS.clipboardWriteText, text)
    },
    settings: {
        get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
        update: (patch) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, patch),
        shortcuts: () => ipcRenderer.invoke(IPC_CHANNELS.settingsShortcuts)
    },
    connection: {
        status: () => ipcRenderer.invoke(IPC_CHANNELS.connectionStatus),
        reconnect: () => ipcRenderer.invoke(IPC_CHANNELS.connectionReconnect),
        onStatusChanged: (listener) => subscribe(IPC_CHANNELS.eventConnectionChanged, listener)
    },
    events: {
        onHistoryChanged: (listener) => subscribe(IPC_CHANNELS.eventHistoryChanged, listener),
        onNotification: (listener) => subscribe(IPC_CHANNELS.eventNotification, listener)
    }
};
contextBridge.exposeInMainWorld("syncTool", api);
function subscribe(channel, listener) {
    const handler = (_event, payload) => {
        listener(payload);
    };
    ipcRenderer.on(channel, handler);
    return () => {
        ipcRenderer.removeListener(channel, handler);
    };
}
