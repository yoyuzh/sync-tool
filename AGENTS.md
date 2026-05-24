# AGENTS.md

This repository is `sync-tool`, a desktop-first cross-device clipboard sync product.

## Project Scope

The current codebase is a fresh monorepo and is **not** based on KDE Connect anymore.

Phase-one focus:

- Electron desktop client for macOS and Windows
- Node.js server for relay, presence, and clipboard-history storage
- Shared protocol/types package used by both apps

Planned but not yet scaffolded here:

- Android helper client

## Repository Layout

```text
apps/
  desktop/   Electron + React desktop client
  server/    Fastify + WebSocket server
packages/
  shared/    shared protocol types, constants, DTOs
docs/        architecture, development notes, superpowers specs/plans
原型/         local HTML/CSS prototypes for the frontend
```

## What Lives Where

### `apps/desktop`

Use this for:

- clipboard watcher logic
- popup panel UI
- notifications
- global shortcut integration
- server session client

Keep Electron main/preload code in:

- `apps/desktop/electron/`

Keep renderer UI in:

- `apps/desktop/src/`

### `apps/server`

Use this for:

- HTTP APIs
- WebSocket session handling
- presence tracking
- history storage
- publish/broadcast flows

### `packages/shared`

Put all shared definitions here first when adding:

- event names
- payload types
- storage constants
- domain models

Avoid duplicating protocol shape in both server and desktop.

## Commands

Run from repository root:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev:server
pnpm dev:desktop
```

Package-specific commands:

```bash
pnpm --filter @sync-tool/server dev
pnpm --filter @sync-tool/desktop dev
pnpm --filter @sync-tool/shared build
```

## Environment

Local-only secrets live in:

- `.env`

Expected server env vars:

- `SYNC_SERVER_HOST`
- `SYNC_SERVER_PORT`
- `SYNC_STORAGE_PATH`
- `SYNC_RETENTION_DAYS`
- `SYNC_MAX_STORAGE_BYTES`

Do not hardcode secrets in source files.

## Sensitive / Local-Only Files

Do not commit or rewrite these unless explicitly requested:

- `.env`
- `wireguard-clients/`
- `.DS_Store`

These are intentionally ignored by Git.

## Prototypes

The `原型/` folder in this repository contains local HTML/CSS frontend prototypes.

Treat these files as design references, not production app code.
Use them to guide layout, states, and interaction design for `apps/desktop/src/`.
Do not move production logic into `原型/`.

## Implementation Notes

- Prefer TypeScript everywhere.
- Prefer adding shared types in `packages/shared` before wiring features.
- Keep server as the control-plane authority.
- Keep desktop as the primary UX surface.
- Favor small, focused modules over large multi-purpose files.

## Before Finishing Work

At minimum, run:

```bash
pnpm typecheck
pnpm build
```

If you only changed one package, still prefer root checks unless time or tooling blocks it.

## Design and Planning References

Read these before major feature work:

- `docs/architecture.md`
- `docs/development.md`
- `docs/superpowers/specs/2026-05-23-sync-tool-design.md`
- `docs/superpowers/plans/2026-05-23-sync-tool-bootstrap.md`
