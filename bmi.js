/*
 * bmi.js — BMI Calculator module for Habits Pro
 * Opened from a button at the bottom of the Calendar tab.
 * Uses window.AppCore (defined in app.js) for shared state/helpers.
 * Informational only: standard BMI categories + Mifflin-St Jeor BMR
 * estimate, no diet/exercise prescriptions.
 */
(function (global) {
  'use strict';

  const els = {};
  let unit = 'metric';   // 'metric' | 'imperial'
  let gender = 'male';   // 'male' | 'female'

  function cacheEls() {
    els.openBtn = document.getElementById('bmiOpenBtn');
    els.modal = document.getElementById('bmiModal');
    els.close = document.getElementById('bmiClose');
    els.genderGroup = document.getElementById('bmiGenderGroup');
    els.unitGroup = document.getElementById('bmiUnitGroup');
    els.age = document.getElementById('bmiAge');
    els.metricFields = document.getElementById('bmiMetricFields');
    els.imperialFields = document.getElementById('bmiImperialFields');
    els.heightCm = document.getElementById('bmiHeightCm');
    els.weightKg = document.getElementById('bmiWeightKg');
    els.heightFt = document.getElementById('bmiHeightFt');
    els.heightIn = document.getElementById('bmiHeightIn');
    els.weightLb = document.getElementById('bmiWeightLb');
    els.calcBtn = document.getElementById('bmiCalcBtn');
    els.result = document.getElementById('bmiResult');
    els.value = document.getElementById('bmiValue');
    els.category = document.getElementById('bmiCategory');
    els.pointer = document.getElementById('bmiPointer');
    els.healthyRange = document.getElementById('bmiHealthyRange');
    els.bmr = document.getElementById('bmiBmr');
    els.historyList = document.getElementById('bmiHistoryList');
    els.historyEmpty = document.getElementById('bmiHistoryEmpty');
  }

  function categoryFor(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', className: 'bmi-under' };
    if (bmi < 25) return { label: 'Normal', className: 'bmi-normal' };
    if (bmi < 30) return { label: 'Overweight', className: 'bmi-over' };
    return { label: 'Obesity', className: 'bmi-obese' };
  }

  function computeBMR(weightKg, heightCm, age, gen) {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(gen === 'female' ? base - 161 : base + 5);
  }

  function loadProfile() {
    const state = AppCore.getState();
    const p = state.bmiProfile || {};
    gender = p.gender === 'female' ? 'female' : 'male';
    unit = p.unit === 'imperial' ? 'imperial' : 'metric';
    els.age.value = p.age || '';
    els.heightCm.value = p.heightCm || '';
    els.weightKg.value = p.weightKg || '';
    els.heightFt.value = p.heightFt || '';
    els.heightIn.value = p.heightIn || '';
    els.weightLb.value = p.weightLb || '';
    updateToggleUI();
  }

  async function saveProfile() {
    const state = AppCore.getState();
    state.bmiProfile = {
      gender, unit,
      age: els.age.value,
      heightCm: els.heightCm.value,
      weightKg: els.weightKg.value,
      heightFt: els.heightFt.value,
      heightIn: els.heightIn.value,
      weightLb: els.weightLb.value
    };
    await AppCore.saveState();
  }

  function updateToggleUI() {
    els.genderGroup.querySelectorAll('[data-gender]').forEach(b => {
      b.classList.toggle('active', b.dataset.gender === gender);
    });
    els.unitGroup.querySelectorAll('[data-unit]').forEach(b => {
      b.classList.toggle('active', b.dataset.unit === unit);
    });
    els.metricFields.style.display = unit === 'metric' ? 'flex' : 'none';
    els.imperialFields.style.display = unit === 'imperial' ? 'flex' : 'none';
  }

  function getHeightCm() {
    if (unit === 'metric') return parseFloat(els.heightCm.value) || 0;
    const ft = parseFloat(els.heightFt.value) || 0;
    const inch = parseFloat(els.heightIn.value) || 0;
    return (ft * 12 + inch) * 2.54;
  }

  function getWeightKg() {
    if (unit === 'metric') return parseFloat(els.weightKg.value) || 0;
    return (parseFloat(els.weightLb.value) || 0) * 0.453592;
  }

  async function calculate() {
    const heightCm = getHeightCm();
    const weightKg = getWeightKg();
    const age = parseInt(els.age.value, 10) || 0;

    if (!heightCm || !weightKg || heightCm < 50 || heightCm > 260 || weightKg < 10 || weightKg > 400) {
      AppCore.showToast('⚠️ Enter a valid height and weight');
      return;
    }

    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    const cat = categoryFor(bmi);

    els.value.textContent = bmi.toFixed(1);
    els.category.textContent = cat.label;
    els.category.className = 'bmi-category-badge ' + cat.className;

    const pct = Math.max(0, Math.min(100, ((bmi - 15) / (35 - 15)) * 100));
    els.pointer.style.left = pct + '%';

    const minHealthy = 18.5 * heightM * heightM;
    const maxHealthy = 24.9 * heightM * heightM;
    if (unit === 'metric') {
      els.healthyRange.textContent = 'Healthy weight for your height: ' + minHealthy.toFixed(1) + '–' + maxHealthy.toFixed(1) + ' kg';
    } else {
      els.healthyRange.textContent = 'Healthy weight for your height: ' + (minHealthy * 2.20462).toFixed(1) + '–' + (maxHealthy * 2.20462).toFixed(1) + ' lb';
    }

    if (age > 0) {
      const bmr = computeBMR(weightKg, heightCm, age, gender);
      els.bmr.textContent = 'Estimated resting energy use: ~' + bmr + ' kcal/day';
      els.bmr.style.display = 'block';
    } else {
      els.bmr.style.display = 'none';
    }

    els.result.style.display = 'block';

    const state = AppCore.getState();
    if (!state.bmiHistory) state.bmiHistory = {};
    const todayKey = AppCore.dateKey(AppCore.getNow());
    state.bmiHistory[todayKey] = {
      bmi: Math.round(bmi * 10) / 10,
      category: cat.label,
      weightKg: Math.round(weightKg * 10) / 10,
      heightCm: Math.round(heightCm)
    };
    await AppCore.saveState();
    await saveProfile();
    renderHistory();
  }

  function renderHistory() {
    const state = AppCore.getState();
    const entries = Object.keys(state.bmiHistory || {}).sort().reverse().slice(0, 6);
    els.historyList.innerHTML = '';
    els.historyEmpty.style.display = entries.length ? 'none' : 'block';
    const frag = document.createDocumentFragment();
    entries.forEach(dk => {
      const e = state.bmiHistory[dk];
      const row = document.createElement('div');
      row.className = 'bmi-history-row';
      row.innerHTML =
        '<span class="bmi-history-date">' + AppCore.esc(dk) + '</span>' +
        '<span class="bmi-history-val">' + e.bmi.toFixed(1) + ' · ' + AppCore.esc(e.category) + '</span>';
      frag.appendChild(row);
    });
    els.historyList.appendChild(frag);
  }

  function open() {
    loadProfile();
    renderHistory();
    els.modal.classList.add('show');
  }
  function close() { els.modal.classList.remove('show'); }

  function bindEvents() {
    els.openBtn.addEventListener('click', open);
    els.close.addEventListener('click', close);
    els.genderGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gender]');
      if (!btn) return;
      gender = btn.dataset.gender;
      updateToggleUI();
    });
    els.unitGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-unit]');
      if (!btn) return;
      unit = btn.dataset.unit;
      updateToggleUI();
    });
    els.calcBtn.addEventListener('click', calculate);
  }

  function init() {
    cacheEls();
    bindEvents();
  }

  global.BmiModule = { init };
})(window);
