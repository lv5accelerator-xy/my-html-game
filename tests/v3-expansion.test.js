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
test('v3.14 all legal two-slot combinations have bounded mission fits and locked preview/settlement', () => {
  const pairs = D.MODULES.flatMap((m, i) => D.MODULES.slice(i + 1).map(n => [m.id, n.id]));
  for (const equipped of pairs) for (const id of ['belt', 'garden', 'supply-run']) {
    let state = completed(); state.equipped = equipped; state.encounters.nextAt = state.clock + 600;
    const preview = E.missionPreview(state, id);
    assert.ok(Number.isFinite(preview.dust) && preview.dust <= D.MAX_NUMBER);
    assert.ok(preview.seconds >= 30 && preview.seconds <= D.MISSIONS.find(m => m.id === id).seconds * 1.1);
    assert.ok(preview.diversion >= .03 && preview.diversion <= .5);
    assert.ok(E.startMission(state, id));
    const snapshot = structuredClone(state.mission);
    assert.equal(snapshot.samples, preview.samples); assert.equal(snapshot.dust, preview.dust);
    assert.equal(snapshot.seconds, preview.seconds); assert.equal(snapshot.diversion, preview.diversion);
    state.equipped = []; state.modules = { ...state.modules, scanner: 1 };
    state = E.sanitize(state, state.lastAt); assert.deepEqual(state.mission, snapshot);
    E.advance(state, state.lastAt + snapshot.seconds * 1000, { offline: true });
    assert.equal(state.result.dust, preview.dust); assert.equal(state.result.samples, preview.samples);
  }
});
test('v3.14 specific fits have genuine tradeoffs and existing production/module levels remain legal', () => {
  const state = completed(); const old = structuredClone(state.modules);
  state.equipped = ['nav', 'scanner']; const survey = E.missionPreview(state, 'old-observatory', 'relay');
  state.equipped = ['battery', 'solar']; const long = E.missionPreview(state, 'old-observatory', 'relay');
  assert.ok(survey.seconds < long.seconds); assert.ok(survey.diversion > long.diversion);
  state.equipped = ['battery', 'medbay']; const relief = E.missionPreview(state, 'supply-run');
  state.equipped = ['nav', 'scanner']; const fast = E.missionPreview(state, 'supply-run');
  assert.ok(relief.samples > fast.samples); assert.ok(relief.seconds > fast.seconds);
  assert.deepEqual(state.modules, old);
  for (const def of D.MODULES) { state.equipped = [def.id]; assert.ok(E.sanitize(state, state.lastAt).equipped.includes(def.id)); }
});
test('v3.14 saved loadout comparison uses the actual plan and switching never rewrites the active snapshot', () => {
  const state = completed(); state.equipped = ['battery', 'solar']; E.saveLoadout(state, 'production');
  state.equipped = ['nav', 'scanner']; E.saveLoadout(state, 'voyage');
  const forecast = E.loadoutPreview(state, 'production', 'supply-run');
  assert.ok(E.applyLoadout(state, 'production'));
  assert.deepEqual(forecast.mission, E.missionPreview(state, 'supply-run'));
  E.startMission(state, 'supply-run'); const locked = structuredClone(state.mission);
  E.applyLoadout(state, 'voyage'); assert.deepEqual(state.mission, locked);
  assert.deepEqual(E.sanitize(state, state.lastAt).loadouts, state.loadouts);
});
test('v3.15 all facilities and resident activity derive only from actual story/build progress', () => {
  const s = ready();
  assert.equal(E.portFacilities(s).filter(n => n.live).length, 0);
  assert.equal(E.portActivity(s).residents, false);
  s.starport = 1; assert.equal(E.portFacilities(s).find(n => n.id === 'hub').status, '修复 1/3');
  s.starport = 2; assert.ok(E.portFacilities(s).find(n => n.id === 'docking').live);
  assert.equal(E.portFacilities(s).find(n => n.id === 'hub').live, false);
  for (const ending of D.ENDINGS) {
    const done = completed(ending.id); const before = structuredClone(done);
    assert.equal(E.portFacilities(done).filter(n => n.live).length, 7);
    assert.equal(E.portActivity(done).firstConvoy, true);
    assert.equal(E.portActivity(done).rescued, 3);
    assert.equal(E.portActivity(done).residents, true);
    assert.deepEqual(done, before);
    assert.deepEqual(E.portFacilities(E.sanitize(done, done.lastAt)), E.portFacilities(done));
    done.run.dust = D.PRESTIGE_DUST; E.prestige(done);
    assert.deepEqual(E.portFacilities(done), E.portFacilities(before));
    assert.deepEqual(E.portActivity(done), E.portActivity(before));
  }
});
function finishWork(s) {
  E.advance(s, s.lastAt + Math.max(0, s.management.active.acceptedClock + s.management.active.workSeconds - s.clock) * 1000, { offline: true });
  for (let i = 0; !E.harborStatus(s).workReady && i < 10; i++) E.advance(s, s.lastAt + Math.max(1000, Math.ceil((s.management.active.productionGoal - s.management.active.produced) / E.rawRate(s)) * 1000), { offline: true });
  assert.ok(E.harborStatus(s).workReady);
}
function takeNeed(s, id) {
  for (let i = 0; i < 7; i++) {
    const offers = E.harborOffers(s), offer = offers.find(n => n.id === id) || offers[0];
    assert.ok(E.acceptHarborNeed(s, offer.id, offer.terms.serial));
    if (offer.id === id) return;
    finishWork(s); assert.ok(E.deliverHarborNeed(s, s.management.active.serial));
  }
  assert.fail('Every need must recur within seven cycles');
}
test('v3.16 all seven needs and all three directions work after each permanent ending without replaying story rewards', () => {
  for (const ending of D.ENDINGS) for (const focus of D.HARBOR_FOCUSES) for (const need of D.HARBOR_NEEDS) {
    let s = completed(ending.id); const lore = structuredClone(s.lore), afterword = structuredClone(s.afterword);
    assert.ok(E.setHarborFocus(s, focus.id)); takeNeed(s, need.id);
    const locked = structuredClone(s.management.active), serial = locked.serial;
    assert.equal(E.deliverHarborNeed(s, serial), false);
    E.setHarborFocus(s, D.HARBOR_FOCUSES.find(f => f.id !== focus.id).id);
    assert.deepEqual(s.management.active, locked);
    finishWork(s); s = E.sanitize(s, s.lastAt);
    const dust = s.dust, samples = s.samples;
    assert.ok(E.deliverHarborNeed(s, serial));
    assert.equal(s.dust, dust - locked.dustCost); assert.equal(s.samples, samples - locked.samplesCost);
    assert.equal(E.deliverHarborNeed(s, serial), false);
    assert.ok(s.management.collections.includes(`need-${need.id}`));
    assert.deepEqual(s.lore, lore); assert.deepEqual(s.afterword, afterword);
    assert.equal(s.epilogue.ending, ending.id); assert.equal(E.chooseEnding(s, ending.id), false);
    assert.deepEqual(E.sanitize(s, s.lastAt).management, s.management);
  }
});
test('v3.16 only production after acceptance or a newly tagged matching voyage can prepare a request', () => {
  const s = completed(); E.startMission(s, 'supply-run');
  E.setHarborFocus(s, 'reception');
  const offer = E.harborOffers(s).find(n => n.mission === 'supply-run');
  assert.ok(E.acceptHarborNeed(s, offer.id, offer.terms.serial));
  const task = s.management.active;
  assert.equal(s.mission.harborOrder, undefined);
  E.scan(s); E.addDust(s, 1e8); assert.equal(task.produced, 0);
  E.advance(s, s.lastAt + s.mission.seconds * 1000); E.claimMission(s); assert.equal(task.trips, 0);
  assert.ok(E.startMission(s, 'supply-run')); assert.equal(s.mission.harborOrder, task.serial);
  let restored = E.sanitize(s, s.lastAt); assert.equal(restored.mission.harborOrder, task.serial);
  E.advance(restored, restored.lastAt + restored.mission.seconds * 1000);
  restored = E.sanitize(restored, restored.lastAt);
  assert.ok(E.claimMission(restored)); assert.equal(restored.management.active.trips, 1);
  assert.equal(E.claimMission(restored), false); assert.equal(restored.management.active.trips, 1);
});
test('v3.16 eight-hour idle recovery and automation progress tasks but never deliver or choose a new request', () => {
  const s = completed(); takeNeed(s, 'cargo');
  E.configure(s, { dispatch: true });
  const serial = s.management.active.serial, cycle = s.management.cycle;
  const a = structuredClone(s), b = structuredClone(s);
  E.advance(a, a.lastAt + 48 * 3600000, { offline: true });
  for (let i = 0; i < 8; i++) E.advance(b, b.lastAt + 3600000, { offline: true });
  assert.equal(a.management.active.serial, serial); assert.equal(a.management.cycle, cycle);
  assert.ok(E.harborStatus(a).workReady);
  assert.deepEqual(a.management, b.management);
  assert.equal(a.dust, b.dust); assert.equal(a.samples, b.samples);
});
test('v3.16 all five projects have three finite stages, real task conveniences and exact atlas persistence', () => {
  for (const ending of D.ENDINGS) {
    let s = completed(ending.id), startingRate = E.rawRate(s); s.samples = 1000;
    for (const need of D.HARBOR_NEEDS) { takeNeed(s, need.id); finishWork(s); E.deliverHarborNeed(s, s.management.active.serial); }
    while (s.management.cycle < 35) { const n = E.harborOffers(s)[0]; E.acceptHarborNeed(s,n.id,n.terms.serial); finishWork(s); E.deliverHarborNeed(s,s.management.active.serial); }
    for (const p of D.HARBOR_PROJECTS) {
      for (let level = 0; level < 3; level++) {
        const offer = E.harborProjectOffer(s, p.id), before = s.dust;
        assert.ok(offer.available); assert.ok(E.buildHarborProject(s, p.id, level));
        assert.equal(s.dust, before - offer.dustCost);
        assert.equal(E.buildHarborProject(s, p.id, level), false);
        assert.equal(E.portFacilities(s).find(n => n.id === p.id).level, level + 1);
      }
      assert.equal(E.buildHarborProject(s, p.id, 3), false);
      assert.ok(s.management.collections.includes(`project-${p.id}`));
    }
    assert.equal(E.rawRate(s), startingRate, 'projects never stack production multipliers');
    assert.equal(E.harborOffers(s).length, 4);
    const completedState = structuredClone(s);
    s = E.sanitize(s, s.lastAt); assert.deepEqual(s.management, completedState.management);
    assert.deepEqual(E.portFacilities(s), E.portFacilities(completedState));
    s.run.dust = D.PRESTIGE_DUST; assert.ok(E.prestige(s)); assert.deepEqual(s.management, completedState.management);
  }
});
test('v3.16 project capabilities change only future terms; focus directions have measurable costs', () => {
  const s = completed(); E.setHarborFocus(s,'production'); const prod = E.harborTerms(s,'repair');
  E.setHarborFocus(s,'reception'); const reception = E.harborTerms(s,'repair');
  assert.ok(prod.dustCost < reception.dustCost); assert.ok(prod.samplesCost > reception.samplesCost);
  takeNeed(s,'repair'); const original = structuredClone(s.management.active);
  s.management.projects['repair-dock'] = 3;
  assert.deepEqual(s.management.active, original);
  assert.ok(E.harborTerms(s,'repair').dustCost < original.dustCost);
});
test('v3.16 malformed management, stale serials, insufficient resources and non-ending archives are safe', () => {
  const early = ready(); assert.deepEqual(E.harborOffers(early), []);
  assert.equal(E.setHarborFocus(early,'production'), false); assert.equal(E.acceptHarborNeed(early,'food',1),false);
  const s = completed(); const n = E.harborOffers(s)[0];
  assert.equal(E.acceptHarborNeed(s,n.id,99),false); assert.ok(E.acceptHarborNeed(s,n.id,1));
  finishWork(s); s.dust = 0; s.samples = 0; const before = structuredClone(s);
  assert.equal(E.deliverHarborNeed(s,1),false); assert.deepEqual(s,before);
  for (const patch of [{id:'invalid'},{dustCost:Infinity},{productionGoal:0},{samplesCost:-1},{serial:99},{mission:'echo'}]) {
    const bad = structuredClone(s); Object.assign(bad.management.active,patch);
    assert.equal(E.sanitize(bad,bad.lastAt).management.active,null);
  }
  early.management = structuredClone(s.management); assert.equal(E.sanitize(early,early.lastAt).management.active,null);
  const bad = structuredClone(s); bad.management.collections = ['invalid','project-public-berths']; bad.management.projects = {'unknown':Infinity,'public-berths':Infinity};
  const clean = E.sanitize(bad,bad.lastAt); assert.deepEqual(clean.management.collections,[]); assert.deepEqual(clean.management.projects,{});
});
test('v3.16 restore/backups preserve active terms, collections and permanent endings without crediting old income', () => {
  const s = completed(); takeNeed(s,'food'); E.advance(s,s.lastAt+1000);
  const map = new Map(); const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v))};
  S.save(storage,s,s.lastAt); S.checkpoint(storage,JSON.stringify(s),'manual','postgame',s.lastAt);
  const restored = S.restore(storage,JSON.stringify(s),s.lastAt+1e8);
  assert.deepEqual(restored.management,s.management); assert.equal(restored.dust,s.dust);
  assert.equal(restored.epilogue.ending,s.epilogue.ending); assert.equal(S.summarize(restored).harborDeliveries,s.management.stats.deliveries);
});
test('v3.16 discovery catalog remains permanent while recent event history rotates', () => {
  const s = encounterReady('crate'); const c = s.encounters.pending.choices[0];
  E.chooseEncounter(s,s.encounters.pending.token,c.id); E.advance(s,s.lastAt+c.seconds*1000);
  const catalog = structuredClone(s.encounters.catalog); s.encounters.history=[];
  assert.deepEqual(E.sanitize(s,s.lastAt).encounters.catalog,catalog);
});
test('v3.16 extreme resource previews remain bounded and damaged task quantities cannot create rewards', () => {
  const s = completed(); s.totalCores = D.MAX_NUMBER;
  for (const b of D.BUILDINGS) s.buildings[b.id] = 10000;
  const preview = E.missionPreview(s,'belt'); assert.equal(preview.dust, E.rawRate(s) * 75);
  const saturated=structuredClone(s); saturated.totalCores=Number.MAX_VALUE;
  assert.equal(E.missionPreview(saturated,'belt').dust,D.MAX_NUMBER);
  assert.ok(E.startMission(s,'belt')); const snapshot=structuredClone(s.mission);
  assert.deepEqual(E.sanitize(s,s.lastAt).mission,snapshot);
  E.advance(s,s.lastAt+s.mission.seconds*1000); assert.ok(E.claimMission(s));
  assert.ok(Number.isFinite(s.dust) && s.dust<=D.MAX_NUMBER);
});
test('v3.16 preparation is meaningful for saturated fleets and finite project stages need actual deliveries', () => {
  const s = completed(); takeNeed(s,'food');
  s.management.active.produced=s.management.active.productionGoal;
  assert.equal(E.harborStatus(s).workReady,false);
  const report = E.advance(s,s.lastAt+s.management.active.workSeconds*1000,{offline:true,report:true});
  assert.ok(E.harborStatus(s).available); assert.ok(E.deliverHarborNeed(s,s.management.active.serial));
  assert.equal(E.harborProjectOffer(s,'habitat').available,false);
  assert.match(E.harborProjectOffer(s,'habitat').reason,/4 份/);
  assert.deepEqual(D.HARBOR_STAGE_DELIVERIES,[4,14,35]);
  const a=completed(); takeNeed(a,'food');
  assert.ok(E.advance(a,a.lastAt+1000,{offline:true,report:true}).harborChanges.length>0);
});
test('v3.16 window reply belongs to a living caretaker and retains all original ids and collections', () => {
  const r=D.RESIDENT_REQUESTS.find(r=>r.id==='window');
  assert.equal(r.from,'育种舱照料者'); assert.equal(r.collection,'窗台观测册');
  assert.deepEqual(r.replies.map(r=>r.id),['different','address']);
  assert.match(r.brief,/苇留下/); assert.ok(r.replies.every(r=>!r.text.includes('苇把')));
});
test('v3.16 first goal returns an underfunded player to the real scan control and only directs affordable construction', () => {
  const s=E.createState(0);
  assert.equal(E.nextGoal(s).action,'home'); assert.equal(E.nextGoal(s).focus,'scan-control');
  for(let i=0;i<6;i++) { E.advance(s,i*1000); E.scan(s); }
  assert.equal(E.nextGoal(s).action,'fleet'); assert.equal(E.nextGoal(s).focus,'building-drone');
});
test('v3.13 each event rejects corrupt in-flight terms and enforces its gates and cooldown without losing base rewards', () => {
  for(const def of D.ENCOUNTERS) {
    const original=encounterReady(def.id,1000,'active'), raw=structuredClone(original);
    raw.mission.encounter.choices[0].samples+=99;
    const clean=E.sanitize(raw,raw.lastAt);
    assert.ok(clean.mission); assert.equal(clean.mission.encounter,undefined);
    E.advance(clean,clean.lastAt+clean.mission.seconds*1000);
    assert.equal(clean.result.dust,original.mission.dust); assert.ok(E.claimMission(clean));
    if(def.minPort) { const gate=structuredClone(original); gate.starport=0; assert.ok(!E.encounterCandidates(gate,'belt').some(e=>e.id===def.id)); }
    if(def.module) { const gate=structuredClone(original); gate.equipped=[]; assert.ok(!E.encounterCandidates(gate,'belt').some(e=>e.id===def.id)); }
    const s=encounterReady(def.id), offer=E.encounterOffer(s), c=offer.choices[0];
    s.samples=10; assert.ok(E.chooseEncounter(s,offer.token,c.id)); E.advance(s,s.lastAt+c.seconds*1000);
    assert.ok(E.startMission(s,'belt')); assert.equal(s.mission.encounter,undefined);
    assert.equal(s.encounters.serial,offer.token);
  }
});
test('v3.16 restore rejects inherited object keys as equipment or story identifiers while retaining valid progress', () => {
  const s=completed(), lore=structuredClone(s.lore);
  s.equipped=['constructor','__proto__','battery'];
  s.lore.push({story:'constructor',choice:'x'},{story:'__proto__',choice:'x'},{story:['hospital'],choice:'repair'});
  const clean=E.sanitize(s,s.lastAt);
  assert.deepEqual(clean.equipped,['battery']); assert.deepEqual(clean.lore,lore);
  assert.deepEqual(clean.modules,s.modules); assert.deepEqual(clean.epilogue,s.epilogue);
  assert.deepEqual(E.sanitize(clean,clean.lastAt),clean);
});
test('v3.17 pending decisions precede repeat management; live arrival list removes settled items', () => {
  const s = completed();
  const event = encounterReady('crate');
  s.encounters = structuredClone(event.encounters);
  const before = JSON.stringify(s);
  assert.equal(E.nextGoal(s).focus, 'encounter-panel');
  assert.match(E.arrivalTasks(s).join(' '), /等待手动决定/);
  assert.equal(JSON.stringify(s), before);
  assert.ok(E.chooseEncounter(s, s.encounters.pending.token, s.encounters.pending.choices[0].id));
  E.advance(s, s.lastAt + 60000, {offline:true});
  assert.ok(!E.arrivalTasks(s).join(' ').includes('等待手动决定'));
  assert.notEqual(E.nextGoal(s).focus, 'encounter-panel');
});

console.log(`v3 expansion ok: ${checks} behavioral checks`);
