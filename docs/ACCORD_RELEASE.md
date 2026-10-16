# 共识 Accord · 首个公开预览

日期：2026-10-16。版本：0.3.0-preview。

品牌：**共识 Accord**。标语：**让想法与实现，始终对得上。**

产品介绍：和 AI 一起，把想法写清楚，把交互试明白，把每一轮决定留在同一份产品规范里。

## 发布结构

- 官网：https://accord-line.github.io/ ，源代码 https://github.com/Accord-Line/accord-line.github.io
- 工作空间：https://accord-line.github.io/accord/ ，源代码 https://github.com/Accord-Line/accord
- 原始代码采用 Apache-2.0；第三方包、SIL OFL 字体与案例来源保持各自的许可和声明。网站与产品均为纯静态 GitHub Pages，无新增官方后端、账号、代理或遥测。

## 改动

统一工作空间标题、页面元信息、标语、介绍、品牌字样、授权 Key 名称和文档；增加官网和仓库入口。TokenDance 默认应用归因更新为官网地址，回调继续位于工作空间同源路径。旧 Schema ID、本机数据库名、备份/交接文件前缀保留，既有内容无需迁移。用户原有批准版与候选不自动变更。

官网提供四入口交互示意：自由文本、真实参数预览、候选变化说明和版本概念；明确标注示意不保存项目。正式编辑使用 `/accord/`。示意支持键盘切换与减少动态偏好，所有字体本机托管，不使用外部统计脚本。

## 验证范围

`npm run check` 已通过 lint、100 项领域/协议/存储测试、Schema 类型一致性、TypeScript 和生产构建，实际输出在 `ACCORD_CHECK_OUTPUT.txt`。

官网本地 Chromium 桌面 1440px、手机 390px、小屏 320px 走查：无横向溢出、无脚本错误、无外部自动请求；键盘切换正常；15px 参数产生真实 `translateY(-15px)`；减少动态偏好关闭位移；示意输入在切换期间保留。详见官网仓库 `VALIDATION.json` 与预览截图。这是开发者走查，不是目标用户研究。

工作空间 `/accord/` 子路径回归：Chromium、Firefox、390px Chromium 共 60/60 通过（3.1 分钟，无重试），原始输出 `ACCORD_E2E_OUTPUT.txt`，报告 `ACCORD_E2E_RESULT.json`。随后仅调整标语断行与英文品牌字号，三浏览器首屏专项 3/3 通过，结果另存 `ACCORD_BRAND_SMOKE_OUTPUT.txt` / `ACCORD_BRAND_SMOKE_RESULT.json`。

## 已发布与线上验证

- 官网提交 `3818627`，部署成功：[官网发布工作流](https://github.com/Accord-Line/accord-line.github.io/actions/runs/38860534149)。
- 工作空间代码提交 `8991d0d`，构建与部署成功：[工作空间发布工作流](https://github.com/Accord-Line/accord/actions/runs/38860881673)。
- 官网、工作空间、OAuth 静态回调、许可证和 favicon 均返回 HTTP 200。
- 在真实公开站点完成桌面 1440px 与手机 390px 走查：官网按钮能进入 `/accord/`，正文可编辑，四个主入口正确，未发现横向溢出、脚本错误或站点资源加载失败。官网示意的 12px 参数实际产生向上 12px 的位移。
- 从生产源读取 TokenDance 公开模型目录，HTTP 200、109 项可选模型；只验证目录，不包含授权或付费模型调用。原始结果在 `ACCORD_ONLINE_VALIDATION.json`，截图 `accord-live-desktop.png` / `accord-live-mobile.png`。
- GitHub Linux CI 已成功：依赖安装、lint、100 项单测、类型与构建、60 项三浏览器回归均通过。[Accord validation](https://github.com/Accord-Line/accord/actions/runs/38860882681)，机器状态记录 `ACCORD_GITHUB_CI.json`。
- 后续仅发布文档和检查证据；代码部署仍对应上述提交。文档更新不触发重复部署。

本机与公开站点属于不同源，项目数据不会自动同步。需要继续本机项目时，先从本机“项目数据”导出完整备份，再在公开站点导入。Key 不随备份迁移。

真实有效 Key 的授权、付费模型生成与生产源下服务商 CORS 不包含在上述自动化模拟中；不宣称其已完成验收。M5 完整生命周期追踪仍在完善，外部实现与测试由用户自己的工具执行。

历史 M0–M5 文档与报告反映当时状态，不能替代本次发布记录；原有未运行的领域测试定义仍保留 not-run。
