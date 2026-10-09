import {
  applyAmountOperation,
  createBackup,
  defaultPreferences,
  formatMinor,
  isCalendarDate,
  parseAmountToMinor,
  relativeLocalDate,
  validateBackup,
  validatePreferences,
  type AmountOperator,
  type AppPreferences,
  type CustomCategory,
  type EntryType,
  type LedgerRecord,
} from './domain';
import {
  deleteRecord,
  readPreferences,
  readRecords,
  replaceSnapshot,
  savePreferences,
  saveRecord,
  storagePersistenceStatus,
  updateRecord,
} from './db';
import {
  categoriesFor,
  commonCategories,
  findCategoryByName,
  hasCategoryName,
  type CategoryDefinition,
} from './categories';
import './style.css';

const APP_VERSION = '0.2.0';
const app = document.querySelector<HTMLDivElement>('#app')!;

const svg = (paths: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
const icons: Record<string, string> = {
  ledger: svg('<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  chart: svg('<path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2L3 14.5l2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2.1-1.5a7 7 0 0 0 .1-1z"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
  backspace: svg('<path d="M21 12H8l-5 5 5 5h13z"/><path d="m13 10 5 5m0-5-5 5"/>'),
  food: svg('<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"/>'),
  grocery: svg('<path d="M5 5h14v15H5z"/><path d="M8 9h8M8 13h5"/>'),
  transport: svg('<path d="M5 17h14l-1-8H6z"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/><path d="M8 9l2-4h4l2 4"/>'),
  shopping: svg('<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
  home: svg('<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>'),
  utility: svg('<path d="M12 2v20M7 6h10M7 18h10"/><circle cx="12" cy="12" r="3"/>'),
  phone: svg('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M10 5h4M11 19h2"/>'),
  medical: svg('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'),
  sport: svg('<circle cx="12" cy="12" r="8"/><path d="M6 8c4 1 7 4 9 9M17 7c-2 3-5 5-9 6"/>'),
  entertainment: svg('<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'),
  travel: svg('<path d="m2 16 20-8-9 9-3 5-2-6-6 0z"/>'),
  car: svg('<path d="M5 16h14l-1-7H6z"/><path d="M7 9l2-4h6l2 4"/><circle cx="8" cy="17" r="1.5"/><circle cx="16" cy="17" r="1.5"/>'),
  clothes: svg('<path d="M8 5 5 7l2 4 2-1v10h6V10l2 1 2-4-3-2-2 2h-4z"/>'),
  beauty: svg('<path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>'),
  education: svg('<path d="M4 19V5h10a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3"/><path d="M7 8h6M7 12h6"/>'),
  pet: svg('<circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M8 18c1-4 7-4 8 0 1 3-7 4-8 0z"/>'),
  gift: svg('<rect x="3" y="9" width="18" height="12"/><path d="M12 9v12M3 13h18M12 9H8a3 3 0 1 1 3-3c0 2 1 3 1 3zm0 0h4a3 3 0 1 0-3-3c0 2-1 3-1 3z"/>'),
  insurance: svg('<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-5"/>'),
  fee: svg('<circle cx="12" cy="12" r="9"/><path d="M8 9h8M8 15h8M12 6v12"/>'),
  more: svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  salary: svg('<rect x="4" y="6" width="16" height="13" rx="2"/><path d="M4 10h16M8 14h4"/>'),
  bonus: svg('<path d="m12 3 2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.9z"/>'),
  parttime: svg('<path d="M4 20V8h16v12z"/><path d="M9 8V5h6v3M4 13h16"/>'),
  business: svg('<path d="M4 20V9l8-5 8 5v11z"/><path d="M8 20v-6h8v6"/>'),
  interest: svg('<path d="M7 17 17 7"/><circle cx="8" cy="8" r="2"/><circle cx="16" cy="16" r="2"/>'),
  dividend: svg('<path d="M12 21V10"/><path d="M12 14c-5 0-7-3-7-7 4 0 7 2 7 7zm0-2c5 0 7-3 7-7-4 0-7 2-7 7z"/>'),
  rent: svg('<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 14h4v6"/>'),
  subsidy: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h5a2 2 0 0 1 0 4H9"/>'),
  custom: svg('<path d="M12 5v14M5 12h14"/>'),
  unknown: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.7 1.8c-1.5 1.2-2.2 1.7-2.2 3.2M12 18h.01"/>'),
};

app.innerHTML = `
  <div id="update-banner" class="update-banner" hidden>
    <div><strong>发现新版本</strong><small>更新不会删除本机账本</small></div>
    <button id="update-later">稍后</button><button id="update-now">立即更新</button>
  </div>
  <main class="app-shell">
    <section id="ledger-screen" class="screen active" aria-label="账本">
      <header class="topbar"><div><span class="eyebrow">FAMILY CFO LITE</span><h1>账本</h1></div><button id="settings-open" class="icon-button" aria-label="设置">${icons.gear}</button></header>
      <section class="month-card">
        <div class="month-nav"><button id="prev-month" aria-label="上个月">‹</button><strong id="month-label"></strong><button id="next-month" aria-label="下个月">›</button></div>
        <div class="metrics"><div><span>收入</span><strong id="income-total">¥0.00</strong></div><div><span>支出</span><strong id="expense-total">¥0.00</strong></div></div>
      </section>
      <div class="section-title"><h2>明细</h2><button id="search-toggle" class="text-button">搜索</button></div>
      <div id="search-wrap" class="search-wrap" hidden><input id="search-input" type="search" placeholder="搜索分类、备注或金额" autocomplete="off"></div>
      <div id="ledger-list"></div>
    </section>

    <section id="stats-screen" class="screen" aria-label="统计">
      <header class="topbar"><div><span class="eyebrow">FAMILY CFO LITE</span><h1>统计</h1></div><span id="stats-month" class="month-badge"></span></header>
      <div class="segmented stats-segmented"><button data-stats-type="expense" class="selected">支出</button><button data-stats-type="income">收入</button></div>
      <div class="stats-total"><span id="stats-total-label">本月支出</span><strong id="stats-total">¥0.00</strong></div>
      <div id="stats-bars" class="stats-card"></div>
    </section>
  </main>

  <nav class="bottom-nav" aria-label="主导航">
    <button id="nav-ledger" class="nav-tab selected">${icons.ledger}<span>账本</span></button>
    <button id="capture-open" class="capture-plus" aria-label="记一笔">+</button>
    <button id="nav-stats" class="nav-tab">${icons.chart}<span>统计</span></button>
  </nav>

  <section id="capture" class="capture-page" aria-label="记一笔" hidden>
    <header class="capture-head"><button id="capture-close">关闭</button><h2>记一笔</h2><span aria-hidden="true"></span></header>
    <div class="capture-scroll">
      <div class="segmented"><button data-entry-type="expense" class="selected">支出</button><button data-entry-type="income">收入</button></div>
      <div class="category-heading"><h3>常用分类</h3><button id="direct-entry" class="direct-button">直接记金额 ›</button></div>
      <div id="common-categories" class="category-grid"></div>
      <button id="all-categories-toggle" class="fold-button">查看全部分类 ↓</button>
      <div id="all-categories-wrap" hidden><div class="category-heading"><h3>全部分类</h3><span id="category-count"></span></div><div id="all-categories" class="category-grid"></div></div>
      <p class="capture-help">分类不是必填。赶时间时可直接记金额，之后从账本点开记录补分类、日期或备注。</p>
    </div>
    <div id="entry-backdrop" class="entry-backdrop" hidden></div>
    <section id="entry-sheet" class="entry-sheet" aria-label="金额输入" hidden>
      <div class="sheet-handle"></div>
      <div class="entry-summary"><div class="entry-category"><span id="entry-category-icon" class="entry-category-icon"></span><div><small>当前分类</small><strong id="entry-category-name">未分类</strong></div></div><button id="change-category" class="text-button">更换</button></div>
      <div class="entry-amount"><span>金额</span><output id="entry-amount">¥0.00</output></div>
      <label class="note-input"><span class="sr-only">备注</span><input id="entry-note" maxlength="500" placeholder="备注（可选，例如：午饭）" autocomplete="off"></label>
      <div class="keypad" aria-label="金额键盘">
        <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><label class="date-key">${icons.calendar}<span id="entry-date-text">今天</span><input id="entry-date" type="date" aria-label="选择日期"></label>
        <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button data-op="+" class="operator">+</button>
        <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button data-op="-" class="operator">−</button>
        <button data-key=".">.</button><button data-key="0">0</button><button id="backspace" class="utility" aria-label="退格">${icons.backspace}</button><button id="entry-save" class="save-button">记入</button>
      </div>
    </section>
  </section>

  <div id="modal-backdrop" class="modal-backdrop" hidden></div>
  <section id="detail-sheet" class="modal-sheet" hidden aria-label="账单详情">
    <div class="sheet-handle"></div><h2>账单详情</h2><div id="detail-card" class="detail-card"></div>
    <div class="modal-actions three"><button id="detail-delete" class="danger-button">删除</button><button id="detail-close" class="quiet-button">关闭</button><button id="detail-edit" class="primary-button">编辑</button></div>
  </section>

  <section id="edit-sheet" class="modal-sheet" hidden aria-label="修改账单">
    <div class="sheet-handle"></div><h2>修改账单</h2>
    <label class="field-label">类型<select id="edit-type" class="field"><option value="expense">支出</option><option value="income">收入</option></select></label>
    <label class="field-label">分类（可留空）<select id="edit-category" class="field"></select></label>
    <label class="field-label">金额<input id="edit-amount" class="field" inputmode="decimal"></label>
    <label class="field-label">日期<input id="edit-date" class="field" type="date"></label>
    <label class="field-label">备注（可选）<textarea id="edit-note" class="field" maxlength="500"></textarea></label>
    <div class="modal-actions"><button id="edit-cancel" class="quiet-button">取消</button><button id="edit-save" class="primary-button">保存修改</button></div>
  </section>

  <section id="custom-sheet" class="modal-sheet" hidden aria-label="添加自定义分类">
    <div class="sheet-handle"></div><h2>添加自定义分类</h2>
    <label class="field-label">分类名称<input id="custom-name" class="field" maxlength="20" placeholder="例如：咖啡、摄影、猫咪"></label>
    <div class="field-label"><span>选择图标</span><div id="custom-icons" class="icon-options"></div></div>
    <div class="modal-actions"><button id="custom-cancel" class="quiet-button">取消</button><button id="custom-save" class="primary-button">添加</button></div>
  </section>

  <section id="settings-sheet" class="modal-sheet settings-sheet" hidden aria-label="设置与数据">
    <div class="sheet-handle"></div><h2>设置与数据</h2>
    <div class="setting-row"><div><strong>大字模式</strong><small>文字和按钮更大，适合视力较弱时使用</small></div><button id="big-mode-toggle"></button></div>
    <div class="setting-row"><div><strong>导出备份</strong><small>JSON 文件保存到你选择的位置</small></div><button id="export-backup">导出</button></div>
    <div class="setting-row"><div><strong>恢复备份</strong><small>兼容 G0 备份；恢复前会提示确认</small></div><button id="import-backup">选择文件</button><input id="backup-file" type="file" accept="application/json,.json" hidden></div>
    <div class="setting-row"><div><strong>本机存储</strong><small id="storage-status">检查中…</small></div><span></span></div>
    <div class="setting-row"><div><strong>当前版本</strong><small>主屏幕图标无需重复添加</small></div><span>G1 · ${APP_VERSION}</span></div>
    <h3 class="settings-subtitle">自定义分类</h3><div id="custom-category-list"></div>
    <div class="modal-actions"><button id="settings-close" class="quiet-button">关闭</button></div>
  </section>

  <div id="status" class="status" role="status" aria-live="polite"></div>
`;

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

let records: LedgerRecord[] = [];
let preferences: AppPreferences = defaultPreferences();
let currentScreen: 'ledger' | 'stats' = 'ledger';
let currentMonth = relativeLocalDate(0).slice(0, 7);
let statsType: EntryType = 'expense';
let entryType: EntryType = 'expense';
let allCategoriesOpen = false;
let selectedCategory: CategoryDefinition | null = null;
let entryAmountText = '';
let calculatorBaseMinor: number | null = null;
let calculatorOperator: AmountOperator | null = null;
let calculatorNeedsNext = false;
let entryOccurredOn = relativeLocalDate(0);
let savingEntry = false;
let selectedRecordId: string | null = null;
let editingRecordId: string | null = null;
let selectedCustomIcon = 'custom';
let toastTimer = 0;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

function announce(message: string): void {
  const status = $('#status');
  status.textContent = message;
  status.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => status.classList.remove('visible'), 2200);
}

function formatMoney(minor: number): string { return `¥${formatMinor(minor)}`; }
function monthLabel(month: string): string { const [year, value] = month.split('-'); return `${year} 年 ${Number(value)} 月`; }
function humanDate(date: string): string {
  if (date === relativeLocalDate(0)) return '今天';
  if (date === relativeLocalDate(-1)) return '昨天';
  if (date === relativeLocalDate(-2)) return '前天';
  return date.slice(5).replace('-', '/');
}

function recordsForMonth(): LedgerRecord[] { return records.filter((record) => record.occurredOn.startsWith(currentMonth)); }

function renderNavigation(): void {
  $('#ledger-screen').classList.toggle('active', currentScreen === 'ledger');
  $('#stats-screen').classList.toggle('active', currentScreen === 'stats');
  $('#nav-ledger').classList.toggle('selected', currentScreen === 'ledger');
  $('#nav-stats').classList.toggle('selected', currentScreen === 'stats');
}

function renderLedger(): void {
  $('#month-label').textContent = monthLabel(currentMonth);
  const monthRecords = recordsForMonth();
  const incomeMinor = monthRecords.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amountMinor, 0);
  const expenseMinor = monthRecords.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amountMinor, 0);
  $('#income-total').textContent = formatMoney(incomeMinor);
  $('#expense-total').textContent = formatMoney(expenseMinor);

  const query = ($('#search-input') as HTMLInputElement).value.trim().toLocaleLowerCase('zh-CN');
  const visible = monthRecords
    .filter((record) => !query || `${record.category ?? '未分类'} ${record.note ?? ''} ${formatMinor(record.amountMinor)}`.toLocaleLowerCase('zh-CN').includes(query))
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt.localeCompare(a.createdAt));
  const list = $('#ledger-list');
  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '这个月还没有记录。<br>点底部“+”开始记第一笔。';
    list.appendChild(empty);
    return;
  }

  const grouped = new Map<string, LedgerRecord[]>();
  for (const record of visible) {
    const group = grouped.get(record.occurredOn) ?? [];
    group.push(record);
    grouped.set(record.occurredOn, group);
  }
  for (const [date, group] of grouped) {
    const heading = document.createElement('div');
    heading.className = 'date-heading';
    heading.textContent = `${humanDate(date)} · ${date.replaceAll('-', '/')}`;
    list.appendChild(heading);
    const card = document.createElement('div');
    card.className = 'record-card';
    for (const record of group) {
      const category = findCategoryByName(record.type, record.category, preferences);
      const button = document.createElement('button');
      button.className = 'record-row';
      button.innerHTML = `
        <span class="record-icon">${icons[category?.icon ?? 'unknown'] ?? icons.unknown}</span>
        <span class="record-main"><strong>${escapeHtml(record.category ?? '未分类')}</strong><small>${escapeHtml(record.note ?? humanDate(record.occurredOn))}</small>${record.category === null ? '<em>可稍后补分类</em>' : ''}</span>
        <span class="record-amount ${record.type}">${record.type === 'expense' ? '−' : '+'}${formatMoney(record.amountMinor)}</span>`;
      button.onclick = () => openDetail(record.id);
      card.appendChild(button);
    }
    list.appendChild(card);
  }
}

