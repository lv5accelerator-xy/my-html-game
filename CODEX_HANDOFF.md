# 星港拾荒者 — Codex 交接

审计日期：2026-10-07（America/Toronto）；远端基准：`db133014d65e92bb77f271eb1567527bfdd25765`。仅使用当前个人账号。

## 环境与入口

原生静态网页。根入口为旧版 v2.3.0；v3/ 为 v3.7.0-preview.1，存档分离。CI 沿用 Node.js 22、Playwright 1.55.0；本机本轮为 Node.js 24.21.0 + 安装的 Chrome。无根 package.json 或游戏运行时包安装。

预览 `python -m http.server 8000`。统一检查 `node scripts/check.cjs`：运行时语法及 tests/ 全部 *.test.js。浏览器测试需设置 CODEX_PLAYWRIGHT_PATH 指向 playwright 模块；CODEX_CHROMIUM_PATH 可指定浏览器。CI 在临时工作区安装 Playwright/Chromium；不引入游戏依赖或根锁文件。

## 基线观察

最初缺少 Playwright 配套浏览器；设置系统 Chrome 后单次完整 browser-smoke 已通过（dust=257M、cores=33.9K）。重复完整套件时该冒烟出现“记录当前”按钮因 DOM 重建脱离导致点击超时；保留失败证据，不把重复运行称为全部通过。新增流程文件不改生产 UI 或放宽断言；后续需在固定浏览器环境复验并单独处理稳定性问题。

修改后：9 项语法检查、15 个测试脚本中 14 个通过、1 个冒烟失败；完整 v3 浏览器脚本通过。随后单独重试 browser-smoke 退出码 0（dust=237M）。基线 180 秒审计超时与修改后 300 秒完整浏览器结果分别记录，不覆盖失败历史。

## 本轮范围和部署边界

新增 AGENTS.md、交接、统一本地验证入口与只检查 PR 的 CI。既有 deploy-pages.yml 在 main 运行自动归档/提交、测试、公开工件发布；本轮不触发该流程或更改其行为。Firebase Rules/Functions 需要单独发布授权，Pages 发布不代替后端部署。

当前本地旧副本有未跟踪 .release-transfer/；旧 stellar-outpost-idle 无 Git。本轮仅修改远端隔离克隆，不覆盖这些本地资料。

## 云与下一步

云环境尚未实际创建、发布或验证。为此仓库单独准备 Node.js 环境；在确认 Chromium 安装与运行能力后启用完整浏览器检查，不需要 Firebase 生产凭据。ChatGPT“星港拾荒者游戏开发”Project 应引用本文件与 PR。

审查草稿 PR，先复验冒烟稳定性，再由用户决定合并。产品方向沿用 docs/v3-playable.md；不在规范化任务中改版本或玩法。

每次交接更新：分支/起止 SHA/PR；命令、退出码、脚本数和实际浏览器结果；剩余问题；已提交/未提交/已推送；云环境验证和合并/部署授权。

## 2026-10-08 稳定性修复

已稳定复现后台 renderRebuild 重建按钮节点。现在按方案 id 保留卡片和按钮，仅更新内容、状态与可见性；点击无需强制执行。冒烟增加空白方案及已记录方案在后台刷新期间的节点存活断言，真实点击后仍记录 slot-1/1200 drone，页面错误 0。

全量复验还复现 v3 测试的虚拟时钟安装/暂停目标重合导致“Cannot fast-forward to the past”；安装先从目标前一分钟开始，再在页面加载前暂停于原精确 TIME。断言、固定测试时间与所有玩法检查不变；独立延迟探针验证旧写法失败、新写法精确暂停和推进 1 秒成功。

修复后统一入口：9 语法检查、15/15 测试脚本通过，退出 0；v3 gameplay 61 行为检查通过。根入口冒烟另有重复验证，均退出 0。最终远端 CI 以 PR #12 的 head SHA/checks 为准。此分支已提交/推送后仍保持草稿 PR，不合并或触发 main 的归档/Pages 部署。Firebase 配置、存档 schema、v3 生产文件和版本号未改；只有根 game.js 的重建视图更新。
