# Codex 开工指令｜Product Specification Workspace v0.1

你是此开源项目的实现工程师。**这次开发的是全新的 Product Specification Workspace（PSW），不是 IntentKit 本体。** IntentKit 仅是第一个真实案例 fixture；不得未经我明确指示修改、推送或创建 PR 到 `Vibe-Design-Labs/Vibe-UI-UX`。

## 第一步：先读，不要直接大规模生成代码

1. 完整读取 `PRD.md`、`AGENTS.md`、`schemas/product-spec.schema.json`、`schemas/ai-proposal.schema.json`、`examples/intentkit/`、`tests/ACCEPTANCE.md`。
2. 检查当前目录是否已经有仓库、现有功能、包管理器、CI 与约定。若已存在代码，先审计可复用部分及不兼容项，不要重复造轮子。
3. 输出 1 页 **Implementation Plan**：当前事实、拟选框架、M0-M4 拆分、需要人工批准的架构决策、风险、测试方法。
4. **按 M0 开始实施；M0 验证通过后再继续 M1。** 不要一次性输出一套外观完整但无法真实使用的模拟 UI。

## 绝对架构边界

- 静态 GitHub Pages，支持仓库子路径，无官方服务器、账号、数据库、模型代理、遥测。
- 用户数据 Local-first，离线手动编辑能用；Key 仅页面内存，不写入缓存/文件/日志/导出。
- 人和 Agent 共享 Schema、稳定 ID、版本、数据与变更历史；Agent 无需点击 GUI 读取规范。
- 手动编辑是独立能力，**新增需求后必须真正能填写、保存、重新编辑**。
- BYOK 是产品主要协作入口：自然语言修改**文字与可操作交互**；模型只生成 proposal，不能直接写 approved。
- Diff 审查 + 原子提交 + 版本回退；未经确认不能将 AI 产物标为已实现/已测试。
- 不做完整 Figma/Bolt、不运行未经审核的 AI 代码、不强制登录/支付/云同步。

## 建议实施栈（请在实施计划中确认）

- React + TypeScript + Vite（静态）；Zod 或 AJV 校验 JSON Schema；IndexedDB 做草稿持久化。
- 声明式 Experience Renderer：有限白名单组件、state、events/actions；属性与 state binding 均可编辑。**不要因为做了漂亮静态卡片就把它叫“交互编辑器”。**
- 提案处理：后端无关的 `validateProposal → simulateApply → computeDiff → approveAtomic → newRevision`。
- BYOK provider adapter：至少一个经过真实 CORS 测试可运行的端点；同时提供 mock adapter 用于自动测试，不要把 mock 结果展示为真实模型成功。

## 迭代顺序和本次任务

- **M0**：可构建静态站、规范类型与 Schema、IntentKit fixture、校验单测、GitHub Pages 子路径支持。
- **M1**：真实的完整需求编辑、草稿/审批、版本管理、导入导出、浏览器存储。首先修复“新增 REQ-101 后只有默认占位、无法编辑”的失败类型。
- **M2**：可操作 Experience Renderer，选中组件可编辑属性/绑定/动作，操作实时更新，变更纳入 Diff。
- **M3**：真实 BYOK + 结构化提案 + 可靠失败处理 + 明确上下文发送/密钥安全。
- **M4**：完整 Codex 包导出、自动化验收、文档、纯静态部署。

先交付 **M0 的可运行代码和验证输出**，并告诉我 M1 的最小可用页面怎么验收；如果已有可运行项目，也先给事实审计，然后在兼容边界内推进。

## 示例验收操作（必须使用）

1. 打开 IntentKit fixture，其 `hover-lift` 基线 6px、240ms 可预览。
2. 直接新建一条真实需求，自行填写标题、描述、验收条件；刷新后保持且可再次编辑。
3. 以文字要求：“用户可以使用自然语言或手动配置创建自定义配方，并预览、调整和导出。”
4. AI 应提出需求 + 交互 + 测试的候选更改（使用 `examples/intentkit/custom-recipe.proposal.json` 作为可复现的标准测试数据）；修改前 approved 不变。
5. 用户审阅 Diff 后选择拒绝或批准；批准后进入下一 revision，完整交互可手动操作。
6. 导出规范/变更/AGENTS/CODEX_TASK 包，再导入可保留已批准内容和引用。

## 输出汇报格式

每一阶段回复：

```text
阶段：M0/M1/…
变更文件：...
已实现：...
未实现/已知限制：...
测试命令及实际结果：...
真实 BYOK 验证范围：...（未测就写未测）
数据/隐私检查：...
下一步和需我决定的问题：...
```

**重要：** 对示例中 IntentKit 的“自定义配方”需求，只做 PSW 规范编辑和真实案例演示；不能把“PRD 中有这条需求”伪装成 IntentKit 原项目已上线该功能。
