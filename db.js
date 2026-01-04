// js/db.js
class LocalDB {
  constructor() {
    this.dbName = 'PensionDB';
    this.storeName = 'pensionData';
    this.version = 1;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async save(data) {
    const tx = this.db.transaction([this.storeName], 'readwrite');
    tx.objectStore(this.storeName).put(data, 'pensionData');
    return tx.complete;
  }

  async get() {
    const tx = this.db.transaction([this.storeName], 'readonly');
    return tx.objectStore(this.storeName).get('pensionData');
  }
}

// 导出给 app.js 使用
window.LocalDB = LocalDB;