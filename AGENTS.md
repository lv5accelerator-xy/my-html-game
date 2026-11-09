# 星港拾荒者 — 开发约定

- 原生 HTML/CSS/JavaScript，无框架、无构建步骤。根入口 v2 与 /v3/ 的状态、存储、迁移和云端边界独立。
- 先读 README.md、CODEX_HANDOFF.md、docs/README.md、docs/v3-playable.md 和相关剧情说明，核对远端 main、开放 PR、分支及工作区，再运行 `node scripts/check.cjs` 建立基线。
- 使用 codex/ 开发分支与草稿 PR；不得自行合并、发布或修改部署配置、生产 Firebase、玩家存档及仓库权限。
- 浏览器测试使用隔离 context；设置 CODEX_PLAYWRIGHT_PATH，必要时指定 CODEX_CHROMIUM_PATH。Node 22 / Playwright 1.55.0 保持兼容。
- 规则改动覆盖旧档、有限数值、重复领奖、离线、非法状态和真实交互。保留失败记录，不能放宽断言伪造通过。
- 交接记录准确 SHA、实际命令/退出码/数量、环境、推送/PR 状态与限制。历史 PR 的验证不代表当前代码已验证。
