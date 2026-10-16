# 本交接包的验证说明

以下验证仅涉及**提交给 Codex 的规范资料**，不是 PSW 产品运行测试。

已在资料准备环境执行：

- 对 `schemas/product-spec.schema.json`、`schemas/ai-proposal.schema.json` 使用 `jsonschema` 2020-12 校验器进行解析；通过。
- `examples/intentkit/project.spec.json` 对规范 Schema 校验；通过。
- `examples/intentkit/custom-recipe.proposal.json` 对 AI Proposal Schema 校验；通过。
- 用模拟方式把候选提案中的三个新增对象应用至示例基线，检查 Requirements / Experiences / Tests 之间引用、组件 stateKey、bindings 和事件动作的引用；通过。
- 将测试项状态恶意改为 `external-verified`，提案 Schema 拒绝；通过。

**未运行**：PSW Web UI、浏览器 E2E、真实模型 BYOK、GitHub Pages 生产部署、Codex 在 IntentKit 源仓库中的实现与测试。上述测试必须在工程实现后运行，并按 `tests/ACCEPTANCE.md` 记录。

Schema 本身不处理全部跨引用、一致性和权限检查；Codex 必须在领域引擎中实现相应语义验证。
