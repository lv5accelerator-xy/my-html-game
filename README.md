# 星骸归航：STARFALL HOMECOMING

[![Deploy Pages](https://github.com/lv5accelerator-xy/starfall-homecoming/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/lv5accelerator-xy/starfall-homecoming/actions/workflows/deploy-pages.yml)

于群星废墟中拾起希望，在漫长航途中重建家园。以深空回收、舰队自动化、星港建设与多层轮回为核心的中文挂机经营游戏。原生 HTML / CSS / JavaScript，无框架、无构建步骤，浏览器本地运行。

> 本作原名《星港拾荒者》，游戏内标题仍在逐步更换为新名。

**[▶ 在线试玩（新版 v3）](https://lv5accelerator-xy.github.io/starfall-homecoming/v3/)** · [旧版 v2](https://lv5accelerator-xy.github.io/starfall-homecoming/)

| 航站 | 远航 | 居民 |
| --- | --- | --- |
| ![航站：扫描信标与下一目标](docs/validation/v329-v332/after-89698b4/home-1280.webp) | ![远航：航线与远征](docs/validation/v329-v332/after-89698b4/voyage-1280.webp) | ![居民：星港住民与关系](docs/validation/v329-v332/after-89698b4/residents-1280.webp) |

## 玩法

- **信标与舰队**：手动回收星尘，扩建十类生产设施并建立自动化产线。
- **研究与星核**：四条双分支科技树；深空跃迁后以星核获得长期强化。
- **舰队编成**：在工业、守备和远征之间配置单位、阵型、武器与战术方案。
- **战斗与星港**：清剿目标获取材料，建设六座生产或战斗附属建筑。
- **星区远征**：五段航程中选择航线、词条、舰装与临时协议，挑战机制首领。
- **轮回成长**：深空跃迁、奇点超越、伴星观测和循环星区构成多层长期目标。
- **任务与收藏**：每日/每周委托、航路章节、星海图鉴和限时活动。
- **云端功能（可选）**：连接 Google/Firebase 后可跨设备同步存档、参加排行榜、阅读公告与提交反馈；不连接也能完整离线游玩。

访问 `?expert=1`，或在设置中打开“显示全部系统”，可加载星港、星雨寄航与委托的完整交互；两个入口存档互通。

## 当前版本

<!-- CURRENT_VERSION_START -->
**v3「拾荒航线」3.32.0-preview.1**
3.29～3.32 视觉重制：七种页面构图复用真实游戏规则，探索聚合入口与旧目标定位保留；原六章、三个结局、经营、远航、备份、存档结构 32 与 v2/v3 存储隔离不变。实测与截图见[视觉重制验收](docs/v329-v332-validation.md)。

旧版主入口保留 **v2.3.0「归航之约」**，首页顶部可前往新版，本机旧记录可在 v3 中继承。
<!-- CURRENT_VERSION_END -->

完整更新记录见 [Patch Notes](patch-notes/README.md)；v0.25～v2.3 的版本摘要已移至 [版本摘要](docs/VERSION_HISTORY.md)。

## 本地运行

无需安装依赖：

```bash
git clone https://github.com/lv5accelerator-xy/starfall-homecoming.git
cd starfall-homecoming
python -m http.server 8000
```

随后打开 <http://localhost:8000/>（新版为 `/v3/`）。直接双击 `index.html` 也能运行核心游戏，但浏览器可能限制模块脚本或云端功能。

## 存档

- 进度自动保存在浏览器本地，并维护三份轮换备份；支持完整 JSON 存档导入与导出。
- 页面转入后台时暂停视觉循环，返回后按真实时间差补算收益；基础离线收益最多 8 小时，可通过长期强化延长。
- Google 登录和 Firebase 云存档为可选功能，云服务不可用时不影响本地游戏。
- 新版本加载旧存档时自动补齐新增字段，不会重复执行数值压缩迁移。

## 仓库结构

| 路径 | 内容 |
| --- | --- |
| `index.html`、`styles.css`、`game.js` | 旧版 v2 入口、样式与游戏状态/玩法/存档/渲染 |
| `game-math.js`、`v2-systems.js`、`legacy-systems.js` | 数值安全与格式化、v2 航线/Build/赛季/伴星故事、旧系统适配 |
| `v3/` | 新版「拾荒航线」入口与模块 |
| `cloud-save.js`、`firebase-config.js`、`firestore.rules`、`firebase/` | 登录、云存档、排行榜、公告、反馈及可选服务端聚合 |
| `assets/` | 压缩后的游戏贴图与原创背景音乐 |
| `tests/`、`scripts/` | 数值、浏览器与移动端回归，统一检查脚本 |
| `docs/` | 云端、运营、维护与验收文档，[文档索引](docs/README.md) |
| `patch-notes/`、`历史版本/` | 逐版更新记录与正式版本 ZIP 快照 |
| `.github/` | Pages 部署与 PR 检查工作流 |

## 开发与测试

维护工具需要 Node.js，不是游玩前提。

```bash
node scripts/check.cjs          # 语法、静态检查与 tests/ 全部回归（需设置 CODEX_PLAYWRIGHT_PATH）
node tests/numeric-balance.test.js   # 只需 Node 的数值测试示例
node tests/browser-smoke.test.js     # 浏览器测试示例，需要 Playwright
```

- 静态检查需先 `npm install --no-save eslint@9.39.5 globals@17.14.0`（或设置 `CODEX_ESLINT_PATH`）；未安装时显示 `lint skipped`，不算通过，PR 检查会强制运行。
- 测试默认并行，`CHECK_JOBS` 控制并行数（`CHECK_JOBS=1` 为串行）；v3 浏览器测试按 `CHECK_V3_SHARDS` 分片，并核对 116 个流程恰好各跑一次。
- 可用 `CODEX_CHROMIUM_PATH` 指定浏览器；独立 WebKit 由原生浏览器流程和 `tests/v3-visual.test.js` 共同检查。

## 发布

推送到 `main` 后，[Deploy Pages](.github/workflows/deploy-pages.yml) 先补齐当前版本的历史 ZIP，全量测试通过后只发布游戏运行文件；历史 ZIP、测试和维护文档不进入公开网页。由 `GITHUB_TOKEN` 写入的归档提交不会再次触发工作流。

## 文档

- [文档索引](docs/README.md) · [新电脑维护交接](docs/MAINTENANCE.md) · [正式版发布检查清单](docs/RELEASE-CHECKLIST.md)
- [Firebase、账号与云存档](docs/FIREBASE-SETUP.txt) · [公告与玩家反馈](docs/COMMUNICATIONS-GUIDE.txt) · [赛季、Analytics 与安全聚合](docs/FIREBASE-SEASONS-ANALYTICS.md)
- [更新记录](patch-notes/README.md) · [版本摘要](docs/VERSION_HISTORY.md) · [历史版本归档规则](历史版本/README.md)

## 授权

背景音乐、美术与代码随项目发布，但仓库当前未附带开源许可证。仓库公开可见不代表内容可被任意复制、修改或再发布；如需使用，请先联系仓库所有者取得授权。
