import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";

const require = createRequire(import.meta.url);
const { DatabaseSync: SqliteDatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");

export interface DatabaseHandle {
  db: DatabaseSync;
  close: () => void;
}

export async function openDatabase(storagePath: string): Promise<DatabaseHandle> {
  const databasePath = join(storagePath, "sync-tool.sqlite");
  await mkdir(dirname(databasePath), { recursive: true });

  const db = new SqliteDatabaseSync(databasePath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA journal_mode = WAL");
  migrate(db);

  return {
    db,
    close: () => db.close()
  };
}

function migrate(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      device_name TEXT NOT NULL,
      device_type TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      revoked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      source_device_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      text_preview TEXT,
      text_content TEXT,
      mime_type TEXT,
      size_bytes INTEGER NOT NULL,
      storage_mode TEXT NOT NULL,
      publish_state TEXT NOT NULL,
      blob_key TEXT,
      content_hash TEXT,
      client_request_id TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      FOREIGN KEY (source_device_id) REFERENCES devices(device_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_records_source_request
      ON records(source_device_id, client_request_id);

    CREATE INDEX IF NOT EXISTS idx_records_created_at
      ON records(created_at DESC);

    CREATE TABLE IF NOT EXISTS blob_metadata (
      record_id TEXT PRIMARY KEY,
      blob_key TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      mime_type TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
    );
  `);
}
