/* Shared by the browser and the deterministic balance simulation. */
(function (root, factory) {
  const data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.SalvageData = data;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const data = {
    VERSION: 32,
    GAME_VERSION: "3.8.0-preview.1",
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
      {
        id: "message",
        name: "漂泊通信带",
        seconds: 150,
        diversion: 0.2,
        yieldSeconds: 150,
        samples: 4,
        chance: 1,
        story: "relay",
        unlockPort: 3,
        chapter: true,
        requiresStory: "hospital",
        detail: "安全探索。沿着医院船留下的编号，寻找那份讯息的回执。",
      },
      {
        id: "seedbank",
        name: "失重种子库",
        seconds: 210,
        diversion: 0.25,
        yieldSeconds: 160,
        samples: 6,
        chance: 1,
        story: "nursery",
        unlockPort: 3,
        chapter: true,
        project: "relay",
        requiresStory: "garden",
        equipment: { id: "nav", level: 2 },
        detail: "安全探索。装备 2 级惯性导航仪，穿过缓慢旋转的育种舱。",
      },
      {
        id: "horizon",
        name: "黎明边界",
        seconds: 240,
        diversion: 0.3,
        yieldSeconds: 200,
        samples: 8,
        chance: 1,
        story: "horizon",
        unlockPort: 3,
        chapter: true,
        project: "nursery",
        research: "navigation",
        equipment: { id: "scanner", level: 2 },
        detail: "安全探索。装备 2 级残骸透镜，从恒星噪声里辨认另一座航站。",
      },
      {
        id: "white-noise",
        name: "白噪声海观测",
        seconds: 240,
        diversion: 0.3,
        yieldSeconds: 180,
        samples: 8,
        chance: 1,
        story: "observations",
        unlockPort: 3,
        campaign: true,
        project: "lighthouse",
        research: "navigation",
        equipment: { id: "scanner", level: 2 },
        detail: "让无人探针短程往返，核对导航仪与中继互相矛盾的坐标。",
      },
      {
        id: "false-beacon",
        name: "失准信标核验",
        seconds: 270,
        diversion: 0.3,
        yieldSeconds: 210,
        samples: 10,
        chance: 1,
        story: "beacon",
        unlockPort: 3,
        campaign: true,
        project: "lighthouse",
        requiresStory: "observations",
        equipment: { id: "nav", level: 2 },
        detail: "旧信标仍在广播错误坐标。核验它，同时寻找求助频道的声音。",
      },
      {
        id: "first-convoy",
        name: "第一支船队交接",
        seconds: 300,
        diversion: 0.35,
        yieldSeconds: 240,
        samples: 12,
        chance: 1,
        story: "arrival",
        unlockPort: 3,
        campaign: true,
        project: "lighthouse",
        requiresStory: "beacon",
        detail: "只走已经验证的短航段，为等待的船队逐段交接，带他们安全入港。",
      },
      {
        id: "supply-run",
        name: "两港补给线",
        seconds: 180,
        diversion: 0.2,
        yieldSeconds: 130,
        samples: 4,
        chance: 1,
        unlockPort: 3,
        requiresStory: "arrival",
        detail:
          "第一支船队留下了可复用的航路记录。往返两港，稳定回收物资与样本。",
      },
    ],
    PORT_FOCUSES: [
      {
        id: "reception",
        name: "接待扩容",
        samples: 18,
        diversion: 0.85,
        seconds: 1,
        bonusSamples: 0,
        detail:
          "建成备用泊位与轮班宿舍。第四章及后续救援航程分流减少 15%，为在港居民保留更多生产能力。",
        text: "祁岳把铺位、供暖和接班人逐项登记。备用泊位亮起接待灯，承诺有了可以核查的容量。",
      },
      {
        id: "ecology",
        name: "生态补给",
        samples: 18,
        diversion: 1,
        seconds: 1,
        bonusSamples: 2,
        detail:
          "建成育种补给站。第四章及后续救援每次成功归航额外带回 2 份样本，支持持续供给。",
        text: "两港居民在育种舱划出补给区，保留植物休息的光照时段。新来船上的园艺工接过培育表。",
      },
      {
        id: "archive",
        name: "档案校准",
        samples: 18,
        diversion: 1,
        seconds: 0.85,
        bonusSamples: 0,
        detail:
          "建成独立观测档案台。第四章及后续救援航程缩短 15%，让核验过的数据能够重复使用。",
        text: "归航保存原始观测与两港的签名副本。每段航路都标明来源、等待位置和暂停条件。",
      },
    ],
    LOADOUTS: [
      { id: "production", name: "日常生产" },
      { id: "voyage", name: "远航准备" },
    ],
    COUNCIL_MISSIONS: [
      {
        id: "port-council",
        name: "双港会议与离港日志",
        seconds: 150,
        diversion: 0.2,
        yieldSeconds: 150,
        samples: 8,
        chance: 1,
        story: "council-log",
        unlockPort: 3,
        council: true,
        project: "lighthouse",
        requiresStory: "arrival",
        detail: "两港一起核对铺位、供暖与值班能力，重查医院船最后的离港日志。",
      },
      {
        id: "old-observatory",
        name: "旧观测站修复",
        seconds: 300,
        diversion: 0.3,
        yieldSeconds: 210,
        samples: 10,
        chance: 1,
        story: "tide-record",
        unlockPort: 3,
        council: true,
        project: "lighthouse",
        requiresStory: "council-log",
        requiresPortFocus: true,
        research: "navigation",
        equipment: { id: "scanner", level: 2 },
        detail:
          "用苇留下的多年光照记录修补观测空白，验证静潮中实际可通行的窗口。",
      },
      {
        id: "shared-watch",
        name: "分段接续演练",
        seconds: 330,
        diversion: 0.35,
        yieldSeconds: 250,
        samples: 12,
        chance: 1,
        story: "handoff-plan",
        unlockPort: 3,
        council: true,
        project: "lighthouse",
        requiresStory: "tide-record",
        requiresPortFocus: true,
        equipment: { id: "nav", level: 2 },
        detail:
          "无人探针验证双向中继、备用泊位与交班规则，为三支等待的船队制定救援方案。",
      },
    ],
    RESCUE_ENERGY: [
      {
        id: "rotation",
        name: "轮换照明与储能",
        samples: 0,
        seconds: 1.15,
        bonusSamples: 0,
        detail: "按已有值班表轮换灯光与充电。无需样本，救援航程增加 15%。",
        text: "两港错开照明与储能时段，守住供暖和育种所需的电力。慢一点的安排也有完整的救援航路。",
      },
      {
        id: "arrays",
        name: "转接空闲采集阵列",
        samples: 6,
        drones: 10,
        seconds: 0.85,
        bonusSamples: 0,
        detail:
          "需要 10 艘无人机和 6 份样本制作转接件。救援航程缩短 15%，设施与常态产量保留。",
        text: "拾荒队用转接件接入空闲充电阵列，让救援船逐段补能。现有无人机继续工作。",
      },
      {
        id: "observatory",
        name: "回收观测站备用设备",
        samples: 8,
        seconds: 1,
        bonusSamples: 2,
        detail:
          "使用 8 份样本改装备用设备，每队救援额外回收 2 份样本。原始观测与居民住所完整保留。",
        text: "苇把观测记录交给两港保存，维修队只回收已停用的备用设备。留下的灯光仍能让植物休息。",
      },
    ],
    RESCUE_CONFIRMATIONS: [
      {
        id: "observer",
        name: "观测员确认窗口",
        detail: "核对本段观测与暂停条件；窗口关闭时停在已验证的位置。",
      },
      {
        id: "captain",
        name: "船长确认出发",
        detail: "船队知晓等待位置并同意本段出发，中央不能代替船长确认。",
      },
      {
        id: "berth",
        name: "目的港确认接待",
        detail: "祁岳核对泊位、供暖与接班人。接待站准备好后才回应。",
      },
    ],
    KEEPER_PROTOCOL:
      "窗口由观测员确认，出发由船长确认，接待由目的港确认。中央保存原始记录、核验与警告；通信中断时，现场按共同认可的暂停条件等待。任何一方都可以暂停，不把失联当作同意。两港居民与抵达船长共同确认，轮班人员可以继续维护航路。",
    RESCUE_MISSIONS: [
      {
        id: "convoy-relay",
        name: "第一队 · 中继接引",
        seconds: 240,
        diversion: 0.3,
        yieldSeconds: 210,
        samples: 10,
        chance: 1,
        story: "relay-arrival",
        unlockPort: 3,
        rescue: true,
        project: "lighthouse",
        requiresStory: "handoff-plan",
        requiresPortFocus: true,
        research: "navigation",
        equipment: { id: "scanner", level: 2 },
        detail:
          "接引等待名单上的第一队。阿遥在中继重复观测窗口，船长与灯九分别确认出发和接待。",
      },
      {
        id: "convoy-berth",
        name: "第二队 · 备用泊位",
        seconds: 300,
        diversion: 0.35,
        yieldSeconds: 250,
        samples: 12,
        chance: 1,
        story: "berth-arrival",
        unlockPort: 3,
        rescue: true,
        project: "lighthouse",
        requiresStory: "relay-arrival",
        requiresPortFocus: true,
        requiresBackupBerth: true,
        equipment: { id: "nav", level: 2 },
        detail:
          "下一段窗口提前闭合。先安排核验过的备用泊位，待新窗口确认后逐段接回第二队。",
      },
      {
        id: "convoy-light",
        name: "第三队 · 三次灯光",
        seconds: 330,
        diversion: 0.35,
        yieldSeconds: 270,
        samples: 14,
        chance: 1,
        story: "light-arrival",
        unlockPort: 3,
        rescue: true,
        project: "lighthouse",
        requiresStory: "berth-arrival",
        requiresPortFocus: true,
        equipment: { id: "scanner", level: 2 },
        detail:
          "最后一队只能用灯光应答。保持距离，收到约定的三次回应，再传送新的窗口和泊位。",
      },
    ],
    EXPEDITION_PLANS: [
      {
        id: "calibrate",
        name: "校准优先",
        seconds: 0.8,
        diversion: 1.3,
        dust: 0.85,
        samples: 0,
        detail: "集中设备尽快核验坐标；航程短，分流较多，回收星尘较少。",
        report: "探针按校准方案集中往返，优先带回了可复核的坐标。",
      },
      {
        id: "supply",
        name: "补给优先",
        seconds: 1.15,
        diversion: 0.85,
        dust: 1.2,
        samples: 4,
        detail: "多跑一段补给航程；用更长等待换取更多星尘和样本。",
        report: "探针同时运送了补给，等待稍长，带回的物资也更充足。",
      },
      {
        id: "relay",
        name: "分段接续",
        seconds: 1,
        diversion: 0.65,
        dust: 1,
        samples: 2,
        detail: "分批使用现有中继；分流最少，保持生产，并带回额外样本。",
        report: "探针分段接续，两地逐站核对，航站保留了更多生产能力。",
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
      relay: {
        title: "终于收到的回信",
        continuity: {
          story: "hospital",
          choices: {
            scrap:
              "当年拆解医院船时登记的船体编号，替你在漂泊中继中找到了同一条航线。那些金属没有白白离开。",
            repair:
              "修复过的备用电源播出完整离港日志，你沿着其中的通信频段，找到了漂泊中继。那盏灯一直指着这里。",
            preserve:
              "你保存的平安讯息里藏着一个回执地址。如今，星港终于有能力把它送往该去的地方。",
          },
        },
        text: "迟到的回执从远方传来：『这里是灯塔九号。我母亲在那艘船上。谢谢你告诉我她最后做了什么。』回信者阿遥并不要求奇迹，只问这条航线能否再次通行。你准备怎样连接两地？",
        choices: [
          {
            id: "public",
            name: "共享中继频段",
            detail: "带回额外 6 份样本，供两地建设。",
            samples: 6,
          },
          {
            id: "power",
            name: "为通信阵列供电",
            detail: "获得储能矩阵或升 1 级；满 3 级时改为 6 份样本。",
            module: "battery",
            overflowSamples: 6,
          },
          {
            id: "salvage",
            name: "回收废弃中继外壳",
            detail: "获得 120 秒产量的星尘，保留通信核心。",
            dustSeconds: 120,
          },
        ],
      },
      nursery: {
        title: "不只是一株幼苗",
        continuity: {
          story: "garden",
          choices: {
            scrap:
              "回收光照设备时留下的序号，对应着种子库的培育清单。设备离开了旧温室，里面的记录却替更多种子找到了家。",
            repair:
              "重新点亮的温室送来一份发芽记录。失重种子库据此确认：这条航线还有人照顾生命。",
            preserve:
              "你带走的幼苗已经长出新叶。叶片的纹路与种子库的标本一致，它曾经属于一整座尚未醒来的花园。",
          },
        },
        text: "库门后不是燃料，而是数千个休眠的种子盒。园艺员苇的录音说：『别把我的名字刻在墙上。种下它们，等别人来坐一坐。』阿遥发来消息，她的航站能出人手，却缺少可种植的土地。你选择先带回什么？",
        choices: [
          {
            id: "seeds",
            name: "带回种子与培育记录",
            detail: "带回额外 8 份样本，准备永久育种舱。",
            samples: 8,
          },
          {
            id: "light",
            name: "接续旧库的光照阵列",
            detail: "获得温室集光阵或升 1 级；满 3 级时改为 8 份样本。",
            module: "solar",
            overflowSamples: 8,
          },
          {
            id: "tools",
            name: "回收闲置培育机械",
            detail: "获得 150 秒产量的星尘，种子留在恒温箱中。",
            dustSeconds: 150,
          },
        ],
      },
      horizon: {
        title: "有人点亮另一端",
        text: "黎明边界没有宝藏船，只有一座靠轮流停机维持的航站。阿遥站在观测窗前：『你不是来取走最后一点东西的，对吗？』你把星港、种子库和中继的坐标交给她。第一次，屏幕上的航线不再以残骸为终点。远航灯塔需要一份启用宣言。",
        choices: [
          {
            id: "welcome",
            name: "先向漂泊者发出邀请",
            detail: "带回额外 10 份样本，为接待来船做准备。",
            samples: 10,
          },
          {
            id: "archive",
            name: "先校验每一段安全航线",
            detail: "获得惯性导航仪或升 1 级；满 3 级时改为 6 份样本。",
            module: "nav",
            overflowSamples: 6,
          },
          {
            id: "supply",
            name: "先送出一批建设物资",
            detail: "获得 180 秒产量的星尘，完成两地共同回收。",
            dustSeconds: 180,
          },
        ],
      },
      observations: {
        title: "两份互相矛盾的坐标",
        text: "白噪声海里，导航仪和中继读出的位置相差一个航段。祁岳拿出一张补给队的合影：『十一年前，我们相信了一座失准的信标。我的搭档没能回来。』你让无人探针往返三次，留下原始记录。归航确认：这里可以短程通行，但旧坐标不能继续使用。祁岳把自己保存的观测交给你：『先证明每一段都能回来。』",
        continuity: {
          story: "horizon",
          choices: {
            welcome:
              "阿遥记得你向漂泊者发出的邀请。她说，邀请需要一条真正能走的航路。",
            archive: "你先校验安全航线的决定，让祁岳愿意公开旧观测。",
            supply: "你送来的建设物资已经装进探针；两地一起承担这次核验。",
          },
        },
        choices: [
          {
            id: "share",
            name: "公开两地的观测",
            detail: "额外 6 份样本；共同保留可复核的数据。",
            samples: 6,
          },
          {
            id: "verify",
            name: "制作独立校验仪",
            detail: "惯性导航仪升 1 级；满级转为 6 份样本。",
            module: "nav",
            overflowSamples: 6,
          },
          {
            id: "recover",
            name: "回收失准的旧设备",
            detail: "额外获得 150 秒产量的星尘，并保存拆检记录。",
            dustSeconds: 150,
          },
        ],
      },
      beacon: {
        title: "你们能听见吗？",
        text: "旧信标一直广播错误的入口坐标，求助频道却留下了最近的声音。『我们换了三次频率。你们能听见吗？』失联船队没有冲进错误入口，而是停在安全阴影区等待。阿遥握住话筒：『听见了。先留在那里，我们会给出能核验的路线。』你已经找到偏移来源，现在决定交接前先做什么。三种安排都保留安全等待位置。",
        continuity: {
          story: "observations",
          choices: {
            share: "两地公开的观测让船长可以自己核对入口。",
            verify: "独立校验仪辨认出了信标的固定偏移。",
            recover: "拆检旧设备留下的记录，指出了失准的频段。",
          },
        },
        choices: [
          {
            id: "calibrate",
            name: "先校准旧信标",
            detail: "残骸透镜升 1 级；满级转为 6 份样本。",
            module: "scanner",
            overflowSamples: 6,
          },
          {
            id: "aid",
            name: "先送应急供给",
            detail: "额外 8 份样本；船队可以安心等待下一段交接。",
            samples: 8,
          },
          {
            id: "depot",
            name: "先设无人补给点",
            detail: "额外获得 180 秒产量的星尘，留下可交接的补给记录。",
            dustSeconds: 180,
          },
        ],
      },
      arrival: {
        title: "第一支船队，已经进港",
        text: "船队沿着验证过的短航段依次靠港，最后一艘船也完成了人数核对。舱门里带来的有粮食、工具，还有写给园丁苇的信。阿遥把信带到育种舱：『我们替他种下。等下一批孩子来，在树荫下读。』祁岳检查交接记录：『下次谁来接班？』阿遥举起值班表：『先从我的班开始。』船长提醒你，远处的静电正出现十一年前静潮的纹路。归航开始核对旧守灯协议；这一支船队已经安全，你们可以慢慢准备下一步。",
        continuity: {
          story: "beacon",
          choices: {
            calibrate: "校准后的信标给出了第一段可靠的入口坐标。",
            aid: "收到应急供给的船员有了余力，亲自参与逐段核验。",
            depot: "无人补给点成为两地交班的第一个固定位置。",
          },
        },
        choices: [
          {
            id: "watch",
            name: "共同签下值班表",
            detail: "额外 10 份样本；记录两地交接，开放永久两港补给线。",
            samples: 10,
          },
          {
            id: "letters",
            name: "先把信带到育种舱",
            detail:
              "温室集光阵升 1 级；满级转为 8 份样本。开放永久两港补给线。",
            module: "solar",
            overflowSamples: 8,
          },
          {
            id: "unload",
            name: "一起卸下建设物资",
            detail: "额外获得 210 秒产量的星尘。开放永久两港补给线。",
            dustSeconds: 210,
          },
        ],
      },
    },
    RESCUE_STORIES: {
      "relay-arrival": {
        title: "每一段，都有人回应",
        continuity: {
          story: "handoff-plan",
          choices: {
            "joint-watch":
              "上一班留下的值守名单，把阿遥和两港的接班人连在一起。",
            "public-record": "公开的交接记录让每个船长都能检查自己的等待位置。",
            backup: "上次演练保留的备用电源已经送到中继，暂停条件贴在它旁边。",
          },
        },
        text: "静潮到来时，先前抵达的第一支船队留在港内参与接待。等待名单上还有三队，这次接回其中第一队。归航最初建议统一控制每条船的离港许可，可通信一断，现场就没有授权。你把决定拆成三份：观测员确认窗口，船长确认出发，目的港确认接待。阿遥在中继复述坐标，船长读回一遍，祁岳从灯九发出第三次确认。接引船按核验过的短线逐段停靠，没有一盏灯替所有人做决定。第一队安全入港，船长留下自己的应答记录。第二队下一段的窗口提前闭合，阿遥提出把船队安置在已经验证的备用泊位，等待下一次确认。",
        choices: [
          {
            id: "watch",
            name: "把应答交给下一班",
            detail: "额外 8 份样本，接班记录永久保存。",
            samples: 8,
          },
          {
            id: "captains",
            name: "让抵达船长参与核验",
            detail: "惯性导航仪升 1 级；满级转为 8 份样本。",
            module: "nav",
            overflowSamples: 8,
          },
          {
            id: "supply",
            name: "先安置伤员与补给",
            detail: "额外获得 180 秒产量的星尘。",
            dustSeconds: 180,
          },
        ],
      },
      "berth-arrival": {
        title: "等待也有一个地址",
        continuity: {
          story: "relay-arrival",
          choices: {
            watch: "接班人接过第一队的应答记录，知道什么时候应该停止。",
            captains: "刚抵达的船长坐在观测台旁，用自己的航段记录核对新窗口。",
            supply:
              "灯九为伤员腾出的接待位置，让第二队能明确知道到达后的安排。",
          },
        },
        text: "窗口关闭后，第二队在已核验的备用泊位停下。阿遥带着储能与值班组守在中继，祁岳先安排灯九接收需要照护的人。等待没有期限，也不因你离开而变成失败。新的短窗口出现后，观测员重新核对边界，船长自己确认出发，灯九检查泊位与接班人员后才回应。第二队依次越过短线，最后一条船读回接待地址。归航保存了关闭、等待和重新出发的三份记录：一次暂停，也是协议正确工作的结果。还有第三队，通信设备已经失效，只能亮起简单的灯。",
        choices: [
          {
            id: "address",
            name: "公开备用泊位地址",
            detail: "额外 10 份样本，等待记录永久保存。",
            samples: 10,
          },
          {
            id: "care",
            name: "先把下一班照护排好",
            detail: "医疗舱电源升 1 级；满级转为 8 份样本。",
            module: "medbay",
            overflowSamples: 8,
          },
          {
            id: "pause",
            name: "保留关闭窗口的原始记录",
            detail: "额外获得 210 秒产量的星尘。",
            dustSeconds: 210,
          },
        ],
      },
      "light-arrival": {
        title: "先来坐一会儿",
        continuity: {
          story: "berth-arrival",
          choices: {
            address: "备用泊位的公开地址给最后一队留下了能再次等待的位置。",
            care: "照护和接班安排已就绪，灯九在回应之前核查了它们。",
            pause: "上一段关闭窗口的记录提醒观测员，这次也不能凭愿望出发。",
          },
        },
        text: "导航仪找到了第三队的轨道，却不能替代他们的出发意愿。你保持距离，按约定发出三次短脉冲。片刻后，对面也闪了三次。阿遥想起医院船，但她知道这次灯后面有活着的人，正在等待回答。观测员核验新窗口，船长用灯光确认，祁岳读出能接住他们的泊位。最后一条船停稳时，一个孩子举着空水瓶问能不能装满。阿遥说：『能。先来坐一会儿。』归航把等待名单上的三队全部标为安全抵达，先前入港的船队也结束了这一班值守。旧守灯协议仍需明确新的适用范围；两港居民和抵达船长一起等待你的最后核对。",
        choices: [
          {
            id: "water",
            name: "先把水和座位准备好",
            detail: "额外 12 份样本，救援记录永久保存。",
            samples: 12,
          },
          {
            id: "signals",
            name: "把灯光约定留给船长",
            detail: "残骸透镜升 1 级；满级转为 8 份样本。",
            module: "scanner",
            overflowSamples: 8,
          },
          {
            id: "repair",
            name: "安排修船、补给与轮班",
            detail: "额外获得 240 秒产量的星尘。",
            dustSeconds: 240,
          },
        ],
      },
    },
    COUNCIL_STORIES: {
      "council-log": {
        title: "我们今天还能接住谁",
        continuity: {
          story: "arrival",
          choices: {
            watch: "阿遥把第一班值守的名单带到会议上，先问下一班谁来接替。",
            letters:
              "你读给新树的信留在育种舱。新来的居民也愿意为下一支船队留一个地址。",
            unload:
              "第一支船队带来的工具已经入库，祁岳据此重算了扩建和供暖能力。",
          },
        },
        text: "守灯协议把三支等待的船队列为『无法确认接待』。你问归航，这一栏的人应该把船开到哪里，屏幕没有地址。祁岳认真核对铺位、供暖与轮班人数；阿遥把两港的求助频道接进会议室。医院船日志记着十一年前最后一次广播：旧泊位关闭，等待下一次认证窗口。那个窗口没有再来。禾继续照顾伤员，把平安讯息留在备用电源里。阿遥在育种舱坐了一会儿，回来后说：『我希望那时有人接住她。但我不能要求你改写那一天。我想知道的是，我们今天还能接住谁。』两港同意先把建设重点做成实际安排。三支船队仍在安全泊位等待，下一步由你准备。",
        choices: [
          {
            id: "capacity",
            name: "公开接待与轮班清单",
            detail: "额外 6 份样本。开放三种永久建设方向。",
            samples: 6,
          },
          {
            id: "listen",
            name: "先记录每支船队的需要",
            detail: "额外 6 份样本。开放三种永久建设方向。",
            samples: 6,
          },
          {
            id: "source",
            name: "保存原始离港记录",
            detail: "额外 6 份样本。开放三种永久建设方向。",
            samples: 6,
          },
        ],
      },
      "tide-record": {
        title: "有些窗口会再打开",
        continuity: {
          story: "council-log",
          choices: {
            capacity: "两港公开的清单，给每次观测留出了可以接班的人手。",
            listen:
              "等待船队的需求记录提醒大家：确认窗口时，也要确认到达后的补给。",
            source: "保存原始记录的做法，让这次观测仍能追溯每个数据来源。",
          },
        },
        text: "旧观测站失去了数年的航路记录，苇的育种档案却每天记下光照变化。植物经历过的明暗补齐了观测空白。归航核对两份原始资料，发现静潮由多组周期叠加而成；旧网只保存灾难后的短期记录，把所有失联航段标成永久不可用。有些窗口会短暂重开，有些依然不能通过。你们让探针实际往返，只把已经验证的窗口交给船长，并为每段航路标出观察员、交接点和备用泊位。祁岳说：『记录能让别人复核，我才敢交给下一班。』苇留下的是旧录音与植物，新的核验由仍在这里的人完成。",
        choices: [
          {
            id: "crosscheck",
            name: "让两港独立复核",
            detail: "额外 8 份样本。开放分段接续演练。",
            samples: 8,
          },
          {
            id: "light-record",
            name: "保留植物与光照原始记录",
            detail: "温室集光阵升 1 级；满级转为 8 份样本。",
            module: "solar",
            overflowSamples: 8,
          },
          {
            id: "fallback",
            name: "先标出安全等待泊位",
            detail: "额外获得 180 秒产量的星尘。开放分段接续演练。",
            dustSeconds: 180,
          },
        ],
      },
      "handoff-plan": {
        title: "把承诺交给下一班",
        continuity: {
          story: "tide-record",
          choices: {
            crosscheck: "两港的独立复核都已经签名；任何一方都可以提出暂停。",
            "light-record":
              "光照与植物记录留在观测台旁，新来的园艺工也能读懂它们。",
            fallback: "备用泊位先写进交接表，探针每到一站都确认可以安全等待。",
          },
        },
        text: "探针按双向中继逐段往返，在每个交接点先确认观察结果、接班人和备用泊位。归航核验了整套方案：中央保存原始记录并发出警告，现场负责核对自己能看见的航段，任何一站都能暂停。祁岳要求出发前说明谁承担风险、谁来接班、什么情况停止，然后把自己的名字写进第一班名单。阿遥把名单读给等待的船长：『每一段我们都会重新确认。需要停下时，就在已经核验的泊位等。』旧守灯协议仍在运行，但两港已经备好一份可执行、可复核的替代方案。三支船队的正式救援将在第五章开始；现在的等待没有离线惩罚。",
        choices: [
          {
            id: "joint-watch",
            name: "共同签署第一班名单",
            detail: "额外 10 份样本。第四章完成，轮班安排永久归档。",
            samples: 10,
          },
          {
            id: "public-record",
            name: "把交接与暂停条件公开",
            detail: "惯性导航仪升 1 级；满级转为 8 份样本。第四章完成。",
            module: "nav",
            overflowSamples: 8,
          },
          {
            id: "backup",
            name: "再次核对备用泊位",
            detail: "额外获得 210 秒产量的星尘。第四章完成。",
            dustSeconds: 210,
          },
        ],
      },
    },
    CHARACTERS: [
      {
        id: "ayao",
        name: "阿遥",
        role: "灯塔九号通信员",
        story: "relay",
        text: "她收到了母亲禾留下的记录。医院船里没有幸存者；她把那份记忆带到仍然活着的人身边。",
      },
      {
        id: "wei",
        name: "苇",
        role: "已故园丁 · 录音与来信",
        story: "nursery",
        text: "他留下的种子重新发芽。档案中的话来自旧录音，新的来信由两地居民代为收藏。",
      },
      {
        id: "qiyue",
        name: "祁岳",
        role: "灯塔九号维护负责人",
        story: "observations",
        text: "曾因错误信标失去搭档。他需要可复核的航路，也愿意把经验教给能接班的人。",
      },
      {
        id: "home",
        name: "归航",
        role: "归航星港调度程序",
        story: "beacon",
        text: "旧认证曾让它关闭陌生入口。新的观测与交接记录，正成为它学习判断的依据。",
      },
    ],
    LETTERS: [
      {
        id: "relay-duty",
        from: "ayao",
        story: "relay-arrival",
        title: "中继里的下一班",
        text: "今天读回坐标的人，明天也能把记录交给别人。我把每段暂停的位置标在值班表上。灯不是只交给一个人，它也交给下一班。",
      },
      {
        id: "waiting-address",
        from: "qiyue",
        story: "berth-arrival",
        title: "暂停的船也有泊位",
        text: "我以前总想把每一段航程一次排完。今天我们确认窗口关闭，船队有了能安全等待的地址。等下一次打开时，我们重新问一遍：你准备好了么，我们接得住么。",
      },
      {
        id: "living-light",
        from: "ayao",
        story: "light-arrival",
        title: "灯后面的人",
        text: "最后一队回应的时候，我想起禾。过去那一天没有改变，但今天有人抵达，有人问水，有人开始下一班。我想给他们留一张能坐下来的椅子。",
      },
      {
        id: "shared-protocol",
        from: "qiyue",
        story: "light-arrival",
        requiresProtocol: true,
        title: "我们共同签名的规则",
        text: "新守灯协议已经由两港和抵达船长确认。中央继续核验，现场有权暂停，下一班知道如何接替。等待名单清空了，接下来慢慢修船、补给，讨论我们要把这里建成什么样的家。",
      },
      {
        id: "today",
        from: "ayao",
        story: "council-log",
        title: "今天还能接住的人",
        text: "母亲的最后一天已经记在原始日志里。我把那份讯息交给档案，今天的值班名单交给还活着的人。我会接下一班，也会确认有人接我的班。——阿遥",
      },
      {
        id: "light-years",
        from: "wei",
        story: "tide-record",
        title: "多年光照记录",
        text: "第 412 次光照校正：幼苗在长时间阴影后仍能发新叶。原始时段见附表。——苇，旧育种记录。附注：两港观测员已用实际往返验证对应航段，植物记录作为复核资料保存。",
      },
      {
        id: "next-watch",
        from: "qiyue",
        story: "handoff-plan",
        title: "谁来接我的班",
        text: "出发前写清观察员、接班人和暂停条件。我已经签了第一班；下一班也签过以后，我们再把路线交出去。备用泊位始终保留，等待不算失败。——祁岳",
      },
      {
        id: "receipt",
        from: "ayao",
        story: "relay",
        title: "回执已经收到",
        text: "给归航星港：母亲的记录已经收好。我们隔着很长的静电说过话，如今终于可以留下回信的地址。——阿遥",
        continuity: {
          story: "hospital",
          choices: {
            scrap: "你保留的拆解登记，让我们认出了船体编号。",
            repair: "备用电源留下了母亲最后工作的离港日志。",
            preserve: "那份没有发出的平安讯息，如今终于有了收件人。",
          },
        },
      },
      {
        id: "shade",
        from: "wei",
        story: "nursery",
        title: "留给树荫的录音",
        text: "别把我的名字刻在墙上。种下它们，等别人来坐一坐。——苇，旧育种记录",
        continuity: {
          story: "garden",
          choices: {
            scrap: "旧设备回收清单里，仍能查到这一批种子的来处。",
            repair: "你修复的集光阵，给幼苗留下了第一束稳定的光。",
            preserve: "你带回的幼苗，如今已经有了同伴。",
          },
        },
      },
      {
        id: "handoff",
        from: "qiyue",
        story: "observations",
        title: "我的那一份观测",
        text: "我一直留着那张合影。验证航线不会把失去的人带回来，但会让下一班人知道怎么回家。这份原始记录交给你，也请交给接你班的人。——祁岳",
      },
      {
        id: "proof",
        from: "home",
        story: "beacon",
        title: "新的判断依据",
        text: "归档：旧信标坐标失效。新入口包含独立观测、等待位置、求助频段。来船尚未登记，不等于来船没有求助。需要继续核对守灯协议。——归航",
      },
      {
        id: "first-watch",
        from: "ayao",
        story: "arrival",
        title: "第一班值守",
        text: "今天最后一艘船也靠港了。孩子们问，园丁会不会收到那些信。我说，我们把信读给新长的树。下一班我来守频道，你可以去休息。——阿遥",
      },
    ],
    NARRATIVE_SCENES: {
      awakening: {
        title: "本航次可以继续",
        location: "旧航站 · 最初的启动记录",
        lines: [
          {
            speaker: "航站记录",
            text: "接待大厅的屏幕裂着一道长缝，返航泊位栏里只有一个零。你扫描信标，攒够材料，把第一艘无人机缺失的机械臂装好。",
          },
          {
            speaker: "调度程序",
            text: "首批回收已入库。电源能够维持。本航次可以继续。",
          },
          { speaker: "你", text: "我叫你归航，可以吗？" },
          { speaker: "归航", text: "请确认：这是新的工作指令，还是接待目标？" },
          { speaker: "你", text: "暂时只是一个名字。先让这盏灯亮着。" },
        ],
      },
      hospital: {
        title: "留在手术灯下的名字",
        location: "医院船 · 留存记录，录制于十一年前",
        lines: [
          {
            speaker: "登船记录",
            text: "周期性的三声脉冲把你引进医院船。推床固定在地板上，通道没有脚步声。最后一盏手术灯还亮着，但船上没有幸存者。",
          },
          {
            speaker: "归航",
            text: "这不是实时求救。备用电源在重复广播旧记录，录制时间停在十一年前。",
          },
          {
            speaker: "禾 · 留存录音",
            text: "阿遥，别担心。今天还有人需要我。等这趟工作结束，我就回去。",
          },
          {
            speaker: "登船记录",
            text: "她对着镜头整理了一下头发。讯息没有发出，回执栏还是空的。你把发件人的名字从设备清单旁抄下来。",
          },
          {
            speaker: "你",
            text: "材料、电源、讯息，都有能带走的东西。船体编号和她最后工作的记录，也一起留下。",
          },
          {
            speaker: "归航",
            text: "编号与来源已登记。无论这次怎样回收，之后仍能沿这些线索寻找接收地址。",
          },
        ],
        responses: {
          scrap: [
            {
              speaker: "你",
              text: "拆解可用的船体，供给下一批设施。把编号、来源和那份未送达记录留在登记里。",
            },
            {
              speaker: "归航",
              text: "材料已经交接。拆解登记仍能追溯这条航线，回收清单里也保留了禾的名字。",
            },
          ],
          repair: [
            {
              speaker: "你",
              text: "修好备用电源，带回去继续供电。原始离港日志与来源一起保存。",
            },
            {
              speaker: "归航",
              text: "电源能够继续工作。日志里的通信频段仍然可查，那盏灯留下的方向没有被删掉。",
            },
          ],
          preserve: [
            {
              speaker: "你",
              text: "保存讯息和回执地址。不要把播放过，写成已经送达。",
            },
            {
              speaker: "归航",
              text: "状态仍为未送达，原始时间与来源保留。等我们有能力通信，再寻找真正的接收者。",
            },
          ],
        },
      },
      garden: {
        title: "日出计入哪一项",
        location: "失落温室 · 苇留下的培育记录",
        lines: [
          {
            speaker: "温室记录",
            text: "日历停在很久以前，旧主人已经离去。玻璃后仍有一株幼苗，培育箱保存着园艺员苇的最后一页记录。",
          },
          {
            speaker: "苇 · 留存录音",
            text: "如果有人读到这里，请替我们给这株幼苗一次日出。",
          },
          {
            speaker: "归航",
            text: "光照设备可回收，阵列也有修复可能。培育坐标、影像与照料记录能够另存。",
          },
          {
            speaker: "你",
            text: "你一直在算下个航次的产量。日出能够计入什么？",
          },
          { speaker: "归航", text: "目前没有对应项目。" },
          {
            speaker: "你",
            text: "那就在星港窗前留一个位置。幼苗、影像，或者下一位照料者的地址，总有一样能放在那里。",
          },
        ],
        responses: {
          scrap: [
            {
              speaker: "你",
              text: "回收光照设备，让材料支持新的设施。设备序号、培育记录和原地坐标单独归档。",
            },
            {
              speaker: "归航",
              text: "回收物已经交接。设备可以离开旧温室，里面的记录仍能替下一批种子找到来源。",
            },
          ],
          repair: [
            {
              speaker: "你",
              text: "重新点亮温室。把新的发芽记录沿星港频段送回来。",
            },
            {
              speaker: "归航",
              text: "光照恢复，培育地址保留。窗前会存下它的影像，灯按植物需要的时段亮起。",
            },
          ],
          preserve: [
            {
              speaker: "你",
              text: "带着幼苗启航。她的名字和照料记录一起走，不把一个生命写成无名的货物。",
            },
            {
              speaker: "归航",
              text: "幼苗已登记。窗前的位置留给它，苇的托付由下一位照料者继续。",
            },
          ],
        },
      },
      relay: {
        title: "真正的接收者",
        location: "漂泊通信带 · 与灯塔九号的首次交接",
        lines: [
          {
            speaker: "中继记录",
            text: "储存器里挤着多年无人领取的回执，状态栏反复闪过『目的地未认证』。你交出新的星港地址，让回信有一条能返回的路。",
          },
          {
            speaker: "阿遥",
            text: "这里是灯塔九号。我母亲在那艘船上。请你再念一次编号。",
          },
          {
            speaker: "你",
            text: "医院船上没有幸存者。手术灯仍在亮着，备用电源护着她没有发出的讯息。我会把当时带走或留下的东西，连同来源一起告诉你。",
          },
          {
            speaker: "阿遥",
            text: "谢谢你告诉我她最后做了什么。我现在知道，该给谁写下一封信了。离港资料可以核验；私人留言怎样展示，由我们家属确认。",
          },
          {
            speaker: "归航",
            text: "这次回应是实时的，来自仍有居民的灯塔九号。未登记的地址，不等于没有接收者。",
          },
          {
            speaker: "阿遥",
            text: "我没有让你把过去修好。我想知道，现在的航线还能不能通行。",
          },
        ],
        responses: {
          public: [
            {
              speaker: "你",
              text: "共享频段与核验过的离港资料。私人讯息保留来源，由家属决定展示方式。",
            },
            {
              speaker: "阿遥",
              text: "收到。现在写出的下一封信，有可以返回的地址了。",
            },
          ],
          power: [
            {
              speaker: "你",
              text: "先接续阵列的电源，让下一班人不必从断线开始。",
            },
            {
              speaker: "阿遥",
              text: "这次我听清了。等共鸣中继建成，我们就能把交接留给下一班。",
            },
          ],
          salvage: [
            { speaker: "你", text: "回收闲置的外壳，通信核心继续留在航线上。" },
            {
              speaker: "归航",
              text: "外壳可以成为材料，接收者的地址与通信核心仍然保留。",
            },
          ],
        },
      },
      nursery: {
        title: "等别人来坐一坐",
        location: "失重种子库 · 培育与照料记录",
        lines: [
          {
            speaker: "入库记录",
            text: "惯性导航仪把旋转的舱门稳在视野里。旧温室留下的来源记录完成核对，门后不是燃料，而是数千个休眠的种子盒。",
          },
          {
            speaker: "苇 · 留存录音",
            text: "别把我的名字刻在墙上。种下它们，等别人来坐一坐。",
          },
          {
            speaker: "阿遥",
            text: "我发来一张食堂的照片。桌上放的是纸剪的花。我们有人手，也有人会照顾植物，唯独缺少能够种植的地方。",
          },
          {
            speaker: "归航",
            text: "种子、光照阵列和闲置培育机械，都能支持后续育种。未带走的种子继续保存在恒温箱里。",
          },
          {
            speaker: "你",
            text: "先让培育记录和照料者接上。以后来这里的人，也应该有地方坐一会儿。",
          },
        ],
        responses: {
          seeds: [
            {
              speaker: "你",
              text: "把种子和培育记录一起带回星港。先知道怎样照顾它们，再安排下一批种植。",
            },
            {
              speaker: "阿遥",
              text: "灯塔九号会整理照料人员名单。我们能把这件事一起做下去。",
            },
          ],
          light: [
            {
              speaker: "你",
              text: "接续旧库的光照阵列，把培育需要的光带回去。种子的来源继续归档。",
            },
            {
              speaker: "归航",
              text: "光照记录随阵列交接。永久育种舱建成后，照料不会只依赖一趟船。",
            },
          ],
          tools: [
            {
              speaker: "你",
              text: "回收闲置培育机械，供给育种设施。种子留在恒温箱，来源与取用地址不变。",
            },
            {
              speaker: "阿遥",
              text: "有地址，我们就能安排下一批人去取。材料先把种植的地方建起来。",
            },
          ],
        },
      },
      horizon: {
        title: "另一端也有人",
        location: "黎明边界 · 灯塔九号观测窗",
        echoes: [
          {
            story: "relay",
            choices: {
              public:
                "共享的频段让这次抵达能够提前通知居民，核验记录与家属的私人留言分别保管。",
              power:
                "接续过电源的中继把你的抵达消息送到另一端，下一班通信员也能继续使用。",
              salvage:
                "旧中继外壳已经化作新的设施，留在航线上的通信核心仍在替两地传信。",
            },
          },
          {
            story: "nursery",
            choices: {
              seeds:
                "阿遥已经列出能读培育记录的照料者，种子不必只由你一个人看护。",
              light:
                "灯塔九号的园艺员核对了光照阵列的时段，等待育种舱接上照料。",
              tools:
                "培育机械有了新的用途，恒温箱里的种子仍有可以再次取用的地址。",
            },
          },
        ],
        lines: [
          {
            speaker: "观测记录",
            text: "升级后的残骸透镜从恒星噪声里辨认出灯塔九号。航站一半的舷窗是黑的，居民轮流停机，维持另一半区域的供暖。",
          },
          { speaker: "阿遥", text: "你不是来取走最后一点东西的，对吗？" },
          {
            speaker: "你",
            text: "这是星港、中继和种子库的坐标。那边有泊位，有正在生长的东西。我们先确认每一段怎样通行。",
          },
          {
            speaker: "归航",
            text: "地图已连接两座航站。一端有人居住，另一端能够接待；航线第一次不再以残骸为终点。",
          },
          {
            speaker: "阿遥",
            text: "先邀请，先校验，或者先筹集共同建设的物资，都可以从这条路开始。别把任何一件事留给一个人一直做。",
          },
        ],
        responses: {
          welcome: [
            {
              speaker: "你",
              text: "先向漂泊者发出邀请。邀请会写明联络频段，新的航路仍需逐段核验。",
            },
            {
              speaker: "阿遥",
              text: "我会回答他们。邀请需要一条真正能走的路，也需要下一班接待的人。",
            },
          ],
          archive: [
            {
              speaker: "你",
              text: "先校验安全航线。原始位置、时间与判断依据都留给下一班复核。",
            },
            {
              speaker: "归航",
              text: "未确认的路段不会标成安全。抵达与暂停，都有能够追查的依据。",
            },
          ],
          supply: [
            {
              speaker: "你",
              text: "先筹集共同建设的物资。两地一起承担这条航线的准备。",
            },
            {
              speaker: "阿遥",
              text: "我们会清点接待与供暖能力，让承诺有真正能交出去的东西。",
            },
          ],
        },
      },
      "port-lit": {
        title: "先留着",
        location: "第一章章末 · 归航星港",
        lines: [
          {
            speaker: "泊位记录",
            text: "最后一盏泊位灯从暗处亮起来。接待屏幕终于能够登记返航，名单上却仍然只有你的船。",
          },
          {
            speaker: "归航",
            text: "空泊位可以暂时关闭，以节约照明能源。是否执行？",
          },
          { speaker: "你", text: "先留着。" },
          {
            speaker: "归航",
            text: "泊位保留。星港已有通信地址，下一段回信可以沿这里返回。",
          },
        ],
      },
      "relay-built": {
        title: "收到，归航星港",
        location: "永久建设 · 共鸣中继",
        lines: [
          {
            speaker: "建设记录",
            text: "共鸣中继接上电源，两地同时核对呼叫与回执。静电退下去，声音第一次不需要靠猜。",
          },
          { speaker: "阿遥", text: "收到，归航星港。这里是灯塔九号。" },
          {
            speaker: "归航",
            text: "双向回应已核验。通信地址留在交接记录里，不只属于这次航行的人。",
          },
        ],
      },
      "nursery-built": {
        title: "下一个春天",
        location: "永久建设 · 育种舱",
        lines: [
          {
            speaker: "培育记录",
            text: "第一个芽顶开培养层。照料记录、取用地址与种子的名字放在同一份档案里。",
          },
          { speaker: "归航", text: "新的培育项目已经建立。请填写名称。" },
          { speaker: "你", text: "下一个春天。以后来这里的人，也可以继续写。" },
          {
            speaker: "阿遥",
            text: "我们的照料者会接下一班。窗前的椅子，也记在需要的东西里。",
          },
        ],
      },
      "lighthouse-built": {
        title: "归航地址已确认",
        location: "第二章章末 · 远航灯塔",
        echoes: [
          {
            story: "horizon",
            choices: {
              welcome:
                "启用记录保留了向漂泊者的邀请，下一项工作是证明每一段都能走。",
              archive:
                "启用记录保留了独立校验的安排，原始观测会交给两地共同复核。",
              supply:
                "启用记录保留了共同建设的物资安排，下一次探测由两地一起准备。",
            },
          },
        ],
        lines: [
          {
            speaker: "灯塔记录",
            text: "远航灯塔亮起，另一端的航站也传来回应。两地之间已有一条可核验的路，往返工作开始排进交接表。",
          },
          { speaker: "阿遥", text: "今天的日志，我想写：归航地址已确认。" },
          {
            speaker: "归航",
            text: "地址确认。每次新派遣仍要核对路线与条件，灯亮着不等于所有航路都已经安全。",
          },
          {
            speaker: "你",
            text: "那就从下一段实际观测开始。把能回来的人，写进这张地图。",
          },
        ],
      },
    },
    MIDDLE_SCENES: {
      observations: {
        title: "先证明每一段都能回来",
        location: "白噪声海 · 无人探针观测记录",
        lines: [
          {
            speaker: "观测记录",
            text: "同一次回传里，惯性导航仪和中继读出的位置相差一个航段。两份记录的时间没有错，入口却不能同时成立。",
          },
          {
            speaker: "祁岳",
            text: "十一年前，我们也收到过一个明确的归航信标。我把它当成了已经核验的路。",
          },
          {
            speaker: "观测记录",
            text: "祁岳把补给队的合影放在观测台旁，指向其中一艘船。那艘船上是他的搭档，后来没有回来。",
          },
          {
            speaker: "你",
            text: "这次先让无人探针短程往返。把出发、抵达和返回的原始记录分开保存，不让船员替一张旧地图试路。",
          },
          {
            speaker: "归航",
            text: "实际往返已经完成核对。这里有能够短程通行的部分，旧入口坐标仍不能继续使用。",
          },
          {
            speaker: "阿遥",
            text: "我们发出去的邀请，也要写清哪些段已经验证，哪些地方还在等待。",
          },
          {
            speaker: "祁岳",
            text: "我把旧观测交给你。先证明每一段都能回来，再把它交给下一班。",
          },
        ],
        responses: {
          share: [
            {
              speaker: "你",
              text: "把两地的原始观测一起公开，保留时间和来源。下一班不需要相信某个人的结论，也能自己复核。",
            },
            {
              speaker: "祁岳",
              text: "我会把不同意见也留下。两边能够指出同一份记录里的问题，这条路才可以继续核验。",
            },
          ],
          verify: [
            {
              speaker: "你",
              text: "制作独立校验仪。导航仪和中继之外，再留一份能追溯的判断。",
            },
            {
              speaker: "归航",
              text: "校验记录已保存。设备给出新的证据，出发前仍要核对本段实际条件。",
            },
          ],
          recover: [
            {
              speaker: "你",
              text: "拆检失准的旧设备，回收可用材料。偏移、编号和拆检结果另外存档。",
            },
            {
              speaker: "祁岳",
              text: "设备拆下来以后，错误也有了可以查明的来源。不要把旧入口的问题一起抹掉。",
            },
          ],
        },
      },
      beacon: {
        title: "听见了，先留在那里",
        location: "失准信标 · 安全等待区求助频道",
        lines: [
          {
            speaker: "核验记录",
            text: "旧信标仍在广播多年以前的入口。固定偏移已经找到，求助频道里却传来一段近期的声音。",
          },
          { speaker: "来船船长", text: "我们换过三次求助频段。你们能听见吗？" },
          {
            speaker: "阿遥",
            text: "听见了。先留在那里。请读回你们现在的位置，不要按旧入口出发。",
          },
          {
            speaker: "来船船长",
            text: "碎石阴影后面，轨道暂时稳定。我们还有人能够值班，但不能再拿船试那个入口。",
          },
          {
            speaker: "归航",
            text: "等待位置已登记。下一段交接需要新的核验，收到求助不会自动生成离港许可。",
          },
          {
            speaker: "你",
            text: "先把信标、应急供给和补给点里的工作安排好。无论先做哪一项，你们的等待地址都保留。",
          },
        ],
        responses: {
          calibrate: [
            {
              speaker: "你",
              text: "先校准旧信标，把偏移前后的读数一起交给船长。下一段仍按新的实际观测核对。",
            },
            {
              speaker: "来船船长",
              text: "新的入口读数收到。我们先复核，等交接点回应后再出发。",
            },
          ],
          aid: [
            {
              speaker: "你",
              text: "先送出应急供给。把补给送到已登记的等待位置，不要求你们提前越过未确认的路。",
            },
            {
              speaker: "阿遥",
              text: "船员有余力接下一班了。等待期间的需要也会留在交接记录里。",
            },
          ],
          depot: [
            {
              speaker: "你",
              text: "先设无人补给点。取用、维护和下一次核验的位置都写进记录。",
            },
            {
              speaker: "来船船长",
              text: "补给地址收到。下一支来船也能知道在哪里等待，不必重新寻找一遍。",
            },
          ],
        },
      },
      arrival: {
        title: "先从我这一班开始",
        location: "归航星港 · 第一支船队入港交接",
        lines: [
          {
            speaker: "入港记录",
            text: "第一支船队沿核验过的短航段依次靠港。最后一艘船停稳，人数和接待位置完成核对，舱门里带来食物、工具与写给园丁苇的信。",
          },
          {
            speaker: "阿遥",
            text: "信放在育种舱吧。苇留下的是记录和植物，新的照料由我们继续。等下一批孩子来，可以在树荫下读。",
          },
          {
            speaker: "祁岳",
            text: "这班的观测时间、出发和接待都对上了。下次谁来负责交接？",
          },
          {
            speaker: "阿遥",
            text: "先从我这一班开始。下一班的名字也要一起写。",
          },
          {
            speaker: "来船船长",
            text: "远处的静电纹路在扩大，像十一年前的静潮。外面还有三支船队，没有跟我们一起进港。",
          },
          {
            speaker: "归航",
            text: "本次船队已安全抵达。旧守灯协议正在重新核对，等待名单上的另外三队仍在安全位置。",
          },
          {
            speaker: "你",
            text: "先把这一班能交出去的东西留下。再准备接下一批人，不让一次抵达变成最后一次回答。",
          },
        ],
        responses: {
          watch: [
            {
              speaker: "你",
              text: "一起签下值班表。每段观测和接待都留给下一位负责人。",
            },
            {
              speaker: "阿遥",
              text: "名单已交接。两港补给线可以继续运行，我也会把下一班需要的记录带去会议。",
            },
          ],
          letters: [
            {
              speaker: "你",
              text: "先把信带到育种舱。给它们留下来源，也给下一位来读信的人留一个位置。",
            },
            {
              speaker: "阿遥",
              text: "信已经放好。苇不会回来，但新来的居民能够继续照料这些植物，也能沿两港补给线往返。",
            },
          ],
          unload: [
            {
              speaker: "你",
              text: "一起卸下建设物资。先知道真正能交出去多少，再安排下一批接待。",
            },
            {
              speaker: "祁岳",
              text: "工具与物资已入库。两港补给线继续开放，会议会据此重算供暖和扩建能力。",
            },
          ],
        },
      },
      "council-log": {
        title: "这一栏的人，该去哪里",
        location: "两港会议 · 医院船原始离港日志",
        echoes: [
          {
            story: "hospital",
            choices: {
              scrap:
                "拆解清单仍保留医院船的编号与来源，原始离港记录能够对应到禾工作的那艘船。",
              repair:
                "修复备用电源时保存的离港日志与通信频段，成为这次两港共同核验的来源。",
              preserve:
                "禾的讯息仍保留原始时间与未送达状态，私人留言的展示由阿遥与家属确认。",
            },
          },
        ],
        lines: [
          {
            speaker: "会议记录",
            text: "三支等待的船队被旧守灯协议归入『无法确认接待』。名单有船名和需要，却没有能够前往的接待地址。",
          },
          { speaker: "你", text: "这一栏的人，应该把船开到哪里？" },
          {
            speaker: "归航",
            text: "旧协议没有给出地址。现有铺位、供暖与轮班能力需要重新核对。",
          },
          {
            speaker: "祁岳",
            text: "我不会把他们写成负担。可我们得说明，有多少人能够值下一班，哪些地方真正能够住下。",
          },
          {
            speaker: "离港日志 · 历史广播",
            text: "旧泊位关闭。医疗船应等待下一次认证窗口。",
          },
          {
            speaker: "会议记录",
            text: "十一年前的下一次窗口没有再来。禾继续照顾伤员，把没有发出的平安讯息留在备用电源里。阿遥关掉日志，到育种舱坐了一会儿，然后回到会议桌旁。",
          },
          {
            speaker: "阿遥",
            text: "我希望那时有人接住她。但我不能要求你替她改写那一天。我想知道的是，我们今天还能接住谁。",
          },
          {
            speaker: "你",
            text: "把承诺拆成实际工作。接待、生态和档案都有人负责，再决定先把哪一项建设起来。",
          },
        ],
        responses: {
          capacity: [
            {
              speaker: "你",
              text: "先公开铺位、供暖与轮班清单。能接住多少人，由实际安排说明。",
            },
            {
              speaker: "祁岳",
              text: "清单已交给两港复核。接待、生态与档案三种建设方向都留在会议里，下一步由你安排。",
            },
          ],
          listen: [
            {
              speaker: "你",
              text: "先听每支船队现在需要什么。把等待位置、照护和补给分别记下来。",
            },
            {
              speaker: "阿遥",
              text: "三队的需要已记录。他们仍在安全泊位，接待、生态与档案都可以成为下一项实际建设。",
            },
          ],
          source: [
            {
              speaker: "你",
              text: "先保存原始离港记录。留下来源与时间，不让一次关闭只剩下一句没有依据的结论。",
            },
            {
              speaker: "归航",
              text: "原始记录已归档。三种建设方向保持开放，新的接待安排将依据可核验的资料制定。",
            },
          ],
        },
      },
      "tide-record": {
        title: "植物记住了那些明暗",
        location: "旧观测站 · 光照与航路资料交叉核验",
        echoes: [
          {
            story: "garden",
            choices: {
              scrap:
                "温室设备序号、培育记录与原地坐标仍在档案里，回收过的设备也能追溯当时的光照来源。",
              repair:
                "重新点亮温室后回传的发芽与光照记录，接续了苇留下的早期培育档案。",
              preserve:
                "随船幼苗的具名照料记录，与苇留下的种子库资料一起进入核验。",
            },
          },
        ],
        lines: [
          {
            speaker: "观测站记录",
            text: "航路档案缺失了数年，苇的培育表却保留着每天的光照变化。两地居民把植物经历过的明暗，与旧观测的原始时间逐项对照。",
          },
          {
            speaker: "阿遥",
            text: "苇当时只是想让植物长好。这些记录今天也能帮助另一批人找到路。",
          },
          {
            speaker: "归航",
            text: "资料核对完成。静潮由多组周期叠加，旧网只保存了灾难后的短期观测，不能据此认定每个失联航段永远不可用。",
          },
          {
            speaker: "你",
            text: "哪些窗口会再打开，就让探针实际往返。没有验证的部分继续保留原状，不把希望填进坐标。",
          },
          {
            speaker: "观测站记录",
            text: "部分短窗口完成往返核验，另一些航段仍然不能通过。每段可用路线旁都标出了观察员、交接点和安全等待的位置。",
          },
          {
            speaker: "祁岳",
            text: "别人能复核这些记录，我才敢交给下一班。需要停下时，也得知道停在哪里。",
          },
        ],
        responses: {
          crosscheck: [
            {
              speaker: "你",
              text: "让两港分别复核。把不同意见、签名与暂停条件一起留给下一班。",
            },
            {
              speaker: "祁岳",
              text: "双方记录已保存。任何一方发现条件不符，都能够提出暂停。",
            },
          ],
          "light-record": [
            {
              speaker: "你",
              text: "保留植物与光照的原始资料。让新的园艺工也能看懂这些判断怎样得来。",
            },
            {
              speaker: "阿遥",
              text: "培育与观测记录放在一起。苇留下的是历史资料，新的核验由现在的人继续。",
            },
          ],
          fallback: [
            {
              speaker: "你",
              text: "先标出安全等待泊位。出发前就知道下一段关闭时能到哪里停下。",
            },
            {
              speaker: "归航",
              text: "等待地址已写入交接表。窗口关闭会触发暂停，不会把等待改写成失败。",
            },
          ],
        },
      },
      "handoff-plan": {
        title: "谁承担，谁接班，何时暂停",
        location: "双向中继 · 无人探针分段接续演练",
        lines: [
          {
            speaker: "演练记录",
            text: "探针在每个交接点读回窗口、接班人和备用泊位。两地按同一份暂停条件逐站核对，出发与返回分别留下记录。",
          },
          {
            speaker: "归航",
            text: "新方案完成核验。中央保存原始资料并预警，现场核对自己能够看见的航段。任何一站都能提出暂停。",
          },
          {
            speaker: "祁岳",
            text: "出发前说明三件事：谁承担这段风险，谁能来接班，什么情况停止。我的名字可以放在第一班里。",
          },
          {
            speaker: "阿遥",
            text: "我会把名单读给每位船长。需要停下时，就在已核验的泊位等，下一段重新确认。",
          },
          {
            speaker: "你",
            text: "让承诺有能交出去的记录。你们也能把这班工作留给别人，而不必一直守在同一个位置。",
          },
          {
            speaker: "归航",
            text: "旧守灯协议仍在运行，替代方案已经备好。等待名单仍有三队；正式救援需要下一章逐队安排供电和出发确认。",
          },
        ],
        responses: {
          "joint-watch": [
            {
              speaker: "你",
              text: "共同签下第一班名单。每个人的工作和接班方式一起保存。",
            },
            {
              speaker: "阿遥",
              text: "名单已交接。三队还在安全等待位置，下一次工作从实际供电与逐队确认开始。",
            },
          ],
          "public-record": [
            {
              speaker: "你",
              text: "公开每个交接点与暂停条件。让船长也能核对自己的出发依据。",
            },
            {
              speaker: "归航",
              text: "交接记录已保存。中央的核验不替代船长与接待点的应答，正式救援仍等待新的确认。",
            },
          ],
          backup: [
            {
              speaker: "你",
              text: "再核对一遍备用泊位，把地址与备用电源的交接写清楚。",
            },
            {
              speaker: "祁岳",
              text: "备用安排已归档。出现暂停时能留在安全位置，供电与三队的实际出发将在下一步分别安排。",
            },
          ],
        },
      },
      "port-reception-built": {
        title: "一个床位，不只是一张床",
        location: "港务建设 · 接待扩容",
        lines: [
          {
            speaker: "建设记录",
            text: "备用泊位与轮班宿舍建成。祁岳把铺位、供暖、照护和接班人分别登记，空栏也保留给下一班检查。",
          },
          {
            speaker: "祁岳",
            text: "一张床不是完整的接待。灯谁开，坏了谁修，前一班睡下以后谁来回答，都得写出来。",
          },
          {
            speaker: "阿遥",
            text: "灯塔九号也会核对自己的名单。来船抵达前，两端都要确认真正能交接的容量。",
          },
          {
            speaker: "归航",
            text: "接待扩容已生效。建设支持后续航程，不能代替每队自己的出发与接待确认。",
          },
        ],
      },
      "port-ecology-built": {
        title: "植物也需要休息的那一班",
        location: "港务建设 · 生态补给",
        lines: [
          {
            speaker: "建设记录",
            text: "育种补给区建成，两地居民核对种子来源、取用与培育时段。新来船上的园艺工接过记录，保留植物休息的光照安排。",
          },
          {
            speaker: "阿遥",
            text: "补给能够继续，也要有人记得什么时段让灯暗下来。照料不是让每一盏灯一直亮着。",
          },
          {
            speaker: "你",
            text: "把取用与照料放在同一张表里。下一批人来到这里，也能知道怎样继续。",
          },
          {
            speaker: "归航",
            text: "生态补给已生效。培育与来源记录保留，三队的实际救援仍需要单独核验。",
          },
        ],
      },
      "port-archive-built": {
        title: "给下一班留下判断的依据",
        location: "港务建设 · 档案校准",
        lines: [
          {
            speaker: "建设记录",
            text: "独立观测档案台建成。归航保存原始数据与两港的签名副本，每段路线旁都标明来源、等待位置和暂停条件。",
          },
          {
            speaker: "祁岳",
            text: "留给下一班的要有判断依据。读完记录，他们能够指出哪里还不能走，而不只是重复我们的结论。",
          },
          {
            speaker: "你",
            text: "把关闭窗口的记录也留下。知道什么时候暂停，和知道什么时候出发，一样需要证据。",
          },
          {
            speaker: "归航",
            text: "档案校准已生效。旧记录可以复核，每队正式出发时仍需新的窗口和接待应答。",
          },
        ],
      },
    },
    EPILOGUE_INTRO: [
      "数周后，港务会议终于没有被紧急警报打断。人们知道异常潮汐仍可能回来，也知道什么时候暂停、在哪里等待，以及怎样重新核验航路。今天要决定的，不是谁独自守完下一班，而是谁能接过这座星港。",
      "一位新抵达的园丁带来了异地培育报告，勘察队也带回了探针核验的宜居轨道资料。接待、守望或远航，都有参与的人和可执行的安排。先听完三份交接，再共同选择星港的未来。没有隐藏善恶分数，过去的建设不会锁住任何结局。",
    ],
    EPILOGUE_HANDOFFS: [
      {
        id: "ayao",
        title: "阿遥 · 从等待到回应",
        paragraphs: [
          "阿遥把母亲禾的家用接收器从独立求助频段上拆下来。那段留言的来源与时间已经确认，经过家属同意，被放进居民能够查阅的档案里。禾没有回来；保存她的声音，不再意味着一直等一个不会抵达的回答。",
          "她报名参加下一季通信员训练，也开始教新来的孩子辨认交接信号。『我还会留着这台接收器。只是今天值班时，我想先回答正在找路的人。』",
        ],
        label: "记录阿遥的通信交接",
      },
      {
        id: "qiyue",
        title: "祁岳 · 可以交出去的班表",
        paragraphs: [
          "祁岳把维护计划铺在桌上：每一项检修都有下一位负责人，独立观测、原始资料和暂停条件放在同一张交接表上。另一个人按表核对了一遍，不需要叫醒他来解释。",
          "他仍然反对未经验证的远征，但愿意替新航路做观测。『我想要的不是所有船永远停在这里。我想要的是，我不在岗的时候，它们也能安全回来。』他把第一班交了出去。",
        ],
        label: "记录祁岳的维护交接",
      },
      {
        id: "wei",
        title: "苇 · 两个地址的春天",
        paragraphs: [
          "苇留下的幼苗已经能够分株。新抵达的园丁愿意带走一部分，也愿意留在这里教人培育；每一份都保留名字、来源和照料记录，不让赠送变成另一次失散。",
          "育种舱窗前真的摆上了椅子。苇没有回来，她写过的愿望却不再只是一行字：来接班的人可以坐一会儿，植物按自己的时段获得休息与光。种子后代可以留在星港，也可以去经过核验的新地方。",
        ],
        label: "记录种苗与照料者的交接",
      },
    ],
    ENDINGS: [
      {
        id: "city",
        title: "归航之城",
        proposal: "reception",
        summary:
          "开放的共同星港：公开容量、轮班与安全窗口，让每座航站参与航路规则。",
        paragraphs: [
          "你选择建立一座开放的共同星港。容量、轮班、安全窗口和暂停条件公开，由参与航站共同制定与维护。来船先与最近的交接点联系，再沿核验过的路段入港。",
          "资源仍然有限。没有空泊位时，接待员明确给出备用等待位置、补给办法和下一次联系时间。新的扩建与交易继续进行，归航地址不再依赖你一个人守着。",
          "第一次普通交班后，你坐到育种舱窗前。阿遥递来一杯水，问下一航次去哪里。你说，先把今天这一班交完。归航确认你已经下班，接待频道传来三号泊位的呼叫；你还没起身，另一个人已经回答。",
          "窗前的灯依照植物需要的时段亮起。医院船上的人没有回来，苇也没有回来，但有人坐在她希望有人坐下的地方。港务会议共同确认的文字留在屏幕上。",
        ],
        quote: "这里是归航星港。请报告位置，我们会与你确认下一段航路。",
      },
      {
        id: "watch",
        title: "守望之港",
        proposal: "archive",
        summary:
          "可靠的守望港：明确接待容量与审核，保护生态，为等待的船保留下一次交接。",
        paragraphs: [
          "你选择先建设一座可靠的守望港。祁岳完善独立审核，阿遥保证求助频道持续有人值班。未能立即入港的船，得到安全等待位置、补给安排和下一次交接时间。",
          "旧档案由居民与相关家属共同管理，重要航路资料另做公开副本。温室恢复的生态受到保护，增加接待量之前，先确认供暖、种植和人员交接能力。",
          "一年后，祁岳培养出的第二批维护员第一次独立值班。阿遥到另一座航站教通信课程，你带着新回收的设备入港。频道里有人准确报出泊位与补水点，程序顺畅地接过船上的工作记录。",
          "育种舱里的椅子已经重新摆过，桌上放着一封外地寄来的培育报告。这里在自己的能力范围内，稳定接住了越来越多的人。",
        ],
        quote: "这里是归航星港。我们为你保留了交接时间。",
      },
      {
        id: "voyage",
        title: "携种远航",
        proposal: "ecology",
        summary:
          "补给与培育基地：留守者继续接待，志愿远航队携带种子和档案前往探针核验的轨道。",
        paragraphs: [
          "你选择把星港建成长期补给与培育基地，再组织远航队前往探针已经验证、具备种植条件的行星轨道。沿线守望港继续运转，居民自由选择留守或出发，两地准备多份种子、技术资料与航路档案副本。",
          "阿遥留在中继调度新航线，祁岳带人继续检修星港。船队由受过培训的成员共同管理。你交接星港工作后，与愿意同行的人启航。归航的授权副本负责船上核验，主程序留在星港接待来船。",
          "抵达后，船队用地面测量再次确认探针资料，建立第一处安全站，先种实验苗，再逐步增加适合当地的品种。信标持续报告航路与补给状态。",
          "第二个生长季，树苗在土地里长出新叶。你站在自然光里把发芽记录传回星港，阿遥送来接待区的录音：有人为下一批来船补水、交班、安排休息。幼苗后代有的留在这里，有的仍在星港窗前。两个地址都有人照顾它们。",
        ],
        quote: "这里是远航一号。种植站已建立，归航坐标持续有效。",
      },
    ],
    EPILOGUE_LETTERS: [
      {
        id: "future-channel",
        from: "ayao",
        story: "light-arrival",
        requiresEnding: true,
        title: "下一季的通信课",
        text: "训练班的孩子今天第一次完整交班。母亲的接收器放在家里，留言和来源在档案里。我知道我失去了谁，也知道今天是谁在频道的另一头。——阿遥",
      },
      {
        id: "future-duty",
        from: "qiyue",
        story: "light-arrival",
        requiresEnding: true,
        title: "不需要叫醒我的维护表",
        text: "今天有人按班表接过检修。我仍会去做独立观测，但不必每夜把所有记录再检查一次。你出发或休息时，也不用担心这里突然没有人回答。——祁岳",
      },
      {
        id: "future-seed",
        from: "home",
        story: "light-arrival",
        requiresEnding: true,
        title: "具名的培育记录",
        text: "归档：苇的种苗后代已可分株，赠送批次附带来源与照料地址。窗前座椅已交付；值班人员能够休息。保存记录不替代离去的人，照料由活着的人继续。——归航",
      },
    ],
    PROJECTS: [
      {
        id: "relay",
        name: "共鸣中继",
        mission: "message",
        story: "relay",
        cores: 2,
        samples: 10,
        detail: "永久全舰队产量 ×1.05；开放失重种子库。",
        text: "共鸣中继接通。阿遥的声音第一次不再隔着长久的静电：『收到，归航星港。』",
      },
      {
        id: "nursery",
        name: "永久育种舱",
        mission: "seedbank",
        story: "nursery",
        cores: 3,
        samples: 14,
        detail: "每次成功探索永久多带回 1 份样本；开放黎明边界。",
        text: "第一批种子在育种舱里苏醒。这里开始生产的，除了星尘，还有下一个春天。",
      },
      {
        id: "lighthouse",
        name: "远航灯塔",
        mission: "horizon",
        story: "horizon",
        cores: 4,
        samples: 20,
        detail: "所有探索时间永久缩短 10%；第二章完成。",
        text: "远航灯塔亮起，另一端也传来回应。那些曾只属于一个人的归航坐标，成为了两座航站之间的路。第二章「远航星图」完成。",
      },
    ],
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
  };
  data.MISSIONS.push(...data.COUNCIL_MISSIONS, ...data.RESCUE_MISSIONS);
  data.LETTERS.push(...data.EPILOGUE_LETTERS);
  Object.assign(data.NARRATIVE_SCENES, data.MIDDLE_SCENES);
  Object.assign(data.STORIES, data.COUNCIL_STORIES, data.RESCUE_STORIES);
  return Object.freeze(data);
});
