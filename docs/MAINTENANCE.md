# 《星港拾荒者》新电脑维护交接说明

> 当前版本：v1.7.0「资源循环」
> 更新日期：2026-08-21
> 技术栈：纯 HTML、CSS、JavaScript；GitHub Pages + Firebase

## 项目地址

- GitHub：https://github.com/lv5accelerator-xy/my-html-game
- 在线游戏：https://lv5accelerator-xy.github.io/my-html-game/
- Firebase 项目：`stellar-outpost-idle`
- 默认分支：`main`

## 新电脑首次接手

1. 安装 Git，并登录拥有仓库权限的 GitHub 账号。
2. 克隆仓库：

   ```bash
   git clone https://github.com/lv5accelerator-xy/my-html-game.git
   cd my-html-game
   ```

3. 开发前先同步：

   ```bash
   git pull --ff-only origin main
   ```

4. 本地测试建议使用 HTTP 服务：

   ```bash
   python -m http.server 8000
   ```

   然后打开 `http://localhost:8000/`。

5. 使用 Codex 继续维护时，让它先阅读本文件、`../README.md`、`COMMUNICATIONS-GUIDE.txt`、`FIREBASE-SETUP.txt` 和 `../patch-notes/` 中的最新 Patch Notes。

## 当前产品方向

v1.7.0 延续 v0.24.0 开始的复杂度收束，以现有资源互转减少后期库存堆积：

- 默认使用“专注导航”，只显示核心、紧急和限时入口。
- 指挥台用“当前航程”汇总一项主目标和至多两项可选目标，不要求玩家记住全部系统。
- 七日值守补给只奖励已有资源，不引入新货币。
- 完整模式保留全部已解锁入口，任何旧功能和进度都未删除。
- 八章新手航路负责渐进解锁和单目标引导；33 项图鉴负责把已有探索内容集中归档。
- 每日机制首领接入战斗页，共同航标接入排行榜页，两者均不增加一级导航或新货币。
- 后续版本优先优化已有系统之间的联系、反馈速度和重复操作，不继续横向堆叠一级页面。
- v0.26.0 用归航简报和每日三选一值守目标建立清晰回流闭环。
- v0.27.0 用三种有收益也有代价的跃迁学说改变每轮玩法，不制造永久倍率层。
- v0.28.0 用七种每周轮换异象复用舰队、作业、战斗、远征和伴星内容，并以收藏档案承接长期目标。
- v0.29.0 为航程补充预计时间、奖励预览和当日稍后提醒，紧急袭击仍保持最高可见优先级。
- v0.30.0 在星港页加入三套互斥蓝图，以现有作业组件承担切换成本，并提供真实数值预览。
- v0.31.0 为现有敌人增加周词条，并在战斗页加入消耗现有维护件与材料的边境回响。
- v1.0.0 增加手动备份恢复、键盘跳转、统一焦点样式和正式发布检查，不再横向增加玩法层。
- v1.0.1 将星海图鉴改为永久发现归档，并修复超越重置与伴星观测的旧存档兼容。
- v1.1.0 把常用操作收束到当前行动、三项目标追踪、批量领取、上次作业与手机底栏，并补充图鉴和超越的下一步预览。
- v1.2.0 将补给、可选航程与每日路线折叠为“其他安排”，取消强制命名，并把教学缩为三步。
- v1.3.0 增加三套跃迁重建方案，按原价与正常条件每秒自动恢复一项设施或研究。
- v1.4.0 为八只伴星增加一次观测后续，奖励只使用现有资源且不形成倍率层。
- v1.5.0 在远征页加入三条四阶段边境长航，以阶段航报和现有资源奖励承接中长期目标。
- v1.6.0 将当前三项目标放回指挥台首屏，并新增航站总览贴图、推荐理由、预计用时和直达入口。
- v1.7.0 在航站作业台加入资源再生炉，用四套有限批量配方回收建材、组件、补给和残片。

