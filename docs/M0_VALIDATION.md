# M0 实际交付与验证 · 2026-10-15

阶段：**M0 完成**。这是 PSW 独立工程基础版，不代表完整产品完成。

## 变更与已实现

- 新建 React / TypeScript / Vite 静态应用、npm 锁文件和只读 CI 配置；没有现成代码被覆盖，也没有初始化远程仓库。
- 原始两个 2020-12 Schema、IntentKit project/proposal fixture 按目录归档，SHA-256 对照原文件全部一致。
- Schema 自动生成领域类型，build 检查类型漂移；AJV 结构校验与跨对象唯一 ID、双向引用、状态绑定、白名单动作目标、数值边界等语义校验分离。
- 提案纯函数模拟：全部操作完成后统一校验；错误不修改输入；baseRevision 过期、未知操作/字段、坏引用和 AI 自证测试通过被拒绝。没有审批提交 API，也没有把模拟对象作为已批准版本。
- 可用页面：概览、需求只读浏览、有限 hover-lift 基线预览、数据/提案合同校验、规范 JSON 阅读、JSON 导入/导出。失败导入保留旧数据；刷新明确恢复内置案例。
- 原始材料、实施计划、M1 最小页面验收、双语 README、运行时第三方许可声明齐备。正式项目许可证待维护者确认。

## 实际测试命令与结果

环境：Windows，Node.js 24.12.0、npm 11.6.2；锁定安装 Vite 7.3.7、TypeScript 5.9.x、Vitest 3.2.7、Playwright 1.64.1。

| 命令 / 检查 | 实际结果 |
| --- | --- |
| `npm install --no-fund --no-audit` | PASS，安装 225 个包并生成 package-lock.json |
| `npm run generate:types` / `npm run check:types` | PASS，原始 Schema 可解析、生成类型与源契约一致 |
| `npm run lint` | PASS，无 ESLint 错误 |
| `npm run typecheck` | PASS，无 TypeScript 错误 |
| `npm test`（在 `npm run check` 中执行） | PASS，42/42 合同单测 |
| `npm run build` | PASS，默认相对资源路径生产构建 |
| `npm run build:pages` | PASS，显式 `/product-spec-workspace/` 资源路径构建 |
| `npm run dev -- --port 5173 --strictPort` | PASS，Vite 启动，本机首页 HTTP 200 |
| `npm run test:e2e` | PASS，21/21，0 失败，0 重试；最终执行 58.1 秒 |
| 原始 Schema / 案例 SHA-256 对比 | PASS，4/4 未改动 |

本机默认 Playwright 全局缓存准备未成功，改用本工作目录下独立浏览器缓存；未修改全局浏览器或代理设置。最终浏览器安装和测试执行方式：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/acer/Documents/Codex/2026-10-15/files-mentioned-by-the-user-acceptance/work/pw-browsers'
node node_modules/@playwright/test/cli.js install --only-shell chromium firefox
npm run test:e2e
```

其他机器可直接执行 README 中的标准 Playwright 安装命令，不必复用这一本机绝对缓存路径。并发三浏览器曾使 Firefox 两项触发 30 秒超时，最终以单 worker、60 秒上限运行整个矩阵，未启用自动重试。此前失败运行不作为通过证据。

## 浏览器覆盖

Chromium headless 156.0.8078.4、Firefox 157.0、390×844 Chromium 手机视口各执行 7 项：

1. 仓库子路径加载、fixture 内容、实现未验证状态、未持久化提示；无页面 JS 错误、无资源 HTTP 4xx/5xx、无非本机运行时请求，页面无横向溢出。
2. 需求阅读及 JSON 与原始规范等价。
3. 6px / 240ms hover-lift 的真实 CSS 变换；桌面鼠标与手机键盘聚焦/失焦恢复。
4. 标准提案模拟产生两个需求/体验/测试，但当前原始规范仍为 r1，测试定义仍为 not-run。
5. 错误 JSON、恶意对象键、未知版本导入被拒绝并保留当前数据。
6. HTML 作为惰性文本、无 img 执行；下载 JSON 与导入规范等价；刷新恢复基线，localStorage/sessionStorage 均为空。
7. 静态资源加载后断网，导航、合同校验及 JSON 阅读正常。

原始机器报告：`M0_E2E_RESULT.json`。实际界面截图：`preview-chromium.png`、`preview-mobile.png`；已分别进行视觉检查。

## 未实现与未验证

M1–M4 均未完成：需求 CRUD、IndexedDB 自动保存、人工审批、历史版本回退、ZIP/Markdown 导入、完整交互编辑器、BYOK、完整 Codex 交接包和线上部署。M0 源码压缩包是工程交付，不是产品生成的 Codex Handoff ZIP。

真实 BYOK：**NOT_RUN**；无真实 Provider/CORS/费用/Key 安全实测，不宣称模型可用。外部 IntentKit 实现：**NOT_RUN**。GitHub Actions 远程 CI：**NOT_RUN**；仅配置已提供。GitHub Pages 线上部署：**NOT_RUN**；本机已验证相同仓库子路径的生产资源。Safari/Edge：**NOT_RUN**。离线冷启动/刷新：**NOT_RUN / 本阶段未支持**。

## 数据与隐私

当前无密钥输入、模型请求、官方 API、遥测或持久化调用；没有读取与项目无关的用户文件。外部资料链接只显示为文本，导入文字由 React 转义；不接受用户提供 Schema 或执行其代码。Schema 校验器仅编译项目自带可信 Schema。基线预览只是独立 CSS 演示，不能视作完整声明式运行器测试。

页面只保留当前内存数据；M0 不承诺刷新保留导入内容，界面明确提示导出备份。没有 Git 提交、推送、PR 或外部部署；没有修改 IntentKit 源仓库。正式静态托管仍可能有常规访问日志。

## 下一步

按 `M1_ACCEPTANCE.md` 实现最小可用需求编辑工作台，优先覆盖连续新增五条、保存后独立再编辑、取消无残留、刷新恢复、草稿与 approved 隔离和失败恢复。M0 无需额外架构决定；品牌、许可证与 Provider 保留在相应阶段由维护者确认。
