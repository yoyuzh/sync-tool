# sync-tool

`sync-tool` is a desktop-first cross-device clipboard sync product.

This repository contains:

- `apps/server`: relay, presence, and clipboard-history storage service
- `apps/desktop`: Electron desktop client for macOS and Windows
- `packages/shared`: shared protocol types and constants
- `docs/`: product and engineering documentation

## Workspace

```text
apps/
  desktop/
  server/
packages/
  shared/
docs/
```

## Commands

```bash
pnpm install
pnpm build
pnpm typecheck
```

## Notes

- This repo replaces the temporary KDE Connect exploration workspace.
- Sensitive local artifacts like `.env` and `wireguard-clients/` are intentionally ignored.

