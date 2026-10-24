import type { Db } from './types';

/**
 * Ordered migrations. Index + 1 is the schema version stored in
 * `PRAGMA user_version`. Never edit a shipped migration; append a new one.
 *
 * Columns marked "later" are unused in stage 1 but exist so photos, box
 * recognition and on-device AI can land without reshaping the data.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE locations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL,
    -- later: visual fingerprint of a box/label for photo recognition
    fingerprint BLOB,
    fingerprint_model TEXT
  );
  CREATE UNIQUE INDEX locations_parent_name
    ON locations (ifnull(parent_id, ''), name COLLATE NOCASE);

  CREATE TABLE items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    location_id TEXT REFERENCES locations(id) ON DELETE SET NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    -- later: on-device embedding for semantic search
    embedding BLOB,
    embedding_model TEXT,
    embedding_updated_at INTEGER
  );
  CREATE INDEX items_location ON items (location_id);

  CREATE TABLE tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    -- 'user' typed it, 'ai' was suggested by the local model and approved
    source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai')),
    PRIMARY KEY (item_id, tag_id)
  );

  -- later: photos of items, boxes and handwritten labels
  CREATE TABLE photos (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    location_id TEXT REFERENCES locations(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'item' CHECK (kind IN ('item', 'box', 'label')),
    created_at INTEGER NOT NULL,
    CHECK ((item_id IS NULL) != (location_id IS NULL))
  );

  CREATE TABLE loans (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    person TEXT NOT NULL,
    lent_at INTEGER NOT NULL,
    due_at INTEGER,
    returned_at INTEGER,
    notes TEXT
  );
  CREATE UNIQUE INDEX loans_one_active ON loans (item_id) WHERE returned_at IS NULL;

  -- Paths are snapshotted so history still reads right after a place is
  -- renamed or deleted.
  CREATE TABLE moves (
    id TEXT PRIMARY KEY NOT NULL,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    from_location_id TEXT,
    to_location_id TEXT,
    from_path TEXT,
    to_path TEXT,
    moved_at INTEGER NOT NULL
  );
  CREATE INDEX moves_item ON moves (item_id, moved_at);

  CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
];

export async function migrate(db: Db): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current > MIGRATIONS.length) {
    throw new Error(
      `Database schema v${current} is newer than this app (v${MIGRATIONS.length}). Update the app.`,
    );
  }
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]!);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}
