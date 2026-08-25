"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "v2-systems.js"), "utf8");
const context = {
  console, Date, Math, Set, Object, Array, Number, String, Boolean,
  window: { dispatchEvent() {} }, CustomEvent: class CustomEvent {},
};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "v2-systems.js" });
const systems = context.StellarV2Systems;

const now = Date.UTC(2026, 7, 25, 14);
const game = {
  experience: { installedAt: Date.UTC(2026, 6, 1) }, rebirths: 4,
  lifetimeDust: 900000, combat: { activeWins: 8 }, expedition: { completed: 2 },
};
const v2a = systems.freshState(now);
const v2b = systems.freshState(now);
assert.equal(systems.beginRun(v2a, "sentinel", game, now), true);
assert.equal(systems.beginRun(v2b, "sentinel", game, now), true);
assert.equal(v2a.runBuild.seed, v2b.runBuild.seed);
assert.deepEqual(v2a.runBuild.offeredProtocolIds, v2b.runBuild.offeredProtocolIds);
assert.deepEqual(v2a.runBuild.variation, v2b.runBuild.variation);
assert.equal(new Set(Object.values(v2a.runBuild.variation)).size, 3, "a run needs multiple visible variations");
assert.equal(v2a.runBuild.offeredProtocolIds.length, 3);

const chosenId = v2a.runBuild.offeredProtocolIds[0];
assert.equal(systems.selectRunProtocol(v2a, chosenId, now + 1), true);
assert.equal(systems.selectRunProtocol(v2a, v2a.runBuild.offeredProtocolIds[1], now + 2), false, "protocol locks for the run");
const protocol = systems.getRunProtocol(v2a);
assert.ok(protocol.benefit && protocol.tradeoff);
assert.notEqual(
  systems.getRunFactor(v2a, "production") * systems.getRunFactor(v2a, "attack") * systems.getRunFactor(v2a, "defense") * systems.getRunFactor(v2a, "click"),
  1,
  "each protocol must change a real game factor",
);

game.lifetimeDust += 1200000;
game.combat.activeWins += 5;
game.expedition.completed += 1;
const report = systems.completeRun(v2a, game, 12, now + 3600000);
assert.equal(report.battles, 5);
assert.equal(report.expeditions, 1);
assert.equal(report.gainedCores, 12);
assert.equal(v2a.runBuild.routeId, "");
assert.equal(v2a.runBuild.reports.length, 1);
assert.match(systems.formatRunReport(report), /航线报告/);
assert.match(systems.formatRunReport(report), /种子/);

const migrated = systems.sanitize({ runBuild: { ...v2a.runBuild, reports: [report, { routeId: "hacked" }] } }, now);
assert.equal(migrated.runBuild.reports.length, 1);
assert.equal(migrated.runBuild.reports[0].routeId, "sentinel");

console.log("doctrine build ok: deterministic offers, tradeoffs, run lock, report and migration");
