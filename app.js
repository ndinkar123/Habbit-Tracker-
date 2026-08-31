/*
 * app.js — Habits Pro (v5)
 * Exposes window.AppCore so todo.js and bmi.js can share state/helpers
 * without depending on load order. All rendering escapes user text.
 * All events bound via addEventListener/delegation (CSP-safe, no inline
 * handlers).
 */
'use strict';

// ---------- SMALL HELPERS ----------
function esc(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function pad(n) { return n < 10 ? '0' + n : String(n); }
function dateKey(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
function dateKeyFromDate(d) { return dateKey(d.getFullYear(), d.getMonth(), d.getDate()); }
function getNow() { return new Date(); }
function generateSafeId() { return 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function debounce(fn, wait) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

// ---------- CONFIG ----------
const SLOGANS = [
  "Roots grow deepest when the wind blows hardest.",
  "The moon doesn't compete with the sun; it just waits its turn.",
  "You are not behind — you are on your own timeline.",
  "Diamonds don't apologize for the pressure that made them.",
  "The tree that bends survives the storm the oak couldn't.",
  "Yesterday's ashes are today's fertile ground.",
  "A candle loses nothing by lighting another.",
  "The river doesn't rush — it just never stops.",
  "Every winter secretly prepares a spring.",
  "You weren't given this life to shrink into it.",
  "The seed never sees the forest it becomes.",
  "Broken crayons still color the same.",
  "What doesn't kill you rearranges you.",
  "The deepest roots hold the tallest trees.",
  "Even the moon needs darkness to be seen.",
  "You bloom in seasons no one else witnessed.",
  "A caterpillar has no idea it's about to fly.",
  "Storms make the roots dig deeper, not weaker.",
  "The quiet ones are often carrying the heaviest storms.",
  "Nothing wild ever grew in comfort.",
  "The fire that tests you also refines you.",
  "You are the calm your younger self prayed for.",
  "Rivers carve canyons not by force, but by patience.",
  "Some flowers bloom only after the fire.",
  "You don't need the whole sky to shine.",
  "The strongest steel was once just fire and pressure.",
  "Every scar is a map of where you didn't quit.",
  "The night is darkest right before it turns to dawn.",
  "You are allowed to outgrow people, places, and versions of yourself.",
  "What grows in silence often grows the strongest."
];

const DEFAULT_HABITS = [
  { id: generateSafeId(), name: 'Read 30 Mins', emoji: '📚', icon: 'book' },
  { id: generateSafeId(), name: 'Exercise', emoji: '💪', icon: 'dumbbell' },
  { id: generateSafeId(), name: 'Meditate', emoji: '🧘', icon: 'meditation' }
];

const DEFAULT_REWARDS = [
  "Watch 1 episode of your favorite show 🎬",
  "Eat a piece of chocolate 🍫",
  "1 hour of guilt-free gaming 🎮",
  "Take a long relaxing bath 🛁",
  "Buy yourself a small treat 🛍️"
];

// req is the single source of truth for badge thresholds
const BADGE_DEFS = [
  { id: 'first_step', name: 'First Step', desc: 'Complete 1 habit', emoji: '🌱', req: 1, metric: 'total' },
  { id: 'perfect_day', name: 'Perfect Day', desc: '100% in a day', emoji: '⭐', req: 1, metric: 'perfectDay' },
  { id: 'streak_7', name: 'Week Warrior', desc: '7 Day Streak', emoji: '🔥', req: 7, metric: 'streak' },
  { id: 'streak_30', name: 'Monthly Master', desc: '30 Day Streak', emoji: '👑', req: 30, metric: 'streak' },
  { id: 'total_100', name: 'Century Club', desc: '100 Completions', emoji: '💯', req: 100, metric: 'total' },
  { id: 'total_500', name: 'Habit Hero', desc: '500 Completions', emoji: '🦸', req: 500, metric: 'total' },
  { id: 'streak_100', name: 'Unstoppable', desc: '100 Day Streak', emoji: '🚀', req: 100, metric: 'streak' },
  { id: 'total_1000', name: 'Legend', desc: '1000 Completions', emoji: '🏔️', req: 1000, metric: 'total' },
  { id: 'five_habits', name: 'Builder', desc: 'Track 5+ habits at once', emoji: '🏗️', req: 5, metric: 'habitCount' },
  { id: 'ten_tasks', name: 'Task Crusher', desc: 'Complete 10 to-do tasks', emoji: '✅', req: 10, metric: 'tasksDone' },
  { id: 'perfect_week', name: 'Flawless Week', desc: '7 Perfect Days total', emoji: '🌟', req: 7, metric: 'perfectDays' },
  { id: 'early_bird', name: 'Early Bird', desc: 'Log a habit before 7am', emoji: '🐦', req: 1, metric: 'earlyBird' }
];

const EMOJIS = ['📚','💪','🧘','💧','🏃','🍎','🌅','🌙','🌿','💻','✍️','🎨','🧠','🚭','☕','🎯','🧩','💰','🐶','🚗'];

// ---------- STATE SHAPE & VALIDATION ----------
function defaultState() {
  return {
    version: 8,
    habits: [],
    data: {},
    notes: {},
    rewards: [],
    badges: {},
    dark: false,
    lastSloganDate: '',
    currentSlogan: '',
    lastCongratsDate: '',
    todos: [],
    bmiHistory: {},
    bmiProfile: {},
    perfectDayCount: 0,
    earlyBirdEarned: false
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') {
    s.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
    s.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));
    return s;
  }

  if (Array.isArray(raw.habits)) {
    const seen = new Set();
    for (const h of raw.habits) {
      if (!h || typeof h !== 'object') continue;
      const name = typeof h.name === 'string' ? h.name.trim().slice(0, 40) : '';
      if (!name) continue;
      let id = (typeof h.id === 'string' && h.id) ? h.id : generateSafeId();
      if (seen.has(id)) id = generateSafeId();
      seen.add(id);
      const emoji = (typeof h.emoji === 'string' && h.emoji.trim()) ? h.emoji.trim().slice(0, 8) : '🌟';
      const icon = (typeof h.icon === 'string' && window.IconLib && IconLib.isValidIcon(h.icon)) ? h.icon : undefined;
      const habit = { id, name, emoji };
      if (icon) habit.icon = icon;
      s.habits.push(habit);
    }
  }
  if (s.habits.length === 0) s.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
  const validIds = new Set(s.habits.map(h => h.id));

  if (raw.data && typeof raw.data === 'object') {
    for (const dk in raw.data) {
      if (!DATE_RE.test(dk)) continue;
      const day = raw.data[dk];
      if (!day || typeof day !== 'object') continue;
      const cleanDay = {};
      for (const hid in day) {
        if (validIds.has(hid)) cleanDay[hid] = !!day[hid];
      }
      if (Object.keys(cleanDay).length) s.data[dk] = cleanDay;
    }
  }

  if (raw.notes && typeof raw.notes === 'object') {
    for (const dk in raw.notes) {
      if (DATE_RE.test(dk) && typeof raw.notes[dk] === 'string') {
        s.notes[dk] = raw.notes[dk].slice(0, 4000);
      }
    }
  }

  if (Array.isArray(raw.rewards)) {
    s.rewards = raw.rewards
      .filter(r => typeof r === 'string' && r.trim())
      .map(r => r.trim().slice(0, 200))
      .slice(0, 200);
  }
  if (s.rewards.length === 0) s.rewards = JSON.parse(JSON.stringify(DEFAULT_REWARDS));

  if (raw.badges && typeof raw.badges === 'object') {
    for (const bk in raw.badges) {
      if (BADGE_DEFS.some(b => b.id === bk) && typeof raw.badges[bk] === 'string') {
        s.badges[bk] = raw.badges[bk];
      }
    }
  }

  if (Array.isArray(raw.todos)) {
    for (const t of raw.todos) {
      if (!t || typeof t !== 'object') continue;
      const text = typeof t.text === 'string' ? t.text.trim().slice(0, 140) : '';
      if (!text) continue;
      s.todos.push({
        id: (typeof t.id === 'string' && t.id) ? t.id : generateSafeId(),
        text,
        done: !!t.done,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
        completedAt: typeof t.completedAt === 'string' ? t.completedAt : null
      });
    }
  }

  if (raw.bmiHistory && typeof raw.bmiHistory === 'object') {
    for (const dk in raw.bmiHistory) {
      if (!DATE_RE.test(dk)) continue;
      const e = raw.bmiHistory[dk];
      if (!e || typeof e !== 'object' || typeof e.bmi !== 'number') continue;
      s.bmiHistory[dk] = {
        bmi: e.bmi,
        category: typeof e.category === 'string' ? e.category.slice(0, 20) : '',
        weightKg: typeof e.weightKg === 'number' ? e.weightKg : 0,
        heightCm: typeof e.heightCm === 'number' ? e.heightCm : 0
      };
    }
  }

  if (raw.bmiProfile && typeof raw.bmiProfile === 'object') {
    const p = raw.bmiProfile;
    const numStr = (v) => (v == null ? '' : String(v).slice(0, 10));
    s.bmiProfile = {
      gender: p.gender === 'female' ? 'female' : 'male',
      unit: p.unit === 'imperial' ? 'imperial' : 'metric',
      age: numStr(p.age),
      heightCm: numStr(p.heightCm),
      weightKg: numStr(p.weightKg),
      heightFt: numStr(p.heightFt),
      heightIn: numStr(p.heightIn),
      weightLb: numStr(p.weightLb)
    };
  }

  s.dark = !!raw.dark;
  s.lastSloganDate = typeof raw.lastSloganDate === 'string' ? raw.lastSloganDate.slice(0, 10) : '';
  s.currentSlogan = typeof raw.currentSlogan === 'string' ? raw.currentSlogan.slice(0, 200) : '';
  s.lastCongratsDate = typeof raw.lastCongratsDate === 'string' ? raw.lastCongratsDate.slice(0, 10) : '';
  s.perfectDayCount = typeof raw.perfectDayCount === 'number' ? raw.perfectDayCount : 0;
  s.earlyBirdEarned = !!raw.earlyBirdEarned;

  return s;
}

async function loadState() {
  let stored = null;
  try { stored = await Store.get(Store.STATE_KEY); } catch (e) { stored = null; }
  if (!stored) stored = Store.readLegacyLocalStorage();
  const s = sanitizeState(stored);
  await Store.set(Store.STATE_KEY, s);
  return s;
}

async function saveState() {
  try { await Store.set(Store.STATE_KEY, state); } catch (e) { console.error('Save failed', e); }
}

// ---------- APP STATE ----------
let state = null;
const els = {};
let currentYear, currentMonth, selectedDate;
let activeTab = 'today';
let activeEditingHabitId = null;
let activeIconCategory = IconLib.ICON_CATEGORIES[0].id;
let deferredPrompt = null;
let pendingUpdateReg = null;

function isViewingToday() {
  const now = getNow();
  return currentYear === now.getFullYear() && currentMonth === now.getMonth() && selectedDate === now.getDate();
}

function renderHabitGlyph(h) {
  if (h.icon && IconLib.isValidIcon(h.icon)) return IconLib.renderIconSVG(h.icon);
  return esc(h.emoji || '🌟');
}

// ---------- DATA / STATS HELPERS ----------
function getDayData(k) { return state.data[k] || {}; }

function calculateDayStats(k) {
  const dayData = getDayData(k);
  let done = 0, total = 0;
  for (const h of state.habits) {
    if (h && h.id) {
      total++;
      if (dayData[h.id]) done++;
    }
  }
  return { done, total, pct: total ? done / total : 0 };
}

function getHabitStreak(habitId, dObj) {
  let streak = 0;
  let d = new Date(dObj.getFullYear(), dObj.getMonth(), dObj.getDate());
  for (let i = 0; i < 365; i++) {
    const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (getDayData(k)[habitId]) streak++; else break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getGlobalStreak() {
  let current = 0, best = 0, tempStreak = 0;
  const now = getNow();
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxLookback = 365 * 5;

  for (let i = 0; i < maxLookback; i++) {
    const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const stats = calculateDayStats(k);
    if (stats.total > 0 && stats.pct >= 0.5) {
      tempStreak++;
      if (i === tempStreak - 1) current = tempStreak;
    } else {
      if (tempStreak > best) best = tempStreak;
      tempStreak = 0;
    }
    d.setDate(d.getDate() - 1);
  }
  if (tempStreak > best) best = tempStreak;
  return { current, best: Math.max(current, best) };
}

function getTotalCompletions() {
  let total = 0;
  for (const k in state.data) {
    for (const h in state.data[k]) {
      if (state.data[k][h]) total++;
    }
  }
  return total;
}

function getPerfectDayCount() {
  let count = 0;
  for (const k in state.data) {
    const stats = calculateDayStats(k);
    if (stats.total > 0 && stats.pct === 1) count++;
  }
  return count;
}

// ---------- SLOGAN ----------
function setDailySlogan() {
  const now = getNow();
  const k = dateKeyFromDate(now);
  if (state.lastSloganDate !== k) {
    // Deterministic rotation through all 30 based on day-of-year, so it
    // cycles through every slogan before repeating.
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    state.currentSlogan = SLOGANS[dayOfYear % SLOGANS.length];
    state.lastSloganDate = k;
    saveState();
  }
  if (!state.currentSlogan) state.currentSlogan = SLOGANS[0];
  els.sloganText.textContent = '"' + state.currentSlogan + '"';
}

// ---------- TOAST ----------
let toastTimer;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2500);
}

// ---------- RENDER: MONTH NAV ----------
function buildMonthNav() {
  const nav = els.monthNav;
  nav.innerHTML = '';
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const nowY = getNow().getFullYear();
  const startY = nowY - 1;
  const endY = nowY + 5;

  const frag = document.createDocumentFragment();
  for (let y = startY; y <= endY; y++) {
    for (let m = 0; m < 12; m++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-tab' + ((y === currentYear && m === currentMonth) ? ' active' : '');
      btn.textContent = monthNames[m] + ' ' + y;
      btn.dataset.year = String(y);
      btn.dataset.month = String(m);
      frag.appendChild(btn);
    }
  }
  nav.appendChild(frag);

  setTimeout(() => {
    const act = nav.querySelector('.active');
    if (act) {
      try { act.scrollIntoView({ inline: 'center', behavior: 'smooth' }); } catch (e) { act.scrollIntoView(); }
    }
  }, 100);
}

// ---------- RENDER: TODAY ----------
function buildTodayView() {
  const now = getNow();
  const d = new Date(currentYear, currentMonth, selectedDate);
  const options = { weekday: 'long', month: 'short', day: 'numeric' };
  els.heroDate.textContent = d.toLocaleDateString('en-US', options).toUpperCase();

  const key = dateKey(currentYear, currentMonth, selectedDate);
  const stats = calculateDayStats(key);

  let greeting = "Let's win the day.";
  if (stats.total > 0 && stats.pct === 1) greeting = 'Perfect day! 🎉';
  else if (stats.pct >= 0.5) greeting = 'Keep up the momentum!';
  els.heroTitle.textContent = greeting;

  els.heroStreak.textContent = getGlobalStreak().current;
  els.statCompleted.textContent = stats.done + '/' + stats.total;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isCurrentRealMonth = (currentYear === now.getFullYear() && currentMonth === now.getMonth());
  const daysPassed = isCurrentRealMonth ? now.getDate() : daysInMonth;
  let monthTotalPct = 0;
  for (let i = 1; i <= daysPassed; i++) monthTotalPct += calculateDayStats(dateKey(currentYear, currentMonth, i)).pct;
  els.statRate.textContent = Math.round((monthTotalPct / daysPassed) * 100 || 0) + '%';

  const locked = !isViewingToday();
  els.lockBanner.style.display = locked ? 'flex' : 'none';
  els.habitList.classList.toggle('locked', locked);

  els.habitList.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.habits.forEach((h, i) => {
    if (!h || !h.id) return;
    const isDone = !!getDayData(key)[h.id];
    const streak = getHabitStreak(h.id, d);

    const card = document.createElement('div');
    card.className = 'habit-card' + (isDone ? ' done' : '');
    card.style.animationDelay = (i * 40) + 'ms';
    card.dataset.habitId = h.id;
    card.innerHTML =
      '<div class="habit-emoji">' + renderHabitGlyph(h) + '</div>' +
      '<div class="habit-info">' +
        '<div class="habit-name">' + esc(h.name) + '</div>' +
        '<div class="habit-streak">' + (streak > 1 ? '🔥 ' + streak + ' Day Streak' : (isDone ? 'Completed' : 'Pending')) + '</div>' +
      '</div>' +
      '<div class="checkbox"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg></div>';
    frag.appendChild(card);
  });
  els.habitList.appendChild(frag);

  els.dailyNoteInput.value = state.notes[key] || '';
}

async function toggleHabit(habitId) {
  if (!isViewingToday()) {
    showToast("🔒 Only today's habits can be checked");
    return;
  }
  const key = dateKey(currentYear, currentMonth, selectedDate);
  if (!state.data[key]) state.data[key] = {};
  state.data[key][habitId] = !state.data[key][habitId];

  if (state.data[key][habitId]) {
    const hour = getNow().getHours();
    if (hour < 7) state.earlyBirdEarned = true;
  }

  await saveState();

  const isNowDone = state.data[key][habitId];
  const habit = state.habits.find(h => h.id === habitId);
  if (isNowDone && habit) showToast('✅ ' + habit.name + ' done!');

  await checkAchievementsAndPopup(key);

  buildTodayView();
  if (activeTab === 'calendar') buildCalendarView();
  if (activeTab === 'progress') buildProgressView();
}

// ---------- RENDER: CALENDAR ----------
function buildCalendarView() {
  const now = getNow();
  const grid = els.calGrid;
  grid.innerHTML = '';

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
    const hasNote = !!state.notes[k];

    let lvl = '';
    if (stats.total > 0 && stats.pct === 1) lvl = 'lvl-3';
    else if (stats.pct >= 0.5) lvl = 'lvl-2';
    else if (stats.pct > 0) lvl = 'lvl-1';

    const cell = document.createElement('div');
    cell.className = 'cal-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + (lvl ? ' ' + lvl : '') + (hasNote ? ' has-note' : '');
    cell.textContent = String(day);
    cell.dataset.day = String(day);
    frag.appendChild(cell);
  }
  grid.appendChild(frag);

  const selectedK = dateKey(currentYear, currentMonth, selectedDate);
  const selectedNote = state.notes[selectedK];
  els.calSelectedNote.innerHTML = selectedNote
    ? '📝 <b>Note for ' + selectedDate + ':</b><br><br>' + esc(selectedNote).replace(/\n/g, '<br>')
    : '';

  buildWeeklyChart();
}

