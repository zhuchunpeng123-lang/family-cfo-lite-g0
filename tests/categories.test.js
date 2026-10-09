import test from 'node:test';
import assert from 'node:assert/strict';
import { categoriesFor, commonCategories, hasCategoryName } from '../src/categories.ts';
import { defaultPreferences } from '../src/domain.ts';

test('default category library is complete enough while common list stays at eight', () => {
  const preferences = defaultPreferences();
  assert.equal(categoriesFor('expense', preferences).length, 20);
  assert.equal(categoriesFor('income', preferences).length, 10);
  assert.equal(commonCategories('expense', preferences, [], 8).length, 8);
  assert.deepEqual(commonCategories('expense', preferences, [], 8).map((item) => item.name), ['餐饮', '买菜', '交通', '购物', '居住', '医疗', '娱乐', '运动']);
});

test('recent usage moves a category into common list and custom names participate', () => {
  const preferences = { ...defaultPreferences(), customCategories: [{ id: 'coffee', type: 'expense', name: '咖啡', icon: 'food' }] };
  const records = [
    { id: '1', type: 'expense', amountMinor: 1200, category: '咖啡', note: null, occurredOn: '2026-10-09', createdAt: '2026-10-09T00:00:00.000Z' },
    { id: '2', type: 'expense', amountMinor: 1200, category: '咖啡', note: null, occurredOn: '2026-10-09', createdAt: '2026-10-09T00:01:00.000Z' },
  ];
  assert.equal(commonCategories('expense', preferences, records, 8)[0].name, '咖啡');
  assert.equal(hasCategoryName('expense', '咖啡', preferences), true);
});
