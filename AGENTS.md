# 星港拾荒者 — 开发约定

- 只使用当前个人 ChatGPT/Codex 账号。保留原生 HTML/CSS/JavaScript、无框架和无构建步骤的游戏架构，不迁入 React/Unity/Godot。
- 先读 README.md、CODEX_HANDOFF.md、docs/README.md 与相关版本文档。旧版根入口与 v3/ 是不同存档边界；v3 不连接旧版 Firebase 存档。
- 检查工作区、分支、基准 SHA，先运行 `node scripts/check.cjs` 建立基线。浏览器测试需要 CODEX_PLAYWRIGHT_PATH；可设 CODEX_CHROMIUM_PATH，使用全新测试 context。
- 状态和存档变化必须覆盖旧档迁移、有限数值、恢复失败与真实点击/pageerror。不要清除正式玩家存档，不把静态测试称为浏览器验收。
- firebase-config.js 为客户端公开配置，不是服务端密钥；不修改生产 Rules、Functions、凭据或线上存档，不调用真实 Firebase 写入验证。
- 使用 `codex/<task>` 分支和 PR。PR 检查独立于 deploy-pages.yml；后者在 main 执行归档、写提交和 Pages 发布，不能为了测试而手动触发。
- 不自动合并、部署、调整仓库可见性或重打历史 ZIP。合并会触发现有发布，用户决定时机。
- 当前远端仓库是开发入口；旧本地 stellar-outpost-idle 无 Git 副本仅作历史资料，不覆盖、双向同步或混用。
- ChatGPT Project 保存需求和验收，仓库保存实际代码、测试和交接。各项目独立环境；云环境创建/发布/验证状态必须如实记录。
- 任务结束记录命令、退出码、测试脚本数、失败/跳过、浏览器环境、提交/推送/PR 和下一步。
