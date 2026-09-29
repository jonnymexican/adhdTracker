import { useCallback, useEffect, useRef, useState } from 'react';
import { todayStr, generateDueRecurrences, advanceRecurrence } from './tasksLogic.js';
import {
  loadVaultSettings,
  saveVaultSettings,
  clearVaultSettings,
  syncTasks,
  pushTasks,
} from './vaultSync.js';

const STORAGE_KEY = 'adhdtracker:tasks';
const TOMBS_KEY = 'adhdtracker:tombs';

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

function loadTombs() {
  try {
    const raw = window.localStorage.getItem(TOMBS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
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

  // ----- vault sync (all no-ops until a tracker code is joined) -----
  const [tombstones, setTombstones] = useState(loadTombs);
  const tasksRef = useRef(tasks);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  const tombsRef = useRef(tombstones);
  useEffect(() => {
    tombsRef.current = tombstones;
    try {
      window.localStorage.setItem(TOMBS_KEY, JSON.stringify(tombstones));
    } catch {
      // ignore
    }
  }, [tombstones]);

  const vaultRef = useRef(loadVaultSettings());
  const vaultV = useRef(0);
  const vaultBusy = useRef(false);
  const [vaultStatus, setVaultStatus] = useState('idle');
  const [vaultError, setVaultError] = useState('');

  const getState = useCallback(
    () => ({ tasks: tasksRef.current, tombstones: tombsRef.current }),
    []
  );
  const setState = useCallback((next) => {
    setTasks(next.tasks || []);
    if (Array.isArray(next.tombstones)) setTombstones(next.tombstones);
  }, []);

  const recordTombstones = useCallback((ids) => {
    const now = Date.now();
    setTombstones((current) => [
      ...current.filter((t) => !ids.includes(t.id)),
      ...ids.map((id) => ({ id, deletedAt: now })),
    ]);
  }, []);

  useEffect(() => {
    if (!vaultRef.current) return undefined;
    let alive = true;
    const run = async () => {
      if (vaultBusy.current) return;
      vaultBusy.current = true;
      setVaultStatus('syncing');
      try {
        const res = await syncTasks(vaultRef.current.url, vaultRef.current.code, getState, setState);
        if (!alive) return;
        vaultV.current = res.v;
        setVaultStatus('ok');
        setVaultError('');
      } catch (err) {
        if (!alive) return;
        setVaultStatus('error');
        setVaultError(err.code || 'network');
      } finally {
        vaultBusy.current = false;
      }
    };
    run();
    const timer = setInterval(run, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [getState, setState]);

  const pushTimer = useRef(null);
  const queueVaultPush = useCallback(() => {
    if (!vaultRef.current || vaultBusy.current) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      vaultBusy.current = true;
      setVaultStatus('syncing');
      try {
        const res = await pushTasks(
          vaultRef.current.url,
          vaultRef.current.code,
          vaultV.current,
          getState,
          setState
        );
        vaultV.current = res.v;
        setVaultStatus('ok');
        setVaultError('');
      } catch (err) {
        setVaultStatus('error');
        setVaultError(err.code || 'network');
      } finally {
        vaultBusy.current = false;
      }
    }, 1200);
  }, [getState, setState]);

  const joinVault = useCallback(
    async (url, code) => {
      const saved = { url: url.trim().replace(/\/+$/, ''), code: code.trim() };
      vaultRef.current = saved;
      let res;
      try {
        res = await syncTasks(saved.url, saved.code, getState, setState);
      } catch (err) {
        if (err.code === 'unknown_bureau') {
          // Fresh tracker code: create it from this device's list.
          const pushed = await pushTasks(saved.url, saved.code, 0, getState, setState);
          res = { v: pushed.v };
        } else {
          vaultRef.current = null;
          throw err;
        }
      }
      vaultV.current = res.v;
      saveVaultSettings(saved);
      setVaultStatus('ok');
      setVaultError('');
      return res;
    },
    [getState, setState]
  );

  const leaveVault = useCallback(() => {
    clearVaultSettings();
    vaultRef.current = null;
    vaultV.current = 0;
    setVaultStatus('idle');
    setVaultError('');
  }, []);

  const vaultInfo = vaultRef.current ? { ...vaultRef.current } : null;

  const addTask = ({ title, expectedOutcome, date, recurring, every }) => {
    if (!title.trim() || !expectedOutcome.trim()) return false;
    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `t-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: title.trim(),
        expectedOutcome: expectedOutcome.trim(),
        date,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        done: false,
        reflection: null,
        recurring: Boolean(recurring),
        every: every || 1,
        nextDue: recurring ? date : null,
        recurrenceOf: recurring ? null : undefined,
      },
    ]);
    queueVaultPush();
    return true;
  };

  const updateTask = (id, patch) =>
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t))
    );

  const deleteTask = (id) => {
    setTasks((current) => current.filter((t) => t.id !== id));
    recordTombstones([id]);
    queueVaultPush();
  };

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
            updatedAt: Date.now(),
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
    queueVaultPush();
  };

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    vaultInfo,
    vaultStatus,
    vaultError,
    joinVault,
    leaveVault,
  };
}
