/**
 * modal.js
 * 추가/수정 모달의 열기·닫기·폼 처리.
 * - <dialog> 네이티브 사용 (showModal / close)
 * - 추가/수정은 hidden id 필드 유무로 분기
 * - 검증 실패 시 폼 닫히지 않고 인라인 에러 표시
 */

import * as store from './store.js';
import { validateTask } from './task.js';

let dialogEl = null;
let formEl = null;
let titleEl = null;
let firstInputEl = null;
let lastFocusedTrigger = null;

/**
 * 모달 시스템 초기화. app.js 부팅 시 1회 호출.
 */
export function init() {
  dialogEl = document.getElementById('task-modal');
  if (!dialogEl) return;

  formEl = dialogEl.querySelector('#task-form');
  titleEl = dialogEl.querySelector('#modal-title');
  firstInputEl = dialogEl.querySelector('#field-title');

  bindFormSubmit();
  bindCloseTriggers();
  bindBackdropClick();
  bindCloseEvent();
}

/**
 * 모달을 연다.
 * @param {object|null} task - null/undefined면 추가 모드, 객체면 수정 모드
 */
export function open(task = null) {
  if (!dialogEl) return;

  lastFocusedTrigger = document.activeElement;

  resetForm();

  if (task) {
    titleEl.textContent = '할 일 수정';
    fillForm(task);
  } else {
    titleEl.textContent = '새 할 일 추가';
    prefillDefaults();
  }

  dialogEl.showModal();

  // showModal 직후 포커스를 첫 입력으로
  requestAnimationFrame(() => {
    firstInputEl?.focus();
  });
}

/**
 * 모달을 닫는다.
 */
export function close() {
  if (!dialogEl) return;
  if (dialogEl.open) dialogEl.close();
}

/* ── 폼 처리 ──────────────────────────────── */

function bindFormSubmit() {
  formEl.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSubmit();
  });
}

function handleSubmit() {
  clearErrors();

  const data = readForm();
  const { ok, errors } = validateTask(data);

  if (!ok) {
    showErrors(errors);
    focusFirstError(errors);
    return;
  }

  if (data.id) {
    store.updateTask(data.id, data);
  } else {
    store.addTask(data);
  }

  close();
}

function readForm() {
  const fd = new FormData(formEl);
  const id = (fd.get('id') || '').trim();
  return {
    id: id || undefined,
    title: fd.get('title') || '',
    date: fd.get('date') || null,
    time: fd.get('time') || null,
    priority: fd.get('priority') || 'normal',
    location: fd.get('location') || '',
    memo: fd.get('memo') || '',
  };
}

function fillForm(task) {
  formEl.elements.id.value = task.id || '';
  formEl.elements.title.value = task.title || '';
  formEl.elements.date.value = task.date || '';
  formEl.elements.time.value = task.time || '';
  const radio = formEl.querySelector(
    `input[name="priority"][value="${task.priority || 'normal'}"]`,
  );
  if (radio) radio.checked = true;
  formEl.elements.location.value = task.location || '';
  formEl.elements.memo.value = task.memo || '';
}

function resetForm() {
  formEl.reset();
  formEl.elements.id.value = '';
  clearErrors();
}

function prefillDefaults() {
  // 기본 중요도: 보통
  const normalRadio = formEl.querySelector('input[name="priority"][value="normal"]');
  if (normalRadio) normalRadio.checked = true;
}

/* ── 에러 표시 ────────────────────────────── */

function clearErrors() {
  formEl.querySelectorAll('[data-error-for]').forEach((el) => {
    el.textContent = '';
    el.hidden = true;
  });
  formEl.querySelectorAll('[aria-invalid="true"]').forEach((el) => {
    el.setAttribute('aria-invalid', 'false');
  });
}

function showErrors(errors) {
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = formEl.querySelector(`[data-error-for="${field}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
    const input = formEl.elements[field];
    if (input && input.setAttribute) {
      input.setAttribute('aria-invalid', 'true');
    }
  });
}

function focusFirstError(errors) {
  const firstField = Object.keys(errors)[0];
  if (!firstField) return;
  const input = formEl.elements[firstField];
  if (input && input.focus) input.focus();
}

/* ── 닫기 트리거 ──────────────────────────── */

function bindCloseTriggers() {
  dialogEl.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => close());
  });
}

function bindBackdropClick() {
  // <dialog> 클릭 이벤트는 모달 자체 영역 + 백드롭 모두 발생.
  // event.target === dialogEl 이면 백드롭 클릭으로 간주.
  dialogEl.addEventListener('click', (event) => {
    if (event.target === dialogEl) {
      close();
    }
  });
}

function bindCloseEvent() {
  // Esc 등 외부 요인으로 닫혔을 때 정리 + 트리거에 포커스 복귀
  dialogEl.addEventListener('close', () => {
    resetForm();
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }
    lastFocusedTrigger = null;
  });
}
