import { createBackup, parseAmountToMinor, relativeLocalDate, validateBackup, type EntryType, type LedgerRecord } from './domain';
import { clearRecords, readRecords, replaceRecords, saveRecord, storagePersistenceStatus } from './db';
import './style.css';

const spending = ['餐饮', '日用', '交通', '购物', '居住', '医疗', '娱乐', '其他'];
const income = ['工资', '利息', '其他收入'];
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="shell">
    <header><div><span class="eyebrow">FAMILY CFO LITE · G0</span><h1>记一笔</h1></div><span class="local-pill">仅本机</span></header>
    <section class="capture" aria-label="记账输入">
      <div class="segmented"><button data-type="expense" class="selected">支出</button><button data-type="income">收入</button></div>
      <div class="section-label"><span>分类 <small>可跳过 · G0 演示分类</small></span><button id="no-category" class="text-button">不选分类</button></div>
      <div id="categories" class="categories"></div>
      <section class="amount-block"><label>金额（人民币）</label><div class="amount-row"><span>¥</span><output id="amount">0.00</output></div><label class="note"><span>备注</span><input id="note" maxlength="500" placeholder="选填" autocomplete="off"></label></section>
      <button id="more-open" class="more-button">更多信息 <span>ⓘ G0 尚未支持账户等补充信息</span><b>＋</b></button>
      <footer><div class="date-bar"><span>发生日期</span><strong id="date-label"></strong><button id="date-open" class="date-button">选择日期</button></div>
        <div class="keypad" aria-label="金额键盘">
          <button data-key="7">7</button><button data-key="8">8</button><button data-key="9">9</button><button id="yesterday" class="utility">昨天</button>
          <button data-key="4">4</button><button data-key="5">5</button><button data-key="6">6</button><button id="day-before" class="utility">前天</button>
          <button data-key="1">1</button><button data-key="2">2</button><button data-key="3">3</button><button id="backspace" class="utility">⌫</button>
          <button data-key=".">.</button><button data-key="0">0</button><button id="clear-amount" class="utility">清空</button><button id="save" class="save">保存</button>
        </div>
      </footer>
    </section>
    <section class="records-section"><div class="section-label"><span>本机记录 <small id="record-count">读取中…</small></span><button id="refresh" class="text-button">刷新</button></div><ul id="records" class="records"></ul></section>
    <section class="backup-section"><h2>手动备份与恢复</h2><p>备份文件保存在你选择的位置；不会上传账目。</p><div class="backup-actions"><button id="export">导出 JSON</button><button id="import">选择备份恢复</button><button id="clear" class="danger-quiet">清空模拟数据</button></div><input id="file" type="file" accept="application/json,.json" hidden></section>
    <p id="storage-status" class="storage-status">正在检查本机存储状态…</p><p class="notice">G0 技术验证 · 仅用虚构数据 · 不适用于真实财务记录 · 离线能力未实现</p>
  </main>
  <div id="sheet-backdrop" class="backdrop" hidden></div>
  <section id="date-sheet" class="sheet" role="dialog" aria-modal="true" aria-labelledby="date-title" hidden><div class="sheet-handle"></div><div class="sheet-head"><h2 id="date-title">选择发生日期</h2><button data-close="date">完成</button></div><div class="quick-dates"><button data-days="0">今天</button><button data-days="-1">昨天</button><button data-days="-2">前天</button></div><label class="calendar-field">日历日期<input id="calendar-date" type="date"></label></section>
  <section id="more-sheet" class="sheet" role="dialog" aria-modal="true" aria-labelledby="more-title" hidden><div class="sheet-handle"></div><div class="sheet-head"><h2 id="more-title">更多信息</h2><button data-close="more">完成</button></div><p>账户等补充信息不在 G0 支持范围内。当前页面只验证记账保存、读取与手动备份恢复。</p></section>
  <div id="status" class="status" role="status" aria-live="polite"></div>`;

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
let type: EntryType = 'expense';
let category: string | null = null;
let amount = '';
let occurredOn = relativeLocalDate(0);
let saving = false;
let toastTimer = 0;

function announce(message: string): void {
  const status = $('#status');
  status.textContent = message;
  status.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => status.classList.remove('visible'), 3200);
}

function renderAmount(): void { $('#amount').textContent = amount || '0.00'; }
function renderDate(): void { $('#date-label').textContent = occurredOn === relativeLocalDate(0) ? '今天' : occurredOn; }
function renderCategories(): void {
  const labels = type === 'expense' ? spending : income;
  $('#categories').replaceChildren(...labels.map((label) => {
    const button = document.createElement('button');
    button.className = `category${category === label ? ' active' : ''}`;
    button.textContent = label;
    button.setAttribute('aria-pressed', String(category === label));
    button.onclick = () => { category = category === label ? null : label; renderCategories(); };
    return button;
  }));
}

async function renderRecords(): Promise<void> {
  const list = $('#records');
  try {
    const records = await readRecords();
    $('#record-count').textContent = `${records.length} 笔`;
    if (!records.length) { list.innerHTML = '<li class="empty">还没有演示记录</li>'; return; }
    list.replaceChildren(...records.slice(0, 8).map((record) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${record.category ?? '未分类'} · ${record.occurredOn}${record.note ? ` · ${record.note}` : ''}`;
      const value = document.createElement('strong');
      value.textContent = `${record.type === 'expense' ? '−' : '+'}¥${(record.amountMinor / 100).toFixed(2)}`;
      item.append(label, value);
      return item;
    }));
  } catch (error) {
    $('#record-count').textContent = '读取失败';
    list.innerHTML = '<li class="empty error">本机记录无法读取，请勿继续输入；刷新或检查浏览器存储权限。</li>';
    announce(error instanceof Error ? error.message : '本机记录读取失败');
  }
}

