# v3.20 发布与公开站点验收

更新时间：2026-11-10。版本名保持 `3.20.0-preview.1`，不因正式发布改号。此记录随实际执行更新；未完成项目不算通过。

## 源码与合并

- 规范仓库：`lv5accelerator-xy/my-html-game`。
- 起始 main：`7034b5c7f75f52eb65acce58c00c373d8e312bfd`。
- [PR #18](https://github.com/lv5accelerator-xy/my-html-game/pull/18) head 与预期完全相同：`d2fc83cda98d0162ba585d9027d724ceae8458e1`。四个开发里程碑 a3f2abe / 25d844c / 8fa3c97 / d2fc83c 保留。
- 已先解除 draft，再用 `merge_method=merge` 和 `expected_head_sha=d2fc83cda98d0162ba585d9027d724ceae8458e1` 合并。实际 merge/main SHA：`a7bfea836a2285b22f1a1f1767defbdf832e62a2`，两父提交为起始 main 和预期 head。
- 合并前 `mergeable=true`，main 是 head 的祖先；reviews/未解决review threads为空。main 元数据 `protected=false`、required checks为空；全部实际 check-run 为成功的 test。详细保护端点403无管理权限，未改权限。
- 根v2运行文件、Firebase配置/云代码/规则及原两个工作流逐字节未改。合并结果运行文件与开发head相同。未触碰真实玩家存档。

## 正式部署结果

[Pages 42739585599](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42739585599) 由 push/main `a7bfea836a2285b22f1a1f1767defbdf832e62a2` 触发，最终completed/success。四项任务均成功：archive129577073542、test129577073920、build129585799268、deploy129585958961。test再次完整执行9语法/17脚本/137规则组/52旧档/94 Chromium流程，独立WebKit94流程，均退出0。

build checkout精确a7bfea8，上传artifact13730060260；deploy payload的`pages_build_version`为完整a7bfea836a2285b22f1a1f1767defbdf832e62a2。2026-11-10T02:24:30Z明确`Reported success!`，环境URL为正式根入口。原始日志摘录见[测试](validation/v320-release/pages-test-excerpt.txt)、[构建](validation/v320-release/pages-build-excerpt.txt)、[部署](validation/v320-release/pages-deploy-excerpt.txt)，完整日志保留在上述Actions运行。

archive日志确认为已有归档而正常退出：`Archive already present or no release version found.`。原规则仍读取根v2元数据，缺包才创建非嵌套ZIP并推main；本次没有归档机器人提交。build仍只发布运行白名单与assets/v3，不公开docs/tests/历史ZIP；本次不修改此工作流。

公开入口：旧版 <https://lv5accelerator-xy.github.io/my-html-game/>；新版 <https://lv5accelerator-xy.github.io/my-html-game/v3/>。部署成功与下面的公开交互验收分别记录。

## 实际环境与完整回归

本次托管Codex云实例 `ccarenv_b64_Y2NhcmVudl9mNzU1MDJmMjI0NTg4MTkxODYzMjY5N2VjNTNjNTM3Mg` 实际等待至ready后使用，running/connected、当前网络策略enforced；未创建或发布环境配置。原工作区`/workspace/my-html-game`仍为干净work/5084568。隔离worktree `/workspace/starport-v320-release` / `codex/v320-release-audit` 起于精确开发head，随后快进到实际main。默认Node24.19.0；实际测试使用仓库外Node22.23.4、Playwright1.55.0、系统Chromium151.0.7922.173。

```sh
PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH \
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright \
CODEX_CHROMIUM_PATH=/usr/bin/chromium \
node scripts/check.cjs
```

本次发布前再次无过滤执行，**退出0：9语法、17/17测试脚本、137命名规则组（86+51）、52规范旧档（v3.11二十二份＋v3.16三十份）、94条完整v3浏览器流程，0失败/0跳过**。统一入口逐项记录26个子命令且均退出0，原文 [preflight-full.txt](validation/v320-release/preflight-full.txt)。不把内部assert次数与命名规则组或独立玩法数混算。日志文件创建01:51:07Z、末写01:57:23Z，未另外测量完整进程耗时。

本次各环境的实际命令、退出码、调试失败与取消/未执行项汇总在[命令账本](validation/v320-release/commands.md)及[结构化来源记录](validation/v320-release/provenance.json)。

[开发head的CI 42699912273](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42699912273) 已回读日志：Node22 / Playwright1.55.0，Chromium完整入口9/17/137/52/94退出0；独立Linux WebKit94条完整流程退出0，失败/跳过均0。浏览器安装版本Chromium140.0.7339.16、WebKit26.0/PW build2203。此结果是开发head的GitHub Actions验证，不冒充本次云WebKit或公开站点结果。

## 公开验收方式与当前边界

云直连公开站点的curl返回退出56、CONNECT403，环境未允许该域名；已请求通过环境设置补充域名，不修改代理或绕过本机策略。云WebKit本次启动探针退出1，缺少`webkit-2203/pw_run.sh`；开发期官方CDN下载403原始证据仍在旧验收目录。这两项是环境阻塞，不作为游戏断言通过。

为执行用户要求的公开验证，维护分支曾运行独立只读Actions验收，只赋予contents/actions读取权限，等待上述准确Pages运行成功、核对source SHA，再直接请求公开URL。完成后将一次性定义归档至[public-acceptance-workflow.yml](validation/v320-release/public-acceptance-workflow.yml)，保留实际运行来源；最终维护分支的原两个工作流与main逐字节相同。可重跑脚本和全部断言仍保留，每浏览器运行：

```sh
CODEX_PLAYWRIGHT_PATH="$PWD/node_modules/playwright" \
PUBLIC_GAME_URL=https://lv5accelerator-xy.github.io/my-html-game/ \
V3_BROWSER_ENGINE=chromium node scripts/verify-public-v320.cjs

CODEX_PLAYWRIGHT_PATH="$PWD/node_modules/playwright" \
V3_TEST_URL=https://lv5accelerator-xy.github.io/my-html-game/v3/ \
V3_BROWSER_ENGINE=chromium node tests/v3-browser.test.js
# WebKit独立执行同样两条命令，V3_BROWSER_ENGINE=webkit。
```

第一条比对14份线上运行文件的HTTP200及SHA256，四个全新隔离存档流程（v2/v3×1280×900/375×900）、三种结局v3.16实际UI接续与刷新、公开引擎三十份v3.16逐字段兼容，检查真实点击、焦点、DOM节点、横向溢出和错误。加载性能仅在真实时钟的新档流程中测量；旧档用受控时钟避免凭空离线收入，明确不记录其加载耗时。

第二条不设置过滤器，直接把现有全部94流程指向公开v3 URL。首轮扫描→无人机→航线→探索→报告/事件用全新档；后期复杂系统使用原引擎正常赚取的规范测试副本，真实UI操作图谱、三策略需求/调度、两套舰装比较、三路线四阶段首航/重复、十三纪念相关判定、永久首航、刷新与导出导入；不声称所有后期流程都从同一空档手工通关。每流程检查页面身份/版本/非空内容、资产响应、console/pageerror；保留八小时边界、焦点和DOM连续性断言。所有context临时隔离；仅测试响应清空Firebase配置且拦跨origin请求，不执行真实登录、云端写入或玩家存储清理。

首次[公开运行42741301733](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42741301733)的WebKit在根v2引导按钮被公告覆盖时退出1，v3完整流程因前置失败未运行；[原始失败](validation/v320-release/public-webkit-first-failure.txt)保留。选择“任意可见弹层”会先选到z-index250的引导，公告z-index295仍在上方；仅验收脚本改为更新说明→公告→引导，均等待真实可见后实际点击并断言关闭。没有修改根v2运行文件、强制点击或增加固定等待。修正后的最终结果见下节。

本地只验证新脚本可运行：`PUBLIC_GAME_URL=http://127.0.0.1:8763/ ... node scripts/verify-public-v320.cjs`退出0，14目标哈希/7流程/30唯一旧档。此前四次开发脚本失败亦保留：前三次是v2延迟启动弹层，第四次是Playwright受控时钟无navigation timing，改为仅真实新档上下文测性能。[日志目录](validation/v320-release/)中的本地结果不能算线上通过。

第二轮[公开运行42743083976](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42743083976)的WebKit已真实完成前六流程，第七个旧档刷新取消了动态插入、尚未下载完成的场景背景，退出1；[原始失败](validation/v320-release/public-webkit-second-failure.txt)保留。补强仅在验收脚本：初次进入及每次主动刷新前后，等待该可见图片的真实response，断言HTTP200且`response.finished()`无错误；失败请求断言继续要求空数组，未忽略该图片或取消错误。本地补强后七流程再次退出0，随后重新执行完整公开双引擎。

第一轮Chromium已经完成公开14哈希/7额外流程/30份v3.16副本及全部94条v3流程，退出0，[实际结果](validation/v320-release/public-chromium-first-result.json)和[日志](validation/v320-release/public-chromium-first-excerpt.txt)独立保留。Actions产物包含桌面/手机截图；云环境下载产物返回403，未人工查看线上截图。本地手机截图已查看，两类记录不混用。原PR并发规则会在修正提交后取消较旧的维护分支CI，这些取消不当作通过；最终head必须另查。

## 最终公开验收：已通过

[运行42744103954](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42744103954) completed/success，验收源`eb5287f23e92936c794043dc234e09950c775b99`，公开运行参考`a7bfea836a2285b22f1a1f1767defbdf832e62a2`，Node22.23.4/PW1.55.0。两个矩阵任务完整成功，均无过滤、重试或跳过：

| 引擎与实际命令 | 退出码 | 实际通过 |
| --- | --- | --- |
| Chromium `node scripts/verify-public-v320.cjs` | 0 | 14线上文件HTTP200/源码哈希、7 UI流程、30唯一v3.16快照 |
| Chromium `V3_TEST_URL=正式v3地址 node tests/v3-browser.test.js` | 0 | 全部94完整流程 |
| WebKit `node scripts/verify-public-v320.cjs` | 0 | 同样14哈希、7 UI流程、30唯一快照 |
| WebKit `V3_TEST_URL=正式v3地址 node tests/v3-browser.test.js` | 0 | 全部94完整流程 |

每引擎共101条浏览器流程，最终失败/跳过0。公开7流程的pageerror、console error/warning、异常HTTP响应及未预期失败请求均0；94流程逐一执行身份/内容/资产/console断言。根v2媒体流在测试主动刷新时正常终止，按原浏览器隔离规范单列：Chromium2次、WebKit4次，均是同一MP3的导航取消，不混算资源HTTP错误；背景图没有豁免。全部14份运行文件逐字节对应审核源码，schema32与独立键未变。

完整原始结果：[Chromium JSON](validation/v320-release/public-final-chromium-result.json)、[WebKit JSON](validation/v320-release/public-final-webkit-result.json)；带时间的[Chromium日志](validation/v320-release/public-final-chromium-excerpt.txt)、[WebKit日志](validation/v320-release/public-final-webkit-excerpt.txt)。18份相关源文件与被测提交对象一致的[哈希记录](validation/v320-release/public-source-hashes.json)，可核对后续文档提交没有更换实际被测代码。全新档首轮与规范赚取副本后期流程、导出导入及永久档案的使用边界如前述，不冒充一个空档手工连打六章。

同一验收源eb5287f的[维护CI42744103650](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42744103650)亦完整成功：9语法/17脚本/137规则组/52旧档/94 Chromium，独立94 WebKit，均退出0；[日志摘录](validation/v320-release/audit-tested-source-ci-excerpt.txt)。之后仅整理文档、证据和一次性工作流定义，最终维护head的检查见草稿PR #19，不将前两次取消当成通过。

### 公开网址加载实测

独立新context，真实时钟、未限速Actions环境，一次导航观察值，单位ms；不是统计均值、真机或移动网络基准。375宽为响应式浏览器视口，背景图额外验证完整下载后才主动刷新。

| 浏览器 | 入口/视口 | DOMContentLoaded | load |
| --- | --- | ---: | ---: |
| Chromium | v2 1280×900 | 678.0 | 768.1 |
| Chromium | v3 1280×900 | 111.7 | 149.9 |
| Chromium | v2 375×900 | 275.8 | 310.1 |
| Chromium | v3 375×900 | 89.5 | 103.2 |
| WebKit | v2 1280×900 | 2502 | 2502 |
| WebKit | v3 1280×900 | 230 | 395 |
| WebKit | v2 375×900 | 810 | 980 |
| WebKit | v3 375×900 | 268 | 316 |

线上截图已生成于上述运行的两份14天Actions产物；云下载403故未人工查看。两屏宽的可见控件、真实点击、焦点、DOM连续性与横向溢出均由实际浏览器断言通过。真实Safari实机未执行。

## 兼容与未执行项

v3继续schema32与`stellarOutpostIdleSave_v3`；v2的v1键和schema独立。三十份v3.16快照在原主线、三个永久结局、装备等级/双槽方案、需求合同、工程、在途/待领和收藏上逐字段相同，迁移幂等、不重发奖励。新增atlas/expeditions为空可选字段；不要求重做主线。只承诺旧档向本版本迁移，旧构建不能反向读写新字段。

真实iPhone Safari未执行；Linux自动WebKit不能替代真机。真实玩家存档、生产Firebase写入均未执行。后续只读审计与每版功能/文件/风险/测试/验收标准见[v3.21～v3.24计划](v321-v324-plan.md)，本次未施工这些新功能。
