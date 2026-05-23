# Sync Tool Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the temporary KDE Connect workspace with a new `sync-tool` monorepo that contains an initial server project, an initial Electron desktop project, and the project docs needed to continue implementation.

**Architecture:** Use a TypeScript monorepo with `apps/server`, `apps/desktop`, and `packages/shared`. The server will be a Fastify + WebSocket service, and the desktop app will be an Electron + React + Vite client. This bootstrap focuses on repository structure, dev tooling, and minimal runnable skeletons rather than full product features.

**Tech Stack:** Git, Node.js, pnpm workspaces, TypeScript, Fastify, ws, Electron, React, Vite

---

### Task 1: Replace Temporary Workspace With New Repository

**Files:**
- Delete: `/Users/mac/Documents/kdeConnect/kdeconnect-kde`
- Delete: `/Users/mac/Documents/kdeConnect/kdeconnect-android`
- Modify: `/Users/mac/Documents/kdeConnect/.gitignore`
- Create: `/Users/mac/Documents/kdeConnect/README.md`

- [ ] **Step 1: Remove the two KDE Connect source folders**

Run:

```bash
rtk rm -rf /Users/mac/Documents/kdeConnect/kdeconnect-kde
rtk rm -rf /Users/mac/Documents/kdeConnect/kdeconnect-android
```

Expected: both folders are removed, while `.env`, `wireguard-clients`, and `docs/` remain.

- [ ] **Step 2: Initialize the new Git repository**

Run:

```bash
rtk git -C /Users/mac/Documents/kdeConnect init -b main
rtk git -C /Users/mac/Documents/kdeConnect remote add origin https://github.com/yoyuzh/sync-tool.git
```

Expected: `git status` works and `origin` points to the GitHub repository.

- [ ] **Step 3: Write the root README**

Create a concise README describing the monorepo purpose, workspace layout, and local commands.

- [ ] **Step 4: Verify repository state**

Run:

```bash
rtk git -C /Users/mac/Documents/kdeConnect status --short
rtk git -C /Users/mac/Documents/kdeConnect remote -v
```

Expected: new files appear as untracked or staged later, and `origin` is correct.

### Task 2: Create Workspace Tooling

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/package.json`
- Create: `/Users/mac/Documents/kdeConnect/pnpm-workspace.yaml`
- Create: `/Users/mac/Documents/kdeConnect/tsconfig.base.json`
- Create: `/Users/mac/Documents/kdeConnect/.editorconfig`

- [ ] **Step 1: Add the root workspace manifest**

Create a root `package.json` with workspace scripts for dev, build, lint, and typecheck.

- [ ] **Step 2: Add pnpm workspace config**

Create `pnpm-workspace.yaml` that includes:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 3: Add base TypeScript config**

Create `tsconfig.base.json` with strict settings shared by server, desktop, and shared package.

- [ ] **Step 4: Add editor defaults**

Create `.editorconfig` to normalize line endings, indentation, and charset.

### Task 3: Create Shared Package Skeleton

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/packages/shared/package.json`
- Create: `/Users/mac/Documents/kdeConnect/packages/shared/tsconfig.json`
- Create: `/Users/mac/Documents/kdeConnect/packages/shared/src/index.ts`
- Create: `/Users/mac/Documents/kdeConnect/packages/shared/src/types.ts`

- [ ] **Step 1: Define shared package metadata**

Create the package manifest for `@sync-tool/shared`.

- [ ] **Step 2: Add shared TypeScript config**

Make it extend the root base config and emit types/build output.

- [ ] **Step 3: Add first protocol and model types**

Include:

```ts
export type RecordKind = "text" | "image" | "document";
export type StorageMode = "source_file" | "metadata_only";
export type PublishState = "local" | "published" | "broadcast";

export interface ClipboardRecord {
  id: string;
  createdAt: string;
  sourceDeviceId: string;
  kind: RecordKind;
  title: string;
  textPreview?: string;
  mimeType?: string;
  sizeBytes: number;
  storageMode: StorageMode;
  publishState: PublishState;
}
```

