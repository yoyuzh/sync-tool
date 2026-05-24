export const IPC_CHANNELS = {
  historyList: "sync-tool:history:list",
  historyGet: "sync-tool:history:get",
  historyCopy: "sync-tool:history:copy",
  historyPublish: "sync-tool:history:publish",
  clipboardCaptureCurrent: "sync-tool:clipboard:capture-current",
  clipboardWriteText: "sync-tool:clipboard:write-text",
  settingsGet: "sync-tool:settings:get",
  settingsUpdate: "sync-tool:settings:update",
  settingsShortcuts: "sync-tool:settings:shortcuts",
  connectionStatus: "sync-tool:connection:status",
  connectionReconnect: "sync-tool:connection:reconnect",
  eventHistoryChanged: "sync-tool:event:history-changed",
  eventConnectionChanged: "sync-tool:event:connection-changed",
  eventShortcutsChanged: "sync-tool:event:shortcuts-changed",
  eventNotification: "sync-tool:event:notification"
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
