# v3.29～v3.32 视觉重制验收

## 起点与边界

实际 main `4d87e7fcd835c300815b0609e0ad4bb65e13fa2d`，v3.28.0-preview.1。隔离 worktree `/workspace/starport-visual`，分支 `codex/v329-v332-visual-overhaul`。原工作区 work/5084568 保留。已读 README、AGENTS、CODEX_HANDOFF、docs/README、v3-playable、主线、v325-v328-validation 与 v328-stability-checklist。开放 #8/#12/#22 不合入；#22 是发布记录文档，不以 main 中过时的“#21未合并”说明推断实际部署。

云环境 current/ready，Node22.23.4、Playwright1.55.0、系统 Chromium151.0.7922.173。Browser 技能已读，工具发现没有可调用的 Browser js，使用本任务要求的 Playwright 隔离 context；外网由 isolate-browser 屏蔽，不连接生产 Firebase。

首次 `node scripts/check.cjs` 退出1：未设置 CODEX_PLAYWRIGHT_PATH，未运行测试。准备后相同无过滤命令实际退出0：9语法、21测试脚本、30子命令；227命名玩法规则、145规范旧档、116完整v3浏览器流程，另2参数审计/114192报价与2592环境报价。原文 [baseline.txt](validation/v329-v332/baseline.txt)，并非引用历史结果。before/ 内保存本轮原版七区域×1280/375/320共21张截图及采样元数据；原版远航/居民/档案尚无独立页面，截图是探索中对应区域。profile-before 为本轮同脚本60虚拟秒负载及30分钟虚拟挂机，不能当真机帧率或真实30分钟老化试验。

官方 WebKit2203 下载因域名策略403失败，原文 webkit-install.txt。将核对最终提交既有 GitHub 双引擎 CI；不把云 Chromium 或 Linux WebKit 当真实 iPhone Safari。

## v3.29 全局语言与结构

七种真实页面：舰队船坞与控制台、探索大图谱、远航舰桥与四段横线、居民生活与阅读栏、档案陈列、跃迁仪式、首页大场景。以原生 visuals.js 只读派生画面与入口，visual.css 管理五种语言；新的独立页面复用原函数，不复制规则。原 explore 聚合和所有原 data-action、稳定协调器、预算草稿、焦点守卫不变。初始仍仅航站/舰队两个渐进导航，不提前剧透居民与远航；后三者按真实故事开放。

本阶段使用原场景和设备线稿；原创生产插画在下一独立 v3.30 素材阶段接入，不将本阶段线稿当八张场景完成。新增11只读状态断言组与7真实浏览器流程，覆盖三个宽度七页、购买节点身份、预算草稿、Escape焦点、三个旧结局档实际远航和新档扫描。专项退出0；完整入口结果如下。

本阶段冻结完整入口实际退出0：10语法、22脚本、32子命令，原227规则/145旧档/116完整流程均保留，新增11观察组和7浏览器流程通过；before/after源哈希完全相同，准确耗时见 v329-full.json。v329/ 保存阶段21截图，已查看桌面/手机；设备线稿仅是本阶段的生产控制示意。

## v3.30 原创美术实装

8张原创主体场景×桌面1280/手机640，共16个WebP；四个道具WebP（拖船、设备模块、通信明信片、荣誉章）；原首页另压缩两种尺寸。准确尺寸与字节清单在 v3/assets/manifest.json，生成简报与概念差异见 [美术制作](v329-v332-art-direction.md)，concept.webp 和 art-contact.webp 已实际查看。素材全部内部加载，非主图 lazy，尺寸预留；没有把生成UI图当按钮。修复前后首页选择不同图，实际修复点亮航灯、实际舰队出现最多5个示意停泊标记；居民区只在真实船队抵达后开放，育种舱与已建工程街区由原存档派生。未建工程不显示照片区域。原精确SVG仍可点击与键盘定位。

专项12观察组/10浏览器流程退出0：所有8场景确实出现在可操作页面，桌面/手机逐图解码成功，缺图仍可扫描。全量无过滤入口退出 0，507.91 秒：10语法/22脚本/32子命令，原227规则/145规范旧档/116完整流程与新增12/10全部通过，源哈希前后相同。

