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

  function freshState(now = Date.now()) {
    return {
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
        startSnapshot: {}, reports: [],
      },
      season: {
        id: "", title: "", score: 0, participated: false,
        personalClaimed: false, beaconClaimed: false, lastMetricAt: 0,
        unlockedRewards: [], archive: [],
      },
      companionStories: null,
      feedback: null,
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
      },
      reports: (Array.isArray(runBuild.reports) ? runBuild.reports : []).flatMap((report) => {
        if (!report || !ROUTES[report.routeId]) return [];
        return [{
          id: String(report.id || "").slice(0, 96), routeId: report.routeId,
          protocolId: String(report.protocolId || "").slice(0, 40), seed: String(report.seed || "").slice(0, 96),
          startedAt: safeTime(report.startedAt), endedAt: safeTime(report.endedAt),
          gainedCores: safeCount(report.gainedCores, 1000000000),
          dust: Math.max(0, Number(report.dust) || 0), battles: safeCount(report.battles), expeditions: safeCount(report.expeditions),
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
    base.companionStories = source.companionStories && typeof source.companionStories === "object" ? source.companionStories : null;
    base.feedback = source.feedback && typeof source.feedback === "object" ? source.feedback : null;
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
      expeditions: safeCount(gameState?.expedition?.completed),
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

  function completeRun(v2, gameState, gainedCores = 0, now = Date.now()) {
    if (!v2?.runBuild?.routeId || !v2.runBuild.startedAt) return null;
    const current = snapshotRun(gameState);
    const start = v2.runBuild.startSnapshot || {};
    const report = {
      id: `${v2.runBuild.seed}:${now}`,
      routeId: v2.runBuild.routeId,
      protocolId: v2.runBuild.selectedProtocolId,
      seed: v2.runBuild.seed,
      startedAt: v2.runBuild.startedAt,
      endedAt: now,
      gainedCores: safeCount(gainedCores, 1000000000),
      dust: Math.max(0, current.dust - (Number(start.dust) || 0)),
      battles: Math.max(0, current.battles - (Number(start.battles) || 0)),
      expeditions: Math.max(0, current.expeditions - (Number(start.expeditions) || 0)),
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
      `战斗胜利：${safeCount(report?.battles)} / 远征完成：${safeCount(report?.expeditions)}`,
      `获得星核：${safeCount(report?.gainedCores)}`,
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
    tasks.innerHTML = v2.dailyRoute.tasks.map((task, index) => {
      const definition = route.tasks.find((item) => item.metric === task.metric) || route.tasks[index];
      const complete = task.progress >= task.goal;
      const ratio = Math.min(1, task.progress / task.goal);
      return `<article class="${complete ? "complete" : ""}"><span>${index === 0 ? "主" : "选"}</span><div><strong>${definition?.title || task.metric}</strong><small>${index === 0 ? "主要目标" : "可选奖励"} · ${Math.floor(task.progress)} / ${task.goal}</small><i><b style="width:${ratio * 100}%"></b></i></div><button type="button" data-v2-action="${definition?.action || "command"}">${complete ? "已完成" : "前往"}</button></article>`;
    }).join("");
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
      return `<article><span>${reportRoute?.icon || "◒"}</span><div><small>${new Date(report.endedAt).toLocaleDateString("zh-CN")}</small><strong>${reportRoute?.name || "旧航线"} · ${protocol?.name || "未选协议"}</strong><em>星尘 ${Math.floor(report.dust)} · 战斗 ${report.battles} · 远征 ${report.expeditions} · 星核 ${report.gainedCores}</em></div></article>`;
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

  function render() {
    renderDailyRoute();
    renderRetention();
    renderRunBuild();
    renderSeason();
  }

  function attach(nextHost) {
    if (host) return;
    host = nextHost;
    document.addEventListener("click", (event) => {
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
    ROUTES, RUN_PROTOCOLS, RUN_VARIATIONS, RETENTION_EVENTS, freshState, sanitize, record, ensureDaily,
    getEligibleRoutes, selectDaily, rerollDaily, recordMetric, dailyComplete,
    claimDaily, getDailyCompletion, beginRun, selectRunProtocol, getRunProtocol,
    getRunFactor, completeRun, formatRunReport, DEFAULT_SEASON_CONFIG,
    normalizeSeasonConfig, getSeasonWindow, ensureSeason, recordSeasonMetric,
    claimSeasonPersonal, claimSeasonBeacon, setSeasonConfig, setSeasonNetwork,
    resourceEta, formatEta, dayKey, attach, render,
  });
})();
