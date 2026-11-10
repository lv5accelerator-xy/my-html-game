# 3.28.0-preview.1 正式发布验收

本轮用户明确授权完整审查、修复、Ready、merge commit 合并和 GitHub Pages 上线，覆盖开发交接中当时的“不合并/不发布”限制。保留 preview 名称，不创建 Release，不修改 Firebase、玩家正式记录或部署规则。

原始 PR #21 head 为 20121ba934ebbc660e7e2c5177680a83f81e8513，main 基准为 9e14610a197580d2b377dc8e2f1f8684f2c57e63，启动时重新 fetch 和 GitHub API 均一致。原工作区 work/5084568 保持干净；本轮在两个独立 worktree 建立原始基线与修复后的准确基线。连接 GitHub 账号 lv5accelerator-xy，merge commit 可用；main 返回 protected=false、rulesets=[]，不更改保护或权限。

原 PR 129 文件逐项分类：运行文件6、测试5、规范存档3、只读审计工具3、文档11、历史证据101。完整路径/大小/哈希见 review-inventory.json。所有 JSON 可解析，历史最终源码哈希与初始 head 逐项相同。历史报告没有作为本轮通过证据；原生架构、v2/v3命名空间、schema32与8h上限保留。

## 阻塞发现及最小修复

将规范 city-v327-paid 副本的 active.legs 置为 [null] 可触发 cleanLeg 先解引用 condition 的 TypeError，导致整份存档进入阻塞恢复界面。新增规则和真实浏览器回归在修复前分别失败。修复先拒绝空航段，不退回已经支付的费用，不清除 settled/completed/collections 或永久故事、装备、合同。进一步回归发现损坏首航档案存在有效近期首航收据时，两轮净化结果不同；修复在同一轮回退有效 firstBonus===6 收据，保留前置与幂等恢复。

修复提交 358de6d8e215e64e86ea2980cbf7a0fdf381be35：仅 v3/engine.js 与两处回归测试。三结局 × active/record/archive 的9种损坏及真实导出/导入/刷新均覆盖；原日志、首次专项失败和最终通过日志保留。未跳过/删除断言，未强制点击或降低门槛。

## 本次实际云执行

环境 ccarenv_b64_Y2NhcmVudl8xNThkNDE2ODY3ZmM4MTkxOWU4Y2MyMjM3MWViNmYxYQ，从starting等到ready，观测current且policy enforced。Node22.23.4 / Playwright1.55.0 / 系统Chromium151.0.7922.173，工具位于仓库外。Browser技能已读取，但无可调用js工具；使用用户明确授权的Playwright隔离context。

```sh
PATH=/workspace/scratch/starport-release-tools/node_modules/node/bin:$PATH \
CODEX_PLAYWRIGHT_PATH=/workspace/scratch/starport-release-tools/node_modules/playwright \
CODEX_CHROMIUM_PATH=/usr/bin/chromium \
V3_SCREENSHOT_DIR=/workspace/scratch/starport-release-evidence/screens node scripts/check.cjs
```

| 被测提交 | 退出码 / 秒 | 语法 / 脚本 | 规则组 / 规范旧档 / 完整v3浏览器 |
| --- | --- | --- | --- |
| 20121ba（本轮独立初始基线） | 0 / 593.59 | 9 / 21 | 226 / 145 / 115 |
| 358de6d（修复后无过滤完整） | 0 / 606.16 | 9 / 21 | 227 / 145 / 116 |

最终30个子命令全部0，过滤参数为空，最终失败/跳过0，51份源码/测试/脚本执行前后SHA256完全相同。规则组构成：conditions7 + continuation63 + expansion51 + gameplay86 + quality20。兼容档构成22+30+18+9+18+21+9+9+9=145。参数矩阵另为114192+2592报价，不冒充规则组/浏览器数。

实际覆盖新档扫描/建造/研究/跃迁，六章与三个永久结局，12动态事件，图谱/证据，四段安排，六居民回响，七类经营需求/工程，冻结远航与六环境装备比较，12荣誉与账本，导出导入/备份异常/8h离线，1280×900、375×900、320px布局、触摸/SVG键盘、焦点/DOM/减少动画。全部浏览器为新非持久context，隔离测试响应中禁用Firebase配置，不读取真实浏览器profile。

145份规范旧档逐字段通过；已付成本/航段和合同不重算，永久选择、结局、装备、收藏、工程保留，一次性收益不能重复领取。原根v2运行文件和生产Firebase配置/规则/函数逐字节未改。

本次独立 profile 当前代码1800虚拟秒，活跃DOM各点均2710，GC后堆3302516→3989216字节；固定云负载，不是30分钟真实手机试验。公开脚本在本地先验：14运行哈希 / 7额外流程 / 118较早规范档，退出0，仅是脚本预检。

## 独立引擎与未执行项

云Chromium实际通过。云WebKit官方下载尝试退出1：官方镜像域名403；云访问公开Pages CONNECT403，curl退出56。未绕过网络政策，GitHub独立WebKit与公网运行分别记录。真实iPhone Safari、实际软键盘、真实低端机和长时间实机老化未执行，没有把Linux WebKit/手机视口冒充实机。

