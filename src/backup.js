// Backup/restore for the task list. All apps on this GitHub Pages origin
// share one localStorage bucket, so a "clear site data" anywhere wipes
// everything — this JSON backup is the safety net.

const STORAGE_KEY = 'adhdtracker:tasks';

export function exportBackup() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return {
      app: 'adhdtracker',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: raw == null ? [] : JSON.parse(raw),
    };
  } catch {
    // Corrupt entry — back up as empty rather than fail.
    return { app: 'adhdtracker', version: 1, exportedAt: new Date().toISOString(), data: [] };
  }
}

export function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportBackup(), null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adhdtracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseBackup(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not an adhdTracker backup file');
  }
  if (!parsed || parsed.app !== 'adhdtracker' || !('data' in parsed)) {
    throw new Error('Not an adhdTracker backup file');
  }
  return parsed;
}

/**
 * Restores the task list. Returns the number of tasks written, or null when
 * the payload isn't an array (callers treat that as "nothing to restore").
 */
export function applyBackup(backup) {
  const tasks = backup?.data;
  if (!Array.isArray(tasks)) return null;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return tasks.length;
  } catch {
    // Storage unavailable — nothing we can do.
    return null;
  }
}
