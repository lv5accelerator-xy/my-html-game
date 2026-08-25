"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "v2-systems.js"), "utf8");
const gameSource = fs.readFileSync(path.join(root, "game.js"), "utf8");
const context = {
  console, Date, Math, Set, Object, Array, Number, String, Boolean,
  window: { dispatchEvent() {} },
  CustomEvent: class CustomEvent {},
};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "v2-systems.js" });
const systems = context.StellarV2Systems;

const firstDay = Date.UTC(2026, 7, 25, 12);
const secondDay = firstDay + 86400000;
const game = { lifetimeDust: 5e6 };
const v2 = systems.freshState(firstDay);

assert.equal(systems.getEligibleRoutes(game).length, 3);
assert.equal(systems.selectDaily(v2, game, "sentinel", firstDay), true);
assert.equal(v2.dailyRoute.tasks.length, 3);
assert.equal(systems.dailyComplete(v2), false);

systems.recordMetric(v2, "battlesWon", 2, game, firstDay);
assert.equal(systems.dailyComplete(v2), true, "main objective alone must unlock central claim");
assert.equal(systems.getDailyCompletion(v2).optionalCompleted, 0);
systems.recordMetric(v2, "materialsCollected", 4, game, firstDay);
assert.equal(systems.getDailyCompletion(v2).optionalCompleted, 1);
const claimed = systems.claimDaily(v2, game, firstDay);
assert.equal(claimed.optionalCompleted, 1);
assert.equal(v2.dailyRoute.claimed, true);

systems.ensureDaily(v2, game, secondDay);
assert.equal(v2.dailyRoute.routeId, "");
assert.equal(v2.dailyRoute.history.length, 1);
assert.equal(v2.dailyRoute.history[0].completed, true);
assert.equal(systems.selectDaily(v2, game, "industry", secondDay), true);
assert.equal(systems.rerollDaily(v2, game, secondDay), true);
assert.equal(systems.rerollDaily(v2, game, secondDay), false, "only one reroll per day");

assert.match(gameSource, /id: "manualClicks"[\s\S]*?eligible: \(\) => false/);
assert.match(gameSource, /id: "playSeconds"[\s\S]*?eligible: \(\) => false/);
assert.match(gameSource, /slice\(0, kind === "daily" \? 3 : 5\)/);

console.log("daily route ok: three routes, one main, two optional, one reroll, daily reset");
