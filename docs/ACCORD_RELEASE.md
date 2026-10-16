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

工作空间 `/accord/` 子路径回归：Chromium、Firefox、390px Chromium 共 60/60 通过（3.1 分钟，无重试），原始输出 `ACCORD_E2E_OUTPUT.txt`，报告 `ACCORD_E2E_RESULT.json`。随后仅调整标语断行与英文品牌字号，首屏专项结果另存 `ACCORD_BRAND_SMOKE_OUTPUT.txt`。官网部署工作流已成功，实际访问返回 HTTP 200；工作空间部署及线上联合走查将在本次发布完成后补充。

真实有效 Key 的授权、付费模型生成与生产源下服务商 CORS 不包含在上述自动化模拟中；不宣称其已完成验收。M5 完整生命周期追踪仍在完善，外部实现与测试由用户自己的工具执行。

历史 M0–M5 文档与报告反映当时状态，不能替代本次发布记录；原有未运行的领域测试定义仍保留 not-run。
