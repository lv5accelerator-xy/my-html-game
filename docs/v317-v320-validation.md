# v3.17～v3.20 连续开发验收

## 来源与环境

2026-11-09 起始 main `7034b5c7f75f52eb65acce58c00c373d8e312bfd`。已读取 README、AGENTS、CODEX_HANDOFF、docs/README、v3-playable、v3-main-story 与 v312-v316-validation。原工作区 `/workspace/my-html-game` 为干净的旧 work 分支，未改写；`git fetch origin` 后从实际最新 main 建立 `/workspace/starport-v320` / `codex/v317-v320-gameplay-expansion`。PR #17 已合并；#8/#12 仍开放，未合并旧代码。GitHub 工具读得 main 的 Pages 工作流 [42673214026](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42673214026) 成功，GitHub Releases 列表为空。历史验收不代替本次验证。

本任务附带的 Codex 托管云环境 `ccarenv_b64_Y2NhcmVudl85NmVlOGE5ZTNjMzg4MTkxOGI4MmEzZWY5ZDE2YTBkYQ` 实际等待至 ready，状态 running/connected、network enforced，复用预置仓库。本轮没有创建、保存或发布新的环境配置。默认 Node24.19.0，仓库外安装 Node22.23.4 / Playwright1.55.0，Chromium151.0.7922.173。Browser 技能已读且工具检索没有可调用的浏览器控制 js；按用户明确授权使用 Playwright。所有游戏浏览器流程隔离 context；v3 不连接 Firebase，根 v2 与生产配置不改。

安装命令 `npm install --prefix /workspace/scratch/starport-tools --no-audit --no-fund node@22 playwright@1.55.0` 退出0。`gh auth status` 显示当前 GH_TOKEN 无效；`gh api .../releases`、`.../actions/runs` 被代理 Forbidden，改用已连接 GitHub 工具读取。`curl -I --max-time 20 https://lv5accelerator-xy.github.io/my-html-game/v3/` 退出56，CONNECT 403，因此未完成公开站点专项验证。`playwright install webkit` 退出1，官方 CDN/Microsoft 域名均 403 Domain forbidden，原始证据保留，云 WebKit 未运行。最终 Actions WebKit 与真实 iPhone 分开记录。

## 命令、数量与证据

测试统一由仓库外 run.py 记录命令、父 HEAD、环境、退出码和时长，原文在本目录 validation/v317-v320。所有 node 测试用：

```sh
PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright
CODEX_CHROMIUM_PATH=/usr/bin/chromium
node scripts/check.cjs
```

脚本数、命名规则组、浏览器完整流程和旧档份数分别统计，不将内部 assert 次数冒充玩法数。完整入口不设置 V3_TEST_FILTER；专项过滤只用于诊断/新增流程，并明确记录。日志内 HEAD 是执行时父提交；阶段 source 哈希核对实际被测源文件，不能把父提交称作已完成版本 SHA。

基线 `node scripts/check.cjs` 退出0：9语法、17/17测试脚本、119 v3规则组（86+33）、22 v3.11规范旧档、84 v3浏览器流程，失败/跳过0，用时282.90秒。另以原 main 的 `tests/v3-balance.test.js` 在内存增加捕获（不改变规则/资源），从创建新档、四次跃迁、六章、实际选择一路生成三种结局的 earned 存档，capture-main-earned 退出0。新增经营与远航经济验收将从这些档继续，不注入资源或装备。它们是确定性模型档，不是真实玩家档。

## v3.17

实现待决定发现优先、归航可办事项、实时资源缺口、目标区域键盘焦点及手机/后台动画限流；不增加存档字段。`node tests/v3-expansion.test.js`退出0，34组；`V3_TEST_FILTER=v3.17 node tests/v3-browser.test.js`退出0，1条新增专项。最终无过滤`node scripts/check.cjs`退出0：9语法、17/17脚本、120规则组（86+34）、22旧档、85完整浏览器流程，失败/跳过0。包含原新手真实扫描→建造→路线→研究→探索→报告→确认跃迁，以及三个终章的经营流程，1280×900/375×900、节点连续性、输入焦点与刷新断言均保留。手机截图已人工查看，布局无溢出。云WebKit仍因下载403未执行；Actions此阶段尚未推送。原始命令/日志和被测源文件哈希同目录。

## v3.18

三条各三节点的可交互SVG调查链、12类事件证据、三种真实调查取舍、有限档案与纪念、后续航线登记已实现。schema32新增可选atlas，原字段不改。新增规则39/39通过；三条真实浏览器专项3/3通过，途中换档/刷新、离线不代领、单次领取、手机键盘SVG和导出均验证。最初浏览器专项误插入场景包装内部，过滤器命中0条，日志保留但**不计通过验收**；移到主执行入口并增加零流程断言后3条实际运行通过，无断言删除/跳过。

用原main v3.16实际引擎从赚取资源档生成30份规范快照（结局、三方向已接需求、在途、待领），逐字段保留；加原22份v3.11，总52份规范旧档。最终无过滤`node scripts/check.cjs`退出0：9语法、17/17脚本、125规则组（86+39）、52旧档、88浏览器流程，失败/跳过0，用时343.66秒。图谱手机截图已查看。云WebKit、公开站点与iPhone仍未执行，不用此结果替代。

## v3.19

三方向的建设工作量、实际预装和替代航线，以及生产/需求/探索/工程资源调度已实现；预装资源不能重复扣抵，旧合同不补新条款。新策略规则42/42、真实浏览器新增3/3、52旧档逐字段通过。三种结局分别从原main实际赚取资源继续8次交付、5期工程、1333游戏秒；不增加资源或设施。原经济模型每结局42交付/15期仍全量保留，工程不叠永久生产倍率。

首次完整入口退出1：16/17脚本通过，浏览器在完成80条时被原单脚本300秒上限终止（ETIMEDOUT），不是断言失败；原始完整日志保留。套件由84增长至91条且包含更多真实经营交互，将仅v3-browser单脚本总执行预算改为600秒，其余脚本仍300秒，未增加等待、重试、删除/放宽断言或跳过。下一次执行会话在语法检查后中断，无退出码、不计完成，原文v319-full-fixed.txt保留。

重新无过滤运行`node scripts/check.cjs`退出0：9语法、17/17脚本、128规则组（86+42）、52旧档、91浏览器流程，失败/跳过0，用时369.25秒。手机与1280布局/焦点/DOM连续性/备份/导入导出/三个结局均通过；截图已查看。`git diff --check`退出0。云WebKit受403阻止，未运行；Actions与iPhone状态单列。
