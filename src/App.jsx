import * as React from 'react';
import useTasks from './useTasks.js';
import { bucketTasks, todayStr, addDays, prettyDate, computeStats } from './tasksLogic.js';
import TaskCard from './components/TaskCard.jsx';
import AddTaskForm from './components/AddTaskForm.jsx';
import Stats from './components/Stats.jsx';
import BackupRestore from './components/BackupRestore.jsx';
import AppNav from './components/AppNav.jsx';

const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'plan', label: 'Plan' },
  { id: 'stats', label: 'Progress' },
];

function VaultSyncSection({ tracker }) {
  const [url, setUrl] = React.useState('');
  const [code, setCode] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const joined = tracker.vaultInfo;
  const statusLabel = {
    idle: '',
    syncing: 'Syncing…',
    ok: 'Synced',
    error: `Sync problem (${tracker.vaultError})`,
  }[tracker.vaultStatus] || '';

  const join = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await tracker.joinVault(url, code);
      setUrl('');
      setCode('');
    } catch (err) {
      const msgs = {
        network: 'Could not reach the vault URL.',
        unauthorized: 'Wrong tracker code for that vault.',
        bad_url: 'The vault URL must start with https://',
        bad_code: 'Codes are 4-40 letters, digits or dashes.',
        bad_response: 'That URL is not a bureau vault.',
      };
      setError(msgs[err.code] || `Join failed (${err.code})`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="vault-zone" aria-label="Task sync">
      <h3 className="sub-title">Sync across devices</h3>
      <p className="hint-line">
        Optional: keep your tasks in sync between your own devices via your
        bureau-vault worker. Use a private tracker code — anyone with it can read
        and edit this task list.
      </p>
      {joined ? (
        <div className="vault-status-row">
          <span className={`vault-dot vault-${tracker.vaultStatus}`} aria-hidden="true" />
          <span>
            Syncing as <strong>{joined.code}</strong> · {statusLabel}
          </span>
          <button type="button" className="btn-secondary btn-small" onClick={tracker.leaveVault}>
            Stop syncing
          </button>
        </div>
      ) : (
        <form className="vault-form" onSubmit={join}>
          <input
            className="form-input"
            type="url"
            placeholder="Vault URL (https://…workers.dev)"
            aria-label="Vault URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          <input
            className="form-input"
            type="text"
            placeholder="Tracker code"
            aria-label="Tracker code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary" disabled={busy || !url.trim() || !code.trim()}>
            {busy ? 'Joining…' : 'Start syncing'}
          </button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  );
}

export default function App() {
  const tracker = useTasks();
  const { tasks, addTask, updateTask, deleteTask, completeTask } = tracker;
  const [view, setView] = React.useState('today');
  const today = todayStr();

  const buckets = React.useMemo(() => bucketTasks(tasks, today), [tasks, today]);
  const stats = React.useMemo(() => computeStats(tasks, today), [tasks, today]);

  const overdueCount = buckets.overdue.length;

  const moveTo = (id, date) => updateTask(id, { date });

  return (
    <div className="app">
      <AppNav current="https://jonnymexican.github.io/adhdTracker/" />
      <header className="app-header">
        <h1>adhdTracker</h1>
        <p className="tagline">No outcome, no checkmark.</p>
      </header>

      <nav className="tabs" role="tablist" aria-label="Views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            className={`tab ${view === v.id ? 'active' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
            {v.id === 'today' && overdueCount > 0 && (
              <span className="badge badge-overdue" title="Overdue tasks">{overdueCount}!</span>
            )}
          </button>
        ))}
      </nav>

      <main className="panel">
        {view === 'today' && (
          <>
            {overdueCount > 0 && (
              <section aria-label="Overdue">
                <h2 className="bucket-title overdue-title">Overdue</h2>
                <div className="task-list">
                  {buckets.overdue.map((task) => (
                    <div key={task.id} className="task-with-moves">
                      <TaskCard
                        task={task}
                        onComplete={completeTask}
                        onDelete={deleteTask}
                      />
                      <div className="move-buttons">
                        <button type="button" className="btn-move" onClick={() => moveTo(task.id, today)}>
                          → today
                        </button>
                        <button type="button" className="btn-move" onClick={() => moveTo(task.id, addDays(today, 1))}>
                          → tomorrow
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section aria-label="Today">
              <h2 className="bucket-title">{prettyDate(today)} — today</h2>
              {buckets.today.length === 0 ? (
                <p className="empty-state">
                  Nothing planned for today yet. What would make today a win?
                </p>
              ) : (
                <div className="task-list">
                  {buckets.today.map((task) => (
                    <TaskCard key={task.id} task={task} onComplete={completeTask} onDelete={deleteTask} />
                  ))}
                </div>
              )}
              <AddTaskForm onAdd={(t) => addTask({ ...t, date: t.date || today })} defaultDate={today} />
            </section>
            {buckets.done.length > 0 && (
              <section aria-label="Completed">
                <h2 className="bucket-title">Done</h2>
                <div className="task-list">
                  {buckets.done.map((task) => (
                    <TaskCard key={task.id} task={task} onComplete={completeTask} onDelete={deleteTask} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {view === 'tomorrow' && (
          <section aria-label="Tomorrow">
            <h2 className="bucket-title">{prettyDate(addDays(today, 1))} — tomorrow</h2>
            {buckets.tomorrow.length === 0 ? (
              <p className="empty-state">
                Tomorrow is a blank slate. Plan one or two wins — with concrete outcomes.
              </p>
            ) : (
              <div className="task-list">
                {buckets.tomorrow.map((task) => (
                  <TaskCard key={task.id} task={task} onComplete={completeTask} onDelete={deleteTask} />
                ))}
              </div>
            )}
            <AddTaskForm onAdd={(t) => addTask({ ...t, date: addDays(today, 1) })} defaultDate={addDays(today, 1)} />
          </section>
        )}

        {view === 'plan' && (
          <section aria-label="Plan ahead">
            <h2 className="bucket-title">Evening planning</h2>
            <div className="plan-intro">
              <p>
                Tonight's ritual: quick look at today, then set up tomorrow. Future-you
                wakes up to a plan with the finish line already drawn.
              </p>
            </div>

            <h3 className="sub-title">How did today go? ({buckets.today.length} planned)</h3>
            {buckets.today.length === 0 ? (
              <p className="empty-state">Nothing was planned for today — that's information too.</p>
            ) : (
              <div className="task-list">
                {buckets.today.map((task) => (
                  <TaskCard key={task.id} task={task} onComplete={completeTask} onDelete={deleteTask} />
                ))}
              </div>
            )}

            <h3 className="sub-title">Plan tomorrow</h3>
            {buckets.tomorrow.map((task) => (
              <div key={task.id} className="task-list">
                <TaskCard task={task} onComplete={completeTask} onDelete={deleteTask} />
              </div>
            ))}
            <AddTaskForm onAdd={(t) => addTask({ ...t, date: addDays(today, 1) })} defaultDate={addDays(today, 1)} defaultOpen />

            {buckets.upcoming.length > 0 && (
              <>
                <h3 className="sub-title">Later</h3>
                <div className="task-list">
                  {buckets.upcoming.map((task) => (
                    <div key={task.id} className="task-with-moves">
                      <TaskCard task={task} onComplete={completeTask} onDelete={deleteTask} />
                      <div className="move-buttons">
                        <button type="button" className="btn-move" onClick={() => moveTo(task.id, addDays(today, 1))}>
                          → tomorrow
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {view === 'stats' && (
          <section aria-label="Progress">
            <h2 className="bucket-title">Progress</h2>
            <Stats stats={stats} />
            {stats.reflected > 0 && (
              <div className="reflection-summary">
                <h3 className="sub-title">Expectation check-ins</h3>
                <p>
                  <span className="met-yes">✓ nailed it: {stats.met}</span>{' '}
                  <span className="met-partial">〜 partial: {stats.partially}</span>{' '}
                  <span className="met-no">✗ not this time: {stats.missed}</span>
                </p>
                <p className="hint-line">
                  Partial and missed aren't failures — they're calibration data for how
                  you scope outcomes.
                </p>
              </div>
            )}

            <section className="data-vault" aria-label="Backup and restore">
              <h3 className="sub-title">Data vault</h3>
              <p className="hint-line">
                Your tasks live only in this browser. Download a backup file now and
                then; importing one replaces the current list.
              </p>
              <BackupRestore onRestored={() => window.location.reload()} />
            </section>

            <VaultSyncSection tracker={tracker} />
          </section>
        )}
      </main>

      <footer className="app-footer">
        Everything stays on this device.
      </footer>
    </div>
  );
}
