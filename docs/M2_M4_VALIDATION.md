# M2–M4 工作预览验证报告

日期：2026-10-15；版本 `0.2.0-m4-preview`。本轮以用户最新要求为准：自由 Markdown 编辑、BYOK 首块常驻、四项主导航、技术协议入口角落图标。输入资料中的旧选择式表单流程仅作历史背景。

## 阶段状态

| 阶段 | 本轮状态 | 证据 / 边界 |
|---|---|---|
| M1 更新 | PASS | 直接 Markdown 编辑、五条独立需求、刷新、撤销、离线审批、历史回退、文件往返；替换旧表单主流程 |
| M2 | PASS（有限声明式范围） | 参数真正改变卡片 transform；属性/绑定编辑、完整事件配置、校验中止、审批和交接重导入；不执行任意生成代码 |
| M3 软件链路 | PASS（模拟） | 内存 Key、PKCE、上下文确认、有效候选/非法响应/401/429/网络失败/过期草稿全部自动测试 |
| M3 真实直连 | 部分 PASS | Chromium/Firefox 真实读取 106 个目录模型，真实无效凭据聊天 401、无效授权码交换 403 均可跨域读取；尚无有效 Key 生成证据 |
| M3 完整阶段门 | 未通过，待复测 | 用户报告已授权，但后续请求超时；已修订等待与诊断，仍无有效 AI 提案成功证据，不把模拟或目录成功替代它 |
| M4 交接与读取 | PASS | 实际生成/解包/重导入 r2 固定样例；Codex 读取并只读核实真实 IntentKit commit，给出文件影响和测试计划 |
| M4 发布准备 | PASS（本地） | 子路径静态构建、CI、手动 Pages workflow、中英文 README、安全/贡献/许可汇总已提供 |
| M4 线上发布/正式开源 | NOT_RUN | 未创建远程仓库、推送、部署、执行 Pages 工作流或签发正式项目 LICENSE |

因此整体称为 **M4 工作预览**，不宣称所有真实阶段门已经完成。

## 实际命令与结果

| 命令 | 实际结果 |
|---|---|
| `npm run check` | ESLint、96 项单元测试、生成类型漂移检查、tsc、Vite build 全通过；4 个单测文件；日志 M4_CHECK_OUTPUT.txt |
| `npm run test:e2e` | 全量 54 项中 53 通过、1 个 Firefox 自动保存等待失败，0 跳过；桌面 Chromium、Firefox、390×844 Chromium 各 18 项；原始失败保留在 M4_E2E_RESULT.json / M4_E2E_OUTPUT.txt，Firefox 新进程完整 18 项复验全部通过，另存 M4_FIREFOX_RECHECK_RESULT.json；原始失败未覆盖 |
| Playwright 内部 `npm run build:pages` | `/product-spec-workspace/` 实际生产构建与预览通过，包括 OAuth callback 静态文件 |
| `node scripts/verify-handoff.mjs` | 实际生成 14 个文件、17592-byte r2 固定样例 ZIP，解包文本一致，重导入 approved 数据等价；日志 M4_HANDOFF_RESULT.json |
| `node scripts/runtime-notices.mjs` | 收集 package-lock 中 124 个生产依赖的许可文本，写入根目录与 public，构建携带 |
| `git ls-remote` / shallow clone / read / `git status --short` | 只读 IntentKit HEAD `bab2b753433f4c919375df4ed8b5cc30347f6ac2`，读取后工作树无修改；未运行原仓库测试或构建 |

固定交接样例 SHA256：`97497d99be6e3c8d6dcbd31800a0da7ba8e28f3b0e3e2d89ea6798af8e585d23`。它是自动化验收使用的固定提案，不是本次真实模型生成或用户工作区导出。

产品 Schema 与 Downloads 原件逐字节哈希相同：`ee39c6afe193309b888170f72f5cea7cf1f35496f0f1071a15b7e69d931ea7ff`。Proposal 增加可选 updateDocument，附迁移与回归；原始标准提案仍通过。

## 54 项浏览器覆盖

每个浏览器运行同样 18 项：首块 BYOK/四导航/角落工具/无自动外部调用；五条自由书写需求与刷新；离线编辑审批回退；真实滑块和悬停位移；固定配方校验；模拟候选与 Key 扫描；401；429；网络/非法响应；并发改正文导致候选过期；PKCE 弹窗回调；恶意 JSON/Markdown；多标签页冲突；100 条需求；组件属性与错误配置/对话框键盘焦点；减少动态偏好/外部图片不自动加载；候选转入人工编辑并可放弃；慢请求取消后的阶段/耗时/单条失败与无 Key 记录导出。

Key 安全覆盖：测试用显式 fake sentinel，凭据仅设置在页面内存；扫描工作空间、IndexedDB、localStorage、sessionStorage、备份文件均无该值；刷新后生成按钮禁用。HTTP 错误体不显示；含脚本的 Markdown 不执行，危险链接无效，图片变为手动打开链接。领域测试还覆盖体积、深度、危险对象键、Schema/引用、状态与动作范围、ZIP 边界、坏输入保留、持久化失败和原子事务。

