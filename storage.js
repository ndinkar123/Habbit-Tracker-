(function(global) {
  'use strict';
  const DB_NAME = 'habitsProDB_V6';
  const STORE = 'kv';
  let dbPromise = null;

  function openDB() {
    if(dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function get(key) {
    try {
      const db = await openDB();
      return new Promise(res => {
        const req = db.transaction(STORE).objectStore(STORE).get(key);
        req.onsuccess = () => res(req.result);
      });
    } catch(e) {
      return JSON.parse(localStorage.getItem('v6_'+key) || 'null');
    }
  }

  async function set(key, value) {
    try {
      const db = await openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => res(true);
        tx.onerror = () => rej(tx.error);
      });
    } catch(e) {
      try {
        localStorage.setItem('v6_'+key, JSON.stringify(value));
        return true;
      } catch(quotaErr) {
        if(window.AppCore) AppCore.showToast("⚠️ Storage Full! Clear old history.");
        return false;
      }
    }
  }

  global.Store = { get, set, STATE_KEY: 'appStateV6' };
})(window);
