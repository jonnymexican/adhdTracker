import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  mergeTasks,
  saveVaultSettings,
  loadVaultSettings,
  clearVaultSettings,
  syncTasks,
  pushTasks,
  VaultError,
} from './vaultSync.js';

const task = (id, patch = {}, updatedAt = 1000) => ({
  id,
  title: 'Task ' + id,
  date: '2026-09-29',
  done: false,
  updatedAt,
  ...patch,
});

describe('mergeTasks', () => {
  it('unions disjoint tasks', () => {
    const { tasks } = mergeTasks([task('a')], [task('b')], [], []);
    expect(tasks.map((t) => t.id).sort()).toEqual(['a', 'b']);
  });

  it('newest updatedAt wins on conflicts', () => {
    const { tasks } = mergeTasks([task('a', { title: 'Local edit' }, 2000)], [task('a')], [], []);
    expect(tasks[0].title).toBe('Local edit');
  });

  it('tombstones remove older tasks but not newer edits', () => {
    const { tasks, tombstones } = mergeTasks(
      [task('a')],
      [],
      [{ id: 'a', deletedAt: 5000 }],
      []
    );
    expect(tasks.length).toBe(0);
    expect(tombstones.map((t) => t.id)).toEqual(['a']);

    const revived = mergeTasks(
      [task('a', { title: 'Recreated' }, 9000)],
      [],
      [],
      [{ id: 'a', deletedAt: 5000 }]
    );
    expect(revived.tasks.length).toBe(1);
  });

  it('handles empty remote state', () => {
    const { tasks } = mergeTasks([task('a')], [], [], []);
    expect(tasks.length).toBe(1);
  });
});

describe('settings', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips and validates', () => {
    const saved = saveVaultSettings({ url: 'https://v.workers.dev/', code: ' tracker-1 ' });
    expect(saved.code).toBe('tracker-1');
    expect(loadVaultSettings()).toEqual(saved);
    clearVaultSettings();
    expect(loadVaultSettings()).toBe(null);
    expect(() => saveVaultSettings({ url: 'http://x', code: 'tracker-1' })).toThrow(VaultError);
    expect(() => saveVaultSettings({ url: 'https://x', code: 'no' })).toThrow(VaultError);
  });
});

describe('sync flows', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('syncTasks merges remote tasks and pushes the superset', async () => {
    const remote = { v: 2, tasks: [task('b')], tombstones: [] };
    const pushes = [];
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (opts.method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve(remote) });
      pushes.push(JSON.parse(opts.body));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, v: 3 }) });
    }));
    const local = { tasks: [task('a')], tombstones: [] };
    let stored = local;
    const res = await syncTasks('https://v.example', 'tracker-1', () => local, (s) => { stored = s; });
    expect(res.v).toBe(3);
    expect(stored.tasks.map((t) => t.id).sort()).toEqual(['a', 'b']);
    expect(pushes[0].state.tasks.length).toBe(2);
  });

  it('pushTasks merges and retries after a conflict', async () => {
    let calls = 0;
    const remote = { v: 9, tasks: [task('cloud')], tombstones: [] };
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (opts.method === 'GET') return Promise.resolve({ ok: true, json: () => Promise.resolve(remote) });
      calls += 1;
      if (calls === 1) return Promise.resolve({ ok: false, status: 409, json: () => Promise.resolve({ error: 'conflict', remoteV: 9 }) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, v: 10 }) });
    }));
    const local = { tasks: [task('phone', {}, 2000)], tombstones: [] };
    let stored = local;
    const res = await pushTasks('https://v.example', 'tracker-1', 8, () => local, (s) => { stored = s; });
    expect(res.v).toBe(10);
    expect(stored.tasks.map((t) => t.id).sort()).toEqual(['cloud', 'phone']);
  });

  it('creates a fresh tracker with expectedV 0', async () => {
    const pushes = [];
    vi.stubGlobal('fetch', vi.fn((url, opts) => {
      if (opts.method === 'GET') return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: 'unknown_bureau' }) });
      pushes.push(JSON.parse(opts.body));
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, v: 1 }) });
    }));
    const local = { tasks: [task('a')], tombstones: [] };
    const res = await pushTasks('https://v.example', 'fresh-code', 0, () => local, () => {});
    expect(res.v).toBe(1);
    expect(pushes[0].expectedV).toBe(0);
  });
});
