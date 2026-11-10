# v3.21～v3.24 连续开发与发布验收

2026-11-10用户明确授权“直接施工至3.24并上线”，本轮连续完成各版本、验证、提交，最终检查后合并与GitHub Pages发布；不改生产Firebase、真实玩家档或部署/历史归档规则。

起始main `a7bfea836a2285b22f1a1f1767defbdf832e62a2`（PR #18已发布3.20.0-preview.1）。开放PR #8/#12/#19；#19为已验证维护整理，head `eb1999b287281a75633677ed9541b73bb900e1e6`，未单独合并。本分支从该head起步包含维护记录，最终PR明确包含并替代#19，不复制#8/#12旧代码。隔离worktree `/workspace/starport-v324`，分支`codex/v321-v324-gameplay-expansion`；原`/workspace/my-html-game`仍干净work/5084568。

本次复用实际托管Codex云 `ccarenv_b64_Y2NhcmVudl9mNzU1MDJmMjI0NTg4MTkxODYzMjY5N2VjNTNjNTM3Mg`，当前running/connected、observations_current、network enforced，仅package_managers预设、自定义域名空。没有创建/发布新环境配置。Node22.23.4、Playwright1.55.0、系统Chromium151.0.7922.173；Browser技能已读，无可调用浏览器控制工具，按用户此前明确的Playwright授权使用隔离context。云公网/云WebKit的历史403与本轮独立Actions结果分别记录，真实iPhone不冒充通过。

读取README、AGENTS、CODEX_HANDOFF、docs/README、v3-playable、v3-main-story和已交付v321-v324计划。用户本轮合并/发布授权覆盖AGENTS默认开发任务不得合并的限制，其余隔离/原生架构/存档边界不变。

## 命令与基线

统一云命令：

```sh
PATH=/workspace/scratch/starport-tools/node_modules/node/bin:$PATH \
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-tools/node_modules/playwright \
CODEX_CHROMIUM_PATH=/usr/bin/chromium node scripts/check.cjs
```

本轮未改代码前完整基线退出0：9语法、17脚本、137命名v3规则组（86+51）、52规范旧档、94完整浏览器流程，失败/跳过0。原文baseline.txt。后续由仓库外run.py记录实际参数、Node/PW、父HEAD、执行前源文件SHA256、退出码和用时；父HEAD不冒充被测未提交源码的提交SHA。单独专项过滤显式标记，不代替无过滤完整入口。

用原3.20引擎从正常赚取的三结局模型档实际付费完成九调查节点及三条四段远航，捕获18份规范快照（在途/待领、永久档案、冻结港务合同），源码SHA256在tests/fixtures/v320-saves.json。与原v3.11二十二份、v3.16三十份合计70份，逐字段保留；不是玩家真实档。

## v3.21

实现四段重访安排的显式保存、费用/时长/收益/保守缺口预览、两套已有编成选择、开始并派遣、领取并接续与末段入库、暂停/恢复/转手动。普通同编成四段从10次确认降到5次，首航仍手动。每段实际扣费与结算复用原规则并原子检查，资源不足/编成等级改变/待决定发现均停止接续；已支付航段不取消。离线只完成当前段，不自动领或派下一段。首页就绪动作直接处理普通报告、调查、需求与远航。

schema32新增可选continuation.plans/sequence，原expeditions与全部旧字段不改；恢复校验4段合法方法、双槽等级、航次token与已完成阶段的一致性。旧方案/升级/首航档案/需求/结局保留。

规则专项16组退出0；三路线×三结局组合的UI专项3条退出0（该3条各采用一个不同正式结局），1280×900/375×900、真实发现选择、编成切换、输入焦点/DOM、途中刷新/导出导入和首页交接通过。70旧档逐字段通过。

保留两次早期专项失败：规则测试的规范旧档含未决定探针，计划正确拒绝出发，测试先实际处理该选择并新增“不代选”断言；浏览器测试误点已选中的禁用导航，改为检查aria-current后只对真实换页点击。没有强制点击或跳过功能断言。其后规则、三浏览器专项重新通过。冻结玩法后无过滤完整`node scripts/check.cjs`退出0，用时387.75秒：9语法、18/18脚本、153命名规则组（86+51+16）、70规范旧档、97完整浏览器流程，失败/跳过0。所有27个子命令退出0。