素材处理初次 trim/extract 顺序错误退出1，原文 props-extract-failure.txt；改为先提取象限的缓冲区，再 trim/缩放，重新运行退出0。人工检查移除了照片上的简化房屋/人形叠层，工程以已建街区照片与原精确图表达，避免线稿遮挡电影画面。没有通过删测试或强制点击绕过故障。

## v3.31 动画与反馈

新增独立 motion.js，仅管理视图、IntersectionObserver 和短反馈定时器；无 requestAnimationFrame、无每帧DOM重建，不调用规则推进。沿用原协调器，仅额外保留视图拥有的 data-in-view/data-cue 两个临时属性，控件、输入草稿与阅读焦点规则不变。拖船做独立透明剪影细化后实际入库，旧四道具保留其用途。

| 演出 | 触发与长度 | 边界 |
| --- | --- | --- |
| 星尘碎光 | 扫描真实成功，650ms | 原冷却/星尘即时生效，连续点击不等待 |
| 设备激活、研究节点亮起 | 实际建造/研究成功，650ms | 研究完成标记来自原 research，非动画进度 |
| 重要发现、荣誉 | 实际领取故事/手动荣誉，至多2.2s | 图像位于发现报告/收藏，短反馈可跳过 |
| 回信展开、报告进入 | 原居民来信对话/报告出现，380～450ms | 原生对话关闭与焦点守卫保留 |
| 出航与归航 | 实际派遣/阶段接续/最终归航，1.8s | 拖船演出只在场景画幅内，不移动阅读位置，不延后结算 |
| 星港通电、永久工程 | 原修复/建设成功，至多2.2s | 航灯按真实修复分段点亮，工程无假进度 |
| 跃迁聚能与释放 | 确认前核心低频聚能；真实启航后1.5s释放 | 原二次确认与资源重置立即执行，短演出可跳过 |
| 环境 | 飞船24/32s，航灯12s，机械28s，扫描8s，航线完成后1.1s有限点亮（后续性能补修），核心9s | 仅相交场景运行；隐藏全页暂停，非卡片统一晃动 |

设置提供跟随设备/关闭/完整动态，本机独立键 stellarOutpostIdle_v3_motion，不加入schema32。系统减少动态永远优先；2核/2GB/省流自动降级。跳过只停止画面，原操作不回滚；只在用户聚焦短演出按钮时恢复原焦点。页面隐藏清理短反馈，观察器不在隐藏时写DOM，返回重采可见状态。

新增专项共12观察组/13浏览器流程通过，涵盖动画中的真实扫描、派遣、预算/按钮身份、跳过、原生焦点、关闭/系统reduce/低性能、视口外机械暂停，以及隐藏60秒主区域0持续变更/0周期主档改写与恢复。无过滤完整入口退出 0，528.88秒：11语法/22脚本/33子命令；原227规则/145旧档/116流程与新增12/13均通过，源哈希一致。没有删除旧断言。

## v3.32 手机、导航与收尾

手机目标条保留两行摘要和实际目标按钮；星图九节点可触摸，线索说明采用本区横向滚动，页面本身无横向溢出。舰队以三列设备行与可展开已选航线摘要保留实操；居民长信单独阅读，四段远航保持横向，档案增加实际通信/装备/荣誉陈列，未获得荣誉保留空位。7项底栏在320px仍有44px宽高目标。缩小320×480可用高度、大字、输入和原生Escape恢复纳入专项，不把它叫作实际软键盘或iPhone验收。已建街区改用320px小图，避免首页提前下载整个大场景；8主体仍各有1280/640版本。

本阶段首轮专项退出1：新增工程照片测试没有先展开原生“长期工程”，真实按钮不可见；修正为真实点击summary再建设，未用force或修改游戏门槛。修正专项12观察/16浏览器退出0。人工复查发现专属页的当前章节/续读会跳回旧探索，新增回归在修复前真实失败（actual=explore/expected=archive），保留v332-reading-before-fix原文；导航改为当前专属页已拥有目标时就地定位。旧explore调用、真实按钮ID与外部目标依然可达，阅读不改游戏主档。

