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
      runBuild: null,
      season: null,
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
    base.runBuild = source.runBuild && typeof source.runBuild === "object" ? source.runBuild : null;
    base.season = source.season && typeof source.season === "object" ? source.season : null;
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
    return completion;
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

  function render() {
    renderDailyRoute();
    renderRetention();
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
    });
    document.querySelector("#v2-analytics-toggle")?.addEventListener("change", (event) => {
      const retention = host.getState().v2.retention;
      retention.enabled = event.target.checked;
      retention.consentAt = event.target.checked ? host.now() : 0;
      host.save(); renderRetention();
    });
    render();
  }

  globalThis.StellarV2Systems = Object.freeze({
    ROUTES, RETENTION_EVENTS, freshState, sanitize, record, ensureDaily,
    getEligibleRoutes, selectDaily, rerollDaily, recordMetric, dailyComplete,
    claimDaily, getDailyCompletion, resourceEta, formatEta, dayKey, attach, render,
  });
})();