function renderStats(): void {
  $('#stats-month').textContent = monthLabel(currentMonth);
  $('#stats-total-label').textContent = statsType === 'expense' ? '本月支出' : '本月收入';
  const filtered = recordsForMonth().filter((record) => record.type === statsType);
  const total = filtered.reduce((sum, record) => sum + record.amountMinor, 0);
  $('#stats-total').textContent = formatMoney(total);
  const sums = new Map<string, number>();
  for (const record of filtered) sums.set(record.category ?? '未分类', (sums.get(record.category ?? '未分类') ?? 0) + record.amountMinor);
  const box = $('#stats-bars');
  box.replaceChildren();
  const items = [...sums.entries()].sort((a, b) => b[1] - a[1]);
  if (!items.length) {
    box.innerHTML = '<div class="empty-state compact">暂无数据</div>';
    return;
  }
  for (const [name, value] of items) {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const width = total ? Math.max(5, Math.round(value / total * 100)) : 0;
    row.innerHTML = `<div class="bar-head"><span>${escapeHtml(name)}</span><strong>${formatMoney(value)}</strong></div><div class="bar"><i style="width:${width}%"></i></div>`;
    box.appendChild(row);
  }
}

function renderCategoryButton(category: CategoryDefinition): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'category-button';
  button.innerHTML = `<span class="category-icon">${icons[category.icon] ?? icons.custom}</span><span>${escapeHtml(category.name)}</span>`;
  button.onclick = () => openEntry(category);
  return button;
}

