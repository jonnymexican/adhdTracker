import * as React from 'react';
import { prettyDate } from '../tasksLogic.js';

export default function TaskCard({ task, onComplete, onDelete, defaultOpen = false }) {
  const [showComplete, setShowComplete] = React.useState(defaultOpen);
  const [met, setMet] = React.useState(null);
  const [note, setNote] = React.useState('');

  const submit = (event) => {
    event.preventDefault();
    if (met == null) return;
    onComplete(task.id, { met, note });
  };

  const metOptions = [
    { value: true, label: '✓ Nailed it' },
    { value: 'partial', label: '〜 Partially' },
    { value: false, label: '✗ Not this time' },
  ];

  return (
    <article className={`task-card ${task.done ? 'is-done' : ''} ${showComplete ? 'is-completing' : ''}`}>
      <div className="task-main">
        <div className="task-text">
          <h3 className="task-title">{task.title}</h3>
          <p className="task-outcome">
            <span className="outcome-label">Expected outcome:</span> {task.expectedOutcome}
          </p>
          <p className="task-meta">
            {prettyDate(task.date)}
            {task.recurring && <span className="task-recur"> ↻ every {task.every}d</span>}
          </p>
          {task.done && task.reflection && (
            <p className="task-reflection">
              <span className={
                task.reflection.met === true ? 'met-yes' :
                task.reflection.met === 'partial' ? 'met-partial' : 'met-no'
              }>
                {task.reflection.met === true ? '✓ nailed it' : task.reflection.met === 'partial' ? '〜 partial' : '✗ not this time'}
              </span>
              {task.reflection.note && <span> — “{task.reflection.note}”</span>}
            </p>
          )}
        </div>
        {!task.done && (
          <div className="task-actions">
            <button
              type="button"
              className="btn-complete"
              onClick={() => setShowComplete((v) => !v)}
              aria-expanded={showComplete}
              title="Mark complete — check your expected outcome first"
            >
              Done?
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => onDelete(task.id)}
              aria-label={`Delete task: ${task.title}`}
              title="Delete task"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {showComplete && !task.done && (
        <form className="complete-form" onSubmit={submit}>
          <p className="complete-prompt">
            Did it happen the way you expected?
            <br />
            <span className="complete-expectation">“{task.expectedOutcome}”</span>
          </p>
          <div className="met-options" role="group" aria-label="How did it go?">
            {metOptions.map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                className={`met-option ${met === opt.value ? 'selected' : ''}`}
                onClick={() => setMet(opt.value)}
                aria-pressed={met === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            className="reflection-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What actually happened? (optional, but future-you will thank you)"
            rows={2}
            aria-label="Reflection note"
          />
          <button type="submit" className="btn-confirm" disabled={met == null}>
            Check it off
          </button>
        </form>
      )}
    </article>
  );
}