- [ ] **Step 4: Export package surface**

Re-export all shared types from `src/index.ts`.

### Task 4: Create Server Project Skeleton

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/apps/server/package.json`
- Create: `/Users/mac/Documents/kdeConnect/apps/server/tsconfig.json`
- Create: `/Users/mac/Documents/kdeConnect/apps/server/src/index.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/server/src/config.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/server/src/routes/health.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/server/src/realtime/socketServer.ts`

- [ ] **Step 1: Define server package and dependencies**

Include Fastify, ws, TypeScript tooling, and a dev script.

- [ ] **Step 2: Add config loader**

Read host, port, storage path, retention days, and max storage bytes from env.

- [ ] **Step 3: Add a health route**

Create a `/health` endpoint returning app name, uptime, and mode.

- [ ] **Step 4: Add a websocket bootstrap**

Create a stub realtime server that accepts connections and logs device session setup.

- [ ] **Step 5: Add the server entrypoint**

Start Fastify, attach websocket handling, and listen on configured host/port.

### Task 5: Create Electron Desktop Skeleton

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/package.json`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/tsconfig.json`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/electron/main.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/electron/preload.ts`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/main.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/src/App.tsx`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/index.html`
- Create: `/Users/mac/Documents/kdeConnect/apps/desktop/vite.config.ts`

- [ ] **Step 1: Define desktop package and dependencies**

Include Electron, React, Vite, TypeScript, and shared package references.

- [ ] **Step 2: Add Electron main process**

Create a hidden-ready popup-style window shell that can become the future clipboard panel.

- [ ] **Step 3: Add preload bridge**

Expose a minimal safe API surface from Electron to the renderer.

- [ ] **Step 4: Add renderer entry and starter UI**

Show:

- app title
- placeholder server status
- placeholder recent clipboard list heading
- future action buttons for publish/fetch

- [ ] **Step 5: Add Vite config**

Make the renderer buildable and usable during development.

### Task 6: Add Project Documentation

**Files:**
- Create: `/Users/mac/Documents/kdeConnect/docs/architecture.md`
- Create: `/Users/mac/Documents/kdeConnect/docs/development.md`

- [ ] **Step 1: Write architecture overview**

Summarize server, desktop, and shared package boundaries.

- [ ] **Step 2: Write local development guide**

Document:

- required Node version
- package manager
- install command
- run commands
- environment variables

### Task 7: Install Dependencies And Verify Bootstrap

**Files:**
- Modify: generated lockfile and installed workspace state

- [ ] **Step 1: Install workspace dependencies**

Run:

```bash
cd /Users/mac/Documents/kdeConnect
rtk pnpm install
```

Expected: lockfile created and all workspace packages linked.

- [ ] **Step 2: Run server typecheck/build smoke test**

Run:

```bash
cd /Users/mac/Documents/kdeConnect
rtk pnpm --filter @sync-tool/server build
```

Expected: server compiles successfully.

- [ ] **Step 3: Run desktop typecheck/build smoke test**

Run:

```bash
cd /Users/mac/Documents/kdeConnect
rtk pnpm --filter @sync-tool/desktop build
```

Expected: desktop renderer and Electron code compile successfully.

- [ ] **Step 4: Run root workspace checks**

Run:

```bash
cd /Users/mac/Documents/kdeConnect
rtk pnpm typecheck
```

Expected: all workspaces pass typecheck.

### Task 8: Commit Bootstrap State

**Files:**
- Modify: git index and commit history

- [ ] **Step 1: Stage the bootstrap**

Run:

```bash
rtk git -C /Users/mac/Documents/kdeConnect add .
```

- [ ] **Step 2: Create the initial commit**

Run:

```bash
rtk git -C /Users/mac/Documents/kdeConnect commit -m "chore: bootstrap sync-tool monorepo"
```

- [ ] **Step 3: Push to GitHub**

Run:

```bash
rtk git -C /Users/mac/Documents/kdeConnect push -u origin main
```

Expected: the new repository bootstrap is available on GitHub.

