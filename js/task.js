/**
 * task.js
 * Task 객체의 생성, 검증, 정렬, 필터링을 담당하는 순수 함수 모음.
 * 외부 상태에 의존하지 않으며 store에서 import해 사용한다.
 */

export const PRIORITIES = ['low', 'normal', 'high'];

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

const TITLE_MAX = 80;
const LOCATION_MAX = 100;
const MEMO_MAX = 300;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

/**
 * 새 Task를 생성한다. id와 createdAt은 자동으로 채워진다.
 * @param {object} input
 * @returns {object} Task
 */
export function createTask(input = {}) {
  return {
    id: input.id || generateId(),
    title: (input.title || '').trim(),
    date: normalizeDate(input.date),
    time: normalizeTime(input.time),
    priority: PRIORITIES.includes(input.priority) ? input.priority : 'normal',
    location: (input.location || '').trim(),
    memo: (input.memo || '').trim(),
    done: Boolean(input.done),
    createdAt: input.createdAt || new Date().toISOString(),
  };
}

/**
 * Task 입력값을 검증한다.
 * @param {object} input
 * @returns {{ ok: boolean, errors: Record<string, string> }}
 */
export function validateTask(input = {}) {
  const errors = {};

  const title = (input.title || '').trim();
  if (title.length === 0) {
    errors.title = '제목을 입력해 주세요.';
  } else if (title.length > TITLE_MAX) {
    errors.title = `제목은 ${TITLE_MAX}자 이내로 입력해 주세요.`;
  }

  if (input.date != null && input.date !== '' && !DATE_PATTERN.test(input.date)) {
    errors.date = '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD).';
  }

  if (input.time != null && input.time !== '' && !TIME_PATTERN.test(input.time)) {
    errors.time = '시간 형식: HH:MM';
  }

  if (input.priority && !PRIORITIES.includes(input.priority)) {
    errors.priority = '잘못된 중요도 값입니다.';
  }

  if (input.location && input.location.length > LOCATION_MAX) {
    errors.location = `장소는 ${LOCATION_MAX}자 이내로 입력해 주세요.`;
  }

  if (input.memo && input.memo.length > MEMO_MAX) {
    errors.memo = `메모는 ${MEMO_MAX}자 이내로 입력해 주세요.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/**
 * Task 배열을 정렬한다 (원본 불변).
 * @param {object[]} tasks
 * @param {'createdAt'|'priority'|'date'} key
 * @returns {object[]}
 */
export function sortBy(tasks, key = 'createdAt') {
  const arr = [...tasks];

  if (key === 'priority') {
    arr.sort((a, b) => {
      const diff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (diff !== 0) return diff;
      return compareCreatedAtDesc(a, b);
    });
  } else if (key === 'date') {
    arr.sort((a, b) => {
      // 날짜 없는 항목은 뒤로
      if (!a.date && !b.date) return compareCreatedAtDesc(a, b);
      if (!a.date) return 1;
      if (!b.date) return -1;
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      const aTime = a.time || '99:99';
      const bTime = b.time || '99:99';
      return aTime.localeCompare(bTime);
    });
  } else {
    arr.sort(compareCreatedAtDesc);
  }

  return arr;
}

/**
 * Task 배열을 필터링한다.
 * @param {object[]} tasks
 * @param {object} opts
 * @param {'all'|'active'|'done'} [opts.status]
 * @param {'low'|'normal'|'high'} [opts.priority]
 * @param {string} [opts.date]  YYYY-MM-DD
 * @returns {object[]}
 */
export function filterBy(tasks, opts = {}) {
  return tasks.filter((task) => {
    if (opts.status === 'active' && task.done) return false;
    if (opts.status === 'done' && !task.done) return false;
    if (opts.priority && task.priority !== opts.priority) return false;
    if (opts.date && task.date !== opts.date) return false;
    return true;
  });
}

/**
 * 특정 날짜에 일정이 있는 Task만 반환 (캘린더 점 표시용).
 */
export function getTasksOnDate(tasks, date) {
  return tasks.filter((t) => t.date === date);
}

/* ── 내부 헬퍼 ────────────────────────────── */

function generateId() {
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `task_${Date.now()}_${random}`;
}

function normalizeDate(date) {
  if (!date) return null;
  return DATE_PATTERN.test(date) ? date : null;
}

function normalizeTime(time) {
  if (!time) return null;
  return TIME_PATTERN.test(time) ? time : null;
}

function compareCreatedAtDesc(a, b) {
  return b.createdAt.localeCompare(a.createdAt);
}
