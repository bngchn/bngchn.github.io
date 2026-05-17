/**
 * store.js
 * 앱의 단일 진실 공급원(Single Source of Truth).
 * - 상태 보관 (tasks, theme)
 * - localStorage 동기화
 * - 구독/통보 (옵저버 패턴)
 */

import { createTask } from './task.js';

const KEY_TASKS = 'myday.tasks';
const KEY_THEME = 'myday.theme';

const state = {
  tasks: [],
  theme: 'light',
};

const subscribers = new Set();

/* ── 초기화 ───────────────────────────────── */

/**
 * localStorage에서 상태를 읽어 메모리에 적재한다.
 * 앱 부팅 시 1회 호출.
 */
export function load() {
  state.tasks = readTasks();
  state.theme = readTheme();
}

/* ── 조회 ─────────────────────────────────── */

export function getState() {
  // 외부에서 직접 변형하지 못하도록 얕은 복사로 반환
  return {
    tasks: [...state.tasks],
    theme: state.theme,
  };
}

export function getTasks() {
  return [...state.tasks];
}

export function getTaskById(id) {
  return state.tasks.find((t) => t.id === id) || null;
}

/* ── 변경 (Task) ──────────────────────────── */

export function addTask(input) {
  const task = createTask(input);
  state.tasks = [task, ...state.tasks];
  persistTasks();
  notify();
  return task;
}

export function updateTask(id, patch = {}) {
  const idx = state.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;

  const merged = createTask({ ...state.tasks[idx], ...patch, id });
  const next = [...state.tasks];
  next[idx] = merged;
  state.tasks = next;
  persistTasks();
  notify();
  return merged;
}

export function removeTask(id) {
  const before = state.tasks.length;
  state.tasks = state.tasks.filter((t) => t.id !== id);
  if (state.tasks.length === before) return false;
  persistTasks();
  notify();
  return true;
}

export function toggleDone(id) {
  const task = getTaskById(id);
  if (!task) return null;
  return updateTask(id, { done: !task.done });
}

export function clearDone() {
  const before = state.tasks.length;
  state.tasks = state.tasks.filter((t) => !t.done);
  if (state.tasks.length === before) return 0;
  persistTasks();
  notify();
  return before - state.tasks.length;
}

/* ── 변경 (Theme) ─────────────────────────── */

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  state.theme = theme;
  try {
    localStorage.setItem(KEY_THEME, theme);
  } catch (err) {
    console.warn('테마 저장 실패:', err);
  }
  notify();
}

/* ── 구독 ─────────────────────────────────── */

/**
 * 상태 변경 시 호출될 함수를 등록한다.
 * @param {(state) => void} fn
 * @returns {() => void} unsubscribe 함수
 */
export function subscribe(fn) {
  if (typeof fn !== 'function') return () => {};
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify() {
  const snapshot = getState();
  subscribers.forEach((fn) => {
    try {
      fn(snapshot);
    } catch (err) {
      console.error('subscriber 실행 실패:', err);
    }
  });
}

/* ── localStorage I/O ─────────────────────── */

function readTasks() {
  try {
    const raw = localStorage.getItem(KEY_TASKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 저장된 데이터를 createTask로 정규화 (스키마 변경 대비)
    return parsed.map((t) => createTask(t));
  } catch (err) {
    console.warn('저장된 할 일을 불러오지 못했습니다:', err);
    return [];
  }
}

function readTheme() {
  try {
    const saved = localStorage.getItem(KEY_THEME);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (err) {
    // ignore
  }
  // 시스템 설정 감지
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
}

function persistTasks() {
  try {
    localStorage.setItem(KEY_TASKS, JSON.stringify(state.tasks));
  } catch (err) {
    console.error('할 일 저장 실패 (용량 초과 가능):', err);
    alert('저장 공간이 부족합니다. 완료된 할 일을 정리해 주세요.');
  }
}
