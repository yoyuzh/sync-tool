# sync-tool-cs Agent Notes

## Current Repository Boundary

This repository is `sync-tool-cs`.

- Local path: `/Users/mac/Documents/sync-tool/sync-tool-cs`
- Remote: `https://github.com/yoyuzh/sync-tool.git`
- Role: TypeScript monorepo for the central server, Electron desktop client, shared protocol/types, engineering docs, and UI prototypes.

The Android production client has been split into a separate repository.

- Android local path: `/Users/mac/Documents/sync-tool/sync-tool-android`
- Android remote: `https://github.com/yoyuzh/sync-tool-android.git`
- Android role: native Android client for the same product.

The parent folder `/Users/mac/Documents/sync-tool` is only a grouping folder for these independent repositories. It is not the project root.

Do not scaffold Android production code in this repository. Android implementation belongs in `sync-tool-android`. In `sync-tool-cs`, Android may appear only as product/protocol context, docs, shared device types, mock UI data, or future server integration points.

## Product Shape

`sync-tool` is a desktop-first cross-device clipboard sync product. This repository currently owns:

- Node.js relay/control-plane server
- Electron desktop client for macOS and Windows
- shared TypeScript protocol and domain types
- local HTML/CSS prototypes used as design references

The project is not based on KDE Connect anymore. Older docs that describe the original KDE Connect migration or say "Android is later/not scaffolded here" were written before the repository split and should be treated as historical context unless they match the current repository boundary above.

## Repository Layout

```text
apps/
  server/    Fastify + WebSocket server
  desktop/   Electron + React + Vite desktop client
packages/
  shared/    shared protocol types, domain models, constants
docs/        architecture, development notes, specs, implementation plans
原型/         local HTML/CSS UI prototypes and design references
```

Use `apps/server` for HTTP APIs, WebSocket sessions, presence, publish/broadcast flows, history storage, and future server-side task routing.

Use `apps/desktop` for Electron main/preload code, renderer UI, clipboard watcher work, notification/global-shortcut work, local history UX, and server session client work.

Use `packages/shared` first when adding protocol shapes, event names, DTOs, device/session models, retention constants, size limits, or other cross-app definitions.

Use `原型/` only as frontend design reference material. Do not move production logic into prototype HTML/CSS files.

## Current Implementation Snapshot

Root package:

- private pnpm workspace
- package manager: `pnpm@11.2.2`
- root scripts: `build`, `typecheck`, `lint`, `dev:server`, `dev:desktop`

Server package:

- package: `@sync-tool/server`
- stack: Node.js, TypeScript, Fastify, `@fastify/websocket`
- entry: `apps/server/src/index.ts`
- config: `apps/server/src/config.ts`
- routes:
  - `GET /health` returns server name, status, and uptime
  - `GET /ws` accepts WebSocket connections, sends a hello message, and logs received messages
- startup creates the configured storage directory before listening
- current defaults:
  - host: `0.0.0.0`
  - port: `8787`
  - storage path: `./data`
  - retention days: shared `HISTORY_RETENTION_DAYS`
  - max storage bytes: shared `HISTORY_MAX_STORAGE_BYTES`

Desktop package:

- package: `@sync-tool/desktop`
- stack: Electron, React, Vite, TypeScript
- Electron main entry: `apps/desktop/electron/main.ts`
- Electron preload: `apps/desktop/electron/preload.ts`
- renderer entry: `apps/desktop/src/main.tsx`
- renderer app: `apps/desktop/src/App.tsx`
- current renderer is a responsive React UI shell converted from prototypes
- current renderer data is mock/demo data in `apps/desktop/src/data/mockRecords.ts`
- current UI state is local React state; backend/WebSocket/clipboard persistence is not wired yet
- preload currently exposes `window.syncTool.version = "0.1.0"`

Shared package:

- package: `@sync-tool/shared`
- exports from `packages/shared/src/index.ts`
- current types include `ClipboardRecord`, `DeviceSession`, `RecordKind`, `StorageMode`, and `PublishState`
- current constants include:
  - `HISTORY_RETENTION_DAYS = 15`
  - `HISTORY_MAX_STORAGE_BYTES = 5 * 1024 * 1024 * 1024`
  - `INLINE_FILE_MAX_BYTES = 10 * 1024 * 1024`
  - `DEFAULT_RECENT_HISTORY_LIMIT = 20`

## Environment

Local-only secrets belong in `.env`.

Expected server environment variables:

- `SYNC_SERVER_HOST`
- `SYNC_SERVER_PORT`
- `SYNC_STORAGE_PATH`
- `SYNC_RETENTION_DAYS`
- `SYNC_MAX_STORAGE_BYTES`

Do not hardcode secrets in source files.

Do not commit or rewrite local-only artifacts unless explicitly requested:

- `.env`
- `wireguard-clients/`
- `.DS_Store`

## Commands

All shell commands in this workspace should be prefixed with `rtk`.

From `/Users/mac/Documents/sync-tool/sync-tool-cs`:

```bash
rtk pnpm install
rtk pnpm typecheck
rtk pnpm build
rtk pnpm lint
rtk pnpm dev:server
rtk pnpm dev:desktop
```

Package-specific commands:

```bash
rtk pnpm --filter @sync-tool/server dev
rtk pnpm --filter @sync-tool/server typecheck
rtk pnpm --filter @sync-tool/server build
rtk pnpm --filter @sync-tool/desktop typecheck
rtk pnpm --filter @sync-tool/desktop build
rtk pnpm --filter @sync-tool/shared build
```

Development docs currently state the expected toolchain as Node.js 24+ and pnpm 11+.

## Architecture Rules

- Keep the server as the control-plane authority.
- Keep the desktop app as the primary UX surface for this repository.
- Keep shared protocol and domain definitions in `packages/shared` instead of duplicating shapes in server and desktop code.
- Prefer TypeScript everywhere in this repository.
- Keep Electron main/preload code under `apps/desktop/electron/`.
- Keep renderer UI code under `apps/desktop/src/`.
- Keep server routes/realtime/config under `apps/server/src/`.
- Keep modules small and focused; avoid large multi-purpose files.
- Treat docs/specs from before the Android split as potentially stale on repository ownership.

## Android Split Rules

Android implementation belongs in `/Users/mac/Documents/sync-tool/sync-tool-android`.

Do not add these to `sync-tool-cs`:

- Kotlin production code
- Gradle Android project files
- Android `AccessibilityService`, `InputMethodService`, `WorkManager`, Room, or Compose implementation
- Android app packaging/build configuration

It is acceptable for `sync-tool-cs` to contain:

- shared device type values such as `"android"`
- server-side endpoints or protocol DTOs used by Android
- desktop mock records that display Android as a remote device
- docs that describe cross-product behavior

If work touches both repositories, keep commits and verification separate per repository.

## Before Finishing Work

Prefer root verification unless the change is strictly docs-only or tooling blocks it:

```bash
rtk pnpm typecheck
rtk pnpm build
```

For desktop-only implementation work, at minimum run:

```bash
rtk pnpm --filter @sync-tool/desktop typecheck
rtk pnpm --filter @sync-tool/desktop build
```

For server-only implementation work, at minimum run:

```bash
rtk pnpm --filter @sync-tool/server typecheck
rtk pnpm --filter @sync-tool/server build
```

For shared package changes, run shared build plus impacted package checks.
