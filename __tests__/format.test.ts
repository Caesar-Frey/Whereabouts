import { callNumber, dueState } from '../src/lib/format';

describe('callNumber', () => {
  it('abbreviates the last three places', () => {
    expect(callNumber(['House', 'Garage', 'Blue box'])).toBe('HOU·GAR·BB');
    expect(callNumber(['Home', 'Café', 'Top shelf', 'Tin'])).toBe('CAF·TS·TIN');
    expect(callNumber([])).toBe('UNSHELVED');
  });
});

describe('dueState', () => {
  const now = 1_000_000_000;
  it('classifies due dates', () => {
    expect(dueState(null, now)).toBe('none');
    expect(dueState(now - 1, now)).toBe('overdue');
    expect(dueState(now + 86_400_000, now)).toBe('soon');
    expect(dueState(now + 10 * 86_400_000, now)).toBe('ok');
  });
});
