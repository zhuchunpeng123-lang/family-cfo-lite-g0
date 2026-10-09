import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, validateBackup } from '../src/domain.ts';
import { clearRecords, readRecords, replaceRecords, saveRecord } from '../src/db.ts';

const sample = (id, overrides = {}) => ({
  id, type: 'expense', amountMinor: 4200, category: '餐饮', note: '演示',
  occurredOn: '2026-10-08', createdAt: new Date(Date.UTC(2026, 9, 8, 10, 0, id.length)).toISOString(), ...overrides,
});

beforeEach(async () => { await clearRecords(); });

test('write completes before success and records read back after closing and reopening the database', async () => {
  const saved = sample('stable-id', { amountMinor: 4250, category: null, note: null });
  await saveRecord(saved);
  assert.deepEqual(await readRecords(), [saved]);
});

test('restore replaces all records and preserves stable ids and fields', async () => {
  const original = [sample('one'), sample('two', { type: 'income', amountMinor: 125 })];
  await saveRecord(sample('old'));
  await replaceRecords(original);
  assert.deepEqual(await readRecords(), original.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));
});

test('JSON export, simulated ledger clear and restore round-trip all records exactly', async () => {
  const source = [sample('roundtrip-a', { category: null, note: null }), sample('roundtrip-b', { type: 'income', amountMinor: 1875, occurredOn: '2026-10-07' })];
  await replaceRecords(source);
  const exported = JSON.stringify(createBackup(await readRecords(), '2026-10-09T00:00:00.000Z'));
  await clearRecords();
  assert.deepEqual(await readRecords(), []);
  const restored = validateBackup(JSON.parse(exported));
  await replaceRecords(restored.records);
  assert.deepEqual(await readRecords(), source.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));
});

test('invalid backup is rejected before restore and leaves existing data unchanged', async () => {
  const existing = sample('safe');
  await saveRecord(existing);
  const invalid = { ...createBackup([sample('incoming')]), records: [{ ...sample('incoming'), occurredOn: '2026-02-30' }] };
  assert.throws(() => validateBackup(invalid));
  assert.deepEqual(await readRecords(), [existing]);
});

test('duplicate id aborts atomic replacement and leaves the prior ledger untouched', async () => {
  const previous = sample('kept');
  await saveRecord(previous);
  await assert.rejects(replaceRecords([sample('new'), sample('new')]));
  assert.deepEqual(await readRecords(), [previous]);
});