async function save(): Promise<void> {
  if (saving) return;
  let amountMinor: number;
  try { amountMinor = parseAmountToMinor(amount); }
  catch (error) { announce(error instanceof Error ? error.message : '金额无效'); return; }
  saving = true;
  const button = $('#save') as HTMLButtonElement;
  button.disabled = true;
  const record: LedgerRecord = {
    id: crypto.randomUUID(), type, amountMinor, category,
    note: ($('#note') as HTMLInputElement).value.trim() || null, occurredOn, createdAt: new Date().toISOString(),
  };
  try {
    await saveRecord(record);
    amount = '';
    ($('#note') as HTMLInputElement).value = '';
    category = null;
    occurredOn = relativeLocalDate(0);
    renderAmount(); renderDate(); renderCategories();
    announce('保存成功 · 已写入本机数据库');
    await renderRecords();
  } catch (error) {
    announce(`保存失败，输入已保留：${error instanceof Error ? error.message : '本机数据库错误'}`);
  } finally { saving = false; button.disabled = false; }
}

async function exportBackup(): Promise<void> {
  try {
    const backup = createBackup(await readRecords());
    const file = new File([JSON.stringify(backup, null, 2)], `family-cfo-lite-g0-${relativeLocalDate(0)}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: 'Family CFO Lite G0 备份' });
    } else {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = file.name; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      announce('已生成 JSON 文件；请确认文件已保存到安全位置');
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
    const current = await readRecords();
    if (current.length && !window.confirm(`当前有 ${current.length} 笔记录。请先导出备份。本操作会全量替换为文件中的 ${backup.recordCount} 笔，继续吗？`)) return;
    await replaceRecords(backup.records);
    announce(`恢复成功 · ${backup.recordCount} 笔记录已替换`);
    await renderRecords();
  } catch (error) {
    announce(`恢复失败，原记录保持不变：${error instanceof Error ? error.message : '备份无效'}`);
  } finally { ($('#file') as HTMLInputElement).value = ''; }
}

function openSheet(name: 'date' | 'more'): void {
  $('#sheet-backdrop').hidden = false;
  $(`#${name}-sheet`).hidden = false;
  document.body.classList.add('sheet-open');
  if (name === 'date') ($('#calendar-date') as HTMLInputElement).value = occurredOn;
}
function closeSheets(): void {
  $('#date-sheet').hidden = true; $('#more-sheet').hidden = true; $('#sheet-backdrop').hidden = true;
  document.body.classList.remove('sheet-open');
}

document.querySelectorAll<HTMLButtonElement>('.segmented button').forEach((button) => button.onclick = () => {
  type = button.dataset.type as EntryType; category = null;
  document.querySelectorAll('.segmented button').forEach((item) => item.classList.toggle('selected', item === button));
  renderCategories();
});
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach((button) => button.onclick = () => {
  const key = button.dataset.key!;
  if (key === '.' && amount.includes('.')) return;
  if (amount.replace('.', '').length >= 12 || (amount.includes('.') && amount.split('.')[1].length >= 2)) return;
  if (key === '.' && !amount) amount = '0.';
  else if (amount === '0' && key !== '.') amount = key;
  else amount += key;
  renderAmount();
});
$('#backspace').onclick = () => { amount = amount.slice(0, -1); renderAmount(); };
$('#clear-amount').onclick = () => { amount = ''; renderAmount(); };
$('#no-category').onclick = () => { category = null; renderCategories(); };
$('#date-open').onclick = () => openSheet('date');
$('#more-open').onclick = () => openSheet('more');
$('#sheet-backdrop').onclick = closeSheets;
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach((button) => button.onclick = closeSheets);
document.querySelectorAll<HTMLButtonElement>('[data-days]').forEach((button) => button.onclick = () => {
  occurredOn = relativeLocalDate(Number(button.dataset.days)); renderDate(); closeSheets();
});
$('#calendar-date').onchange = (event) => {
  const value = (event.target as HTMLInputElement).value;
  if (value) { occurredOn = value; renderDate(); closeSheets(); }
};
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !$('#date-sheet').hidden) closeSheets(); });
$('#save').onclick = () => { void save(); };
$('#refresh').onclick = () => { void renderRecords(); };
$('#export').onclick = () => { void exportBackup(); };
$('#import').onclick = () => ($('#file') as HTMLInputElement).click();
$('#file').onchange = (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) void importBackup(file);
};
$('#clear').onclick = async () => {
  try {
    const count = (await readRecords()).length;
    if (!window.confirm(`仅供虚构数据测试：确定清空本机全部 ${count} 笔模拟记录？此操作不可撤销。`)) return;
    await clearRecords(); await renderRecords(); announce('模拟数据已清空');
  } catch (error) { announce(`清空失败：${error instanceof Error ? error.message : '本机数据库错误'}`); }
};

renderCategories(); renderAmount(); renderDate();
void renderRecords();
void storagePersistenceStatus().then((result) => {
  const labels = { persisted: '浏览器已标记为持久存储', granted: '浏览器已授予持久存储请求', 'not-granted': '浏览器未授予持久存储；请定期导出备份', unavailable: '无法查询持久存储；请定期导出备份' };
  $('#storage-status').textContent = labels[result] + '。这不构成永久保存保证。';
});
