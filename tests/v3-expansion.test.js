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

for(const chain of D.SECTORS) test(`v3.18 ${chain.name}: earned state, all nodes, snapshot, offline, restore and one claim`,()=>{
  let s=E.sanitize(structuredClone(require('./fixtures/v316-earned.json').city),1e15);
  E.configure(s,{enabled:false,dispatch:false});
  while(s.discoveries<3) {assert.ok(E.startMission(s,'belt'));E.advance(s,s.lastAt+s.mission.seconds*1000);assert.ok(E.claimMission(s));}
  const memories=structuredClone(s.lore), ending=s.epilogue.ending;
  for(let node=0;node<3;node++) {
    assert.ok(E.setSurveyPriority(s,chain.id));
    const p=E.surveyPreview(s,chain.id,'safe'), balance=s.dust, samples=s.samples;
    assert.ok(p.available);assert.ok(E.startSurvey(s,chain.id,'safe',node));
    const locked=structuredClone(s.atlas.active);
    assert.equal(E.startMission(s,'belt'),false); assert.equal(E.prestige(s),false);
    assert.equal(E.startSurvey(s,chain.id,'analysis',node),false);
    assert.equal(E.claimSurvey(s,locked.token),false);
    s=E.sanitize(JSON.parse(JSON.stringify(s)),s.lastAt);assert.deepEqual(s.atlas.active,locked);
    E.advance(s,s.lastAt+8*3600000,{offline:true});
    assert.deepEqual(s.atlas.active,locked,'offline never claims a discovery');
    assert.ok(E.claimSurvey(s,locked.token));assert.ok(s.dust>=balance+locked.dust);
    assert.equal(s.samples,samples+locked.samples);assert.equal(E.claimSurvey(s,locked.token),false);
    assert.equal(E.surveyCount(s,chain.id),node+1);
  }
  assert.equal(E.surveyPreview(s,chain.id,'safe').available,false);
  assert.deepEqual(s.lore,memories);assert.equal(s.epilogue.ending,ending);
  assert.deepEqual(S.inspect(JSON.stringify(s),s.lastAt).state.atlas,s.atlas);
});
test('v3.18 methods, equipment and all twelve event evidence change actual investigation terms',()=>{
  const s=completed();s.discoveries=3;
  const signatures=new Set(D.SURVEY_METHODS.map(m=>{const p=E.surveyPreview(s,'freight',m.id);return JSON.stringify([p.seconds,p.diversion,p.dust,p.samples,p.costSamples]);}));
  assert.equal(signatures.size,3);
  for(const event of D.ENCOUNTERS) {
    const chain=D.SECTORS.find(c=>c.events.includes(event.id));assert.ok(chain,event.id+' maps to a chain');
    const before=E.surveyPreview(s,chain.id).seconds;
    s.encounters.catalog.push(`${event.id}:${event.choices[0].id}`);
    assert.ok(E.surveyPreview(s,chain.id).seconds<before);
  }
  const before=E.surveyPreview(s,'science').seconds;s.equipped=[];assert.ok(E.surveyPreview(s,'science').seconds>before);
  s.samples=0;assert.equal(E.surveyPreview(s,'science','analysis').available,false);assert.ok(E.surveyPreview(s,'science','safe').available);
});
test('v3.18 invalid investigation recovery cannot duplicate nodes, conflict with a mission or change old records',()=>{
  const s=completed();s.discoveries=3;assert.ok(E.startSurvey(s,'freight','safe',0));
  for(const patch of [{node:2},{token:0},{dust:Infinity},{seconds:-1},{end:1},{diversion:0},{samples:1e9},{chain:'__proto__'}]) {
    const bad=structuredClone(s);Object.assign(bad.atlas.active,patch);
    const clean=E.sanitize(bad,bad.lastAt);assert.equal(clean.atlas.active,null);assert.deepEqual(clean.lore,s.lore);assert.equal(clean.epilogue.ending,s.epilogue.ending);
  }
  E.advance(s,s.lastAt+400000);assert.ok(E.claimSurvey(s,s.atlas.active.token));
  s.atlas.nodes.push(structuredClone(s.atlas.nodes[0]));
  assert.equal(E.sanitize(s,s.lastAt).atlas.nodes.length,1);
});

