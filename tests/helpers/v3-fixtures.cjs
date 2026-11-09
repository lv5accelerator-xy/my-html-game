'use strict';
const assert = require('node:assert/strict');
const E = require('../../v3/engine.js'), D = require('../../v3/data.js');
function ready(now = 1000) {
  const s = E.createState(now, 42);
  s.buildings = { drone: 25, sail: 10, forge: 2, relay: 0 };
  s.run.dust = s.dust = 1e7;
  s.run.routeChosen = true;
  return s;
}
function encounterReady(id, now = 1000, option) {
  const s = ready(now), def = D.ENCOUNTERS.find(e => e.id === id);
  s.starport = 3; s.discoveries = 10;
  s.modules = Object.fromEntries(D.MODULES.map(m => [m.id, 3]));
  s.equipped = def.module ? [def.module] : [];
  const list = E.encounterCandidates(s, 'belt'), index = list.findIndex(e => e.id === id);
  for (let seed = 1; seed < 1000000; seed++) {
    let n = seed; n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    const roll = (n >>> 0) / 4294967296;
    if (roll < .45 && Math.floor(roll / .45 * list.length) === index) { s.encounters.rng = seed; break; }
  }
  assert.ok(E.startMission(s, 'belt'));
  assert.equal(s.mission.encounter.id, id);
  if (option === 'active') return s;
  E.advance(s, s.lastAt + s.mission.seconds * 1000);
  assert.equal(s.encounters.pending.id, id);
  assert.ok(E.claimMission(s));
  return s;
}
function completed(ending = 'city', now = 1000, focus = 'reception') {
  const s = ready(now);
  s.rebirths = 4; s.starport = 3; s.cores = s.totalCores = 100;
  s.samples = 200; s.modules = { nav: 3, scanner: 3, battery: 3, medbay: 3, solar: 3 };
  s.equipped = ['nav', 'scanner']; s.research = D.RESEARCH.map(r => r.id);
  s.lore = [{ story: 'hospital', choice: 'preserve' }, { story: 'garden', choice: 'preserve' }];
  s.chapter = D.PROJECTS.map(p => p.id);
  for (const p of D.PROJECTS) s.lore.push({ story: p.story, choice: D.STORIES[p.story].choices[0].id });
  function voyage(m) {
    if (m.requiresBackupBerth) assert.ok(E.confirmBackupBerth(s));
    if (m.rescue) for (const c of D.RESCUE_CONFIRMATIONS) assert.ok(E.confirmRescue(s, m.id, c.id));
    assert.ok(E.prepareMission(s, m.id, 'relay'));
    assert.ok(E.startMission(s, m.id));
    E.advance(s, s.lastAt + s.mission.seconds * 1000);
    assert.ok(E.claimMission(s, D.STORIES[m.story].choices[0].id));
  }
  for (const m of D.MISSIONS.filter(m => m.campaign)) voyage(m);
  for (const m of D.COUNCIL_MISSIONS) { voyage(m); if (m.id === 'port-council') assert.ok(E.buildPortFocus(s, focus)); }
  assert.ok(E.arrangeRescueEnergy(s, 'rotation'));
  for (const m of D.RESCUE_MISSIONS) voyage(m);
  assert.ok(E.adoptKeeperProtocol(s));
  for (const h of D.EPILOGUE_HANDOFFS) assert.ok(E.confirmEpilogue(s, h.id));
  assert.ok(E.chooseEnding(s, ending));
  return s;
}
module.exports = { ready, encounterReady, completed };
