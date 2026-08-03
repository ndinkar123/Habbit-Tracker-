'use strict';

const getNow = () => new Date();
const pad = (n) => n < 10 ? '0' + n : String(n);
const dateKey = (y, m, d) => y + '-' + pad(m + 1) + '-' + pad(d);
const dateKeyFromDate = (d) => dateKey(d.getFullYear(), d.getMonth(), d.getDate());

let state = null;
let currentYear, currentMonth, selectedDate;
let activeTab = 'today';

const els = {
  tabBar: document.getElementById('tabBar'),
  habitList: document.getElementById('habitList'),
  toast: document.getElementById('toast'),
  pinScreen: document.getElementById('pinLockScreen'),
  pinDots: document.getElementById('pinDots'),
  pinPad: document.getElementById('pinPad'),
  perfRows: document.getElementById('perfRows'),
  heroDate: document.getElementById('heroDate'),
  heroStreak: document.getElementById('heroStreak'),
  calGrid: document.getElementById('calGrid'),
  gaugeSvg: document.getElementById('gaugeSvg'),
  gaugePct: document.getElementById('gaugePct'),
  monthNav: document.getElementById('monthNav')
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
      saveState().then(() => { showToast("🔒 PIN Set"); els.pinScreen.classList.add('hidden'); settingPin = false; });
    } else {
      if (pinBuffer === state.pin) { els.pinScreen.classList.add('hidden'); } 
      else { showToast("❌ Incorrect PIN"); pinBuffer = ''; Array.from(els.pinDots.children).forEach(dot => dot.classList.remove('filled')); }
    }
  }
}

async function loadState() {
  const s = await Store.get(Store.STATE_KEY);
  state = s || { habits: [{ id: 'h1', name: 'Read 30 Mins', icon: 'book' }], data: {}, notes: {}, todos: [] };
  if (!state.habits) state.habits = [];
  if (state.pin) { els.pinScreen.classList.remove('hidden'); }
  else { els.pinScreen.classList.add('hidden'); }
}

async function saveState() { await Store.set(Store.STATE_KEY, state); }

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2500);
}

function calculateDayStats(k) {
  const dayData = state.data[k] || {};
  let done = 0, total = state.habits.length;
  for (const h of state.habits) { if (dayData[h.id]) done++; }
  return { done, total, pct: total ? done / total : 0 };
}

// TARGETED PERFORMANCE RENDERING
function toggleHabit(id) {
  const dKey = dateKey(currentYear, currentMonth, selectedDate);
  if(dKey !== dateKeyFromDate(getNow())) { showToast("🔒 Locked to Today"); return; }
  
  if(!state.data[dKey]) state.data[dKey] = {};
  const isDone = !state.data[dKey][id];
  state.data[dKey][id] = isDone;
  
  const card = document.querySelector(`.habit-card[data-habit-id="${id}"]`);
  if(card) card.classList.toggle('done', isDone);
  
  saveState();
  if(isDone) showToast("✅ Perfect");
}

function buildTodayView() {
  const d = new Date(currentYear, currentMonth, selectedDate);
  els.heroDate.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  
  const dKey = dateKey(currentYear, currentMonth, selectedDate);
  const todayData = state.data[dKey] || {};
  
  if (state.habits.length === 0) {
    els.habitList.innerHTML = `<div style="text-align:center; opacity:0.6; font-weight:700; padding:30px 20px;">No habits yet. Let's create one in Settings!</div>`;
    return;
  }

  els.habitList.innerHTML = state.habits.map(h => `
    <div class="habit-card ${todayData[h.id] ? 'done' : ''}" data-habit-id="${h.id}">
      <div class="habit-emoji">${window.IconLib && window.IconLib.render ? IconLib.render(h.icon) : '✨'}</div>
      <div class="habit-info"><div class="habit-name">${h.name}</div></div>
      <div class="checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
    </div>
  `).join('');
}

// RESTORED CALENDAR VIEW
function buildCalendarView() {
  const now = getNow();
  els.calGrid.innerHTML = '';
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let firstDay = new Date(currentYear, currentMonth, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1;

  const frag = document.createDocumentFragment();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    frag.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const k = dateKey(currentYear, currentMonth, day);
    const stats = calculateDayStats(k);
    const isToday = (currentYear === now.getFullYear() && currentMonth === now.getMonth() && day === now.getDate());
    const isSelected = (day === selectedDate);

    let lvl = '';
    if (stats.total > 0 && stats.pct === 1) lvl = 'lvl-3';
    else if (stats.pct >= 0.5) lvl = 'lvl-2';
    else if (stats.pct > 0) lvl = 'lvl-1';

    const cell = document.createElement('div');
    cell.className = 'cal-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + (lvl ? ' ' + lvl : '');
    cell.textContent = String(day);
    cell.dataset.day = String(day);
    frag.appendChild(cell);
  }
  els.calGrid.appendChild(frag);
}

// RESTORED GAUGE & NEW HEATMAPS
function renderGauge(pct) {
  const r = 75, cx = 100, cy = 95;
  const arcLen = Math.PI * r;
  const offset = arcLen * (1 - pct / 100);
  const color = pct >= 80 ? 'var(--primary)' : pct >= 40 ? 'var(--accent)' : '#D96B4D';
  const d = 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;

  els.gaugeSvg.innerHTML =
    '<path d="' + d + '" class="gauge-track"></path>' +
    '<path d="' + d + '" class="gauge-fill" style="stroke:' + color + '; stroke-dasharray:' + arcLen + '; stroke-dashoffset:' + offset + ';"></path>';
  els.gaugePct.textContent = pct + '%';
}

function buildProgressView() {
  const dKey = dateKey(currentYear, currentMonth, selectedDate);
  const stats = calculateDayStats(dKey);
  renderGauge(stats.total ? Math.round(stats.pct * 100) : 0);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthPrefix = dKey.slice(0, 8);
  
  els.perfRows.innerHTML = state.habits.map(h => {
    let completed = 0;
    let blocks = '';
    for(let i = 1; i <= daysInMonth; i++) {
      const loopKey = monthPrefix + pad(i);
      const done = state.data[loopKey] && state.data[loopKey][h.id];
      if(done) completed++;
      blocks += `<div class="heatmap-block ${done ? 'active' : ''}"></div>`;
    }
    const pct = Math.round((completed / daysInMonth) * 100) || 0;
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
  activeTab = btn.dataset.tab;
  document.getElementById('view-' + activeTab).classList.add('active');
  
  if(activeTab === 'today') buildTodayView();
  if(activeTab === 'calendar') buildCalendarView();
  if(activeTab === 'progress') buildProgressView();
});

els.calGrid.addEventListener('click', (e) => {
  const cell = e.target.closest('.cal-day');
  if (!cell || !cell.dataset.day) return;
  selectedDate = parseInt(cell.dataset.day, 10);
  buildCalendarView();
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

document.getElementById('taskHistoryRow').addEventListener('click', async () => {
  state.todos = state.todos.filter(t => !t.done);
  await saveState();
  showToast("🗑️ History Cleared Instantly");
});

window.AppCore = { getState: () => state, saveState, showToast };

async function bootstrap() {
  await loadState();
  
  const now = getNow();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
  selectedDate = now.getDate();
  
  buildTodayView();
  if(window.TodoModule) TodoModule.init();
  if(window.BmiModule) BmiModule.init();
}
bootstrap();