## 主要文件

| 文件 | 用途 |
| --- | --- |
| `index.html` | 页面结构、弹窗、导航和各功能面板 |
| `styles.css` | 全部视觉效果、响应式和手机适配 |
| `game.js` | 状态、数值、玩法、存档、渲染和事件 |
| `game-math.js` | 安全数值、软上限、成本与格式化 |
| `cloud-save.js` | Google 登录、云存档、排行榜、公告和反馈 |
| `firebase-config.js` | Firebase Web 配置 |
| `firestore.rules` | 云存档、排行榜、公告和反馈权限 |
| `docs/` | Firebase、公告反馈和换机维护文档 |
| `patch-notes/` | 当前累计版本更新记录 |
| `tests/` | 数值、浏览器与手机性能回归测试 |
| `历史版本/` | 每个正式版本的独立 ZIP |

## 存档与版本

- 浏览器主存档键：`stellarOutpostIdleSave_v1`。
- 当前 `SAVE_VERSION = 28`。
- v0.25.0 新增 `journey`、`atlas`、`bossTrial` 与 `communityBeacon`，分别保存章节领奖、图鉴领奖/筛选、每日首领状态和合作目标领奖。
- v0.26.0-v0.31.0 新增归航、学说、异象、当日暂缓航程、星港蓝图与 `borderEcho` 每周挑战/收藏状态。
- v1.0.1 为 `atlas` 新增 `discoveredIds`，所有已发现条目跨超越保留；旧伴星观测按事件编号补回 `companionId`。
- v1.1.0 为 `guidance` 新增最多三项 `pinnedGoals`，为 `operations` 新增 `lastJobId`；旧存档会自动补为空值。
- v1.2.0 不改变存档结构，仍使用 `SAVE_VERSION = 24`。
- v1.3.0 新增 `rebuild`，保存三套有限目标、当前方案、暂停状态和执行报告；旧档自动补为空方案。
- v1.4.0 为 `endgame` 新增 `companionEchoes`，保存最多八项回声选择；载入时验证对应观测和选择白名单。
- v1.5.0 新增 `longVoyage`，保存当前路线、阶段基线、三项收藏和累计完成次数。
- v1.7.0 新增 `resourceCycle`，只保存累计再生轮数与最近处理报告。
- 云存档上传完整 `snapshot`，Firestore 规则只校验稳定信封，因此上述状态不需要改变云存档规则。
- 共同航标通过现有排行榜字段在客户端汇总，不向 `leaderboards/{uid}` 增加字段，本版本也无需更新排行榜规则。
- 修改存档结构时递增 `SAVE_VERSION`，并在 `sanitizeState()` 中补齐和限制新字段。
- 不要直接删除或重命名旧状态字段；先兼容读取至少一个正式版本周期。

## v1.7.0 关键入口

- `RESOURCE_RECLAIM_RECIPES` / `reclaimResources()`：四套互转配方、十轮批量上限、资源扣除与现有奖励。
- `getResourceReclaimCapacity()` / `renderOperations()`：库存上限、按钮可用状态和偏多库存提醒。
- `assets/resource-reclaimer.webp` / `.resource-cycle`：资源再生炉主题贴图与响应式布局。

- `getFocusRoutes()` / `renderFocusCenter()`：首屏三项目标、推荐理由、预计用时、奖励与直达操作。
- `assets/station-overview.webp` / `.station-overview-visual`：航站总览主视觉与手机裁切规则。

- `LONG_VOYAGES` / `getLongVoyageMetric()`：三条四阶段路线及其已有系统指标。
- `startLongVoyage()` / `claimLongVoyageStage()` / `renderLongVoyage()`：启航、阶段航报、奖励与档案。

- `COMPANION_ECHOES` / `getCompanionEchoProgress()`：八段后续及其既有系统进度条件。
- `resolveCompanionEcho()` / `renderCompanionEchoes()`：一次性奖励、永久日志和观测站内呈现。