function buildWeeklyChart() {
  const chart = els.weeklyChart;
  chart.innerHTML = '';

  let d = new Date(currentYear, currentMonth, selectedDate);
  const dayOfWeek = d.getDay();
  const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const dayLabels = ['M','T','W','T','F','S','S'];

  const frag = document.createDocumentFragment();
  for (let i = 0; i < 7; i++) {
    const curr = new Date(monday);
    curr.setDate(monday.getDate() + i);
    const k = dateKey(curr.getFullYear(), curr.getMonth(), curr.getDate());
    const stats = calculateDayStats(k);
    const hPct = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
    const color = hPct === 100 ? 'var(--primary)' : hPct >= 50 ? 'var(--primary-light)' : 'var(--border)';
    const isSelectedDay = (curr.getDate() === selectedDate && curr.getMonth() === currentMonth);

    const group = document.createElement('div');
    group.className = 'chart-bar-group';
    if (isSelectedDay) group.style.cssText = 'transform: scale(1.1); font-weight:900;';
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = Math.max(12, hPct) + '%';
    bar.style.background = color;
    const lbl = document.createElement('div');
    lbl.className = 'chart-lbl';
    if (isSelectedDay) lbl.style.color = 'var(--primary)';
    lbl.textContent = dayLabels[i];
    group.appendChild(bar);
    group.appendChild(lbl);
    frag.appendChild(group);
  }
  chart.appendChild(frag);
}

