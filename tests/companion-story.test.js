"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "v2-systems.js"), "utf8");
const dispatched = [];
const context = {
  console, Date, Math, Set, Object, Array, Number, String, Boolean,
  window: { dispatchEvent: (event) => dispatched.push({ type: event.type, detail: event.detail }) },
  CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "v2-systems.js" });
const systems = context.StellarV2Systems;

const companionIds = Object.keys(systems.COMPANION_STORIES);
assert.equal(companionIds.length, 8);
assert.equal(new Set(Object.values(systems.COMPANION_STORIES).map((story) => story.theme)).size, 8);
Object.values(systems.COMPANION_STORIES).forEach((story) => {
  assert.equal(story.scenes.length, 3);
  assert.equal(story.scenes[0].choices.length, 2);
  assert.equal(story.scenes[1].choices.length, 2);
  assert.ok(story.reward);
});

const now = Date.UTC(2033, 1, 2, 12);
const v2 = systems.freshState(now);
v2.dailyRoute.history = [
  { dayKey: "2033-02-01", routeId: "industry", completed: true },
  { dayKey: "2033-02-02", routeId: "pathfinder", completed: true },
];
v2.retention.returnDays = ["2033-02-01", "2033-02-02"];
v2.season.score = 30;
const game = {
  v2,
  endgame: { companions: companionIds },
  expedition: { completedRuns: 2, failedRuns: 1, completed: 2 },
  longVoyage: { completed: 1 },
  experience: { milestones: { firstExpedition: now } },
  careerBattles: 8,
  doctrine: { history: { industry: 2, sentinel: 1, pathfinder: 3 } },
};

const rewards = [];
companionIds.forEach((companionId, index) => {
  const story = systems.COMPANION_STORIES[companionId];
  assert.ok(systems.advanceCompanionStory(v2, companionId, story.scenes[0].choices[index % 2].id, game, now + index));
  assert.equal(systems.getCompanionCondition(companionId, game).ready, true);
  assert.ok(systems.advanceCompanionStory(v2, companionId, story.scenes[1].choices[(index + 1) % 2].id, game, now + 100 + index));
  const ending = systems.advanceCompanionStory(v2, companionId, "finish", game, now + 200 + index);
  assert.equal(ending.stage, 3);
  assert.ok(ending.ending.startsWith(`${companionId}:`));
  assert.equal(v2.companionStories.records[companionId].memories.length, 3);
  rewards.push(ending.reward);
});
assert.equal(new Set(rewards).size, 8, "each companion needs a distinct ending reward");

const sanitized = systems.sanitize({ companionStories: {
  records: { dustMoth: { stage: 999, choices: ["follow", "hacked"], ending: "hacked", memories: ["scene-0", "bad"] }, hacked: { stage: 3 } },
  titles: ["title_rift_sailor", "hacked"], decorations: new Array(100).fill("decor_moth_lantern"),
} }, now);
assert.equal(Object.keys(sanitized.companionStories.records).length, 1);
assert.equal(sanitized.companionStories.records.dustMoth.stage, 3);
assert.equal(Array.from(sanitized.companionStories.records.dustMoth.choices).includes("hacked"), false);

assert.equal(systems.queueFeedback(v2, "first_jump", now), true);
assert.equal(systems.answerFeedback(v2, 4, now + 1), true);
assert.equal(systems.queueFeedback(v2, "first_jump", now + 24 * 3600000), false, "same prompt appears once");
const quick = dispatched.find((entry) => entry.type === "stellar-quick-feedback");
assert.deepEqual(Object.keys(quick.detail).sort(), ["at", "promptId", "value"]);
assert.equal(JSON.stringify(quick.detail).includes("player"), false);

console.log("companion story ok: 8 distinct three-stage memories, behavior gates, endings, safe migration and one-shot feedback");