- `freshRebuildState()` / `sanitizeRebuildState()`：三槽方案的默认结构、白名单和体积限制。
- `captureRebuildPlan()` / `processRebuild()` / `renderRebuild()`：记录、按原价逐项执行和界面反馈。

- `JOURNEY_CHAPTERS` / `renderJourney()`：八章目标、渐进解锁与章节奖励。
- `getAtlasEntries()` / `archiveAtlasDiscoveries()` / `renderAtlas()`：33 项现有玩法记录、永久发现归档与四段里程碑。
- `BOSS_TRIALS` / `chooseBossTrialTactic()`：每日三段战场信号和反制结算。
- `getPersonalBeaconScore()` / `renderCommunityBeacon()`：个人贡献、全服进度与领奖门槛。
- `cloud-save.js` 中 `loadCommunityBeacon()`：读取现有排行榜前 50 条活跃记录并发送全服进度事件。
- `getFocusRoutes()` 与 `isPrimaryPageUnlocked()`：让新手航路接管主线建议，同时保留旧档解锁兼容。
- `renderReturnProtocol()` / `recordReturnProtocolProgress()`：归航简报与每日值守。
- `JUMP_DOCTRINES` / `renderDoctrine()`：跃迁学说、当前航线效果和选择档案。
- `DEEP_SPACE_ANOMALIES` / `renderAnomalies()`：每周候选、风险收益、进度、领奖与纯收藏档案。
- `getFocusRoutes()` / `snoozeFocusRoute()`：当前航程排序、奖励/用时摘要和当日稍后提醒。
- `STARPORT_BLUEPRINTS` / `getStarportBlueprintPreview()` / `switchStarportBlueprint()`：蓝图定义、实际数值预览和组件切换成本。
- `BORDER_ECHO_TRAITS` / `ensureBorderEchoWeek()` / `challengeBorderEcho()`：周词条、首领轮换、整备与三战术结算。
- `getLocalBackupSummary()` / `requestRestoreLatestBackup()`：三份本地轮换备份的状态展示与安全恢复。
- `renderTrackedGoals()` / `toggleTrackedGoal()`：跨页面三项目标追踪与旧目标自动清理。
- `renderStatBreakdown()`：产量、战力和软上限来源说明。
- `updateMobileQuickNavigation()`：手机底部四个常用页面与动态当前行动。
- `RELEASE-CHECKLIST.md`：正式版发布前的版本、存档、移动端、云端、归档和线上检查。

## Firebase 管理

- Authentication：Google 登录。
- Firestore `saves/{uid}`：云存档。
- Firestore `leaderboards/{uid}`：长期排行榜。
- Firestore `announcements/{id}`：开发者公告。
- Firestore `feedback/{id}`：玩家反馈。
- 公告与反馈的字段、创建和处理步骤见 `COMMUNICATIONS-GUIDE.txt`。
- 如修改排行榜字段，必须同步更新 `cloud-save.js` 与 `firestore.rules`，并先发布安全规则再发布网页。

## 发布新版本

1. 先执行 `git pull --ff-only origin main`，确认没有覆盖其他电脑的更新。
2. 修改 `GAME_VERSION`、`PATCH_NOTES_VERSION`；存档结构改变时修改 `SAVE_VERSION`。
3. 更新 `index.html`、脚本、样式、音频的缓存查询版本。
4. 更新游戏内 Patch Notes、累计 Patch Notes TXT、README 与本交接文档。
5. 运行全部测试。
6. 生成 `历史版本/星港拾荒者-v版本号.zip`，并更新 `历史版本/README.md`。
7. 提交并推送 `main`；GitHub Actions 会自动发布 Pages。
8. 打开在线游戏，确认页脚版本、新页面、手机布局和云存档状态。

## 测试命令

