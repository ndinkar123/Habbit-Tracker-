(function(global) {
  'use strict';
  const els = {};
  let gender = 'male';

  function init() {
    ['bmiOpenBtn','bmiModal','bmiClose','bmiGenderGroup','bmiAge','bmiHeightCm','bmiWeightKg','bmiActivity','bmiCalcBtn','bmiResult','bmiValue','bmiCategory','bmiTdee','bmiBmr','bmiSparkline'].forEach(id => els[id] = document.getElementById(id));
    
    els.bmiOpenBtn.addEventListener('click', () => { loadProfile(); renderSparkline(); els.bmiModal.classList.add('show'); });
    els.bmiClose.addEventListener('click', () => els.bmiModal.classList.remove('show'));
    
    els.bmiGenderGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-gender]');
      if(!btn) return;
      gender = btn.dataset.gender;
      Array.from(els.bmiGenderGroup.children).forEach(b => b.classList.toggle('active', b === btn));
    });

    els.bmiCalcBtn.addEventListener('click', async () => {
      const age = parseFloat(els.bmiAge.value);
      const h = parseFloat(els.bmiHeightCm.value);
      const w = parseFloat(els.bmiWeightKg.value);
      const act = parseFloat(els.bmiActivity.value);
      
      if(!age || !h || !w) { AppCore.showToast('Please fill all fields'); return; }
      
      const bmi = w / ((h/100)*(h/100));
      els.bmiValue.textContent = bmi.toFixed(1);
      
      let cat = 'Normal', cls = 'bmi-normal';
      if(bmi < 18.5) { cat = 'Underweight'; cls = 'bmi-under'; }
      else if(bmi >= 25 && bmi < 30) { cat = 'Overweight'; cls = 'bmi-over'; }
      else if(bmi >= 30) { cat = 'Obese'; cls = 'bmi-obese'; }
      
      els.bmiCategory.textContent = cat;
      els.bmiCategory.className = 'bmi-category-badge ' + cls;
      
      // Mifflin-St Jeor Equation for true BMR
      let bmr = (10 * w) + (6.25 * h) - (5 * age) + (gender === 'male' ? 5 : -161);
      els.bmiBmr.textContent = Math.round(bmr);
      els.bmiTdee.textContent = Math.round(bmr * act);
      
      els.bmiResult.style.display = 'block';
      
      const state = AppCore.getState();
      if(!state.bmiHistory) state.bmiHistory = {};
      state.bmiHistory[Date.now()] = bmi;
      
      state.bmiProfile = { age, heightCm: h, weightKg: w, activity: act, gender };
      await AppCore.saveState();
      renderSparkline();
    });
  }

  function loadProfile() {
    const p = AppCore.getState().bmiProfile || {};
    els.bmiAge.value = p.age || '';
    els.bmiHeightCm.value = p.heightCm || '';
    els.bmiWeightKg.value = p.weightKg || '';
    els.bmiActivity.value = p.activity || '1.2';
    if(p.gender === 'female') els.bmiGenderGroup.children[1].click();
  }

  function renderSparkline() {
    const ctx = els.bmiSparkline.getContext('2d');
    const hist = Object.values(AppCore.getState().bmiHistory || {}).slice(-7);
    ctx.clearRect(0, 0, 400, 80);
    if(hist.length < 2) return;
    
    const min = Math.min(...hist) - 1, max = Math.max(...hist) + 1;
    const dx = 400 / (hist.length - 1);
    
    ctx.beginPath();
    hist.forEach((val, i) => {
      const x = i * dx;
      const y = 80 - ((val - min) / (max - min) * 80);
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#6B8E23';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  global.BmiModule = { init };
})(window);
