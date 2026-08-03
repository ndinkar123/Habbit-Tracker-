(function(global) {
  'use strict';
  const els = {};

  function init() {
    ['fabAddTodo','addTodoModal','addTodoInput','addTodoCancel','addTodoConfirm','fabPendingTodo','fabPendingBadge'].forEach(id => els[id] = document.getElementById(id));
    
    els.fabAddTodo.addEventListener('click', () => { els.addTodoInput.value = ''; els.addTodoModal.classList.add('show'); els.addTodoInput.focus(); });
    els.addTodoCancel.addEventListener('click', () => els.addTodoModal.classList.remove('show'));
    els.addTodoConfirm.addEventListener('click', async () => {
      const text = els.addTodoInput.value.trim();
      if(!text) return;
      const state = AppCore.getState();
      state.todos.push({ id: 't_'+Date.now(), text, done: false });
      await AppCore.saveState();
      els.addTodoModal.classList.remove('show');
      updateBadge();
      AppCore.showToast("Task added");
    });
    
    // Quick frictionless task completion logic embedded via delegated click in app.js
    updateBadge();
  }

  function updateBadge() {
    const pending = AppCore.getState().todos.filter(t => !t.done).length;
    els.fabPendingBadge.textContent = pending;
    els.fabPendingBadge.style.display = pending > 0 ? 'flex' : 'none';
  }

  global.TodoModule = { init, updateBadge };
})(window);
