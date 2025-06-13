# TODOs for Webpage Table Exporter

> 根据 `plan.md` 拆解的可执行任务清单

## T001: 内容脚本 (entrypoints/content.ts)
- [x] 监听来自 Popup 的 `get_tables`、`export_table`、`highlight_table` 消息。
- [x] 实现 `scanTables()`：
  - 扫描 `document.querySelectorAll('table')` 并过滤隐藏表格。
  - 为每张表生成 `TableMeta`（含 `id`, `rows`, `cols`, `preview`）。
- [x] 实现 `exportTable(id)`：
  - 根据 id 定位表格元素。
  - 使用 `tableToCsv()` 生成 CSV 并触发下载。
- [x] 编写 `escapeCsv()` 与 `tableToCsv()` 工具函数。
- [x] 实现表格高亮功能：
  - `scrollToElement()` - 平滑滚动到表格位置。
  - `highlightTable()` - 添加黄色背景动画效果。
  - `highlightTableById()` - 根据ID高亮指定表格。

## T002: Popup (entrypoints/popup)
- [x] 创建 `App.tsx` 基础布局。
- [x] 实现 `useEffect` 首次渲染时向激活标签发送 `get_tables` 请求。
- [x] 构建 `TableList` 组件，渲染表格列表。
- [x] 构建 `TableItem` 组件，显示行×列及预览文本。
- [x] 点击条目后发送 `export_table` 消息，并显示导出进度/结果提示。
- [x] 处理无表格时的空态展示。
- [x] 实现表格高亮功能：点击表格项时页面滚动到对应位置并动画高亮背景。

## T003: Manifest & 构建配置
- [x] 在 `wxt.config.ts` 中声明权限：`tabs`, `activeTab`，并注册内容脚本。
- [x] 设置 Popup 页面入口为 `entrypoints/popup/index.html`。

## T004: 错误处理 & 性能
- [x] 当页面不存在表格时，Popup 显示友好提示。
- [ ] 导出前再次校验目标表格仍然存在。
- [ ] 针对大表格优化遍历与字符串拼接性能（使用数组 `join()` 等）。

## T005: 测试(human)
- [x] 准备包含多表格和合并单元格的示例页面。
- [ ] 在常见站点（Wikipedia 等）验证导出效果。
- [ ] 在 Chrome / Edge / Firefox 浏览器中进行冒烟测试。
- [ ] 使用 Excel 打开导出的 CSV，确认编码和转义正确。

## T007: 测试基础设施 (已完成)
- [x] 创建 `examples/` 文件夹及测试用例。
- [x] 实现单元测试覆盖 (19个测试用例)。
- [x] 编写测试文档和使用指南。
- [x] 建立开发日志记录系统。

## T006: 后续可拓展（Backlog）
- [ ] 支持一次导出多个表格（合并或压缩）。
- [ ] 支持导出为 XLSX、JSON、Markdown 等格式。
- [ ] 提供列选择、过滤和预览编辑能力。
- [ ] 记忆上次导出配置并美化 UI。
