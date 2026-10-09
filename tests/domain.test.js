import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackup, isCalendarDate, parseAmountToMinor, relativeLocalDate, validateBackup } from '../src/domain.ts';

test('money parses exact decimal strings to integer minor units', () => {
  assert.equal(parseAmountToMinor('42'), 4200);
  assert.equal(parseAmountToMinor('42.50'), 4250);
  assert.equal(parseAmountToMinor('0.01'), 1);
  for (const value of ['0', '-1', '1.001', '1e2', 'abc', '']) assert.throws(() => parseAmountToMinor(value));
});

test('local relative dates cross month and year boundaries without UTC conversion', () => {
  assert.equal(relativeLocalDate(-1, new Date(2025, 0, 1, 1)), '2024-12-31');
  assert.equal(relativeLocalDate(-2, new Date(2024, 2, 1, 23)), '2024-02-28');
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2025-02-29'), false);
  assert.equal(isCalendarDate('2025-13-01'), false);
});

const record = (overrides = {}) => ({
  id: 'fixture-1', type: 'expense', amountMinor: 4250, category: null, note: null,
  occurredOn: '2025-02-28', createdAt: '2025-02-28T12:00:00.000Z', ...overrides,
});

test('backup accepts optional category and both independent entry types', () => {
  const backup = createBackup([record(), record({ id: 'fixture-2', type: 'income', category: '工资' })], '2025-02-28T12:01:00.000Z');
  assert.equal(validateBackup(JSON.parse(JSON.stringify(backup))).recordCount, 2);
});

test('backup rejects malformed format, count, duplicate ids and invalid records', () => {
  const base = createBackup([record()], '2025-02-28T12:01:00.000Z');
  const rejects = [
    { ...base, schemaVersion: 99 },
    { ...base, recordCount: 2 },
    { ...base, records: [record(), record()] , recordCount: 2 },
    { ...base, records: [record({ amountMinor: 0 })] },
    { ...base, records: [record({ amountMinor: 1.2 })] },
    { ...base, records: [record({ occurredOn: '2025-02-30' })] },
    { ...base, records: [record({ type: 'transfer' })] },
    '{broken json',
  ];
  for (const value of rejects) assert.throws(() => validateBackup(typeof value === 'string' ? JSON.parse(value) : value));
});
