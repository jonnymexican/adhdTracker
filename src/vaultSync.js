// Vault client for adhdTracker — talks to the same bureau-vault Worker as
// FriendCredit, but syncs a single `tasks` list with deletion tombstones.
// A tracker code is personal: it identifies ONE person's task list, so only
// share it with devices you own (unlike FriendCredit's shared group code).

const SETTINGS_KEY = 'adhdtracker:vault-settings';

export class VaultError extends Error {
  constructor(code, extra = {}) {
    super(`vault:${code}`);
    this.name = 'VaultError';
    this.code = code;
    Object.assign(this, extra);
  }
}

export function loadVaultSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.url !== 'string' || typeof parsed.code !== 'string') return null;
    return { url: parsed.url.trim().replace(/\/+$/, ''), code: parsed.code.trim() };
  } catch {
    return null;
  }
}

export function saveVaultSettings({ url, code }) {
  const cleanUrl = (url || '').trim().replace(/\/+$/, '');
  const cleanCode = (code || '').trim();
  if (!/^https:\/\/.+/.test(cleanUrl)) throw new VaultError('bad_url');
  if (!/^[A-Za-z0-9-]{4,40}$/.test(cleanCode)) throw new VaultError('bad_code');
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ url: cleanUrl, code: cleanCode }));
  return { url: cleanUrl, code: cleanCode };
}

export function clearVaultSettings() {
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignore
  }
}

const itemTime = (x) => Number(x.updatedAt ?? x.createdAt ?? 0);

/**
 * Merge two task states with deletion support.
 * - Union by id, newest updatedAt wins (updatedAt is stamped by the app on
 *   every add/complete/edit so edits propagate).
 * - Tombstones drop older live tasks; newer tasks survive deletion.
 */
export function mergeTasks(localTasks, remoteTasks, localTombstones, remoteTombstones) {
  const byId = new Map();
  for (const t of localTasks || []) byId.set(t.id, t);
  for (const t of remoteTasks || []) {
    byId.set(t.id, byId.has(t.id) && itemTime(byId.get(t.id)) >= itemTime(t) ? byId.get(t.id) : t);
  }
  const tombs = new Map();
  for (const t of localTombstones || []) tombs.set(t.id, t);
  for (const t of remoteTombstones || []) {
    tombs.set(t.id, tombs.has(t.id) && tombs.get(t.id).deletedAt >= t.deletedAt ? tombs.get(t.id) : t);
  }
  for (const [id, tb] of tombs) {
    const live = byId.get(id);
    if (live && itemTime(live) <= Number(tb.deletedAt)) byId.delete(id);
  }
  return {
    tasks: [...byId.values()],
    tombstones: [...tombs.values()],
  };
}

async function call(url, path, options) {
  let res;
  try {
    res = await fetch(url + path, options);
  } catch {
    throw new VaultError('network');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    throw new VaultError('bad_response');
  }
  if (!res.ok) {
    const code =
      res.status === 401
        ? 'unauthorized'
        : res.status === 404
          ? 'unknown_bureau'
          : res.status === 409
            ? 'conflict'
            : 'bad_response';
    throw new VaultError(code, { status: res.status });
  }
  return body;
}

export function vaultFetch(url, code) {
  return call(url, `/bureau/${code}`, { method: 'GET', headers: { 'x-vault-code': code } });
}

export function vaultPush(url, code, expectedV, state) {
  return call(url, `/bureau/${code}`, {
    method: 'PUT',
    headers: { 'x-vault-code': code, 'content-type': 'application/json' },
    body: JSON.stringify({ expectedV, state }),
  });
}

/** Pull remote, merge into local state, push back if the merge added anything. */
export async function syncTasks(url, code, getState, setState) {
  const remote = await vaultFetch(url, code);
  const { tasks, tombstones } = mergeTasks(
    getState().tasks,
    remote.tasks || [],
    getState().tombstones,
    remote.tombstones || []
  );
  setState({ tasks, tombstones });
  let changed = false;
  const remoteIds = new Set((remote.tasks || []).map((t) => t.id));
  for (const t of tasks) if (!remoteIds.has(t.id)) changed = true;
  try {
    const pushed = await vaultPush(url, code, remote.v ?? 1, { tasks, tombstones });
    return { v: pushed.v };
  } catch (err) {
    if (err.code !== 'conflict') throw err;
    const remote2 = await vaultFetch(url, code);
    const merged2 = mergeTasks(tasks, remote2.tasks || [], tombstones, remote2.tombstones || []);
    setState(merged2);
    const pushed2 = await vaultPush(url, code, remote2.v ?? 1, merged2);
    return { v: pushed2.v };
  }
}

/** Push the current local state after a mutation, merging on conflict. */
export async function pushTasks(url, code, expectedV, getState, setState) {
  const { tasks, tombstones } = getState();
  try {
    const pushed = await vaultPush(url, code, expectedV, { tasks, tombstones });
    return { v: pushed.v };
  } catch (err) {
    if (err.code !== 'conflict') throw err;
    const remote = await vaultFetch(url, code);
    const merged = mergeTasks(tasks, remote.tasks || [], tombstones, remote.tombstones || []);
    setState(merged);
    const pushed = await vaultPush(url, code, remote.v ?? 1, merged);
    return { v: pushed.v };
  }
}