function renderCaptureCategories(): void {
  const common = commonCategories(entryType, preferences, records, 8);
  const all = categoriesFor(entryType, preferences);
  const commonBox = $('#common-categories');
  const allBox = $('#all-categories');
  commonBox.replaceChildren(...common.map(renderCategoryButton));
  allBox.replaceChildren(...all.map(renderCategoryButton));
  const custom = document.createElement('button');
  custom.className = 'category-button custom';
  custom.innerHTML = `<span class="category-icon">${icons.custom}</span><span>自定义</span>`;
  custom.onclick = openCustomCategory;
  allBox.appendChild(custom);
  $('#category-count').textContent = `${all.length} 个分类`;
  $('#all-categories-wrap').hidden = !allCategoriesOpen;
  $('#all-categories-toggle').textContent = allCategoriesOpen ? '收起全部分类 ↑' : '查看全部分类 ↓';
}

function renderPreferences(): void {
  document.body.classList.toggle('large-text', preferences.bigMode);
  $('#big-mode-toggle').textContent = preferences.bigMode ? '开启' : '关闭';
  const list = $('#custom-category-list');
  list.replaceChildren();
  if (!preferences.customCategories.length) {
    const empty = document.createElement('p');
    empty.className = 'settings-empty';
    empty.textContent = '还没有自定义分类。';
    list.appendChild(empty);
    return;
  }
  for (const category of preferences.customCategories) {
    const row = document.createElement('div');
    row.className = 'custom-category-row';
    row.innerHTML = `<span>${category.type === 'expense' ? '支出' : '收入'} · ${escapeHtml(category.name)}</span><button>删除</button>`;
    row.querySelector('button')!.onclick = () => { void removeCustomCategory(category); };
    list.appendChild(row);
  }
}