## GitHub / 合并 / 公网

验收结论：**通过，PR #21已合并，正式部署Success，独立公网Chromium与WebKit全部Success**。代码修复均已提交并推送；原work/5084568与修复worktree均干净，没有未推送的必要修复。本记录使用独立文档分支/PR，不直接写main，也不开始v3.29。

| 证据 | 实际ID / SHA / 状态 |
| --- | --- |
| [PR #21](https://github.com/lv5accelerator-xy/my-html-game/pull/21) | 先Ready，expected_head_sha=358de6d8e215e64e86ea2980cbf7a0fdf381be35，merge_method=merge，2026-11-10T22:45:45Z合并，保留五提交 |
| 最终merge/main | `4d87e7fcd835c300815b0609e0ad4bb65e13fa2d`；父提交9e14610与358de6d，树与已验收head相同；记录时远端main重新核对一致 |
| [最新PR CI](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42890795845) | job130091113663，准确head358de6d，完整入口30子命令全0；Chromium116与独立WebKit116全部通过 |
| [正式Pages](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42917506852) | archive130183618019 / test130183618267 / build130190472285 / deploy130190671867，四job全部Success |
| 部署来源 | artifact13809858879；pages_build_version明确为4d87e7f，2026-11-10T23:00:18.7964309Z Reported success |
| [独立公网验收](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42919605777) | 准确源4d87e7f；Chromium job130190828440、WebKit job130190828830全部Success |
| 线上版本 | `3.28.0-preview.1`，根v2仍`2.3.0` |

archive确认当前根版本历史ZIP已存在，因此正常成功退出，没有额外归档提交，没有删除历史。test再次无过滤执行9语法/21脚本/227规则/145旧档/Chromium116，30子命令全0；独立WebKit116也成功。build检出4d87e7f并上传上述artifact，deploy使用同一SHA，不能把PR合并状态代替部署状态。

公网两个job均从公开URL、独立非持久context运行：`node scripts/verify-public-v324.cjs`及`V3_TEST_URL=https://lv5accelerator-xy.github.io/my-html-game/v3/ node tests/v3-browser.test.js`，每引擎均退出0，**14个运行文件逐字节SHA256匹配、7条额外流程、118份较早规范档、116条完整v3浏览器流程，0失败/0跳过**。版本与资源哈希在每个源结果中保留，另已用本地358de6d源码重新计算核对线上14份哈希；这些结果不引用旧CI。

实际公网覆盖新存档扫描、建造、研究和派遣、行动中心定位、居民永久选择、四段远航和六环境/装备、手机底栏及SVG触摸/键盘、刷新保存、导出导入/备份与八小时、六章和三个结局。两引擎均无pageerror、console warning/error、坏资源响应或非预期请求失败。v2在1280×900和375×900真实关闭启动弹层、点击回收、保存刷新，版本2.3.0及v3命名空间独立，配置哈希未改。测试响应中禁用生产Firebase。WebKit原日志另记录两次主动导航取消音乐流（Load request cancelled），属于媒体正常停止，未冒充资源下载失败或游戏错误。

[新版公开入口](https://lv5accelerator-xy.github.io/my-html-game/v3/) · [旧版入口](https://lv5accelerator-xy.github.io/my-html-game/)

## 原始证据与截图

[机器状态](validation/v328-release/release-state.json)、[实际命令与退出码](validation/v328-release/commands.md)、[129文件清单](validation/v328-release/review-inventory.json)、[修复patch](validation/v328-release/recovery-fix.patch)、[完整云日志](validation/v328-release/fixed-full.log)、[云源前后哈希](validation/v328-release/fixed-full-result.json)、[PR CI日志](validation/v328-release/github-pr-final.log)、[Pages部署日志](validation/v328-release/github-pages-deploy.log)、[公网Chromium](validation/v328-release/public-chromium-result.json)及[公网WebKit](validation/v328-release/public-webkit-result.json)均可审查。同目录保存原始失败、专项、基线、完整Pages test/build/archive与两套公网job日志。

公网工件包含截图、result.json和全量流程截图：[Chromium 13812525011](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42919605777/artifacts/13812525011)、[WebKit 13812680287](https://github.com/lv5accelerator-xy/my-html-game/actions/runs/42919605777/artifacts/13812680287)，到2026-11-24保留14天。公开工件已实际保存，Chromium工件下载接口也已成功返回文件；没有把这些未在本地逐张查看的公网截图称为人工验收。

本仓库另外永久保留三张已实际查看的云内截图及[源码/环境/视口/哈希](validation/v328-release/screenshots.json)：[1280新档](validation/v328-release/screens/cloud-fresh-1280.png)、[320触摸归航](validation/v328-release/screens/cloud-touch-320.png)、[375远航预览](validation/v328-release/screens/cloud-voyage-375.png)。云内截图源是358de6d，公网截图源是4d87e7f，二者游戏源码相同但执行环境分开记录。真实设备与云WebKit未执行项仍按上节如实保留。

