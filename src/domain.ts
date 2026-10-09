export type EntryType = 'expense' | 'income';
export type AmountOperator = '+' | '-';

export interface LedgerRecord {
  id: string;
  type: EntryType;
  amountMinor: number;
  category: string | null;
  note: string | null;
  occurredOn: string;
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  type: EntryType;
  name: string;
  icon: string;
}

export interface AppPreferences {
  key: 'preferences';
  customCategories: CustomCategory[];
  bigMode: boolean;
}

export interface BackupFileV1 {
  formatId: 'family-cfo-lite-g0';
  schemaVersion: 1;
  exportedAt: string;
  recordCount: number;
  records: LedgerRecord[];
}

export interface BackupFileV2 {
  formatId: 'family-cfo-lite-g0';
  schemaVersion: 2;
  exportedAt: string;
  recordCount: number;
  records: LedgerRecord[];
  preferences: AppPreferences;
}

export type BackupFile = BackupFileV1 | BackupFileV2;

export function defaultPreferences(): AppPreferences {
  return { key: 'preferences', customCategories: [], bigMode: false };
}

export function parseAmountToMinor(input: string): number {
  const value = input.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) throw new Error('请输入最多两位小数的正金额');
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('金额必须大于 0 且在可支持范围内');
  return minor;
}

export function formatMinor(minor: number): string {
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('金额格式无效');
  return (minor / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function applyAmountOperation(baseMinor: number, operator: AmountOperator, nextMinor: number): number {
  if (!Number.isSafeInteger(baseMinor) || baseMinor < 0 || !Number.isSafeInteger(nextMinor) || nextMinor <= 0) {
    throw new Error('计算金额无效');
  }
  const result = operator === '+' ? baseMinor + nextMinor : baseMinor - nextMinor;
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('计算结果必须大于 0');
  return result;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function relativeLocalDate(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function createBackup(
  records: LedgerRecord[],
  preferences: AppPreferences,
  exportedAt = new Date().toISOString(),
): BackupFileV2 {
  return {
    formatId: 'family-cfo-lite-g0',
    schemaVersion: 2,
    exportedAt,
    recordCount: records.length,
    records,
    preferences: validatePreferences(preferences),
  };
}

function validateRecord(record: Partial<LedgerRecord>, ids: Set<string>): void {
  if (typeof record.id !== 'string' || record.id.length < 1 || record.id.length > 200 || ids.has(record.id)) {
    throw new Error('备份包含空或重复 ID');
  }
  ids.add(record.id);
  if (record.type !== 'expense' && record.type !== 'income') throw new Error('备份包含无效收支类型');
  if (!Number.isSafeInteger(record.amountMinor) || (record.amountMinor ?? 0) <= 0) throw new Error('备份金额必须是正整数分');
  if (record.category !== null && (typeof record.category !== 'string' || record.category.length > 80)) throw new Error('备份分类无效');
  if (record.note !== null && (typeof record.note !== 'string' || record.note.length > 500)) throw new Error('备份备注无效');
  if (!isCalendarDate(record.occurredOn)) throw new Error('备份日期无效');
  if (typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) throw new Error('备份创建时间无效');
}

export function validatePreferences(value: unknown): AppPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('偏好设置无效');
  const preferences = value as Partial<AppPreferences>;
  if (preferences.key !== 'preferences' || typeof preferences.bigMode !== 'boolean' || !Array.isArray(preferences.customCategories)) {
    throw new Error('偏好设置格式无效');
  }
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const item of preferences.customCategories) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('自定义分类无效');
    const category = item as Partial<CustomCategory>;
    if (typeof category.id !== 'string' || !category.id || category.id.length > 200 || ids.has(category.id)) throw new Error('自定义分类 ID 无效');
    if (category.type !== 'expense' && category.type !== 'income') throw new Error('自定义分类类型无效');
    if (typeof category.name !== 'string' || !category.name.trim() || category.name.length > 20) throw new Error('自定义分类名称无效');
    if (typeof category.icon !== 'string' || !category.icon || category.icon.length > 40) throw new Error('自定义分类图标无效');
    const nameKey = `${category.type}:${category.name.trim()}`;
    if (names.has(nameKey)) throw new Error('自定义分类名称重复');
    ids.add(category.id);
    names.add(nameKey);
  }
  return {
    key: 'preferences',
    bigMode: preferences.bigMode,
    customCategories: preferences.customCategories.map((category) => ({ ...category, name: category.name.trim() })),
  };
}

export function validateBackup(value: unknown): BackupFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('备份内容不是有效对象');
  const backup = value as { formatId?: unknown; schemaVersion?: unknown; exportedAt?: unknown; recordCount?: unknown; records?: unknown; preferences?: unknown };
  if (backup.formatId !== 'family-cfo-lite-g0' || (backup.schemaVersion !== 1 && backup.schemaVersion !== 2)) {
    throw new Error('不支持此备份格式或版本');
  }
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) throw new Error('备份导出时间无效');
  if (!Array.isArray(backup.records) || !Number.isSafeInteger(backup.recordCount) || backup.recordCount !== backup.records.length) {
    throw new Error('备份记录数量不一致');
  }
  const ids = new Set<string>();
  for (const item of backup.records) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('备份包含无效记录');
    validateRecord(item as Partial<LedgerRecord>, ids);
  }
  if (backup.schemaVersion === 2) validatePreferences(backup.preferences);
  return backup as BackupFile;
}
