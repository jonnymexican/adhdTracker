// Full-app smoke test: renders the real App and clicks through the core
// flows the way a user would. A failure here blocks the Pages deploy.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import App from './App.jsx';

const readTasks = () => {
  try {
    return JSON.parse(window.localStorage.getItem('adhdtracker:tasks') || '[]');
  } catch {
    return [];
  }
};

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('adhdTracker smoke: core flows', () => {
  it('adds a task with its expected outcome and persists it', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));
    fireEvent.change(screen.getByLabelText('Task title'), {
      target: { value: 'Smoke test the fleet' },
    });
    fireEvent.change(screen.getByLabelText('Expected outcome'), {
      target: { value: 'All flows pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));

    const tasks = readTasks();
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe('Smoke test the fleet');
    expect(tasks[0].expectedOutcome).toBe('All flows pass');
    expect(tasks[0].done).toBe(false);

    // The card shows the outcome, not just the title.
    expect(screen.getByText(/all flows pass/i)).toBeTruthy();
  });

  it('refuses to check off a task without a reflection ("no outcome, no checkmark")', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Reflect first' } });
    fireEvent.change(screen.getByLabelText('Expected outcome'), { target: { value: 'Honesty' } });
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));

    // Open the reflection panel.
    fireEvent.click(screen.getByRole('button', { name: 'Done?' }));

    // Check it off stays disabled until a result is chosen.
    const checkBtn = screen.getByRole('button', { name: /check it off/i });
    expect(checkBtn.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /nailed it/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /check it off/i }).disabled).toBe(false));

    fireEvent.click(checkBtn);
    await waitFor(() => expect(readTasks()[0].done).toBe(true));
    expect(readTasks()[0].reflection.met).toBe(true);
  });

  it('deletes a task from the card', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /\+ add task/i }));
    fireEvent.change(screen.getByLabelText('Task title'), { target: { value: 'Ephemeral' } });
    fireEvent.change(screen.getByLabelText('Expected outcome'), { target: { value: 'Gone' } });
    fireEvent.click(screen.getByRole('button', { name: /^add task$/i }));
    expect(readTasks()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /delete task: ephemeral/i }));

    expect(readTasks()).toHaveLength(0);
  });

  it('shows the progress view with stats', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /progress/i }));
    expect(screen.getByRole('region', { name: /progress stats/i })).toBeTruthy();
    // Data vault is present.
    expect(screen.getByRole('button', { name: /export backup/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /import backup/i })).toBeTruthy();
  });
});
