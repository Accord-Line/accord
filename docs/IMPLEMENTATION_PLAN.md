# Implementation Plan · 2026-10-15

本文保留 M0 首次开工时的计划与事实审计。当前已交付 M1，实际结果见 M1_VALIDATION.md；M2–M4 仍为后续阶段。

## 当前事实与范围

当前工作目录只有空的 work/、outputs/，无源代码、Git 仓库、包管理器或 CI 可复用。用户提供的文件是 PSW 待开发规格；按 CODEX_START_HERE 先交付 M0。原始资料恢复为 schemas/、examples/intentkit/、tests/、docs/ 目录。两个案例 README 内容相同，仅保留一份；Attention-Is-All-You-Need.md 为无关论文，不纳入项目。IntentKit 仅作资料快照与 fixture，不克隆或修改源仓库。

## 实施方案

React + TypeScript + Vite 静态 SPA；AJV 2020-12 校验原始两个 JSON Schema，并独立检查唯一 ID、引用、状态绑定、事件与动作。TypeScript 类型从原始 Schema 生成，并在 build 中检查漂移。无需富文本库、远程字体、服务端或任何账号。默认相对资源路径；Pages 可指定仓库 base。单测使用 Vitest，浏览器验收使用 Playwright。

| 阶段 | 交付与阶段门 |
| --- | --- |
| M0（本次） | 静态站、领域类型、Schema/语义校验、原始 fixtures、开发文档；install/test/build 和子路径浏览器验证 |
| M1 | 结构化需求完整 CRUD，取消/撤销/重做，IndexedDB，草稿隔离、Diff、批准、回退、JSON/ZIP/Markdown 往返；连续新增五条后刷新可独立编辑 |
| M2 | 白名单 Experience Renderer 与组件属性/绑定/动作编辑；参数→真实视觉→Diff→批准→导入导出一致 |
| M3 | 浏览器直连 BYOK、仅内存 Key、发送范围预览、结构化提案与原子审批；真实端点测试和模拟测试分开报告 |
| M4 | Codex 完整 ZIP、双语文档、安全说明、Pages 发布工作流与完整 E2E；需实际交接证据 |

## 决策与风险

不阻塞 M0 的维护者决策：正式品牌/仓库名、Apache-2.0 或 MIT、首个真实 BYOK Provider。正式许可证留待确认，不擅自签发。M1 使用原生结构化表单优先，富文本以后评估。项目没有远程提交、部署或原仓库修改授权；本次仅本地文件和本机预览。

原始 Schema 为草案：JSON Schema 不检查跨引用；history 没有日期、evidence 没有 who/when/source 等 PRD 要求的字段。这些不私自扩展，在相应阶段以版本化迁移和回归测试解决。多标签页冲突需 M1 使用 IndexedDB 事务校验 revision；M3 的 CORS 不能通过增加官方代理规避。浏览器存储可被清理，M1 必须提供备份提示。

## 验证方法

M0 对原始基线、提案和非法数据逐项测试；禁止未知操作、伪造测试通过、坏引用、重复 ID、未知绑定和恶意键。对提案仅做纯函数模拟校验，不产生批准版本。浏览器测试基线加载、悬停样例、导入失败保留旧数据、JSON 导出、390px 及子路径资源。所有案例测试状态保持 not-run，Schema 通过不代表 IntentKit 实现已验证。M1 具体手动验收见 M1_ACCEPTANCE.md。

参考：[Vite 静态与 Pages 部署](https://vite.dev/guide/static-deploy.html#github-pages)、[AJV 2020-12](https://ajv.js.org/json-schema.html#draft-2020-12)。
