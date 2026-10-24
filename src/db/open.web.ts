import * as SQLite from 'expo-sqlite';

import { seedDemo } from './demo';
import { migrate } from './schema';
import type { Db } from './types';

/**
 * Browser build, used only to preview the design. The app ships for iOS and
 * Android; this keeps an unencrypted in-memory catalog filled with samples.
 */
export class DatabaseUnreadableError extends Error {}

export async function openEncryptedDatabase(): Promise<Db> {
  const raw = await SQLite.openDatabaseAsync(':memory:');
  const db: Db = {
    execAsync: (sql) => raw.execAsync(sql),
    runAsync: (sql, params = []) => raw.runAsync(sql, params),
    getAllAsync: (sql, params = []) => raw.getAllAsync(sql, params),
    getFirstAsync: (sql, params = []) => raw.getFirstAsync(sql, params),
    withTransactionAsync: (task) => raw.withTransactionAsync(task),
  };
  await migrate(db);
  await seedDemo(db);
  return db;
}

export async function eraseAllData(): Promise<void> {}
