"use strict";
const assert = require("node:assert/strict");
const E = require("../v3/engine.js"), fixtures = require("./fixtures/v311-saves.json");
for (const {name,state} of fixtures.states) {
  const current = E.sanitize(state,state.lastAt);
  const { encounters, management, atlas, expeditions, continuation, ...old } = current;
  assert.deepEqual(old,state,name + ": every old field preserved");
  assert.deepEqual(atlas.nodes,[]); assert.equal(atlas.active,null);
  assert.equal(encounters.pending,null); assert.deepEqual(encounters.history,[]);
  assert.equal(management.active,null); assert.equal(management.cycle,0);
  assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3 compatibility ok: ${fixtures.states.length} canonical v3.11 snapshots; all original fields equal, no replay, idempotent migration`);
const v316=require('./fixtures/v316-saves.json');
for(const {name,state} of v316.states) {
  const current=E.sanitize(state,state.lastAt),{atlas,expeditions,continuation,...old}=current;
  assert.deepEqual(old,state,name+': original v3.16 records and locked terms preserved');
  assert.deepEqual(atlas.nodes,[]);assert.equal(atlas.active,null);
  assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3.16 compatibility ok: ${v316.states.length} canonical earned snapshots, active needs/voyages/reports and permanent records equal`);

const v320=require('./fixtures/v320-saves.json');
for(const {name,state} of v320.states) {
 const current=E.sanitize(state,state.lastAt),{continuation,...old}=current;
 assert.deepEqual(old,state,name+': every v3.20 field preserved');
 assert.deepEqual(continuation,E.createState(state.lastAt).continuation);
 assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3.20 compatibility ok: ${v320.states.length} canonical snapshots; all old fields/archives/locked terms preserved`);
