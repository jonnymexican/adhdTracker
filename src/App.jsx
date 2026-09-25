import * as React from 'react';
import useTasks from './useTasks.js';
import { bucketTasks, todayStr, addDays, prettyDate, computeStats } from './tasksLogic.js';
import TaskCard from './components/TaskCard.jsx';
import AddTaskForm from './components/AddTaskForm.jsx';
import Stats from './components/Stats.jsx';

const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: 'plan', label: 'Plan' },
  { id: 'stats', label: 'Progress' },
];

export default function App() {
  const { tasks, addTask, updateTask, deleteTask, completeTask } = useTasks();
  const [view, setView] = React.useState('today');
  const today = todayStr();

  const buckets = React.useMemo(() => bucketTasks(tasks, today), [tasks, today]);
  const stats = React.useMemo(() => computeStats(tasks, today), [tasks, today]);

  const overdueCount = buckets.overdue.length;

  const moveTo = (id, date) => updateTask(id, { date });

  return (
    <div className="app">
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
          </section>
        )}
      </main>

      <footer className="app-footer">
        Everything stays on this device.
      </footer>
    </div>
  );
}
