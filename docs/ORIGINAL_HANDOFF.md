# Product Specification Workspace (PSW) — Codex Development Handoff

**这是一份待开发项目的交接材料包，不是已经实现的 Web 应用。**

目标：开源、GitHub Pages 静态部署、Local-first、BYOK；人类与 Agent 围绕一份可编辑、可交互、可版本化的产品规范协作。无注册、无官方服务器、不托管用户业务数据、不承担官方桌面客户端。

## 从哪里开始

- [`PRD.md`](PRD.md) — 完整产品 PRD、P0 验收、范围、架构、路线图
- [`CODEX_START_HERE.md`](CODEX_START_HERE.md) — 可直接交给 Codex 的开工指令
- [`AGENTS.md`](AGENTS.md) — 代理与贡献者需遵守的项目规则
- [`schemas/product-spec.schema.json`](schemas/product-spec.schema.json) — 项目规范数据契约草案
- [`schemas/ai-proposal.schema.json`](schemas/ai-proposal.schema.json) — AI 变更提案数据契约草案
- [`examples/intentkit/project.spec.json`](examples/intentkit/project.spec.json) — IntentKit 核实能力的案例基线
- [`examples/intentkit/custom-recipe.proposal.json`](examples/intentkit/custom-recipe.proposal.json) — “自然语言或手工创建新配方”的拟议变更
- [`tests/ACCEPTANCE.md`](tests/ACCEPTANCE.md) — 测试场景和防伪成功验收
- [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) — 关键架构决策及未冻结项

## 使用方式

1. 创建一个独立的 PSW 新仓库（不要覆盖 IntentKit）。
2. 将本交接材料包放入仓库根目录。
3. 在该目录启动 Codex，直接提供 `CODEX_START_HERE.md` 的全文或要求 Codex 读取它。
4. 要求 Codex 先做 M0 技术规划与脚手架，再按 PRD 阶段门推进。
5. 使用 IntentKit 案例 fixture 进行真实验收。

> 当前文档提供的是**可开发规格和示例契约**。JSON Schema 已进行静态校验，但尚无 PSW 工程实现、真实 BYOK 测试或 Codex 修改结果。模型生成代码与原仓库实现需要后续真实验证。

## 授权与依赖

建议新仓库采用 Apache-2.0，正式 LICENSE 必须由维护者确认后加入；不要把当前这份资料包视为已经获得所有第三方内容和字体的再授权。公开 IntentKit 源仓库：[Vibe-Design-Labs/Vibe-UI-UX](https://github.com/Vibe-Design-Labs/Vibe-UI-UX)。
