/*
 * app.js — Habits Pro
 * All rendering escapes user-supplied text (esc()), all events are bound
 * via addEventListener/delegation (no inline on* attributes, so the CSP
 * in index.html can block injected inline scripts), imported/legacy data
 * is validated through sanitizeState() before it ever touches the DOM.
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
function getNow() { return new Date(); }
function generateSafeId() { return 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7); }
function debounce(fn, wait) {
  let t;
  return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
}

// ---------- CONFIG (content unchanged from the original app) ----------
const SLOGANS = [
  "Motivation gets you started. Habit keeps you going.",
  "Every action is a vote for the person you wish to become.",
  "Small daily improvements lead to stunning results.",
  "Success is the product of daily habits.",
  "Focus on the system, not just the goal.",
  "You do not rise to your goals, you fall to your systems.",
  "Excellence is not an act, but a habit.",
  "The secret of getting ahead is getting started.",
  "Consistency is more important than perfection.",
  "Build the habit first, optimize it later."
];

const DEFAULT_HABITS = [
  { id: generateSafeId(), name: 'Read 30 Mins', emoji: '📚' },
  { id: generateSafeId(), name: 'Exercise', emoji: '💪' },
  { id: generateSafeId(), name: 'Meditate', emoji: '🧘' }
];

const DEFAULT_REWARDS = [
  "Watch 1 episode of your favorite show 🎬",
  "Eat a piece of chocolate 🍫",
  "1 hour of guilt-free gaming 🎮",
  "Take a long relaxing bath 🛁",
  "Buy yourself a small treat 🛍️"
];

// req is the single source of truth for badge thresholds (previously duplicated in logic)
const BADGE_DEFS = [
  { id: 'first_step', name: 'First Step', desc: 'Complete 1 habit', emoji: '🌱', req: 1, metric: 'total' },
  { id: 'perfect_day', name: 'Perfect Day', desc: '100% in a day', emoji: '⭐', req: 1, metric: 'perfectDay' },
  { id: 'streak_7', name: 'Week Warrior', desc: '7 Day Streak', emoji: '🔥', req: 7, metric: 'streak' },
  { id: 'streak_30', name: 'Monthly Master', desc: '30 Day Streak', emoji: '👑', req: 30, metric: 'streak' },
  { id: 'total_100', name: 'Century Club', desc: '100 Completions', emoji: '💯', req: 100, metric: 'total' },
  { id: 'total_500', name: 'Habit Hero', desc: '500 Completions', emoji: '🦸', req: 500, metric: 'total' }
];

const EMOJIS = ['📚','💪','🧘','💧','🏃','🍎','🌅','🌙','🌿','💻','✍️','🎨','🧠','🚭','☕','🎯','🧩','💰','🐶','🚗'];

// ---------- STATE SHAPE & VALIDATION ----------
function defaultState() {
  return {
    version: 7,
    habits: [],
    data: {},
    notes: {},
    rewards: [],
    badges: {},
    dark: false,
    lastSloganDate: '',
    currentSlogan: '',
    lastCongratsDate: ''
  };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Used both for validating a user-imported backup AND for normalizing
// whatever was found in storage / legacy localStorage on first load.
// Never trusts the shape of its input.
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
      s.habits.push({ id, name, emoji });
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
      .map(r => r.trim().slice(0, 120))
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

  s.dark = !!raw.dark;
  s.lastSloganDate = typeof raw.lastSloganDate === 'string' ? raw.lastSloganDate.slice(0, 10) : '';
  s.currentSlogan = typeof raw.currentSlogan === 'string' ? raw.currentSlogan.slice(0, 200) : '';
  s.lastCongratsDate = typeof raw.lastCongratsDate === 'string' ? raw.lastCongratsDate.slice(0, 10) : '';

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
let deferredPrompt = null;
let pendingUpdateReg = null;

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

// ---------- SLOGAN ----------
function setDailySlogan() {
  const now = getNow();
  const k = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
  if (state.lastSloganDate !== k) {
    state.currentSlogan = SLOGANS[now.getDate() % SLOGANS.length];
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
      '<div class="habit-emoji">' + esc(h.emoji) + '</div>' +
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
  const key = dateKey(currentYear, currentMonth, selectedDate);
  if (!state.data[key]) state.data[key] = {};
  state.data[key][habitId] = !state.data[key][habitId];
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

  const grid = els.donutGrid;
  grid.innerHTML = '';
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const isCurrentRealMonth = (currentYear === now.getFullYear() && currentMonth === now.getMonth());
  const daysPassed = isCurrentRealMonth ? now.getDate() : daysInMonth;
  const circ = 2 * Math.PI * 36;

  const frag = document.createDocumentFragment();
  state.habits.forEach(h => {
    if (!h || !h.id) return;
    let done = 0;
    for (let i = 1; i <= daysPassed; i++) {
      if (getDayData(dateKey(currentYear, currentMonth, i))[h.id]) done++;
    }
    const pct = Math.round((done / daysPassed) * 100 || 0);
    const offset = circ - (circ * (pct / 100));
    const color = pct >= 80 ? 'var(--primary)' : pct >= 40 ? 'var(--accent)' : 'var(--terracotta)';

    const card = document.createElement('div');
    card.className = 'donut-card';
    card.innerHTML =
      '<div class="donut-wrapper">' +
        '<svg viewBox="0 0 80 80">' +
          '<circle class="donut-bg" cx="40" cy="40" r="36"/>' +
          '<circle class="donut-fill" cx="40" cy="40" r="36" stroke="' + color + '" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '"/>' +
        '</svg>' +
        '<div class="donut-inner">' +
          '<div class="donut-emoji">' + esc(h.emoji) + '</div>' +
          '<div class="donut-pct" style="color:' + color + '">' + pct + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="donut-name">' + esc(h.name) + '</div>';
    frag.appendChild(card);
  });
  grid.appendChild(frag);
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
      '<button type="button" class="icon-btn" data-action="emoji" style="font-size:24px;">' + esc(h.emoji) + '</button>' +
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
    streak
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
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate());
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
  state.habits.push({ id: generateSafeId(), name: 'New Habit', emoji: '🌟' });
  await saveState();
  buildSettingsView();
  showToast('➕ Habit Added!');
}

async function addReward() {
  const val = els.newRewardInput.value.trim().slice(0, 120);
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

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'HabitTrackerPro_Backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast('⬇️ Backup Exported');
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

// ---------- EMOJI PICKER ----------
function openEmojiPicker(id) {
  activeEditingHabitId = id;
  const grid = els.emojiGrid;
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  EMOJIS.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'emoji-btn';
    btn.textContent = e;
    btn.dataset.emoji = e;
    frag.appendChild(btn);
  });
  grid.appendChild(frag);
  els.emojiOverlay.classList.add('show');
  els.emojiPicker.classList.add('open');
}
function closeEmojiPicker() {
  els.emojiOverlay.classList.remove('show');
  els.emojiPicker.classList.remove('open');
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

// ---------- SERVICE WORKER: registration + update flow ----------
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
    'dailyNoteInput','weeklyChart','calGrid','calSelectedNote','anaBestStreak','anaConsistency',
    'anaTrend','donutGrid','editHabitList','addHabitBtn','newRewardInput','addRewardBtn',
    'rewardsList','darkToggle','importBtn','importFile','resetBtn','tabBar','achievementsModal',
    'achieveClose','lvlIcon','lvlTitle','lvlSub','badgeGrid','congratsPopup','popupRewardTxt',
    'popupClaimBtn','emojiOverlay','emojiPicker','emojiGrid','toast','updateBanner','updateRefreshBtn'
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
  els.btnExport.addEventListener('click', exportData);
  els.achieveClose.addEventListener('click', closeAchievements);
  els.popupClaimBtn.addEventListener('click', closePopup);
  els.emojiOverlay.addEventListener('click', closeEmojiPicker);
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
    if (btn.dataset.action === 'emoji') openEmojiPicker(id);
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

  els.emojiGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.emoji-btn');
    if (!btn || !activeEditingHabitId) return;
    const h = state.habits.find(x => x.id === activeEditingHabitId);
    if (h) { h.emoji = btn.dataset.emoji; await saveState(); buildSettingsView(); }
    closeEmojiPicker();
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
  maybeShowInstallBanner();
  registerServiceWorker();
}

init();
