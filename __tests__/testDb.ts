import Database from 'better-sqlite3';

import { createRepo } from '../src/db/repo';
import { migrate } from '../src/db/schema';
import type { Db, SqlValue } from '../src/db/types';

/** Runs the app's SQL against an in-memory better-sqlite3 database. */
export function memoryDb(): Db {
  const raw = new Database(':memory:');
  const bind = (params?: SqlValue[]) => (params ?? []).map((p) => (p instanceof Uint8Array ? Buffer.from(p) : p));
  return {
    async execAsync(sql) {
      raw.exec(sql);
    },
    async runAsync(sql, params) {
      return { changes: raw.prepare(sql).run(...bind(params)).changes };
    },
    async getAllAsync<T>(sql: string, params?: SqlValue[]) {
      return raw.prepare(sql).all(...bind(params)) as T[];
    },
    async getFirstAsync<T>(sql: string, params?: SqlValue[]) {
      const stmt = raw.prepare(sql);
      return ((stmt.reader ? stmt.get(...bind(params)) : (stmt.run(...bind(params)), undefined)) ?? null) as T | null;
    },
    async withTransactionAsync(task) {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    async closeAsync() {
      raw.close();
    },
  };
}

export async function testRepo() {
  const db = memoryDb();
  await migrate(db);
  let clock = 1_000_000;
  let n = 0;
  const repo = createRepo(db, {
    now: () => (clock += 1000),
    uuid: () => `id-${++n}`,
  });
  return { db, repo };
}
