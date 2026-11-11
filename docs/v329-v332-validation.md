# v3.29～v3.32 视觉重制验收

## 起点与边界

实际 main `4d87e7fcd835c300815b0609e0ad4bb65e13fa2d`，v3.28.0-preview.1。隔离 worktree `/workspace/starport-visual`，分支 `codex/v329-v332-visual-overhaul`。原工作区 work/5084568 保留。已读 README、AGENTS、CODEX_HANDOFF、docs/README、v3-playable、主线、v325-v328-validation 与 v328-stability-checklist。开放 #8/#12/#22 不合入；#22 是发布记录文档，不以 main 中过时的“#21未合并”说明推断实际部署。

云环境 current/ready，Node22.23.4、Playwright1.55.0、系统 Chromium151.0.7922.173。Browser 技能已读，工具发现没有可调用的 Browser js，使用本任务要求的 Playwright 隔离 context；外网由 isolate-browser 屏蔽，不连接生产 Firebase。

首次 `node scripts/check.cjs` 退出1：未设置 CODEX_PLAYWRIGHT_PATH，未运行测试。准备后相同无过滤命令实际退出0：9语法、21测试脚本、30子命令；227命名玩法规则、145规范旧档、116完整v3浏览器流程，另2参数审计/114192报价与2592环境报价。原文 [baseline.txt](validation/v329-v332/baseline.txt)，并非引用历史结果。before/ 内保存本轮原版七区域×1280/375/320共21张截图及采样元数据；原版远航/居民/档案尚无独立页面，截图是探索中对应区域。profile-before 为本轮同脚本60虚拟秒负载及30分钟虚拟挂机，不能当真机帧率或真实30分钟老化试验。

官方 WebKit2203 下载因域名策略403失败，原文 webkit-install.txt。将核对最终提交既有 GitHub 双引擎 CI；不把云 Chromium 或 Linux WebKit 当真实 iPhone Safari。

## v3.29 全局语言与结构

七种真实页面：舰队船坞与控制台、探索大图谱、远航舰桥与四段横线、居民生活与阅读栏、档案陈列、跃迁仪式、首页大场景。以原生 visuals.js 只读派生画面与入口，visual.css 管理五种语言；新的独立页面复用原函数，不复制规则。原 explore 聚合和所有原 data-action、稳定协调器、预算草稿、焦点守卫不变。初始仍仅航站/舰队两个渐进导航，不提前剧透居民与远航；后三者按真实故事开放。

本阶段使用原场景和设备线稿；原创生产插画在下一独立 v3.30 素材阶段接入，不将本阶段线稿当八张场景完成。新增11只读状态断言组与7真实浏览器流程，覆盖三个宽度七页、购买节点身份、预算草稿、Escape焦点、三个旧结局档实际远航和新档扫描。专项退出0。完整入口结果在阶段完成后填写。

本阶段冻结完整入口实际退出0：10语法、22脚本、32子命令，原227规则/145旧档/116完整流程均保留，新增11观察组和7浏览器流程通过；before/after源哈希完全相同，准确耗时见 v329-full.json。v329/ 保存阶段21截图，已查看桌面/手机；设备线稿仅是本阶段的生产控制示意。
