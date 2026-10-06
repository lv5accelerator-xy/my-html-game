/* No DOM, storage or real-time timers: identical rules online and offline. */
(function (root, factory) {
  const data =
    typeof module === "object" && module.exports
      ? require("./data.js")
      : root.SalvageData;
  const api = factory(data);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SalvageEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (D) {
  "use strict";
  const byId = (items, id) => items.find((item) => item.id === id);
  const bounded = (value, max = D.MAX_NUMBER) =>
    Math.min(max, Math.max(0, Number(value) || 0));
  const integer = (value, max = 10000) => Math.floor(bounded(value, max));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const milestone = (count) =>
    2 ** D.MILESTONES.filter((n) => count >= n).length;
  const has = (s, id) => s.research.includes(id);
  const equipped = (s, id) =>
    s.equipped.includes(id) ? s.modules[id] || 0 : 0;
  const unlocked = (s, item) =>
    s.run.dust >= item.unlock || s.buildings[item.id] > 0;
  function freshTiming(clock = 0, late = false) {
    return {
      sinceClock: clock,
      late,
      foregroundSeconds: 0,
      offlineSeconds: 0,
      events: {},
    };
  }
  function recordTiming(s, event, source = "manual") {
    if (!s.timing) s.timing = freshTiming(s.clock, true);
    if (s.timing.events[event]) return;
    s.timing.events[event] = {
      elapsedSeconds: s.clock - s.timing.sinceClock,
      foregroundSeconds: s.timing.foregroundSeconds,
      offlineSeconds: s.timing.offlineSeconds,
      run: s.rebirths + 1,
      source,
    };
  }
  function createState(now = Date.now(), seed = 0x51a7c0de) {
    return {
      schema: "salvage-orbit",
      version: D.VERSION,
      createdAt: now,
      lastAt: now,
      carryMs: 0,
      clock: 0,
      dust: 0,
      lifetimeDust: 0,
      cores: 0,
      totalCores: 0,
      rebirths: 0,
      samples: 0,
      buildings: Object.fromEntries(D.BUILDINGS.map((b) => [b.id, 0])),
      research: [],
      run: {
        startedClock: 0,
        dust: 0,
        route: "industry",
        routeChosen: false,
        choices: 0,
      },
      automation: {
        enabled: false,
        policy: "balanced",
        reserve: 0,
        research: false,
        dispatch: false,
      },
      modules: {},
      equipped: [],
      mission: null,
      result: null,
      repeatId: "belt",
      lore: [],
      journal: [],
      discoveries: 0,
      starport: 0,
      chapter: [],
      campaign: { completed: [], preparation: null },
      records: [],
      beacon: { nextAt: 45, expiresAt: 0 },
      burstUntil: 0,
      lastScanClock: -1,
      rng: Number(seed) >>> 0 || 1,
      legacyArchive: null,
      timing: freshTiming(),
    };
  }
  function log(s, text) {
    s.journal.unshift({ clock: s.clock, text });
    s.journal = s.journal.slice(0, 12);
  }
  function random(s) {
    let n = s.rng >>> 0;
    n ^= n << 13;
    n ^= n >>> 17;
    n ^= n << 5;
    s.rng = n >>> 0;
    return s.rng / 4294967296;
  }
  function addDust(s, amount) {
    const gain = bounded(amount);
    s.dust = bounded(s.dust + gain);
    s.lifetimeDust = bounded(s.lifetimeDust + gain);
    s.run.dust = bounded(s.run.dust + gain);
    return gain;
  }
  function costFactor(s) {
    return (
      (has(s, "compact") ? 0.9 : 1) *
      Math.max(0.65, 0.96 ** Math.min(s.rebirths, 20))
    );
  }
  function buildingCost(s, id, count = 1) {
    const b = byId(D.BUILDINGS, id);
    if (!b || count < 1 || count > 50 || s.buildings[id] + count > 10000)
      return Infinity;
    const total =
      ((b.cost * b.growth ** s.buildings[id] * (b.growth ** count - 1)) /
        (b.growth - 1)) *
      costFactor(s);
    return Number.isFinite(total) && total <= D.MAX_NUMBER
      ? Math.ceil(total - 1e-9)
      : Infinity;
  }
  function rawRate(s) {
    let rate = 0;
    for (const b of D.BUILDINGS) {
      let factor = milestone(s.buildings[b.id]);
      if (s.run.route === "industry" && s.buildings[b.id] >= 25) factor *= 1.25;
      if (b.id === "sail") factor *= 1 + equipped(s, "solar") * 0.3;
      rate += b.rate * s.buildings[b.id] * factor;
    }
    if (s.run.route === "industry")
      rate *= 1 + Math.min(5, Math.floor(s.buildings.drone / 10)) * 0.08;
    rate *= (has(s, "panels") ? 1.2 : 1) * (has(s, "network") ? 1.35 : 1);
    rate *= 1 + Math.sqrt(s.totalCores) * 0.25;
    rate *= 1 + equipped(s, "battery") * 0.12 + equipped(s, "medbay") * 0.1;
    if (s.chapter?.includes("relay")) rate *= 1.05;
    return bounded(rate);
  }
  function productionRate(s) {
    return bounded(
      rawRate(s) *
        (s.mission ? 1 - s.mission.diversion : 1) *
        (s.clock < s.burstUntil ? 2 : 1),
    );
  }
  function scanValue(s) {
    const value = 2 * (has(s, "laser") ? 2 : 1) + rawRate(s) * 0.12;
    return bounded(
      value *
        (s.run.route === "reclaim" ? 3 : 1) *
        (1 + equipped(s, "scanner") * 0.25),
    );
  }
  // Read-only previews include milestone, route, research and equipped-module effects.
  function purchaseImpact(s, id, count = 1) {
    const cost = buildingCost(s, id, count);
    if (!Number.isFinite(cost))
      return { count: 0, cost, delta: 0, payback: null, wait: null };
    const after = {
      ...s,
      buildings: { ...s.buildings, [id]: s.buildings[id] + count },
    };
    const delta = Math.max(0, productionRate(after) - productionRate(s));
    const steadyDelta =
      Math.max(0, rawRate(after) - rawRate(s)) *
      (s.mission ? 1 - s.mission.diversion : 1);
    return {
      count,
      cost,
      delta,
      payback: steadyDelta > 0 ? Math.ceil(cost / steadyDelta) : null,
      wait: incomeEta(s, Math.max(0, cost - s.dust)),
    };
  }
  function purchasePreview(s, id, requested = 1) {
    const b = byId(D.BUILDINGS, id);
    if (!b || !unlocked(s, b))
      return { count: 0, cost: Infinity, delta: 0, payback: null, wait: null };
    let count = Math.min(
      requested === "max" ? 50 : integer(requested, 50),
      10000 - s.buildings[id],
    );
    if (count < 1)
      return { count: 0, cost: Infinity, delta: 0, payback: null, wait: null };
    while (count > 1 && buildingCost(s, id, count) > s.dust) count--;
    return purchaseImpact(s, id, count);
  }
  // Fixed-fleet estimate; ongoing diversion and a temporary beacon burst expire normally.
  // Future purchases, research, scans and unclaimed rewards are not assumed.
  function incomeEta(s, missing) {
    if (missing <= 0) return 0;
    const base = rawRate(s);
    if (!Number.isFinite(missing) || base <= 0) return null;
    const missionEnd = s.mission
      ? Math.max(s.clock + 1, s.mission.end)
      : s.clock;
    const ends = [
      ...new Set([missionEnd, s.burstUntil].filter((t) => t > s.clock)),
    ].sort((a, b) => a - b);
    let at = s.clock,
      left = missing;
    const rateAt = (t) =>
      base *
      (s.mission && t < missionEnd ? 1 - s.mission.diversion : 1) *
      (t < s.burstUntil ? 2 : 1);
    for (const end of ends) {
      const rate = rateAt(at),
        seconds = end - at;
      if (left <= rate * seconds) return Math.ceil(at - s.clock + left / rate);
      left -= rate * seconds;
      at = end;
    }
    return Math.ceil(at - s.clock + left / base);
  }
  function scan(s) {
    if (s.clock - s.lastScanClock < 1) return 0;
    s.lastScanClock = s.clock;
    return addDust(s, scanValue(s));
  }
  function buy(s, id, requested = 1, budget = s.dust, source = "manual") {
    const b = byId(D.BUILDINGS, id);
    if (!b || !unlocked(s, b)) return 0;
    const limit = Math.min(
      50,
      requested === "max" ? 50 : integer(requested, 50),
    );
    let count = limit;
    const available = Math.min(s.dust, bounded(budget));
    while (count > 0 && buildingCost(s, id, count) > available) count--;
    if (!count) return 0;
    const previous = s.buildings[id];
    s.dust = Math.max(0, s.dust - buildingCost(s, id, count));
    s.buildings[id] += count;
    if (id === "drone") recordTiming(s, "drone", source);
    for (const level of D.MILESTONES)
      if (previous < level && s.buildings[id] >= level)
        log(s, `${b.name}达到 ${level} 艘，本设施产量翻倍。`);
    if (previous === 0) log(s, `${b.name}启动，航线开始向更远处延伸。`);
    return count;
  }
  function research(s, id, budget = s.dust, source = "manual") {
    const item = byId(D.RESEARCH, id);
    if (
      !item ||
      has(s, id) ||
      s.run.dust < item.unlock ||
      Math.min(s.dust, budget) < item.cost
    )
      return false;
    s.dust -= item.cost;
    s.research.push(id);
    recordTiming(s, "research", source);
    log(s, `完成研究：${item.name}。`);
    return true;
  }
  function chooseRoute(s, id) {
    if (s.run.routeChosen || s.buildings.drone === 0 || !byId(D.ROUTES, id))
      return false;
    s.run.route = id;
    s.run.routeChosen = true;
    log(s, `本航次选择${byId(D.ROUTES, id).name}。跃迁后可以重新选择。`);
    return true;
  }
  function capability(s, id) {
    return s.rebirths >= (byId(D.CAPABILITIES, id)?.run || Infinity);
  }
  function configure(s, patch) {
    if (typeof patch.enabled === "boolean" && capability(s, "autoBuy"))
      s.automation.enabled = patch.enabled;
    if (capability(s, "planning")) {
      if (["balanced", "milestone", "advanced"].includes(patch.policy))
        s.automation.policy = patch.policy;
      if (patch.reserve !== undefined)
        s.automation.reserve = bounded(patch.reserve);
    }
    if (typeof patch.research === "boolean" && capability(s, "autoResearch"))
      s.automation.research = patch.research;
    if (typeof patch.dispatch === "boolean" && capability(s, "autoDispatch"))
      s.automation.dispatch = patch.dispatch;
  }
  function affordableBest(s, policy = "balanced", reserve = 0) {
    const before = rawRate(s);
    const list = [];
    for (const b of D.BUILDINGS) {
      const cost = buildingCost(s, b.id);
      if (!unlocked(s, b) || cost > Math.max(0, s.dust - reserve)) continue;
      s.buildings[b.id]++;
      const delta = Math.max(0.0001, rawRate(s) - before);
      s.buildings[b.id]--;
      let score = cost / delta;
      if (policy === "milestone") {
        const next = D.MILESTONES.find((n) => n > s.buildings[b.id]);
        if (next && next - s.buildings[b.id] <= 3) score *= 0.45;
      }
      if (policy === "advanced") score /= 1 + D.BUILDINGS.indexOf(b) * 0.35;
      list.push({ id: b.id, score, cost });
    }
    list.sort((a, b) => a.score - b.score || a.cost - b.cost);
    return list[0] || null;
  }
  function storyText(s, id) {
    const story = D.STORIES[id];
    if (!story) return "";
    const prior =
      story.continuity &&
      s.lore.find((r) => r.story === story.continuity.story);
    const context = prior && story.continuity.choices[prior.choice];
    const mission = D.MISSIONS.find((m) => m.campaign && m.story === id);
    const record =
      mission &&
      (s.result?.id === mission.id
        ? s.result
        : s.campaign.completed.find((r) => r.id === mission.id));
    const preparation = record && byId(D.EXPEDITION_PLANS, record.plan)?.report;
    return [context, preparation, story.text].filter(Boolean).join(" ");
  }
  function campaignMission(s) {
    return (
      D.MISSIONS.filter((m) => m.campaign)[s.campaign.completed.length] || null
    );
  }
  function prepareMission(s, id, plan) {
    const m = campaignMission(s);
    if (
      !m ||
      m.id !== id ||
      missionLock(s, id) ||
      s.mission ||
      s.result ||
      !byId(D.EXPEDITION_PLANS, plan)
    )
      return false;
    s.campaign.preparation = { id, plan };
    return true;
  }
  function routeArchive(s) {
    const chapter =
      s.starport < D.PORT.length
        ? 1
        : s.chapter.length < D.PROJECTS.length
          ? 2
          : 3;
    return {
      chapter,
      title: ["最后一盏灯", "远航星图", "白噪声海"][chapter - 1],
      complete: chapter === 3 && !campaignMission(s),
      characters: D.CHARACTERS.filter((c) =>
        s.lore.some((r) => r.story === c.story),
      ),
      letters: D.LETTERS.filter((l) =>
        s.lore.some((r) => r.story === l.story),
      ).map((l) => {
        const prior =
          l.continuity && s.lore.find((r) => r.story === l.continuity.story);
        return {
          ...l,
          text: [prior && l.continuity.choices[prior.choice], l.text]
            .filter(Boolean)
            .join(" "),
        };
      }),
      entries: s.lore.map((r) => {
        const mission = D.MISSIONS.find(
          (m) => m.campaign && m.story === r.story,
        );
        const record =
          mission &&
          s.campaign.completed.find((item) => item.id === mission.id);
        return {
          ...r,
          title: D.STORIES[r.story].title,
          text: storyText(s, r.story),
          decision: byId(D.STORIES[r.story].choices, r.choice).name,
          plan: record && byId(D.EXPEDITION_PLANS, record.plan).name,
        };
      }),
    };
  }
  function missionLock(s, id) {
    const m = byId(D.MISSIONS, id);
    if (!m) return "未知航线";
    if (s.starport < m.unlockPort)
      return `先完成星港修复 ${m.unlockPort} / ${D.PORT.length}`;
    if (m.project && !s.chapter?.includes(m.project))
      return `先建成${byId(D.PROJECTS, m.project).name}`;
    if (m.campaign && campaignMission(s)?.id !== id)
      return s.campaign.completed.some((r) => r.id === id)
        ? "这段主线已经完成，可在航线档案重读"
        : "先完成上一段白噪声海交接";
    if (m.requiresStory && !s.lore.some((r) => r.story === m.requiresStory))
      return `先处理「${D.STORIES[m.requiresStory].title}」的故事选择`;
    if (m.research && !has(s, m.research))
      return `本航次先研究${byId(D.RESEARCH, m.research).name}`;
    if (m.equipment && equipped(s, m.equipment.id) < m.equipment.level)
      return `装备 ${m.equipment.level} 级${byId(D.MODULES, m.equipment.id).name}`;
    return "";
  }
  function missionOptions(s) {
    return D.MISSIONS.filter((m) => !missionLock(s, m.id));
  }
  function missionPreview(s, id, planId) {
    const m = byId(D.MISSIONS, id);
    if (!m) return null;
    const explorer = s.run.route === "explore";
    const plan =
      m.campaign &&
      byId(
        D.EXPEDITION_PLANS,
        planId ||
          (s.campaign.preparation?.id === id
            ? s.campaign.preparation.plan
            : ""),
      );
    return {
      seconds: Math.max(
        30,
        Math.ceil(
          m.seconds *
            (plan ? plan.seconds : 1) *
            (explorer ? 0.65 : 1) *
            Math.max(0.7, 1 - equipped(s, "nav") * 0.1) *
            (s.chapter?.includes("lighthouse") ? 0.9 : 1),
        ),
      ),
      diversion:
        m.diversion * (explorer ? 0.5 : 1) * (plan ? plan.diversion : 1),
      chance: Math.min(
        1,
        m.chance +
          (explorer && m.chance < 1 ? 0.15 : 0) +
          (has(s, "navigation") && m.chance < 1 ? 0.05 : 0),
      ),
      samples:
        m.samples +
        (plan ? plan.samples : 0) +
        (explorer ? 1 : 0) +
        (s.chapter?.includes("nursery") ? 1 : 0),
      dust: Math.max(20, rawRate(s) * m.yieldSeconds * (plan ? plan.dust : 1)),
    };
  }
  function startMission(s, id) {
    if (
      s.run.dust < 600 ||
      s.mission ||
      s.result ||
      !missionOptions(s).some((m) => m.id === id) ||
      rawRate(s) === 0
    )
      return false;
    const m = byId(D.MISSIONS, id),
      preview = missionPreview(s, id);
    if (m.campaign && s.campaign.preparation?.id !== id) return false;
    const succeeded = random(s) < preview.chance;
    const module =
      succeeded && m.chance < 1
        ? ["battery", "scanner", "nav"][Math.floor(random(s) * 3)]
        : null;
    s.mission = {
      id,
      start: s.clock,
      end: s.clock + preview.seconds,
      ...preview,
      succeeded,
      module,
      ...(m.campaign ? { plan: s.campaign.preparation.plan } : {}),
    };
    if (m.campaign) s.campaign.preparation = null;
    log(s, `派遣探索：${m.name}，预计 ${preview.seconds} 秒归航。`);
    return true;
  }
  function completeMission(s) {
    const m = s.mission;
    if (!m || s.clock < m.end) return;
    const def = byId(D.MISSIONS, m.id);
    const story =
      m.succeeded &&
      def.story &&
      !s.lore.some((entry) => entry.story === def.story) &&
      (def.chapter || def.campaign || s.run.choices < 2)
        ? def.story
        : null;
    s.result = {
      id: m.id,
      succeeded: m.succeeded,
      dust: m.succeeded ? m.dust : 0,
      samples: m.succeeded ? m.samples : 1,
      module: m.module,
      story,
      ...(def.campaign ? { plan: m.plan } : {}),
    };
    s.mission = null;
    log(
      s,
      `${def.name}归航，${m.succeeded ? "发现已送达，等待你的安排" : "未能进入裂隙，带回 1 份样本"}。`,
    );
  }
  function grantModule(s, id) {
    s.modules[id] = Math.min(D.MODULE_MAX_LEVEL, (s.modules[id] || 0) + 1);
    if (s.equipped.length < 2 && !s.equipped.includes(id)) s.equipped.push(id);
  }
  function moduleOffer(s, id) {
    const item = byId(D.MODULES, id);
    if (!item) return null;
    const level = s.modules[id] || 0;
    const unlocked =
      level > 0 ||
      (item.story
        ? s.lore.some((r) => r.story === item.story)
        : s.discoveries > 0 ||
          s.lore.length > 0 ||
          Object.values(s.modules).some((n) => n > 0));
    const samples = level ? D.MODULE_UPGRADE_SAMPLES[level - 1] : item.samples;
    return {
      id,
      level,
      unlocked,
      samples: samples ?? null,
      available: unlocked && level < D.MODULE_MAX_LEVEL && s.samples >= samples,
      reason:
        level >= D.MODULE_MAX_LEVEL
          ? "已达到最高等级"
          : unlocked
            ? ""
            : item.story
              ? `处理「${D.STORIES[item.story].title}」的任意故事选择后开放`
              : "收取第一份成功的探索报告后开放",
    };
  }
  function buildModule(s, id) {
    const offer = moduleOffer(s, id);
    if (!offer?.available) return false;
    s.samples -= offer.samples;
    grantModule(s, id);
    log(
      s,
      `${offer.level ? "升级" : "装配"}${byId(D.MODULES, id).name}：${s.modules[id]} 级，使用 ${offer.samples} 份样本。`,
    );
    return true;
  }
  function claimMission(s, choiceId, source = "manual") {
    const r = s.result;
    if (!r) return false;
    const mission = byId(D.MISSIONS, r.id);
    if (
      mission.campaign &&
      (campaignMission(s)?.id !== r.id ||
        r.story !== mission.story ||
        !byId(D.EXPEDITION_PLANS, r.plan))
    )
      return false;
    const story = r.story && D.STORIES[r.story];
    const choice = story && byId(story.choices, choiceId);
    if (story && !choice) return false;
    recordTiming(s, "report", source);
    addDust(s, r.dust);
    s.samples = bounded(s.samples + r.samples);
    if (r.module) grantModule(s, r.module);
    if (choice) {
      if (choice.dustSeconds)
        addDust(s, Math.max(50, rawRate(s) * choice.dustSeconds));
      if (choice.module) {
        if (
          choice.overflowSamples &&
          s.modules[choice.module] >= D.MODULE_MAX_LEVEL
        )
          s.samples = bounded(s.samples + choice.overflowSamples);
        else grantModule(s, choice.module);
      }
      s.samples = bounded(s.samples + (choice.samples || 0));
      s.lore.push({ story: r.story, choice: choice.id });
      if (!mission.chapter && !mission.campaign) s.run.choices++;
      log(s, `${story.title}：${choice.name}。这段记忆会陪你进入下一航次。`);
    }
    s.discoveries = bounded(s.discoveries + (r.succeeded ? 1 : 0));
    if (mission.campaign) {
      s.campaign.completed.push({ id: r.id, plan: r.plan });
      if (!campaignMission(s)) {
        s.repeatId = "supply-run";
        log(
          s,
          "第三章「白噪声海」完成。第一支船队安全进港，两港补给线永久开放。新的值班表已经归档。",
        );
      }
    }
    s.result = null;
    return true;
  }
  function equip(s, id) {
    if (!byId(D.MODULES, id) || !s.modules[id]) return false;
    if (s.equipped.includes(id))
      s.equipped = s.equipped.filter((x) => x !== id);
    else if (s.equipped.length < 2) s.equipped.push(id);
    else return false;
    return true;
  }
  function claimBeacon(s) {
    if (!s.beacon.expiresAt || s.clock >= s.beacon.expiresAt) return 0;
    const reward =
      Math.max(20, rawRate(s) * 30) *
      (s.run.route === "reclaim" ? 2 : 1) *
      (1 + equipped(s, "scanner") * 0.25);
    s.beacon.expiresAt = 0;
    if (s.run.route === "reclaim") s.burstUntil = s.clock + 20;
    log(s, "捕获金色信标，临时补给已经入库。");
    return addDust(s, reward);
  }
  function repairPort(s) {
    const stage = D.PORT[s.starport];
    if (!stage || s.cores < stage.cores || s.samples < stage.samples)
      return false;
    s.cores -= stage.cores;
    s.samples -= stage.samples;
    s.starport++;
    log(s, stage.text);
    return true;
  }
  function projectOffer(s, id) {
    const project = byId(D.PROJECTS, id);
    if (!project) return null;
    const index = D.PROJECTS.indexOf(project);
    const built = s.chapter?.includes(id) || false;
    const unlocked =
      s.starport === D.PORT.length &&
      D.PROJECTS.slice(0, index).every((p) => s.chapter?.includes(p.id)) &&
      s.lore.some((r) => r.story === project.story);
    return {
      ...project,
      built,
      unlocked,
      available:
        !built &&
        unlocked &&
        s.cores >= project.cores &&
        s.samples >= project.samples,
    };
  }
  function buildProject(s, id) {
    const offer = projectOffer(s, id);
    if (!offer?.available) return false;
    s.cores -= offer.cores;
    s.samples -= offer.samples;
    s.chapter.push(id);
    log(s, offer.text);
    return true;
  }
  function prestigeGain(s) {
    return s.run.dust < D.PRESTIGE_DUST
      ? 0
      : Math.min(
          1000000,
          Math.floor(4 * Math.sqrt(s.run.dust / D.PRESTIGE_DUST)),
        );
  }
  function prestige(s) {
    const gain = prestigeGain(s);
    if (!gain || s.mission || s.result) return false;
    recordTiming(s, "prestige");
    s.records.unshift({
      seconds: s.clock - s.run.startedClock,
      route: s.run.route,
      gain,
    });
    s.records = s.records.slice(0, 5);
    s.cores = bounded(s.cores + gain);
    s.totalCores = bounded(s.totalCores + gain);
    s.rebirths++;
    s.buildings = Object.fromEntries(
      D.BUILDINGS.map((b) => [b.id, b.id === "drone" ? 1 : 0]),
    );
    s.research = [];
    s.dust = 12;
    s.run = {
      startedClock: s.clock,
      dust: 12,
      route: "industry",
      routeChosen: false,
      choices: 0,
    };
    s.automation.enabled = true;
    s.beacon = { nextAt: s.clock + 45, expiresAt: 0 };
    s.burstUntil = 0;
    log(
      s,
      `第 ${s.rebirths + 1} 航次启航，获得 ${gain} 星核。舰装、故事和星港修复保留。`,
    );
    const newly = D.CAPABILITIES.find((c) => c.run === s.rebirths);
    if (newly) log(s, `解锁${newly.name}：${newly.detail}`);
    return gain;
  }
  function progressSnapshot(s) {
    return {
      dust: s.dust,
      samples: s.samples,
      buildings: { ...s.buildings },
      research: [...s.research],
      modules: { ...s.modules },
    };
  }
  function returnReport(s, before, totals) {
    return {
      ...totals,
      netDust: s.dust - before.dust,
      samples: s.samples - before.samples,
      buildings: D.BUILDINGS.map((b) => ({
        id: b.id,
        count: s.buildings[b.id] - before.buildings[b.id],
      })).filter((b) => b.count > 0),
      research: s.research.filter((id) => !before.research.includes(id)),
      modules: D.MODULES.filter(
        (m) => (s.modules[m.id] || 0) > (before.modules[m.id] || 0),
      ).map((m) => ({ id: m.id, level: s.modules[m.id] })),
      pending: s.result?.id || null,
      story: s.result?.story || null,
    };
  }
  function tick(s, offline, active, activity) {
    // Income uses the previous second's state. Completion and purchases affect the next second.
    addDust(s, productionRate(s));
    s.clock++;
    if (offline) s.timing.offlineSeconds++;
    else if (active) s.timing.foregroundSeconds++;
    const returning = Boolean(s.mission && s.clock >= s.mission.end);
    completeMission(s);
    if (activity && returning) activity.missionsCompleted++;
    if (s.beacon.expiresAt && s.clock >= s.beacon.expiresAt)
      s.beacon.expiresAt = 0;
    if (s.clock >= s.beacon.nextAt) {
      s.beacon.expiresAt = offline ? 0 : s.clock + 15;
      s.beacon.nextAt = s.clock + 120 + Math.floor(random(s) * 120);
    }
    const reserve = capability(s, "planning") ? s.automation.reserve : 0;
    if (
      capability(s, "autoResearch") &&
      s.automation.research &&
      s.clock % 5 === 0
    ) {
      const candidate = D.RESEARCH.find(
        (r) =>
          !has(s, r.id) && s.run.dust >= r.unlock && s.dust - reserve >= r.cost,
      );
      if (candidate) {
        const beforeDust = s.dust;
        research(
          s,
          candidate.id,
          Math.max(0, s.dust - reserve),
          offline ? "offline" : "auto",
        );
        if (activity) activity.spentDust += Math.max(0, beforeDust - s.dust);
      }
    }
    if (capability(s, "autoBuy") && s.automation.enabled) {
      const candidate = affordableBest(
        s,
        capability(s, "planning") ? s.automation.policy : "balanced",
        reserve,
      );
      if (candidate) {
        const beforeDust = s.dust;
        buy(
          s,
          candidate.id,
          1,
          Math.max(0, s.dust - reserve),
          offline ? "offline" : "auto",
        );
        if (activity) activity.spentDust += Math.max(0, beforeDust - s.dust);
      }
    }
    if (capability(s, "autoDispatch") && s.automation.dispatch) {
      if (s.result && !s.result.story) {
        const claimed = claimMission(
          s,
          undefined,
          offline ? "offline" : "auto",
        );
        if (activity && claimed) activity.reportsClaimed++;
      }
      const newStory = missionOptions(s).some(
        (m) =>
          (m.chapter || m.campaign) && !s.lore.some((r) => r.story === m.story),
      );
      if (!s.result && !s.mission && !newStory) {
        const candidate =
          missionOptions(s).find(
            (m) =>
              m.id === s.repeatId &&
              m.chance === 1 &&
              !m.chapter &&
              !m.campaign,
          ) || D.MISSIONS.find((m) => m.id === "belt");
        startMission(s, candidate.id);
      }
    }
  }
  function advance(s, now, options = {}) {
    const snapshot = options.report ? progressSnapshot(s) : null;
    const activity = options.report
      ? { spentDust: 0, missionsCompleted: 0, reportsClaimed: 0 }
      : null;
    const elapsedMs = Math.max(0, Number(now) - s.lastAt);
    if (!Number.isFinite(elapsedMs))
      return { seconds: 0, dust: 0, capped: false };
    if (Number(now) < s.lastAt) return { seconds: 0, dust: 0, capped: false };
    const capped = elapsedMs > D.OFFLINE_SECONDS * 1000;
    const total = Math.min(elapsedMs, D.OFFLINE_SECONDS * 1000) + s.carryMs;
    const seconds = Math.floor(total / 1000),
      before = s.lifetimeDust;
    s.carryMs = total % 1000;
    s.lastAt = Number(now);
    if (!s.timing) s.timing = freshTiming(s.clock, true);
    for (let i = 0; i < seconds; i++)
      tick(s, options.offline === true, options.active === true, activity);
    const totals = {
      seconds,
      dust: Math.max(0, s.lifetimeDust - before),
      capped,
    };
    return snapshot
      ? returnReport(s, snapshot, { ...totals, ...activity })
      : totals;
  }
  function reachable(s, action) {
    return (
      ["home", "fleet"].includes(action) ||
      (action === "explore" &&
        (s.run.dust >= 600 || Boolean(s.mission || s.result))) ||
      (action === "jump" &&
        (s.run.dust >= D.PRESTIGE_DUST * 0.3 || s.rebirths > 0))
    );
  }
  function missionPrerequisite(s, id) {
    const m = byId(D.MISSIONS, id);
    if (!m || !reachable(s, "explore")) return null;
    const base = {
      action: "explore",
      label: "补齐航路条件",
      value: 0,
      target: 1,
      eta: 0,
    };
    if (s.starport < m.unlockPort)
      return {
        ...base,
        title: "先修复归航星港",
        detail: "航站需要可靠的归航位置。",
        focus: "port-panel",
      };
    if (m.project && !s.chapter.includes(m.project))
      return {
        ...base,
        title: `先建成${byId(D.PROJECTS, m.project).name}`,
        detail: "在远航星图完成前序故事与建设。",
        focus: `project-${m.project}`,
      };
    if (m.campaign && campaignMission(s)?.id !== id) {
      const prior = campaignMission(s);
      return prior
        ? {
            ...base,
            title: "继续当前交接",
            detail: prior.detail,
            focus: `mission-${prior.id}`,
          }
        : null;
    }
    if (m.requiresStory && !s.lore.some((r) => r.story === m.requiresStory)) {
      const prior = D.MISSIONS.find((item) => item.story === m.requiresStory);
      return (
        missionPrerequisite(s, prior.id) || {
          ...base,
          title: `接续「${D.STORIES[m.requiresStory].title}」`,
          detail: "任意故事选择都能继续。",
          focus: `mission-${prior.id}`,
        }
      );
    }
    if (m.research && !has(s, m.research)) {
      const r = byId(D.RESEARCH, m.research);
      return {
        ...base,
        title: `为远航研究${r.name}`,
        detail: r.detail,
        action: "fleet",
        label: "前往研究",
        focus: `research-${r.id}`,
        value: s.dust,
        target: r.cost,
        eta: incomeEta(s, Math.max(0, r.cost - s.dust)),
      };
    }
    if (m.equipment && equipped(s, m.equipment.id) < m.equipment.level) {
      const item = byId(D.MODULES, m.equipment.id),
        offer = moduleOffer(s, item.id);
      if (offer.level < m.equipment.level && s.samples < offer.samples)
        return {
          ...base,
          title: `为${item.name}收集样本`,
          detail: `下一次装配或升级需要 ${offer.samples} 份样本。`,
          label: "前往安全回收",
          focus: "mission-belt",
          value: s.samples,
          target: offer.samples,
          eta: null,
          etaHint: "安全探索归航后领取样本",
        };
      return {
        ...base,
        title: `${offer.level < m.equipment.level ? "升级" : "装备"}${item.name}`,
        detail: `需要装备 ${m.equipment.level} 级${item.name}。两槽已满时先卸下一件。`,
        label: "前往舰装",
        focus: `module-${item.id}`,
      };
    }
    return null;
  }
  function campaignGoal(s) {
    if (!s.chapter.includes("lighthouse") || !reachable(s, "explore"))
      return null;
    const m = campaignMission(s);
    if (!m) return null;
    const prerequisite = missionPrerequisite(s, m.id);
    if (prerequisite) return prerequisite;
    if (s.mission)
      return {
        title: "等待航段记录归航",
        detail: "生产继续进行；归航报告会保留，等待你的安排。",
        action: "explore",
        label: "查看航程",
        focus: "active-mission",
        value: s.clock - s.mission.start,
        target: s.mission.seconds,
        eta: Math.max(0, s.mission.end - s.clock),
      };
    return {
      title: `${s.campaign.preparation?.id === m.id ? "派遣" : "准备"}${m.name}`,
      detail:
        "先比较校准、补给与分段接续的航程和回收，再派遣无人探针。所有方案都能继续故事。",
      action: "explore",
      label: "安排白噪声海航程",
      focus: `mission-${m.id}`,
      value: s.campaign.completed.length,
      target: D.MISSIONS.filter((item) => item.campaign).length,
      eta: 0,
    };
  }
  function chapterGoal(s) {
    if (s.starport < D.PORT.length || !reachable(s, "explore")) return null;
    const project = D.PROJECTS.find((p) => !s.chapter?.includes(p.id));
    if (!project) return null;
    const base = {
      action: "explore",
      label: "查看远航星图",
      value: 0,
      target: 1,
      eta: 0,
    };
    const researchGoal = (id) => {
      const r = byId(D.RESEARCH, id);
      return {
        ...base,
        title: `为远航研究${r.name}`,
        detail: r.detail,
        action: "fleet",
        label: "前往研究",
        focus: `research-${id}`,
        value: s.dust,
        target: r.cost,
        eta: incomeEta(s, Math.max(0, r.cost - s.dust)),
      };
    };
    const waitGoal = () => ({
      ...base,
      title: "等待远航探索归航",
      detail: "舰队仍在生产。若要更换航线或跃迁，可先选择本次归航后暂停派遣。",
      focus: "active-mission",
      value: s.clock - s.mission.start,
      target: s.mission.seconds,
      eta: Math.max(0, s.mission.end - s.clock),
    });
    if (s.mission && byId(D.MISSIONS, s.mission.id).chapter) return waitGoal();
    const m = byId(D.MISSIONS, project.mission);
    if (!s.lore.some((r) => r.story === project.story)) {
      if (m.requiresStory && !s.lore.some((r) => r.story === m.requiresStory)) {
        const prior = D.MISSIONS.find((item) => item.story === m.requiresStory);
        if (prior.research && !has(s, prior.research))
          return researchGoal(prior.research);
        if (s.mission) return waitGoal();
        return {
          ...base,
          title: `接续「${D.STORIES[m.requiresStory].title}」`,
          detail:
            "处理这段旧航线故事，才能辨认它在远方留下的线索。任何选择都可以继续。",
          focus: `mission-${prior.id}`,
        };
      }
      if (m.research && !has(s, m.research)) return researchGoal(m.research);
      if (m.equipment && equipped(s, m.equipment.id) < m.equipment.level) {
        const item = byId(D.MODULES, m.equipment.id),
          offer = moduleOffer(s, item.id);
        if (offer.level < m.equipment.level && s.samples < offer.samples)
          return {
            ...base,
            title: `为${item.name}收集样本`,
            detail: `下一次装配或升级需要 ${offer.samples} 份样本，目标为 ${m.equipment.level} 级。`,
            focus: "mission-belt",
            value: s.samples,
            target: offer.samples,
            eta: null,
            etaHint: "安全探索归航后领取样本",
          };
        return {
          ...base,
          title: `${offer.level < m.equipment.level ? "升级" : "装备"}${item.name}`,
          detail: `前往${m.name}需要装备 ${m.equipment.level} 级${item.name}。已有两件装备时，先卸下一件，再装备它。`,
          focus: `module-${item.id}`,
        };
      }
      if (s.mission) return waitGoal();
      return {
        ...base,
        title: `探索${m.name}`,
        detail: m.detail,
        focus: `mission-${m.id}`,
      };
    }
    if (s.cores < project.cores && s.mission) return waitGoal();
    if (s.cores < project.cores)
      return {
        ...base,
        title: `为${project.name}补充星核`,
        detail: `永久建设需要 ${project.cores} 星核，当前还缺 ${project.cores - s.cores}。开启新航次可以补充。`,
        action: reachable(s, "jump") ? "jump" : "fleet",
        label: reachable(s, "jump") ? "查看跃迁" : "扩建舰队",
        value: s.run.dust,
        target: D.PRESTIGE_DUST,
        eta: incomeEta(s, Math.max(0, D.PRESTIGE_DUST - s.run.dust)),
      };
    if (s.samples < project.samples)
      return {
        ...base,
        title: `为${project.name}收集样本`,
        detail: `永久建设需要 ${project.samples} 份样本。继续安全探索，领取归航报告。`,
        focus: `mission-${missionLock(s, m.id) ? "belt" : m.id}`,
        value: s.samples,
        target: project.samples,
        eta: null,
        etaHint: "探索归航后领取样本",
      };
    return {
      ...base,
      title: `建设${project.name}`,
      detail: project.detail,
      focus: `project-${project.id}`,
      value: s.samples,
      target: project.samples,
    };
  }
  function nextGoal(s) {
    if (s.result)
      return {
        title: s.result.story
          ? D.STORIES[s.result.story].title
          : "探索船已经归航",
        detail: "先处理归航报告，领取回收物并安排故事选择。",
        action: "explore",
        label: "查看报告",
        focus: "report",
        value: 1,
        target: 1,
        eta: 0,
      };
    if (!s.buildings.drone)
      return {
        title: "启动第一艘拾荒无人机",
        detail: `收集 ${buildingCost(s, "drone")} 星尘，建造无人机，让航站开始自动运转。`,
        action: "fleet",
        label: "前往舰队",
        focus: "building-drone",
        value: s.dust,
        target: buildingCost(s, "drone"),
        eta: incomeEta(s, Math.max(0, buildingCost(s, "drone") - s.dust)),
      };
    if (!s.run.routeChosen)
      return {
        title: "决定这一航次的方向",
        detail: "工业、回收、探索各有专长。本航次只需要选择一次。",
        action: "fleet",
        label: "选择航线",
        value: 0,
        target: 1,
        eta: 0,
      };
    const chapter = chapterGoal(s);
    if (chapter) return chapter;
    const campaign = campaignGoal(s);
    if (campaign) return campaign;
    if (
      s.rebirths === 0 &&
      s.research.length === 0 &&
      s.run.dust >= D.RESEARCH[0].unlock
    ) {
      const r = D.RESEARCH[0];
      return {
        title: `完成第一项研究：${r.name}`,
        detail: r.detail,
        action: "fleet",
        label: "前往研究",
        focus: `research-${r.id}`,
        value: s.dust,
        target: r.cost,
        eta: incomeEta(s, Math.max(0, r.cost - s.dust)),
      };
    }
    if (s.buildings.drone < 10)
      return {
        title: "让无人机组成回收队",
        detail: "建造 10 艘拾荒无人机，本设施产量翻倍。",
        action: "fleet",
        label: "扩建舰队",
        focus: "building-drone",
        value: s.buildings.drone,
        target: 10,
        eta: incomeEta(
          s,
          Math.max(
            0,
            buildingCost(s, "drone", 10 - s.buildings.drone) - s.dust,
          ),
        ),
      };
    if (!s.lore.length && reachable(s, "explore") && !s.mission)
      return {
        title: "回应废弃医院船的信号",
        detail: "分流 20% 产量进行安全探索，带回第一段故事。",
        action: "explore",
        label: "派遣探索",
        value: 0,
        target: 1,
        eta: 0,
      };
    if (!s.lore.length && s.mission)
      return {
        title: "等待第一艘探索船归航",
        detail: "舰队仍在生产。归航后，你将决定第一段故事的去向。",
        action: "explore",
        label: "查看航程",
        value: Math.max(0, s.clock - s.mission.start),
        target: s.mission.seconds,
        eta: Math.max(0, s.mission.end - s.clock),
      };
    if (prestigeGain(s) > 0)
      return {
        title: "开启下一航次",
        detail: `本次可获得 ${prestigeGain(s)} 星核。${D.CAPABILITIES.find((c) => c.run === s.rebirths + 1)?.name || "新航次与更高产量"}正在等待。`,
        action: "jump",
        label: "查看跃迁",
        value: s.run.dust,
        target: D.PRESTIGE_DUST,
        eta: 0,
      };
    if (
      s.starport < D.PORT.length &&
      s.rebirths > 0 &&
      reachable(s, "explore")
    ) {
      const stage = D.PORT[s.starport];
      if (s.cores >= stage.cores)
        return {
          title: stage.name,
          detail: `收集 ${stage.samples} 份样本与 ${stage.cores} 星核，修复你的归航之地。`,
          action: "explore",
          label: "修复航站",
          value: s.samples,
          target: stage.samples,
          eta: s.samples >= stage.samples ? 0 : null,
          etaHint:
            s.samples >= stage.samples ? "现在可以修复" : "探索归航后收集样本",
        };
    }
    const researchGoal = D.RESEARCH.find(
      (r) => !has(s, r.id) && s.run.dust >= r.unlock,
    );
    if (researchGoal)
      return {
        title: `研究${researchGoal.name}`,
        detail: researchGoal.detail,
        action: "fleet",
        label: "前往研究",
        focus: `research-${researchGoal.id}`,
        value: s.dust,
        target: researchGoal.cost,
        eta: incomeEta(s, Math.max(0, researchGoal.cost - s.dust)),
      };
    const milestones = D.BUILDINGS.filter((b) => unlocked(s, b))
      .map((b) => {
        const target = D.MILESTONES.find((n) => n > s.buildings[b.id]);
        if (!target) return null;
        const preview = purchaseImpact(s, b.id, target - s.buildings[b.id]);
        return preview.count && preview.delta > 0
          ? { b, target, preview }
          : null;
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          (a.preview.payback ?? Infinity) - (b.preview.payback ?? Infinity),
      );
    if (milestones.length) {
      const { b, target, preview } = milestones[0];
      return {
        title: `${b.name}达到 ${target} 艘`,
        detail:
          "完成这段扩建，本设施产量翻倍。购买前可以比较实际增产与回本时间。",
        action: "fleet",
        label: "扩建舰队",
        focus: `building-${b.id}`,
        value: s.buildings[b.id],
        target,
        eta: preview.wait,
      };
    }
    return {
      title: "积累下一次跃迁的能量",
      detail: "扩建、研究或离线等待。达到目标后可以换来永久能力。",
      action: reachable(s, "jump") ? "jump" : "fleet",
      label: reachable(s, "jump") ? "查看跃迁进度" : "继续扩建",
      value: s.run.dust,
      target: D.PRESTIGE_DUST,
      eta: incomeEta(s, Math.max(0, D.PRESTIGE_DUST - s.run.dust)),
    };
  }
  function sanitize(raw, now = Date.now()) {
    if (!raw || raw.schema !== "salvage-orbit" || raw.version !== D.VERSION)
      throw new Error("这份记录不属于当前航线版本，原文件已保留。");
    const s = createState(now);
    for (const key of [
      "dust",
      "lifetimeDust",
      "cores",
      "totalCores",
      "samples",
      "clock",
      "discoveries",
    ])
      s[key] = bounded(raw[key]);
    s.clock = integer(s.clock, 1e10);
    s.rebirths = integer(raw.rebirths, 1000000);
    s.starport = integer(raw.starport, D.PORT.length);
    s.totalCores = Math.max(s.totalCores, s.cores);
    s.createdAt = bounded(raw.createdAt || now, Number.MAX_SAFE_INTEGER);
    s.lastAt = Math.min(
      now,
      bounded(raw.lastAt ?? now, Number.MAX_SAFE_INTEGER),
    );
    s.carryMs = bounded(raw.carryMs, 999);
    s.rng = Number(raw.rng) >>> 0 || 1;
    for (const b of D.BUILDINGS)
      s.buildings[b.id] = integer(raw.buildings?.[b.id]);
    s.research = D.RESEARCH.filter(
      (r) => Array.isArray(raw.research) && raw.research.includes(r.id),
    ).map((r) => r.id);
    s.run = {
      dust: bounded(raw.run?.dust),
      startedClock: Math.min(s.clock, bounded(raw.run?.startedClock)),
      route: byId(D.ROUTES, raw.run?.route) ? raw.run.route : "industry",
      routeChosen: raw.run?.routeChosen === true,
      choices: integer(raw.run?.choices, 2),
    };
    configure(s, raw.automation || {});
    for (const m of D.MODULES)
      if (raw.modules?.[m.id])
        s.modules[m.id] = integer(raw.modules[m.id], D.MODULE_MAX_LEVEL);
    s.equipped = [...new Set(Array.isArray(raw.equipped) ? raw.equipped : [])]
      .filter((id) => s.modules[id])
      .slice(0, 2);
    s.lore = (Array.isArray(raw.lore) ? raw.lore : [])
      .filter(
        (r) =>
          D.STORIES[r?.story] && byId(D.STORIES[r.story].choices, r.choice),
      )
      .filter((r, i, all) => all.findIndex((x) => x.story === r.story) === i)
      .map((r) => ({ story: r.story, choice: r.choice }));
    for (const p of D.PROJECTS) {
      if (
        s.starport !== D.PORT.length ||
        !Array.isArray(raw.chapter) ||
        !raw.chapter.includes(p.id) ||
        !s.lore.some((r) => r.story === p.story)
      )
        break;
      s.chapter.push(p.id);
    }
    // Optional v32 campaign data never changes the original construction array.
    for (const m of D.MISSIONS.filter((item) => item.campaign)) {
      const record = raw.campaign?.completed?.[s.campaign.completed.length];
      if (
        !s.chapter.includes("lighthouse") ||
        record?.id !== m.id ||
        !byId(D.EXPEDITION_PLANS, record.plan) ||
        !s.lore.some((r) => r.story === m.story)
      )
        break;
      s.campaign.completed.push({ id: m.id, plan: record.plan });
    }
    s.lore = s.lore.filter((r) => {
      const m = D.MISSIONS.find(
        (item) => item.campaign && item.story === r.story,
      );
      return !m || s.campaign.completed.some((record) => record.id === m.id);
    });
    const preparation = raw.campaign?.preparation;
    if (
      s.chapter.includes("lighthouse") &&
      preparation?.id === campaignMission(s)?.id &&
      byId(D.EXPEDITION_PLANS, preparation?.plan)
    )
      s.campaign.preparation = { id: preparation.id, plan: preparation.plan };
    s.journal = (Array.isArray(raw.journal) ? raw.journal : [])
      .filter((r) => typeof r?.text === "string")
      .slice(0, 12)
      .map((r) => ({
        clock: Math.min(s.clock, bounded(r.clock)),
        text: r.text.slice(0, 400),
      }));
    s.records = (Array.isArray(raw.records) ? raw.records : [])
      .filter((r) => byId(D.ROUTES, r?.route))
      .slice(0, 5)
      .map((r) => ({
        route: r.route,
        seconds: bounded(r.seconds),
        gain: bounded(r.gain),
      }));
    // Existing v3 saves keep all progress; historical times are never invented.
    s.timing = freshTiming(s.clock, true);
    if (raw.timing && typeof raw.timing === "object") {
      s.timing.sinceClock = Math.min(
        s.clock,
        integer(raw.timing.sinceClock, 1e10),
      );
      s.timing.late = raw.timing.late === true;
      const span = s.clock - s.timing.sinceClock;
      s.timing.foregroundSeconds = integer(raw.timing.foregroundSeconds, span);
      s.timing.offlineSeconds = integer(
        raw.timing.offlineSeconds,
        span - s.timing.foregroundSeconds,
      );
      for (const key of ["drone", "research", "report", "prestige"]) {
        const event = raw.timing.events?.[key];
        if (!event || !["manual", "auto", "offline"].includes(event.source))
          continue;
        const elapsedSeconds = integer(event.elapsedSeconds, span);
        const foregroundSeconds = integer(
          event.foregroundSeconds,
          elapsedSeconds,
        );
        s.timing.events[key] = {
          elapsedSeconds,
          foregroundSeconds,
          offlineSeconds: integer(
            event.offlineSeconds,
            elapsedSeconds - foregroundSeconds,
          ),
          run: Math.max(1, integer(event.run, s.rebirths + 1)),
          source: event.source,
        };
      }
    }
    s.repeatId = D.MISSIONS.some(
      (m) =>
        m.id === raw.repeatId && m.chance === 1 && !m.chapter && !m.campaign,
    )
      ? raw.repeatId
      : "belt";
    s.beacon = {
      nextAt: bounded(raw.beacon?.nextAt || s.clock + 45),
      expiresAt: Math.min(s.clock + 15, bounded(raw.beacon?.expiresAt)),
    };
    s.burstUntil = Math.min(s.clock + 20, bounded(raw.burstUntil));
    s.lastScanClock = Math.min(s.clock, Number(raw.lastScanClock) || 0);
    const validCampaign = (r) => {
      const m = byId(D.MISSIONS, r?.id);
      return (
        m &&
        (!m.campaign ||
          (s.chapter.includes("lighthouse") &&
            campaignMission(s)?.id === m.id &&
            r.succeeded === true &&
            byId(D.EXPEDITION_PLANS, r.plan)))
      );
    };
    const limits = (def) => ({
      seconds: Math.ceil(
        def.seconds *
          (def.campaign
            ? Math.max(...D.EXPEDITION_PLANS.map((p) => p.seconds))
            : 1),
      ),
      samples: Math.max(
        4,
        def.samples +
          2 +
          (def.campaign
            ? Math.max(...D.EXPEDITION_PLANS.map((p) => p.samples))
            : 0),
      ),
    });
    if (raw.mission && validCampaign(raw.mission)) {
      const m = raw.mission,
        def = byId(D.MISSIONS, m.id);
      const max = limits(def);
      s.mission = {
        id: m.id,
        start: Math.min(s.clock, bounded(m.start)),
        end: Math.min(s.clock + max.seconds, bounded(m.end)),
        seconds: bounded(m.seconds, max.seconds),
        diversion: bounded(m.diversion, def.campaign ? 0.5 : 0.4),
        chance: bounded(m.chance, 1),
        samples: bounded(m.samples, max.samples),
        dust: bounded(m.dust),
        succeeded: m.succeeded === true,
        module: byId(D.MODULES, m.module) ? m.module : null,
        ...(def.campaign ? { plan: m.plan } : {}),
      };
    }
    if (
      raw.result &&
      validCampaign(raw.result) &&
      (!byId(D.MISSIONS, raw.result.id).campaign ||
        raw.result.story === byId(D.MISSIONS, raw.result.id).story)
    ) {
      const r = raw.result,
        def = byId(D.MISSIONS, r.id);
      s.mission = null;
      s.result = {
        id: r.id,
        succeeded: r.succeeded === true,
        dust: bounded(r.dust),
        samples: bounded(r.samples, limits(def).samples),
        module: byId(D.MODULES, r.module) ? r.module : null,
        story:
          r.story === def.story &&
          !s.lore.some((entry) => entry.story === r.story)
            ? r.story || null
            : null,
        ...(def.campaign ? { plan: r.plan } : {}),
      };
    }
    if (s.mission || s.result) s.campaign.preparation = null;
    if (raw.legacyArchive && typeof raw.legacyArchive === "object")
      s.legacyArchive = clone(raw.legacyArchive);
    return s;
  }
  function migrateLegacy(raw, now = Date.now()) {
    if (
      !raw ||
      typeof raw !== "object" ||
      Array.isArray(raw) ||
      !raw.buildings ||
      raw.schema
    )
      throw new Error("未识别到旧航站记录。");
    const s = createState(now);
    // The full old state is retained byte-for-byte by storage.js and structurally here.
    // Only matching systems participate in v3. No old field is silently discarded.
    s.legacyArchive = clone(raw);
    s.dust = bounded(raw.dust);
    s.lifetimeDust = Math.max(s.dust, bounded(raw.lifetimeDust));
    s.cores = bounded(raw.cores);
    s.totalCores = Math.max(s.cores, bounded(raw.totalCores));
    s.rebirths = integer(raw.rebirths, 1000000);
    s.run.dust = Math.max(s.dust, bounded(raw.runDust));
    for (const b of D.BUILDINGS)
      s.buildings[b.id] = integer(raw.buildings[b.id]);
    const aliases = {
      gloves: "laser",
      panels: "panels",
      compact: "compact",
      network: "network",
      navigation: "navigation",
    };
    for (const id of Array.isArray(raw.upgrades) ? raw.upgrades : [])
      if (aliases[id] && !s.research.includes(aliases[id]))
        s.research.push(aliases[id]);
    s.automation.enabled = s.rebirths > 0 && raw.autoBuyEnabled === true;
    s.timing = freshTiming(s.clock, true);
    log(
      s,
      "已继承旧航站。原有远征、奖励与研究记录完整封存，随时可以回旧版继续。",
    );
    return s;
  }
  return Object.freeze({
    createState,
    sanitize,
    migrateLegacy,
    advance,
    scan,
    scanValue,
    addDust,
    rawRate,
    productionRate,
    progressSnapshot,
    returnReport,
    purchaseImpact,
    purchasePreview,
    incomeEta,
    buildingCost,
    buy,
    research,
    chooseRoute,
    configure,
    capability,
    affordableBest,
    missionOptions,
    missionLock,
    missionPreview,
    storyText,
    campaignMission,
    prepareMission,
    campaignGoal,
    missionPrerequisite,
    routeArchive,
    startMission,
    claimMission,
    moduleOffer,
    buildModule,
    equip,
    claimBeacon,
    repairPort,
    projectOffer,
    buildProject,
    chapterGoal,
    prestigeGain,
    prestige,
    reachable,
    nextGoal,
    milestone,
  });
});
