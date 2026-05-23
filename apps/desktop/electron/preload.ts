import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("syncTool", {
  version: "0.1.0"
});

