# v3 云存档（第 1 期）

方案文档：https://claude.ai/artifact/SeiGTDv3wLHUR6enUZXSTq

## 行为

- 可选功能。未登录时不加载任何 Firebase 资源，游戏和本机存档与之前完全一样。
- 登录使用与旧版相同的 Google 账号和 Firebase 项目；同一站点上旧版已登录时，新版登录会直接复用。
- 进度写入 `savesV3/{uid}`，与旧版 `saves/{uid}` 完全分开，新版从不写入旧版云档。
- 自动同步：本机保存后 30 秒上传；失败 45 秒后重试；切到后台时尽力上传；设置里可立即同步。
- 每次上传都在事务中核对 `revision`，安全规则也要求它只能 +1，所以两台设备不会互相悄悄覆盖。
- 打开游戏时的决定：

| 情况 | 结果 |
| --- | --- |
| 云端没有记录 | 上传本机进度，建立云档 |
| 云端与本机内容相同 | 只记下版本号 |
| 云端没变 | 本机有改动就上传，否则显示已同步 |
| 云端变了、本机没新进度 | 先备份本机，再载入云端进度 |
| 云端变了、本机也有新进度 | 弹出二选一；未选的一方存入本机备份 |
| 本机记录未能载入 | 不上传；只提供查看并改用云端进度 |

“本机没新进度”的判断：重新打开、尚未操作时，同一条航线前台游玩不足 60 秒视为没有新进度（关闭页面时的保存和离线时间不算）；游戏进行中，任何变化都算新进度。

## 继承云端旧航站

登录后，设置的云存档栏有“继承云端旧航站”。它只读取一次同一账号在旧版的云存档（`saves/{uid}`），然后走和“继承本机旧航站”完全相同的预览与迁移：先显示对照表，确认后才替换；当前航线先备份，旧档原文完整封存在 `legacyArchive`，首次迁移备份键不被覆盖。v3 从不写入旧版云存档，旧版照常可玩。继承后的新航线会在几秒内上传到 `savesV3`。

云端没有旧档、旧档损坏，或那条记录其实是 v3 存档时，只提示无法继承，不改动任何进度。读取失败（离线、被拒）也只提示。读取期间若出现两台设备的冲突，先处理“选择要保留的进度”，不弹出继承预览；同步因存档过大已停止时，继承照常完成，但保留“超过云端上限”的说明，不承诺上传。规则无需改动：旧版 `saves` 本来就允许本人读取。

## 文件

| 文件 | 内容 |
| --- | --- |
| `v3/cloud-core.js` | 纯逻辑：变更检测、决定流程、gzip 编码、大小上限 |
| `v3/cloud.js` | Firebase 按需加载、同步调度、设置面板、二选一对话框 |
| `firestore.rules` | 末尾的 `savesV3` 段 |
| `tests/v3-cloud-core.test.js` | 核心逻辑（Node） |
| `tests/v3-cloud-browser.test.js` | 双设备浏览器场景（内存假云端，不联网） |
| `tests/rules/firestore-rules.cjs` | 规则测试（仅在 Firestore 模拟器中运行） |
| `.github/workflows/deploy-firestore-rules.yml` | 规则测试通过后发布规则 |

## 规则自动发布（一次性设置）

`deploy-firestore-rules.yml` 在 `firestore.rules` 合并到 main 或手动触发时运行：先在模拟器中跑规则测试，通过后才发布到 `stellar-outpost-idle`。需要仓库 secret `FIREBASE_RULES_SERVICE_ACCOUNT`：

1. Google Cloud 控制台 → 项目 `stellar-outpost-idle` → IAM 与管理 → 服务账号 → 创建服务账号（例如 `rules-deployer`）。
2. 只授予两个角色：**Firebase Rules Admin**、**Service Usage Consumer**。
3. 在该服务账号的“密钥”页添加 JSON 密钥并下载。
4. GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret，名称 `FIREBASE_RULES_SERVICE_ACCOUNT`，值为整个 JSON 文件内容。
5. 删除本地下载的 JSON 文件。

secret 未设置时，发布步骤会明确失败并提示“rules were NOT published”，不会静默跳过。

## 上线顺序

先发布规则，并确认旧版云存档仍然正常；再合并网页。网页先上线而规则未发布时，新版登录后上传会被拒绝（显示同步失败），本机存档不受影响。
