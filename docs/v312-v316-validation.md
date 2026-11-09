# v3.12～v3.16 连续开发验收

## 来源与边界

起始 main：`508456827a798eaf48397511a5c408371c4665c3`；原 work 工作区干净。2026-11-09 核对全部开放 PR：#8 删除旧交接、草稿 #12 历史流程规范化；均未合并。读取 #12 的 AGENTS/CODEX_HANDOFF，并按最新main核对，未合并其旧v3.8代码。main已包含原生dialog关闭焦点守卫，本轮仅修改v3运行文件、测试与文档。

开发分支 `codex/v312-v316-gameplay-expansion`，隔离 worktree `/workspace/starport-v316`。保持草稿PR；不合并main、不触发Pages、不修改部署配置/Firebase/正式玩家存档。

## 真实云环境

本次用户附带的托管 Codex 云环境启动并返回ready，状态 connected/running；环境标识 `ccarenv_f75502f2245881918632697ec53c5372`。复用现有预置仓库，没有新建、保存或发布环境配置。原checkout保持 `work/5084568`，开发/测试在新worktree。所有下述执行均在该云实例，不使用本地或Actions结果替代。

默认Node24.19.0；仓库外 `npm install --prefix /workspace/scratch/starport-tools --no-audit --no-fund node@22 playwright@1.55.0` 退出0；实际Node22.23.4、PW1.55.0、系统Chromium151.0.7922.173、Noto CJK字体。Browser技能已读，但无可调用控制工具，依照本任务明确的Playwright验收授权使用真实Chromium。Linux自动化不等于真实iPhone/Safari。未使用真实玩家存档。

## 命令与原始基线

下文node命令均设置：

```sh
PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright
CODEX_CHROMIUM_PATH=/usr/bin/chromium
node scripts/check.cjs
```

日志位置 `/workspace/scratch/starport-audit/`，每次运行保留独立文件，`run-check` 记录命令、检出SHA及退出码。未准备时默认 `node scripts/check.cjs` 退出1（缺CODEX_PLAYWRIGHT_PATH，0项执行）；准备后原始main完整基线退出0：9语法、15脚本、84项v3行为、64条v3浏览器流程，0失败/跳过。旧版联动另有69项显式断言和3类浏览器脚本，按原日志分别记录，不能把脚本数当断言数。

“v3行为”指命名规则测试组，组内多次assert不冒充独立流程；“v3浏览器”每条都用独立context，检查身份、内容、资源失败、console和pageerror。完整入口还执行v2原测试与平衡模拟。

## v3.12

`node tests/v3-gameplay.test.js` 退出0：86行为检查。`node scripts/check.cjs` 退出0：9语法、15/15脚本、86行为检查、65条v3完整浏览器流程，失败/跳过0；日志v312-rules.log、v312-full.log。新增桌面/375手机自动购买期间保留真实按钮节点、输入草稿与焦点并真实点击，原首屏三控件、所有旧阅读和导入流程通过。

## v3.13

`node tests/v3-expansion.test.js` 退出0：15行为组覆盖全部12事件/25种选择、耗时、样本支出、上限、流水号重复、快照损坏、全部事件在途恢复与八小时离线、自动化不代选和旧档；`node tests/v3-gameplay.test.js` 退出0：原86组保留。完整 `node scripts/check.cjs` 退出0：9语法、16/16脚本、101项v3行为组（86+15）、77条v3浏览器流程，失败/跳过0。12条新增真实浏览器逐一点击事件、推进倒计时并刷新核对单一记录；日志v313-{rules,old-rules,full}.log。
