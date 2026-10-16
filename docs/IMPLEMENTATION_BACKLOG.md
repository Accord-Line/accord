# 首版 Implementation Backlog（建议转换为 GitHub Issues）

阶段更新：M0/M1 已完成；本轮按最新用户要求改为 Markdown 直接编辑。M2 运行时/组件编辑/场景往返已实现并验证。M3 Adapter、PKCE、候选审阅、安全与错误处理已实现，公开目录及无认证错误响应的跨域探测通过，有效 Key 生成仍待验证。M4 交接与 Codex 读取计划、中英文文档、CI 和手动 Pages 工作流已准备；远程部署与正式许可证未完成。实际证据以 M2_M4_VALIDATION.md 为准，以下是原始需求定义。

> 任务可由 Codex 顺序实施；每条完成必须符合 PRD 的阶段门和真实测试证据。

| 编号 | 阶段 | 任务 | Definition of Done |
|---|---|---|---|
| PSW-DEV-001 | M0 | 新仓库静态 Web 工程 | GitHub Pages 子路径 build 通过，无服务端 |
| PSW-DEV-002 | M0 | Schema、TypeScript 类型、跨引用校验 | 有合法/非法 fixture 单测，Schema 与类型不冲突 |
| PSW-DEV-003 | M0 | IntentKit 项目基线 | 首页可读取真实 fixture，明确既有/拟议功能区别 |
| PSW-DEV-004 | M1 | 需求 CRUD 及表单验证 | 新建、保存、再编辑、取消、删除/归档、键盘操作真实可用 |
| PSW-DEV-005 | M1 | IndexedDB 草稿与批准版本 | 刷新不丢、未审批修改不会污染 approved，失败不清库 |
| PSW-DEV-006 | M1 | JSON/ZIP/Markdown 导入导出 | round-trip 测试成功；未知 Markdown 内容保留 |
| PSW-DEV-007 | M1 | 版本 revision、Diff 和审批 | 新版本仅审批产生，回退有历史，不直接覆盖 |
| PSW-DEV-008 | M2 | Declarative Experience Runtime | text/card/input/slider/button/status 可操作、状态绑定与动作执行 |
| PSW-DEV-009 | M2 | Experience 属性编辑和 Diff | 可直接编辑组件 label、props、bindings、events，预览真实变化 |
| PSW-DEV-010 | M2 | IntentKit 的自定义配方案例 | 手动创建合法配方，修改参数并真实触发预览/校验 |
| PSW-DEV-011 | M3 | BYOK Provider Adapter + 临时密钥 | 至少一套真实可用浏览器端点，CORS 与费用边界明确 |
| PSW-DEV-012 | M3 | Proposal JSON 验证与应用沙盒 | 非法 op、脏引用、旧 revision 全部阻止，批准事务一致 |
| PSW-DEV-013 | M3 | AI 修改内容和交互的连贯体验 | 一句话提案同时涉及需求、Experience、Test，UI 可编辑候选 |
| PSW-DEV-014 | M4 | Codex Handoff Export | 导出包可脱离 PSW 被 Agent 理解，Key 不泄露 |
| PSW-DEV-015 | M4 | CI、E2E、可访问性、开源文档 | 测试真实运行且汇报不虚报，中英文 README、CONTRIBUTING、SECURITY |

**排序原则**：PSW-DEV-004 比 BYOK 更早完成，因为“用户无法编辑新增需求”的错误是已暴露的产品失败；但 M3 的 AI 实际修改内容与交互，是首版产品价值闭环，不得永远停留在只展示模拟提案。
