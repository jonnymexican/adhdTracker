import { useEffect, useState } from 'react';
import { todayStr, generateDueRecurrences, advanceRecurrence } from './tasksLogic.js';

const STORAGE_KEY = 'adhdtracker:tasks';

function loadTasks() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function useTasks() {
  const [tasks, setTasks] = useState(loadTasks);
  const [recurrencesCaughtUp, setRecurrencesCaughtUp] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // storage unavailable — tasks stay in memory
    }
  }, [tasks]);

  // Materialize due recurring task instances once per mount.
  useEffect(() => {
    if (recurrencesCaughtUp) return;
    setTasks((current) => {
      const due = generateDueRecurrences(current, todayStr(), current);
      return due.length > 0 ? [...current, ...due] : current;
    });
    setRecurrencesCaughtUp(true);
  }, [recurrencesCaughtUp]);

  const addTask = ({ title, expectedOutcome, date, recurring, every }) => {
    if (!title.trim() || !expectedOutcome.trim()) return false;
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: title.trim(),
        expectedOutcome: expectedOutcome.trim(),
        date,
        createdAt: Date.now(),
        done: false,
        reflection: null,
        recurring: Boolean(recurring),
        every: every || 1,
        nextDue: recurring ? date : null,
        recurrenceOf: recurring ? null : undefined,
      },
    ]);
    return true;
  };

  const updateTask = (id, patch) =>
    setTasks((current) => current.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const deleteTask = (id) => setTasks((current) => current.filter((t) => t.id !== id));

  /**
   * The completion gate: a task can only be marked done by recording
   * how it went against the expected outcome.
   */
  const completeTask = (id, reflection) => {
    const day = todayStr();
    setTasks((current) => {
      const next = [];
      for (const task of current) {
        if (task.id === id) {
          next.push({
            ...task,
            done: true,
            completedOn: day,
            reflection: {
              met: reflection.met, // true | 'partial' | false
              note: reflection.note?.trim() || null,
            },
          });
          const advanced = advanceRecurrence(task, day);
          if (advanced) next.push(advanced);
        } else {
          next.push(task);
        }
      }
      return next;
    });
  };

  return { tasks, addTask, updateTask, deleteTask, completeTask };
}
