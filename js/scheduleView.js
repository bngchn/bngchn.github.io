/**
 * scheduleView.js
 * 좌측 일정표 패널 (월간 캘린더 + 선택 날짜 일정 리스트).
 *
 * - 캘린더 셀: 날짜 + 중요도별 점(최대 3개)
 * - 셀 클릭 → 선택 날짜 변경 + 다른 달이면 그 달로 이동
 * - 일정 카드 클릭 → 원본 Todo의 편집 모달 열기 (단일 입력 채널)
 */

import * as store from './store.js';
import * as modal from './modal.js';
import { getTasksOnDate } from './task.js';

const MAX_DOTS = 3;
const CALENDAR_CELLS = 42; // 6주 × 7일

let gridEl = null;
let labelEl = null;
let prevBtn = null;
let nextBtn = null;
let listEl = null;
let listEmptyEl = null;
let selectedLabelEl = null;

const viewState = {
  year: 0,
  month: 0, // 0-indexed
  selected: '',
};

/* ── 초기화 / 렌더 ────────────────────────── */

export function init() {
  gridEl = document.getElementById('calendar-grid');
  labelEl = document.getElementById('calendar-label');
  prevBtn = document.getElementById('calendar-prev');
  nextBtn = document.getElementById('calendar-next');
  listEl = document.getElementById('today-list');
  listEmptyEl = document.getElementById('today-list-empty');
  selectedLabelEl = document.getElementById('selected-date-label');

  if (!gridEl) return;

  const today = new Date();
  viewState.year = today.getFullYear();
  viewState.month = today.getMonth();
  viewState.selected = formatDate(today);

  bindEvents();
}

export function render(state) {
  if (!gridEl) return;
  renderCalendar(state.tasks);
  renderSelectedList(state.tasks);
}

/* ── 캘린더 ───────────────────────────────── */

function renderCalendar(tasks) {
  if (labelEl) {
    labelEl.textContent = `${viewState.year}년 ${viewState.month + 1}월`;
  }

  const cells = getCalendarRange(viewState.year, viewState.month);
  const todayStr = formatDate(new Date());

  const frag = document.createDocumentFragment();
  for (const cell of cells) {
    frag.appendChild(buildCell(cell, tasks, todayStr));
  }
  gridEl.replaceChildren(frag);
}

function buildCell(cell, tasks, todayStr) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'calendar__cell';
  btn.dataset.date = cell.date;
  btn.setAttribute('role', 'gridcell');
  btn.setAttribute('aria-label', formatAriaDate(cell.date));

  if (!cell.isCurrentMonth) btn.classList.add('is-other-month');
  if (cell.date === todayStr) btn.classList.add('is-today');
  if (cell.date === viewState.selected) {
    btn.classList.add('is-selected');
    btn.setAttribute('aria-selected', 'true');
  } else {
    btn.setAttribute('aria-selected', 'false');
  }

  const num = document.createElement('span');
  num.textContent = String(cell.day);
  btn.appendChild(num);

  const tasksOnDate = getTasksOnDate(tasks, cell.date);
  if (tasksOnDate.length > 0) {
    btn.appendChild(buildDots(tasksOnDate));
  }

  return btn;
}

function buildDots(tasksOnDate) {
  const dots = document.createElement('div');
  dots.className = 'calendar__dots';
  dots.setAttribute('aria-hidden', 'true');

  const sample = tasksOnDate.slice(0, MAX_DOTS);
  for (const t of sample) {
    const d = document.createElement('span');
    d.className = `calendar__dot calendar__dot--${t.priority}`;
    dots.appendChild(d);
  }
  return dots;
}

/* ── 선택 날짜 일정 리스트 ───────────────── */

function renderSelectedList(tasks) {
  if (!listEl) return;

  updateSelectedLabel();

  const items = sortByTime(getTasksOnDate(tasks, viewState.selected));

  if (items.length === 0) {
    listEl.replaceChildren();
    if (listEmptyEl) listEmptyEl.hidden = false;
    return;
  }
  if (listEmptyEl) listEmptyEl.hidden = true;

  const frag = document.createDocumentFragment();
  for (const t of items) {
    frag.appendChild(buildScheduleCard(t));
  }
  listEl.replaceChildren(frag);
}

function buildScheduleCard(task) {
  const li = document.createElement('li');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `schedule-card schedule-card--${task.priority}`;
  if (task.done) btn.classList.add('is-done');
  btn.dataset.id = task.id;
  btn.setAttribute('aria-label', `${task.title} - 수정하기`);

  const time = document.createElement('span');
  time.className = 'schedule-card__time';
  time.textContent = task.time || '종일';
  btn.appendChild(time);

  const title = document.createElement('span');
  title.className = 'schedule-card__title';
  title.textContent = task.title;
  btn.appendChild(title);

  li.appendChild(btn);
  return li;
}

function updateSelectedLabel() {
  if (!selectedLabelEl) return;
  const todayStr = formatDate(new Date());
  if (viewState.selected === todayStr) {
    selectedLabelEl.textContent = '오늘 일정';
    return;
  }
  const [, m, d] = viewState.selected.split('-');
  selectedLabelEl.textContent = `${parseInt(m, 10)}월 ${parseInt(d, 10)}일 일정`;
}

/* ── 이벤트 바인딩 ────────────────────────── */

function bindEvents() {
  if (prevBtn) prevBtn.addEventListener('click', () => moveMonth(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => moveMonth(1));

  gridEl.addEventListener('click', (event) => {
    const cell = event.target.closest('[data-date]');
    if (!cell) return;
    selectDate(cell.dataset.date);
  });

  if (listEl) {
    listEl.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-id]');
      if (!btn) return;
      const task = store.getTaskById(btn.dataset.id);
      if (task) modal.open(task);
    });
  }
}

function moveMonth(delta) {
  let m = viewState.month + delta;
  let y = viewState.year;
  if (m < 0) {
    m = 11;
    y--;
  } else if (m > 11) {
    m = 0;
    y++;
  }
  viewState.year = y;
  viewState.month = m;
  rerender();
}

function selectDate(dateStr) {
  viewState.selected = dateStr;

  // 다른 달의 셀을 클릭한 경우 그 달로 이동
  const [y, m] = dateStr.split('-').map(Number);
  if (y !== viewState.year || m - 1 !== viewState.month) {
    viewState.year = y;
    viewState.month = m - 1;
  }
  rerender();
}

function rerender() {
  render(store.getState());
}

/* ── 날짜 유틸 ────────────────────────────── */

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatAriaDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/**
 * 해당 월의 캘린더에 표시할 42개 셀(이전·다음 달 포함)을 반환.
 */
function getCalendarRange(year, month) {
  const firstDay = new Date(year, month, 1);
  const offset = firstDay.getDay(); // 0(일) ~ 6(토)

  const cells = [];
  for (let i = 0; i < CALENDAR_CELLS; i++) {
    const d = new Date(year, month, 1 - offset + i);
    cells.push({
      date: formatDate(d),
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
    });
  }
  return cells;
}

function sortByTime(tasks) {
  return [...tasks].sort((a, b) => {
    const at = a.time || '99:99';
    const bt = b.time || '99:99';
    return at.localeCompare(bt);
  });
}
