import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAmountOperation, createBackup, defaultPreferences, formatMinor, isCalendarDate,
  parseAmountToMinor, relativeLocalDate, validateBackup,
} from '../src/domain.ts';

const record = (overrides = {}) => ({
  id: 'fixture-1', type: 'expense', amountMinor: 4250, category: null, note: null,
  occurredOn: '2025-02-28', createdAt: '2025-02-28T12:00:00.000Z', ...overrides,
});

test('money parses exact decimal strings to integer minor units and formats deterministically', () => {
  assert.equal(parseAmountToMinor('42'), 4200);
  assert.equal(parseAmountToMinor('42.50'), 4250);
  assert.equal(parseAmountToMinor('0.01'), 1);
  assert.equal(formatMinor(4250), '42.50');
  for (const value of ['0', '-1', '1.001', '1e2', 'abc', '']) assert.throws(() => parseAmountToMinor(value));
});

test('calculator uses integer minor units and rejects non-positive results', () => {
  assert.equal(applyAmountOperation(5800, '+', 1200), 7000);
  assert.equal(applyAmountOperation(5800, '-', 1200), 4600);
  assert.throws(() => applyAmountOperation(1200, '-', 1200));
  assert.throws(() => applyAmountOperation(1200, '-', 1300));
});

test('local relative dates cross month and year boundaries without UTC conversion', () => {
  assert.equal(relativeLocalDate(-1, new Date(2025, 0, 1, 1)), '2024-12-31');
  assert.equal(relativeLocalDate(-2, new Date(2024, 2, 1, 23)), '2024-02-28');
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2025-02-29'), false);
  assert.equal(isCalendarDate('2025-13-01'), false);
});

test('G1 backup schema 2 preserves records and preferences', () => {
  const preferences = { ...defaultPreferences(), bigMode: true, customCategories: [{ id: 'coffee', type: 'expense', name: '咖啡', icon: 'food' }] };
  const backup = createBackup([record(), record({ id: 'fixture-2', type: 'income', category: '工资' })], preferences, '2025-02-28T12:01:00.000Z');
  const restored = validateBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(restored.schemaVersion, 2);
  assert.equal(restored.recordCount, 2);
  assert.deepEqual(restored.preferences, preferences);
});

test('G0 backup schema 1 remains accepted for upgrade compatibility', () => {
  const backup = {
    formatId: 'family-cfo-lite-g0', schemaVersion: 1, exportedAt: '2025-02-28T12:01:00.000Z',
    recordCount: 1, records: [record()],
  };
  const restored = validateBackup(backup);
  assert.equal(restored.schemaVersion, 1);
  assert.equal(restored.records[0].category, null);
});

test('backup rejects malformed format, count, duplicate ids, invalid preferences and invalid records', () => {
  const base = createBackup([record()], defaultPreferences(), '2025-02-28T12:01:00.000Z');
  const rejects = [
    { ...base, schemaVersion: 99 },
    { ...base, recordCount: 2 },
    { ...base, records: [record(), record()], recordCount: 2 },
    { ...base, records: [record({ amountMinor: 0 })] },
    { ...base, records: [record({ amountMinor: 1.2 })] },
    { ...base, records: [record({ occurredOn: '2025-02-30' })] },
    { ...base, records: [record({ type: 'transfer' })] },
    { ...base, preferences: { ...defaultPreferences(), customCategories: [{ id: 'x', type: 'expense', name: '', icon: 'food' }] } },
  ];
  for (const value of rejects) assert.throws(() => validateBackup(value));
  assert.throws(() => validateBackup(JSON.parse('{"broken":')));
});
