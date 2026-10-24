import { buildLocationIndex } from '../src/lib/locations';
import { migrate } from '../src/db/schema';
import { testRepo } from './testDb';

describe('schema', () => {
  it('migrates idempotently', async () => {
    const { db } = await testRepo();
    await migrate(db);
    const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    expect(row?.user_version).toBe(1);
  });
});

describe('locations', () => {
  it('reuses existing places case-insensitively and nests new ones', async () => {
    const { repo } = await testRepo();
    const box = await repo.ensureLocationPath(['House', 'Garage', 'Blue box']);
    const again = await repo.ensureLocationPath(['house', 'GARAGE', 'blue  box ']);
    expect(again).toBe(box);
    const shelf = await repo.ensureLocationPath(['House', 'Garage', 'Shelf']);
    const index = buildLocationIndex(await repo.listLocations());
    expect(index.pathString(shelf)).toBe('House › Garage › Shelf');
    expect((await repo.listLocations()).length).toBe(4);
  });

  it('refuses to put a place inside itself', async () => {
    const { repo } = await testRepo();
    const box = await repo.ensureLocationPath(['House', 'Garage', 'Box']);
    const locs = await repo.listLocations();
    const house = locs.find((l) => l.name === 'House')!;
    await expect(repo.setLocationParent(house.id, box)).rejects.toThrow(/inside itself/);
  });

  it('deleting a place moves its contents up and keeps history readable', async () => {
    const { repo } = await testRepo();
    const box = await repo.ensureLocationPath(['House', 'Garage', 'Box']);
    await repo.ensureLocationPath(['House', 'Garage', 'Box', 'Bag']);
    const item = await repo.addItem({ name: 'Drill', locationId: box });
    const garage = (await repo.listLocations()).find((l) => l.name === 'Garage')!;
    await repo.deleteLocation(box);

    const items = await repo.listItems();
    expect(items[0]!.locationId).toBe(garage.id);
    const index = buildLocationIndex(await repo.listLocations());
    const bag = [...index.byId.values()].find((l) => l.name === 'Bag')!;
    expect(bag.parentId).toBe(garage.id);

    const history = await repo.itemHistory(item);
    expect(history[0]).toMatchObject({ kind: 'moved', fromPath: 'House › Garage › Box', toPath: 'House › Garage' });
  });

  it('merges a child into a same-named sibling when its parent is deleted', async () => {
    const { repo } = await testRepo();
    const innerShelf = await repo.ensureLocationPath(['Garage', 'Cupboard', 'Shelf']);
    const outerShelf = await repo.ensureLocationPath(['Garage', 'Shelf']);
    await repo.addItem({ name: 'Glue', locationId: innerShelf });
    const cupboard = (await repo.listLocations()).find((l) => l.name === 'Cupboard')!;
    await repo.deleteLocation(cupboard.id);
    const items = await repo.listItems();
    expect(items[0]!.locationId).toBe(outerShelf);
    expect((await repo.listLocations()).map((l) => l.name).sort()).toEqual(['Garage', 'Shelf']);
  });

  it('rename rejects a clash with a sibling', async () => {
    const { repo } = await testRepo();
    const a = await repo.ensureLocationPath(['Garage', 'A']);
    await repo.ensureLocationPath(['Garage', 'B']);
    await expect(repo.renameLocation(a, 'b')).rejects.toThrow(/already/);
  });
});

describe('items', () => {
  it('adds an item with tags and records where it was put', async () => {
    const { repo } = await testRepo();
    const drawer = await repo.ensureLocationPath(['Kitchen', 'Drawer']);
    const id = await repo.addItem({ name: '  Spare   keys ', locationId: drawer, tags: ['keys', '#Keys', 'car'] });
    const [item] = await repo.listItems();
    expect(item).toMatchObject({ id, name: 'Spare keys', locationId: drawer });
    expect(item!.tags.sort()).toEqual(['car', 'keys']);
    const history = await repo.itemHistory(id);
    expect(history).toEqual([expect.objectContaining({ kind: 'moved', fromPath: null, toPath: 'Kitchen › Drawer' })]);
  });

  it('rejects empty names', async () => {
    const { repo } = await testRepo();
    await expect(repo.addItem({ name: '   ', locationId: null })).rejects.toThrow(/name/);
  });

  it('moves an item and keeps the full history newest first', async () => {
    const { repo } = await testRepo();
    const a = await repo.ensureLocationPath(['Garage']);
    const b = await repo.ensureLocationPath(['Attic']);
    const id = await repo.addItem({ name: 'Tent', locationId: a });
    expect(await repo.moveItem(id, b)).toBe(true);
    expect(await repo.moveItem(id, b)).toBe(false);
    const history = await repo.itemHistory(id);
    expect(history.map((h) => h.kind === 'moved' && h.toPath)).toEqual(['Attic', 'Garage']);
  });

  it('removes orphaned tags on update and delete', async () => {
    const { repo, db } = await testRepo();
    const id = await repo.addItem({ name: 'Tent', locationId: null, tags: ['camping'] });
    await repo.updateItem(id, { tags: ['outdoor'] });
    expect(await db.getAllAsync('SELECT name FROM tags')).toEqual([{ name: 'outdoor' }]);
    await repo.deleteItem(id);
    expect(await db.getAllAsync('SELECT name FROM tags')).toEqual([]);
    expect(await db.getAllAsync('SELECT * FROM moves')).toEqual([]);
  });
});

describe('loans', () => {
  it('tracks one active loan per item and its return', async () => {
    const { repo } = await testRepo();
    const id = await repo.addItem({ name: 'Ladder', locationId: null });
    await repo.lendItem(id, { person: 'Sam', dueAt: 5_000_000 });
    await expect(repo.lendItem(id, { person: 'Alex' })).rejects.toThrow(/Already lent to Sam/);
    let [item] = await repo.listItems();
    expect(item!.activeLoan).toMatchObject({ person: 'Sam', dueAt: 5_000_000 });

    await repo.returnItem(id);
    [item] = await repo.listItems();
    expect(item!.activeLoan).toBeNull();
    await repo.lendItem(id, { person: 'Alex' });

    const kinds = (await repo.itemHistory(id)).map((h) => h.kind);
    expect(kinds).toEqual(['lent', 'returned', 'lent']);
    expect(await repo.knownPeople()).toEqual(['Alex', 'Sam']);
  });
});

describe('settings', () => {
  it('upserts', async () => {
    const { repo } = await testRepo();
    expect(await repo.getSetting('x')).toBeNull();
    await repo.setSetting('x', '1');
    await repo.setSetting('x', '2');
    expect(await repo.getSetting('x')).toBe('2');
  });
});
