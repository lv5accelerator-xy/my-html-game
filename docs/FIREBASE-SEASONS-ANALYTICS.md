# Firebase 赛季、统计与安全聚合

v2.0.0 的核心游戏、循环赛季和本地存档不依赖 Firebase。以下配置只启用远程赛季替换、可选匿名 Analytics、赛季榜以及全部参与者的服务端共同航标。

## 1. 远程赛季配置

在 Firestore 创建文档 `seasonConfigs/current`，至少填写：

```text
published       boolean   true
revision        number    1
id              string    season-2026-01
title           string    本期标题
theme           string    本期主题文案
startAt         timestamp 开始时间
activeDays      number    14
exchangeDays    number    7（不可低于 7）
personalTarget  number    140
beaconTarget    number    24000
rotations       array     恰好 3 条短规则
story           array     恰好 3 段共同故事
rewardIds       array     从 title_homebound、decor_lampsea、collection_return_signal 中选择
```

远程文档不存在、字段无效或网络离线时，客户端自动使用 14 天活动 + 7 天兑换的循环默认赛季，不会阻断游戏。

## 2. Firebase Analytics（可选）

1. 在 Firebase 控制台的项目设置中为 Web 应用启用 Google Analytics。
2. 把控制台给出的 `measurementId` 加入 `firebase-config.js`。
3. 重新发布页面；在游戏“其他安排 → 匿名体验统计”中手动开启。
4. 在 Analytics DebugView 验证事件。客户端只发送白名单事件名、日期、路线和有上限的数值，不发送玩家名、邮箱或存档正文。

未添加 `measurementId` 时，开关与本地统计适配层仍可测试，但不能声称数据已进入 Firebase Analytics。

## 3. 部署安全共同航标

仓库的 `firebase/functions/` 包含两个增量聚合函数：

- `aggregateSeasonContribution`：按每位玩家单调递增的赛季贡献只累计差值，避免重复上传造成重复计分。
- `aggregateLongTermBeacon`：对永久排行榜记录计算差值并写入 `communityTotals/current`。

需要 Firebase 项目升级到支持 Cloud Functions 的方案，然后在安装 Firebase CLI 并登录后执行：

```bash
firebase use stellar-outpost-idle
cd firebase/functions
npm install
cd ../..
firebase deploy --only functions,firestore:rules
```

部署前应在 `firebase.json` 中确认 functions source 指向 `firebase/functions`。函数通过 Admin SDK 写入 `communityTotals/{id}`；客户端规则禁止写入，只允许读取 `published=true` 的聚合结果。

在函数部署并产生首个聚合文档之前，游戏会明确显示“排行榜活跃玩家汇总”，数据仅来自当前能读取的排行榜样本。部署成功后客户端检测到可信聚合文档，会自动改为“服务端安全累计 · 全部参与者”。

## 4. 安全与索引

- 发布仓库根目录的 `firestore.rules`。
- 第一次打开赛季榜时，如控制台提示缺少 `seasonScore` 索引，按 Firebase 给出的链接创建单字段降序索引。
- `seasonContributions/{seasonId}/players/{uid}` 只允许本人创建或提高自己的有上限分数；不能读取他人贡献，也不能降低或删除。
- 排名奖励仅发放外观、称号与收藏；服务器汇总不可用时不会影响个人本地赛季进度。
