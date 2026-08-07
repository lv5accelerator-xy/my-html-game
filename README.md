<h1 align="center">星港拾荒者</h1>

<p align="center">
  一款以深空回收、舰队自动化和多层轮回为核心的中文挂机游戏。
</p>

<p align="center">
  <a href="https://lv5accelerator-xy.github.io/my-html-game/"><strong>▶ 在线试玩</strong></a>
  ·
  <a href="星港拾荒者-v0.1.0-v0.17.3-Patch-Notes.txt">完整更新记录</a>
  ·
  <a href="历史版本/README.md">历史版本</a>
</p>

<p align="center">
  <a href="https://github.com/lv5accelerator-xy/my-html-game/actions/workflows/deploy-pages.yml">
    <img alt="GitHub Pages 部署状态" src="https://github.com/lv5accelerator-xy/my-html-game/actions/workflows/deploy-pages.yml/badge.svg">
  </a>
</p>

![轨道星港概念图](assets/starport.png)

## 游戏简介

《星港拾荒者》使用原生 HTML、CSS 与 JavaScript 制作，无框架、无构建步骤。核心游戏可以离线运行，进度会自动保存在浏览器中；连接 Google/Firebase 后，还可以在电脑和手机之间同步存档并参与排行榜。

从手动回收第一份星尘开始，你将逐步建立自动化舰队、强化研究与星港、抵御袭击、执行深空跃迁，并最终进入奇点坍缩与无限边境循环。

## 核心玩法

- **信标回收**：手动采集星尘，完成航标并解锁第一批自动化设施。
- **轨道舰队**：扩建十类生产设施，支持 ×1、×10 和最大数量购买。
- **研究与星核**：通过研究提高效率，深空跃迁后使用星核获得永久强化。
- **近域战斗**：清剿六类目标，每类固定产出一种星港建设材料。
- **轨道星港**：六座建筑分别消耗专属材料与大量星尘，提供生产或战斗增幅。
- **奇点超越**：收集奇点碎片、升级超越协议并挑战循环星区。
- **伴星观测**：奇点坍缩会永久唤醒实体伴星；点击伴星可触发二选一收藏事件并记录专属日志。
- **航站委托**：每日与每周任务记录实际游玩行为，凭证可兑换星尘、材料和舰队整备。
- **星区远征**：在五段式短局中选择舰装、临时协议与航线，在第五航段迎战两阶段机制首领。
- **排行榜**：登录后可比较累计星尘、最高战力、战斗次数、完整远征、首领击破和远征遗物。

## 当前版本

当前航站协议为 **v0.17.3**。

- v0.17.3：修复远征配装嵌套数组导致 Firestore 拒绝云存档的问题，并兼容读取旧格式云档。
- v0.17.2：修复部分新账号首次云端存档被拒绝的问题，并加入身份令牌自动刷新重试与更明确的错误提示。
- v0.17.1：排行榜新增完整远征、机制首领击破与远征遗物三个长期记录分类。
- v0.17.0：新增 8 组伴星观测事件、观测信号与日志图鉴，选择不同记录方式可获得一次性资源奖励。
- v0.16.0：新增 12 件远征舰装、3 套配装预设与三名两阶段机制首领；首胜可解锁专属舰装蓝图。
- v0.15.2：校正生产公式，加入每 10 个设施翻倍的规模协同，并将奇点坍缩门槛调整为 150 历史星核。
- v0.15.0：新增五航段“星区远征”，通过路线、词条与临时强化三选一形成重复游玩的策略变化。
- v0.14.0：新增每日/每周航站委托、凭证兑换商店与自动新版本提示。
- v0.13.8：让已解锁伴星以独立颜色、光晕和轨道出现在指挥台，并支持点击查看介绍。

完整版本变化见 [Patch Notes](星港拾荒者-v0.1.0-v0.17.3-Patch-Notes.txt)。

## 开始游玩

### 在线版本

访问：<https://lv5accelerator-xy.github.io/my-html-game/>

### 本地运行

项目没有安装步骤。克隆仓库后，建议使用任意静态文件服务器启动：

```bash
git clone https://github.com/lv5accelerator-xy/my-html-game.git
cd my-html-game
python -m http.server 8000
```

随后打开 <http://localhost:8000/>。

直接打开 `index.html` 也可以运行核心游戏，但浏览器可能会限制模块脚本或云端功能，因此更推荐本地 HTTP 服务器。

## 存档与离线收益

- 浏览器本地自动存档，并维护三份轮换备份。
- 支持 JSON 存档导出与导入。
- 页面进入后台后暂停视觉循环，返回时按真实时间差补算后台收益。
- 基础离线收益最多累计 8 小时，后续可通过永久强化延长。
- Google 登录与 Firebase 云存档属于可选功能；未连接云服务时，本地游戏不受影响。

云端配置说明见 [FIREBASE-SETUP.txt](FIREBASE-SETUP.txt)。

## 移动端与性能

游戏提供两种画面模式：

| 模式 | 游戏逻辑 | 星空帧率 | 适用场景 |
| --- | ---: | ---: | --- |
| 省电 | 4 次/秒 | 24 FPS | 手机挂机、降低发热 |
| 高画质 | 10 次/秒 | 最高 60 FPS | 桌面或性能充足的设备 |

省电模式会降低像素密度与星星数量、关闭大面积模糊和背景动画，并冻结观赏伴星轨道；收益仍然按照真实时间差精确结算。

## 项目结构

```text
my-html-game/
├─ index.html              # 页面结构与游戏入口
├─ styles.css              # 界面、响应式布局与视觉效果
├─ game.js                 # 游戏状态、玩法、存档和渲染逻辑
├─ game-math.js            # 数值安全、软上限与格式化函数
├─ cloud-save.js           # Google 登录、云存档与排行榜
├─ firebase-config.js      # Firebase Web 配置
├─ firestore.rules         # 云存档与排行榜访问规则
├─ assets/                 # 星港图片与原创背景音乐
├─ tests/                  # 数值、浏览器和移动端回归测试
└─ 历史版本/               # 各正式版本 ZIP 归档
```

## 测试

基础语法与数值测试只需要 Node.js：

```bash
node --check game.js
node tests/numeric-balance.test.js
```

浏览器测试需要 Playwright。将 `CODEX_PLAYWRIGHT_PATH` 指向本机 Playwright 模块目录；如果需要指定浏览器程序，再设置可选的 `CODEX_CHROMIUM_PATH`：

```bash
node tests/browser-smoke.test.js
node tests/mobile-performance.test.js
```

测试覆盖后期数值压缩、旧存档迁移、后台收益、任务进度与版本检测、远征配装与机制首领、伴星事件及奖励、舰队购买、战斗材料、星港增幅，以及手机省电和后台暂停策略。

## 部署

推送到 `main` 后，[Deploy clean GitHub Pages site](.github/workflows/deploy-pages.yml) 工作流会自动发布当前游戏运行文件。历史 ZIP、测试和项目文档不会被打包进公开网页资源。

## 音乐与授权

本仓库当前没有附带开源许可证。仓库公开可见不代表代码、音乐或美术资源可以被任意复制、修改或再发布；如需使用，请先联系仓库所有者取得授权。
