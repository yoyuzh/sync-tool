# Sync Tool Design

## Summary

`sync-tool` is a new standalone product, not a continuation of the KDE Connect codebase. The first release is desktop-first: an Electron desktop client for macOS and Windows, a server that acts as relay plus clipboard-history storage, and a later Android helper client that can receive broadcasts, view history, manually publish content, and execute SMS send tasks.

The first implemented codebase in this workspace will contain:

- a server project
- an Electron desktop project
- shared repository structure and engineering docs

Android is part of the product design but not part of the first code scaffold requested for this turn.

## Product Goals

The first-stage product must support:

- device online status through a central server
- local clipboard history on desktop
- manual publish to server from a global shortcut or clipboard panel
- server broadcast of published items to online devices
- a unified "local + remote" recent history view on desktop
- recent-history expansion by `n` days
- text, images, and common documents

Android-specific product goals for the design:

- receive broadcasts from server
- view unified history
- manually publish to server
- auto-send SMS tasks after user grants permissions and sets the app as default SMS app

## Non-Goals For The First Scaffold

- do not modify KDE Connect code
- do not keep WireGuard as a product dependency
- do not implement Android client in this turn
- do not implement full file preview
- do not implement iOS client
- do not implement LAN discovery from day one

## Core UX

### Desktop

The desktop client is the primary user-facing product in phase one.

- It listens to the local clipboard and stores a local history.
- Copying content does not automatically upload it.
- The user can publish a record to the server by:
  - a global shortcut
  - a manual action in the clipboard panel
- The panel is a standalone popup window, not embedded inside another app.
- Notification clicks open the popup panel and focus the relevant item.
- The default list shows the latest `20` merged local + remote records sorted by time descending.
- The panel includes an action to fetch records from the last `1 / 3 / 7 / 15` days.

### Content Rules

- Text is fully stored and displayed.
- Files/images `<= 10 MB` are stored on the server as source files.
- Files/images `> 10 MB` are stored only as metadata in server history.
- Large-file transfer requires both endpoints online.
- File transfer prefers LAN direct transfer when available.
- If the connection is weak or LAN direct transfer is unavailable, the server may be used as relay.

### History Storage Rules

Server retention policy:

- keep at most the last `15 days`
- keep at most `5 GB` total stored history
- delete expired records first
- if usage still exceeds `5 GB`, evict oldest records until back under the limit

Client default history policy:

- default view shows only the latest `20` merged items
- expanded history is user-driven via `n-day` fetch

## Architecture

### High-Level Structure

The repository will be a TypeScript monorepo:

- `apps/server`
- `apps/desktop`
- `packages/shared`
- `docs/superpowers/specs`
- `docs/superpowers/plans`

### Server Responsibilities

The server is the control-plane authority.

- authenticate device sessions
- track online presence
- accept published clipboard records
- store retained history and file blobs
- broadcast published records to online devices
- expose filtered history queries
- issue and track SMS tasks for Android clients later

Recommended first-stack choice:

- Node.js + TypeScript
- Fastify for HTTP APIs
- WebSocket for realtime device sessions
- SQLite for first local durable metadata store
- filesystem blob store for source files `<= 10 MB`

This stack is small, easy to run on the target server, and shares language with the Electron client.

### Desktop Responsibilities

The desktop app is an Electron application with a lightweight UI shell and background services.

- clipboard watcher
- local recent-history store
- popup panel window
- notification integration
- global shortcut registration
- server session/WebSocket client
- publish workflow
- remote record receive workflow
- local record copy-back

Recommended first-stack choice:

- Electron
- TypeScript
- React for the panel UI
- Vite-based renderer build
- a small local SQLite or JSON-backed store for first local history persistence

### Shared Package

`packages/shared` will hold:

- shared TypeScript types
- record schemas
- websocket event names
- request/response DTOs
- retention and size-limit constants

This keeps server and desktop protocol definitions aligned.

## Data Model

### Clipboard Record

Each record needs:

- `id`
- `createdAt`
- `sourceDeviceId`
- `scope` (`local`, `remote`, `published`)
- `kind` (`text`, `image`, `document`)
- `title`
- `textPreview`
- `mimeType`
- `sizeBytes`
- `storageMode` (`source_file`, `metadata_only`)
- `publishState`
- `transferState`
- optional local path
- optional blob path
- optional hash for dedupe

### Device Session

- `deviceId`
- `deviceName`
- `deviceType`
- `lastSeenAt`
- `online`
- `capabilities`

### SMS Task

Included in design for later Android work:

- `taskId`
- `createdAt`
- `createdByDeviceId`
- `targetPhoneNumber`
- `messageBody`
- `status`
- `resultMessage`

## Realtime Flows

### Publish Flow

1. Desktop user copies content locally.
2. Desktop stores it in local history.
3. User triggers publish from shortcut or panel.
4. Desktop sends a `publishRecord` event to server.
5. Server stores metadata and optional blob.
6. Server broadcasts the record to all online devices.
7. Desktop clients insert it into remote history.

### History Fetch Flow

1. User clicks "recent n days".
2. Desktop requests filtered server history.
3. Server returns records constrained by retention policy.
4. Desktop merges remote results with local recent cache for display.

### Large File Flow

1. Record metadata is published to server.
2. If file exceeds `10 MB`, server stores metadata only.
3. Receiving client shows "available when both online".
4. If both endpoints are reachable, prefer LAN direct transfer.
5. If LAN fails and network quality permits, use server relay.

## Status System

Desktop records should expose clear status badges:

- local only
- published
- broadcast delivered
- metadata only
- available via LAN
- waiting for peer online
- transferred
- failed

## Security and Ops

First version assumptions:

- single-user controlled deployment
- HTTPS and WSS expected behind server deployment
- credentials and secrets stay in environment variables
- uploaded files are private application data

Later hardening can add:

- signed device registration
- per-device tokens
- encrypted-at-rest blobs
- rate limits

## Repository Migration Plan

This workspace should be transformed from the temporary KDE Connect staging folder into the new `sync-tool` repo:

1. remove `kdeconnect-kde`
2. remove `kdeconnect-android`
3. preserve useful local artifacts like `.env` and `wireguard-clients`
4. initialize a new Git repository
5. connect it to `https://github.com/yoyuzh/sync-tool.git`
6. create monorepo scaffolding
7. add server and desktop projects
8. add engineering docs

## Why A New Project Instead Of Modifying KDE Connect

The requested product shape differs materially from KDE Connect:

- central-server-first control plane
- explicit publish workflow instead of always-on sync
- standalone clipboard popup panel UX
- server-side retained history
- SMS task execution integrated with central relay

Building this as a fresh codebase avoids inheriting KDE Connect protocol constraints, plugin boundaries, and UI assumptions that do not fit the product.

