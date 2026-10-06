"use strict";
const assert = require("node:assert/strict");
const D = require("../v3/data.js"),
  E = require("../v3/engine.js"),
  S = require("../v3/storage.js");
let checks = 0;
function test(name, run) {
  run();
  checks++;
  console.log(`ok ${checks} - ${name}`);
}
function memory(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
  };
}
function ready() {
  const s = E.createState(1000, 42);
  s.buildings.drone = 10;
  s.run.dust = 10000;
  s.dust = 10000;
  s.run.routeChosen = true;
  return s;
}

test("fresh save has a reachable goal; scans throttle and first drone creates passive income", () => {
  const s = E.createState(0);
  assert.ok(E.reachable(s, E.nextGoal(s).action));
  assert.equal(E.reachable(s, "explore"), false);
  assert.equal(E.reachable(s, "jump"), false);
  for (let t = 0; t < 6; t++) {
    E.advance(s, t * 1000);
    assert.equal(E.scan(s), 2);
    assert.equal(E.scan(s), 0);
  }
  assert.equal(E.buy(s, "drone"), 1);
  const dust = s.dust;
  E.advance(s, s.lastAt + 1000);
  assert.equal(s.dust, dust + 0.8);
});
test("bulk purchase respects funds and capacity; 10/25/50 change production", () => {
  const s = ready();
  s.buildings.drone = 9;
  const before = E.rawRate(s);
  E.buy(s, "drone");
  assert.ok(E.rawRate(s) > before * 2);
  for (const n of [25, 50]) {
    s.buildings.drone = n - 1;
    s.dust = 1e20;
    const before = E.rawRate(s);
    E.buy(s, "drone");
    assert.ok(E.rawRate(s) > before * 2);
  }
  const poor = E.createState(0);
  poor.dust = 12;
  assert.equal(E.buy(poor, "drone", "max"), 1);
  assert.equal(poor.dust, 0);
  s.buildings.drone = 10000;
  assert.equal(E.buy(s, "drone"), 0);
  assert.equal(E.buildingCost(s, "drone"), Infinity);
});
test("route is a single committed choice each run; unreachable goals are never emitted", () => {
  const s = ready();
  s.run.routeChosen = false;
  assert.equal(E.chooseRoute(s, "explore"), true);
  assert.equal(E.chooseRoute(s, "industry"), false);
  for (const dust of [
    0,
    599,
    600,
    10000,
    D.PRESTIGE_DUST * 0.3,
    D.PRESTIGE_DUST,
  ]) {
    s.run.dust = dust;
    assert.ok(E.reachable(s, E.nextGoal(s).action));
  }
});
test("automation gates prevent early unlocks, obey reserve and buy at most once per second", () => {
  const s = ready();
  E.configure(s, {
    enabled: true,
    reserve: 99999,
    policy: "advanced",
    research: true,
    dispatch: true,
  });
  assert.deepEqual(s.automation, {
    enabled: false,
    reserve: 0,
    policy: "balanced",
    research: false,
    dispatch: false,
  });
  const before = { ...s.buildings };
  E.advance(s, s.lastAt + 1000);
  assert.deepEqual(s.buildings, before);
  s.rebirths = 2;
  E.configure(s, { enabled: true, reserve: 10000 });
  E.advance(s, s.lastAt + 1000);
  assert.deepEqual(s.buildings, before);
  assert.ok(s.dust >= 10000);
  s.dust = 1e8;
  E.advance(s, s.lastAt + 5000);
  assert.equal(
    Object.values(s.buildings).reduce((a, b) => a + b, 0) -
      Object.values(before).reduce((a, b) => a + b, 0),
    5,
  );
  assert.ok(s.dust >= s.automation.reserve);
});
test("fractional time, offline automation and mission completion are chunk invariant", () => {
  const s = ready();
  s.rebirths = 4;
  E.configure(s, {
    enabled: true,
    research: true,
    dispatch: true,
    reserve: 100,
  });
  E.startMission(s, "wreck");
  const a = structuredClone(s),
    b = structuredClone(s);
  E.advance(a, a.lastAt + 600650, { offline: true });
  for (let i = 0; i < 600; i++)
    E.advance(b, b.lastAt + 1000, { offline: true });
  E.advance(b, b.lastAt + 650, { offline: true });
  assert.deepEqual(a, b);
  assert.equal(a.result.story, "hospital");
  assert.equal(a.mission, null, "auto dispatch must wait for a story choice");
});
test("offline cap and reversed system clock never grant extra income", () => {
  const a = ready(),
    b = structuredClone(a);
  const report = E.advance(a, a.lastAt + 48 * 3600000, { offline: true });
  E.advance(b, b.lastAt + D.OFFLINE_SECONDS * 1000, { offline: true });
  assert.equal(report.seconds, D.OFFLINE_SECONDS);
  assert.equal(report.capped, true);
  assert.equal(a.dust, b.dust);
  const old = structuredClone(a);
  E.advance(a, a.lastAt - 100000);
  assert.deepEqual(a, old);
});
test("mission result survives a save round trip; reward and story choice can only be claimed once", () => {
  const s = ready();
  assert.equal(E.startMission(s, "wreck"), true);
  assert.equal(E.startMission(s, "echo"), false);
  E.advance(s, s.lastAt + 90000, { offline: true });
  const restored = E.sanitize(JSON.parse(JSON.stringify(s)), s.lastAt);
  assert.deepEqual(restored.result, s.result);
  assert.equal(E.claimMission(restored), false);
  assert.equal(E.claimMission(restored, "repair"), true);
  assert.equal(restored.modules.medbay, 1);
  const after = structuredClone(restored);
  assert.equal(E.claimMission(restored, "repair"), false);
  assert.deepEqual(restored, after);
  assert.equal(restored.lore.length, 1);
  assert.equal(restored.run.choices, 1);
});
test("risk outcomes are deterministic across reload and failures have no dust penalty", () => {
  const s = ready();
  E.startMission(s, "echo");
  const restored = E.sanitize(JSON.parse(JSON.stringify(s)), s.lastAt);
  E.advance(s, s.lastAt + 150000);
  E.advance(restored, restored.lastAt + 150000);
  assert.deepEqual(s.result, restored.result);
  s.result.succeeded = false;
  s.result.dust = 0;
  s.result.samples = 1;
  s.result.module = null;
  const dust = s.dust;
  E.claimMission(s);
  assert.equal(s.dust, dust);
  assert.equal(s.samples, 1);
});
test("golden beacon expires, cannot be claimed twice, and recovery route adds a finite burst", () => {
  const s = ready();
  s.run.route = "reclaim";
  E.advance(s, s.lastAt + 45000);
  assert.ok(s.beacon.expiresAt);
  assert.ok(E.claimBeacon(s));
  assert.equal(s.burstUntil, s.clock + 20);
  assert.equal(E.claimBeacon(s), 0);
  const raw = E.rawRate(s);
  assert.equal(E.productionRate(s), raw * 2);
  E.advance(s, s.lastAt + 20000);
  assert.equal(E.productionRate(s), raw);
  s.beacon.expiresAt = s.clock;
  assert.equal(E.claimBeacon(s), 0);
});
test("jump preserves permanent progress and blocks pending exploration", () => {
  const s = ready();
  s.run.dust = D.PRESTIGE_DUST;
  s.modules.medbay = 2;
  s.equipped = ["medbay"];
  s.samples = 7;
  s.lore = [{ story: "hospital", choice: "repair" }];
  s.starport = 1;
  s.research = ["laser"];
  s.clock = 1200;
  E.startMission(s, "belt");
  assert.equal(E.prestige(s), false);
  s.mission = null;
  assert.equal(E.prestige(s), 4);
  assert.equal(s.rebirths, 1);
  assert.equal(s.buildings.drone, 1);
  assert.equal(s.dust, 12);
  assert.deepEqual(s.research, []);
  assert.equal(s.modules.medbay, 2);
  assert.equal(s.samples, 7);
  assert.equal(s.lore.length, 1);
  assert.equal(s.starport, 1);
  assert.equal(s.automation.enabled, true);
  assert.equal(s.run.routeChosen, false);
  assert.equal(s.records[0].seconds, 1200);
});
test("starport spends available cores without removing historical production bonus", () => {
  const s = ready();
  s.cores = s.totalCores = 4;
  s.samples = 4;
  const rate = E.rawRate(s);
  assert.equal(E.repairPort(s), true);
  assert.equal(s.cores, 2);
  assert.equal(s.totalCores, 4);
  assert.equal(E.rawRate(s), rate);
  assert.equal(s.samples, 0);
  assert.equal(E.repairPort(s), false);
  assert.equal(s.starport, 1);
});
test("equipment has two slots and no duplicate stacking", () => {
  const s = ready();
  s.modules = { battery: 1, scanner: 2, nav: 3 };
  assert.ok(E.equip(s, "battery"));
  assert.ok(E.equip(s, "scanner"));
  assert.equal(E.equip(s, "nav"), false);
  assert.ok(E.equip(s, "battery"));
  assert.ok(E.equip(s, "nav"));
  assert.equal(s.equipped.length, 2);
});
test("legacy migration preserves every field, original text and live v2 save", () => {
  const old = {
    version: 31,
    dust: 123456.7,
    runDust: 999999,
    lifetimeDust: 9e8,
    cores: 8,
    totalCores: 40,
    rebirths: 2,
    buildings: { drone: 25, sail: 14, lab: 99, dyson: 3 },
    upgrades: ["gloves", "unrecognized-research"],
    expedition: { active: { sector: 4, finishesAt: 123 } },
    season: { unclaimed: ["reward-7"] },
    starfall: { coins: 22 },
  };
  const text = JSON.stringify(old, null, 2);
  const storage = memory({ [S.LEGACY_KEY]: text });
  const migrated = S.restore(storage, text, 1000);
  assert.deepEqual(migrated.legacyArchive, old);
  assert.equal(migrated.dust, old.dust);
  assert.equal(migrated.cores, old.cores);
  assert.equal(migrated.buildings.drone, 25);
  assert.equal(storage.getItem(S.LEGACY_KEY), text);
  assert.equal(storage.getItem(S.LEGACY_BACKUP), text);
  assert.deepEqual(E.sanitize(migrated).legacyArchive, old);
});
test("corrupt and future records stay intact; failed backup aborts restore", () => {
  for (const text of [
    "{broken",
    JSON.stringify({ schema: "salvage-orbit", version: 99 }),
  ]) {
    const store = memory({ [S.KEY]: text });
    assert.ok(S.load(store).error);
    assert.equal(store.getItem(S.KEY), text);
  }
  const original = JSON.stringify(ready()),
    store = memory({ [S.KEY]: original });
  store.setItem = () => {
    throw new Error("QuotaExceededError");
  };
  assert.throws(
    () => S.restore(store, JSON.stringify(E.createState(0))),
    /Quota/,
  );
  assert.equal(store.getItem(S.KEY), original);
});
test("untrusted save text cannot become executable journal markup or unlock unknown systems", () => {
  const raw = ready();
  raw.journal = [{ text: '<img src=x onerror="alert(1)">', clock: 0 }];
  raw.run.route = "unknown";
  raw.research = ["free-nuclear-power"];
  raw.modules = { unknown: 99999 };
  raw.equipped = ["unknown"];
  const s = E.sanitize(raw);
  assert.equal(s.run.route, "industry");
  assert.deepEqual(s.research, []);
  assert.deepEqual(s.equipped, []);
  assert.equal(E.reachable(s, "unknown"), false);
  // Rendering escapes journal text; browser coverage verifies this with a malicious imported journal.
  assert.equal(s.journal[0].text, raw.journal[0].text);
});
test("every story choice permits later crafting and upgrading without changing the choice or repeating rewards", () => {
  for (const [story, id] of [
    ["hospital", "medbay"],
    ["garden", "solar"],
  ]) {
    for (const choice of D.STORIES[story].choices) {
      const s = ready();
      s.samples = 50;
      assert.equal(E.moduleOffer(s, id).unlocked, false);
      assert.equal(E.buildModule(s, id), false);
      s.result = {
        id: story === "hospital" ? "wreck" : "garden",
        story,
        succeeded: true,
        dust: 50,
        samples: 2,
        module: null,
      };
      assert.ok(E.claimMission(s, choice.id));
      const dust = s.dust,
        lore = structuredClone(s.lore),
        choices = s.run.choices;
      const initialSamples = s.samples,
        initialLevel = s.modules[id] || 0;
      while ((s.modules[id] || 0) < D.MODULE_MAX_LEVEL)
        assert.ok(E.buildModule(s, id));
      assert.equal(
        initialSamples - s.samples,
        D.MODULE_UPGRADE_SAMPLES.reduce((a, b) => a + b, 0) +
          (initialLevel ? 0 : D.MODULES.find((m) => m.id === id).samples),
      );
      assert.equal(E.buildModule(s, id), false);
      assert.equal(E.claimMission(s, choice.id), false);
      assert.deepEqual(s.lore, lore);
      assert.equal(s.run.choices, choices);
      assert.equal(s.dust, dust);
      assert.equal(s.modules[id], 3);
    }
  }
});
test("workshop costs come from real safe exploration, all five modules reach level three, and full slots are preserved", () => {
  const s = ready();
  s.run.route = "explore";
  assert.equal(E.buildModule(s, "battery"), false);
  assert.ok(E.research(s, "navigation"));
  function voyage(id, choice) {
    assert.ok(E.startMission(s, id));
    E.advance(s, s.lastAt + (s.mission.end - s.clock) * 1000, {
      offline: true,
    });
    assert.ok(E.claimMission(s, choice));
  }
  voyage("wreck", "preserve");
  s.cores = s.totalCores = 4;
  assert.ok(E.repairPort(s));
  voyage("garden", "scrap");
  for (const m of D.MODULES) {
    while ((s.modules[m.id] || 0) < 3) {
      const offer = E.moduleOffer(s, m.id);
      while (s.samples < offer.samples) voyage("belt");
      const slots = [...s.equipped];
      assert.ok(E.buildModule(s, m.id));
      if (slots.length === 2) assert.deepEqual(s.equipped, slots);
    }
  }
  assert.equal(s.equipped.length, 2);
  assert.deepEqual(s.lore, [
    { story: "hospital", choice: "preserve" },
    { story: "garden", choice: "scrap" },
  ]);
  const before = structuredClone(s);
  assert.equal(E.buildModule(s, "battery"), false);
  assert.equal(E.buildModule(s, "unknown"), false);
  assert.deepEqual(s, before);
  s.samples = 0;
  s.modules.nav = 1;
  const poor = structuredClone(s);
  assert.equal(E.buildModule(s, "nav"), false);
  assert.deepEqual(s, poor);
});
test("purchase previews match actual milestone, research, core, route and equipped effects without mutating state", () => {
  for (const route of D.ROUTES) {
    for (const id of ["drone", "sail"]) {
      const s = ready();
      s.run.route = route.id;
      s.buildings = { drone: 9, sail: 24, forge: 2, relay: 0 };
      s.totalCores = 16;
      s.research = ["panels", "network", "compact"];
      s.modules = { medbay: 3, solar: 2 };
      s.equipped = ["medbay", "solar"];
      assert.ok(E.startMission(s, "belt"));
      s.burstUntil = s.clock + 20;
      const before = structuredClone(s),
        rate = E.productionRate(s);
      const p = E.purchasePreview(s, id, 10);
      assert.deepEqual(s, before, "preview cannot change progress or RNG");
      assert.equal(E.buy(s, id, 10), p.count);
      assert.ok(Math.abs(E.productionRate(s) - rate - p.delta) < 1e-8);
      assert.equal(before.dust - s.dust, p.cost);
      assert.equal(
        p.payback,
        Math.ceil(p.cost / (p.delta / 2)),
        "burst is excluded from payback",
      );
    }
  }
  const poor = E.createState(0);
  poor.dust = 12;
  assert.equal(E.purchasePreview(poor, "drone", "max").count, 1);
  assert.equal(E.purchasePreview(poor, "sail").count, 0);
  poor.buildings.drone = 10000;
  assert.equal(E.purchasePreview(poor, "drone").count, 0);
});
test("income ETA accounts for burst expiry and mission diversion ending and stays finite or unknown", () => {
  const s = E.createState(0);
  assert.equal(E.incomeEta(s, 12), null);
  assert.equal(E.incomeEta(s, 0), 0);
  s.buildings.drone = 1;
  s.run.dust = 600;
  s.run.route = "explore";
  assert.ok(E.startMission(s, "belt"));
  s.burstUntil = 20;
  const source = structuredClone(s);
  for (const missing of [10, 50, 100]) {
    const predicted = E.incomeEta(s, missing);
    const actual = structuredClone(s),
      initial = actual.dust;
    while (actual.dust - initial < missing)
      E.advance(actual, actual.lastAt + 1000, { offline: true });
    assert.equal(predicted, actual.clock);
  }
  assert.deepEqual(s, source);
  assert.equal(E.incomeEta(s, Infinity), null);
});
test("unclaimed reports outrank construction, routes and jumps, and every next goal remains reachable", () => {
  for (const drone of [0, 1, 10, 50]) {
    for (const dust of [0, 599, 600, D.PRESTIGE_DUST]) {
      const s = ready();
      s.buildings.drone = drone;
      s.run.dust = dust;
      s.run.routeChosen = false;
      s.result = {
        id: "wreck",
        story: "hospital",
        succeeded: true,
        dust: 10,
        samples: 2,
        module: null,
      };
      const goal = E.nextGoal(s);
      assert.equal(goal.action, "explore");
      assert.equal(goal.focus, "report");
      assert.equal(goal.eta, 0);
      assert.ok(E.reachable(s, goal.action));
      s.result = null;
      assert.ok(E.reachable(s, E.nextGoal(s).action));
    }
  }
  const s = ready();
  assert.equal(E.nextGoal(s).focus, "research-laser");
  s.research = ["laser"];
  assert.equal(E.nextGoal(s).action, "explore");
  s.lore = [{ story: "hospital", choice: "preserve" }];
  s.research = D.RESEARCH.map((r) => r.id);
  assert.match(E.nextGoal(s).focus, /^building-/);
  assert.ok(Number.isFinite(E.nextGoal(s).eta));
});
test("local milestone timings distinguish visible and offline seconds, record once and survive a jump and reload", () => {
  const s = E.createState(0);
  E.advance(s, 5000, { active: true });
  s.dust = 12;
  assert.equal(E.buy(s, "drone"), 1);
  const firstDrone = structuredClone(s.timing.events.drone);
  assert.deepEqual(firstDrone, {
    elapsedSeconds: 5,
    foregroundSeconds: 5,
    offlineSeconds: 0,
    run: 1,
    source: "manual",
  });
  E.advance(s, 105000, { offline: true });
  s.run.dust = 600;
  assert.ok(E.research(s, "laser"));
  assert.equal(s.timing.events.research.elapsedSeconds, 105);
  assert.equal(s.timing.events.research.foregroundSeconds, 5);
  assert.equal(s.timing.events.research.offlineSeconds, 100);
  s.dust = 100;
  E.buy(s, "drone");
  assert.deepEqual(s.timing.events.drone, firstDrone);
  E.startMission(s, "wreck");
  E.advance(s, s.lastAt + 90000, { active: true });
  E.claimMission(s, "preserve");
  s.run.dust = D.PRESTIGE_DUST;
  assert.equal(E.prestige(s), 4);
  const timing = structuredClone(s.timing);
  assert.equal(timing.events.report.foregroundSeconds, 95);
  assert.equal(timing.events.prestige.run, 1);
  assert.deepEqual(E.sanitize(s, s.lastAt).timing, timing);
  E.advance(s, s.lastAt + 1000, { active: true });
  E.buy(s, "drone");
  assert.deepEqual(s.timing.events.drone, firstDrone);
  const auto = ready();
  auto.rebirths = 4;
  E.configure(auto, { enabled: true, research: true, dispatch: true });
  E.startMission(auto, "belt");
  E.advance(auto, auto.lastAt + 120000, { offline: true });
  assert.equal(auto.timing.events.drone.source, "offline");
  assert.equal(auto.timing.events.research.source, "offline");
  assert.equal(auto.timing.events.report.source, "offline");
  assert.equal(auto.timing.foregroundSeconds, 0);
});
test("v3.0 saves retain inventory, pending missions and archives; missing timing data starts now without fabricated events", () => {
  const raw = ready();
  delete raw.timing;
  raw.modules = { medbay: 2, solar: 1 };
  raw.equipped = ["medbay", "solar"];
  raw.lore = [
    { story: "hospital", choice: "preserve" },
    { story: "garden", choice: "scrap" },
  ];
  raw.samples = 17;
  raw.clock = 123;
  raw.legacyArchive = {
    buildings: { lab: 20 },
    expedition: { active: true },
    season: { unclaimed: [7] },
  };
  E.startMission(raw, "belt");
  const restored = E.sanitize(raw, raw.lastAt);
  for (const key of [
    "dust",
    "cores",
    "samples",
    "modules",
    "equipped",
    "lore",
    "buildings",
    "research",
    "mission",
    "legacyArchive",
  ])
    assert.deepEqual(restored[key], raw[key], key);
  assert.equal(restored.timing.sinceClock, 123);
  assert.equal(restored.timing.late, true);
  assert.deepEqual(restored.timing.events, {});
  assert.ok(E.moduleOffer(restored, "medbay").available);
  restored.timing = {
    sinceClock: -100,
    foregroundSeconds: Infinity,
    offlineSeconds: 999,
    events: {
      drone: {
        elapsedSeconds: 999,
        foregroundSeconds: 999,
        offlineSeconds: 999,
        run: -1,
        source: "manual",
      },
      research: { source: '<img src=x onerror="alert(1)">' },
      unknown: { source: "manual" },
    },
  };
  const cleaned = E.sanitize(restored, restored.lastAt).timing;
  assert.equal(
    cleaned.foregroundSeconds + cleaned.offlineSeconds <= restored.clock,
    true,
  );
  assert.equal(cleaned.events.drone.elapsedSeconds, restored.clock);
  assert.equal(cleaned.events.drone.offlineSeconds, 0);
  assert.equal(cleaned.events.research, undefined);
  assert.equal(cleaned.events.unknown, undefined);
});
test("return briefing is observational: actual purchases, research, income and net balance match the unchanged simulation", () => {
  const s = ready();
  s.rebirths = 4;
  E.configure(s, { enabled: true, research: true, dispatch: true });
  E.startMission(s, "belt");
  const before = E.progressSnapshot(s),
    plain = structuredClone(s);
  const report = E.advance(s, s.lastAt + 600000, {
    offline: true,
    report: true,
  });
  E.advance(plain, plain.lastAt + 600000, { offline: true });
  assert.deepEqual(s, plain);
  assert.ok(report.spentDust > 0);
  assert.ok(report.buildings.length > 0);
  assert.deepEqual(report.research, s.research);
  assert.equal(report.netDust, s.dust - before.dust);
  assert.ok(Math.abs(report.dust - report.spentDust - report.netDust) < 1e-7);
  assert.equal(report.samples, s.samples - before.samples);
  assert.equal(report.missionsCompleted, report.reportsClaimed);
  assert.ok(report.reportsClaimed >= 4);
  assert.equal(report.pending, null);
});
test("return briefing leaves a story pending, counts failed voyages, and never claims a story reward", () => {
  const s = ready();
  s.rebirths = 4;
  E.configure(s, { dispatch: true });
  E.startMission(s, "wreck");
  const report = E.advance(s, s.lastAt + 600000, {
    offline: true,
    report: true,
  });
  assert.equal(report.missionsCompleted, 1);
  assert.equal(report.reportsClaimed, 0);
  assert.equal(report.pending, "wreck");
  assert.equal(report.story, "hospital");
  assert.deepEqual(s.lore, []);
  assert.equal(s.samples, 0);
  const failed = ready();
  E.startMission(failed, "echo");
  failed.mission.succeeded = false;
  const failure = E.advance(failed, failed.lastAt + 150000, {
    offline: true,
    report: true,
  });
  assert.equal(failure.missionsCompleted, 1);
  assert.equal(failure.reportsClaimed, 0);
  assert.equal(failure.samples, 0);
});
test("background briefing aggregates several ticks and still respects the eight-hour cap", () => {
  const a = ready(),
    b = structuredClone(a),
    before = E.progressSnapshot(a);
  const totals = {
    seconds: 0,
    dust: 0,
    spentDust: 0,
    missionsCompleted: 0,
    reportsClaimed: 0,
    capped: false,
  };
  for (let i = 0; i < 120; i++) {
    const report = E.advance(a, a.lastAt + 1000, {
      offline: true,
      report: true,
    });
    for (const key of Object.keys(totals))
      if (key !== "capped") totals[key] += report[key];
  }
  const report = E.advance(b, b.lastAt + 120000, {
    offline: true,
    report: true,
  });
  assert.deepEqual(E.returnReport(a, before, totals), report);
  const capped = E.advance(a, a.lastAt + 48 * 3600000, {
    offline: true,
    report: true,
  });
  assert.equal(capped.seconds, D.OFFLINE_SECONDS);
  assert.equal(capped.capped, true);
});
function chapterReady() {
  const s = ready();
  s.starport = 3;
  s.rebirths = 4;
  s.cores = 12;
  s.totalCores = 28;
  s.samples = 60;
  s.modules = { nav: 2, scanner: 2 };
  s.equipped = ["nav", "scanner"];
  s.research = ["navigation"];
  s.lore = [
    { story: "hospital", choice: "preserve" },
    { story: "garden", choice: "preserve" },
  ];
  s.run.choices = 2;
  return s;
}
test("chapter two gates each sector and construction in sequence, including actually equipped level-two gear", () => {
  const s = ready();
  assert.ok(E.missionLock(s, "message"));
  assert.equal(E.startMission(s, "message"), false);
  assert.equal(E.buildProject(s, "relay"), false);
  s.starport = 3;
  assert.match(E.missionLock(s, "message"), /最后一盏手术灯/);
  s.lore = [{ story: "hospital", choice: "scrap" }];
  assert.equal(E.missionLock(s, "message"), "");
  assert.match(E.missionLock(s, "seedbank"), /共鸣中继/);
  s.lore.push({ story: "relay", choice: "public" });
  s.cores = 2;
  s.samples = 10;
  assert.ok(E.buildProject(s, "relay"));
  assert.match(E.missionLock(s, "seedbank"), /等不到的日出/);
  s.lore.push({ story: "garden", choice: "scrap" });
  s.modules.nav = 2;
  assert.match(E.missionLock(s, "seedbank"), /装备 2 级/);
  assert.ok(E.equip(s, "nav"));
  assert.equal(E.missionLock(s, "seedbank"), "");
  assert.equal(E.buildProject(s, "nursery"), false);
  assert.equal(E.startMission(s, "horizon"), false);
  const unchanged = structuredClone(s);
  assert.equal(E.buildProject(s, "relay"), false);
  assert.equal(E.buildProject(s, "unknown"), false);
  assert.deepEqual(s, unchanged);
});
test("all nine old-choice combinations continue through three new stories without overwriting choices or automatic decisions", () => {
  for (const hospital of D.STORIES.hospital.choices)
    for (const garden of D.STORIES.garden.choices) {
      const s = chapterReady();
      s.lore[0].choice = hospital.id;
      s.lore[1].choice = garden.id;
      const original = structuredClone(s.lore);
      assert.match(
        E.storyText(s, "relay"),
        new RegExp(D.STORIES.relay.continuity.choices[hospital.id]),
      );
      assert.match(
        E.storyText(s, "nursery"),
        new RegExp(D.STORIES.nursery.continuity.choices[garden.id]),
      );
      for (const project of D.PROJECTS) {
        const before = structuredClone(s);
        assert.ok(E.startMission(s, project.mission));
        const saved = E.sanitize(s, s.lastAt);
        assert.deepEqual(
          saved.mission,
          s.mission,
          "long voyages must survive a reload",
        );
        E.configure(s, { dispatch: true });
        E.advance(s, s.lastAt + s.mission.seconds * 1000, { offline: true });
        assert.equal(s.result.story, project.story);
        assert.deepEqual(
          s.lore,
          before.lore,
          "automation never chooses chapter stories",
        );
        assert.ok(
          E.claimMission(
            s,
            D.STORIES[project.story].choices[
              D.STORIES.hospital.choices.indexOf(hospital)
            ].id,
          ),
        );
        const rate = E.rawRate(s),
          cores = s.totalCores;
        assert.ok(E.buildProject(s, project.id));
        assert.equal(s.totalCores, cores);
        if (project.id === "relay")
          assert.ok(Math.abs(E.rawRate(s) - rate * 1.05) < 1e-8);
        assert.equal(
          s.run.choices,
          2,
          "chapter choices do not consume the original two-story limit",
        );
        assert.equal(E.claimMission(s), false);
      }
      assert.deepEqual(s.lore.slice(0, 2), original);
      assert.deepEqual(
        s.chapter,
        D.PROJECTS.map((p) => p.id),
      );
      assert.equal(s.lore.length, 5);
      assert.deepEqual(E.sanitize(s, s.lastAt), s);
      const preview = E.missionPreview(s, "belt");
      const noBonus = structuredClone(s);
      noBonus.chapter = ["relay"];
      assert.equal(
        preview.samples,
        E.missionPreview(noBonus, "belt").samples + 1,
      );
      assert.ok(
        preview.seconds <=
          Math.ceil(E.missionPreview(noBonus, "belt").seconds * 0.9),
      );
      s.run.dust = D.PRESTIGE_DUST;
      assert.ok(E.prestige(s));
      assert.deepEqual(
        s.chapter,
        D.PROJECTS.map((p) => p.id),
      );
      assert.deepEqual(s.lore.slice(0, 2), original);
    }
});
test("chapter goals always lead to a reachable prerequisite, gear, sample, report or construction target", () => {
  const s = chapterReady();
  assert.equal(E.nextGoal(s).focus, "mission-message");
  s.lore.push({ story: "relay", choice: "public" });
  s.cores = 0;
  assert.equal(E.nextGoal(s).action, "jump");
  s.rebirths = 0;
  assert.equal(E.nextGoal(s).action, "fleet");
  assert.ok(E.reachable(s, E.nextGoal(s).action));
  s.cores = 12;
  s.rebirths = 4;
  s.samples = 0;
  assert.equal(E.nextGoal(s).focus, "mission-message");
  s.samples = 60;
  assert.equal(E.nextGoal(s).focus, "project-relay");
  E.buildProject(s, "relay");
  s.equipped = [];
  s.modules.nav = 1;
  s.samples = 0;
  assert.equal(E.nextGoal(s).focus, "mission-belt");
  s.samples = 60;
  assert.equal(E.nextGoal(s).focus, "module-nav");
  s.modules.nav = 2;
  s.equipped = ["nav"];
  assert.equal(E.nextGoal(s).focus, "mission-seedbank");
  E.startMission(s, "seedbank");
  assert.equal(E.nextGoal(s).focus, "active-mission");
  E.advance(s, s.lastAt + s.mission.seconds * 1000);
  assert.equal(E.nextGoal(s).focus, "report");
});
test("old saves gain only the optional empty chapter; invalid construction and repeat dispatch cannot unlock or replay chapter rewards", () => {
  const old = chapterReady();
  delete old.chapter;
  const restored = E.sanitize(old, old.lastAt);
  assert.deepEqual(restored, { ...old, chapter: [] });
  old.chapter = ["lighthouse", "unknown"];
  old.repeatId = "horizon";
  const cleaned = E.sanitize(old, old.lastAt);
  assert.deepEqual(cleaned.chapter, []);
  assert.equal(cleaned.repeatId, "belt");
  const s = chapterReady();
  s.modules.battery = 3;
  E.startMission(s, "message");
  E.advance(s, s.lastAt + s.mission.seconds * 1000);
  const samples = s.samples,
    reward = s.result.samples;
  assert.ok(E.claimMission(s, "power"));
  assert.equal(s.samples, samples + reward + 6);
  s.result = {
    id: "message",
    story: "relay",
    samples: 4,
    dust: 20,
    succeeded: true,
    module: null,
  };
  assert.equal(E.sanitize(s, s.lastAt).result.story, null);
});
test("auto dispatch pauses for a reachable new chapter story but still runs ordinary safe voyages when prerequisites are missing", () => {
  const s = chapterReady();
  E.configure(s, { dispatch: true });
  E.advance(s, s.lastAt + 1000);
  assert.equal(s.mission, null, "first new story awaits a deliberate dispatch");
  s.lore.push({ story: "relay", choice: "public" });
  assert.ok(E.buildProject(s, "relay"));
  s.modules.nav = 1;
  E.advance(s, s.lastAt + 1000);
  assert.equal(s.mission.id, "belt");
  assert.equal(
    E.nextGoal(s).focus,
    "module-nav",
    "ordinary automation must not hide the prerequisite goal",
  );
  s.modules.nav = 2;
  E.advance(s, s.lastAt + 120000);
  assert.equal(s.mission, null);
  assert.equal(s.result, null);
  assert.equal(E.nextGoal(s).focus, "mission-seedbank");
});
console.log(`v3 gameplay ok: ${checks} behavioral checks`);
