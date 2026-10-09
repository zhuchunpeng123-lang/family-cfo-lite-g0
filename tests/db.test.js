import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPreferences } from '../src/domain.ts';
import {
  clearRecords, deleteRecord, openDatabase, readPreferences, readRecords, replaceSnapshot,
  savePreferences, saveRecord, updateRecord,
} from '../src/db.ts';

const sample = (id, overrides = {}) => ({
  id, type: 'expense', amountMinor: 4200, category: '餐饮', note: '演示',
  occurredOn: '2026-10-08', createdAt: new Date(Date.UTC(2026, 9, 8, 10, 0, id.length)).toISOString(), ...overrides,
});

beforeEach(async () => {
  await clearRecords();
  await savePreferences(defaultPreferences());
});

test('G0 v1 database upgrades additively to v2 without losing records', async () => {
  const upgraded = sample('g0-row', { category: null, note: null });
  await new Promise((resolve, reject) => {
    const deletion = indexedDB.deleteDatabase('family-cfo-lite-g0');
    deletion.onsuccess = resolve;
    deletion.onerror = () => reject(deletion.error);
  });
  await new Promise((resolve, reject) => {
    const request = indexedDB.open('family-cfo-lite-g0', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records', { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('records', 'readwrite');
      tx.objectStore('records').add(upgraded);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  });
  const db = await openDatabase();
  assert.equal(db.version, 2);
  assert.equal(db.objectStoreNames.contains('records'), true);
  assert.equal(db.objectStoreNames.contains('settings'), true);
  db.close();
  assert.deepEqual(await readRecords(), [upgraded]);
  assert.deepEqual(await readPreferences(), defaultPreferences());
});

test('write completes before success and records read back after reopening', async () => {
  const saved = sample('stable-id', { amountMinor: 4250, category: null, note: null });
  await saveRecord(saved);
  assert.deepEqual(await readRecords(), [saved]);
});

test('update and delete affect only the requested record', async () => {
  const first = sample('first');
  const second = sample('second', { amountMinor: 1800 });
  await saveRecord(first);
  await saveRecord(second);
  const updated = { ...first, amountMinor: 7000, category: '交通' };
  await updateRecord(updated);
  assert.equal((await readRecords()).find((row) => row.id === 'first').amountMinor, 7000);
  await deleteRecord('second');
  assert.deepEqual((await readRecords()).map((row) => row.id), ['first']);
});

test('preferences persist independently from G0 record shape', async () => {
  const preferences = { ...defaultPreferences(), bigMode: true, customCategories: [{ id: 'coffee', type: 'expense', name: '咖啡', icon: 'food' }] };
  await savePreferences(preferences);
  assert.deepEqual(await readPreferences(), preferences);
});

test('schema-2 restore replaces records and preferences in one IndexedDB transaction', async () => {
  await saveRecord(sample('old'));
  const preferences = { ...defaultPreferences(), bigMode: true, customCategories: [{ id: 'coffee', type: 'expense', name: '咖啡', icon: 'food' }] };
  const incoming = [sample('one'), sample('two', { type: 'income', amountMinor: 125 })];
  await replaceSnapshot(incoming, preferences);
  assert.deepEqual(await readRecords(), incoming.sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));
  assert.deepEqual(await readPreferences(), preferences);
});

test('duplicate id aborts snapshot replacement and leaves prior records/preferences untouched', async () => {
  const previous = sample('kept');
  const preferences = { ...defaultPreferences(), bigMode: true };
  await saveRecord(previous);
  await savePreferences(preferences);
  await assert.rejects(replaceSnapshot([sample('new'), sample('new')], defaultPreferences()));
  assert.deepEqual(await readRecords(), [previous]);
  assert.deepEqual(await readPreferences(), preferences);
});
