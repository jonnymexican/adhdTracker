import * as React from 'react';
import { prettyDate } from '../tasksLogic.js';

export default function Stats({ stats }) {
  const max = Math.max(1, ...stats.last7.map((d) => d.completed));

  return (
    <section className="stats" aria-label="Progress stats">
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.streak}</span>
          <span className="stat-label">day streak</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalCompleted}</span>
          <span className="stat-label">completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {stats.expectationRate != null ? `${stats.expectationRate}%` : '—'}
          </span>
          <span className="stat-label">expectations met</span>
        </div>
      </div>
      <div className="last7" role="img" aria-label={`Last 7 days: ${stats.last7.map((d) => `${d.day}: ${d.completed} completed`).join(', ')}`}>
        {stats.last7.map((d) => (
          <div key={d.day} className="day-col" title={`${prettyDate(d.day)}: ${d.completed} completed`}>
            <div
              className={`day-bar ${d.completed > 0 ? 'has-completions' : ''}`}
              style={{ height: `${Math.max(4, (d.completed / max) * 44)}px` }}
            />
            <span className="day-label">{prettyDate(d.day).split(',')[0]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
