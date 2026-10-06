/* Shared by the browser and the deterministic balance simulation. */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.SalvageData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  return Object.freeze({
    VERSION: 32,
    GAME_VERSION: "3.2.0-preview.1",
    PRESTIGE_DUST: 30000000,
    OFFLINE_SECONDS: 8 * 3600,
    MAX_NUMBER: 1e100,
    BUILDINGS: [
      {
        id: "drone",
        name: "拾荒无人机",
        cost: 12,
        growth: 1.16,
        rate: 0.8,
        unlock: 0,
        detail: "把漂浮残骸带回航站。",
      },
      {
        id: "sail",
        name: "光帆采集器",
        cost: 100,
        growth: 1.17,
        rate: 4,
        unlock: 150,
        detail: "展开光帆，接住恒星散落的能量。",
      },
      {
        id: "forge",
        name: "轨道熔铸站",
        cost: 1500,
        growth: 1.19,
        rate: 30,
        unlock: 1500,
        detail: "让废弃金属重新成为舰体。",
      },
      {
        id: "relay",
        name: "深空中继环",
        cost: 20000,
        growth: 1.2,
        rate: 180,
        unlock: 15000,
        detail: "把整条航线连成一张回收网络。",
      },
    ],
    MILESTONES: [10, 25, 50],
    MODULE_MAX_LEVEL: 3,
    MODULE_UPGRADE_SAMPLES: [6, 12],
    ROUTES: [
      {
        id: "industry",
        name: "工业航线",
        subtitle: "让舰队彼此成就",
        detail:
          "无人机每达 10 艘，全舰队产量 +8%（最多 +40%）；设施达到 25 艘时额外产量 ×1.25。适合长时间离线。",
      },
      {
        id: "reclaim",
        name: "回收航线",
        subtitle: "抓住每一次短暂信号",
        detail:
          "扫描收益 ×3；金色信标奖励 ×2，并触发 20 秒双倍生产。扫描随舰队产量成长，适合短时主动游玩。",
      },
      {
        id: "explore",
        name: "探索航线",
        subtitle: "用今天的产量换明天的发现",
        detail:
          "探索时间缩短 35%，产量分流减半；每次探索多带回 1 份样本，风险探索成功率提升至 80%。",
      },
    ],
    RESEARCH: [
      {
        id: "laser",
        name: "聚焦扫描",
        cost: 40,
        unlock: 40,
        detail: "扫描基础收益 ×2。",
      },
      {
        id: "panels",
        name: "光电接续",
        cost: 120,
        unlock: 120,
        detail: "全舰队产量 ×1.2。",
      },
      {
        id: "compact",
        name: "模块化装配",
        cost: 600,
        unlock: 600,
        detail: "所有建筑费用降低 10%。",
      },
      {
        id: "navigation",
        name: "回声导航",
        cost: 900,
        unlock: 600,
        detail: "风险探索成功率 +5%，解锁失落温室航线。",
      },
      {
        id: "network",
        name: "协同网络",
        cost: 2400,
        unlock: 2400,
        detail: "全舰队产量 ×1.35。",
      },
    ],
    MODULES: [
      {
        id: "battery",
        name: "储能矩阵",
        samples: 4,
        detail: "每级全舰队产量 +12%。",
      },
      {
        id: "scanner",
        name: "残骸透镜",
        samples: 4,
        detail: "每级扫描与信标收益 +25%。",
      },
      {
        id: "medbay",
        name: "医疗舱电源",
        samples: 4,
        story: "hospital",
        detail: "每级全舰队产量 +10%。来自废弃医院船。",
      },
      {
        id: "nav",
        name: "惯性导航仪",
        samples: 6,
        detail: "每级探索时间缩短 10%。",
      },
      {
        id: "solar",
        name: "温室集光阵",
        samples: 6,
        story: "garden",
        detail: "每级光帆采集器产量 +30%。来自失落温室。",
      },
    ],
    MISSIONS: [
      {
        id: "wreck",
        name: "废弃医院船",
        seconds: 90,
        diversion: 0.2,
        yieldSeconds: 50,
        samples: 1,
        chance: 1,
        story: "hospital",
        unlockPort: 0,
        detail: "安全探索。船上仍有一个微弱的求救信号。",
      },
      {
        id: "belt",
        name: "寂静残骸带",
        seconds: 120,
        diversion: 0.2,
        yieldSeconds: 75,
        samples: 2,
        chance: 1,
        unlockPort: 0,
        detail: "安全探索。稳定回收星尘和修复航站所需的样本。",
      },
      {
        id: "echo",
        name: "裂隙回声",
        seconds: 150,
        diversion: 0.4,
        yieldSeconds: 150,
        samples: 3,
        chance: 0.65,
        unlockPort: 0,
        detail:
          "自愿风险探索。失败只损失分流时间，仍带回 1 份样本；成功可发现舰装。",
      },
      {
        id: "garden",
        name: "失落温室",
        seconds: 180,
        diversion: 0.25,
        yieldSeconds: 110,
        samples: 3,
        chance: 1,
        story: "garden",
        unlockPort: 1,
        research: "navigation",
        detail: "安全探索。没有人的温室里，仍有一株植物在等待日出。",
      },
    ],
    STORIES: {
      hospital: {
        title: "最后一盏手术灯",
        text: "医院船里没有幸存者。但手术灯仍在亮着，备用电源护着一份没有发出的平安讯息。你准备带回什么？",
        choices: [
          {
            id: "scrap",
            name: "拆解船体",
            detail: "立即获得 60 秒产量的星尘。",
            dustSeconds: 60,
          },
          {
            id: "repair",
            name: "修复备用电源",
            detail: "获得永久舰装「医疗舱电源」，装备后产量 +10%。",
            module: "medbay",
          },
          {
            id: "preserve",
            name: "保留那份讯息",
            detail: "记录故事，并带回额外 3 份航站样本。",
            samples: 3,
          },
        ],
      },
      garden: {
        title: "等不到的日出",
        text: "温室的日历停在很久以前。最后一页写着：如果有人读到这里，请替我们给这株幼苗一次日出。",
        choices: [
          {
            id: "scrap",
            name: "回收光照设备",
            detail: "立即获得 90 秒产量的星尘。",
            dustSeconds: 90,
          },
          {
            id: "repair",
            name: "重新点亮温室",
            detail: "获得永久舰装「温室集光阵」，光帆产量 +30%。",
            module: "solar",
          },
          {
            id: "preserve",
            name: "带着幼苗启航",
            detail: "记录故事，并带回额外 5 份航站样本。",
            samples: 5,
          },
        ],
      },
    },
    PORT: [
      {
        name: "重新点亮通信塔",
        cores: 2,
        samples: 4,
        text: "第一束光离开了寂静航站。远处传来温室的坐标：航线还没有结束。",
      },
      {
        name: "修复跃迁泊位",
        cores: 5,
        samples: 8,
        text: "旧泊位接上了新的电源。船不再只是路过，这里终于可以成为归航的地方。",
      },
      {
        name: "建成归航星港",
        cores: 9,
        samples: 12,
        text: "最后一盏灯亮起。医院船的讯息、温室的幼苗和拾荒者们，都有了回来的地址。",
      },
    ],
    CAPABILITIES: [
      {
        run: 1,
        id: "autoBuy",
        name: "自动购买",
        detail: "每秒按产量回本时间购买，首艘无人机随新航次启航。",
      },
      {
        run: 2,
        id: "planning",
        name: "预算与优先级",
        detail: "可设置保留星尘，并选择均衡、里程碑或高级设施优先。",
      },
      {
        run: 3,
        id: "autoResearch",
        name: "自动研究",
        detail: "每 5 秒研究一项可负担科技，同样遵守预算。",
      },
      {
        run: 4,
        id: "autoDispatch",
        name: "重复派遣",
        detail: "自动收取普通报告并继续安全探索，故事选择由你处理。",
      },
    ],
  });
});
