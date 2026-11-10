本轮独立发布审查（2026-11-10）
原始 PR21 head 20121ba934ebbc660e7e2c5177680a83f81e8513，main 9e14610a197580d2b377dc8e2f1f8684f2c57e63。
129 文件逐项清单/哈希见 review-inventory.json：6 个运行文件，5 个测试，3 个规范档，3 个只读审计工具，11 个文档/版本说明及101个历史证据文件。所有JSON解析成功，历史最终源码哈希逐项匹配初始head；历史日志仅用于核查开发过程，不作为本轮测试结果。
运行审查：行动中心是只读派生模型，直接操作复用流水号；四段复制仅改变内存草稿，保留保存和五次确认。居民links六项前置、永久选择、独立earned、实际新交接条件、三结局与历史角色文案已审查。环境以不可取消远航serial确定，整次冻结、每段出发保存成本/调度/装备/回收；旧航程无condition继续旧规则。accepted management.active未被修改。storage WeakMap缓存按三个备份的原始字节失效；主记录expected、写后校验、恢复前保护保留。界面监听器在启动时注册，render没有新增周期注册。后台暂停250ms推进/5秒写入，恢复按原8h结算；前台按规则秒渲染。原生DOM键与输入草稿保留，手机导航留padding及安全区，SVG命中rect与键盘，CSS减少动画已核对。
阻塞发现：cleanLeg在空值校验前解引用l.condition；规范paid档副本置active.legs=[null]可复现TypeError，规则退出1/浏览器弹出损坏记录阻塞。新增独立规则与真实导出导入/刷新浏览器回归，修复前分别失败，日志保留。最小修复先拒绝空航段；恢复首航档案时先净化原件，原件损坏则在同一轮回退有效firstBonus===6收据，保证二次净化幂等且不丢永久首航前置。测试覆盖三结局×active/record/archive的9种损坏，费用不退、奖励不重放、合法永久字段保留。首次专项暴露档案回退第二次净化不同的结果，原日志亦保留。
修复提交358de6d8e215e64e86ea2980cbf7a0fdf381be35；三文件，纯引擎恢复与两项回归，不改schema、游戏版本、经济或缓存版本。
边界：根v2、全部Firebase配置/规则/函数、.github三个工作流逐字节与原main一致；未读取/修改真实玩家浏览器profile或存档。GitHub已连接账号lv5accelerator-xy有admin/maintain/push，allow_merge_commit=true，main protected=false，rulesets为空；专用branch-protection端点integration 403，不据此声称读到隐藏保护细节，实际合并由GitHubAPI按expected SHA强制检查。
环境：Node22.23.4/PW1.55.0/系统Chromium151.0.7922.173。Browser技能已读，无可调用js工具；用户显式授权独立Playwright测试，采用隔离context。云WebKit官方下载403（失败退出1）；公开Pages URL CONNECT403（curl退出56）。不绕过网络规则；使用既有GitHub CI/公开工作流作独立远端证据。无真实iPhone/软键盘/低端机/30分钟物理实机，未宣称完成。
本记录写入时无过滤全量及后续CI/发布尚在进行，结果以实际结束日志与SHA为准。
