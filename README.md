# adhdTracker

A task tracker built around one rule: **no outcome, no checkmark.**

Every task must declare an *expected outcome* — concrete, checkable evidence of "done". When you finish, you can't just tick the box: you answer whether it happened the way you expected (nailed it / partially / not this time) and optionally note what actually happened. Over time this builds calibration: how often do your plans match your reality?

## Why

Vague tasks ("work on website") are where ADHD plans go to die. Forcing an explicit outcome up front:

- turns fuzzy intentions into a finish line you can actually see,
- makes "done" a fact, not a feeling,
- and the reflection log shows whether you over- or under-scope, so planning improves.

## Features

- **Dated tasks** — plan for today, tomorrow (evening "Plan" view), or any future day; overdue tasks get their own bucket with one-click rescheduling.
- **Required expected outcome** — the add form refuses to save without one.
- **Completion gate** — "Done?" opens a check-in: pick nailed/partial/missed, optionally note what happened. Only then is the task checked off.
- **Recurring tasks** — daily meds, weekly review, anything with an interval; instances materialize on their due day.
- **Progress** — day streak, total completions, % of expectations met, and a 7-day bar chart.
- **Private by design** — everything stays in your browser's localStorage. No accounts, no server.

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
npm test           # logic tests (bucketing, streaks, recurrence)
npm run build      # production build to dist/ — deployable to GitHub Pages
```

## Stack

React 19 + Vite, plain CSS, zero runtime dependencies beyond React. Task logic lives in a pure module (`src/tasksLogic.js`) covered by unit tests.