function renderAll(): void {
  renderNavigation();
  renderLedger();
  renderStats();
  renderCaptureCategories();
  renderPreferences();
}

function changeMonth(delta: number): void {
  const [year, month] = currentMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1, 12);
  currentMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  renderLedger();
  renderStats();
}

function setScreen(screen: 'ledger' | 'stats'): void { currentScreen = screen; renderNavigation(); if (screen === 'stats') renderStats(); }
function setStatsType(type: EntryType): void {
  statsType = type;
  document.querySelectorAll<HTMLButtonElement>('[data-stats-type]').forEach((button) => button.classList.toggle('selected', button.dataset.statsType === type));
  renderStats();
}

function openCapture(): void {
  $('#capture').hidden = false;
  entryType = 'expense';
  allCategoriesOpen = false;
  document.querySelectorAll<HTMLButtonElement>('[data-entry-type]').forEach((button) => button.classList.toggle('selected', button.dataset.entryType === entryType));
  renderCaptureCategories();
}

function hasUnsavedEntry(): boolean {
  return entryAmountText.length > 0 || ($('#entry-note') as HTMLInputElement).value.trim().length > 0 || entryOccurredOn !== relativeLocalDate(0);
}

function closeCapture(): void {
  if (!$('#entry-sheet').hidden && hasUnsavedEntry() && !window.confirm('这笔还没有记入，确定离开吗？')) return;
  closeEntry();
  $('#capture').hidden = true;
  void refreshRecords();
}