最初v332-full在398.41秒主动SIGTERM（JSON退出-15；shell映射241），其源哈希前后相同，但没有完整RESULT，绝不计通过。原因是确认上述导航体验问题后需要补修并重跑无过滤入口。末次以v332-final-full为准。

截图工具另有一次隐藏懒加载decode等待，被主动中止；排除零尺寸/不相交图片后21张全部完成。一次过早复制尚未完成的截图目录失败，未损坏运行文件；修复后的v331截图与准确运行源随3.32归档。首次单纯探查较早夹具结构时对不存在states调用slice也退出1，改为按实际city/watch/voyage对象读取，未用于测试结论。所有这些与完整入口的失败/成功分开记录。

只读pr-checks.yml增加独立WebKit视觉/动态步骤；既有容器digest、Node22/PW1.55和全部原回归保留。deploy-pages.yml、public-acceptance.yml、Firebase及根v2不改，不触发发布。

## 最终素材清单

全部素材均在仓库内部，精确尺寸、字节与生成来源见[manifest.json](../v3/assets/manifest.json)。桌面主图1280×720，手机640×360；旧首页派生为1280×853/640×427，不算第九张原创。

| 主体 / 文件前缀 | 桌面字节 | 手机字节 |
| --- | ---: | ---: |
| 轨道舰队船坞 `orbital-dock` | 195,144 | 60,486 |
| 自动化生产线 `production-line` | 228,326 | 69,268 |
| 深空星区探索 `sector-nebula` | 85,222 | 26,104 |
| 远航舰桥 `voyage-bridge` | 130,620 | 42,128 |
| 星际残骸调查 `wreck-investigation` | 166,252 | 54,612 |
| 星港居民生活区 `resident-habitat` | 220,340 | 66,926 |
| 生态温室 `ecology-greenhouse` | 223,608 | 73,174 |
| 星核跃迁 `starcore-jump` | 170,948 | 53,504 |

另有实际使用的独立道具/派生文件：

| 文件 | 像素 | 字节 |
| --- | --- | ---: |
| `salvage-tug.webp` | 280×157 | 21,710 |
| `power-module.webp` | 240×188 | 19,966 |
| `resident-letter.webp` | 240×162 | 16,992 |
| `orbit-honor.webp` | 137×200 | 12,992 |
| `unrepaired-orbit.webp` | 1280×853 | 127,124 |
| `unrepaired-orbit-mobile.webp` | 640×427 | 43,738 |
| `resident-habitat-thumb.webp` | 320×180 | 16,282 |
| `production-line-thumb.webp` | 320×180 | 17,088 |
| `voyage-bridge-thumb.webp` | 320×180 | 10,656 |
| `orbital-dock-thumb.webp` | 320×180 | 15,080 |

本轮最终清单共 26 个WebP，合计 2,168,290 字节（不含保留的旧原图）；不是一次加载全部素材。原始生成PNG不进入游戏包。

## 性能发现与补修

初次3.32的SVG虚线stroke-dashoffset持续动画，使375px探索页5真实秒TaskDuration达到386.08ms，原3.28为78.01ms；尽管首屏资源已降低，不能以视觉测试通过掩盖此开销。原始 perf-after-data / v332-final-full / performance-source-hashes 保留为初版候选证据。

改为只对真实完成的航线作1.1秒、三级opacity、顺序延迟的有限点亮，随后停止重绘；CSS无每帧JS，减少动态直接显示静态完成线。新专项12/16退出0，另加迭代次数必须为1的断言。独立静置采样 v332-optimized-perf 退出0，探索5秒TaskDuration降至108.16ms，活动动画从7个降到1个（仅扫描氛围），较初版下降72%。约占单核时间2.16%，原版约1.56%；数据是固定云工作负载，不是手机fps或长期统计承诺。优化后的最终完整入口、30分钟虚拟负载与最终源以optimized命名记录为准。

