"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "v2-systems.js"), "utf8");
const cloud = fs.readFileSync(path.join(root, "cloud-save.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const server = fs.readFileSync(path.join(root, "firebase", "functions", "index.js"), "utf8");
const context = {
  console, Date, Math, Set, Object, Array, Number, String, Boolean,
  window: { dispatchEvent() {} }, CustomEvent: class CustomEvent {},
};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "v2-systems.js" });
const systems = context.StellarV2Systems;

const startAt = Date.UTC(2032, 4, 1, 0);
systems.setSeasonConfig({
  published: true, revision: 7, id: "test-season", title: "可注入赛季",
  startAt, activeDays: 14, exchangeDays: 7, personalTarget: 20,
  beaconTarget: 100, rotations: ["规则甲", "规则乙", "规则丙"],
  story: ["第一幕", "第二幕", "终幕"],
  rewardIds: ["title_homebound", "decor_lampsea", "collection_return_signal"],
}, startAt);

assert.equal(systems.getSeasonWindow(undefined, startAt - 1).phase, "preview");
assert.equal(systems.getSeasonWindow(undefined, startAt).phase, "active");
assert.equal(systems.getSeasonWindow(undefined, startAt + 14 * 86400000).phase, "exchange");
assert.equal(systems.getSeasonWindow(undefined, startAt + 21 * 86400000).phase, "ended");

const v2 = systems.freshState(startAt);
systems.ensureSeason(v2, startAt);
assert.equal(v2.season.id, "test-season");
assert.equal(systems.recordSeasonMetric(v2, "battlesWon", 2, startAt + 1000), 10);
assert.equal(systems.recordSeasonMetric(v2, "expeditionRoutes", 1, startAt + 2000), 12);
assert.equal(v2.season.participated, true);
assert.ok(systems.claimSeasonPersonal(v2, startAt + 3000));
assert.equal(v2.season.unlockedRewards.includes("title_homebound"), true);

systems.setSeasonNetwork({ online: true, aggregateMode: "active", total: 100, participants: 12 });
assert.ok(systems.claimSeasonBeacon(v2, startAt + 4000));
assert.equal(v2.season.unlockedRewards.includes("decor_lampsea"), true);

const sanitized = systems.sanitize({ season: { ...v2.season, score: 9e99, unlockedRewards: ["title_homebound", "hacked"], archive: new Array(40).fill({ id: "x", title: "x", score: 1 }) } }, startAt);
assert.equal(sanitized.season.score, 1_000_000_000);
assert.deepEqual(Array.from(sanitized.season.unlockedRewards), ["title_homebound"]);
assert.equal(sanitized.season.archive.length, 12);

systems.setSeasonConfig(systems.DEFAULT_SEASON_CONFIG, startAt);
const recurringA = systems.getSeasonWindow(undefined, startAt);
const recurringB = systems.getSeasonWindow(undefined, startAt + 21 * 86400000);
assert.notEqual(recurringA.id, recurringB.id, "fallback seasons must recur without hard-coded event dates");

assert.match(cloud, /SEASON_CONFIG_COLLECTION = "seasonConfigs"/);
assert.match(cloud, /COMMUNITY_TOTAL_COLLECTION/);
assert.match(cloud, /dispatchCommunityBeacon\(\[\], true, "server"/);
assert.match(rules, /match \/seasonContributions\/\{seasonId\}\/players\/\{userId\}/);
assert.match(rules, /allow write: if false;/);
assert.match(server, /afterScore - beforeScore/);
assert.match(server, /aggregateSeasonContribution/);

console.log("season ok: injectable dates, 14+7 phases, catch-up points, cosmetics, recurring fallback and server contract");
