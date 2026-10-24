export type SqlValue = string | number | null | Uint8Array;

/**
 * The subset of expo-sqlite's `SQLiteDatabase` the app relies on. Keeping it
 * this small lets tests run the real SQL against better-sqlite3.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  closeAsync(): Promise<void>;
}

export interface Location {
  id: string;
  name: string;
  parentId: string | null;
  notes: string | null;
  createdAt: number;
  lastUsedAt: number;
}

export interface Loan {
  id: string;
  itemId: string;
  person: string;
  lentAt: number;
  dueAt: number | null;
  returnedAt: number | null;
  notes: string | null;
}

export interface Item {
  id: string;
  name: string;
  notes: string | null;
  locationId: string | null;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  /** The loan that has not been returned yet, if the item is lent out. */
  activeLoan: Loan | null;
  /** Photo ids, oldest first. The first is the cover. */
  photoIds: string[];
  /** Base64 JPEG thumbnail of the cover photo. */
  cover: string | null;
}

export interface PhotoInput {
  data: string;
  thumb: string;
  width: number;
  height: number;
  kind?: 'item' | 'box' | 'label';
}

export interface Photo {
  id: string;
  itemId: string | null;
  locationId: string | null;
  kind: 'item' | 'box' | 'label';
  data: string;
  width: number | null;
  height: number | null;
  createdAt: number;
}

export type HistoryEvent =
  | {
      kind: 'moved';
      id: string;
      at: number;
      fromPath: string | null;
      toPath: string | null;
    }
  | { kind: 'lent'; id: string; at: number; person: string; dueAt: number | null }
  | { kind: 'returned'; id: string; at: number; person: string };
