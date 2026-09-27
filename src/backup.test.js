import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportBackup, parseBackup, applyBackup, downloadBackup } from './backup.js';

const TASKS = [
  {
    id: 't1',
    title: 'Ship the backup feature',
    expectedOutcome: 'All four apps can export and import their data',
    date: '2026-09-27',
    done: false,
    reflection: null,
  },
];

describe('adhdtracker backup', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('adhdtracker:tasks', JSON.stringify(TASKS));
  });

  it('exports the task list with an app marker', () => {
    const backup = exportBackup();
    expect(backup.app).toBe('adhdtracker');
    expect(backup.version).toBe(1);
    expect(typeof backup.exportedAt).toBe('string');
    expect(backup.data).toEqual(TASKS);
  });

  it('exports an empty list when nothing is saved', () => {
    window.localStorage.clear();
    expect(exportBackup().data).toEqual([]);
  });

  it('exports an empty list instead of throwing on corrupt storage', () => {
    window.localStorage.setItem('adhdtracker:tasks', '{not json');
    expect(exportBackup().data).toEqual([]);
  });

  it('rejects foreign or malformed files', () => {
    expect(() => parseBackup('not json at all')).toThrow('Not an adhdTracker backup file');
    expect(() => parseBackup('{"app":"vicinitygo","data":[]}')).toThrow(
      'Not an adhdTracker backup file'
    );
    expect(() => parseBackup('{"app":"adhdtracker"}')).toThrow('Not an adhdTracker backup file');
  });

  it('restores the task list from a valid backup', () => {
    const backup = JSON.stringify(exportBackup());
    window.localStorage.clear();
    expect(applyBackup(parseBackup(backup))).toBe(1);
    expect(JSON.parse(window.localStorage.getItem('adhdtracker:tasks'))).toEqual(TASKS);
  });

  it('refuses backups without an array payload', () => {
    expect(applyBackup(parseBackup('{"app":"adhdtracker","data":{"nope":true}}'))).toBeNull();
    expect(() => parseBackup('{"app":"adhdtracker"}')).toThrow('Not an adhdTracker backup file');
  });

  it('downloadBackup triggers a JSON file download', () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadBackup();

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
  });
});
