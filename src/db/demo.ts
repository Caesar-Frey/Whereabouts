import { createRepo } from './repo';
import type { Db } from './types';

const DAY = 86_400_000;

/** Sample catalog for the browser design preview. */
export async function seedDemo(db: Db): Promise<void> {
  let n = 0;
  let t = Date.now() - 40 * DAY;
  const repo = createRepo(db, { now: () => (t += 3_600_000), uuid: () => `demo-${++n}` });
  const blueBox = await repo.ensureLocationPath(['House', 'Garage', 'Blue box']);
  const shelf = await repo.ensureLocationPath(['House', 'Garage', 'Tool shelf']);
  const desk = await repo.ensureLocationPath(['House', 'Bedroom', 'Desk drawer']);
  const hall = await repo.ensureLocationPath(['House', 'Hallway', 'Key bowl']);
  const attic = await repo.ensureLocationPath(['House', 'Attic', 'Suitcase']);
  const office = await repo.ensureLocationPath(['Office', 'Locker 12']);

  await repo.addItem({ name: 'Christmas lights', locationId: attic, tags: ['seasonal'] });
  await repo.addItem({ name: 'Passport', locationId: desk, tags: ['documents', 'travel'], notes: 'Expires 2031' });
  const drill = await repo.addItem({ name: 'Cordless drill', locationId: shelf, tags: ['tools'] });
  await repo.addItem({ name: 'Camping stove', locationId: blueBox, tags: ['camping'] });
  await repo.addItem({ name: 'HDMI cable', locationId: blueBox });
  const ladder = await repo.addItem({ name: 'Step ladder', locationId: shelf, tags: ['tools'] });
  const book = await repo.addItem({ name: 'The Name of the Wind', locationId: null, tags: ['books'] });
  await repo.addItem({ name: 'Spare car keys', locationId: hall, tags: ['keys', 'car'] });
  await repo.addItem({ name: 'Gym bag', locationId: office });
  await repo.moveItem(drill, blueBox);
  await repo.moveItem(drill, shelf);

  await repo.lendItem(ladder, { person: 'Sam', dueAt: Date.now() - 2 * DAY });
  await repo.lendItem(book, { person: 'Priya', dueAt: Date.now() + 9 * DAY });
}