// ---------- RENDER: PROGRESS ----------
function renderGauge(pct) {
  const r = 75, cx = 100, cy = 95;
  const arcLen = Math.PI * r;
  const offset = arcLen * (1 - pct / 100);
  const color = pct >= 80 ? 'var(--primary)' : pct >= 40 ? 'var(--accent)' : 'var(--terracotta)';
  const d = 'M' + (cx - r) + ' ' + cy + ' A' + r + ' ' + r + ' 0 0 1 ' + (cx + r) + ' ' + cy;

  els.gaugeSvg.innerHTML =
    '<path d="' + d + '" class="gauge-track"></path>' +
    '<path d="' + d + '" class="gauge-fill" style="stroke:' + color + '; stroke-dasharray:' + arcLen + '; stroke-dashoffset:' + offset + ';"></path>';
  els.gaugePct.textContent = pct + '%';
  els.gaugeLabel.textContent = isViewingToday()
    ? "Today's Completion"
    : 'Completion — ' + new Date(currentYear, currentMonth, selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TINTS = ['tint-a', 'tint-b', 'tint-c', 'tint-d'];

function buildProgressView() {
  els.anaBestStreak.textContent = getGlobalStreak().best;

  const now = getNow();
  let currentPeriod = 0, previousPeriod = 0;
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < 28; i++) {
    const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const pct = calculateDayStats(k).pct;
    if (i < 14) currentPeriod += pct; else previousPeriod += pct;
    d.setDate(d.getDate() - 1);
  }
  const currentAvg = Math.round((currentPeriod / 14) * 100);
  const previousAvg = Math.round((previousPeriod / 14) * 100);
  els.anaConsistency.textContent = currentAvg + '%';

  const trendEl = els.anaTrend;
  if (currentAvg > previousAvg) { trendEl.textContent = '▲ +' + (currentAvg - previousAvg) + '%'; trendEl.className = 'trend-badge trend-up'; }
  else if (currentAvg < previousAvg) { trendEl.textContent = '▼ ' + (previousAvg - currentAvg) + '%'; trendEl.className = 'trend-badge trend-down'; }
  else { trendEl.textContent = 'No change'; trendEl.className = 'trend-badge'; }

  const key = dateKey(currentYear, currentMonth, selectedDate);
  const todayStats = calculateDayStats(key);
  renderGauge(todayStats.total ? Math.round(todayStats.pct * 100) : 0);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isCurrentRealMonth = (currentYear === now.getFullYear() && currentMonth === now.getMonth());
  const daysPassed = isCurrentRealMonth ? now.getDate() : daysInMonth;

  const list = els.perfRows;
  list.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.habits.forEach((h, idx) => {
    if (!h || !h.id) return;
    let done = 0;
    for (let i = 1; i <= daysPassed; i++) {
      if (getDayData(dateKey(currentYear, currentMonth, i))[h.id]) done++;
    }
    const pct = Math.round((done / daysPassed) * 100 || 0);
    const tint = TINTS[idx % TINTS.length];

    const row = document.createElement('div');
    row.className = 'perf-row ' + tint;
    row.style.setProperty('--fill-pct', pct + '%');
    row.innerHTML =
      '<div class="perf-icon">' + renderHabitGlyph(h) + '</div>' +
      '<div class="perf-info">' +
        '<div class="perf-name">' + esc(h.name) + '</div>' +
        '<div class="perf-frac">' + done + '/' + daysPassed + ' days this month</div>' +
      '</div>' +
      '<div class="perf-pct">' + pct + '%</div>';
    frag.appendChild(row);
  });
  list.appendChild(frag);
}

// ---------- RENDER: SETTINGS ----------
function buildSettingsView() {
  const list = els.editHabitList;
  list.innerHTML = '';
  const frag = document.createDocumentFragment();
  state.habits.forEach(h => {
    if (!h || !h.id) return;
    const row = document.createElement('div');
    row.className = 'habit-edit-row';
    row.dataset.habitId = h.id;
    row.innerHTML =
      '<button type="button" class="icon-btn habit-icon-btn" data-action="icon">' + renderHabitGlyph(h) + '</button>' +
      '<input type="text" class="habit-edit-input" data-action="rename" maxlength="40" value="' + esc(h.name) + '">' +
      '<button type="button" class="btn btn-danger" data-action="delete" style="padding:14px;">✕</button>';
    frag.appendChild(row);
  });
  list.appendChild(frag);

  const rList = els.rewardsList;
  rList.innerHTML = '';
  const rFrag = document.createDocumentFragment();
  state.rewards.forEach((r, idx) => {
    const row = document.createElement('div');
    row.className = 'reward-row';
    row.dataset.index = String(idx);
    row.innerHTML =
      '<span class="reward-text">' + esc(r) + '</span>' +
      '<button type="button" class="btn btn-danger" data-action="delete-reward" style="padding:8px 16px; font-size:13px;">Del</button>';
    rFrag.appendChild(row);
  });
  rList.appendChild(rFrag);

  els.darkToggle.checked = state.dark;
}

// ---------- GAMIFICATION ----------
function computeBadgeMetrics(stats, total, streak) {
  return {
    total,
    perfectDay: (stats.total > 0 && stats.pct === 1) ? 1 : 0,
    streak,
    habitCount: state.habits.length,
    tasksDone: state.todos.filter(t => t.done).length,
    perfectDays: getPerfectDayCount(),
    earlyBird: state.earlyBirdEarned ? 1 : 0
  };
}

async function checkAchievementsAndPopup(key) {
  const stats = calculateDayStats(key);
  const total = getTotalCompletions();
  const streak = getGlobalStreak().current;
  const metrics = computeBadgeMetrics(stats, total, streak);

  let newBadge = null;
  for (const b of BADGE_DEFS) {
    if (state.badges[b.id]) continue;
    const value = metrics[b.metric] || 0;
    if (value >= b.req) {
      state.badges[b.id] = new Date().toISOString();
      newBadge = b;
    }
  }
  if (newBadge) {
    const badgeName = newBadge.name;
    setTimeout(() => showToast('🏆 Badge Unlocked: ' + badgeName + '!'), 1000);
  }

  const now = getNow();
  const todayKey = dateKeyFromDate(now);
  if (key === todayKey && stats.total > 0 && stats.pct === 1 && state.lastCongratsDate !== todayKey) {
    state.lastCongratsDate = todayKey;
    const reward = state.rewards[Math.floor(Math.random() * state.rewards.length)] || 'High Five! ✋';
    els.popupRewardTxt.textContent = reward;
    setTimeout(() => els.congratsPopup.classList.add('show'), 600);
  }

  await saveState();
}

function openAchievements() {
  const total = getTotalCompletions();
  let lvlTitle = 'Novice Tier', lvlIcon = '🌱';
  if (total >= 500) { lvlTitle = 'Platinum Tier'; lvlIcon = '💎'; }
  else if (total >= 200) { lvlTitle = 'Gold Tier'; lvlIcon = '🏆'; }
  else if (total >= 50) { lvlTitle = 'Silver Tier'; lvlIcon = '🥈'; }
  else if (total >= 10) { lvlTitle = 'Bronze Tier'; lvlIcon = '🥉'; }

  els.lvlIcon.textContent = lvlIcon;
  els.lvlTitle.textContent = lvlTitle;
  els.lvlSub.textContent = total + ' Total Habits Completed';

  els.badgeGrid.innerHTML = '';
  const frag = document.createDocumentFragment();
  BADGE_DEFS.forEach(b => {
    const earned = state.badges[b.id];
    const card = document.createElement('div');
    card.className = 'badge-card' + (!earned ? ' locked' : '');
    card.innerHTML =
      '<div class="badge-emoji">' + b.emoji + '</div>' +
      '<div class="badge-name">' + esc(b.name) + '</div>' +
      '<div class="badge-date">' + (earned ? new Date(earned).toLocaleDateString() : esc(b.desc)) + '</div>';
    frag.appendChild(card);
  });
  els.badgeGrid.appendChild(frag);

  els.achievementsModal.classList.add('show');
}
function closeAchievements() { els.achievementsModal.classList.remove('show'); }
function closePopup() { els.congratsPopup.classList.remove('show'); }

// ---------- ACTIONS ----------
async function updateHabitName(id, newName) {
  const trimmed = (newName || '').trim().slice(0, 40);
  if (!trimmed) return;
  const h = state.habits.find(x => x.id === id);
  if (!h) return;
  h.name = trimmed;
  await saveState();
  showToast('✅ Saved');
}

async function deleteHabit(id) {
  if (state.habits.length <= 1) { showToast('⚠️ Need at least one habit!'); return; }
  if (!confirm('Delete this habit? Its historical data will be permanently removed.')) return;
  state.habits = state.habits.filter(h => h.id !== id);
  for (const dk in state.data) {
    if (state.data[dk] && Object.prototype.hasOwnProperty.call(state.data[dk], id)) {
      delete state.data[dk][id];
    }
  }
  await saveState();
  buildSettingsView();
  showToast('🗑️ Habit deleted');
}

async function addNewHabit() {
  state.habits.push({ id: generateSafeId(), name: 'New Habit', emoji: '🌟', icon: 'target' });
  await saveState();
  buildSettingsView();
  showToast('➕ Habit Added!');
}

async function addReward() {
  const val = els.newRewardInput.value.trim().slice(0, 200);
  if (!val) return;
  state.rewards.push(val);
  await saveState();
  els.newRewardInput.value = '';
  buildSettingsView();
  showToast('🎁 Reward Added!');
}

async function deleteReward(idx) {
  state.rewards.splice(idx, 1);
  await saveState();
  buildSettingsView();
}

async function toggleTheme() {
  state.dark = els.darkToggle.checked;
  await saveState();
  document.body.classList.toggle('dark', state.dark);
}

async function resetData() {
  if (!confirm('WARNING: Permanently delete all tracking data?')) return;
  state.data = {};
  state.notes = {};
  state.badges = {};
  state.lastCongratsDate = '';
  await saveState();
  window.location.reload();
}

function buildExportSummary() {
  const habitCount = state.habits.length;
  const dayCount = Object.keys(state.data).length;
  const pendingCount = state.todos.filter(t => !t.done).length;
  return habitCount + ' habits · ' + dayCount + ' days tracked · ' + pendingCount + ' pending tasks';
}

function openExportModal() {
  els.exportSummary.textContent = buildExportSummary();
  els.exportModal.classList.add('show');
}
function closeExportModal() { els.exportModal.classList.remove('show'); }

async function performExport() {
  const now = getNow();
  const filename = 'HabitsPro_Backup_' + dateKeyFromDate(now) + '.json';
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });

  try {
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Habits Pro Backup', text: 'My Habits Pro data backup' });
      showToast('✅ Backup shared');
      closeExportModal();
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }

  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON Backup', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showToast('✅ Backup saved');
      closeExportModal();
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
  }

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('⬇️ Backup downloaded');
  closeExportModal();
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch (e) {
      showToast('⚠️ That file is not valid JSON');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.habits)) {
      showToast("⚠️ That file doesn't look like a Habits Pro backup");
      return;
    }
    state = sanitizeState(parsed);
    await saveState();
    showToast('✅ Backup imported');
    setTimeout(() => window.location.reload(), 700);
  };
  reader.onerror = () => showToast('⚠️ Could not read that file');
  reader.readAsText(file);
}

