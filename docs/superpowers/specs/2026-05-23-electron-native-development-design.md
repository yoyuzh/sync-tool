# Electron Native Development Design

## Summary

This spec defines the Electron main/preload/native development direction for `sync-tool-cs`.

The current renderer already has a responsive React UI shell. The next Electron work should connect that UI to safe native capabilities: clipboard watching, local history persistence, global shortcuts, notifications, app window behavior, and server session status.

## Current State

The current desktop package is `@sync-tool/desktop`.

- Electron main: `apps/desktop/electron/main.ts`
- Electron preload: `apps/desktop/electron/preload.ts`
- Renderer entry: `apps/desktop/src/main.tsx`
- Renderer app: `apps/desktop/src/App.tsx`
- Current preload exposes only `window.syncTool.version = "0.1.0"`
- Current renderer uses local mock records and local React state
- Backend, clipboard, and WebSocket behavior are not wired yet

## Research Basis

This design follows Electron's current API direction:

- The clipboard API is a main-process system integration API in current Electron docs; renderer access should go through preload with `contextBridge`.
- `globalShortcut` is a main-process API.
- `ipcMain` and preload bridges should expose narrow app-specific functions rather than raw IPC.
- Context isolation should remain enabled, with explicit safe APIs exposed into the renderer.

References:

- https://www.electronjs.org/docs/latest/api/clipboard
- https://www.electronjs.org/docs/latest/api/global-shortcut
- https://www.electronjs.org/docs/latest/api/ipc-main
- https://www.electronjs.org/docs/latest/tutorial/context-isolation

## Goals

- Keep Node/Electron capabilities out of React renderer code.
- Provide a typed preload API for renderer actions and subscriptions.
- Capture local clipboard history without silently uploading it.
- Let the user manually publish selected records to the server.
- Support a global shortcut that opens the panel and can publish the current clipboard item.
- Persist local desktop history across app restarts.
- Keep the UI responsive even when server connection is unavailable.

## Non-Goals

- Do not implement Android code in this repository.
- Do not replace the current React renderer with static prototype HTML.
- Do not expose raw `ipcRenderer`, `clipboard`, filesystem, or process APIs to the renderer.
- Do not auto-upload every clipboard change by default.
- Do not implement native installers or auto-update in this phase.

## Core Decisions

### Process Boundary

Use this split:

```text
main process
  owns app lifecycle, windows, clipboard, global shortcuts, notifications,
  local storage, and server session client

preload
  exposes a narrow typed syncTool API through contextBridge

renderer
  owns UI state, filtering, presentation, and user intent
```

The renderer can request actions, but the main process decides how native work is performed.

### File Organization

Grow `apps/desktop/electron/` into small native modules:

```text
apps/desktop/electron/
  main.ts
  preload.ts
  appWindow.ts
  ipc/
    registerIpc.ts
    channels.ts
  clipboard/
    clipboardWatcher.ts
    clipboardNormalizer.ts
  history/
    localHistoryStore.ts
  shortcuts/
    shortcutRegistry.ts
  notifications/
    notificationService.ts
  server/
    serverSessionClient.ts
  settings/
    settingsStore.ts
```

Keep renderer components under `apps/desktop/src/`. Do not import Electron modules from renderer files.

### Preload API

Expose one typed API namespace:

```ts
window.syncTool = {
  version: string;
  history: {
    list(): Promise<UiRecord[]>;
    get(recordId: string): Promise<UiRecord | null>;
    copy(recordId: string): Promise<void>;
    publish(recordId: string): Promise<void>;
  };
  clipboard: {
    captureCurrent(): Promise<UiRecord | null>;
  };
  settings: {
    get(): Promise<DesktopSettings>;
    update(patch: Partial<DesktopSettings>): Promise<DesktopSettings>;
  };
  connection: {
    status(): Promise<ConnectionStatus>;
    reconnect(): Promise<void>;
    onStatusChanged(listener: (status: ConnectionStatus) => void): Unsubscribe;
  };
  events: {
    onHistoryChanged(listener: (records: UiRecord[]) => void): Unsubscribe;
    onNotification(listener: (item: NotificationItem) => void): Unsubscribe;
  };
}
```

The actual public types should live in `packages/shared` only when they are protocol/domain types. Renderer-only display types can stay in `apps/desktop/src/types`.

### IPC Rules

- Use `ipcMain.handle` for request/response commands.
- Use `webContents.send` plus preload-managed unsubscribe functions for event streams.
- Validate renderer input in main handlers before touching storage or network.
- Keep IPC channel names centralized in `electron/ipc/channels.ts`.
- Never expose raw IPC channel strings directly to React components.

