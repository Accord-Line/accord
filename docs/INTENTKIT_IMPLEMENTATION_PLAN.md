# IntentKit 交接验证：实现与测试计划

2026-10-15，Codex 实际读取了 `PSW-HANDOFF-EXAMPLE-r2.zip` 解包后的 CODEX_TASK、Markdown、结构化交互和 validation。该包来自固定验收提案，明确不是一次真实模型响应，也不是用户工作区的批准记录。

随后只读克隆并检查 [Vibe-Design-Labs/Vibe-UI-UX](https://github.com/Vibe-Design-Labs/Vibe-UI-UX)，当前 HEAD：`bab2b753433f4c919375df4ed8b5cc30347f6ac2`。未修改、运行构建、提交或推送原仓库；读取后 `git status --short` 为空。

## 已核实的差异

- 交接需求是 REQ-IK-001（可调悬停抬升）和 REQ-IK-002（自然语言/手动创建、保存、调整、导出配方），对应 TEST-IK-001/002。包内测试状态均为 not-run。
- 真实代码已有 `public/compiler-core.js` 的 `compileDesign`、`updateCompilation`、参数冲突和可导出判断；`public/compiler-ui.js` 提供意图细化、配方选择、参数调整与 JSON 导出。
- `compiler/recipes/gentle-card-lift.json` 的配方默认值是 3px/180ms；PSW fixture 的 6px/240ms 是另一组显式示例参数。不得把两者说成相同默认值。
- 当前主线已有独立 AI 原创效果通道：`public/generated-core.js` 校验效果，`generated-ui.js` 驱动生成、参数和预览，`generated-export.js` 已能导出/导入效果 JSON 和 Web ZIP。这比最初 PRD 资料快照更完整，不能重复开发或声称完全缺少生成能力。
- `public/studio.js` 连接词库、Compiler、生成效果与导出。`public/client-byok.js` 已有 TokenDance 直连协议。PSW 的 JSON 组件模型与 IntentKit 的 CompilationResult / generated-project 并非同一契约，不能直接将 PSW ZIP 填进现有导入入口。

## 建议实施顺序（计划，尚未执行）

1. 以 REQ-IK-002 的“命名、保存、重开配方”为增量目标，先确认复用现有受控模板的配方是否满足本轮范围；任意效果继续沿用已有生成效果通道及其隔离预览。
2. 在现有 Compiler 契约之外增加用户配方文件封装，保留名称、用途、模板 ID/版本、参数、触发条件和用户约束；引用现有 Schema 与注册表校验，使用稳定本地 ID。导入旧 CompilationResult 保持兼容，未知模板明确拒绝且保留原文件。
3. 在 `public/compiler-core.js` / `compiler/schema.json` 增加经审查的保存/读取协议；把持久化、文件迁移独立成新模块，避免扩大 compiler-core 对 DOM/存储的依赖。具体新文件名在实施时确定。
4. 在 `public/compiler-ui.js`、`public/studio.html`、`public/studio.js` 接入手动名称与保存/打开动作，复用参数控件、预览与 `canExportCompilation`；保持五语言文案一致。纯文件保存优先，不强制账号或 Key。
5. 自然语言路径复用 `public/client-byok.js` 与 Compiler prompt，先生成候选结果，用户确认后才写入自己的配方。保留原模型审计、取消、错误处理及费用边界；不能直接把原生成效果代码并入主窗口。
6. 复用 `public/effect-export.js` 的可信模板导出或 `public/generated-export.js` 的已验证效果导出；按能力标记分流，不把 PSW 的受控预览冒充原 renderer 完成实现。

## 测试计划（NOT_RUN）

| 关联 | 验证内容 | 对应现有入口/拟增量 |
|---|---|---|
| TEST-IK-001 | 设置 6→10px，实际悬停位移改变；240ms 参数导出一致；越界不落盘 | `tests/compiler.test.mjs`、`tests/component-export.test.mjs`，增加真实浏览器场景 |
| TEST-IK-002 手动 | 无 Key 命名并保存，重开/刷新/导入仍相同；修改后导出再导入一致 | 新用户配方协议回归测试，覆盖空名称、重名、未知模板、旧版本 |
| TEST-IK-002 AI | 候选不覆盖手动内容；拒绝保留原值；过期、非法 ID/参数不能接受 | 扩展 `tests/client-byok.test.mjs`、`tests/compiler.test.mjs`，真实调用另行由维护者授权 |
| 安全与兼容 | 注入文本不执行；Key 不进入配方文件；既有生成效果和 Web 导出不退化 | `tests/generated.test.mjs`、`tests/generation-stream.test.mjs`、`tests/tokendance.test.mjs` |
| 静态发布 | 仓库子路径、无 Key、390px 布局、键盘与减少动态偏好 | 实施后浏览器验收及 `npm run build:pages` |

实施后的已有检查命令应为 `npm test`、`npm run check:content`、`npm run check:docs`、`npm run build:pages`（来自实际 package.json）。本次只读调查未运行这些命令，不能报告通过。

## 风险与完成条件

需要明确“用户配方”与已有“原创效果”的区别，避免两套不兼容保存格式；保留历史版本和来源标记，避免模型修改覆盖人工保存。源仓库已有服务端/社区提交能力，本次方案不据此给 PSW 引入服务器。

交接读取与计划生成已完成。IntentKit 功能实现、源仓库测试、PR、部署均未执行，需用户另行授权具体目标仓库和实施范围。