初版新首页另有5分钟实际时钟会话（CSS中未显示的航线持续动画后来补修），366节点始终稳定、无溢出/运行时错误；不把它冒充最终源码的全部验证。最终版还在与完整回归同机同时运行时另作5分钟真实会话，内存/DOM稳定性与安静环境CPU测量分开。所有真实/虚拟时长和源码散列分别保留。

## 桌面与手机性能实测

相同v3.24实际赚得的成熟旧档、Chromium151、全新隔离context、本地未gzip HTTP。首屏等networkidle；切换每页6轮同步DOM+layout计时；前台强制完整动态，每种表面5真实秒。基线实际服务于本轮git archive 4d87e7f，并非抄旧数字。原文perf-before-data.json / perf-after-optimized-data.json与各自命令/源散列可复核。

| 指标 | v3.28 | 最终3.32 |
| --- | ---: | ---: |
| 1280px首屏编码响应体 | 841,441 B | 804,008 B |
| 1280px舰队切换中位/最大 | 9.45/17.60ms | 10.05/24.60ms |
| 1280px探索切换中位/最大 | 35.15/71.40ms | 31.05/64.10ms |
| 375px首屏编码响应体 | 841,441 B | 669,350 B |
| 375px舰队切换中位/最大 | 8.45/20.60ms | 9.55/24.10ms |
| 375px探索切换中位/最大 | 32.55/75.70ms | 30.55/60.90ms |
| 375px 前台home主线程/5真实秒 | 42.58ms | 58.40ms |
| 375px 前台explore主线程/5真实秒 | 78.01ms | 108.16ms |
| 375px 后台explore主线程/5真实秒 | 6.17ms | 22.78ms |
| 首页活跃DOM | 296 | 366 |
| 完整探索聚合DOM | 2690 | 2726 |

首屏桌面减少4.45%、手机减少20.45%。桌面主图请求21.6→9.7ms，手机11.6→16.5ms；小拖船初次请求仍可能约70ms，所有主图与额外图实际decode通过。请求时长受本地调度影响，不代表公网/移动网络加载；不能把并行图片时长相加。切换新增少量毫秒，非每次都加速；探索真实动画开启的主线程从1.56%到约2.16%单核时间，ScriptDuration反降，原规则/保存频率保持。后台采样含切换后的样式/观测开销，不能把这一点开销误称持续后台DOM更新；单独持续隐藏专项确认0主区域变更/0周期主档写入，后台运行的CSS动画为0。

## 截图证据与人工检查

本轮原版before与最终after各7页×1280×900/375×900/320×900共21张。原版远航、居民、档案尚无独立页，因此before是探索中对应实际区域；不是伪造旧独立页面。最终after/capture.json记录实际版本、源码SHA256、请求、尺寸与0溢出/0异常。阶段29/30/31亦分别保留；31截图工具修复后归入本阶段。

