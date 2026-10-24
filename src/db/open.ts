import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { migrate } from './schema';
import type { Db } from './types';

const DB_NAME = 'whereabouts.db';
const KEY_NAME = 'whereabouts.dbkey.v1';
// The key never leaves this device: no iCloud Keychain sync, no backups.
const KEY_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/** The database exists but can't be decrypted with the stored key. */
export class DatabaseUnreadableError extends Error {
  constructor(cause: unknown) {
    super('Your saved data could not be unlocked on this device.');
    this.name = 'DatabaseUnreadableError';
    this.cause = cause;
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function adapt(db: SQLite.SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

/**
 * Opens the SQLCipher-encrypted database, creating it and its 256-bit key on
 * first launch. The raw key lives only in the iOS Keychain / Android Keystore.
 */
export async function openEncryptedDatabase(): Promise<Db> {
  let key = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTIONS);
  const isNewKey = key === null;
  if (!key) key = toHex(await Crypto.getRandomBytesAsync(32));
  if (!/^[0-9a-f]{64}$/.test(key)) throw new DatabaseUnreadableError(new Error('Malformed key'));

  const raw = await SQLite.openDatabaseAsync(DB_NAME);
  try {
    // Must be the first statement on the connection. A raw hex key skips
    // SQLCipher's passphrase derivation since it's already random.
    await raw.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipher = await raw.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) {
      if (!__DEV__) throw new Error('SQLCipher is not available in this build');
      console.warn('[whereabouts] SQLCipher missing: data is NOT encrypted (dev build only).');
    }
    // Fails with "file is not a database" if the key doesn't match.
    await raw.getFirstAsync('SELECT count(*) FROM sqlite_master');
  } catch (e) {
    await raw.closeAsync().catch(() => {});
    throw new DatabaseUnreadableError(e);
  }

  // Only remember a fresh key once it has unlocked (i.e. created) the file.
  if (isNewKey) await SecureStore.setItemAsync(KEY_NAME, key, KEY_OPTIONS);

  await raw.execAsync('PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
  const db = adapt(raw);
  await migrate(db);
  return db;
}

/** Permanently erases all data and the key. Used to recover from a lost key. */
export async function eraseAllData(): Promise<void> {
  await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => {});
  await SecureStore.deleteItemAsync(KEY_NAME, KEY_OPTIONS);
}
