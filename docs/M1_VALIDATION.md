# M1 实际交付与验证 · 2026-10-15

阶段：**M1 完成**。本阶段是确定性编辑与文件往返，不代表 M2–M4 已完成。

## 已实现与主要变更文件

- `src/domain/workspace.ts`：需求创建/编辑、稳定 ID、排序、归档、删除引用维护、撤销/重做、按稳定 ID 的字段 Diff、人工审批、提案审批/拒绝、快照比较、回退形成新 revision。
- `src/domain/storage.ts` 与 `src/useWorkspace.ts`：IndexedDB 保存完整工作空间与未完成表单；约 300ms 自动保存，明确状态；同一 readwrite 事务核对 generation 再整体写入；存储失败与多标签页冲突保护；损坏原记录下载、归档并恢复。
- `src/domain/portability.ts`：项目 JSON、完整备份 JSON/ZIP、已批准 Markdown、Markdown 原文保留；ZIP 目录检查与实际读取大小限制；损坏导入不替换当前规范。
- `src/domain/types.ts`、`validation.ts`：草稿独立类型与宽松必填合同，不改变原始批准 Schema；备份外层类型和语义验证。
- `src/App.tsx`、`src/components/`、`src/editor.css`：需求表单、Diff/审批、版本历史、导入与备份、AI / BYOK 进度入口；保留 M0 hover-lift 基线预览。
- `tests/workspace.test.ts`、`storage.test.ts`、`tests/e2e/workspace.spec.ts`、`volume.spec.ts`：真实领域、事务、浏览器回归。旧 M0 浏览器测试已随本阶段的持久化和审批行为更新，而非保留过时的“刷新丢数据”断言。
- package/lock 版本统一为 `0.1.0-m1`，加入 JSZip、测试专用 fake-indexeddb；运行时许可完整打包。静态资源按 React/校验/ZIP 分包，无新增后端。

## 实际命令及结果

环境：Windows，Node.js 24.12.0、npm 11.6.2，Playwright 1.64.1。浏览器为 Chromium headless 156.0.8078.4、Firefox 157.0，手机测试为 Chromium 的 390×844 视口。

| 实际命令 | 结果 |
| --- | --- |
| `npm install jszip --no-fund --no-audit` | PASS |
| `npm install --save-dev fake-indexeddb --no-fund --no-audit` | PASS |
| `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` | PASS，包版本与 lock 同步 |
| `npm run check` | PASS，ESLint、68/68 单测、类型漂移、TypeScript、默认相对路径生产构建 |
| `npm run test:e2e`（核心回归） | PASS，39/39，0 失败、0 跳过、0 重试，约 3.5 分钟 |
| `npm run test:e2e -- volume.spec.ts`（补充容量与空白项目） | PASS，6/6，0 失败、0 跳过、0 重试，41.4 秒 |
| `npm run lint` 与 `npm run build:pages`（最终构建） | PASS，含新增测试的检查与 `/product-spec-workspace/` 资源路径 |

共 **68 项单元测试、45 项浏览器测试通过**。本次浏览器分两次运行：先完成 39 项核心矩阵，再补充 6 项容量/空白项目验证；完整 `npm run test:e2e` 现在会发现全部 45 项。原始机器报告分别是 `M1_E2E_CORE_RESULT.json` 和 `M1_E2E_VOLUME_RESULT.json`，最终构建输出见 `M1_BUILD_OUTPUT.txt`。

