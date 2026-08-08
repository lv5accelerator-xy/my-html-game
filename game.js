(() => {
  "use strict";

  const numeric = globalThis.StellarMath;
  if (!numeric) {
    throw new Error("StellarMath must be loaded before game.js");
  }
  const {
    MAX_GAME_NUMBER,
    clampGameNumber,
    clampGameCount,
    safeAdd,
    safeMultiply,
    safePow,
    softCapGameNumber,
    expandSoftCappedGameNumber,
    formatNumber,
    geometricSeriesCost,
    maxAffordableGeometric,
    cappedGeometricSeriesCost,
    maxAffordableCappedGeometric,
    countFixedIntervalEvents,
  } = numeric;

  const SAVE_KEY = "stellarOutpostIdleSave_v1";
  const SAVE_BACKUP_KEYS = [
    "stellarOutpostIdleSave_v1_backup_1",
    "stellarOutpostIdleSave_v1_backup_2",
    "stellarOutpostIdleSave_v1_backup_3",
  ];
  const SAVE_BACKUP_META_KEY = "stellarOutpostIdleSave_v1_backup_at";
  const PATCH_NOTES_SEEN_KEY = "stellarOutpostIdlePatchNotesSeen";
  const PERFORMANCE_MODE_KEY = "stellarOutpostIdlePerformanceMode";
  const GAME_VERSION = "0.22.0";
  const PATCH_NOTES_VERSION = "0.22.0";
  const SAVE_VERSION = 13;
  const NUMERIC_MIGRATION_VERSION = 6;
  const BACKUP_INTERVAL = 5 * 60 * 1000;
  const BASE_MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const AUTOSAVE_INTERVAL = 10000;
  const VERSION_CHECK_INTERVAL = 3 * 60 * 1000;
  const MISSION_TOKEN_CAP = 999999;
  const EXPEDITION_SUPPLY_CAP = 9999;
  const EXPEDITION_FRAGMENT_CAP = 99999;
  const EXPEDITION_ROUTE_COUNT = 5;
  const EXPEDITION_UNLOCK_DUST = 50000;
  const MAX_EXPEDITION_ENTRY_DUST_COST = 300000000;
  const EXPEDITION_GEAR_SLOT_LIMIT = 3;
  const EXPEDITION_PRESET_COUNT = 3;
  const FLEET_COMMAND_UNLOCK_DUST = 25000;
  const FLEET_COMMAND_RESOURCE_CAP = 9999;
  const FLEET_COMMAND_PRESET_COUNT = 3;
  const FLEET_COMMAND_SWITCH_COOLDOWN = 5 * 60 * 1000;
  const FLEET_COMMAND_RECONFIGURE_COOLDOWN = 75 * 1000;
  const FLEET_CHALLENGE_ATTEMPT_LIMIT = 8;
  const QUALITY_GAME_TICK_INTERVAL = 100;
  const ECO_GAME_TICK_INTERVAL = 250;
  const QUALITY_STARFIELD_FPS = 60;
  const ECO_STARFIELD_FPS = 24;
  const MINOR_RAID_MIN_INTERVAL = 3 * 60 * 1000;
  const MINOR_RAID_MAX_INTERVAL = 11 * 60 * 1000;
  const MINOR_RAID_WARNING = 24 * 1000;
  const MAJOR_RAID_INTERVAL = 60 * 60 * 1000;
  const MAJOR_RAID_WARNING = 60 * 1000;
  const MAX_OFFLINE_MAJOR_RAIDS = 24;
  const MAX_OFFLINE_RAID_LOSS_RATIO = 0.35;
  const BUILDING_GROWTH = 1.12;
  const BUILDING_COORDINATION_DOUBLING_UNITS = 25;
  const BUILDING_COORDINATION_MULTIPLIER = 2;
  const BUILDING_COORDINATION_MAX_EXPONENT = 8;
  const MAX_AUTOMATIC_PRODUCTION_MULTIPLIER = 1000000000;
  const PRESTIGE_BASE_DUST = 25000;
  const PRESTIGE_RATIO_SOFT_CAP = 400;
  const PRESTIGE_LATE_POWER = 0.25;
  const CORE_MULTIPLIER_SOFT_CAP = 250;
  const CORE_MULTIPLIER_LATE_POWER = 0.25;
  const TRANSCEND_CORE_SOFT_CAP = 25000;
  const TRANSCEND_CORE_LATE_POWER = 0.3;
  const AUTOMATIC_RATE_SOFT_CAP = 999000;
  const AUTOMATIC_RATE_LATE_POWER = 0.28;
  const CLICK_SOFT_CAP = 1000;
  const CLICK_LATE_POWER = 0.12;
  const MAX_CLICK_VALUE = 99900;
  const COMBAT_POWER_SOFT_CAP = 1000000;
  const COMBAT_POWER_LATE_POWER = 0.18;
  const MAX_COMBAT_POWER = 999000000;
  const COMBAT_COST_SOFT_CAP = 12000000;
  const COMBAT_COST_LATE_POWER = 0.25;
  const MAX_BUILDING_UNIT_COST = 60000000;
  const MAX_COMBAT_UPGRADE_COST = 60000000;
  const DUST_RESERVE_CAP = 9999000000;
  const CAREER_DUST_CAP = 999000000;
  const CORE_RESERVE_CAP = 999000000;
  const ENDGAME_RESOURCE_CAP = 999000000;
  const BGM_PLAYLIST_SELECTION = "playlist";
  const BGM_TRACKS = Object.freeze([
    Object.freeze({
      id: "outpost-beyond-orion",
      title: "猎户座外的前哨",
      src: "assets/outpost-beyond-orion.mp3?v=0.22.0",
      loopStartSeconds: 0.2,
      loopEndTrimSeconds: 3.7,
    }),
    Object.freeze({
      id: "outpost-beyond-orion-2",
      title: "猎户座外·静默航线",
      src: "assets/outpost-beyond-orion-2.mp3?v=0.22.0",
      loopStartSeconds: 0.1,
      loopEndTrimSeconds: 2.6,
    }),
    Object.freeze({
      id: "signal-at-kestrel-nine",
      title: "红隼九号信号",
      src: "assets/signal-at-kestrel-nine.mp3?v=0.22.0",
      loopStartSeconds: 0.7,
      loopEndTrimSeconds: 0,
    }),
    Object.freeze({
      id: "signal-at-kestrel-nine-2",
      title: "红隼九号·深空回声",
      src: "assets/signal-at-kestrel-nine-2.mp3?v=0.22.0",
      loopStartSeconds: 0.7,
      loopEndTrimSeconds: 2,
    }),
  ]);
  const LEGACY_DUST_SOFT_CAP = 10000000;
  const LEGACY_DUST_LATE_POWER = 0.1;
  const LEGACY_CORE_SOFT_CAP = 5000;
  const LEGACY_CORE_LATE_POWER = 0.25;
  const CRESCENT_MISSION_GOALS = Object.freeze({
    manualClicks: 28,
    skirmishWins: 1,
    starportUpgrades: 1,
  });
  const STARFALL_DAY_MS = 24 * 60 * 60 * 1000;
  const STARFALL_EVENT_START = Date.UTC(2026, 7, 8, 0, 0, 0);
  const STARFALL_EVENT_END = Date.UTC(2026, 7, 23, 0, 0, 0);
  const STARFALL_EXCHANGE_END = Date.UTC(2026, 8, 23, 0, 0, 0);
  const STARFALL_CURRENCY_CAP = 99999;
  const STARFALL_DAILY_REWARD = 240;
  const STARFALL_LETTER_REWARD = 100;
  const STARFALL_CATCHUP_DAYS = 3;
  const PRIMARY_PAGES = [
    "command",
    "fleet",
    "starport",
    "research",
    "core-shop",
    "combat",
    "expedition",
    "starfall",
    "missions",
    "transcend",
    "leaderboard",
  ];
  const PATCH_NOTES = [
    {
      version: "0.22.0",
      theme: "产能重构",
      changes: [
        "自动产量改为先汇总设施原始产能，再对全舰队进行一次平滑软上限折算；高阶设施、研究和永久增幅不会再被单设施对数公式抹平。",
        "原先每 10 个设施突然翻倍的编队断层改为连续协同曲线：每 25 个单位平滑翻倍，最高提供 ×256 协同。",
        "舰队卡片新增所选批量的真实收益预览，直接显示购买前后总产量与净增量，最大购买不再错误展示下一台的收益。",
        "研究终端重做为信标回收、自治舰群、轨道工业与边境物理四条研究链，新增前置科技、分支进度、可研究数量与精确收益预览。",
        "顶栏音乐播放器新增曲目下拉框，可直接切换自动轮播或四首单曲，并与设置菜单实时同步。",
        "旧存档中的 12 项研究 ID 全部保留；已完成研究不会丢失，也不会因新增前置条件被撤销。",
      ],
    },
    {
      version: "0.21.1",
      theme: "顶栏乐章",
      changes: [
        "背景音乐播放器从设置菜单移到顶栏操作音效按钮左侧，音乐开关随时可见。",
        "播放器持续显示当前播放曲名；自动轮播切歌、手动选曲和读取存档后都会立即更新。",
        "选曲与音量仍保留在设置菜单，避免顶栏承载过多操作。",
        "手机端缩短播放器宽度并省略辅助标签，仍保留当前曲名且不造成页面横向溢出。",
      ],
    },
    {
      version: "0.21.0",
      theme: "深空声轨",
      changes: [
        "背景音乐替换为仓库作者原创制作的四首深空乐章，并移除最早的原航站乐章。",
        "设置菜单新增背景音乐选择，可使用四首自动轮播，也可固定播放任意单曲。",
        "曲目选择写入本地与云端存档；今后增加新 MP3 只需登记曲目信息即可加入播放列表。",
        "《Outpost Beyond Orion》循环时会跳过开头约 0.2 秒与结尾约 3.7 秒静音，减少每轮之间的明显停顿。",
        "默认音量继续保持 22%，音频回归检查覆盖播放列表、选曲存档与循环参数。",
      ],
    },
    {
      version: "0.20.1",
      theme: "星尘储量扩容",
      changes: [
        "星尘储量上限由 999M 提高至 9999M，延长后期挂机、舰队建设、星港升级与活动兑换的连续操作空间。",
        "顶部星尘储量在超过 999M 后继续使用 M 单位显示，最高明确显示为 9999M。",
        "可用星尘、本轮星尘、历史星尘、星区星尘和旧存档清洗统一使用新上限，避免重新载入后被截回 999M。",
        "生涯星尘排行榜继续保持 999M 统计上限，防止扩容影响既有榜单排序与 Firestore 校验。",
        "回归测试新增 9999M 存档清洗、界面显示和生涯统计独立封顶检查。",
      ],
    },
    {
      version: "0.20.0",
      theme: "星雨寄航",
      changes: [
        "英仙座流星雨限时活动于 8 月 8 日开启、持续至 8 月 22 日；奖励兑换保留至 9 月 22 日。",
        "新增每日三选一星路任务，并保留最近三天的追赶机会；采集、值守、手动回收、作业、战斗与远征均可参与。",
        "新增七封星雨信笺、活动里程碑与单一货币“星雨余辉”，避免额外堆叠复杂资源。",
        "新增流星尾迹、英仙夜航、纪念卡与纯收藏纪念物；活动奖励不提供永久数值倍率。",
        "活动结束后停止获得余辉，但已参与玩家仍可阅读信笺，并在一个月兑换期内使用剩余余辉。",
      ],
    },
    {
      version: "0.19.1",
      theme: "航站通讯中心",
      changes: [
        "设置菜单新增航站公告入口，公告由 Firebase 读取并按发布时间由新到旧排列。",
        "重要公告会在每台设备首次读取时自动打开一次；普通公告通过未读数量提醒，不打断挂机流程。",
        "新增游戏内问题反馈表单：登录玩家可选择 Bug、数值、体验或玩法建议，内容直接发送到开发者 Firebase 控制台。",
        "反馈不会上传完整存档；玩家不能读取、修改或删除任何反馈记录，公告客户端也没有发布权限。",
        "新增公告发布说明与 Firestore 安全规则，手机端通讯中心采用单列自适应布局。",
      ],
    },
    {
      version: "0.19.0",
      theme: "航站作业与渐进指引",
      changes: [
        "指挥台新增航站作业台：选择连续作业或安排 30 分钟订单，在线与离线使用同一套进度结算。",
        "五项作业拥有固定 30 级专精与共享工程池，不设分支加点；工程池里程碑提供小幅速度、队列和专精效率提升。",
        "新增六类工程组件，可直接转换为舰队整备、指挥数据、远征碎片和既有星港材料，不另开永久倍率货币。",
        "默认启用渐进导航，未到阶段的复杂系统暂不显示；设置中可随时切换为完整导航。",
        "指挥台新增单一‘当前建议’，并为航站作业加入首次解锁说明，减少同时处理多套系统的压力。",
        "存档结构升级至第 12 版；旧存档会自动补齐作业与引导数据，不重置任何既有进度。",
      ],
    },
    {
      version: "0.18.0",
      theme: "舰队编成",
      changes: [
        "新增工业、守备与远征三支舰队，现有自动化设施会按当前方案分配，不需要从头购买另一套单位。",
        "新增 3 套可保存编成方案，可配置部署重心、阵型、武器和战术指令；切换与重编需要指挥数据并有整备冷却。",
        "敌方相位护盾、蜂群集群与重型装甲需要对应武器和阵型克制，战斗结果不再只比较总战斗力。",
        "新增弹药、维护件与指挥数据三类整备资源，可用星尘和星港建材补充，持续回收后期库存。",
        "新增每周固定规则舰队演习，记录完成时间、舰损、资源效率与综合评分，并保存本周最佳 8 次战术记录。",
        "每周首胜和刷新个人最佳可获得远征补给、星图残片、航站凭证、星港建材与纯收藏舰队徽记，不增加永久倍率。",
        "存档结构升级至第 11 版；旧存档会自动获得三套默认方案和首批整备物资。",
      ],
    },
    {
      version: "0.17.3",
      theme: "云存档数据兼容",
      changes: [
        "修复远征配装预设产生嵌套数组后，Firestore 返回“存档包含云端无法识别数据”并拒绝上传的问题。",
        "云端存档正文改用 JSON 字符串信封传输，避开 Firestore 对嵌套数组的限制，同时保持完整游戏数据不变。",
        "继续兼容读取旧版对象格式云存档；玩家无需迁移或重置，本地存档与已有云端记录均会保留。",
        "新增云存档体积保护，超过安全上限时会明确提示，并始终优先保护本地进度。",
      ],
    },
    {
      version: "0.17.2",
      theme: "云端存档修复",
      changes: [
        "修复部分新账号登录成功后，首次云端存档仍被 Firestore 规则拒绝的问题。",
        "云存档规则继续严格限制每个账号只能读写自己的记录，同时改用跨版本稳定的存档信封校验，避免新增游戏字段误伤合法存档。",
        "遇到权限拒绝时会自动刷新一次登录令牌并重试，减少长时间挂机后身份状态过期造成的同步失败。",
        "云端错误提示新增登录过期、连接超时、服务不可用、配额不足与数据格式异常等具体原因。",
        "本地自动存档不受云端状态影响；修复后重新打开游戏或点击上传即可补建缺失的云端记录。",
      ],
    },
    {
      version: "0.17.1",
      theme: "远征排行榜",
      changes: [
        "星海排行榜新增完整远征、机制首领击破与远征遗物三项分类，可与其他指挥官比较远征长期记录。",
        "排行榜个人数据区扩展为六项永久记录，并显示远征完成次数、首领总击破数与遗物图鉴进度。",
        "云端榜单文档新增三项只增不减字段；旧榜单记录会按 0 兼容，并在新版客户端首次同步时自动补齐。",
        "Firestore 安全规则同步扩展，继续限制玩家只能写入自己的记录，并阻止已发布远征成绩被调低。",
        "手机版排行榜保持三列分类按钮与单列个人卡片，不产生横向页面滚动。",
      ],
    },
    {
      version: "0.17.0",
      theme: "伴星观测日志",
      changes: [
        "新增 8 组伴星观测事件：点击指挥台上已经唤醒的伴星，可选择不同的接触与记录方式。",
        "每项选择会留下不同的永久观测日志；日志属于收藏内容，不提供永久产量或战斗倍率。",
        "新增观测信号资源，奇点坍缩、完整远征和每日总委托会补充信号，防止重复点击无限领取奖励。",
        "首次完成观测可获得星图残片、远征补给、航站凭证、星港材料或限额星尘补给，整体奖励适度提高。",
        "指挥台新增伴星观测站与 8 格日志图鉴，首页可直接查看信号余额、事件选择、收集进度和历史结果。",
        "每日与每周委托池加入伴星观测目标；存档结构升级至第 10 版，旧存档会按已唤醒伴星补发观测信号。",
      ],
    },
    {
      version: "0.16.0",
      theme: "星港配装与机制首领",
      changes: [
        "新增 12 件远征舰装与 3 套配装预设；启航前从已解锁舰装中选择 3 件，配装会在本局锁定。",
        "舰装可稳定反制敌方词条、修复船体或改变战利品结构，形成武器、防御、导航与后勤之间的取舍。",
        "第五航段改为两阶段机制首领战，玩家每阶段可选择强攻、压制或整备，三名首领拥有不同弱点与战场机制。",
        "首次击败首领会解锁两件专属舰装蓝图；重复击败会奖励星图残片、远征补给和六类星港材料。",
        "完整远征基础奖励提高，失败仍可带回一半随船货物；新增配装和首领相关每日、每周委托。",
        "存档结构升级至第 9 版，旧存档会自动获得基础舰装与三套默认预设。",
      ],
    },
    {
      version: "0.15.2",
      theme: "生产曲线校正",
      changes: [
        "舰队设施改为各自独立结算后期产量，购买新设施不会再让既有设施的显示或实际贡献下降。",
        "研究、星核里程碑、超越协议和星港生产倍率在常规区间严格使用乘法叠加，不再被全舰队软上限提前削弱。",
        "新增设施规模协同：同类设施每达到 10 个，该设施整条生产线再 ×2，最多触发 20 档，让高价旧设施继续产生可见回报。",
        "设施卡片改为显示下一单位的真实边际增量，购买提示继续显示总产量升级前后差值。",
        "奇点超越解锁与首次坍缩门槛由 5K 历史星核调整为 150 历史星核。",
        "远征启航按约 3 分钟当前产量回收星尘，后期费用上限提高至 300M，承担恢复产量后的持续资源消耗。",
      ],
    },
    {
      version: "0.15.0",
      theme: "星区远征",
      changes: [
        "新增五航段短局制星区远征，每一航段从三条路线中选择，并根据成功率、船体损伤与战利品决定风险。",
        "敌方会携带相位护盾、蜂群编队、过载核心等词条；临时远征协议可以针对性克制，离开本局后全部清除。",
        "远征奖励以星图残片、远征补给、纯收藏遗物和信标外观为主，不提供永久产量或战斗倍率。",
        "新增材料与补给消耗：启航、路线重扫描、船体维修及外观解锁会持续回收后期库存。",
        "存档结构升级至第 8 版，并新增远征桌面、手机布局和旧存档迁移回归测试。",
      ],
    },
    {
      version: "0.14.0",
      theme: "航站委托与热更新提示",
      changes: [
        "新增每日与每周航站委托，任务只记录生成后的行为增量，并优先从已经解锁的玩法中选择。",
        "每日完成任意 3 项即可领取总奖励；每周设置 2、4、5 项三档里程碑，减少强制清空任务的压力。",
        "新增航站凭证及资源兑换项，可换取星尘整备包、星港材料箱与舰队紧急整备。",
        "新增首页版本标记后台检查：启动、定时与返回前台时发现新版本，会先保存进度再重新载入。",
        "存档结构升级至第 7 版，旧存档会补建当前周期委托，不会重复执行 v0.13.0 的数值折算。",
      ],
    },
    {
      version: "0.13.8",
      theme: "指挥台实体伴星",
      changes: [
        "已经唤醒的奇点伴星会作为实体天体出现在指挥台信标周围，不再只存在于超越页文字图鉴中。",
        "八只伴星拥有各自的颜色、光晕、轨道半径与运行节奏，并会随收藏进度逐只加入航迹。",
        "点击或触摸伴星可查看名称与介绍；伴星继续保持纯观赏设定，不提供数值加成。",
        "移动端省电模式会冻结伴星轨道但保留实体显示，高画质模式下恢复缓慢运行。",
      ],
    },
    {
      version: "0.13.7",
      theme: "舰队产量成长修复",
      changes: [
        "修复自动产量达到 999K/秒后被硬上限锁死、继续扩建舰队不再增长的问题。",
        "999K/秒以上改用缓慢的对数递减曲线，后期升级仍会产生实际收益，同时将极端产量控制在 M 级。",
        "顶部与舰队卡片提高产量显示精度，小幅增量不再被缩写四舍五入隐藏。",
        "购买舰队设施后会明确显示升级前后产量与本次每秒增量。",
      ],
    },
    {
      version: "0.13.6",
      theme: "后期容量与战斗信息修复",
      changes: [
        "星尘储量上限由 100M 提高至 999M，后期挂机与舰队 ×10／最大购买不再过早受限，同时继续避免进入 B 级数字。",
        "舰队设施改为显示经过全部增幅和后期软上限后的实际产量贡献，卡片合计会与顶部自动产量一致。",
        "修复战斗页近域战利品库存首次为空、获得材料后数字不及时更新的问题。",
        "奇点坍缩除碎片外新增永久收藏伴星，每次坍缩会唤醒一只纯观赏伴星。",
      ],
    },
    {
      version: "0.13.5",
      theme: "全局深空雷达刷新修复",
      changes: [
        "修复离开指挥台后，深空雷达标题、事件状态与倒计时停止刷新的问题。",
        "深空雷达恢复为全局航站组件，在舰队、星港、研究、星核、战斗、超越与排行榜页面都会正常同步。",
        "页面切换会立即刷新当前雷达状态，随机事件出现、消失和临时增幅提示不再滞留旧内容。",
        "保留 v0.13.3 的当前功能页独占重绘与移动端省电策略，未恢复隐藏页面的高成本列表刷新。",
      ],
    },
    {
      version: "0.13.4",
      theme: "星港专属供应链",
      changes: [
        "六座星港建筑现在各自消耗一种专属材料，并同时需要大量星尘完成建设或强化。",
        "六类近域清剿目标各自固定产出一种对应材料，目标与建筑形成一对一供应链。",
        "新增护盾棱镜与相位传感器；旧存档中的合金、晶体、芯片与构件会完整保留。",
        "修复星港生产与战斗增幅被后期软上限提前压缩的问题，标注的每级增幅会在压缩后生效。",
        "星港按钮会同时显示星尘和材料需求，强化完成提示会显示实际生效的当前增幅。",
      ],
    },
    {
      version: "0.13.3",
      theme: "移动端省电与低温运行",
      changes: [
        "手机与触控设备首次运行默认启用省电模式，设置中可随时切换省电与高画质。",
        "省电模式将星空限制为 24 FPS、1 倍像素密度和最多 72 颗星；高画质也封顶为 60 FPS。",
        "游戏逻辑改为省电模式每秒 4 次、高画质每秒 10 次，并按真实时间差精确结算收益。",
        "周期刷新只重绘当前功能页；后台时停止游戏计时器与星空循环，返回后统一补算后台收益。",
        "省电模式关闭大面积动态渐变、环境光晕与背景模糊，降低移动端 CPU 和 GPU 持续占用。",
      ],
    },
    {
      version: "0.13.2",
      theme: "奇点解锁显示修复",
      changes: [
        "修复历史星核达到 5K 后，奇点超越页仍显示未解锁遮罩的问题。",
        "统一隐藏元素的样式优先级，避免组件布局样式覆盖 hidden 状态。",
        "浏览器回归测试现在会验证锁定卡与超越内容的实际可见性。",
        "存档结构继续使用第 6 版，玩家现有的历史星核与全部进度无需迁移。",
      ],
    },
    {
      version: "0.13.1",
      theme: "舰队购买上限修复",
      changes: [
        "舰队设施单座价格最高为 60M，100M 星尘储量下不再出现永久无法购买的设施。",
        "×10 与最大购买会逐座计算价格上限，无法通过批量购买绕过后期成本。",
        "舰炮与基地防御的单级强化价格同步封顶为 60M，避免每级耗尽全部储量。",
        "保留 v0.13.0 的数值压缩、近域掉落、存档迁移和原创背景音乐。",
      ],
    },
    {
      version: "0.13.0",
      theme: "近域补给与后期数值压缩",
      changes: [
        "近域清剿的基础材料掉落提高约 2 至 3 倍，量子芯片与异星构件不再出现成功后掉落 0 个的空奖励。",
        "后期设施、研究和战斗强化需求压回百万级，终局解锁由 1M 历史星核下调至 5K。",
        "自动与手动产量、战力、轮回和超越倍率加入更强递减，星尘储量上限调整为 100M 以内。",
        "边境星区改为统计本星区新增星尘、自动化单元或战斗胜场，不再要求 1E、1T 等膨胀数值。",
        "第 6 版存档会一次性折算旧版超大数值，但保留建筑、研究、材料、战绩、星港与超越进度。",
      ],
    },
    {
      version: "0.12.1",
      theme: "自定义航站乐章",
      changes: [
        "使用随游戏发布的 MP3 音轨替换原有程序化深空乐章。",
        "背景音乐继续支持循环播放、独立开关和音量调节。",
        "浏览器阻止自动播放时，会在首次点击或键盘操作后启动音乐。",
        "保留 v0.12.0 的云存档、星港、离线袭击和排行榜功能，存档结构仍为第 5 版。",
      ],
    },
    {
      version: "0.12.0",
      theme: "星海排行榜",
      changes: [
        "新增星海排行榜页面，支持累计星尘、最高综合战力与战斗次数三种排名。",
        "新增跨奇点超越永久保留的生涯累计记录，旧存档会从当前有效进度自动补齐。",
        "登录并确认云存档后自动发布成绩；排行榜只显示游戏内玩家名称，不显示账号邮箱。",
        "排行榜成绩只增不减，清空全部进度时会同步删除当前账号的榜单记录。",
      ],
    },
    {
      version: "0.11.1",
      theme: "月牙信号引导优化",
      changes: [
        "首次完成奇点超越后会停留在超越界面，并提示玩家寻找其中出现的异常信号。",
        "隐藏月牙信号移动至更容易看到的位置，并增加文字标识、亮度与雷达脉冲效果。",
        "彩蛋任务条件、感谢信内容与存档进度保持不变。",
      ],
    },
    {
      version: "0.11.0",
      theme: "深空态势与双层袭击",
      changes: [
        "重绘动态星空表现，加入蓝紫星云、科技网格、星光闪烁与偶发流星。",
        "小规模基地袭击改为时间跨度更大的随机遭遇，不再按照短周期频繁出现。",
        "新增每小时一次的大袭击；已解锁战斗后，离线期间同样会按周期结算攻防结果。",
        "离线报告会汇总大袭击胜负与资源变化，同时限制单次离线结算的累计掠夺比例。",
      ],
    },
    {
      version: "0.10.1",
      theme: "云端窗口状态修复",
      changes: [
        "修复账号已经连接并完成同步后，窗口仍持续显示“正在连接”动画的问题。",
        "连接状态现在会正确切换至账号信息、同步状态与云存档操作区域。",
        "本次修复不改变玩家存档、云端数据、同步周期或 Firebase 安全规则。",
      ],
    },
    {
      version: "0.10.0",
      theme: "账号与云端航站",
      changes: [
        "新增 Google 账号登录与跨设备云端存档入口；登录密码只在 Google 的安全页面中处理。",
        "本地自动存档继续作为离线主体，连接账号后可手动或定时同步至个人云端航站。",
        "云存档使用修订号检测多设备覆盖，发生冲突时由玩家选择保留本地或云端进度。",
        "加入独立的 Firestore 所有者规则，未连接云服务时会安全回退到原有本地存档。",
      ],
    },
    {
      version: "0.9.4",
      theme: "超越后的隐藏信号",
      changes: [
        "首次完成奇点超越后，星港中可能出现一段未登记的隐藏内容。",
        "彩蛋包含一项隐藏任务与一封特殊来信；触发方式和完成条件请自行探索。",
        "隐藏内容会随本地存档保存，已经超越过的旧存档同样可以发现。",
      ],
    },
    {
      version: "0.9.3",
      theme: "游戏内版本更新记录",
      changes: [
        "每次版本更新后首次进入游戏时，自动显示当期版本说明。",
        "右上角菜单新增“版本更新记录”，可随时重新查看全部更新。",
        "更新内容按新版本到旧版本排列，并在最新版本上显示醒目标记。",
        "已读版本只记录在当前设备，不改变游戏数值或存档结构。",
      ],
    },
    {
      version: "0.9.2",
      theme: "移动端触控与横向滚动适配",
      changes: [
        "连续点击中央信标不再触发移动浏览器的双击智能缩放。",
        "限制页面横向溢出与边缘回弹，同时保留纵向滚动和双指缩放。",
        "移除 320px 强制最小宽度，兼容更窄的手机视口。",
      ],
    },
    {
      version: "0.9.1",
      theme: "后期数值收敛",
      changes: [
        "跃迁、星核、奇点碎片和星区倍率加入平滑软上限。",
        "战斗成长与战利品改用递减曲线，避免轮回后战斗过于简单。",
        "星港建筑增幅和材料成本重新平衡，继续承担资源回收作用。",
      ],
    },
    {
      version: "0.9.0",
      theme: "轨道星港与近域清剿",
      changes: [
        "新增带原创贴图、指示线和六个附属建筑栏位的星港页面。",
        "加入生产与战斗类星港建筑，以及四类专用建材。",
        "新增六类初级主动战斗目标，掉落材料用于强化星港。",
      ],
    },
    {
      version: "0.8.0",
      theme: "奇点超越与无限边境",
      changes: [
        "新增第三层轮回“奇点坍缩”和永久奇点碎片。",
        "加入六条超越协议，可强化生产、星核、战斗和后续坍缩。",
        "新增可循环挑战的无限边境星区与终局成长目标。",
      ],
    },
    {
      version: "0.7.1",
      theme: "后台收益、存档韧性与数值安全",
      changes: [
        "后台收益统一按离线规则结算，并限制最长累计时间。",
        "加入三份自动轮换存档备份和损坏存档自动恢复。",
        "为后期资源、价格和战力加入有限值保护与科学计数显示。",
      ],
    },
    {
      version: "0.7.0",
      theme: "轮回与战斗平衡、终局回收链",
      changes: [
        "轮回后自动化设施重建成本提高，历史星核收益改为递减曲线。",
        "强化敌人成长、限制最高胜率并下调重复战斗奖励。",
        "新增后期自动化设施、研究和多项资源回收渠道。",
      ],
    },
    {
      version: "0.6.3",
      theme: "分页导航与滚动体验优化",
      changes: [
        "主要系统改为顶部分页导航，一次只显示当前功能页面。",
        "导航栏在滚动时保持可见，并记住上次停留的页面。",
        "移动端采用紧凑导航布局，减少长页面连续滚动。",
      ],
    },
    {
      version: "0.6.2",
      theme: "玩家名称与入口优化",
      changes: [
        "玩家首次开始游戏时可建立指挥官名称。",
        "右上角菜单支持随时改名，名称随本地存档保存。",
        "游戏发行入口调整为一眼可识别的开始游戏文件。",
      ],
    },
    {
      version: "0.6.1",
      theme: "版本规范与开始游戏入口",
      changes: [
        "开始游戏按钮文案统一，不再使用文明名称作为入口。",
        "确立补丁、次版本和正式版的版本号规则。",
        "规定每次正式版本更新都必须同步追加 Patch Notes。",
      ],
    },
    {
      version: "0.6.0",
      theme: "星核经济与后期超越",
      changes: [
        "加强轮回奖励并加入星核兑换商店。",
        "新增永久强化、里程碑和更长的后期成长路线。",
        "扩展终局目标，提高挂机循环的长期可玩性。",
      ],
    },
    {
      version: "0.5.0",
      theme: "边境战斗",
      changes: [
        "新增舰队攻击力、基地防御与资源强化系统。",
        "加入基地袭击事件，防守失败会损失部分资源。",
        "支持主动攻击行星怪物并获得战斗奖励。",
      ],
    },
    {
      version: "0.4.0",
      theme: "原创深空音乐",
      changes: [
        "加入原创深空管风琴氛围音乐，不使用受版权保护的影视原声。",
        "提供背景音乐开关和音量调节。",
        "音乐设置随本地存档保存。",
      ],
    },
    {
      version: "0.3.0",
      theme: "数字显示修复",
      changes: [
        "修复价格和产量末位数字被截断的问题。",
        "统一大数缩写、整数和小数的显示规则。",
        "改善设施卡片数值区域的宽度与对齐。",
      ],
    },
    {
      version: "0.2.0",
      theme: "新手体验与界面升级",
      changes: [
        "新增分步新手指引，可从菜单随时重新打开。",
        "全局字体放大至初版约 125%，提高可读性。",
        "修复右上角菜单被下方内容遮挡的问题。",
      ],
    },
    {
      version: "0.1.0",
      theme: "初始航站",
      changes: [
        "完成纯 HTML、CSS 与 JavaScript 的离线挂机游戏。",
        "加入手动采集、自动化设施、研究、成就、轮回和本地存档。",
        "建立《星港拾荒者》的基础视觉与数值循环。",
      ],
    },
  ];

  const BUILDINGS = [
    {
      id: "drone",
      name: "拾荒无人机",
      icon: "⌁",
      description: "在近地轨道搜寻散落的合金与星尘。",
      baseCost: 15,
      baseRate: 0.3,
      unlock: 0,
    },
    {
      id: "sail",
      name: "光帆采集器",
      icon: "◇",
      description: "以恒星风驱动大面积静电捕获网。",
      baseCost: 110,
      baseRate: 1.4,
      unlock: 60,
    },
    {
      id: "lab",
      name: "晶体分析舱",
      icon: "⬡",
      description: "从陨晶碎片中分离高纯度星尘。",
      baseCost: 800,
      baseRate: 6.5,
      unlock: 500,
    },
    {
      id: "forge",
      name: "量子熔铸站",
      icon: "◫",
      description: "折叠微观空间，重铸失落的轨道残骸。",
      baseCost: 5500,
      baseRate: 28,
      unlock: 4000,
    },
    {
      id: "relay",
      name: "深空中继环",
      icon: "◎",
      description: "接入远方无人舰队的共享回收网络。",
      baseCost: 32000,
      baseRate: 120,
      unlock: 25000,
    },
    {
      id: "dyson",
      name: "戴森收束阵列",
      icon: "☼",
      description: "截取恒星能量，将光直接凝聚为物质。",
      baseCost: 180000,
      baseRate: 520,
      unlock: 140000,
    },
    {
      id: "ringYard",
      name: "行星环拆解场",
      icon: "◑",
      description: "从行星环中分拣冰晶、稀有金属与远古残骸。",
      baseCost: 850000,
      baseRate: 2200,
      unlock: 650000,
    },
    {
      id: "riftNet",
      name: "裂隙捕获网",
      icon: "⌬",
      description: "在空间裂隙边缘截获被潮汐撕碎的漂流物资。",
      baseCost: 2600000,
      baseRate: 6500,
      unlock: 1900000,
    },
    {
      id: "horizonMine",
      name: "视界潮汐矿场",
      icon: "◉",
      description: "利用黑洞潮汐力拆解高密度天体并回收奇异物质。",
      baseCost: 7200000,
      baseRate: 16000,
      unlock: 5200000,
    },
    {
      id: "cosmicLoom",
      name: "宇宙弦织取机",
      icon: "≋",
      description: "沿宇宙弦抽取真空涨落，将其编织成稳定星尘。",
      baseCost: 16000000,
      baseRate: 36000,
      unlock: 11500000,
    },
  ];

  const RESEARCH_BRANCHES = [
    {
      id: "salvage",
      name: "信标回收",
      icon: "✦",
      description: "强化主动采集与信标响应。",
    },
    {
      id: "automation",
      name: "自治舰群",
      icon: "⌁",
      description: "扩展无人系统与基础采集链。",
    },
    {
      id: "industry",
      name: "轨道工业",
      icon: "◎",
      description: "提高加工、中继与全局生产效率。",
    },
    {
      id: "frontier",
      name: "边境物理",
      icon: "◉",
      description: "解锁后期设施的专属增幅。",
    },
  ];

  const UPGRADES = [
    {
      id: "gloves",
      name: "磁力手套",
      icon: "✧",
      description: "手动回收产量 ×2",
      branch: "salvage",
      tier: 1,
      requires: [],
      cost: 40,
      unlock: 20,
      effect: { click: 2 },
    },
    {
      id: "scanner",
      name: "脉冲扫描仪",
      icon: "⌖",
      description: "手动回收产量 ×3",
      branch: "salvage",
      tier: 2,
      requires: ["gloves"],
      cost: 320,
      unlock: 180,
      effect: { click: 3 },
    },
    {
      id: "droneAi",
      name: "无人机群智",
      icon: "⌁",
      description: "拾荒无人机原始产量 ×2",
      branch: "automation",
      tier: 1,
      requires: [],
      cost: 520,
      unlock: 300,
      effect: { building: "drone", multiplier: 2 },
    },
    {
      id: "solarLens",
      name: "超薄聚光层",
      icon: "◈",
      description: "光帆采集器原始产量 ×2",
      branch: "automation",
      tier: 2,
      requires: ["droneAi"],
      cost: 2500,
      unlock: 1800,
      effect: { building: "sail", multiplier: 2 },
    },
    {
      id: "zeroG",
      name: "零重力流水线",
      icon: "∞",
      description: "所有设施原始产量 ×1.5",
      branch: "automation",
      tier: 3,
      requires: ["solarLens"],
      cost: 12000,
      unlock: 8500,
      effect: { global: 1.5 },
    },
    {
      id: "crystalResonance",
      name: "陨晶共振",
      icon: "⬡",
      description: "分析舱与熔铸站原始产量 ×2",
      branch: "industry",
      tier: 1,
      requires: [],
      cost: 60000,
      unlock: 45000,
      effect: { buildings: ["lab", "forge"], multiplier: 2 },
    },
    {
      id: "relayProtocol",
      name: "中继共享协议",
      icon: "◎",
      description: "深空中继环原始产量 ×3",
      branch: "industry",
      tier: 2,
      requires: ["crystalResonance"],
      cost: 260000,
      unlock: 190000,
      effect: { building: "relay", multiplier: 3 },
    },
    {
      id: "timeFold",
      name: "局部时间折叠",
      icon: "◌",
      description: "所有设施原始产量 ×2",
      branch: "industry",
      tier: 3,
      requires: ["relayProtocol"],
      cost: 1100000,
      unlock: 800000,
      effect: { global: 2 },
    },
    {
      id: "ringDismantling",
      name: "星环剥离协议",
      icon: "◑",
      description: "行星环拆解场原始产量 ×2",
      branch: "frontier",
      tier: 1,
      requires: [],
      cost: 4200000,
      unlock: 3000000,
      effect: { building: "ringYard", multiplier: 2 },
    },
    {
      id: "riftHarmonics",
      name: "裂隙谐振捕获",
      icon: "⌬",
      description: "裂隙捕获网原始产量 ×2",
      branch: "frontier",
      tier: 2,
      requires: ["ringDismantling"],
      cost: 12000000,
      unlock: 8000000,
      effect: { building: "riftNet", multiplier: 2 },
    },
    {
      id: "horizonAnchors",
      name: "事件视界锚定",
      icon: "◉",
      description: "视界潮汐矿场原始产量 ×2",
      branch: "frontier",
      tier: 3,
      requires: ["riftHarmonics"],
      cost: 36000000,
      unlock: 24000000,
      effect: { building: "horizonMine", multiplier: 2 },
    },
    {
      id: "cosmicReclamation",
      name: "终末回收协议",
      icon: "≋",
      description: "宇宙弦织取机原始产量 ×3",
      branch: "frontier",
      tier: 4,
      requires: ["horizonAnchors"],
      cost: 78000000,
      unlock: 50000000,
      effect: { building: "cosmicLoom", multiplier: 3 },
    },
  ];

  const ACHIEVEMENTS = [
    {
      id: "firstSignal",
      name: "第一道信号",
      icon: "✦",
      description: "完成首次手动回收",
      test: (s) => s.lifetimeClicks >= 1,
    },
    {
      id: "dustPocket",
      name: "口袋里的星河",
      icon: "⋯",
      description: "累计获得 1,000 星尘",
      test: (s) => s.lifetimeDust >= 1000,
    },
    {
      id: "smallFleet",
      name: "小型舰队",
      icon: "⌁",
      description: "拥有 25 个自动化单元",
      test: (s) => getTotalUnits(s) >= 25,
    },
    {
      id: "steadyFlow",
      name: "涓流成河",
      icon: "↟",
      description: "自动产量达到每秒 100",
      test: (s) => calculateRate(s, false) >= 100,
    },
    {
      id: "industrialOrbit",
      name: "轨道工业带",
      icon: "◎",
      description: "拥有 100 个自动化单元",
      test: (s) => getTotalUnits(s) >= 100,
    },
    {
      id: "millionaire",
      name: "百万星尘",
      icon: "M",
      description: "累计获得 1,000,000 星尘",
      test: (s) => s.lifetimeDust >= 1e6,
    },
    {
      id: "newHorizon",
      name: "新地平线",
      icon: "◒",
      description: "完成第一次深空跃迁",
      test: (s) => s.rebirths >= 1,
    },
    {
      id: "coreCluster",
      name: "星核集群",
      icon: "✣",
      description: "历史累计获得 10 枚星核",
      test: (s) => (s.totalCores || s.cores) >= 10,
    },
    {
      id: "dysonAge",
      name: "恒星纪元",
      icon: "☼",
      description: "建造第一座戴森收束阵列",
      test: (s) => (s.buildings.dyson || 0) >= 1,
    },
    {
      id: "borderGuardian",
      name: "边境守望",
      icon: "⬡",
      description: "成功抵御第一次基地袭击",
      test: (s) => (s.combat?.raidsSurvived || 0) >= 1,
    },
    {
      id: "planetHunter",
      name: "行星猎手",
      icon: "◎",
      description: "主动战斗累计获胜 10 次",
      test: (s) => (s.combat?.activeWins || 0) >= 10,
    },
    {
      id: "firstModule",
      name: "第一座附属站",
      icon: "⌬",
      description: "建造第一座星港附属建筑",
      test: (s) => getTotalStarportRanks(s) >= 1,
    },
    {
      id: "localSweeper",
      name: "近域清道夫",
      icon: "⌖",
      description: "完成 25 次近域清剿",
      test: (s) => (s.combat?.skirmishWins || 0) >= 25,
    },
    {
      id: "starportArchitect",
      name: "星港建筑师",
      icon: "⬡",
      description: "星港附属建筑累计达到 20 级",
      test: (s) => getTotalStarportRanks(s) >= 20,
    },
    {
      id: "coreMerchant",
      name: "共鸣商人",
      icon: "◇",
      description: "在星核商店累计兑换 10 级强化",
      test: (s) =>
        Object.values(s.coreShop || {}).reduce((total, rank) => total + rank, 0) >= 10,
    },
    {
      id: "singularityCrown",
      name: "奇点王冠",
      icon: "♛",
      description: "历史累计获得 100 枚星核",
      test: (s) => (s.totalCores || s.cores) >= 100,
    },
    {
      id: "firstTranscendence",
      name: "越过事件视界",
      icon: "∞",
      description: "完成第一次奇点坍缩",
      test: (s) => (s.endgame?.transcensions || 0) >= 1,
    },
    {
      id: "frontierArchitect",
      name: "边境建筑师",
      icon: "⌖",
      description: "稳定 6 个边境星区",
      test: (s) => (s.endgame?.sectorLevel || 0) >= 6,
    },
    {
      id: "protocolWeaver",
      name: "协议编织者",
      icon: "◉",
      description: "累计强化 20 级超越协议",
      test: (s) =>
        Object.values(s.endgame?.protocols || {}).reduce(
          (total, rank) => total + rank,
          0,
        ) >= 20,
    },
  ];

  const EVENTS = [
    {
      id: "wreck",
      title: "发现漂流货舱",
      description: "雷达锁定了一只旧联盟补给舱，立即牵引可获得大量星尘。",
      action: "牵引货舱",
    },
    {
      id: "surge",
      title: "恒星风暴将至",
      description: "接入高能粒子流，可在 30 秒内让全部自动产量翻倍。",
      action: "展开光帆",
    },
    {
      id: "echo",
      title: "收到未知回波",
      description: "一段古老坐标正在重复播送，破译后或许能找到隐秘储藏。",
      action: "破译坐标",
    },
  ];

  const TUTORIAL_STEPS = [
    {
      eyebrow: "航站启动",
      icon: "✦",
      title: "欢迎来到星港",
      message:
        "你的目标是回收星尘、扩建轨道舰队，并通过一次次深空跃迁建立更强大的自动化航站。",
      tip: "导航默认只显示已经到阶段的系统，避免一次出现太多入口；需要提前查看时，可在右上角设置里切换为“完整导航”。",
    },
    {
      eyebrow: "第一步 · 主动采集",
      icon: "⌁",
      title: "点击信标，回收星尘",
      message:
        "打开“指挥台”，点击中央的“回收星尘”信标即可获得初始资源。使用键盘时，也可以按空格键快速采集。",
      tip: "先收集 15 星尘，就能购买第一架拾荒无人机。",
    },
    {
      eyebrow: "第二步 · 自动化",
      icon: "◎",
      title: "让舰队替你工作",
      message:
        "切换到“舰队”页购买设施后，星尘会自动增长。离开游戏后，舰队仍会继续工作最多 8 小时。",
      tip: "购买数量可以切换为 ×1、×10 或“最大”；每次跃迁都会提高下一航线的设施重建成本。",
    },
    {
      eyebrow: "第三步 · 长期成长",
      icon: "◒",
      title: "研究、成就与深空跃迁",
      message:
        "完成研究能显著提高产量；成就提供永久增幅。采集 25K 星尘后，可跃迁并提炼永久生效的星核。",
      tip: "星核既能提供历史累计增幅，也能在交易所兑换永久强化；消费后不会降低历史增幅。",
    },
    {
      eyebrow: "第四步 · 边境防卫",
      icon: "⬡",
      title: "强化舰队，守护基地",
      message:
        "用星尘永久强化战斗力和基地防御。小规模袭击会在随机时间出现，大袭击每小时来临一次；防御不足会损失当前星尘，也可主动挑战行星怪物夺取战利品。",
      tip: "大袭击在离线期间也会结算，请保持基地防御；离线累计掠夺设有保护上限。战斗回收只适合作为补给，自动化生产才是主要资源来源。",
    },
    {
      eyebrow: "第五步 · 扩建星港",
      icon: "⌬",
      title: "清剿近域目标，建造附属建筑",
      message:
        "战斗页的六类近域清剿各会掉落一种专属材料。前往“星港”页，使用对应材料和大量星尘建造六座生产或战斗附属建筑。",
      tip: "每个清剿目标对应一座建筑；先收集合金和晶体建造星尘精炼厂与舰炮阵列。星港随普通跃迁保留，但会在奇点超越时重置。",
    },
    {
      eyebrow: "长期专精 · 航站作业",
      icon: "▦",
      title: "选一项作业，然后放心离线",
      message:
        "历史采集达到 1K 星尘后，指挥台会解锁航站作业台。选择“连续”即可挂机，也可安排多个 30 分钟订单；在线与离线会使用相同规则结算。",
      tip: "每项作业只有固定 30 级专精，没有分支加点。产出的组件直接补充舰队、远征和星港既有资源，不需要学习新的永久倍率系统。",
    },
    {
      eyebrow: "终局 · 奇点超越",
      icon: "∞",
      title: "建立跨周期的终局航线",
      message:
        "历史获得 150 星核后，“超越”页会解锁。奇点坍缩将重置前两层成长，换取永久碎片，并开启持续扩展的边境星区目标。",
      tip: "先完成一次高收益跃迁再坍缩通常能获得更多碎片；协议矩阵可自由选择下一周期的生产、星核、战斗或重建速度。",
    },
  ];

  const COMBAT_UNLOCK_DUST = 500;
  const OPERATIONS_UNLOCK_DUST = 1000;
  const OPERATIONS_ORDER_SECONDS = 1800;
  const OPERATIONS_MAX_MASTERY = 30;
  const OPERATIONS_JOBS = Object.freeze([
    {
      id: "orbitalSalvage",
      name: "轨道拆解",
      icon: "⌁",
      unlock: 1000,
      interval: 18,
      description: "无需投入，稳定回收星尘与少量星港合金。",
      input: "无需材料",
      output: "星尘、合金、舰体板",
    },
    {
      id: "crystalAnalysis",
      name: "晶体分析",
      icon: "◇",
      unlock: 5000,
      interval: 42,
      description: "分析能量晶体，制作棱镜电容与相位扫描器。",
      input: "晶体 ×1 / 次",
      output: "棱镜电容、相位扫描器",
    },
    {
      id: "foundryAssembly",
      name: "船坞装配",
      icon: "▦",
      unlock: 15000,
      interval: 55,
      description: "消耗合金和芯片，装配舰体与量子控制组件。",
      input: "合金 ×2、芯片 ×1 / 次",
      output: "舰体板、量子控制器",
    },
    {
      id: "borderPatrol",
      name: "边境巡逻",
      icon: "⬡",
      unlock: 25000,
      interval: 45,
      description: "消耗舰队弹药，带回远征碎片与军械补给。",
      input: "弹药 ×1 / 次",
      output: "星图碎片、弹药箱、指挥数据",
    },
    {
      id: "deepSurvey",
      name: "深空勘测",
      icon: "⌖",
      unlock: 150000,
      interval: 80,
      description: "使用相位传感器执行深空测绘，回收高阶组件。",
      input: "传感器 ×1 / 次",
      output: "扫描器、维修套件、星图碎片",
    },
  ]);
  const OPERATION_COMPONENTS = Object.freeze([
    { id: "hullPlate", name: "舰体板", icon: "⬡", use: "维护件 +4" },
    { id: "prismCapacitor", name: "棱镜电容", icon: "◇", use: "弹药 +5" },
    { id: "quantumController", name: "量子控制器", icon: "▦", use: "指挥数据 +2" },
    { id: "phaseScanner", name: "相位扫描器", icon: "⌖", use: "星图碎片 +10" },
    { id: "ammoCrate", name: "弹药箱", icon: "↟", use: "弹药 +12" },
    { id: "repairKit", name: "维修套件", icon: "✚", use: "维护件 +12" },
  ]);
  const STARPORT_MATERIALS = [
    { id: "alloy", name: "星港合金", shortName: "合金", icon: "⬡" },
    { id: "crystal", name: "能量晶体", shortName: "晶体", icon: "◇" },
    { id: "circuit", name: "量子芯片", shortName: "芯片", icon: "▦" },
    { id: "relic", name: "异星构件", shortName: "构件", icon: "⌬" },
    { id: "prism", name: "护盾棱镜", shortName: "棱镜", icon: "◈" },
    { id: "sensor", name: "相位传感器", shortName: "传感器", icon: "⌖" },
  ];
  const STARPORT_MODULES = [
    {
      id: "refinery",
      name: "星尘精炼厂",
      icon: "✦",
      category: "生产",
      description: "提纯舰队回收物，每级使自动产量提高 8%。",
      effect: "自动产量",
      effectPerRank: 8,
      unlock: 0,
      position: "upper-left",
      baseCost: { alloy: 4 },
      growth: 1.38,
      baseDustCost: 30000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
    {
      id: "droneDock",
      name: "回收无人机坞",
      icon: "⌁",
      category: "生产",
      description: "部署短程回收机，每级使手动产量提高 8%、自动产量提高 4%。",
      effect: "手动 / 自动",
      effectPerRank: 8,
      unlock: 500,
      position: "middle-left",
      baseCost: { circuit: 6 },
      growth: 1.4,
      baseDustCost: 160000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
    {
      id: "logistics",
      name: "物流中枢",
      icon: "▤",
      category: "生产",
      description: "重排建设物资，每级降低约 3% 舰队设施成本。",
      effect: "建设成本",
      effectPerRank: 3,
      unlock: 7500,
      position: "lower-left",
      baseCost: { relic: 8 },
      growth: 1.42,
      baseDustCost: 600000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
    {
      id: "battery",
      name: "舰炮阵列",
      icon: "↟",
      category: "战斗",
      description: "星港远程火力支援，每级使舰队战斗力提高 8%。",
      effect: "舰队战斗力",
      effectPerRank: 8,
      unlock: 100,
      position: "upper-right",
      baseCost: { crystal: 5 },
      growth: 1.39,
      baseDustCost: 90000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
    {
      id: "shield",
      name: "护盾发生器",
      icon: "⬡",
      category: "战斗",
      description: "为基地投射分区护盾，每级使基地防御力提高 8%。",
      effect: "基地防御力",
      effectPerRank: 8,
      unlock: 2000,
      position: "middle-right",
      baseCost: { prism: 7 },
      growth: 1.41,
      baseDustCost: 320000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
    {
      id: "radar",
      name: "战术雷达",
      icon: "⌖",
      category: "战斗",
      description: "分析近域目标，每级提高 8% 材料掉落并缩短 2% 清剿整备时间。",
      effect: "材料掉落",
      effectPerRank: 8,
      unlock: 20000,
      position: "lower-right",
      baseCost: { sensor: 9 },
      growth: 1.43,
      baseDustCost: 900000,
      dustGrowth: 1.45,
      maxRank: 12,
    },
  ];
  const FLEET_DISTRIBUTIONS = [
    {
      id: "balanced",
      name: "均衡轮值",
      icon: "◇",
      description: "三支舰队保持接近的值勤规模，适合日常挂机。",
      allocation: { production: 34, defense: 33, expedition: 33 },
    },
    {
      id: "industry",
      name: "工业集结",
      icon: "⌁",
      description: "更多单位回到自动生产线，基地与远征准备略有下降。",
      allocation: { production: 55, defense: 25, expedition: 20 },
    },
    {
      id: "bulwark",
      name: "守备封锁",
      icon: "⬡",
      description: "加强基地防区，对大袭击更稳健，但产量会让位于防御。",
      allocation: { production: 20, defense: 55, expedition: 25 },
    },
    {
      id: "vanguard",
      name: "远征先锋",
      icon: "↟",
      description: "把最多单位编入远征舰队，用于挑战航线与机制战。",
      allocation: { production: 20, defense: 25, expedition: 55 },
    },
  ];
  const FLEET_FORMATIONS = [
    {
      id: "echelon",
      name: "交错阵列",
      icon: "⋰",
      counters: "shield",
      description: "多轴包抄相位节点，对护盾目标有效。",
    },
    {
      id: "screen",
      name: "护航幕墙",
      icon: "≋",
      counters: "swarm",
      description: "扩大警戒面并互相补位，压制蜂群集群。",
    },
    {
      id: "spear",
      name: "矛尖突击",
      icon: "◁",
      counters: "armor",
      description: "集中推力与火力撕开重型装甲。",
    },
  ];
  const FLEET_WEAPONS = [
    {
      id: "ion",
      name: "离子干扰炮",
      icon: "ϟ",
      counters: "shield",
      description: "快速耗散护盾充能。",
    },
    {
      id: "flak",
      name: "近炸弹幕",
      icon: "✣",
      counters: "swarm",
      description: "覆盖大量小型目标的航迹。",
    },
    {
      id: "kinetic",
      name: "质量投射器",
      icon: "◆",
      counters: "armor",
      description: "以高动能穿透厚重装甲。",
    },
  ];
  const FLEET_TACTICS = [
    {
      id: "precision",
      name: "精确齐射",
      icon: "⌖",
      power: 1.08,
      efficiency: 0.94,
      description: "提高瞬时输出，但额外消耗弹药。",
    },
    {
      id: "suppression",
      name: "持续压制",
      icon: "≋",
      power: 1.02,
      efficiency: 1.05,
      description: "输出稳定，降低舰损波动。",
    },
    {
      id: "salvage",
      name: "战场回收",
      icon: "⌬",
      power: 0.96,
      efficiency: 1.24,
      description: "牺牲部分火力，提高物资利用率。",
    },
  ];
  const FLEET_CHALLENGE_TRAITS = [
    { id: "shield", name: "相位护盾", icon: "◈", color: "cyan" },
    { id: "swarm", name: "蜂群集群", icon: "✣", color: "purple" },
    { id: "armor", name: "重型装甲", icon: "⬢", color: "gold" },
  ];
  const FLEET_CHALLENGE_NAMES = [
    "赫利俄斯封锁线",
    "静默回廊演习",
    "蓝移边境试炼",
    "第七码头警戒",
    "破碎月环会战",
    "拉格朗日风暴眼",
  ];
  const FLEET_CHALLENGE_HAZARDS = [
    {
      id: "signalFog",
      name: "信号雾",
      description: "锁定延迟增加，完成时间权重提高。",
      timeFactor: 1.08,
      damageFactor: 1,
    },
    {
      id: "debrisTide",
      name: "残骸潮",
      description: "航路持续受损，舰损权重提高。",
      timeFactor: 1,
      damageFactor: 1.12,
    },
    {
      id: "supplyRationing",
      name: "补给配给",
      description: "资源效率成为本周评分重点。",
      timeFactor: 1.02,
      damageFactor: 1.02,
    },
  ];
  const FLEET_COSMETICS = [
    { id: "foundry", name: "熔炉舰徽", icon: "✦" },
    { id: "sentinel", name: "哨兵舰徽", icon: "⬡" },
    { id: "pathfinder", name: "开路者舰徽", icon: "↟" },
    { id: "nebula", name: "星云舰徽", icon: "☄" },
  ];
  const SKIRMISH_TARGETS = [
    {
      id: "wreckRat",
      name: "废船寄生群",
      icon: "◌",
      location: "废弃补给环",
      basePower: 28,
      baseReward: 45,
      unlock: 0,
      drops: { alloy: [3, 6] },
    },
    {
      id: "courierDrone",
      name: "失控信使机",
      icon: "⌁",
      location: "近地通信航道",
      basePower: 50,
      baseReward: 70,
      unlock: 100,
      drops: { crystal: [3, 6] },
    },
    {
      id: "beltRaider",
      name: "岩带掠夺艇",
      icon: "▲",
      location: "碎石带哨区",
      basePower: 90,
      baseReward: 120,
      unlock: 400,
      drops: { circuit: [3, 6] },
    },
    {
      id: "sporeCloud",
      name: "辐射孢子云",
      icon: "✺",
      location: "电离气团",
      basePower: 145,
      baseReward: 190,
      unlock: 1200,
      drops: { prism: [3, 6] },
    },
    {
      id: "smugglerFrigate",
      name: "走私护航艇",
      icon: "◆",
      location: "暗面贸易航线",
      basePower: 235,
      baseReward: 320,
      unlock: 4000,
      drops: { relic: [2, 5] },
    },
    {
      id: "dormantSentinel",
      name: "沉睡哨兵机",
      icon: "◈",
      location: "远古警戒轨道",
      basePower: 380,
      baseReward: 520,
      unlock: 12000,
      drops: { sensor: [2, 4] },
    },
  ];
  const PLANET_TARGETS = [
    {
      id: "moonMite",
      name: "月背晶甲虫",
      icon: "◐",
      location: "塞勒涅废墟",
      basePower: 55,
      baseReward: 90,
      unlock: 250,
    },
    {
      id: "redStalker",
      name: "赤沙掠食者",
      icon: "◉",
      location: "赫利俄斯荒原",
      basePower: 190,
      baseReward: 650,
      unlock: 5000,
    },
    {
      id: "voidMaw",
      name: "虚空吞噬体",
      icon: "●",
      location: "无光潮汐带",
      basePower: 720,
      baseReward: 4500,
      unlock: 45000,
    },
    {
      id: "gasTitan",
      name: "风暴巨兽",
      icon: "◍",
      location: "奥伯隆气海",
      basePower: 2800,
      baseReward: 32000,
      unlock: 380000,
    },
    {
      id: "starLeviathan",
      name: "恒星利维坦",
      icon: "☼",
      location: "垂死恒星日冕",
      basePower: 12000,
      baseReward: 240000,
      unlock: 2800000,
    },
  ];
  const RAIDERS = [
    { id: "pirates", name: "红隼海盗舰队", icon: "⌁" },
    { id: "swarm", name: "自复制机械蜂群", icon: "✣" },
    { id: "cult", name: "熵蚀者远征军", icon: "◈" },
    { id: "wraith", name: "相位幽灵编队", icon: "◌" },
  ];
  const MAJOR_RAIDERS = [
    { id: "siegeFleet", name: "裂隙攻城舰群", icon: "◆" },
    { id: "marauderCarrier", name: "深空掠夺母舰", icon: "◉" },
    { id: "entropyArmada", name: "熵蚀者主力舰队", icon: "⬢" },
  ];
  const CORE_SHOP_ITEMS = [
    {
      id: "resonance",
      name: "共鸣增幅器",
      icon: "✦",
      description: "每级使历史星核的永久产量增幅提高 10%",
      maxRank: 10,
      baseCost: 1,
      growth: 1.58,
    },
    {
      id: "refinement",
      name: "星核精炼术",
      icon: "✣",
      description: "每级使深空跃迁获得的星核数量提高 8%",
      maxRank: 10,
      baseCost: 3,
      growth: 1.72,
    },
    {
      id: "automation",
      name: "自律生产矩阵",
      icon: "◎",
      description: "每级使所有自动化设施产量提高 10%",
      maxRank: 10,
      baseCost: 2,
      growth: 1.65,
    },
    {
      id: "capacitor",
      name: "折跃电容阵列",
      icon: "⌁",
      description: "每级使手动回收获得的星尘提高 25%",
      maxRank: 8,
      baseCost: 1,
      growth: 1.8,
    },
    {
      id: "tactics",
      name: "战术演算核心",
      icon: "⬡",
      description: "每级使战斗力与基地防御力提高 10%",
      maxRank: 8,
      baseCost: 2,
      growth: 1.85,
    },
    {
      id: "offline",
      name: "低温托管舱",
      icon: "◌",
      description: "每级使离线收益累计上限延长 2 小时",
      maxRank: 6,
      baseCost: 2,
      growth: 2,
    },
  ];
  const CORE_MILESTONES = [
    {
      threshold: 5,
      name: "残骸虹吸",
      description: "全部战斗奖励 ×1.10",
    },
    {
      threshold: 15,
      name: "双重共振",
      description: "全部星尘产量 ×1.50",
    },
    {
      threshold: 30,
      name: "精炼跃迁",
      description: "跃迁星核产量 ×1.25",
    },
    {
      threshold: 50,
      name: "三相奇点",
      description: "全部星尘产量再 ×1.75",
    },
    {
      threshold: 100,
      name: "星核洪流",
      description: "跃迁星核产量再 ×1.40",
    },
    {
      threshold: 200,
      name: "超越协议",
      description: "全部产量 ×2，战斗与防御 ×1.25",
    },
  ];
  const ENDGAME_UNLOCK_CORES = 150;
  const SINGULARITY_COMPANIONS = [
    {
      id: "dustMoth",
      name: "尘光蛾",
      icon: "✧",
      color: "#ffe7a3",
      glow: "rgba(255, 201, 104, 0.68)",
      description: "会绕着坍缩余辉安静盘旋。",
    },
    {
      id: "prismJelly",
      name: "棱镜水母",
      icon: "◈",
      color: "#8fe7ff",
      glow: "rgba(98, 230, 255, 0.72)",
      description: "透明触须会折射遥远星光。",
    },
    {
      id: "riftRay",
      name: "裂隙鳐",
      icon: "⌁",
      color: "#c2a0ff",
      glow: "rgba(159, 115, 255, 0.72)",
      description: "把微小的空间裂隙当作海浪。",
    },
    {
      id: "orbitFox",
      name: "环轨狐",
      icon: "◇",
      color: "#ffae75",
      glow: "rgba(255, 151, 96, 0.7)",
      description: "尾迹会画出一圈短暂星环。",
    },
    {
      id: "echoWhale",
      name: "回声幼鲸",
      icon: "◒",
      color: "#72b9ff",
      glow: "rgba(99, 141, 255, 0.72)",
      description: "只能听见来自上一周期的歌声。",
    },
    {
      id: "voidCat",
      name: "虚空猫",
      icon: "◉",
      color: "#d0a8ff",
      glow: "rgba(184, 140, 255, 0.72)",
      description: "喜欢趴在没有引力的地方打盹。",
    },
    {
      id: "novaFinch",
      name: "新星雀",
      icon: "✦",
      color: "#ff8d7a",
      glow: "rgba(255, 114, 133, 0.74)",
      description: "羽毛里藏着不会灼伤人的火花。",
    },
    {
      id: "moonHare",
      name: "月隙兔",
      icon: "☾",
      color: "#edf6ff",
      glow: "rgba(218, 238, 255, 0.72)",
      description: "总在雷达刚刚移开时探出耳朵。",
    },
  ];
  const COMPANION_OBSERVATION_SIGNAL_CAP = 12;
  const COMPANION_EVENTS = [
    {
      id: "dustMothAfterglow",
      companionId: "dustMoth",
      title: "余辉的第一圈",
      description: "尘光蛾落在坍缩余辉边缘，细小翅粉正把一段废弃航线重新描亮。",
      choices: [
        {
          id: "follow",
          label: "熄灯跟随",
          description: "保持安静，记录它绕过的每一处安全坐标。",
          outcome: "你得到一张只在暗处显形的短途星图。尘光蛾在最后一个坐标上停了一会儿。",
          rewards: { fragments: 12, supplies: 2 },
        },
        {
          id: "beacon",
          label: "点亮旧航标",
          description: "用微光回应，让废弃航标重新加入网络。",
          outcome: "航标没有发出声音，只向仓库传回一批被遗忘的建材编号。",
          rewards: { fragments: 7, materialsEach: 2 },
        },
      ],
    },
    {
      id: "prismJellySpectrum",
      companionId: "prismJelly",
      title: "折射出来的旧星图",
      description: "棱镜水母的触须投出数百道色谱，其中一组光纹与远征星图完全重合。",
      choices: [
        {
          id: "calibrate",
          label: "校准光谱",
          description: "让导航核追踪最稳定的折射路径。",
          outcome: "色谱收束成一条可用航线，剩余光点被压成了星图残片。",
          rewards: { fragments: 16, supplies: 1 },
        },
        {
          id: "archive",
          label: "保存完整色谱",
          description: "不追求效率，把所有异常颜色送入航站档案。",
          outcome: "档案员把它命名为“会游泳的黎明”，并为完整记录签发了凭证。",
          rewards: { tokens: 6, materialsEach: 1, fragments: 6 },
        },
      ],
    },
    {
      id: "riftRayTide",
      companionId: "riftRay",
      title: "裂隙里的潮汐",
      description: "裂隙鳐沿着一条不稳定空间缝隙滑行，缝隙另一侧传来废弃补给库的识别码。",
      choices: [
        {
          id: "tow",
          label: "牵引补给库",
          description: "抓住短暂窗口，把仍可用的货箱拖回航站。",
          outcome: "裂隙在最后一只货箱通过后闭合，裂隙鳐留下了一道像海浪的尾迹。",
          rewards: { supplies: 4, fragments: 8 },
        },
        {
          id: "map",
          label: "测绘裂隙",
          description: "放弃大部分货箱，优先记录空间潮汐。",
          outcome: "测绘结果补全了星港周边最危险的一处导航盲区。",
          rewards: { materialsEach: 2, tokens: 4 },
        },
      ],
    },
    {
      id: "orbitFoxRing",
      companionId: "orbitFox",
      title: "尾迹画出的星环",
      description: "环轨狐连续绕行三圈，尾迹拼成了一座早已拆解的环形船坞。",
      choices: [
        {
          id: "salvage",
          label: "按图回收",
          description: "派出工程艇，沿着尾迹寻找仍可利用的构件。",
          outcome: "工程艇带回一批成套构件，环轨狐则把新的尾迹画成了一个勾。",
          rewards: { materialsEach: 3, fragments: 5 },
        },
        {
          id: "play",
          label: "跟它再跑一圈",
          description: "让护航艇加入轨道，不急着拆走任何东西。",
          outcome: "护航艇完成了航站有记录以来最轻松的一次训练巡航。",
          rewards: { dustMinutes: 8, tokens: 5 },
        },
      ],
    },
    {
      id: "echoWhaleSong",
      companionId: "echoWhale",
      title: "上一周期的歌",
      description: "回声幼鲸唱出的并非声音，而是上一超越周期尚未发出的求援信号。",
      choices: [
        {
          id: "answer",
          label: "回应旧信号",
          description: "向已经不存在的航站发送一段确认回波。",
          outcome: "求援信号安静下来，一份跨周期封存的补给清单出现在当前仓库。",
          rewards: { supplies: 3, materialsEach: 2, fragments: 6 },
        },
        {
          id: "record",
          label: "录下整首歌",
          description: "保留所有噪声与停顿，不对它做任何修正。",
          outcome: "航站把这段记录列为永久收藏，并为异常完整性签发了凭证。",
          rewards: { tokens: 8, fragments: 10 },
        },
      ],
    },
    {
      id: "voidCatNap",
      companionId: "voidCat",
      title: "没有引力的午睡",
      description: "虚空猫占住了星港唯一一处零重力维护节点，所有工具都悬停在它周围。",
      choices: [
        {
          id: "wait",
          label: "等它睡醒",
          description: "暂停维护排程，让无人机顺便整理漂浮工具。",
          outcome: "虚空猫醒来后把一枚失踪很久的导航芯片推回了工具箱。",
          rewards: { materialsEach: 2, tokens: 6 },
        },
        {
          id: "workaround",
          label: "绕开维护节点",
          description: "把工作拆成微型任务，在不惊醒它的情况下继续。",
          outcome: "意外形成的新流程提高了本次整备效率，但没有被写成永久倍率。",
          rewards: { dustMinutes: 10, supplies: 2 },
        },
      ],
    },
    {
      id: "novaFinchSpark",
      companionId: "novaFinch",
      title: "不会灼伤人的火花",
      description: "新星雀抖落一串低温火花，每一粒都带着不同材料的共振频率。",
      choices: [
        {
          id: "forge",
          label: "送入熔铸站",
          description: "用火花校准一轮精密材料处理。",
          outcome: "火花在熔炉里绕成一只小鸟，随后化作一批纯净构件。",
          rewards: { materialsEach: 3, tokens: 4 },
        },
        {
          id: "scatter",
          label: "洒向远征舰",
          description: "让火花为下一批补给标出最稳定的装载位。",
          outcome: "所有补给箱都在黑暗里亮了一瞬，像一支准备出航的小舰队。",
          rewards: { supplies: 4, fragments: 12 },
        },
      ],
    },
    {
      id: "moonHareBlindSpot",
      companionId: "moonHare",
      title: "雷达移开的瞬间",
      description: "月隙兔只在雷达扫描线移开的瞬间出现，怀里抱着一枚没有登记的月白色数据盒。",
      choices: [
        {
          id: "listen",
          label: "关闭雷达倾听",
          description: "相信它的方向感，暂时让航站进入安静模式。",
          outcome: "数据盒打开后只有一句话：有人走到了这里，所以这条航线值得被保存。",
          rewards: { fragments: 18, tokens: 6 },
        },
        {
          id: "share",
          label: "共享月白数据",
          description: "把坐标拆成补给、材料与星图三份公开记录。",
          outcome: "月隙兔在记录上传完毕前消失，原地留下了一枚浅浅的爪印。",
          rewards: { supplies: 3, materialsEach: 2, fragments: 9 },
        },
      ],
    },
  ];
  const ENDGAME_PROTOCOLS = [
    {
      id: "production",
      name: "奇点生产矩阵",
      icon: "✦",
      description: "每级使手动与自动星尘产量 ×1.22",
      maxRank: 20,
      baseCost: 1,
      growth: 1.7,
    },
    {
      id: "core",
      name: "超维精炼回路",
      icon: "✣",
      description: "每级使深空跃迁星核产量 ×1.12",
      maxRank: 15,
      baseCost: 1,
      growth: 1.85,
    },
    {
      id: "launch",
      name: "先驱者物资舱",
      icon: "⌁",
      description: "每级提高奇点坍缩后的初始星尘储备",
      maxRank: 12,
      baseCost: 2,
      growth: 2.1,
    },
    {
      id: "combat",
      name: "跨周期战术记忆",
      icon: "⬡",
      description: "每级使舰队战斗力与基地防御力 ×1.16",
      maxRank: 15,
      baseCost: 1,
      growth: 1.8,
    },
    {
      id: "legacy",
      name: "共鸣遗产",
      icon: "◎",
      description: "每级在坍缩后保留各类星核商店强化 1 级",
      maxRank: 6,
      baseCost: 3,
      growth: 3,
    },
    {
      id: "collapse",
      name: "坍缩增幅器",
      icon: "◉",
      description: "每级使奇点坍缩获得的碎片增加 30%",
      maxRank: 10,
      baseCost: 3,
      growth: 2.2,
    },
  ];

  const EXPEDITION_ROUTE_TYPES = [
    {
      id: "salvage",
      name: "残骸回收带",
      icon: "✦",
      description: "威胁较低，适合稳定积累补给。",
      powerFactor: 0.78,
      baseDamage: 8,
      supplies: 2,
      fragments: 1,
    },
    {
      id: "patrol",
      name: "巡逻封锁线",
      icon: "⬡",
      description: "标准战斗航线，风险与回报均衡。",
      powerFactor: 0.96,
      baseDamage: 12,
      supplies: 1,
      fragments: 3,
    },
    {
      id: "anomaly",
      name: "异常信号区",
      icon: "◈",
      description: "读数不稳定，但携带更多星图资料。",
      powerFactor: 1.08,
      baseDamage: 15,
      supplies: 1,
      fragments: 4,
    },
    {
      id: "elite",
      name: "精锐猎场",
      icon: "◆",
      description: "高威胁精锐目标，回收价值最高。",
      powerFactor: 1.24,
      baseDamage: 20,
      supplies: 2,
      fragments: 6,
    },
    {
      id: "relay",
      name: "废弃中继港",
      icon: "⌁",
      description: "没有直接交战，可修复船体但战利品很少。",
      powerFactor: 0,
      baseDamage: 0,
      supplies: 0,
      fragments: 1,
      repair: 18,
    },
  ];

  const EXPEDITION_AFFIXES = [
    {
      id: "phaseShield",
      name: "相位护盾",
      icon: "◇",
      description: "未携带裂相弹头时，成功率 -18%。",
      counter: "phaseLance",
    },
    {
      id: "swarm",
      name: "蜂群编队",
      icon: "⌬",
      description: "未携带拦截阵列时，成功率 -14%。",
      counter: "interceptorGrid",
    },
    {
      id: "volatile",
      name: "过载核心",
      icon: "☄",
      description: "胜负造成的船体损伤 +9，热沉协议可抵消。",
      counter: "thermalSink",
    },
    {
      id: "jammer",
      name: "深空干扰",
      icon: "⌖",
      description: "成功率 -10%，导航演算可反制。",
      counter: "predictiveNav",
    },
    {
      id: "raider",
      name: "掠夺协议",
      icon: "⚠",
      description: "失败时额外遗失 1 份本局补给。",
      counter: "sealedCargo",
    },
  ];

  const EXPEDITION_BOONS = [
    {
      id: "phaseLance",
      name: "裂相弹头",
      icon: "◇",
      description: "本局反制“相位护盾”。",
    },
    {
      id: "interceptorGrid",
      name: "拦截阵列",
      icon: "⌬",
      description: "本局反制“蜂群编队”。",
    },
    {
      id: "thermalSink",
      name: "热沉协议",
      icon: "☄",
      description: "本局反制“过载核心”。",
    },
    {
      id: "predictiveNav",
      name: "导航演算",
      icon: "⌖",
      description: "反制“深空干扰”，其他航线成功率 +4%。",
    },
    {
      id: "sealedCargo",
      name: "密封货舱",
      icon: "▣",
      description: "反制“掠夺协议”，失败不再遗失补给。",
    },
    {
      id: "repairDrone",
      name: "维修无人机",
      icon: "◎",
      description: "每次战斗胜利后额外修复 8 点船体。",
    },
    {
      id: "scavengerRig",
      name: "精密拆解臂",
      icon: "✦",
      description: "残骸回收带额外获得 1 份本局补给。",
    },
    {
      id: "reactiveArmor",
      name: "反应装甲",
      icon: "⬡",
      description: "本局受到的船体损伤减少 20%。",
    },
  ];

  const EXPEDITION_GEAR = [
    {
      id: "phaseCoil",
      name: "裂相线圈",
      icon: "◇",
      category: "武器",
      description: "稳定反制相位护盾，并提高对守盾首领的压制效率。",
      effects: ["phaseLance"],
      defaultUnlocked: true,
    },
    {
      id: "interceptorGrid",
      name: "近防拦截网",
      icon: "⌬",
      category: "防御",
      description: "稳定反制蜂群编队，并减轻蜂群首领的额外损伤。",
      effects: ["interceptorGrid"],
      defaultUnlocked: true,
    },
    {
      id: "thermalSink",
      name: "深冷热沉",
      icon: "☄",
      category: "防御",
      description: "稳定反制过载核心，避免额外爆炸损伤。",
      effects: ["thermalSink"],
      defaultUnlocked: true,
    },
    {
      id: "predictiveNav",
      name: "预测导航核",
      icon: "⌖",
      category: "导航",
      description: "反制深空干扰，并使普通航线成功率提高 4%。",
      effects: ["predictiveNav"],
      defaultUnlocked: true,
    },
    {
      id: "repairDrone",
      name: "随舰维修群",
      icon: "◎",
      category: "后勤",
      description: "每次普通战斗胜利后修复 8 点船体。",
      effects: ["repairDrone"],
      defaultUnlocked: true,
    },
    {
      id: "reactiveArmor",
      name: "反应装甲板",
      icon: "⬡",
      category: "防御",
      description: "本局受到的普通航段船体损伤减少 20%。",
      effects: ["reactiveArmor"],
      defaultUnlocked: true,
    },
    {
      id: "aegisBreaker",
      name: "守盾破城矛",
      icon: "◈",
      category: "武器",
      description: "强攻战术成功率 +8%，对永昼壁垒号额外有效。",
      effects: ["bossAssault"],
      bossId: "aegisArk",
    },
    {
      id: "shieldCapacitor",
      name: "脉冲盾容器",
      icon: "◒",
      category: "防御",
      description: "启航时最大船体与初始船体提高 15。",
      effects: ["shieldCapacitor"],
      bossId: "aegisArk",
    },
    {
      id: "swarmNet",
      name: "蜂群牵引网",
      icon: "⌁",
      category: "控制",
      description: "压制战术成功率 +10%，对群巢母舰额外有效。",
      effects: ["bossControl"],
      bossId: "swarmMatriarch",
    },
    {
      id: "salvageVault",
      name: "密封拆解舱",
      icon: "▣",
      category: "后勤",
      description: "反制掠夺协议，残骸航线额外获得 1 补给。",
      effects: ["sealedCargo", "scavengerRig"],
      bossId: "swarmMatriarch",
    },
    {
      id: "voidAnchor",
      name: "虚空锚定器",
      icon: "◉",
      category: "导航",
      description: "压制虚空首领的干扰，使首领战基础成功率 +6%。",
      effects: ["voidAnchor"],
      bossId: "voidChoir",
    },
    {
      id: "fragmentLens",
      name: "星图聚焦镜",
      icon: "✧",
      category: "回收",
      description: "本局获得的星图残片提高 25%，只影响消耗材料。",
      effects: ["fragmentLens"],
      bossId: "voidChoir",
    },
  ];

  const EXPEDITION_BOSSES = [
    {
      id: "aegisArk",
      name: "永昼壁垒号",
      icon: "◈",
      description: "两层相位装甲会轮流封闭核心，未携带裂相装备时很难稳定命中。",
      weaknessEffects: ["phaseLance", "bossAssault"],
      baseChance: 0.58,
      baseDamage: 21,
      fragmentReward: 14,
      supplyReward: 2,
      blueprints: ["aegisBreaker", "shieldCapacitor"],
    },
    {
      id: "swarmMatriarch",
      name: "群巢母舰",
      icon: "⌬",
      description: "无人机群会不断遮蔽火控；若没有拦截或控制设备，失败损伤会明显增加。",
      weaknessEffects: ["interceptorGrid", "bossControl"],
      baseChance: 0.6,
      baseDamage: 18,
      fragmentReward: 12,
      supplyReward: 3,
      blueprints: ["swarmNet", "salvageVault"],
    },
    {
      id: "voidChoir",
      name: "虚空合唱体",
      icon: "◉",
      description: "多重干扰信号会伪造目标位置，需要导航或锚定设备锁定真实回声。",
      weaknessEffects: ["predictiveNav", "voidAnchor"],
      baseChance: 0.55,
      baseDamage: 24,
      fragmentReward: 17,
      supplyReward: 2,
      blueprints: ["voidAnchor", "fragmentLens"],
    },
  ];

  const EXPEDITION_BOSS_TACTICS = [
    {
      id: "assault",
      name: "强攻核心",
      icon: "◆",
      description: "成功率 +8%，但承受伤害 +25%；成功时额外获得 50% 首领残片。",
      chance: 0.08,
      damageMultiplier: 1.25,
      fragmentMultiplier: 1.5,
    },
    {
      id: "control",
      name: "压制机制",
      icon: "⌬",
      description: "携带首领弱点舰装时成功率额外提高，伤害减少 15%。",
      chance: 0.02,
      damageMultiplier: 0.85,
      fragmentMultiplier: 1,
    },
    {
      id: "refit",
      name: "战场整备",
      icon: "◎",
      description: "先修复 12 点船体，成功率 -8%，本阶段伤害减少 35%。",
      chance: -0.08,
      damageMultiplier: 0.65,
      fragmentMultiplier: 0.9,
      repair: 12,
    },
  ];

  const EXPEDITION_ARTIFACTS = [
    { id: "glassCompass", name: "玻璃星图仪", icon: "◈", lore: "指针始终指向一条不存在的航线。" },
    { id: "silentBeacon", name: "无声信标", icon: "⌁", lore: "没有频率，却能让附近的尘埃产生回声。" },
    { id: "foldedWing", name: "折叠舰翼", icon: "◇", lore: "来自一艘从未登记过的侦察舰。" },
    { id: "blueEmber", name: "蓝色余烬", icon: "☄", lore: "在真空中维持着极低温的光。" },
    { id: "orbitSeed", name: "轨道种子", icon: "◎", lore: "靠近恒星时会自行排列成微型星环。" },
    { id: "echoMask", name: "回声面具", icon: "⌖", lore: "记录着上一位远征者最后看到的星空。" },
    { id: "tidalCoin", name: "潮汐古币", icon: "◒", lore: "正反两面分别刻着诞生与坍缩。" },
    { id: "moonLetter", name: "月背邮简", icon: "☾", lore: "收件地址只有一句：下一次相遇。" },
  ];

  const EXPEDITION_SKINS = [
    { id: "standard", name: "航站原色", color: "#62e6ff", cost: 0 },
    { id: "aurora", name: "极光涂层", color: "#73efb2", cost: 12 },
    { id: "violet", name: "裂隙紫", color: "#b88cff", cost: 18 },
    { id: "ember", name: "余烬红", color: "#ff7c6e", cost: 24 },
    { id: "moon", name: "新月银", color: "#e4efff", cost: 32 },
  ];

  const MISSION_TEMPLATES = [
    {
      id: "dustEarned",
      metric: "dustEarned",
      title: "回收航线",
      icon: "✦",
      format: "number",
      dailyTarget: (targetState) => getMissionDustTarget("daily", targetState),
      weeklyTarget: (targetState) => getMissionDustTarget("weekly", targetState),
      eligible: () => true,
    },
    {
      id: "manualClicks",
      metric: "manualClicks",
      title: "手动校准",
      icon: "⌁",
      format: "count",
      dailyTarget: () => 40,
      weeklyTarget: () => 260,
      eligible: () => true,
    },
    {
      id: "playSeconds",
      metric: "playSeconds",
      title: "值守航站",
      icon: "◷",
      format: "duration",
      dailyTarget: () => 15 * 60,
      weeklyTarget: () => 2 * 60 * 60,
      eligible: () => true,
    },
    {
      id: "eventsClaimed",
      metric: "eventsClaimed",
      title: "雷达回收",
      icon: "◈",
      format: "count",
      dailyTarget: () => 2,
      weeklyTarget: () => 12,
      eligible: () => true,
    },
    {
      id: "dustSpent",
      metric: "dustSpent",
      title: "航站投入",
      icon: "◇",
      format: "number",
      dailyTarget: (targetState) => getMissionDustTarget("daily", targetState, 0.55),
      weeklyTarget: (targetState) => getMissionDustTarget("weekly", targetState, 0.7),
      eligible: () => true,
    },
    {
      id: "unitsBought",
      metric: "unitsBought",
      title: "扩建舰队",
      icon: "◎",
      format: "count",
      dailyTarget: () => 12,
      weeklyTarget: () => 100,
      eligible: (targetState) =>
        BUILDINGS.some((building) => targetState.lifetimeDust >= building.unlock),
    },
    {
      id: "researchCompleted",
      metric: "researchCompleted",
      title: "研究排程",
      icon: "◒",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 4,
      eligible: (targetState) =>
        UPGRADES.some(
          (upgrade) =>
            targetState.lifetimeDust >= upgrade.unlock &&
            !targetState.upgrades.includes(upgrade.id),
        ),
    },
    {
      id: "battlesWon",
      metric: "battlesWon",
      title: "清理航道",
      icon: "⬡",
      format: "count",
      dailyTarget: () => 3,
      weeklyTarget: () => 30,
      eligible: (targetState) => targetState.lifetimeDust >= COMBAT_UNLOCK_DUST,
    },
    {
      id: "materialsCollected",
      metric: "materialsCollected",
      title: "回收材料",
      icon: "⌬",
      format: "count",
      dailyTarget: () => 10,
      weeklyTarget: () => 90,
      eligible: (targetState) => targetState.lifetimeDust >= COMBAT_UNLOCK_DUST,
    },
    {
      id: "starportUpgrades",
      metric: "starportUpgrades",
      title: "星港建设",
      icon: "▣",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 4,
      eligible: (targetState) =>
        STARPORT_MODULES.some(
          (module) =>
            targetState.lifetimeDust >= module.unlock &&
            (targetState.starport?.modules?.[module.id] || 0) < module.maxRank,
        ),
    },
    {
      id: "combatUpgrades",
      metric: "combatUpgrades",
      title: "军械强化",
      icon: "↟",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 5,
      eligible: (targetState) => targetState.lifetimeDust >= COMBAT_UNLOCK_DUST,
    },
    {
      id: "raidsDefended",
      metric: "raidsDefended",
      title: "防卫值班",
      icon: "◆",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 5,
      eligible: (targetState) => targetState.lifetimeDust >= COMBAT_UNLOCK_DUST,
    },
    {
      id: "expeditionRoutes",
      metric: "expeditionRoutes",
      title: "星区勘探",
      icon: "▱",
      format: "count",
      dailyTarget: () => 2,
      weeklyTarget: () => 12,
      eligible: (targetState) => targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST,
    },
    {
      id: "expeditionsCompleted",
      metric: "expeditionsCompleted",
      title: "完整远征",
      icon: "✧",
      format: "count",
      weeklyOnly: true,
      weeklyTarget: () => 1,
      eligible: (targetState) => targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST,
    },
    {
      id: "loadoutChanges",
      metric: "loadoutChanges",
      title: "舰装轮换",
      icon: "▦",
      format: "count",
      dailyTarget: () => 2,
      weeklyTarget: () => 8,
      eligible: (targetState) => targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST,
    },
    {
      id: "bossVictories",
      metric: "bossVictories",
      title: "首领猎手",
      icon: "◆",
      format: "count",
      weeklyOnly: true,
      weeklyTarget: () => 1,
      eligible: (targetState) => targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST,
    },
    {
      id: "companionObservations",
      metric: "companionObservations",
      title: "伴星观测",
      icon: "☾",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 3,
      eligible: (targetState) => {
        const companions = targetState.endgame?.companions || [];
        const observations = targetState.endgame?.companionObservations || [];
        return companions.length > observations.length;
      },
    },
    {
      id: "prestiges",
      metric: "prestiges",
      title: "深空跃迁",
      icon: "✣",
      format: "count",
      dailyTarget: () => 1,
      weeklyTarget: () => 3,
      eligible: (targetState) =>
        targetState.totalCores > 0 || targetState.lifetimeDust >= PRESTIGE_BASE_DUST,
    },
    {
      id: "transcensions",
      metric: "transcensions",
      title: "奇点远征",
      icon: "∞",
      format: "count",
      weeklyOnly: true,
      weeklyTarget: () => 1,
      eligible: (targetState) => isEndgameUnlocked(targetState),
    },
    {
      id: "dailyClaims",
      metric: "dailyClaims",
      title: "持续执行",
      icon: "☷",
      format: "count",
      weeklyOnly: true,
      weeklyTarget: () => 15,
      eligible: () => true,
    },
  ];

  const WEEKLY_MISSION_MILESTONES = [
    { required: 2, tokens: 20, dustMinutes: 15, materials: 0 },
    { required: 4, tokens: 35, dustMinutes: 30, materials: 2 },
    { required: 5, tokens: 50, dustMinutes: 60, materials: 4 },
  ];

  const MISSION_STORE_ITEMS = Object.freeze({
    dustCrate: { cost: 18 },
    materialCrate: { cost: 32 },
    combatRefit: { cost: 20 },
    expeditionSupply: { cost: 14 },
  });

  const STARFALL_ROUTE_TASKS = [
    {
      id: "stardust",
      metric: "dustEarned",
      title: "拾取星辉",
      icon: "✦",
      description: "让日常回收轨道掠过这场流星雨。",
      format: "number",
      target: (targetState) => getMissionDustTarget("daily", targetState, 0.7),
      eligible: () => true,
    },
    {
      id: "nightwatch",
      metric: "playSeconds",
      title: "守望长夜",
      icon: "◷",
      description: "让航站灯火陪你等待下一颗流星。",
      format: "duration",
      target: () => 12 * 60,
      eligible: () => true,
    },
    {
      id: "calibration",
      metric: "manualClicks",
      title: "校准观测镜",
      icon: "⌁",
      description: "手动回收星尘，调整流星观测阵列。",
      format: "count",
      target: () => 45,
      eligible: () => true,
    },
    {
      id: "operations",
      metric: "operationsCompleted",
      title: "装订星笺",
      icon: "▦",
      description: "完成航站作业，为远方准备寄出的信。",
      format: "count",
      target: () => 6,
      eligible: (targetState) => targetState.lifetimeDust >= OPERATIONS_UNLOCK_DUST,
    },
    {
      id: "guardian",
      metric: "battlesWon",
      title: "守住观测窗",
      icon: "⬡",
      description: "清理航道，让流星不被敌舰的火光遮住。",
      format: "count",
      target: () => 3,
      eligible: (targetState) => targetState.lifetimeDust >= COMBAT_UNLOCK_DUST,
    },
    {
      id: "voyager",
      metric: "expeditionRoutes",
      title: "追随流星",
      icon: "▱",
      description: "穿过两段远征航线，寻找坠落的余辉。",
      format: "count",
      target: () => 2,
      eligible: (targetState) => targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST,
    },
  ];

  const STARFALL_LETTERS = [
    {
      id: "no-address",
      offset: 0,
      title: "第一颗流星没有地址",
      body: "观测阵列捕获了一束迟到很多年的光。信封上没有坐标，只有一句：如果你也看见了，就替我把它寄往一个值得抵达的地方。",
      choices: [
        { id: "station", label: "留在星港", result: "你把光留在舷窗边。今晚回港的人，都能借它找到方向。" },
        { id: "deep-space", label: "送往深空", result: "信标朝没有名字的星系闪了一次，也许远处恰好有人抬头。" },
        { id: "wish", label: "写下愿望", result: "愿望没有署名，但流星替你记住了它经过这里的时刻。" },
      ],
    },
    {
      id: "before-light",
      offset: 2,
      title: "有人在光抵达前等你",
      body: "一段旧广播反复播放同一句话：不必赶路，我知道星光总会晚一点到。",
      choices: [
        { id: "reply", label: "回一封信", result: "你的回信需要很多年才能抵达，但等待本来就是这段故事的一部分。" },
        { id: "beacon", label: "点亮信标", result: "信标亮起时，航站像宇宙里一个很小、却很确定的答案。" },
        { id: "listen", label: "再听一遍", result: "你没有回应，只让那句话和流星一起从夜空缓慢经过。" },
      ],
    },
    {
      id: "old-orbit",
      offset: 4,
      title: "穿过旧轨道的晚风",
      body: "废弃轨道站的风铃在真空里没有声音，传感器却记录到规律的振动，像有人轻轻敲门。",
      choices: [
        { id: "open", label: "打开舱门", result: "门外没有人，只有一颗流星把整条旧轨道照亮。" },
        { id: "bell", label: "带走风铃", result: "它被挂在指挥台旁，从此每次启航都会替旧轨道说一声再见。" },
        { id: "wait", label: "停留片刻", result: "有些航线不必重启，只要有人记得它曾经通往哪里。" },
      ],
    },
    {
      id: "two-stars",
      offset: 6,
      title: "两颗星之间的距离",
      body: "测距仪给出一个庞大的数字。导航员却说，真正的距离只是从‘想起’到‘出发’之间的那一步。",
      choices: [
        { id: "depart", label: "现在出发", result: "航线刚刚亮起，终点就像比昨天近了一点。" },
        { id: "mark", label: "标记坐标", result: "你把坐标留给未来的自己，也留给某个愿意同行的人。" },
        { id: "share", label: "分享星图", result: "当另一块屏幕也亮起时，漫长的距离忽然有了两端。" },
      ],
    },
    {
      id: "unheard-wish",
      offset: 8,
      title: "如果愿望没有被听见",
      body: "流星不会回答问题，也不会保证愿望实现。可观测记录显示，人们仍会在它出现时变得安静。",
      choices: [
        { id: "keep", label: "替它保管", result: "你把愿望存进航站档案：未完成，但从未作废。" },
        { id: "again", label: "再许一次", result: "第二次说出口时，它已经不只是愿望，也像一个决定。" },
        { id: "give", label: "送给别人", result: "你把这次机会留给远方。夜空因此显得比刚才温柔一点。" },
      ],
    },
    {
      id: "same-night",
      offset: 10,
      title: "与你共享同一片夜空",
      body: "多个航站同时上传观测图。它们来自不同经纬度，却都留下了同一条明亮的轨迹。",
      choices: [
        { id: "combine", label: "拼成星图", result: "所有不完整的视角拼在一起，终于成为一整片夜空。" },
        { id: "send", label: "发送问候", result: "频道里陆续亮起回复：我也在看。" },
        { id: "quiet", label: "安静共赏", result: "没有人说话，但这一刻被许多人同时记住。" },
      ],
    },
    {
      id: "eighth-meteor",
      offset: 12,
      title: "没有熄灭的第八颗流星",
      body: "七封信已经归档。就在观测结束前，阵列发现第八束光没有坠落，而是转向星港，像一艘终于找到回航坐标的小船。",
      choices: [
        { id: "guide", label: "为它引航", result: "它停在信标旁，成为一束不会熄灭的尾迹。以后每次抬头，都能知道有人与你共享过这片星空。" },
        { id: "follow", label: "跟它远行", result: "你没有问终点。两道航迹并在一起，向仍未命名的夜空延伸。" },
        { id: "someone", label: "把它寄给那个人", result: "收件人没有写在档案里。宇宙却像知道地址，让第八颗流星继续亮了下去。" },
      ],
    },
  ];

  const STARFALL_MILESTONES = [
    { id: "dust", required: 200, title: "初见星雨", reward: "5 分钟当前产量", type: "dust" },
    { id: "title", required: 500, title: "等一场星雨", reward: "限定指挥官称号", type: "title" },
    { id: "supplies", required: 900, title: "追光补给", reward: "远征补给 ×4 · 星图残片 ×12", type: "supplies" },
    { id: "beacon", required: 1400, title: "流星尾迹", reward: "信标动态尾迹外观", type: "beacon" },
    { id: "letter", required: 2100, title: "英仙星笺", reward: "限定收藏品", type: "letter" },
    { id: "starport", required: 3000, title: "英仙夜航", reward: "星港主题外观", type: "starport" },
    { id: "eighth", required: 3800, title: "第八颗流星", reward: "纪念背景与收藏物", type: "eighth" },
  ];

  const STARFALL_STORE_ITEMS = [
    { id: "emblem", title: "双星愿签", description: "纯收藏限定徽记", cost: 480, limit: 1 },
    { id: "postcard", title: "英仙纪念卡", description: "保存七封信笺的纪念卡", cost: 620, limit: 1 },
    { id: "dust", title: "余辉补给箱", description: "5 分钟当前产量", cost: 75, limit: 0 },
    { id: "materials", title: "坠星建材箱", description: "四种星港材料各 ×3", cost: 120, limit: 0 },
    { id: "components", title: "夜航组件箱", description: "四种工程组件各 ×2", cost: 140, limit: 0 },
    { id: "expedition", title: "追光远征包", description: "补给 ×2 · 星图残片 ×6", cost: 90, limit: 0 },
  ];

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    dust: $("#dust-value"),
    rate: $("#rate-value"),
    cores: $("#core-value"),
    collect: $("#collect-button"),
    clickYield: $("#click-yield"),
    goalTitle: $("#next-goal-title"),
    goalLabel: $("#next-goal-label"),
    goalProgress: $("#next-goal-progress"),
    permanentBoost: $("#permanent-boost"),
    achievementBoost: $("#achievement-boost"),
    runDust: $("#run-dust"),
    prestigeDescription: $("#prestige-description"),
    prestigeButton: $("#prestige-button"),
    prestigeGain: $("#prestige-gain"),
    unitCount: $("#unit-count"),
    fleetFlavor: $("#fleet-flavor"),
    reconstructionCost: $("#reconstruction-cost"),
    commandUnitCount: $("#command-unit-count"),
    commandCombatPower: $("#command-combat-power"),
    commandDefensePower: $("#command-defense-power"),
    commandRaidStatus: $("#command-raid-status"),
    commandMissionButton: $("#command-mission-button"),
    commandMissionStatus: $("#command-mission-status"),
    starfallCommandCard: $("#starfall-command-card"),
    starfallCommandPhase: $("#starfall-command-phase"),
    starfallCommandStatus: $("#starfall-command-status"),
    starfallCommandCurrency: $("#starfall-command-currency"),
    commandGuide: $("#command-guide"),
    commandGuideIcon: $("#command-guide-icon"),
    commandGuideTitle: $("#command-guide-title"),
    commandGuideDescription: $("#command-guide-description"),
    commandGuideProgress: $("#command-guide-progress"),
    commandGuideAction: $("#command-guide-action"),
    commandCompanionSystem: $("#command-companion-system"),
    commandCompanionStage: $("#command-companion-stage"),
    commandCompanionCount: $("#command-companion-count"),
    companionObservatory: $("#companion-observatory"),
    companionSignalCount: $("#companion-signal-count"),
    companionEventIdle: $("#companion-event-idle"),
    companionEventScene: $("#companion-event-scene"),
    companionEventIcon: $("#companion-event-icon"),
    companionEventName: $("#companion-event-name"),
    companionEventTitle: $("#companion-event-title"),
    companionEventDescription: $("#companion-event-description"),
    companionEventChoices: $("#companion-event-choices"),
    companionEventClose: $("#companion-event-close"),
    companionLogCount: $("#companion-log-count"),
    companionLogGrid: $("#companion-log-grid"),
    buildingList: $("#building-list"),
    fleetCommandDeck: $("#fleet-command-deck"),
    upgradeList: $("#upgrade-list"),
    achievementList: $("#achievement-list"),
    researchCount: $("#research-count"),
    researchAvailable: $("#research-available"),
    researchOutput: $("#research-output"),
    lifetimeDust: $("#lifetime-dust"),
    lifetimeClicks: $("#lifetime-clicks"),
    rebirthCount: $("#rebirth-count"),
    playTime: $("#play-time"),
    activityLog: $("#activity-log"),
    eventCard: $("#event-card"),
    eventTitle: $("#event-title"),
    eventDescription: $("#event-description"),
    eventButton: $("#event-button"),
    eventCountdown: $("#event-countdown"),
    toastRegion: $("#toast-region"),
    soundButton: $("#sound-button"),
    saveButton: $("#save-button"),
    menuButton: $("#menu-button"),
    settingsMenu: $("#settings-menu"),
    guideButton: $("#guide-button"),
    patchNotesButton: $("#patch-notes-button"),
    renameButton: $("#rename-button"),
    playerNameDisplay: $("#player-name-display"),
    navigationModeButton: $("#navigation-mode-button"),
    navigationModeStatus: $("#navigation-mode-status"),
    performanceButton: $("#performance-button"),
    performanceStatus: $("#performance-status"),
    bgmButton: $("#bgm-button"),
    bgmStatus: $("#bgm-status"),
    bgmCurrentTitle: $("#bgm-current-title"),
    topBgmTrack: $("#top-bgm-track"),
    bgmTrack: $("#bgm-track"),
    bgmVolume: $("#bgm-volume"),
    bgmVolumeValue: $("#bgm-volume-value"),
    bgmAudio: $("#bgm-audio"),
    exportButton: $("#export-button"),
    importButton: $("#import-button"),
    importFile: $("#import-file"),
    resetButton: $("#reset-button"),
    modalBackdrop: $("#modal-backdrop"),
    modalEyebrow: $("#modal-eyebrow"),
    modalIcon: $("#modal-icon"),
    modalTitle: $("#modal-title"),
    modalMessage: $("#modal-message"),
    modalCancel: $("#modal-cancel"),
    modalConfirm: $("#modal-confirm"),
    patchNotesBackdrop: $("#patch-notes-backdrop"),
    patchNotesCurrentVersion: $("#patch-notes-current-version"),
    patchNotesList: $("#patch-notes-list"),
    patchNotesClose: $("#patch-notes-close"),
    patchNotesConfirm: $("#patch-notes-confirm"),
    updateBanner: $("#update-banner"),
    updateBannerTitle: $("#update-banner-title"),
    updateBannerMessage: $("#update-banner-message"),
    updateLaterButton: $("#update-later-button"),
    updateNowButton: $("#update-now-button"),
    accountButton: $("#account-button"),
    accountBackdrop: $("#account-backdrop"),
    accountClose: $("#account-close"),
    communicationBackdrop: $("#communication-backdrop"),
    communicationClose: $("#communication-close"),
    nameBackdrop: $("#name-backdrop"),
    nameModalTitle: $("#name-modal-title"),
    nameModalMessage: $("#name-modal-message"),
    playerNameInput: $("#player-name-input"),
    nameError: $("#name-error"),
    nameCancel: $("#name-cancel"),
    nameConfirm: $("#name-confirm"),
    tutorialBackdrop: $("#tutorial-backdrop"),
    tutorialStepLabel: $("#tutorial-step-label"),
    tutorialSkip: $("#tutorial-skip"),
    tutorialIcon: $("#tutorial-icon"),
    tutorialEyebrow: $("#tutorial-eyebrow"),
    tutorialTitle: $("#tutorial-title"),
    tutorialMessage: $("#tutorial-message"),
    tutorialTip: $("#tutorial-tip"),
    tutorialDots: $("#tutorial-dots"),
    tutorialBack: $("#tutorial-back"),
    tutorialNext: $("#tutorial-next"),
    operationsHub: $("#operations-hub"),
    operationsSummaryStatus: $("#operations-summary-status"),
    operationsQueueSummary: $("#operations-queue-summary"),
    operationsLocked: $("#operations-locked"),
    operationsContent: $("#operations-content"),
    operationsStopButton: $("#operations-stop-button"),
    operationsPoolValue: $("#operations-pool-value"),
    operationsPoolCap: $("#operations-pool-cap"),
    operationsPoolEffect: $("#operations-pool-effect"),
    operationsPoolProgress: $("#operations-pool-progress"),
    operationsQueue: $("#operations-queue"),
    operationsJobList: $("#operations-job-list"),
    operationsComponentList: $("#operations-component-list"),
    operationsReport: $("#operations-report"),
    starportMaterialList: $("#starport-material-list"),
    combatMaterialList: $("#combat-material-list"),
    starportSlotMap: $("#starport-slot-map"),
    starportRankTotal: $("#starport-rank-total"),
    starportProductionBoost: $("#starport-production-boost"),
    starportCostEfficiency: $("#starport-cost-efficiency"),
    starportAttackBoost: $("#starport-attack-boost"),
    starportDefenseBoost: $("#starport-defense-boost"),
    starportLootBoost: $("#starport-loot-boost"),
    combatWins: $("#combat-wins"),
    combatLosses: $("#combat-losses"),
    combatPower: $("#combat-power"),
    defensePower: $("#defense-power"),
    attackLevel: $("#attack-level"),
    defenseLevel: $("#defense-level"),
    attackUpgradeButton: $("#attack-upgrade-button"),
    defenseUpgradeButton: $("#defense-upgrade-button"),
    attackUpgradeCost: $("#attack-upgrade-cost"),
    defenseUpgradeCost: $("#defense-upgrade-cost"),
    raidMonitor: $("#raid-monitor"),
    raidState: $("#raid-state"),
    raidName: $("#raid-name"),
    raidDescription: $("#raid-description"),
    raidCountdownLabel: $("#raid-countdown-label"),
    raidCountdownValue: $("#raid-countdown-value"),
    raidProgressBar: $("#raid-progress-bar"),
    attackCooldown: $("#attack-cooldown"),
    skirmishCooldown: $("#skirmish-cooldown"),
    skirmishTargetList: $("#skirmish-target-list"),
    planetTargetList: $("#planet-target-list"),
    combatReportText: $("#combat-report-text"),
    coreShopBalance: $("#core-shop-balance"),
    totalCoresEarned: $("#total-cores-earned"),
    coreYieldMultiplier: $("#core-yield-multiplier"),
    offlineCap: $("#offline-cap"),
    coreShopList: $("#core-shop-list"),
    coreMilestoneList: $("#core-milestone-list"),
    singularityShards: $("#singularity-shards"),
    totalSingularityShards: $("#total-singularity-shards"),
    transcendCount: $("#transcend-count"),
    sectorLevel: $("#sector-level"),
    transcendProductionBoost: $("#transcend-production-boost"),
    transcendCoreBoost: $("#transcend-core-boost"),
    transcendLocked: $("#transcend-locked"),
    transcendUnlockBar: $("#transcend-unlock-bar"),
    transcendUnlockLabel: $("#transcend-unlock-label"),
    transcendContent: $("#transcend-content"),
    sectorTitle: $("#sector-title"),
    sectorType: $("#sector-type"),
    sectorDescription: $("#sector-description"),
    sectorProgress: $("#sector-progress"),
    sectorTarget: $("#sector-target"),
    sectorProgressBar: $("#sector-progress-bar"),
    sectorReward: $("#sector-reward"),
    sectorClaimButton: $("#sector-claim-button"),
    collapseCurrentCores: $("#collapse-current-cores"),
    collapseGain: $("#collapse-gain"),
    singularityCompanionIcon: $("#singularity-companion-icon"),
    singularityCompanionName: $("#singularity-companion-name"),
    singularityCompanionDescription: $("#singularity-companion-description"),
    collapseButton: $("#collapse-button"),
    transcendProtocolList: $("#transcend-protocol-list"),
    crescentSignal: $("#crescent-signal"),
    crescentMission: $("#crescent-mission"),
    crescentMissionStatus: $("#crescent-mission-status"),
    crescentClickProgress: $("#crescent-click-progress"),
    crescentSkirmishProgress: $("#crescent-skirmish-progress"),
    crescentStarportProgress: $("#crescent-starport-progress"),
    crescentLetterButton: $("#crescent-letter-button"),
    crescentLetterBackdrop: $("#crescent-letter-backdrop"),
    crescentLetterSalutation: $("#crescent-letter-salutation"),
    crescentLetterClose: $("#crescent-letter-close"),
    crescentLetterConfirm: $("#crescent-letter-confirm"),
    starfallNavigationBadge: $("#starfall-navigation-badge"),
    starfallPhaseLabel: $("#starfall-phase-label"),
    starfallCountdown: $("#starfall-countdown"),
    starfallStatusNote: $("#starfall-status-note"),
    starfallCurrency: $("#starfall-currency"),
    starfallTotalEarned: $("#starfall-total-earned"),
    starfallLetterCount: $("#starfall-letter-count"),
    starfallLetterSummary: $("#starfall-letter-summary"),
    starfallMilestoneSummary: $("#starfall-milestone-summary"),
    starfallDayList: $("#starfall-day-list"),
    starfallLetterList: $("#starfall-letter-list"),
    starfallMilestoneList: $("#starfall-milestone-list"),
    starfallStoreGrid: $("#starfall-store-grid"),
    starfallCollectionGrid: $("#starfall-collection-grid"),
    missionTokenBalance: $("#mission-token-balance"),
    missionsNavigationBadge: $("#missions-navigation-badge"),
    dailyResetCountdown: $("#daily-reset-countdown"),
    dailyRerollButton: $("#daily-reroll-button"),
    dailyMissionList: $("#daily-mission-list"),
    dailyBonusProgress: $("#daily-bonus-progress"),
    dailyBonusButton: $("#daily-bonus-button"),
    weeklyResetCountdown: $("#weekly-reset-countdown"),
    weeklyMissionList: $("#weekly-mission-list"),
    weeklyMilestoneList: $("#weekly-milestone-list"),
    missionStore: $(".mission-store"),
    expeditionSupplyBalance: $("#expedition-supply-balance"),
    expeditionFragmentBalance: $("#expedition-fragment-balance"),
    expeditionLocked: $("#expedition-locked"),
    expeditionUnlockProgress: $("#expedition-unlock-progress"),
    expeditionUnlockLabel: $("#expedition-unlock-label"),
    expeditionIdle: $("#expedition-idle"),
    expeditionStartDustCost: $("#expedition-start-dust-cost"),
    expeditionStartMaterialCost: $("#expedition-start-material-cost"),
    startExpeditionButton: $("#start-expedition-button"),
    expeditionCompletedRuns: $("#expedition-completed-runs"),
    expeditionFailedRuns: $("#expedition-failed-runs"),
    expeditionLoadout: $("#expedition-loadout"),
    expeditionPresetButtons: $("#expedition-preset-buttons"),
    expeditionLoadoutCount: $("#expedition-loadout-count"),
    expeditionLoadoutStatus: $("#expedition-loadout-status"),
    expeditionGearGrid: $("#expedition-gear-grid"),
    expeditionActive: $("#expedition-active"),
    expeditionSectorLabel: $("#expedition-sector-label"),
    expeditionHullValue: $("#expedition-hull-value"),
    expeditionHullBar: $("#expedition-hull-bar"),
    expeditionCargo: $("#expedition-cargo"),
    expeditionBoonList: $("#expedition-boon-list"),
    expeditionActiveGear: $("#expedition-active-gear"),
    expeditionChoiceEyebrow: $("#expedition-choice-eyebrow"),
    expeditionChoiceTitle: $("#expedition-choice-title"),
    expeditionChoiceDescription: $("#expedition-choice-description"),
    expeditionBoonChoices: $("#expedition-boon-choices"),
    expeditionRouteChoices: $("#expedition-route-choices"),
    expeditionBossEncounter: $("#expedition-boss-encounter"),
    expeditionBossIcon: $("#expedition-boss-icon"),
    expeditionBossName: $("#expedition-boss-name"),
    expeditionBossDescription: $("#expedition-boss-description"),
    expeditionBossPhase: $("#expedition-boss-phase"),
    expeditionBossCounter: $("#expedition-boss-counter"),
    expeditionBossTactics: $("#expedition-boss-tactics"),
    expeditionRerollButton: $("#expedition-reroll-button"),
    expeditionRepairButton: $("#expedition-repair-button"),
    expeditionAbandonButton: $("#expedition-abandon-button"),
    expeditionReportText: $("#expedition-report-text"),
    expeditionPath: $("#expedition-path"),
    expeditionBossTotalWins: $("#expedition-boss-total-wins"),
    expeditionBossGrid: $("#expedition-boss-grid"),
    expeditionCollectionCount: $("#expedition-collection-count"),
    expeditionArtifactGrid: $("#expedition-artifact-grid"),
    expeditionSkinGrid: $("#expedition-skin-grid"),
    leaderboardCareerDust: $("#leaderboard-career-dust"),
    leaderboardHighestPower: $("#leaderboard-highest-power"),
    leaderboardBattleCount: $("#leaderboard-battle-count"),
    leaderboardExpeditionRuns: $("#leaderboard-expedition-runs"),
    leaderboardBossVictories: $("#leaderboard-boss-victories"),
    leaderboardExpeditionArtifacts: $("#leaderboard-expedition-artifacts"),
    leaderboardStarfallEarned: $("#leaderboard-starfall-earned"),
    leaderboardStarfallRoutes: $("#leaderboard-starfall-routes"),
    leaderboardStarfallLetters: $("#leaderboard-starfall-letters"),
    leaderboardCurrentPower: $("#leaderboard-current-power"),
    starfield: $("#starfield"),
  };

  function freshCoreShopState() {
    const shop = {};
    CORE_SHOP_ITEMS.forEach((item) => {
      shop[item.id] = 0;
    });
    return shop;
  }

  function freshEndgameProtocolState() {
    const protocols = {};
    ENDGAME_PROTOCOLS.forEach((protocol) => {
      protocols[protocol.id] = 0;
    });
    return protocols;
  }

  function freshEndgameState() {
    return {
      shards: 0,
      totalShards: 0,
      transcensions: 0,
      sectorLevel: 0,
      sectorDust: 0,
      sectorUnits: 0,
      sectorWins: 0,
      companions: [],
      companionSignals: 0,
      companionObservations: [],
      activeCompanionEvent: null,
      protocols: freshEndgameProtocolState(),
    };
  }

  function freshCrescentSecretState() {
    return {
      unlocked: false,
      completed: false,
      letterRead: false,
      manualClicks: 0,
      skirmishWins: 0,
      starportUpgrades: 0,
    };
  }

  function freshMissionPeriod(kind) {
    return {
      key: "",
      items: [],
      rerollsUsed: kind === "daily" ? 0 : undefined,
      completionClaimed: kind === "daily" ? false : undefined,
      milestonesClaimed: kind === "weekly" ? [] : undefined,
    };
  }

  function freshMissionState() {
    return {
      tokens: 0,
      daily: freshMissionPeriod("daily"),
      weekly: freshMissionPeriod("weekly"),
    };
  }

  function freshStarfallState() {
    return {
      currency: 0,
      totalEarned: 0,
      dayRecords: [],
      completedDays: [],
      letterChoices: {},
      claimedMilestones: [],
      purchases: {},
      cosmetics: {
        title: false,
        beacon: false,
        starport: false,
        backdrop: false,
        letter: false,
        emblem: false,
        postcard: false,
        keepsake: false,
      },
      firstOpened: false,
    };
  }

  function freshFleetCommandState() {
    return {
      activePreset: 0,
      selectedPreset: 0,
      presets: [
        {
          name: "工业轮值",
          distribution: "industry",
          formation: "echelon",
          weapon: "ion",
          tactic: "salvage",
        },
        {
          name: "基地警戒",
          distribution: "bulwark",
          formation: "screen",
          weapon: "flak",
          tactic: "suppression",
        },
        {
          name: "远征先锋",
          distribution: "vanguard",
          formation: "spear",
          weapon: "kinetic",
          tactic: "precision",
        },
      ],
      ammo: 12,
      maintenance: 12,
      commandData: 3,
      switchCooldownUntil: 0,
      reconfigureCooldownUntil: 0,
      weekly: {
        key: "",
        attempts: [],
        firstClearClaimed: false,
      },
      cosmetics: [],
      totalChallengeClears: 0,
      lastReport: "三舰队指挥网已经上线，等待第一份编成命令。",
    };
  }

  function freshExpeditionState() {
    const bossWins = {};
    EXPEDITION_BOSSES.forEach((boss) => {
      bossWins[boss.id] = 0;
    });
    return {
      supplies: 3,
      fragments: 0,
      completedRuns: 0,
      failedRuns: 0,
      bossWins,
      unlockedGear: EXPEDITION_GEAR
        .filter((gear) => gear.defaultUnlocked)
        .map((gear) => gear.id),
      activePreset: 0,
      loadoutPresets: [
        ["phaseCoil", "interceptorGrid", "thermalSink"],
        ["predictiveNav", "repairDrone", "reactiveArmor"],
        ["phaseCoil", "predictiveNav", "repairDrone"],
      ],
      artifacts: [],
      unlockedSkins: ["standard"],
      activeSkin: "standard",
      activeRun: null,
      lastReport: "远征终端正在等待第一份星区航线。",
    };
  }

  function freshOperationsState() {
    const jobs = {};
    const components = {};
    OPERATIONS_JOBS.forEach((job) => {
      jobs[job.id] = { xp: 0, actions: 0, progress: 0 };
    });
    OPERATION_COMPONENTS.forEach((component) => {
      components[component.id] = 0;
    });
    return {
      queue: [],
      jobs,
      components,
      engineeringPool: 0,
      totalActions: 0,
      lastReport: "作业台待命。",
    };
  }

  function freshGuidanceState() {
    return {
      compactNavigation: true,
      seenFeatures: [],
    };
  }

  function freshStarportState() {
    const materials = {};
    const modules = {};
    STARPORT_MATERIALS.forEach((material) => {
      materials[material.id] = 0;
    });
    STARPORT_MODULES.forEach((module) => {
      modules[module.id] = 0;
    });
    return { materials, modules };
  }

  function freshCombatState() {
    const enemyVictories = {};
    const now = Date.now();
    [...SKIRMISH_TARGETS, ...PLANET_TARGETS].forEach((target) => {
      enemyVictories[target.id] = 0;
    });
    return {
      attackLevel: 0,
      defenseLevel: 0,
      wins: 0,
      losses: 0,
      activeWins: 0,
      skirmishWins: 0,
      raidsSurvived: 0,
      majorRaidsFaced: 0,
      majorRaidsSurvived: 0,
      enemyVictories,
      nextRaidAt:
        now + randomBetween(MINOR_RAID_MIN_INTERVAL, MINOR_RAID_MAX_INTERVAL),
      nextMajorRaidAt: now + MAJOR_RAID_INTERVAL,
      incomingRaid: null,
      attackCooldownUntil: 0,
      skirmishCooldownUntil: 0,
      lastReport: "军械库已上线，等待第一项强化或作战命令。",
    };
  }

  function freshState() {
    const buildings = {};
    BUILDINGS.forEach((building) => {
      buildings[building.id] = 0;
    });
    return {
      version: SAVE_VERSION,
      dust: 0,
      runDust: 0,
      lifetimeDust: 0,
      careerDust: 0,
      careerBattles: 0,
      highestCombinedPower: 0,
      lifetimeClicks: 0,
      buildings,
      upgrades: [],
      achievements: [],
      cores: 0,
      totalCores: 0,
      coreShop: freshCoreShopState(),
      rebirths: 0,
      playerName: "",
      activePage: "command",
      buyMode: "1",
      sound: true,
      bgmEnabled: true,
      bgmTrackSelection: BGM_PLAYLIST_SELECTION,
      bgmVolume: 0.22,
      playTime: 0,
      lastSeen: Date.now(),
      nextEventAt: Date.now() + randomBetween(35000, 55000),
      event: null,
      buff: null,
      tutorialSeen: false,
      starport: freshStarportState(),
      combat: freshCombatState(),
      endgame: freshEndgameState(),
      crescentSecret: freshCrescentSecretState(),
      missions: freshMissionState(),
      starfall: freshStarfallState(),
      fleetCommand: freshFleetCommandState(),
      expedition: freshExpeditionState(),
      operations: freshOperationsState(),
      guidance: freshGuidanceState(),
      log: [
        {
          text: "拾荒单元 07 已上线。等待首条回收指令。",
          time: Date.now(),
        },
      ],
    };
  }

  let state = freshState();
  let performanceMode = loadPerformanceMode();
  document.documentElement.dataset.performanceMode = performanceMode;
  let renderedCommandCompanionSignature = null;
  let lastWallClock = Date.now();
  let lastUi = 0;
  let lastSave = Date.now();
  let modalCallback = null;
  let audioContext = null;
  let currentBgmTrackIndex = 0;
  let bgmTrackSwitchInProgress = false;
  let tutorialIndex = 0;
  let nameDialogRequired = false;
  let patchNotesAutoOpened = false;
  let patchNotesSeenThisSession = false;
  let recoveredBackupIndex = -1;
  let backgroundStartedAt = document.hidden ? Date.now() : null;
  let gameLoopTimer = null;
  let gameTickCount = 0;
  let starfieldController = null;
  let versionCheckTimer = null;
  let versionCheckInFlight = false;
  let latestAvailableVersion = null;
  let updateDismissedVersion = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatProductionRate(value) {
    const numericValue = clampGameNumber(value);
    const absolute = Math.abs(numericValue);
    if (absolute < 1000) return formatNumber(numericValue, 4);
    const unit = absolute >= 1000000
      ? { value: 1000000, suffix: "M" }
      : { value: 1000, suffix: "K" };
    const scaled = absolute / unit.value;
    const digits = scaled >= 100 ? 3 : scaled >= 10 ? 4 : 5;
    const trimmed = scaled
      .toFixed(digits)
      .replace(/\.?0+$/, "");
    return `${numericValue < 0 ? "-" : ""}${trimmed}${unit.suffix}`;
  }

  function formatDustReserve(value) {
    const numericValue = clampGameNumber(value);
    if (numericValue < 1e9) return formatNumber(numericValue);
    return `${Math.floor(numericValue / 1e6)}M`;
  }

  function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function finiteTimestamp(value, fallback = Date.now()) {
    const numericValue = Number(value);
    const valid =
      Number.isFinite(numericValue) &&
      numericValue >= 0 &&
      numericValue <= 8640000000000000;
    return valid ? numericValue : fallback;
  }

  function loadPerformanceMode() {
    try {
      const savedMode = localStorage.getItem(PERFORMANCE_MODE_KEY);
      if (savedMode === "eco" || savedMode === "quality") return savedMode;
    } catch (error) {
      // Storage can be unavailable in strict privacy modes; quality remains the default.
    }
    return "quality";
  }

  function getGameTickInterval() {
    return performanceMode === "eco"
      ? ECO_GAME_TICK_INTERVAL
      : QUALITY_GAME_TICK_INTERVAL;
  }

  function updatePerformanceControls() {
    if (!elements.performanceButton || !elements.performanceStatus) return;
    const eco = performanceMode === "eco";
    elements.performanceStatus.textContent = eco ? "省电" : "高画质";
    elements.performanceButton.classList.toggle("off", eco);
    elements.performanceButton.setAttribute(
      "aria-label",
      eco ? "当前省电模式，点击切换高画质" : "当前高画质，点击切换省电模式",
    );
    elements.performanceButton.title = eco
      ? "24 FPS 星空 · 4 次/秒逻辑更新"
      : "60 FPS 星空 · 10 次/秒逻辑更新";
  }

  function setPerformanceMode(nextMode, { announce = true } = {}) {
    const safeMode = nextMode === "quality" ? "quality" : "eco";
    const changed = safeMode !== performanceMode;
    performanceMode = safeMode;
    document.documentElement.dataset.performanceMode = performanceMode;
    try {
      localStorage.setItem(PERFORMANCE_MODE_KEY, performanceMode);
    } catch (error) {
      // The active session can still use the selected mode without persistence.
    }
    updatePerformanceControls();
    starfieldController?.setMode(performanceMode);
    restartGameLoop();
    if (announce && changed) {
      const eco = performanceMode === "eco";
      showToast(
        eco ? "省电模式已启用" : "高画质已启用",
        eco
          ? "星空 24 FPS，逻辑每秒更新 4 次，并关闭高耗能背景效果。"
          : "星空 60 FPS，逻辑每秒更新 10 次。手机发热时建议切回省电模式。",
        eco ? "◒" : "✦",
      );
    }
  }

  function normalizePlayerName(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 12);
  }

  function formatDuration(seconds) {
    seconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}时 ${minutes}分`;
    if (minutes > 0) return `${minutes}分 ${secs}秒`;
    return `${secs}秒`;
  }

  function getTotalUnits(targetState = state) {
    return BUILDINGS.reduce(
      (total, building) =>
        safeAdd(total, targetState.buildings[building.id] || 0),
      0,
    );
  }

  function getFleetCommandPreset(
    targetState = state,
    index = targetState.fleetCommand?.activePreset || 0,
  ) {
    return (
      targetState.fleetCommand?.presets?.[index] ||
      freshFleetCommandState().presets[0]
    );
  }

  function getFleetDistribution(preset = getFleetCommandPreset()) {
    return (
      FLEET_DISTRIBUTIONS.find(
        (distribution) => distribution.id === preset?.distribution,
      ) || FLEET_DISTRIBUTIONS[0]
    );
  }

  function isFleetCommandUnlocked(targetState = state) {
    return targetState.lifetimeDust >= FLEET_COMMAND_UNLOCK_DUST;
  }

  function getFleetProductionMultiplier(targetState = state) {
    if (!isFleetCommandUnlocked(targetState)) return 1;
    const allocation = getFleetDistribution(
      getFleetCommandPreset(targetState),
    ).allocation.production;
    return clamp(0.95 + allocation * 0.0015, 0.98, 1.04);
  }

  function getFleetDefenseMultiplier(targetState = state) {
    if (!isFleetCommandUnlocked(targetState)) return 1;
    const allocation = getFleetDistribution(
      getFleetCommandPreset(targetState),
    ).allocation.defense;
    return clamp(0.9 + allocation * 0.003, 0.95, 1.08);
  }

  function getFleetExpeditionMultiplier(targetState = state) {
    if (!isFleetCommandUnlocked(targetState)) return 1;
    const allocation = getFleetDistribution(
      getFleetCommandPreset(targetState),
    ).allocation.expedition;
    return clamp(0.9 + allocation * 0.003, 0.95, 1.08);
  }

  function ensureFleetChallengePeriod(now = Date.now()) {
    if (!state.fleetCommand || typeof state.fleetCommand !== "object") {
      state.fleetCommand = freshFleetCommandState();
    }
    const weeklyKey = getUtcWeeklyKey(now);
    if (state.fleetCommand.weekly?.key === weeklyKey) return false;
    state.fleetCommand.weekly = {
      key: weeklyKey,
      attempts: [],
      firstClearClaimed: false,
    };
    state.fleetCommand.lastReport = `${weeklyKey} 舰队演习规则已经刷新。`;
    return true;
  }

  function getFleetChallenge(now = Date.now()) {
    const key = getUtcWeeklyKey(now);
    const seed = hashMissionSeed(`fleet-challenge:${key}`);
    const traits = seededMissionShuffle(
      FLEET_CHALLENGE_TRAITS,
      `fleet-traits:${key}`,
    );
    return {
      key,
      name: FLEET_CHALLENGE_NAMES[seed % FLEET_CHALLENGE_NAMES.length],
      hazard:
        FLEET_CHALLENGE_HAZARDS[
          (seed >>> 5) % FLEET_CHALLENGE_HAZARDS.length
        ],
      phases: traits.map((trait, index) => ({
        trait,
        powerFactor: [0.9, 1.02, 1.14][index],
      })),
    };
  }

  function getFleetSwitchCost() {
    return Math.min(
      3000000,
      Math.max(15000, Math.round(safeMultiply(calculateRate(state, false), 60))),
    );
  }

  function getFleetCraftRecipe(type) {
    const dustCost = Math.min(
      type === "data" ? 6000000 : 4000000,
      Math.max(
        type === "data" ? 30000 : 18000,
        Math.round(
          safeMultiply(
            calculateRate(state, false),
            type === "data" ? 150 : 90,
          ),
        ),
      ),
    );
    if (type === "ammo") {
      return {
        type,
        label: "装填弹药 +6",
        icon: "◆",
        amount: 6,
        dustCost,
        materials: { alloy: 2, crystal: 1 },
      };
    }
    if (type === "maintenance") {
      return {
        type,
        label: "制造维护件 +6",
        icon: "⬡",
        amount: 6,
        dustCost,
        materials: { alloy: 2, circuit: 1 },
      };
    }
    return {
      type: "data",
      label: "编译指挥数据 +2",
      icon: "⌘",
      amount: 2,
      dustCost,
      materials: { relic: 1, sensor: 1 },
    };
  }

  function getFleetRecipeText(recipe) {
    const materials = Object.entries(recipe.materials)
      .map(([id, amount]) => {
        const material = STARPORT_MATERIALS.find((entry) => entry.id === id);
        return `${material?.shortName || id} ${amount}`;
      })
      .join(" · ");
    return `✦ ${formatNumber(recipe.dustCost)} · ${materials}`;
  }

  function canAffordFleetRecipe(recipe) {
    return (
      state.dust >= recipe.dustCost &&
      Object.entries(recipe.materials).every(
        ([id, amount]) => (state.starport.materials[id] || 0) >= amount,
      )
    );
  }

  function craftFleetResource(type) {
    if (!isFleetCommandUnlocked()) return;
    const recipe = getFleetCraftRecipe(type);
    if (!canAffordFleetRecipe(recipe)) {
      showToast(
        "整备资源不足",
        `需要 ${getFleetRecipeText(recipe)}。近域清剿可补充星港建材。`,
        recipe.icon,
      );
      return;
    }
    state.dust = clampGameNumber(state.dust - recipe.dustCost);
    recordMissionProgress("dustSpent", recipe.dustCost);
    Object.entries(recipe.materials).forEach(([id, amount]) => {
      state.starport.materials[id] = Math.max(
        0,
        (state.starport.materials[id] || 0) - amount,
      );
    });
    const field = recipe.type === "data" ? "commandData" : recipe.type;
    state.fleetCommand[field] = Math.min(
      FLEET_COMMAND_RESOURCE_CAP,
      state.fleetCommand[field] + recipe.amount,
    );
    state.fleetCommand.lastReport = `${recipe.label}完成，后勤库存已经更新。`;
    showToast("舰队整备完成", recipe.label, recipe.icon);
    renderFleetCommand();
    updateUi();
    saveGame();
  }

  function selectFleetPreset(index) {
    state.fleetCommand.selectedPreset = clamp(
      Math.floor(Number(index) || 0),
      0,
      FLEET_COMMAND_PRESET_COUNT - 1,
    );
    renderFleetCommand();
  }

  function configureFleetPreset(field, value) {
    if (!isFleetCommandUnlocked()) return;
    const definitions = {
      distribution: FLEET_DISTRIBUTIONS,
      formation: FLEET_FORMATIONS,
      weapon: FLEET_WEAPONS,
      tactic: FLEET_TACTICS,
    };
    if (!definitions[field]?.some((entry) => entry.id === value)) return;
    const index = state.fleetCommand.selectedPreset;
    const preset = state.fleetCommand.presets[index];
    if (!preset || preset[field] === value) return;
    const now = Date.now();
    if (state.fleetCommand.reconfigureCooldownUntil > now) {
      showToast(
        "重编冷却中",
        `还需 ${Math.ceil(
          (state.fleetCommand.reconfigureCooldownUntil - now) / 1000,
        )} 秒才能修改方案。`,
        "⌘",
      );
      return;
    }
    if (state.fleetCommand.commandData < 1) {
      showToast("缺少指挥数据", "重编一项方案需要 1 份指挥数据。", "⌘");
      return;
    }
    state.fleetCommand.commandData -= 1;
    preset[field] = value;
    state.fleetCommand.reconfigureCooldownUntil =
      now + FLEET_COMMAND_RECONFIGURE_COOLDOWN;
    state.fleetCommand.lastReport = `${preset.name}已更新，重编协议进入短暂冷却。`;
    renderFleetCommand();
    updateUi();
    saveGame();
  }

  function activateFleetPreset() {
    if (!isFleetCommandUnlocked()) return;
    const index = state.fleetCommand.selectedPreset;
    if (index === state.fleetCommand.activePreset) return;
    const now = Date.now();
    if (state.fleetCommand.switchCooldownUntil > now) {
      showToast(
        "舰队正在换防",
        `还需 ${Math.ceil(
          (state.fleetCommand.switchCooldownUntil - now) / 1000,
        )} 秒才能切换方案。`,
        "↻",
      );
      return;
    }
    const dustCost = getFleetSwitchCost();
    if (state.fleetCommand.commandData < 1 || state.dust < dustCost) {
      showToast(
        "无法执行换防",
        `切换需要 1 指挥数据与 ${formatNumber(dustCost)} 星尘。`,
        "⌘",
      );
      return;
    }
    state.fleetCommand.commandData -= 1;
    state.dust = clampGameNumber(state.dust - dustCost);
    recordMissionProgress("dustSpent", dustCost);
    state.fleetCommand.activePreset = index;
    state.fleetCommand.switchCooldownUntil =
      now + FLEET_COMMAND_SWITCH_COOLDOWN;
    state.fleetCommand.lastReport = `${state.fleetCommand.presets[index].name}已经接管三支舰队。`;
    addLog(`舰队换防完成：${state.fleetCommand.presets[index].name}。`);
    showToast(
      "编成方案已启用",
      "工业、守备与远征单位已按新比例完成调度。",
      "⌘",
    );
    renderFleetCommand();
    updateUi(calculateRate());
    saveGame();
  }

  function runFleetChallenge() {
    if (!isFleetCommandUnlocked()) return;
    ensureFleetChallengePeriod();
    const presetIndex = state.fleetCommand.activePreset;
    const preset = getFleetCommandPreset(state, presetIndex);
    const distribution = getFleetDistribution(preset);
    const formation =
      FLEET_FORMATIONS.find((entry) => entry.id === preset.formation) ||
      FLEET_FORMATIONS[0];
    const weapon =
      FLEET_WEAPONS.find((entry) => entry.id === preset.weapon) ||
      FLEET_WEAPONS[0];
    const tactic =
      FLEET_TACTICS.find((entry) => entry.id === preset.tactic) ||
      FLEET_TACTICS[0];
    const ammoCost = tactic.id === "precision" ? 4 : 3;
    const maintenanceCost = tactic.id === "suppression" ? 1 : 2;
    if (
      state.fleetCommand.ammo < ammoCost ||
      state.fleetCommand.maintenance < maintenanceCost
    ) {
      showToast(
        "整备不足",
        `本次演习需要弹药 ${ammoCost}、维护件 ${maintenanceCost}。`,
        "◆",
      );
      return;
    }
    state.fleetCommand.ammo -= ammoCost;
    state.fleetCommand.maintenance -= maintenanceCost;
    const challenge = getFleetChallenge();
    const expeditionFactor = getFleetExpeditionMultiplier();
    let totalTime = 0;
    let totalDamage = 0;
    let ratioTotal = 0;
    let failedPhase = false;
    challenge.phases.forEach((phase) => {
      let ratio = safeMultiply(
        expeditionFactor,
        tactic.power,
        1 / phase.powerFactor,
      );
      const weaponCounter = weapon.counters === phase.trait.id;
      const formationCounter = formation.counters === phase.trait.id;
      if (weaponCounter) ratio = safeMultiply(ratio, 1.2);
      if (formationCounter) ratio = safeMultiply(ratio, 1.11);
      if (weaponCounter && formationCounter) ratio = safeMultiply(ratio, 1.04);
      if (!weaponCounter && !formationCounter) ratio = safeMultiply(ratio, 0.88);
      ratio = clamp(ratio, 0.35, 1.9);
      const phaseTime =
        (68 / ratio) * challenge.hazard.timeFactor;
      const phaseDamage = clamp(
        (1.18 - ratio) * 40 * challenge.hazard.damageFactor,
        2,
        48,
      );
      totalTime += phaseTime;
      totalDamage += phaseDamage;
      ratioTotal += ratio;
      if (ratio < 0.72) failedPhase = true;
    });
    totalDamage = clamp(totalDamage, 0, 100);
    const clear = !failedPhase && totalDamage < 94;
    const efficiency = clamp(
      safeMultiply(
        100,
        tactic.efficiency,
        0.94 + distribution.allocation.expedition / 500,
      ) - totalDamage * 0.12,
      35,
      160,
    );
    const averageRatio = ratioTotal / challenge.phases.length;
    const score = Math.max(
      1,
      Math.round(
        clear
          ? 1250 +
              averageRatio * 260 -
              totalTime * 0.9 -
              totalDamage * 2.2 +
              efficiency * 2.1
          : averageRatio * 260 - totalDamage,
      ),
    );
    const previousBest = state.fleetCommand.weekly.attempts
      .filter((attempt) => attempt.clear)
      .reduce((best, attempt) => Math.max(best, attempt.score), 0);
    const attempt = {
      clear,
      score,
      time: Math.round(totalTime * 10) / 10,
      damage: Math.round(totalDamage * 10) / 10,
      efficiency: Math.round(efficiency * 10) / 10,
      preset: presetIndex,
      timestamp: Date.now(),
    };
    state.fleetCommand.weekly.attempts.unshift(attempt);
    state.fleetCommand.weekly.attempts = state.fleetCommand.weekly.attempts.slice(
      0,
      FLEET_CHALLENGE_ATTEMPT_LIMIT,
    );
    let rewardText = "本次没有额外战利品。调整克制关系后再试。";
    if (clear) {
      state.fleetCommand.totalChallengeClears = clampGameCount(
        state.fleetCommand.totalChallengeClears + 1,
      );
      if (!state.fleetCommand.weekly.firstClearClaimed) {
        state.fleetCommand.weekly.firstClearClaimed = true;
        state.expedition.supplies = Math.min(
          EXPEDITION_SUPPLY_CAP,
          state.expedition.supplies + 3,
        );
        state.expedition.fragments = Math.min(
          EXPEDITION_FRAGMENT_CAP,
          state.expedition.fragments + 18,
        );
        grantMissionTokens(10);
        state.fleetCommand.commandData = Math.min(
          FLEET_COMMAND_RESOURCE_CAP,
          state.fleetCommand.commandData + 2,
        );
        const rewardMaterials = seededMissionShuffle(
          STARPORT_MATERIALS,
          `fleet-reward:${challenge.key}`,
        ).slice(0, 2);
        rewardMaterials.forEach((material) => {
          state.starport.materials[material.id] = clampGameCount(
            (state.starport.materials[material.id] || 0) + 2,
          );
        });
        const cosmetic =
          FLEET_COSMETICS[
            hashMissionSeed(challenge.key) % FLEET_COSMETICS.length
          ];
        if (!state.fleetCommand.cosmetics.includes(cosmetic.id)) {
          state.fleetCommand.cosmetics.push(cosmetic.id);
        }
        rewardText = `首胜奖励：补给 3、残片 18、凭证 10、指挥数据 2、两类建材各 2，并解锁${cosmetic.name}。`;
      } else if (score > previousBest) {
        state.expedition.supplies = Math.min(
          EXPEDITION_SUPPLY_CAP,
          state.expedition.supplies + 1,
        );
        state.expedition.fragments = Math.min(
          EXPEDITION_FRAGMENT_CAP,
          state.expedition.fragments + 6,
        );
        state.fleetCommand.commandData = Math.min(
          FLEET_COMMAND_RESOURCE_CAP,
          state.fleetCommand.commandData + 1,
        );
        const material =
          STARPORT_MATERIALS[
            (hashMissionSeed(challenge.key) + score) %
              STARPORT_MATERIALS.length
          ];
        state.starport.materials[material.id] = clampGameCount(
          (state.starport.materials[material.id] || 0) + 1,
        );
        rewardText = `刷新本周最佳：补给 1、残片 6、指挥数据 1、${material.shortName} 1。`;
      }
    }
    state.fleetCommand.lastReport = clear
      ? `演习完成，评分 ${score}。${rewardText}`
      : `演习中断，评分 ${score}。至少一个航段未建立有效克制。`;
    addLog(
      `${challenge.name}${clear ? "完成" : "失败"}：评分 ${score}。`,
    );
    showToast(
      clear ? "每周演习完成" : "舰队被迫撤离",
      clear ? rewardText : "检查三段敌方词条，并重新调整武器与阵型。",
      clear ? "✦" : "!",
    );
    renderFleetCommand();
    updateUi();
    saveGame();
  }

  function getAchievementMultiplier(targetState = state) {
    return 1 + targetState.achievements.length * 0.02;
  }

  function getHistoricalCores(targetState = state) {
    return Math.max(targetState.totalCores || 0, targetState.cores || 0);
  }

  function getCoreShopRank(id, targetState = state) {
    return targetState.coreShop?.[id] || 0;
  }

  function getEndgameProtocolRank(id, targetState = state) {
    return targetState.endgame?.protocols?.[id] || 0;
  }

  function isEndgameUnlocked(targetState = state) {
    return (
      getHistoricalCores(targetState) >= ENDGAME_UNLOCK_CORES ||
      (targetState.endgame?.totalShards || 0) > 0 ||
      (targetState.endgame?.transcensions || 0) > 0
    );
  }

  function isCrescentMissionAvailable(targetState = state) {
    return (targetState.endgame?.transcensions || 0) >= 1;
  }

  function getDiminishingSectorMultiplier(
    coefficient,
    power,
    targetState = state,
  ) {
    const level = Math.max(0, targetState.endgame?.sectorLevel || 0);
    const scaledLevel = Math.max(
      0,
      safePow(safeAdd(1, level), power) - 1,
    );
    return safeAdd(1, safeMultiply(scaledLevel, coefficient));
  }

  function getEndgameProductionMultiplier(targetState = state) {
    const protocolMultiplier = safePow(
      1.22,
      getEndgameProtocolRank("production", targetState),
    );
    const sectorMultiplier = getDiminishingSectorMultiplier(
      0.08,
      0.8,
      targetState,
    );
    return safeMultiply(protocolMultiplier, sectorMultiplier);
  }

  function getEndgameCoreMultiplier(targetState = state) {
    const protocolMultiplier = safePow(
      1.12,
      getEndgameProtocolRank("core", targetState),
    );
    const sectorMultiplier = getDiminishingSectorMultiplier(
      0.035,
      0.72,
      targetState,
    );
    return safeMultiply(protocolMultiplier, sectorMultiplier);
  }

  function getEndgameCombatMultiplier(targetState = state) {
    const protocolMultiplier = safePow(
      1.16,
      getEndgameProtocolRank("combat", targetState),
    );
    const sectorMultiplier = getDiminishingSectorMultiplier(
      0.05,
      0.75,
      targetState,
    );
    return safeMultiply(protocolMultiplier, sectorMultiplier);
  }

  function getEndgameStartingDust(targetState = state) {
    const rank = getEndgameProtocolRank("launch", targetState);
    if (rank <= 0) return 0;
    return Math.min(
      DUST_RESERVE_CAP,
      safeMultiply(2000, safePow(2.2, rank - 1)),
    );
  }

  function getEndgameProtocolCost(protocol, targetState = state) {
    const rank = getEndgameProtocolRank(protocol.id, targetState);
    return Math.max(
      1,
      Math.ceil(
        safeMultiply(protocol.baseCost, safePow(protocol.growth, rank)),
      ),
    );
  }

  function getSingularityCompanions(targetState = state) {
    const unlockedIds = new Set(targetState.endgame?.companions || []);
    return SINGULARITY_COMPANIONS.filter((companion) =>
      unlockedIds.has(companion.id),
    );
  }

  function getNextSingularityCompanion(targetState = state) {
    const unlockedIds = new Set(targetState.endgame?.companions || []);
    return (
      SINGULARITY_COMPANIONS.find(
        (companion) => !unlockedIds.has(companion.id),
      ) || null
    );
  }

  function getCompanionEvent(eventId) {
    return COMPANION_EVENTS.find((companionEvent) => companionEvent.id === eventId);
  }

  function getCompanionEventByCompanion(companionId) {
    return COMPANION_EVENTS.find(
      (companionEvent) => companionEvent.companionId === companionId,
    );
  }

  function getCompanionObservation(eventId, targetState = state) {
    return targetState.endgame?.companionObservations?.find(
      (observation) => observation.eventId === eventId,
    ) || null;
  }

  function formatCompanionRewards(rewards = {}) {
    const parts = [];
    if (rewards.fragments) parts.push(`星图残片 +${rewards.fragments}`);
    if (rewards.supplies) parts.push(`远征补给 +${rewards.supplies}`);
    if (rewards.tokens) parts.push(`航站凭证 +${rewards.tokens}`);
    if (rewards.materialsEach) {
      parts.push(`每种星港材料 +${rewards.materialsEach}`);
    }
    if (rewards.dustMinutes) parts.push(`${rewards.dustMinutes} 分钟星尘补给`);
    return parts.join(" · ");
  }

  function grantCompanionSignals(amount) {
    const before = state.endgame.companionSignals;
    state.endgame.companionSignals = Math.min(
      COMPANION_OBSERVATION_SIGNAL_CAP,
      clampGameCount(safeAdd(before, amount)),
    );
    return state.endgame.companionSignals - before;
  }

  function grantCompanionRewards(rewards = {}) {
    if (rewards.fragments) {
      state.expedition.fragments = Math.min(
        EXPEDITION_FRAGMENT_CAP,
        clampGameCount(safeAdd(state.expedition.fragments, rewards.fragments)),
      );
    }
    if (rewards.supplies) {
      state.expedition.supplies = Math.min(
        EXPEDITION_SUPPLY_CAP,
        clampGameCount(safeAdd(state.expedition.supplies, rewards.supplies)),
      );
    }
    if (rewards.tokens) grantMissionTokens(rewards.tokens);
    if (rewards.materialsEach) grantMissionMaterials(rewards.materialsEach);
    if (rewards.dustMinutes) {
      addDust(getMissionRewardDust(rewards.dustMinutes), {
        trackMissions: false,
      });
    }
  }

  function openCompanionEvent(companionId) {
    const companion = SINGULARITY_COMPANIONS.find(
      (entry) => entry.id === companionId,
    );
    const companionEvent = getCompanionEventByCompanion(companionId);
    if (
      !companion ||
      !companionEvent ||
      !state.endgame.companions.includes(companionId)
    ) {
      return;
    }
    const observation = getCompanionObservation(companionEvent.id);
    if (observation) {
      const choice = companionEvent.choices.find(
        (entry) => entry.id === observation.choiceId,
      );
      showToast(
        companionEvent.title,
        choice?.outcome || "这段伴星记录已经写入观测日志。",
        companion.icon,
      );
      return;
    }
    if (state.endgame.companionSignals < 1) {
      showToast(
        "观测信号不足",
        "完整远征、奇点坍缩或每日委托总奖励可以补充观测信号。",
        "⌁",
      );
      return;
    }
    state.endgame.activeCompanionEvent = companionEvent.id;
    renderCompanionObservatory();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    elements.companionObservatory.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }

  function closeCompanionEvent() {
    state.endgame.activeCompanionEvent = null;
    renderCompanionObservatory();
  }

  function resolveCompanionEvent(choiceId) {
    const companionEvent = getCompanionEvent(
      state.endgame.activeCompanionEvent,
    );
    const choice = companionEvent?.choices.find((entry) => entry.id === choiceId);
    const companion = SINGULARITY_COMPANIONS.find(
      (entry) => entry.id === companionEvent?.companionId,
    );
    if (
      !companionEvent ||
      !choice ||
      !companion ||
      state.endgame.companionSignals < 1 ||
      getCompanionObservation(companionEvent.id) ||
      !state.endgame.companions.includes(companion.id)
    ) {
      return;
    }
    state.endgame.companionSignals -= 1;
    state.endgame.companionObservations.push({
      eventId: companionEvent.id,
      choiceId: choice.id,
      completedAt: Date.now(),
    });
    state.endgame.activeCompanionEvent = null;
    grantCompanionRewards(choice.rewards);
    recordMissionProgress("companionObservations", 1);
    addLog(`伴星观测完成：${companion.name} · ${companionEvent.title} · ${choice.label}。`);
    showToast(
      "伴星观测已归档",
      `${choice.outcome} · ${formatCompanionRewards(choice.rewards)}`,
      companion.icon,
    );
    playAchievementTone();
    renderCompanionObservatory();
    updateUi();
    saveGame(false, { forceBackup: true });
  }

  function renderCompanionObservatory(
    companions = getSingularityCompanions(),
  ) {
    elements.companionObservatory.hidden = companions.length === 0;
    if (!companions.length) return;
    const observations = state.endgame.companionObservations;
    elements.companionSignalCount.textContent =
      `${state.endgame.companionSignals} / ${COMPANION_OBSERVATION_SIGNAL_CAP}`;
    elements.companionLogCount.textContent =
      `${observations.length} / ${COMPANION_EVENTS.length}`;

    const activeEvent = getCompanionEvent(state.endgame.activeCompanionEvent);
    const activeCompanion = SINGULARITY_COMPANIONS.find(
      (entry) => entry.id === activeEvent?.companionId,
    );
    const validActiveEvent =
      activeEvent &&
      activeCompanion &&
      state.endgame.companions.includes(activeCompanion.id) &&
      !getCompanionObservation(activeEvent.id);
    if (!validActiveEvent) state.endgame.activeCompanionEvent = null;
    elements.companionEventIdle.hidden = Boolean(validActiveEvent);
    elements.companionEventScene.hidden = !validActiveEvent;
    elements.companionEventChoices.textContent = "";
    if (validActiveEvent) {
      elements.companionEventIcon.textContent = activeCompanion.icon;
      elements.companionEventIcon.style.color = activeCompanion.color;
      elements.companionEventName.textContent = activeCompanion.name;
      elements.companionEventTitle.textContent = activeEvent.title;
      elements.companionEventDescription.textContent = activeEvent.description;
      activeEvent.choices.forEach((choice) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.companionEventChoice = choice.id;
        const copy = document.createElement("span");
        const name = document.createElement("strong");
        name.textContent = choice.label;
        const description = document.createElement("small");
        description.textContent = choice.description;
        copy.append(name, description);
        const reward = document.createElement("i");
        reward.textContent = formatCompanionRewards(choice.rewards);
        button.append(copy, reward);
        elements.companionEventChoices.appendChild(button);
      });
    }

    elements.companionLogGrid.textContent = "";
    COMPANION_EVENTS.forEach((companionEvent) => {
      const companion = SINGULARITY_COMPANIONS.find(
        (entry) => entry.id === companionEvent.companionId,
      );
      const unlocked = state.endgame.companions.includes(companion.id);
      const observation = getCompanionObservation(companionEvent.id);
      const choice = companionEvent.choices.find(
        (entry) => entry.id === observation?.choiceId,
      );
      const card = document.createElement("button");
      card.type = "button";
      card.className = `companion-log-card${observation ? " completed" : ""}${unlocked ? "" : " locked"}`;
      card.dataset.companionLog = companion.id;
      card.disabled = !unlocked;
      const icon = document.createElement("span");
      icon.textContent = unlocked ? companion.icon : "?";
      if (unlocked) icon.style.color = companion.color;
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = unlocked ? companionEvent.title : "未唤醒伴星记录";
      const detail = document.createElement("small");
      detail.textContent = observation
        ? `${companion.name} · ${choice.label}`
        : unlocked
          ? `${companion.name} · 等待观测`
          : "完成更多奇点坍缩后解锁";
      copy.append(name, detail);
      const status = document.createElement("i");
      status.textContent = observation ? "已归档" : unlocked ? "可观测" : "锁定";
      card.append(icon, copy, status);
      elements.companionLogGrid.appendChild(card);
    });
  }

  function renderCommandCompanions(targetState = state) {
    const companions = getSingularityCompanions(targetState);
    renderCompanionObservatory(companions);
    const signature = companions.map((companion) => companion.id).join("|");
    if (signature === renderedCommandCompanionSignature) return;
    renderedCommandCompanionSignature = signature;

    elements.commandCompanionStage.replaceChildren();
    elements.commandCompanionSystem.hidden = companions.length === 0;
    elements.commandCompanionCount.textContent = `${companions.length} / ${SINGULARITY_COMPANIONS.length}`;
    if (companions.length === 0) return;

    const fragment = document.createDocumentFragment();
    const orbitRadii = [108, 126, 142, 116, 136, 148, 122, 144];
    companions.forEach((companion, index) => {
      const orbitDuration = 19 + (index % 4) * 4.5;
      const body = document.createElement("button");
      body.type = "button";
      body.className = "command-companion";
      body.dataset.companionId = companion.id;
      body.dataset.companionName = companion.name;
      body.setAttribute(
        "aria-label",
        `${companion.name}：${companion.description} 纯观赏，无数值加成。`,
      );
      body.title = `${companion.name} · 点击查看介绍`;
      body.style.setProperty("--companion-color", companion.color);
      body.style.setProperty("--companion-glow", companion.glow);
      body.style.setProperty("--companion-radius", `${orbitRadii[index]}px`);
      body.style.setProperty("--companion-duration", `${orbitDuration}s`);
      body.style.setProperty(
        "--companion-delay",
        `${-(orbitDuration * index) / Math.max(1, companions.length)}s`,
      );
      if (index % 2 === 1) body.classList.add("reverse");

      const shell = document.createElement("span");
      shell.className = "command-companion-body";
      const glyph = document.createElement("span");
      glyph.className = "command-companion-glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = companion.icon;
      const name = document.createElement("span");
      name.className = "command-companion-name";
      name.textContent = companion.name;
      shell.append(glyph, name);
      body.append(shell);
      body.addEventListener("click", () => {
        openCompanionEvent(companion.id);
      });
      fragment.append(body);
    });
    elements.commandCompanionStage.append(fragment);
  }

  function getTranscendGain(targetState = state) {
    const totalCores = getHistoricalCores(targetState);
    if (totalCores < ENDGAME_UNLOCK_CORES) return 0;
    const effectiveCores = softCapGameNumber(
      totalCores,
      TRANSCEND_CORE_SOFT_CAP,
      TRANSCEND_CORE_LATE_POWER,
    );
    const baseGain = safePow(
      effectiveCores / ENDGAME_UNLOCK_CORES,
      0.42,
    );
    const collapseBoost = safeAdd(
      1,
      safeMultiply(
        getEndgameProtocolRank("collapse", targetState),
        0.3,
      ),
    );
    return Math.floor(safeMultiply(baseGain, collapseBoost));
  }

  function getSectorObjective(targetState = state) {
    const level = targetState.endgame?.sectorLevel || 0;
    const band = Math.floor(level / 3);
    const typeIndex = level % 3;
    const reward = clampGameCount(
      1 + Math.floor(Math.sqrt(level) / 3),
    );
    if (typeIndex === 0) {
      const target = Math.min(
        80000000,
        Math.round(
          softCapGameNumber(
            safeMultiply(2000000, safePow(1.45, band)),
            20000000,
            0.35,
          ),
        ),
      );
      return {
        level,
        type: "资源航道",
        title: `边境星区 ${level + 1}`,
        description: "在本星区回收指定星尘，稳定远距离补给通道。",
        current: targetState.endgame?.sectorDust || 0,
        target,
        reward,
      };
    }
    if (typeIndex === 1) {
      const target = clampGameCount(
        Math.min(2500, 40 + band * 10),
      );
      return {
        level,
        type: "建设航道",
        title: `边境星区 ${level + 1}`,
        description: "在本星区新增自动化单元，建立边境工业网络。",
        current: targetState.endgame?.sectorUnits || 0,
        target,
        reward,
      };
    }
    const target = clampGameCount(
      Math.min(200, 5 + Math.floor(safePow(band + 1, 0.72) * 2)),
    );
    return {
      level,
      type: "武装航道",
      title: `边境星区 ${level + 1}`,
      description: "在本星区赢得战斗，清除阻挡跃迁坐标的威胁。",
      current: targetState.endgame?.sectorWins || 0,
      target,
      reward,
    };
  }

  function getCoreMilestoneProductionMultiplier(targetState = state) {
    const total = getHistoricalCores(targetState);
    let multiplier = 1;
    if (total >= 15) multiplier *= 1.5;
    if (total >= 50) multiplier *= 1.75;
    if (total >= 200) multiplier *= 2;
    return multiplier;
  }

  function getCoreMultiplier(targetState = state) {
    const total = getHistoricalCores(targetState);
    const rawHistoricalBoost = safeAdd(
      1,
      safeMultiply(safePow(total, 0.82), 0.3),
      safeMultiply(safePow(total, 0.5), 0.04),
    );
    const historicalBoost = softCapGameNumber(
      rawHistoricalBoost,
      CORE_MULTIPLIER_SOFT_CAP,
      CORE_MULTIPLIER_LATE_POWER,
    );
    const resonanceBoost = safeAdd(
      1,
      safeMultiply(getCoreShopRank("resonance", targetState), 0.1),
    );
    return safeMultiply(
      historicalBoost,
      resonanceBoost,
      getCoreMilestoneProductionMultiplier(targetState),
    );
  }

  function getCoreGainMultiplier(targetState = state) {
    const total = getHistoricalCores(targetState);
    let multiplier = safeAdd(
      1,
      safeMultiply(getCoreShopRank("refinement", targetState), 0.08),
    );
    if (total >= 30) multiplier = safeMultiply(multiplier, 1.25);
    if (total >= 100) multiplier = safeMultiply(multiplier, 1.4);
    return safeMultiply(multiplier, getEndgameCoreMultiplier(targetState));
  }

  function getBattleRewardMultiplier(targetState = state) {
    const total = getHistoricalCores(targetState);
    return total >= 5 ? 1.1 : 1;
  }

  function getCombatCoreMultiplier(targetState = state) {
    const total = getHistoricalCores(targetState);
    let multiplier = 1 + getCoreShopRank("tactics", targetState) * 0.1;
    if (total >= 200) multiplier *= 1.25;
    return safeMultiply(
      multiplier,
      getEndgameCombatMultiplier(targetState),
    );
  }

  function getReconstructionCostMultiplier(targetState = state) {
    const rebirths = Math.max(0, targetState.rebirths || 0);
    return Math.min(
      3,
      safeAdd(1, safeMultiply(0.12, safePow(rebirths, 0.45))),
    );
  }

  function getStarportRank(id, targetState = state) {
    return targetState.starport?.modules?.[id] || 0;
  }

  function getTotalStarportRanks(targetState = state) {
    return STARPORT_MODULES.reduce(
      (total, module) => total + getStarportRank(module.id, targetState),
      0,
    );
  }

  function getStarportProductionMultiplier(targetState = state) {
    return safeMultiply(
      safeAdd(
        1,
        safeMultiply(getStarportRank("refinery", targetState), 0.08),
      ),
      safeAdd(
        1,
        safeMultiply(getStarportRank("droneDock", targetState), 0.04),
      ),
    );
  }

  function getStarportClickMultiplier(targetState = state) {
    return safeAdd(
      1,
      safeMultiply(getStarportRank("droneDock", targetState), 0.08),
    );
  }

  function getStarportBuildingCostMultiplier(targetState = state) {
    return 1 /
      safeAdd(
        1,
        safeMultiply(getStarportRank("logistics", targetState), 0.03),
      );
  }

  function getStarportAttackMultiplier(targetState = state) {
    return safeAdd(
      1,
      safeMultiply(getStarportRank("battery", targetState), 0.08),
    );
  }

  function getStarportDefenseMultiplier(targetState = state) {
    return safeAdd(
      1,
      safeMultiply(getStarportRank("shield", targetState), 0.08),
    );
  }

  function getStarportLootMultiplier(targetState = state) {
    return safeAdd(
      1,
      safeMultiply(getStarportRank("radar", targetState), 0.08),
    );
  }

  function getStarportCooldownMultiplier(targetState = state) {
    return Math.max(
      0.76,
      1 - getStarportRank("radar", targetState) * 0.02,
    );
  }

  function getStarportModuleCost(module, targetState = state) {
    const rank = getStarportRank(module.id, targetState);
    const cost = {
      dust: Math.min(
        MAX_BUILDING_UNIT_COST,
        Math.max(
          1,
          Math.ceil(
            safeMultiply(
              module.baseDustCost,
              safePow(module.dustGrowth, rank),
            ),
          ),
        ),
      ),
    };
    STARPORT_MATERIALS.forEach((material) => {
      const baseAmount = module.baseCost[material.id] || 0;
      if (baseAmount > 0) {
        cost[material.id] = Math.max(
          1,
          Math.ceil(
            safeMultiply(baseAmount, safePow(module.growth, rank)),
          ),
        );
      }
    });
    return cost;
  }

  function canAffordStarportModule(module, targetState = state) {
    if (getStarportRank(module.id, targetState) >= module.maxRank) return false;
    const cost = getStarportModuleCost(module, targetState);
    return (
      (targetState.dust || 0) >= cost.dust &&
      STARPORT_MATERIALS.every(
        (material) =>
          (targetState.starport?.materials?.[material.id] || 0) >=
          (cost[material.id] || 0),
      )
    );
  }

  function getMaxOfflineSeconds(targetState = state) {
    return (
      BASE_MAX_OFFLINE_SECONDS +
      getCoreShopRank("offline", targetState) * 2 * 60 * 60
    );
  }

  function getCoreShopCost(item, targetState = state) {
    const rank = getCoreShopRank(item.id, targetState);
    return Math.max(
      1,
      Math.ceil(safeMultiply(item.baseCost, safePow(item.growth, rank))),
    );
  }

  function hasUpgrade(id, targetState = state) {
    return targetState.upgrades.includes(id);
  }

  function getUpgradeRequirements(upgrade) {
    return (upgrade?.requires || [])
      .map((id) => UPGRADES.find((entry) => entry.id === id))
      .filter(Boolean);
  }

  function isUpgradePathAvailable(upgrade, targetState = state) {
    return getUpgradeRequirements(upgrade).every((requirement) =>
      hasUpgrade(requirement.id, targetState),
    );
  }

  function getUpgradeImpact(upgrade, targetState = state) {
    if (!upgrade || hasUpgrade(upgrade.id, targetState)) {
      return { kind: "complete", before: 0, after: 0, increase: 0 };
    }
    const previewState = {
      ...targetState,
      upgrades: [...targetState.upgrades, upgrade.id],
    };
    if (upgrade.effect.click) {
      const before = getClickValue(targetState);
      const after = getClickValue(previewState);
      return {
        kind: "click",
        before,
        after,
        increase: Math.max(0, after - before),
      };
    }
    const before = calculateRate(targetState, false);
    const after = calculateRate(previewState, false);
    return {
      kind: "production",
      before,
      after,
      increase: Math.max(0, after - before),
    };
  }

  function getClickValue(targetState = state) {
    let multiplier = safeMultiply(
      getCoreMultiplier(targetState),
      getAchievementMultiplier(targetState),
      getEndgameProductionMultiplier(targetState),
    );
    multiplier = safeMultiply(
      multiplier,
      safeAdd(
        1,
        safeMultiply(getCoreShopRank("capacitor", targetState), 0.25),
      ),
    );
    UPGRADES.forEach((upgrade) => {
      if (hasUpgrade(upgrade.id, targetState) && upgrade.effect.click) {
        multiplier = safeMultiply(multiplier, upgrade.effect.click);
      }
    });
    if (targetState.buff?.id === "precision" && targetState.buff.expires > Date.now()) {
      multiplier = safeMultiply(multiplier, 5);
    }
    return Math.min(
      MAX_CLICK_VALUE,
      safeMultiply(
        softCapGameNumber(multiplier, CLICK_SOFT_CAP, CLICK_LATE_POWER),
        getStarportClickMultiplier(targetState),
      ),
    );
  }

  function getBuildingMultiplier(buildingId, targetState = state) {
    let multiplier = 1;
    UPGRADES.forEach((upgrade) => {
      if (!hasUpgrade(upgrade.id, targetState)) return;
      const effect = upgrade.effect;
      if (effect.global) multiplier = safeMultiply(multiplier, effect.global);
      if (effect.building === buildingId) {
        multiplier = safeMultiply(multiplier, effect.multiplier);
      }
      if (effect.buildings?.includes(buildingId)) {
        multiplier = safeMultiply(multiplier, effect.multiplier);
      }
    });
    return multiplier;
  }

  function compressAutomaticRate(value) {
    return Math.min(
      DUST_RESERVE_CAP,
      softCapGameNumber(
        value,
        AUTOMATIC_RATE_SOFT_CAP,
        AUTOMATIC_RATE_LATE_POWER,
      ),
    );
  }

  function getAutomaticProductionMultiplier(
    targetState = state,
    includeTemporary = true,
  ) {
    let multiplier = safeMultiply(
      getCoreMultiplier(targetState),
      getAchievementMultiplier(targetState),
      getEndgameProductionMultiplier(targetState),
      getStarportProductionMultiplier(targetState),
      getFleetProductionMultiplier(targetState),
      safeAdd(
        1,
        safeMultiply(getCoreShopRank("automation", targetState), 0.1),
      ),
    );
    if (
      includeTemporary &&
      targetState.buff?.id === "surge" &&
      targetState.buff.expires > Date.now()
    ) {
      multiplier = safeMultiply(multiplier, 2);
    }
    return Math.min(MAX_AUTOMATIC_PRODUCTION_MULTIPLIER, multiplier);
  }

  function getBuildingCoordinationMultiplier(
    buildingId,
    targetState = state,
  ) {
    const owned = targetState.buildings?.[buildingId] || 0;
    return safePow(
      BUILDING_COORDINATION_MULTIPLIER,
      Math.min(
        BUILDING_COORDINATION_MAX_EXPONENT,
        owned / BUILDING_COORDINATION_DOUBLING_UNITS,
      ),
    );
  }

  function calculateBuildingRawRate(
    building,
    targetState = state,
    includeTemporary = true,
  ) {
    if (!building) return 0;
    const owned = targetState.buildings[building.id] || 0;
    return safeMultiply(
      owned,
      building.baseRate,
      getBuildingMultiplier(building.id, targetState),
      getBuildingCoordinationMultiplier(building.id, targetState),
      getAutomaticProductionMultiplier(targetState, includeTemporary),
    );
  }

  function calculateRawRate(targetState = state, includeTemporary = true) {
    return BUILDINGS.reduce(
      (rate, building) =>
        safeAdd(
          rate,
          calculateBuildingRawRate(building, targetState, includeTemporary),
        ),
      0,
    );
  }

  function calculateRate(targetState = state, includeTemporary = true) {
    return compressAutomaticRate(
      calculateRawRate(targetState, includeTemporary),
    );
  }

  function getBuildingRateBreakdown(
    buildingId,
    targetState = state,
    includeTemporary = true,
    purchaseAmount = 1,
  ) {
    const building = BUILDINGS.find((entry) => entry.id === buildingId);
    if (!building) {
      return {
        total: 0,
        rawTotal: 0,
        perUnit: 0,
        purchaseIncrease: 0,
        currentRate: 0,
        nextRate: 0,
      };
    }
    const owned = targetState.buildings[buildingId] || 0;
    const amount = clampGameCount(purchaseAmount);
    const rawContribution = calculateBuildingRawRate(
      building,
      targetState,
      includeTemporary,
    );
    const rawRate = calculateRawRate(targetState, includeTemporary);
    const currentRate = compressAutomaticRate(rawRate);
    const effectiveContribution = rawRate > 0
      ? safeMultiply(currentRate, rawContribution / rawRate)
      : 0;
    const previewState = {
      ...targetState,
      buildings: {
        ...targetState.buildings,
        [buildingId]: clampGameCount(owned + amount),
      },
    };
    const nextRate = amount > 0
      ? calculateRate(previewState, includeTemporary)
      : currentRate;
    const purchaseIncrease = Math.max(0, nextRate - currentRate);
    return {
      total: effectiveContribution,
      rawTotal: rawContribution,
      perUnit: amount > 0 ? purchaseIncrease / amount : 0,
      purchaseIncrease,
      currentRate,
      nextRate,
    };
  }

  function buildingCost(building, owned, amount, targetState = state) {
    return cappedGeometricSeriesCost(
      building.baseCost,
      BUILDING_GROWTH,
      owned,
      amount,
      safeMultiply(
        getReconstructionCostMultiplier(targetState),
        getStarportBuildingCostMultiplier(targetState),
      ),
      MAX_BUILDING_UNIT_COST,
    );
  }

  function maxAffordable(building, availableDust, owned, targetState = state) {
    return maxAffordableCappedGeometric(
      building.baseCost,
      BUILDING_GROWTH,
      availableDust,
      owned,
      safeMultiply(
        getReconstructionCostMultiplier(targetState),
        getStarportBuildingCostMultiplier(targetState),
      ),
      MAX_BUILDING_UNIT_COST,
    );
  }

  function selectedPurchase(building) {
    const owned = state.buildings[building.id] || 0;
    if (state.buyMode === "max") {
      const amount = maxAffordable(building, state.dust, owned);
      return { amount, cost: buildingCost(building, owned, amount) };
    }
    const amount = Number(state.buyMode);
    return { amount, cost: buildingCost(building, owned, amount) };
  }

  function getUtcDailyKey(now = Date.now()) {
    return new Date(now).toISOString().slice(0, 10);
  }

  function getUtcWeeklyKey(now = Date.now()) {
    const date = new Date(now);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
  }

  function getNextDailyReset(now = Date.now()) {
    const reset = new Date(now);
    reset.setUTCHours(24, 0, 0, 0);
    return reset.getTime();
  }

  function getNextWeeklyReset(now = Date.now()) {
    const reset = new Date(now);
    reset.setUTCHours(0, 0, 0, 0);
    const weekday = reset.getUTCDay() || 7;
    reset.setUTCDate(reset.getUTCDate() + (8 - weekday));
    return reset.getTime();
  }

  function hashMissionSeed(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededMissionShuffle(values, seedText) {
    const shuffled = [...values];
    let seed = hashMissionSeed(seedText) || 1;
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const target = seed % (index + 1);
      [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
    }
    return shuffled;
  }

  function roundMissionTarget(value) {
    const safeValue = Math.max(1, clampGameNumber(value));
    if (safeValue < 100) return Math.ceil(safeValue / 5) * 5;
    const magnitude = 10 ** Math.floor(Math.log10(safeValue));
    const step = Math.max(10, magnitude / 10);
    return Math.ceil(safeValue / step) * step;
  }

  function getMissionDustTarget(kind, targetState = state, multiplier = 1) {
    const automaticRate = calculateRate(targetState, false);
    const clickValue = getClickValue(targetState);
    const base = kind === "weekly"
      ? Math.max(1200, safeMultiply(automaticRate, 7200), safeMultiply(clickValue, 450))
      : Math.max(120, safeMultiply(automaticRate, 600), safeMultiply(clickValue, 60));
    return Math.min(
      DUST_RESERVE_CAP,
      roundMissionTarget(safeMultiply(base, multiplier)),
    );
  }

  function getMissionTemplate(templateId) {
    return MISSION_TEMPLATES.find((template) => template.id === templateId);
  }

  function createMissionAssignment(template, kind, targetState = state) {
    const targetFactory = kind === "weekly"
      ? template.weeklyTarget
      : template.dailyTarget;
    return {
      templateId: template.id,
      target: Math.max(1, clampGameNumber(targetFactory(targetState))),
      progress: 0,
      claimed: false,
    };
  }

  function buildMissionPeriod(kind, key, targetState = state) {
    const eligibleTemplates = MISSION_TEMPLATES.filter((template) => {
      if (kind === "daily" && template.weeklyOnly) return false;
      if (kind === "weekly" && typeof template.weeklyTarget !== "function") return false;
      return template.eligible(targetState);
    });
    const preferredId = kind === "daily" ? "dustEarned" : "dailyClaims";
    const preferred = eligibleTemplates.find((template) => template.id === preferredId);
    const remainder = seededMissionShuffle(
      eligibleTemplates.filter((template) => template !== preferred),
      `${kind}:${key}:${normalizePlayerName(targetState.playerName) || "station"}`,
    );
    const selected = preferred ? [preferred, ...remainder] : remainder;
    const period = freshMissionPeriod(kind);
    period.key = key;
    period.items = selected
      .slice(0, 5)
      .map((template) => createMissionAssignment(template, kind, targetState));
    return period;
  }

  function sanitizeMissionPeriod(rawPeriod, kind) {
    const clean = freshMissionPeriod(kind);
    if (!rawPeriod || typeof rawPeriod !== "object") return clean;
    clean.key = typeof rawPeriod.key === "string" ? rawPeriod.key.slice(0, 16) : "";
    const seen = new Set();
    clean.items = Array.isArray(rawPeriod.items)
      ? rawPeriod.items
          .filter((item) => {
            const template = getMissionTemplate(item?.templateId);
            if (!template || seen.has(template.id)) return false;
            if (kind === "daily" && template.weeklyOnly) return false;
            seen.add(template.id);
            return true;
          })
          .slice(0, 5)
          .map((item) => {
            const target = Math.max(1, clampGameNumber(item.target));
            return {
              templateId: item.templateId,
              target,
              progress: Math.min(target, clampGameNumber(item.progress)),
              claimed: item.claimed === true,
            };
          })
      : [];
    if (kind === "daily") {
      clean.rerollsUsed = clamp(Math.floor(Number(rawPeriod.rerollsUsed) || 0), 0, 1);
      clean.completionClaimed = rawPeriod.completionClaimed === true;
    } else {
      clean.milestonesClaimed = Array.isArray(rawPeriod.milestonesClaimed)
        ? [...new Set(rawPeriod.milestonesClaimed.map((value) => Math.floor(Number(value))))]
            .filter((value) => value >= 0 && value < WEEKLY_MISSION_MILESTONES.length)
        : [];
    }
    return clean;
  }

  function sanitizeMissionState(rawMissions) {
    const clean = freshMissionState();
    if (!rawMissions || typeof rawMissions !== "object") return clean;
    clean.tokens = Math.min(
      MISSION_TOKEN_CAP,
      clampGameCount(rawMissions.tokens),
    );
    clean.daily = sanitizeMissionPeriod(rawMissions.daily, "daily");
    clean.weekly = sanitizeMissionPeriod(rawMissions.weekly, "weekly");
    return clean;
  }

  function getStarfallPhase(now = Date.now()) {
    if (now < STARFALL_EVENT_START) return "preview";
    if (now < STARFALL_EVENT_END) return "active";
    if (now < STARFALL_EXCHANGE_END) return "exchange";
    return "archived";
  }

  function hasStarfallParticipation(targetState = state) {
    const eventState = targetState.starfall;
    return Boolean(
      eventState &&
      (eventState.totalEarned > 0 ||
        eventState.currency > 0 ||
        eventState.dayRecords?.length ||
        Object.keys(eventState.letterChoices || {}).length ||
        Object.values(eventState.cosmetics || {}).some(Boolean)),
    );
  }

  function sanitizeStarfallState(rawStarfall) {
    const clean = freshStarfallState();
    if (!rawStarfall || typeof rawStarfall !== "object") return clean;
    clean.currency = Math.min(
      STARFALL_CURRENCY_CAP,
      clampGameCount(rawStarfall.currency),
    );
    clean.totalEarned = Math.min(
      STARFALL_CURRENCY_CAP,
      Math.max(clean.currency, clampGameCount(rawStarfall.totalEarned)),
    );
    const validRoutes = new Set(STARFALL_ROUTE_TASKS.map((route) => route.id));
    const seenDayKeys = new Set();
    clean.dayRecords = Array.isArray(rawStarfall.dayRecords)
      ? rawStarfall.dayRecords.slice(-18).flatMap((record) => {
          const key = /^2026-(08-(0[8-9]|1\d|2[0-2]))$/.test(String(record?.key || ""))
            ? String(record.key)
            : "";
          if (!key || seenDayKeys.has(key)) return [];
          const optionIds = Array.isArray(record.optionIds)
            ? [...new Set(record.optionIds.filter((id) => validRoutes.has(id)))].slice(0, 3)
            : [];
          if (optionIds.length < 3) return [];
          seenDayKeys.add(key);
          const selectedId = optionIds.includes(record.selectedId)
            ? record.selectedId
            : "";
          return [{
            key,
            optionIds,
            selectedId,
            target: selectedId
              ? Math.max(1, Math.min(999000000, clampGameNumber(record.target)))
              : 0,
            progress: selectedId
              ? Math.min(
                  Math.max(1, Math.min(999000000, clampGameNumber(record.target))),
                  clampGameNumber(record.progress),
                )
              : 0,
            claimed: record.claimed === true,
          }];
        })
      : [];
    clean.completedDays = Array.isArray(rawStarfall.completedDays)
      ? [...new Set(rawStarfall.completedDays.filter((key) => seenDayKeys.has(key)))].slice(-14)
      : [];
    STARFALL_LETTERS.forEach((letter) => {
      const choice = letter.choices.find(
        (entry) => entry.id === rawStarfall.letterChoices?.[letter.id],
      );
      if (choice) clean.letterChoices[letter.id] = choice.id;
    });
    const validMilestones = new Set(STARFALL_MILESTONES.map((entry) => entry.id));
    clean.claimedMilestones = Array.isArray(rawStarfall.claimedMilestones)
      ? [...new Set(rawStarfall.claimedMilestones.filter((id) => validMilestones.has(id)))]
      : [];
    STARFALL_STORE_ITEMS.forEach((item) => {
      const count = clampGameCount(rawStarfall.purchases?.[item.id]);
      clean.purchases[item.id] = item.limit ? Math.min(item.limit, count) : count;
    });
    Object.keys(clean.cosmetics).forEach((key) => {
      clean.cosmetics[key] = rawStarfall.cosmetics?.[key] === true;
    });
    clean.firstOpened = rawStarfall.firstOpened === true;
    return clean;
  }

  function getStarfallDayIndex(now = Date.now()) {
    const boundedNow = Math.min(now, STARFALL_EVENT_END - 1);
    return clamp(
      Math.floor((boundedNow - STARFALL_EVENT_START) / STARFALL_DAY_MS),
      0,
      14,
    );
  }

  function getStarfallDayKey(index) {
    return getUtcDailyKey(STARFALL_EVENT_START + index * STARFALL_DAY_MS);
  }

  function getStarfallRoute(routeId) {
    return STARFALL_ROUTE_TASKS.find((route) => route.id === routeId);
  }

  function createStarfallDayRecord(index) {
    const key = getStarfallDayKey(index);
    const eligible = STARFALL_ROUTE_TASKS.filter((route) => route.eligible(state));
    const optionIds = seededMissionShuffle(
      eligible,
      `starfall:${key}:${normalizePlayerName(state.playerName) || "航站"}`,
    ).slice(0, 3).map((route) => route.id);
    return {
      key,
      optionIds,
      selectedId: "",
      target: 0,
      progress: 0,
      claimed: false,
    };
  }

  function getAvailableStarfallDayKeys(now = Date.now()) {
    if (getStarfallPhase(now) !== "active") return [];
    const currentIndex = getStarfallDayIndex(now);
    const firstIndex = Math.max(0, currentIndex - STARFALL_CATCHUP_DAYS + 1);
    return Array.from(
      { length: currentIndex - firstIndex + 1 },
      (_, offset) => getStarfallDayKey(firstIndex + offset),
    );
  }

  function ensureStarfallDays(now = Date.now()) {
    if (!state.starfall || typeof state.starfall !== "object") {
      state.starfall = freshStarfallState();
    }
    if (getStarfallPhase(now) !== "active") return false;
    let changed = false;
    const currentIndex = getStarfallDayIndex(now);
    const firstIndex = Math.max(0, currentIndex - STARFALL_CATCHUP_DAYS + 1);
    for (let index = firstIndex; index <= currentIndex; index += 1) {
      const key = getStarfallDayKey(index);
      if (!state.starfall.dayRecords.some((record) => record.key === key)) {
        state.starfall.dayRecords.push(createStarfallDayRecord(index));
        changed = true;
      }
    }
    state.starfall.dayRecords.sort((left, right) => left.key.localeCompare(right.key));
    if (state.starfall.dayRecords.length > 15) {
      state.starfall.dayRecords = state.starfall.dayRecords.slice(-15);
      changed = true;
    }
    return changed;
  }

  function grantStarfallCurrency(amount) {
    const safeAmount = Math.max(0, clampGameCount(amount));
    if (!safeAmount) return 0;
    const before = state.starfall.currency;
    state.starfall.currency = Math.min(
      STARFALL_CURRENCY_CAP,
      state.starfall.currency + safeAmount,
    );
    const applied = state.starfall.currency - before;
    state.starfall.totalEarned = Math.min(
      STARFALL_CURRENCY_CAP,
      state.starfall.totalEarned + applied,
    );
    return applied;
  }

  function recordStarfallProgress(metric, amount = 1, now = Date.now()) {
    if (getStarfallPhase(now) !== "active") return;
    ensureStarfallDays(now);
    const availableKeys = new Set(getAvailableStarfallDayKeys(now));
    state.starfall.dayRecords.forEach((record) => {
      if (!availableKeys.has(record.key) || record.claimed || !record.selectedId) return;
      const route = getStarfallRoute(record.selectedId);
      if (!route || route.metric !== metric || record.progress >= record.target) return;
      record.progress = Math.min(
        record.target,
        safeAdd(record.progress, clampGameNumber(amount)),
      );
    });
  }

  function selectStarfallRoute(dayKey, routeId) {
    if (getStarfallPhase() !== "active") return;
    ensureStarfallDays();
    if (!getAvailableStarfallDayKeys().includes(dayKey)) return;
    const record = state.starfall.dayRecords.find((entry) => entry.key === dayKey);
    const route = getStarfallRoute(routeId);
    if (!record || record.selectedId || !record.optionIds.includes(routeId) || !route) return;
    record.selectedId = routeId;
    record.target = Math.max(1, clampGameNumber(route.target(state)));
    record.progress = 0;
    showToast("星路已确认", `${route.title} · 完成后获得 ${STARFALL_DAILY_REWARD} 余辉`, "☄");
    renderStarfallEvent();
    saveGame();
  }

  function claimStarfallRoute(dayKey) {
    if (getStarfallPhase() !== "active") return;
    const record = state.starfall.dayRecords.find((entry) => entry.key === dayKey);
    if (
      !record ||
      !getAvailableStarfallDayKeys().includes(dayKey) ||
      record.claimed ||
      record.progress < record.target
    ) return;
    record.claimed = true;
    if (!state.starfall.completedDays.includes(dayKey)) {
      state.starfall.completedDays.push(dayKey);
    }
    const gained = grantStarfallCurrency(STARFALL_DAILY_REWARD);
    addLog(`星雨寄航：完成 ${dayKey} 星路。`);
    showToast("星路抵达", `星雨余辉 +${gained}`, "☄");
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function getStarfallLetterUnlockAt(letter) {
    return STARFALL_EVENT_START + letter.offset * STARFALL_DAY_MS;
  }

  function chooseStarfallLetter(letterId, choiceId) {
    const phase = getStarfallPhase();
    if (!state.starfall || phase === "preview" || phase === "archived") return;
    const letter = STARFALL_LETTERS.find((entry) => entry.id === letterId);
    const choice = letter?.choices.find((entry) => entry.id === choiceId);
    if (!letter || !choice || Date.now() < getStarfallLetterUnlockAt(letter)) return;
    if (state.starfall.letterChoices[letter.id]) return;
    state.starfall.letterChoices[letter.id] = choice.id;
    const reward = phase === "active" ? grantStarfallCurrency(STARFALL_LETTER_REWARD) : 0;
    showToast(
      "星雨信笺已归档",
      reward ? `${choice.result} · 余辉 +${reward}` : choice.result,
      "✉",
    );
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function claimStarfallMilestone(milestoneId) {
    const phase = getStarfallPhase();
    if (phase === "preview" || phase === "archived") return;
    const milestone = STARFALL_MILESTONES.find((entry) => entry.id === milestoneId);
    if (
      !milestone ||
      state.starfall.totalEarned < milestone.required ||
      state.starfall.claimedMilestones.includes(milestone.id)
    ) return;
    state.starfall.claimedMilestones.push(milestone.id);
    if (milestone.type === "dust") {
      addDust(getMissionRewardDust(5), { trackMissions: false });
    } else if (milestone.type === "supplies") {
      state.expedition.supplies = Math.min(EXPEDITION_SUPPLY_CAP, state.expedition.supplies + 4);
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 12);
    } else if (milestone.type === "title") {
      state.starfall.cosmetics.title = true;
    } else if (milestone.type === "beacon") {
      state.starfall.cosmetics.beacon = true;
    } else if (milestone.type === "letter") {
      state.starfall.cosmetics.letter = true;
    } else if (milestone.type === "starport") {
      state.starfall.cosmetics.starport = true;
    } else if (milestone.type === "eighth") {
      state.starfall.cosmetics.backdrop = true;
      state.starfall.cosmetics.keepsake = true;
    }
    applyStarfallCosmetics();
    showToast("星雨里程碑已领取", milestone.reward, "✦");
    renderStarfallEvent();
    saveGame();
  }

  function purchaseStarfallItem(itemId) {
    const phase = getStarfallPhase();
    if (phase !== "active" && phase !== "exchange") return;
    const item = STARFALL_STORE_ITEMS.find((entry) => entry.id === itemId);
    const bought = clampGameCount(state.starfall.purchases[itemId]);
    if (!item || state.starfall.currency < item.cost || (item.limit && bought >= item.limit)) return;
    state.starfall.currency -= item.cost;
    state.starfall.purchases[itemId] = bought + 1;
    if (item.id === "emblem") {
      state.starfall.cosmetics.emblem = true;
    } else if (item.id === "postcard") {
      state.starfall.cosmetics.postcard = true;
    } else if (item.id === "dust") {
      addDust(getMissionRewardDust(5), { trackMissions: false });
    } else if (item.id === "materials") {
      STARPORT_MATERIALS.forEach((material) => {
        state.starport.materials[material.id] = Math.min(
          999000,
          state.starport.materials[material.id] + 3,
        );
      });
    } else if (item.id === "components") {
      OPERATION_COMPONENTS.forEach((component) => addOperationComponent(component.id, 2));
    } else if (item.id === "expedition") {
      state.expedition.supplies = Math.min(EXPEDITION_SUPPLY_CAP, state.expedition.supplies + 2);
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 6);
    }
    applyStarfallCosmetics();
    showToast("兑换完成", `${item.title}已送达航站。`, "☄");
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function ensureMissionPeriods(now = Date.now()) {
    if (!state.missions || typeof state.missions !== "object") {
      state.missions = freshMissionState();
    }
    let changed = false;
    const dailyKey = getUtcDailyKey(now);
    if (
      state.missions.daily?.key !== dailyKey ||
      !Array.isArray(state.missions.daily?.items) ||
      state.missions.daily.items.length < 1
    ) {
      state.missions.daily = buildMissionPeriod("daily", dailyKey);
      changed = true;
    }
    const weeklyKey = getUtcWeeklyKey(now);
    if (
      state.missions.weekly?.key !== weeklyKey ||
      !Array.isArray(state.missions.weekly?.items) ||
      state.missions.weekly.items.length < 1
    ) {
      state.missions.weekly = buildMissionPeriod("weekly", weeklyKey);
      changed = true;
    }
    return changed;
  }

  function recordMissionProgress(metric, amount = 1) {
    const safeAmount = clampGameNumber(amount);
    if (safeAmount <= 0) return;
    ensureMissionPeriods();
    [state.missions.daily, state.missions.weekly].forEach((period) => {
      period.items.forEach((item) => {
        const template = getMissionTemplate(item.templateId);
        if (!template || template.metric !== metric || item.progress >= item.target) return;
        item.progress = Math.min(item.target, safeAdd(item.progress, safeAmount));
      });
    });
    recordStarfallProgress(metric, safeAmount);
  }

  function getCompletedMissionCount(period) {
    return period.items.filter((item) => item.progress >= item.target).length;
  }

  function getMissionClaimableCount() {
    ensureMissionPeriods();
    const itemClaims = [state.missions.daily, state.missions.weekly]
      .flatMap((period) => period.items)
      .filter((item) => !item.claimed && item.progress >= item.target).length;
    const dailyBonus =
      !state.missions.daily.completionClaimed &&
      getCompletedMissionCount(state.missions.daily) >= 3
        ? 1
        : 0;
    const weeklyClaims = WEEKLY_MISSION_MILESTONES.filter(
      (milestone, index) =>
        !state.missions.weekly.milestonesClaimed.includes(index) &&
        getCompletedMissionCount(state.missions.weekly) >= milestone.required,
    ).length;
    return itemClaims + dailyBonus + weeklyClaims;
  }

  function grantMissionTokens(amount) {
    state.missions.tokens = Math.min(
      MISSION_TOKEN_CAP,
      clampGameCount(safeAdd(state.missions.tokens, amount)),
    );
  }

  function getMissionRewardDust(minutes, targetState = state) {
    return Math.min(
      safeMultiply(DUST_RESERVE_CAP, 0.04),
      Math.max(
        100,
        safeMultiply(calculateRate(targetState, false), minutes * 60),
        safeMultiply(getClickValue(targetState), minutes * 12),
      ),
    );
  }

  function grantMissionMaterials(amount) {
    if (amount <= 0) return;
    STARPORT_MATERIALS.forEach((material) => {
      state.starport.materials[material.id] = clampGameCount(
        safeAdd(state.starport.materials[material.id], amount),
      );
    });
  }

  function claimMission(kind, index) {
    ensureMissionPeriods();
    const period = kind === "weekly" ? state.missions.weekly : state.missions.daily;
    const item = period.items[index];
    if (!item || item.claimed || item.progress < item.target) return;
    item.claimed = true;
    const tokens = kind === "weekly" ? 12 : 5;
    const rewardDust = getMissionRewardDust(kind === "weekly" ? 5 : 1);
    grantMissionTokens(tokens);
    addDust(rewardDust, { trackMissions: false });
    if (kind === "daily") recordMissionProgress("dailyClaims", 1);
    const template = getMissionTemplate(item.templateId);
    addLog(`${kind === "weekly" ? "每周" : "每日"}委托完成：${template.title}。`);
    showToast(
      "航站委托已交付",
      `${template.title} · +${tokens} 凭证 · +${formatNumber(rewardDust)} 星尘`,
      template.icon,
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function claimDailyMissionBonus() {
    ensureMissionPeriods();
    if (
      state.missions.daily.completionClaimed ||
      getCompletedMissionCount(state.missions.daily) < 3
    ) {
      return;
    }
    state.missions.daily.completionClaimed = true;
    const rewardDust = getMissionRewardDust(10);
    grantMissionTokens(15);
    addDust(rewardDust, { trackMissions: false });
    const signalReward = getSingularityCompanions().length > 0
      ? grantCompanionSignals(1)
      : 0;
    addLog("今日航站委托总奖励已领取。");
    showToast(
      "今日航线已稳定",
      `+15 凭证 · +${formatNumber(rewardDust)} 星尘${signalReward ? ` · 观测信号 +${signalReward}` : ""}`,
      "☷",
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function claimWeeklyMissionMilestone(index) {
    ensureMissionPeriods();
    const milestone = WEEKLY_MISSION_MILESTONES[index];
    if (
      !milestone ||
      state.missions.weekly.milestonesClaimed.includes(index) ||
      getCompletedMissionCount(state.missions.weekly) < milestone.required
    ) {
      return;
    }
    state.missions.weekly.milestonesClaimed.push(index);
    const rewardDust = getMissionRewardDust(milestone.dustMinutes);
    grantMissionTokens(milestone.tokens);
    grantMissionMaterials(milestone.materials);
    addDust(rewardDust, { trackMissions: false });
    const materialText = milestone.materials > 0
      ? ` · 每种材料 +${milestone.materials}`
      : "";
    showToast(
      "本周委托里程碑",
      `+${milestone.tokens} 凭证 · +${formatNumber(rewardDust)} 星尘${materialText}`,
      "◆",
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function rerollDailyMission() {
    ensureMissionPeriods();
    const period = state.missions.daily;
    if (period.rerollsUsed >= 1) return;
    const replaceIndex = period.items.findIndex(
      (item) => !item.claimed && item.progress < item.target,
    );
    if (replaceIndex < 0) {
      showToast("没有可重签的委托", "当前每日委托都已完成。", "☷");
      return;
    }
    const usedIds = new Set(period.items.map((item) => item.templateId));
    const candidates = seededMissionShuffle(
      MISSION_TEMPLATES.filter(
        (template) =>
          !template.weeklyOnly &&
          !usedIds.has(template.id) &&
          template.eligible(state),
      ),
      `${period.key}:reroll:${period.items[replaceIndex].templateId}`,
    );
    if (!candidates.length) {
      showToast("暂时没有替代委托", "解锁更多航站系统后会出现更多任务。", "☷");
      return;
    }
    period.items[replaceIndex] = createMissionAssignment(candidates[0], "daily");
    period.rerollsUsed = 1;
    showToast("每日委托已重签", `新任务：${candidates[0].title}`, candidates[0].icon);
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function purchaseMissionStoreItem(itemId) {
    ensureMissionPeriods();
    const item = MISSION_STORE_ITEMS[itemId];
    if (!item || state.missions.tokens < item.cost) {
      showToast("航站凭证不足", "完成更多每日与每周委托即可兑换。", "☷");
      return;
    }
    if (itemId === "materialCrate" && state.lifetimeDust < COMBAT_UNLOCK_DUST) {
      showToast("材料仓尚未接入", "解锁战斗系统后即可兑换星港材料箱。", "⌬");
      return;
    }
    if (
      itemId === "expeditionSupply" &&
      state.lifetimeDust < EXPEDITION_UNLOCK_DUST
    ) {
      showToast("远征补给尚未接入", "累计获得 5 万星尘后即可兑换远征补给。", "▱");
      return;
    }
    const now = Date.now();
    if (
      itemId === "combatRefit" &&
      state.combat.attackCooldownUntil <= now &&
      state.combat.skirmishCooldownUntil <= now
    ) {
      showToast("舰队已经就绪", "当前没有需要清除的主动战斗冷却。", "⬡");
      return;
    }
    state.missions.tokens = clampGameCount(state.missions.tokens - item.cost);
    if (itemId === "dustCrate") {
      const rewardDust = getMissionRewardDust(5);
      addDust(rewardDust, { trackMissions: false });
      showToast("星尘整备包已接收", `星尘 +${formatNumber(rewardDust)}`, "✦");
    } else if (itemId === "materialCrate") {
      grantMissionMaterials(3);
      showToast("星港材料箱已接收", "六种专属材料各 +3", "⌬");
    } else if (itemId === "combatRefit") {
      state.combat.attackCooldownUntil = now;
      state.combat.skirmishCooldownUntil = now;
      showToast("舰队紧急整备完成", "主动远征与近域清剿均已就绪。", "⬡");
    } else if (itemId === "expeditionSupply") {
      state.expedition.supplies = Math.min(
        EXPEDITION_SUPPLY_CAP,
        clampGameCount(safeAdd(state.expedition.supplies, 3)),
      );
      showToast("远征补给已装载", "远征补给 +3", "▱");
    }
    renderMissions();
    updateMissionSummary();
    updateUi();
    saveGame();
  }

  function getExpeditionRouteType(routeTypeId) {
    return EXPEDITION_ROUTE_TYPES.find((route) => route.id === routeTypeId);
  }

  function getExpeditionAffix(affixId) {
    return EXPEDITION_AFFIXES.find((affix) => affix.id === affixId);
  }

  function getExpeditionBoon(boonId) {
    return EXPEDITION_BOONS.find((boon) => boon.id === boonId);
  }

  function getExpeditionSkin(skinId) {
    return EXPEDITION_SKINS.find((skin) => skin.id === skinId);
  }

  function getExpeditionGear(gearId) {
    return EXPEDITION_GEAR.find((gear) => gear.id === gearId);
  }

  function getExpeditionBoss(bossId) {
    return EXPEDITION_BOSSES.find((boss) => boss.id === bossId);
  }

  function getExpeditionBossTactic(tacticId) {
    return EXPEDITION_BOSS_TACTICS.find((tactic) => tactic.id === tacticId);
  }

  function getExpeditionPresetGearIds(targetState = state) {
    const expedition = targetState.expedition || freshExpeditionState();
    const presetIndex = clamp(
      Math.floor(Number(expedition.activePreset) || 0),
      0,
      EXPEDITION_PRESET_COUNT - 1,
    );
    return Array.isArray(expedition.loadoutPresets?.[presetIndex])
      ? expedition.loadoutPresets[presetIndex]
      : [];
  }

  function getExpeditionRunGearIds(run = state.expedition.activeRun) {
    return run && Array.isArray(run.gear)
      ? run.gear
      : getExpeditionPresetGearIds();
  }

  function getExpeditionGearEffects(run = state.expedition.activeRun) {
    const effects = new Set();
    getExpeditionRunGearIds(run).forEach((gearId) => {
      const gear = getExpeditionGear(gearId);
      gear?.effects?.forEach((effectId) => effects.add(effectId));
    });
    return effects;
  }

  function hasExpeditionEffect(effectId, run = state.expedition.activeRun) {
    return Boolean(
      run &&
        (run.boons?.includes(effectId) ||
          getExpeditionGearEffects(run).has(effectId)),
    );
  }

  function getTotalBossWins(targetState = state) {
    return EXPEDITION_BOSSES.reduce(
      (total, boss) =>
        safeAdd(total, targetState.expedition?.bossWins?.[boss.id] || 0),
      0,
    );
  }

  function selectExpeditionPreset(index) {
    if (state.expedition.activeRun) return;
    const nextIndex = clamp(
      Math.floor(Number(index) || 0),
      0,
      EXPEDITION_PRESET_COUNT - 1,
    );
    if (nextIndex === state.expedition.activePreset) return;
    state.expedition.activePreset = nextIndex;
    recordMissionProgress("loadoutChanges", 1);
    renderExpedition();
    saveGame();
  }

  function toggleExpeditionGear(gearId) {
    if (state.expedition.activeRun) {
      showToast("舰装已经锁定", "结束本次远征后才能调整配装。", "▦");
      return;
    }
    if (!state.expedition.unlockedGear.includes(gearId)) return;
    const preset = getExpeditionPresetGearIds();
    const existingIndex = preset.indexOf(gearId);
    if (existingIndex >= 0) {
      preset.splice(existingIndex, 1);
    } else if (preset.length >= EXPEDITION_GEAR_SLOT_LIMIT) {
      showToast("舰装栏位已满", "每套方案最多安装 3 件舰装，请先卸下一件。", "▦");
      return;
    } else {
      preset.push(gearId);
    }
    recordMissionProgress("loadoutChanges", 1);
    renderExpedition();
    saveGame();
  }

  function getExpeditionEntryDustCost(targetState = state) {
    return Math.min(
      MAX_EXPEDITION_ENTRY_DUST_COST,
      roundMissionTarget(
        Math.max(
          2500,
          safeMultiply(calculateRate(targetState, false), 180),
          safeMultiply(getClickValue(targetState), 30),
        ),
      ),
    );
  }

  function getTotalStarportMaterials(targetState = state) {
    return STARPORT_MATERIALS.reduce(
      (total, material) =>
        safeAdd(total, targetState.starport?.materials?.[material.id] || 0),
      0,
    );
  }

  function consumeStarportMaterialPool(amount) {
    let remaining = Math.max(0, Math.floor(amount));
    const materialIds = STARPORT_MATERIALS
      .map((material) => material.id)
      .sort(
        (left, right) =>
          state.starport.materials[right] - state.starport.materials[left],
      );
    materialIds.forEach((materialId) => {
      if (remaining <= 0) return;
      const spent = Math.min(remaining, state.starport.materials[materialId]);
      state.starport.materials[materialId] = clampGameCount(
        state.starport.materials[materialId] - spent,
      );
      remaining -= spent;
    });
    return remaining === 0;
  }

  function expeditionSeedValue(seedText) {
    return hashMissionSeed(seedText) / 4294967296;
  }

  function createExpeditionBoonChoices(run) {
    const gearEffects = getExpeditionGearEffects(run);
    return seededMissionShuffle(
      EXPEDITION_BOONS.filter(
        (boon) =>
          !run.boons.includes(boon.id) && !gearEffects.has(boon.id),
      ),
      `${run.seed}:boon:${run.depth}:${run.boons.length}`,
    )
      .slice(0, 3)
      .map((boon) => boon.id);
  }

  function createExpeditionRouteChoices(run) {
    const finalSector = run.depth >= EXPEDITION_ROUTE_COUNT - 1;
    const availableTypes = EXPEDITION_ROUTE_TYPES.filter((route) =>
      finalSector ? !["relay", "salvage"].includes(route.id) : true,
    );
    const selectedTypes = seededMissionShuffle(
      availableTypes,
      `${run.seed}:route:${run.depth}:${run.choiceNonce}`,
    ).slice(0, 3);
    return selectedTypes.map((route, index) => {
      const affixCount = route.powerFactor <= 0
        ? 0
        : route.id === "elite" && run.depth >= 2
          ? 2
          : 1;
      const affixIds = seededMissionShuffle(
        EXPEDITION_AFFIXES,
        `${run.seed}:affix:${run.depth}:${run.choiceNonce}:${route.id}:${index}`,
      )
        .slice(0, affixCount)
        .map((affix) => affix.id);
      const depthFactor = 1 + run.depth * 0.11;
      const veteranFactor = 1 + Math.min(0.18, state.expedition.completedRuns * 0.015);
      return {
        id: `${route.id}-${run.depth}-${run.choiceNonce}-${index}`,
        typeId: route.id,
        affixIds,
        enemyPower: route.powerFactor > 0
          ? Math.max(
              25,
              Math.round(
                safeMultiply(
                  run.commandPower,
                  route.powerFactor,
                  depthFactor,
                  veteranFactor,
                ),
              ),
            )
          : 0,
      };
    });
  }

  function sanitizeExpeditionRoute(rawRoute) {
    const route = getExpeditionRouteType(rawRoute?.typeId);
    if (!route) return null;
    const affixIds = Array.isArray(rawRoute.affixIds)
      ? [...new Set(rawRoute.affixIds)]
          .filter((id) => Boolean(getExpeditionAffix(id)))
          .slice(0, 2)
      : [];
    return {
      id: typeof rawRoute.id === "string" ? rawRoute.id.slice(0, 80) : route.id,
      typeId: route.id,
      affixIds,
      enemyPower: Math.min(
        MAX_COMBAT_POWER,
        clampGameNumber(rawRoute.enemyPower),
      ),
    };
  }

  function sanitizeFleetCommandState(rawFleetCommand) {
    const clean = freshFleetCommandState();
    if (!rawFleetCommand || typeof rawFleetCommand !== "object") return clean;
    const isKnown = (collection, id) =>
      collection.some((entry) => entry.id === id);
    clean.presets = clean.presets.map((fallback, index) => {
      const rawPreset = rawFleetCommand.presets?.[index];
      if (!rawPreset || typeof rawPreset !== "object") return fallback;
      return {
        name:
          typeof rawPreset.name === "string" && rawPreset.name.trim()
            ? rawPreset.name
                .trim()
                .replace(/[<>&"'`]/g, "")
                .slice(0, 8) || fallback.name
            : fallback.name,
        distribution: isKnown(
          FLEET_DISTRIBUTIONS,
          rawPreset.distribution,
        )
          ? rawPreset.distribution
          : fallback.distribution,
        formation: isKnown(FLEET_FORMATIONS, rawPreset.formation)
          ? rawPreset.formation
          : fallback.formation,
        weapon: isKnown(FLEET_WEAPONS, rawPreset.weapon)
          ? rawPreset.weapon
          : fallback.weapon,
        tactic: isKnown(FLEET_TACTICS, rawPreset.tactic)
          ? rawPreset.tactic
          : fallback.tactic,
      };
    });
    clean.activePreset = clamp(
      Math.floor(Number(rawFleetCommand.activePreset) || 0),
      0,
      FLEET_COMMAND_PRESET_COUNT - 1,
    );
    clean.selectedPreset = clamp(
      Math.floor(
        Number.isFinite(Number(rawFleetCommand.selectedPreset))
          ? Number(rawFleetCommand.selectedPreset)
          : clean.activePreset,
      ),
      0,
      FLEET_COMMAND_PRESET_COUNT - 1,
    );
    clean.ammo = Math.min(
      FLEET_COMMAND_RESOURCE_CAP,
      clampGameCount(rawFleetCommand.ammo),
    );
    clean.maintenance = Math.min(
      FLEET_COMMAND_RESOURCE_CAP,
      clampGameCount(rawFleetCommand.maintenance),
    );
    clean.commandData = Math.min(
      FLEET_COMMAND_RESOURCE_CAP,
      clampGameCount(rawFleetCommand.commandData),
    );
    clean.switchCooldownUntil = finiteTimestamp(
      rawFleetCommand.switchCooldownUntil,
      0,
    );
    clean.reconfigureCooldownUntil = finiteTimestamp(
      rawFleetCommand.reconfigureCooldownUntil,
      0,
    );
    const rawWeekly = rawFleetCommand.weekly;
    if (rawWeekly && typeof rawWeekly === "object") {
      clean.weekly.key =
        typeof rawWeekly.key === "string" ? rawWeekly.key.slice(0, 16) : "";
      clean.weekly.firstClearClaimed = rawWeekly.firstClearClaimed === true;
      clean.weekly.attempts = Array.isArray(rawWeekly.attempts)
        ? rawWeekly.attempts.slice(0, FLEET_CHALLENGE_ATTEMPT_LIMIT).map(
            (attempt) => ({
              clear: attempt?.clear === true,
              score: Math.min(999999, clampGameCount(attempt?.score)),
              time: Math.min(9999, clampGameNumber(attempt?.time)),
              damage: clamp(Number(attempt?.damage) || 0, 0, 100),
              efficiency: clamp(Number(attempt?.efficiency) || 0, 0, 200),
              preset: clamp(
                Math.floor(Number(attempt?.preset) || 0),
                0,
                FLEET_COMMAND_PRESET_COUNT - 1,
              ),
              timestamp: finiteTimestamp(attempt?.timestamp, Date.now()),
            }),
          )
        : [];
    }
    clean.cosmetics = Array.isArray(rawFleetCommand.cosmetics)
      ? FLEET_COSMETICS.flatMap((cosmetic) =>
          rawFleetCommand.cosmetics.includes(cosmetic.id)
            ? [cosmetic.id]
            : [],
        )
      : [];
    clean.totalChallengeClears = clampGameCount(
      rawFleetCommand.totalChallengeClears,
    );
    clean.lastReport =
      typeof rawFleetCommand.lastReport === "string"
        ? rawFleetCommand.lastReport.slice(0, 240)
        : clean.lastReport;
    return clean;
  }

  function sanitizeExpeditionState(rawExpedition) {
    const clean = freshExpeditionState();
    if (!rawExpedition || typeof rawExpedition !== "object") return clean;
    clean.supplies = Math.min(
      EXPEDITION_SUPPLY_CAP,
      clampGameCount(rawExpedition.supplies),
    );
    clean.fragments = Math.min(
      EXPEDITION_FRAGMENT_CAP,
      clampGameCount(rawExpedition.fragments),
    );
    clean.completedRuns = clampGameCount(rawExpedition.completedRuns);
    clean.failedRuns = clampGameCount(rawExpedition.failedRuns);
    EXPEDITION_BOSSES.forEach((boss) => {
      clean.bossWins[boss.id] = clampGameCount(
        rawExpedition.bossWins?.[boss.id],
      );
    });
    const unlockedGearIds = new Set(
      EXPEDITION_GEAR.filter((gear) => gear.defaultUnlocked).map(
        (gear) => gear.id,
      ),
    );
    if (Array.isArray(rawExpedition.unlockedGear)) {
      rawExpedition.unlockedGear.forEach((gearId) => {
        if (getExpeditionGear(gearId)) unlockedGearIds.add(gearId);
      });
    }
    EXPEDITION_BOSSES.forEach((boss) => {
      if (clean.bossWins[boss.id] < 1) return;
      boss.blueprints.forEach((gearId) => unlockedGearIds.add(gearId));
    });
    clean.unlockedGear = EXPEDITION_GEAR.flatMap((gear) =>
      unlockedGearIds.has(gear.id) ? [gear.id] : [],
    );
    clean.loadoutPresets = clean.loadoutPresets.map((defaultPreset, index) => {
      const rawPreset = rawExpedition.loadoutPresets?.[index];
      if (!Array.isArray(rawPreset)) return defaultPreset;
      const sanitized = [...new Set(rawPreset)]
        .filter(
          (gearId) =>
            unlockedGearIds.has(gearId) && Boolean(getExpeditionGear(gearId)),
        )
        .slice(0, EXPEDITION_GEAR_SLOT_LIMIT);
      return sanitized.length ? sanitized : defaultPreset;
    });
    clean.activePreset = clamp(
      Math.floor(Number(rawExpedition.activePreset) || 0),
      0,
      EXPEDITION_PRESET_COUNT - 1,
    );
    clean.artifacts = Array.isArray(rawExpedition.artifacts)
      ? EXPEDITION_ARTIFACTS.flatMap((artifact) =>
          rawExpedition.artifacts.includes(artifact.id) ? [artifact.id] : [],
        )
      : [];
    const unlockedSkinIds = new Set(
      Array.isArray(rawExpedition.unlockedSkins)
        ? rawExpedition.unlockedSkins.filter((id) => Boolean(getExpeditionSkin(id)))
        : [],
    );
    unlockedSkinIds.add("standard");
    clean.unlockedSkins = EXPEDITION_SKINS.flatMap((skin) =>
      unlockedSkinIds.has(skin.id) ? [skin.id] : [],
    );
    clean.activeSkin = clean.unlockedSkins.includes(rawExpedition.activeSkin)
      ? rawExpedition.activeSkin
      : "standard";
    clean.lastReport = typeof rawExpedition.lastReport === "string"
      ? rawExpedition.lastReport.slice(0, 240)
      : clean.lastReport;
    const rawRun = rawExpedition.activeRun;
    if (rawRun && typeof rawRun === "object") {
      const boons = Array.isArray(rawRun.boons)
        ? [...new Set(rawRun.boons)]
            .filter((id) => Boolean(getExpeditionBoon(id)))
            .slice(0, EXPEDITION_BOONS.length)
        : [];
      const boonChoices = Array.isArray(rawRun.boonChoices)
        ? [...new Set(rawRun.boonChoices)]
            .filter((id) => Boolean(getExpeditionBoon(id)) && !boons.includes(id))
            .slice(0, 3)
        : [];
      clean.activeRun = {
        seed: typeof rawRun.seed === "string"
          ? rawRun.seed.slice(0, 80)
          : `${Date.now().toString(36)}-recovered`,
        depth: clamp(
          Math.floor(Number(rawRun.depth) || 0),
          0,
          EXPEDITION_ROUTE_COUNT - 1,
        ),
        gear: Array.isArray(rawRun.gear)
          ? [...new Set(rawRun.gear)]
              .filter(
                (gearId) =>
                  unlockedGearIds.has(gearId) && Boolean(getExpeditionGear(gearId)),
              )
              .slice(0, EXPEDITION_GEAR_SLOT_LIMIT)
          : [...clean.loadoutPresets[clean.activePreset]],
        hull: 1,
        maxHull: 100,
        commandPower: Math.max(
          1,
          Math.min(MAX_COMBAT_POWER, clampGameNumber(rawRun.commandPower)),
        ),
        boons,
        boonChoices,
        routeChoices: Array.isArray(rawRun.routeChoices)
          ? rawRun.routeChoices
              .map(sanitizeExpeditionRoute)
              .filter(Boolean)
              .slice(0, 3)
          : [],
        status: ["boon", "route", "boss"].includes(rawRun.status)
          ? rawRun.status
          : "route",
        choiceNonce: clampGameCount(rawRun.choiceNonce),
        runSupplies: Math.min(999, clampGameCount(rawRun.runSupplies)),
        runFragments: Math.min(9999, clampGameCount(rawRun.runFragments)),
        path: Array.isArray(rawRun.path)
          ? rawRun.path
              .filter((entry) => typeof entry === "string")
              .slice(-EXPEDITION_ROUTE_COUNT)
              .map((entry) => entry.slice(0, 120))
          : [],
        boss:
          rawRun.boss && getExpeditionBoss(rawRun.boss.id)
            ? {
                id: rawRun.boss.id,
                phase: clamp(Math.floor(Number(rawRun.boss.phase) || 0), 0, 1),
                fragments: Math.min(
                  9999,
                  clampGameCount(rawRun.boss.fragments),
                ),
              }
            : null,
      };
      clean.activeRun.maxHull = getExpeditionGearEffects(clean.activeRun).has(
        "shieldCapacitor",
      )
        ? 115
        : 100;
      clean.activeRun.hull = clamp(
        Math.floor(Number(rawRun.hull) || clean.activeRun.maxHull),
        1,
        clean.activeRun.maxHull,
      );
      if (clean.activeRun.status === "boss" && !clean.activeRun.boss) {
        clean.activeRun.status = "route";
      }
    }
    return clean;
  }

  function ensureExpeditionRunChoices() {
    const run = state.expedition.activeRun;
    if (!run) return;
    if (
      run.depth >= EXPEDITION_ROUTE_COUNT - 1 &&
      run.status === "route"
    ) {
      prepareExpeditionBoss(run);
    }
    if (run.status === "boon" && run.boonChoices.length < 1) {
      run.boonChoices = createExpeditionBoonChoices(run);
    }
    if (run.status === "route" && run.routeChoices.length < 1) {
      run.routeChoices = createExpeditionRouteChoices(run);
    }
  }

  function hasExpeditionBoon(boonId) {
    return state.expedition.activeRun?.boons.includes(boonId) === true;
  }

  function prepareExpeditionBoss(run = state.expedition.activeRun) {
    if (!run) return null;
    const boss = seededMissionShuffle(
      EXPEDITION_BOSSES,
      `${run.seed}:boss:${state.expedition.completedRuns}`,
    )[0];
    run.status = "boss";
    run.boonChoices = [];
    run.routeChoices = [];
    run.boss = {
      id: boss.id,
      phase: 0,
      fragments: 0,
    };
    state.expedition.lastReport = `${boss.name}封锁第五航段，请选择首领战术。`;
    return boss;
  }

  function hasExpeditionBossWeakness(boss, run = state.expedition.activeRun) {
    if (!boss || !run) return false;
    return boss.weaknessEffects.some((effectId) =>
      hasExpeditionEffect(effectId, run),
    );
  }

  function getExpeditionBossTacticPreview(tacticId) {
    const run = state.expedition.activeRun;
    const boss = getExpeditionBoss(run?.boss?.id);
    const tactic = getExpeditionBossTactic(tacticId);
    if (!run || !boss || !tactic) return null;
    const weakness = hasExpeditionBossWeakness(boss, run);
    let chance = boss.baseChance + tactic.chance - run.boss.phase * 0.04;
    if (!weakness) chance -= 0.12;
    if (tactic.id === "control" && weakness) chance += 0.18;
    if (tactic.id === "assault" && hasExpeditionEffect("bossAssault", run)) {
      chance += 0.08;
    }
    if (boss.id === "voidChoir" && hasExpeditionEffect("voidAnchor", run)) {
      chance += 0.06;
    }
    let damage = boss.baseDamage * tactic.damageMultiplier;
    if (boss.id === "swarmMatriarch" && !weakness) damage += 6;
    return {
      boss,
      tactic,
      weakness,
      chance: clamp(chance, 0.22, 0.95),
      successDamage: Math.max(1, Math.round(damage * 0.72)),
      failureDamage: Math.max(1, Math.round(damage * 1.55)),
    };
  }

  function grantExpeditionBossReward(run, boss) {
    const previousWins = state.expedition.bossWins[boss.id] || 0;
    state.expedition.bossWins[boss.id] = clampGameCount(previousWins + 1);
    const newlyUnlocked = boss.blueprints.filter(
      (gearId) => !state.expedition.unlockedGear.includes(gearId),
    );
    newlyUnlocked.forEach((gearId) => state.expedition.unlockedGear.push(gearId));
    const materialReward = previousWins < 1 ? 2 : 1;
    grantMissionMaterials(materialReward);
    run.runSupplies = Math.min(
      999,
      run.runSupplies + boss.supplyReward + (previousWins < 1 ? 1 : 0),
    );
    run.runFragments = Math.min(
      9999,
      run.runFragments + run.boss.fragments + (previousWins < 1 ? 6 : 10),
    );
    recordMissionProgress("bossVictories", 1);
    return { newlyUnlocked, materialReward, firstVictory: previousWins < 1 };
  }

  function chooseExpeditionBossTactic(tacticId) {
    const run = state.expedition.activeRun;
    if (!run || run.status !== "boss" || !run.boss) return;
    const preview = getExpeditionBossTacticPreview(tacticId);
    if (!preview) return;
    const { boss, tactic, chance, weakness } = preview;
    if (tactic.repair) {
      run.hull = Math.min(run.maxHull, run.hull + tactic.repair);
    }
    const success = Math.random() <= chance;
    const damage = success
      ? preview.successDamage
      : preview.failureDamage;
    run.hull = Math.max(0, run.hull - damage);
    if (success) {
      const phaseReward = Math.max(
        1,
        Math.round(
          (boss.fragmentReward / 2) * tactic.fragmentMultiplier,
        ),
      );
      run.boss.fragments = Math.min(9999, run.boss.fragments + phaseReward);
      run.boss.phase += 1;
      run.path.push(
        `${boss.name} · ${tactic.name}成功 · 阶段 ${run.boss.phase}/2 · 船体 -${damage}`,
      );
      if (run.hull <= 0) {
        failExpedition("首领阶段完成，但舰体失去返航能力");
        return;
      }
      if (run.boss.phase >= 2) {
        const reward = grantExpeditionBossReward(run, boss);
        completeExpedition({ boss, bossReward: reward });
        return;
      }
      state.expedition.lastReport = `${boss.name}第一阶段已突破，核心结构发生变化。`;
      showToast(
        "首领阶段突破",
        `${Math.round(chance * 100)}% 成功率 · 残片 +${phaseReward} · 船体 -${damage}`,
        boss.icon,
      );
    } else {
      run.path.push(`${boss.name} · ${tactic.name}失利 · 船体 -${damage}`);
      state.expedition.lastReport = `${boss.name}仍在封锁航路；可更换战术继续尝试。`;
      showToast(
        "首领战术失利",
        `${Math.round(chance * 100)}% 成功率 · 船体 -${damage}${weakness ? "" : " · 未反制机制"}`,
        "!",
      );
      if (run.hull <= 0) {
        failExpedition("首领火力击穿船体，自动逃生协议启动");
        return;
      }
    }
    renderExpedition();
    updateUi();
    saveGame();
  }

  function getExpeditionSuccessChance(route) {
    const run = state.expedition.activeRun;
    const routeType = getExpeditionRouteType(route?.typeId);
    if (!run || !routeType) return 0;
    if (routeType.powerFactor <= 0) return 1;
    const ratio = run.commandPower / Math.max(1, route.enemyPower);
    let chance = 0.58 + Math.log2(Math.max(0.1, ratio)) * 0.28;
    route.affixIds.forEach((affixId) => {
      const affix = getExpeditionAffix(affixId);
      if (!affix || hasExpeditionEffect(affix.counter)) return;
      if (affix.id === "phaseShield") chance -= 0.18;
      if (affix.id === "swarm") chance -= 0.14;
      if (affix.id === "jammer") chance -= 0.1;
    });
    if (hasExpeditionEffect("predictiveNav")) chance += 0.04;
    return clamp(chance, 0.18, 0.94);
  }

  function getExpeditionRouteDamage(route, success) {
    const routeType = getExpeditionRouteType(route?.typeId);
    if (!routeType || routeType.powerFactor <= 0) return 0;
    let damage = routeType.baseDamage * (success ? 0.72 : 1.75);
    if (
      route.affixIds.includes("volatile") &&
      !hasExpeditionEffect("thermalSink")
    ) {
      damage += 9;
    }
    if (hasExpeditionEffect("reactiveArmor")) damage *= 0.8;
    return Math.max(1, Math.round(damage));
  }

  function getAvailableExpeditionSupplies() {
    return safeAdd(
      state.expedition.supplies,
      state.expedition.activeRun?.runSupplies || 0,
    );
  }

  function spendExpeditionSupplies(amount) {
    const run = state.expedition.activeRun;
    let remaining = Math.max(0, Math.floor(amount));
    if (run) {
      const runSpent = Math.min(remaining, run.runSupplies);
      run.runSupplies -= runSpent;
      remaining -= runSpent;
    }
    if (remaining > 0) {
      const storedSpent = Math.min(remaining, state.expedition.supplies);
      state.expedition.supplies -= storedSpent;
      remaining -= storedSpent;
    }
    return remaining === 0;
  }

  function startExpedition() {
    if (
      state.lifetimeDust < EXPEDITION_UNLOCK_DUST ||
      state.expedition.activeRun
    ) {
      return;
    }
    const dustCost = getExpeditionEntryDustCost();
    const materialCost = 6;
    const lockedGear = [...getExpeditionPresetGearIds()];
    if (lockedGear.length !== EXPEDITION_GEAR_SLOT_LIMIT) {
      showToast(
        "舰装方案未完成",
        `启航前需要安装 ${EXPEDITION_GEAR_SLOT_LIMIT} 件舰装。`,
        "▦",
      );
      return;
    }
    if (
      state.dust < dustCost ||
      state.expedition.supplies < 1 ||
      getTotalStarportMaterials() < materialCost
    ) {
      showToast(
        "远征物资不足",
        `启航需要 ${formatNumber(dustCost)} 星尘、1 份远征补给与任意 ${materialCost} 份星港材料。`,
        "▱",
      );
      return;
    }
    state.dust = clampGameNumber(state.dust - dustCost);
    recordMissionProgress("dustSpent", dustCost);
    state.expedition.supplies -= 1;
    consumeStarportMaterialPool(materialCost);
    const seed = `${Date.now().toString(36)}-${hashMissionSeed(
      `${state.playerName}:${state.expedition.completedRuns}:${state.careerBattles}`,
    ).toString(36)}`;
    const maxHull = lockedGear.some(
      (gearId) => getExpeditionGear(gearId)?.effects.includes("shieldCapacitor"),
    )
      ? 115
      : 100;
    state.expedition.activeRun = {
      seed,
      depth: 0,
      hull: maxHull,
      maxHull,
      commandPower: Math.max(1, getCombinedPower()),
      gear: lockedGear,
      boons: [],
      boonChoices: [],
      routeChoices: [],
      status: "boon",
      choiceNonce: 0,
      runSupplies: 0,
      runFragments: 0,
      path: [],
      boss: null,
    };
    ensureExpeditionRunChoices();
    state.expedition.lastReport = "远征舰已离港，请选择第一项临时协议。";
    addLog("星区远征启动：五航段航线已锁定。");
    showToast("星区远征已启动", "先选择一项只在本局生效的远征协议。", "▱");
    renderExpedition();
    updateUi();
    saveGame(false, { forceBackup: true });
  }

  function chooseExpeditionBoon(boonId) {
    const run = state.expedition.activeRun;
    if (
      !run ||
      run.status !== "boon" ||
      !run.boonChoices.includes(boonId) ||
      run.boons.includes(boonId)
    ) {
      return;
    }
    const boon = getExpeditionBoon(boonId);
    run.boons.push(boonId);
    run.boonChoices = [];
    const enteringBoss = run.depth >= EXPEDITION_ROUTE_COUNT - 1;
    if (enteringBoss) {
      prepareExpeditionBoss(run);
    } else {
      run.status = "route";
      run.routeChoices = createExpeditionRouteChoices(run);
      state.expedition.lastReport = `${boon.name}已装载，本局效果立即生效。`;
    }
    showToast("临时协议已装载", boon.description, boon.icon);
    renderExpedition();
    saveGame();
  }

  function bankExpeditionCargo(ratio = 1) {
    const run = state.expedition.activeRun;
    if (!run) return { supplies: 0, fragments: 0 };
    const supplies = Math.floor(run.runSupplies * ratio);
    const fragmentMultiplier = hasExpeditionEffect("fragmentLens", run)
      ? 1.25
      : 1;
    const fragments = Math.floor(
      run.runFragments * ratio * fragmentMultiplier,
    );
    state.expedition.supplies = Math.min(
      EXPEDITION_SUPPLY_CAP,
      clampGameCount(safeAdd(state.expedition.supplies, supplies)),
    );
    state.expedition.fragments = Math.min(
      EXPEDITION_FRAGMENT_CAP,
      clampGameCount(safeAdd(state.expedition.fragments, fragments)),
    );
    return { supplies, fragments };
  }

  function completeExpedition({ boss = null, bossReward = null } = {}) {
    const run = state.expedition.activeRun;
    if (!run) return;
    run.runSupplies = Math.min(999, run.runSupplies + 1);
    run.runFragments = Math.min(9999, run.runFragments + 6);
    const cargo = bankExpeditionCargo(1);
    state.expedition.completedRuns = clampGameCount(
      state.expedition.completedRuns + 1,
    );
    const missingArtifacts = EXPEDITION_ARTIFACTS.filter(
      (artifact) => !state.expedition.artifacts.includes(artifact.id),
    );
    const artifact = missingArtifacts.length > 0
      ? seededMissionShuffle(missingArtifacts, `${run.seed}:artifact`)[0]
      : null;
    if (artifact) {
      state.expedition.artifacts.push(artifact.id);
    } else {
      state.expedition.fragments = Math.min(
        EXPEDITION_FRAGMENT_CAP,
        state.expedition.fragments + 12,
      );
    }
    const signalReward =
      state.endgame.companions.length >
        state.endgame.companionObservations.length
        ? grantCompanionSignals(1)
        : 0;
    state.expedition.activeRun = null;
    const bossCopy = boss ? `，已击破${boss.name}` : "";
    state.expedition.lastReport = artifact
      ? `完整远征完成${bossCopy}，收藏品“${artifact.name}”已送入陈列舱。`
      : `完整远征完成${bossCopy}，重复收藏记录已转化为 12 枚星图残片。`;
    recordMissionProgress("expeditionsCompleted", 1);
    addLog(state.expedition.lastReport);
    showToast(
      "五航段远征完成",
      `${artifact ? `新收藏：${artifact.name} · ` : ""}${bossReward?.newlyUnlocked?.length ? `蓝图 +${bossReward.newlyUnlocked.length} · ` : ""}补给 +${cargo.supplies} · 残片 +${cargo.fragments}${signalReward ? ` · 观测信号 +${signalReward}` : ""}`,
      artifact?.icon || "✧",
    );
    playAchievementTone();
    renderExpedition();
    updateUi();
    saveGame(false, { forceBackup: true });
  }

  function failExpedition(reason) {
    const cargo = bankExpeditionCargo(0.5);
    state.expedition.failedRuns = clampGameCount(state.expedition.failedRuns + 1);
    state.expedition.activeRun = null;
    state.expedition.lastReport = `${reason}；抢救回补给 ${cargo.supplies}、残片 ${cargo.fragments}。`;
    addLog(`星区远征中止：${state.expedition.lastReport}`);
    showToast("远征舰撤离", state.expedition.lastReport, "!");
    renderExpedition();
    updateUi();
    saveGame(false, { forceBackup: true });
  }

  function advanceExpeditionAfterSuccess() {
    const run = state.expedition.activeRun;
    if (!run) return;
    run.depth += 1;
    run.routeChoices = [];
    if (run.depth >= EXPEDITION_ROUTE_COUNT) {
      completeExpedition();
      return;
    }
    if ([2, 4].includes(run.depth)) {
      run.status = "boon";
      run.boonChoices = createExpeditionBoonChoices(run);
    } else {
      run.status = "route";
      run.routeChoices = createExpeditionRouteChoices(run);
    }
  }

  function selectExpeditionRoute(routeId) {
    const run = state.expedition.activeRun;
    if (!run || run.status !== "route") return;
    const route = run.routeChoices.find((choice) => choice.id === routeId);
    const routeType = getExpeditionRouteType(route?.typeId);
    if (!route || !routeType) return;
    if (routeType.repair) {
      const repaired = Math.min(routeType.repair, run.maxHull - run.hull);
      run.hull += repaired;
      run.runFragments += routeType.fragments;
      run.path.push(`${routeType.name} · 修复 ${repaired}`);
      state.expedition.lastReport = `中继港维护完成，船体修复 ${repaired} 点。`;
      recordMissionProgress("expeditionRoutes", 1);
      advanceExpeditionAfterSuccess();
      renderExpedition();
      saveGame();
      return;
    }
    const chance = getExpeditionSuccessChance(route);
    const roll = Math.random();
    const success = roll <= chance;
    const damage = getExpeditionRouteDamage(route, success);
    run.hull = Math.max(0, run.hull - damage);
    if (success) {
      let supplyReward = routeType.supplies;
      if (routeType.id === "salvage" && hasExpeditionEffect("scavengerRig")) {
        supplyReward += 1;
      }
      run.runSupplies = Math.min(999, run.runSupplies + supplyReward);
      run.runFragments = Math.min(9999, run.runFragments + routeType.fragments);
      if (hasExpeditionEffect("repairDrone")) {
        run.hull = Math.min(run.maxHull, run.hull + 8);
      }
      run.path.push(`${routeType.name} · 成功 · 船体 -${damage}`);
      state.expedition.lastReport = `${routeType.name}突破成功，回收补给 ${supplyReward}、残片 ${routeType.fragments}。`;
      recordMissionProgress("expeditionRoutes", 1);
      showToast(
        "远征航段突破",
        `${Math.round(chance * 100)}% 成功率 · 船体 -${damage}`,
        routeType.icon,
      );
      if (run.hull <= 0) {
        failExpedition("舰体在完成回收后失去跃迁能力");
        return;
      }
      advanceExpeditionAfterSuccess();
    } else {
      if (
        route.affixIds.includes("raider") &&
        !hasExpeditionEffect("sealedCargo") &&
        run.runSupplies > 0
      ) {
        run.runSupplies -= 1;
      }
      run.path.push(`${routeType.name} · 失利 · 船体 -${damage}`);
      state.expedition.lastReport = `${routeType.name}突破失败，船体损伤 ${damage} 点；本航段需要重新选择路线。`;
      showToast("航段突破失败", `船体 -${damage}，航线已重新扫描。`, "!");
      if (run.hull <= 0) {
        failExpedition("船体归零，自动逃生协议启动");
        return;
      }
      run.choiceNonce += 1;
      run.routeChoices = createExpeditionRouteChoices(run);
    }
    renderExpedition();
    updateUi();
    saveGame();
  }

  function rerollExpeditionRoutes() {
    const run = state.expedition.activeRun;
    if (!run || run.status !== "route") return;
    if (getAvailableExpeditionSupplies() < 1) {
      showToast("远征补给不足", "重新扫描三条路线需要 1 份补给。", "▱");
      return;
    }
    spendExpeditionSupplies(1);
    run.choiceNonce += 1;
    run.routeChoices = createExpeditionRouteChoices(run);
    state.expedition.lastReport = "消耗 1 份补给，已重新扫描本航段路线。";
    renderExpedition();
    saveGame();
  }

  function repairExpeditionHull() {
    const run = state.expedition.activeRun;
    if (!run || run.hull >= run.maxHull) return;
    if (getAvailableExpeditionSupplies() < 2) {
      showToast("远征补给不足", "紧急维修需要 2 份补给。", "▱");
      return;
    }
    spendExpeditionSupplies(2);
    const repaired = Math.min(25, run.maxHull - run.hull);
    run.hull += repaired;
    state.expedition.lastReport = `消耗 2 份补给，紧急修复 ${repaired} 点船体。`;
    renderExpedition();
    saveGame();
  }

  function abandonExpedition() {
    if (!state.expedition.activeRun) return;
    showModal({
      eyebrow: "远征撤离",
      icon: "▱",
      title: "提前结束本次星区远征？",
      message: "撤离后仅能带回本局补给与星图残片的一半；临时协议会全部清除。",
      confirmText: "确认撤离",
      cancelText: "继续远征",
      onConfirm: () => failExpedition("指挥官主动结束本次航线"),
    });
  }

  function selectExpeditionSkin(skinId) {
    const skin = getExpeditionSkin(skinId);
    if (!skin) return;
    if (!state.expedition.unlockedSkins.includes(skin.id)) {
      if (state.expedition.fragments < skin.cost) {
        showToast("星图残片不足", `解锁${skin.name}需要 ${skin.cost} 枚残片。`, "✧");
        return;
      }
      state.expedition.fragments -= skin.cost;
      state.expedition.unlockedSkins.push(skin.id);
      showToast("信标外观已解锁", skin.name, "✧");
    }
    state.expedition.activeSkin = skin.id;
    applyExpeditionSkin();
    renderExpedition();
    saveGame();
  }

  function applyExpeditionSkin() {
    const skin = getExpeditionSkin(state.expedition.activeSkin) || EXPEDITION_SKINS[0];
    document.documentElement.style.setProperty("--expedition-skin", skin.color);
    document.body.dataset.expeditionSkin = skin.id;
  }

  function grantExpeditionBattleSupply() {
    if (
      state.lifetimeDust < EXPEDITION_UNLOCK_DUST ||
      state.combat.activeWins < 1 ||
      state.combat.activeWins % 4 !== 0
    ) {
      return;
    }
    state.expedition.supplies = Math.min(
      EXPEDITION_SUPPLY_CAP,
      state.expedition.supplies + 1,
    );
    showToast("发现远征补给", "连续作战回收远征补给 +1。", "▱");
  }

  function addDust(amount, { trackMissions = true } = {}) {
    const safeAmount = clampGameNumber(amount);
    if (safeAmount <= 0) return 0;
    const previousDust = state.dust;
    state.dust = Math.min(
      DUST_RESERVE_CAP,
      safeAdd(state.dust, safeAmount),
    );
    const appliedAmount = Math.max(0, state.dust - previousDust);
    if (appliedAmount <= 0) return 0;
    state.runDust = Math.min(
      DUST_RESERVE_CAP,
      safeAdd(state.runDust, appliedAmount),
    );
    state.lifetimeDust = Math.min(
      DUST_RESERVE_CAP,
      safeAdd(state.lifetimeDust, appliedAmount),
    );
    state.careerDust = Math.min(
      CAREER_DUST_CAP,
      safeAdd(state.careerDust, appliedAmount),
    );
    if (
      isEndgameUnlocked() &&
      state.endgame.sectorLevel % 3 === 0
    ) {
      state.endgame.sectorDust = Math.min(
        DUST_RESERVE_CAP,
        safeAdd(state.endgame.sectorDust, appliedAmount),
      );
    }
    if (trackMissions) recordMissionProgress("dustEarned", appliedAmount);
    return appliedAmount;
  }

  function getOperationMasteryLevel(jobId, targetState = state) {
    const xp = clampGameNumber(targetState.operations?.jobs?.[jobId]?.xp);
    return Math.min(OPERATIONS_MAX_MASTERY, Math.floor(Math.sqrt(xp / 15)));
  }

  function getOperationMasteryTarget(level) {
    return 15 * Math.min(OPERATIONS_MAX_MASTERY, level + 1) ** 2;
  }

  function getOperationsPoolCap(targetState = state) {
    const totalLevels = OPERATIONS_JOBS.reduce(
      (total, job) => total + getOperationMasteryLevel(job.id, targetState),
      0,
    );
    return 500 + totalLevels * 120;
  }

  function getOperationsPoolRatio(targetState = state) {
    return clamp(
      clampGameNumber(targetState.operations?.engineeringPool) /
        Math.max(1, getOperationsPoolCap(targetState)),
      0,
      1,
    );
  }

  function getOperationsQueueSlots(targetState = state) {
    return getOperationsPoolRatio(targetState) >= 0.5 ? 3 : 2;
  }

  function getOperationInterval(job, targetState = state) {
    const masterySpeed = getOperationMasteryLevel(job.id, targetState) * 0.005;
    const poolSpeed = getOperationsPoolRatio(targetState) >= 0.25 ? 0.05 : 0;
    return job.interval / (1 + masterySpeed + poolSpeed);
  }

  function addOperationComponent(id, amount = 1) {
    if (!Object.prototype.hasOwnProperty.call(state.operations.components, id)) return;
    state.operations.components[id] = Math.min(
      999000,
      clampGameCount(state.operations.components[id] + amount),
    );
  }

  function canPayOperationInput(job) {
    if (job.id === "crystalAnalysis") return state.starport.materials.crystal >= 1;
    if (job.id === "foundryAssembly") {
      return state.starport.materials.alloy >= 2 && state.starport.materials.circuit >= 1;
    }
    if (job.id === "borderPatrol") return state.fleetCommand.ammo >= 1;
    if (job.id === "deepSurvey") return state.starport.materials.sensor >= 1;
    return true;
  }

  function payOperationInput(job) {
    if (job.id === "crystalAnalysis") state.starport.materials.crystal -= 1;
    if (job.id === "foundryAssembly") {
      state.starport.materials.alloy -= 2;
      state.starport.materials.circuit -= 1;
    }
    if (job.id === "borderPatrol") state.fleetCommand.ammo -= 1;
    if (job.id === "deepSurvey") state.starport.materials.sensor -= 1;
  }

  function completeOperationAction(job) {
    if (!canPayOperationInput(job)) {
      state.operations.lastReport = `${job.name}暂停：${job.input.replace(" / 次", "")}不足。`;
      return false;
    }
    payOperationInput(job);
    const jobState = state.operations.jobs[job.id];
    jobState.actions = clampGameCount(jobState.actions + 1);
    state.operations.totalActions = clampGameCount(state.operations.totalActions + 1);
    const poolRatio = getOperationsPoolRatio();
    const masteryXp = poolRatio >= 0.75 ? 4.4 : 4;
    jobState.xp = Math.min(999000000, jobState.xp + masteryXp);
    state.operations.engineeringPool = Math.min(
      getOperationsPoolCap(),
      state.operations.engineeringPool + masteryXp * 0.25,
    );
    const bonusComponent = poolRatio >= 0.95 && jobState.actions % 5 === 0 ? 1 : 0;
    let report = "";
    if (job.id === "orbitalSalvage") {
      const dust = addDust(12 + getOperationMasteryLevel(job.id) * 0.3, {
        trackMissions: false,
      });
      if (jobState.actions % 4 === 0) state.starport.materials.alloy += 1;
      if (jobState.actions % 12 === 0) addOperationComponent("hullPlate", 1 + bonusComponent);
      report = `回收 ${formatNumber(dust)} 星尘${jobState.actions % 4 === 0 ? "、合金 ×1" : ""}。`;
    } else if (job.id === "crystalAnalysis") {
      addOperationComponent("prismCapacitor", 1 + bonusComponent);
      if (jobState.actions % 6 === 0) addOperationComponent("phaseScanner", 1);
      report = "棱镜电容完成封装。";
    } else if (job.id === "foundryAssembly") {
      addOperationComponent("hullPlate", 1 + bonusComponent);
      if (jobState.actions % 3 === 0) addOperationComponent("quantumController", 1);
      report = "舰体板完成装配。";
    } else if (job.id === "borderPatrol") {
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 1);
      if (jobState.actions % 4 === 0) addOperationComponent("ammoCrate", 1 + bonusComponent);
      if (jobState.actions % 6 === 0) state.fleetCommand.commandData += 1;
      report = "巡逻队带回星图碎片 ×1。";
    } else if (job.id === "deepSurvey") {
      addOperationComponent("phaseScanner", 1 + bonusComponent);
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 3);
      if (jobState.actions % 3 === 0) addOperationComponent("repairKit", 1);
      report = "深空测绘完成，星图碎片 ×3。";
    }
    state.operations.lastReport = `${job.name}：${report}`;
    recordMissionProgress("operationsCompleted", 1);
    return true;
  }

  function processOperations(elapsedSeconds, { offline = false } = {}) {
    if (state.lifetimeDust < OPERATIONS_UNLOCK_DUST || !state.operations.queue.length) {
      return { actions: 0, elapsed: 0 };
    }
    let remainingTime = clamp(Number(elapsedSeconds) || 0, 0, getMaxOfflineSeconds(state));
    const initialTime = remainingTime;
    let actions = 0;
    let guard = 0;
    while (remainingTime > 0.001 && state.operations.queue.length && guard < 12000) {
      guard += 1;
      const order = state.operations.queue[0];
      const job = OPERATIONS_JOBS.find((entry) => entry.id === order.jobId);
      if (!job || state.lifetimeDust < job.unlock) {
        state.operations.queue.shift();
        continue;
      }
      if (typeof order.remaining === "number" && order.remaining <= 0.001) {
        state.operations.queue.shift();
        continue;
      }
      const jobState = state.operations.jobs[job.id];
      const interval = getOperationInterval(job);
      const orderTime = order.remaining === null ? remainingTime : Math.min(remainingTime, order.remaining);
      const needed = Math.max(0.001, interval - jobState.progress);
      const step = Math.min(orderTime, needed);
      jobState.progress += step;
      remainingTime -= step;
      if (typeof order.remaining === "number") order.remaining -= step;
      if (jobState.progress + 0.001 >= interval) {
        if (completeOperationAction(job)) {
          jobState.progress = Math.max(0, jobState.progress - interval);
          actions += 1;
        } else {
          jobState.progress = 0;
          if (order.remaining === null) break;
          const stalled = Math.min(remainingTime, Math.max(0, order.remaining));
          remainingTime -= stalled;
          order.remaining -= stalled;
        }
      }
      if (typeof order.remaining === "number" && order.remaining <= 0.001) {
        state.operations.queue.shift();
      }
    }
    if (offline && actions > 0) {
      addLog(`离线航站作业完成 ${actions} 次，组件与专精进度已结算。`);
    }
    return { actions, elapsed: initialTime - remainingTime };
  }

  function queueOperation(jobId, continuous = false) {
    const job = OPERATIONS_JOBS.find((entry) => entry.id === jobId);
    if (!job || state.lifetimeDust < job.unlock) return;
    if (continuous) {
      state.operations.queue = [{ jobId, remaining: null }];
      state.operations.lastReport = `${job.name}已设为连续作业。`;
    } else {
      if (state.operations.queue.some((order) => order.remaining === null)) {
        showToast("连续作业正在运行", "先停止连续作业，再安排限时订单。", "!");
        return;
      }
      if (state.operations.queue.length >= getOperationsQueueSlots()) {
        showToast("作业队列已满", "工程池达到 50% 可解锁第 3 个队列栏位。", "!");
        return;
      }
      state.operations.queue.push({ jobId, remaining: OPERATIONS_ORDER_SECONDS });
      state.operations.lastReport = `${job.name}已加入 30 分钟作业队列。`;
    }
    renderOperations();
    saveGame();
  }

  function injectOperationMastery(jobId) {
    const jobState = state.operations.jobs[jobId];
    const level = getOperationMasteryLevel(jobId);
    if (!jobState || level >= OPERATIONS_MAX_MASTERY) return;
    const missing = Math.max(0, getOperationMasteryTarget(level) - jobState.xp);
    if (state.operations.engineeringPool + 0.001 < missing) {
      showToast("工程池不足", `还需要 ${formatNumber(missing - state.operations.engineeringPool)} 工程经验。`, "·");
      return;
    }
    const applyInjection = () => {
      state.operations.engineeringPool -= missing;
      jobState.xp += missing;
      state.operations.lastReport = `${OPERATIONS_JOBS.find((job) => job.id === jobId)?.name}专精提升至 ${getOperationMasteryLevel(jobId)} 级。`;
      renderOperations();
      saveGame();
    };
    const beforeRatio = getOperationsPoolRatio();
    const afterRatio = (state.operations.engineeringPool - missing) / getOperationsPoolCap();
    if ([0.25, 0.5, 0.75, 0.95].some((point) => beforeRatio >= point && afterRatio < point)) {
      showModal({
        eyebrow: "工程池调度",
        icon: "▦",
        title: "将跌破工程池里程碑",
        message: "注入后可能暂时失去作业速度、队列或专精加成。继续操作不会损失已获得的专精等级。",
        confirmText: "继续注入",
        cancelText: "暂不使用",
        onConfirm: applyInjection,
      });
    } else {
      applyInjection();
    }
  }

  function useOperationComponent(componentId) {
    if ((state.operations.components[componentId] || 0) < 1) return;
    state.operations.components[componentId] -= 1;
    if (componentId === "hullPlate") state.fleetCommand.maintenance += 4;
    if (componentId === "prismCapacitor") state.fleetCommand.ammo += 5;
    if (componentId === "quantumController") state.fleetCommand.commandData += 2;
    if (componentId === "phaseScanner") state.expedition.fragments = Math.min(999000, state.expedition.fragments + 10);
    if (componentId === "ammoCrate") state.fleetCommand.ammo += 12;
    if (componentId === "repairKit") state.fleetCommand.maintenance += 12;
    const component = OPERATION_COMPONENTS.find((entry) => entry.id === componentId);
    state.operations.lastReport = `${component?.name || "组件"}已投入使用：${component?.use || "补给已发放"}。`;
    renderOperations();
    saveGame();
  }

  function addLog(text) {
    state.log.unshift({ text, time: Date.now() });
    state.log = state.log.slice(0, 14);
  }

  function parseSaveSnapshot(serialized) {
    if (!serialized) return null;
    try {
      const parsed = JSON.parse(serialized);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch (error) {
      return null;
    }
  }

  function rotateSaveBackups(currentRaw, now) {
    if (!parseSaveSnapshot(currentRaw)) return;
    for (let index = SAVE_BACKUP_KEYS.length - 1; index > 0; index -= 1) {
      const previous = localStorage.getItem(SAVE_BACKUP_KEYS[index - 1]);
      if (previous) {
        localStorage.setItem(SAVE_BACKUP_KEYS[index], previous);
      } else {
        localStorage.removeItem(SAVE_BACKUP_KEYS[index]);
      }
    }
    localStorage.setItem(SAVE_BACKUP_KEYS[0], currentRaw);
    localStorage.setItem(SAVE_BACKUP_META_KEY, String(now));
  }

  function saveGame(
    showFeedback = false,
    { forceBackup = false, skipBackup = false } = {},
  ) {
    try {
      const now = Date.now();
      refreshCareerRecords();
      state.lastSeen = now;
      const serialized = JSON.stringify(state);
      const currentRaw = localStorage.getItem(SAVE_KEY);
      const lastBackupAt =
        Number(localStorage.getItem(SAVE_BACKUP_META_KEY)) || 0;
      const backupDue =
        forceBackup || showFeedback || now - lastBackupAt >= BACKUP_INTERVAL;
      if (
        !skipBackup &&
        backupDue &&
        currentRaw &&
        currentRaw !== serialized
      ) {
        try {
          rotateSaveBackups(currentRaw, now);
        } catch (backupError) {
          // A backup quota failure must not prevent the primary save.
        }
      }
      localStorage.setItem(SAVE_KEY, serialized);
      lastSave = now;
      window.dispatchEvent(
        new CustomEvent("stellar-local-save", {
          detail: {
            serialized,
            manual: showFeedback,
            urgent: forceBackup,
            savedAt: now,
          },
        }),
      );
      if (showFeedback) {
        showToast(
          "本地航站记录已保存",
          "当前进度已保存在此设备，并保留最近的轮换备份。",
          "✓",
        );
        playTone(540, 0.05, "sine");
      }
    } catch (error) {
      showToast("无法保存", "浏览器拒绝了本地存储，请检查隐私设置。", "!");
    }
  }

  function sanitizeState(raw) {
    const base = freshState();
    if (!raw || typeof raw !== "object") return base;
    const sourceVersion = Math.max(0, Math.floor(Number(raw.version) || 0));
    const needsNumericMigration = sourceVersion < NUMERIC_MIGRATION_VERSION;
    const sanitizeBalancedNumber = (
      value,
      cap,
      softCapStart,
      softCapPower,
    ) => {
      const safeValue = clampGameNumber(value);
      const balancedValue = needsNumericMigration
        ? softCapGameNumber(safeValue, softCapStart, softCapPower)
        : safeValue;
      return Math.min(cap, balancedValue);
    };
    const sanitizeDustNumber = (value, cap = DUST_RESERVE_CAP) =>
      sanitizeBalancedNumber(
        value,
        cap,
        LEGACY_DUST_SOFT_CAP,
        LEGACY_DUST_LATE_POWER,
      );
    const sanitizeCoreNumber = (value) =>
      Math.floor(
        sanitizeBalancedNumber(
          value,
          CORE_RESERVE_CAP,
          LEGACY_CORE_SOFT_CAP,
          LEGACY_CORE_LATE_POWER,
        ),
      );
    const sanitizePowerNumber = (value) =>
      Math.round(
        sanitizeBalancedNumber(
          value,
          MAX_COMBAT_POWER,
          COMBAT_POWER_SOFT_CAP,
          COMBAT_POWER_LATE_POWER,
        ),
      );
    const merged = { ...base, ...raw };
    merged.version = SAVE_VERSION;
    merged.dust = sanitizeDustNumber(raw.dust);
    merged.runDust = sanitizeDustNumber(raw.runDust);
    merged.lifetimeDust = Math.max(
      merged.runDust,
      sanitizeDustNumber(raw.lifetimeDust),
    );
    merged.careerDust = Math.min(
      CAREER_DUST_CAP,
      Math.max(
        Math.min(merged.lifetimeDust, CAREER_DUST_CAP),
        sanitizeDustNumber(raw.careerDust, CAREER_DUST_CAP),
      ),
    );
    merged.lifetimeClicks = clampGameCount(raw.lifetimeClicks);
    const rawAvailableCores = clampGameNumber(
      Math.floor(Number(raw.cores) || 0),
    );
    const rawTotalCores = Math.max(
      rawAvailableCores,
      clampGameNumber(Math.floor(Number(raw.totalCores) || rawAvailableCores)),
    );
    merged.totalCores = sanitizeCoreNumber(rawTotalCores);
    merged.cores = Math.min(
      merged.totalCores,
      Math.floor(
        merged.totalCores *
          (rawTotalCores > 0 ? rawAvailableCores / rawTotalCores : 0),
      ),
    );
    merged.coreShop = freshCoreShopState();
    CORE_SHOP_ITEMS.forEach((item) => {
      merged.coreShop[item.id] = clamp(
        Math.floor(Number(raw.coreShop?.[item.id]) || 0),
        0,
        item.maxRank,
      );
    });
    const rawEndgame =
      raw.endgame && typeof raw.endgame === "object" ? raw.endgame : {};
    merged.endgame = freshEndgameState();
    const rawAvailableShards = clampGameNumber(
      Math.floor(Number(rawEndgame.shards) || 0),
    );
    const rawTotalShards = Math.max(
      rawAvailableShards,
      clampGameNumber(
        Math.floor(Number(rawEndgame.totalShards) || rawAvailableShards),
      ),
    );
    merged.endgame.totalShards = Math.floor(
      sanitizeBalancedNumber(
        rawTotalShards,
        ENDGAME_RESOURCE_CAP,
        10000,
        0.25,
      ),
    );
    merged.endgame.shards = Math.min(
      merged.endgame.totalShards,
      Math.floor(
        merged.endgame.totalShards *
          (rawTotalShards > 0 ? rawAvailableShards / rawTotalShards : 0),
      ),
    );
    merged.endgame.transcensions = clampGameCount(
      rawEndgame.transcensions,
    );
    const savedCompanionIds = Array.isArray(rawEndgame.companions)
      ? rawEndgame.companions
      : [];
    const validCompanionIds = new Set(
      savedCompanionIds.filter((id) =>
        SINGULARITY_COMPANIONS.some((companion) => companion.id === id),
      ),
    );
    SINGULARITY_COMPANIONS.slice(
      0,
      Math.min(
        merged.endgame.transcensions,
        SINGULARITY_COMPANIONS.length,
      ),
    ).forEach((companion) => validCompanionIds.add(companion.id));
    merged.endgame.companions = SINGULARITY_COMPANIONS.flatMap((companion) =>
      validCompanionIds.has(companion.id) ? [companion.id] : [],
    );
    const seenCompanionEvents = new Set();
    merged.endgame.companionObservations = Array.isArray(
      rawEndgame.companionObservations,
    )
      ? rawEndgame.companionObservations.flatMap((observation) => {
          const companionEvent = COMPANION_EVENTS.find(
            (entry) => entry.id === observation?.eventId,
          );
          const choice = companionEvent?.choices.find(
            (entry) => entry.id === observation?.choiceId,
          );
          if (
            !companionEvent ||
            !choice ||
            seenCompanionEvents.has(companionEvent.id) ||
            !validCompanionIds.has(companionEvent.companionId)
          ) {
            return [];
          }
          seenCompanionEvents.add(companionEvent.id);
          return [{
            eventId: companionEvent.id,
            choiceId: choice.id,
            completedAt: Math.max(0, Number(observation.completedAt) || 0),
          }];
        })
      : [];
    const migratedSignals = sourceVersion < 10
      ? Math.min(3, merged.endgame.companions.length)
      : 0;
    merged.endgame.companionSignals = Math.min(
      COMPANION_OBSERVATION_SIGNAL_CAP,
      clampGameCount(
        rawEndgame.companionSignals === undefined
          ? migratedSignals
          : rawEndgame.companionSignals,
      ),
    );
    const activeCompanionEvent = COMPANION_EVENTS.find(
      (entry) => entry.id === rawEndgame.activeCompanionEvent,
    );
    merged.endgame.activeCompanionEvent =
      activeCompanionEvent &&
      validCompanionIds.has(activeCompanionEvent.companionId) &&
      !seenCompanionEvents.has(activeCompanionEvent.id)
        ? activeCompanionEvent.id
        : null;
    merged.endgame.sectorLevel = clampGameCount(rawEndgame.sectorLevel);
    merged.endgame.sectorDust = needsNumericMigration
      ? 0
      : Math.min(
          DUST_RESERVE_CAP,
          clampGameNumber(rawEndgame.sectorDust),
        );
    merged.endgame.sectorUnits = needsNumericMigration
      ? 0
      : clampGameCount(rawEndgame.sectorUnits);
    merged.endgame.sectorWins = needsNumericMigration
      ? 0
      : clampGameCount(rawEndgame.sectorWins);
    ENDGAME_PROTOCOLS.forEach((protocol) => {
      merged.endgame.protocols[protocol.id] = clamp(
        Math.floor(
          Number(rawEndgame.protocols?.[protocol.id]) || 0,
        ),
        0,
        protocol.maxRank,
      );
    });
    const rawCrescentSecret =
      raw.crescentSecret && typeof raw.crescentSecret === "object"
        ? raw.crescentSecret
        : {};
    merged.crescentSecret = {
      unlocked: rawCrescentSecret.unlocked === true,
      completed: rawCrescentSecret.completed === true,
      letterRead: rawCrescentSecret.letterRead === true,
      manualClicks: Math.min(
        CRESCENT_MISSION_GOALS.manualClicks,
        clampGameCount(rawCrescentSecret.manualClicks),
      ),
      skirmishWins: Math.min(
        CRESCENT_MISSION_GOALS.skirmishWins,
        clampGameCount(rawCrescentSecret.skirmishWins),
      ),
      starportUpgrades: Math.min(
        CRESCENT_MISSION_GOALS.starportUpgrades,
        clampGameCount(rawCrescentSecret.starportUpgrades),
      ),
    };
    if (merged.crescentSecret.letterRead) {
      merged.crescentSecret.completed = true;
    }
    if (merged.crescentSecret.completed) {
      merged.crescentSecret.unlocked = true;
    }
    merged.rebirths = clampGameCount(raw.rebirths);
    merged.playerName = normalizePlayerName(raw.playerName);
    merged.activePage = PRIMARY_PAGES.includes(raw.activePage)
      ? raw.activePage
      : base.activePage;
    merged.playTime = clampGameNumber(raw.playTime);
    merged.sound = raw.sound !== false;
    merged.bgmEnabled = raw.bgmEnabled !== false;
    const savedBgmTrackSelection = String(raw.bgmTrackSelection || "");
    merged.bgmTrackSelection = (
      savedBgmTrackSelection === BGM_PLAYLIST_SELECTION
      || BGM_TRACKS.some((track) => track.id === savedBgmTrackSelection)
    )
      ? savedBgmTrackSelection
      : base.bgmTrackSelection;
    const savedBgmVolume = Number(raw.bgmVolume);
    merged.bgmVolume = clamp(
      Number.isFinite(savedBgmVolume) ? savedBgmVolume : base.bgmVolume,
      0,
      1,
    );
    merged.tutorialSeen = raw.tutorialSeen === true;
    merged.buyMode = ["1", "10", "max"].includes(String(raw.buyMode))
      ? String(raw.buyMode)
      : "1";
    merged.missions = sanitizeMissionState(raw.missions);
    merged.starfall = sanitizeStarfallState(raw.starfall);
    merged.fleetCommand = sanitizeFleetCommandState(raw.fleetCommand);
    merged.expedition = sanitizeExpeditionState(raw.expedition);
    const rawOperations =
      raw.operations && typeof raw.operations === "object"
        ? raw.operations
        : {};
    merged.operations = freshOperationsState();
    OPERATIONS_JOBS.forEach((job) => {
      const savedJob = rawOperations.jobs?.[job.id] || {};
      merged.operations.jobs[job.id] = {
        xp: Math.min(999000000, clampGameNumber(savedJob.xp)),
        actions: clampGameCount(savedJob.actions),
        progress: clamp(
          Number(savedJob.progress) || 0,
          0,
          Math.max(0, job.interval - 0.001),
        ),
      };
    });
    OPERATION_COMPONENTS.forEach((component) => {
      merged.operations.components[component.id] = Math.min(
        999000,
        clampGameCount(rawOperations.components?.[component.id]),
      );
    });
    merged.operations.engineeringPool = Math.min(
      999000,
      clampGameNumber(rawOperations.engineeringPool),
    );
    merged.operations.totalActions = clampGameCount(rawOperations.totalActions);
    merged.operations.lastReport = String(
      rawOperations.lastReport || merged.operations.lastReport,
    ).slice(0, 180);
    merged.operations.queue = Array.isArray(rawOperations.queue)
      ? rawOperations.queue.slice(0, 3).flatMap((order) => {
          if (!OPERATIONS_JOBS.some((job) => job.id === order?.jobId)) return [];
          const remaining = order.remaining === null
            ? null
            : clamp(Number(order.remaining) || 0, 0, OPERATIONS_ORDER_SECONDS);
          return remaining === 0 ? [] : [{ jobId: order.jobId, remaining }];
        })
      : [];
    const seenFeatures = Array.isArray(raw.guidance?.seenFeatures)
      ? raw.guidance.seenFeatures.filter((entry) => typeof entry === "string")
      : [];
    merged.guidance = {
      compactNavigation: raw.guidance?.compactNavigation !== false,
      seenFeatures: [...new Set(seenFeatures)].slice(0, 32),
    };
    merged.lastSeen = finiteTimestamp(raw.lastSeen);
    merged.nextEventAt = finiteTimestamp(
      raw.nextEventAt,
      Date.now() + randomBetween(35000, 55000),
    );
    const rawStarport =
      raw.starport && typeof raw.starport === "object" ? raw.starport : {};
    merged.starport = freshStarportState();
    STARPORT_MATERIALS.forEach((material) => {
      merged.starport.materials[material.id] = clampGameCount(
        rawStarport.materials?.[material.id],
      );
    });
    STARPORT_MODULES.forEach((module) => {
      merged.starport.modules[module.id] = clamp(
        Math.floor(Number(rawStarport.modules?.[module.id]) || 0),
        0,
        module.maxRank,
      );
    });
    const combatBase = base.combat;
    const rawCombat =
      raw.combat && typeof raw.combat === "object" ? raw.combat : {};
    const enemyVictories = { ...combatBase.enemyVictories };
    [...SKIRMISH_TARGETS, ...PLANET_TARGETS].forEach((target) => {
      enemyVictories[target.id] = clampGameCount(
        rawCombat.enemyVictories?.[target.id],
      );
    });
    const savedRaidType =
      rawCombat.incomingRaid?.type === "major" ? "major" : "minor";
    const savedRaiderPool =
      savedRaidType === "major" ? MAJOR_RAIDERS : RAIDERS;
    const incomingRaider = savedRaiderPool.find(
      (raider) => raider.id === rawCombat.incomingRaid?.raiderId,
    );
    merged.combat = {
      attackLevel: clampGameCount(rawCombat.attackLevel),
      defenseLevel: clampGameCount(rawCombat.defenseLevel),
      wins: clampGameCount(rawCombat.wins),
      losses: clampGameCount(rawCombat.losses),
      activeWins: clampGameCount(rawCombat.activeWins),
      skirmishWins: clampGameCount(rawCombat.skirmishWins),
      raidsSurvived: clampGameCount(rawCombat.raidsSurvived),
      majorRaidsFaced: clampGameCount(rawCombat.majorRaidsFaced),
      majorRaidsSurvived: clampGameCount(rawCombat.majorRaidsSurvived),
      enemyVictories,
      nextRaidAt: finiteTimestamp(
        rawCombat.nextRaidAt,
        Date.now() +
          randomBetween(MINOR_RAID_MIN_INTERVAL, MINOR_RAID_MAX_INTERVAL),
      ),
      nextMajorRaidAt: finiteTimestamp(
        rawCombat.nextMajorRaidAt,
        Date.now() + MAJOR_RAID_INTERVAL,
      ),
      incomingRaid: incomingRaider
        ? {
            type: savedRaidType,
            raiderId: incomingRaider.id,
            power: Math.max(
              1,
              sanitizePowerNumber(rawCombat.incomingRaid.power),
            ),
            startedAt: finiteTimestamp(rawCombat.incomingRaid.startedAt),
            arrivesAt: finiteTimestamp(
              rawCombat.incomingRaid.arrivesAt,
              Date.now() +
                (savedRaidType === "major"
                  ? MAJOR_RAID_WARNING
                  : MINOR_RAID_WARNING),
            ),
          }
        : null,
      attackCooldownUntil: finiteTimestamp(
        rawCombat.attackCooldownUntil,
        0,
      ),
      skirmishCooldownUntil: finiteTimestamp(
        rawCombat.skirmishCooldownUntil,
        0,
      ),
      lastReport:
        typeof rawCombat.lastReport === "string"
          ? rawCombat.lastReport.slice(0, 220)
          : combatBase.lastReport,
    };
    const currentCycleBattles = clampGameCount(
      safeAdd(merged.combat.wins, merged.combat.losses),
    );
    merged.careerBattles = clampGameCount(
      Math.max(currentCycleBattles, Number(raw.careerBattles) || 0),
    );
    merged.highestCombinedPower = Math.min(
      MAX_COMBAT_POWER,
      Math.max(
        sanitizePowerNumber(raw.highestCombinedPower),
        safeAdd(getCombatPower(merged), getDefensePower(merged)),
      ),
    );
    merged.buildings = { ...base.buildings };
    BUILDINGS.forEach((building) => {
      merged.buildings[building.id] = clampGameCount(
        raw.buildings?.[building.id],
      );
    });
    const validUpgradeIds = new Set(UPGRADES.map((upgrade) => upgrade.id));
    const validAchievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
    merged.upgrades = Array.isArray(raw.upgrades)
      ? [...new Set(raw.upgrades.filter((id) => validUpgradeIds.has(id)))]
      : [];
    merged.achievements = Array.isArray(raw.achievements)
      ? [...new Set(raw.achievements.filter((id) => validAchievementIds.has(id)))]
      : [];
    merged.log = Array.isArray(raw.log)
      ? raw.log
          .filter((entry) => entry && typeof entry.text === "string")
          .slice(0, 14)
          .map((entry) => ({
            text: entry.text.slice(0, 180),
            time: finiteTimestamp(entry.time),
          }))
      : base.log;
    if (needsNumericMigration && sourceVersion > 0) {
      merged.log.unshift({
        text: "v0.13.0 已完成后期数值折算；建筑、研究、材料与战绩均已保留。",
        time: Date.now(),
      });
      merged.log = merged.log.slice(0, 14);
    }
    if (raw.event && EVENTS.some((event) => event.id === raw.event.id)) {
      merged.event = {
        id: raw.event.id,
        expires: finiteTimestamp(raw.event.expires, 0),
      };
    } else {
      merged.event = null;
    }
    if (
      raw.buff &&
      ["surge", "precision"].includes(raw.buff.id) &&
      Number(raw.buff.expires) > Date.now()
    ) {
      merged.buff = {
        id: raw.buff.id,
        expires: finiteTimestamp(raw.buff.expires, 0),
      };
    } else {
      merged.buff = null;
    }
    return merged;
  }

  function readBestSaveSnapshot() {
    const keys = [SAVE_KEY, ...SAVE_BACKUP_KEYS];
    for (let index = 0; index < keys.length; index += 1) {
      let serialized = null;
      try {
        serialized = localStorage.getItem(keys[index]);
      } catch (error) {
        return null;
      }
      const parsed = parseSaveSnapshot(serialized);
      if (parsed) {
        recoveredBackupIndex = index - 1;
        return parsed;
      }
    }
    return null;
  }

  function resumeCombatTimers(savedAt, returnTime) {
    if (state.combat.incomingRaid) {
      const remaining = state.combat.incomingRaid.arrivesAt - savedAt;
      const maximumWarning =
        state.combat.incomingRaid.type === "major"
          ? MAJOR_RAID_WARNING
          : MINOR_RAID_WARNING;
      const resumedRemaining =
        remaining > 0
          ? clamp(remaining, 1000, maximumWarning)
          : state.combat.incomingRaid.type === "major"
            ? 45000
            : 18000;
      state.combat.incomingRaid.startedAt = returnTime;
      state.combat.incomingRaid.arrivesAt = returnTime + resumedRemaining;
      return;
    }
    const remaining = state.combat.nextRaidAt - savedAt;
    state.combat.nextRaidAt =
      returnTime +
      (remaining > 0
        ? clamp(
            remaining,
            30000,
            MINOR_RAID_MAX_INTERVAL,
          )
        : randomBetween(MINOR_RAID_MIN_INTERVAL, MINOR_RAID_MAX_INTERVAL));
  }

  function resolveOfflineMajorRaids(
    savedAt,
    returnTime,
    elapsedSeconds,
    combatWasUnlocked,
  ) {
    const report = {
      count: 0,
      defended: 0,
      breached: 0,
      reward: 0,
      loss: 0,
    };
    if (!combatWasUnlocked || elapsedSeconds <= 0) {
      if (state.combat.nextMajorRaidAt <= returnTime) {
        state.combat.nextMajorRaidAt = returnTime + MAJOR_RAID_INTERVAL;
      }
      return report;
    }

    const eligibleUntil = Math.min(
      returnTime,
      savedAt + elapsedSeconds * 1000,
    );
    const initialDust = state.dust;
    let remainingLossBudget = safeMultiply(
      initialDust,
      MAX_OFFLINE_RAID_LOSS_RATIO,
    );
    const recordOutcome = (outcome) => {
      report.count += 1;
      if (outcome.defended) report.defended += 1;
      else report.breached += 1;
      report.reward = safeAdd(report.reward, outcome.reward);
      report.loss = safeAdd(report.loss, outcome.loss);
      remainingLossBudget = Math.max(0, remainingLossBudget - outcome.loss);
    };

    if (
      state.combat.incomingRaid?.type === "major" &&
      state.combat.incomingRaid.arrivesAt <= eligibleUntil
    ) {
      recordOutcome(
        applyRaidOutcome(state.combat.incomingRaid, {
          offline: true,
          maxLoss: remainingLossBudget,
        }),
      );
      state.combat.incomingRaid = null;
    }

    const lastEligibleSignal = eligibleUntil - MAJOR_RAID_WARNING;
    const firstSignalAt = state.combat.nextMajorRaidAt;
    const schedule = countFixedIntervalEvents(
      firstSignalAt,
      lastEligibleSignal,
      MAJOR_RAID_INTERVAL,
      MAX_OFFLINE_MAJOR_RAIDS,
    );
    for (let index = 0; index < schedule.count; index += 1) {
      const raid = createRaidSnapshot(
        "major",
        firstSignalAt + index * MAJOR_RAID_INTERVAL,
      );
      recordOutcome(
        applyRaidOutcome(raid, {
          offline: true,
          maxLoss: remainingLossBudget,
        }),
      );
    }
    if (schedule.count > 0) {
      state.combat.nextMajorRaidAt = schedule.nextAt;
    }

    const offlineWindowWasCapped = eligibleUntil < returnTime;
    if (offlineWindowWasCapped) {
      state.combat.nextMajorRaidAt = returnTime + MAJOR_RAID_INTERVAL;
    } else if (state.combat.nextMajorRaidAt <= returnTime) {
      state.combat.nextMajorRaidAt = returnTime;
    }

    if (report.count > 0) {
      const summary = `离线期间遭遇 ${report.count} 次大袭击：守住 ${
        report.defended
      } 次，失守 ${report.breached} 次，回收 ${formatNumber(
        report.reward,
      )} 星尘，损失 ${formatNumber(report.loss)} 星尘。`;
      state.combat.lastReport = summary;
      addLog(summary);
    }
    return report;
  }

  function grantInactiveEarnings(savedAt, presentation = "none") {
    const returnTime = Date.now();
    const offlineLimit = getMaxOfflineSeconds(state);
    const elapsed = clamp(
      (returnTime - savedAt) / 1000,
      0,
      offlineLimit,
    );
    const combatWasUnlocked = state.lifetimeDust >= COMBAT_UNLOCK_DUST;
    const offlineRate = calculateRate(state, false);
    const potentialOfflineGain = safeMultiply(offlineRate, elapsed);
    const offlineGain =
      potentialOfflineGain > 0 ? addDust(potentialOfflineGain) : 0;
    const operationReport = processOperations(elapsed, { offline: true });
    const raidReport = resolveOfflineMajorRaids(
      savedAt,
      returnTime,
      elapsed,
      combatWasUnlocked,
    );
    if (offlineGain > 0.1 && elapsed > 10) {
      addLog(
        `${presentation === "background" ? "后台" : "离线"}舰队带回了 ${formatNumber(
          offlineGain,
        )} 星尘。`,
      );
    }
    if ((offlineGain > 0.1 && elapsed > 10) || raidReport.count > 0) {
      const productionSummary =
        offlineGain > 0.1
          ? `舰队持续工作了 ${formatDuration(elapsed)}，回收 ${formatNumber(
              offlineGain,
            )} 星尘。`
          : `航站离线了 ${formatDuration(elapsed)}。`;
      const raidSummary =
        raidReport.count > 0
          ? `期间发生 ${raidReport.count} 次大袭击：守住 ${
              raidReport.defended
            } 次、失守 ${raidReport.breached} 次；残骸收益 ${formatNumber(
              raidReport.reward,
            )}，资源损失 ${formatNumber(raidReport.loss)} 星尘。`
          : "期间没有需要结算的大袭击。";
      if (presentation === "load") {
        window.setTimeout(() => {
          showModal({
            eyebrow: "离线报告",
            icon: raidReport.count > 0 ? "◆" : "⌁",
            title: "欢迎返回星港",
            message: `${productionSummary}${raidSummary}当前离线收益与袭击结算最多累计 ${formatDuration(
              offlineLimit,
            )}。`,
            confirmText: "接收物资",
            cancelText: null,
          });
        }, 250);
      } else if (presentation === "background") {
        showToast(
          raidReport.count > 0 ? "后台态势已结算" : "后台收益已结算",
          raidReport.count > 0
            ? `${raidReport.count} 次大袭击，损失 ${formatNumber(
                raidReport.loss,
              )} 星尘。`
            : `${formatDuration(elapsed)}内回收了 ${formatNumber(
                offlineGain,
              )} 星尘。`,
          raidReport.count > 0 ? "◆" : "⌁",
        );
      }
    }
    resumeCombatTimers(savedAt, returnTime);
    state.lastSeen = returnTime;
    if (state.event?.expires < returnTime) state.event = null;
    if (state.buff?.expires < returnTime) state.buff = null;
    return { elapsed, offlineGain, raidReport, operationReport };
  }

  function loadGame() {
    const saved = readBestSaveSnapshot();

    if (!saved) {
      state = freshState();
    } else {
      state = sanitizeState(saved);
      grantInactiveEarnings(state.lastSeen, "load");
    }
    ensureMissionPeriods();
    ensureFleetChallengePeriod();
    ensureExpeditionRunChoices();
  }

  function buyBuilding(id) {
    const building = BUILDINGS.find((entry) => entry.id === id);
    if (!building || state.lifetimeDust < building.unlock) return;
    const purchase = selectedPurchase(building);
    if (purchase.amount < 1 || purchase.cost > state.dust + 1e-9) {
      showToast("星尘不足", `还需要更多星尘来扩建${building.name}。`, "·");
      playTone(160, 0.05, "square", 0.018);
      return;
    }
    const previousRate = calculateRate();
    const wasEmpty = state.buildings[id] === 0;
    state.dust = clampGameNumber(state.dust - purchase.cost);
    recordMissionProgress("dustSpent", purchase.cost);
    state.buildings[id] = clampGameCount(
      state.buildings[id] + purchase.amount,
    );
    recordMissionProgress("unitsBought", purchase.amount);
    if (
      isEndgameUnlocked() &&
      state.endgame.sectorLevel % 3 === 1
    ) {
      state.endgame.sectorUnits = clampGameCount(
        state.endgame.sectorUnits + purchase.amount,
      );
    }
    if (wasEmpty) {
      addLog(`首座${building.name}已投入运行。`);
    }
    const nextRate = calculateRate();
    const rateIncrease = Math.max(0, nextRate - previousRate);
    playTone(380 + BUILDINGS.indexOf(building) * 38, 0.07, "sine");
    renderBuildings();
    updateUi(nextRate);
    showToast(
      "舰队产量已提升",
      `${building.name} +${purchase.amount} · ${formatProductionRate(
        previousRate,
      )} → ${formatProductionRate(nextRate)} / 秒（+${formatProductionRate(
        rateIncrease,
      )}）`,
      building.icon,
    );
  }

  function buyUpgrade(id) {
    const upgrade = UPGRADES.find((entry) => entry.id === id);
    if (
      !upgrade ||
      hasUpgrade(id) ||
      !isUpgradePathAvailable(upgrade) ||
      state.lifetimeDust < upgrade.unlock ||
      state.dust < upgrade.cost
    ) {
      return;
    }
    state.dust = clampGameNumber(state.dust - upgrade.cost);
    recordMissionProgress("dustSpent", upgrade.cost);
    state.upgrades.push(id);
    recordMissionProgress("researchCompleted", 1);
    addLog(`研究完成：${upgrade.name}。`);
    showToast("研究完成", `${upgrade.name} 已接入航站系统。`, upgrade.icon);
    playTone(680, 0.12, "sine");
    renderUpgrades();
    updateUi();
  }

  function collect(event) {
    const amount = addDust(getClickValue());
    state.lifetimeClicks = clampGameCount(state.lifetimeClicks + 1);
    recordMissionProgress("manualClicks", 1);
    recordCrescentProgress("manualClicks");
    elements.collect.classList.add("pressed");
    window.setTimeout(() => elements.collect.classList.remove("pressed"), 80);
    createClickEffects(event, amount);
    playTone(240 + Math.random() * 60, 0.035, "sine", 0.025);
    checkAchievements();
    updateUi();
  }

  function createClickEffects(event, amount) {
    const rect = elements.collect.getBoundingClientRect();
    const clientX = event?.clientX || rect.left + rect.width / 2;
    const clientY = event?.clientY || rect.top + rect.height / 2;

    const float = document.createElement("span");
    float.className = "float-number";
    float.textContent = `+${formatNumber(amount)}`;
    float.style.left = `${clientX}px`;
    float.style.top = `${clientY - 12}px`;
    document.body.appendChild(float);
    window.setTimeout(() => float.remove(), 800);

    const ripple = document.createElement("span");
    ripple.className = "click-ripple";
    ripple.style.left = `${clientX - rect.left}px`;
    ripple.style.top = `${clientY - rect.top}px`;
    elements.collect.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 600);
  }

  function checkAchievements() {
    ACHIEVEMENTS.forEach((achievement) => {
      if (state.achievements.includes(achievement.id)) return;
      if (achievement.test(state)) {
        state.achievements.push(achievement.id);
        addLog(`成就解锁：${achievement.name}。`);
        showToast("成就解锁", `${achievement.name} · 全产量永久 +2%`, achievement.icon);
        playAchievementTone();
        if (
          state.activePage === "research" &&
          !elements.achievementList.closest("#achievements-panel").hidden
        ) {
          renderAchievements();
        }
      }
    });
  }

  function getPrestigeGain() {
    if (state.runDust < PRESTIGE_BASE_DUST) return 0;
    const dustRatio = state.runDust / PRESTIGE_BASE_DUST;
    const effectiveRatio = softCapGameNumber(
      dustRatio,
      PRESTIGE_RATIO_SOFT_CAP,
      PRESTIGE_LATE_POWER,
    );
    const baseGain = safePow(effectiveRatio, 0.5);
    return Math.floor(safeMultiply(baseGain, getCoreGainMultiplier()));
  }

  function getCoreTargetForGain(targetGain, targetState = state) {
    const multiplier = Math.max(0.01, getCoreGainMultiplier(targetState));
    const effectiveRatio = safePow(
      targetGain / multiplier,
      1 / 0.5,
    );
    const dustRatio = expandSoftCappedGameNumber(
      effectiveRatio,
      PRESTIGE_RATIO_SOFT_CAP,
      PRESTIGE_LATE_POWER,
    );
    return safeMultiply(
      PRESTIGE_BASE_DUST,
      dustRatio,
    );
  }

  function purchaseCoreUpgrade(itemId) {
    const item = CORE_SHOP_ITEMS.find((entry) => entry.id === itemId);
    if (!item) return;
    const rank = getCoreShopRank(item.id);
    if (rank >= item.maxRank) return;
    const cost = getCoreShopCost(item);
    if (state.cores < cost) {
      showToast("星核不足", "完成更多深空跃迁即可获得可用星核。", "✣");
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    state.cores = clampGameNumber(state.cores - cost);
    state.coreShop[item.id] += 1;
    const nextRank = state.coreShop[item.id];
    const message = `星核兑换完成：${item.name}提升至 ${nextRank}/${item.maxRank} 级。`;
    addLog(message);
    showToast("永久强化已生效", `${item.name} · 等级 ${nextRank}`, item.icon);
    playAchievementTone();
    checkAchievements();
    renderCoreShop();
    updateUi();
    saveGame();
  }

  function prestige() {
    const gain = getPrestigeGain();
    if (gain < 1) return;
    const nextReconstructionCost = getReconstructionCostMultiplier({
      ...state,
      rebirths: state.rebirths + 1,
    });
    showModal({
      eyebrow: "深空跃迁",
      icon: "◒",
      title: `提炼 ${formatNumber(gain, 0)} 枚星核？`,
      message: `跃迁将清空当前星尘、自动化单元与本轮研究，但保留战斗强化、星港建筑与材料、星核商店、成就和统计。下一航线的自动化设施重建成本将调整为 ×${nextReconstructionCost.toFixed(
        2,
      )}；星核加成采用后期递减曲线。`,
      confirmText: "确认跃迁",
      cancelText: "暂不跃迁",
      onConfirm: () => {
        state.cores = Math.min(
          CORE_RESERVE_CAP,
          safeAdd(state.cores, gain),
        );
        state.totalCores = Math.min(
          CORE_RESERVE_CAP,
          safeAdd(state.totalCores, gain),
        );
        state.rebirths = clampGameCount(state.rebirths + 1);
        recordMissionProgress("prestiges", 1);
        state.dust = 0;
        state.runDust = 0;
        state.upgrades = [];
        BUILDINGS.forEach((building) => {
          state.buildings[building.id] = 0;
        });
        state.event = null;
        state.buff = null;
        state.nextEventAt = Date.now() + randomBetween(30000, 50000);
        addLog(`跃迁成功，航站获得 ${formatNumber(gain, 0)} 枚星核。`);
        checkAchievements();
        renderAll();
        saveGame(false, { forceBackup: true });
        showToast("跃迁完成", `永久产量增幅提升至 ×${getCoreMultiplier().toFixed(2)}。`, "◒");
        playAchievementTone();
      },
    });
  }

  function purchaseEndgameProtocol(protocolId) {
    const protocol = ENDGAME_PROTOCOLS.find(
      (entry) => entry.id === protocolId,
    );
    if (!protocol || !isEndgameUnlocked()) return;
    const rank = getEndgameProtocolRank(protocol.id);
    if (rank >= protocol.maxRank) return;
    const cost = getEndgameProtocolCost(protocol);
    if (state.endgame.shards < cost) {
      showToast(
        "奇点碎片不足",
        "完成边境星区或执行奇点坍缩可获得更多碎片。",
        "∞",
      );
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    state.endgame.shards = clampGameNumber(
      state.endgame.shards - cost,
    );
    state.endgame.protocols[protocol.id] += 1;
    const nextRank = state.endgame.protocols[protocol.id];
    addLog(
      `超越协议升级：${protocol.name}达到 ${nextRank}/${protocol.maxRank} 级。`,
    );
    showToast(
      "超越协议已强化",
      `${protocol.name} · 等级 ${nextRank}`,
      protocol.icon,
    );
    playAchievementTone();
    checkAchievements();
    renderAll();
    saveGame();
  }

  function claimSector() {
    if (!isEndgameUnlocked()) return;
    const objective = getSectorObjective();
    if (objective.current < objective.target) return;
    state.endgame.shards = Math.min(
      ENDGAME_RESOURCE_CAP,
      safeAdd(state.endgame.shards, objective.reward),
    );
    state.endgame.totalShards = Math.min(
      ENDGAME_RESOURCE_CAP,
      safeAdd(state.endgame.totalShards, objective.reward),
    );
    state.endgame.sectorLevel = clampGameCount(
      state.endgame.sectorLevel + 1,
    );
    state.endgame.sectorDust = 0;
    state.endgame.sectorUnits = 0;
    state.endgame.sectorWins = 0;
    addLog(
      `边境星区 ${objective.level + 1} 已稳定，获得 ${objective.reward} 枚奇点碎片。`,
    );
    showToast(
      "边境星区已建立",
      `奇点碎片 +${formatNumber(objective.reward, 0)}，全部系统获得永久增幅。`,
      "⌖",
    );
    playAchievementTone();
    checkAchievements();
    renderAll();
    saveGame();
  }

  function transcend() {
    const gain = getTranscendGain();
    if (gain < 1) return;
    const legacyRank = getEndgameProtocolRank("legacy");
    const startingDust = getEndgameStartingDust();
    const companionReward = getNextSingularityCompanion();
    showModal({
      eyebrow: "奇点超越",
      icon: "∞",
      title: companionReward
        ? `坍缩并唤醒${companionReward.name}？`
        : `坍缩并提炼 ${formatNumber(gain, 0)} 枚奇点碎片？`,
      message: `本次操作将重置星尘、舰队、舰队编成方案与整备物资、研究、星核、星核商店、跃迁次数、战斗成长以及星港建筑和材料。成就、舰队收藏徽记、边境星区、奇点碎片及全部超越协议永久保留。当前遗产协议会保留每类星核强化 ${legacyRank} 级，并以 ${formatNumber(
        startingDust,
      )} 初始星尘开启新周期。${
        companionReward
          ? `本次还会永久收藏纯观赏伴星“${companionReward.name}”，它不提供数值加成。`
          : "奇点伴星图鉴已经完整，本次仍会获得奇点碎片。"
      }`,
      confirmText: "确认坍缩",
      cancelText: "继续当前周期",
      onConfirm: () => {
        state.endgame.shards = Math.min(
          ENDGAME_RESOURCE_CAP,
          safeAdd(state.endgame.shards, gain),
        );
        state.endgame.totalShards = Math.min(
          ENDGAME_RESOURCE_CAP,
          safeAdd(state.endgame.totalShards, gain),
        );
        let observationSignalReward = 0;
        if (companionReward) {
          state.endgame.companions.push(companionReward.id);
          observationSignalReward = grantCompanionSignals(2);
        }
        state.endgame.transcensions = clampGameCount(
          state.endgame.transcensions + 1,
        );
        recordMissionProgress("transcensions", 1);
        const firstCrescentSignal =
          state.endgame.transcensions === 1 &&
          !state.crescentSecret.unlocked;
        state.dust = startingDust;
        state.runDust = startingDust;
        state.lifetimeDust = startingDust;
        state.lifetimeClicks = 0;
        state.cores = 0;
        state.totalCores = 0;
        state.rebirths = 0;
        state.upgrades = [];
        state.coreShop = freshCoreShopState();
        CORE_SHOP_ITEMS.forEach((item) => {
          state.coreShop[item.id] = Math.min(
            legacyRank,
            item.maxRank,
          );
        });
        BUILDINGS.forEach((building) => {
          state.buildings[building.id] = 0;
        });
        if (state.expedition.activeRun) {
          const rescuedCargo = bankExpeditionCargo(0.5);
          state.expedition.failedRuns = clampGameCount(
            state.expedition.failedRuns + 1,
          );
          state.expedition.activeRun = null;
          state.expedition.lastReport =
            `奇点坍缩中止了进行中的远征；抢救回补给 ${rescuedCargo.supplies}、残片 ${rescuedCargo.fragments}。`;
        }
        const retainedFleetCosmetics = [...state.fleetCommand.cosmetics];
        const retainedFleetChallengeClears =
          state.fleetCommand.totalChallengeClears;
        state.fleetCommand = freshFleetCommandState();
        state.fleetCommand.cosmetics = retainedFleetCosmetics;
        state.fleetCommand.totalChallengeClears = retainedFleetChallengeClears;
        ensureFleetChallengePeriod();
        state.starport = freshStarportState();
        state.combat = freshCombatState();
        state.event = null;
        state.buff = null;
        state.nextEventAt =
          Date.now() + randomBetween(30000, 50000);
        addLog(
          `奇点坍缩完成，获得 ${formatNumber(gain, 0)} 枚碎片${
            companionReward ? `与伴星“${companionReward.name}”` : ""
          }；第 ${state.endgame.transcensions} 个超越周期启动。`,
        );
        if (firstCrescentSignal) {
          addLog("坍缩余波中出现一枚不在星图上的月牙信号。");
        }
        checkAchievements();
        renderAll();
        activatePrimaryPage(firstCrescentSignal ? "transcend" : "command", {
          persist: false,
          scroll: true,
        });
        saveGame(false, { forceBackup: true });
        showToast(
          "新超越周期已启动",
          companionReward
            ? `新伴星：${companionReward.name} · 观测信号 +${observationSignalReward} · 点击伴星可触发专属事件。`
            : `永久星尘增幅 ×${formatNumber(
                getEndgameProductionMultiplier(),
              )}。`,
          "∞",
        );
        playAchievementTone();
        if (firstCrescentSignal) {
          window.setTimeout(() => {
            if (state.crescentSecret.unlocked) return;
            showModal({
              eyebrow: "奇点余波异常",
              icon: "☾",
              title: "超越界面里似乎藏着什么",
              message:
                "雷达捕捉到一段无法归档的月牙信号。它就在当前超越界面中，找到发光的异常信号并点击它。",
              confirmText: "开始寻找",
              cancelText: null,
            });
          }, 520);
        }
      },
    });
  }

  function getDiminishingCombatLevel(level) {
    const safeLevel = Math.max(0, Number(level) || 0);
    return Math.min(safeLevel, 18) +
      Math.max(0, safeLevel - 18) * 0.45;
  }

  function getCombatPower(targetState = state) {
    const level = targetState.combat?.attackLevel || 0;
    const effectiveLevel = getDiminishingCombatLevel(level);
    const coreBoost = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, getHistoricalCores(targetState))),
        0.1,
      ),
    );
    const rawPower = safeMultiply(
        30,
        safePow(1.42, effectiveLevel),
        coreBoost,
        getCombatCoreMultiplier(targetState),
      );
    return Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        safeMultiply(
          softCapGameNumber(
            rawPower,
            COMBAT_POWER_SOFT_CAP,
            COMBAT_POWER_LATE_POWER,
          ),
          getStarportAttackMultiplier(targetState),
          getFleetExpeditionMultiplier(targetState),
        ),
      ),
    );
  }

  function getDefensePower(targetState = state) {
    const level = targetState.combat?.defenseLevel || 0;
    const effectiveLevel = getDiminishingCombatLevel(level);
    const coreBoost = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, getHistoricalCores(targetState))),
        0.1,
      ),
    );
    const rawPower = safeMultiply(
        25,
        safePow(1.44, effectiveLevel),
        coreBoost,
        getCombatCoreMultiplier(targetState),
      );
    return Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        safeMultiply(
          softCapGameNumber(
            rawPower,
            COMBAT_POWER_SOFT_CAP,
            COMBAT_POWER_LATE_POWER,
          ),
          getStarportDefenseMultiplier(targetState),
          getFleetDefenseMultiplier(targetState),
        ),
      ),
    );
  }

  function getCombatUpgradeCost(type, targetState = state) {
    const level =
      type === "attack"
        ? targetState.combat.attackLevel
        : targetState.combat.defenseLevel;
    const earlyLevel = Math.min(level, 18);
    const lateLevel = Math.max(0, level - 18);
    const rawCost = type === "attack"
      ? safeMultiply(
          350,
          safePow(1.72, earlyLevel),
          safePow(1.25, lateLevel),
        )
      : safeMultiply(
        300,
        safePow(1.7, earlyLevel),
          safePow(1.24, lateLevel),
        );
    return Math.round(
      Math.min(
        MAX_COMBAT_UPGRADE_COST,
        softCapGameNumber(
          rawCost,
          COMBAT_COST_SOFT_CAP,
          COMBAT_COST_LATE_POWER,
        ),
      ),
    );
  }

  function getPlanetStats(target, targetState = state) {
    const victories = targetState.combat.enemyVictories[target.id] || 0;
    const totalCores = getHistoricalCores(targetState);
    const coreScale = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, totalCores)),
        0.15,
      ),
    );
    const rebirthScale = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, Math.max(0, targetState.rebirths || 0))),
        0.12,
      ),
    );
    const rawPower = safeMultiply(
        target.basePower,
        safePow(
          1.3,
          Math.min(victories, 24) +
            Math.max(0, victories - 24) * 0.35,
        ),
        coreScale,
        rebirthScale,
      );
    const power = Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        softCapGameNumber(
          rawPower,
          COMBAT_POWER_SOFT_CAP,
          COMBAT_POWER_LATE_POWER,
        ),
      ),
    );
    const reward = safeMultiply(
      target.baseReward,
      safePow(1.04, Math.min(victories, 15)),
      safeAdd(
        1,
        safeMultiply(
          Math.log2(safeAdd(1, totalCores)),
          0.025,
        ),
      ),
      getBattleRewardMultiplier(targetState),
    );
    const chance = clamp(
      0.12 + (getCombatPower(targetState) / power) * 0.5,
      0.1,
      0.9,
    );
    return { victories, power, reward, chance };
  }

  function getSkirmishStats(target, targetState = state) {
    const victories = targetState.combat.enemyVictories[target.id] || 0;
    const totalCores = getHistoricalCores(targetState);
    const coreScale = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, totalCores)),
        0.08,
      ),
    );
    const rebirthScale = safeAdd(
      1,
      safeMultiply(
        Math.log2(safeAdd(1, Math.max(0, targetState.rebirths || 0))),
        0.05,
      ),
    );
    const rawPower = safeMultiply(
        target.basePower,
        safePow(
          1.16,
          Math.min(victories, 20) +
            Math.max(0, victories - 20) * 0.25,
        ),
        coreScale,
        rebirthScale,
      );
    const power = Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        softCapGameNumber(
          rawPower,
          COMBAT_POWER_SOFT_CAP,
          COMBAT_POWER_LATE_POWER,
        ),
      ),
    );
    const reward = safeMultiply(
      target.baseReward,
      safePow(1.02, Math.min(victories, 15)),
      safeAdd(
        1,
        safeMultiply(
          Math.log2(safeAdd(1, totalCores)),
          0.012,
        ),
      ),
    );
    const chance = clamp(
      0.15 + (getCombatPower(targetState) / power) * 0.56,
      0.12,
      0.92,
    );
    return { victories, power, reward, chance };
  }

  function getSkirmishDrops(target, targetState = state) {
    const lootMultiplier = getStarportLootMultiplier(targetState);
    const drops = {};
    Object.entries(target.drops).forEach(([materialId, range]) => {
      const rawAmount = randomBetween(range[0], range[1]);
      if (rawAmount > 0) {
        const scaledAmount = safeMultiply(rawAmount, lootMultiplier);
        const wholeAmount = Math.floor(scaledAmount);
        drops[materialId] = Math.max(
          1,
          wholeAmount +
            (Math.random() < scaledAmount - wholeAmount ? 1 : 0),
        );
      }
    });
    return drops;
  }

  function addStarportMaterials(drops) {
    Object.entries(drops).forEach(([materialId, amount]) => {
      if (!(materialId in state.starport.materials)) return;
      state.starport.materials[materialId] = clampGameCount(
        state.starport.materials[materialId] + amount,
      );
    });
  }

  function describeMaterials(materials, emptyText = "无材料") {
    const parts = STARPORT_MATERIALS.flatMap((material) => {
      const amount = materials[material.id] || 0;
      return amount > 0
        ? [`${material.icon}${material.shortName} ${formatNumber(amount, 0)}`]
        : [];
    });
    return parts.length ? parts.join(" · ") : emptyText;
  }

  function describeStarportCost(cost) {
    return [
      `✦星尘 ${formatNumber(cost.dust || 0, 0)}`,
      describeMaterials(cost, ""),
    ]
      .filter(Boolean)
      .join(" · ");
  }

  function describeStarportModuleEffect(module, rank) {
    if (rank <= 0) return "尚未建造";
    if (module.id === "droneDock") {
      return `手动 +${formatNumber(rank * 8, 0)}% · 自动 +${formatNumber(
        rank * 4,
        0,
      )}%`;
    }
    if (module.id === "logistics") {
      return `设施成本 -${formatNumber(
        (1 - 1 / (1 + rank * 0.03)) * 100,
        1,
      )}%`;
    }
    if (module.id === "radar") {
      return `掉落 +${formatNumber(rank * 8, 0)}% · 整备 -${formatNumber(
        rank * 2,
        1,
      )}%`;
    }
    return `${module.effect} +${formatNumber(
      rank * module.effectPerRank,
      0,
    )}%`;
  }

  function upgradeStarportModule(moduleId) {
    const module = STARPORT_MODULES.find((entry) => entry.id === moduleId);
    if (!module || state.lifetimeDust < module.unlock) return;
    const rank = getStarportRank(module.id);
    if (rank >= module.maxRank) return;
    const cost = getStarportModuleCost(module);
    if (!canAffordStarportModule(module)) {
      showToast("建设资源不足", `需要 ${describeStarportCost(cost)}。`, "⌬");
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    state.dust = clampGameNumber(state.dust - cost.dust);
    recordMissionProgress("dustSpent", cost.dust);
    STARPORT_MATERIALS.forEach((material) => {
      const amount = cost[material.id] || 0;
      if (amount <= 0) return;
      state.starport.materials[material.id] = clampGameCount(
        state.starport.materials[material.id] - amount,
      );
    });
    state.starport.modules[module.id] = clamp(
      rank + 1,
      0,
      module.maxRank,
    );
    recordCrescentProgress("starportUpgrades");
    recordMissionProgress("starportUpgrades", 1);
    const action = rank === 0 ? "建造" : "强化";
    const message = `${module.name}${action}完成，当前等级 ${rank + 1} / ${module.maxRank}。`;
    addLog(message);
    showToast(
      `${module.name}${action}完成`,
      `${describeStarportModuleEffect(module, rank + 1)}，增幅已生效。`,
      module.icon,
    );
    playAchievementTone();
    checkAchievements();
    renderStarport();
    updateUi();
    saveGame();
  }

  function attackSkirmish(targetId) {
    const target = SKIRMISH_TARGETS.find((entry) => entry.id === targetId);
    if (!target || state.lifetimeDust < target.unlock) return;
    const now = Date.now();
    if (state.combat.skirmishCooldownUntil > now) {
      showToast("清剿小队整备中", "等待短程编队返回星港。", "⌛");
      return;
    }

    const stats = getSkirmishStats(target);
    const success = Math.random() <= stats.chance;
    const cooldownMultiplier = getStarportCooldownMultiplier();
    recordCareerBattle();
    if (success) {
      const reward = safeMultiply(stats.reward, 0.9 + Math.random() * 0.2);
      const drops = getSkirmishDrops(target);
      addDust(reward);
      addStarportMaterials(drops);
      recordMissionProgress(
        "materialsCollected",
        Object.values(drops).reduce((sum, amount) => safeAdd(sum, amount), 0),
      );
      state.combat.enemyVictories[target.id] = clampGameCount(
        state.combat.enemyVictories[target.id] + 1,
      );
      state.combat.wins = clampGameCount(state.combat.wins + 1);
      state.combat.activeWins = clampGameCount(state.combat.activeWins + 1);
      grantExpeditionBattleSupply();
      state.combat.skirmishWins = clampGameCount(
        state.combat.skirmishWins + 1,
      );
      recordSectorWin();
      recordCrescentProgress("skirmishWins");
      recordMissionProgress("battlesWon", 1);
      state.combat.skirmishCooldownUntil =
        now + Math.round(4500 * cooldownMultiplier);
      const materialText = describeMaterials(drops);
      const message = `近域清剿成功：击退${target.name}，回收 ${formatNumber(
        reward,
      )} 星尘与 ${materialText}。`;
      setCombatReport(message);
      addLog(message);
      showToast("近域清剿成功", materialText, target.icon);
      playAchievementTone();
    } else {
      const lossRatio = clamp(
        0.02 + (stats.power / Math.max(1, getCombatPower())) * 0.012,
        0.02,
        0.08,
      );
      const loss = safeMultiply(state.dust, lossRatio);
      state.dust = clampGameNumber(state.dust - loss);
      state.combat.losses = clampGameCount(state.combat.losses + 1);
      state.combat.skirmishCooldownUntil =
        now + Math.round(6500 * cooldownMultiplier);
      const message = `近域清剿失利：小队从${target.location}撤回，维修损失 ${formatNumber(
        loss,
      )} 星尘。`;
      setCombatReport(message);
      addLog(message);
      showToast("清剿失利", `维修损失 ${formatNumber(loss)} 星尘`, "!");
      playTone(115, 0.22, "sawtooth", 0.028);
    }
    checkAchievements();
    renderCombatTargets();
    updateCombatUi();
    saveGame();
  }

  function setCombatReport(message) {
    state.combat.lastReport = message;
    if (state.activePage === "combat") {
      elements.combatReportText.textContent = message;
    }
  }

  function upgradeCombat(type) {
    if (!["attack", "defense"].includes(type)) return;
    const cost = getCombatUpgradeCost(type);
    if (state.dust < cost) {
      showToast("星尘不足", "军械库无法完成这次永久强化。", "·");
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    state.dust = clampGameNumber(state.dust - cost);
    recordMissionProgress("dustSpent", cost);
    recordMissionProgress("combatUpgrades", 1);
    if (type === "attack") {
      state.combat.attackLevel = clampGameCount(
        state.combat.attackLevel + 1,
      );
      const power = getCombatPower();
      setCombatReport(`舰炮强化完成，舰队战斗力提升至 ${formatNumber(power)}。`);
      addLog(`舰炮强化至 ${state.combat.attackLevel} 级，战斗力达到 ${formatNumber(power)}。`);
      showToast("舰炮强化完成", `当前战斗力：${formatNumber(power)}`, "↟");
      playTone(460, 0.11, "sawtooth", 0.024);
    } else {
      state.combat.defenseLevel = clampGameCount(
        state.combat.defenseLevel + 1,
      );
      const defense = getDefensePower();
      setCombatReport(`基地装甲加固完成，防御力提升至 ${formatNumber(defense)}。`);
      addLog(`基地防御强化至 ${state.combat.defenseLevel} 级，防御力达到 ${formatNumber(defense)}。`);
      showToast("基地加固完成", `当前防御力：${formatNumber(defense)}`, "⬡");
      playTone(320, 0.14, "triangle", 0.028);
    }
    renderCombatTargets();
    updateCombatUi();
    saveGame();
  }

  function attackPlanet(targetId) {
    const target = PLANET_TARGETS.find((entry) => entry.id === targetId);
    if (!target || state.lifetimeDust < target.unlock) return;
    const now = Date.now();
    if (state.combat.attackCooldownUntil > now) {
      showToast("舰队整备中", "等待冷却结束后才能再次出击。", "⌛");
      return;
    }

    const stats = getPlanetStats(target);
    const success = Math.random() <= stats.chance;
    recordCareerBattle();
    if (success) {
      const reward = safeMultiply(
        stats.reward,
        0.9 + Math.random() * 0.2,
      );
      addDust(reward);
      state.combat.enemyVictories[target.id] = clampGameCount(
        state.combat.enemyVictories[target.id] + 1,
      );
      state.combat.wins = clampGameCount(state.combat.wins + 1);
      state.combat.activeWins = clampGameCount(
        state.combat.activeWins + 1,
      );
      grantExpeditionBattleSupply();
      recordSectorWin();
      recordMissionProgress("battlesWon", 1);
      state.combat.attackCooldownUntil = now + 12000;
      const message = `远征胜利：击退${target.name}，夺取 ${formatNumber(
        reward,
      )} 星尘；该目标已进化并提高战力。`;
      setCombatReport(message);
      addLog(message);
      showToast("远征胜利", `战利品 +${formatNumber(reward)} 星尘`, target.icon);
      playAchievementTone();
    } else {
      const lossRatio = clamp(
        0.08 + (stats.power / Math.max(1, getCombatPower())) * 0.035,
        0.08,
        0.22,
      );
      const loss = safeMultiply(state.dust, lossRatio);
      state.dust = clampGameNumber(state.dust - loss);
      state.combat.losses = clampGameCount(state.combat.losses + 1);
      state.combat.attackCooldownUntil = now + 16000;
      const message = `远征失利：舰队从${target.location}撤退，维修损失 ${formatNumber(
        loss,
      )} 星尘。`;
      setCombatReport(message);
      addLog(message);
      showToast("远征失利", `维修损失 ${formatNumber(loss)} 星尘`, "!");
      playTone(105, 0.28, "sawtooth", 0.032);
    }
    checkAchievements();
    renderCombatTargets();
    updateCombatUi();
    saveGame();
  }

  function scheduleNextMinorRaid(fromTime = Date.now()) {
    state.combat.nextRaidAt =
      fromTime +
      randomBetween(MINOR_RAID_MIN_INTERVAL, MINOR_RAID_MAX_INTERVAL);
  }

  function getRaidPool(type) {
    return type === "major" ? MAJOR_RAIDERS : RAIDERS;
  }

  function getRaidRaider(raid) {
    const pool = getRaidPool(raid?.type);
    return pool.find((entry) => entry.id === raid?.raiderId) || pool[0];
  }

  function calculateRaidPower(type = "minor") {
    const major = type === "major";
    const progressThreat = safeAdd(
      20,
      safeMultiply(Math.log2(safeAdd(1, state.lifetimeDust)), 4),
      safeMultiply(Math.log2(safeAdd(1, getHistoricalCores())), 7),
      safeMultiply(state.combat.raidsSurvived, 3),
      major ? safeMultiply(state.combat.majorRaidsFaced, 8) : 0,
    );
    const adaptiveFactor = major
      ? clamp(
          0.9 +
            state.combat.majorRaidsSurvived * 0.018 +
            state.rebirths * 0.03,
          0.9,
          1.32,
        )
      : clamp(
          0.68 +
            state.combat.raidsSurvived * 0.01 +
            state.rebirths * 0.02,
          0.68,
          1.12,
        );
    const scaledProgress = safeMultiply(progressThreat, major ? 1.45 : 1);
    const adaptiveThreat = safeMultiply(getDefensePower(), adaptiveFactor);
    const variance = major
      ? 0.92 + Math.random() * 0.26
      : 0.86 + Math.random() * 0.3;
    return Math.min(
      MAX_COMBAT_POWER,
      Math.max(
        major ? 60 : 30,
        Math.round(
          safeMultiply(Math.max(scaledProgress, adaptiveThreat), variance),
        ),
      ),
    );
  }

  function getCombinedPower(targetState = state) {
    return Math.min(
      MAX_COMBAT_POWER,
      safeAdd(
        getCombatPower(targetState),
        getDefensePower(targetState),
      ),
    );
  }

  function refreshCareerRecords(targetState = state) {
    targetState.careerDust = Math.min(
      CAREER_DUST_CAP,
      Math.max(
        Number(targetState.careerDust) || 0,
        Number(targetState.lifetimeDust) || 0,
        Number(targetState.runDust) || 0,
      ),
    );
    targetState.careerBattles = clampGameCount(
      Math.max(
        Number(targetState.careerBattles) || 0,
        safeAdd(
          targetState.combat?.wins || 0,
          targetState.combat?.losses || 0,
        ),
      ),
    );
    targetState.highestCombinedPower = Math.min(
      MAX_COMBAT_POWER,
      Math.max(
        Number(targetState.highestCombinedPower) || 0,
        getCombinedPower(targetState),
      ),
    );
    return targetState;
  }

  function recordCareerBattle() {
    state.careerBattles = clampGameCount(state.careerBattles + 1);
  }

  function recordSectorWin() {
    if (
      !isEndgameUnlocked() ||
      state.endgame.sectorLevel % 3 !== 2
    ) {
      return;
    }
    state.endgame.sectorWins = clampGameCount(
      state.endgame.sectorWins + 1,
    );
  }

  function createRaidSnapshot(type, startedAt = Date.now()) {
    const pool = getRaidPool(type);
    const raider = pool[Math.floor(Math.random() * pool.length)];
    const warning = type === "major" ? MAJOR_RAID_WARNING : MINOR_RAID_WARNING;
    return {
      type,
      raiderId: raider.id,
      power: calculateRaidPower(type),
      startedAt,
      arrivesAt: startedAt + warning,
    };
  }

  function createRaid(type = "minor") {
    const now = Date.now();
    if (state.lifetimeDust < COMBAT_UNLOCK_DUST) {
      scheduleNextMinorRaid(now);
      state.combat.nextMajorRaidAt = now + MAJOR_RAID_INTERVAL;
      return;
    }
    if (type === "major") {
      const schedule = countFixedIntervalEvents(
        state.combat.nextMajorRaidAt,
        now,
        MAJOR_RAID_INTERVAL,
        MAX_OFFLINE_MAJOR_RAIDS,
      );
      state.combat.nextMajorRaidAt =
        schedule.count > 0 ? schedule.nextAt : now + MAJOR_RAID_INTERVAL;
    }
    const raid = createRaidSnapshot(type, now);
    const raider = getRaidRaider(raid);
    state.combat.incomingRaid = raid;
    const warningSeconds = Math.ceil((raid.arrivesAt - now) / 1000);
    const label = type === "major" ? "大袭击" : "随机袭击";
    setCombatReport(
      `${label}预警：${raider.name}将在 ${warningSeconds} 秒后抵达，敌方战力 ${formatNumber(
        raid.power,
      )}。`,
    );
    showToast(`${label}预警`, `${raider.name}正在逼近！`, raider.icon);
    playTone(type === "major" ? 122 : 175, type === "major" ? 0.55 : 0.35, "sawtooth", 0.032);
  }

  function applyRaidOutcome(raid, { offline = false, maxLoss = Infinity } = {}) {
    const major = raid.type === "major";
    const raider = getRaidRaider(raid);
    const defense = getDefensePower();
    const defended = defense >= raid.power;
    recordCareerBattle();
    if (major) {
      state.combat.majorRaidsFaced = clampGameCount(
        state.combat.majorRaidsFaced + 1,
      );
    }

    if (defended) {
      const reward = safeMultiply(
        Math.max(
          major ? 120 : 35,
          safeMultiply(raid.power, major ? 0.42 : 0.32),
          safeMultiply(calculateRate(), major ? 4 : 1.4),
        ),
        getBattleRewardMultiplier(),
      );
      addDust(reward);
      state.combat.wins = clampGameCount(state.combat.wins + 1);
      state.combat.raidsSurvived = clampGameCount(
        state.combat.raidsSurvived + 1,
      );
      recordMissionProgress("battlesWon", 1);
      recordMissionProgress("raidsDefended", 1);
      recordSectorWin();
      if (major) {
        state.combat.majorRaidsSurvived = clampGameCount(
          state.combat.majorRaidsSurvived + 1,
        );
      }
      const message = `${major ? "大袭击" : "防卫"}成功：基地击退${
        raider.name
      }，回收残骸获得 ${formatNumber(reward)} 星尘。`;
      state.combat.lastReport = message;
      if (!offline) {
        addLog(message);
        showToast(
          major ? "大袭击防卫成功" : "基地防卫成功",
          `残骸收益 +${formatNumber(reward)} 星尘`,
          major ? "◆" : "⬡",
        );
        playAchievementTone();
      }
      return { defended: true, reward, loss: 0, raider, major };
    }

    const deficit = (raid.power - defense) / Math.max(1, raid.power);
    const lossRatio = major
      ? clamp(0.12 + deficit * 0.24, 0.12, 0.32)
      : clamp(0.055 + deficit * 0.18, 0.055, 0.22);
    const loss = Math.min(safeMultiply(state.dust, lossRatio), maxLoss);
    state.dust = clampGameNumber(state.dust - loss);
    state.combat.losses = clampGameCount(state.combat.losses + 1);
    const message = `${major ? "大袭击失守" : "基地失守"}：${
      raider.name
    }突破防线，掠走 ${formatNumber(loss)} 星尘。`;
    state.combat.lastReport = message;
    if (!offline) {
      addLog(message);
      showToast(
        major ? "大袭击突破防线" : "基地遭到掠夺",
        `损失 ${formatNumber(loss)} 星尘`,
        "!",
      );
      playTone(major ? 68 : 82, major ? 0.68 : 0.5, "sawtooth", 0.038);
    }
    return { defended: false, reward: 0, loss, raider, major };
  }

  function resolveRaid() {
    const raid = state.combat.incomingRaid;
    if (!raid) return;
    applyRaidOutcome(raid);
    state.combat.incomingRaid = null;
    if (raid.type !== "major") scheduleNextMinorRaid();
    checkAchievements();
    if (state.activePage === "combat") {
      renderCombatTargets();
      updateCombatUi();
    }
    saveGame();
  }

  function processCombatEvents() {
    const now = Date.now();
    if (state.lifetimeDust < COMBAT_UNLOCK_DUST) {
      if (state.combat.nextRaidAt <= now) scheduleNextMinorRaid(now);
      if (state.combat.nextMajorRaidAt <= now) {
        state.combat.nextMajorRaidAt = now + MAJOR_RAID_INTERVAL;
      }
      return;
    }
    if (state.combat.incomingRaid) {
      if (now >= state.combat.incomingRaid.arrivesAt) resolveRaid();
      return;
    }
    if (now >= state.combat.nextMajorRaidAt) {
      createRaid("major");
    } else if (now >= state.combat.nextRaidAt) {
      createRaid("minor");
    }
  }

  function scheduleEvent() {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    state.event = {
      id: event.id,
      expires: Date.now() + 22000,
    };
    showToast("雷达发现异常", event.title, "◈");
    playTone(720, 0.13, "triangle");
  }

  function claimEvent() {
    if (!state.event || state.event.expires <= Date.now()) return;
    const event = EVENTS.find((entry) => entry.id === state.event.id);
    let logText = "";
    if (event.id === "wreck") {
      const reward = Math.max(
        80,
        safeAdd(
          safeMultiply(calculateRate(), 55),
          safeMultiply(getClickValue(), 20),
        ),
      );
      addDust(reward);
      showToast("货舱回收完成", `获得 ${formatNumber(reward)} 星尘。`, "✦");
      logText = `漂流货舱带回 ${formatNumber(reward)} 星尘。`;
    } else if (event.id === "surge") {
      state.buff = { id: "surge", expires: Date.now() + 30000 };
      showToast("光帆已展开", "自动产量在 30 秒内提升至 2 倍。", "☼");
      logText = "舰队接入恒星风暴，自动产量暂时翻倍。";
    } else {
      const reward = Math.max(
        140,
        safeAdd(
          safeMultiply(state.runDust, 0.035),
          safeMultiply(getClickValue(), 35),
        ),
      );
      addDust(reward);
      state.buff = { id: "precision", expires: Date.now() + 20000 };
      showToast(
        "坐标破译完成",
        `获得 ${formatNumber(reward)} 星尘，手动回收在 20 秒内提升至 5 倍。`,
        "⌖",
      );
      logText = `未知坐标中藏有 ${formatNumber(reward)} 星尘。`;
    }
    addLog(logText);
    recordMissionProgress("eventsClaimed", 1);
    state.event = null;
    state.nextEventAt = Date.now() + randomBetween(45000, 75000);
    playAchievementTone();
    updateUi();
  }

  function expireTimedEffects() {
    const now = Date.now();
    if (state.event && state.event.expires <= now) {
      const expired = EVENTS.find((entry) => entry.id === state.event.id);
      addLog(`${expired.title}的信号消失了。`);
      state.event = null;
      state.nextEventAt = now + randomBetween(35000, 65000);
    }
    if (state.buff && state.buff.expires <= now) {
      const name = state.buff.id === "surge" ? "恒星风暴" : "精确回收";
      state.buff = null;
      showToast("临时增幅结束", `${name}效果已恢复正常。`, "·");
    }
    if (!state.event && now >= state.nextEventAt) scheduleEvent();
  }

  function showToast(title, message, icon = "✦") {
    const toast = document.createElement("div");
    toast.className = "toast";
    const iconElement = document.createElement("span");
    iconElement.className = "toast-icon";
    iconElement.textContent = icon;
    const copy = document.createElement("span");
    const heading = document.createElement("strong");
    heading.textContent = title;
    const description = document.createElement("small");
    description.textContent = message;
    copy.append(heading, description);
    toast.append(iconElement, copy);
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add("removing");
      window.setTimeout(() => toast.remove(), 260);
    }, 3200);
  }

  function showModal({
    eyebrow,
    icon,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
  }) {
    elements.modalEyebrow.textContent = eyebrow || "航站简报";
    elements.modalIcon.textContent = icon || "✦";
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.modalConfirm.textContent = confirmText || "确认";
    elements.modalCancel.textContent = cancelText || "取消";
    elements.modalCancel.hidden = !cancelText;
    modalCallback = typeof onConfirm === "function" ? onConfirm : null;
    elements.modalBackdrop.hidden = false;
    elements.modalConfirm.focus();
  }

  function closeModal(confirmed) {
    const callback = modalCallback;
    modalCallback = null;
    elements.modalBackdrop.hidden = true;
    if (confirmed && callback) callback();
  }

  function unlockCrescentMission() {
    if (
      !isCrescentMissionAvailable() ||
      state.crescentSecret.unlocked
    ) {
      return;
    }
    state.crescentSecret.unlocked = true;
    addLog("未登记的月牙信号已接入私人信道。");
    showToast("私人信道已接通", "一项没有坐标的任务出现在超越终端。", "☾");
    playAchievementTone();
    renderCrescentSecret();
    saveGame();
  }

  function hasCompletedCrescentMission() {
    return (
      state.crescentSecret.manualClicks >=
        CRESCENT_MISSION_GOALS.manualClicks &&
      state.crescentSecret.skirmishWins >=
        CRESCENT_MISSION_GOALS.skirmishWins &&
      state.crescentSecret.starportUpgrades >=
        CRESCENT_MISSION_GOALS.starportUpgrades
    );
  }

  function completeCrescentMission() {
    if (
      state.crescentSecret.completed ||
      !hasCompletedCrescentMission()
    ) {
      return;
    }
    state.crescentSecret.completed = true;
    addLog("月相校准完成，一封标注“只给抵达这里的人”的私人来信已解密。");
    showToast("隐藏任务完成", "私人信道中有一封信正在等待你。", "☾");
    playAchievementTone();
    renderCrescentSecret();
    saveGame();
    window.setTimeout(() => openCrescentLetter(), 650);
  }

  function recordCrescentProgress(progressKey) {
    if (
      !state.crescentSecret.unlocked ||
      state.crescentSecret.completed ||
      !Object.prototype.hasOwnProperty.call(
        CRESCENT_MISSION_GOALS,
        progressKey,
      )
    ) {
      return;
    }
    const goal = CRESCENT_MISSION_GOALS[progressKey];
    state.crescentSecret[progressKey] = Math.min(
      goal,
      clampGameCount(state.crescentSecret[progressKey] + 1),
    );
    renderCrescentSecret();
    completeCrescentMission();
  }

  function openCrescentLetter() {
    if (!state.crescentSecret.completed) return;
    state.crescentSecret.letterRead = true;
    elements.crescentLetterSalutation.textContent =
      `亲爱的${state.playerName || "指挥官"}：`;
    elements.crescentLetterBackdrop.hidden = false;
    document.body.classList.add("crescent-letter-open");
    renderCrescentSecret();
    saveGame();
    window.requestAnimationFrame(() =>
      elements.crescentLetterConfirm.focus(),
    );
  }

  function closeCrescentLetter() {
    elements.crescentLetterBackdrop.hidden = true;
    document.body.classList.remove("crescent-letter-open");
    if (!elements.crescentLetterButton.hidden) {
      elements.crescentLetterButton.focus();
    }
  }

  function compareGameVersions(left, right) {
    const parse = (value) => String(value || "")
      .split(".")
      .map((part) => Math.max(0, Math.floor(Number(part) || 0)));
    const leftParts = parse(left);
    const rightParts = parse(right);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
      const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
      if (difference !== 0) return Math.sign(difference);
    }
    return 0;
  }

  function showUpdateBanner(manifest) {
    latestAvailableVersion = manifest;
    if (updateDismissedVersion === manifest.version) return;
    elements.updateBannerTitle.textContent =
      `v${manifest.version} · ${manifest.title || "新版本"}`;
    elements.updateBannerMessage.textContent =
      "当前进度会先保存到本地；登录账号后也会触发一次云端同步。";
    elements.updateNowButton.disabled = false;
    elements.updateNowButton.textContent = "保存并更新";
    elements.updateBanner.hidden = false;
  }

  async function checkForGameUpdate() {
    if (versionCheckInFlight || location.protocol === "file:") return;
    versionCheckInFlight = true;
    try {
      const response = await fetch(`index.html?check=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "text/html" },
      });
      if (!response.ok) return;
      const markup = await response.text();
      const releaseDocument = new DOMParser().parseFromString(markup, "text/html");
      const manifest = {
        version: releaseDocument.querySelector(
          'meta[name="stellar-game-version"]',
        )?.content,
        title: releaseDocument.querySelector(
          'meta[name="stellar-release-title"]',
        )?.content,
      };
      if (
        typeof manifest?.version === "string" &&
        compareGameVersions(manifest.version, GAME_VERSION) > 0
      ) {
        showUpdateBanner(manifest);
      } else if (
        latestAvailableVersion &&
        compareGameVersions(manifest?.version, GAME_VERSION) <= 0
      ) {
        latestAvailableVersion = null;
        elements.updateBanner.hidden = true;
      }
    } catch (error) {
      // Offline play remains available; the next interval retries automatically.
    } finally {
      versionCheckInFlight = false;
    }
  }

  function installVersionChecks() {
    checkForGameUpdate();
    if (versionCheckTimer !== null) window.clearInterval(versionCheckTimer);
    versionCheckTimer = window.setInterval(
      checkForGameUpdate,
      VERSION_CHECK_INTERVAL,
    );
    window.addEventListener("online", checkForGameUpdate);
  }

  function applyAvailableGameUpdate() {
    if (!latestAvailableVersion) return;
    elements.updateNowButton.disabled = true;
    elements.updateNowButton.textContent = "正在保存…";
    saveGame(false, { forceBackup: true });
    const targetVersion = latestAvailableVersion.version;
    window.setTimeout(() => {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("version", targetVersion);
      nextUrl.searchParams.set("reload", String(Date.now()));
      window.location.replace(nextUrl.toString());
    }, 2200);
  }

  function hasSeenCurrentPatchNotes() {
    if (patchNotesSeenThisSession) return true;
    try {
      return localStorage.getItem(PATCH_NOTES_SEEN_KEY) === PATCH_NOTES_VERSION;
    } catch (error) {
      return false;
    }
  }

  function markCurrentPatchNotesSeen() {
    patchNotesSeenThisSession = true;
    try {
      localStorage.setItem(PATCH_NOTES_SEEN_KEY, PATCH_NOTES_VERSION);
    } catch (error) {
      // The in-memory marker still prevents repeated prompts in private mode.
    }
  }

  function renderPatchNotes() {
    elements.patchNotesCurrentVersion.textContent = `v${PATCH_NOTES_VERSION}`;
    elements.patchNotesList.textContent = "";

    PATCH_NOTES.forEach((note, index) => {
      const card = document.createElement("article");
      card.className = "patch-note-card";

      const heading = document.createElement("header");
      heading.className = "patch-note-heading";

      const version = document.createElement("strong");
      version.textContent = `v${note.version}`;

      const theme = document.createElement("span");
      theme.textContent = note.theme;
      heading.append(version, theme);

      if (index === 0) {
        const badge = document.createElement("span");
        badge.className = "patch-note-badge";
        badge.textContent = "本次更新";
        heading.appendChild(badge);
      }

      const changes = document.createElement("ul");
      note.changes.forEach((change) => {
        const item = document.createElement("li");
        item.textContent = change;
        changes.appendChild(item);
      });

      card.append(heading, changes);
      elements.patchNotesList.appendChild(card);
    });

    elements.patchNotesList.scrollTop = 0;
  }

  function openPatchNotes({ automatic = false } = {}) {
    patchNotesAutoOpened = automatic;
    elements.settingsMenu.hidden = true;
    elements.patchNotesConfirm.textContent = automatic ? "进入游戏" : "关闭记录";
    renderPatchNotes();
    document.body.classList.add("patch-notes-open");
    elements.patchNotesBackdrop.hidden = false;
    window.requestAnimationFrame(() => elements.patchNotesConfirm.focus());
  }

  function closePatchNotes() {
    const continueStartup = patchNotesAutoOpened;
    patchNotesAutoOpened = false;
    markCurrentPatchNotesSeen();
    elements.patchNotesBackdrop.hidden = true;
    document.body.classList.remove("patch-notes-open");

    if (continueStartup) {
      window.setTimeout(showStartupNotices, 160);
    } else {
      elements.menuButton.focus();
    }
  }

  function showStartupNotices() {
    if (
      !elements.modalBackdrop.hidden ||
      !elements.nameBackdrop.hidden ||
      !elements.tutorialBackdrop.hidden ||
      !elements.patchNotesBackdrop.hidden ||
      !elements.crescentLetterBackdrop.hidden ||
      !elements.communicationBackdrop.hidden ||
      !elements.accountBackdrop.hidden
    ) {
      window.setTimeout(showStartupNotices, 240);
      return;
    }
    if (!state.playerName) {
      openNameDialog(true);
      return;
    }
    if (!hasSeenCurrentPatchNotes()) {
      openPatchNotes({ automatic: true });
      return;
    }
    if (!state.tutorialSeen && state.lifetimeDust < 1) {
      openTutorial(0);
    }
  }

  function updatePlayerNameDisplay() {
    const title = state.starfall?.cosmetics?.title ? " · 等一场星雨" : "";
    elements.playerNameDisplay.textContent = state.playerName
      ? `指挥官 · ${state.playerName}${title}`
      : `指挥官 · 未命名${title}`;
  }

  function openNameDialog(required = false) {
    nameDialogRequired = required;
    elements.settingsMenu.hidden = true;
    elements.nameModalTitle.textContent = required
      ? "设置玩家名称"
      : "修改玩家名称";
    elements.nameModalMessage.textContent = required
      ? "为你的指挥官设置名称。名称会显示在星港顶部，随本地存档保存，并在登录后同步至云端。"
      : "输入新的玩家名称，保存后会立即更新指挥官档案和下一份云存档。";
    elements.playerNameInput.value = state.playerName;
    elements.nameError.textContent = "";
    elements.nameCancel.hidden = required;
    elements.nameBackdrop.hidden = false;
    window.requestAnimationFrame(() => {
      elements.playerNameInput.focus();
      elements.playerNameInput.select();
    });
  }

  function closeNameDialog() {
    if (nameDialogRequired) return;
    elements.nameBackdrop.hidden = true;
    elements.nameError.textContent = "";
  }

  function savePlayerName() {
    const nextName = normalizePlayerName(elements.playerNameInput.value);
    if (!nextName) {
      elements.nameError.textContent = "请输入 1–12 个字符的玩家名称。";
      elements.playerNameInput.focus();
      return;
    }

    const previousName = state.playerName;
    const isFirstName = !previousName;
    state.playerName = nextName;
    nameDialogRequired = false;
    elements.nameBackdrop.hidden = true;
    elements.nameError.textContent = "";
    updatePlayerNameDisplay();
    addLog(
      isFirstName
        ? `指挥官 ${nextName} 已接管星港。`
        : `指挥官名称已由 ${previousName} 更新为 ${nextName}。`,
    );
    saveGame();
    showToast(
      isFirstName ? "指挥官档案已建立" : "玩家名称已更新",
      `欢迎，${nextName}。`,
      "⌖",
    );

    if (isFirstName) {
      window.setTimeout(showStartupNotices, 220);
    }
  }

  function renderTutorial() {
    const step = TUTORIAL_STEPS[tutorialIndex];
    elements.tutorialStepLabel.textContent = `新手指引 · ${tutorialIndex + 1} / ${
      TUTORIAL_STEPS.length
    }`;
    elements.tutorialIcon.textContent = step.icon;
    elements.tutorialEyebrow.textContent = step.eyebrow;
    elements.tutorialTitle.textContent = step.title;
    elements.tutorialMessage.textContent = step.message;
    elements.tutorialTip.textContent = step.tip;
    elements.tutorialBack.disabled = tutorialIndex === 0;
    elements.tutorialNext.textContent =
      tutorialIndex === TUTORIAL_STEPS.length - 1 ? "开始游戏" : "下一步";
    elements.tutorialDots.textContent = "";
    TUTORIAL_STEPS.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.classList.toggle("active", index === tutorialIndex);
      elements.tutorialDots.appendChild(dot);
    });
  }

  function openTutorial(startAt = 0) {
    tutorialIndex = clamp(startAt, 0, TUTORIAL_STEPS.length - 1);
    elements.settingsMenu.hidden = true;
    renderTutorial();
    elements.tutorialBackdrop.hidden = false;
    elements.tutorialNext.focus();
  }

  function closeTutorial(showHint = true) {
    state.tutorialSeen = true;
    elements.tutorialBackdrop.hidden = true;
    saveGame();
    if (showHint) {
      activatePrimaryPage("command", { persist: true, scroll: true });
      showToast("准备就绪", "点击中央信标开始回收第一批星尘。", "✦");
      elements.collect.classList.add("tutorial-pulse");
      window.setTimeout(() => elements.collect.classList.remove("tutorial-pulse"), 7000);
    }
  }

  function moveTutorial(direction) {
    const nextIndex = tutorialIndex + direction;
    if (nextIndex >= TUTORIAL_STEPS.length) {
      closeTutorial(true);
      return;
    }
    tutorialIndex = clamp(nextIndex, 0, TUTORIAL_STEPS.length - 1);
    renderTutorial();
  }

  function ensureAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      audioContext ||= new AudioContextClass();
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function getCurrentBgmTrack() {
    return BGM_TRACKS[currentBgmTrackIndex] || BGM_TRACKS[0];
  }

  function getBgmTrackIndex(trackId) {
    const index = BGM_TRACKS.findIndex((track) => track.id === trackId);
    return index >= 0 ? index : 0;
  }

  function applyBgmTrack(trackIndex, { autoplay = false, restart = false } = {}) {
    const normalizedIndex = (
      (Math.trunc(trackIndex) % BGM_TRACKS.length) + BGM_TRACKS.length
    ) % BGM_TRACKS.length;
    const track = BGM_TRACKS[normalizedIndex];
    const changed = elements.bgmAudio.dataset.trackId !== track.id;
    currentBgmTrackIndex = normalizedIndex;
    elements.bgmAudio.dataset.trackId = track.id;
    elements.bgmAudio.dataset.trackTitle = track.title;
    elements.bgmAudio.dataset.loopStartSeconds = String(track.loopStartSeconds);
    elements.bgmAudio.dataset.loopEndTrimSeconds = String(track.loopEndTrimSeconds);
    updateBgmPlaybackDisplay();
    if (changed) {
      bgmTrackSwitchInProgress = true;
      elements.bgmAudio.pause();
      elements.bgmAudio.src = track.src;
      elements.bgmAudio.load();
    } else if (restart && elements.bgmAudio.readyState >= 1) {
      elements.bgmAudio.currentTime = track.loopStartSeconds;
    }
    if (autoplay && state.bgmEnabled) startBgm();
  }

  function syncBgmTrackSelection({ autoplay = false } = {}) {
    const trackIndex = state.bgmTrackSelection === BGM_PLAYLIST_SELECTION
      ? currentBgmTrackIndex
      : getBgmTrackIndex(state.bgmTrackSelection);
    applyBgmTrack(trackIndex, { autoplay });
  }

  function advanceBgmTrack() {
    if (bgmTrackSwitchInProgress) return;
    const nextIndex = state.bgmTrackSelection === BGM_PLAYLIST_SELECTION
      ? (currentBgmTrackIndex + 1) % BGM_TRACKS.length
      : getBgmTrackIndex(state.bgmTrackSelection);
    applyBgmTrack(nextIndex, { autoplay: true, restart: true });
  }

  function maintainBgmLoop() {
    const track = getCurrentBgmTrack();
    const duration = Number(elements.bgmAudio.duration);
    if (
      !Number.isFinite(duration)
      || duration <= 0
      || track.loopEndTrimSeconds <= 0
      || elements.bgmAudio.currentTime < duration - track.loopEndTrimSeconds
    ) {
      return;
    }
    advanceBgmTrack();
  }

  function setBgmVolume() {
    elements.bgmAudio.volume = clamp(state.bgmVolume, 0, 1);
  }

  function startBgm() {
    if (!state.bgmEnabled || !elements.bgmAudio.paused) return;
    setBgmVolume();
    if (
      elements.bgmAudio.readyState >= 1
      && elements.bgmAudio.currentTime < getCurrentBgmTrack().loopStartSeconds
    ) {
      elements.bgmAudio.currentTime = getCurrentBgmTrack().loopStartSeconds;
    }
    elements.bgmAudio.play().catch(() => {
      // Browsers can require a pointer or keyboard gesture before media playback.
    });
  }

  function stopBgm() {
    elements.bgmAudio.pause();
  }

  function updateBgmPlaybackDisplay() {
    const track = getCurrentBgmTrack();
    elements.bgmStatus.textContent = state.bgmEnabled ? "正在播放" : "音乐已暂停";
    elements.bgmCurrentTitle.textContent = track.title;
    elements.bgmButton.classList.toggle("off", !state.bgmEnabled);
    elements.bgmButton.setAttribute(
      "aria-pressed",
      state.bgmEnabled ? "true" : "false",
    );
    elements.bgmButton.setAttribute(
      "aria-label",
      `${state.bgmEnabled ? "暂停" : "播放"}背景音乐：${track.title}`,
    );
    elements.bgmButton.title = `${state.bgmEnabled ? "暂停" : "播放"}背景音乐 · ${track.title}`;
  }

  function updateBgmControls() {
    updateBgmPlaybackDisplay();
    [elements.topBgmTrack, elements.bgmTrack].forEach((control) => {
      if (control.value !== state.bgmTrackSelection) {
        control.value = state.bgmTrackSelection;
      }
    });
    const percentage = Math.round(state.bgmVolume * 100);
    if (Number(elements.bgmVolume.value) !== percentage) {
      elements.bgmVolume.value = String(percentage);
    }
    elements.bgmVolumeValue.textContent = `${percentage}%`;
  }

  function syncBgmState() {
    syncBgmTrackSelection();
    if (state.bgmEnabled) {
      setBgmVolume();
      startBgm();
    } else {
      stopBgm();
    }
    updateBgmControls();
  }

  function selectBgmTrack(trackId) {
    const requested = String(trackId || "");
    state.bgmTrackSelection = requested === BGM_PLAYLIST_SELECTION
      || BGM_TRACKS.some((track) => track.id === requested)
      ? requested
      : BGM_PLAYLIST_SELECTION;
    syncBgmTrackSelection({ autoplay: state.bgmEnabled });
    const selectedTitle = state.bgmTrackSelection === BGM_PLAYLIST_SELECTION
      ? "自动轮播"
      : BGM_TRACKS[getBgmTrackIndex(state.bgmTrackSelection)].title;
    showToast("背景音乐已切换", selectedTitle, "♫");
    updateBgmControls();
    saveGame();
  }

  function playTone(frequency, duration, type = "sine", volume = 0.035) {
    if (!state.sound) return;
    try {
      if (!ensureAudioContext()) return;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (error) {
      // Sound is optional; browsers can block Web Audio on file URLs.
    }
  }

  function playButtonTone(button) {
    if (!button || button.disabled) return;
    let frequency = 340;
    if (button.matches(".primary-tabs button, .tabs button")) frequency = 430;
    if (button.matches(".primary-button, #prestige-button")) frequency = 520;
    if (button.matches(".danger, #reset-button")) frequency = 185;
    playTone(frequency, 0.032, "triangle", 0.011);
  }

  function playAchievementTone() {
    if (!state.sound) return;
    [440, 620, 820].forEach((frequency, index) => {
      window.setTimeout(() => playTone(frequency, 0.14, "sine", 0.025), index * 80);
    });
  }

  function renderFleetCommandOptionGroup(title, field, definitions, preset) {
    return `
      <div class="fleet-command-option-group">
        <div class="fleet-command-option-heading">
          <small>${title}</small>
          <span>更改消耗 1 指挥数据</span>
        </div>
        <div class="fleet-command-options">
          ${definitions
            .map(
              (entry) => `
                <button
                  type="button"
                  class="fleet-command-option${
                    preset[field] === entry.id ? " selected" : ""
                  }"
                  data-fleet-config="${field}"
                  data-fleet-value="${entry.id}"
                >
                  <span aria-hidden="true">${entry.icon}</span>
                  <strong>${entry.name}</strong>
                  <small>${entry.description}</small>
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFleetCommand() {
    if (!elements.fleetCommandDeck) return;
    if (!isFleetCommandUnlocked()) {
      const progress = clamp(
        state.lifetimeDust / FLEET_COMMAND_UNLOCK_DUST,
        0,
        1,
      );
      elements.fleetCommandDeck.innerHTML = `
        <div class="fleet-command-locked">
          <span aria-hidden="true">⌘</span>
          <div>
            <small>编成协议尚未授权</small>
            <h3 id="fleet-command-title">三舰队指挥网</h3>
            <p>累计采集 ${formatNumber(
              FLEET_COMMAND_UNLOCK_DUST,
            )} 星尘后，可把现有设施编入工业、守备与远征舰队。</p>
            <div class="fleet-command-unlock-progress" aria-label="解锁进度">
              <i style="width:${progress * 100}%"></i>
            </div>
            <strong>${formatNumber(state.lifetimeDust)} / ${formatNumber(
              FLEET_COMMAND_UNLOCK_DUST,
            )}</strong>
          </div>
        </div>
      `;
      return;
    }
    ensureFleetChallengePeriod();
    const command = state.fleetCommand;
    const selectedIndex = command.selectedPreset;
    const selectedPreset = getFleetCommandPreset(state, selectedIndex);
    const activePreset = getFleetCommandPreset(state, command.activePreset);
    const distribution = getFleetDistribution(selectedPreset);
    const activeDistribution = getFleetDistribution(activePreset);
    const units = getTotalUnits();
    const allocationCards = [
      ["production", "工业舰队", "⌁"],
      ["defense", "守备舰队", "⬡"],
      ["expedition", "远征舰队", "↟"],
    ]
      .map(([id, label, icon]) => {
        const share = distribution.allocation[id];
        return `
          <div class="fleet-allocation-card ${id}">
            <span aria-hidden="true">${icon}</span>
            <div>
              <small>${label}</small>
              <strong>${formatNumber(Math.floor((units * share) / 100), 0)} 单位</strong>
            </div>
            <b>${share}%</b>
          </div>
        `;
      })
      .join("");
    const now = Date.now();
    const switchSeconds = Math.max(
      0,
      Math.ceil((command.switchCooldownUntil - now) / 1000),
    );
    const reconfigureSeconds = Math.max(
      0,
      Math.ceil((command.reconfigureCooldownUntil - now) / 1000),
    );
    const switchCost = getFleetSwitchCost();
    const recipes = ["ammo", "maintenance", "data"].map(
      getFleetCraftRecipe,
    );
    const challenge = getFleetChallenge();
    const activeFormation =
      FLEET_FORMATIONS.find((entry) => entry.id === activePreset.formation) ||
      FLEET_FORMATIONS[0];
    const activeWeapon =
      FLEET_WEAPONS.find((entry) => entry.id === activePreset.weapon) ||
      FLEET_WEAPONS[0];
    const activeTactic =
      FLEET_TACTICS.find((entry) => entry.id === activePreset.tactic) ||
      FLEET_TACTICS[0];
    const ammoCost = activeTactic.id === "precision" ? 4 : 3;
    const maintenanceCost = activeTactic.id === "suppression" ? 1 : 2;
    const attempts = [...command.weekly.attempts].sort(
      (left, right) => right.score - left.score,
    );
    const best = attempts.find((attempt) => attempt.clear) || null;
    const resetSeconds = Math.max(
      0,
      Math.ceil((getNextWeeklyReset() - now) / 1000),
    );
    const resetDays = Math.floor(resetSeconds / 86400);
    const resetHours = Math.floor((resetSeconds % 86400) / 3600);
    elements.fleetCommandDeck.innerHTML = `
      <div class="fleet-command-header">
        <div>
          <p class="eyebrow">三舰队协同 · 舰队编成</p>
          <h3 id="fleet-command-title">舰队编成指挥网</h3>
          <p>当前启用 <strong>${activePreset.name}</strong>：工业 ${
            activeDistribution.allocation.production
          }% · 守备 ${activeDistribution.allocation.defense}% · 远征 ${
            activeDistribution.allocation.expedition
          }%</p>
        </div>
        <span class="fleet-command-state">三舰队在线</span>
      </div>
      <div class="fleet-command-resource-grid">
        <div><span>◆</span><small>战术弹药</small><strong>${formatNumber(
          command.ammo,
          0,
        )}</strong></div>
        <div><span>⬡</span><small>维护件</small><strong>${formatNumber(
          command.maintenance,
          0,
        )}</strong></div>
        <div><span>⌘</span><small>指挥数据</small><strong>${formatNumber(
          command.commandData,
          0,
        )}</strong></div>
        <div><span>✦</span><small>收藏舰徽</small><strong>${
          command.cosmetics.length
        } / ${FLEET_COSMETICS.length}</strong></div>
      </div>
      <div class="fleet-command-craft-row">
        ${recipes
          .map(
            (recipe) => `
              <button
                type="button"
                data-fleet-craft="${recipe.type}"
                ${canAffordFleetRecipe(recipe) ? "" : "disabled"}
              >
                <span>${recipe.icon} ${recipe.label}</span>
                <small>${getFleetRecipeText(recipe)}</small>
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="fleet-preset-tabs" role="tablist" aria-label="舰队编成方案">
        ${command.presets
          .map(
            (preset, index) => `
              <button
                type="button"
                class="${selectedIndex === index ? "selected" : ""}"
                data-fleet-preset="${index}"
                aria-selected="${selectedIndex === index}"
              >
                <small>方案 ${index + 1}${
                  command.activePreset === index ? " · 当前" : ""
                }</small>
                <strong>${preset.name}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="fleet-preset-editor">
        <div class="fleet-preset-summary">
          <div>
            <small>部署重心</small>
            <h4>${distribution.icon} ${distribution.name}</h4>
            <p>${distribution.description}</p>
          </div>
          <button
            type="button"
            class="fleet-activate-button"
            data-fleet-action="activate"
            ${
              selectedIndex === command.activePreset ||
              switchSeconds > 0 ||
              command.commandData < 1 ||
              state.dust < switchCost
                ? "disabled"
                : ""
            }
          >
            <strong>启用此方案</strong>
            <small>正在计算换防成本</small>
          </button>
        </div>
        <div class="fleet-allocation-grid">${allocationCards}</div>
        ${renderFleetCommandOptionGroup(
          "部署比例",
          "distribution",
          FLEET_DISTRIBUTIONS,
          selectedPreset,
        )}
        ${renderFleetCommandOptionGroup(
          "战斗阵型",
          "formation",
          FLEET_FORMATIONS,
          selectedPreset,
        )}
        ${renderFleetCommandOptionGroup(
          "主武器",
          "weapon",
          FLEET_WEAPONS,
          selectedPreset,
        )}
        ${renderFleetCommandOptionGroup(
          "战术指令",
          "tactic",
          FLEET_TACTICS,
          selectedPreset,
        )}
        <p class="fleet-command-cooldown-note">
          ${
            reconfigureSeconds > 0
              ? `方案重编冷却 ${reconfigureSeconds} 秒`
              : "方案可重编"
          } · 工业倍率 ×${getFleetProductionMultiplier().toFixed(
            3,
          )} · 守备倍率 ×${getFleetDefenseMultiplier().toFixed(3)}
        </p>
      </div>
      <section class="fleet-weekly-challenge" aria-labelledby="fleet-weekly-title">
        <div class="fleet-weekly-heading">
          <div>
            <p class="eyebrow">${challenge.key} · 固定规则</p>
            <h3 id="fleet-weekly-title">${challenge.name}</h3>
            <p><strong>${challenge.hazard.name}</strong>：${
              challenge.hazard.description
            }</p>
          </div>
          <div class="fleet-weekly-reset">
            <small>规则刷新</small>
            <strong>${resetDays}天 ${resetHours}时</strong>
          </div>
        </div>
        <div class="fleet-challenge-phases">
          ${challenge.phases
            .map(
              (phase, index) => `
                <div class="${phase.trait.color}">
                  <span>${phase.trait.icon}</span>
                  <small>航段 ${index + 1}</small>
                  <strong>${phase.trait.name}</strong>
                  <p>威胁 ×${phase.powerFactor.toFixed(2)}</p>
                </div>
              `,
            )
            .join("")}
        </div>
        <div class="fleet-challenge-loadout">
          <div><small>当前方案</small><strong>${activePreset.name}</strong></div>
          <div><small>阵型</small><strong>${activeFormation.name}</strong></div>
          <div><small>武器</small><strong>${activeWeapon.name}</strong></div>
          <div><small>战术</small><strong>${activeTactic.name}</strong></div>
        </div>
        <div class="fleet-challenge-action">
          <div>
            <small>最佳记录</small>
            <strong>${best ? `${best.score} 分` : "尚未完成"}</strong>
            <span>${
              best
                ? `${best.time.toFixed(1)} 秒 · 舰损 ${best.damage.toFixed(
                    1,
                  )}% · 效率 ${best.efficiency.toFixed(1)}`
                : "正确克制三段敌人可明显提高评分"
            }</span>
          </div>
          <button
            type="button"
            data-fleet-action="challenge"
            ${
              command.ammo < ammoCost ||
              command.maintenance < maintenanceCost
                ? "disabled"
                : ""
            }
          >
            <strong>开始舰队演习</strong>
            <small>弹药 ${ammoCost} · 维护件 ${maintenanceCost}</small>
          </button>
        </div>
        <div class="fleet-challenge-report">
          <span aria-hidden="true">⌁</span>
          <p>${command.lastReport}</p>
        </div>
        <div class="fleet-weekly-ranking">
          <div class="fleet-weekly-ranking-heading">
            <div><small>本周战术记录</small><strong>个人周榜</strong></div>
            <span>按综合评分排序 · 最多保留 ${FLEET_CHALLENGE_ATTEMPT_LIMIT} 次</span>
          </div>
          <div class="fleet-weekly-ranking-list">
            ${
              attempts.length
                ? attempts
                    .map(
                      (attempt, index) => `
                        <div class="${attempt.clear ? "clear" : "failed"}">
                          <b>${index + 1}</b>
                          <span>
                            <small>${
                              command.presets[attempt.preset]?.name || "方案"
                            }</small>
                            <strong>${
                              attempt.clear ? attempt.score : "未通关"
                            }</strong>
                          </span>
                          <span><small>时间</small><strong>${attempt.time.toFixed(
                            1,
                          )}s</strong></span>
                          <span><small>舰损</small><strong>${attempt.damage.toFixed(
                            1,
                          )}%</strong></span>
                          <span><small>效率</small><strong>${attempt.efficiency.toFixed(
                            1,
                          )}</strong></span>
                        </div>
                      `,
                    )
                    .join("")
                : "<p>本周还没有演习记录。三段词条各需要对应武器或阵型。</p>"
            }
          </div>
        </div>
      </section>
    `;
    const stateBadge = elements.fleetCommandDeck.querySelector(
      ".fleet-command-state",
    );
    if (stateBadge) {
      stateBadge.textContent = switchSeconds > 0
        ? `换防 ${switchSeconds} 秒`
        : "三舰队在线";
    }
    const activateButton = elements.fleetCommandDeck.querySelector(
      ".fleet-activate-button",
    );
    if (activateButton) {
      const title = activateButton.querySelector("strong");
      const detail = activateButton.querySelector("small");
      if (selectedIndex === command.activePreset) {
        title.textContent = "当前启用方案";
        detail.textContent = "无需重复换防";
      } else if (switchSeconds > 0) {
        title.textContent = `换防冷却 ${switchSeconds} 秒`;
        detail.textContent = "冷却结束后可切换";
      } else {
        title.textContent = "启用此方案";
        detail.textContent = `1 指挥数据 · ✦ ${formatNumber(switchCost)}`;
      }
    }
  }

  function renderBuildings() {
    elements.buildingList.textContent = "";
    BUILDINGS.forEach((building) => {
      const unlocked = state.lifetimeDust >= building.unlock;
      const owned = state.buildings[building.id] || 0;
      const purchase = selectedPurchase(building);
      const affordable =
        unlocked && purchase.amount > 0 && state.dust + 1e-9 >= purchase.cost;

      const card = document.createElement("article");
      card.className = `building-card${unlocked ? "" : " locked"}${
        affordable ? " affordable" : ""
      }`;

      const icon = document.createElement("span");
      icon.className = "building-icon";
      icon.textContent = unlocked ? building.icon : "×";
      card.appendChild(icon);

      if (!unlocked) {
        const copy = document.createElement("div");
        copy.className = "building-info";
        const titleRow = document.createElement("div");
        titleRow.className = "building-title-row";
        const title = document.createElement("h3");
        title.textContent = "未识别航站设施";
        titleRow.appendChild(title);
        const unlock = document.createElement("div");
        unlock.className = "unlock-copy";
        unlock.textContent = `累计采集 ${formatNumber(building.unlock)} 星尘后解锁`;
        copy.append(titleRow, unlock);
        card.appendChild(copy);
        elements.buildingList.appendChild(card);
        return;
      }

      const info = document.createElement("div");
      info.className = "building-info";
      const titleRow = document.createElement("div");
      titleRow.className = "building-title-row";
      const title = document.createElement("h3");
      title.textContent = building.name;
      const level = document.createElement("span");
      level.className = "level-pill";
      level.textContent = `数量 ${owned}`;
      titleRow.append(title, level);
      const description = document.createElement("p");
      description.textContent = building.description;
      const rate = document.createElement("div");
      rate.className = "building-rate";
      const actualRate = getBuildingRateBreakdown(
        building.id,
        state,
        true,
        purchase.amount,
      );
      const coordinationMultiplier = getBuildingCoordinationMultiplier(
        building.id,
      );
      rate.innerHTML = `<span>↟</span> 折算贡献 ${formatProductionRate(
        actualRate.total,
      )} / 秒 · 原始 ${formatProductionRate(actualRate.rawTotal)} / 秒${
        coordinationMultiplier > 1
          ? ` · 协同 ×${formatNumber(coordinationMultiplier, 2)}`
          : ""
      }`;
      const purchasePreview = document.createElement("div");
      purchasePreview.className = "building-purchase-preview";
      purchasePreview.textContent = purchase.amount > 0
        ? `购买预览 ${formatProductionRate(
            actualRate.currentRate,
          )} → ${formatProductionRate(
            actualRate.nextRate,
          )} / 秒 · 本次 +${formatProductionRate(
            actualRate.purchaseIncrease,
          )} / 秒`
        : "购买预览：当前星尘不足";
      info.append(titleRow, description, rate, purchasePreview);

      const button = document.createElement("button");
      button.className = "building-buy";
      button.type = "button";
      button.disabled = !affordable;
      button.dataset.buildingId = building.id;
      const amountLabel =
        state.buyMode === "max" ? `+${purchase.amount || 0}` : `+${state.buyMode}`;
      const buyLabel = document.createElement("strong");
      buyLabel.textContent = amountLabel;
      const costLabel = document.createElement("small");
      costLabel.textContent =
        purchase.amount > 0 ? `✦ ${formatNumber(purchase.cost)}` : "无法购买";
      button.append(buyLabel, costLabel);

      card.append(info, button);
      elements.buildingList.appendChild(card);
    });
  }

  function renderUpgrades() {
    elements.upgradeList.textContent = "";
    RESEARCH_BRANCHES.forEach((branch) => {
      const branchUpgrades = UPGRADES
        .filter((upgrade) => upgrade.branch === branch.id)
        .sort((left, right) => left.tier - right.tier);
      const completed = branchUpgrades.filter((upgrade) =>
        hasUpgrade(upgrade.id),
      ).length;
      const branchCard = document.createElement("section");
      branchCard.className = `research-branch research-branch-${branch.id}`;

      const branchHeading = document.createElement("header");
      branchHeading.className = "research-branch-heading";
      const branchIcon = document.createElement("span");
      branchIcon.textContent = branch.icon;
      const branchCopy = document.createElement("div");
      const branchTitle = document.createElement("h3");
      branchTitle.textContent = branch.name;
      const branchDescription = document.createElement("p");
      branchDescription.textContent = branch.description;
      branchCopy.append(branchTitle, branchDescription);
      const branchProgress = document.createElement("strong");
      branchProgress.textContent = `${completed} / ${branchUpgrades.length}`;
      branchHeading.append(branchIcon, branchCopy, branchProgress);

      const branchTrack = document.createElement("div");
      branchTrack.className = "research-track";
      branchUpgrades.forEach((upgrade) => {
        const bought = hasUpgrade(upgrade.id);
        const discovered = state.lifetimeDust >= upgrade.unlock;
        const pathAvailable = isUpgradePathAvailable(upgrade);
        const affordable = state.dust >= upgrade.cost;
        const requirements = getUpgradeRequirements(upgrade);
        const card = document.createElement("article");
        card.className = `upgrade-card${bought ? " bought" : ""}${
          discovered ? "" : " undiscovered"
        }${pathAvailable ? "" : " path-locked"}${
          !bought && discovered && pathAvailable && affordable ? " available" : ""
        }`;

        const icon = document.createElement("span");
        icon.className = "upgrade-icon";
        icon.textContent = discovered ? upgrade.icon : "?";

        const copy = document.createElement("div");
        copy.className = "upgrade-copy";
        const titleRow = document.createElement("div");
        titleRow.className = "upgrade-title-row";
        const title = document.createElement("h3");
        title.textContent = discovered ? upgrade.name : "加密研究";
        const tier = document.createElement("span");
        tier.className = "upgrade-tier";
        tier.textContent = `T${upgrade.tier}`;
        titleRow.append(title, tier);
        const description = document.createElement("p");
        description.textContent = discovered
          ? upgrade.description
          : `累计获得 ${formatNumber(upgrade.unlock)} 星尘后解密`;
        const prerequisite = document.createElement("small");
        prerequisite.className = `upgrade-prerequisite${
          pathAvailable ? " ready" : ""
        }`;
        prerequisite.textContent = requirements.length
          ? `前置：${requirements.map((entry) => entry.name).join("、")}`
          : "分支起点";
        const impact = document.createElement("small");
        impact.className = "upgrade-impact";
        if (bought) {
          impact.textContent = "已接入当前航站系统";
        } else if (!discovered) {
          impact.textContent = "收益数据尚未解密";
        } else {
          const preview = getUpgradeImpact(upgrade);
          impact.textContent = preview.kind === "click"
            ? `收益预览 ${formatNumber(preview.before)} → ${formatNumber(
                preview.after,
              )} / 次（+${formatNumber(preview.increase)}）`
            : `收益预览 ${formatProductionRate(
                preview.before,
              )} → ${formatProductionRate(
                preview.after,
              )} / 秒（+${formatProductionRate(preview.increase)}）`;
        }
        copy.append(titleRow, description, prerequisite, impact);

        const button = document.createElement("button");
        button.className = "upgrade-buy";
        button.type = "button";
        button.dataset.upgradeId = upgrade.id;
        button.disabled = bought || !discovered || !pathAvailable || !affordable;
        button.textContent = bought
          ? "已接入"
          : !discovered
            ? "待解密"
            : !pathAvailable
              ? "需前置"
              : `✦ ${formatNumber(upgrade.cost)}`;

        card.append(icon, copy, button);
        branchTrack.appendChild(card);
      });
      branchCard.append(branchHeading, branchTrack);
      elements.upgradeList.appendChild(branchCard);
    });
    const completedResearch = UPGRADES.filter((upgrade) =>
      hasUpgrade(upgrade.id),
    ).length;
    const availableResearch = UPGRADES.filter((upgrade) =>
      !hasUpgrade(upgrade.id)
      && state.lifetimeDust >= upgrade.unlock
      && isUpgradePathAvailable(upgrade)
      && state.dust >= upgrade.cost,
    ).length;
    elements.researchCount.textContent = `${completedResearch} / ${UPGRADES.length}`;
    elements.researchAvailable.textContent = String(availableResearch);
    elements.researchOutput.textContent = `${formatProductionRate(
      calculateRate(state, false),
    )} / 秒`;
  }

  function renderAchievements() {
    elements.achievementList.textContent = "";
    ACHIEVEMENTS.forEach((achievement) => {
      const earned = state.achievements.includes(achievement.id);
      const card = document.createElement("article");
      card.className = `achievement-card${earned ? " earned" : ""}`;
      const icon = document.createElement("span");
      icon.className = "achievement-icon";
      icon.textContent = earned ? achievement.icon : "·";
      const copy = document.createElement("div");
      copy.className = "achievement-copy";
      const title = document.createElement("h3");
      title.textContent = earned ? achievement.name : "未解锁成就";
      const description = document.createElement("p");
      description.textContent = achievement.description;
      const reward = document.createElement("span");
      reward.className = "achievement-reward";
      reward.textContent = earned ? "已生效 · 全产量 +2%" : "奖励 · 全产量 +2%";
      copy.append(title, description, reward);
      card.append(icon, copy);
      elements.achievementList.appendChild(card);
    });
  }

  function renderCoreShop() {
    const totalCores = getHistoricalCores();
    elements.coreShopBalance.textContent = formatNumber(state.cores, 0);
    elements.totalCoresEarned.textContent = formatNumber(totalCores, 0);
    elements.coreYieldMultiplier.textContent = `×${getCoreGainMultiplier().toFixed(2)}`;
    elements.offlineCap.textContent = `${Math.round(
      getMaxOfflineSeconds() / 3600,
    )}小时`;

    elements.coreShopList.textContent = "";
    CORE_SHOP_ITEMS.forEach((item) => {
      const rank = getCoreShopRank(item.id);
      const maxed = rank >= item.maxRank;
      const cost = getCoreShopCost(item);
      const card = document.createElement("article");
      card.className = `core-shop-item${maxed ? " maxed" : ""}`;

      const icon = document.createElement("span");
      icon.className = "core-shop-icon";
      icon.textContent = item.icon;

      const copy = document.createElement("div");
      copy.className = "core-shop-copy";
      const titleRow = document.createElement("div");
      titleRow.className = "core-shop-title-row";
      const title = document.createElement("strong");
      title.textContent = item.name;
      const rankLabel = document.createElement("span");
      rankLabel.className = "core-rank";
      rankLabel.textContent = `${rank} / ${item.maxRank}`;
      titleRow.append(title, rankLabel);
      const description = document.createElement("p");
      description.textContent = item.description;
      copy.append(titleRow, description);

      const button = document.createElement("button");
      button.className = "core-shop-buy";
      button.type = "button";
      button.dataset.coreShopId = item.id;
      button.disabled = maxed || state.cores < cost;
      button.textContent = maxed ? "已满级" : `✣ ${formatNumber(cost, 0)}`;

      card.append(icon, copy, button);
      elements.coreShopList.appendChild(card);
    });

    elements.coreMilestoneList.textContent = "";
    CORE_MILESTONES.forEach((milestone) => {
      const unlocked = totalCores >= milestone.threshold;
      const card = document.createElement("article");
      card.className = `core-milestone${unlocked ? " unlocked" : ""}`;
      const threshold = document.createElement("strong");
      threshold.textContent = `✣ ${milestone.threshold}`;
      const title = document.createElement("span");
      title.textContent = milestone.name;
      const description = document.createElement("small");
      description.textContent = unlocked
        ? `${milestone.description} · 已生效`
        : milestone.description;
      card.append(threshold, title, description);
      elements.coreMilestoneList.appendChild(card);
    });
  }

  function renderCrescentSecret() {
    const available = isCrescentMissionAvailable();
    const unlocked = available && state.crescentSecret.unlocked;
    const completed = unlocked && state.crescentSecret.completed;

    elements.crescentSignal.hidden =
      !available || state.crescentSecret.unlocked;
    elements.crescentMission.hidden = !unlocked;
    if (!unlocked) return;

    elements.crescentClickProgress.textContent =
      `${state.crescentSecret.manualClicks} / ${CRESCENT_MISSION_GOALS.manualClicks}`;
    elements.crescentSkirmishProgress.textContent =
      `${state.crescentSecret.skirmishWins} / ${CRESCENT_MISSION_GOALS.skirmishWins}`;
    elements.crescentStarportProgress.textContent =
      `${state.crescentSecret.starportUpgrades} / ${CRESCENT_MISSION_GOALS.starportUpgrades}`;
    elements.crescentMissionStatus.textContent = completed
      ? "来信已解锁"
      : "信号同步中";
    elements.crescentMission.classList.toggle("completed", completed);
    elements.crescentLetterButton.hidden = !completed;
    if (completed) {
      const label = elements.crescentLetterButton.querySelector("span");
      const detail = elements.crescentLetterButton.querySelector("small");
      label.textContent = state.crescentSecret.letterRead
        ? "再次阅读私人来信"
        : "读取私人来信";
      detail.textContent = state.crescentSecret.letterRead
        ? "已解密 · 可随时重读"
        : "发件人 · 新月";
    }
  }

  function renderEndgame() {
    const unlocked = isEndgameUnlocked();
    const historicalCores = getHistoricalCores();
    const unlockProgress = clamp(
      historicalCores / ENDGAME_UNLOCK_CORES,
      0,
      1,
    );
    elements.singularityShards.textContent = formatNumber(
      state.endgame.shards,
      0,
    );
    elements.transcendLocked.hidden = unlocked;
    elements.transcendContent.hidden = !unlocked;
    renderCrescentSecret();
    elements.transcendUnlockBar.style.width = `${unlockProgress * 100}%`;
    elements.transcendUnlockLabel.textContent = `${formatNumber(
      historicalCores,
      0,
    )} / ${formatNumber(ENDGAME_UNLOCK_CORES, 0)} 历史星核`;
    if (!unlocked) return;

    elements.totalSingularityShards.textContent = formatNumber(
      state.endgame.totalShards,
      0,
    );
    elements.transcendCount.textContent = formatNumber(
      state.endgame.transcensions,
      0,
    );
    elements.sectorLevel.textContent = formatNumber(
      state.endgame.sectorLevel,
      0,
    );
    elements.transcendProductionBoost.textContent = `×${formatNumber(
      getEndgameProductionMultiplier(),
    )}`;
    elements.transcendCoreBoost.textContent = `星核 ×${formatNumber(
      getEndgameCoreMultiplier(),
    )}`;

    const objective = getSectorObjective();
    const progress = clamp(
      objective.current / Math.max(1, objective.target),
      0,
      1,
    );
    elements.sectorTitle.textContent = objective.title;
    elements.sectorType.textContent = objective.type;
    elements.sectorDescription.textContent = objective.description;
    elements.sectorProgress.textContent = formatNumber(
      objective.current,
      0,
    );
    elements.sectorTarget.textContent = formatNumber(
      objective.target,
      0,
    );
    elements.sectorProgressBar.style.width = `${progress * 100}%`;
    elements.sectorReward.textContent = `+${formatNumber(
      objective.reward,
      0,
    )} 奇点碎片`;
    elements.sectorClaimButton.disabled =
      objective.current < objective.target;

    const collapseGain = getTranscendGain();
    elements.collapseCurrentCores.textContent = formatNumber(
      historicalCores,
      0,
    );
    elements.collapseGain.textContent = `+${formatNumber(
      collapseGain,
      0,
    )} ∞`;
    const companions = getSingularityCompanions();
    const latestCompanion = companions[companions.length - 1] || null;
    const nextCompanion = getNextSingularityCompanion();
    elements.singularityCompanionIcon.textContent = latestCompanion
      ? latestCompanion.icon
      : "·";
    elements.singularityCompanionName.textContent = latestCompanion
      ? latestCompanion.name
      : "尚未唤醒伴星";
    elements.singularityCompanionDescription.textContent = latestCompanion
      ? `${latestCompanion.description} · 图鉴 ${companions.length}/${SINGULARITY_COMPANIONS.length}`
      : "首次坍缩会带回一只纯观赏伴星。";
    elements.collapseButton.disabled = collapseGain < 1;
    elements.collapseButton.querySelector("small").textContent =
      collapseGain > 0
        ? nextCompanion
          ? `${formatNumber(collapseGain, 0)} 枚碎片 · 唤醒${nextCompanion.name}`
          : `${formatNumber(collapseGain, 0)} 枚碎片 · 伴星图鉴完整`
        : `${formatNumber(ENDGAME_UNLOCK_CORES, 0)} 历史星核起步`;

    elements.transcendProtocolList.textContent = "";
    ENDGAME_PROTOCOLS.forEach((protocol) => {
      const rank = getEndgameProtocolRank(protocol.id);
      const maxed = rank >= protocol.maxRank;
      const cost = getEndgameProtocolCost(protocol);
      const card = document.createElement("article");
      card.className = `transcend-protocol${maxed ? " maxed" : ""}`;

      const icon = document.createElement("span");
      icon.className = "protocol-icon";
      icon.textContent = protocol.icon;

      const copy = document.createElement("div");
      copy.className = "protocol-copy";
      const titleRow = document.createElement("div");
      titleRow.className = "protocol-title-row";
      const title = document.createElement("strong");
      title.textContent = protocol.name;
      const rankLabel = document.createElement("span");
      rankLabel.className = "protocol-rank";
      rankLabel.textContent = `${rank} / ${protocol.maxRank}`;
      titleRow.append(title, rankLabel);
      const description = document.createElement("p");
      description.textContent = protocol.description;
      copy.append(titleRow, description);

      const button = document.createElement("button");
      button.className = "protocol-buy";
      button.type = "button";
      button.dataset.protocolId = protocol.id;
      button.disabled = maxed || state.endgame.shards < cost;
      button.textContent = maxed
        ? "已满级"
        : `∞ ${formatNumber(cost, 0)}`;

      card.append(icon, copy, button);
      elements.transcendProtocolList.appendChild(card);
    });
  }

  function renderMaterialWallet(container, compact = false) {
    if (!container) return;
    container.textContent = "";
    STARPORT_MATERIALS.forEach((material) => {
      const item = document.createElement("div");
      item.className = `material-chip${compact ? " compact" : ""}`;
      const icon = document.createElement("span");
      icon.className = `material-icon material-${material.id}`;
      icon.textContent = material.icon;
      const copy = document.createElement("span");
      const name = document.createElement("small");
      name.textContent = material.name;
      const amount = document.createElement("strong");
      amount.textContent = formatNumber(
        state.starport.materials[material.id] || 0,
        0,
      );
      copy.append(name, amount);
      item.append(icon, copy);
      container.appendChild(item);
    });
  }

  function renderStarport() {
    renderMaterialWallet(elements.starportMaterialList);
    if (!elements.starportSlotMap) return;
    elements.starportSlotMap.textContent = "";
    STARPORT_MODULES.forEach((module) => {
      const rank = getStarportRank(module.id);
      const unlocked = state.lifetimeDust >= module.unlock;
      const maxed = rank >= module.maxRank;
      const cost = getStarportModuleCost(module);
      const affordable = canAffordStarportModule(module);
      const card = document.createElement("article");
      card.className = [
        "starport-slot",
        `slot-${module.position}`,
        rank > 0 ? "online" : "",
        unlocked ? "" : "locked",
      ]
        .filter(Boolean)
        .join(" ");

      const line = document.createElement("span");
      line.className = "starport-callout-line";
      line.setAttribute("aria-hidden", "true");
      line.appendChild(document.createElement("i"));

      const heading = document.createElement("div");
      heading.className = "starport-slot-heading";
      const icon = document.createElement("span");
      icon.className = "starport-slot-icon";
      icon.textContent = unlocked ? module.icon : "?";
      const titleCopy = document.createElement("span");
      const category = document.createElement("small");
      category.textContent = `${module.category}附属建筑`;
      const title = document.createElement("strong");
      title.textContent = unlocked ? module.name : "未开放栏位";
      titleCopy.append(category, title);
      const rankLabel = document.createElement("b");
      rankLabel.textContent = unlocked ? `${rank} / ${module.maxRank}` : "锁定";
      heading.append(icon, titleCopy, rankLabel);

      const description = document.createElement("p");
      description.textContent = unlocked
        ? module.description
        : `累计获得 ${formatNumber(module.unlock, 0)} 星尘后开放`;

      const footer = document.createElement("div");
      footer.className = "starport-slot-footer";
      const effect = document.createElement("span");
      const currentEffect = describeStarportModuleEffect(module, rank);
      effect.textContent = maxed
        ? currentEffect
        : `${currentEffect} → ${describeStarportModuleEffect(module, rank + 1)}`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starportModule = module.id;
      button.disabled = !unlocked || maxed || !affordable;
      if (!unlocked) {
        button.textContent = "未开放";
      } else if (maxed) {
        button.textContent = "已满级";
      } else {
        button.textContent = `${rank === 0 ? "建造" : "强化"} · ${describeStarportCost(cost)}`;
      }
      footer.append(effect, button);
      card.append(line, heading, description, footer);
      elements.starportSlotMap.appendChild(card);
    });

    const totalRank = getTotalStarportRanks();
    elements.starportRankTotal.textContent = `${totalRank} / ${STARPORT_MODULES.reduce(
      (total, module) => total + module.maxRank,
      0,
    )}`;
    elements.starportProductionBoost.textContent = `×${formatNumber(
      getStarportProductionMultiplier(),
      2,
    )}`;
    elements.starportCostEfficiency.textContent = `-${formatNumber(
      (1 - getStarportBuildingCostMultiplier()) * 100,
      1,
    )}%`;
    elements.starportAttackBoost.textContent = `×${formatNumber(
      getStarportAttackMultiplier(),
      2,
    )}`;
    elements.starportDefenseBoost.textContent = `×${formatNumber(
      getStarportDefenseMultiplier(),
      2,
    )}`;
    elements.starportLootBoost.textContent = `×${formatNumber(
      getStarportLootMultiplier(),
      2,
    )}`;
  }

  function renderSkirmishTargets() {
    elements.skirmishTargetList.textContent = "";
    const cooldownActive =
      state.combat.skirmishCooldownUntil > Date.now();
    SKIRMISH_TARGETS.forEach((target) => {
      const unlocked = state.lifetimeDust >= target.unlock;
      const stats = getSkirmishStats(target);
      const card = document.createElement("article");
      card.className = `skirmish-target${unlocked ? "" : " locked"}`;

      const icon = document.createElement("span");
      icon.className = "skirmish-icon";
      icon.textContent = unlocked ? target.icon : "?";

      const copy = document.createElement("div");
      copy.className = "skirmish-copy";
      const title = document.createElement("strong");
      title.textContent = unlocked ? target.name : "未识别近域信号";
      const detail = document.createElement("small");
      if (unlocked) {
        detail.textContent = `战力 ${formatNumber(stats.power)} · 胜率 ${Math.round(
          stats.chance * 100,
        )}% · 星尘约 ${formatNumber(stats.reward)}`;
        const loot = document.createElement("small");
        const preview = {};
        Object.entries(target.drops).forEach(([materialId, range]) => {
          preview[materialId] =
            range[0] === range[1]
              ? range[0]
              : `${range[0]}–${range[1]}`;
        });
        const lootParts = STARPORT_MATERIALS.flatMap((material) => {
          const amount = preview[material.id];
          return amount !== undefined
            ? [`${material.icon}${material.shortName} ${amount}`]
            : [];
        });
        loot.textContent = `${target.location} · 掉落 ${lootParts.join(" · ")}`;
        copy.append(title, detail, loot);
      } else {
        detail.textContent = `累计获得 ${formatNumber(target.unlock)} 星尘后解锁`;
        copy.append(title, detail);
      }

      const button = document.createElement("button");
      button.className = "skirmish-attack";
      button.type = "button";
      button.dataset.skirmishId = target.id;
      button.disabled = !unlocked || cooldownActive;
      button.textContent = unlocked
        ? cooldownActive
          ? "整备中"
          : "清剿"
        : "锁定";
      card.append(icon, copy, button);
      elements.skirmishTargetList.appendChild(card);
    });
  }

  function renderCombatTargets() {
    renderMaterialWallet(elements.combatMaterialList, true);
    renderSkirmishTargets();
    elements.planetTargetList.textContent = "";
    const cooldownActive = state.combat.attackCooldownUntil > Date.now();
    PLANET_TARGETS.forEach((target) => {
      const unlocked = state.lifetimeDust >= target.unlock;
      const stats = getPlanetStats(target);
      const card = document.createElement("article");
      card.className = `planet-target${unlocked ? "" : " locked"}`;

      const icon = document.createElement("span");
      icon.className = "planet-icon";
      icon.textContent = unlocked ? target.icon : "?";

      const copy = document.createElement("div");
      copy.className = "planet-copy";
      const title = document.createElement("strong");
      title.textContent = unlocked ? target.name : "未识别行星生命";
      const detail = document.createElement("small");
      if (unlocked) {
        detail.textContent = `战力 ${formatNumber(stats.power)} · 胜率 ${Math.round(
          stats.chance * 100,
        )}% · `;
        const reward = document.createElement("em");
        reward.textContent = `回收约 ${formatNumber(stats.reward)}`;
        detail.appendChild(reward);
        const history = document.createElement("small");
        history.textContent = `${target.location} · 已击退 ${stats.victories} 次`;
        copy.append(title, detail, history);
      } else {
        detail.textContent = `累计获得 ${formatNumber(target.unlock)} 星尘后解锁`;
        copy.append(title, detail);
      }

      const button = document.createElement("button");
      button.className = "planet-attack";
      button.type = "button";
      button.dataset.planetId = target.id;
      button.disabled = !unlocked || cooldownActive;
      button.textContent = unlocked ? (cooldownActive ? "整备中" : "出击") : "锁定";

      card.append(icon, copy, button);
      elements.planetTargetList.appendChild(card);
    });
  }

  function formatMissionProgress(template, value) {
    if (template.format === "duration") return formatDuration(value);
    return formatNumber(value, template.format === "count" ? 0 : undefined);
  }

  function describeMission(template, kind, target) {
    const targetText = formatMissionProgress(template, target);
    const descriptions = {
      dustEarned: `累计回收 ${targetText} 星尘`,
      manualClicks: `执行 ${targetText} 次手动回收`,
      playSeconds: `保持航站在线 ${targetText}`,
      eventsClaimed: `处理 ${targetText} 次雷达事件`,
      dustSpent: `向航站系统投入 ${targetText} 星尘`,
      unitsBought: `建造 ${targetText} 个自动化单元`,
      researchCompleted: `完成 ${targetText} 项研究`,
      battlesWon: `赢得 ${targetText} 场战斗`,
      materialsCollected: `回收 ${targetText} 份星港材料`,
      starportUpgrades: `完成 ${targetText} 次星港建设或强化`,
      combatUpgrades: `完成 ${targetText} 次攻防强化`,
      raidsDefended: `成功防卫 ${targetText} 次袭击`,
      expeditionRoutes: `突破 ${targetText} 个远征航段`,
      expeditionsCompleted: `完成 ${targetText} 次五航段远征`,
      prestiges: `完成 ${targetText} 次深空跃迁`,
      transcensions: `完成 ${targetText} 次奇点超越`,
      dailyClaims: `领取 ${targetText} 项每日委托`,
    };
    return descriptions[template.metric] ||
      `推进 ${targetText} 点${kind === "weekly" ? "每周" : "每日"}目标`;
  }

  function formatMissionCountdown(milliseconds, includeDays = false) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainder = seconds % 60;
    const time = [hours, minutes, remainder]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
    return includeDays ? `${days}天 ${time}` : time;
  }

  function renderMissionList(kind, container) {
    const period = kind === "weekly" ? state.missions.weekly : state.missions.daily;
    container.textContent = "";
    period.items.forEach((item, index) => {
      const template = getMissionTemplate(item.templateId);
      if (!template) return;
      const completed = item.progress >= item.target;
      const card = document.createElement("article");
      card.className = `mission-card${completed ? " completed" : ""}${
        item.claimed ? " claimed" : ""
      }`;

      const icon = document.createElement("span");
      icon.className = "mission-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = template.icon;

      const copy = document.createElement("div");
      copy.className = "mission-card-copy";
      const title = document.createElement("strong");
      title.textContent = template.title;
      const detail = document.createElement("small");
      detail.textContent = `${describeMission(template, kind, item.target)} · ${formatMissionProgress(
        template,
        item.progress,
      )} / ${formatMissionProgress(template, item.target)}`;
      const track = document.createElement("div");
      track.className = "mission-progress-track";
      const fill = document.createElement("span");
      fill.style.width = `${clamp(item.progress / item.target, 0, 1) * 100}%`;
      track.appendChild(fill);
      copy.append(title, detail, track);

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.missionClaim = String(index);
      button.dataset.missionKind = kind;
      button.disabled = !completed || item.claimed;
      button.textContent = item.claimed
        ? "已领取"
        : completed
          ? kind === "weekly" ? "领取 12" : "领取 5"
          : "进行中";
      button.setAttribute(
        "aria-label",
        `${item.claimed ? "已领取" : "领取"}${template.title}奖励`,
      );
      card.append(icon, copy, button);
      container.appendChild(card);
    });
  }

  function renderExpedition() {
    applyExpeditionSkin();
    ensureExpeditionRunChoices();
    const unlocked = state.lifetimeDust >= EXPEDITION_UNLOCK_DUST;
    const run = state.expedition.activeRun;
    const materialTotal = getTotalStarportMaterials();
    const entryDustCost = getExpeditionEntryDustCost();

    elements.expeditionSupplyBalance.textContent = formatNumber(
      state.expedition.supplies,
      0,
    );
    elements.expeditionFragmentBalance.textContent = formatNumber(
      state.expedition.fragments,
      0,
    );
    elements.expeditionLocked.hidden = unlocked;
    elements.expeditionIdle.hidden = !unlocked || Boolean(run);
    elements.expeditionLoadout.hidden = !unlocked;
    elements.expeditionLoadout.classList.toggle("locked", Boolean(run));
    elements.expeditionActive.hidden = !unlocked || !run;
    elements.expeditionUnlockProgress.style.width = `${clamp(
      state.lifetimeDust / EXPEDITION_UNLOCK_DUST,
      0,
      1,
    ) * 100}%`;
    elements.expeditionUnlockLabel.textContent = `${formatNumber(
      Math.min(state.lifetimeDust, EXPEDITION_UNLOCK_DUST),
    )} / ${formatNumber(EXPEDITION_UNLOCK_DUST)}`;

    elements.expeditionStartDustCost.textContent =
      `星尘 ${formatNumber(entryDustCost)}`;
    elements.expeditionStartMaterialCost.textContent =
      `材料 ${formatNumber(Math.min(materialTotal, 6), 0)} / 6`;
    elements.startExpeditionButton.disabled =
      !unlocked ||
      Boolean(run) ||
      state.dust < entryDustCost ||
      state.expedition.supplies < 1 ||
      materialTotal < 6 ||
      getExpeditionPresetGearIds().length !== EXPEDITION_GEAR_SLOT_LIMIT;
    elements.expeditionCompletedRuns.textContent = formatNumber(
      state.expedition.completedRuns,
      0,
    );
    elements.expeditionFailedRuns.textContent = formatNumber(
      state.expedition.failedRuns,
      0,
    );

    const presetGear = getExpeditionPresetGearIds();
    elements.expeditionLoadoutCount.textContent =
      `${presetGear.length} / ${EXPEDITION_GEAR_SLOT_LIMIT}`;
    elements.expeditionLoadoutStatus.textContent = run
      ? "本次远征已锁定舰装，返航后可调整"
      : presetGear.length === EXPEDITION_GEAR_SLOT_LIMIT
        ? "方案完整，可随时启航"
        : `还需要安装 ${EXPEDITION_GEAR_SLOT_LIMIT - presetGear.length} 件舰装`;
    elements.expeditionPresetButtons
      .querySelectorAll("[data-expedition-preset]")
      .forEach((button) => {
        const active = Number(button.dataset.expeditionPreset) ===
          state.expedition.activePreset;
        button.classList.toggle("active", active);
        button.disabled = Boolean(run);
      });
    elements.expeditionGearGrid.textContent = "";
    EXPEDITION_GEAR.forEach((gear) => {
      const unlockedGear = state.expedition.unlockedGear.includes(gear.id);
      const selected = presetGear.includes(gear.id);
      const boss = getExpeditionBoss(gear.bossId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `expedition-gear-card${selected ? " selected" : ""}${unlockedGear ? "" : " locked"}`;
      button.dataset.expeditionGear = gear.id;
      button.disabled = Boolean(run) || !unlockedGear;
      const icon = document.createElement("span");
      icon.textContent = unlockedGear ? gear.icon : "?";
      const copy = document.createElement("span");
      const category = document.createElement("small");
      category.textContent = unlockedGear
        ? gear.category
        : `击破${boss?.name || "机制首领"}解锁`;
      const name = document.createElement("strong");
      name.textContent = unlockedGear ? gear.name : "未解析蓝图";
      const detail = document.createElement("small");
      detail.textContent = unlockedGear ? gear.description : "首领专属舰装";
      copy.append(category, name, detail);
      const status = document.createElement("i");
      status.textContent = selected ? "已安装" : unlockedGear ? "可安装" : "锁定";
      button.append(icon, copy, status);
      elements.expeditionGearGrid.appendChild(button);
    });

    if (run) {
      elements.expeditionSectorLabel.textContent =
        `航段 ${run.depth + 1} / ${EXPEDITION_ROUTE_COUNT}`;
      elements.expeditionHullValue.textContent = `${run.hull} / ${run.maxHull}`;
      elements.expeditionHullBar.style.width = `${clamp(
        run.hull / run.maxHull,
        0,
        1,
      ) * 100}%`;
      elements.expeditionHullBar.dataset.state =
        run.hull <= 30 ? "critical" : run.hull <= 60 ? "warning" : "stable";
      elements.expeditionCargo.textContent =
        `本局补给 ${run.runSupplies} · 残片 ${run.runFragments} · 锁定战力 ${formatNumber(
          run.commandPower,
          0,
        )}`;
      elements.expeditionReportText.textContent = state.expedition.lastReport;

      elements.expeditionBoonList.textContent = "";
      if (!run.boons.length) {
        const empty = document.createElement("span");
        empty.textContent = "尚未装载";
        elements.expeditionBoonList.appendChild(empty);
      } else {
        run.boons.forEach((boonId) => {
          const boon = getExpeditionBoon(boonId);
          if (!boon) return;
          const chip = document.createElement("span");
          chip.title = boon.description;
          chip.textContent = `${boon.icon} ${boon.name}`;
          elements.expeditionBoonList.appendChild(chip);
        });
      }

      elements.expeditionActiveGear.textContent = "";
      getExpeditionRunGearIds(run).forEach((gearId) => {
        const gear = getExpeditionGear(gearId);
        if (!gear) return;
        const chip = document.createElement("span");
        chip.title = gear.description;
        chip.textContent = `${gear.icon} ${gear.name}`;
        elements.expeditionActiveGear.appendChild(chip);
      });

      const choosingBoon = run.status === "boon";
      const choosingBoss = run.status === "boss";
      elements.expeditionChoiceEyebrow.textContent = choosingBoon
        ? "临时协议"
        : choosingBoss
          ? "机制首领"
          : "星图分岔";
      elements.expeditionChoiceTitle.textContent = choosingBoon
        ? "选择一项本局强化"
        : choosingBoss
          ? "选择本阶段战术"
          : "选择下一条航线";
      elements.expeditionChoiceDescription.textContent = choosingBoon
        ? "协议只在本次远征中生效，优先选择能够反制敌方词条的方案。"
        : choosingBoss
          ? "首领共有两个阶段；舰装反制、战术风险与船体状态共同决定结果。"
          : "成功率、船体损伤和战利品均已预估；也可消耗补给重新扫描。";
      elements.expeditionBoonChoices.hidden = !choosingBoon;
      elements.expeditionRouteChoices.hidden = choosingBoon || choosingBoss;
      elements.expeditionBossEncounter.hidden = !choosingBoss;
      elements.expeditionBoonChoices.textContent = "";
      elements.expeditionRouteChoices.textContent = "";

      if (choosingBoon) {
        run.boonChoices.forEach((boonId) => {
          const boon = getExpeditionBoon(boonId);
          if (!boon) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "expedition-boon-card";
          button.dataset.expeditionBoon = boon.id;
          const icon = document.createElement("span");
          icon.textContent = boon.icon;
          const copy = document.createElement("span");
          const name = document.createElement("strong");
          name.textContent = boon.name;
          const detail = document.createElement("small");
          detail.textContent = boon.description;
          copy.append(name, detail);
          button.append(icon, copy);
          elements.expeditionBoonChoices.appendChild(button);
        });
      } else if (!choosingBoss) {
        run.routeChoices.forEach((route) => {
          const routeType = getExpeditionRouteType(route.typeId);
          const chance = getExpeditionSuccessChance(route);
          const counteredCount = route.affixIds.filter((affixId) => {
            const affix = getExpeditionAffix(affixId);
            return affix && hasExpeditionEffect(affix.counter);
          }).length;
          const button = document.createElement("button");
          button.type = "button";
          button.className = `expedition-route-card route-${routeType.id}`;
          button.dataset.expeditionRoute = route.id;

          const heading = document.createElement("span");
          heading.className = "expedition-route-heading";
          const icon = document.createElement("span");
          icon.textContent = routeType.icon;
          const title = document.createElement("span");
          const name = document.createElement("strong");
          name.textContent = routeType.name;
          const description = document.createElement("small");
          description.textContent = routeType.description;
          title.append(name, description);
          heading.append(icon, title);

          const affixes = document.createElement("span");
          affixes.className = "expedition-affixes";
          if (!route.affixIds.length) {
            const safe = document.createElement("i");
            safe.textContent = "无敌方词条";
            affixes.appendChild(safe);
          } else {
            route.affixIds.forEach((affixId) => {
              const affix = getExpeditionAffix(affixId);
              const countered = hasExpeditionEffect(affix.counter);
              const tag = document.createElement("i");
              tag.classList.toggle("countered", countered);
              tag.title = affix.description;
              tag.textContent = `${affix.icon} ${affix.name}${countered ? " · 已反制" : ""}`;
              affixes.appendChild(tag);
            });
          }

          const stats = document.createElement("span");
          stats.className = "expedition-route-stats";
          stats.innerHTML = routeType.powerFactor <= 0
            ? `<strong>安全航线</strong><small>修复 ${routeType.repair} 船体 · 残片 +${routeType.fragments}</small>`
            : `<strong>${Math.round(chance * 100)}% 成功率</strong><small>敌方 ${formatNumber(
                route.enemyPower,
                0,
              )} · 补给 +${routeType.supplies} · 残片 +${routeType.fragments}</small>`;
          if (counteredCount > 0) stats.classList.add("countered");
          button.append(heading, affixes, stats);
          elements.expeditionRouteChoices.appendChild(button);
        });
      }

      elements.expeditionBossTactics.textContent = "";
      if (choosingBoss) {
        const boss = getExpeditionBoss(run.boss?.id);
        if (boss) {
          const weakness = hasExpeditionBossWeakness(boss, run);
          elements.expeditionBossIcon.textContent = boss.icon;
          elements.expeditionBossName.textContent = boss.name;
          elements.expeditionBossDescription.textContent = boss.description;
          elements.expeditionBossPhase.textContent =
            `阶段 ${run.boss.phase + 1} / 2`;
          elements.expeditionBossCounter.textContent = weakness
            ? "已携带弱点舰装：压制战术将获得额外成功率"
            : "未携带弱点舰装：首领成功率降低且部分机制会追加伤害";
          elements.expeditionBossCounter.dataset.state = weakness
            ? "countered"
            : "danger";
          EXPEDITION_BOSS_TACTICS.forEach((tactic) => {
            const preview = getExpeditionBossTacticPreview(tactic.id);
            const button = document.createElement("button");
            button.type = "button";
            button.className = `expedition-boss-tactic tactic-${tactic.id}`;
            button.dataset.expeditionBossTactic = tactic.id;
            const icon = document.createElement("span");
            icon.textContent = tactic.icon;
            const copy = document.createElement("span");
            const name = document.createElement("strong");
            name.textContent = tactic.name;
            const detail = document.createElement("small");
            detail.textContent = tactic.description;
            const stats = document.createElement("i");
            stats.textContent = `${Math.round(preview.chance * 100)}% 成功率 · 成功损伤 ${preview.successDamage} · 失利损伤 ${preview.failureDamage}`;
            copy.append(name, detail, stats);
            button.append(icon, copy);
            elements.expeditionBossTactics.appendChild(button);
          });
        }
      }

      elements.expeditionRerollButton.hidden = choosingBoon || choosingBoss;
      elements.expeditionRepairButton.hidden = choosingBoon || choosingBoss;
      elements.expeditionRerollButton.disabled = getAvailableExpeditionSupplies() < 1;
      elements.expeditionRepairButton.disabled =
        run.hull >= run.maxHull || getAvailableExpeditionSupplies() < 2;
      elements.expeditionPath.textContent = "";
      run.path.forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        elements.expeditionPath.appendChild(item);
      });
    }

    const totalBossWins = getTotalBossWins();
    elements.expeditionBossTotalWins.textContent = `${formatNumber(totalBossWins, 0)} 次击破`;
    elements.expeditionBossGrid.textContent = "";
    EXPEDITION_BOSSES.forEach((boss) => {
      const wins = state.expedition.bossWins[boss.id] || 0;
      const unlockedCount = boss.blueprints.filter((gearId) =>
        state.expedition.unlockedGear.includes(gearId),
      ).length;
      const card = document.createElement("article");
      card.className = `expedition-boss-card${wins > 0 ? " defeated" : ""}`;
      const icon = document.createElement("span");
      icon.textContent = wins > 0 ? boss.icon : "?";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = wins > 0 ? boss.name : "未解析首领信号";
      const detail = document.createElement("small");
      detail.textContent = wins > 0
        ? `${boss.description} · 蓝图 ${unlockedCount}/${boss.blueprints.length}`
        : "抵达第五航段后可能遭遇。";
      copy.append(name, detail);
      const record = document.createElement("i");
      record.textContent = wins > 0 ? `击破 ${wins}` : "未击破";
      card.append(icon, copy, record);
      elements.expeditionBossGrid.appendChild(card);
    });

    elements.expeditionCollectionCount.textContent =
      `${state.expedition.artifacts.length} / ${EXPEDITION_ARTIFACTS.length}`;
    elements.expeditionArtifactGrid.textContent = "";
    EXPEDITION_ARTIFACTS.forEach((artifact) => {
      const collected = state.expedition.artifacts.includes(artifact.id);
      const card = document.createElement("article");
      card.className = `expedition-artifact${collected ? " collected" : " locked"}`;
      const icon = document.createElement("span");
      icon.textContent = collected ? artifact.icon : "?";
      const name = document.createElement("strong");
      name.textContent = collected ? artifact.name : "未发现遗物";
      const lore = document.createElement("small");
      lore.textContent = collected ? artifact.lore : "完成一次完整远征后随机发现。";
      card.append(icon, name, lore);
      elements.expeditionArtifactGrid.appendChild(card);
    });

    elements.expeditionSkinGrid.textContent = "";
    EXPEDITION_SKINS.forEach((skin) => {
      const unlockedSkin = state.expedition.unlockedSkins.includes(skin.id);
      const active = state.expedition.activeSkin === skin.id;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `expedition-skin${active ? " active" : ""}`;
      button.dataset.expeditionSkin = skin.id;
      button.style.setProperty("--skin-color", skin.color);
      const swatch = document.createElement("span");
      swatch.setAttribute("aria-hidden", "true");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = skin.name;
      const status = document.createElement("small");
      status.textContent = active
        ? "使用中"
        : unlockedSkin
          ? "点击装备"
          : `${skin.cost} 星图残片`;
      copy.append(name, status);
      button.append(swatch, copy);
      elements.expeditionSkinGrid.appendChild(button);
    });
  }

  function updateMissionSummary() {
    ensureMissionPeriods();
    const completed = getCompletedMissionCount(state.missions.daily);
    const claimable = getMissionClaimableCount();
    elements.commandMissionStatus.textContent = claimable > 0
      ? `可领取 ${claimable} 项`
      : `今日 ${Math.min(completed, 3)} / 3`;
    elements.missionsNavigationBadge.textContent = String(claimable);
    elements.missionsNavigationBadge.hidden = claimable < 1;
  }

  function renderMissions() {
    ensureMissionPeriods();
    const now = Date.now();
    const dailyCompleted = getCompletedMissionCount(state.missions.daily);
    const weeklyCompleted = getCompletedMissionCount(state.missions.weekly);
    elements.missionTokenBalance.textContent = formatNumber(
      state.missions.tokens,
      0,
    );
    elements.dailyResetCountdown.textContent =
      `距离刷新 ${formatMissionCountdown(getNextDailyReset(now) - now)}`;
    elements.weeklyResetCountdown.textContent =
      `距离刷新 ${formatMissionCountdown(getNextWeeklyReset(now) - now, true)}`;
    elements.dailyRerollButton.disabled = state.missions.daily.rerollsUsed >= 1;
    elements.dailyRerollButton.textContent = state.missions.daily.rerollsUsed >= 1
      ? "今日已重签"
      : "免费重签一项";
    renderMissionList("daily", elements.dailyMissionList);
    renderMissionList("weekly", elements.weeklyMissionList);

    elements.dailyBonusProgress.textContent = `完成 ${Math.min(
      dailyCompleted,
      3,
    )} / 3`;
    elements.dailyBonusButton.disabled =
      dailyCompleted < 3 || state.missions.daily.completionClaimed;
    elements.dailyBonusButton.textContent = state.missions.daily.completionClaimed
      ? "今日已领取"
      : dailyCompleted >= 3
        ? "领取总奖励"
        : "尚未达成";

    elements.weeklyMilestoneList.textContent = "";
    WEEKLY_MISSION_MILESTONES.forEach((milestone, index) => {
      const claimed = state.missions.weekly.milestonesClaimed.includes(index);
      const reached = weeklyCompleted >= milestone.required;
      const card = document.createElement("article");
      card.className = `weekly-milestone${reached ? " completed" : ""}${
        claimed ? " claimed" : ""
      }`;
      const title = document.createElement("strong");
      title.textContent = `${milestone.required} 项里程碑`;
      const reward = document.createElement("span");
      reward.textContent = `+${milestone.tokens} 凭证 · ${milestone.dustMinutes} 分钟产量${
        milestone.materials > 0 ? ` · 每种材料 +${milestone.materials}` : ""
      }`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.weeklyMilestone = String(index);
      button.disabled = !reached || claimed;
      button.textContent = claimed
        ? "已领取"
        : reached
          ? "领取奖励"
          : `${weeklyCompleted} / ${milestone.required}`;
      card.append(title, reward, button);
      elements.weeklyMilestoneList.appendChild(card);
    });

    elements.missionStore.querySelectorAll("[data-mission-store]").forEach((button) => {
      const item = MISSION_STORE_ITEMS[button.dataset.missionStore];
      const lockedMaterial =
        button.dataset.missionStore === "materialCrate" &&
        state.lifetimeDust < COMBAT_UNLOCK_DUST;
      const noCombatCooldown =
        button.dataset.missionStore === "combatRefit" &&
        state.combat.attackCooldownUntil <= now &&
        state.combat.skirmishCooldownUntil <= now;
      const lockedExpeditionSupply =
        button.dataset.missionStore === "expeditionSupply" &&
        state.lifetimeDust < EXPEDITION_UNLOCK_DUST;
      button.disabled =
        !item ||
        state.missions.tokens < item.cost ||
        lockedMaterial ||
        noCombatCooldown ||
        lockedExpeditionSupply;
    });
    updateMissionSummary();
  }

  function formatStarfallCountdown(milliseconds) {
    const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days} 天 ${hours} 小时`;
    if (hours > 0) return `${hours} 小时 ${minutes} 分`;
    return `${minutes} 分 ${totalSeconds % 60} 秒`;
  }

  function formatStarfallDayLabel(key) {
    const date = new Date(`${key}T00:00:00Z`);
    return `${date.getUTCMonth() + 1} 月 ${date.getUTCDate()} 日`;
  }

  function applyStarfallCosmetics() {
    const cosmetics = state.starfall?.cosmetics || {};
    document.body.classList.toggle("starfall-beacon-unlocked", cosmetics.beacon === true);
    document.body.classList.toggle("starfall-starport-unlocked", cosmetics.starport === true);
    document.body.classList.toggle("starfall-backdrop-unlocked", cosmetics.backdrop === true);
  }

  function updateStarfallSummary(now = Date.now()) {
    const phase = getStarfallPhase(now);
    const participated = hasStarfallParticipation();
    const labels = {
      preview: "8 月 8 日开启",
      active: "限时观测中",
      exchange: "余辉兑换期",
      archived: "观测已归档",
    };
    const targets = {
      preview: STARFALL_EVENT_START,
      active: STARFALL_EVENT_END,
      exchange: STARFALL_EXCHANGE_END,
      archived: now,
    };
    const countdown = phase === "archived"
      ? "活动记录已永久保存"
      : `${phase === "preview" ? "距离开启" : phase === "active" ? "距离观测结束" : "距离兑换关闭"} ${formatStarfallCountdown(targets[phase] - now)}`;
    elements.starfallCommandCard.hidden = phase === "archived" && !participated;
    elements.starfallCommandPhase.textContent = labels[phase];
    elements.starfallCommandStatus.textContent = countdown;
    elements.starfallCommandCurrency.textContent = `余辉 ${formatNumber(state.starfall.currency, 0)}`;
    elements.starfallNavigationBadge.textContent = phase === "active"
      ? "限时"
      : phase === "preview"
        ? "预告"
        : phase === "exchange"
          ? "兑换"
          : "纪念";
  }

  function renderStarfallDays(now, phase) {
    elements.starfallDayList.textContent = "";
    if (phase !== "active") {
      const empty = document.createElement("article");
      empty.className = "starfall-empty-state";
      empty.innerHTML = phase === "preview"
        ? "<span>☄</span><div><strong>第一条星路将在 8 月 8 日出现</strong><p>活动开始后，每天从三种玩法中选择一种；晚到也能补做最近三天。</p></div>"
        : "<span>◇</span><div><strong>本次流星观测已经结束</strong><p>星路不再产生余辉，已获得的余辉仍可在兑换期内使用。</p></div>";
      elements.starfallDayList.appendChild(empty);
      return;
    }
    ensureStarfallDays(now);
    const availableKeys = getAvailableStarfallDayKeys(now);
    availableKeys.forEach((key, index) => {
      const record = state.starfall.dayRecords.find((entry) => entry.key === key);
      if (!record) return;
      const card = document.createElement("article");
      card.className = `starfall-day-card${record.claimed ? " claimed" : ""}`;
      const isToday = index === availableKeys.length - 1;
      const heading = document.createElement("header");
      heading.innerHTML = `<span><small>${isToday ? "今日星路" : "追赶星路"}</small><strong>${formatStarfallDayLabel(key)}</strong></span><b>${record.claimed ? "已抵达" : `+${STARFALL_DAILY_REWARD} 余辉`}</b>`;
      card.appendChild(heading);
      if (!record.selectedId) {
        const options = document.createElement("div");
        options.className = "starfall-route-options";
        record.optionIds.forEach((routeId) => {
          const route = getStarfallRoute(routeId);
          if (!route) return;
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.starfallRoute = route.id;
          button.dataset.starfallDay = key;
          button.innerHTML = `<span>${route.icon}</span><strong>${route.title}</strong><small>${route.description}</small><em>选择此星路</em>`;
          options.appendChild(button);
        });
        card.appendChild(options);
      } else {
        const route = getStarfallRoute(record.selectedId);
        const progress = document.createElement("div");
        progress.className = "starfall-route-progress";
        const ratio = record.target > 0 ? clamp(record.progress / record.target, 0, 1) : 0;
        progress.innerHTML = `<span class="starfall-route-icon">${route?.icon || "☄"}</span><div><small>已选择 · ${route?.title || "星路"}</small><strong>${formatMissionProgress(route || { format: "count" }, record.progress)} / ${formatMissionProgress(route || { format: "count" }, record.target)}</strong><div aria-hidden="true"><span style="width:${ratio * 100}%"></span></div></div>`;
        const claim = document.createElement("button");
        claim.type = "button";
        claim.dataset.starfallClaim = key;
        claim.disabled = record.claimed || record.progress < record.target;
        claim.textContent = record.claimed
          ? "已领取"
          : record.progress >= record.target
            ? "领取余辉"
            : "航行中";
        progress.appendChild(claim);
        card.appendChild(progress);
      }
      elements.starfallDayList.appendChild(card);
    });
  }

  function renderStarfallLetters(now, phase) {
    elements.starfallLetterList.textContent = "";
    STARFALL_LETTERS.forEach((letter, index) => {
      const unlockAt = getStarfallLetterUnlockAt(letter);
      const unlocked = now >= unlockAt && phase !== "preview";
      const selectedId = state.starfall.letterChoices[letter.id];
      const selectedChoice = letter.choices.find((choice) => choice.id === selectedId);
      const card = document.createElement("article");
      card.className = `starfall-letter${unlocked ? " unlocked" : " locked"}${selectedChoice ? " answered" : ""}`;
      const header = document.createElement("header");
      header.innerHTML = `<span>${index + 1}</span><div><small>${unlocked ? "信笺已抵达" : `${formatStarfallDayLabel(getUtcDailyKey(unlockAt))} 解锁`}</small><strong>${unlocked ? letter.title : "未抵达的星光"}</strong></div>`;
      card.appendChild(header);
      if (unlocked) {
        const body = document.createElement("p");
        body.textContent = letter.body;
        card.appendChild(body);
        if (selectedChoice) {
          const result = document.createElement("blockquote");
          result.innerHTML = `<strong>${selectedChoice.label}</strong><span>${selectedChoice.result}</span>`;
          card.appendChild(result);
        } else {
          const choices = document.createElement("div");
          choices.className = "starfall-letter-choices";
          letter.choices.forEach((choice) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.starfallLetter = letter.id;
            button.dataset.starfallChoice = choice.id;
            button.disabled = phase === "archived";
            button.textContent = choice.label;
            choices.appendChild(button);
          });
          card.appendChild(choices);
        }
      }
      elements.starfallLetterList.appendChild(card);
    });
  }

  function renderStarfallMilestones(phase) {
    elements.starfallMilestoneList.textContent = "";
    STARFALL_MILESTONES.forEach((milestone) => {
      const claimed = state.starfall.claimedMilestones.includes(milestone.id);
      const reached = state.starfall.totalEarned >= milestone.required;
      const card = document.createElement("article");
      card.className = `${reached ? "reached" : ""}${claimed ? " claimed" : ""}`;
      card.innerHTML = `<span>✦</span><div><small>${formatNumber(milestone.required, 0)} 累计余辉</small><strong>${milestone.title}</strong><p>${milestone.reward}</p></div>`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starfallMilestone = milestone.id;
      button.disabled = !reached || claimed || phase === "preview" || phase === "archived";
      button.textContent = claimed ? "已领取" : reached ? "领取" : `${formatNumber(state.starfall.totalEarned, 0)} / ${formatNumber(milestone.required, 0)}`;
      card.appendChild(button);
      elements.starfallMilestoneList.appendChild(card);
    });
  }

  function renderStarfallStore(phase) {
    elements.starfallStoreGrid.textContent = "";
    STARFALL_STORE_ITEMS.forEach((item) => {
      const bought = clampGameCount(state.starfall.purchases[item.id]);
      const soldOut = item.limit > 0 && bought >= item.limit;
      const card = document.createElement("article");
      card.innerHTML = `<span>${item.id === "emblem" ? "◇" : item.id === "postcard" ? "✉" : "✦"}</span><div><small>${item.limit ? "限定兑换" : "可重复兑换"}</small><strong>${item.title}</strong><p>${item.description}</p></div><b>${item.cost} 余辉</b>`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starfallStore = item.id;
      button.disabled = soldOut || state.starfall.currency < item.cost || !["active", "exchange"].includes(phase);
      button.textContent = soldOut ? "已拥有" : "兑换";
      card.appendChild(button);
      elements.starfallStoreGrid.appendChild(card);
    });
  }

  function renderStarfallCollection() {
    const collection = [
      ["title", "等一场星雨", "限定称号"],
      ["beacon", "流星尾迹", "信标外观"],
      ["letter", "英仙星笺", "纪念收藏"],
      ["starport", "英仙夜航", "星港外观"],
      ["emblem", "双星愿签", "限定徽记"],
      ["postcard", "英仙纪念卡", "信笺纪念"],
      ["keepsake", "第八颗流星", "最终收藏"],
    ];
    elements.starfallCollectionGrid.innerHTML = collection.map(([id, name, type]) => {
      const unlocked = state.starfall.cosmetics[id] === true;
      return `<article class="${unlocked ? "unlocked" : "locked"}"><span>${unlocked ? "☄" : "◇"}</span><small>${type}</small><strong>${unlocked ? name : "尚未获得"}</strong></article>`;
    }).join("");
  }

  function renderStarfallEvent(now = Date.now()) {
    ensureStarfallDays(now);
    const phase = getStarfallPhase(now);
    const phaseLabels = {
      preview: "活动预告",
      active: "流星观测中",
      exchange: "余辉兑换期",
      archived: "星雨纪念档案",
    };
    const targetTime = phase === "preview"
      ? STARFALL_EVENT_START
      : phase === "active"
        ? STARFALL_EVENT_END
        : STARFALL_EXCHANGE_END;
    elements.starfallPhaseLabel.textContent = phaseLabels[phase];
    elements.starfallCountdown.textContent = phase === "archived"
      ? "活动与兑换均已结束"
      : `${phase === "preview" ? "距离开启" : phase === "active" ? "距离观测结束" : "距离兑换关闭"} ${formatStarfallCountdown(targetTime - now)}`;
    elements.starfallStatusNote.textContent = phase === "preview"
      ? "活动持续至 8 月 22 日，兑换开放至 9 月 22 日。"
      : phase === "active"
        ? "每天选一路；错过时可追赶最近三天。"
        : phase === "exchange"
          ? "不再获得余辉；信笺可继续阅读，余辉可继续兑换。"
          : "已获得的外观、信笺选择与收藏会永久保留。";
    elements.starfallCurrency.textContent = formatNumber(state.starfall.currency, 0);
    elements.starfallTotalEarned.textContent = formatNumber(state.starfall.totalEarned, 0);
    const letterCount = Object.keys(state.starfall.letterChoices).length;
    const milestoneCount = state.starfall.claimedMilestones.length;
    elements.starfallLetterCount.textContent = `${letterCount} / ${STARFALL_LETTERS.length}`;
    elements.starfallLetterSummary.textContent = `${letterCount} / ${STARFALL_LETTERS.length}`;
    elements.starfallMilestoneSummary.textContent = `${milestoneCount} / ${STARFALL_MILESTONES.length}`;
    renderStarfallDays(now, phase);
    renderStarfallLetters(now, phase);
    renderStarfallMilestones(phase);
    renderStarfallStore(phase);
    renderStarfallCollection();
    updateStarfallSummary(now);
  }

  function renderLog() {
    elements.activityLog.textContent = "";
    if (!state.log.length) {
      const item = document.createElement("li");
      item.textContent = "航行日志尚无记录。";
      elements.activityLog.appendChild(item);
      return;
    }
    state.log.forEach((entry) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = entry.text;
      const time = document.createElement("time");
      time.dateTime = new Date(entry.time).toISOString();
      time.textContent = new Date(entry.time).toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      item.append(text, time);
      elements.activityLog.appendChild(item);
    });
  }

  function renderLeaderboardSummary() {
    refreshCareerRecords();
    const currentPower = getCombinedPower();
    elements.leaderboardCareerDust.textContent = formatNumber(
      state.careerDust,
      0,
    );
    elements.leaderboardHighestPower.textContent = formatNumber(
      state.highestCombinedPower,
      0,
    );
    elements.leaderboardBattleCount.textContent = formatNumber(
      state.careerBattles,
      0,
    );
    elements.leaderboardExpeditionRuns.textContent = formatNumber(
      state.expedition.completedRuns,
      0,
    );
    elements.leaderboardBossVictories.textContent = formatNumber(
      getTotalBossWins(),
      0,
    );
    elements.leaderboardExpeditionArtifacts.textContent =
      `${state.expedition.artifacts.length} / ${EXPEDITION_ARTIFACTS.length}`;
    elements.leaderboardStarfallEarned.textContent = formatNumber(
      state.starfall.totalEarned,
      0,
    );
    elements.leaderboardStarfallRoutes.textContent =
      `${state.starfall.completedDays.length} / 15`;
    elements.leaderboardStarfallLetters.textContent =
      `${Object.keys(state.starfall.letterChoices).length} / ${STARFALL_LETTERS.length}`;
    elements.leaderboardCurrentPower.textContent =
      `当前综合战力 ${formatNumber(currentPower, 0)}`;
  }

  function isPrimaryPageUnlocked(pageId, targetState = state) {
    const hasStarportProgress =
      Object.values(targetState.starport?.materials || {}).some((value) => value > 0) ||
      Object.values(targetState.starport?.modules || {}).some((value) => value > 0);
    const rules = {
      command: true,
      fleet: true,
      research: targetState.lifetimeDust >= 60 || targetState.upgrades.length > 0,
      missions: targetState.lifetimeDust >= 120 || targetState.missions?.tokens > 0,
      combat: targetState.lifetimeDust >= COMBAT_UNLOCK_DUST || targetState.combat?.wins > 0,
      starport: targetState.lifetimeDust >= COMBAT_UNLOCK_DUST || hasStarportProgress,
      "core-shop": targetState.totalCores > 0 || targetState.rebirths > 0,
      expedition:
        targetState.lifetimeDust >= EXPEDITION_UNLOCK_DUST ||
        targetState.expedition?.completedRuns > 0,
      starfall:
        getStarfallPhase() !== "archived" || hasStarfallParticipation(targetState),
      transcend: isEndgameUnlocked(targetState),
      leaderboard: targetState.lifetimeDust >= 5000,
    };
    return rules[pageId] !== false;
  }

  function updateNavigationVisibility() {
    const compact = state.guidance.compactNavigation;
    document.querySelectorAll("#primary-navigation [role='tab']").forEach((tab) => {
      const unlocked = isPrimaryPageUnlocked(tab.dataset.page);
      tab.hidden = compact && !unlocked;
      tab.disabled = !compact && !unlocked;
      tab.classList.toggle("locked-navigation", !unlocked);
      tab.title = unlocked ? "" : "继续推进当前建议后解锁";
    });
    elements.navigationModeStatus.textContent = compact ? "渐进" : "完整";
    elements.navigationModeButton.classList.toggle("off", !compact);
    elements.navigationModeButton.setAttribute(
      "aria-label",
      compact ? "当前只显示已解锁功能，点击显示完整导航" : "当前显示全部功能，点击启用渐进导航",
    );
  }

  function getCommandRecommendation() {
    const units = getTotalUnits();
    if (units === 0 && state.dust < 15) {
      return {
        icon: "✦",
        title: "先回收 15 星尘",
        description: "点击中央信标，准备部署第一架自动回收无人机。",
        progress: state.dust / 15,
        action: "collect",
        label: "回收星尘",
      };
    }
    if (units === 0) {
      return {
        icon: "◎",
        title: "部署第一架无人机",
        description: "进入舰队购买拾荒无人机，之后星尘会自动增长。",
        progress: 1,
        action: "fleet",
        label: "前往舰队",
      };
    }
    if (state.lifetimeDust >= OPERATIONS_UNLOCK_DUST && state.operations.totalActions === 0) {
      return {
        icon: "▦",
        title: "安排第一项航站作业",
        description: "作业会在在线与离线时积累固定专精，并产出可直接使用的组件。",
        progress: state.operations.queue.length ? 0.5 : 0,
        action: "operations",
        label: "打开作业台",
      };
    }
    if (state.lifetimeDust >= 60 && state.upgrades.length === 0) {
      return {
        icon: "◒",
        title: "查看第一项研究",
        description: "研究会强化现有生产循环；未解锁的复杂系统会继续保持隐藏。",
        progress: 0,
        action: "research",
        label: "前往研究",
      };
    }
    if (state.lifetimeDust >= COMBAT_UNLOCK_DUST && state.combat.attackLevel + state.combat.defenseLevel === 0) {
      return {
        icon: "⬡",
        title: "完成首次边境整备",
        description: "强化一次攻击或防御，避免即将出现的袭击造成资源损失。",
        progress: 0,
        action: "combat",
        label: "前往战斗",
      };
    }
    if (getPrestigeGain() > 0) {
      return {
        icon: "✣",
        title: `可跃迁获得 ${formatNumber(getPrestigeGain(), 0)} 星核`,
        description: "跃迁会重建当前舰队，但带来永久星核增幅。",
        progress: 1,
        action: "prestige",
        label: "查看跃迁",
      };
    }
    if (
      state.lifetimeDust >= EXPEDITION_UNLOCK_DUST &&
      state.expedition.completedRuns + state.expedition.failedRuns === 0
    ) {
      return {
        icon: "▱",
        title: "准备首次星区远征",
        description: "远征奖励以收藏、外观和消耗材料为主，不会制造新的永久倍率膨胀。",
        progress: 0,
        action: "expedition",
        label: "前往远征",
      };
    }
    if (getMissionClaimableCount() > 0) {
      return {
        icon: "☷",
        title: "有航站委托可以领取",
        description: "领取已完成的日常或每周目标，补充现有系统所需物资。",
        progress: 1,
        action: "missions",
        label: "领取奖励",
      };
    }
    return {
      icon: "⌁",
      title: state.operations.queue.length ? "航站运行稳定" : "为作业台安排下一份订单",
      description: state.operations.queue.length
        ? "当前没有必须立刻处理的事项，可以离线等待自动生产与作业结算。"
        : "选择连续作业即可挂机；需要精确规划时再使用 30 分钟队列。",
      progress: state.operations.queue.length ? 1 : 0,
      action: state.lifetimeDust >= OPERATIONS_UNLOCK_DUST ? "operations" : "fleet",
      label: state.lifetimeDust >= OPERATIONS_UNLOCK_DUST ? "查看作业" : "继续扩建",
    };
  }

  function updateCommandGuide() {
    const guide = getCommandRecommendation();
    elements.commandGuideIcon.textContent = guide.icon;
    elements.commandGuideTitle.textContent = guide.title;
    elements.commandGuideDescription.textContent = guide.description;
    elements.commandGuideProgress.style.width = `${clamp(guide.progress, 0, 1) * 100}%`;
    elements.commandGuideAction.textContent = guide.label;
    elements.commandGuideAction.dataset.guideAction = guide.action;
  }

  function renderOperations() {
    const unlocked = state.lifetimeDust >= OPERATIONS_UNLOCK_DUST;
    const poolCap = getOperationsPoolCap();
    state.operations.engineeringPool = Math.min(poolCap, state.operations.engineeringPool);
    const poolRatio = getOperationsPoolRatio();
    const slots = getOperationsQueueSlots();
    elements.operationsLocked.hidden = unlocked;
    elements.operationsContent.hidden = !unlocked;
    elements.operationsSummaryStatus.textContent = unlocked
      ? `${state.operations.totalActions} 次作业 · 工程池 ${Math.floor(poolRatio * 100)}%`
      : `达到 ${formatNumber(OPERATIONS_UNLOCK_DUST)} 历史星尘后解锁`;
    elements.operationsQueueSummary.textContent = `队列 ${state.operations.queue.length} / ${slots}`;
    if (!unlocked) return;
    elements.operationsPoolValue.textContent = formatNumber(state.operations.engineeringPool, 1);
    elements.operationsPoolCap.textContent = formatNumber(poolCap, 0);
    elements.operationsPoolProgress.style.width = `${poolRatio * 100}%`;
    elements.operationsPoolEffect.textContent =
      poolRatio >= 0.95
        ? "已激活：速度 +5%、队列 +1、专精经验 +10%、组件偶尔加倍"
        : poolRatio >= 0.75
          ? "已激活：速度 +5%、队列 +1、专精经验 +10% · 下一档 95%"
          : poolRatio >= 0.5
            ? "已激活：速度 +5%、队列 +1 · 下一档 75%"
            : poolRatio >= 0.25
              ? "已激活：全部作业速度 +5% · 下一档 50% 解锁队列"
              : "达到 25%：全部作业速度 +5%";
    elements.operationsQueue.innerHTML = state.operations.queue.length
      ? state.operations.queue.map((order, index) => {
          const job = OPERATIONS_JOBS.find((entry) => entry.id === order.jobId);
          return `<article><span>${index + 1}</span><strong>${job?.icon || "▦"} ${job?.name || "未知作业"}</strong><small>${order.remaining === null ? "连续运行" : `剩余 ${formatDuration(order.remaining)}`}</small></article>`;
        }).join("")
      : '<p class="operations-empty">队列为空。选择连续作业即可安心挂机。</p>';
    elements.operationsJobList.innerHTML = OPERATIONS_JOBS.map((job) => {
      const jobUnlocked = state.lifetimeDust >= job.unlock;
      const jobState = state.operations.jobs[job.id];
      const level = getOperationMasteryLevel(job.id);
      const currentFloor = level > 0 ? 15 * level ** 2 : 0;
      const nextTarget = level >= OPERATIONS_MAX_MASTERY
        ? currentFloor
        : getOperationMasteryTarget(level);
      const masteryProgress = level >= OPERATIONS_MAX_MASTERY
        ? 1
        : (jobState.xp - currentFloor) / Math.max(1, nextTarget - currentFloor);
      const missing = Math.max(0, nextTarget - jobState.xp);
      return `<article class="operation-job ${jobUnlocked ? "" : "locked"}">
        <span class="operation-job-icon">${job.icon}</span>
        <div class="operation-job-copy">
          <div><strong>${job.name}</strong><small>专精 ${level} / ${OPERATIONS_MAX_MASTERY}</small></div>
          <p>${job.description}</p>
          <small>${job.input} · ${job.output}</small>
          <div class="operation-mastery"><span style="width:${clamp(masteryProgress, 0, 1) * 100}%"></span></div>
          <em>${jobUnlocked ? `${getOperationInterval(job).toFixed(1)} 秒 / 次 · 已完成 ${jobState.actions}` : `历史星尘 ${formatNumber(job.unlock)} 解锁`}</em>
        </div>
        <div class="operation-job-actions">
          <button type="button" data-operation-continuous="${job.id}" ${jobUnlocked ? "" : "disabled"}>连续</button>
          <button type="button" data-operation-queue="${job.id}" ${jobUnlocked ? "" : "disabled"}>排队 30 分</button>
          <button type="button" class="secondary-button" data-operation-inject="${job.id}" ${jobUnlocked && level < OPERATIONS_MAX_MASTERY && state.operations.engineeringPool >= missing ? "" : "disabled"}>工程池升级</button>
        </div>
      </article>`;
    }).join("");
    elements.operationsComponentList.innerHTML = OPERATION_COMPONENTS.map((component) => {
      const amount = state.operations.components[component.id] || 0;
      return `<article><span>${component.icon}</span><div><strong>${component.name}</strong><small>${component.use}</small></div><b>×${formatNumber(amount, 0)}</b><button type="button" data-operation-component="${component.id}" ${amount > 0 ? "" : "disabled"}>投入</button></article>`;
    }).join("");
    elements.operationsReport.textContent = state.operations.lastReport;
    elements.operationsStopButton.disabled = state.operations.queue.length === 0;
  }

  function renderActivePageDetails(pageId = state.activePage) {
    switch (pageId) {
      case "fleet":
        renderBuildings();
        renderFleetCommand();
        break;
      case "starport":
        renderStarport();
        break;
      case "research": {
        const selectedResearchTab = document.querySelector(
          ".research-panel .tabs [aria-selected='true']",
        )?.id;
        if (selectedResearchTab === "achievements-tab") renderAchievements();
        else if (selectedResearchTab === "log-tab") renderLog();
        else renderUpgrades();
        break;
      }
      case "core-shop":
        renderCoreShop();
        break;
      case "combat":
        renderCombatTargets();
        break;
      case "expedition":
        renderExpedition();
        break;
      case "starfall":
        renderStarfallEvent();
        break;
      case "missions":
        renderMissions();
        break;
      case "transcend":
        renderEndgame();
        break;
      case "leaderboard":
        renderLeaderboardSummary();
        break;
      case "command":
        renderOperations();
        break;
      default:
        break;
    }
  }

  function renderAll() {
    applyExpeditionSkin();
    applyStarfallCosmetics();
    renderActivePageDetails();
    updateBuyModeButtons();
    updatePerformanceControls();
    updateNavigationVisibility();
    updateUi();
  }

  function getCloudSaveMetadata(targetState = state) {
    return {
      playerName: normalizePlayerName(targetState.playerName) || "未命名指挥官",
      playTime: clampGameNumber(targetState.playTime),
      lifetimeDust: clampGameNumber(targetState.lifetimeDust),
      cores: clampGameNumber(targetState.cores),
      totalCores: clampGameNumber(targetState.totalCores),
      rebirths: clampGameCount(targetState.rebirths),
      transcensions: clampGameCount(targetState.endgame?.transcensions),
      lastSeen: finiteTimestamp(targetState.lastSeen),
    };
  }

  function getLeaderboardEntry() {
    refreshCareerRecords();
    return {
      playerName: normalizePlayerName(state.playerName) || "未命名指挥官",
      careerDust: clampGameNumber(state.careerDust),
      highestPower: clampGameNumber(state.highestCombinedPower),
      battleCount: clampGameCount(state.careerBattles),
      transcensions: clampGameCount(state.endgame?.transcensions),
      expeditionRuns: clampGameCount(state.expedition?.completedRuns),
      expeditionBossWins: clampGameCount(getTotalBossWins()),
      expeditionArtifacts: Math.min(
        EXPEDITION_ARTIFACTS.length,
        clampGameCount(state.expedition?.artifacts?.length),
      ),
      starfallTotalEarned: Math.min(
        STARFALL_CURRENCY_CAP,
        clampGameCount(state.starfall?.totalEarned),
      ),
      starfallRoutes: Math.min(15, clampGameCount(state.starfall?.completedDays?.length)),
      starfallLetters: Math.min(
        STARFALL_LETTERS.length,
        clampGameCount(Object.keys(state.starfall?.letterChoices || {}).length),
      ),
    };
  }

  function createCloudSaveSnapshot() {
    const snapshot = JSON.parse(JSON.stringify(state));
    snapshot.lastSeen = Date.now();
    return snapshot;
  }

  function applyCloudSaveSnapshot(rawSnapshot) {
    const nextState = sanitizeState(rawSnapshot);
    const cloudSavedAt = nextState.lastSeen;
    state = nextState;
    ensureMissionPeriods();
    ensureExpeditionRunChoices();
    grantInactiveEarnings(cloudSavedAt, "none");
    syncBgmState();
    saveGame(false, { forceBackup: true });
    renderAll();
    activatePrimaryPage(state.activePage, { persist: false });
    showToast("云端存档已载入", "本地航站已切换到所选的云端记录。", "☁");
    if (!state.playerName) {
      window.setTimeout(() => openNameDialog(true), 250);
    }
    return getCloudSaveMetadata();
  }

  function updateGoal() {
    const nextBuilding = BUILDINGS.find(
      (building) => state.lifetimeDust < building.unlock,
    );
    if (nextBuilding) {
      const previousUnlock =
        BUILDINGS[Math.max(0, BUILDINGS.indexOf(nextBuilding) - 1)]?.unlock || 0;
      const range = Math.max(1, nextBuilding.unlock - previousUnlock);
      const progress = clamp((state.lifetimeDust - previousUnlock) / range, 0, 1);
      elements.goalTitle.textContent = `解锁${nextBuilding.name}`;
      elements.goalLabel.textContent = `${formatNumber(state.lifetimeDust)} / ${formatNumber(
        nextBuilding.unlock,
      )}`;
      elements.goalProgress.style.width = `${progress * 100}%`;
      return;
    }
    if (isEndgameUnlocked()) {
      const objective = getSectorObjective();
      elements.goalTitle.textContent = `${objective.title} · ${objective.type}`;
      elements.goalLabel.textContent = `${formatNumber(
        objective.current,
        0,
      )} / ${formatNumber(objective.target, 0)}`;
      elements.goalProgress.style.width = `${clamp(
        objective.current / Math.max(1, objective.target),
        0,
        1,
      ) * 100}%`;
      return;
    }
    const gain = getPrestigeGain();
    const nextCoreTarget = Math.min(
      DUST_RESERVE_CAP,
      Math.max(
        PRESTIGE_BASE_DUST,
        getCoreTargetForGain(gain + 1),
      ),
    );
    elements.goalTitle.textContent = "提炼下一枚星核";
    elements.goalLabel.textContent = `${formatNumber(state.runDust)} / ${formatNumber(
      nextCoreTarget,
    )}`;
    elements.goalProgress.style.width = `${clamp(
      state.runDust / nextCoreTarget,
      0,
      1,
    ) * 100}%`;
  }

  function updateEvent() {
    const now = Date.now();
    if (state.event) {
      const event = EVENTS.find((entry) => entry.id === state.event.id);
      const remaining = Math.max(0, Math.ceil((state.event.expires - now) / 1000));
      elements.eventCard.classList.add("active");
      elements.eventTitle.textContent = event.title;
      elements.eventDescription.textContent = event.description;
      elements.eventButton.disabled = false;
      elements.eventButton.querySelector("span").textContent = event.action;
      elements.eventCountdown.textContent = `${remaining} 秒后消失`;
      return;
    }

    const remaining = Math.max(0, Math.ceil((state.nextEventAt - now) / 1000));
    elements.eventCard.classList.remove("active");
    elements.eventTitle.textContent = state.buff
      ? state.buff.id === "surge"
        ? "恒星风暴增幅生效"
        : "精确回收增幅生效"
      : "正在扫描航道";
    if (state.buff) {
      const buffRemaining = Math.max(0, Math.ceil((state.buff.expires - now) / 1000));
      elements.eventDescription.textContent =
        state.buff.id === "surge"
          ? `全部自动产量 ×2，剩余 ${buffRemaining} 秒。`
          : `手动回收产量 ×5，剩余 ${buffRemaining} 秒。`;
    } else {
      elements.eventDescription.textContent = "偶尔会发现漂流物资或短暂的能量涌流。";
    }
    elements.eventButton.disabled = true;
    elements.eventButton.querySelector("span").textContent = "扫描中";
    const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
    const seconds = String(remaining % 60).padStart(2, "0");
    elements.eventCountdown.textContent = `${minutes}:${seconds}`;
  }

  function updateCombatUi() {
    const attackPower = getCombatPower();
    const defensePower = getDefensePower();
    const attackCost = getCombatUpgradeCost("attack");
    const defenseCost = getCombatUpgradeCost("defense");
    elements.combatWins.textContent = formatNumber(state.combat.wins, 0);
    elements.combatLosses.textContent = formatNumber(state.combat.losses, 0);
    elements.combatPower.textContent = formatNumber(attackPower, 0);
    elements.defensePower.textContent = formatNumber(defensePower, 0);
    elements.attackLevel.textContent = `武器等级 ${state.combat.attackLevel}`;
    elements.defenseLevel.textContent = `防御等级 ${state.combat.defenseLevel}`;
    elements.attackUpgradeCost.textContent = `✦ ${formatNumber(attackCost)}`;
    elements.defenseUpgradeCost.textContent = `✦ ${formatNumber(defenseCost)}`;
    elements.attackUpgradeButton.disabled = state.dust < attackCost;
    elements.defenseUpgradeButton.disabled = state.dust < defenseCost;
    elements.combatReportText.textContent = state.combat.lastReport;

    const cooldownSeconds = Math.max(
      0,
      Math.ceil((state.combat.attackCooldownUntil - Date.now()) / 1000),
    );
    elements.attackCooldown.textContent =
      cooldownSeconds > 0 ? `整备 ${cooldownSeconds}秒` : "舰队就绪";
    const skirmishCooldownSeconds = Math.max(
      0,
      Math.ceil(
        (state.combat.skirmishCooldownUntil - Date.now()) / 1000,
      ),
    );
    elements.skirmishCooldown.textContent =
      skirmishCooldownSeconds > 0
        ? `整备 ${skirmishCooldownSeconds}秒`
        : "清剿小队就绪";

    const now = Date.now();
    const raid = state.combat.incomingRaid;
    if (raid) {
      const major = raid.type === "major";
      const raider = getRaidRaider(raid);
      const remainingMs = Math.max(0, raid.arrivesAt - now);
      const totalMs = Math.max(1, raid.arrivesAt - raid.startedAt);
      const progress = clamp(1 - remainingMs / totalMs, 0, 1);
      const seconds = Math.ceil(remainingMs / 1000);
      elements.raidMonitor.classList.add("incoming");
      elements.raidMonitor.classList.toggle("major", major);
      elements.raidState.textContent = major ? "大袭击警报" : "随机遭遇";
      elements.raidName.textContent = `${raider.icon} ${raider.name}`;
      elements.raidDescription.textContent = `敌方战力 ${formatNumber(
        raid.power,
      )}，基地防御 ${formatNumber(defensePower)}。${
        major
          ? "这是每小时一次的主力进攻。"
          : "这是随机出现的小规模袭击。"
      }强化防御仍可改变战果。`;
      elements.raidCountdownLabel.textContent = "距离接触";
      elements.raidCountdownValue.textContent = `${seconds}秒`;
      elements.raidProgressBar.style.width = `${progress * 100}%`;
    } else {
      elements.raidMonitor.classList.remove("incoming");
      elements.raidMonitor.classList.remove("major");
      elements.raidState.textContent =
        state.lifetimeDust >= COMBAT_UNLOCK_DUST ? "随机巡逻" : "未解锁";
      elements.raidName.textContent =
        state.lifetimeDust >= COMBAT_UNLOCK_DUST
          ? "边境防卫周期运行中"
          : "边境雷达尚未激活";
      if (state.lifetimeDust >= COMBAT_UNLOCK_DUST) {
        const seconds = Math.max(
          0,
          Math.ceil((state.combat.nextMajorRaidAt - now) / 1000),
        );
        const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
        const secondsText = String(seconds % 60).padStart(2, "0");
        elements.raidDescription.textContent =
          "小规模袭击会在随机时间出现；大袭击每小时一次，离线期间同样结算。";
        elements.raidCountdownLabel.textContent = "下次大袭击信号";
        elements.raidCountdownValue.textContent = `${minutesText}:${secondsText}`;
        elements.raidProgressBar.style.width = `${clamp(
          1 - seconds * 1000 / MAJOR_RAID_INTERVAL,
          0,
          1,
        ) * 100}%`;
      } else {
        elements.raidDescription.textContent = `累计采集 ${formatNumber(
          COMBAT_UNLOCK_DUST,
        )} 星尘后，敌对舰队可能袭击基地。`;
        elements.raidCountdownLabel.textContent = "防卫系统待命";
        elements.raidCountdownValue.textContent = "--:--";
        elements.raidProgressBar.style.width = "0%";
      }
    }
  }

  function updateUi(rateOverride = null) {
    const rate = Number.isFinite(rateOverride) ? rateOverride : calculateRate();

    updatePlayerNameDisplay();
    elements.dust.textContent = formatDustReserve(state.dust);
    elements.rate.textContent = `${formatProductionRate(rate)} / 秒`;
    elements.cores.textContent = formatNumber(state.cores, 0);
    updateEvent();
    updateMissionSummary();
    updateStarfallSummary();
    updateNavigationVisibility();

    if (state.activePage === "command") {
      renderCommandCompanions();
      const clickValue = getClickValue();
      const gain = getPrestigeGain();
      const units = getTotalUnits();
      elements.clickYield.textContent = `每次 +${formatNumber(clickValue)}`;
      elements.permanentBoost.textContent = `×${formatNumber(
        safeMultiply(
          getCoreMultiplier(),
          getEndgameProductionMultiplier(),
        ),
      )}`;
      elements.achievementBoost.textContent = `×${getAchievementMultiplier().toFixed(2)}`;
      elements.runDust.textContent = formatNumber(state.runDust);
      elements.commandUnitCount.textContent = formatNumber(units, 0);
      elements.commandCombatPower.textContent = formatNumber(getCombatPower(), 0);
      elements.commandDefensePower.textContent = formatNumber(getDefensePower(), 0);
      const commandRaidMetric = elements.commandRaidStatus.closest(
        ".command-raid-metric",
      );
      if (state.combat.incomingRaid) {
        const seconds = Math.max(
          0,
          Math.ceil((state.combat.incomingRaid.arrivesAt - Date.now()) / 1000),
        );
        const major = state.combat.incomingRaid.type === "major";
        elements.commandRaidStatus.textContent = `${
          major ? "大袭击" : "遭遇"
        } · ${seconds}秒`;
        commandRaidMetric.classList.add("alert");
        commandRaidMetric.classList.toggle("major-alert", major);
      } else if (state.lifetimeDust >= COMBAT_UNLOCK_DUST) {
        const seconds = Math.max(
          0,
          Math.ceil((state.combat.nextMajorRaidAt - Date.now()) / 1000),
        );
        const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
        const secondsText = String(seconds % 60).padStart(2, "0");
        elements.commandRaidStatus.textContent = `大袭击 ${minutesText}:${secondsText}`;
        commandRaidMetric.classList.remove("alert", "major-alert");
      } else {
        elements.commandRaidStatus.textContent = "尚未解锁";
        commandRaidMetric.classList.remove("alert", "major-alert");
      }
      elements.prestigeButton.disabled = gain < 1;
      elements.prestigeGain.textContent = `+${formatNumber(gain, 0)} 星核`;
      if (gain > 0) {
        const projectedState = {
          ...state,
          totalCores: state.totalCores + gain,
        };
        elements.prestigeDescription.textContent = `现在跃迁可获得 ${formatNumber(
          gain,
          0,
        )} 枚可用星核；历史增幅将提升至 ×${formatNumber(getCoreMultiplier(
          projectedState,
        ))}。`;
      } else {
        const remaining = Math.max(0, PRESTIGE_BASE_DUST - state.runDust);
        elements.prestigeDescription.textContent = `还需 ${formatNumber(
          remaining,
        )} 星尘即可获得第 1 枚星核。`;
      }
      updateGoal();
      updateCommandGuide();
    } else if (state.activePage === "fleet") {
      const units = getTotalUnits();
      elements.unitCount.textContent = formatNumber(units, 0);
      elements.reconstructionCost.textContent = `×${safeMultiply(
        getReconstructionCostMultiplier(),
        getStarportBuildingCostMultiplier(),
      ).toFixed(2)}`;
      elements.fleetFlavor.textContent =
        units === 0
          ? "轨道十分安静，等待你的第一道指令。"
          : rate < 100
            ? "近地回收网络运转正常。"
            : rate < 10000
              ? "舰队的航迹正照亮整片轨道。"
              : rate < 10000000
                ? "星环拆解与深空回收网络正在协同运行。"
                : rate < 10000000000
                  ? "裂隙捕获网正从空间潮汐中持续回收物资。"
                  : "视界矿场与宇宙弦织取机已接管终极回收链。";
    } else if (state.activePage === "research") {
      elements.lifetimeDust.textContent = formatNumber(state.lifetimeDust);
      elements.lifetimeClicks.textContent = formatNumber(state.lifetimeClicks, 0);
      elements.rebirthCount.textContent = formatNumber(state.rebirths, 0);
      elements.playTime.textContent = formatDuration(state.playTime);
    } else if (state.activePage === "combat") {
      updateCombatUi();
    }

    elements.soundButton.querySelector("span").textContent = state.sound ? "♪" : "×";
    elements.soundButton.setAttribute("aria-label", state.sound ? "关闭音效" : "开启音效");
    updateBgmControls();
    updatePerformanceControls();
  }

  function updateBuyModeButtons() {
    document.querySelectorAll("[data-buy-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.buyMode === state.buyMode);
    });
  }

  function exportSave() {
    saveGame();
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `星港拾荒者-存档-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
    showToast("存档已导出", "JSON 存档文件已保存到下载目录。", "↓");
  }

  function importSave(file) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const imported = JSON.parse(String(reader.result));
        const nextState = sanitizeState(imported);
        showModal({
          eyebrow: "导入存档",
          icon: "↑",
          title: "覆盖当前航站记录？",
          message: `检测到 ${formatNumber(nextState.lifetimeDust)} 总星尘、${formatNumber(
            nextState.cores,
            0,
          )} 枚可用星核、${formatNumber(
            nextState.totalCores,
            0,
          )} 枚历史星核。导入后会覆盖当前进度。`,
          confirmText: "确认导入",
          cancelText: "取消",
          onConfirm: () => {
            state = nextState;
            state.lastSeen = Date.now();
            syncBgmState();
            saveGame(false, { forceBackup: true });
            renderAll();
            activatePrimaryPage(state.activePage, { persist: false });
            showToast("导入成功", "航站记录已恢复。", "✓");
            if (!state.playerName) {
              window.setTimeout(() => openNameDialog(true), 250);
            }
          },
        });
      } catch (error) {
        showToast("导入失败", "文件不是有效的《星港拾荒者》存档。", "!");
      }
      elements.importFile.value = "";
    });
    reader.readAsText(file);
  }

  function resetGame() {
    showModal({
      eyebrow: "危险操作",
      icon: "!",
      title: "清空全部航站记录？",
      message: "这个操作会删除星尘、舰队、研究、成就和星核，且无法撤销。若已登录，清空后的记录会在下一次云同步时覆盖云端存档。建议先导出存档。",
      confirmText: "彻底清空",
      cancelText: "保留进度",
      onConfirm: () => {
        localStorage.removeItem(SAVE_KEY);
        SAVE_BACKUP_KEYS.forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem(SAVE_BACKUP_META_KEY);
        state = freshState();
        syncBgmState();
        renderAll();
        activatePrimaryPage("command", { persist: false });
        saveGame();
        window.dispatchEvent(new Event("stellar-career-reset"));
        showToast("新航线已建立", "全部进度已清空。", "✦");
        window.setTimeout(() => openNameDialog(true), 280);
      },
    });
  }

  function activatePrimaryPage(
    pageId,
    { focus = false, persist = true, scroll = false } = {},
  ) {
    const requestedPage = PRIMARY_PAGES.includes(pageId) ? pageId : "command";
    const safePage = isPrimaryPageUnlocked(requestedPage) ? requestedPage : "command";
    const tabs = Array.from(
      document.querySelectorAll("#primary-navigation [role='tab']"),
    );
    tabs.forEach((tab) => {
      const selected = tab.dataset.page === safePage;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(tab.getAttribute("aria-controls"));
      panel.hidden = !selected;
      if (selected && focus) tab.focus();
    });
    state.activePage = safePage;
    if (safePage === "starfall" && !state.starfall.firstOpened) {
      state.starfall.firstOpened = true;
    }
    renderActivePageDetails(safePage);
    updateUi();
    if (safePage === "leaderboard") {
      window.dispatchEvent(new Event("stellar-leaderboard-open"));
    }
    if (persist) saveGame();
    if (scroll) {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }

  function setupPrimaryNavigation() {
    const tabs = Array.from(
      document.querySelectorAll("#primary-navigation [role='tab']"),
    );
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activatePrimaryPage(tab.dataset.page, { scroll: true });
      });
      tab.addEventListener("keydown", (event) => {
        const navigableTabs = tabs.filter((entry) => !entry.hidden && !entry.disabled);
        const currentIndex = navigableTabs.indexOf(tab);
        let nextIndex = null;
        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % navigableTabs.length;
        if (event.key === "ArrowLeft") {
          nextIndex = (currentIndex - 1 + navigableTabs.length) % navigableTabs.length;
        }
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = navigableTabs.length - 1;
        if (nextIndex === null || !navigableTabs.length) return;
        event.preventDefault();
        activatePrimaryPage(navigableTabs[nextIndex].dataset.page, {
          focus: true,
          scroll: true,
        });
      });
    });
    activatePrimaryPage(state.activePage, { persist: false });
  }

  function setupTabs() {
    document.querySelectorAll(".tabs[role='tablist']").forEach((tabList) => {
      const tabs = Array.from(tabList.querySelectorAll("[role='tab']"));
      const activateTab = (tab, focus = false) => {
        tabs.forEach((other) => {
          const selected = other === tab;
          other.classList.toggle("active", selected);
          other.setAttribute("aria-selected", String(selected));
          other.tabIndex = selected ? 0 : -1;
          const panel = document.getElementById(other.getAttribute("aria-controls"));
          panel.hidden = !selected;
        });
        if (focus) tab.focus();
        if (state.activePage === "research") {
          renderActivePageDetails("research");
          updateUi();
        }
      };

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => activateTab(tab));
        tab.addEventListener("keydown", (event) => {
          let nextIndex = null;
          if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
          if (event.key === "ArrowLeft") {
            nextIndex = (index - 1 + tabs.length) % tabs.length;
          }
          if (event.key === "Home") nextIndex = 0;
          if (event.key === "End") nextIndex = tabs.length - 1;
          if (nextIndex === null) return;
          event.preventDefault();
          activateTab(tabs[nextIndex], true);
        });
      });
    });
  }

  function setupStarfield() {
    const canvas = elements.starfield;
    const context = canvas.getContext("2d");
    if (!context) return;
    let stars = [];
    let meteors = [];
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let actualPixelRatio = 1;
    let frameTimer = null;
    let lastStarfieldFrame = 0;
    let renderedFrames = 0;
    let nextMeteorAt = performance.now() + randomBetween(5000, 14000);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const starColors = [
      [120, 222, 255],
      [112, 152, 255],
      [190, 139, 255],
      [224, 238, 255],
    ];

    function getProfile() {
      if (performanceMode === "eco") {
        return {
          fps: ECO_STARFIELD_FPS,
          maxPixelRatio: 1,
          minStars: 32,
          maxStars: 72,
          starArea: 14000,
          maxMeteors: 1,
          meteorShadow: 0,
        };
      }
      return {
        fps: QUALITY_STARFIELD_FPS,
        maxPixelRatio: 2,
        minStars: 58,
        maxStars: 210,
        starArea: 7200,
        maxMeteors: 2,
        meteorShadow: 12,
      };
    }

    function resize() {
      const profile = getProfile();
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        profile.maxPixelRatio,
      );
      actualPixelRatio = ratio;
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      canvas.width = Math.floor(viewportWidth * ratio);
      canvas.height = Math.floor(viewportHeight * ratio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(
        profile.maxStars,
        Math.max(
          profile.minStars,
          Math.floor((viewportWidth * viewportHeight) / profile.starArea),
        ),
      );
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * viewportWidth,
        y: Math.random() * viewportHeight,
        size: Math.random() * 1.55 + 0.22,
        alpha: Math.random() * 0.58 + 0.16,
        speed: Math.random() * 0.045 + 0.01,
        drift: (Math.random() - 0.5) * 0.012,
        phase: Math.random() * Math.PI * 2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      }));
      meteors = [];
      if (!document.hidden) draw(performance.now());
    }

    function draw(timestamp) {
      context.clearRect(0, 0, viewportWidth, viewportHeight);
      stars.forEach((star) => {
        const twinkle = reduceMotion
          ? 1
          : 0.74 + Math.sin(timestamp * 0.0014 + star.phase) * 0.26;
        const [red, green, blue] = star.color;
        context.beginPath();
        context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${
          star.alpha * twinkle
        })`;
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      });

      meteors.forEach((meteor) => {
        const profile = getProfile();
        const tailX = meteor.x - meteor.length;
        const tailY = meteor.y - meteor.length * 0.42;
        const gradient = context.createLinearGradient(
          meteor.x,
          meteor.y,
          tailX,
          tailY,
        );
        gradient.addColorStop(0, `rgba(${meteor.color}, ${meteor.alpha})`);
        gradient.addColorStop(0.18, `rgba(${meteor.color}, ${meteor.alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(${meteor.color}, 0)`);
        context.beginPath();
        context.moveTo(meteor.x, meteor.y);
        context.lineTo(tailX, tailY);
        context.lineWidth = meteor.width;
        context.lineCap = "round";
        context.strokeStyle = gradient;
        context.shadowColor = `rgba(${meteor.color}, 0.7)`;
        context.shadowBlur = profile.meteorShadow;
        context.stroke();
        context.shadowBlur = 0;
      });
    }

    function spawnMeteor() {
      const purple = Math.random() < 0.38;
      meteors.push({
        x: Math.random() * viewportWidth * 0.62 - viewportWidth * 0.12,
        y: Math.random() * viewportHeight * 0.22 - 60,
        velocityX: Math.random() * 3.8 + 7.2,
        velocityY: Math.random() * 1.8 + 3.1,
        length: Math.random() * 95 + 105,
        width: Math.random() * 1.2 + 1.1,
        alpha: Math.random() * 0.22 + 0.62,
        color: purple ? "184, 140, 255" : "98, 230, 255",
      });
    }

    function animate(timestamp) {
      if (document.hidden || reduceMotion) return;
      const profile = getProfile();
      const frameScale = lastStarfieldFrame
        ? clamp((timestamp - lastStarfieldFrame) / (1000 / 60), 0.25, 4)
        : 1;
      stars.forEach((star) => {
        star.y += star.speed * frameScale;
        star.x += star.drift * frameScale;
        if (star.y > viewportHeight + 2) {
          star.y = -2;
          star.x = Math.random() * viewportWidth;
        }
        if (star.x < -2) star.x = viewportWidth + 2;
        if (star.x > viewportWidth + 2) star.x = -2;
      });
      if (timestamp >= nextMeteorAt && meteors.length < profile.maxMeteors) {
        spawnMeteor();
        nextMeteorAt = timestamp + randomBetween(14000, 42000);
      }
      meteors.forEach((meteor) => {
        meteor.x += meteor.velocityX * frameScale;
        meteor.y += meteor.velocityY * frameScale;
        meteor.alpha *= Math.pow(0.994, frameScale);
      });
      meteors = meteors.filter(
        (meteor) =>
          meteor.alpha > 0.08 &&
          meteor.x - meteor.length < viewportWidth + 80 &&
          meteor.y - meteor.length < viewportHeight + 80,
      );
      draw(timestamp);
      lastStarfieldFrame = timestamp;
      renderedFrames += 1;
      scheduleFrame();
    }

    function scheduleFrame() {
      if (
        reduceMotion ||
        document.hidden ||
        frameTimer !== null
      ) {
        return;
      }
      const interval = 1000 / getProfile().fps;
      const elapsed = lastStarfieldFrame
        ? performance.now() - lastStarfieldFrame
        : interval;
      frameTimer = window.setTimeout(() => {
        frameTimer = null;
        if (document.hidden) return;
        animate(performance.now());
      }, Math.max(0, interval - elapsed));
    }

    function pause() {
      if (frameTimer !== null) {
        window.clearTimeout(frameTimer);
        frameTimer = null;
      }
    }

    function resume() {
      if (reduceMotion || document.hidden) return;
      lastStarfieldFrame = performance.now();
      scheduleFrame();
    }

    function setMode() {
      pause();
      lastStarfieldFrame = 0;
      resize();
      resume();
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    starfieldController = Object.freeze({
      pause,
      resume,
      setMode,
      getDiagnostics: () => ({
        targetFps: getProfile().fps,
        pixelRatio: actualPixelRatio,
        starCount: stars.length,
        maxMeteors: getProfile().maxMeteors,
        scheduled: frameTimer !== null,
        renderedFrames,
      }),
    });
    resume();
  }

  function bindEvents() {
    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest("button");
        if (button) playButtonTone(button);
      },
      true,
    );
    elements.collect.addEventListener("click", collect);
    elements.collect.addEventListener("dblclick", (event) => event.preventDefault());
    elements.buildingList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-building-id]");
      if (button) buyBuilding(button.dataset.buildingId);
    });
    elements.fleetCommandDeck.addEventListener("click", (event) => {
      const presetButton = event.target.closest("[data-fleet-preset]");
      if (presetButton) {
        selectFleetPreset(Number(presetButton.dataset.fleetPreset));
        return;
      }
      const configButton = event.target.closest("[data-fleet-config]");
      if (configButton) {
        configureFleetPreset(
          configButton.dataset.fleetConfig,
          configButton.dataset.fleetValue,
        );
        return;
      }
      const craftButton = event.target.closest("[data-fleet-craft]");
      if (craftButton) {
        craftFleetResource(craftButton.dataset.fleetCraft);
        return;
      }
      const actionButton = event.target.closest("[data-fleet-action]");
      if (actionButton?.dataset.fleetAction === "activate") {
        activateFleetPreset();
      } else if (actionButton?.dataset.fleetAction === "challenge") {
        runFleetChallenge();
      }
    });
    elements.upgradeList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-upgrade-id]");
      if (button) buyUpgrade(button.dataset.upgradeId);
    });
    document.querySelectorAll("[data-buy-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        state.buyMode = button.dataset.buyMode;
        updateBuyModeButtons();
        renderBuildings();
      });
    });
    elements.eventButton.addEventListener("click", claimEvent);
    elements.commandMissionButton.addEventListener("click", () =>
      activatePrimaryPage("missions", { scroll: true }),
    );
    elements.starfallCommandCard.addEventListener("click", () =>
      activatePrimaryPage("starfall", { scroll: true }),
    );
    elements.starfallDayList.addEventListener("click", (event) => {
      const routeButton = event.target.closest("[data-starfall-route]");
      if (routeButton) {
        selectStarfallRoute(
          routeButton.dataset.starfallDay,
          routeButton.dataset.starfallRoute,
        );
        return;
      }
      const claimButton = event.target.closest("[data-starfall-claim]");
      if (claimButton) claimStarfallRoute(claimButton.dataset.starfallClaim);
    });
    elements.starfallLetterList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-starfall-letter]");
      if (button) {
        chooseStarfallLetter(
          button.dataset.starfallLetter,
          button.dataset.starfallChoice,
        );
      }
    });
    elements.starfallMilestoneList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-starfall-milestone]");
      if (button) claimStarfallMilestone(button.dataset.starfallMilestone);
    });
    elements.starfallStoreGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-starfall-store]");
      if (button) purchaseStarfallItem(button.dataset.starfallStore);
    });
    elements.commandGuideAction.addEventListener("click", () => {
      const action = elements.commandGuideAction.dataset.guideAction;
      if (PRIMARY_PAGES.includes(action)) {
        activatePrimaryPage(action, { scroll: true });
      } else if (action === "collect") {
        elements.collect.scrollIntoView({ behavior: "smooth", block: "center" });
        elements.collect.focus();
      } else if (action === "operations") {
        elements.operationsHub.open = true;
        elements.operationsHub.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (action === "prestige") {
        elements.prestigeButton.scrollIntoView({ behavior: "smooth", block: "center" });
        elements.prestigeButton.focus();
      }
    });
    elements.operationsHub.addEventListener("toggle", () => {
      if (
        elements.operationsHub.open &&
        state.lifetimeDust >= OPERATIONS_UNLOCK_DUST &&
        !state.guidance.seenFeatures.includes("operations")
      ) {
        state.guidance.seenFeatures.push("operations");
        saveGame();
        window.setTimeout(() => showModal({
          eyebrow: "新系统只需三步",
          icon: "▦",
          title: "航站作业：选一个，就能挂机",
          message: "① 选择一项作业；② 用“连续”挂机，或排入 30 分钟队列；③ 作业自动提升固定专精，产出的组件直接投入舰队与远征。没有分支加点，也不会点错。",
          confirmText: "知道了",
          cancelText: null,
        }), 120);
      }
    });
    elements.operationsJobList.addEventListener("click", (event) => {
      const continuous = event.target.closest("[data-operation-continuous]");
      const queued = event.target.closest("[data-operation-queue]");
      const inject = event.target.closest("[data-operation-inject]");
      if (continuous) queueOperation(continuous.dataset.operationContinuous, true);
      else if (queued) queueOperation(queued.dataset.operationQueue, false);
      else if (inject) injectOperationMastery(inject.dataset.operationInject);
    });
    elements.operationsComponentList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-operation-component]");
      if (button) useOperationComponent(button.dataset.operationComponent);
    });
    elements.operationsStopButton.addEventListener("click", () => {
      state.operations.queue = [];
      state.operations.lastReport = "全部航站作业已停止。";
      renderOperations();
      saveGame();
    });
    elements.companionEventClose.addEventListener("click", closeCompanionEvent);
    elements.companionEventChoices.addEventListener("click", (event) => {
      const button = event.target.closest("[data-companion-event-choice]");
      if (button) resolveCompanionEvent(button.dataset.companionEventChoice);
    });
    elements.companionLogGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-companion-log]");
      if (button) openCompanionEvent(button.dataset.companionLog);
    });
    elements.dailyRerollButton.addEventListener("click", rerollDailyMission);
    [elements.dailyMissionList, elements.weeklyMissionList].forEach((list) => {
      list.addEventListener("click", (event) => {
        const button = event.target.closest("[data-mission-claim]");
        if (!button) return;
        claimMission(button.dataset.missionKind, Number(button.dataset.missionClaim));
      });
    });
    elements.dailyBonusButton.addEventListener("click", claimDailyMissionBonus);
    elements.weeklyMilestoneList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-weekly-milestone]");
      if (button) claimWeeklyMissionMilestone(Number(button.dataset.weeklyMilestone));
    });
    elements.missionStore.addEventListener("click", (event) => {
      const button = event.target.closest("[data-mission-store]");
      if (button) purchaseMissionStoreItem(button.dataset.missionStore);
    });
    elements.prestigeButton.addEventListener("click", prestige);
    elements.attackUpgradeButton.addEventListener("click", () =>
      upgradeCombat("attack"),
    );
    elements.defenseUpgradeButton.addEventListener("click", () =>
      upgradeCombat("defense"),
    );
    elements.starportSlotMap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-starport-module]");
      if (button) upgradeStarportModule(button.dataset.starportModule);
    });
    elements.skirmishTargetList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-skirmish-id]");
      if (button) attackSkirmish(button.dataset.skirmishId);
    });
    elements.planetTargetList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-planet-id]");
      if (button) attackPlanet(button.dataset.planetId);
    });
    elements.expeditionPresetButtons.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-preset]");
      if (button) selectExpeditionPreset(Number(button.dataset.expeditionPreset));
    });
    elements.expeditionGearGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-gear]");
      if (button) toggleExpeditionGear(button.dataset.expeditionGear);
    });
    elements.startExpeditionButton.addEventListener("click", startExpedition);
    elements.expeditionBoonChoices.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-boon]");
      if (button) chooseExpeditionBoon(button.dataset.expeditionBoon);
    });
    elements.expeditionRouteChoices.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-route]");
      if (button) selectExpeditionRoute(button.dataset.expeditionRoute);
    });
    elements.expeditionBossTactics.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-boss-tactic]");
      if (button) chooseExpeditionBossTactic(button.dataset.expeditionBossTactic);
    });
    elements.expeditionRerollButton.addEventListener(
      "click",
      rerollExpeditionRoutes,
    );
    elements.expeditionRepairButton.addEventListener(
      "click",
      repairExpeditionHull,
    );
    elements.expeditionAbandonButton.addEventListener("click", abandonExpedition);
    elements.expeditionSkinGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-expedition-skin]");
      if (button) selectExpeditionSkin(button.dataset.expeditionSkin);
    });
    elements.coreShopList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-core-shop-id]");
      if (button) purchaseCoreUpgrade(button.dataset.coreShopId);
    });
    elements.transcendProtocolList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-protocol-id]");
      if (button) purchaseEndgameProtocol(button.dataset.protocolId);
    });
    elements.sectorClaimButton.addEventListener("click", claimSector);
    elements.collapseButton.addEventListener("click", transcend);
    elements.crescentSignal.addEventListener("click", unlockCrescentMission);
    elements.crescentLetterButton.addEventListener("click", openCrescentLetter);
    elements.saveButton.addEventListener("click", () => saveGame(true));
    elements.soundButton.addEventListener("click", () => {
      state.sound = !state.sound;
      updateUi();
      if (state.sound) playTone(520, 0.08);
    });
    elements.performanceButton.addEventListener("click", () => {
      setPerformanceMode(performanceMode === "eco" ? "quality" : "eco");
    });
    elements.navigationModeButton.addEventListener("click", () => {
      state.guidance.compactNavigation = !state.guidance.compactNavigation;
      updateNavigationVisibility();
      saveGame();
      showToast(
        state.guidance.compactNavigation ? "渐进导航已启用" : "完整导航已显示",
        state.guidance.compactNavigation
          ? "暂时隐藏尚未到阶段的系统，已获得的功能不会消失。"
          : "全部系统入口已经显示，未解锁页面会保持不可用。",
        "➜",
      );
    });
    elements.bgmButton.addEventListener("click", () => {
      state.bgmEnabled = !state.bgmEnabled;
      if (state.bgmEnabled) {
        startBgm();
        showToast("背景音乐已开启", "自定义航站乐章开始播放。", "♫");
      } else {
        stopBgm();
        showToast("背景音乐已关闭", "操作音效仍可单独使用。", "×");
      }
      updateBgmControls();
      saveGame();
    });
    elements.bgmVolume.addEventListener("input", () => {
      state.bgmVolume = clamp(Number(elements.bgmVolume.value) / 100, 0, 1);
      setBgmVolume();
      updateBgmControls();
    });
    elements.bgmVolume.addEventListener("change", () => saveGame());
    elements.bgmTrack.addEventListener("change", () => {
      selectBgmTrack(elements.bgmTrack.value);
    });
    elements.topBgmTrack.addEventListener("change", () => {
      selectBgmTrack(elements.topBgmTrack.value);
    });
    elements.bgmAudio.addEventListener("loadedmetadata", () => {
      bgmTrackSwitchInProgress = false;
      const loopStartSeconds = getCurrentBgmTrack().loopStartSeconds;
      if (elements.bgmAudio.currentTime < loopStartSeconds) {
        elements.bgmAudio.currentTime = loopStartSeconds;
      }
    });
    elements.bgmAudio.addEventListener("timeupdate", maintainBgmLoop);
    elements.bgmAudio.addEventListener("ended", advanceBgmTrack);
    elements.menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      elements.settingsMenu.hidden = !elements.settingsMenu.hidden;
    });
    elements.guideButton.addEventListener("click", () => openTutorial(0));
    elements.patchNotesButton.addEventListener("click", () => openPatchNotes());
    elements.renameButton.addEventListener("click", () => openNameDialog(false));
    document.addEventListener("click", (event) => {
      if (!elements.settingsMenu.contains(event.target) && event.target !== elements.menuButton) {
        elements.settingsMenu.hidden = true;
      }
    });
    elements.exportButton.addEventListener("click", exportSave);
    elements.importButton.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", () => {
      const file = elements.importFile.files?.[0];
      if (file) importSave(file);
    });
    elements.resetButton.addEventListener("click", resetGame);
    elements.modalConfirm.addEventListener("click", () => closeModal(true));
    elements.modalCancel.addEventListener("click", () => closeModal(false));
    elements.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === elements.modalBackdrop && !elements.modalCancel.hidden) {
        closeModal(false);
      }
    });
    elements.patchNotesClose.addEventListener("click", closePatchNotes);
    elements.patchNotesConfirm.addEventListener("click", closePatchNotes);
    elements.patchNotesBackdrop.addEventListener("click", (event) => {
      if (event.target === elements.patchNotesBackdrop) closePatchNotes();
    });
    elements.updateLaterButton.addEventListener("click", () => {
      updateDismissedVersion = latestAvailableVersion?.version || null;
      elements.updateBanner.hidden = true;
    });
    elements.updateNowButton.addEventListener("click", applyAvailableGameUpdate);
    elements.crescentLetterClose.addEventListener("click", closeCrescentLetter);
    elements.crescentLetterConfirm.addEventListener("click", closeCrescentLetter);
    elements.crescentLetterBackdrop.addEventListener("click", (event) => {
      if (event.target === elements.crescentLetterBackdrop) {
        closeCrescentLetter();
      }
    });
    elements.nameConfirm.addEventListener("click", savePlayerName);
    elements.nameCancel.addEventListener("click", closeNameDialog);
    elements.nameBackdrop.addEventListener("click", (event) => {
      if (event.target === elements.nameBackdrop) closeNameDialog();
    });
    elements.playerNameInput.addEventListener("input", () => {
      elements.nameError.textContent = "";
    });
    elements.playerNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        savePlayerName();
      }
    });
    elements.tutorialBack.addEventListener("click", () => moveTutorial(-1));
    elements.tutorialNext.addEventListener("click", () => moveTutorial(1));
    elements.tutorialSkip.addEventListener("click", () => closeTutorial(false));
    document.addEventListener("keydown", (event) => {
      if (
        event.code === "Space" &&
        (!elements.modalBackdrop.hidden ||
          !elements.nameBackdrop.hidden ||
          !elements.patchNotesBackdrop.hidden ||
          !elements.crescentLetterBackdrop.hidden ||
          !elements.communicationBackdrop.hidden ||
          !elements.accountBackdrop.hidden)
      ) {
        return;
      }
      if (
        event.code === "Space" &&
        !["INPUT", "BUTTON", "TEXTAREA"].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        collect();
      }
      if (event.key === "Escape") {
        elements.settingsMenu.hidden = true;
        if (!elements.patchNotesBackdrop.hidden) closePatchNotes();
        if (!elements.crescentLetterBackdrop.hidden) closeCrescentLetter();
        if (!elements.communicationBackdrop.hidden) elements.communicationClose.click();
        if (!elements.accountBackdrop.hidden) elements.accountClose.click();
        if (!elements.tutorialBackdrop.hidden) closeTutorial(false);
        if (!elements.modalBackdrop.hidden && !elements.modalCancel.hidden) closeModal(false);
        if (!elements.nameBackdrop.hidden) closeNameDialog();
      }
    });
    window.addEventListener("beforeunload", () => saveGame());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        backgroundStartedAt = Date.now();
        pauseGameLoop();
        starfieldController?.pause();
        saveGame();
      } else if (backgroundStartedAt !== null) {
        grantInactiveEarnings(backgroundStartedAt, "background");
        backgroundStartedAt = null;
        saveGame();
        starfieldController?.resume();
      }
      lastWallClock = Date.now();
      if (!document.hidden) {
        restartGameLoop();
        checkForGameUpdate();
      }
    });
    const unlockBgm = () => {
      if (state.bgmEnabled) startBgm();
    };
    document.addEventListener("pointerdown", unlockBgm, { once: true, capture: true });
    document.addEventListener("keydown", unlockBgm, { once: true, capture: true });
  }

  function pauseGameLoop() {
    if (gameLoopTimer === null) return;
    window.clearTimeout(gameLoopTimer);
    gameLoopTimer = null;
  }

  function scheduleGameLoop(delay = getGameTickInterval()) {
    if (document.hidden || gameLoopTimer !== null) return;
    gameLoopTimer = window.setTimeout(() => {
      gameLoopTimer = null;
      gameLoop(performance.now());
    }, Math.max(0, delay));
  }

  function restartGameLoop() {
    pauseGameLoop();
    if (!document.hidden) scheduleGameLoop(0);
  }

  function gameLoop(now) {
    if (document.hidden) return;
    const wallNow = Date.now();
    const wallDelta = Math.max(0, (wallNow - lastWallClock) / 1000);
    let delta = wallDelta;
    if (wallDelta > 1) {
      grantInactiveEarnings(
        wallNow - wallDelta * 1000,
        wallDelta > 10 ? "background" : "none",
      );
      delta = 0;
    }
    lastWallClock = wallNow;
    const rate = calculateRate();
    if (rate > 0) addDust(safeMultiply(rate, delta));
    if (delta > 0) processOperations(delta);
    state.playTime = safeAdd(state.playTime, delta);
    recordMissionProgress("playSeconds", delta);

    if (now - lastUi >= getGameTickInterval()) {
      expireTimedEffects();
      processCombatEvents();
      checkAchievements();
      updateUi(rate);
      if (Math.floor(now / 1000) !== Math.floor(lastUi / 1000)) {
        renderActivePageDetails();
      }
      lastUi = now;
    }
    if (Date.now() - lastSave >= AUTOSAVE_INTERVAL) saveGame();
    gameTickCount += 1;
    scheduleGameLoop();
  }

  loadGame();
  setupPrimaryNavigation();
  setupTabs();
  setupStarfield();
  bindEvents();
  installVersionChecks();
  syncBgmState();
  renderAll();
  globalThis.StellarOutpostCloudBridge = Object.freeze({
    gameVersion: GAME_VERSION,
    saveVersion: SAVE_VERSION,
    createSnapshot: createCloudSaveSnapshot,
    getMetadata: getCloudSaveMetadata,
    getLeaderboardEntry,
    getStarfallDiagnostics: (now = Date.now()) => {
      ensureStarfallDays(now);
      return JSON.parse(JSON.stringify({
        phase: getStarfallPhase(now),
        eventStart: STARFALL_EVENT_START,
        eventEnd: STARFALL_EVENT_END,
        exchangeEnd: STARFALL_EXCHANGE_END,
        availableDayKeys: getAvailableStarfallDayKeys(now),
        state: state.starfall,
        letters: STARFALL_LETTERS.map((letter) => ({
          id: letter.id,
          unlockAt: getStarfallLetterUnlockAt(letter),
        })),
        milestones: STARFALL_MILESTONES,
      }));
    },
    getMissionDiagnostics: () => {
      ensureMissionPeriods();
      return JSON.parse(JSON.stringify({
        tokens: state.missions.tokens,
        daily: state.missions.daily,
        weekly: state.missions.weekly,
        claimable: getMissionClaimableCount(),
      }));
    },
    getExpeditionDiagnostics: () => JSON.parse(JSON.stringify({
      supplies: state.expedition.supplies,
      fragments: state.expedition.fragments,
      completedRuns: state.expedition.completedRuns,
      failedRuns: state.expedition.failedRuns,
      bossWins: state.expedition.bossWins,
      unlockedGear: state.expedition.unlockedGear,
      activePreset: state.expedition.activePreset,
      loadoutPresets: state.expedition.loadoutPresets,
      artifacts: state.expedition.artifacts,
      unlockedSkins: state.expedition.unlockedSkins,
      activeSkin: state.expedition.activeSkin,
      activeRun: state.expedition.activeRun,
    })),
    getFleetCommandDiagnostics: () => {
      ensureFleetChallengePeriod();
      return JSON.parse(JSON.stringify({
        unlocked: isFleetCommandUnlocked(),
        activePreset: state.fleetCommand.activePreset,
        selectedPreset: state.fleetCommand.selectedPreset,
        presets: state.fleetCommand.presets,
        ammo: state.fleetCommand.ammo,
        maintenance: state.fleetCommand.maintenance,
        commandData: state.fleetCommand.commandData,
        weekly: state.fleetCommand.weekly,
        cosmetics: state.fleetCommand.cosmetics,
        totalChallengeClears: state.fleetCommand.totalChallengeClears,
        productionMultiplier: getFleetProductionMultiplier(),
        defenseMultiplier: getFleetDefenseMultiplier(),
        expeditionMultiplier: getFleetExpeditionMultiplier(),
        challenge: getFleetChallenge(),
      }));
    },
    getOperationsDiagnostics: () => JSON.parse(JSON.stringify({
      unlocked: state.lifetimeDust >= OPERATIONS_UNLOCK_DUST,
      compactNavigation: state.guidance.compactNavigation,
      visiblePages: PRIMARY_PAGES.filter((page) => isPrimaryPageUnlocked(page)),
      queue: state.operations.queue,
      jobs: state.operations.jobs,
      components: state.operations.components,
      engineeringPool: state.operations.engineeringPool,
      engineeringPoolCap: getOperationsPoolCap(),
      queueSlots: getOperationsQueueSlots(),
      totalActions: state.operations.totalActions,
    })),
    checkForGameUpdate,
    getPerformanceDiagnostics: () => ({
      mode: performanceMode,
      gameTickInterval: getGameTickInterval(),
      gameLoopScheduled: gameLoopTimer !== null,
      gameTickCount,
      hidden: document.hidden,
      starfield: starfieldController?.getDiagnostics() || null,
    }),
    getProductionDiagnostics: () => ({
      total: calculateRate(),
      rawTotal: calculateRawRate(),
      sharedMultiplier: getAutomaticProductionMultiplier(),
      buildings: Object.fromEntries(
        BUILDINGS.map((building) => [
          building.id,
          getBuildingRateBreakdown(building.id),
        ]),
      ),
      purchasePreviews: Object.fromEntries(
        BUILDINGS.map((building) => {
          const purchase = selectedPurchase(building);
          return [
            building.id,
            {
              amount: purchase.amount,
              cost: purchase.cost,
              ...getBuildingRateBreakdown(
                building.id,
                state,
                true,
                purchase.amount,
              ),
            },
          ];
        }),
      ),
    }),
    getStarportDiagnostics: () => ({
      ranks: { ...state.starport.modules },
      materials: { ...state.starport.materials },
      dust: state.dust,
      automaticRate: calculateRate(state, false),
      clickValue: getClickValue(),
      attackPower: getCombatPower(),
      defensePower: getDefensePower(),
      productionMultiplier: getStarportProductionMultiplier(),
      clickMultiplier: getStarportClickMultiplier(),
      attackMultiplier: getStarportAttackMultiplier(),
      defenseMultiplier: getStarportDefenseMultiplier(),
      lootMultiplier: getStarportLootMultiplier(),
    }),
    applySnapshot: applyCloudSaveSnapshot,
    notify: (title, message, icon = "☁") =>
      showToast(title, message, icon),
  });
  window.dispatchEvent(new Event("stellar-game-ready"));
  if (recoveredBackupIndex >= 0) {
    saveGame(false, { skipBackup: true });
    window.setTimeout(() => {
      showToast(
        "已恢复备用存档",
        `主存档不可用，已从第 ${recoveredBackupIndex + 1} 个轮换备份恢复。`,
        "✓",
      );
    }, 120);
  }
  window.setTimeout(showStartupNotices, 260);
  scheduleGameLoop(0);
})();
