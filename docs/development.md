# Development Guide

## Requirements

- Node.js 24+
- pnpm 11+

## Install

```bash
pnpm install
```

## Common Commands

```bash
pnpm build
pnpm typecheck
pnpm dev:server
pnpm dev:desktop
```

## Environment

The workspace currently keeps local-only secrets in `.env`.

Planned server environment variables:

- `SYNC_SERVER_HOST`
- `SYNC_SERVER_PORT`
- `SYNC_STORAGE_PATH`
- `SYNC_RETENTION_DAYS`
- `SYNC_MAX_STORAGE_BYTES`

