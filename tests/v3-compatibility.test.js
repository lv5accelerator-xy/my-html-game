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

const v321=require('./fixtures/v321-saves.json');
for(const {name,state} of v321.states) {
 const current=E.sanitize(state,state.lastAt),{reviews,community,...prior}=current.continuation;
 assert.deepEqual({...current,continuation:prior},state,name+': v3.21 plans/authorization and paid voyage preserved');
 assert.deepEqual(reviews,E.createState(state.lastAt).continuation.reviews);
 assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3.21 compatibility ok: ${v321.states.length} canonical snapshots; saved plans, active/paused authorizations and every prior field equal`);

const v322=require('./fixtures/v322-saves.json');
for(const {name,state} of v322.states) {
 const current=E.sanitize(state,state.lastAt),{community,...prior}=current.continuation;
 assert.deepEqual({...current,continuation:prior},state,name+': every v3.22 review, permit and paid snapshot preserved');
 assert.deepEqual(community,E.createState(state.lastAt).continuation.community);
 assert.deepEqual(E.sanitize(current,current.lastAt),current);
}
console.log(`v3.22 compatibility ok: ${v322.states.length} canonical snapshots; active/ready reviews, earned letters and selected/reserved/used permits preserved`);
