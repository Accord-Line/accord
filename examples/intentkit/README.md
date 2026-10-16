# CASE 001 · IntentKit

项目：[官网](https://vibe-design-labs.github.io/Vibe-UI-UX/) · [GitHub 仓库](https://github.com/Vibe-Design-Labs/Vibe-UI-UX)

这是 PSW 的**测试素材**，不是修改 IntentKit 原项目的授权。

## 输入文件

- `project.spec.json`：2026-10-15 已核对的公开能力基线。包含 `hover-lift` 默认 6px、240ms 的独立体验示例；预览不是 IntentKit 原 renderer。
- `custom-recipe.proposal.json`：用户希望新增“自然语言或手动创建配方 → 预览 → 调整 → 导出”的候选 AI 提案，`baseRevision=1`，未批准时不可加入基线。

## 期待的演示

1. 手工编辑 `REQ-IK-001`，调整体验 state，并看到真实预览变化。
2. 添加新需求，直接填写内容，取消可回退。
3. 载入 `custom-recipe.proposal.json`，比较、预览、拒绝或批准。
4. 批准后 `revision=2`，导出给 Codex 的新任务；禁止声称 IntentKit 原仓库已经实现自定义配方。

数据格式属于 PSW v0.1 草案。真实项目里的新增需求要经过用户明确确认，才能成为已批准的交付规范。