function setEntryType(type: EntryType): void {
  entryType = type;
  allCategoriesOpen = false;
  document.querySelectorAll<HTMLButtonElement>('[data-entry-type]').forEach((button) => button.classList.toggle('selected', button.dataset.entryType === type));
  renderCaptureCategories();
}

function openEntry(category: CategoryDefinition | null): void {
  selectedCategory = category;
  entryAmountText = '';
  calculatorBaseMinor = null;
  calculatorOperator = null;
  calculatorNeedsNext = false;
  entryOccurredOn = relativeLocalDate(0);
  $('#entry-category-name').textContent = category?.name ?? '未分类';
  $('#entry-category-icon').innerHTML = icons[category?.icon ?? 'unknown'] ?? icons.unknown;
  $('#entry-amount').textContent = '¥0.00';
  ($('#entry-note') as HTMLInputElement).value = '';
  ($('#entry-date') as HTMLInputElement).value = '';
  $('#entry-date-text').textContent = '今天';
  $('#entry-backdrop').hidden = false;
  $('#entry-sheet').hidden = false;
}

function closeEntry(): void {
  $('#entry-backdrop').hidden = true;
  $('#entry-sheet').hidden = true;
  selectedCategory = null;
  entryAmountText = '';
  calculatorBaseMinor = null;
  calculatorOperator = null;
  calculatorNeedsNext = false;
  entryOccurredOn = relativeLocalDate(0);
}

function renderEntryAmount(): void {
  if (!entryAmountText) { $('#entry-amount').textContent = '¥0.00'; return; }
  try { $('#entry-amount').textContent = formatMoney(parseAmountToMinor(entryAmountText)); }
  catch { $('#entry-amount').textContent = `¥${entryAmountText}`; }
}

function pressNumber(key: string): void {
  if (calculatorNeedsNext) { entryAmountText = ''; calculatorNeedsNext = false; }
  if (key === '.' && entryAmountText.includes('.')) return;
  if (key === '.' && !entryAmountText) entryAmountText = '0.';
  else if (entryAmountText === '0' && key !== '.') entryAmountText = key;
  else {
    const decimals = entryAmountText.split('.')[1]?.length ?? 0;
    if (entryAmountText.replace('.', '').length >= 12 || (entryAmountText.includes('.') && decimals >= 2)) return;
    entryAmountText += key;
  }
  renderEntryAmount();
}