最终全量曾有一次 Firefox 自动保存未在 5 秒内完成，浏览器同时报告脚本超时、窗口/图形与调试接口异常，最终上下文关闭也超时。随后不修改代码、不开自动重试，以新 Firefox 进程完整重跑同样 18 项，18 项全通过（约 1.5 分钟）。原始全量 53/54 与复验 18/18 分开保留，不能据此声称偶发稳定性风险已排除或已确认根因。

初轮浏览器测试发现并已修正/复验：导航状态点改变可访问名称；持久化断言过早；模拟授权需模拟服务商页面内跳转以保持 opener（浏览器自动化 goto 会改变该关系）。弹窗回调和手动 code 后备都没有引入持久化 verifier。

## 真实 TokenDance 范围

依据用户提供的 [TokenPay 飞书说明](https://agentuniverse.feishu.cn/wiki/IKnrwiDXRijdudkRb0WcCrCinIb) 和 [TokenDance 官方 PKCE 协议](https://tokendance.space/docs/api-key-oauth)、[归因协议](https://tokendance.space/docs/app-attribution) 实现。

2026-10-15 05:33:05 UTC，来自 `http://127.0.0.1:5173` 的真实浏览器直连：

| 请求 | Chromium 156.0.8078.4 | Firefox 157.0 | 能证明什么 |
|---|---|---|---|
| GET models（无 Key） | HTTP 200，106 模型 | HTTP 200，106 模型 | 公开目录在本机源可跨域读取 |
| POST chat（刻意无效的固定测试凭据） | HTTP 401，可读 recovery | HTTP 401，可读 recovery | 携带 Authorization / X-App-URL 的跨域请求能收到拒绝响应；未执行有效计费生成 |
| POST auth key exchange（刻意无效的 code/verifier） | HTTP 403 | HTTP 403 | 交换端点的跨域拒绝响应可读；不证明有效授权完成 |

完整脱敏记录：BYOK_PUBLIC_PROBE.json。早期探测出现 ERR_CONNECTION_CLOSED，后续上述探测恢复成功；不能把早期连接关闭直接归因 CORS。无效凭据探测没有使用真实 Key、账户授权码或账户额度。

用户报告已在页面完成授权尝试，后续请求出现旧版 90 秒超时；不能仅凭旧提示确认超时阶段或上游是否执行/计费。已修订为阶段化等待、进度、单条错误和脱敏诊断，见 BYOK_TIMEOUT_FIX.md。独立成功证据仍待验证：有效 code→Key 交换、有效 Key 连接测试和模型候选、生产 Pages 源的 CORS/回调、服务商收费明细。页面可由用户自行完成真实流程并导出不含 Key 的本次调用记录。本轮不读取用户聊天中的 Key。

## 实际交接与外部仓库

实际读取了导出的 CODEX_TASK、requirements、project.spec、experiences 和 validation。随后只读检查真实 IntentKit 当前代码，发现已有 Compiler、原创效果与导入导出通道，因此计划围绕命名/保存/重开自定义配方的增量与协议兼容，而不是按旧快照假设重写全部能力。

结果见 INTENTKIT_IMPLEMENTATION_PLAN.md。它区分已核实路径、拟新增模块和 NOT_RUN 测试计划。没有修改原仓库、自动创建 PR、推送或部署。包内 TEST-IK-001/002 仍 not-run：本工程自动测试不等于源仓库功能通过。

## 文件与截图

- `src/domain/document.ts`：完整原文、标准章节索引与稳定 ID。
- `src/domain/experience.ts` / `components/ExperienceStudio.tsx`：受控运行、组件编辑、校验中止。
- `src/byok/` / `components/Collaboration.tsx` / `public/oauth-callback.html`：TokenDance 与兼容服务、内存凭据、发送与授权。
- `src/domain/handoff.ts`：批准内容交接与可选草稿；`proposal.ts` / `workspace.ts`：语义模拟、过期保护与候选转人工编辑。
- App / workspace.css / MarkdownText / ToolDialog：四导航、首块协作、自由正文、安全预览与原生工具对话框。
- `docs/m4-document-chromium.png` / `m4-document-mobile.png`：真实桌面/手机完整页。
- `docs/m4-mobile-viewport.png`：390×844 首屏，固定底部四导航。
- `docs/m4-experience-chromium.png` / `m4-experience-mobile.png`：实际交互与参数。
- `docs/m4-byok-public-directory.png`：真实读取目录后的连接界面，无 Key、无计费请求。

## 已知限制

Markdown 使用原生 textarea 和安全阅读预览，不是富文本所见即所得。标准标题可同步索引，不能自动理解所有自由 prose；非标准内容全部保留。批量同时改名、改描述并移动多个段落时，没有显式 ID 的自然语言无法保证推断出原条目，应分步编辑并核对差异；Agent 应用结构化 ID。

预览仅限九种声明式组件和四种动作。更复杂效果明确不支持；完整动作编辑目前在角落 JSON 工具中。没有任意代码沙盒、多人同步或自动目标仓库修改。浏览器文件/工作区 8 MiB 等边界见 WORKSPACE_FORMAT.md。

保留一个未确认根因的 Firefox 偶发等待/脚本超时记录，复验通过不抹去该异常。未做 Safari、正式辅助技术/对比度审计、独立用户研究、生产部署或有效 Key 生成成功验收。UX 改版结论属于工程走查，未编造转化率或用户反馈。项目正式许可证待维护者确认，第三方许可已随构建提供。
