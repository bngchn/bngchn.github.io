/**
 * todoView.js
 * Todo 리스트 렌더링 + 카드 액션 처리.
 * - 이벤트 위임으로 리스트 루트 하나에만 리스너 부착
 * - 모든 사용자 입력은 textContent로만 표시 (XSS 방어)
 */

import * as store from './store.js';
import * as modal from './modal.js';
import { filterBy, sortBy } from './task.js';

const PRIORITY_LABEL = { high: '높음', normal: '보통', low: '낮음' };
const PRIORITY_ICON = { high: '🔴', normal: '🟡', low: '🟢' };

const EMPTY_MESSAGES = {
  all: '할 일이 없어요. 새 할 일을 추가해 보세요.',
  active: '진행 중인 할 일이 없어요.',
  done: '완료된 할 일이 없어요.',
};

let rootEl = null;
let emptyEl = null;
let filterTabsEl = null;
let sortSelectEl = null;
let clearDoneBtn = null;

const localState = {
  status: 'all',
  sort: 'createdAt',
};

/**
 * 뷰 초기화. app.js 부팅 시 1회 호출.
 */
export function init() {
  rootEl = document.getElementById('todo-list');
  emptyEl = document.getElementById('todo-list-empty');
  filterTabsEl = document.querySelector('.filter-tabs');
  sortSelectEl = document.getElementById('sort-select');
  clearDoneBtn = document.getElementById('clear-done-btn');

  if (!rootEl) return;
  bindEvents();
  bindControls();
}

/**
 * state.tasks를 받아 필터/정렬을 적용해 리스트를 다시 그린다.
 * store 변경 시마다 호출된다 (idempotent).
 */
export function render(state) {
  if (!rootEl) return;

  const filtered = filterBy(state.tasks || [], { status: localState.status });
  const sorted = sortBy(filtered, localState.sort);

  if (sorted.length === 0) {
    rootEl.replaceChildren();
    setEmpty(true);
    return;
  }

  setEmpty(false);

  const frag = document.createDocumentFragment();
  for (const task of sorted) {
    frag.appendChild(buildCard(task));
  }
  rootEl.replaceChildren(frag);
}

/* ── 카드 생성 ────────────────────────────── */

function buildCard(task) {
  const li = document.createElement('li');
  li.className = `todo-card todo-card--${task.priority}`;
  if (task.done) li.classList.add('is-done');
  li.dataset.id = task.id;

  li.appendChild(buildCheckbox(task));
  li.appendChild(buildBody(task));
  li.appendChild(buildActions());

  return li;
}

function buildCheckbox(task) {
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo-card__checkbox';
  checkbox.checked = task.done;
  checkbox.dataset.action = 'toggle';
  checkbox.setAttribute('aria-label', `${task.title || '할 일'} 완료 표시`);
  return checkbox;
}

function buildBody(task) {
  const body = document.createElement('div');
  body.className = 'todo-card__body';

  const top = document.createElement('div');
  top.className = 'todo-card__top';

  const badge = document.createElement('span');
  badge.className = `priority-badge priority-badge--${task.priority}`;
  badge.textContent = `${PRIORITY_ICON[task.priority]} ${PRIORITY_LABEL[task.priority]}`;
  top.appendChild(badge);

  const title = document.createElement('span');
  title.className = 'todo-card__title';
  title.textContent = task.title;
  top.appendChild(title);

  body.appendChild(top);

  const meta = buildMeta(task);
  if (meta) body.appendChild(meta);

  return body;
}

function buildMeta(task) {
  const items = [];

  if (task.date) {
    const dateText = task.time ? `${task.date} ${task.time}` : task.date;
    items.push({ icon: '📅', text: dateText });
  } else {
    items.push({ icon: '📅', text: '날짜 미정' });
  }

  if (task.location) {
    items.push({ icon: '📍', text: task.location });
  }
  if (task.memo) {
    items.push({ icon: '📝', text: task.memo, isMemo: true });
  }

  if (items.length === 0) return null;

  const meta = document.createElement('div');
  meta.className = 'todo-card__meta';

  for (const { icon, text, isMemo } of items) {
    meta.appendChild(buildMetaItem(icon, text, isMemo));
  }
  return meta;
}

