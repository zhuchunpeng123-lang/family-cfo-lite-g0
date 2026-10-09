# Family CFO Lite Web — G0

独立的 iPhone Web 技术验证工程。当前只覆盖虚构支出/收入记账、本机 IndexedDB 保存与读回、手动 JSON 备份和全量恢复。它不是生产记账产品，也不应存入真实财务数据。

## 本地开发

要求 Node.js `>=22 <25`、npm `>=10 <12`。

```powershell
npm ci
npm run dev
```

Vite 默认地址为 `http://localhost:5173`。本机没有 TLS 时该地址仅用于 Windows 开发；iPhone HTTPS 验收链接尚未发布。

## 构建与自动化测试

```powershell
npm test
npm run build
npm run preview
```

测试使用 Node 内置测试运行器和 `fake-indexeddb`，覆盖金额解析、日历日、备份格式和坏记录校验、数据库重新打开读回、全量替换及重复 ID 导致的事务回滚。桌面浏览器或 fake IndexedDB 的结果不能替代 Founder 的真实 iPhone Safari / 主屏幕 Web App / 文件分享验收。

## 数据和隐私

- 记录只写入浏览器 IndexedDB；应用没有服务器 API、遥测或第三方脚本。
- 金额以整数分保存。保存成功提示在 IndexedDB 事务完成后出现。
- 导入先解析并验证整个 JSON；有现存记录时提示先备份并确认全量替换。替换通过单个 IndexedDB 事务执行。
- 导出优先使用支持文件分享的系统分享面板；否则使用浏览器 JSON 下载。必须在目标 iPhone 上确认文件确实保存到「文件」，本地自动化无法证明此点。
- Safari 标签页和主屏幕 Web App 可能拥有不同站点存储上下文，必须分别在真实设备验证；不保证数据继承。
- 页面会请求浏览器持久存储，并显示结果，但浏览器仍可能清理站点数据。定期导出备份。
- **离线功能未实现、未验证。**

## G0 HTTPS 测试发布

静态构建输出在 `dist/`，构建路径固定为 GitHub Pages 项目站点 `/family-cfo-lite-g0/`。GitHub Actions 会在 `main` 更新时先运行自动化测试和生产构建，再发布到 GitHub Pages。预期地址：`https://zhuchunpeng123-lang.github.io/family-cfo-lite-g0/`。

该 Pages 网站公开可访问；G0 只使用虚构数据，发布内容不包含财务记录、备份文件或凭证。GitHub Pages 项目站点按路径与同账号其他 `github.io` 项目区分页面，但这些路径属于同一个浏览器 origin；应用使用独立 IndexedDB 数据库名。不要在此 G0 测试中输入真实财务数据。

## Founder iPhone 验收步骤

使用虚构数据，在最终 HTTPS 链接上分别测试 Safari 标签页和添加到主屏幕后的 Web App：

1. 打开页面，确认单屏布局无横向滚动。
2. 选择支出分类，录入 `42` 并保存；确认列表只新增一笔 `¥42.00`。
3. 不选分类，录入 `18`，输入可选备注，通过「昨天」保存；核对未分类和日历日期。
4. 日期面板中选择日期后应自动关闭；「更多信息」可由完成键或遮罩关闭，输入保持不变。
5. 关闭并重开 Safari 标签页，确认记录仍可读。
6. 添加到主屏幕并作为 Web App 打开，单独记录其数据是否与 Safari 共享。
7. 从两个目标使用模式分别导出 JSON，并在 iPhone「文件」中确认文件可找到、可再次选取。
8. 先备份，再确认清空虚构记录；导入有效 JSON，核对笔数、ID、金额、类别、日期、备注。
9. 尝试导入损坏 JSON、未知版本和非法记录，确认报错且原账本未变。

未收到这些真实 iPhone 证据前，G0 Founder Gate 保持 `PENDING`。
