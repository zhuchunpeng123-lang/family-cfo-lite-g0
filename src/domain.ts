export type EntryType = 'expense' | 'income';

export interface LedgerRecord {
  id: string;
  type: EntryType;
  amountMinor: number;
  category: string | null;
  note: string | null;
  occurredOn: string;
  createdAt: string;
}

export interface BackupFile {
  formatId: 'family-cfo-lite-g0';
  schemaVersion: 1;
  exportedAt: string;
  recordCount: number;
  records: LedgerRecord[];
}

export function parseAmountToMinor(input: string): number {
  const value = input.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value)) throw new Error('请输入最多两位小数的正金额');
  const [whole, fraction = ''] = value.split('.');
  const minor = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('金额必须大于 0 且在可支持范围内');
  return minor;
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function createBackup(records: LedgerRecord[], exportedAt = new Date().toISOString()): BackupFile {
  return { formatId: 'family-cfo-lite-g0', schemaVersion: 1, exportedAt, recordCount: records.length, records };
}

export function relativeLocalDate(days: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validateBackup(value: unknown): BackupFile {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('备份内容不是有效对象');
  const backup = value as Partial<BackupFile>;
  if (backup.formatId !== 'family-cfo-lite-g0' || backup.schemaVersion !== 1) throw new Error('不支持此备份格式或版本');
  if (typeof backup.exportedAt !== 'string' || !Number.isFinite(Date.parse(backup.exportedAt))) throw new Error('备份导出时间无效');
  if (!Array.isArray(backup.records) || !Number.isSafeInteger(backup.recordCount) || backup.recordCount !== backup.records.length) throw new Error('备份记录数量不一致');
  const ids = new Set<string>();
  for (const item of backup.records) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('备份包含无效记录');
    const record = item as Partial<LedgerRecord>;
    if (typeof record.id !== 'string' || record.id.length < 1 || record.id.length > 200 || ids.has(record.id)) throw new Error('备份包含空或重复 ID');
    ids.add(record.id);
    if (record.type !== 'expense' && record.type !== 'income') throw new Error('备份包含无效收支类型');
    if (!Number.isSafeInteger(record.amountMinor) || (record.amountMinor ?? 0) <= 0) throw new Error('备份金额必须是正整数分');
    if (record.category !== null && (typeof record.category !== 'string' || record.category.length > 80)) throw new Error('备份分类无效');
    if (record.note !== null && (typeof record.note !== 'string' || record.note.length > 500)) throw new Error('备份备注无效');
    if (!isCalendarDate(record.occurredOn)) throw new Error('备份日期无效');
    if (typeof record.createdAt !== 'string' || !Number.isFinite(Date.parse(record.createdAt))) throw new Error('备份创建时间无效');
  }
  return backup as BackupFile;
}
