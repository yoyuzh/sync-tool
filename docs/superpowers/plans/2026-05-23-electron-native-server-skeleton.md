# Electron Native Server Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Electron native capability layer and server client skeleton for `sync-tool-cs`.

**Architecture:** Shared protocol DTOs live in `packages/shared`; Electron main owns native clipboard, local JSON stores, shortcuts, notifications, and server HTTP/WebSocket state; preload exposes a narrow typed `window.syncTool` API. React renderer only calls the preload API and keeps working from local data when the server is offline.

**Tech Stack:** TypeScript, Electron main/preload, React/Vite renderer, pnpm workspace, shared package exports.

---

### Task 1: Shared Protocol DTOs

**Files:**
- Modify: `packages/shared/src/constants.ts`
- Modify: `packages/shared/src/types.ts`

- [ ] Add protocol version, message type constants, device capabilities, HTTP DTOs, WebSocket envelopes, error DTOs, and public desktop-facing connection/status shapes.
- [ ] Verify with `rtk pnpm --filter @sync-tool/shared build`.

### Task 2: Electron Main Native Services

**Files:**
- Create: `apps/desktop/electron/ipc/channels.ts`
- Create: `apps/desktop/electron/ipc/registerIpc.ts`
- Create: `apps/desktop/electron/clipboard/clipboardNormalizer.ts`
- Create: `apps/desktop/electron/clipboard/clipboardWatcher.ts`
- Create: `apps/desktop/electron/history/localHistoryStore.ts`
- Create: `apps/desktop/electron/settings/settingsStore.ts`
- Create: `apps/desktop/electron/shortcuts/shortcutRegistry.ts`
- Create: `apps/desktop/electron/notifications/notificationService.ts`
- Create: `apps/desktop/electron/server/serverSessionClient.ts`
- Create: `apps/desktop/electron/appWindow.ts`
- Modify: `apps/desktop/electron/main.ts`

- [ ] Keep Electron/Node APIs in main only.
- [ ] Persist settings and history under `app.getPath("userData")` using JSON atomic writes.
- [ ] Poll clipboard text, dedupe by hash, and store locally without auto-publish.
- [ ] Register global shortcuts from settings and report failures without crashing.
- [ ] Add HTTP/WebSocket session client skeleton that tracks offline/error state and never exposes tokens to renderer.

### Task 3: Typed Preload Bridge

**Files:**
- Create: `apps/desktop/src/types/syncToolApi.ts`
- Modify: `apps/desktop/electron/preload.ts`

- [ ] Expose `window.syncTool.version`, history, clipboard, settings, connection, and events APIs.
- [ ] Use centralized IPC channels only inside preload.
- [ ] Add global Window typing for renderer use.

### Task 4: Renderer First Data Migration

**Files:**
- Create: `apps/desktop/src/lib/recordMapping.ts`
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/components/Header.tsx`
- Modify: `apps/desktop/src/components/HistoryToolbar.tsx`
- Modify: `apps/desktop/src/components/RecordCard.tsx`
- Modify: `apps/desktop/src/components/SettingsPanel.tsx`
- Modify: `apps/desktop/src/types/ui.ts`

- [ ] Load history, settings, and connection state from `window.syncTool` when available.
- [ ] Keep mock records as browser/dev fallback only.
- [ ] Wire capture, copy, publish, reconnect, and history-changed subscriptions through preload.
- [ ] Keep the UI usable when the server is offline.

### Task 5: Verification

**Commands:**
- `rtk pnpm --filter @sync-tool/shared build`
- `rtk pnpm --filter @sync-tool/desktop typecheck`
- `rtk pnpm --filter @sync-tool/desktop build`
- `rtk pnpm build`

- [ ] Run all required commands and fix build/type failures.
