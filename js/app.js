/**
 * app.js
 * 앱의 진입점. 부팅 순서:
 *   1) store.load() — localStorage에서 상태 복원
 *   2) 테마 적용 + 헤더 오늘 날짜 표시
 *   3) 모듈 초기화 (modal / todoView / scheduleView)
 *   4) 추가 버튼 + 테마 토글 + 모바일 탭 바인딩
 *   5) 초기 렌더 + store 구독 (renderAll)
 */

import * as store from './store.js';
import * as task from './task.js';
import * as modal from './modal.js';
import * as todoView from './todoView.js';
import * as scheduleView from './scheduleView.js';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function init() {
  store.load();
  applyTheme(store.getState().theme);
  renderTodayDisplay();
  bindThemeToggle();
  bindMobileTabs();

  modal.init();
  todoView.init();
  scheduleView.init();
  bindAddButtons();

  // 초기 렌더 + 이후 상태 변경 구독
  const renderAll = (state) => {
    todoView.render(state);
    scheduleView.render(state);
  };
  renderAll(store.getState());
  store.subscribe(renderAll);

  exposeForDebug();
}

/* ── 추가 버튼 ────────────────────────────── */

function bindAddButtons() {
  const addBtn = document.getElementById('add-task-btn');
  const fab = document.getElementById('fab-add');

  const openAddModal = () => modal.open(null);

  if (addBtn) addBtn.addEventListener('click', openAddModal);
  if (fab) fab.addEventListener('click', openAddModal);
}

/* ── 헤더 ─────────────────────────────────── */

function renderTodayDisplay() {
  const el = document.getElementById('today-display');
  if (!el) return;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const weekday = WEEKDAY_KO[now.getDay()];

  el.textContent = `${yyyy}.${mm}.${dd} (${weekday})`;
  el.setAttribute('datetime', `${yyyy}-${mm}-${dd}`);
}

/* ── 테마 ─────────────────────────────────── */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    const lightIcon = toggle.querySelector('[data-theme-icon="light"]');
    const darkIcon = toggle.querySelector('[data-theme-icon="dark"]');
    if (lightIcon && darkIcon) {
      lightIcon.hidden = theme === 'dark';
      darkIcon.hidden = theme !== 'dark';
    }
  }
}

function bindThemeToggle() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const current = store.getState().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    store.setTheme(next);
    applyTheme(next);
  });
}

/* ── 모바일 탭 ────────────────────────────── */

function bindMobileTabs() {
  const tabs = document.querySelectorAll('.mobile-tabs__tab');
  if (tabs.length === 0) return;

  // 초기: schedule 탭 활성
  setActiveTab('schedule');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      if (target) setActiveTab(target);
    });
  });
}

function setActiveTab(name) {
  document.querySelectorAll('.mobile-tabs__tab').forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  document.querySelectorAll('[data-tab-panel]').forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.tabPanel === name);
  });
}

/* ── 디버그 노출 (스터디용) ──────────────── */

function exposeForDebug() {
  // 콘솔에서 store.addTask({title:'test'}) 등으로 확인 가능
  window.store = store;
  window.task = task;
  window.modal = modal;
  window.todoView = todoView;
  window.scheduleView = scheduleView;
}

/* ── 시작 ─────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
