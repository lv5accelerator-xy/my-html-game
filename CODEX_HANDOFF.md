# 星港拾荒者 — Codex 交接

审计日期：2026-10-07（America/Toronto）；远端基准：`db133014d65e92bb77f271eb1567527bfdd25765`。仅使用当前个人账号。

## 环境与入口

原生静态网页。根入口为旧版 v2.3.0；v3/ 为 v3.7.0-preview.1，存档分离。CI 沿用 Node.js 22、Playwright 1.55.0；本机本轮为 Node.js 24.21.0 + 安装的 Chrome。无根 package.json 或游戏运行时包安装。

预览 `python -m http.server 8000`。统一检查 `node scripts/check.cjs`：运行时语法及 tests/ 全部 *.test.js。浏览器测试需设置 CODEX_PLAYWRIGHT_PATH 指向 playwright 模块；CODEX_CHROMIUM_PATH 可指定浏览器。CI 在临时工作区安装 Playwright/Chromium；不引入游戏依赖或根锁文件。

## 基线观察

最初缺少 Playwright 配套浏览器；设置系统 Chrome 后单次完整 browser-smoke 已通过（dust=257M、cores=33.9K）。重复完整套件时该冒烟出现“记录当前”按钮因 DOM 重建脱离导致点击超时；保留失败证据，不把重复运行称为全部通过。新增流程文件不改生产 UI 或放宽断言；后续需在固定浏览器环境复验并单独处理稳定性问题。

## 本轮范围和部署边界

新增 AGENTS.md、交接、统一本地验证入口与只检查 PR 的 CI。既有 deploy-pages.yml 在 main 运行自动归档/提交、测试、公开工件发布；本轮不触发该流程或更改其行为。Firebase Rules/Functions 需要单独发布授权，Pages 发布不代替后端部署。

当前本地旧副本有未跟踪 .release-transfer/；旧 stellar-outpost-idle 无 Git。本轮仅修改远端隔离克隆，不覆盖这些本地资料。

## 云与下一步

云环境尚未实际创建、发布或验证。为此仓库单独准备 Node.js 环境；在确认 Chromium 安装与运行能力后启用完整浏览器检查，不需要 Firebase 生产凭据。ChatGPT“星港拾荒者游戏开发”Project 应引用本文件与 PR。

审查草稿 PR，先复验冒烟稳定性，再由用户决定合并。产品方向沿用 docs/v3-playable.md；不在规范化任务中改版本或玩法。

每次交接更新：分支/起止 SHA/PR；命令、退出码、脚本数和实际浏览器结果；剩余问题；已提交/未提交/已推送；云环境验证和合并/部署授权。
