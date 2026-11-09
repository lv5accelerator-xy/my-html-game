"use strict";
const assert = require("node:assert/strict");
const E = require("../v3/engine.js"), fixtures = require("./fixtures/v311-saves.json");
for (const {name,state} of fixtures.states) {
  const current = E.sanitize(state,state.lastAt);
  const { encounters, management, ...old } = current;
  assert.deepEqual(old,state,name + ": every old field preserved");
  assert.equal(encounters.pending,null); assert.deepEqual(encounters.history,[]);
  assert.equal(management.active,null); assert.equal(management.cycle,0);
  assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3 compatibility ok: ${fixtures.states.length} canonical v3.11 snapshots; all original fields equal, no replay, idempotent migration`);