// ---------- ICON PICKER ----------
function renderIconCategoryTabs() {
  const wrap = els.iconCategoryTabs;
  wrap.innerHTML = '';
  const frag = document.createDocumentFragment();
  IconLib.ICON_CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-cat-tab' + (cat.id === activeIconCategory ? ' active' : '');
    btn.textContent = cat.label;
    btn.dataset.cat = cat.id;
    frag.appendChild(btn);
  });
  wrap.appendChild(frag);
}

function renderIconGrid() {
  const cat = IconLib.ICON_CATEGORIES.find(c => c.id === activeIconCategory) || IconLib.ICON_CATEGORIES[0];
  const grid = els.iconGrid;
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  cat.icons.forEach(iconId => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'icon-pick-btn';
    btn.dataset.icon = iconId;
    btn.innerHTML = IconLib.renderIconSVG(iconId);
    frag.appendChild(btn);
  });
  grid.appendChild(frag);
}

function openIconPicker(habitId) {
  activeEditingHabitId = habitId;
  renderIconCategoryTabs();
  renderIconGrid();
  els.iconOverlay.classList.add('show');
  els.iconPicker.classList.add('open');
}
function closeIconPicker() {
  els.iconOverlay.classList.remove('show');
  els.iconPicker.classList.remove('open');
  activeEditingHabitId = null;
}

