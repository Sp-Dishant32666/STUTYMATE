import { LedgerState, ScanRecord } from '../types';

const LEDGER_STORAGE_KEY = 'pageledger_state_v1';
const DB_NAME = 'pageledger_db';
const DB_VERSION = 1;
const SCANS_STORE = 'scans';

export function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTodayDisplay(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMinutesAsHours(totalMinutes: number): string {
  const clamped = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h 00m`;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

export function getInitialLedgerState(): LedgerState {
  const today = getTodayDateKey();
  const defaults: LedgerState = {
    pointsBalance: 0,
    chillBankMinutes: 240, // 4 hours starting allowance
    dailyChillUsedDate: today,
    dailyChillUsedMinutes: 0,
    purchases: [],
    activeSession: null,
  };

  try {
    const raw = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw) as LedgerState;
    if (parsed.dailyChillUsedDate !== today) {
      parsed.dailyChillUsedDate = today;
      parsed.dailyChillUsedMinutes = 0;
    }
    return {
      ...defaults,
      ...parsed,
    };
  } catch {
    return defaults;
  }
}

export function saveLedgerState(state: LedgerState): void {
  try {
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SCANS_STORE)) {
        const store = db.createObjectStore(SCANS_STORE, { keyPath: 'id' });
        store.createIndex('scannedAt', 'scannedAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllScans(): Promise<ScanRecord[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SCANS_STORE, 'readonly');
      const store = tx.objectStore(SCANS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result as ScanRecord[]) || [];
        records.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
        resolve(records);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveScanRecord(record: ScanRecord): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SCANS_STORE, 'readwrite');
    const store = tx.objectStore(SCANS_STORE);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteScanRecord(id: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SCANS_STORE, 'readwrite');
    const store = tx.objectStore(SCANS_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function compressImageDataUrl(
  sourceDataUrl: string,
  maxDimension: number,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDimension / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * ratio));
      const height = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image canvas.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to load captured image.'));
    img.src = sourceDataUrl;
  });
}
