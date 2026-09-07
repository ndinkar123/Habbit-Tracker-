/*
 * storage.js
 * Persistence layer for Habits Pro.
 * - Primary store: IndexedDB (bigger quota, structured, async).
 * - Falls back to localStorage automatically if IndexedDB is unavailable
 *   (older browsers, some private-browsing modes).
 * - Also migrates data from the old localStorage-only versions of the app
 *   so existing users don't lose their history when this version ships.
 * Exposes a single global: `Store`.
 */
(function (global) {
  'use strict';

  const DB_NAME = 'habitsProDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'kv';
  const STATE_KEY = 'appState';
  const LEGACY_KEYS = ['habitTrackerProDataV5', 'habitTrackerProDataV4', 'habitTracker2026'];
  const LOCAL_FALLBACK_KEY = 'habitsProStateV2';

  let dbPromise = null;
  let useLocalFallback = false;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in global)) {
        useLocalFallback = true;
        reject(new Error('IndexedDB not supported'));
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          useLocalFallback = true;
          reject(req.error || new Error('IndexedDB open failed'));
        };
      } catch (e) {
        useLocalFallback = true;
        reject(e);
      }
    });
    return dbPromise;
  }

  function idbGet(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
      req.onerror = () => reject(req.error);
    }));
  }

  function idbSet(key, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    }));
  }

  function localGet(key) {
    try {
      const raw = localStorage.getItem(LOCAL_FALLBACK_KEY + ':' + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function localSet(key, value) {
    try {
      localStorage.setItem(LOCAL_FALLBACK_KEY + ':' + key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  async function get(key) {
    if (useLocalFallback) return localGet(key);
    try {
      return await idbGet(key);
    } catch (e) {
      return localGet(key);
    }
  }

  async function set(key, value) {
    if (useLocalFallback) return localSet(key, value);
    try {
      return await idbSet(key, value);
    } catch (e) {
      return localSet(key, value);
    }
  }

  // Reads any pre-existing data from the old localStorage-only versions
  // of the app. Returns the raw parsed object, or null if nothing is found.
  function readLegacyLocalStorage() {
    for (const k of LEGACY_KEYS) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') return parsed;
        }
      } catch (e) { /* ignore and try next key */ }
    }
    return null;
  }

  global.Store = {
    STATE_KEY,
    get,
    set,
    readLegacyLocalStorage
  };
})(window);
