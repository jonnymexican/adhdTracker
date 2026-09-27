import * as React from 'react';
import { downloadBackup, parseBackup, applyBackup } from '../backup.js';

const STATUS_DURATION = 4000;

export default function BackupRestore({ onRestored }) {
  const [status, setStatus] = React.useState(null); // { tone: 'ok' | 'error', text }
  const inputRef = React.useRef(null);
  const timerRef = React.useRef(null);

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  const flash = (tone, text) => {
    setStatus({ tone, text });
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), STATUS_DURATION);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    try {
      const restored = applyBackup(parseBackup(await file.text()));
      if (restored == null) {
        flash('error', 'That backup has no restorable task list.');
        return;
      }
      flash('ok', `Restored ${restored} task${restored === 1 ? '' : 's'}.`);
      onRestored?.();
    } catch (err) {
      flash(
        'error',
        err?.message === 'Not an adhdTracker backup file'
          ? 'That file is not an adhdTracker backup.'
          : 'Import failed — could not read that file.'
      );
    }
  };

  return (
    <div className="backup-restore">
      <button type="button" className="btn-secondary" onClick={downloadBackup}>
        Export backup
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => inputRef.current?.click()}
      >
        Import backup
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={handleImport}
      />
      {status && (
        <p
          className={`backup-status ${status.tone === 'error' ? 'backup-status-error' : ''}`}
          role="status"
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