test('v3.19 three focus strategies spend real resources, freeze terms and use distinct preparation paths',()=>{
  for(const focus of D.HARBOR_FOCUSES) {
    let s=E.sanitize(structuredClone(require('./fixtures/v316-earned.json').city),1e15);E.configure(s,{enabled:false,dispatch:false});
    E.setHarborFocus(s,focus.id);const offer=E.harborOffers(s)[0];assert.ok(E.acceptHarborNeed(s,offer.id,offer.terms.serial));
    const t=s.management.active,terms=structuredClone(t);E.setHarborFocus(s,focus.id==='production'?'reception':'production');assert.deepEqual(s.management.active,terms);
    if(focus.id==='production') {
      const cost=E.buildingCost(s,'drone');E.advance(s,s.lastAt+(E.incomeEta(s,Math.max(0,cost-s.dust))||0)*1000);
      assert.ok(E.buy(s,'drone'));assert.ok(t.plan.credit>0 && t.plan.credit<=t.productionGoal*t.plan.workshopCap);
    } else if(focus.id==='reception') {
      const dust=s.dust,samples=s.samples;assert.ok(E.packHarborNeed(s,t.serial));assert.equal(s.dust,dust-t.dustCost);assert.equal(s.samples,samples-t.samplesCost);
      assert.equal(E.packHarborNeed(s,t.serial),false);s=E.sanitize(s,s.lastAt);assert.deepEqual(s.management.active.plan,t.plan);
    } else {
      assert.ok(E.startMission(s,'belt'));assert.equal(s.mission.harborOrder,t.serial);
      E.advance(s,s.lastAt+s.mission.seconds*1000);s=E.sanitize(s,s.lastAt);assert.ok(E.claimMission(s));assert.equal(s.management.active.trips,1);
    }
    E.advance(s,s.lastAt+500000);const ready=E.harborStatus(s);assert.ok(ready.available);const dust=s.dust,samples=s.samples;
    assert.ok(E.deliverHarborNeed(s,t.serial));assert.equal(s.dust,dust-ready.dustLeft);assert.equal(s.samples,samples-ready.samplesLeft);assert.equal(E.deliverHarborNeed(s,t.serial),false);
    assert.equal(s.epilogue.ending,'city');assert.deepEqual(s.lore,require('./fixtures/v316-earned.json').city.lore);
  }
});
test('v3.19 all endings continue eight real deliveries and finite construction without injected resources',()=>{
  for(const ending of D.ENDINGS) {
    let s=E.sanitize(structuredClone(require('./fixtures/v316-earned.json')[ending.id]),1e15);E.configure(s,{enabled:false,dispatch:false});
    const start=s.clock;
    for(let i=0;i<8;i++) {
      E.setHarborFocus(s,D.HARBOR_FOCUSES[i%3].id);
      const missing=D.HARBOR_PROJECTS.filter(p=>!s.management.counts[p.need]);
      const offers=E.harborOffers(s),o=offers.find(n=>missing.some(p=>p.need===n.id))||offers[0];
      assert.ok(E.acceptHarborNeed(s,o.id,o.terms.serial));
      const t=s.management.active;
      if(t.focus==='reception') E.packHarborNeed(s,t.serial);
      if(t.focus==='exploration') {assert.ok(E.startMission(s,'belt'));E.advance(s,s.lastAt+s.mission.seconds*1000);assert.ok(E.claimMission(s));}
      E.advance(s,s.lastAt+Math.ceil(t.workSeconds+1)*1000,{offline:true});
      assert.ok(E.deliverHarborNeed(s,t.serial));
      for(const p of D.HARBOR_PROJECTS) {const o=E.harborProjectOffer(s,p.id);if(o.available) assert.ok(E.buildHarborProject(s,p.id,o.level));}
      s=E.sanitize(JSON.parse(JSON.stringify(s)),s.lastAt);
    }
    assert.equal(s.management.stats.deliveries,8);assert.ok(Object.values(s.management.projects).reduce((a,b)=>a+b,0)>=3);assert.equal(s.epilogue.ending,ending.id);
    console.log(`v3.19 earned ${ending.id}: 8 deliveries, ${Object.values(s.management.projects).reduce((a,b)=>a+b,0)} phases, ${s.clock-start}s, zero resource injection`);
  }
});
test('v3.19 legacy tasks stay unchanged; escrow and alternatives reject corrupt state; budget does not make decisions',()=>{
  for(const {state} of require('./fixtures/v316-saves.json').states) {
    const clean=E.sanitize(state,state.lastAt);if(clean.management.active) assert.equal(clean.management.active.plan,undefined);
  }
  const s=completed();E.setHarborFocus(s,'reception');const o=E.harborOffers(s)[0];E.acceptHarborNeed(s,o.id,o.terms.serial);E.packHarborNeed(s,o.terms.serial);
  const original=structuredClone(s);for(const patch of [{packedDust:1e100},{packedSamples:-1},{mode:'production'},{alternates:['fracture']},{careFactor:0},{workshopCap:1}]) {
    const bad=structuredClone(s);Object.assign(bad.management.active.plan,patch);const clean=E.sanitize(bad,bad.lastAt);assert.equal(clean.management.active,null);assert.equal(clean.dust,s.dust);assert.equal(clean.epilogue.ending,s.epilogue.ending);
  }
  assert.ok(E.reserveHarborNeed(s));E.advance(s,s.lastAt+8*3600000,{offline:true});assert.equal(s.management.cycle,original.management.cycle);assert.ok(s.management.active);
  assert.ok(E.harborSchedule(s).projects.every(p=>p.dustGap>=0 && p.samplesGap>=0));
});