### Clipboard Capture

Electron does not provide a universal clipboard change event, so the first implementation should use a controlled polling watcher in the main process.

Watcher behavior:

- Poll only while the app is running.
- Hash normalized clipboard content and ignore duplicates.
- Capture text first.
- Capture images as local files only when image support is implemented.
- Treat document/file clipboard formats as platform-specific phase-two work.
- Never publish automatically unless the user has explicitly enabled a future setting.

Clipboard record creation:

1. Read available formats.
2. Prefer plain text for first phase.
3. Normalize whitespace only for preview; preserve full text content for local copy-back.
4. Assign a local record id.
5. Store record locally with `publishState = "local"`.
6. Notify renderer that history changed.

### Local History Persistence

Use a small JSON-backed store in the first Electron phase.

Reason:

- It avoids native database packaging concerns inside Electron.
- The UI currently needs a durable local history, not heavy query capability.
- A repository boundary lets the app move to SQLite later without changing renderer APIs.

Store path:

```text
app.getPath("userData")/history.json
```

The store should write atomically:

```text
history.json.tmp -> rename -> history.json
```

Keep a maximum local item count configurable in settings. Default to enough local records to support the latest 20 plus expanded local browsing.

### Global Shortcut

Register shortcuts after `app.whenReady()`.

Initial shortcuts:

- open/focus panel
- capture current clipboard into local history
- publish current or selected record

Rules:

- Store the shortcut value in settings.
- If registration fails, keep the app running and surface the failure in settings/status.
- Unregister shortcuts on quit.
- Do not let shortcuts bypass the explicit publish rule.

### Window Behavior

The desktop window should become a popup-panel style shell rather than a generic document window.

Phase-one behavior:

- create one main panel window
- hide instead of destroying when the user closes it, unless app quit is requested
- focus and show the panel from shortcut or notification click
- preserve development loading through Vite and production loading through built files

The current `main.ts` loads only built `dist/index.html`. A dev/prod loader should be added so `pnpm dev:desktop` works predictably.

### Server Session Client

Keep the WebSocket and HTTP client in the main process.

Responsibilities:

- connect to configured server URL
- authenticate with device token
- receive realtime record/presence events
- publish selected local records
- fetch retained history on demand or reconnect
- update renderer connection status

The renderer should not open direct WebSocket connections.

### Notifications

Use native notifications from the main process for remote records and important status changes.

Notification click behavior:

- show/focus the panel
- select the related record when possible

Do not include sensitive clipboard content in notification text unless the user has enabled previews.

## Settings

Initial settings:

```ts
interface DesktopSettings {
  serverUrl: string;
  deviceName: string;
  deviceId: string;
  deviceToken?: string;
  clipboardPollingEnabled: boolean;
  clipboardPollingIntervalMs: number;
  autoPublishEnabled: false;
  globalShortcutOpen: string;
  globalShortcutPublish: string;
  notificationPreviewEnabled: boolean;
}
```

`autoPublishEnabled` should remain false by default. If enabled later, the UI must make that state visible.

## Security Rules

- Keep `contextIsolation` enabled.
- Do not enable `nodeIntegration` for renderer windows.
- Do not expose `ipcRenderer` directly.
- Do not expose filesystem paths unless required for a user action.
- Do not silently upload clipboard content.
- Do not persist server tokens in renderer-accessible state.
- Avoid logging clipboard text content.

## Testing And Verification

Minimum checks for Electron-native work:

```bash
rtk pnpm --filter @sync-tool/desktop typecheck
rtk pnpm --filter @sync-tool/desktop build
```

Add tests where module boundaries allow it:

- clipboard normalization and duplicate hashing
- local history store read/write/corruption recovery
- settings merge and validation
- IPC handler input validation
- server session event mapping

Manual verification:

- app opens in dev mode
- panel can be focused by shortcut
- clipboard text appears in local history
- publishing requires explicit user action
- renderer remains usable when server is offline
- native notifications open the panel

## Acceptance Criteria

- Renderer uses `window.syncTool` instead of mock-only data for native-backed flows.
- Main/preload expose a narrow, typed bridge.
- Clipboard capture is local by default and deduplicated.
- Local history survives app restart.
- Global shortcut registration is visible and failure-tolerant.
- Server connection status is observable in the renderer.
- No React renderer file imports Electron main-process APIs directly.