// ---------- NAVIGATION ----------
function switchTab(tabId, btnElement) {
  activeTab = tabId;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + tabId).classList.add('active');
  if (btnElement) btnElement.classList.add('active');

  if (tabId === 'today') { buildMonthNav(); buildTodayView(); }
  if (tabId === 'calendar') buildCalendarView();
  if (tabId === 'progress') buildProgressView();
  if (tabId === 'settings') buildSettingsView();

  if (window.TodoModule) TodoModule.setVisible(tabId === 'today');
}

function renderAll() {
  setDailySlogan();
  buildTodayView();
  buildCalendarView();
  buildProgressView();
  buildSettingsView();
}

// ---------- PWA INSTALL BANNER ----------
function maybeShowInstallBanner() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  let dismissed = false;
  try { dismissed = !!localStorage.getItem('pwaPromptDismissed'); } catch (e) {}
  if (dismissed) return;
  setTimeout(() => els.installBanner.classList.add('show'), 2000);
}
function dismissInstallBanner() {
  try { localStorage.setItem('pwaPromptDismissed', 'true'); } catch (e) {}
  els.installBanner.classList.remove('show');
}

// ---------- SERVICE WORKER ----------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateBanner(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(reg);
          }
        });
      });
    } catch (e) { console.log('ServiceWorker registration failed:', e); }
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
function showUpdateBanner(reg) {
  pendingUpdateReg = reg;
  els.updateBanner.classList.add('show');
}
function applyUpdate() {
  if (pendingUpdateReg && pendingUpdateReg.waiting) {
    pendingUpdateReg.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
  els.updateBanner.classList.remove('show');
}

// ---------- DOM CACHE & EVENT BINDING ----------
function cacheEls() {
  const ids = [
    'installBanner','installActionBtn','installCloseBtn','btnBadge','btnExport','monthNav',
    'sloganText','heroDate','heroTitle','heroStreak','statCompleted','statRate','habitList',
    'lockBanner','dailyNoteInput','weeklyChart','calGrid','calSelectedNote','anaBestStreak',
    'anaConsistency','anaTrend','gaugeSvg','gaugePct','gaugeLabel','perfRows','editHabitList',
    'addHabitBtn','newRewardInput','addRewardBtn','rewardsList','darkToggle','importBtn',
    'importFile','resetBtn','tabBar','achievementsModal','achieveClose','lvlIcon','lvlTitle',
    'lvlSub','badgeGrid','congratsPopup','popupRewardTxt','popupClaimBtn','iconOverlay',
    'iconPicker','iconCategoryTabs','iconGrid','toast','updateBanner','updateRefreshBtn',
    'exportModal','exportClose','exportSummary','exportConfirmBtn'
  ];
  ids.forEach(id => { els[id] = document.getElementById(id); });
}

function bindEvents() {
  els.installActionBtn.addEventListener('click', async () => {
    if (!deferredPrompt) { dismissInstallBanner(); return; }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installBanner.classList.remove('show');
  });
  els.installCloseBtn.addEventListener('click', dismissInstallBanner);

  els.btnBadge.addEventListener('click', openAchievements);
  els.btnExport.addEventListener('click', openExportModal);
  els.exportClose.addEventListener('click', closeExportModal);
  els.exportConfirmBtn.addEventListener('click', performExport);
  els.achieveClose.addEventListener('click', closeAchievements);
  els.popupClaimBtn.addEventListener('click', closePopup);
  els.iconOverlay.addEventListener('click', closeIconPicker);
  els.updateRefreshBtn.addEventListener('click', applyUpdate);

  els.tabBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    switchTab(btn.dataset.tab, btn);
  });

  els.monthNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.month-tab');
    if (!btn) return;
    currentYear = parseInt(btn.dataset.year, 10);
    currentMonth = parseInt(btn.dataset.month, 10);
    const now = getNow();
    selectedDate = (currentYear === now.getFullYear() && currentMonth === now.getMonth()) ? now.getDate() : 1;
    buildMonthNav();
    renderAll();
  });

  els.habitList.addEventListener('click', (e) => {
    const card = e.target.closest('.habit-card');
    if (!card) return;
    toggleHabit(card.dataset.habitId);
  });

  els.calGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-day');
    if (!cell || !cell.dataset.day) return;
    selectedDate = parseInt(cell.dataset.day, 10);
    buildCalendarView();
  });

  const saveNoteDebounced = debounce(() => saveState(), 500);
  els.dailyNoteInput.addEventListener('input', (e) => {
    const key = dateKey(currentYear, currentMonth, selectedDate);
    state.notes[key] = e.target.value.slice(0, 4000);
    saveNoteDebounced();
  });

  els.editHabitList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const row = e.target.closest('[data-habit-id]');
    const id = row && row.dataset.habitId;
    if (!id) return;
    if (btn.dataset.action === 'icon') openIconPicker(id);
    if (btn.dataset.action === 'delete') deleteHabit(id);
  });
  els.editHabitList.addEventListener('change', (e) => {
    const input = e.target.closest('[data-action="rename"]');
    if (!input) return;
    const row = e.target.closest('[data-habit-id]');
    if (row) updateHabitName(row.dataset.habitId, input.value);
  });

  els.addHabitBtn.addEventListener('click', addNewHabit);
  els.addRewardBtn.addEventListener('click', addReward);
  els.rewardsList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-reward"]');
    if (!btn) return;
    const row = e.target.closest('[data-index]');
    if (row) deleteReward(parseInt(row.dataset.index, 10));
  });

  els.iconCategoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-cat-tab');
    if (!btn) return;
    activeIconCategory = btn.dataset.cat;
    renderIconCategoryTabs();
    renderIconGrid();
  });
  els.iconGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.icon-pick-btn');
    if (!btn || !activeEditingHabitId) return;
    const h = state.habits.find(x => x.id === activeEditingHabitId);
    if (h) { h.icon = btn.dataset.icon; await saveState(); buildSettingsView(); buildTodayView(); }
    closeIconPicker();
  });

  els.darkToggle.addEventListener('change', toggleTheme);
  els.importBtn.addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    importData(file);
    e.target.value = '';
  });
  els.resetBtn.addEventListener('click', resetData);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// ---------- AppCore: shared interface for todo.js / bmi.js ----------
window.AppCore = {
  getState: () => state,
  saveState,
  esc,
  showToast,
  generateSafeId,
  dateKey: dateKeyFromDate,
  getNow,
  pad
};

// ---------- INIT ----------
async function init() {
  cacheEls();
  state = await loadState();

  const now0 = getNow();
  currentYear = now0.getFullYear();
  currentMonth = now0.getMonth();
  selectedDate = now0.getDate();

  if (state.dark) document.body.classList.add('dark');
  buildMonthNav();
  renderAll();
  bindEvents();

  if (window.TodoModule) TodoModule.init();
  if (window.BmiModule) BmiModule.init();
  if (window.TodoModule) TodoModule.setVisible(activeTab === 'today');

  maybeShowInstallBanner();
  registerServiceWorker();
}

init();
