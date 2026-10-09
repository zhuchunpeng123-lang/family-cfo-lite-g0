import { defaultPreferences, type AppPreferences, type LedgerRecord } from './domain.ts';

const DB_NAME = 'family-cfo-lite-g0';
const DB_VERSION = 2;
const RECORDS_STORE = 'records';
const SETTINGS_STORE = 'settings';

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB 操作失败'));
  });
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.indexedDB) return Promise.reject(new Error('此浏览器不支持 IndexedDB'));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(RECORDS_STORE)) db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('无法打开本机数据库'));
    request.onblocked = () => reject(new Error('数据库正在被其他页面占用，请关闭重复页面后重试'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('本机数据库事务已取消'));
    transaction.onerror = () => reject(transaction.error ?? new Error('本机数据库事务失败'));
  });
}

export async function readRecords(): Promise<LedgerRecord[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(RECORDS_STORE, 'readonly');
    const done = transactionDone(tx);
    const result = await requestResult(tx.objectStore(RECORDS_STORE).getAll()) as LedgerRecord[];
    await done;
    return result.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  } finally { db.close(); }
}

export async function saveRecord(record: LedgerRecord): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(RECORDS_STORE).add(record);
    await done;
  } finally { db.close(); }
}

export async function updateRecord(record: LedgerRecord): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(RECORDS_STORE).put(record);
    await done;
  } finally { db.close(); }
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(RECORDS_STORE).delete(id);
    await done;
  } finally { db.close(); }
}

export async function readPreferences(): Promise<AppPreferences> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(SETTINGS_STORE, 'readonly');
    const done = transactionDone(tx);
    const result = await requestResult(tx.objectStore(SETTINGS_STORE).get('preferences')) as AppPreferences | undefined;
    await done;
    return result ?? defaultPreferences();
  } finally { db.close(); }
}

export async function savePreferences(preferences: AppPreferences): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(SETTINGS_STORE).put(preferences);
    await done;
  } finally { db.close(); }
}

export async function replaceSnapshot(records: LedgerRecord[], preferences?: AppPreferences): Promise<void> {
  const db = await openDatabase();
  try {
    const stores = preferences ? [RECORDS_STORE, SETTINGS_STORE] : [RECORDS_STORE];
    const tx = db.transaction(stores, 'readwrite');
    const done = transactionDone(tx);
    const recordsStore = tx.objectStore(RECORDS_STORE);
    recordsStore.clear();
    for (const record of records) recordsStore.add(record);
    if (preferences) tx.objectStore(SETTINGS_STORE).put(preferences);
    await done;
  } finally { db.close(); }
}

export async function replaceRecords(records: LedgerRecord[]): Promise<void> {
  await replaceSnapshot(records);
}

export async function clearRecords(): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(RECORDS_STORE, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(RECORDS_STORE).clear();
    await done;
  } finally { db.close(); }
}

export async function storagePersistenceStatus(): Promise<'persisted' | 'granted' | 'not-granted' | 'unavailable'> {
  if (!navigator.storage?.persisted || !navigator.storage?.persist) return 'unavailable';
  try {
    if (await navigator.storage.persisted()) return 'persisted';
    return await navigator.storage.persist() ? 'granted' : 'not-granted';
  } catch { return 'not-granted'; }
}
