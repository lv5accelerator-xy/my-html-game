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

## v3.14

原86行为与新增18扩展行为均退出0。首轮完整检查退出1（15/16）：出航快捷切换复用`loadout-apply`标识，使旧严格定位器匹配9个按钮。实际修复为独立`loadout-quick`标识与处理器，原装备方案断言保留。专项完整浏览器随后暴露另一项旧断言：新航程时长恰好让信标在刷新前可见，存储原有规则在加载时清除旧信标，整档相等预期缺少该处理；现明确期望仅expiresAt归零，仍逐字段核对全部其他状态与结局，未增加等待或删除断言。终章三方向专项3/3退出0。

修复后完整`node scripts/check.cjs`退出0：9语法、16/16脚本、104项v3行为（86+18）、78条完整浏览器流程，失败/跳过0。所有十种双槽组合覆盖实际派遣/途中换装/恢复/结算，并比较指定任务取舍。原始失败保留v314-full.log、v314-browser-fixed.log；修复专项v314-finale-fixed.log，完整累计v314-full-fixed.log。

## v3.15

`node tests/v3-expansion.test.js`退出0：19组。完整`node scripts/check.cjs`退出0：9语法、16/16脚本、105项v3行为（86+19）、79条v3浏览器流程，失败/跳过0；日志v315-rules.log、v315-full.log。新增真实SVG区域键盘Enter、状态与实际增益、首支来船及三队、375/1280无溢出、减少动态效果和刷新显示检查；所有原港口/居民委托断言保留。

## v3.16 最终结果

`node tests/v3-expansion.test.js` 最终32组通过；原`node tests/v3-gameplay.test.js`86组保留；`node tests/v3-compatibility.test.js`22份实际v3.11规范快照逐字段相同、迁移幂等。`node tests/v3-balance.test.js`保留原三路线/前四跃迁/六章及81份实际通关分支；三个结局各继续42次实际资源交付与15期工程，用时5385游戏秒（约89.75分钟），没有向经营模型注入新资源、设施或样本。

最终无过滤`node scripts/check.cjs`退出0：**9语法、17/17脚本、118项v3规则组（86+32）、22份旧档快照、83条v3完整浏览器流程、0失败/0跳过**。旧版5个浏览器脚本亦通过。完整入口26个子命令均退出0。日志[最终完整入口](validation/v312-v316/v316-release-full.txt)；[全部运行与退出码](validation/v312-v316/runs.json)；[源文件校验清单](validation/v312-v316/source-sha256.json)。

最终入口额外使用仓库外`NODE_OPTIONS=--require=/workspace/scratch/starport-audit/assert-count.cjs`仅统计实际assert调用，不改写结果、回调或计时；17个脚本合计**175,551次assert调用成功、0失败**。此数含分支矩阵和辅助夹具，不能称为175,551个独立玩法或浏览器场景。统计器原文另存[assert-count.cjs.txt](validation/v312-v316/assert-count.cjs.txt)。实际调用与各脚本计数在原日志中可核对。

### 真实交互与布局

- 1280×900桌面、375×900手机：新手首轮仅真实扫描/建造/选择/研究/探索/领奖/确认跃迁，未注入资源；不足首艘费用时目标定位真实扫描按钮，攒够后定位建造。
- 三种结局各真实接单四次，分别以新探索和生产筹备准备，切换方向不重算旧条款，手动交付、建设、SVG变化、导出/导入、刷新和跃迁保留均通过。
- 全部12类事件逐一实际点击、等待处理、刷新记录；全部25选项在引擎验证实际资源/样本/时间、恢复和单次结算。各事件另有门槛、冷却与损坏在途条款测试，损坏额外事件不丢普通收益。
- 所有v3流程均检查页面身份、非空内容、资源请求、console和pageerror；相关桌面/手机页面无横向溢出。按钮持续连接、输入草稿、焦点、长文阅读、dialog原生close、减弱动态效果保留原断言。截图在云实例`/workspace/scratch/starport-audit/screenshots/`，不进入运行产物。

### 原始失败与修复记录

保留全部原日志，不覆盖失败或把专项当全量：

1. 未准备基线退出1，未执行测试：缺CODEX_PLAYWRIGHT_PATH；仓库外安装Node22/PW1.55后原main完整基线退出0。
2. v3.14首次全量15/16：新增快捷切换与旧方案标识冲突，已用独立动作标识修复。下一次浏览器专项遇到旧整档比较遗漏加载时清除信标的既有规则，已明确仅该字段归零，其他字段仍全部比较；最终全量通过。
3. v3.16首次扩展规则在第23组发现长期工程尚未接入星港模型，已补齐模型和等级构件，32组最终通过。
4. v3.16首轮全量16/17：新边界测试误以为合法最大舰队一定达到全局数值上限，实际值约9.59e58。修正为核对合法舰队实际预览，并另用真正饱和的有限输入核对1e100封顶；没有删除边界断言。后续两次完整入口均通过。
5. 经营最初模型中21次交付/全部建设仅615秒，验收判断偏快；增加可离线完成的实际筹备与4/14/35次分期门槛，最终实际资源模型42次交付/15期5385秒。新增筹备、阶段门槛、在场角色和旧ID保留测试。
6. 末次回归补齐资金不足时的目标分支与12事件的全部负向矩阵；专项通过后再次运行无过滤完整入口，通过118组/83流程。

### 命令与环境限制

全部测试命令/退出码的原文见上述runs.json及同目录txt。主要命令为`node scripts/check.cjs`、`node tests/v3-gameplay.test.js`、`node tests/v3-expansion.test.js`、`node tests/v3-compatibility.test.js`、`node tests/v3-balance.test.js`、`node tests/v3-browser.test.js`。修复专项曾分别设置`V3_TEST_FILTER='finale dialogue'`、`'v3.16'`或`'new save: readable goal'`，仅运行3/4/1条相关路径；所有最终全量均未设置过滤。额外默认Node24的两个语法命令退出0，不替代Node22完整验收。

真实云WebKit安装命令`playwright install webkit`退出1：官方CDN及Microsoft镜像均返回`403 Domain forbidden`，见[原始日志](validation/v312-v316/webkit-install.txt)。没有改网络策略、关闭WebKit工作流或冒称云WebKit通过。既有PR CI仍使用Node22/PW1.55并独立运行WebKit；它的实际状态以最终PR检查为准。真实iPhone/Safari、真实玩家旧档和公开站点未测试。本次没有发布，公开站点仍是原版本。

最终测试在提交前工作树运行，日志中的SHA是当时父提交，不冒充最终版本的已检出SHA；runtime/tests/scripts共28份文件以SHA256清单映射到最终提交，提交后再次校验。原work工作区、根v2运行文件、生产Firebase和部署配置未改。最后按授权推送开发分支并创建草稿PR；最终准确SHA、PR链接及检查状态见交付消息和GitHub分支记录。
