'use strict';

const getNow = () => new Date();
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayKey = () => dateKey(getNow());

let state = { habits: [], data: {}, notes: {}, todos: [], pin: null };
let activeTab = 'today';
let selectedDateKey = todayKey();

// targeted DOM elements
const els = {
  tabBar: document.getElementById('tabBar'),
  habitList: document.getElementById('habitList'),
  toast: document.getElementById('toast'),
  pinScreen: document.getElementById('pinLockScreen'),
  pinDots: document.getElementById('pinDots'),
  pinPad: document.getElementById('pinPad'),
  perfRows: document.getElementById('perfRows'),
  heroDate: document.getElementById('heroDate'),
  heroStreak: document.getElementById('heroStreak')
};

// PIN LOCK LOGIC
let pinBuffer = '';
let settingPin = false;

function handlePinInput(val) {
  if (val === 'del') pinBuffer = pinBuffer.slice(0, -1);
  else if (pinBuffer.length < 3) pinBuffer += val;
  
  Array.from(els.pinDots.children).forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length));
  
  if (pinBuffer.length === 3) {
    if (settingPin) {
      state.pin = pinBuffer;
      saveState().then(() => {
        showToast("🔒 PIN Set");
        els.pinScreen.classList.add('hidden');
        settingPin = false;
      });
    } else {
      if (pinBuffer === state.pin) {
        els.pinScreen.classList.add('hidden');
      } else {
        showToast("❌ Incorrect PIN");
        pinBuffer = '';
        Array.from(els.pinDots.children).forEach(dot => dot.classList.remove('filled'));
      }
    }
  }
}

// CORE STATE
async function loadState() {
  const s = await Store.get(Store.STATE_KEY);
  if (s) state = s;
  if (!state.habits) state.habits = [{ id: 'h1', name: 'Read 30 Mins', icon: 'book' }];
  if (state.pin) { els.pinScreen.classList.remove('hidden'); }
  else { els.pinScreen.classList.add('hidden'); }
}

async function saveState() {
  await Store.set(Store.STATE_KEY, state);
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2500);
}

// TARGETED PERFORMANCE RENDERING
function toggleHabit(id) {
  if(selectedDateKey !== todayKey()) { showToast("🔒 Locked to Today"); return; }
  
  if(!state.data[selectedDateKey]) state.data[selectedDateKey] = {};
  const isDone = !state.data[selectedDateKey][id];
  state.data[selectedDateKey][id] = isDone;
  
  // Optimistic UI Update (No full rebuilds)
  const card = document.querySelector(`.habit-card[data-habit-id="${id}"]`);
  if(card) card.classList.toggle('done', isDone);
  
  saveState();
  if(isDone) showToast("✅ Perfect");
}

function renderHabits() {
  els.heroDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  
  const todayData = state.data[selectedDateKey] || {};
  els.habitList.innerHTML = state.habits.map(h => `
    <div class="habit-card ${todayData[h.id] ? 'done' : ''}" data-habit-id="${h.id}">
      <div class="habit-emoji">${IconLib.render(h.icon)}</div>
      <div class="habit-info"><div class="habit-name">${h.name}</div></div>
      <div class="checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
    </div>
  `).join('');
}

// HEATMAP PROGRESS TAB
function buildProgressView() {
  const daysInMonth = new Date(getNow().getFullYear(), getNow().getMonth() + 1, 0).getDate();
  const monthPrefix = selectedDateKey.slice(0, 8);
  
  els.perfRows.innerHTML = state.habits.map(h => {
    let completed = 0;
    let blocks = '';
    for(let i = 1; i <= daysInMonth; i++) {
      const dKey = monthPrefix + String(i).padStart(2,'0');
      const done = state.data[dKey] && state.data[dKey][h.id];
      if(done) completed++;
      blocks += `<div class="heatmap-block ${done ? 'active' : ''}"></div>`;
    }
    const pct = Math.round((completed / daysInMonth) * 100);
    return `
      <div class="perf-row">
        <div class="perf-header">
          <div class="perf-name">${h.name}</div>
          <div class="perf-pct">${pct}%</div>
        </div>
        <div class="heatmap-grid">${blocks}</div>
      </div>
    `;
  }).join('');
}

// BIND EVENTS
els.habitList.addEventListener('click', e => {
  const card = e.target.closest('.habit-card');
  if(card) toggleHabit(card.dataset.habitId);
});

els.tabBar.addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if(!btn) return;
  document.querySelectorAll('.tab, .view').forEach(el => el.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('view-' + btn.dataset.tab).classList.add('active');
  if(btn.dataset.tab === 'progress') buildProgressView();
});

els.pinPad.addEventListener('click', e => {
  if(e.target.tagName === 'BUTTON') handlePinInput(e.target.textContent);
});

document.getElementById('setPinBtn').addEventListener('click', () => {
  settingPin = true;
  pinBuffer = '';
  Array.from(els.pinDots.children).forEach(dot => dot.classList.remove('filled'));
  els.pinScreen.classList.remove('hidden');
});

// FRICTIONLESS ACTIONS (No window.confirm)
document.getElementById('taskHistoryRow').addEventListener('click', async () => {
  state.todos = state.todos.filter(t => !t.done); // Auto clear finished
  await saveState();
  showToast("🗑️ History Cleared Instantly");
});

window.AppCore = { getState: () => state, saveState, showToast };

async function bootstrap() {
  await loadState();
  renderHabits();
  if(window.TodoModule) TodoModule.init();
  if(window.BmiModule) BmiModule.init();
}
bootstrap();