| 页面 | 桌面1280 | 手机375 | 手机320 |
| --- | --- | --- | --- |
| 航站 | [前](validation/v329-v332/before/home-1280.webp) / [后](validation/v329-v332/after/home-1280.webp) | [前](validation/v329-v332/before/home-375.webp) / [后](validation/v329-v332/after/home-375.webp) | [前](validation/v329-v332/before/home-320.webp) / [后](validation/v329-v332/after/home-320.webp) |
| 舰队 | [前](validation/v329-v332/before/fleet-1280.webp) / [后](validation/v329-v332/after/fleet-1280.webp) | [前](validation/v329-v332/before/fleet-375.webp) / [后](validation/v329-v332/after/fleet-375.webp) | [前](validation/v329-v332/before/fleet-320.webp) / [后](validation/v329-v332/after/fleet-320.webp) |
| 探索 | [前](validation/v329-v332/before/explore-1280.webp) / [后](validation/v329-v332/after/explore-1280.webp) | [前](validation/v329-v332/before/explore-375.webp) / [后](validation/v329-v332/after/explore-375.webp) | [前](validation/v329-v332/before/explore-320.webp) / [后](validation/v329-v332/after/explore-320.webp) |
| 远航 | [前](validation/v329-v332/before/voyage-1280.webp) / [后](validation/v329-v332/after/voyage-1280.webp) | [前](validation/v329-v332/before/voyage-375.webp) / [后](validation/v329-v332/after/voyage-375.webp) | [前](validation/v329-v332/before/voyage-320.webp) / [后](validation/v329-v332/after/voyage-320.webp) |
| 居民 | [前](validation/v329-v332/before/residents-1280.webp) / [后](validation/v329-v332/after/residents-1280.webp) | [前](validation/v329-v332/before/residents-375.webp) / [后](validation/v329-v332/after/residents-375.webp) | [前](validation/v329-v332/before/residents-320.webp) / [后](validation/v329-v332/after/residents-320.webp) |
| 档案 | [前](validation/v329-v332/before/archive-1280.webp) / [后](validation/v329-v332/after/archive-1280.webp) | [前](validation/v329-v332/before/archive-375.webp) / [后](validation/v329-v332/after/archive-375.webp) | [前](validation/v329-v332/before/archive-320.webp) / [后](validation/v329-v332/after/archive-320.webp) |
| 跃迁 | [前](validation/v329-v332/before/jump-1280.webp) / [后](validation/v329-v332/after/jump-1280.webp) | [前](validation/v329-v332/before/jump-375.webp) / [后](validation/v329-v332/after/jump-375.webp) | [前](validation/v329-v332/before/jump-320.webp) / [后](validation/v329-v332/after/jump-320.webp) |

[概念](validation/v329-v332/concept.webp) · [八场景](validation/v329-v332/art-contact.webp) · [手机总览](validation/v329-v332/phone-overview.webp) · [逐项人工对照](validation/v329-v332/visual-inspection.md)。details/保存产线、温室与陈列细节；extras/保存真实首章、三个结局档在途阶段和出发反馈。艺术质量由这些实际画面供人工评估，不用像素断言替代。

## 本轮实际完整入口

| 阶段 | 完整命令 | 退出 | 语法/脚本/子命令 | 旧规则/旧档/原浏览器 | 新观察/新浏览器 | 实际秒 |
| --- | --- | ---: | --- | --- | --- | ---: |
| 3.29 | `node scripts/check.cjs` | 0 | 10/22/32 | 227/145/116 | 11/7 | 504.01 |
| 3.30 | `node scripts/check.cjs` | 0 | 10/22/32 | 227/145/116 | 12/10 | 507.91 |
| 3.31 | `node scripts/check.cjs` | 0 | 11/22/33 | 227/145/116 | 12/13 | 528.88 |
| 3.32 | `node scripts/check.cjs` | 0 | 11/22/33 | 227/145/116 | 12/16 | 551.01 |

每一版源码执行前后SHA256相同，完整入口没有V3_TEST_FILTER；参数矩阵另有114192报价与2592环境报价，不把它们冒充浏览器流程。3.32保留原116完整流程加16视觉流程，共132条。三结束/六章/舰装与方案/事件/图谱/远航/经营/居民/荣誉/备份恢复/跨跃迁与非法状态的原断言均保留。145是规范构造及实际引擎赚得的旧档，不是假称玩家真实旧档；schema32/存储模块/引擎字节完全相同，所有玩法配置仅GAME_VERSION变化，参见source-boundary与economy-boundary。

复现：安装仓库外Node22、Playwright1.55.0及对应Chromium/WebKit，设置CODEX_PLAYWRIGHT_PATH和必要的CODEX_CHROMIUM_PATH；执行无过滤入口。独立WebKit分别运行 `V3_BROWSER_ENGINE=webkit node tests/v3-browser.test.js` 与 `V3_BROWSER_ENGINE=webkit node tests/v3-visual.test.js`。截图工具另需CODEX_SHARP_PATH；PERF_ROOT/PERF_OUT可选同一套源码；虚拟负载使用PROFILE_SITE_ROOT/PROFILE_SOAK_SECONDS=1800，真实会话使用SOAK_SECONDS=300/SOAK_OUT。所有实际参数、退出、开始时间及散列均在JSON原始记录中。

## 最终长期负载与边界

