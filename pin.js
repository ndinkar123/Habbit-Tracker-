/*
 * pin.js — 4-digit App Lock for Habits Pro
 * Uses window.AppCore (defined in app.js) for shared state/helpers, same
 * pattern as todo.js / bmi.js. The PIN is stored as a SHA-256 hash, never
 * in plain text — but note this is a soft, client-side lock (there's no
 * server to enforce it against), and is meant to deter casual snooping,
 * not to be strong security. "Forgot PIN" wipes local data because there
 * is no way to recover a forgotten PIN without a server.
 */
(function (global) {
  'use strict';

  const els = {};
  let stage = null;       // 'unlock' | 'newPin' | 'confirmPin' | 'verifyForChange' | 'verifyForDisable'
  let buffer = '';
  let firstEntry = '';
  let onUnlockSuccess = null;

  function cacheEls() {
    els.lockScreen = document.getElementById('pinLockScreen');
    els.lockTitle = document.getElementById('pinLockTitle');
    els.dots = document.getElementById('pinDots');
    els.error = document.getElementById('pinError');
    els.keypad = document.getElementById('pinKeypad');
    els.forgotBtn = document.getElementById('pinForgotBtn');
    els.cancelBtn = document.getElementById('pinCancelBtn');
    els.pinToggle = document.getElementById('pinToggle');
    els.pinChangeRow = document.getElementById('pinChangeRow');
  }

  function fallbackHash(str) {
    // Only used if crypto.subtle is unavailable (non-secure context, e.g.
    // local file:// testing). GitHub Pages serves over HTTPS, so the real
    // SHA-256 path below is what runs in normal use.
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return 'fb_' + Math.abs(h).toString(16);
  }

  async function hashPin(pin) {
    const salted = 'habitsProSalt_' + pin;
    if (!global.crypto || !global.crypto.subtle) return fallbackHash(salted);
    try {
      const enc = new TextEncoder().encode(salted);
      const buf = await crypto.subtle.digest('SHA-256', enc);
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return fallbackHash(salted);
    }
  }

  function renderDots() {
    els.dots.querySelectorAll('.pin-dot').forEach((d, i) => d.classList.toggle('filled', i < buffer.length));
  }

  function shake() {
    els.dots.classList.remove('shake');
    void els.dots.offsetWidth; // restart animation
    els.dots.classList.add('shake');
  }

  function resetBuffer(hideError) {
    buffer = '';
    renderDots();
    if (hideError !== false) els.error.style.visibility = 'hidden';
  }

  function showError(msg) {
    els.error.textContent = msg || 'Incorrect PIN';
    els.error.style.visibility = 'visible';
    shake();
    resetBuffer(false);
  }

  function updateSettingsUI() {
    const state = AppCore.getState();
    els.pinToggle.checked = !!state.pinEnabled;
    els.pinChangeRow.style.display = state.pinEnabled ? 'flex' : 'none';
  }

  function closeLockScreen() {
    els.lockScreen.style.display = 'none';
    buffer = '';
    stage = null;
  }

  function openLockScreen(newStage, opts) {
    stage = newStage;
    firstEntry = '';
    buffer = '';
    els.error.style.visibility = 'hidden';
    els.cancelBtn.style.display = (newStage === 'unlock') ? 'none' : 'block';
    els.forgotBtn.style.display = (newStage === 'unlock') ? 'block' : 'none';
    const titles = {
      unlock: 'Enter PIN',
      verifyForChange: 'Enter Current PIN',
      verifyForDisable: 'Enter Current PIN to Disable',
      newPin: 'Create a 4-Digit PIN'
    };
    els.lockTitle.textContent = titles[newStage] || 'Enter PIN';
    renderDots();
    els.lockScreen.style.display = 'flex';
    onUnlockSuccess = (opts && opts.onSuccess) || null;
  }

  async function handleComplete() {
    const state = AppCore.getState();

    if (stage === 'unlock') {
      const h = await hashPin(buffer);
      if (h === state.pinHash) {
        closeLockScreen();
        if (onUnlockSuccess) onUnlockSuccess();
      } else {
        showError('Incorrect PIN');
      }
      return;
    }

    if (stage === 'verifyForChange' || stage === 'verifyForDisable') {
      const h = await hashPin(buffer);
      if (h !== state.pinHash) { showError('Incorrect PIN'); return; }
      if (stage === 'verifyForDisable') {
        state.pinEnabled = false;
        state.pinHash = '';
        await AppCore.saveState();
        closeLockScreen();
        updateSettingsUI();
        AppCore.showToast('🔓 App Lock disabled');
      } else {
        stage = 'newPin';
        firstEntry = '';
        els.lockTitle.textContent = 'Create a New PIN';
        resetBuffer();
      }
      return;
    }

    if (stage === 'newPin') {
      firstEntry = buffer;
      stage = 'confirmPin';
      els.lockTitle.textContent = 'Confirm New PIN';
      resetBuffer();
      return;
    }

    if (stage === 'confirmPin') {
      if (buffer !== firstEntry) {
        stage = 'newPin';
        firstEntry = '';
        els.lockTitle.textContent = 'Create a New PIN';
        showError("PINs didn't match — try again");
        return;
      }
      const h = await hashPin(buffer);
      state.pinHash = h;
      state.pinEnabled = true;
      await AppCore.saveState();
      closeLockScreen();
      updateSettingsUI();
      AppCore.showToast('🔒 App Lock enabled');
    }
  }

  function bindEvents() {
    els.keypad.addEventListener('click', (e) => {
      const key = e.target.closest('.pin-key');
      if (!key || key.disabled) return;
      if (key.id === 'pinDelKey') {
        buffer = buffer.slice(0, -1);
        renderDots();
        return;
      }
      if (buffer.length >= 4) return;
      buffer += key.dataset.key;
      renderDots();
      if (buffer.length === 4) setTimeout(handleComplete, 120);
    });

    els.cancelBtn.addEventListener('click', closeLockScreen);

    els.forgotBtn.addEventListener('click', () => {
      const ok = confirm(
        "Forgot your PIN?\n\nThere is no way to recover it — the only option is to erase ALL app data " +
        "(habits, history, tasks, rewards). This cannot be undone.\n\nErase everything and start fresh?"
      );
      if (ok) AppCore.hardReset();
    });

    els.pinToggle.addEventListener('change', () => {
      const state = AppCore.getState();
      if (els.pinToggle.checked) {
        if (state.pinEnabled) return;
        openLockScreen('newPin');
      } else {
        els.pinToggle.checked = true; // revert visually until verified
        openLockScreen('verifyForDisable');
      }
    });

    els.pinChangeRow.addEventListener('click', () => {
      openLockScreen('verifyForChange');
    });
  }

  function maybeLockOnBoot(onUnlocked) {
    const state = AppCore.getState();
    if (state.pinEnabled && state.pinHash) {
      openLockScreen('unlock', { onSuccess: onUnlocked });
    } else if (onUnlocked) {
      onUnlocked();
    }
  }

  function init() {
    cacheEls();
    bindEvents();
    updateSettingsUI();
  }

  global.PinModule = { init, maybeLockOnBoot, updateSettingsUI };
})(window);
