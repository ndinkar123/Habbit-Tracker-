/*
 * todo.js — Lightweight to-do list, separate from habits.
 * Uses window.AppCore (defined in app.js) to reach shared state/helpers,
 * so load order (storage.js, icons.js, todo.js, bmi.js, app.js) doesn't
 * matter for correctness — these are only called after app.js has run.
 */
(function (global) {
  'use strict';

  const els = {};

  function cacheEls() {
    els.fabStack = document.getElementById('fabStack');
    els.fabAdd = document.getElementById('fabAddTodo');
    els.fabPending = document.getElementById('fabPendingTodo');
    els.fabPendingBadge = document.getElementById('fabPendingBadge');
    els.addTodoModal = document.getElementById('addTodoModal');
    els.addTodoInput = document.getElementById('addTodoInput');
    els.addTodoConfirm = document.getElementById('addTodoConfirm');
    els.addTodoCancel = document.getElementById('addTodoCancel');
    els.pendingModal = document.getElementById('pendingTodoModal');
    els.pendingClose = document.getElementById('pendingTodoClose');
    els.pendingList = document.getElementById('pendingTodoList');
    els.historyRow = document.getElementById('taskHistoryRow');
    els.historyModal = document.getElementById('taskHistoryModal');
    els.historyClose = document.getElementById('taskHistoryClose');
    els.historyList = document.getElementById('taskHistoryList');
    els.historyClear = document.getElementById('taskHistoryClear');
  }

  function pendingTodos() {
    const state = AppCore.getState();
    return (state.todos || []).filter(t => !t.done);
  }
  function completedTodos() {
    const state = AppCore.getState();
    return (state.todos || [])
      .filter(t => t.done)
      .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''));
  }

  function updateBadge() {
    const n = pendingTodos().length;
    if (n > 0) {
      els.fabPendingBadge.textContent = n > 99 ? '99+' : String(n);
      els.fabPendingBadge.style.display = 'flex';
    } else {
      els.fabPendingBadge.style.display = 'none';
    }
  }

  async function addTodo(text) {
    const trimmed = (text || '').trim().slice(0, 200);
    if (!trimmed) return;
    const state = AppCore.getState();
    if (!state.todos) state.todos = [];
    state.todos.push({
      id: AppCore.generateSafeId(),
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    });
    await AppCore.saveState();
    updateBadge();
    AppCore.showToast('✅ Task added');
  }

  async function toggleTodo(id) {
    const state = AppCore.getState();
    const t = (state.todos || []).find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? new Date().toISOString() : null;
    await AppCore.saveState();
    renderPendingList();
    updateBadge();
    if (t.done) AppCore.showToast('✅ Task completed');
  }

  async function deleteTodo(id) {
    const state = AppCore.getState();
    state.todos = (state.todos || []).filter(x => x.id !== id);
    await AppCore.saveState();
    renderPendingList();
    updateBadge();
  }

  async function clearHistory() {
    if (!confirm("Clear all completed task history? This can't be undone.")) return;
    const state = AppCore.getState();
    state.todos = (state.todos || []).filter(t => !t.done);
    await AppCore.saveState();
    renderHistoryList();
    AppCore.showToast('🗑️ History cleared');
  }

  function renderPendingList() {
    const list = els.pendingList;
    list.innerHTML = '';
    const items = pendingTodos();
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">No pending tasks — tap + to add one.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(t => {
      const row = document.createElement('div');
      row.className = 'todo-row';
      row.dataset.id = t.id;
      row.innerHTML =
        '<button type="button" class="todo-check" data-action="toggle" aria-label="Mark done"></button>' +
        '<span class="todo-text">' + AppCore.esc(t.text) + '</span>' +
        '<button type="button" class="todo-del" data-action="delete" aria-label="Delete">✕</button>';
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }

  function renderHistoryList() {
    const list = els.historyList;
    list.innerHTML = '';
    const items = completedTodos();
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">No completed tasks yet.</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach(t => {
      const row = document.createElement('div');
      row.className = 'history-row';
      const d = t.completedAt ? new Date(t.completedAt) : null;
      const dateStr = d ? (d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '';
      row.innerHTML =
        '<span class="history-text">' + AppCore.esc(t.text) + '</span>' +
        '<span class="history-date">' + AppCore.esc(dateStr) + '</span>';
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }

  function openAddModal() {
    els.addTodoInput.value = '';
    els.addTodoModal.classList.add('show');
    setTimeout(() => els.addTodoInput.focus(), 300);
  }
  function closeAddModal() { els.addTodoModal.classList.remove('show'); }
  function openPendingModal() { renderPendingList(); els.pendingModal.classList.add('show'); }
  function closePendingModal() { els.pendingModal.classList.remove('show'); }
  function openHistoryModal() { renderHistoryList(); els.historyModal.classList.add('show'); }
  function closeHistoryModal() { els.historyModal.classList.remove('show'); }

  function bindEvents() {
    els.fabAdd.addEventListener('click', openAddModal);
    els.addTodoCancel.addEventListener('click', closeAddModal);
    els.addTodoConfirm.addEventListener('click', async () => {
      await addTodo(els.addTodoInput.value);
      closeAddModal();
    });
    els.addTodoInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        await addTodo(els.addTodoInput.value);
        closeAddModal();
      }
    });

    els.fabPending.addEventListener('click', openPendingModal);
    els.pendingClose.addEventListener('click', closePendingModal);
    els.pendingList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const row = e.target.closest('[data-id]');
      const id = row && row.dataset.id;
      if (!id) return;
      if (btn.dataset.action === 'toggle') toggleTodo(id);
      if (btn.dataset.action === 'delete') deleteTodo(id);
    });

    els.historyRow.addEventListener('click', openHistoryModal);
    els.historyClose.addEventListener('click', closeHistoryModal);
    els.historyClear.addEventListener('click', clearHistory);
  }

  function setVisible(visible) {
    els.fabStack.style.display = visible ? 'flex' : 'none';
  }

  function init() {
    cacheEls();
    bindEvents();
    updateBadge();
  }

  global.TodoModule = { init, setVisible, updateBadge };
})(window);