function earnedLongterm(ending='city') {
  const s=E.sanitize(structuredClone(require('./fixtures/v316-earned.json')[ending]),1e15);
  E.configure(s,{enabled:false,research:false,dispatch:false});return s;
}
function investigateChain(s,id) {
  while(E.surveyCount(s,id)<3) {
    assert.ok(E.startSurvey(s,id,'safe',E.surveyCount(s,id)));
    E.advance(s,s.lastAt+s.atlas.active.seconds*1000,{offline:true});assert.ok(E.claimSurvey(s,s.atlas.active.token));
  }
}
function switchGear(s,ids) {
  for(const id of [...s.equipped]) if(!ids.includes(id)) assert.ok(E.equip(s,id));
  for(const id of ids) if(!s.equipped.includes(id)) assert.ok(E.equip(s,id));
}
for(const ending of D.ENDINGS) test(`v3.20 ${ending.title}: all three earned routes, four manual stages, refresh, eight-hour offline and repeat`,()=>{
  let s=earnedLongterm(ending.id);const lore=structuredClone(s.lore),start=s.clock;
  for(const chain of D.SECTORS) investigateChain(s,chain.id);
  for(const def of D.VOYAGES) {
    assert.ok(E.startVoyage(s,def.id));const token=s.expeditions.active.token;
    assert.equal(E.startVoyage(s,def.id),false);assert.equal(E.startMission(s,'belt'),false);assert.equal(E.startSurvey(s,'freight','safe',0),false);assert.equal(E.prestige(s),false);
    for(let stage=0;stage<4;stage++) {
      switchGear(s,stage===2?[def.module]:['nav','scanner']);
      const choice=['secure','recover','investigate','secure'][stage],p=E.voyagePreview(s,def.id,choice),dust=s.dust,samples=s.samples;
      assert.ok(p.available,p.reason);assert.equal(E.dispatchVoyageLeg(s,token,stage+1,choice),false);assert.ok(E.dispatchVoyageLeg(s,token,stage,choice));
      assert.equal(s.dust,dust-p.dustCost);assert.equal(s.samples,samples-p.costSamples);
      const lock=structuredClone(s.expeditions.active.leg);switchGear(s,[]);
      s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.expeditions.active.leg,lock);
      const other=structuredClone(s);E.configure(s,{dispatch:true});E.configure(other,{dispatch:true});
      E.advance(s,s.lastAt+8*3600000,{offline:true,report:true});for(let i=0;i<8;i++) E.advance(other,other.lastAt+3600000,{offline:true});
      assert.deepEqual(s,other,'offline splitting preserves production, locked voyage, RNG and ledger');
      assert.equal(s.expeditions.active.stage,stage);assert.deepEqual(s.expeditions.active.leg,lock);assert.equal(s.mission,null);
      assert.ok(E.claimVoyageLeg(s,token,stage));assert.equal(E.claimVoyageLeg(s,token,stage),false);
      assert.equal(s.expeditions.active.supplies,p.suppliesAfter);assert.equal(s.expeditions.active.insight,p.insightAfter);
    }
    const a=structuredClone(s.expeditions.active),dust=s.dust,samples=s.samples;
    assert.ok(E.finishVoyage(s,token));assert.equal(s.dust,dust+a.dust);assert.equal(s.samples,samples+a.samples+6);assert.equal(E.finishVoyage(s,token),false);
    assert.equal(s.expeditions.records[0].legs.length,4);assert.equal(s.expeditions.completed[def.id],1);
    s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.lore,lore);assert.equal(s.epilogue.ending,ending.id);
  }
  assert.ok(s.expeditions.collections.includes('three-addresses'));
  const def=D.VOYAGES[0];assert.ok(E.startVoyage(s,def.id));const token=s.expeditions.active.token;
  for(let stage=0;stage<4;stage++) {assert.ok(E.dispatchVoyageLeg(s,token,stage,'recover'));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000,{offline:true});assert.ok(E.claimVoyageLeg(s,token,stage));}
  const samples=s.samples,earned=s.expeditions.active.samples;assert.ok(E.finishVoyage(s,token));assert.equal(s.samples,samples+earned,'repeat has zero first-route bonus');
  assert.equal(s.expeditions.records[0].firstBonus,0);assert.equal(s.expeditions.completed.freight,2);assert.equal(new Set(s.expeditions.collections).size,s.expeditions.collections.length);
  assert.equal(s.epilogue.ending,ending.id);assert.deepEqual(s.lore,lore);
  console.log(`v3.20 earned ${ending.id}: 9 survey nodes, 3 complete routes + repeat, 16 manual legs, ${s.clock-start}s including twelve 8h absences; zero injected resources`);
});
test('v3.20 preflight formations and inherited supply/investigation have explicit bounded tradeoffs',()=>{
  const s=earnedLongterm();for(const c of D.SECTORS) investigateChain(s,c.id);
  for(const v of D.VOYAGES) {
    const before=JSON.stringify(s),options=D.VOYAGE_METHODS.map(m=>E.voyagePreview(s,v.id,m.id));assert.equal(JSON.stringify(s),before);
    assert.equal(new Set(options.map(p=>JSON.stringify([p.seconds,p.diversion,p.dust,p.samples,p.dustCost,p.costSamples,p.suppliesAfter,p.insightAfter]))).size,3);
    const nav=E.voyagePreview(s,v.id,'secure',['nav']),solar=E.voyagePreview(s,v.id,'secure',[]);assert.ok(nav.seconds<solar.seconds);
    const scanner=E.voyagePreview(s,v.id,'recover',['scanner']);assert.ok(scanner.dust>E.voyagePreview(s,v.id,'recover',[]).dust);
    assert.equal(E.voyagePreview(s,v.id,'investigate',[]).available,false);assert.ok(E.voyagePreview(s,v.id,'secure',[]).available);
  }
  assert.ok(E.startVoyage(s,'science'));const t=s.expeditions.active.token;const before=E.voyagePreview(s,'science','recover');
  assert.ok(E.dispatchVoyageLeg(s,t,0,'secure'));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);E.claimVoyageLeg(s,t,0);
  assert.equal(s.expeditions.active.supplies,2);const after=E.voyagePreview(s,'science','recover');assert.ok(after.suppliesBefore>before.suppliesBefore);assert.ok(after.seconds<Math.ceil(1200*1.12),'supplies remove the empty-reserve penalty');
});
test('v3.20 old saves get empty expeditions; malformed active legs and replay tokens cannot award rewards',()=>{
  const locked=earnedLongterm();assert.equal(E.startVoyage(locked,'freight'),false);investigateChain(locked,'freight');assert.ok(E.startVoyage(locked,'freight'));
  assert.ok(E.dispatchVoyageLeg(locked,locked.expeditions.active.token,0,'secure'));
  for(const patch of [{seconds:-1},{end:1},{dust:Infinity},{samples:100000},{costSamples:-1},{suppliesBefore:8},{choice:'__proto__'},{equipment:['constructor']},{levels:{nav:99}}]) {
    const s=structuredClone(locked);Object.assign(s.expeditions.active.leg,patch);const clean=E.sanitize(s,s.lastAt);
    assert.equal(clean.expeditions.active,null);assert.equal(clean.dust,s.dust);assert.equal(clean.samples,s.samples);assert.deepEqual(clean.epilogue,s.epilogue);assert.deepEqual(clean.lore,s.lore);
  }
  const poor=earnedLongterm();investigateChain(poor,'freight');assert.ok(E.startVoyage(poor,'freight'));poor.dust=0;const before=structuredClone(poor);
  assert.ok(E.voyageGoal(poor).eta>0);assert.match(E.voyageGoal(poor).detail,/星尘/);
  assert.equal(E.dispatchVoyageLeg(poor,poor.expeditions.active.token,0,'recover'),false);assert.deepEqual(poor,before);
  for(const {state} of require('./fixtures/v316-saves.json').states) assert.deepEqual(E.sanitize(state,state.lastAt).expeditions,{serial:0,settled:0,active:null,completed:{},collections:[],records:[],archives:{},best:{},dust:0,samples:0});
});
test('v3.20 every survey method settles its quoted effects and no infinite permanent multiplier is introduced',()=>{
  for(const method of D.SURVEY_METHODS) {
    const s=earnedLongterm(),beforeRate=E.rawRate(s),p=E.surveyPreview(s,'science',method.id),samples=s.samples;
    assert.ok(E.startSurvey(s,'science',method.id,0));E.advance(s,s.lastAt+p.seconds*1000);assert.ok(E.claimSurvey(s,s.atlas.active.token));
    assert.equal(s.samples,samples-p.costSamples+p.samples);assert.equal(s.atlas.nodes[0].dust,p.dust);assert.equal(E.rawRate(s),beforeRate);
  }
});
test('v3.20 permanent first archives survive recent-log rotation, first bonuses never repeat and rates do not stack',()=>{
  let s=earnedLongterm();investigateChain(s,'freight');const rate=E.rawRate(s);let first;
  for(let run=0;run<14;run++) {
    assert.ok(E.startVoyage(s,'freight'));const token=s.expeditions.active.token;
    for(let stage=0;stage<4;stage++) {assert.ok(E.dispatchVoyageLeg(s,token,stage,run===0?'secure':'recover'));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000,{offline:true});assert.ok(E.claimVoyageLeg(s,token,stage));}
    const before=s.samples,reward=s.expeditions.active.samples;assert.ok(E.finishVoyage(s,token));assert.equal(s.samples,before+reward+(run===0?6:0));
    if(run===0)first=structuredClone(s.expeditions.archives.freight);
    s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.expeditions.archives.freight,first);assert.equal(E.rawRate(s),rate);
  }
  assert.equal(s.expeditions.records.length,12);assert.equal(s.expeditions.completed.freight,14);assert.equal(s.expeditions.archives.freight.token,1);assert.ok(s.expeditions.collections.length<=13);
  const damaged=structuredClone(s);damaged.expeditions.completed={};const restored=E.sanitize(damaged,damaged.lastAt);assert.equal(restored.expeditions.completed.freight,1,'permanent first archive prevents a lost counter from replaying first reward');
});