本机浏览器缓存沿用工作目录中的测试缓存（未修改全局浏览器或代理）：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/acer/Documents/Codex/2026-10-15/files-mentioned-by-the-user-acceptance/work/pw-browsers'
npm run test:e2e
```

测试使用单 worker、60 秒测试上限，未启用失败自动重试。开发中发现恢复 textarea 的隐式标签在自动化定位上有歧义，已为描述字段补充稳定可访问名称后重跑全部核心矩阵；早先失败运行不作为通过证据。

## 浏览器实际覆盖

下列 15 个场景分别在桌面 Chromium、Firefox 和 390px Chromium 执行：

1. 仓库子路径打开案例，页面无 JS 错误、非本机请求、资源 4xx/5xx 和整体横向溢出；AI / BYOK 入口明确显示 M3 尚未接入，没有 Key 输入。
2. 连续新增五条需求，保存后独立编辑第三条；刷新后第一条和第三条不串内容；取消第六条不留占位；默认 approved r1 保持原样。
3. 未完成表单单独刷新恢复，未加入列表；保存不完整草稿后审批禁用，定位必填字段。
4. 排序、归档、撤销/重做；删除显示具体 Experience/Test 影响，确认后维护引用，撤销恢复。
5. 默认批准 JSON 导出排除草稿；明确审批生成 r2，回退至历史内容生成 r3，保留旧快照和 history。
6. 固定提案先拒绝再批准，三个对象原子进入 r2；测试状态仍 not-run；陈旧版本及未知 op 阻止批准。
7. JSON 和 ZIP 完整备份往返保留 ID、approved、draft、未完成表单、快照及引用，更换项目后可恢复。
8. Markdown 字节对应原文保留到未批准笔记；脚本未运行；坏 JSON、危险键和未知版本不清空原数据。
9. 静态资源已加载后断网，完成真实新增、保存、Diff、审批和 JSON 下载。
10. 两个标签页使用同一 generation 时，后写页面报告冲突、停止写入；能导出其本页表单备份，再载入最新版本。
11. 注入 QuotaExceededError，页面不伪报保存或批准成功，保留内存输入并可导出；解除故障后重试恢复。
12. 注入损坏本地记录，刷新不静默覆盖；可下载原记录，明确恢复后旧记录归档仍存在。
13. M0 6px / 240ms 基线真实 CSS 抬升预览仍可通过鼠标/键盘操作。
14. 导入基线加 100 条额外需求（合计 101 条），第 50 条可编辑保存，approved 不变；实际耗时作为报告 annotation 保留，不冒充性能基准。
15. 新建真正空白项目，不依赖案例或 Key；立即新增真实需求，保存刷新后保持。

截图已实际查看：`m1-overview-chromium.png`、`m1-overview-mobile.png`、`m1-editor-chromium.png`；另存 `m1-editor-mobile.png` 与 `m1-byok-status.png`。手机导航可横向切换，首页也有直接 AI / BYOK 入口；表单保存、取消等主要操作可访问。

## 数据合同与迁移

原始 `product-spec.schema.json`、`ai-proposal.schema.json`、两份 IntentKit JSON 均保持原文件不变。规范 schemaVersion 仍为 0.1.0；完整本地工作空间是新外层 formatVersion 1，详见 WORKSPACE_FORMAT.md。nextRequirementNumber 为兼容的可选分配计数；没有该字段的旧备份仍可读取，并在下一次创建需求时推导安全起点。单测验证取消、删除和撤销记录淘汰后不复用编号。

审批先完整验证候选，再在一个 IndexedDB 事务中写入所有对象、批准版本、快照与历史。事务失败时批准版本不进入 UI。Requirement 自身状态不会因项目 revision 获批而自动改变，测试不会因模拟/审批而变为 passed。

## 未实现、已知限制与未验证范围

- **真实 BYOK：NOT_RUN / 尚未实现**。M1 的 AI / BYOK 面板仅展示阶段进度及真实可用的文件提案流程；未验证任何 Provider、CORS、真实 Key、费用、流式响应或模型错误处理，不能声称模型已连接。
- **M2：未实现**。除有限基线预览外，尚无完整声明式运行器、参数或组件编辑；批准自定义配方的规范不表示已经能操作其表单。
- **M4：未实现**。M1 ZIP 是工作空间备份，不是包含 AGENTS/CODEX_TASK/验证结果的 Codex 标准交接包。
- 当前 IndexedDB 只保存一个活动项目，切换项目前明确确认并建议导出；没有多项目目录、账号或云同步。
- 工作空间/文件上限 8 MiB、受控 ZIP 最多 32 项、声明解压总量 16 MiB、实际文本读取 8 MiB；undo/redo 100 步、快照 500、审阅记录 2000。达到限制报错，不静默丢数据。
- IndexedDB 按浏览器 origin 隔离，开发页和生产预览需用文件交换。存储不可用时可以页面内编辑和备份，批准要求事务写入成功。
- 离线验证以资源已加载为前提；离线冷启动/资源缓存/PWA 未实现。Safari、Edge、真实移动设备、线上 GitHub Pages 与远程 CI 均 NOT_RUN。
- 正式许可证和品牌、首个 Provider 仍待维护者确定。未进行 Git 提交、远程推送、PR 或外部部署；没有修改 IntentKit 源仓库，也没有验证其真实代码实现。

## 隐私检查

当前无模型请求、Key 字段、官方 API、遥测或官方远端存储。项目只写 IndexedDB，不写 localStorage/sessionStorage。导入文字由 React 转义，Markdown 展示原文；ZIP 内容不执行，路径穿越/未知条目/危险对象键/过大输入明确拒绝。浏览器回归核对没有非本机网络请求；静态托管仍可能有常规访问日志。

## 下一阶段

M2：受控 Experience Renderer 和组件属性/绑定/动作编辑，参数变化真实影响预览，并进入同一 Diff/审批/导出路径。M3：真实浏览器直连 BYOK、仅内存 Key、上下文发送确认与可靠失败处理，真实验证与模拟验证分别报告。
