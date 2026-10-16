# 架构决策记录（待 Codex 评审）

## ADR-001：静态优先、无官方运行时后端（已固定）

产品部署于 GitHub Pages。所有普通编辑、存储、Diff、验证、导出在浏览器内完成；调用 BYOK 为浏览器直接请求用户指定 Provider。不得为满足 CORS 私设官方中转服务，必要时清晰说明用户自托管代理方案。

## ADR-002：数据 IR 是唯一规范（已固定）

所有视图、导出和变更围绕 `product-spec.schema.json` 的语义对象实现。渲染后的 HTML 或 Markdown 只是投影，不得成为独立事实来源。

## ADR-003：双轨编辑，AI 是重点但并非依赖（已固定）

手动编辑必须真正能新增和修改全部核心对象；AI 同样操作结构化规范，通过 Proposal 提交。用户用更强模型提升能力，不必更换平台版本。

## ADR-004：P0 受控声明式交互；不运行不可信代码（已固定）

有限组件、可编辑属性、state 绑定、事件动作与验证规则。未来任意代码生成/预览需单独安全设计和隔离环境。`bindings` 字段用于把 card hoverLiftPx / durationMs 等展示属性关联 Experience state，不能只改变滑块数字而不改变效果。

## ADR-005：已批准版本和候选提案分离（已固定）

Proposal baseRevision 不符则 stale；事务性模拟、Schema 和跨引用检查后才能让人类批准一次原子变更。需要明确区分“project revision 获得批准”与“某条需求自己的 status”。首版导出给 Codex 时标注需求状态，不把 draft 需求伪装成已确定实现要求。

## ADR-006：Agent 先通过文件交换（已固定）

P0 支持 JSON/ZIP/Markdown 与 `AGENTS.md`、`CODEX_TASK.md`；CLI 和 MCP 非 P0。用户自己的 Agent 有权访问的项目文件由用户本地环境管理，网页不会拥有任意文件写权限。

## ADR-007：开源协议（建议，未冻结）

新 PSW 推荐 Apache-2.0：利于集成与清晰专利条款；MIT 也是合理备选。第三方富文本/编辑器依赖许可须逐一检查。不要在首次 PR 未获得授权时进行双许可证或商业重授权设计。

## ADR-008：首个 Provider（未冻结，M3 阶段确定）

需要实测 Web CORS、所选 API 可用性、工具调用/结构化响应、费用承担、错误处理。不能仅因 OpenAI-compatible 就推定任何端点在 GitHub Pages 直连可用。

## ADR-009：同步（明确不做）

官方不建云同步。用户可按需用自己的 Git、文件夹、云盘、Agent 协作。Web 文件系统直写仅作为浏览器支持时的渐进增强；必须保留下载导入回退。

## ADR-010：许可、隐私与导出真实性（已固定）

用户创作的 PRD 不自动以 PSW 的代码开源许可证公开。BYOK 调用前明确显示将发送给第三方的上下文。Key 只在内存。规范测试通过不得宣传真实仓库功能已实现。

## ADR-011：M1 工作空间备份外层与存储事务（实现记录）

原始项目/提案 Schema 继续为 0.1.0。未批准草稿、临时表单、快照、撤销和审阅记录放在独立 formatVersion 1 的 Workspace 外层，不以残缺数据冒充合法 approved。IndexedDB 单事务比较 generation 并整体写入；批准和回退仅在持久化成功后进入 UI，多标签页冲突停止写入。协议见 WORKSPACE_FORMAT.md。完整 ZIP 是备份，M4 的 Codex Handoff 尚未完成；M3 真实 BYOK 也尚未接入。

## ADR-012：本轮 Markdown-first 与 BYOK（实现更新）

用户最新指示覆盖旧表单交互：完整 Markdown 为人类正文，结构索引用于关联体验/测试；技术入口缩为角落三图标，主导航四项。保留原始产品 Schema，将原文作为带标记 note 存储，不丢自由内容。提案增加兼容的 updateDocument 操作、迁移与回归；标准正文/索引不一致阻止接受。

TokenDance 为用户指定的首个适配：浏览器直连、PKCE S256、仅内存凭据、显式费用和发送上下文。实际目录与无效凭据/授权码的 CORS 探测已通过；不据此声称有效 Key 提案成功。无服务端代理。上述实现更新 ADR-008/011 的阶段状态，但不替代真实带 Key 验收。

## ADR-013：交接与发布分离

完整工作区备份与 Codex 交接使用不同入口。交接默认只含 approved 镜像、历史、正文、机器规范、证据和任务；未批准草稿只作可选明确附件。实际样例经生成/解包/重导入，由 Codex 读取后对只读 IntentKit HEAD 生成计划，未改动源仓库。Pages workflow_dispatch 文件已提供，没有触发部署；许可证仍待维护者确认。