function buildMetaItem(icon, text, isMemo) {
  const row = document.createElement('div');
  row.className = 'todo-card__meta-item';
  if (isMemo) row.classList.add('todo-card__meta-item--memo');

  const iconEl = document.createElement('span');
  iconEl.className = 'todo-card__meta-icon';
  iconEl.setAttribute('aria-hidden', 'true');
  iconEl.textContent = icon;

  const textEl = document.createElement('span');
  textEl.textContent = text;

  row.appendChild(iconEl);
  row.appendChild(textEl);
  return row;
}

function buildActions() {
  const actions = document.createElement('div');
  actions.className = 'todo-card__actions';

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'todo-card__action';
  edit.dataset.action = 'edit';
  edit.textContent = '수정';
  actions.appendChild(edit);

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'todo-card__action todo-card__action--danger';
  del.dataset.action = 'delete';
  del.textContent = '삭제';
  actions.appendChild(del);

  return actions;
}

/* ── 이벤트 위임 ──────────────────────────── */

function bindEvents() {
  rootEl.addEventListener('click', handleClick);
  rootEl.addEventListener('change', handleChange);
}

function handleClick(event) {
  const trigger = event.target.closest('[data-action]');
  if (!trigger) return;
  if (trigger.dataset.action === 'toggle') return; // change 이벤트로 처리

  const card = trigger.closest('[data-id]');
  if (!card) return;
  const id = card.dataset.id;

  if (trigger.dataset.action === 'edit') {
    const task = store.getTaskById(id);
    if (task) modal.open(task);
    return;
  }

  if (trigger.dataset.action === 'delete') {
    const task = store.getTaskById(id);
    const label = task ? `"${task.title}"을(를)` : '이 할 일을';
    if (window.confirm(`${label} 삭제할까요?`)) {
      store.removeTask(id);
    }
  }
}

function handleChange(event) {
  const target = event.target;
  if (!target.dataset || target.dataset.action !== 'toggle') return;
  const card = target.closest('[data-id]');
  if (!card) return;
  store.toggleDone(card.dataset.id);
}

/* ── 필터 / 정렬 / 일괄삭제 컨트롤 ────────── */

function bindControls() {
  if (filterTabsEl) {
    filterTabsEl.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-filter]');
      if (!tab) return;
      setFilter(tab.dataset.filter);
    });
  }

  if (sortSelectEl) {
    sortSelectEl.addEventListener('change', () => {
      localState.sort = sortSelectEl.value;
      rerender();
    });
  }

  if (clearDoneBtn) {
    clearDoneBtn.addEventListener('click', handleClearDone);
  }
}

function setFilter(status) {
  if (!['all', 'active', 'done'].includes(status)) return;
  localState.status = status;

  if (filterTabsEl) {
    filterTabsEl.querySelectorAll('[data-filter]').forEach((tab) => {
      const active = tab.dataset.filter === status;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }
  rerender();
}

function handleClearDone() {
  const doneCount = store.getTasks().filter((t) => t.done).length;
  if (doneCount === 0) {
    window.alert('완료된 할 일이 없습니다.');
    return;
  }
  if (window.confirm(`완료된 할 일 ${doneCount}개를 삭제할까요?`)) {
    store.clearDone();
  }
}

function rerender() {
  render(store.getState());
}

/* ── 헬퍼 ─────────────────────────────────── */

function setEmpty(isEmpty) {
  if (!emptyEl) return;
  emptyEl.hidden = !isEmpty;
  if (isEmpty) {
    emptyEl.textContent = EMPTY_MESSAGES[localState.status] || EMPTY_MESSAGES.all;
  }
}
