# 星港拾荒者 — 连续开发交接

本分支从 main `508456827a798eaf48397511a5c408371c4665c3` 开始。开放 PR #8、#12；#12 未合入，开发约定经最新代码核对后重新记录，未复制其落后的 v3.8 代码。main 已包含 dialog 焦点修复，但仍整体替换 v3 主页面。

真实托管 Codex 云实例 ccarenv_f75502f2245881918632697ec53c5372 已启动，复用预置仓库；本轮没有创建或发布环境配置。独立 worktree `/workspace/starport-v316`，原 `/workspace/my-html-game` 保持原 work/5084568。仓库外工具 Node22.23.4 / Playwright1.55.0 / Chromium151.0.7922.173。Browser 技能已读，但无可调用 js 工具，按本任务授权使用 Playwright。

原始未准备命令 `node scripts/check.cjs` 退出1：缺少 CODEX_PLAYWRIGHT_PATH，未执行测试。准备后 `PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright CODEX_CHROMIUM_PATH=/usr/bin/chromium node scripts/check.cjs` 退出0：9项语法、15/15脚本、84项v3行为、64条v3完整浏览器流程；0失败/跳过。日志 `/workspace/scratch/starport-audit/baseline.log`，后续实际命令记录同目录。

授权：逐版开发、测试、提交、推送开发分支和草稿PR；不合并、不上线、不改部署/生产数据。v2 运行文件保持原样，v3 存储键与schema32保留。

v3.12 完成：派生式渐进引导、各页面单一目标、原生DOM局部协调和交互反馈。完整云验收9语法/15脚本/86行为/65浏览器退出0。下一阶段v3.13动态事件。逐阶段详情见docs/v312-v316-validation.md。
