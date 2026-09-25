// Pure logic for adhdTracker — no React, fully unit-testable.

export function todayStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return todayStr(date);
}

export function prettyDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Bucket tasks relative to a reference day.
 * - today: due today, not done
 * - tomorrow: due tomorrow, not done
 * - upcoming: due later, not done
 * - overdue: due before today, not done
 * - done: completed (any date)
 */
export function bucketTasks(tasks, referenceDay = todayStr()) {
  const buckets = { today: [], tomorrow: [], upcoming: [], overdue: [], done: [] };
  const tomorrow = addDays(referenceDay, 1);

  for (const task of tasks) {
    if (task.done) {
      buckets.done.push(task);
    } else if (task.date === referenceDay) {
      buckets.today.push(task);
    } else if (task.date === tomorrow) {
      buckets.tomorrow.push(task);
    } else if (task.date < referenceDay) {
      buckets.overdue.push(task);
    } else {
      buckets.upcoming.push(task);
    }
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => a.createdAt - b.createdAt);
  }
  return buckets;
}

/**
 * Generate instances of recurring tasks that should exist on `day`
 * but don't yet. A recurrence is due when `day >= nextDue`.
 */
export function generateDueRecurrences(tasks, day, existingTasks) {
  const existingKeys = new Set(
    existingTasks.filter((t) => !t.done).map((t) => `${t.recurrenceOf}|${t.date}`)
  );
  const generated = [];

  for (const template of tasks) {
    if (!template.recurring || template.done) continue;
    const nextDue = template.nextDue || template.date;
    if (day >= nextDue && !existingKeys.has(`${template.id}|${nextDue}`)) {
      generated.push({
        title: template.title,
        expectedOutcome: template.expectedOutcome,
        date: nextDue,
        createdAt: Date.now(),
        done: false,
        recurrenceOf: template.id,
        reflection: null,
      });
    }
  }
  return generated;
}

export function advanceRecurrence(template, completedOnDate) {
  if (!template.recurring) return null;
  const every = template.every || 1;
  return { ...template, nextDue: addDays(completedOnDate, every) };
}

/**
 * Stats over completed tasks: streak of days with ≥1 completion,
 * how often the reflection confirmed the expectation was met.
 */
export function computeStats(tasks, referenceDay = todayStr()) {
  const done = tasks.filter((t) => t.done);
  const doneDays = new Set(done.map((t) => t.completedOn).filter(Boolean));

  // Current streak: walk backwards from today (or yesterday if today has none yet —
  // today still has time). Streak counts consecutive days with ≥1 completion.
  let streak = 0;
  let cursor = doneDays.has(referenceDay) ? referenceDay : addDays(referenceDay, -1);
  while (doneDays.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const met = done.filter((t) => t.reflection?.met === true).length;
  const partially = done.filter((t) => t.reflection?.met === 'partial').length;
  const missed = done.filter((t) => t.reflection?.met === false).length;
  const reflected = met + partially + missed;

  const last7 = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(referenceDay, -i);
    last7.unshift({
      day,
      completed: done.filter((t) => t.completedOn === day).length,
    });
  }

  return {
    streak,
    totalCompleted: done.length,
    met,
    partially,
    missed,
    reflected,
    expectationRate: reflected > 0 ? Math.round((met / reflected) * 100) : null,
    last7,
  };
}
