import type { AppPreferences, CustomCategory, EntryType, LedgerRecord } from './domain';

export interface CategoryDefinition {
  id: string;
  type: EntryType;
  name: string;
  icon: string;
  initialCommon?: boolean;
  custom?: boolean;
}

export const DEFAULT_EXPENSE_CATEGORIES: CategoryDefinition[] = [
  { id: 'food', type: 'expense', name: '餐饮', icon: 'food', initialCommon: true },
  { id: 'grocery', type: 'expense', name: '买菜', icon: 'grocery', initialCommon: true },
  { id: 'transport', type: 'expense', name: '交通', icon: 'transport', initialCommon: true },
  { id: 'shopping', type: 'expense', name: '购物', icon: 'shopping', initialCommon: true },
  { id: 'home', type: 'expense', name: '居住', icon: 'home', initialCommon: true },
  { id: 'medical', type: 'expense', name: '医疗', icon: 'medical', initialCommon: true },
  { id: 'entertainment', type: 'expense', name: '娱乐', icon: 'entertainment', initialCommon: true },
  { id: 'sport', type: 'expense', name: '运动', icon: 'sport', initialCommon: true },
  { id: 'utility', type: 'expense', name: '水电燃气', icon: 'utility' },
  { id: 'phone', type: 'expense', name: '通讯', icon: 'phone' },
  { id: 'travel', type: 'expense', name: '旅行', icon: 'travel' },
  { id: 'car', type: 'expense', name: '汽车', icon: 'car' },
  { id: 'clothes', type: 'expense', name: '服饰', icon: 'clothes' },
  { id: 'beauty', type: 'expense', name: '美容', icon: 'beauty' },
  { id: 'education', type: 'expense', name: '教育', icon: 'education' },
  { id: 'pet', type: 'expense', name: '宠物', icon: 'pet' },
  { id: 'gift', type: 'expense', name: '人情', icon: 'gift' },
  { id: 'insurance', type: 'expense', name: '保险', icon: 'insurance' },
  { id: 'fee', type: 'expense', name: '手续费', icon: 'fee' },
  { id: 'other', type: 'expense', name: '其他', icon: 'more' },
];

export const DEFAULT_INCOME_CATEGORIES: CategoryDefinition[] = [
  { id: 'salary', type: 'income', name: '工资', icon: 'salary', initialCommon: true },
  { id: 'bonus', type: 'income', name: '奖金', icon: 'bonus', initialCommon: true },
  { id: 'parttime', type: 'income', name: '兼职', icon: 'parttime', initialCommon: true },
  { id: 'business', type: 'income', name: '经营', icon: 'business', initialCommon: true },
  { id: 'interest', type: 'income', name: '利息', icon: 'interest', initialCommon: true },
  { id: 'dividend', type: 'income', name: '分红', icon: 'dividend', initialCommon: true },
  { id: 'rent', type: 'income', name: '租金', icon: 'rent', initialCommon: true },
  { id: 'subsidy', type: 'income', name: '补贴', icon: 'subsidy', initialCommon: true },
  { id: 'gift-in', type: 'income', name: '礼金', icon: 'gift' },
  { id: 'other-in', type: 'income', name: '其他', icon: 'more' },
];

export function categoriesFor(type: EntryType, preferences: AppPreferences): CategoryDefinition[] {
  const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const custom = preferences.customCategories.filter((category) => category.type === type).map(customCategoryToDefinition);
  return [...defaults, ...custom];
}

export function commonCategories(
  type: EntryType,
  preferences: AppPreferences,
  records: LedgerRecord[],
  limit = 8,
): CategoryDefinition[] {
  const categories = categoriesFor(type, preferences);
  const counts = new Map<string, number>();
  for (const record of records) {
    if (record.type !== type || !record.category) continue;
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
  }
  return [...categories]
    .sort((a, b) => {
      const countDiff = (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0);
      if (countDiff) return countDiff;
      const commonDiff = Number(Boolean(b.initialCommon)) - Number(Boolean(a.initialCommon));
      if (commonDiff) return commonDiff;
      return categories.indexOf(a) - categories.indexOf(b);
    })
    .slice(0, limit);
}

export function findCategoryByName(type: EntryType, name: string | null, preferences: AppPreferences): CategoryDefinition | null {
  if (!name) return null;
  return categoriesFor(type, preferences).find((category) => category.name === name) ?? null;
}

export function hasCategoryName(type: EntryType, name: string, preferences: AppPreferences): boolean {
  return categoriesFor(type, preferences).some((category) => category.name === name.trim());
}

function customCategoryToDefinition(category: CustomCategory): CategoryDefinition {
  return { ...category, custom: true };
}
