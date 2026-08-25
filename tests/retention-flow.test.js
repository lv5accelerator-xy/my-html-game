"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "..", "v2-systems.js"), "utf8");
const dispatched = [];
const context = {
  console,
  Date,
  Math,
  Set,
  Object,
  Array,
  Number,
  String,
  Boolean,
  window: { dispatchEvent: (event) => dispatched.push(event.detail) },
  CustomEvent: class CustomEvent {
    constructor(type, init) { this.type = type; this.detail = init?.detail; }
  },
};
context.globalThis = context;
vm.runInNewContext(source, context, { filename: "v2-systems.js" });

const systems = context.StellarV2Systems;
const now = Date.UTC(2026, 7, 25, 12);
const state = systems.freshState(now);

assert.equal(state.retention.enabled, false, "privacy analytics must default off");
systems.record(state, "game_start", { route: "industry", email: "do-not-send@example.com" }, now);
assert.equal(state.retention.counters.game_start, 1);
assert.equal(state.retention.events.length, 0, "disabled analytics must not retain event rows");
assert.equal(dispatched.length, 0, "disabled analytics must not dispatch to Firebase");

state.retention.enabled = true;
systems.record(state, "daily_route_selected", {
  route: "industry",
  playerName: "private-name",
  snapshot: { dust: 123 },
}, now + 1000);
assert.equal(dispatched.length, 1);
assert.deepEqual(Object.keys(dispatched[0]).sort(), ["at", "day", "route", "type", "value"]);
assert.equal(JSON.stringify(dispatched[0]).includes("private-name"), false);
assert.equal(JSON.stringify(dispatched[0]).includes("snapshot"), false);

systems.record(state, "not_whitelisted", {}, now + 2000);
assert.equal(dispatched.length, 1, "unknown events must be rejected");

const dirty = systems.sanitize({
  retention: {
    enabled: true,
    events: [
      { type: "first_jump", at: now, day: "2026-08-25", value: 1, route: "sentinel", email: "blocked" },
      { type: "arbitrary_payload", at: now, snapshot: { everything: true } },
    ],
    returnDays: ["2026-08-25", "invalid", "2026-08-25"],
  },
}, now);
assert.equal(dirty.retention.events.length, 1);
assert.equal(dirty.retention.returnDays.length, 1);
assert.equal(JSON.stringify(dirty).includes("blocked"), false);

console.log("retention flow ok: opt-in, whitelist, anonymous payload, bounded migration");
