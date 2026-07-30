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
  } = numeric;

  const SAVE_KEY = "stellarOutpostIdleSave_v1";
  const SAVE_BACKUP_KEYS = [
    "stellarOutpostIdleSave_v1_backup_1",
    "stellarOutpostIdleSave_v1_backup_2",
    "stellarOutpostIdleSave_v1_backup_3",
  ];
  const SAVE_BACKUP_META_KEY = "stellarOutpostIdleSave_v1_backup_at";
  const SAVE_VERSION = 3;
  const BACKUP_INTERVAL = 5 * 60 * 1000;
  const BASE_MAX_OFFLINE_SECONDS = 8 * 60 * 60;
  const AUTOSAVE_INTERVAL = 10000;
  const UI_INTERVAL = 100;
  const BUILDING_GROWTH = 1.15;
  const PRESTIGE_RATIO_SOFT_CAP = 1e6;
  const PRESTIGE_LATE_POWER = 0.55;
  const CORE_MULTIPLIER_SOFT_CAP = 10000;
  const CORE_MULTIPLIER_LATE_POWER = 0.45;
  const TRANSCEND_CORE_SOFT_CAP = 1e9;
  const TRANSCEND_CORE_LATE_POWER = 0.5;
  const PRIMARY_PAGES = [
    "command",
    "fleet",
    "starport",
    "research",
    "core-shop",
    "combat",
    "transcend",
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
      baseRate: 1.6,
      unlock: 60,
    },
    {
      id: "lab",
      name: "晶体分析舱",
      icon: "⬡",
      description: "从陨晶碎片中分离高纯度星尘。",
      baseCost: 850,
      baseRate: 8.5,
      unlock: 550,
    },
    {
      id: "forge",
      name: "量子熔铸站",
      icon: "◫",
      description: "折叠微观空间，重铸失落的轨道残骸。",
      baseCost: 7200,
      baseRate: 44,
      unlock: 5200,
    },
    {
      id: "relay",
      name: "深空中继环",
      icon: "◎",
      description: "接入远方无人舰队的共享回收网络。",
      baseCost: 64000,
      baseRate: 235,
      unlock: 48000,
    },
    {
      id: "dyson",
      name: "戴森收束阵列",
      icon: "☼",
      description: "截取恒星能量，将光直接凝聚为物质。",
      baseCost: 580000,
      baseRate: 1280,
      unlock: 420000,
    },
    {
      id: "ringYard",
      name: "行星环拆解场",
      icon: "◑",
      description: "从行星环中分拣冰晶、稀有金属与远古残骸。",
      baseCost: 5200000,
      baseRate: 8500,
      unlock: 3500000,
    },
    {
      id: "riftNet",
      name: "裂隙捕获网",
      icon: "⌬",
      description: "在空间裂隙边缘截获被潮汐撕碎的漂流物资。",
      baseCost: 52000000,
      baseRate: 72000,
      unlock: 36000000,
    },
    {
      id: "horizonMine",
      name: "视界潮汐矿场",
      icon: "◉",
      description: "利用黑洞潮汐力拆解高密度天体并回收奇异物质。",
      baseCost: 560000000,
      baseRate: 610000,
      unlock: 380000000,
    },
    {
      id: "cosmicLoom",
      name: "宇宙弦织取机",
      icon: "≋",
      description: "沿宇宙弦抽取真空涨落，将其编织成稳定星尘。",
      baseCost: 6400000000,
      baseRate: 5400000,
      unlock: 4200000000,
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
      cost: 2800,
      unlock: 2100,
      effect: { building: "sail", multiplier: 2 },
    },
    {
      id: "zeroG",
      name: "零重力流水线",
      icon: "∞",
      description: "所有自动产量 ×1.5",
      cost: 16500,
      unlock: 12000,
      effect: { global: 1.5 },
    },
    {
      id: "crystalResonance",
      name: "陨晶共振",
      icon: "⬡",
      description: "分析舱与熔铸站产量 ×2",
      cost: 88000,
      unlock: 65000,
      effect: { buildings: ["lab", "forge"], multiplier: 2 },
    },
    {
      id: "relayProtocol",
      name: "中继共享协议",
      icon: "◎",
      description: "深空中继环产量 ×3",
      cost: 540000,
      unlock: 390000,
      effect: { building: "relay", multiplier: 3 },
    },
    {
      id: "timeFold",
      name: "局部时间折叠",
      icon: "◌",
      description: "所有自动产量 ×2",
      cost: 3200000,
      unlock: 2200000,
      effect: { global: 2 },
    },
    {
      id: "ringDismantling",
      name: "星环剥离协议",
      icon: "◑",
      description: "行星环拆解场产量 ×2",
      cost: 24000000,
      unlock: 16000000,
      effect: { building: "ringYard", multiplier: 2 },
    },
    {
      id: "riftHarmonics",
      name: "裂隙谐振捕获",
      icon: "⌬",
      description: "裂隙捕获网产量 ×2",
      cost: 240000000,
      unlock: 160000000,
      effect: { building: "riftNet", multiplier: 2 },
    },
    {
      id: "horizonAnchors",
      name: "事件视界锚定",
      icon: "◉",
      description: "视界潮汐矿场产量 ×2",
      cost: 2500000000,
      unlock: 1650000000,
      effect: { building: "horizonMine", multiplier: 2 },
    },
    {
      id: "cosmicReclamation",
      name: "终末回收协议",
      icon: "≋",
      description: "宇宙弦织取机产量 ×3",
      cost: 26000000000,
      unlock: 17000000000,
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
      tip: "使用页面顶部的“指挥台、舰队、星港、研究、星核、战斗、超越”导航切换功能；游戏会记住你上次所在的页面。",
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
        "完成研究能显著提高产量；成就提供永久增幅。采集 75K 星尘后，可跃迁并提炼永久生效的星核。",
      tip: "星核既能提供历史累计增幅，也能在交易所兑换永久强化；消费后不会降低历史增幅。",
    },
    {
      eyebrow: "第四步 · 边境防卫",
      icon: "⬡",
      title: "强化舰队，守护基地",
      message:
        "用星尘永久强化战斗力和基地防御。敌对舰队会提前发出袭击预警；防御不足会损失当前星尘，也可主动挑战行星怪物夺取战利品。",
      tip: "敌人会随胜场、星核和轮回次数成长；战斗回收只适合作为补给，自动化生产才是主要资源来源。",
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
        "历史获得 1M 星核后，“超越”页会解锁。奇点坍缩将重置前两层成长，换取永久碎片，并开启持续扩展的边境星区目标。",
      tip: "先完成一次高收益跃迁再坍缩通常能获得更多碎片；协议矩阵可自由选择下一周期的生产、星核、战斗或重建速度。",
    },
  ];

  // An original generative score: no sampled audio and no borrowed melody.
  const BGM_CHORDS = [
    [110, 164.81, 220, 246.94],
    [87.31, 130.81, 164.81, 220],
    [73.42, 110, 146.83, 164.81],
    [98, 146.83, 196, 220],
    [82.41, 123.47, 164.81, 196],
  ];
  const BGM_CHORD_SECONDS = 7.2;
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
      description: "分析近域目标，每级提高 5% 材料掉落并缩短 1.5% 清剿整备时间。",
      effect: "材料掉落",
      effectPerRank: 5,
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
      drops: { alloy: [1, 3] },
    },
    {
      id: "courierDrone",
      name: "失控信使机",
      icon: "⌁",
      location: "近地通信航道",
      basePower: 50,
      baseReward: 70,
      unlock: 100,
      drops: { alloy: [1, 3], crystal: [1, 2] },
    },
    {
      id: "beltRaider",
      name: "岩带掠夺艇",
      icon: "▲",
      location: "碎石带哨区",
      basePower: 90,
      baseReward: 120,
      unlock: 400,
      drops: { alloy: [2, 4], circuit: [0, 1] },
    },
    {
      id: "sporeCloud",
      name: "辐射孢子云",
      icon: "✺",
      location: "电离气团",
      basePower: 145,
      baseReward: 190,
      unlock: 1200,
      drops: { crystal: [2, 4], circuit: [0, 2] },
    },
    {
      id: "smugglerFrigate",
      name: "走私护航艇",
      icon: "◆",
      location: "暗面贸易航线",
      basePower: 235,
      baseReward: 320,
      unlock: 4000,
      drops: { alloy: [2, 5], crystal: [1, 3], circuit: [1, 2] },
    },
    {
      id: "dormantSentinel",
      name: "沉睡哨兵机",
      icon: "◈",
      location: "远古警戒轨道",
      basePower: 380,
      baseReward: 520,
      unlock: 12000,
      drops: { crystal: [2, 5], circuit: [1, 3], relic: [0, 1] },
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
  const ENDGAME_UNLOCK_CORES = 1e6;
  const ENDGAME_PROTOCOLS = [
    {
      id: "production",
      name: "奇点生产矩阵",
      icon: "✦",
      description: "每级使手动与自动星尘产量 ×1.65",
      maxRank: 20,
      baseCost: 1,
      growth: 1.7,
    },
    {
      id: "core",
      name: "超维精炼回路",
      icon: "✣",
      description: "每级使深空跃迁星核产量 ×1.22",
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
      description: "每级使舰队战斗力与基地防御力 ×1.28",
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
    renameButton: $("#rename-button"),
    playerNameDisplay: $("#player-name-display"),
    bgmButton: $("#bgm-button"),
    bgmStatus: $("#bgm-status"),
    bgmVolume: $("#bgm-volume"),
    bgmVolumeValue: $("#bgm-volume-value"),
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
      protocols: freshEndgameProtocolState(),
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
      enemyVictories,
      nextRaidAt: Date.now() + randomBetween(90000, 135000),
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
  let bgmMaster = null;
  let bgmTimer = null;
  let bgmNextChordAt = 0;
  let bgmChordIndex = 0;
  let tutorialIndex = 0;
  let nameDialogRequired = false;
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
      1.65,
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
      1.22,
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
      1.28,
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
    return safeMultiply(1000, safePow(8, rank - 1));
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
      const target = safeMultiply(
        1e18,
        safePow(safeAdd(1, band), 6),
      );
      return {
        level,
        type: "资源航道",
        title: `边境星区 ${level + 1}`,
        description: "在当前航线积累足够星尘，稳定远距离补给通道。",
        current: targetState.runDust,
        target,
        reward,
      };
    }
    if (typeIndex === 1) {
      const target = clampGameCount(
        Math.round(
          safeMultiply(2500, safePow(safeAdd(1, band), 1.65)),
        ),
      );
      return {
        level,
        type: "建设航道",
        title: `边境星区 ${level + 1}`,
        description: "部署指定规模的自动化单元，建立边境工业网络。",
        current: getTotalUnits(targetState),
        target,
        reward,
      };
    }
    const target = safeMultiply(
      1e12,
      safePow(safeAdd(1, band), 4.2),
    );
    return {
      level,
      type: "武装航道",
      title: `边境星区 ${level + 1}`,
      description: "提升舰队战斗力，清除阻挡跃迁坐标的行星威胁。",
      current: getCombatPower(targetState),
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
    return safeAdd(1, safeMultiply(0.25, safePow(rebirths, 0.66)));
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
      safeMultiply(getStarportRank("radar", targetState), 0.05),
    );
  }

  function getStarportCooldownMultiplier(targetState = state) {
    return Math.max(
      0.82,
      1 - getStarportRank("radar", targetState) * 0.015,
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
    return multiplier;
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
    return rate;
  }

  function buildingCost(building, owned, amount, targetState = state) {
    return geometricSeriesCost(
      building.baseCost,
      BUILDING_GROWTH,
      owned,
      amount,
      safeMultiply(
        getReconstructionCostMultiplier(targetState),
        getStarportBuildingCostMultiplier(targetState),
      ),
    );
  }

  function maxAffordable(building, availableDust, owned, targetState = state) {
    return maxAffordableGeometric(
      building.baseCost,
      BUILDING_GROWTH,
      availableDust,
      owned,
      safeMultiply(
        getReconstructionCostMultiplier(targetState),
        getStarportBuildingCostMultiplier(targetState),
      ),
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
    if (safeAmount <= 0) return;
    state.dust = safeAdd(state.dust, safeAmount);
    state.runDust = safeAdd(state.runDust, safeAmount);
    state.lifetimeDust = safeAdd(state.lifetimeDust, safeAmount);
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
      if (showFeedback) {
        showToast(
          "航站记录已同步",
          "当前进度已保存，并保留最近的轮换备份。",
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
    const merged = { ...base, ...raw };
    merged.version = SAVE_VERSION;
    merged.dust = clampGameNumber(raw.dust);
    merged.runDust = clampGameNumber(raw.runDust);
    merged.lifetimeDust = clampGameNumber(
      Math.max(merged.runDust, Number(raw.lifetimeDust) || 0),
    );
    merged.lifetimeClicks = clampGameCount(raw.lifetimeClicks);
    merged.cores = clampGameNumber(Math.floor(Number(raw.cores) || 0));
    merged.totalCores = clampGameNumber(Math.max(
      merged.cores,
      Math.floor(Number(raw.totalCores) || merged.cores),
    ));
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
    merged.endgame.shards = clampGameNumber(
      Math.floor(Number(rawEndgame.shards) || 0),
    );
    merged.endgame.totalShards = clampGameNumber(
      Math.max(
        merged.endgame.shards,
        Math.floor(
          Number(rawEndgame.totalShards) || merged.endgame.shards,
        ),
      ),
    );
    merged.endgame.transcensions = clampGameCount(
      rawEndgame.transcensions,
    );
    merged.endgame.sectorLevel = clampGameCount(rawEndgame.sectorLevel);
    ENDGAME_PROTOCOLS.forEach((protocol) => {
      merged.endgame.protocols[protocol.id] = clamp(
        Math.floor(
          Number(rawEndgame.protocols?.[protocol.id]) || 0,
        ),
        0,
        protocol.maxRank,
      );
    });
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
    const incomingRaider = RAIDERS.find(
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
      enemyVictories,
      nextRaidAt: finiteTimestamp(
        rawCombat.nextRaidAt,
        Date.now() + randomBetween(90000, 135000),
      ),
      incomingRaid: incomingRaider
        ? {
            raiderId: incomingRaider.id,
            power: Math.max(
              1,
              clampGameNumber(
                Math.floor(Number(rawCombat.incomingRaid.power) || 1),
              ),
            ),
            startedAt: finiteTimestamp(rawCombat.incomingRaid.startedAt),
            arrivesAt: finiteTimestamp(
              rawCombat.incomingRaid.arrivesAt,
              Date.now() + 20000,
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
      const resumedRemaining =
        remaining > 0 ? clamp(remaining, 1000, 24000) : 18000;
      state.combat.incomingRaid.startedAt = returnTime;
      state.combat.incomingRaid.arrivesAt = returnTime + resumedRemaining;
      return;
    }
    const remaining = state.combat.nextRaidAt - savedAt;
    state.combat.nextRaidAt =
      returnTime +
      (remaining > 0 ? remaining : randomBetween(25000, 45000));
  }

  function grantInactiveEarnings(savedAt, presentation = "none") {
    const returnTime = Date.now();
    const offlineLimit = getMaxOfflineSeconds(state);
    const elapsed = clamp(
      (returnTime - savedAt) / 1000,
      0,
      offlineLimit,
    );
    const offlineRate = calculateRate(state, false);
    const offlineGain = safeMultiply(offlineRate, elapsed);
    if (offlineGain > 0) {
      addDust(offlineGain);
    }
    if (offlineGain > 0.1 && elapsed > 10) {
      addLog(
        `${presentation === "background" ? "后台" : "离线"}舰队带回了 ${formatNumber(
          offlineGain,
        )} 星尘。`,
      );
      if (presentation === "load") {
        window.setTimeout(() => {
          showModal({
            eyebrow: "离线报告",
            icon: "⌁",
            title: "欢迎返回星港",
            message: `舰队持续工作了 ${formatDuration(elapsed)}，为你回收了 ${formatNumber(
              offlineGain,
            )} 星尘。当前离线收益最多累计 ${formatDuration(offlineLimit)}。`,
            confirmText: "接收物资",
            cancelText: null,
          });
        }, 250);
      } else if (presentation === "background") {
        showToast(
          "后台收益已结算",
          `${formatDuration(elapsed)}内回收了 ${formatNumber(offlineGain)} 星尘。`,
          "⌁",
        );
      }
    }
    resumeCombatTimers(savedAt, returnTime);
    state.lastSeen = returnTime;
    if (state.event?.expires < returnTime) state.event = null;
    if (state.buff?.expires < returnTime) state.buff = null;
    return { elapsed, offlineGain };
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
    const amount = getClickValue();
    addDust(amount);
    state.lifetimeClicks = clampGameCount(state.lifetimeClicks + 1);
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
    if (state.runDust < 75000) return 0;
    const dustRatio = state.runDust / 75000;
    const effectiveRatio = softCapGameNumber(
      dustRatio,
      PRESTIGE_RATIO_SOFT_CAP,
      PRESTIGE_LATE_POWER,
    );
    const baseGain = safePow(effectiveRatio, 0.55);
    return Math.floor(safeMultiply(baseGain, getCoreGainMultiplier()));
  }

  function getCoreTargetForGain(targetGain, targetState = state) {
    const multiplier = Math.max(0.01, getCoreGainMultiplier(targetState));
    const effectiveRatio = safePow(
      targetGain / multiplier,
      1 / 0.55,
    );
    const dustRatio = expandSoftCappedGameNumber(
      effectiveRatio,
      PRESTIGE_RATIO_SOFT_CAP,
      PRESTIGE_LATE_POWER,
    );
    return safeMultiply(
      75000,
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
        state.cores = safeAdd(state.cores, gain);
        state.totalCores = safeAdd(state.totalCores, gain);
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
        saveGame();
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
    state.endgame.shards = safeAdd(
      state.endgame.shards,
      objective.reward,
    );
    state.endgame.totalShards = safeAdd(
      state.endgame.totalShards,
      objective.reward,
    );
    state.endgame.sectorLevel = clampGameCount(
      state.endgame.sectorLevel + 1,
    );
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
        state.endgame.shards = safeAdd(state.endgame.shards, gain);
        state.endgame.totalShards = safeAdd(
          state.endgame.totalShards,
          gain,
        );
        state.endgame.transcensions = clampGameCount(
          state.endgame.transcensions + 1,
        );
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
        checkAchievements();
        renderAll();
        activatePrimaryPage("command", {
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
    return Math.round(
      safeMultiply(
        30,
        safePow(1.42, effectiveLevel),
        coreBoost,
        getCombatCoreMultiplier(targetState),
        getStarportAttackMultiplier(targetState),
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
    return Math.round(
      safeMultiply(
        25,
        safePow(1.44, effectiveLevel),
        coreBoost,
        getCombatCoreMultiplier(targetState),
        getStarportDefenseMultiplier(targetState),
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
    if (type === "attack") {
      return Math.round(
        safeMultiply(
          350,
          safePow(1.72, earlyLevel),
          safePow(1.38, lateLevel),
        ),
      );
    }
    return Math.round(
      safeMultiply(
        300,
        safePow(1.7, earlyLevel),
        safePow(1.37, lateLevel),
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
    const power = Math.round(
      safeMultiply(
        target.basePower,
        safePow(
          1.3,
          Math.min(victories, 24) +
            Math.max(0, victories - 24) * 0.35,
        ),
        coreScale,
        rebirthScale,
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
    const power = Math.round(
      safeMultiply(
        target.basePower,
        safePow(
          1.16,
          Math.min(victories, 20) +
            Math.max(0, victories - 20) * 0.25,
        ),
        coreScale,
        rebirthScale,
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
      return `掉落 +${formatNumber(rank * 5, 0)}% · 整备 -${formatNumber(
        rank * 1.5,
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

  function scheduleNextRaid() {
    state.combat.incomingRaid = null;
    state.combat.nextRaidAt = Date.now() + randomBetween(105000, 175000);
  }

  function createRaid() {
    if (state.lifetimeDust < COMBAT_UNLOCK_DUST) {
      state.combat.nextRaidAt = Date.now() + 30000;
      return;
    }
    const raider = RAIDERS[Math.floor(Math.random() * RAIDERS.length)];
    const adaptiveFactor = clamp(
      0.76 +
        state.combat.raidsSurvived * 0.015 +
        state.rebirths * 0.035,
      0.76,
      1.28,
    );
    const progressThreat = safeAdd(
      30,
      safeMultiply(
        Math.log2(safeAdd(1, state.lifetimeDust)),
        12,
      ),
      safeMultiply(
        Math.log2(safeAdd(1, getHistoricalCores())),
        15,
      ),
      safeMultiply(state.combat.raidsSurvived, 9),
    );
    const adaptiveThreat = safeMultiply(
      getDefensePower(),
      adaptiveFactor,
    );
    const power = Math.max(
      30,
      Math.round(
        safeMultiply(
          Math.max(progressThreat, adaptiveThreat),
          0.92 + Math.random() * 0.2,
        ),
      ),
    );
    const now = Date.now();
    state.combat.incomingRaid = {
      raiderId: raider.id,
      power,
      startedAt: now,
      arrivesAt: now + 24000,
    };
    setCombatReport(
      `袭击预警：${raider.name}将在 24 秒后抵达，敌方战力 ${formatNumber(power)}。`,
    );
    showToast("基地袭击预警", `${raider.name}正在逼近！`, raider.icon);
    playTone(175, 0.35, "sawtooth", 0.032);
  }

  function resolveRaid() {
    const raid = state.combat.incomingRaid;
    if (!raid) return;
    const raider =
      RAIDERS.find((entry) => entry.id === raid.raiderId) || RAIDERS[0];
    const defense = getDefensePower();
    if (defense >= raid.power) {
      const reward =
        safeMultiply(
          Math.max(
            50,
            safeMultiply(raid.power, 0.5),
            safeMultiply(calculateRate(), 2),
          ),
          getBattleRewardMultiplier(),
        );
      addDust(reward);
      state.combat.wins = clampGameCount(state.combat.wins + 1);
      state.combat.raidsSurvived = clampGameCount(
        state.combat.raidsSurvived + 1,
      );
      const message = `防卫成功：基地击退${raider.name}，回收残骸获得 ${formatNumber(
        reward,
      )} 星尘。`;
      setCombatReport(message);
      addLog(message);
      showToast("基地防卫成功", `残骸收益 +${formatNumber(reward)} 星尘`, "⬡");
      playAchievementTone();
    } else {
      const deficit = (raid.power - defense) / raid.power;
      const lossRatio = clamp(0.08 + deficit * 0.34, 0.08, 0.4);
      const loss = safeMultiply(state.dust, lossRatio);
      state.dust = clampGameNumber(state.dust - loss);
      state.combat.losses = clampGameCount(state.combat.losses + 1);
      const message = `基地失守：${raider.name}突破防线，掠走 ${formatNumber(
        loss,
      )} 星尘。`;
      setCombatReport(message);
      addLog(message);
      showToast("基地遭到掠夺", `损失 ${formatNumber(loss)} 星尘`, "!");
      playTone(82, 0.5, "sawtooth", 0.038);
    }
    scheduleNextRaid();
    checkAchievements();
    renderCombatTargets();
    updateCombatUi();
    saveGame();
  }

  function processCombatEvents() {
    const now = Date.now();
    if (state.combat.incomingRaid) {
      if (now >= state.combat.incomingRaid.arrivesAt) resolveRaid();
      return;
    }
    if (now >= state.combat.nextRaidAt) createRaid();
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
      ? "为你的指挥官设置名称。名称会显示在星港顶部，并随本地存档保存。"
      : "输入新的玩家名称，保存后会立即更新指挥官档案。";
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

    if (isFirstName && !state.tutorialSeen && state.lifetimeDust < 1) {
      window.setTimeout(() => openTutorial(0), 220);
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

  function scheduleBgmChord(chord, startTime) {
    if (!audioContext || !bgmMaster) return;
    const duration = BGM_CHORD_SECONDS + 0.8;

    chord.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, startTime);
      oscillator.detune.setValueAtTime((index - 1.5) * 2.5, startTime);
      const peak = index === 0 ? 0.045 : 0.018;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(peak, startTime + 1.7);
      gain.gain.setValueAtTime(peak, startTime + duration - 2.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(bgmMaster);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.05);
    });

    const pulseOrder = [0, 2, 1, 3, 2, 1, 3, 1];
    pulseOrder.forEach((noteIndex, step) => {
      const noteStart = startTime + 0.42 + step * 0.79;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(chord[noteIndex] * 2, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.018, noteStart + 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.72);
      oscillator.connect(gain);
      gain.connect(bgmMaster);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.76);
    });
  }

  function scheduleBgm() {
    if (!audioContext || !bgmMaster || !state.bgmEnabled) return;
    const now = audioContext.currentTime;
    if (bgmNextChordAt < now - 0.5) bgmNextChordAt = now + 0.08;
    while (bgmNextChordAt < now + 0.45) {
      scheduleBgmChord(BGM_CHORDS[bgmChordIndex % BGM_CHORDS.length], bgmNextChordAt);
      bgmChordIndex += 1;
      bgmNextChordAt += BGM_CHORD_SECONDS;
    }
  }

  function setBgmVolume() {
    if (!audioContext || !bgmMaster) return;
    const now = audioContext.currentTime;
    const currentVolume = Math.max(0.0001, bgmMaster.gain.value);
    bgmMaster.gain.cancelScheduledValues(now);
    bgmMaster.gain.setValueAtTime(currentVolume, now);
    bgmMaster.gain.linearRampToValueAtTime(
      Math.max(0.0001, state.bgmVolume),
      now + 0.16,
    );
  }

  function startBgm() {
    if (!state.bgmEnabled || bgmTimer !== null || !ensureAudioContext()) return;
    const filter = audioContext.createBiquadFilter();
    const compressor = audioContext.createDynamicsCompressor();
    bgmMaster = audioContext.createGain();
    bgmMaster.gain.setValueAtTime(0.0001, audioContext.currentTime);
    bgmMaster.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, state.bgmVolume),
      audioContext.currentTime + 1.2,
    );
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1850, audioContext.currentTime);
    filter.Q.setValueAtTime(0.7, audioContext.currentTime);
    compressor.threshold.setValueAtTime(-20, audioContext.currentTime);
    compressor.knee.setValueAtTime(18, audioContext.currentTime);
    compressor.ratio.setValueAtTime(3, audioContext.currentTime);
    bgmMaster.connect(filter);
    filter.connect(compressor);
    compressor.connect(audioContext.destination);
    bgmNextChordAt = audioContext.currentTime + 0.08;
    bgmChordIndex = 0;
    scheduleBgm();
    bgmTimer = window.setInterval(scheduleBgm, 180);
  }

  function stopBgm() {
    if (bgmTimer !== null) {
      window.clearInterval(bgmTimer);
      bgmTimer = null;
    }
    if (!audioContext || !bgmMaster) return;
    const fadingMaster = bgmMaster;
    bgmMaster = null;
    const now = audioContext.currentTime;
    fadingMaster.gain.cancelScheduledValues(now);
    fadingMaster.gain.setValueAtTime(Math.max(0.0001, fadingMaster.gain.value), now);
    fadingMaster.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    window.setTimeout(() => {
      try {
        fadingMaster.disconnect();
      } catch (error) {
        // The node may already be disconnected when the page closes.
      }
    }, 750);
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
      if (audioContext) startBgm();
      setBgmVolume();
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
        : "1M 历史星核起步";

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

  function renderAll() {
    renderBuildings();
    renderUpgrades();
    renderAchievements();
    renderCoreShop();
    renderEndgame();
    renderStarport();
    renderCombatTargets();
    renderLog();
    updateBuyModeButtons();
    updateUi();
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
    const nextCoreTarget = Math.max(
      75000,
      getCoreTargetForGain(gain + 1),
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
      const raider =
        RAIDERS.find((entry) => entry.id === raid.raiderId) || RAIDERS[0];
      const remainingMs = Math.max(0, raid.arrivesAt - now);
      const totalMs = Math.max(1, raid.arrivesAt - raid.startedAt);
      const progress = clamp(1 - remainingMs / totalMs, 0, 1);
      const seconds = Math.ceil(remainingMs / 1000);
      elements.raidMonitor.classList.add("incoming");
      elements.raidState.textContent = "红色警报";
      elements.raidName.textContent = `${raider.icon} ${raider.name}`;
      elements.raidDescription.textContent = `敌方战力 ${formatNumber(
        raid.power,
      )}，基地防御 ${formatNumber(defensePower)}。强化防御仍可改变战果。`;
      elements.raidCountdownLabel.textContent = "距离接触";
      elements.raidCountdownValue.textContent = `${seconds}秒`;
      elements.raidProgressBar.style.width = `${progress * 100}%`;
    } else {
      elements.raidMonitor.classList.remove("incoming");
      elements.raidState.textContent =
        state.lifetimeDust >= COMBAT_UNLOCK_DUST ? "扫描中" : "未解锁";
      elements.raidName.textContent =
        state.lifetimeDust >= COMBAT_UNLOCK_DUST
          ? "航道暂时安全"
          : "边境雷达尚未激活";
      if (state.lifetimeDust >= COMBAT_UNLOCK_DUST) {
        const seconds = Math.max(
          0,
          Math.ceil((state.combat.nextRaidAt - now) / 1000),
        );
        const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
        const secondsText = String(seconds % 60).padStart(2, "0");
        elements.raidDescription.textContent =
          "袭击只在游戏开启时结算，雷达会提前 24 秒发出警报。";
        elements.raidCountdownLabel.textContent = "预计下次信号";
        elements.raidCountdownValue.textContent = `${minutesText}:${secondsText}`;
      } else {
        elements.raidDescription.textContent = `累计采集 ${formatNumber(
          COMBAT_UNLOCK_DUST,
        )} 星尘后，敌对舰队可能袭击基地。`;
        elements.raidCountdownLabel.textContent = "防卫系统待命";
        elements.raidCountdownValue.textContent = "--:--";
      }
      elements.raidProgressBar.style.width = "0%";
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
      elements.commandRaidStatus.textContent = `警报 · ${seconds}秒`;
      commandRaidMetric.classList.add("alert");
    } else if (state.lifetimeDust >= COMBAT_UNLOCK_DUST) {
      const seconds = Math.max(
        0,
        Math.ceil((state.combat.nextRaidAt - Date.now()) / 1000),
      );
      const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
      const secondsText = String(seconds % 60).padStart(2, "0");
      elements.commandRaidStatus.textContent = `${minutesText}:${secondsText}`;
      commandRaidMetric.classList.remove("alert");
    } else {
      elements.commandRaidStatus.textContent = "尚未解锁";
      commandRaidMetric.classList.remove("alert");
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
      const remaining = Math.max(0, 75000 - state.runDust);
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
      message: "这个操作会删除星尘、舰队、研究、成就和星核，且无法撤销。建议先导出存档。",
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(170, Math.floor((window.innerWidth * window.innerHeight) / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.3 + 0.2,
        alpha: Math.random() * 0.55 + 0.12,
        speed: Math.random() * 0.035 + 0.008,
      }));
      draw();
    }

    function draw() {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      stars.forEach((star) => {
        context.beginPath();
        context.fillStyle = `rgba(157, 222, 255, ${star.alpha})`;
        context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        context.fill();
      });
    }

    function animate() {
      stars.forEach((star) => {
        star.y += star.speed;
        if (star.y > window.innerHeight + 2) {
          star.y = -2;
          star.x = Math.random() * window.innerWidth;
        }
      });
      draw();
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
        showToast("背景音乐已开启", "原创深空管风琴乐章开始播放。", "♫");
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
        (!elements.modalBackdrop.hidden || !elements.nameBackdrop.hidden)
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
  if (!state.playerName) {
    window.setTimeout(() => openNameDialog(true), 260);
  } else if (!state.tutorialSeen && state.lifetimeDust < 1) {
    window.setTimeout(() => openTutorial(0), 320);
  }
  requestAnimationFrame(gameLoop);
})();
