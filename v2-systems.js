(() => {
  "use strict";

  const ROUTES = Object.freeze({
    industry: Object.freeze({
      id: "industry", icon: "◎", name: "工业航线", color: "#64e6ff",
      summary: "扩建、作业与资源循环形成同一条生产链。",
      tasks: Object.freeze([
        Object.freeze({ metric: "unitsBought", goal: 3, title: "完成一次有效扩建", action: "fleet", optional: false }),
        Object.freeze({ metric: "operationsCompleted", goal: 1, title: "完成一项航站作业", action: "command", optional: true }),
        Object.freeze({ metric: "starportUpgrades", goal: 1, title: "强化一座星港设施", action: "starport", optional: true }),
      ]),
    }),
    sentinel: Object.freeze({
      id: "sentinel", icon: "⬡", name: "守备航线", color: "#8da8ff",
      summary: "用舰队、防御与战后回收维持边境秩序。",
      tasks: Object.freeze([
        Object.freeze({ metric: "battlesWon", goal: 2, title: "赢得两场有效战斗", action: "combat", optional: false }),
        Object.freeze({ metric: "materialsCollected", goal: 4, title: "回收四份战斗材料", action: "combat", optional: true }),
        Object.freeze({ metric: "combatUpgrades", goal: 1, title: "完成一次军械强化", action: "combat", optional: true }),
      ]),
    }),
    pathfinder: Object.freeze({
      id: "pathfinder", icon: "▱", name: "探索航线", color: "#c09cff",
      summary: "把远征、异象、长航与伴星信号串成一张航图。",
      tasks: Object.freeze([
        Object.freeze({ metric: "expeditionRoutes", goal: 1, title: "完成一段远征航路", action: "expedition", optional: false }),
        Object.freeze({ metric: "eventsClaimed", goal: 1, title: "处理一段深空信号", action: "command", optional: true }),
        Object.freeze({ metric: "companionObservations", goal: 1, title: "完成一次伴星观察", action: "starport", optional: true }),
      ]),
    }),
  });

  const RUN_PROTOCOLS = Object.freeze({
    industry: Object.freeze([
      Object.freeze({ id: "closedLoop", icon: "⟳", name: "闭环精炼", benefit: "生产 +7%，作业回收更稳定", tradeoff: "防御 -6%", production: 1.07, defense: 0.94 }),
      Object.freeze({ id: "massFrame", icon: "▦", name: "批量骨架", benefit: "生产 +4%，舰炮 +5%", tradeoff: "手动回收 -10%", production: 1.04, attack: 1.05, click: 0.9 }),
      Object.freeze({ id: "quietShift", icon: "◷", name: "静默轮班", benefit: "生产 +9%", tradeoff: "舰炮 -7%", production: 1.09, attack: 0.93 }),
    ]),
    sentinel: Object.freeze([
      Object.freeze({ id: "overload", icon: "ϟ", name: "过载炮列", benefit: "舰炮 +11%", tradeoff: "防御 -8%", attack: 1.11, defense: 0.92 }),
      Object.freeze({ id: "shieldLattice", icon: "◇", name: "盾网互锁", benefit: "防御 +13%", tradeoff: "生产 -6%", defense: 1.13, production: 0.94 }),
      Object.freeze({ id: "salvagePatrol", icon: "⌬", name: "回收巡逻", benefit: "攻防各 +6%", tradeoff: "手动回收 -8%", attack: 1.06, defense: 1.06, click: 0.92 }),
    ]),
    pathfinder: Object.freeze([
      Object.freeze({ id: "twinProbe", icon: "∴", name: "双探针", benefit: "远征成功率 +5%", tradeoff: "生产 -5%", expeditionChance: 0.05, production: 0.95 }),
      Object.freeze({ id: "echoChart", icon: "⌁", name: "回声星图", benefit: "远征成功率 +3%，生产 +3%", tradeoff: "防御 -5%", expeditionChance: 0.03, production: 1.03, defense: 0.95 }),
      Object.freeze({ id: "deepRelay", icon: "☾", name: "深空接力", benefit: "远征成功率 +4%，舰炮 +4%", tradeoff: "生产 -5%", expeditionChance: 0.04, attack: 1.04, production: 0.95 }),
    ]),
  });

  const RUN_VARIATIONS = Object.freeze({
    anomalies: Object.freeze(["引力潮汐", "静电星云", "镜面航道", "漂流残骸", "脉冲盲区", "低温尘带"]),
    weaknesses: Object.freeze(["护盾换相", "引擎过热", "装甲接缝", "指挥中继", "火控延迟", "补给节点"]),
    resources: Object.freeze(["工程组件", "战斗材料", "远征补给", "航站凭证", "星尘储备", "收藏线索"]),
  });

  const DEFAULT_SEASON_CONFIG = Object.freeze({
    revision: 1,
    title: "归航者的灯海",
    theme: "把散落在边境的微光，送回同一条归航线。",
    activeDays: 14,
    exchangeDays: 7,
    rotations: Object.freeze([
      "潮汐回收 · 作业与扩建贡献提高",
      "守夜回声 · 战斗与首领贡献提高",
      "远星来信 · 远征与伴星贡献提高",
    ]),
    story: Object.freeze([
      "第一幕：边境信标逐一熄灭，航站收到一段来自旧归航舰队的坐标。",
      "第二幕：坐标并不指向某颗星，而是指向所有仍愿意回应的人。",
      "终幕：当灯海重新连成航线，每一位参与者都成为了他人的归途。",
    ]),
    personalTarget: 140,
    beaconTarget: 24000,
    rewardIds: Object.freeze(["title_homebound", "decor_lampsea", "collection_return_signal"]),
  });

  const COMPANION_STORIES = Object.freeze({
    dustMoth: Object.freeze({ name: "尘光蛾", icon: "✧", theme: "微光与归途", scenes: [
      Object.freeze({ title: "暗处显形的路", text: "尘光蛾绕着一段熄灭的航标飞行，像在询问你愿不愿意相信一条看不见的路。", choices: Object.freeze([{ id: "follow", label: "熄灯跟随" }, { id: "relight", label: "逐盏点亮" }]) }),
      Object.freeze({ title: "它记得你的光", text: "它带回了第一夜的航迹：安静的那条更短，明亮的那条让更多人找到了方向。", choices: Object.freeze([{ id: "keep", label: "把航迹留在星港" }, { id: "share", label: "把坐标交给归航者" }]) }),
      Object.freeze({ title: "万灯归航", text: "最后一圈翅粉落在航站穹顶，组成一条只为迷路者亮起的路。" }),
    ], reward: "decor_moth_lantern" }),
    prismJelly: Object.freeze({ name: "棱镜水母", icon: "◈", theme: "真相与多种答案", scenes: [
      Object.freeze({ title: "会游泳的黎明", text: "数百种颜色同时指向远方，每一种都声称自己是唯一正确的航路。", choices: Object.freeze([{ id: "calibrate", label: "校准最稳定的光" }, { id: "archive", label: "保留全部色谱" }]) }),
      Object.freeze({ title: "折射误差", text: "一次远征把色谱分成捷径和长路。它等待你决定效率是否总比完整更重要。", choices: Object.freeze([{ id: "precise", label: "选择精确" }, { id: "wonder", label: "选择惊奇" }]) }),
      Object.freeze({ title: "光有很多名字", text: "棱镜水母把你的选择折成一面星窗；从不同角度看，答案仍然成立。" }),
    ], reward: "skin_prism_window" }),
    riftRay: Object.freeze({ name: "裂隙鳐", icon: "⌁", theme: "风险与信任", scenes: [
      Object.freeze({ title: "裂隙像海", text: "裂隙鳐停在最不稳定的浪尖，邀请舰队进入一条没有保险的航道。", choices: Object.freeze([{ id: "dive", label: "随它潜入" }, { id: "anchor", label: "先投下锚标" }]) }),
      Object.freeze({ title: "失败留下的潮纹", text: "它没有嘲笑受损的船体，只把每次退航的位置连成新的安全线。", choices: Object.freeze([{ id: "retry", label: "沿旧浪重试" }, { id: "detour", label: "为后来者改道" }]) }),
      Object.freeze({ title: "海在星间", text: "你们最终穿过裂隙；它把最危险的一道浪命名为你的谨慎或勇气。" }),
    ], reward: "title_rift_sailor" }),
    orbitFox: Object.freeze({ name: "环轨狐", icon: "◇", theme: "好奇与选择", scenes: [
      Object.freeze({ title: "第三条尾迹", text: "环轨狐故意越过工业、守备和探索三块路牌，回头等你先选。", choices: Object.freeze([{ id: "chase", label: "追上它" }, { id: "wait", label: "等它绕回来" }]) }),
      Object.freeze({ title: "它偷走了一张日程", text: "你常走的航线被尾巴圈起，没走过的那条却被画了一颗星。", choices: Object.freeze([{ id: "familiar", label: "守住熟悉航线" }, { id: "new", label: "试一次陌生航线" }]) }),
      Object.freeze({ title: "轨道之外", text: "环轨狐没有要求你永远冒险，只在星港地板上留下了一扇通往偶然的门。" }),
    ], reward: "decor_fox_gate" }),
    echoWhale: Object.freeze({ name: "回声幼鲸", icon: "◒", theme: "记忆与告别", scenes: [
      Object.freeze({ title: "上一周期的歌", text: "幼鲸唱出的每个音符，都比当前星图晚一个时代。", choices: Object.freeze([{ id: "answer", label: "用现在回应" }, { id: "listen", label: "先听完整首歌" }]) }),
      Object.freeze({ title: "长航尽头的和声", text: "你的航行记录补上了歌曲缺失的一段，但最后一个音仍属于过去。", choices: Object.freeze([{ id: "complete", label: "替它补完" }, { id: "leave", label: "保留那处空白" }]) }),
      Object.freeze({ title: "歌向未来", text: "它第一次唱出尚未发生的旋律，并把你的航站写进了副歌。" }),
    ], reward: "log_future_song" }),
    voidCat: Object.freeze({ name: "虚空猫", icon: "◉", theme: "停留与休息", scenes: [
      Object.freeze({ title: "没有引力的午后", text: "虚空猫占据了离线仓库最温暖的角落，拒绝把休息解释成浪费。", choices: Object.freeze([{ id: "rest", label: "一起停一会儿" }, { id: "work", label: "轻轻挪开它" }]) }),
      Object.freeze({ title: "归航时它仍在", text: "几次离线归来后，它把没有发生任何事的时间也收进了记忆。", choices: Object.freeze([{ id: "home", label: "称这里为家" }, { id: "port", label: "称这里只是港口" }]) }),
      Object.freeze({ title: "安静也是航程", text: "它在控制台旁留下一个永不闪烁的休息指示灯。" }),
    ], reward: "decor_quiet_corner" }),
    novaFinch: Object.freeze({ name: "新星雀", icon: "✦", theme: "勇气与克制", scenes: [
      Object.freeze({ title: "不灼人的火", text: "新星雀把火花放在舰炮准星上，迫不及待想看一场胜利。", choices: Object.freeze([{ id: "charge", label: "带它出击" }, { id: "train", label: "先练习熄火" }]) }),
      Object.freeze({ title: "胜利之后", text: "战场残骸仍在发热。它第一次问，勇敢是否也包括及时停手。", choices: Object.freeze([{ id: "salvage", label: "回收并救援" }, { id: "pursue", label: "追击最后信号" }]) }),
      Object.freeze({ title: "掌心新星", text: "它学会把最大的火留给黑暗，把最小的火留给归来的人。" }),
    ], reward: "title_gentle_nova" }),
    moonHare: Object.freeze({ name: "月隙兔", icon: "☾", theme: "陪伴与共同航标", scenes: [
      Object.freeze({ title: "雷达移开之后", text: "月隙兔只在无人注视时修补共同航标，仿佛害怕被记住。", choices: Object.freeze([{ id: "help", label: "背对着递工具" }, { id: "watch", label: "安静看它完成" }]) }),
      Object.freeze({ title: "一封没有署名的信", text: "共同航标收到许多微小贡献，其中一份与你们第一次相遇的节奏相同。", choices: Object.freeze([{ id: "sign", label: "写下彼此名字" }, { id: "anonymous", label: "继续不署名" }]) }),
      Object.freeze({ title: "月背来信", text: "它终于在你看向雷达时没有躲开，只把一封写着“谢谢你也在这里”的信放进陈列廊。" }),
    ], reward: "collection_moon_letter" }),
  });

  const FEEDBACK_PROMPTS = Object.freeze({
    first_jump: Object.freeze({ title: "这一轮容易理解吗？", hint: "第一次跃迁后的一键反馈", labels: Object.freeze(["完全看不懂", "有点迷惑", "还可以", "比较清楚", "非常清楚"]) }),
    first_expedition: Object.freeze({ title: "远征里的选择有趣吗？", hint: "第一次完整远征后", labels: Object.freeze(["没有选择感", "偏单调", "一般", "有变化", "很想再玩"])}),
    active_day_7: Object.freeze({ title: "目前最困惑的是哪一部分？", hint: "第 7 个活跃日", labels: Object.freeze(["生产研究", "战斗舰队", "远征航线", "跃迁超越", "目前不困惑"]) }),
    repeated_failure: Object.freeze({ title: "连续失败后，你更希望得到什么？", hint: "只询问一次，可随时关闭", labels: Object.freeze(["明确弱点", "推荐强化", "降低门槛", "练习模式", "保持挑战"]) }),
  });

  const RETENTION_EVENTS = new Set([
    "game_start", "tutorial_step", "first_automation", "first_research",
    "first_battle", "first_jump", "first_expedition", "first_transcend",
    "daily_route_selected", "daily_route_completed", "offline_return",
    "doctrine_selected", "season_participation", "companion_choice",
    "daily_route_rerolled", "micro_feedback",
  ]);

  const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
  const safeCount = (value, max = 9007199254740991) => Math.min(max, Math.max(0, Math.floor(Number(value) || 0)));
  const safeTime = (value) => Math.max(0, Number(value) || 0);
  const uniqueStrings = (value, allowed = null, limit = 64) => [...new Set(
    (Array.isArray(value) ? value : []).filter((item) =>
      typeof item === "string" && item.length <= 80 && (!allowed || allowed.has(item)),
    ),
  )].slice(0, limit);

  const ROUTE_ORDERS = Object.freeze({
    industry: [{ id: "expand", name: "扩建生产线", metric: "unitsBought", goal: 5, action: "fleet", reward: { materials: 3 } }, { id: "process", name: "循环加工", metric: "operationsCompleted", goal: 2, action: "command", reward: { tokens: 8 } }],
    sentinel: [{ id: "patrol", name: "主动巡逻", metric: "battlesWon", goal: 3, action: "combat", reward: { supplies: 2 } }, { id: "hold", name: "守住航标", metric: "raidsDefended", goal: 1, action: "combat", reward: { materials: 4 } }],
    pathfinder: [{ id: "scout", name: "近域探路", metric: "expeditionRoutes", goal: 2, action: "expedition", reward: { supplies: 2 } }, { id: "deep", name: "完整长航", metric: "expeditionsCompleted", goal: 1, action: "expedition", reward: { tokens: 12 } }],
  });

  function chooseOrder(v2, id, now = Date.now()) {
    const route = v2.dailyRoute.routeId;
    if (!ROUTE_ORDERS[route]?.some((entry) => entry.id === id)) return false;
    if (v2.order.day === dayKey(now)) return false;
    v2.order = { day: dayKey(now), route, id, progress: 0, claimed: false };
    return true;
  }

  function getOrder(v2) {
    return ROUTE_ORDERS[v2.order.route]?.find((entry) => entry.id === v2.order.id);
  }

  function claimOrder(v2) {
    const order = getOrder(v2);
    if (!order || v2.order.claimed || v2.order.progress < order.goal) return null;
    v2.order.claimed = true;
    return { ...order.reward };
  }

  function freshState(now = Date.now()) {
    return {
      order: { day: "", route: "", id: "", progress: 0, claimed: false },
      retention: {
        enabled: false,
        consentAt: 0,
        events: [],
        counters: {},
        firstAt: {},
        returnDays: [],
      },
      dailyRoute: {
        dayKey: "",
        routeId: "",
        tasks: [],
        claimed: false,
        rerollsUsed: 0,
        history: [],
        lastCompletedAt: 0,
      },
      trackedTarget: { id: "", label: "", baseline: 0, updatedAt: 0 },
      lastReturn: {
        at: now,
        elapsed: 0,
        dust: 0,
        operations: 0,
        raids: 0,
        targetDelta: 0,
        nextReturnAt: 0,
      },
      runBuild: {
        routeId: "", seed: "", offeredProtocolIds: [], selectedProtocolId: "",
        variation: { anomaly: "", weakness: "", resource: "" }, startedAt: 0,
        startSnapshot: {}, peakRate: 0, peakPower: 0, reports: [],
      },
      season: {
        id: "", title: "", score: 0, participated: false,
        personalClaimed: false, beaconClaimed: false, lastMetricAt: 0,
        unlockedRewards: [], archive: [],
      },
      companionStories: {
        activeId: "", records: {}, titles: [], decorations: [], skins: [], logs: [],
      },
      feedback: {
        answered: [], dismissed: [], pendingId: "", responses: [], failures: 0, lastPromptAt: 0,
      },
    };
  }

  function sanitize(raw, now = Date.now()) {
    const base = freshState(now);
    const source = raw && typeof raw === "object" ? raw : {};
    const retention = source.retention && typeof source.retention === "object" ? source.retention : {};
    base.retention.enabled = retention.enabled === true;
    base.retention.consentAt = safeTime(retention.consentAt);
    base.retention.events = (Array.isArray(retention.events) ? retention.events : []).flatMap((entry) => {
      if (!entry || !RETENTION_EVENTS.has(entry.type)) return [];
      return [{ type: entry.type, at: safeTime(entry.at), day: String(entry.day || "").slice(0, 10), value: safeCount(entry.value, 1000000), route: ROUTES[entry.route]?.id || "" }];
    }).slice(-240);
    Object.entries(retention.counters || {}).slice(0, 40).forEach(([key, value]) => {
      if (RETENTION_EVENTS.has(key)) base.retention.counters[key] = safeCount(value, 1000000);
    });
    Object.entries(retention.firstAt || {}).slice(0, 40).forEach(([key, value]) => {
      if (RETENTION_EVENTS.has(key)) base.retention.firstAt[key] = safeTime(value);
    });
    base.retention.returnDays = uniqueStrings(retention.returnDays, null, 60)
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key));

    const route = source.dailyRoute && typeof source.dailyRoute === "object" ? source.dailyRoute : {};
    base.dailyRoute.dayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(route.dayKey || "")) ? String(route.dayKey) : "";
    base.dailyRoute.routeId = ROUTES[route.routeId]?.id || "";
    base.dailyRoute.tasks = (Array.isArray(route.tasks) ? route.tasks : []).flatMap((task) => {
      if (!task || typeof task.metric !== "string") return [];
      return [{ metric: task.metric.slice(0, 40), goal: Math.max(1, safeCount(task.goal, 1000000)), progress: safeCount(task.progress, 1000000), claimed: task.claimed === true }];
    }).slice(0, 3);
    base.dailyRoute.claimed = route.claimed === true;
    base.dailyRoute.rerollsUsed = Math.min(1, safeCount(route.rerollsUsed));
    base.dailyRoute.history = (Array.isArray(route.history) ? route.history : []).flatMap((entry) => {
      if (!entry || !ROUTES[entry.routeId] || !/^\d{4}-\d{2}-\d{2}$/.test(String(entry.dayKey || ""))) return [];
      return [{ dayKey: entry.dayKey, routeId: entry.routeId, completed: entry.completed === true }];
    }).slice(-30);
    base.dailyRoute.lastCompletedAt = safeTime(route.lastCompletedAt);

    const tracked = source.trackedTarget && typeof source.trackedTarget === "object" ? source.trackedTarget : {};
    base.trackedTarget = {
      id: String(tracked.id || "").slice(0, 80), label: String(tracked.label || "").slice(0, 120),
      baseline: safeCount(tracked.baseline, Number.MAX_SAFE_INTEGER), updatedAt: safeTime(tracked.updatedAt),
    };
    const lastReturn = source.lastReturn && typeof source.lastReturn === "object" ? source.lastReturn : {};
    base.lastReturn = {
      at: safeTime(lastReturn.at), elapsed: safeTime(lastReturn.elapsed), dust: Math.max(0, Number(lastReturn.dust) || 0),
      operations: safeCount(lastReturn.operations), raids: safeCount(lastReturn.raids), targetDelta: safeCount(lastReturn.targetDelta),
      nextReturnAt: safeTime(lastReturn.nextReturnAt),
    };
    const runBuild = source.runBuild && typeof source.runBuild === "object" ? source.runBuild : {};
    const runRoute = ROUTES[runBuild.routeId]?.id || "";
    const allowedProtocols = new Set((RUN_PROTOCOLS[runRoute] || []).map((entry) => entry.id));
    base.runBuild = {
      routeId: runRoute,
      seed: String(runBuild.seed || "").slice(0, 96),
      offeredProtocolIds: uniqueStrings(runBuild.offeredProtocolIds, allowedProtocols, 3),
      selectedProtocolId: allowedProtocols.has(runBuild.selectedProtocolId) ? runBuild.selectedProtocolId : "",
      variation: {
        anomaly: RUN_VARIATIONS.anomalies.includes(runBuild.variation?.anomaly) ? runBuild.variation.anomaly : "",
        weakness: RUN_VARIATIONS.weaknesses.includes(runBuild.variation?.weakness) ? runBuild.variation.weakness : "",
        resource: RUN_VARIATIONS.resources.includes(runBuild.variation?.resource) ? runBuild.variation.resource : "",
      },
      startedAt: safeTime(runBuild.startedAt),
      startSnapshot: {
        dust: Math.max(0, Number(runBuild.startSnapshot?.dust) || 0),
        battles: safeCount(runBuild.startSnapshot?.battles),
        expeditions: safeCount(runBuild.startSnapshot?.expeditions),
        collections: safeCount(runBuild.startSnapshot?.collections, 1000),
      },
      peakRate: Math.max(0, Number(runBuild.peakRate) || 0),
      peakPower: Math.max(0, Number(runBuild.peakPower) || 0),
      reports: (Array.isArray(runBuild.reports) ? runBuild.reports : []).flatMap((report) => {
        if (!report || !ROUTES[report.routeId]) return [];
        return [{
          id: String(report.id || "").slice(0, 96), routeId: report.routeId,
          protocolId: String(report.protocolId || "").slice(0, 40), seed: String(report.seed || "").slice(0, 96),
          startedAt: safeTime(report.startedAt), endedAt: safeTime(report.endedAt),
          gainedCores: safeCount(report.gainedCores, 1000000000),
          duration: safeTime(report.duration), dust: Math.max(0, Number(report.dust) || 0),
          highestRate: Math.max(0, Number(report.highestRate) || 0), highestPower: Math.max(0, Number(report.highestPower) || 0),
          battles: safeCount(report.battles), expeditions: safeCount(report.expeditions),
          comparison: Math.max(-100, Math.min(1000000, Number(report.comparison) || 0)),
          keyEvents: uniqueStrings(report.keyEvents, null, 8), collections: uniqueStrings(report.collections, null, 8),
          nextSuggestion: String(report.nextSuggestion || "").slice(0, 160),
          anomaly: String(report.anomaly || "").slice(0, 40), weakness: String(report.weakness || "").slice(0, 40), resource: String(report.resource || "").slice(0, 40),
        }];
      }).slice(-12),
    };
    const season = source.season && typeof source.season === "object" ? source.season : {};
    base.season = {
      id: String(season.id || "").slice(0, 80),
      title: String(season.title || "").slice(0, 80),
      score: safeCount(season.score, 1000000000),
      participated: season.participated === true,
      personalClaimed: season.personalClaimed === true,
      beaconClaimed: season.beaconClaimed === true,
      lastMetricAt: safeTime(season.lastMetricAt),
      unlockedRewards: uniqueStrings(season.unlockedRewards, new Set(DEFAULT_SEASON_CONFIG.rewardIds), 12),
      archive: (Array.isArray(season.archive) ? season.archive : []).flatMap((entry) => {
        if (!entry || typeof entry.id !== "string") return [];
        return [{ id: entry.id.slice(0, 80), title: String(entry.title || "").slice(0, 80), score: safeCount(entry.score, 1000000000), rewards: uniqueStrings(entry.rewards, new Set(DEFAULT_SEASON_CONFIG.rewardIds), 12) }];
      }).slice(-12),
    };
    const stories = source.companionStories && typeof source.companionStories === "object" ? source.companionStories : {};
    const companionIds = new Set(Object.keys(COMPANION_STORIES));
    const allRewards = new Set(Object.values(COMPANION_STORIES).map((story) => story.reward));
    base.companionStories = {
      activeId: companionIds.has(stories.activeId) ? stories.activeId : "",
      records: {},
      titles: uniqueStrings(stories.titles, allRewards, 16),
      decorations: uniqueStrings(stories.decorations, allRewards, 16),
      skins: uniqueStrings(stories.skins, allRewards, 16),
      logs: uniqueStrings(stories.logs, allRewards, 16),
    };
    Object.entries(stories.records || {}).slice(0, 8).forEach(([companionId, record]) => {
      const story = COMPANION_STORIES[companionId];
      if (!story || !record || typeof record !== "object") return;
      const allowedChoices = new Set(story.scenes.flatMap((scene) => (scene.choices || []).map((choice) => choice.id)));
      const choices = uniqueStrings(record.choices, allowedChoices, 2);
      base.companionStories.records[companionId] = {
        stage: Math.min(3, safeCount(record.stage, 3)),
        choices,
        ending: [`${companionId}:quiet`, `${companionId}:bold`].includes(record.ending) ? record.ending : "",
        memories: uniqueStrings(record.memories, new Set(["scene-0", "scene-1", "scene-2"]), 3),
        lastAdvancedAt: safeTime(record.lastAdvancedAt),
      };
    });
    const feedback = source.feedback && typeof source.feedback === "object" ? source.feedback : {};
    const promptIds = new Set(Object.keys(FEEDBACK_PROMPTS));
    base.feedback = {
      answered: uniqueStrings(feedback.answered, promptIds, 8),
      dismissed: uniqueStrings(feedback.dismissed, promptIds, 8),
      pendingId: promptIds.has(feedback.pendingId) ? feedback.pendingId : "",
      responses: (Array.isArray(feedback.responses) ? feedback.responses : []).flatMap((response) => {
        if (!response || !promptIds.has(response.id)) return [];
        return [{ id: response.id, value: Math.min(5, Math.max(1, safeCount(response.value, 5))), at: safeTime(response.at) }];
      }).slice(-8),
      failures: Math.min(20, safeCount(feedback.failures, 20)),
      lastPromptAt: safeTime(feedback.lastPromptAt),
    };
    const order = source.order || {};
    if (ROUTE_ORDERS[order.route]?.some((entry) => entry.id === order.id)) {
      base.order = { day: /^\d{4}-\d{2}-\d{2}$/.test(order.day) ? order.day : "", route: order.route, id: order.id, progress: safeCount(order.progress, 5), claimed: order.claimed === true };
    }
    return base;
  }

  function record(v2, type, meta = {}, now = Date.now()) {
    if (!v2?.retention || !RETENTION_EVENTS.has(type)) return;
    v2.retention.counters[type] = safeCount((v2.retention.counters[type] || 0) + 1, 1000000);
    if (!v2.retention.firstAt[type]) v2.retention.firstAt[type] = now;
    const route = ROUTES[meta.route]?.id || "";
    if (v2.retention.enabled) {
      v2.retention.events.push({ type, at: now, day: dayKey(now), value: safeCount(meta.value || 1, 1000000), route });
      v2.retention.events = v2.retention.events.slice(-240);
      window.dispatchEvent(new CustomEvent("stellar-privacy-analytics", { detail: { type, at: now, day: dayKey(now), value: safeCount(meta.value || 1, 1000000), route } }));
    }
  }

  function getEligibleRoutes(gameState) {
    const result = [ROUTES.industry];
    if ((gameState?.lifetimeDust || 0) >= 320) result.push(ROUTES.sentinel);
    if ((gameState?.lifetimeDust || 0) >= 4.2e6) result.push(ROUTES.pathfinder);
    return result;
  }

  function ensureDaily(v2, gameState, now = Date.now()) {
    const key = dayKey(now);
    if (v2.dailyRoute.dayKey === key) return false;
    if (v2.dailyRoute.dayKey && v2.dailyRoute.routeId) {
      v2.dailyRoute.history.push({ dayKey: v2.dailyRoute.dayKey, routeId: v2.dailyRoute.routeId, completed: v2.dailyRoute.claimed });
      v2.dailyRoute.history = v2.dailyRoute.history.slice(-30);
    }
    v2.dailyRoute.dayKey = key;
    v2.dailyRoute.routeId = "";
    v2.dailyRoute.tasks = [];
    v2.dailyRoute.claimed = false;
    v2.dailyRoute.rerollsUsed = 0;
    return true;
  }

  function selectDaily(v2, gameState, routeId, now = Date.now()) {
    ensureDaily(v2, gameState, now);
    const route = getEligibleRoutes(gameState).find((entry) => entry.id === routeId);
    if (!route || v2.dailyRoute.routeId) return false;
    v2.dailyRoute.routeId = route.id;
    v2.dailyRoute.tasks = route.tasks.map((task) => ({ metric: task.metric, goal: task.goal, progress: 0, claimed: false }));
    record(v2, "daily_route_selected", { route: route.id }, now);
    return true;
  }

  function rerollDaily(v2, gameState, now = Date.now()) {
    ensureDaily(v2, gameState, now);
    if (!v2.dailyRoute.routeId || v2.dailyRoute.rerollsUsed >= 1 || v2.dailyRoute.claimed) return false;
    const eligible = getEligibleRoutes(gameState);
    const index = eligible.findIndex((route) => route.id === v2.dailyRoute.routeId);
    const next = eligible[(index + 1) % eligible.length];
    if (!next || next.id === v2.dailyRoute.routeId) return false;
    v2.dailyRoute.routeId = next.id;
    v2.dailyRoute.tasks = next.tasks.map((task) => ({ metric: task.metric, goal: task.goal, progress: 0, claimed: false }));
    v2.dailyRoute.rerollsUsed = 1;
    record(v2, "daily_route_rerolled", { route: next.id }, now);
    return true;
  }

  function recordMetric(v2, metric, amount, gameState, now = Date.now()) {
    const order = getOrder(v2);
    if (order && !v2.order.claimed && metric === order.metric) v2.order.progress = Math.min(order.goal, v2.order.progress + safeCount(amount, 1000000));
    ensureDaily(v2, gameState, now);
    recordSeasonMetric(v2, metric, amount, now);
    if (!v2.dailyRoute.routeId || v2.dailyRoute.claimed) return;
    const safeAmount = Math.max(0, Number(amount) || 0);
    v2.dailyRoute.tasks.forEach((task) => {
      if (task.metric === metric) task.progress = Math.min(task.goal, task.progress + safeAmount);
    });
  }

  function getDailyCompletion(v2) {
    const route = ROUTES[v2?.dailyRoute?.routeId];
    if (!route || !v2.dailyRoute.tasks.length) return { mainComplete: false, optionalCompleted: 0 };
    const completed = v2.dailyRoute.tasks.map((task) => task.progress >= task.goal);
    return {
      mainComplete: completed[0] === true,
      optionalCompleted: completed.slice(1).filter(Boolean).length,
    };
  }

  function dailyComplete(v2) {
    return getDailyCompletion(v2).mainComplete;
  }

  function claimDaily(v2, gameState, now = Date.now()) {
    if (!dailyComplete(v2) || v2.dailyRoute.claimed) return false;
    const completion = getDailyCompletion(v2);
    v2.dailyRoute.claimed = true;
    v2.dailyRoute.lastCompletedAt = now;
    record(v2, "daily_route_completed", { route: v2.dailyRoute.routeId }, now);
    recordSeasonMetric(v2, "dailyRouteCompleted", 1, now);
    return completion;
  }

  function seedNumber(seed) {
    let value = 2166136261;
    for (let index = 0; index < String(seed).length; index += 1) {
      value ^= String(seed).charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function seededOrder(items, seed) {
    const result = [...items];
    let value = seedNumber(seed) || 1;
    for (let index = result.length - 1; index > 0; index -= 1) {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      const swap = value % (index + 1);
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function snapshotRun(gameState) {
    return {
      dust: Math.max(0, Number(gameState?.lifetimeDust) || 0),
      battles: safeCount(gameState?.combat?.activeWins),
      expeditions: safeCount(gameState?.expedition?.completedRuns ?? gameState?.expedition?.completed),
      collections: Object.values(gameState?.v2?.companionStories?.records || {}).filter((entry) => entry.stage >= 3).length
        + safeCount(gameState?.v2?.season?.unlockedRewards?.length, 100),
    };
  }

  function beginRun(v2, routeId, gameState, now = Date.now()) {
    const route = ROUTES[routeId];
    if (!route || !v2?.runBuild) return false;
    const seed = `${String(gameState?.experience?.installedAt || "station")}:${safeCount(gameState?.rebirths)}:${routeId}`;
    const protocols = seededOrder(RUN_PROTOCOLS[routeId], `${seed}:protocol`);
    const anomalies = seededOrder(RUN_VARIATIONS.anomalies, `${seed}:anomaly`);
    const weaknesses = seededOrder(RUN_VARIATIONS.weaknesses, `${seed}:weakness`);
    const resources = seededOrder(RUN_VARIATIONS.resources, `${seed}:resource`);
    v2.runBuild.routeId = routeId;
    v2.runBuild.seed = seed;
    v2.runBuild.offeredProtocolIds = protocols.map((entry) => entry.id);
    v2.runBuild.selectedProtocolId = "";
    v2.runBuild.variation = { anomaly: anomalies[0], weakness: weaknesses[0], resource: resources[0] };
    v2.runBuild.startedAt = now;
    v2.runBuild.startSnapshot = snapshotRun(gameState);
    v2.runBuild.peakRate = 0;
    v2.runBuild.peakPower = 0;
    return true;
  }

  function getRunProtocol(v2) {
    const routeId = v2?.runBuild?.routeId;
    return (RUN_PROTOCOLS[routeId] || []).find((entry) => entry.id === v2?.runBuild?.selectedProtocolId) || null;
  }

  function selectRunProtocol(v2, protocolId, now = Date.now()) {
    if (!v2?.runBuild?.routeId || v2.runBuild.selectedProtocolId) return false;
    const protocol = (RUN_PROTOCOLS[v2.runBuild.routeId] || []).find((entry) =>
      entry.id === protocolId && v2.runBuild.offeredProtocolIds.includes(entry.id),
    );
    if (!protocol) return false;
    v2.runBuild.selectedProtocolId = protocol.id;
    record(v2, "doctrine_selected", { route: v2.runBuild.routeId }, now);
    return true;
  }

  function getRunFactor(v2, key) {
    const protocol = getRunProtocol(v2);
    const value = protocol?.[key];
    if (Number.isFinite(value)) return value;
    return ["expeditionChance"].includes(key) ? 0 : 1;
  }

  function recordRunPeak(v2, rate, power) {
    if (!v2?.runBuild?.routeId) return;
    v2.runBuild.peakRate = Math.max(v2.runBuild.peakRate || 0, Math.max(0, Number(rate) || 0));
    v2.runBuild.peakPower = Math.max(v2.runBuild.peakPower || 0, Math.max(0, Number(power) || 0));
  }

  function completeRun(v2, gameState, gainedCores = 0, now = Date.now()) {
    if (!v2?.runBuild?.routeId || !v2.runBuild.startedAt) return null;
    const current = snapshotRun(gameState);
    const start = v2.runBuild.startSnapshot || {};
    const previous = v2.runBuild.reports.at(-1);
    const currentDust = Math.max(0, current.dust - (Number(start.dust) || 0));
    const collectionCount = Math.max(0, current.collections - (Number(start.collections) || 0));
    const routeSuggestions = {
      industry: "下一轮可尝试守备路线，用反击和材料回收替代生产链。",
      sentinel: "下一轮可尝试探索路线，利用航线预览与远征成功率。",
      pathfinder: "下一轮可尝试工业路线，把远征库存送入自动作业循环。",
    };
    const report = {
      id: `${v2.runBuild.seed}:${now}`,
      routeId: v2.runBuild.routeId,
      protocolId: v2.runBuild.selectedProtocolId,
      seed: v2.runBuild.seed,
      startedAt: v2.runBuild.startedAt,
      endedAt: now,
      duration: Math.max(0, now - v2.runBuild.startedAt),
      gainedCores: safeCount(gainedCores, 1000000000),
      dust: currentDust,
      highestRate: Math.max(0, Number(v2.runBuild.peakRate) || 0),
      highestPower: Math.max(0, Number(v2.runBuild.peakPower) || 0),
      battles: Math.max(0, current.battles - (Number(start.battles) || 0)),
      expeditions: Math.max(0, current.expeditions - (Number(start.expeditions) || 0)),
      comparison: previous?.dust > 0 ? ((currentDust - previous.dust) / previous.dust) * 100 : 0,
      keyEvents: [
        current.battles - (Number(start.battles) || 0) > 0 ? "完成主动战斗" : "",
        current.expeditions - (Number(start.expeditions) || 0) > 0 ? "完成远征" : "",
        `遭遇${v2.runBuild.variation.anomaly}`,
      ].filter(Boolean),
      collections: collectionCount > 0 ? [`新增 ${collectionCount} 项剧情或赛季收藏`] : [],
      nextSuggestion: routeSuggestions[v2.runBuild.routeId],
      ...v2.runBuild.variation,
    };
    v2.runBuild.reports.push(report);
    v2.runBuild.reports = v2.runBuild.reports.slice(-12);
    v2.runBuild.routeId = "";
    v2.runBuild.seed = "";
    v2.runBuild.offeredProtocolIds = [];
    v2.runBuild.selectedProtocolId = "";
    v2.runBuild.variation = { anomaly: "", weakness: "", resource: "" };
    v2.runBuild.startedAt = 0;
    v2.runBuild.startSnapshot = {};
    v2.runBuild.peakRate = 0;
    v2.runBuild.peakPower = 0;
    return report;
  }

  function formatRunReport(report) {
    const route = ROUTES[report?.routeId];
    const protocol = (RUN_PROTOCOLS[report?.routeId] || []).find((entry) => entry.id === report?.protocolId);
    return [
      `《星港拾荒者》v2.0.0 航线报告`,
      `路线：${route?.name || "未记录"}`,
      `协议：${protocol?.name || "未选择"}`,
      `异象：${report?.anomaly || "无"} / 敌方弱点：${report?.weakness || "无"}`,
      `资源偏向：${report?.resource || "无"}`,
      `本轮星尘：${Math.floor(Number(report?.dust) || 0)}`,
      `本轮用时：${formatEta((Number(report?.duration) || 0) / 1000).replace(/^预计 /, "")}`,
      `最高产量：${Math.floor(Number(report?.highestRate) || 0)} / 秒`,
      `最高战力：${Math.floor(Number(report?.highestPower) || 0)}`,
      `战斗胜利：${safeCount(report?.battles)} / 远征完成：${safeCount(report?.expeditions)}`,
      `获得星核：${safeCount(report?.gainedCores)}`,
      `与上一轮星尘相比：${Number(report?.comparison) >= 0 ? "+" : ""}${(Number(report?.comparison) || 0).toFixed(1)}%`,
      `关键事件：${(report?.keyEvents || []).join("、") || "无"}`,
      `本轮收藏：${(report?.collections || []).join("、") || "无"}`,
      `下轮建议：${report?.nextSuggestion || "尝试不同路线与协议。"}`,
      `种子：${report?.seed || "—"}`,
    ].join("\n");
  }

  function normalizeSeasonConfig(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const rotations = (Array.isArray(source.rotations) ? source.rotations : DEFAULT_SEASON_CONFIG.rotations)
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim().slice(0, 120)).slice(0, 3);
    const story = (Array.isArray(source.story) ? source.story : DEFAULT_SEASON_CONFIG.story)
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim().slice(0, 240)).slice(0, 3);
    return {
      revision: Math.max(1, safeCount(source.revision, 1000000)),
      id: String(source.id || "").slice(0, 80),
      title: String(source.title || DEFAULT_SEASON_CONFIG.title).slice(0, 80),
      theme: String(source.theme || DEFAULT_SEASON_CONFIG.theme).slice(0, 180),
      activeDays: Math.min(30, Math.max(7, safeCount(source.activeDays || DEFAULT_SEASON_CONFIG.activeDays))),
      exchangeDays: Math.min(30, Math.max(7, safeCount(source.exchangeDays || DEFAULT_SEASON_CONFIG.exchangeDays))),
      startAt: safeTime(source.startAt),
      rotations: rotations.length === 3 ? rotations : [...DEFAULT_SEASON_CONFIG.rotations],
      story: story.length === 3 ? story : [...DEFAULT_SEASON_CONFIG.story],
      personalTarget: Math.min(1000000, Math.max(20, safeCount(source.personalTarget || DEFAULT_SEASON_CONFIG.personalTarget))),
      beaconTarget: Math.min(1000000000, Math.max(100, safeCount(source.beaconTarget || DEFAULT_SEASON_CONFIG.beaconTarget))),
      rewardIds: uniqueStrings(source.rewardIds, new Set(DEFAULT_SEASON_CONFIG.rewardIds), 3).length
        ? uniqueStrings(source.rewardIds, new Set(DEFAULT_SEASON_CONFIG.rewardIds), 3)
        : [...DEFAULT_SEASON_CONFIG.rewardIds],
    };
  }

  let seasonConfig = normalizeSeasonConfig(DEFAULT_SEASON_CONFIG);
  let seasonNetwork = { online: false, aggregateMode: "active", total: 0, participants: 0, rank: 0, percentile: 0, nextGap: 0 };

  function getSeasonWindow(config = seasonConfig, now = Date.now()) {
    const activeMs = config.activeDays * 86400000;
    const exchangeMs = config.exchangeDays * 86400000;
    let startAt = config.startAt;
    let id = config.id;
    if (!startAt) {
      const cycleMs = activeMs + exchangeMs;
      const sequence = Math.floor(now / cycleMs);
      startAt = sequence * cycleMs;
      id = id || `lampsea-${sequence}`;
    }
    const activeEndAt = startAt + activeMs;
    const exchangeEndAt = activeEndAt + exchangeMs;
    const phase = now < startAt ? "preview" : now < activeEndAt ? "active" : now < exchangeEndAt ? "exchange" : "ended";
    const elapsedDays = Math.max(0, Math.floor((now - startAt) / 86400000));
    const rotationIndex = Math.min(2, Math.floor(Math.min(config.activeDays - 1, elapsedDays) / Math.max(1, config.activeDays / 3)));
    return { id: id || `season-${startAt}`, startAt, activeEndAt, exchangeEndAt, phase, elapsedDays, rotationIndex };
  }

  function ensureSeason(v2, now = Date.now()) {
    if (!v2?.season) return null;
    const windowState = getSeasonWindow(seasonConfig, now);
    if (v2.season.id !== windowState.id) {
      if (v2.season.id) {
        if (v2.season.participated && seasonConfig.rewardIds[2] && !v2.season.unlockedRewards.includes(seasonConfig.rewardIds[2])) {
          v2.season.unlockedRewards.push(seasonConfig.rewardIds[2]);
        }
        v2.season.archive.push({ id: v2.season.id, title: v2.season.title, score: v2.season.score, rewards: [...v2.season.unlockedRewards] });
        v2.season.archive = v2.season.archive.slice(-12);
      }
      v2.season.id = windowState.id;
      v2.season.title = seasonConfig.title;
      v2.season.score = 0;
      v2.season.participated = false;
      v2.season.personalClaimed = false;
      v2.season.beaconClaimed = false;
      v2.season.lastMetricAt = 0;
      v2.season.unlockedRewards = [];
    }
    return windowState;
  }

  const SEASON_METRIC_POINTS = Object.freeze({
    unitsBought: 2, operationsCompleted: 7, starportUpgrades: 10,
    battlesWon: 5, materialsCollected: 1, combatUpgrades: 9,
    expeditionRoutes: 12, eventsClaimed: 5, companionObservations: 8,
    bossVictories: 18, raidsDefended: 12, dailyRouteCompleted: 14,
  });

  function recordSeasonMetric(v2, metric, amount = 1, now = Date.now()) {
    const windowState = ensureSeason(v2, now);
    const unitPoints = SEASON_METRIC_POINTS[metric];
    if (!windowState || windowState.phase !== "active" || !unitPoints) return 0;
    const rawPoints = Math.min(40, Math.max(0, Number(amount) || 0)) * unitPoints;
    const expected = seasonConfig.personalTarget * Math.min(1, (windowState.elapsedDays + 1) / seasonConfig.activeDays);
    const catchup = windowState.elapsedDays >= 6 && v2.season.score < expected * 0.65 ? 1.5 : 1;
    const gained = Math.max(1, Math.floor(rawPoints * catchup));
    v2.season.score = safeCount(v2.season.score + gained, 1000000000);
    v2.season.lastMetricAt = now;
    if (!v2.season.participated) {
      v2.season.participated = true;
      record(v2, "season_participation", { value: 1 }, now);
    }
    return gained;
  }

  function claimSeasonPersonal(v2, now = Date.now()) {
    const windowState = ensureSeason(v2, now);
    if (!windowState || !["active", "exchange"].includes(windowState.phase) || v2.season.personalClaimed || v2.season.score < seasonConfig.personalTarget) return false;
    v2.season.personalClaimed = true;
    const rewardId = seasonConfig.rewardIds[0];
    if (rewardId && !v2.season.unlockedRewards.includes(rewardId)) v2.season.unlockedRewards.push(rewardId);
    return { tokens: 26, supplies: 3, rewardId };
  }

  function claimSeasonBeacon(v2, now = Date.now()) {
    const windowState = ensureSeason(v2, now);
    if (!windowState || !["active", "exchange"].includes(windowState.phase) || v2.season.beaconClaimed || !seasonNetwork.online || seasonNetwork.total < seasonConfig.beaconTarget || v2.season.score < Math.ceil(seasonConfig.personalTarget * 0.35)) return false;
    v2.season.beaconClaimed = true;
    const rewardId = seasonConfig.rewardIds[1];
    if (rewardId && !v2.season.unlockedRewards.includes(rewardId)) v2.season.unlockedRewards.push(rewardId);
    return { tokens: 18, materials: 2, rewardId };
  }

  function setSeasonConfig(raw, now = Date.now()) {
    seasonConfig = normalizeSeasonConfig(raw);
    if (host) {
      ensureSeason(host.getState().v2, now);
      renderSeason();
    }
    return seasonConfig;
  }

  function setSeasonNetwork(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    seasonNetwork = {
      online: source.online === true,
      aggregateMode: source.aggregateMode === "server" ? "server" : "active",
      total: safeCount(source.total, 1000000000), participants: safeCount(source.participants, 1000000),
      rank: safeCount(source.rank, 1000000), percentile: Math.min(100, Math.max(0, Number(source.percentile) || 0)),
      nextGap: safeCount(source.nextGap, 1000000000),
    };
    if (host) renderSeason();
  }

  function freshCompanionRecord() {
    return { stage: 0, choices: [], ending: "", memories: [], lastAdvancedAt: 0 };
  }

  function getCompanionRecord(v2, companionId) {
    if (!v2?.companionStories || !COMPANION_STORIES[companionId]) return null;
    if (!v2.companionStories.records[companionId]) v2.companionStories.records[companionId] = freshCompanionRecord();
    return v2.companionStories.records[companionId];
  }

  function getDominantRoute(gameState) {
    const counts = { industry: 0, sentinel: 0, pathfinder: 0 };
    (gameState?.v2?.dailyRoute?.history || []).forEach((entry) => {
      if (counts[entry.routeId] !== undefined) counts[entry.routeId] += 1;
    });
    Object.entries(gameState?.doctrine?.history || {}).forEach(([routeId, value]) => {
      if (counts[routeId] !== undefined) counts[routeId] += safeCount(value);
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "industry";
  }

  function getCompanionCondition(companionId, gameState) {
    const histories = gameState?.v2?.dailyRoute?.history || [];
    const uniqueRoutes = new Set(histories.map((entry) => entry.routeId).filter((id) => ROUTES[id])).size;
    const values = {
      dustMoth: { current: histories.filter((entry) => entry.completed).length, goal: 1, label: "归档 1 条今日航线" },
      prismJelly: { current: safeCount(gameState?.expedition?.completedRuns), goal: 1, label: "完成 1 次完整远征" },
      riftRay: { current: safeCount(gameState?.expedition?.failedRuns) + safeCount(gameState?.expedition?.completedRuns), goal: 2, label: "经历 2 次远征结果" },
      orbitFox: { current: uniqueRoutes, goal: 2, label: "尝试 2 种今日航线" },
      echoWhale: { current: safeCount(gameState?.longVoyage?.completed) + safeCount(gameState?.experience?.milestones?.firstExpedition), goal: 1, label: "完成一次长航或远征" },
      voidCat: { current: (gameState?.v2?.retention?.returnDays || []).length, goal: 2, label: "完成 2 次离线归航" },
      novaFinch: { current: safeCount(gameState?.careerBattles), goal: 5, label: "赢得 5 场战斗" },
      moonHare: { current: safeCount(gameState?.v2?.season?.score), goal: 20, label: "为赛季或航标贡献 20 点" },
    };
    const condition = values[companionId] || { current: 0, goal: 1, label: "继续航行" };
    return { ...condition, ready: condition.current >= condition.goal };
  }

  function advanceCompanionStory(v2, companionId, choiceId, gameState, now = Date.now()) {
    const story = COMPANION_STORIES[companionId];
    if (!story || !gameState?.endgame?.companions?.includes(companionId)) return false;
    const progressRecord = getCompanionRecord(v2, companionId);
    if (progressRecord.stage >= 3) return false;
    const scene = story.scenes[progressRecord.stage];
    if (progressRecord.stage === 1 && !getCompanionCondition(companionId, gameState).ready) return false;
    if (progressRecord.stage < 2) {
      const choice = scene.choices.find((entry) => entry.id === choiceId);
      if (!choice) return false;
      progressRecord.choices.push(choice.id);
    } else {
      const dominantRoute = getDominantRoute(gameState);
      const boldSignals = new Set(["relight", "calibrate", "dive", "chase", "answer", "work", "charge", "sign", "share", "precise", "retry", "new", "complete", "port", "pursue", "help"]);
      const bold = progressRecord.choices.some((id) => boldSignals.has(id)) || dominantRoute === "sentinel";
      progressRecord.ending = `${companionId}:${bold ? "bold" : "quiet"}`;
      const reward = story.reward;
      const bucket = reward.startsWith("title_") ? "titles" : reward.startsWith("skin_") ? "skins" : reward.startsWith("decor_") ? "decorations" : "logs";
      if (!v2.companionStories[bucket].includes(reward)) v2.companionStories[bucket].push(reward);
    }
    progressRecord.memories.push(`scene-${progressRecord.stage}`);
    progressRecord.memories = [...new Set(progressRecord.memories)].slice(-3);
    progressRecord.stage += 1;
    progressRecord.lastAdvancedAt = now;
    record(v2, "companion_choice", { route: getDominantRoute(gameState) }, now);
    return { stage: progressRecord.stage, ending: progressRecord.ending, reward: progressRecord.stage === 3 ? story.reward : "" };
  }

  function queueFeedback(v2, promptId, now = Date.now()) {
    if (!v2?.feedback || !FEEDBACK_PROMPTS[promptId]) return false;
    if (v2.feedback.answered.includes(promptId) || v2.feedback.dismissed.includes(promptId) || v2.feedback.pendingId) return false;
    if (v2.feedback.lastPromptAt && now - v2.feedback.lastPromptAt < 12 * 3600000) return false;
    v2.feedback.pendingId = promptId;
    v2.feedback.lastPromptAt = now;
    return true;
  }

  function answerFeedback(v2, value, now = Date.now()) {
    const promptId = v2?.feedback?.pendingId;
    if (!FEEDBACK_PROMPTS[promptId]) return false;
    const safeValue = Math.min(5, Math.max(1, safeCount(value, 5)));
    v2.feedback.responses.push({ id: promptId, value: safeValue, at: now });
    v2.feedback.responses = v2.feedback.responses.slice(-8);
    v2.feedback.answered.push(promptId);
    v2.feedback.pendingId = "";
    record(v2, "micro_feedback", { value: safeValue }, now);
    window.dispatchEvent(new CustomEvent("stellar-quick-feedback", { detail: { promptId, value: safeValue, at: now } }));
    return true;
  }

  function dismissFeedback(v2) {
    const promptId = v2?.feedback?.pendingId;
    if (!FEEDBACK_PROMPTS[promptId]) return false;
    v2.feedback.dismissed.push(promptId);
    v2.feedback.pendingId = "";
    return true;
  }

  function formatEta(seconds, formatter = null) {
    if (!Number.isFinite(seconds) || seconds < 0) return "暂时无法可靠估算";
    if (seconds <= 1) return "现在即可完成";
    if (formatter) return `预计 ${formatter(seconds)}`;
    if (seconds < 60) return `预计 ${Math.ceil(seconds)} 秒`;
    if (seconds < 3600) return `预计 ${Math.ceil(seconds / 60)} 分钟`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `预计 ${hours} 小时${minutes ? ` ${minutes} 分钟` : ""}`;
  }

  function resourceEta(current, target, rate, formatter) {
    if (current >= target) return "现在即可完成";
    if (!Number.isFinite(rate) || rate <= 0) return "自动产量为零，需先建立生产设施";
    return formatEta((target - current) / rate, formatter);
  }

  let host = null;

  function renderDailyRoute() {
    if (!host) return;
    const gameState = host.getState();
    const v2 = gameState.v2;
    ensureDaily(v2, gameState, host.now());
    const eligible = getEligibleRoutes(gameState);
    const route = ROUTES[v2.dailyRoute.routeId] || null;
    const choices = document.querySelector("#v2-daily-route-choices");
    const tasks = document.querySelector("#v2-daily-route-tasks");
    const status = document.querySelector("#v2-daily-route-status");
    const claim = document.querySelector("#v2-daily-route-claim");
    const reroll = document.querySelector("#v2-daily-route-reroll");
    if (!choices || !tasks || !status || !claim || !reroll) return;
    choices.hidden = Boolean(route);
    choices.innerHTML = eligible.map((entry) => `<button type="button" data-v2-route="${entry.id}" style="--route-color:${entry.color}"><span>${entry.icon}</span><strong>${entry.name}</strong><small>${entry.summary}</small></button>`).join("");
    if (!route) {
      status.textContent = "今天只需选择一条主航线；漏签不会造成永久损失。";
      tasks.innerHTML = '<p class="v2-empty">工业、守备与探索会根据当前解锁自动开放。</p>';
      claim.disabled = true;
      reroll.disabled = true;
      return;
    }
    status.textContent = `${route.icon} ${route.name} · ${route.summary}`;
    const optionalOpen = tasks.querySelector("details")?.open === true;
    const taskCards = v2.dailyRoute.tasks.map((task, index) => {
      const definition = route.tasks.find((item) => item.metric === task.metric) || route.tasks[index];
      const complete = task.progress >= task.goal;
      const ratio = Math.min(1, task.progress / task.goal);
      return `<article class="${complete ? "complete" : ""}"><span>${index === 0 ? "主" : "选"}</span><div><strong>${definition?.title || task.metric}</strong><small>${index === 0 ? "主要目标" : "可选奖励"} · ${Math.floor(task.progress)} / ${task.goal}</small><i><b style="width:${ratio * 100}%"></b></i></div><button type="button" data-v2-action="${definition?.action || "command"}">${complete ? "已完成" : "前往"}</button></article>`;
    });
    tasks.innerHTML = taskCards[0] + `<details ${optionalOpen ? "open" : ""}><summary>可选目标 · 完成 ${getDailyCompletion(v2).optionalCompleted}/2（不影响主奖励）</summary>${taskCards.slice(1).join("")}</details>`;
    claim.disabled = !dailyComplete(v2) || v2.dailyRoute.claimed;
    claim.textContent = v2.dailyRoute.claimed ? "今日已集中领取" : dailyComplete(v2) ? `集中领取 · 可选 ${getDailyCompletion(v2).optionalCompleted}/2` : "完成主目标后领取";
    reroll.disabled = v2.dailyRoute.rerollsUsed >= 1 || v2.dailyRoute.claimed;
    reroll.textContent = v2.dailyRoute.rerollsUsed ? "今日已重签" : "免费重签一次";
  }

  function renderRetention() {
    if (!host) return;
    const state = host.getState().v2.retention;
    const toggle = document.querySelector("#v2-analytics-toggle");
    const status = document.querySelector("#v2-analytics-status");
    if (!toggle || !status) return;
    toggle.checked = state.enabled;
    const milestones = ["first_automation", "first_research", "first_battle", "first_jump", "first_expedition", "first_transcend"];
    const completed = milestones.filter((id) => state.firstAt[id]).length;
    status.textContent = state.enabled
      ? `已同意匿名事件统计 · 本机记录 ${state.events.length} 条 · 关键节点 ${completed}/6。Firebase 未配置 measurementId 时只保存在存档中。`
      : "统计默认关闭。开启后只记录匿名事件名、日期、耗时与路线，不发送姓名、邮箱或完整存档。";
  }

  function renderRunBuild() {
    if (!host) return;
    const gameState = host.getState();
    const run = gameState.v2.runBuild;
    if (!run.routeId && gameState.doctrine?.activeId) {
      beginRun(gameState.v2, gameState.doctrine.activeId, gameState, host.now());
    }
    recordRunPeak(gameState.v2, host.getRate?.(), host.getPower?.());
    const panel = document.querySelector("#v2-run-build");
    const variation = document.querySelector("#v2-run-variation");
    const protocols = document.querySelector("#v2-run-protocols");
    const status = document.querySelector("#v2-run-status");
    const reports = document.querySelector("#v2-run-reports");
    const exportButton = document.querySelector("#v2-run-export");
    if (!panel || !variation || !protocols || !status || !reports || !exportButton) return;
    panel.hidden = !run?.routeId;
    if (!run?.routeId) return;
    const route = ROUTES[run.routeId];
    const selected = getRunProtocol(gameState.v2);
    variation.innerHTML = `<span><small>本轮异象</small><strong>${run.variation.anomaly}</strong></span><span><small>敌方弱点</small><strong>${run.variation.weakness}</strong></span><span><small>资源偏向</small><strong>${run.variation.resource}</strong></span>`;
    protocols.innerHTML = run.offeredProtocolIds.map((id) => {
      const protocol = (RUN_PROTOCOLS[run.routeId] || []).find((entry) => entry.id === id);
      if (!protocol) return "";
      const active = selected?.id === protocol.id;
      return `<button type="button" data-v2-protocol="${protocol.id}" class="${active ? "active" : ""}" ${selected ? "disabled" : ""}><span>${protocol.icon}</span><small>${route.name}</small><strong>${protocol.name}</strong><em>${protocol.benefit}</em><b>代价 · ${protocol.tradeoff}</b><i>${active ? "本轮生效" : "选择协议"}</i></button>`;
    }).join("");
    status.textContent = selected
      ? `${selected.name}已锁定到下一次跃迁；收益与代价已经计入本轮规则。`
      : "从三个协议中选择一个完成 Build。协议只持续本轮，不产生永久倍率。";
    const recent = [...run.reports].reverse().slice(0, 3);
    reports.innerHTML = recent.length ? recent.map((report) => {
      const reportRoute = ROUTES[report.routeId];
      const protocol = (RUN_PROTOCOLS[report.routeId] || []).find((entry) => entry.id === report.protocolId);
      return `<article><span>${reportRoute?.icon || "◒"}</span><div><small>${new Date(report.endedAt).toLocaleDateString("zh-CN")} · ${formatEta(report.duration / 1000).replace(/^预计 /, "")}</small><strong>${reportRoute?.name || "旧航线"} · ${protocol?.name || "未选协议"}</strong><em>峰值 ${Math.floor(report.highestRate)} / 秒 · 战力 ${Math.floor(report.highestPower)} · 远征 ${report.expeditions} · 星核 ${report.gainedCores}</em></div></article>`;
    }).join("") : '<p class="v2-empty">完成下一次跃迁后，这里会保存本轮航线报告。</p>';
    exportButton.disabled = recent.length < 1;
  }

  function renderSeason() {
    if (!host) return;
    const gameState = host.getState();
    const v2 = gameState.v2;
    const windowState = ensureSeason(v2, host.now());
    const root = document.querySelector("#v2-season-card");
    if (!root || !windowState) return;
    const phaseLabels = { preview: "赛季预告", active: "14 天边境赛季", exchange: "至少 7 天兑换期", ended: "赛季已结束" };
    const deadline = windowState.phase === "preview" ? windowState.startAt : windowState.phase === "active" ? windowState.activeEndAt : windowState.exchangeEndAt;
    const remaining = Math.max(0, deadline - host.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.ceil((remaining % 86400000) / 3600000);
    root.querySelector("#v2-season-phase").textContent = phaseLabels[windowState.phase];
    root.querySelector("#v2-season-title").textContent = seasonConfig.title;
    root.querySelector("#v2-season-theme").textContent = seasonConfig.theme;
    root.querySelector("#v2-season-countdown").textContent = windowState.phase === "ended" ? "等待下一期配置" : `${days} 天 ${hours} 小时`;
    root.querySelector("#v2-season-rules").innerHTML = seasonConfig.rotations.map((rule, index) => `<span class="${index === windowState.rotationIndex && windowState.phase === "active" ? "active" : ""}">${index + 1} · ${rule}</span>`).join("");
    const storyIndex = Math.min(2, Math.max(windowState.rotationIndex, Math.floor((v2.season.score / seasonConfig.personalTarget) * 3)));
    root.querySelector("#v2-season-story").textContent = seasonConfig.story[storyIndex];
    root.querySelector("#v2-season-personal").textContent = String(v2.season.score);
    root.querySelector("#v2-season-personal-target").textContent = String(seasonConfig.personalTarget);
    root.querySelector("#v2-season-personal-bar").style.width = `${Math.min(100, v2.season.score / seasonConfig.personalTarget * 100)}%`;
    const personalClaim = root.querySelector("#v2-season-personal-claim");
    personalClaim.disabled = v2.season.personalClaimed || v2.season.score < seasonConfig.personalTarget || !["active", "exchange"].includes(windowState.phase);
    personalClaim.textContent = v2.season.personalClaimed ? "称号与收藏已领取" : v2.season.score >= seasonConfig.personalTarget ? "领取个人收藏奖励" : "完成个人目标后领取";
    root.querySelector("#v2-season-beacon").textContent = String(seasonNetwork.total);
    root.querySelector("#v2-season-beacon-target").textContent = seasonConfig.beaconTarget >= 1000 ? `${Math.round(seasonConfig.beaconTarget / 1000)}K` : String(seasonConfig.beaconTarget);
    root.querySelector("#v2-season-beacon-bar").style.width = `${Math.min(100, seasonNetwork.total / seasonConfig.beaconTarget * 100)}%`;
    root.querySelector("#v2-season-beacon-label").textContent = seasonNetwork.aggregateMode === "server" ? "服务端安全累计 · 全部参与者" : "排行榜活跃玩家汇总";
    const beaconClaim = root.querySelector("#v2-season-beacon-claim");
    const beaconReady = seasonNetwork.online && seasonNetwork.total >= seasonConfig.beaconTarget && v2.season.score >= Math.ceil(seasonConfig.personalTarget * 0.35);
    beaconClaim.disabled = v2.season.beaconClaimed || !beaconReady || !["active", "exchange"].includes(windowState.phase);
    beaconClaim.textContent = v2.season.beaconClaimed ? "星港装饰已领取" : beaconReady ? "领取共同航标装饰" : seasonNetwork.online ? "共同航标建设中" : "等待排行榜连接";
    root.querySelector("#v2-season-ranking").textContent = seasonNetwork.rank
      ? `当前 #${seasonNetwork.rank} · 大致前 ${Math.max(1, Math.ceil(seasonNetwork.percentile))}% · 距上一名 ${seasonNetwork.nextGap}`
      : `个人最佳 ${Math.max(v2.season.score, seasonNetwork.total ? v2.season.score : 0)} · 连接排行榜后显示百分位与差距`;
    root.querySelector("#v2-season-archive").textContent = `赛季收藏 ${v2.season.archive.length} 期 · 本期奖励 ${v2.season.unlockedRewards.length}/3`;
  }

  function renderCompanionStories() {
    if (!host) return;
    const gameState = host.getState();
    const v2 = gameState.v2;
    const root = document.querySelector("#v2-companion-stories");
    if (!root) return;
    const unlockedIds = Object.keys(COMPANION_STORIES).filter((id) => gameState.endgame?.companions?.includes(id));
    if (!v2.companionStories.activeId || !unlockedIds.includes(v2.companionStories.activeId)) {
      v2.companionStories.activeId = unlockedIds[0] || "";
    }
    const completed = Object.values(v2.companionStories.records).filter((entry) => entry.stage >= 3).length;
    root.querySelector("#v2-companion-progress").textContent = `${completed} / 8 结局`;
    root.querySelector("#v2-companion-tabs").innerHTML = Object.entries(COMPANION_STORIES).map(([id, story]) => {
      const unlocked = unlockedIds.includes(id);
      const progress = v2.companionStories.records[id]?.stage || 0;
      return `<button type="button" data-v2-companion="${id}" class="${v2.companionStories.activeId === id ? "active" : ""}" ${unlocked ? "" : "disabled"}><span>${unlocked ? story.icon : "?"}</span><small>${unlocked ? story.name : "未唤醒"}</small><b>${progress}/3</b></button>`;
    }).join("");
    const sceneRoot = root.querySelector("#v2-companion-scene");
    const companionId = v2.companionStories.activeId;
    if (!companionId) {
      sceneRoot.innerHTML = "<p>首次奇点坍缩唤醒伴星后，这里会出现三阶段的长期故事。</p>";
    } else {
      const story = COMPANION_STORIES[companionId];
      const progress = getCompanionRecord(v2, companionId);
      const stage = Math.min(2, progress.stage);
      const scene = story.scenes[stage];
      const condition = getCompanionCondition(companionId, gameState);
      let actions = "";
      if (progress.stage >= 3) {
        actions = `<p class="v2-story-ending">${progress.ending.endsWith(":bold") ? "它记住了你更愿意主动改变航线。" : "它记住了你更愿意倾听并保留余地。"} 结局收藏已进入星港陈列廊。</p>`;
      } else if (progress.stage === 1 && !condition.ready) {
        actions = `<em>${condition.label} · ${Math.min(condition.current, condition.goal)} / ${condition.goal}</em>`;
      } else if (progress.stage < 2) {
        actions = `<div class="v2-companion-choices">${scene.choices.map((choice) => `<button type="button" data-v2-story-choice="${choice.id}">${choice.label}</button>`).join("")}</div>`;
      } else {
        actions = '<button type="button" data-v2-story-choice="finish">阅读结局并收藏纪念</button>';
      }
      sceneRoot.innerHTML = `<header><div><small>${story.name} · ${story.theme}</small><h4>${scene.title}</h4></div><b>阶段 ${Math.min(3, progress.stage + 1)} / 3</b></header><p>${scene.text}</p>${actions}`;
    }
    const rewardLabels = {
      decor_moth_lantern: "微光归航灯", skin_prism_window: "棱镜星窗",
      title_rift_sailor: "称号·裂隙航手", decor_fox_gate: "偶然之门",
      log_future_song: "纪念日志·未来之歌", decor_quiet_corner: "无重力休息角",
      title_gentle_nova: "称号·温柔新星", collection_moon_letter: "收藏·月背来信",
    };
    const rewards = [
      ...v2.companionStories.titles, ...v2.companionStories.decorations,
      ...v2.companionStories.skins, ...v2.companionStories.logs,
    ];
    root.querySelector("#v2-companion-gallery").innerHTML = rewards.length
      ? rewards.map((id) => `<span>✧ ${rewardLabels[id] || id}</span>`).join("")
      : "<span>完成任一伴星结局后，陈列廊会出现第一件纪念物。</span>";
  }

  function renderFeedback() {
    if (!host) return;
    const gameState = host.getState();
    const v2 = gameState.v2;
    if ((gameState.experience?.activeDays || []).length >= 7) queueFeedback(v2, "active_day_7", host.now());
    if ((gameState.expedition?.failedRuns || 0) >= 3) queueFeedback(v2, "repeated_failure", host.now());
    const root = document.querySelector("#v2-feedback-backdrop");
    if (!root) return;
    const prompt = FEEDBACK_PROMPTS[v2.feedback.pendingId];
    root.hidden = !prompt;
    if (!prompt) return;
    root.querySelector("#v2-feedback-title").textContent = prompt.title;
    root.querySelector("#v2-feedback-hint").textContent = prompt.hint;
    root.querySelector("#v2-feedback-options").innerHTML = prompt.labels.map((label, index) => `<button type="button" data-v2-feedback-value="${index + 1}"><b>${index + 1}</b><span>${label}</span></button>`).join("");
  }

  function renderLinkedJourney() {
    if (!host) return;
    let root = document.querySelector("#linked-journey");
    if (!root) {
      root = document.createElement("details");
      root.id = "linked-journey";
      root.className = "v2-run-archive linked-journey";
      root.innerHTML = '<summary>航线委托 · 按需展开</summary><div id="linked-journey-content"></div>';
      document.querySelector("#v2-daily-route")?.after(root);
    }
    const v2 = host.getState().v2;
    const order = getOrder(v2);
    const available = v2.order.day !== dayKey(host.now());
    root.querySelector("div").innerHTML = `<p>每天选择一项行动委托，不提高永久倍率。旧委托可跨日完成；选择新委托会放弃旧进度。</p>${available ? (ROUTE_ORDERS[v2.dailyRoute.routeId] || []).map((entry) => `<button type="button" data-route-order="${entry.id}">${entry.name} · ${entry.goal} 次 · ${entry.reward.materials ? entry.reward.materials + " 材料" : entry.reward.supplies ? entry.reward.supplies + " 补给" : entry.reward.tokens + " 凭证"}</button>`).join("") || "先选择今日主航线。" : "今日委托已锁定，不需要反复切换。"}${order ? `<p>${order.name}：${v2.order.progress}/${order.goal}</p><button type="button" data-v2-action="${order.action}">前往行动</button><button id="route-order-claim" type="button" ${v2.order.claimed || v2.order.progress < order.goal ? "disabled" : ""}>${v2.order.claimed ? "已领取" : "领取委托奖励"}</button>` : ""}`;
  }

  function render() {
    renderLinkedJourney();
    renderDailyRoute();
    renderRetention();
    renderRunBuild();
    renderSeason();
    renderCompanionStories();
    renderFeedback();
  }

  function attach(nextHost) {
    if (host) return;
    host = nextHost;
    document.addEventListener("click", (event) => {
      const orderChoice = event.target.closest("[data-route-order]");
      if (orderChoice && chooseOrder(host.getState().v2, orderChoice.dataset.routeOrder, host.now())) { host.save(); host.render(); }
      if (event.target.closest("#route-order-claim")) {
        const reward = claimOrder(host.getState().v2);
        if (reward) { host.grantReward(reward); host.save(); host.render(); }
      }
      const routeButton = event.target.closest("[data-v2-route]");
      if (routeButton && selectDaily(host.getState().v2, host.getState(), routeButton.dataset.v2Route, host.now())) {
        host.notify("今日航线已确认", `${ROUTES[routeButton.dataset.v2Route].name}将只突出三项有意义的行动。`, ROUTES[routeButton.dataset.v2Route].icon);
        host.save(); host.render();
      }
      const actionButton = event.target.closest("[data-v2-action]");
      if (actionButton) host.navigate(actionButton.dataset.v2Action);
      if (event.target.closest("#v2-daily-route-reroll")) {
        if (rerollDaily(host.getState().v2, host.getState(), host.now())) {
          host.notify("今日航线已重签", "本日不会再次更换；旧目标进度不会产生惩罚。", "⌁");
          host.save(); host.render();
        }
      }
      if (event.target.closest("#v2-daily-route-claim")) {
        const completion = claimDaily(host.getState().v2, host.getState(), host.now());
        if (completion) {
          host.grantReward({ tokens: 12 + completion.optionalCompleted * 3, minutes: 6 + completion.optionalCompleted * 2, materials: completion.optionalCompleted, supplies: 1 });
          host.notify("今日航线已归档", `主目标奖励已领取；额外完成 ${completion.optionalCompleted}/2 项可选目标。`, "✓");
          host.save(); host.render();
        }
      }
      const protocolButton = event.target.closest("[data-v2-protocol]");
      if (protocolButton && selectRunProtocol(host.getState().v2, protocolButton.dataset.v2Protocol, host.now())) {
        const protocol = getRunProtocol(host.getState().v2);
        host.notify("本轮协议已锁定", `${protocol.name}：${protocol.benefit}；代价：${protocol.tradeoff}。`, protocol.icon);
        host.save(); host.render();
      }
      if (event.target.closest("#v2-run-export")) {
        const report = host.getState().v2.runBuild.reports.at(-1);
        if (report) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(new Blob([formatRunReport(report)], { type: "text/plain;charset=utf-8" }));
          link.download = `星港拾荒者-航线报告-${report.routeId}.txt`;
          link.click();
          window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        }
      }
      if (event.target.closest("#v2-season-personal-claim")) {
        const reward = claimSeasonPersonal(host.getState().v2, host.now());
        if (reward) {
          host.grantReward({ tokens: reward.tokens, supplies: reward.supplies });
          host.notify("个人航迹已归档", "获得限定称号“群星归航者”与赛季收藏。", "✧");
          host.save(); host.render();
        }
      }
      if (event.target.closest("#v2-season-beacon-claim")) {
        const reward = claimSeasonBeacon(host.getState().v2, host.now());
        if (reward) {
          host.grantReward({ tokens: reward.tokens, materials: reward.materials });
          host.notify("共同航标已点亮", "获得星港装饰“灯海航标”。", "◇");
          host.save(); host.render();
        }
      }
      const companionButton = event.target.closest("[data-v2-companion]");
      if (companionButton) {
        host.getState().v2.companionStories.activeId = companionButton.dataset.v2Companion;
        host.save(); renderCompanionStories();
      }
      const storyChoice = event.target.closest("[data-v2-story-choice]");
      if (storyChoice) {
        const companionId = host.getState().v2.companionStories.activeId;
        const result = advanceCompanionStory(host.getState().v2, companionId, storyChoice.dataset.v2StoryChoice, host.getState(), host.now());
        if (result) {
          const story = COMPANION_STORIES[companionId];
          host.notify(result.stage >= 3 ? `${story.name}的结局已收藏` : `${story.name}记住了这次选择`, result.reward ? "专属纪念物已进入星港陈列廊。" : "新的共同记忆已经写入存档。", story.icon);
          host.save(); host.render();
        }
      }
      const feedbackValue = event.target.closest("[data-v2-feedback-value]");
      if (feedbackValue && answerFeedback(host.getState().v2, Number(feedbackValue.dataset.v2FeedbackValue), host.now())) {
        host.notify("谢谢你的反馈", "这项回答已记在本地，不会再次询问同一个问题。", "✓");
        host.save(); renderFeedback();
      }
      if (event.target.closest("#v2-feedback-close") && dismissFeedback(host.getState().v2)) {
        host.save(); renderFeedback();
      }
    });
    document.querySelector("#v2-analytics-toggle")?.addEventListener("change", (event) => {
      const retention = host.getState().v2.retention;
      retention.enabled = event.target.checked;
      retention.consentAt = event.target.checked ? host.now() : 0;
      host.save(); renderRetention();
    });
    window.addEventListener("stellar-season-config", (event) => setSeasonConfig(event.detail, host.now()));
    window.addEventListener("stellar-season-ranking-update", (event) => setSeasonNetwork(event.detail));
    render();
  }

  globalThis.StellarV2Systems = Object.freeze({
    ROUTE_ORDERS, chooseOrder, getOrder, claimOrder,
    ROUTES, RUN_PROTOCOLS, RUN_VARIATIONS, COMPANION_STORIES, FEEDBACK_PROMPTS,
    RETENTION_EVENTS, freshState, sanitize, record, ensureDaily,
    getEligibleRoutes, selectDaily, rerollDaily, recordMetric, dailyComplete,
    claimDaily, getDailyCompletion, beginRun, selectRunProtocol, getRunProtocol,
    getRunFactor, recordRunPeak, completeRun, formatRunReport, DEFAULT_SEASON_CONFIG,
    normalizeSeasonConfig, getSeasonWindow, ensureSeason, recordSeasonMetric,
    claimSeasonPersonal, claimSeasonBeacon, setSeasonConfig, setSeasonNetwork,
    getCompanionRecord, getCompanionCondition, getDominantRoute, advanceCompanionStory,
    queueFeedback, answerFeedback, dismissFeedback,
    resourceEta, formatEta, dayKey, attach, render,
  });
})();