test('v3.20 finite harbor phases benefit only future legs and saved formations stay within two slots',()=>{
  const s=earnedLongterm();for(const c of D.SECTORS) investigateChain(s,c.id);
  const base=E.voyagePreview(s,'freight','secure');
  // Actual deliveries and actual project payments, with no resource injection.
  for(let i=0;i<8;i++) {
    const missing=D.HARBOR_PROJECTS.filter(p=>!s.management.counts[p.need]),offers=E.harborOffers(s),o=offers.find(n=>missing.some(p=>p.need===n.id))||offers[0];
    E.acceptHarborNeed(s,o.id,o.terms.serial);E.advance(s,s.lastAt+500000);assert.ok(E.deliverHarborNeed(s,o.terms.serial));
    for(const p of D.HARBOR_PROJECTS) {const o=E.harborProjectOffer(s,p.id);if(o.available)assert.ok(E.buildHarborProject(s,p.id,o.level));}
  }
  const improved=E.voyagePreview(s,'freight','secure');assert.ok(improved.seconds<base.seconds);assert.ok(improved.diversion<base.diversion);assert.ok(improved.dustCost<base.dustCost);assert.ok(improved.suppliesBefore>base.suppliesBefore);
  assert.ok(E.startVoyage(s,'freight'));assert.ok(E.dispatchVoyageLeg(s,s.expeditions.active.token,0,'secure'));const locked=structuredClone(s.expeditions.active.leg);
  switchGear(s,['medbay']);E.saveLoadout(s,'production');switchGear(s,['nav','scanner']);E.saveLoadout(s,'voyage');assert.ok(E.applyLoadout(s,'production'));assert.ok(s.equipped.length<=2);assert.deepEqual(s.expeditions.active.leg,locked);
  assert.deepEqual(S.inspect(JSON.stringify(s),s.lastAt).state.expeditions.active.leg,locked);
});
test('v3.18 earliest atlas unlock is reachable through a fresh actual first run and three successful explorations',()=>{
  const s=require('./v3-balance.test.js').playRun('explore').state;
  assert.equal(s.rebirths,0);assert.equal(s.epilogue.ending,null);
  while(s.discoveries<3) {assert.ok(E.startMission(s,'belt'));E.advance(s,s.lastAt+s.mission.seconds*1000);assert.ok(E.claimMission(s));}
  const lore=structuredClone(s.lore);investigateChain(s,'freight');assert.equal(E.surveyCount(s,'freight'),3);assert.deepEqual(s.lore,lore);assert.equal(E.startVoyage(s,'freight'),false,'permanent ending remains required for long voyages');
  assert.ok(E.prestige(s));assert.equal(E.surveyCount(s,'freight'),3);
});

console.log(`v3 expansion ok: ${checks} behavioral checks`);