```bash
node --check game.js
node --check cloud-save.js
node tests/numeric-balance.test.js
node tests/browser-smoke.test.js
node tests/mobile-performance.test.js
```

浏览器测试需要 Playwright；环境变量配置方法见 `../README.md`。

v1.1.0 重点检查：

- 旧存档载入后补齐 `guidance.pinnedGoals` 与 `operations.lastJobId`，版本升级到 24。
- 当前行动始终可见；目标追踪最多三项，完成或失效后自动移除。
- 图鉴显示下一条缺失记录，按钮能前往战斗、远征或图鉴区域。
- 超越页同时展示永久保留、本轮重置与预计恢复时间。
- 委托一键领取、继续上次作业和购买模式记忆均可正常保存。
- 390px 手机宽度下底部快捷导航固定可见且不产生横向滚动。

- 旧 v15 及更早存档载入后自动升级到 v16，原进度与旧系统入口不丢失。
- 八章航路一次只显示当前章节，完成后可领取并进入下一章。
- 图鉴共 33 项，筛选、发现状态和 5/12/20/33 里程碑均正常。
- 超越前已发现的敌人条目在胜场重置后仍保留；第 22 版八伴星观测存档自动恢复伴星与敌人图鉴。
- 每日首领按 UTC 日期轮换，三段全部正确时完整度保持 100% 并记录完美破解。
- 每日首领最多尝试三次，奖励只结算一次并同步到图鉴和首领总纪录。
- 共同航标离线显示本地预览，登录读取失败时不影响排行榜与本地存档。
- 共同航标奖励同时检查全服阶段与个人贡献，已领取状态不可重复领取。
- 手机宽度下无页面横向溢出。
- 旧 v16-v18 存档依次补齐归航、学说和异象状态并升级到 v19。
- 归航简报正确显示离线星尘、作业和袭击摘要；三条值守路线只能日选一条。
- 深空跃迁后必须三选一学说，下一次跃迁可重选，奇点坍缩清除当前效果但保留历史次数。
- 异象每周提供三项已解锁候选，只能选一项；领取后临时效果关闭并更新收藏档案。
- 当前航程始终包含一项不可暂缓的主目标，并最多显示两项不重复的可选目标。
- 可选目标暂缓后当日隐藏、次日恢复；紧急袭击不可暂缓。
- 三套蓝图一次只激活一套，切换准确扣除对应作业组件，当前方案不重复付费。
- 工业、堡垒与远航效果分别进入生产、攻防、战利品及远征成功率的同一套正式计算。
- 普通清剿与行星目标正确显示周词条，词条的战力和奖励调整保持小幅同步。
- 边境回响每周重置尝试/整备但保留收藏，正确战术和所需战力必须同时满足。
- 整备、入场与胜利分别准确扣除或发放现有资源，不新增货币或永久倍率。
- 设置菜单能显示本地轮换备份数量；恢复最近备份前保留当前记录，异常存储环境给出明确失败提示。
- 键盘可通过“跳到游戏内容”进入指挥台，所有交互控件具有可见焦点。

## 后续优化原则

- 一个新需求优先接入现有委托、作业、远征或收藏，不优先新增货币和一级页面。
- 每次只突出一个当前目标，并给出直接操作入口。
- 奖励优先使用资源回收、外观、收藏和消耗品，避免永久倍率继续膨胀。
- 保留挂机的宽容度：允许离线、漏签缓冲、可追赶，避免用惩罚强迫上线。
- 先观察反馈与数据，再决定是否制作新玩法。

## 紧急恢复

- 线上故障时，从 `历史版本/` 取最近稳定 ZIP 对照或恢复。
- 不使用 `git reset --hard` 覆盖未知修改。
- 云存档异常时先让玩家导出本地 JSON，再检查 Authentication、Firestore 规则和浏览器控制台错误。
- GitHub Pages 未刷新时查看仓库 Actions 中的 `Deploy clean GitHub Pages site` 工作流。