function resolveCalculator(): number {
  if (calculatorNeedsNext && calculatorBaseMinor !== null) {
    const pendingBase = calculatorBaseMinor;
    entryAmountText = (pendingBase / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    calculatorBaseMinor = null;
    calculatorOperator = null;
    calculatorNeedsNext = false;
    renderEntryAmount();
    return pendingBase;
  }
  const current = parseAmountToMinor(entryAmountText);
  if (calculatorBaseMinor === null || calculatorOperator === null) return current;
  const result = applyAmountOperation(calculatorBaseMinor, calculatorOperator, current);
  entryAmountText = (result / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  calculatorBaseMinor = null;
  calculatorOperator = null;
  calculatorNeedsNext = false;
  renderEntryAmount();
  return result;
}

function pressOperator(operator: AmountOperator): void {
  try {
    if (!entryAmountText) return announce('请先输入金额');
    if (calculatorBaseMinor !== null && !calculatorNeedsNext) resolveCalculator();
    calculatorBaseMinor = parseAmountToMinor(entryAmountText);
    calculatorOperator = operator;
    calculatorNeedsNext = true;
  } catch (error) { announce(error instanceof Error ? error.message : '金额无效'); }
}

function backspaceAmount(): void {
  if (calculatorNeedsNext) {
    calculatorNeedsNext = false;
    calculatorBaseMinor = null;
    calculatorOperator = null;
    return;
  }
  entryAmountText = entryAmountText.slice(0, -1);
  renderEntryAmount();
}

async function saveEntry(): Promise<void> {
  if (savingEntry) return;
  let amountMinor: number;
  try { amountMinor = resolveCalculator(); }
  catch (error) { announce(error instanceof Error ? error.message : '金额无效'); return; }
  savingEntry = true;
  const saveButton = $('#entry-save') as HTMLButtonElement;
  saveButton.disabled = true;
  const record: LedgerRecord = {
    id: crypto.randomUUID(),
    type: entryType,
    amountMinor,
    category: selectedCategory?.name ?? null,
    note: ($('#entry-note') as HTMLInputElement).value.trim() || null,
    occurredOn: entryOccurredOn,
    createdAt: new Date().toISOString(),
  };
  try {
    await saveRecord(record);
    records.push(record);
    closeEntry();
    renderAll();
    announce('已记入，可以继续记下一笔');
  } catch (error) {
    announce(`记入失败，输入已保留：${error instanceof Error ? error.message : '本机数据库错误'}`);
  } finally { savingEntry = false; saveButton.disabled = false; }
}

function openDetail(id: string): void {
  const record = records.find((item) => item.id === id);
  if (!record) return;
  selectedRecordId = id;
  $('#detail-card').innerHTML = `
    <div><span>类型</span><strong>${record.type === 'expense' ? '支出' : '收入'}</strong></div>
    <div><span>分类</span><strong>${escapeHtml(record.category ?? '未分类')}</strong></div>
    <div><span>金额</span><strong>${formatMoney(record.amountMinor)}</strong></div>
    <div><span>日期</span><strong>${record.occurredOn}</strong></div>
    <div><span>备注</span><strong>${escapeHtml(record.note ?? '无')}</strong></div>`;
  openModal('detail-sheet');
}

function populateEditCategories(type: EntryType, selected: string | null): void {
  const select = $('#edit-category') as HTMLSelectElement;
  select.replaceChildren();
  const empty = document.createElement('option');
  empty.value = '';
  empty.textContent = '未分类';
  select.appendChild(empty);
  for (const category of categoriesFor(type, preferences)) {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    select.appendChild(option);
  }
  if (selected && ![...select.options].some((option) => option.value === selected)) {
    const legacy = document.createElement('option');
    legacy.value = selected;
    legacy.textContent = `${selected}（原记录）`;
    select.appendChild(legacy);
  }
  select.value = selected ?? '';
}

function openEdit(): void {
  const record = records.find((item) => item.id === selectedRecordId);
  if (!record) return;
  editingRecordId = record.id;
  closeModal('detail-sheet');
  ($('#edit-type') as HTMLSelectElement).value = record.type;
  populateEditCategories(record.type, record.category);
  ($('#edit-amount') as HTMLInputElement).value = (record.amountMinor / 100).toFixed(2).replace(/\.00$/, '');
  ($('#edit-date') as HTMLInputElement).value = record.occurredOn;
  ($('#edit-note') as HTMLTextAreaElement).value = record.note ?? '';
  openModal('edit-sheet');
}

async function saveEdit(): Promise<void> {
  const record = records.find((item) => item.id === editingRecordId);
  if (!record) return;
  const type = ($('#edit-type') as HTMLSelectElement).value as EntryType;
  const category = ($('#edit-category') as HTMLSelectElement).value || null;
  const occurredOn = ($('#edit-date') as HTMLInputElement).value;
  let amountMinor: number;
  try { amountMinor = parseAmountToMinor(($('#edit-amount') as HTMLInputElement).value); }
  catch (error) { return announce(error instanceof Error ? error.message : '金额无效'); }
  if (!isCalendarDate(occurredOn)) return announce('请选择有效日期');
  const updated: LedgerRecord = { ...record, type, category, amountMinor, occurredOn, note: ($('#edit-note') as HTMLTextAreaElement).value.trim() || null };
  try {
    await updateRecord(updated);
    records = records.map((item) => item.id === updated.id ? updated : item);
    closeModal('edit-sheet');
    renderAll();
    announce('修改已保存');
  } catch (error) { announce(`修改失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
}

async function removeSelectedRecord(): Promise<void> {
  if (!selectedRecordId) return;
  if (!window.confirm('确定删除这笔记录吗？')) return;
  try {
    await deleteRecord(selectedRecordId);
    records = records.filter((item) => item.id !== selectedRecordId);
    selectedRecordId = null;
    closeModal('detail-sheet');
    renderAll();
    announce('已删除');
  } catch (error) { announce(`删除失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
}

function openCustomCategory(): void {
  selectedCustomIcon = 'custom';
  ($('#custom-name') as HTMLInputElement).value = '';
  renderCustomIcons();
  openModal('custom-sheet');
}

function renderCustomIcons(): void {
  const choices = ['food', 'shopping', 'sport', 'gift', 'home', 'custom'];
  const box = $('#custom-icons');
  box.replaceChildren();
  for (const key of choices) {
    const button = document.createElement('button');
    button.className = `icon-option${selectedCustomIcon === key ? ' selected' : ''}`;
    button.innerHTML = icons[key] ?? icons.custom;
    button.onclick = () => { selectedCustomIcon = key; renderCustomIcons(); };
    box.appendChild(button);
  }
}

async function addCustomCategory(): Promise<void> {
  const name = ($('#custom-name') as HTMLInputElement).value.trim();
  if (!name) return announce('请输入分类名称');
  if (hasCategoryName(entryType, name, preferences)) return announce('这个分类已经存在');
  const category: CustomCategory = { id: crypto.randomUUID(), type: entryType, name, icon: selectedCustomIcon };
  const next = validatePreferences({ ...preferences, customCategories: [...preferences.customCategories, category] });
  try {
    await savePreferences(next);
    preferences = next;
    closeModal('custom-sheet');
    renderAll();
    announce('自定义分类已添加');
  } catch (error) { announce(`添加失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
}

async function removeCustomCategory(category: CustomCategory): Promise<void> {
  if (records.some((record) => record.type === category.type && record.category === category.name)) {
    announce('这个分类已被账单使用，请先修改相关账单');
    return;
  }
  if (!window.confirm(`删除自定义分类“${category.name}”吗？`)) return;
  const next = { ...preferences, customCategories: preferences.customCategories.filter((item) => item.id !== category.id) };
  try {
    await savePreferences(next);
    preferences = next;
    renderAll();
    announce('分类已删除');
  } catch (error) { announce(`删除失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
}

function openModal(id: 'detail-sheet' | 'edit-sheet' | 'custom-sheet' | 'settings-sheet'): void {
  $('#modal-backdrop').hidden = false;
  $(`#${id}`).hidden = false;
}

function closeModal(id: 'detail-sheet' | 'edit-sheet' | 'custom-sheet' | 'settings-sheet'): void {
  $(`#${id}`).hidden = true;
  const anyOpen = ['detail-sheet', 'edit-sheet', 'custom-sheet', 'settings-sheet'].some((sheetId) => !document.getElementById(sheetId)!.hidden);
  $('#modal-backdrop').hidden = !anyOpen;
}

function closeAllModals(): void {
  for (const id of ['detail-sheet', 'edit-sheet', 'custom-sheet', 'settings-sheet']) document.getElementById(id)!.hidden = true;
  $('#modal-backdrop').hidden = true;
}

async function toggleBigMode(): Promise<void> {
  const next = { ...preferences, bigMode: !preferences.bigMode };
  try { await savePreferences(next); preferences = next; renderPreferences(); }
  catch (error) { announce(`设置保存失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
}

async function exportBackup(): Promise<void> {
  try {
    const backup = createBackup(await readRecords(), await readPreferences());
    const file = new File([JSON.stringify(backup, null, 2)], `family-cfo-lite-${relativeLocalDate(0)}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'Family CFO Lite 备份' });
    } else {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      announce('已生成 JSON 文件，请确认保存位置');
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    announce(`导出失败：${error instanceof Error ? error.message : '未知错误'}`);
  }
}

async function importBackup(file: File): Promise<void> {
  try {
    if (file.size > 5 * 1024 * 1024) throw new Error('备份文件超过 5 MB 限制');
    const backup = validateBackup(JSON.parse(await file.text()));
    const existing = await readRecords();
    if (existing.length && !window.confirm(`当前有 ${existing.length} 笔记录。本操作会全量替换为备份中的 ${backup.recordCount} 笔，继续吗？`)) return;
    const restoredPreferences = backup.schemaVersion === 2 ? validatePreferences(backup.preferences) : undefined;
    await replaceSnapshot(backup.records, restoredPreferences);
    records = await readRecords();
    preferences = restoredPreferences ?? await readPreferences();
    closeModal('settings-sheet');
    renderAll();
    announce(`恢复成功 · ${backup.recordCount} 笔记录`);
  } catch (error) { announce(`恢复失败，原记录保持不变：${error instanceof Error ? error.message : '备份无效'}`); }
  finally { ($('#backup-file') as HTMLInputElement).value = ''; }
}

async function refreshRecords(): Promise<void> {
  try { records = await readRecords(); renderAll(); }
  catch (error) { announce(`本机记录读取失败：${error instanceof Error ? error.message : '未知错误'}`); }
}

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

async function checkForUpdate(): Promise<void> {
  try {
    const url = new URL(`version.json?t=${Date.now()}`, window.location.href);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json() as { version?: unknown };
    if (typeof payload.version === 'string' && compareVersions(payload.version, APP_VERSION) > 0) $('#update-banner').hidden = false;
  } catch { /* Version checks must never block bookkeeping. */ }
}

async function initialize(): Promise<void> {
  try {
    [records, preferences] = await Promise.all([readRecords(), readPreferences()]);
  } catch (error) {
    announce(`本机数据无法读取：${error instanceof Error ? error.message : '未知错误'}`);
  }
  renderAll();
  void storagePersistenceStatus().then((result) => {
    const labels = {
      persisted: '浏览器已标记为持久存储；仍建议定期备份',
      granted: '浏览器已授予持久存储请求；仍建议定期备份',
      'not-granted': '浏览器未授予持久存储，请定期导出备份',
      unavailable: '无法查询持久存储，请定期导出备份',
    };
    $('#storage-status').textContent = labels[result];
  });
  void checkForUpdate();
}

$('#nav-ledger').onclick = () => setScreen('ledger');
$('#nav-stats').onclick = () => setScreen('stats');
$('#capture-open').onclick = openCapture;
$('#settings-open').onclick = () => { renderPreferences(); openModal('settings-sheet'); };
$('#prev-month').onclick = () => changeMonth(-1);
$('#next-month').onclick = () => changeMonth(1);
$('#search-toggle').onclick = () => { const wrap = $('#search-wrap'); wrap.hidden = !wrap.hidden; if (!wrap.hidden) ($('#search-input') as HTMLInputElement).focus(); };
$('#search-input').oninput = renderLedger;

document.querySelectorAll<HTMLButtonElement>('[data-stats-type]').forEach((button) => button.onclick = () => setStatsType(button.dataset.statsType as EntryType));
document.querySelectorAll<HTMLButtonElement>('[data-entry-type]').forEach((button) => button.onclick = () => setEntryType(button.dataset.entryType as EntryType));
$('#capture-close').onclick = closeCapture;
$('#direct-entry').onclick = () => openEntry(null);
$('#all-categories-toggle').onclick = () => { allCategoriesOpen = !allCategoriesOpen; renderCaptureCategories(); };
$('#entry-backdrop').onclick = () => { if (!hasUnsavedEntry() || window.confirm('这笔还没有记入，确定返回分类吗？')) closeEntry(); };
$('#change-category').onclick = () => { if (!hasUnsavedEntry() || window.confirm('这笔还没有记入，确定更换分类吗？')) closeEntry(); };

document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => button.onclick = () => pressNumber(button.dataset.key!));
document.querySelectorAll<HTMLButtonElement>('[data-op]').forEach((button) => button.onclick = () => pressOperator(button.dataset.op as AmountOperator));
$('#backspace').onclick = backspaceAmount;
$('#entry-date').onchange = (event) => { const value = (event.target as HTMLInputElement).value; if (value) { entryOccurredOn = value; $('#entry-date-text').textContent = humanDate(value); } };
$('#entry-save').onclick = () => { void saveEntry(); };

$('#detail-close').onclick = () => closeModal('detail-sheet');
$('#detail-edit').onclick = openEdit;
$('#detail-delete').onclick = () => { void removeSelectedRecord(); };
$('#edit-cancel').onclick = () => closeModal('edit-sheet');
$('#edit-save').onclick = () => { void saveEdit(); };
$('#edit-type').onchange = () => populateEditCategories(($('#edit-type') as HTMLSelectElement).value as EntryType, null);
$('#custom-cancel').onclick = () => closeModal('custom-sheet');
$('#custom-save').onclick = () => { void addCustomCategory(); };
$('#settings-close').onclick = () => closeModal('settings-sheet');
$('#modal-backdrop').onclick = closeAllModals;
$('#big-mode-toggle').onclick = () => { void toggleBigMode(); };
$('#export-backup').onclick = () => { void exportBackup(); };
$('#import-backup').onclick = () => ($('#backup-file') as HTMLInputElement).click();
$('#backup-file').onchange = (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (file) void importBackup(file); };

$('#update-later').onclick = () => { $('#update-banner').hidden = true; };
$('#update-now').onclick = () => { window.location.reload(); };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void checkForUpdate(); });

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (!$('#entry-sheet').hidden) closeEntry();
  else if (!$('#capture').hidden) closeCapture();
  else closeAllModals();
});

void initialize();
