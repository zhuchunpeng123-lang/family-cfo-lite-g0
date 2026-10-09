# Family CFO Lite Web — G1 Candidate

个人自用优先的 iPhone Web 记账工具。G1 聚焦三件事：快速记账、账本修改、月度统计。资产、FIRE、预算、账号和云同步不在当前范围。

## 产品主路径

- 底部 `+` 进入记账。
- 默认支出；常用分类优先展示。
- 分类可跳过，直接记金额；之后可从账本补分类、日期和备注。
- 选分类后在当前页面底部打开半屏金额键盘，不跳转到新页面。
- 键盘支持 `+ / -` 简单计算，日期默认今天并直接调用系统日期选择器。
- `记入` 是单笔唯一提交动作；成功后半屏收起，仍停留在分类页，方便连续记账。
- 主导航只有 `账本 | + | 统计`。

## G0 数据兼容

- IndexedDB 名称继续使用 `family-cfo-lite-g0`。
- 数据库由 v1 加法升级到 v2：原 `records` store 不删除、不重建；只新增 `settings` store。
- `LedgerRecord` 结构保持 G0 不变：金额继续使用整数分，`category` 继续允许 `null`。
- G1 备份格式升级到 schemaVersion 2，增加自定义分类和大字模式设置；仍接受 G0 schemaVersion 1 备份。
- G0 v1 数据库升级测试必须通过后才能发布。

## 开发

要求 Node.js `>=22 <25`、npm `>=10 <12`。

```powershell
npm ci
npm test
npm run dev
```

生产构建：

```powershell
npm run build
```

GitHub Pages 地址继续使用：

`https://zhuchunpeng123-lang.github.io/family-cfo-lite-g0/`

不要更换路径或 Web App 身份；已添加到 iPhone 主屏幕的入口应继续打开同一地址。

## 版本更新

`public/version.json` 提供远端版本。应用启动和从后台恢复时使用 `cache: no-store` 检查版本；发现更高版本时显示应用内更新提示。当前没有 Service Worker，不引入离线缓存复杂度。

## Founder iPhone 验收

发布前自动化测试和构建必须通过；发布后至少验证：

1. `+ -> 餐饮 -> 42 -> 记入`。
2. 连续记录餐饮 42、交通 18。
3. 直接记金额 18，再从账本补成“买菜”。
4. `58 + 12` 记入为 70。
5. 日期选择昨天。
6. 新增“咖啡”自定义分类并立即记账。
7. 修改、删除后统计同步。
8. G0 已有记录升级到 G1 后仍在。
9. G0 schemaVersion 1 备份可恢复。
10. 原有主屏幕图标直接打开 G1，不需要新增第二个图标。
11. 大字模式仍可完成普通支出。
12. iPhone「文件」导出与恢复实测通过。

真实 iPhone 通过前不得声称 G1 Founder PASS。
