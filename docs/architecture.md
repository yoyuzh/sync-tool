# Architecture Overview

## Monorepo Layout

- `apps/server`: central relay, history storage, presence, and future SMS task routing
- `apps/desktop`: Electron desktop client for macOS and Windows
- `packages/shared`: protocol and domain types shared across apps

## Server

The server is the control-plane authority. It tracks device sessions, stores retained clipboard history, and broadcasts published records to connected clients.

## Desktop

The desktop app owns the local clipboard watcher, popup panel UI, global shortcut flow, and server connection.

## Shared Package

The shared package keeps the record model and protocol constants aligned between server and client.

