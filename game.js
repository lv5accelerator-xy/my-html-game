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
  const GAME_VERSION = "0.13.2";
  const SAVE_VERSION = 6;
  const BACKUP_INTERVAL = 5 * 60 * 1000;
  const BASE_MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const AUTOSAVE_INTERVAL = 10000;
  const UI_INTERVAL = 100;
  const MINOR_RAID_MIN_INTERVAL = 3 * 60 * 1000;
  const MINOR_RAID_MAX_INTERVAL = 11 * 60 * 1000;
  const MINOR_RAID_WARNING = 24 * 1000;
  const MAJOR_RAID_INTERVAL = 60 * 60 * 1000;
  const MAJOR_RAID_WARNING = 60 * 1000;
  const MAX_OFFLINE_MAJOR_RAIDS = 24;
  const MAX_OFFLINE_RAID_LOSS_RATIO = 0.35;
  const BUILDING_GROWTH = 1.12;
  const PRESTIGE_BASE_DUST = 25000;
  const PRESTIGE_RATIO_SOFT_CAP = 400;
  const PRESTIGE_LATE_POWER = 0.25;
  const CORE_MULTIPLIER_SOFT_CAP = 250;
  const CORE_MULTIPLIER_LATE_POWER = 0.25;
  const TRANSCEND_CORE_SOFT_CAP = 25000;
  const TRANSCEND_CORE_LATE_POWER = 0.3;
  const PRODUCTION_SOFT_CAP = 10000;
  const PRODUCTION_LATE_POWER = 0.1;
  const MAX_AUTO_RATE = 999000;
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
  const DUST_RESERVE_CAP = 99999999;
  const CAREER_DUST_CAP = 999000000;
  const CORE_RESERVE_CAP = 999000000;
  const ENDGAME_RESOURCE_CAP = 999000000;
  const LEGACY_DUST_SOFT_CAP = 10000000;
  const LEGACY_DUST_LATE_POWER = 0.1;
  const LEGACY_CORE_SOFT_CAP = 5000;
  const LEGACY_CORE_LATE_POWER = 0.25;
  const CRESCENT_MISSION_GOALS = Object.freeze({
    manualClicks: 28,
    skirmishWins: 1,
    starportUpgrades: 1,
  });
  const PRIMARY_PAGES = [
    "command",
    "fleet",
    "starport",
    "research",
    "core-shop",
    "combat",
    "transcend",
    "leaderboard",
  ];
  const PATCH_NOTES = [
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

  const UPGRADES = [
    {
      id: "gloves",
      name: "磁力手套",
      icon: "✧",
      description: "手动回收产量 ×2",
      cost: 40,
      unlock: 20,
      effect: { click: 2 },
    },
    {
      id: "scanner",
      name: "脉冲扫描仪",
      icon: "⌖",
      description: "手动回收产量 ×3",
      cost: 320,
      unlock: 180,
      effect: { click: 3 },
    },
    {
      id: "droneAi",
      name: "无人机群智",
      icon: "⌁",
      description: "拾荒无人机产量 ×2",
      cost: 520,
      unlock: 300,
      effect: { building: "drone", multiplier: 2 },
    },
    {
      id: "solarLens",
      name: "超薄聚光层",
      icon: "◈",
      description: "光帆采集器产量 ×2",
      cost: 2500,
      unlock: 1800,
      effect: { building: "sail", multiplier: 2 },
    },
    {
      id: "zeroG",
      name: "零重力流水线",
      icon: "∞",
      description: "所有自动产量 ×1.5",
      cost: 12000,
      unlock: 8500,
      effect: { global: 1.5 },
    },
    {
      id: "crystalResonance",
      name: "陨晶共振",
      icon: "⬡",
      description: "分析舱与熔铸站产量 ×2",
      cost: 60000,
      unlock: 45000,
      effect: { buildings: ["lab", "forge"], multiplier: 2 },
    },
    {
      id: "relayProtocol",
      name: "中继共享协议",
      icon: "◎",
      description: "深空中继环产量 ×3",
      cost: 260000,
      unlock: 190000,
      effect: { building: "relay", multiplier: 3 },
    },
    {
      id: "timeFold",
      name: "局部时间折叠",
      icon: "◌",
      description: "所有自动产量 ×2",
      cost: 1100000,
      unlock: 800000,
      effect: { global: 2 },
    },
    {
      id: "ringDismantling",
      name: "星环剥离协议",
      icon: "◑",
      description: "行星环拆解场产量 ×2",
      cost: 4200000,
      unlock: 3000000,
      effect: { building: "ringYard", multiplier: 2 },
    },
    {
      id: "riftHarmonics",
      name: "裂隙谐振捕获",
      icon: "⌬",
      description: "裂隙捕获网产量 ×2",
      cost: 12000000,
      unlock: 8000000,
      effect: { building: "riftNet", multiplier: 2 },
    },
    {
      id: "horizonAnchors",
      name: "事件视界锚定",
      icon: "◉",
      description: "视界潮汐矿场产量 ×2",
      cost: 36000000,
      unlock: 24000000,
      effect: { building: "horizonMine", multiplier: 2 },
    },
    {
      id: "cosmicReclamation",
      name: "终末回收协议",
      icon: "≋",
      description: "宇宙弦织取机产量 ×3",
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
      tip: "使用页面顶部的“指挥台、舰队、星港、研究、星核、战斗、超越、排行榜”导航切换功能；游戏会记住你上次所在的页面。",
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
        "战斗页的近域清剿会掉落合金、晶体、芯片与异星构件。前往“星港”页，将材料投入六个固定栏位，建造生产或战斗附属建筑。",
      tip: "先建星尘精炼厂与舰炮阵列；高等级建筑需要稀有异星构件。星港随普通跃迁保留，但会在奇点超越时重置。",
    },
    {
      eyebrow: "终局 · 奇点超越",
      icon: "∞",
      title: "建立跨周期的终局航线",
      message:
        "历史获得 5K 星核后，“超越”页会解锁。奇点坍缩将重置前两层成长，换取永久碎片，并开启持续扩展的边境星区目标。",
      tip: "先完成一次高收益跃迁再坍缩通常能获得更多碎片；协议矩阵可自由选择下一周期的生产、星核、战斗或重建速度。",
    },
  ];

  const COMBAT_UNLOCK_DUST = 500;
  const STARPORT_MATERIALS = [
    { id: "alloy", name: "星港合金", shortName: "合金", icon: "⬡" },
    { id: "crystal", name: "能量晶体", shortName: "晶体", icon: "◇" },
    { id: "circuit", name: "量子芯片", shortName: "芯片", icon: "▦" },
    { id: "relic", name: "异星构件", shortName: "构件", icon: "⌬" },
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
      baseCost: { alloy: 3, crystal: 1 },
      growth: 1.7,
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
      baseCost: { alloy: 5, circuit: 1 },
      growth: 1.72,
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
      baseCost: { alloy: 8, crystal: 3, circuit: 2 },
      growth: 1.74,
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
      baseCost: { alloy: 4, crystal: 2 },
      growth: 1.71,
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
      baseCost: { alloy: 6, crystal: 4 },
      growth: 1.73,
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
      baseCost: { alloy: 7, crystal: 5, circuit: 3 },
      growth: 1.76,
      maxRank: 12,
    },
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
      drops: { alloy: [3, 6], crystal: [2, 4] },
    },
    {
      id: "beltRaider",
      name: "岩带掠夺艇",
      icon: "▲",
      location: "碎石带哨区",
      basePower: 90,
      baseReward: 120,
      unlock: 400,
      drops: { alloy: [4, 8], circuit: [1, 2] },
    },
    {
      id: "sporeCloud",
      name: "辐射孢子云",
      icon: "✺",
      location: "电离气团",
      basePower: 145,
      baseReward: 190,
      unlock: 1200,
      drops: { crystal: [4, 8], circuit: [1, 3] },
    },
    {
      id: "smugglerFrigate",
      name: "走私护航艇",
      icon: "◆",
      location: "暗面贸易航线",
      basePower: 235,
      baseReward: 320,
      unlock: 4000,
      drops: { alloy: [5, 9], crystal: [3, 6], circuit: [2, 4] },
    },
    {
      id: "dormantSentinel",
      name: "沉睡哨兵机",
      icon: "◈",
      location: "远古警戒轨道",
      basePower: 380,
      baseReward: 520,
      unlock: 12000,
      drops: { crystal: [5, 9], circuit: [3, 5], relic: [1, 2] },
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
  const ENDGAME_UNLOCK_CORES = 5000;
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
    buildingList: $("#building-list"),
    upgradeList: $("#upgrade-list"),
    achievementList: $("#achievement-list"),
    researchCount: $("#research-count"),
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
    bgmButton: $("#bgm-button"),
    bgmStatus: $("#bgm-status"),
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
    accountButton: $("#account-button"),
    accountBackdrop: $("#account-backdrop"),
    accountClose: $("#account-close"),
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
    leaderboardCareerDust: $("#leaderboard-career-dust"),
    leaderboardHighestPower: $("#leaderboard-highest-power"),
    leaderboardBattleCount: $("#leaderboard-battle-count"),
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
      log: [
        {
          text: "拾荒单元 07 已上线。等待首条回收指令。",
          time: Date.now(),
        },
      ],
    };
  }

  let state = freshState();
  let lastFrame = performance.now();
  let lastWallClock = Date.now();
  let lastUi = 0;
  let lastSave = Date.now();
  let modalCallback = null;
  let audioContext = null;
  let tutorialIndex = 0;
  let nameDialogRequired = false;
  let patchNotesAutoOpened = false;
  let patchNotesSeenThisSession = false;
  let recoveredBackupIndex = -1;
  let backgroundStartedAt = document.hidden ? Date.now() : null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    const cost = {};
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
    if (rank >= 3) {
      cost.relic = Math.max(
        cost.relic || 0,
        1 + Math.floor((rank - 3) / 3),
      );
    }
    return cost;
  }

  function canAffordStarportModule(module, targetState = state) {
    if (getStarportRank(module.id, targetState) >= module.maxRank) return false;
    const cost = getStarportModuleCost(module, targetState);
    return Object.entries(cost).every(
      ([materialId, amount]) =>
        (targetState.starport?.materials?.[materialId] || 0) >= amount,
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

  function getClickValue(targetState = state) {
    let multiplier = safeMultiply(
      getCoreMultiplier(targetState),
      getAchievementMultiplier(targetState),
      getEndgameProductionMultiplier(targetState),
      getStarportClickMultiplier(targetState),
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
      softCapGameNumber(multiplier, CLICK_SOFT_CAP, CLICK_LATE_POWER),
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

  function calculateRate(targetState = state, includeTemporary = true) {
    let rate = 0;
    BUILDINGS.forEach((building) => {
      const owned = targetState.buildings[building.id] || 0;
      rate = safeAdd(
        rate,
        safeMultiply(
          owned,
          building.baseRate,
          getBuildingMultiplier(building.id, targetState),
        ),
      );
    });
    rate = safeMultiply(
      rate,
      getCoreMultiplier(targetState),
      getAchievementMultiplier(targetState),
      getEndgameProductionMultiplier(targetState),
      getStarportProductionMultiplier(targetState),
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
      rate = safeMultiply(rate, 2);
    }
    return Math.min(
      MAX_AUTO_RATE,
      softCapGameNumber(rate, PRODUCTION_SOFT_CAP, PRODUCTION_LATE_POWER),
    );
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

  function addDust(amount) {
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
    return appliedAmount;
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
    const needsNumericMigration = sourceVersion < SAVE_VERSION;
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
    merged.careerDust = Math.max(
      merged.lifetimeDust,
      sanitizeDustNumber(raw.careerDust, CAREER_DUST_CAP),
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
    return { elapsed, offlineGain, raidReport };
  }

  function loadGame() {
    const saved = readBestSaveSnapshot();

    if (!saved) {
      state = freshState();
      return;
    }

    state = sanitizeState(saved);
    grantInactiveEarnings(state.lastSeen, "load");
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
    const wasEmpty = state.buildings[id] === 0;
    state.dust = clampGameNumber(state.dust - purchase.cost);
    state.buildings[id] = clampGameCount(
      state.buildings[id] + purchase.amount,
    );
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
    playTone(380 + BUILDINGS.indexOf(building) * 38, 0.07, "sine");
    renderBuildings();
    updateUi();
  }

  function buyUpgrade(id) {
    const upgrade = UPGRADES.find((entry) => entry.id === id);
    if (
      !upgrade ||
      hasUpgrade(id) ||
      state.lifetimeDust < upgrade.unlock ||
      state.dust < upgrade.cost
    ) {
      return;
    }
    state.dust = clampGameNumber(state.dust - upgrade.cost);
    state.upgrades.push(id);
    addLog(`研究完成：${upgrade.name}。`);
    showToast("研究完成", `${upgrade.name} 已接入航站系统。`, upgrade.icon);
    playTone(680, 0.12, "sine");
    renderUpgrades();
    updateUi();
  }

  function collect(event) {
    const amount = addDust(getClickValue());
    state.lifetimeClicks = clampGameCount(state.lifetimeClicks + 1);
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
        renderAchievements();
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
    renderCombatTargets();
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
    showModal({
      eyebrow: "奇点超越",
      icon: "∞",
      title: `坍缩并提炼 ${formatNumber(gain, 0)} 枚奇点碎片？`,
      message: `本次操作将重置星尘、舰队、研究、星核、星核商店、跃迁次数、战斗成长以及星港建筑和材料。成就、边境星区、奇点碎片及全部超越协议永久保留。当前遗产协议会保留每类星核强化 ${legacyRank} 级，并以 ${formatNumber(
        startingDust,
      )} 初始星尘开启新周期。`,
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
        state.endgame.transcensions = clampGameCount(
          state.endgame.transcensions + 1,
        );
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
        state.starport = freshStarportState();
        state.combat = freshCombatState();
        state.event = null;
        state.buff = null;
        state.nextEventAt =
          Date.now() + randomBetween(30000, 50000);
        addLog(
          `奇点坍缩完成，获得 ${formatNumber(gain, 0)} 枚碎片；第 ${state.endgame.transcensions} 个超越周期启动。`,
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
          `永久星尘增幅 ×${formatNumber(
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
        getStarportAttackMultiplier(targetState),
      );
    return Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        softCapGameNumber(
          rawPower,
          COMBAT_POWER_SOFT_CAP,
          COMBAT_POWER_LATE_POWER,
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
        getStarportDefenseMultiplier(targetState),
      );
    return Math.round(
      Math.min(
        MAX_COMBAT_POWER,
        softCapGameNumber(
          rawPower,
          COMBAT_POWER_SOFT_CAP,
          COMBAT_POWER_LATE_POWER,
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
      showToast("建筑材料不足", `需要 ${describeMaterials(cost)}。`, "⌬");
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    Object.entries(cost).forEach(([materialId, amount]) => {
      state.starport.materials[materialId] = clampGameCount(
        state.starport.materials[materialId] - amount,
      );
    });
    state.starport.modules[module.id] = clamp(
      rank + 1,
      0,
      module.maxRank,
    );
    recordCrescentProgress("starportUpgrades");
    const action = rank === 0 ? "建造" : "强化";
    const message = `${module.name}${action}完成，当前等级 ${rank + 1} / ${module.maxRank}。`;
    addLog(message);
    showToast(`${module.name}${action}完成`, `${module.effect}增幅已生效。`, module.icon);
    playAchievementTone();
    checkAchievements();
    renderStarport();
    renderBuildings();
    renderCombatTargets();
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
      state.combat.enemyVictories[target.id] = clampGameCount(
        state.combat.enemyVictories[target.id] + 1,
      );
      state.combat.wins = clampGameCount(state.combat.wins + 1);
      state.combat.activeWins = clampGameCount(state.combat.activeWins + 1);
      state.combat.skirmishWins = clampGameCount(
        state.combat.skirmishWins + 1,
      );
      recordSectorWin();
      recordCrescentProgress("skirmishWins");
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
    renderStarport();
    renderCombatTargets();
    updateCombatUi();
    saveGame();
  }

  function setCombatReport(message) {
    state.combat.lastReport = message;
    elements.combatReportText.textContent = message;
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
      recordSectorWin();
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
    renderCombatTargets();
    updateCombatUi();
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

  function hasSeenCurrentPatchNotes() {
    if (patchNotesSeenThisSession) return true;
    try {
      return localStorage.getItem(PATCH_NOTES_SEEN_KEY) === GAME_VERSION;
    } catch (error) {
      return false;
    }
  }

  function markCurrentPatchNotesSeen() {
    patchNotesSeenThisSession = true;
    try {
      localStorage.setItem(PATCH_NOTES_SEEN_KEY, GAME_VERSION);
    } catch (error) {
      // The in-memory marker still prevents repeated prompts in private mode.
    }
  }

  function renderPatchNotes() {
    elements.patchNotesCurrentVersion.textContent = `v${GAME_VERSION}`;
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
    elements.playerNameDisplay.textContent = state.playerName
      ? `指挥官 · ${state.playerName}`
      : "指挥官 · 未命名";
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

  function setBgmVolume() {
    elements.bgmAudio.volume = clamp(state.bgmVolume, 0, 1);
  }

  function startBgm() {
    if (!state.bgmEnabled || !elements.bgmAudio.paused) return;
    setBgmVolume();
    elements.bgmAudio.play().catch(() => {
      // Browsers can require a pointer or keyboard gesture before media playback.
    });
  }

  function stopBgm() {
    elements.bgmAudio.pause();
  }

  function updateBgmControls() {
    elements.bgmStatus.textContent = state.bgmEnabled ? "开" : "关";
    elements.bgmButton.classList.toggle("off", !state.bgmEnabled);
    elements.bgmButton.setAttribute(
      "aria-pressed",
      state.bgmEnabled ? "true" : "false",
    );
    const percentage = Math.round(state.bgmVolume * 100);
    if (Number(elements.bgmVolume.value) !== percentage) {
      elements.bgmVolume.value = String(percentage);
    }
    elements.bgmVolumeValue.textContent = `${percentage}%`;
  }

  function syncBgmState() {
    if (state.bgmEnabled) {
      setBgmVolume();
      startBgm();
    } else {
      stopBgm();
    }
    updateBgmControls();
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
      const rateValue = safeMultiply(
        owned,
        building.baseRate,
        getBuildingMultiplier(building.id),
        getCoreMultiplier(),
        getAchievementMultiplier(),
        getEndgameProductionMultiplier(),
        getStarportProductionMultiplier(),
        safeAdd(1, safeMultiply(getCoreShopRank("automation"), 0.1)),
      );
      rate.innerHTML = `<span>↟</span> ${formatNumber(rateValue)} / 秒 · 单体 ${formatNumber(
        building.baseRate * getBuildingMultiplier(building.id),
      )}`;
      info.append(titleRow, description, rate);

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
    UPGRADES.forEach((upgrade) => {
      const bought = hasUpgrade(upgrade.id);
      const unlocked = state.lifetimeDust >= upgrade.unlock;
      const card = document.createElement("article");
      card.className = `upgrade-card${bought ? " bought" : ""}${
        unlocked ? "" : " locked"
      }`;

      const icon = document.createElement("span");
      icon.className = "upgrade-icon";
      icon.textContent = unlocked ? upgrade.icon : "?";

      const copy = document.createElement("div");
      copy.className = "upgrade-copy";
      const title = document.createElement("h3");
      title.textContent = unlocked ? upgrade.name : "加密研究";
      const description = document.createElement("p");
      description.textContent = bought
        ? "研究已完成"
        : unlocked
          ? upgrade.description
          : `累计获得 ${formatNumber(upgrade.unlock)} 星尘后解锁`;
      copy.append(title, description);

      const button = document.createElement("button");
      button.className = "upgrade-buy";
      button.type = "button";
      button.dataset.upgradeId = upgrade.id;
      button.disabled = bought || !unlocked || state.dust < upgrade.cost;
      button.textContent = bought ? "已完成" : `✦ ${formatNumber(upgrade.cost)}`;

      card.append(icon, copy, button);
      elements.upgradeList.appendChild(card);
    });
    elements.researchCount.textContent = `${state.upgrades.length} / ${UPGRADES.length}`;
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
    elements.collapseButton.disabled = collapseGain < 1;
    elements.collapseButton.querySelector("small").textContent =
      collapseGain > 0
        ? `当前可获得 ${formatNumber(collapseGain, 0)} 枚碎片`
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
    renderMaterialWallet(elements.combatMaterialList, true);
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
      effect.textContent = describeStarportModuleEffect(module, rank);
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starportModule = module.id;
      button.disabled = !unlocked || maxed || !affordable;
      if (!unlocked) {
        button.textContent = "未开放";
      } else if (maxed) {
        button.textContent = "已满级";
      } else {
        button.textContent = `${rank === 0 ? "建造" : "强化"} · ${describeMaterials(cost)}`;
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
    elements.leaderboardCurrentPower.textContent =
      `当前综合战力 ${formatNumber(currentPower, 0)}`;
  }

  function renderAll() {
    renderBuildings();
    renderUpgrades();
    renderAchievements();
    renderCoreShop();
    renderEndgame();
    renderStarport();
    renderCombatTargets();
    renderLog();
    renderLeaderboardSummary();
    updateBuyModeButtons();
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

  function updateUi() {
    const rate = calculateRate();
    const clickValue = getClickValue();
    const gain = getPrestigeGain();
    const units = getTotalUnits();

    updatePlayerNameDisplay();
    elements.dust.textContent = formatNumber(state.dust);
    elements.rate.textContent = `${formatNumber(rate)} / 秒`;
    elements.cores.textContent = formatNumber(state.cores, 0);
    elements.clickYield.textContent = `每次 +${formatNumber(clickValue)}`;
    elements.permanentBoost.textContent = `×${formatNumber(
      safeMultiply(
        getCoreMultiplier(),
        getEndgameProductionMultiplier(),
      ),
    )}`;
    elements.achievementBoost.textContent = `×${getAchievementMultiplier().toFixed(2)}`;
    elements.runDust.textContent = formatNumber(state.runDust);
    elements.unitCount.textContent = formatNumber(units, 0);
    elements.reconstructionCost.textContent = `×${safeMultiply(
      getReconstructionCostMultiplier(),
      getStarportBuildingCostMultiplier(),
    ).toFixed(2)}`;
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
      commandRaidMetric.classList.remove("alert");
      commandRaidMetric.classList.remove("major-alert");
    } else {
      elements.commandRaidStatus.textContent = "尚未解锁";
      commandRaidMetric.classList.remove("alert");
      commandRaidMetric.classList.remove("major-alert");
    }
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

    elements.lifetimeDust.textContent = formatNumber(state.lifetimeDust);
    elements.lifetimeClicks.textContent = formatNumber(state.lifetimeClicks, 0);
    elements.rebirthCount.textContent = formatNumber(state.rebirths, 0);
    elements.playTime.textContent = formatDuration(state.playTime);
    elements.soundButton.querySelector("span").textContent = state.sound ? "♪" : "×";
    elements.soundButton.setAttribute("aria-label", state.sound ? "关闭音效" : "开启音效");
    updateBgmControls();

    updateGoal();
    updateEvent();
    updateCombatUi();
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
    const safePage = PRIMARY_PAGES.includes(pageId) ? pageId : "command";
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
    if (safePage === "leaderboard") {
      renderLeaderboardSummary();
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
    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => {
        activatePrimaryPage(tab.dataset.page, { scroll: true });
      });
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
        activatePrimaryPage(tabs[nextIndex].dataset.page, {
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
        if (tab.id === "log-tab") renderLog();
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
    let nextMeteorAt = performance.now() + randomBetween(5000, 14000);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const starColors = [
      [120, 222, 255],
      [112, 152, 255],
      [190, 139, 255],
      [224, 238, 255],
    ];

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      canvas.width = Math.floor(viewportWidth * ratio);
      canvas.height = Math.floor(viewportHeight * ratio);
      canvas.style.width = `${viewportWidth}px`;
      canvas.style.height = `${viewportHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(
        210,
        Math.max(58, Math.floor((viewportWidth * viewportHeight) / 7200)),
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
      draw(performance.now());
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
        context.shadowBlur = 12;
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
      stars.forEach((star) => {
        star.y += star.speed;
        star.x += star.drift;
        if (star.y > viewportHeight + 2) {
          star.y = -2;
          star.x = Math.random() * viewportWidth;
        }
        if (star.x < -2) star.x = viewportWidth + 2;
        if (star.x > viewportWidth + 2) star.x = -2;
      });
      if (timestamp >= nextMeteorAt && meteors.length < 2) {
        spawnMeteor();
        nextMeteorAt = timestamp + randomBetween(14000, 42000);
      }
      meteors.forEach((meteor) => {
        meteor.x += meteor.velocityX;
        meteor.y += meteor.velocityY;
        meteor.alpha *= 0.994;
      });
      meteors = meteors.filter(
        (meteor) =>
          meteor.alpha > 0.08 &&
          meteor.x - meteor.length < viewportWidth + 80 &&
          meteor.y - meteor.length < viewportHeight + 80,
      );
      draw(timestamp);
      requestAnimationFrame(animate);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    if (!reduceMotion) requestAnimationFrame(animate);
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
        saveGame();
      } else if (backgroundStartedAt !== null) {
        grantInactiveEarnings(backgroundStartedAt, "background");
        backgroundStartedAt = null;
        saveGame();
      }
      lastFrame = performance.now();
      lastWallClock = Date.now();
    });
    const unlockBgm = () => {
      if (state.bgmEnabled) startBgm();
    };
    document.addEventListener("pointerdown", unlockBgm, { once: true, capture: true });
    document.addEventListener("keydown", unlockBgm, { once: true, capture: true });
  }

  function gameLoop(now) {
    if (document.hidden) {
      lastFrame = now;
      lastWallClock = Date.now();
      requestAnimationFrame(gameLoop);
      return;
    }
    const wallNow = Date.now();
    const wallDelta = Math.max(0, (wallNow - lastWallClock) / 1000);
    let delta = clamp((now - lastFrame) / 1000, 0, 0.25);
    if (wallDelta > 1) {
      grantInactiveEarnings(
        wallNow - wallDelta * 1000,
        wallDelta > 10 ? "background" : "none",
      );
      delta = 0;
    }
    lastFrame = now;
    lastWallClock = wallNow;
    const rate = calculateRate();
    if (rate > 0) addDust(safeMultiply(rate, delta));
    state.playTime = safeAdd(state.playTime, delta);

    if (now - lastUi >= UI_INTERVAL) {
      expireTimedEffects();
      processCombatEvents();
      checkAchievements();
      updateUi();
      if (Math.floor(now / 1000) !== Math.floor(lastUi / 1000)) {
        renderBuildings();
        renderUpgrades();
        renderCoreShop();
        renderEndgame();
        renderStarport();
        renderCombatTargets();
        if (state.activePage === "leaderboard") {
          renderLeaderboardSummary();
        }
      }
      lastUi = now;
    }
    if (Date.now() - lastSave >= AUTOSAVE_INTERVAL) saveGame();
    requestAnimationFrame(gameLoop);
  }

  loadGame();
  setupPrimaryNavigation();
  setupTabs();
  setupStarfield();
  bindEvents();
  renderAll();
  globalThis.StellarOutpostCloudBridge = Object.freeze({
    gameVersion: GAME_VERSION,
    saveVersion: SAVE_VERSION,
    createSnapshot: createCloudSaveSnapshot,
    getMetadata: getCloudSaveMetadata,
    getLeaderboardEntry,
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
  requestAnimationFrame(gameLoop);
})();
