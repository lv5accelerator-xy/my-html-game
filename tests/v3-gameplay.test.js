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
console.log(`v3 gameplay ok: ${checks} behavioral checks`);
