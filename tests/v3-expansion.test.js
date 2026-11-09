'use strict';
const assert = require('node:assert/strict');
const D = require('../v3/data.js'), E = require('../v3/engine.js'), S = require('../v3/storage.js');
const { ready, encounterReady, completed } = require('./helpers/v3-fixtures.cjs');
let checks = 0;
function test(name, fn) { fn(); console.log(`ok ${++checks} - ${name}`); }
for (const event of D.ENCOUNTERS) test(`v3.13 ${event.name}: all choices have actual finite effects, recovery and one settlement`, () => {
  assert.ok(event.choices.length >= 2 && event.choices.length <= 3);
  const signatures = new Set();
  for (const choice of event.choices) {
    let s = encounterReady(event.id); s.samples = 10;
    const offer = E.encounterOffer(s), snapshot = structuredClone(s);
    assert.equal(E.chooseEncounter(s, offer.token + 1, choice.id), false);
    assert.equal(E.chooseEncounter(s, offer.token, 'illegal'), false);
    assert.deepEqual(s, snapshot);
    assert.ok(E.chooseEncounter(s, offer.token, choice.id));
    const c = offer.choices.find(c => c.id === choice.id);
    assert.equal(s.samples, snapshot.samples - c.costSamples + (c.seconds ? 0 : c.samples));
    signatures.add(JSON.stringify([c.dust, c.samples, c.costSamples, c.seconds]));
    s = E.sanitize(JSON.parse(JSON.stringify(s)), s.lastAt);
    const before = structuredClone(s), delta = c.seconds * 1000;
    E.advance(s, s.lastAt + delta, { offline: true });
    assert.equal(s.encounters.pending, null);
    assert.equal(s.encounters.history.length, 1);
    assert.equal(s.samples, snapshot.samples - c.costSamples + c.samples);
    const balance = s.dust;
    assert.equal(E.chooseEncounter(s, offer.token, choice.id), false);
    assert.equal(s.dust, balance);
    assert.deepEqual(E.sanitize(s, s.lastAt).encounters, s.encounters);
    if (c.seconds) assert.ok(s.dust >= before.dust + c.dust);
  }
  assert.equal(signatures.size, event.choices.length);
});
test('v3.13 active voyage snapshot and RNG survive reload/import and eight-hour recovery without redraw', () => {
  for (const def of D.ENCOUNTERS) {
    const a = encounterReady(def.id, 1000, 'active'), b = S.inspect(JSON.stringify(a), a.lastAt).state;
    assert.deepEqual(a.mission, b.mission);
    const rng = a.encounters.rng;
    E.advance(a, a.lastAt + 48 * 3600000, { offline: true });
    E.advance(b, b.lastAt + 48 * 3600000, { offline: true });
    assert.deepEqual(a, b); assert.equal(a.encounters.rng, rng);
    const pending = structuredClone(a.encounters.pending);
    const samples = a.samples;
    E.advance(a, a.lastAt + 1000);
    assert.deepEqual(a.encounters.pending, pending); assert.equal(a.samples, samples);
  }
});
test('v3.13 event gates, cooldown, automation and invalid snapshots preserve safe base income', () => {
  const s = encounterReady('crate'); s.rebirths = 4;
  E.configure(s, { dispatch: true });
  const pending = structuredClone(s.encounters.pending);
  E.advance(s, s.lastAt + 1800000, { offline: true });
  assert.deepEqual(s.encounters.pending, pending);
  assert.equal(s.encounters.history.length, 0);
  assert.ok(s.discoveries > 10); assert.ok(s.samples > 0);
  const invalid = structuredClone(s); invalid.encounters.pending.choices[0].dust = Infinity;
  assert.equal(E.sanitize(invalid, invalid.lastAt).encounters.pending, null);
  invalid.encounters.pending = { ...pending, token: invalid.encounters.settled };
  assert.equal(E.sanitize(invalid, invalid.lastAt).encounters.pending, null);
  const poor = encounterReady('debris'); poor.samples = 0;
  assert.equal(E.chooseEncounter(poor, poor.encounters.pending.token, 'anchor'), false);
  const gate = ready(); assert.equal(E.encounterCandidates(gate, 'belt').some(e => e.id === 'research'), false);
  gate.discoveries = 2; E.startMission(gate, 'belt'); assert.equal(gate.mission.encounter, undefined);
});
test('v3.13 old schema32 archives add empty events without replaying stories or rewards', () => {
  for (const state of [ready(), completed()]) {
    delete state.encounters;
    const clean = E.sanitize(state, state.lastAt), { encounters, ...oldFields } = clean;
    assert.deepEqual(oldFields, state);
    assert.equal(encounters.pending, null); assert.deepEqual(encounters.history, []);
  }
});
console.log(`v3 expansion ok: ${checks} behavioral checks`);
