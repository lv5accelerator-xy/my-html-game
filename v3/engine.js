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
  const storyMission = (m) => m.campaign || m.council || m.rescue;
  const missionTrack = (s, m) =>
    m.rescue ? s.rescue : m.council ? s.council : s.campaign;
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
      loadouts: { production: null, voyage: null },
      mission: null,
      result: null,
      repeatId: "belt",
      lore: [],
      journal: [],
      discoveries: 0,
      atlas: { priority:null, serial:0, claimed:0, active:null, nodes:[] },
      expeditions:{serial:0,settled:0,active:null,completed:{},collections:[],records:[],archives:{},best:{},dust:0,samples:0},
      continuation: freshContinuation(),
      encounters: { serial: 0, settled: 0, nextAt: 0, rng: (Number(seed) ^ 0x3e72a1) >>> 0 || 1, pending: null, history: [], catalog: [] },
      starport: 0,
      chapter: [],
      campaign: { completed: [], preparation: null },
      council: { completed: [], priority: null, preparation: null },
      rescue: {
        completed: [],
        energy: null,
        berth: false,
        checks: null,
        preparation: null,
        protocol: false,
      },
      epilogue: { confirmed: [], ending: null },
      afterword: { active: null, ready: false, completed: [] },
      management: { focus: "production", cycle: 0, active: null, projects: {}, counts: {},
        stats: { deliveries: 0, voyages: 0, dustSpent: 0, samplesSpent: 0 }, history: [], collections: [] },
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
  function reviewBusy(s) { return s.continuation?.reviews?.active; }
  function travel(s) { return s.mission || (reviewBusy(s) && s.clock<reviewBusy(s).end ? reviewBusy(s) : null) || (s.expeditions.active?.leg && s.clock<s.expeditions.active.leg.end?s.expeditions.active.leg:null) || (s.atlas.active && s.clock < s.atlas.active.end ? s.atlas.active : null); }
  function productionRate(s) {
    return bounded(
      rawRate(s) *
        (travel(s) ? 1 - travel(s).diversion : 1) *
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
      (travel(s) ? 1 - travel(s).diversion : 1);
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
    const missionEnd = travel(s)
      ? Math.max(s.clock + 1, travel(s).end)
      : s.clock;
    const ends = [
      ...new Set([missionEnd, s.burstUntil].filter((t) => t > s.clock)),
    ].sort((a, b) => a - b);
    let at = s.clock,
      left = missing;
    const rateAt = (t) =>
      base *
      (travel(s) && t < missionEnd ? 1 - travel(s).diversion : 1) *
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
    const spent = buildingCost(s,id,count);
    s.dust = Math.max(0, s.dust - spent);
    creditHarborWork(s,spent);
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
    creditHarborWork(s,item.cost);
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
    const mission = D.MISSIONS.find((m) => storyMission(m) && m.story === id);
    const record =
      mission &&
      (s.result?.id === mission.id
        ? s.result
        : missionTrack(s, mission).completed.find((r) => r.id === mission.id));
    const preparation = record && byId(D.EXPEDITION_PLANS, record.plan)?.report;
    const focus =
      mission?.requiresPortFocus && byId(D.PORT_FOCUSES, s.council.priority);
    const energy =
      mission?.rescue && byId(D.RESCUE_ENERGY, s.rescue.energy)?.text;
    return [context, preparation, focus && focus.text, energy, story.text]
      .filter(Boolean)
      .join(" ");
  }
  function campaignMission(s) {
    return (
      D.MISSIONS.filter((m) => m.campaign)[s.campaign.completed.length] || null
    );
  }
  function storyScene(s, id, { preview = false } = {}) {
    // Scenes are read from existing progress; reading never writes a save or claims a reward.
    const scene = Object.hasOwn(D.NARRATIVE_SCENES, id)
      ? D.NARRATIVE_SCENES[id]
      : null;
    if (!scene) return null;
    const story = D.STORIES[id];
    const record =
      story &&
      s.lore.find((r) => r.story === id && byId(story.choices, r.choice));
    const pending =
      story &&
      s.result?.story === id &&
      s.result.succeeded === true &&
      byId(D.MISSIONS, s.result.id)?.story === id;
    const project = D.PROJECTS.find((p) => `${p.id}-built` === id);
    const portFocus = D.PORT_FOCUSES.find((p) => `port-${p.id}-built` === id);
    const handoff = D.EPILOGUE_HANDOFFS.find((h) => `epilogue-${h.id}` === id);
    const ending = D.ENDINGS.find((e) => `ending-${e.id}` === id);
    const finalChapter = epilogueUnlocked(s);
    const lateMilestone =
      id === "rescue-power" ? rescueUnlocked(s) && Boolean(s.rescue.energy)
      : id === "backup-berth" ? rescueUnlocked(s) && s.rescue.berth
      : id === "keeper-signed" ? s.rescue.protocol || (preview && rescueUnlocked(s) && s.rescue.completed.length === D.RESCUE_MISSIONS.length)
      : id === "future-meeting" ? finalChapter
      : handoff ? finalChapter && (s.epilogue.confirmed.includes(handoff.id) || preview)
      : ending ? finalChapter && (s.epilogue.ending === ending.id || (preview && s.epilogue.confirmed.length === D.EPILOGUE_HANDOFFS.length))
      : false;
    const milestone =
      id === "awakening"
        ? s.buildings.drone > 0 || s.rebirths > 0 || s.lore.length > 0
        : id === "port-lit"
          ? s.starport === D.PORT.length
          : project
            ? s.chapter.includes(project.id)
            : portFocus &&
              s.council.priority === portFocus.id &&
              s.council.completed[0]?.id === "port-council";
    if (!record && !pending && !milestone && !lateMilestone) return null;
    const echoes = [];
    const prior =
      story?.continuity &&
      s.lore.find((r) => r.story === story.continuity.story);
    const context = prior && story.continuity.choices[prior.choice];
    if (context) echoes.push({ speaker: "航线回响", text: context });
    const mission = D.MISSIONS.find((m) => storyMission(m) && m.story === id);
    const voyage =
      mission &&
      (record
        ? missionTrack(s, mission).completed.find((r) => r.id === mission.id)
        : pending
          ? s.result
          : null);
    const plan = voyage && byId(D.EXPEDITION_PLANS, voyage.plan);
    if (plan)
      echoes.push({
        speaker: "航前方案",
        text: `${plan.name}：${plan.report}`,
      });
    const focus =
      mission?.requiresPortFocus && byId(D.PORT_FOCUSES, s.council.priority);
    if (focus)
      echoes.push({
        speaker: "港务回响",
        text: `${focus.name}：${focus.text}`,
      });
    // Supply cannot change after confirmation. Old completed voyages may lack
    // an energy snapshot, but retain their confirmed shared supply arrangement.
    const energy = byId(D.RESCUE_ENERGY,
      mission?.rescue ? voyage?.energy || s.rescue.energy
      : id === "rescue-power" ? s.rescue.energy : null);
    if (energy)
      echoes.push({ speaker: "供电记录", text: `${energy.name}：${energy.text}` });
    if (mission?.rescue && voyage?.confirmations)
      echoes.push({ speaker: "出航应答", text: voyage.confirmations.map((key) => byId(D.RESCUE_CONFIRMATIONS, key).name).join("、") });
    if (id === "future-meeting" || handoff || ending)
      echoes.push({ speaker: "共同交接", text: epilogueContext(s) });
    for (const echo of scene.echoes || []) {
      const earlier = s.lore.find((r) => r.story === echo.story);
      if (earlier && Object.hasOwn(echo.choices, earlier.choice))
        echoes.push({
          speaker: "航线回响",
          text: echo.choices[earlier.choice],
        });
    }
    const copyLines = (lines) =>
      lines.map((line) => ({ speaker: line.speaker, text: line.text }));
    return {
      id,
      title: scene.title,
      location: scene.location,
      pending: Boolean(pending && !record),
      choice: record ? byId(story.choices, record.choice).name : null,
      lines: copyLines([...echoes, ...scene.lines]),
      response: copyLines(record ? scene.responses?.[record.choice] || [] : []),
    };
  }
  function prepareMission(s, id, plan) {
    const m = campaignMission(s) || councilMission(s) || rescueMission(s);
    if (
      !m ||
      m.id !== id ||
      missionLock(s, id) ||
      s.mission ||
      s.result ||
      !byId(D.EXPEDITION_PLANS, plan)
    )
      return false;
    missionTrack(s, m).preparation = { id, plan };
    return true;
  }
  function councilMission(s) {
    if (campaignMission(s) || !s.chapter.includes("lighthouse")) return null;
    return D.COUNCIL_MISSIONS[s.council.completed.length] || null;
  }
  function rescueUnlocked(s) {
    return (
      s.chapter.includes("lighthouse") &&
      !campaignMission(s) &&
      s.council.completed.length === D.COUNCIL_MISSIONS.length &&
      Boolean(s.council.priority)
    );
  }
  function rescueMission(s) {
    return rescueUnlocked(s)
      ? D.RESCUE_MISSIONS[s.rescue.completed.length] || null
      : null;
  }
  function rescueEnergyOffer(s, id) {
    const energy = byId(D.RESCUE_ENERGY, id);
    if (!energy) return null;
    const reason = !rescueUnlocked(s)
      ? "先完成两港接续演练"
      : s.rescue.energy
        ? "供电方案已安排，所有救援航路仍开放"
        : s.mission || s.result
          ? "先处理当前航程与报告"
          : s.buildings.drone < (energy.drones || 0)
            ? `需要 ${energy.drones} 艘无人机，或选择无需资源的轮换方案`
            : s.samples < energy.samples
              ? `需要 ${energy.samples} 份样本，或选择无需资源的轮换方案`
              : "";
    return { ...energy, available: !reason, reason };
  }
  function arrangeRescueEnergy(s, id) {
    const offer = rescueEnergyOffer(s, id);
    if (!offer?.available) return false;
    s.samples -= offer.samples;
    s.rescue.energy = id;
    log(s, `救援供电：${offer.name}。${offer.text}`);
    return true;
  }
  function confirmBackupBerth(s) {
    if (
      rescueMission(s)?.requiresBackupBerth !== true ||
      !s.rescue.energy ||
      s.rescue.berth ||
      s.mission ||
      s.result
    )
      return false;
    s.rescue.berth = true;
    log(s, "第二队已安排在核验过的备用泊位。等待没有期限；离线不会失去船队。");
    return true;
  }
  function confirmedRescue(s, id) {
    const checks = s.rescue.checks;
    return (
      checks?.id === id &&
      D.RESCUE_CONFIRMATIONS.every((c) => checks.confirmed.includes(c.id))
    );
  }
  function validRescueSnapshot(s, m, r) {
    return (
      !m.rescue ||
      (r.energy === s.rescue.energy &&
        byId(D.RESCUE_ENERGY, r.energy) &&
        (!m.requiresBackupBerth || s.rescue.berth) &&
        Array.isArray(r.confirmations) &&
        r.confirmations.length === D.RESCUE_CONFIRMATIONS.length &&
        D.RESCUE_CONFIRMATIONS.every((c) => r.confirmations.includes(c.id)))
    );
  }
  function confirmRescue(s, id, confirmation) {
    const m = rescueMission(s);
    if (
      !m ||
      m.id !== id ||
      !byId(D.RESCUE_CONFIRMATIONS, confirmation) ||
      !s.rescue.energy ||
      (m.requiresBackupBerth && !s.rescue.berth) ||
      s.mission ||
      s.result
    )
      return false;
    if (s.rescue.checks?.id !== id) s.rescue.checks = { id, confirmed: [] };
    if (s.rescue.checks.confirmed.includes(confirmation)) return false;
    s.rescue.checks.confirmed.push(confirmation);
    return true;
  }
  function adoptKeeperProtocol(s) {
    if (
      !rescueUnlocked(s) ||
      rescueMission(s) ||
      s.rescue.protocol ||
      s.mission ||
      s.result
    )
      return false;
    s.rescue.protocol = true;
    log(
      s,
      "两港居民与抵达船长共同确认新守灯协议。三队全部抵达，等待名单清空；轮班人员能够继续维护航路。",
    );
    return true;
  }
  function portFocusOffer(s, id) {
    const focus = byId(D.PORT_FOCUSES, id);
    if (!focus) return null;
    const unlocked =
      !campaignMission(s) && s.council.completed[0]?.id === "port-council";
    return {
      ...focus,
      unlocked,
      built: s.council.priority === id,
      available: unlocked && !s.council.priority && s.samples >= focus.samples,
    };
  }
  function buildPortFocus(s, id) {
    const offer = portFocusOffer(s, id);
    if (!offer?.available) return false;
    s.samples -= offer.samples;
    s.council.priority = id;
    log(s, `${offer.name}建成：${offer.text} 永久保留；所有救援航路仍然开放。`);
    return true;
  }
  function epilogueUnlocked(s) {
    return rescueUnlocked(s) && s.rescue.protocol && !rescueMission(s);
  }
  function confirmEpilogue(s, id) {
    if (
      !epilogueUnlocked(s) ||
      s.epilogue.ending ||
      !byId(D.EPILOGUE_HANDOFFS, id) ||
      s.epilogue.confirmed.includes(id)
    )
      return false;
    s.epilogue.confirmed.push(id);
    log(s, `${byId(D.EPILOGUE_HANDOFFS, id).title}：交接记录已永久保存。`);
    return true;
  }
  function endingOffer(s, id) {
    const ending = byId(D.ENDINGS, id);
    if (!ending) return null;
    return {
      ...ending,
      available:
        epilogueUnlocked(s) &&
        !s.epilogue.ending &&
        D.EPILOGUE_HANDOFFS.every((h) => s.epilogue.confirmed.includes(h.id)),
    };
  }
  function chooseEnding(s, id) {
    if (!endingOffer(s, id)?.available) return false;
    s.epilogue.ending = id;
    log(
      s,
      `第六章完成 · ${byId(D.ENDINGS, id).title}。结局永久归档，生产、补给与下一航次继续开放。`,
    );
    return true;
  }
  function epilogueContext(s) {
    const hospital = s.lore.find((r) => r.story === "hospital")?.choice;
    const garden = s.lore.find((r) => r.story === "garden")?.choice;
    const memories = [
      {
        scrap:
          "曾经拆解的医院船材料，如今由接班人维护；船体编号与核验记录没有被删掉。",
        repair:
          "曾经修复的同源备用电源，仍在中继工作；禾留下的记录交由家属确认。",
        preserve:
          "曾经保存的平安讯息，如今由阿遥决定保存与展示方式，来源与时间继续保留。",
      }[hospital],
      {
        scrap:
          "曾经回收的温室构件继续发挥作用，原地培育记录与下一季种苗仍有地址。",
        repair: "曾经修复的集光阵，仍按植物需要提供光照。",
        preserve: "曾经带回的幼苗，已经能够分株，留下了下一季的种子。",
      }[garden],
      {
        reception: "接待员先提出共同星港的方案。",
        archive: "独立审核员先提出守望港的方案。",
        ecology: "园丁先提出携种远航的方案。",
      }[s.council.priority],
      "提案顺序来自你先前的建设；所有三种未来仍然开放，由这次会议明确选择。",
    ];
    return memories.filter(Boolean).join(" ");
  }
  function epilogueGoal(s) {
    if (!epilogueUnlocked(s) || s.epilogue.ending || !reachable(s, "explore"))
      return null;
    const handoff = D.EPILOGUE_HANDOFFS.find(
      (h) => !s.epilogue.confirmed.includes(h.id),
    );
    return {
      title: handoff ? handoff.title : "为星港选择一个未来",
      detail: handoff
        ? "听完居民的后续安排，记录交接。无需资源，不会改变正在进行的补给。"
        : "三份交接已经保存。公开阅读三个尾声，再明确确认一个永久结局。",
      action: "explore",
      label: handoff ? "查看居民交接" : "查看三个结局",
      focus: handoff ? `epilogue-${handoff.id}` : "ending-choices",
      value: s.epilogue.confirmed.length,
      target: 3,
      eta: 0,
    };
  }
  function routeArchive(s) {
    const chapter =
      s.starport < D.PORT.length
        ? 1
        : s.chapter.length < D.PROJECTS.length
          ? 2
          : campaignMission(s)
            ? 3
            : councilMission(s)
              ? 4
              : s.rescue.protocol
                ? 6
                : 5;
    const archive = {
      chapter,
      title: [
        "最后一盏灯",
        "远航星图",
        "白噪声海",
        "谁的归航权",
        "没有唯一灯塔",
        "给未来一个地址",
      ][chapter - 1],
      complete: chapter === 6 && Boolean(s.epilogue.ending),
      ending: byId(D.ENDINGS, s.epilogue.ending) || null,
      handoffs: D.EPILOGUE_HANDOFFS.filter((h) =>
        s.epilogue.confirmed.includes(h.id),
      ),
      epilogueContext: epilogueUnlocked(s) ? epilogueContext(s) : null,
      milestones: [
        "awakening",
        "port-lit",
        ...D.PROJECTS.map((p) => `${p.id}-built`),
        ...D.PORT_FOCUSES.map((p) => `port-${p.id}-built`),
        ...D.ARCHIVE_CHAPTERS.filter((c) => c.number >= 5).flatMap((c) => c.milestones),
      ]
        .map((id) => storyScene(s, id))
        .filter(Boolean),
      rescued: s.rescue.completed.length,
      protocol: s.rescue.protocol ? D.KEEPER_PROTOCOL : null,
      priority: byId(D.PORT_FOCUSES, s.council.priority)?.name || null,
      characters: D.CHARACTERS.filter((c) =>
        s.lore.some((r) => r.story === c.story),
      ),
      letters: D.LETTERS.filter(
        (l) =>
          s.lore.some((r) => r.story === l.story) &&
          (!l.requiresProtocol || s.rescue.protocol) &&
          (!l.requiresEnding || Boolean(s.epilogue.ending)),
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
          (m) => storyMission(m) && m.story === r.story,
        );
        const record =
          mission &&
          missionTrack(s, mission).completed.find(
            (item) => item.id === mission.id,
          );
        return {
          ...r,
          title: D.STORIES[r.story].title,
          text: storyText(s, r.story),
          decision: byId(D.STORIES[r.story].choices, r.choice).name,
          scene: storyScene(s, r.story),
          plan: record && byId(D.EXPEDITION_PLANS, record.plan).name,
        };
      }),
    };
    archive.chapters = D.ARCHIVE_CHAPTERS.filter((c) => c.number <= chapter).map((c) => ({
      number: c.number,
      title: c.title,
      current: c.number === chapter,
      entries: archive.entries.filter((r) => c.stories.includes(r.story)),
      milestones: archive.milestones.filter((scene) => c.milestones.includes(scene.id)),
      letters: archive.letters.filter((letter) => letter.requiresEnding ? c.number === 6 : c.stories.includes(letter.story)),
    }));
    return archive;
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
    if (m.council && councilMission(s)?.id !== id)
      return s.council.completed.some((r) => r.id === id)
        ? "这段主线已经完成，可在航线档案重读"
        : "先完成上一段两港主线";
    if (m.rescue && rescueMission(s)?.id !== id)
      return s.rescue.completed.some((r) => r.id === id)
        ? "这队已经安全抵达，可在航线档案重读"
        : "先完成两港演练与上一队救援";
    if (m.requiresStory && !s.lore.some((r) => r.story === m.requiresStory))
      return `先处理「${D.STORIES[m.requiresStory].title}」的故事选择`;
    if (m.requiresPortFocus && !s.council.priority)
      return "先建成一种港口建设重点，三种方向都能继续";
    if (m.research && !has(s, m.research))
      return `本航次先研究${byId(D.RESEARCH, m.research).name}`;
    if (m.equipment && equipped(s, m.equipment.id) < m.equipment.level)
      return `装备 ${m.equipment.level} 级${byId(D.MODULES, m.equipment.id).name}`;
    if (m.rescue && !s.rescue.energy) return "先安排救援供电，轮换方案无需资源";
    if (m.requiresBackupBerth && !s.rescue.berth)
      return "先确认第二队的备用泊位";
    if (m.rescue && !confirmedRescue(s, id))
      return "出发前逐项确认观测窗口、船长意愿与目的港接待";
    return "";
  }
  function missionOptions(s) {
    return D.MISSIONS.filter((m) => !missionLock(s, m.id));
  }
  function missionFit(s, id) {
    const m = byId(D.MISSIONS, id);
    const fits = item => m && (!item.missions || item.missions.includes(id)) && (!item.minSeconds || m.seconds >= item.minSeconds);
    const traits = D.MISSION_TRAITS.filter(t => fits(t) && equipped(s, t.module) >= (t.level || 1));
    const synergy = D.MODULE_SYNERGIES.find(t => fits(t) && t.pair.every(id => equipped(s, id) > 0));
    return { seconds: synergy?.seconds || 1, dust: synergy?.dust || 1,
      samples: traits.reduce((n, t) => n + (t.samples || 0), 0) + (synergy?.samples || 0),
      diversion: traits.reduce((n, t) => n - (t.diversionPerLevel || 0) * equipped(s, t.module), 0) + (synergy?.diversion || 0),
      labels: [...traits.map(t => t.label), ...(synergy ? [synergy.label] : [])] };
  }
  function missionPreview(s, id, planId) {
    const m = byId(D.MISSIONS, id);
    if (!m) return null;
    const explorer = s.run.route === "explore";
    const fit = missionFit(s, id);
    const plan =
      storyMission(m) &&
      byId(
        D.EXPEDITION_PLANS,
        planId ||
          (missionTrack(s, m).preparation?.id === id
            ? missionTrack(s, m).preparation.plan
            : ""),
      );
    const focus =
      (m.council || m.rescue) && byId(D.PORT_FOCUSES, s.council.priority);
    const energy = m.rescue && byId(D.RESCUE_ENERGY, s.rescue.energy);
    return {
      seconds: Math.max(
        30,
        Math.ceil(
          m.seconds * fit.seconds *
            (energy ? energy.seconds : 1) *
            (focus ? focus.seconds : 1) *
            (plan ? plan.seconds : 1) *
            (explorer ? 0.65 : 1) *
            Math.max(0.7, 1 - equipped(s, "nav") * 0.1) *
            (s.chapter?.includes("lighthouse") ? 0.9 : 1),
        ),
      ),
      diversion: Math.max(0.03, Math.min(0.5,
        m.diversion *
        (explorer ? 0.5 : 1) *
        (plan ? plan.diversion : 1) *
        (focus ? focus.diversion : 1) + fit.diversion)),
      chance: Math.min(
        1,
        m.chance +
          (explorer && m.chance < 1 ? 0.15 : 0) +
          (has(s, "navigation") && m.chance < 1 ? 0.05 : 0),
      ),
      samples:
        m.samples + fit.samples +
        (energy ? energy.bonusSamples : 0) +
        (focus ? focus.bonusSamples : 0) +
        (plan ? plan.samples : 0) +
        (explorer ? 1 : 0) +
        (s.chapter?.includes("nursery") ? 1 : 0),
      dust: bounded(Math.max(20, rawRate(s) * m.yieldSeconds * fit.dust * (plan ? plan.dust : 1))),
    };
  }
  function encounterCandidates(s, missionId) {
    return D.ENCOUNTERS.filter(e => e.missions.includes(missionId) && s.starport >= e.minPort && (!e.module || equipped(s, e.module) > 0));
  }
  function rollEncounter(s, m) {
    if (s.discoveries < 3 || s.encounters.pending || s.clock < s.encounters.nextAt ||
      (m.story && !s.lore.some(r => r.story === m.story))) return null;
    const list = encounterCandidates(s, m.id);
    if (!list.length || s.encounters.serial >= 1e9) return null;
    const rng = { rng: s.encounters.rng };
    const roll = random(rng);
    s.encounters.rng = rng.rng;
    // At most one discovery in ten minutes; a queued choice never interrupts production.
    s.encounters.nextAt = s.clock + 600;
    if (roll >= 0.45) return null;
    const def = list[Math.floor((roll / 0.45) * list.length)];
    return { token: ++s.encounters.serial, id: def.id, mission: m.id, choice: null, readyAt: 0,
      choices: def.choices.map(c => ({ id: c.id,
        dust: Math.min(250000, Math.floor(rawRate(s) * c.dustSeconds * (s.run.route === "reclaim" ? 1.2 : 1))),
        samples: c.samples, seconds: c.seconds, costSamples: c.costSamples })) };
  }
  function encounterOffer(s) {
    const event = s.encounters.pending;
    if (!event) return null;
    const def = byId(D.ENCOUNTERS, event.id);
    return { ...clone(event), name: def.name, description: def.description,
      choices: event.choices.map(c => ({ ...c, name: byId(def.choices, c.id).name, available: !event.choice && s.samples >= c.costSamples })) };
  }
  function settleEncounter(s) {
    const event = s.encounters.pending;
    if (!event?.choice || s.clock < event.readyAt || event.token <= s.encounters.settled) return false;
    const choice = byId(event.choices, event.choice);
    addDust(s, choice.dust);
    s.samples = bounded(s.samples + choice.samples);
    s.encounters.settled = event.token;
    const entry = `${event.id}:${event.choice}`;
    if (!s.encounters.catalog.includes(entry)) s.encounters.catalog.push(entry);
    s.encounters.history.unshift({ token: event.token, id: event.id, choice: event.choice, clock: s.clock });
    s.encounters.history = s.encounters.history.slice(0, 32);
    s.encounters.pending = null;
    log(s, `航行发现：${byId(D.ENCOUNTERS, event.id).name} · ${byId(byId(D.ENCOUNTERS, event.id).choices, event.choice).name}，回收已入库。`);
    return true;
  }
  function chooseEncounter(s, token, id) {
    const offer = encounterOffer(s), choice = offer?.choices.find(c => c.id === id);
    if (!offer || offer.token !== Number(token) || offer.token <= s.encounters.settled || !choice?.available) return false;
    s.samples -= choice.costSamples;
    s.encounters.pending.choice = id;
    s.encounters.pending.readyAt = s.clock + choice.seconds;
    settleEncounter(s);
    return true;
  }
  function cleanEncounter(raw, s) {
    const def = byId(D.ENCOUNTERS, raw?.id);
    if (!def || !def.missions.includes(raw.mission) || !Number.isInteger(raw.token) || raw.token <= s.encounters.settled || raw.token > s.encounters.serial ||
      !Array.isArray(raw.choices) || raw.choices.length !== def.choices.length || (raw.choice !== null && !byId(def.choices, raw.choice))) return null;
    const choices = [];
    for (const c of def.choices) {
      const saved = raw.choices.find(r => r?.id === c.id);
      if (!saved || !Number.isFinite(saved.dust) || saved.dust < 0 || saved.dust > 250000 || saved.samples !== c.samples || saved.seconds !== c.seconds || saved.costSamples !== c.costSamples) return null;
      choices.push({ id: c.id, dust: saved.dust, samples: c.samples, seconds: c.seconds, costSamples: c.costSamples });
    }
    if (raw.choice && (!Number.isFinite(raw.readyAt) || raw.readyAt < 0)) return null;
    return { token: raw.token, id: def.id, mission: raw.mission, choice: raw.choice, readyAt: raw.choice ? Math.min(s.clock + 45, raw.readyAt) : 0, choices };
  }
  function startMission(s, id) {
    if (
      s.run.dust < 600 ||
      s.atlas.active || s.expeditions.active || reviewBusy(s) ||
      s.mission ||
      s.result ||
      !missionOptions(s).some((m) => m.id === id) ||
      rawRate(s) === 0
    )
      return false;
    const m = byId(D.MISSIONS, id),
      preview = missionPreview(s, id);
    const track = missionTrack(s, m);
    if (storyMission(m) && track.preparation?.id !== id) return false;
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
      ...(storyMission(m) ? { plan: track.preparation.plan } : {}),
      ...(m.rescue
        ? {
            energy: s.rescue.energy,
            confirmations: [...s.rescue.checks.confirmed],
          }
        : {}),
    };
    const order = s.management.active;
    if (s.epilogue.ending && order && (order.mission === id || order.plan?.alternates.includes(id))) s.mission.harborOrder = order.serial;
    const community=s.continuation.community.active;
    if(community&&community.routes.includes(id)) s.mission.communityOrder=community.serial;
    const encounter = succeeded && rollEncounter(s, m);
    if (encounter) s.mission.encounter = encounter;
    if (storyMission(m)) track.preparation = null;
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
      (def.chapter || storyMission(def) || s.run.choices < 2)
        ? def.story
        : null;
    s.result = {
      id: m.id,
      succeeded: m.succeeded,
      dust: m.succeeded ? m.dust : 0,
      samples: m.succeeded ? m.samples : 1,
      module: m.module,
      story,
      ...(storyMission(def) ? { plan: m.plan } : {}),
      ...(def.rescue
        ? { energy: m.energy, confirmations: [...m.confirmations] }
        : {}),
    };
    if (m.harborOrder) s.result.harborOrder = m.harborOrder;
    if (m.communityOrder) s.result.communityOrder=m.communityOrder;
    if (m.encounter && !s.encounters.pending) s.encounters.pending = clone(m.encounter);
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
  function freshReviews() { return { serial:0, settled:0, active:null, records:[], earned:[], used:[], uses:[], selected:null, aid:null }; }
  function reviewDone(s,id) { return s.continuation.reviews.earned.includes(id); }
  function reviewPreview(s,id,method='safe') {
    const def=byId(D.REVIEWS,id),m=byId(D.REVIEW_METHODS,method);
    if(!def||!m) return null;
    const h=s.continuation.reviews,practice=reviewDone(s,id),previous=D.REVIEWS.find(r=>r.chain===def.chain&&r.index===def.index-1);
    const evidence=def.events.filter(event=>s.encounters.catalog.some(key=>key.startsWith(event+':')));
    const seconds=Math.max(60,Math.ceil((180+def.index*90)*m.time*(evidence.length ? .85 : 1)*(1-equipped(s,'nav')*.05)));
    const dustCost=practice?0:3000+def.index*2000,costSamples=practice?0:m.costSamples;
    const reason=surveyCount(s,def.chain)<3?'先完成本线三处原始调查':previous&&!reviewDone(s,previous.id)?'先归档本线前一项证据复查':s.mission||s.result||s.atlas.active||s.expeditions.active||h.active?'先处理当前航程与报告':s.dust<dustCost?`还需 ${Math.ceil(dustCost-s.dust)} 星尘`:s.samples<costSamples?`还需 ${costSamples-s.samples} 样本`:rawRate(s)<=0?'先启动生产舰队':'';
    return {id,method,practice,evidence,seconds,diversion:m.diversion,dustCost,costSamples,dust:practice?0:Math.floor(dustCost*m.refund),samples:practice?0:m.samples+def.index,equipment:[...s.equipped],levels:Object.fromEntries(s.equipped.map(key=>[key,s.modules[key]])),reason,available:!reason};
  }
  function startReview(s,id,method,expectedSerial) {
    const h=s.continuation.reviews,p=reviewPreview(s,id,method);
    if(!p?.available||h.serial>=1e9||Number(expectedSerial)!==h.serial+1) return false;
    s.dust-=p.dustCost;s.samples-=p.costSamples;
    const {reason,available,...locked}=p;
    h.active={...locked,token:++h.serial,start:s.clock,end:s.clock+p.seconds};s.automation.dispatch=false;
    log(s,`证据复查已出发：${byId(D.REVIEWS,id).name}；${p.evidence.length?'旧记录作对照':'本次直接补录实测来源'}。`);return true;
  }
  function claimReview(s,token) {
    const h=s.continuation.reviews,a=h.active;
    if(!a||a.token!==Number(token)||a.token<=h.settled||s.clock<a.end) return false;
    if(!a.practice&&!reviewDone(s,a.id)) {addDust(s,a.dust);s.samples=bounded(s.samples+a.samples);h.records.push({...clone(a),claimedAt:s.clock});h.earned.push(a.id);}
    h.settled=a.token;h.active=null;log(s,a.practice?'复查演练已归档，没有重复资源或许可奖励。':'复查档案与一次首段支援许可已保存。');return true;
  }
  function reviewGoal(s) {
    const a=s.continuation.reviews.active;if(!a)return null;
    return {title:s.clock>=a.end?'证据复查等待归档':'证据复查正在进行',detail:'旧发现作为对照；缺失来源在本次安全复查补录。没有随机卡关与领取期限。',action:'explore',label:'查看证据复查',focus:'sector-reviews',value:Math.min(a.seconds,s.clock-a.start),target:a.seconds,eta:Math.max(0,a.end-s.clock)};
  }
  function selectVoyageSupport(s,id) {
    const h=s.continuation.reviews;
    if(s.expeditions.active)return false;
    if(id!==null&&(!reviewDone(s,id)||h.used.includes(id)))return false;
    h.selected=id;return true;
  }
  function voyageSupport(s,id,stage) {
    if(stage!==0)return null;
    const h=s.continuation?.reviews;if(!h)return null;
    const run=s.expeditions.active;
    const key=run?.token?(h.aid?.token===run.token?h.aid.id:null):h.selected;
    const def=byId(D.REVIEWS,key),route=byId(D.VOYAGES,id);
    return def&&route?.chain===def.chain&&reviewDone(s,key)&&(!h.used.includes(key)||h.aid?.token===run?.token)?def:null;
  }
  function reserveVoyageSupport(s,id,token) {
    const h=s.continuation.reviews,def=byId(D.REVIEWS,h.selected),route=byId(D.VOYAGES,id);
    h.aid=def&&route.chain===def.chain&&reviewDone(s,def.id)&&!h.used.includes(def.id)?{id:def.id,token}:null;
  }
  function consumeVoyageSupport(s,a) {
    const h=s.continuation.reviews;
    if(a.stage!==0||h.aid?.token!==a.token||h.used.includes(h.aid.id))return;
    h.used.push(h.aid.id);h.uses.push({id:h.aid.id,token:a.token,route:a.id});h.selected=null;
  }
  function cleanReviews(raw,s) {
    const h=freshReviews();if(!raw||typeof raw!=='object')return h;
    h.serial=integer(raw.serial,1e9);h.settled=integer(raw.settled,h.serial);
    for(const id of (Array.isArray(raw.earned)?raw.earned:[]).slice(0,9)) {
      const def=byId(D.REVIEWS,id),previous=def&&D.REVIEWS.find(d=>d.chain===def.chain&&d.index===def.index-1);
      if(def&&!h.earned.includes(id)&&surveyCount(s,def.chain)===3&&h.earned.length<h.settled&&(!previous||h.earned.includes(previous.id)))h.earned.push(id);
    }
    function record(r,active=false) {
      const def=byId(D.REVIEWS,r?.id),m=byId(D.REVIEW_METHODS,r?.method);
      if(!def||!m||surveyCount(s,def.chain)<3||!Number.isInteger(r.token)||r.token<1||r.token>h.serial||(active?(r.token!==h.serial||r.token<=h.settled):r.token>h.settled)||!Array.isArray(r.equipment)||JSON.stringify(cleanEquipment(r.equipment))!==JSON.stringify(r.equipment)||r.equipment.some(id=>!Number.isInteger(r.levels?.[id])||r.levels[id]<1||r.levels[id]>3))return null;
      const previous=D.REVIEWS.find(x=>x.chain===def.chain&&x.index===def.index-1);
      if(previous&&!h.earned.includes(previous.id))return null;
      if(!Array.isArray(r.evidence)||r.evidence.length>def.events.length||new Set(r.evidence).size!==r.evidence.length||r.evidence.some(id=>!def.events.includes(id)))return null;
      const seconds=Math.max(60,Math.ceil((180+def.index*90)*m.time*(r.evidence.length ? .85 : 1)*(1-(r.equipment.includes('nav')?r.levels.nav:0)*.05)));
      const practice=r.practice===true,dustCost=practice?0:3000+def.index*2000;
      if(r.seconds!==seconds||r.diversion!==m.diversion||r.dustCost!==dustCost||r.costSamples!==(practice?0:m.costSamples)||r.dust!==(practice?0:Math.floor(dustCost*m.refund))||r.samples!==(practice?0:m.samples+def.index)||!Number.isInteger(r.start)||r.start<0||r.start>s.clock||r.end!==r.start+seconds||(!active&&r.end>s.clock))return null;
      return {id:def.id,method:m.id,practice,evidence:[...r.evidence],seconds,diversion:m.diversion,dustCost,costSamples:r.costSamples,dust:r.dust,samples:r.samples,equipment:[...r.equipment],levels:Object.fromEntries(r.equipment.map(id=>[id,r.levels[id]])),token:r.token,start:r.start,end:r.end};
    }
    const seen=new Set(),tokens=new Set();
    for(const r of (Array.isArray(raw.records)?raw.records:[]).slice(0,9)){
      const a=record(r);if(!a||a.practice||seen.has(a.id)||tokens.has(a.token))continue;
      seen.add(a.id);if(!h.earned.includes(a.id))h.earned.push(a.id);tokens.add(a.token);h.records.push({...a,claimedAt:Math.max(a.end,Math.min(s.clock,bounded(r.claimedAt)))});
    }
    h.used=[...new Set(Array.isArray(raw.used)?raw.used:[])].filter(id=>h.earned.includes(id));
    const routes=D.VOYAGES,used=new Set();
    for(const r of (Array.isArray(raw.uses)?raw.uses:[]).slice(0,9)) {
      if(!h.earned.includes(r?.id)||used.has(r.id)||byId(D.REVIEWS,r.id).chain!==byId(routes,r.route)?.chain||!Number.isInteger(r.token)||r.token<1||r.token>s.expeditions.serial)continue;
      used.add(r.id);h.uses.push({id:r.id,token:r.token,route:r.route});if(!h.used.includes(r.id))h.used.push(r.id);
    }
    if(h.earned.includes(raw.selected)&&!h.used.includes(raw.selected))h.selected=raw.selected;
    const a=s.expeditions.active,aid=raw.aid;
    if(a&&aid?.token===a.token&&h.earned.includes(aid.id)&&byId(D.REVIEWS,aid.id).chain===byId(routes,a.id).chain&&((a.stage===0&&!a.leg&&!h.used.includes(aid.id))||((a.stage>0||a.leg)&&h.used.includes(aid.id))))h.aid={id:aid.id,token:a.token};
    if(!s.mission&&!s.result&&!s.atlas.active&&!s.expeditions.active){const a=record(raw.active,true);if(a&&a.practice===h.earned.includes(a.id))h.active=a;}
    return h;
  }

  function freshCommunity() { return {serial:0,settled:0,active:null,completed:[],records:[]}; }
  function communityTerms(s,id,mode=s.management.focus) {
    const d=byId(D.COMMUNITY_STORIES,id),focus=byId(D.HARBOR_FOCUSES,mode);
    if(!d||!focus) return null;
    const g=byId(D.COMMUNITY_GROUPS,d.group),level=p=>s.management.projects[p]||0;
    const workSeconds=Math.ceil((240+d.stage*120)*focus.work);
    return {id,serial:s.continuation.community.serial+1,mode,path:'production',acceptedClock:s.clock,
      dustCost:Math.round((4000+d.stage*4000)*focus.dust),samplesCost:Math.max(0,1+d.stage+focus.samples),
      workSeconds,productionGoal:Math.min(250000,Math.max(600,Math.ceil(rawRate(s)*workSeconds))),produced:0,
      tripsRequired:mode==='exploration'?1:2,trips:0,packedDust:0,packedSamples:0,
      careFactor:Math.max(.35,.6-(level('public-berths')+level('habitat'))*.025),
      voyageToken:null, routes:mode==='exploration'?[g.mission,...['belt','supply-run'].filter(x=>x!==g.mission)]:[g.mission]};
  }
  function communityOffer(s,id,mode=s.management.focus) {
    const d=byId(D.COMMUNITY_STORIES,id),terms=communityTerms(s,id,mode);
    if(!d||!terms) return null;
    const h=s.continuation.community,g=byId(D.COMMUNITY_GROUPS,d.group),previous=D.COMMUNITY_STORIES.find(x=>x.group===d.group&&x.stage===d.stage-1);
    const reason=!s.epilogue.ending?'确认正式结局后开放':h.completed.includes(id)?'这份居民回信已经归档':h.active?'先完成已接下的居民协作':h.serial>=1e9?'协作档案已达到安全上限':previous&&!h.completed.includes(previous.id)?'先完成这个值班组的上一封回信':s.management.stats.deliveries<d.stage*2?`先完成 ${d.stage*2} 份港务需求`:(s.management.projects[g.project]||0)<d.stage?`先完成${byId(D.HARBOR_PROJECTS,g.project).name}第 ${d.stage} 期`:'';
    return {...terms,available:!reason,reason};
  }
  function acceptCommunity(s,id,serial) {
    const q=communityOffer(s,id);
    if(!q?.available||q.serial!==Number(serial)) return false;
    const {available,reason,...terms}=q,h=s.continuation.community;
    h.serial=terms.serial;h.active=terms;
    log(s,`居民协作：${byId(D.COMMUNITY_STORIES,id).name}。方向与筹备条件已记录，可以随时改选生产或补给路径。`);return true;
  }
  function communityStatus(s) {
    const a=s.continuation.community.active;if(!a) return null;
    const dustLeft=Math.max(0,a.dustCost-a.packedDust),samplesLeft=Math.max(0,a.samplesCost-a.packedSamples),packed=a.mode==='reception'&&!dustLeft&&!samplesLeft;
    const secondsLeft=Math.max(0,a.acceptedClock+Math.ceil(a.workSeconds*(packed?a.careFactor:1))-s.clock);
    const workReady=!secondsLeft&&(packed||a.produced>=a.productionGoal),tripReady=a.trips>=a.tripsRequired;
    const ready=a.path==='production'?workReady:tripReady;
    const reason=!ready?(a.path==='production'?`港内筹备还需 ${secondsLeft} 秒并完成工作量`:`还需 ${Math.max(0,a.tripsRequired-a.trips)} 次匹配补给交接`):s.dust<dustLeft?`还需 ${Math.ceil(dustLeft-s.dust)} 星尘`:s.samples<samplesLeft?`还需 ${samplesLeft-s.samples} 样本`:'';
    return {...clone(a),dustLeft,samplesLeft,secondsLeft,workReady,tripReady,available:!reason,reason};
  }
  function setCommunityPath(s,serial,path) {
    const a=s.continuation.community.active;
    if(!a||a.serial!==Number(serial)||!['production','exploration'].includes(path)) return false;
    a.path=path;return true;
  }
  function packCommunity(s,serial) {
    const a=s.continuation.community.active;if(!a||a.serial!==Number(serial)||a.mode!=='reception') return false;
    const dust=Math.min(s.dust,a.dustCost-a.packedDust),samples=Math.min(s.samples,a.samplesCost-a.packedSamples);
    if(dust<=0&&samples<=0) return false;
    s.dust-=dust;s.samples-=samples;a.packedDust+=dust;a.packedSamples+=samples;return true;
  }
  function deliverCommunity(s,serial) {
    const a=communityStatus(s),h=s.continuation.community;
    if(!a?.available||a.serial!==Number(serial)||h.completed.includes(a.id)||a.serial<=h.settled) return false;
    s.dust-=a.dustLeft;s.samples-=a.samplesLeft;h.completed.push(a.id);h.settled=a.serial;
    h.records.push({id:a.id,serial:a.serial,clock:s.clock,mode:a.mode,path:a.path,dustCost:a.dustCost,samplesCost:a.samplesCost});h.active=null;
    log(s,`居民来信：${byId(D.COMMUNITY_STORIES,a.id).name}。值班记录与纪念回信已归档，没有新增生产倍率。`);return true;
  }
  function creditCommunityTrip(s,id,serial,voyage=false) {
    const a=s.continuation.community.active;if(!a||a.serial!==serial) return;
    const g=byId(D.COMMUNITY_GROUPS,byId(D.COMMUNITY_STORIES,a.id).group);
    if(voyage?id===g.voyage:a.routes.includes(id)) a.trips=Math.min(a.tripsRequired,a.trips+1);
  }
  function communityGoal(s) {
    const a=communityStatus(s);if(!a) return null;
    return {title:a.available?'居民协作已备齐':byId(D.COMMUNITY_STORIES,a.id).name,detail:a.reason||'准备完成，确认交接后保存居民回信。',action:'explore',label:'查看居民协作',focus:'community-life',value:a.path==='production'?a.produced:a.trips,target:a.path==='production'?a.productionGoal:a.tripsRequired,eta:a.path==='production'?a.secondsLeft:0};
  }
  function cleanCommunity(raw,s) {
    const h=freshCommunity();if(!raw||typeof raw!=='object'||!s.epilogue.ending) return h;
    h.serial=integer(raw.serial,1e9);h.settled=integer(raw.settled,h.serial);
    for(const d of D.COMMUNITY_STORIES){
      const previous=D.COMMUNITY_STORIES.find(x=>x.group===d.group&&x.stage===d.stage-1),g=byId(D.COMMUNITY_GROUPS,d.group);
      if(Array.isArray(raw.completed)&&raw.completed.includes(d.id)&&h.completed.length<h.settled&&(!previous||h.completed.includes(previous.id))&&s.management.stats.deliveries>=d.stage*2&&(s.management.projects[g.project]||0)>=d.stage) h.completed.push(d.id);
    }
    h.completed=Array.isArray(raw.completed)?[...new Set(raw.completed.filter(id=>h.completed.includes(id)))]:[];
    for(const id of h.completed){const r=Array.isArray(raw.records)&&raw.records.find(x=>x?.id===id);if(r&&Number.isInteger(r.serial)&&r.serial>0&&r.serial<=h.settled&&Number.isInteger(r.clock)&&r.clock>=0&&r.clock<=s.clock&&byId(D.HARBOR_FOCUSES,r.mode)&&['production','exploration'].includes(r.path)&&Number.isFinite(r.dustCost)&&r.dustCost>=0&&r.dustCost<=13200&&Number.isInteger(r.samplesCost)&&r.samplesCost>=0&&r.samplesCost<=4) h.records.push({id,serial:r.serial,clock:r.clock,mode:r.mode,path:r.path,dustCost:r.dustCost,samplesCost:r.samplesCost});}
    const a=raw.active,d=a&&byId(D.COMMUNITY_STORIES,a.id),q=d&&communityTerms(s,a.id,a.mode),previous=d&&D.COMMUNITY_STORIES.find(x=>x.group===d.group&&x.stage===d.stage-1),g=d&&byId(D.COMMUNITY_GROUPS,d.group);
    if(q&&!h.completed.includes(a.id)&&a.serial===h.serial&&a.serial>h.settled&&(!previous||h.completed.includes(previous.id))&&s.management.stats.deliveries>=d.stage*2&&(s.management.projects[g.project]||0)>=d.stage&&['production','exploration'].includes(a.path)&&Number.isInteger(a.acceptedClock)&&a.acceptedClock>=0&&a.acceptedClock<=s.clock&&a.dustCost===q.dustCost&&a.samplesCost===q.samplesCost&&a.workSeconds===q.workSeconds&&a.tripsRequired===q.tripsRequired&&JSON.stringify(a.routes)===JSON.stringify(q.routes)&&Number.isFinite(a.careFactor)&&a.careFactor>=.35&&a.careFactor<=.6&&Number.isFinite(a.productionGoal)&&a.productionGoal>=600&&a.productionGoal<=250000&&Number.isFinite(a.produced)&&a.produced>=0&&a.produced<=a.productionGoal&&Number.isInteger(a.trips)&&a.trips>=0&&a.trips<=a.tripsRequired&&Number.isFinite(a.packedDust)&&a.packedDust>=0&&a.packedDust<=a.dustCost&&Number.isInteger(a.packedSamples)&&a.packedSamples>=0&&a.packedSamples<=a.samplesCost&&(a.mode==='reception'||(!a.packedDust&&!a.packedSamples))) h.active={...q,serial:a.serial,path:a.path,acceptedClock:a.acceptedClock,careFactor:a.careFactor,productionGoal:a.productionGoal,produced:a.produced,trips:a.trips,voyageToken:Number.isInteger(a.voyageToken)&&a.voyageToken>0&&a.voyageToken<=s.expeditions.serial?a.voyageToken:null,packedDust:a.packedDust,packedSamples:a.packedSamples};
    return h;
  }

  function freshContinuation() { return { plans: {}, sequence: null, reviews: freshReviews(), community:freshCommunity() }; }
  function cleanPlanSteps(s, steps, capture = false) {
    if (!Array.isArray(steps) || steps.length !== 4) return null;
    const result = [];
    for (const step of steps) {
      if (!byId(D.VOYAGE_METHODS, step?.choice) || !Array.isArray(step.equipment) || JSON.stringify(cleanEquipment(step.equipment)) !== JSON.stringify(step.equipment) || step.equipment.some(id => !s.modules[id])) return null;
      const levels = {};
      for (const id of step.equipment) {
        const level = capture || step.levels === undefined ? s.modules[id] : step.levels?.[id];
        if (!Number.isInteger(level) || level < 1 || level > s.modules[id]) return null;
        levels[id] = level;
      }
      result.push({ choice: step.choice, equipment: [...step.equipment], levels });
    }
    return result;
  }
  const sameEquipment = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  function itineraryOffer(s, id, rawSteps) {
    const def = byId(D.VOYAGES, id), steps = cleanPlanSteps(s, rawSteps);
    if (!def || !steps) return null;
    const local = clone(s), quotes = [];
    const initial = voyagePreview(s, id);
    local.expeditions.active = { id, stage: 0, leg: null, supplies: initial.suppliesBefore, insight: initial.insightBefore };
    local.mission = local.result = local.atlas.active = null;
    local.dust = D.MAX_NUMBER; local.samples = D.MAX_NUMBER;
    let reason = !s.expeditions.completed[id] ? '完成本线首航后才能保存重访安排' : '';
    for (let stage = 0; stage < 4; stage++) {
      const step = steps[stage]; local.equipped = [...step.equipment];
      const p = voyagePreview(local, id, step.choice);
      if (!reason && p.reason) reason = p.reason;
      if (!reason && step.equipment.some(key => s.modules[key] !== step.levels[key])) reason = '舰装等级已变化，请重新保存安排以确认预览';
      quotes.push(p); local.expeditions.active.stage++;
      local.expeditions.active.supplies = p.suppliesAfter; local.expeditions.active.insight = p.insightAfter;
    }
    const total = key => quotes.reduce((n, p) => n + p[key], 0);
    return { id, steps, quotes, seconds: total('seconds'), dustCost: total('dustCost'), costSamples: total('costSamples'),
      dust: total('dust'), samples: total('samples'), dustGap: Math.max(0, total('dustCost') - s.dust), sampleGap: Math.max(0, total('costSamples') - s.samples), reason, available: !reason };
  }
  function saveItinerary(s, id, rawSteps) {
    const steps = cleanPlanSteps(s, rawSteps, true), offer = steps && itineraryOffer(s, id, steps);
    if (!offer?.available) return false;
    s.continuation.plans[id] = { steps };
    log(s, '四段重访安排已保存；每次接续仍由你确认，离线不自动出发。'); return true;
  }
  function itineraryBlock(s, sequence, stage) {
    if (!sequence || !s.expeditions.active || sequence.token !== s.expeditions.active.token) return '本次安排已结束';
    if (s.encounters.pending || s.result?.story) return '先处理等待你的事件或剧情选择';
    const step = sequence.steps[stage];
    if (!step) return '';
    if (step.equipment.some(id => s.modules[id] !== step.levels[id]) || !sameEquipment(s.equipped, step.equipment)) return '编成或等级已变化；恢复已确认编成，或暂停后手动安排';
    return '';
  }
  function startItinerary(s, id) {
    const saved = s.continuation.plans[id], offer = saved && itineraryOffer(s, id, saved.steps);
    if (!offer?.available || s.expeditions.active || s.encounters.pending || !sameEquipment(s.equipped, offer.steps[0].equipment)) return false;
    const candidate = clone(s);
    if (!startVoyage(candidate, id) || !dispatchVoyageLeg(candidate, candidate.expeditions.active.token, 0, offer.steps[0].choice)) return false;
    candidate.continuation.sequence = { id, token: candidate.expeditions.active.token, steps: clone(offer.steps), paused: false, stop: null };
    Object.assign(s, candidate); return true;
  }
  function itineraryStatus(s) {
    const a = s.expeditions.active, q = s.continuation.sequence;
    if (!a || !q || q.token !== a.token) return null;
    const stage = a.leg ? a.stage + 1 : a.stage;
    let reason = itineraryBlock(s, q, stage);
    if (!reason && a.leg && s.clock >= a.leg.end && stage < 4) {
      const candidate = clone(s); claimVoyageLeg(candidate, a.token, a.stage);
      reason = voyagePreview(candidate, a.id, q.steps[stage].choice).reason;
    }
    return { ...q, stage, reason: reason || (q.paused ? '安排已暂停，当前航段仍会正常归航' : ''), ready: Boolean(a.leg && s.clock >= a.leg.end) };
  }
  function pauseItinerary(s, token, resume = false) {
    const q = s.continuation.sequence, a = s.expeditions.active;
    if (!q || !a || q.token !== Number(token) || a.token !== q.token) return false;
    if (resume && itineraryBlock(s, q, a.leg ? a.stage + 1 : a.stage)) return false;
    q.paused = !resume; q.stop = resume ? null : 'manual'; return true;
  }
  function restoreItineraryEquipment(s, token) {
    const q = s.continuation.sequence, a = s.expeditions.active;
    if (!q || !a || q.token !== Number(token) || q.token !== a.token) return false;
    const stage = a.leg ? a.stage + 1 : a.stage;
    const step = q.steps[stage];
    if (!step || step.equipment.some(id => !s.modules[id] || s.modules[id] !== step.levels[id])) return false;
    s.equipped = [...step.equipment]; return true;
  }
  function equipItinerary(s, id) {
    const plan = s.continuation.plans[id], offer = plan && itineraryOffer(s, id, plan.steps);
    if (!offer?.available) return false;
    s.equipped = [...offer.steps[0].equipment]; return true;
  }
  function stopItinerary(s, token) {
    if (s.continuation.sequence?.token !== Number(token) || s.expeditions.active?.token !== Number(token)) return false;
    s.continuation.sequence = null; return true;
  }
  function advanceItinerary(s, token, stage) {
    const q = s.continuation.sequence, a = s.expeditions.active;
    if (!q || q.paused || !a?.leg || a.token !== Number(token) || q.token !== a.token || a.stage !== Number(stage) || s.clock < a.leg.end) return false;
    const candidate = clone(s);
    if (!claimVoyageLeg(candidate, token, stage)) return false;
    const next = candidate.expeditions.active.stage;
    let reason = next < 4 ? itineraryBlock(candidate, q, next) : (s.encounters.pending ? '先处理等待你的事件或剧情选择' : '');
    if (!reason && next < 4) reason = voyagePreview(candidate, a.id, q.steps[next].choice).reason;
    if (reason) { q.paused = true; q.stop = reason.includes('编成') ? 'equipment' : s.encounters.pending ? 'decision' : 'resources'; return false; }
    if (next === 4) { if (!finishVoyage(candidate, token)) return false; candidate.continuation.sequence = null; }
    else if (!dispatchVoyageLeg(candidate, token, next, q.steps[next].choice)) return false;
    Object.assign(s, candidate); return true;
  }
  function cleanContinuation(raw, s) {
    const h = freshContinuation();
    if (!raw || typeof raw !== 'object') return h;
    for (const def of D.VOYAGES) if (Object.hasOwn(raw.plans || {}, def.id) && s.expeditions.completed[def.id]) {
      const steps = cleanPlanSteps(s, raw.plans[def.id]?.steps); if (steps) h.plans[def.id] = { steps };
    }
    h.reviews = cleanReviews(raw.reviews,s);
    h.community = cleanCommunity(raw.community,s);
    const q = raw.sequence, a = s.expeditions.active, steps = cleanPlanSteps(s, q?.steps);
    if (a && q?.token === a.token && q.id === a.id && s.expeditions.completed[a.id] && steps &&
      [...a.legs, ...(a.leg ? [a.leg] : [])].every(l => l.choice === steps[l.stage].choice && sameEquipment(l.equipment, steps[l.stage].equipment)))
      h.sequence = { id: a.id, token: a.token, steps, paused: q.paused === true, stop: ['manual', 'equipment', 'decision', 'resources'].includes(q.stop) ? q.stop : null };
    return h;
  }

  function voyageReason(s,id) {
    const def=byId(D.VOYAGES,id);
    return !def ? '未知航线' : !s.epilogue.ending ? '确认任一正式结局后开放' : surveyCount(s,def.chain)<3 ? '先完成对应星区的三处调查' : '';
  }
  function voyagePreview(s,id,choice='secure',equipment=s.equipped) {
    const def=byId(D.VOYAGES,id), method=byId(D.VOYAGE_METHODS,choice);
    if(!def || !method) return null;
    const run=s.expeditions.active, stage=run?.id===id ? run.stage : 0;
    const slots=cleanEquipment(equipment).filter(x=>s.modules[x]>0), local={...s,equipped:slots};
    const supplies=run?.id===id?run.supplies:Math.min(3,s.management.projects['public-berths']||0);
    const insight=run?.id===id?run.insight:Math.min(2,D.SECTORS.filter(c=>c.id!==def.chain&&surveyCount(s,c.id)===3).length);
    const nav=equipped(local,'nav'), scanner=equipped(local,'scanner'), support=voyageSupport(s,id,stage);
    const seconds=Math.max(120,Math.ceil((def.seconds[stage]||def.seconds[3])*method.time*(1-nav*.05)*(1-insight*.03)*(supplies===0?1.12:supplies>=4?.94:1)*(1-(s.management.projects['route-station']||0)*.03)*(support?.kind==='time'?.95:1)));
    const diversion=Math.max(.04,Math.min(.4,method.diversion-(s.management.projects['repair-dock']||0)*.01-insight*.01+(choice==='investigate'&&scanner? .03:0)));
    const dustCost=Math.ceil((8000+stage*7000)*method.cost*(1-(s.management.projects['supply-network']||0)*.04)*(support?.kind==='cost'?.95:1));
    const costSamples=method.costSamples;
    const dust=Math.floor(Math.min(250000,Math.max(500,rawRate(local)*(70+stage*30)))*method.dust*def.dust*(1+scanner*.08));
    const samples=method.samples+def.samples+(stage===3?(s.management.projects.habitat||0):0)+(support?.kind==='samples'?1:0);
    const reason=voyageReason(s,id) || (s.mission||s.result||s.atlas.active||reviewBusy(s)?'先处理当前探索与调查':run && run.id!==id ? '先完成当前远航':run?.leg?'先领取当前阶段报告':stage>=4?'所有阶段已完成，等待归航封存':s.afterword.active&&!run?'先完成当前居民委托':
      choice==='investigate' && (!slots.includes(def.module)||!s.modules[def.module])?`此调查需要装备${byId(D.MODULES,def.module).name}；安全补给不需要特定舰装`:s.dust<dustCost?`还需 ${Math.ceil(dustCost-s.dust)} 星尘`:s.samples<costSamples?`还需 ${costSamples-s.samples} 样本`:rawRate(s)<=0?'先启动生产舰队':'');
    return {id,stage,choice,seconds,diversion,dustCost,costSamples,dust,samples,support:support?.id||null,equipment:slots,
      levels:Object.fromEntries(slots.map(x=>[x,s.modules[x]])),suppliesBefore:supplies,insightBefore:insight,
      suppliesAfter:Math.min(8,Math.max(0,supplies+method.supplies)),insightAfter:Math.min(4,insight+method.insight),reason,available:!reason};
  }
  function startVoyage(s,id) {
    const p=voyagePreview(s,id);
    if(s.expeditions.active || !p?.available || s.expeditions.serial>=1e9) return false;
    s.expeditions.active={id,token:++s.expeditions.serial,stage:0,legs:[],leg:null,dust:0,samples:0,
      initialSupplies:p.suppliesBefore,initialInsight:p.insightBefore,supplies:p.suppliesBefore,insight:p.insightBefore};
    reserveVoyageSupport(s,id,s.expeditions.active.token);
    const community=s.continuation.community.active;if(community) community.voyageToken=s.expeditions.active.token;
    s.automation.dispatch=false;
    log(s, `已编排${byId(D.VOYAGES,id).name}，每段由你决定；离线等待没有失败倒计时。`);return true;
  }
  function dispatchVoyageLeg(s,token,stage,choice) {
    const a=s.expeditions.active;
    if(!a || a.token!==Number(token) || a.stage!==Number(stage) || a.leg) return false;
    const p=voyagePreview(s,a.id,choice);
    if(!p?.available) return false;
    s.dust-=p.dustCost;s.samples-=p.costSamples;
    consumeVoyageSupport(s,a);
    a.leg={stage:a.stage,choice,seconds:p.seconds,diversion:p.diversion,dustCost:p.dustCost,costSamples:p.costSamples,dust:p.dust,samples:p.samples,
      equipment:p.equipment,levels:p.levels,suppliesBefore:p.suppliesBefore,insightBefore:p.insightBefore,start:s.clock,end:s.clock+p.seconds};
    log(s,`${byId(D.VOYAGES,a.id).stages[a.stage]}已出发：${byId(D.VOYAGE_METHODS,choice).name}。`);return true;
  }
  function claimVoyageLeg(s,token,stage) {
    const a=s.expeditions.active,l=a?.leg;
    if(!l || a.token!==Number(token) || a.stage!==Number(stage) || s.clock<l.end) return false;
    a.dust=bounded(a.dust+l.dust);a.samples=bounded(a.samples+l.samples);
    const m=byId(D.VOYAGE_METHODS,l.choice);
    a.supplies=Math.min(8,Math.max(0,a.supplies+m.supplies));a.insight=Math.min(4,a.insight+m.insight);
    a.legs.push(clone(l));a.stage++;a.leg=null;
    log(s,'远航阶段已记录，回收物随船封存；下一段选择等待你的安排。');return true;
  }
  function finishVoyage(s,token) {
    const h=s.expeditions,a=h.active;
    if(!a || a.token!==Number(token) || a.token<=h.settled || a.stage!==4 || a.leg) return false;
    const first=!h.completed[a.id];
    addDust(s,a.dust);s.samples=bounded(s.samples+a.samples+(first?6:0));
    h.completed[a.id]=integer((h.completed[a.id]||0)+1,1e9);h.settled=a.token;
    const awards=[`voyage-${a.id}`];
    if(a.legs.filter(l=>l.choice==='recover').length>=2) awards.push(`cargo-${a.id}`);
    if(a.insight>=2) awards.push(`survey-${a.id}`);
    if(a.supplies>=4) awards.push(`care-${a.id}`);
    if(D.VOYAGES.every(v=>h.completed[v.id])) awards.push('three-addresses');
    const fresh=awards.filter(x=>!h.collections.includes(x));h.collections.push(...fresh);
    h.records.unshift({id:a.id,token:a.token,clock:s.clock,initialSupplies:a.initialSupplies,initialInsight:a.initialInsight,legs:clone(a.legs),dust:a.dust,samples:a.samples,firstBonus:first?6:0,collections:fresh});h.records=h.records.slice(0,12);
    if(first) h.archives[a.id]=clone(h.records[0]);
    const seconds=a.legs.reduce((n,l)=>n+l.seconds,0);h.best[a.id]=Math.min(h.best[a.id]||Infinity,seconds);
    h.dust=bounded(h.dust+a.dust);h.samples=bounded(h.samples+a.samples+(first?6:0));
    const community=s.continuation.community.active;
    if(community&&community.voyageToken===a.token) creditCommunityTrip(s,a.id,community.serial,true);
    h.active=null;
    if(s.continuation?.reviews) s.continuation.reviews.aid=null;
    if(s.continuation?.sequence?.token===a.token) s.continuation.sequence=null;
    log(s,`${byId(D.VOYAGES,a.id).name}归航，回收物已交给港务值班组，航行档案与${fresh.length}件新纪念已保存。`);return true;
  }
  function voyageGoal(s) {
    const a=s.expeditions.active;
    if(!a) return null;
    const next=!a.leg && a.stage<4 ? voyagePreview(s,a.id,"secure") : null;
    return {title:a.stage===4?'远航归航，等待封存':a.leg?s.clock>=a.leg.end?'远航阶段报告已到达':'长期远航正在进行':'选择下一段远航安排',detail:next?.reason || '回收、调查、补给会影响下一段耗时与可用方案；已出发编成锁定，下一段可以换装。',action:'explore',label:'查看长期远航',focus:'long-voyages',value:a.stage,target:4,eta:a.leg?Math.max(0,a.leg.end-s.clock):next&&!next.available?incomeEta(s,Math.max(0,next.dustCost-s.dust)):0};
  }
  function cleanExpeditions(raw,s) {
    if(!raw || typeof raw!=='object' || !s.epilogue.ending) return;
    const h=s.expeditions;h.serial=integer(raw.serial,1e9);h.settled=integer(raw.settled,h.serial);
    for(const def of D.VOYAGES) if(raw.completed?.[def.id]>0) h.completed[def.id]=integer(raw.completed[def.id],h.settled);
    const keys=D.VOYAGES.flatMap(v=>['voyage','cargo','survey','care'].map(k=>`${k}-${v.id}`)).concat('three-addresses');
    h.collections=[...new Set(Array.isArray(raw.collections)?raw.collections:[])].filter(x=>keys.includes(x) && (x==='three-addresses'?D.VOYAGES.every(v=>h.completed[v.id]):D.VOYAGES.some(v=>h.completed[v.id]&&x.endsWith('-'+v.id))));
    h.dust=bounded(raw.dust);h.samples=bounded(raw.samples);
    for(const def of D.VOYAGES) if(Number.isInteger(raw.best?.[def.id]) && raw.best[def.id]>=480 && raw.best[def.id]<=16000) h.best[def.id]=raw.best[def.id];
    function cleanLeg(l,stage,id,supplies,insight) {
      const m=byId(D.VOYAGE_METHODS,l?.choice),def=byId(D.VOYAGES,id);
      if(!m || l.stage!==stage || !Array.isArray(l.equipment) || JSON.stringify(cleanEquipment(l.equipment))!==JSON.stringify(l.equipment) || l.equipment.some(x=>!Number.isInteger(l.levels?.[x])||l.levels[x]<1||l.levels[x]>3) ||
        (l.choice==='investigate'&&!l.equipment.includes(def.module)) || l.suppliesBefore!==supplies || l.insightBefore!==insight ||
        !Number.isInteger(l.seconds)||l.seconds<120||l.seconds>4000||!Number.isFinite(l.diversion)||l.diversion<.04||l.diversion>.4||
        !Number.isFinite(l.dustCost)||l.dustCost<1000||l.dustCost>100000||l.costSamples!==m.costSamples||!Number.isFinite(l.dust)||l.dust<0||l.dust>1000000||!Number.isInteger(l.samples)||l.samples<1||l.samples>20||
        !Number.isInteger(l.start)||l.start<0||l.start>s.clock||l.end!==l.start+l.seconds) return null;
      return {stage,choice:l.choice,seconds:l.seconds,diversion:l.diversion,dustCost:l.dustCost,costSamples:l.costSamples,dust:l.dust,samples:l.samples,equipment:[...l.equipment],levels:Object.fromEntries(l.equipment.map(x=>[x,l.levels[x]])),suppliesBefore:supplies,insightBefore:insight,start:l.start,end:l.end};
    }
    function cleanRun(r,active=false) {
      const def=byId(D.VOYAGES,r?.id);
      if(!def || !Number.isInteger(r.token)||r.token<1 || r.token>h.serial || (active ? r.token!==h.serial||r.token<=h.settled||surveyCount(s,def.chain)<3 : r.token>h.settled) ||
        !Number.isInteger(r.initialSupplies)||r.initialSupplies<0||r.initialSupplies>3||!Number.isInteger(r.initialInsight)||r.initialInsight<0||r.initialInsight>2||!Array.isArray(r.legs)||r.legs.length>4) return null;
      const a={id:r.id,token:r.token,stage:0,legs:[],leg:null,dust:0,samples:0,initialSupplies:r.initialSupplies,initialInsight:r.initialInsight,supplies:r.initialSupplies,insight:r.initialInsight};
      for(const saved of r.legs) {
        const l=cleanLeg(saved,a.stage,a.id,a.supplies,a.insight);if(!l || l.end>s.clock) return null;
        const m=byId(D.VOYAGE_METHODS,l.choice);a.legs.push(l);a.stage++;a.dust=bounded(a.dust+l.dust);a.samples=bounded(a.samples+l.samples);a.supplies=Math.min(8,Math.max(0,a.supplies+m.supplies));a.insight=Math.min(4,a.insight+m.insight);
      }
      if(active && r.stage!==a.stage) return null;
      if(active && r.leg) { if(a.stage>=4) return null;a.leg=cleanLeg(r.leg,a.stage,a.id,a.supplies,a.insight);if(!a.leg)return null; }
      return a;
    }
    const seen=new Set();
    for(const r of (Array.isArray(raw.records)?raw.records:[]).slice(0,12)) {
      const a=cleanRun(r);if(!a || a.stage!==4 || seen.has(a.token)) continue;seen.add(a.token);
      h.records.push({id:r.id,token:r.token,clock:Math.min(s.clock,bounded(r.clock)),initialSupplies:r.initialSupplies,initialInsight:r.initialInsight,legs:a.legs,dust:a.dust,samples:a.samples,firstBonus:r.firstBonus===6?6:0,collections:[...new Set(Array.isArray(r.collections)?r.collections:[])].filter(x=>h.collections.includes(x))});
    }
    for(const def of D.VOYAGES) {
      const r=raw.archives?.[def.id] || h.records.find(r=>r.id===def.id && r.firstBonus===6);
      const a=cleanRun(r);
      if(a && a.id===def.id && a.stage===4) {
        h.completed[def.id]=Math.max(1,h.completed[def.id]||0);
        if(!h.collections.includes(`voyage-${def.id}`)) h.collections.push(`voyage-${def.id}`);
        h.archives[def.id]={id:r.id,token:r.token,clock:Math.min(s.clock,bounded(r.clock)),initialSupplies:r.initialSupplies,initialInsight:r.initialInsight,legs:a.legs,dust:a.dust,samples:a.samples,firstBonus:6,collections:[...new Set(Array.isArray(r.collections)?r.collections:[])].filter(x=>h.collections.includes(x))};
      }
    }
    if(!s.mission && !s.result && !s.atlas.active) h.active=cleanRun(raw.active,true);
  }

  function surveyCount(s, id) { return s.atlas.nodes.filter(n => n.chain === id).length; }
  function surveyPreview(s, id, approach = 'safe') {
    const chain = byId(D.SECTORS, id), method = byId(D.SURVEY_METHODS, approach);
    if (!chain || !method) return null;
    const node = surveyCount(s, id), evidence = s.encounters.catalog.filter(key => chain.events.includes(key.split(':')[0])).length;
    const seconds = Math.max(30, Math.ceil((90 + node * 60 - Math.min(30, evidence * 5)) * method.time * (1 - equipped(s,'nav') * .06)));
    const costSamples = method.cost;
    const reason = s.discoveries < 3 ? '领取三份成功探索报告后开放图谱' : node >= chain.nodes.length ? '本线三处节点已全部归档'
      : s.mission || s.result || s.atlas.active || s.expeditions.active || reviewBusy(s) ? '先处理当前航程与报告' : s.samples < costSamples ? `还需 ${costSamples-s.samples} 份样本；安全调查无需样本` : rawRate(s) <= 0 ? '先启动生产舰队' : '';
    return { chain:id, node, approach, seconds, diversion:method.diversion, costSamples,
      dust: Math.min(250000, Math.floor(Math.max(20,rawRate(s) * (30 + node * 15) * method.dust * (1 + equipped(s,'scanner') * .1)))),
      samples:method.samples + (node === 2 ? 3 : 0), equipment:[...s.equipped], evidence, reason, available:!reason };
  }
  function setSurveyPriority(s, id) {
    if (s.discoveries < 3 || !byId(D.SECTORS,id)) return false;
    s.atlas.priority = id; return true;
  }
  function startSurvey(s, id, approach, expectedNode) {
    const p = surveyPreview(s,id,approach);
    if (!p?.available || p.node !== Number(expectedNode) || s.atlas.serial >= 1e9) return false;
    s.samples -= p.costSamples;
    s.atlas.priority = id;
    s.atlas.active = { chain:id, node:p.node, approach, token:++s.atlas.serial, seconds:p.seconds, diversion:p.diversion,
      dust:p.dust, samples:p.samples, equipment:p.equipment, start:s.clock, end:s.clock+p.seconds };
    s.automation.dispatch = false;
    log(s, `调查${byId(D.SECTORS,id).name}：${byId(D.SECTORS,id).nodes[p.node]}，结果和编成已锁定。`);
    return true;
  }
  function claimSurvey(s, token) {
    const a = s.atlas.active;
    if (!a || a.token !== Number(token) || a.token <= s.atlas.claimed || s.clock < a.end || a.node !== surveyCount(s,a.chain)) return false;
    addDust(s,a.dust); s.samples = bounded(s.samples+a.samples);
    s.atlas.nodes.push({chain:a.chain,node:a.node,approach:a.approach,token:a.token,equipment:[...a.equipment],dust:a.dust,samples:a.samples,clock:s.clock});
    s.atlas.claimed = a.token; s.atlas.active = null;
    if (surveyCount(s,a.chain) === 3) s.atlas.priority = null;
    log(s, `${byId(D.SECTORS,a.chain).nodes[a.node]}已归档${a.node===2 ? '，新航线与纪念品开放' : '，下一处坐标已确认'}。`);
    return true;
  }
  function surveyGoal(s) {
    const a = s.atlas.active, id = a?.chain || s.atlas.priority;
    if (!id || s.discoveries < 3 || !reachable(s,'explore')) return null;
    const chain = byId(D.SECTORS,id), count = surveyCount(s,id);
    if (!a && count === 3) return null;
    return { title:a ? s.clock>=a.end ? '调查记录等待归档' : `正在调查${chain.name}` : `继续调查${chain.name}`,
      detail:a ? '结果已锁定，离线可完成航行；归档与下一段调查由你确认。' : chain.nodes[count], action:'explore', label:'查看星区图谱',focus:'sector-atlas',value:count,target:3,eta:a ? Math.max(0,a.end-s.clock) : 0 };
  }
  function cleanAtlas(raw,s) {
    if (!raw || typeof raw !== 'object') return;
    const a = s.atlas;
    a.serial=integer(raw.serial,1e9); a.claimed=integer(raw.claimed,a.serial);
    if(byId(D.SECTORS,raw.priority)) a.priority=raw.priority;
    const seen=new Set();
    for(const r of (Array.isArray(raw.nodes)?raw.nodes:[]).slice(0,9)) {
      if(!byId(D.SECTORS,r?.chain) || r.node!==surveyCount(s,r.chain) || r.node>=3 || !byId(D.SURVEY_METHODS,r.approach) || !Number.isInteger(r.token) || r.token<1 || r.token>a.claimed || seen.has(r.token)) continue;
      seen.add(r.token);
      a.nodes.push({chain:r.chain,node:r.node,approach:r.approach,token:r.token,equipment:cleanEquipment(r.equipment),dust:bounded(r.dust,250000),samples:integer(r.samples,12),clock:Math.min(s.clock,bounded(r.clock))});
    }
    const r=raw.active, method=byId(D.SURVEY_METHODS,r?.approach);
    if(!s.mission && !s.result && byId(D.SECTORS,r?.chain) && method && r.node===surveyCount(s,r.chain) && r.node<3 && r.token===a.serial && r.token>a.claimed &&
      Number.isFinite(r.seconds) && r.seconds>=30 && r.seconds<=450 && r.diversion===method.diversion && Number.isFinite(r.dust) && r.dust>=0 && r.dust<=250000 && r.samples===method.samples+(r.node===2?3:0) &&
      Number.isInteger(r.start) && r.start>=0 && r.start<=s.clock && r.end===r.start+r.seconds)
      a.active={chain:r.chain,node:r.node,approach:r.approach,token:r.token,seconds:r.seconds,diversion:r.diversion,dust:r.dust,samples:r.samples,equipment:cleanEquipment(r.equipment),start:r.start,end:r.end};
  }
  function cleanEquipment(items) { return [...new Set(Array.isArray(items)?items:[])].filter(id=>byId(D.MODULES,id)).slice(0,2); }

  function creditHarborWork(s, spent) {
    const task=s.management.active, plan=task?.plan;
    if(!plan || plan.mode!=='production') return;
    const credit=Math.min(Math.max(0,task.productionGoal*plan.workshopCap-plan.credit),spent);
    plan.credit+=credit; task.produced=Math.min(task.productionGoal,task.produced+credit);
  }
  function packHarborNeed(s,serial) {
    const task=s.management.active, plan=task?.plan;
    if(!plan || plan.mode!=='reception' || task.serial!==Number(serial)) return false;
    const dust=Math.min(s.dust,Math.max(0,task.dustCost-plan.packedDust));
    const samples=Math.min(s.samples,Math.max(0,task.samplesCost-plan.packedSamples));
    if(!dust && !samples) return false;
    s.dust-=dust;s.samples-=samples;plan.packedDust+=dust;plan.packedSamples+=samples;
    log(s,'居民值班组已把实际交付资源预装入库，不再被自动购买使用。');return true;
  }
  function reserveHarborNeed(s) {
    const t=harborStatus(s);
    if(!t || !capability(s,'planning')) return false;
    configure(s,{reserve:Math.max(s.automation.reserve,t.dustLeft)});return true;
  }
  function harborSchedule(s) {
    if(!s.epilogue.ending) return null;
    const task=harborStatus(s), rate=productionRate(s);
    let productionEta=task ? Math.max(task.preparationLeft,incomeEta(s,Math.max(0,task.productionGoal-task.produced)) ?? Infinity,incomeEta(s,Math.max(0,task.dustLeft-s.dust)) ?? Infinity) : 0;
    if(task?.plan?.mode==="reception" && task.dustLeft===0 && task.samplesLeft===0) productionEta=Math.min(productionEta,task.preparationLeft);
    const mission=task && !missionLock(s,task.mission) ? missionPreview(s,task.mission) : missionPreview(s,'belt');
    return {rate,task:task ? {id:task.id,dustLeft:task.dustLeft,samplesLeft:task.samplesLeft,productionEta:Number.isFinite(productionEta)?productionEta:null,
      explorationSeconds:mission.seconds*Math.max(0,task.tripsRequired-task.trips),explorationDust:mission.dust,explorationSamples:mission.samples} : null,
      projects:D.HARBOR_PROJECTS.map(p=>{const o=harborProjectOffer(s,p.id);return {id:p.id,level:o.level,dustGap:Math.max(0,o.dustCost-s.dust),samplesGap:Math.max(0,o.samplesCost-s.samples),eta:incomeEta(s,Math.max(0,o.dustCost-s.dust)),reason:o.reason};})};
  }

  function harborTerms(s, id) {
    const need = byId(D.HARBOR_NEEDS, id), focus = byId(D.HARBOR_FOCUSES, s.management.focus);
    if (!s.epilogue.ending || !need) return null;
    const tier = Math.min(3, Math.floor(s.management.cycle / 7));
    const level = id => s.management.projects[id] || 0;
    const dustCost = Math.ceil(need.dust * (1 + tier * .25) * focus.dust * (id === "repair" ? 1 - level("repair-dock") * .04 : 1));
    const samplesCost = Math.max(1, need.samples + focus.samples + Math.min(1, tier) - (["food", "reception"].includes(id) ? level("habitat") : 0));
    const work = need.seconds * focus.work * (["food", "energy", "cargo"].includes(id) ? 1 - level("supply-network") * .1 : 1);
    return { id, serial: s.management.cycle + 1, focus: focus.id, acceptedClock: s.clock,
      dustCost, samplesCost, workSeconds: Math.max(30, Math.ceil(work)), productionGoal: Math.min(250000, Math.max(600, Math.ceil(rawRate(s) * work))), produced: 0,
      plan:{mode:focus.id,credit:0,packedDust:0,packedSamples:0,
        alternates:focus.id === "exploration" ? ["belt", "supply-run"] : [],
        careFactor:Math.max(.35,.6-(level("public-berths")+level("habitat"))*.025),
        workshopCap:Math.min(.5,.35+level("repair-dock")*.05)},
      mission: need.mission, tripsRequired: Math.max(1, (tier > 0 ? 2 : 1) + focus.trips - (["routes", "comms"].includes(id) && level("route-station") >= 2 ? 1 : 0)), trips: 0 };
  }
  function harborOffers(s) {
    if (!s.epilogue.ending || s.management.active || s.management.cycle >= 1e9) return [];
    const focus = byId(D.HARBOR_FOCUSES, s.management.focus), count = s.management.projects["public-berths"] ? 4 : 3;
    return Array.from({ length: count }, (_, i) => D.HARBOR_NEEDS[(s.management.cycle + focus.offset + i * 2) % D.HARBOR_NEEDS.length])
      .map(need => ({ ...clone(need), terms: harborTerms(s, need.id) }));
  }
  function setHarborFocus(s, id) {
    if (!s.epilogue.ending || !byId(D.HARBOR_FOCUSES, id)) return false;
    s.management.focus = id;
    return true;
  }
  function acceptHarborNeed(s, id, serial) {
    if (Number(serial) !== s.management.cycle + 1 || !harborOffers(s).some(n => n.id === id)) return false;
    s.management.active = harborTerms(s, id);
    log(s, `居民需求：${byId(D.HARBOR_NEEDS, id).name}。方案已记录，无期限；探索或港内生产均可推进。`);
    return true;
  }
  function harborStatus(s) {
    const task = s.management.active;
    if (!s.epilogue.ending || !task) return null;
    const dustLeft=Math.max(0,task.dustCost-(task.plan?.packedDust || 0)), samplesLeft=Math.max(0,task.samplesCost-(task.plan?.packedSamples || 0));
    const prepacked=task.plan?.mode==="reception" && dustLeft===0 && samplesLeft===0;
    const preparationLeft=Math.max(0,task.acceptedClock+Math.ceil(task.workSeconds*(prepacked?task.plan.careFactor:1))-s.clock);
    const careReady=task.plan?.mode === "reception" && dustLeft===0 && samplesLeft===0 && s.clock>=task.acceptedClock+Math.ceil(task.workSeconds*task.plan.careFactor);
    const workReady = careReady || (task.produced >= task.productionGoal && preparationLeft === 0) || task.trips >= task.tripsRequired;
    const reason = !workReady ? `完成指定补给，或港内生产与筹备（还需 ${preparationLeft} 秒筹备）`
      : s.samples < samplesLeft ? `还需 ${samplesLeft - s.samples} 份样本，可安全探索取得`
      : s.dust < dustLeft ? `还需 ${Math.ceil(dustLeft - s.dust)} 星尘；自动购买预算可保留交付费用` : "";
    return { ...clone(task), ...clone(byId(D.HARBOR_NEEDS, task.id)), preparationLeft, workReady, dustLeft, samplesLeft, careReady, available: !reason, reason };
  }
  function deliverHarborNeed(s, serial) {
    const task = harborStatus(s);
    if (!task?.available || task.serial !== Number(serial)) return false;
    s.dust -= task.dustLeft; s.samples -= task.samplesLeft;
    const h = s.management;
    h.cycle++; h.stats.deliveries++;
    h.stats.dustSpent = bounded(h.stats.dustSpent + task.dustCost);
    h.stats.samplesSpent = bounded(h.stats.samplesSpent + task.samplesCost);
    h.counts[task.id] = integer((h.counts[task.id] || 0) + 1, 1e9);
    h.history.unshift({ serial: task.serial, id: task.id, focus: task.focus, clock: s.clock });
    h.history = h.history.slice(0, 24);
    if (!h.collections.includes(`need-${task.id}`)) h.collections.push(`need-${task.id}`);
    h.active = null;
    log(s, `${task.name}已交付，居民回信「${task.collection}」已记录。下一轮需求开放。`);
    return true;
  }
  function harborProjectOffer(s, id) {
    const project = byId(D.HARBOR_PROJECTS, id);
    if (!project) return null;
    const level = s.management.projects[id] || 0, next = level + 1;
    const dustCost = project.dust * next, samplesCost = project.samples + (next - 1) * 3;
    const reason = !s.epilogue.ending ? "确认任一正式结局后开放"
      : level >= 3 ? "三期已完成，永久保留"
      : !s.management.counts[project.need] ? `先完成一次${byId(D.HARBOR_NEEDS, project.need).name}`
      : s.management.stats.deliveries < D.HARBOR_STAGE_DELIVERIES[level] ? `累计交付 ${D.HARBOR_STAGE_DELIVERIES[level]} 份居民需求后开放`
      : s.dust < dustCost || s.samples < samplesCost ? `需要 ${dustCost} 星尘与 ${samplesCost} 样本` : "";
    return { ...clone(project), level, next, dustCost, samplesCost, available: !reason, reason };
  }
  function buildHarborProject(s, id, expectedLevel) {
    const offer = harborProjectOffer(s, id);
    if (!offer?.available || offer.level !== Number(expectedLevel)) return false;
    s.dust -= offer.dustCost; s.samples -= offer.samplesCost;
    s.management.projects[id] = offer.next;
    if (offer.next === 3 && !s.management.collections.includes(`project-${id}`)) s.management.collections.push(`project-${id}`);
    log(s, `${offer.name}第${offer.next}期建成。${offer.benefit}`);
    return true;
  }
  function harborGoal(s) {
    if (!s.epilogue.ending || !reachable(s, "explore")) return null;
    const task = harborStatus(s);
    const base = { action: "explore", focus: "harbor-management", value: 0, target: 1, eta: 0 };
    if (!task) return { ...base, title: "规划归航星港的下一班", detail: "接下一份居民需求，安排生产或航线；交付后推进有限工程与居民回信。", label: "查看港务经营" };
    if (s.samples < task.samplesLeft) return { ...base, title: `${task.name} · 收集交付样本`, detail: `尚需 ${task.samplesLeft} 份样本，现有 ${s.samples}；普通安全探索可以补足。`, label: "安排安全回收", focus: s.mission ? "active-mission" : "mission-belt", value: s.samples, target: Math.max(1,task.samplesLeft), eta: null, etaHint:"完成安全探索并领取样本；扫描不会增加样本" };
    return { ...base, title: `${task.name} · ${task.available ? "可以交付" : "正在准备"}`, detail: task.reason || "交付将扣除已列明资源，回信、经营统计与下一轮目标会保存。", label: task.available ? "完成交付" : "查看需求进度", value: task.workReady ? 1 : task.produced / task.productionGoal, eta: task.workReady ? incomeEta(s, Math.max(0, task.dustLeft - s.dust)) : Math.max(task.preparationLeft, incomeEta(s, Math.max(0, task.productionGoal - task.produced)) || 0) };
  }
  function residentRequests(s) {
    if (!s.epilogue.ending) return [];
    return D.RESIDENT_REQUESTS.map((request) => {
      const record = s.afterword.completed.find((r) => r.id === request.id);
      return { ...clone(request), record: record ? clone(record) : null,
        active: s.afterword.active === request.id,
        ready: s.afterword.active === request.id && s.afterword.ready,
        available: !record && !s.afterword.active && !s.mission && !s.result && !s.atlas.active && !s.expeditions.active };
    });
  }
  function acceptResidentRequest(s, id) {
    const offer = residentRequests(s).find((r) => r.id === id);
    if (!offer?.available) return false;
    s.afterword.active = id;
    s.afterword.ready = false;
    // Keep this one return manual, so the player's delivery cannot be auto-claimed.
    s.automation.dispatch = false;
    log(s, `${offer.from}的委托：${offer.title}。下次两港补给归航后，再一起留下回信。`);
    return true;
  }
  function completeResidentRequest(s, id, reply) {
    const offer = residentRequests(s).find((r) => r.id === id);
    if (!offer?.ready || !offer.replies.some((r) => r.id === reply)) return false;
    s.afterword.completed.push({ id, reply });
    s.afterword.active = null;
    s.afterword.ready = false;
    log(s, `${offer.title}已归档，收藏「${offer.collection}」。`);
    return true;
  }
  function residentGoal(s) {
    if (!s.epilogue.ending || !s.afterword.active) return null;
    const request = byId(D.RESIDENT_REQUESTS, s.afterword.active);
    return { title: `${request.from}的委托 · ${request.title}`,
      detail: s.afterword.ready ? "补给已交接。回到居民委托，选择你要留下的回信。" : "完成一次两港补给并领取报告。没有期限，可以继续生产或稍后回来。",
      action: "explore", label: s.afterword.ready ? "留下回信" : s.mission ? "查看补给进度" : "前往两港补给",
      focus: s.afterword.ready ? "resident-requests" : s.mission ? "active-mission" : "mission-supply-run",
      value: s.afterword.ready ? 1 : 0, target: 1, eta: s.afterword.ready ? 0 : s.mission ? Math.max(0, s.mission.end - s.clock) : null };
  }
  function claimMission(s, choiceId, source = "manual") {
    const r = s.result;
    if (!r) return false;
    const mission = byId(D.MISSIONS, r.id);
    if (
      storyMission(mission) &&
      ((mission.rescue
        ? rescueMission(s)
        : mission.council
          ? councilMission(s)
          : campaignMission(s)
      )?.id !== r.id ||
        r.story !== mission.story ||
        !byId(D.EXPEDITION_PLANS, r.plan) ||
        !validRescueSnapshot(s, mission, r))
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
      if (!mission.chapter && !storyMission(mission)) s.run.choices++;
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
    if (mission.council) {
      s.council.completed.push({ id: r.id, plan: r.plan });
      if (!councilMission(s))
        log(
          s,
          "第四章「谁的归航权」完成。两港的分段接续方案已经归档，三支船队仍在安全等待位置。正式救援将在第五章继续。",
        );
    }
    if (mission.rescue) {
      s.rescue.completed.push({ id: r.id, plan: r.plan });
      s.rescue.checks = null;
      if (!rescueMission(s))
        log(
          s,
          "等待名单上的三队全部抵达。请共同核对守灯协议，中央与现场各自承担可确认的责任。",
        );
    }
    if (r.id === "supply-run" && r.succeeded && s.afterword.active)
      s.afterword.ready = true;
    const order = s.management.active;
    if (s.epilogue.ending && order && r.harborOrder === order.serial && (r.id === order.mission || order.plan?.alternates.includes(r.id)) && r.succeeded) {
      order.trips = Math.min(order.tripsRequired, order.trips + 1);
      s.management.stats.voyages = integer(s.management.stats.voyages + 1, 1e9);
    }
    if(r.succeeded) creditCommunityTrip(s,r.id,r.communityOrder);
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
  function validLoadout(s, items) {
    return (
      Array.isArray(items) &&
      items.length <= 2 &&
      new Set(items).size === items.length &&
      items.every((id) => byId(D.MODULES, id) && s.modules[id] > 0)
    );
  }
  function saveLoadout(s, id) {
    if (!byId(D.LOADOUTS, id) || !validLoadout(s, s.equipped)) return false;
    s.loadouts[id] = [...s.equipped];
    return true;
  }
  function applyLoadout(s, id) {
    if (!byId(D.LOADOUTS, id) || !validLoadout(s, s.loadouts[id])) return false;
    s.equipped = [...s.loadouts[id]];
    return true;
  }
  function loadoutPreview(s, id, missionId) {
    if (!byId(D.LOADOUTS, id) || !validLoadout(s, s.loadouts[id])) return null;
    const previewState = { ...s, equipped: [...s.loadouts[id]] };
    return {
      rate: rawRate(previewState),
      mission: missionPreview(previewState, missionId),
      lock: missionLock(previewState, missionId),
    };
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
    if (!gain || s.mission || s.result || s.atlas.active || s.expeditions.active || reviewBusy(s)) return false;
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
  // Read from current state, so a reopened brief never advertises an already claimed item.
  function arrivalTasks(s) {
    const tasks = [];
    if (s.result) tasks.push(s.result.story ? "归航故事等待手动选择" : "归航报告可以立即领取");
    const event = encounterOffer(s);
    if (event) tasks.push(event.choice ? `发现处理剩余 ${Math.max(0, event.readyAt - s.clock)} 秒` : `${event.name}等待手动决定`);
    if (s.afterword.ready) tasks.push("居民补给已交接，可以留下回信");
    const need = harborStatus(s);
    if (need) tasks.push(need.available ? `${need.name}可以立即交付` : `${need.name}：${need.reason}`);
    const projects = D.HARBOR_PROJECTS.filter(p => harborProjectOffer(s, p.id).available);
    if (projects.length) tasks.push(`${projects.length} 项长期工程可手动确认建设`);
    if(s.expeditions.active) tasks.push(voyageGoal(s).title);
    if(reviewBusy(s)) tasks.push(reviewGoal(s).title);
    if(s.atlas.active) tasks.push(s.clock>=s.atlas.active.end ? "星区调查可以归档" : "星区调查仍在航行");
    return tasks;
  }
  function progressSnapshot(s) {
    return {
      dust: s.dust,
      samples: s.samples,
      buildings: { ...s.buildings },
      research: [...s.research],
      modules: { ...s.modules },
      harborWork: s.management.active ? { serial: s.management.active.serial, produced: s.management.active.produced, trips: s.management.active.trips } : null,
      harborDeliveries: s.management.stats.deliveries,
      harborProjects: { ...s.management.projects },
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
      harborChanges: [
        ...(s.management.active && before.harborWork?.serial === s.management.active.serial && (s.management.active.produced > before.harborWork.produced || s.management.active.trips > before.harborWork.trips)
          ? [`居民需求筹备：生产工作量 ${Math.floor(s.management.active.produced)}/${s.management.active.productionGoal}，匹配补给 ${s.management.active.trips}/${s.management.active.tripsRequired}，交付仍待确认`] : []),
        ...(s.management.stats.deliveries > (before.harborDeliveries || 0) ? [`居民需求交付 +${s.management.stats.deliveries - (before.harborDeliveries || 0)}`] : []),
        ...D.HARBOR_PROJECTS.filter(p => (s.management.projects[p.id] || 0) > (before.harborProjects?.[p.id] || 0)).map(p => `${p.name}已完成第${s.management.projects[p.id]}期`),
      ],
      pending: s.result?.id || null,
      story: s.result?.story || null,
    };
  }
  function tick(s, offline, active, activity) {
    // Income uses the previous second's state. Completion and purchases affect the next second.
    const produced = addDust(s, productionRate(s));
    if (s.epilogue.ending && s.management.active) {
      const task = s.management.active;
      task.produced = Math.min(task.productionGoal, bounded(task.produced + produced));
    }
    const community=s.continuation.community.active;
    if(community) community.produced=Math.min(community.productionGoal,bounded(community.produced+produced));
    s.clock++;
    if (offline) s.timing.offlineSeconds++;
    else if (active) s.timing.foregroundSeconds++;
    const returning = Boolean(s.mission && s.clock >= s.mission.end);
    completeMission(s);
    settleEncounter(s);
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
    if (capability(s, "autoDispatch") && s.automation.dispatch && !s.atlas.active && !s.expeditions.active) {
      if (s.result && !s.result.story) {
        const claimed = claimMission(
          s,
          undefined,
          offline ? "offline" : "auto",
        );
        if (activity && claimed) activity.reportsClaimed++;
      }
      const newStory =
        missionOptions(s).some(
          (m) =>
            (m.chapter || storyMission(m)) &&
            !s.lore.some((r) => r.story === m.story),
        ) ||
        (rescueUnlocked(s) && !s.rescue.protocol);
      if (!s.result && !s.mission && !newStory) {
        const candidate =
          missionOptions(s).find(
            (m) =>
              m.id === s.repeatId &&
              m.chance === 1 &&
              !m.chapter &&
              !m.campaign &&
              !m.council &&
              !m.rescue,
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
        (s.run.dust >= 600 || Boolean(s.mission || s.result || s.atlas.active || s.expeditions.active || reviewBusy(s)))) ||
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
    if (m.council && councilMission(s)?.id !== id) {
      const prior = campaignMission(s) || councilMission(s);
      return prior
        ? {
            ...base,
            title: "继续当前两港主线",
            detail: prior.detail,
            focus: `mission-${prior.id}`,
          }
        : null;
    }
    if (m.rescue && rescueMission(s)?.id !== id) {
      const prior = campaignMission(s) || councilMission(s) || rescueMission(s);
      return prior
        ? {
            ...base,
            title: "继续当前接续",
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
    if (m.requiresPortFocus && !s.council.priority) {
      const samples = D.PORT_FOCUSES[0].samples;
      return {
        ...base,
        title: s.samples < samples ? "为港口建设收集样本" : "确定港口建设重点",
        detail: `三种方向均需 ${samples} 份样本，建成后永久保留，所有救援航路都能继续。`,
        label: s.samples < samples ? "前往安全补给" : "比较建设方向",
        focus: s.samples < samples ? "mission-supply-run" : "port-focus",
        value: s.samples,
        target: samples,
        eta: s.samples < samples ? null : 0,
        ...(s.samples < samples ? { etaHint: "两港补给归航后领取样本" } : {}),
      };
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
      if (
        validLoadout(s, s.loadouts.voyage) &&
        s.loadouts.voyage.includes(item.id) &&
        offer.level >= m.equipment.level
      )
        return {
          ...base,
          title: "切换远航准备方案",
          detail: `已保存的远航方案包含 ${offer.level} 级${item.name}，切换后满足本航段装备要求。`,
          label: "切换装备方案",
          focus: "loadouts",
        };
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
    if (m.rescue && !s.rescue.energy)
      return {
        ...base,
        title: "安排救援供电",
        detail: "比较三种方案，轮换照明无需资源。设施、居民与原始记录保留。",
        label: "比较供电方案",
        focus: "rescue-energy",
      };
    if (m.requiresBackupBerth && !s.rescue.berth)
      return {
        ...base,
        title: "为第二队安排备用泊位",
        detail:
          "窗口提前闭合。先停在核验过的泊位，等待下一次确认；离线不会失败。",
        label: "确认等待地址",
        focus: "rescue-berth",
      };
    if (m.rescue && !confirmedRescue(s, id))
      return {
        ...base,
        title: "逐项确认这一队的航段",
        detail: "观测员、船长与目的港各自确认。失联不当作同意。",
        label: "核对三方应答",
        focus: "rescue-checks",
        value:
          s.rescue.checks?.id === id ? s.rescue.checks.confirmed.length : 0,
        target: 3,
      };
    return null;
  }
  function campaignGoal(s) {
    if (!s.chapter.includes("lighthouse") || !reachable(s, "explore"))
      return null;
    const m = campaignMission(s);
    if (!m) return null;
    const prerequisite = missionPrerequisite(s, m.id);
    if (prerequisite && s.mission?.id !== m.id) return prerequisite;
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
  function councilGoal(s) {
    const m = councilMission(s);
    if (!m || !reachable(s, "explore")) return null;
    // A launched mission keeps its snapshot even if the player changes equipment.
    if (s.mission?.id === m.id)
      return {
        title: "等待两港记录归航",
        detail: "当前航程按派遣时的准备结算。报告会保留，离线不会错过故事。",
        action: "explore",
        label: "查看航程",
        focus: "active-mission",
        value: s.clock - s.mission.start,
        target: s.mission.seconds,
        eta: Math.max(0, s.mission.end - s.clock),
      };
    const prerequisite = missionPrerequisite(s, m.id);
    if (prerequisite) return prerequisite;
    return {
      title: `${s.council.preparation?.id === m.id ? "派遣" : "准备"}${m.name}`,
      detail: "比较航前方案，核对两港的接待与交班记录。所有方案都能继续主线。",
      action: "explore",
      label: "安排两港航程",
      focus: `mission-${m.id}`,
      value: s.council.completed.length + (s.council.priority ? 1 : 0),
      target: 4,
      eta: 0,
    };
  }
  function rescueGoal(s) {
    if (!rescueUnlocked(s) || s.rescue.protocol || !reachable(s, "explore"))
      return null;
    if (s.mission)
      return {
        title: "等待当前航程归航",
        detail: "派遣时的准备已锁定。报告会保留，离线不会错过救援。",
        action: "explore",
        label: "查看航程",
        focus: "active-mission",
        value: s.clock - s.mission.start,
        target: s.mission.seconds,
        eta: Math.max(0, s.mission.end - s.clock),
      };
    const m = rescueMission(s);
    if (!m)
      return {
        title: "共同确认新的守灯协议",
        detail:
          "等待名单上的三队已安全抵达。两港与船长共同核对中央、现场和接班人的责任。",
        action: "explore",
        label: "核对守灯协议",
        focus: "keeper-protocol",
        value: 3,
        target: 3,
        eta: 0,
      };
    return (
      missionPrerequisite(s, m.id) || {
        title: `${s.rescue.preparation?.id === m.id ? "派遣" : "准备"}${m.name}`,
        detail: "三方应答已经记录。选择一种航前准备，按核验过的短线逐队接引。",
        action: "explore",
        label: "安排救援航程",
        focus: `mission-${m.id}`,
        value: s.rescue.completed.length,
        target: 3,
        eta: 0,
      }
    );
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
  function portFacilities(s) {
    const focus = byId(D.PORT_FOCUSES, s.council.priority);
    return D.PORT_REGIONS.map(region => {
      const live = region.id === "hub" ? s.starport === 3
        : region.id === "docking" ? s.starport >= 2
        : region.id === "berth" ? s.rescue.berth
        : region.id === "focus" ? Boolean(focus) : s.chapter.includes(region.id);
      const sceneId = region.id === "hub" ? "port-lit"
        : region.id === "docking" ? "port-lit"
        : region.id === "berth" ? "backup-berth"
        : region.id === "focus" ? `port-${focus?.id}-built` : `${region.id}-built`;
      const record = storyScene(s, sceneId);
      const benefits = { hub: "永久保留修复，星港建成后开放远航星图。", docking: "稳定停泊区与归航接驳已恢复。",
        relay: "全舰队产量 ×1.05。", nursery: "每次成功探索多1份样本。", lighthouse: "所有探索航程 ×0.9。",
        berth: "第二队使用已验证的安全等待泊位；等待没有期限。", focus: focus?.detail || "尚未选择港务建设方向。" };
      return { ...clone(region), live, kind: ["docking", "focus"].includes(region.id) ? "extension" : "core",
        name: region.id === "focus" && focus ? focus.name : region.name,
        status: region.id === "hub" ? `修复 ${s.starport}/3` : live ? "已建成" : "待建设",
        benefit: live ? benefits[region.id] : "此区域尚未生效，完成实际工程后才会点亮。",
        record: record ? { id: sceneId, title: record.title } : null,
        target: (region.id === "berth" && s.rescue.completed.length === 3) || (region.id === "focus" && focus) ? "route-archive" : region.target };
    }).concat(!s.epilogue.ending ? [] : D.HARBOR_PROJECTS.map((project, i) => {
      const level = s.management.projects[project.id] || 0;
      return { id: project.id, name: project.name, x: 80 + i * 110, y: 370, shape: "M-14-12h28v24h-28zM-6-4h12v8H-6z" + (level >= 2 ? "M-24-4h10v16h-10zM14-4h10v16H14z" : "") + (level === 3 ? "M-18-16h36M0-26v10M-24 16h48" : ""),
        target: `harbor-project-${project.id}`, live: level > 0, kind: "longterm", level,
        status: `建设 ${level}/3 期`, benefit: level ? project.benefit : "完成居民需求后可分三期建设，无无限等级或永久生产倍率。",
        record: null };
    }));
  }
  function portActivity(s) {
    const firstConvoy = s.campaign.completed.length === D.MISSIONS.filter(m => m.campaign).length;
    return { firstConvoy, rescued: s.rescue.completed.length,
      residents: firstConvoy || s.rescue.completed.length > 0,
      transport: s.epilogue.ending === "voyage" ? "两处地址保持补给联络" : s.epilogue.ending ? "居民按共同值班表接待来船" : firstConvoy ? "第一支船队参与两港交接" : "等待实际船队抵达" };
  }
  function onboarding(s) {
    if (s.rebirths > 0 || s.timing?.events.prestige) return null;
    const steps = [s.lastScanClock >= 0 || s.dust > 0 || s.buildings.drone > 0,
      s.buildings.drone > 0, s.run.routeChosen, s.discoveries > 0 || s.lore.length > 0];
    return { completed: steps.filter(Boolean).length, total: 5,
      feedback: !steps[0] ? "扫描信标开始回收" : !steps[1] ? "扫描已收到 · 下一步建造无人机" : !steps[2] ? "无人机已生产 · 下一步选择航线" : !steps[3] ? "航线已确认 · 扩建并完成首次探索" : "首次归航已记录 · 积累能量，准备首次跃迁" };
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
    if (reviewBusy(s) && !s.encounters.pending) return reviewGoal(s);
    if (!s.buildings.drone)
      return {
        title: "启动第一艘拾荒无人机",
        detail: `收集 ${buildingCost(s, "drone")} 星尘，建造无人机，让航站开始自动运转。`,
        action: s.dust >= buildingCost(s, "drone") ? "fleet" : "home",
        label: s.dust >= buildingCost(s, "drone") ? "前往舰队" : "扫描信标积累材料",
        focus: s.dust >= buildingCost(s, "drone") ? "building-drone" : "scan-control",
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
        focus: "route-choices",
        value: 0,
        target: 1,
        eta: 0,
      };
    const chapter = chapterGoal(s);
    if (chapter) return chapter;
    const campaign = campaignGoal(s);
    if (campaign) return campaign;
    const council = councilGoal(s);
    if (council) return council;
    const rescue = rescueGoal(s);
    if (rescue) return rescue;
    const epilogue = epilogueGoal(s);
    if (epilogue) return epilogue;
    const resident = residentGoal(s);
    if (resident) return resident;
    if (s.encounters.pending && !s.mission) {
      const event = encounterOffer(s);
      return { title: event.name, detail: event.choice ? "回收已安排，生产继续。完成后写入航行记录。" : "有一份额外发现等待安排；普通探索收益已保留，没有选择期限。",
        action: "explore", label: "查看航行发现", focus: "encounter-panel", value: event.choice ? 1 : 0, target: 1,
        eta: event.choice ? Math.max(0, event.readyAt - s.clock) : 0 };
    }

    const voyage = voyageGoal(s);
    if(voyage) return voyage;
    const survey = surveyGoal(s);
    if (survey) return survey;
    const community=communityGoal(s);if(community) return community;
    const readyProject = D.HARBOR_PROJECTS.find(p => harborProjectOffer(s, p.id).available);
    const harbor = harborGoal(s);
    if (harborStatus(s)?.available) return harbor;
    if (readyProject) return { title: `推进${readyProject.name}`, detail: harborProjectOffer(s, readyProject.id).benefit,
      action: "explore", label: "查看工程条款", focus: `harbor-project-${readyProject.id}`, value: 1, target: 1, eta: 0 };
    if (harbor) return harbor;

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
        focus: "mission-wreck",
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
        focus: "active-mission",
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
          focus: "port-panel",
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
      .filter((id) => byId(D.MODULES, id) && s.modules[id] > 0)
      .slice(0, 2);
    for (const loadout of D.LOADOUTS)
      if (validLoadout(s, raw.loadouts?.[loadout.id]))
        s.loadouts[loadout.id] = [...raw.loadouts[loadout.id]];
    s.lore = (Array.isArray(raw.lore) ? raw.lore : [])
      .filter(
        (r) =>
          typeof r?.story === "string" && Object.hasOwn(D.STORIES, r.story) &&
          byId(D.STORIES[r.story].choices, r.choice),
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
    // Fourth-chapter records are independent of the original three handoffs.
    for (const m of D.COUNCIL_MISSIONS) {
      const record = raw.council?.completed?.[s.council.completed.length];
      if (
        campaignMission(s) ||
        !s.chapter.includes("lighthouse") ||
        record?.id !== m.id ||
        !byId(D.EXPEDITION_PLANS, record.plan) ||
        !s.lore.some((r) => r.story === m.story) ||
        (m.requiresPortFocus && !s.council.priority)
      )
        break;
      s.council.completed.push({ id: m.id, plan: record.plan });
      if (
        m.id === "port-council" &&
        byId(D.PORT_FOCUSES, raw.council?.priority)
      )
        s.council.priority = raw.council.priority;
    }
    s.lore = s.lore.filter((r) => {
      const m = D.COUNCIL_MISSIONS.find((item) => item.story === r.story);
      return !m || s.council.completed.some((record) => record.id === m.id);
    });
    const councilPreparation = raw.council?.preparation;
    if (
      councilPreparation?.id === councilMission(s)?.id &&
      byId(D.EXPEDITION_PLANS, councilPreparation?.plan) &&
      (!byId(D.MISSIONS, councilPreparation.id).requiresPortFocus ||
        s.council.priority)
    )
      s.council.preparation = {
        id: councilPreparation.id,
        plan: councilPreparation.plan,
      };
    // Optional fifth-chapter progress is a verified prefix, never a replacement for older chapters.
    if (rescueUnlocked(s) && byId(D.RESCUE_ENERGY, raw.rescue?.energy)) {
      s.rescue.energy = raw.rescue.energy;
      for (const m of D.RESCUE_MISSIONS) {
        const record = raw.rescue?.completed?.[s.rescue.completed.length];
        if (
          record?.id !== m.id ||
          !byId(D.EXPEDITION_PLANS, record.plan) ||
          !s.lore.some((r) => r.story === m.story) ||
          (m.requiresBackupBerth && !s.rescue.berth)
        )
          break;
        s.rescue.completed.push({ id: m.id, plan: record.plan });
        if (m.id === "convoy-relay" && raw.rescue?.berth === true)
          s.rescue.berth = true;
      }
      const m = rescueMission(s),
        checks = raw.rescue?.checks;
      if (
        m &&
        checks?.id === m.id &&
        Array.isArray(checks.confirmed) &&
        (!m.requiresBackupBerth || s.rescue.berth)
      )
        s.rescue.checks = {
          id: m.id,
          confirmed: [...new Set(checks.confirmed)].filter((id) =>
            byId(D.RESCUE_CONFIRMATIONS, id),
          ),
        };
      if (
        m &&
        raw.rescue?.preparation?.id === m.id &&
        confirmedRescue(s, m.id) &&
        byId(D.EXPEDITION_PLANS, raw.rescue.preparation.plan)
      )
        s.rescue.preparation = { id: m.id, plan: raw.rescue.preparation.plan };
      s.rescue.protocol = !m && raw.rescue?.protocol === true;
    }
    s.lore = s.lore.filter((r) => {
      const m = D.RESCUE_MISSIONS.find((item) => item.story === r.story);
      return !m || s.rescue.completed.some((record) => record.id === m.id);
    });
    // An optional continuation only: old saves retain every existing field and reward.
    if (epilogueUnlocked(s)) {
      s.epilogue.confirmed = [
        ...new Set(
          Array.isArray(raw.epilogue?.confirmed) ? raw.epilogue.confirmed : [],
        ),
      ].filter((id) => byId(D.EPILOGUE_HANDOFFS, id));
      if (
        D.EPILOGUE_HANDOFFS.every((h) => s.epilogue.confirmed.includes(h.id)) &&
        byId(D.ENDINGS, raw.epilogue?.ending)
      )
        s.epilogue.ending = raw.epilogue.ending;
    }
    if (s.epilogue.ending) {
      const records = Array.isArray(raw.afterword?.completed) ? raw.afterword.completed : [];
      for (const request of D.RESIDENT_REQUESTS) {
        const record = records.find((r) => r?.id === request.id && request.replies.some((reply) => reply.id === r.reply));
        if (record) s.afterword.completed.push({ id: request.id, reply: record.reply });
      }
      const active = byId(D.RESIDENT_REQUESTS, raw.afterword?.active);
      if (active && !s.afterword.completed.some((r) => r.id === active.id)) {
        s.afterword.active = active.id;
        s.afterword.ready = raw.afterword.ready === true;
      }
    }
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
        m.id === raw.repeatId &&
        m.chance === 1 &&
        !m.chapter &&
        !m.campaign &&
        !m.council &&
        !m.rescue,
    )
      ? raw.repeatId
      : "belt";
    s.beacon = {
      nextAt: bounded(raw.beacon?.nextAt || s.clock + 45),
      expiresAt: Math.min(s.clock + 15, bounded(raw.beacon?.expiresAt)),
    };
    s.burstUntil = Math.min(s.clock + 20, bounded(raw.burstUntil));
    s.lastScanClock = Math.min(s.clock, Number(raw.lastScanClock) || 0);
    const harbor = raw.management;
    if (s.epilogue.ending && harbor && typeof harbor === "object") {
      const h = s.management;
      if (byId(D.HARBOR_FOCUSES, harbor.focus)) h.focus = harbor.focus;
      h.cycle = integer(harbor.cycle, 1e9);
      h.stats.deliveries = h.cycle;
      h.stats.voyages = integer(harbor.stats?.voyages, 1e9);
      h.stats.dustSpent = bounded(harbor.stats?.dustSpent);
      h.stats.samplesSpent = bounded(harbor.stats?.samplesSpent);
      for (const need of D.HARBOR_NEEDS) if (harbor.counts?.[need.id] > 0) h.counts[need.id] = integer(harbor.counts[need.id], h.cycle);
      for (const project of D.HARBOR_PROJECTS) {
        const level = integer(harbor.projects?.[project.id], D.HARBOR_STAGE_DELIVERIES.filter(n => h.cycle >= n).length);
        if (level && h.counts[project.need]) h.projects[project.id] = level;
      }
      const records = Array.isArray(harbor.history) ? harbor.history : [], seen = new Set();
      h.history = records.filter(r => {
        if (!byId(D.HARBOR_NEEDS, r?.id) || !byId(D.HARBOR_FOCUSES, r.focus) || !Number.isInteger(r.serial) || r.serial < 1 || r.serial > h.cycle || seen.has(r.serial)) return false;
        seen.add(r.serial); return true;
      }).slice(0, 24).map(r => ({ serial: r.serial, id: r.id, focus: r.focus, clock: Math.min(s.clock, bounded(r.clock)) }));
      h.collections = [...new Set(Array.isArray(harbor.collections) ? harbor.collections : [])].filter(id =>
        D.HARBOR_NEEDS.some(n => `need-${n.id}` === id && h.counts[n.id]) || D.HARBOR_PROJECTS.some(p => `project-${p.id}` === id && h.projects[p.id] === 3));
      const a = harbor.active, def = byId(D.HARBOR_NEEDS, a?.id);
      if (def && a.serial === h.cycle + 1 && a.serial <= 1e9 && byId(D.HARBOR_FOCUSES, a.focus) && a.mission === def.mission &&
        Number.isFinite(a.dustCost) && a.dustCost >= def.dust * .4 && a.dustCost <= def.dust * 2 &&
        Number.isInteger(a.samplesCost) && a.samplesCost >= 1 && a.samplesCost <= def.samples + 5 &&
        Number.isFinite(a.productionGoal) && a.productionGoal >= 600 && a.productionGoal <= 250000 &&
        (a.workSeconds === undefined || (Number.isFinite(a.workSeconds) && a.workSeconds >= 0 && a.workSeconds <= 500)) &&
        Number.isInteger(a.tripsRequired) && a.tripsRequired >= 1 && a.tripsRequired <= 2 &&
        Number.isFinite(a.acceptedClock) && a.acceptedClock >= 0 && a.acceptedClock <= s.clock)
        h.active = { id: a.id, serial: a.serial, focus: a.focus, acceptedClock: a.acceptedClock, dustCost: a.dustCost, samplesCost: a.samplesCost,
          workSeconds: a.workSeconds ?? 0, productionGoal: a.productionGoal, produced: bounded(a.produced, a.productionGoal), mission: a.mission, tripsRequired: a.tripsRequired, trips: integer(a.trips, a.tripsRequired) };
    }
    if(s.management.active && raw.management.active.plan) {
      const t=s.management.active, p=raw.management.active.plan;
      if(p.mode===t.focus && Number.isFinite(p.credit) && p.credit>=0 && p.credit<=t.productionGoal*.5 &&
        Number.isFinite(p.packedDust) && p.packedDust>=0 && p.packedDust<=t.dustCost && Number.isInteger(p.packedSamples) && p.packedSamples>=0 && p.packedSamples<=t.samplesCost &&
        Number.isFinite(p.careFactor) && p.careFactor>=.35 && p.careFactor<=.6 && Number.isFinite(p.workshopCap) && p.workshopCap>=.35 && p.workshopCap<=.5 &&
        Array.isArray(p.alternates) && JSON.stringify(p.alternates)===JSON.stringify(p.mode==='exploration'?['belt','supply-run']:[]) &&
        (p.mode==='reception' || (!p.packedDust && !p.packedSamples)) && (p.mode==='production' || !p.credit))
        t.plan={mode:p.mode,credit:p.credit,packedDust:p.packedDust,packedSamples:p.packedSamples,alternates:[...p.alternates],careFactor:p.careFactor,workshopCap:p.workshopCap};
      else s.management.active=null;
    }
    const encounters = raw.encounters;
    if (encounters && typeof encounters === "object") {
      s.encounters.serial = integer(encounters.serial, 1e9);
      s.encounters.settled = integer(encounters.settled, s.encounters.serial);
      s.encounters.nextAt = Math.min(s.clock + 600, bounded(encounters.nextAt));
      s.encounters.rng = Number(encounters.rng) >>> 0 || 1;
      const records = Array.isArray(encounters.history) ? encounters.history : [];
      const seen = new Set();
      s.encounters.history = records.filter(r => {
        const def = byId(D.ENCOUNTERS, r?.id);
        if (!def || !byId(def.choices, r.choice) || !Number.isInteger(r.token) || r.token < 1 || r.token > s.encounters.settled || seen.has(r.token)) return false;
        seen.add(r.token); return true;
      }).slice(0, 32).map(r => ({ token: r.token, id: r.id, choice: r.choice, clock: Math.min(s.clock, bounded(r.clock)) }));
      const catalog = Array.isArray(encounters.catalog) ? encounters.catalog : [];
      s.encounters.catalog = [...new Set([...catalog, ...s.encounters.history.map(r => `${r.id}:${r.choice}`)])].filter(key =>
        D.ENCOUNTERS.some(e => e.choices.some(c => `${e.id}:${c.id}` === key)));
      s.encounters.pending = cleanEncounter(encounters.pending, s);
    }
    const validCampaign = (r) => {
      const m = byId(D.MISSIONS, r?.id);
      return (
        m &&
        (!storyMission(m) ||
          (s.chapter.includes("lighthouse") &&
            (m.rescue
              ? rescueMission(s)
              : m.council
                ? councilMission(s)
                : campaignMission(s)
            )?.id === m.id &&
            (!m.requiresPortFocus || s.council.priority) &&
            r.succeeded === true &&
            byId(D.EXPEDITION_PLANS, r.plan) &&
            validRescueSnapshot(s, m, r)))
      );
    };
    const limits = (def) => ({
      seconds: Math.ceil(
        def.seconds * 1.1 *
          (def.rescue
            ? Math.max(...D.RESCUE_ENERGY.map((e) => e.seconds))
            : 1) *
          (storyMission(def)
            ? Math.max(...D.EXPEDITION_PLANS.map((p) => p.seconds))
            : 1),
      ),
      samples: Math.max(
        4,
        def.samples +
          5 +
          (def.rescue
            ? Math.max(...D.RESCUE_ENERGY.map((e) => e.bonusSamples))
            : 0) +
          (def.council || def.rescue
            ? Math.max(...D.PORT_FOCUSES.map((p) => p.bonusSamples))
            : 0) +
          (storyMission(def)
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
        diversion: bounded(m.diversion, storyMission(def) ? 0.5 : 0.4),
        chance: bounded(m.chance, 1),
        samples: bounded(m.samples, max.samples),
        dust: bounded(m.dust),
        succeeded: m.succeeded === true,
        module: byId(D.MODULES, m.module) ? m.module : null,
        ...(storyMission(def) ? { plan: m.plan } : {}),
        ...(def.rescue
          ? { energy: m.energy, confirmations: [...m.confirmations] }
          : {}),
      };
    }
    if (
      raw.result &&
      validCampaign(raw.result) &&
      (!storyMission(byId(D.MISSIONS, raw.result.id)) ||
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
        ...(storyMission(def) ? { plan: r.plan } : {}),
        ...(def.rescue
          ? { energy: r.energy, confirmations: [...r.confirmations] }
          : {}),
      };
    }
    const order = s.management.active;
    for (const [clean, saved] of [[s.mission, raw.mission], [s.result, raw.result]]) {
      if (clean && order && saved?.harborOrder === order.serial && (clean.id === order.mission || order.plan?.alternates.includes(clean.id)) && (!s.mission || s.mission.start >= order.acceptedClock)) clean.harborOrder = order.serial;
    }
    if (s.mission && !s.encounters.pending) {
      const event = cleanEncounter(raw.mission?.encounter, s);
      if (event && event.mission === s.mission.id && !event.choice) s.mission.encounter = event;
    }
    if (s.mission || s.result) {
      s.campaign.preparation = null;
      s.council.preparation = null;
      s.rescue.preparation = null;
    }
    if (raw.legacyArchive && typeof raw.legacyArchive === "object")
      s.legacyArchive = clone(raw.legacyArchive);
    cleanAtlas(raw.atlas,s);
    cleanExpeditions(raw.expeditions,s);
    s.continuation = cleanContinuation(raw.continuation, s);
    const community=s.continuation.community.active;
    for(const [clean,saved] of [[s.mission,raw.mission],[s.result,raw.result]]) if(clean&&community&&saved?.communityOrder===community.serial&&community.routes.includes(clean.id)&&(!s.mission||s.mission.start>=community.acceptedClock)) clean.communityOrder=community.serial;
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
    arrivalTasks,
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
    missionFit,
    missionPreview,
    storyText,
    storyScene,
    campaignMission,
    councilMission,
    councilGoal,
    rescueUnlocked,
    rescueMission,
    rescueGoal,
    rescueEnergyOffer,
    arrangeRescueEnergy,
    confirmBackupBerth,
    confirmRescue,
    adoptKeeperProtocol,
    epilogueUnlocked,
    confirmEpilogue,
    endingOffer,
    chooseEnding,
    epilogueContext,
    epilogueGoal,
    residentRequests,
    acceptResidentRequest,
    completeResidentRequest,
    residentGoal,
    portFocusOffer,
    buildPortFocus,
    prepareMission,
    campaignGoal,
    missionPrerequisite,
    routeArchive,
    encounterCandidates,
    encounterOffer,
    chooseEncounter,
    startMission,
    claimMission,
    moduleOffer,
    buildModule,
    equip,
    saveLoadout,
    applyLoadout,
    loadoutPreview,
    claimBeacon,
    repairPort,
    projectOffer,
    buildProject,
    chapterGoal,
    prestigeGain,
    prestige,
    reachable,
    nextGoal,
    onboarding,
    portFacilities,
    portActivity,
    communityTerms,communityOffer,acceptCommunity,communityStatus,setCommunityPath,packCommunity,deliverCommunity,communityGoal,
    reviewPreview, startReview, claimReview, reviewGoal, reviewDone, selectVoyageSupport,
    itineraryOffer, saveItinerary, startItinerary, itineraryStatus, pauseItinerary, restoreItineraryEquipment, equipItinerary, stopItinerary, advanceItinerary,
    voyagePreview, voyageReason, startVoyage, dispatchVoyageLeg, claimVoyageLeg, finishVoyage, voyageGoal,
    surveyCount, surveyPreview, setSurveyPriority, startSurvey, claimSurvey, surveyGoal,
    harborSchedule, packHarborNeed, reserveHarborNeed,
    harborTerms,
    harborOffers,
    setHarborFocus,
    acceptHarborNeed,
    harborStatus,
    deliverHarborNeed,
    harborProjectOffer,
    buildHarborProject,
    harborGoal,
    milestone,
  });
});
