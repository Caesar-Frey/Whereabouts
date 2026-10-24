import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { openEncryptedDatabase } from '../db/open';
import { createRepo, type Repo } from '../db/repo';
import type { Item, Location } from '../db/types';
import { buildLocationIndex, parsePathInput, type LocationIndex } from '../lib/locations';

export interface Snapshot {
  items: Item[];
  locations: Location[];
  index: LocationIndex;
  people: string[];
}

type Status = { state: 'loading' } | { state: 'error'; error: Error } | { state: 'ready' };

interface DataContextValue {
  status: Status;
  snapshot: Snapshot;
  actions: Actions;
  retry: () => void;
}

const EMPTY: Snapshot = { items: [], locations: [], index: buildLocationIndex([]), people: [] };

const DataContext = createContext<DataContextValue | null>(null);

function makeActions(repo: Repo, refresh: () => Promise<void>) {
  const run =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A): Promise<R> => {
      const result = await fn(...args);
      await refresh();
      return result;
    };

  /** Resolves "Garage › Blue box" to a place id, creating what's missing. */
  const placeFromPath = async (path: string): Promise<string | null> => {
    const names = parsePathInput(path);
    return names.length ? repo.ensureLocationPath(names) : null;
  };

  return {
    addItem: run(
      async (input: {
        name: string;
        place: string;
        notes?: string;
        tags?: string[];
        lendTo?: { person: string; dueAt: number | null };
      }) => {
        const locationId = await placeFromPath(input.place);
        const id = await repo.addItem({ name: input.name, locationId, notes: input.notes, tags: input.tags });
        if (input.lendTo) await repo.lendItem(id, input.lendTo);
        return id;
      },
    ),
    updateItem: run(repo.updateItem),
    moveItem: run(async (id: string, place: string | { locationId: string | null }) => {
      const locationId = typeof place === 'string' ? await placeFromPath(place) : place.locationId;
      return repo.moveItem(id, locationId);
    }),
    deleteItem: run(repo.deleteItem),
    lendItem: run(repo.lendItem),
    returnItem: run(repo.returnItem),
    setLoanDue: run(repo.setLoanDue),
    addPlace: run(async (path: string, parentId: string | null = null) =>
      repo.ensureLocationPath(parsePathInput(path), parentId),
    ),
    renamePlace: run(repo.renameLocation),
    setPlaceParent: run(repo.setLocationParent),
    deletePlace: run(repo.deleteLocation),
    itemHistory: repo.itemHistory,
    getSetting: repo.getSetting,
    setSetting: repo.setSetting,
  };
}

export type Actions = ReturnType<typeof makeActions>;

async function loadSnapshot(repo: Repo): Promise<Snapshot> {
  const [items, locations, people] = await Promise.all([repo.listItems(), repo.listLocations(), repo.knownPeople()]);
  return { items, locations, index: buildLocationIndex(locations), people };
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>({ state: 'loading' });
  const [repo, setRepo] = useState<Repo | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = await openEncryptedDatabase();
      const opened = createRepo(db, { now: Date.now, uuid: Crypto.randomUUID });
      const first = await loadSnapshot(opened);
      if (cancelled) return;
      setRepo(opened);
      setSnapshot(first);
      setStatus({ state: 'ready' });
    })().catch((e: unknown) => {
      if (!cancelled) setStatus({ state: 'error', error: e instanceof Error ? e : new Error(String(e)) });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const refresh = useCallback(async () => {
    if (repo) setSnapshot(await loadSnapshot(repo));
  }, [repo]);

  const actions = useMemo(() => (repo ? makeActions(repo, refresh) : null), [repo, refresh]);
  const retry = useCallback(() => {
    setStatus({ state: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo<DataContextValue>(
    () => ({ status, snapshot, actions: actions as Actions, retry }),
    [status, snapshot, actions, retry],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataStatus() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataStatus outside DataProvider');
  return { status: ctx.status, retry: ctx.retry };
}

/** Only valid once the store is ready (screens render behind that gate). */
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData outside DataProvider');
  return { ...ctx.snapshot, actions: ctx.actions };
}

export function useItem(id: string | undefined) {
  const { items } = useData();
  return useMemo(() => items.find((i) => i.id === id) ?? null, [items, id]);
}

/** Places ordered by when they were last used, deepest (most specific) first. */
export function useRecentPlaces(limit = 8) {
  const { locations, index } = useData();
  return useMemo(() => {
    // Specific places (with nothing nested inside) are what you usually
    // pick, so they come first; broader ones fill the remaining slots.
    const byRecent = (a: Location, b: Location) => b.lastUsedAt - a.lastUsedAt;
    const leaves = locations.filter((l) => !index.children.get(l.id)?.length).sort(byRecent);
    const rest = locations.filter((l) => index.children.get(l.id)?.length).sort(byRecent);
    return [...leaves, ...rest].slice(0, limit);
  }, [locations, index, limit]);
}
