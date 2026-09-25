import * as React from 'react';
import { todayStr, addDays } from '../tasksLogic.js';

export default function AddTaskForm({ onAdd, defaultDate, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [title, setTitle] = React.useState('');
  const [outcome, setOutcome] = React.useState('');
  const [date, setDate] = React.useState(defaultDate || todayStr());
  const [recurring, setRecurring] = React.useState(false);
  const [every, setEvery] = React.useState(1);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give the task a name.');
      return;
    }
    if (!outcome.trim()) {
      setError('Expected outcome is required — what will be true when this is done?');
      return;
    }
    onAdd({ title, expectedOutcome: outcome, date, recurring, every: Number(every) });
    setTitle('');
    setOutcome('');
    setError('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!open) {
    return (
      <button type="button" className="add-toggle" onClick={() => setOpen(true)}>
        {saved ? '✓ Added!' : '+ Add task'}
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <input
        className="form-input"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          setError('');
        }}
        placeholder="What needs doing?"
        aria-label="Task title"
        autoFocus
      />
      <textarea
        className="form-input outcome-input"
        value={outcome}
        onChange={(e) => {
          setOutcome(e.target.value);
          setError('');
        }}
        placeholder="Expected outcome — what will be true when this is done? Be concrete: not “work on website” but “deploy page live and open it in browser”."
        rows={2}
        aria-label="Expected outcome"
      />
      <div className="form-row">
        <label className="form-label">
          Date
          <input
            type="date"
            className="form-input date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={addDays(todayStr(), -30)}
          />
        </label>
        <label className="form-label checkbox-label">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          {' '}Repeats
        </label>
        {recurring && (
          <label className="form-label">
            every
            <input
              type="number"
              min="1"
              max="365"
              className="form-input every-input"
              value={every}
              onChange={(e) => setEvery(e.target.value)}
            />
            days
          </label>
        )}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn-primary">Add task</button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setOpen(false);
            setError('');
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