最终profile-after-optimized在无其他本地测试运行时退出0；原3.28 reference也由相同脚本、本轮同一环境测得。60虚拟秒的前台规则步数均为240，后台均为0；前台主档保存均12次，后台周期保存均0次。

| 60虚拟秒负载 | 原3.28 TaskDuration | 最终3.32 TaskDuration | 原/新DOM观察记录 |
| --- | ---: | ---: | --- |
| home / 前台 | 136.60ms | 237.38ms | 300/301 |
| home / 后台 | 14.66ms | 13.63ms | 5/5 |
| explore / 前台 | 287.08ms | 310.37ms | 420/422 |
| explore / 后台 | 11.79ms | 22.16ms | 4/4 |

30分钟虚拟负载每5分钟GC后采样，原版活跃DOM全部2710，JS堆3.17→4.14MiB；最终版DOM范围2746～2755, JS堆3.37→4.02MiB。初始短反馈退场后节点稳定；不将GC后堆波动或这份固定负载当作所有设备无泄漏证明。虚拟负载原/新分别耗时37.13/38.89真实秒，不能冒充30分钟实际设备挂机。

最终375px另作5分钟真实时钟会话（与完整回归同机并行，属于稳定性压力而非安静CPU基准），11个采样，活跃DOM 366～366, GC后堆 2.10→2.58MiB；全程8条首页环境动画、0横向溢出、0运行时异常。该脚本与最终完整入口各自before/after源散列一致。原始real-final-soak-data.json逐点保存。

真实iPhone Safari、实际软键盘、真实低端机30分钟挂机与真实玩家私有旧档不可用，未记通过。云WebKit官方域名403保留；最终草稿PR的既有官方PW容器将独立执行116原流程和16视觉/动态流程，以对应准确head的CI结果为准，不拿云Chromium代替。所有已有v2/Firebase/部署边界与经济配置的字节/结构核对均通过。

## 提交、交付与未执行项

| 版本 | 独立提交 | 状态 |
| --- | --- | --- |
| v3.29 | 40f990d90c40cf65c3dfa66edabf732015e67bed | 完整测试后提交/推送 |
| v3.30 | 6669b7e95f9540d2fb5a42bb3e1701270564adba | 完整测试后提交/推送 |
| v3.31 | 648ba8b81c399c04e5ff6e2b335b8203260350da | 完整测试后提交/推送 |
| v3.32 | 本报告所属里程碑；精确SHA见git log与草稿PR head | 最终551.01秒完整入口与源散列核对通过后交付 |

分支 `codex/v329-v332-visual-overhaul`。最后交付会再次核对远端分支及草稿PR的准确head；GitHub完整入口、独立WebKit与最终链接以该PR checks和交付正文为准，本文件不预写尚未发生的远端成功。PR创建仅触发只读测试，不合并main、不部署、不自动ready、不改生产Firebase或玩家数据。原main仍为4d87e7f；原work/5084568保持干净。

已完成代码、实际资源、三档截图、规则/旧档/浏览器/性能、原始失败与修复、阶段提交。不可用的真实iPhone Safari、真实低端机和实际软键盘留作人工验收；艺术喜好与真机评审由上述截图和草稿PR继续评估。

## 提交后测试便携性补修（不改游戏）

复查远端设备条件时，以真实的2核报告模拟运行同一视觉套件：游戏正确选择自动关闭动态，但动画用例在手动启用完整动态前等待data-in-view，43.70秒后超时。这是测试前提问题，不是关闭降级；原文two-core-before与完整临时复现脚本均保留。

只把验证动画的两条用例改为先通过真实设置按钮开启完整动态，再等待/验证场景。低性能自动关闭用例与减少动态、后台、点击、焦点所有断言保留，不伪造高CPU或删断言。双核模拟12观察/16流程在19.82秒退出0，普通环境同套12/16在18.08秒退出0。运行文件/美术/存档/经济与3.32里程碑89698b4逐字节相同；追加test提交的准确head以PR #23为准。新head的无过滤完整入口和独立WebKit由同一只读CI执行，先前head若因新推送取消不计通过。
