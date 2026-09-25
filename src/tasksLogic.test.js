import { describe, it, expect } from 'vitest';
import {
  todayStr,
  addDays,
  bucketTasks,
  generateDueRecurrences,
  advanceRecurrence,
  computeStats,
} from './tasksLogic.js';

const TODAY = todayStr();
const TOMORROW = addDays(TODAY, 1);
const YESTERDAY = addDays(TODAY, -1);

function task(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(16).slice(2),
    title: 'Test task',
    expectedOutcome: 'Something concrete happened',
    date: TODAY,
    createdAt: 1,
    done: false,
    reflection: null,
    ...overrides,
  };
}

describe('bucketTasks', () => {
  it('buckets tasks by date and status', () => {
    const buckets = bucketTasks([
      task({ id: 'a', date: TODAY }),
      task({ id: 'b', date: TOMORROW }),
      task({ id: 'c', date: addDays(TODAY, 5) }),
      task({ id: 'd', date: YESTERDAY }),
      task({ id: 'e', done: true, completedOn: YESTERDAY }),
    ], TODAY);

    expect(buckets.today.map((t) => t.id)).toEqual(['a']);
    expect(buckets.tomorrow.map((t) => t.id)).toEqual(['b']);
    expect(buckets.upcoming.map((t) => t.id)).toEqual(['c']);
    expect(buckets.overdue.map((t) => t.id)).toEqual(['d']);
    expect(buckets.done.map((t) => t.id)).toEqual(['e']);
  });
});

describe('recurrence', () => {
  it('generates an instance when nextDue has arrived', () => {
    const templates = [task({ id: 'tpl', recurring: true, every: 1, nextDue: TODAY, date: YESTERDAY })];
    const generated = generateDueRecurrences(templates, TODAY, []);
    expect(generated).toHaveLength(1);
    expect(generated[0].title).toBe('Test task');
    expect(generated[0].date).toBe(TODAY);
    expect(generated[0].recurrenceOf).toBe('tpl');
  });

  it('does not duplicate an already-materialized instance', () => {
    const templates = [task({ id: 'tpl', recurring: true, every: 1, nextDue: TODAY, date: YESTERDAY })];
    const existing = [task({ recurrenceOf: 'tpl', date: TODAY })];
    expect(generateDueRecurrences(templates, TODAY, existing)).toHaveLength(0);
  });

  it('advances the template by its interval on completion', () => {
    const template = task({ id: 'tpl', recurring: true, every: 7, nextDue: TODAY, date: YESTERDAY });
    const advanced = advanceRecurrence(template, TODAY);
    expect(advanced.nextDue).toBe(addDays(TODAY, 7));
  });
});

describe('computeStats', () => {
  it('counts consecutive-day streaks including today', () => {
    const tasks = [
      task({ id: '1', done: true, completedOn: TODAY }),
      task({ id: '2', done: true, completedOn: YESTERDAY }),
      task({ id: '3', done: true, completedOn: addDays(TODAY, -2) }),
    ];
    expect(computeStats(tasks, TODAY).streak).toBe(3);
  });

  it('keeps the streak alive when today has no completions yet', () => {
    const tasks = [
      task({ id: '1', done: true, completedOn: YESTERDAY }),
      task({ id: '2', done: true, completedOn: addDays(TODAY, -2) }),
    ];
    expect(computeStats(tasks, TODAY).streak).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const tasks = [
      task({ id: '1', done: true, completedOn: TODAY }),
      task({ id: '2', done: true, completedOn: addDays(TODAY, -3) }),
    ];
    expect(computeStats(tasks, TODAY).streak).toBe(1);
  });

  it('computes expectation-met rate from reflections', () => {
    const tasks = [
      task({ id: '1', done: true, completedOn: TODAY, reflection: { met: true, note: null } }),
      task({ id: '2', done: true, completedOn: TODAY, reflection: { met: 'partial', note: null } }),
      task({ id: '3', done: true, completedOn: YESTERDAY, reflection: { met: false, note: null } }),
      task({ id: '4', done: true, completedOn: YESTERDAY, reflection: { met: true, note: null } }),
    ];
    const stats = computeStats(tasks, TODAY);
    expect(stats.reflected).toBe(4);
    expect(stats.met).toBe(2);
    expect(stats.partially).toBe(1);
    expect(stats.missed).toBe(1);
    expect(stats.expectationRate).toBe(50);
  });

  it('returns 7-day history', () => {
    const stats = computeStats([task({ id: 'x', done: true, completedOn: TODAY })], TODAY);
    expect(stats.last7).toHaveLength(7);
    expect(stats.last7[6].day).toBe(TODAY);
    expect(stats.last7[6].completed).toBe(1);
  });
});

describe('date helpers', () => {
  it('addDays handles month boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
