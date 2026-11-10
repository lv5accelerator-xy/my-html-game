'use strict';
const assert=require('node:assert/strict'),E=require('../v3/engine.js'),D=require('../v3/data.js'),S=require('../v3/storage.js'),F=require('./fixtures/v324-saves.json');let checks=0,quotes=0,frontier=Infinity;
const test=(name,fn)=>{fn();console.log(`ok ${++checks} - ${name}`);};
const base=()=>E.sanitize(structuredClone(F.states.find(x=>x.name==='city-v324-mature').state),0);
const gear=D.MODULES.map(x=>x.id),fits=[[],...gear.map(x=>[x])];for(let i=0;i<gear.length;i++)for(let j=i+1;j<gear.length;j++)fits.push([gear[i],gear[j]]);
const dominates=(a,b)=>{const x=[a.seconds,a.diversion,a.dustCost,-(a.dust-a.dustCost),-(a.samples-a.costSamples)],y=[b.seconds,b.diversion,b.dustCost,-(b.dust-b.dustCost),-(b.samples-b.costSamples)];return x.every((v,i)=>v<=y[i])&&x.some((v,i)=>v<y[i]);};
for(const route of D.VOYAGES)test(`v3.27 ${route.id}: six real successive conditions, all equipment/policies, fixed snapshot and finite repeat rewards`,()=>{
 let s=base();for(const id of gear)while((s.modules[id]||0)<3)assert.ok(E.buildModule(s,id));const seen=new Set(),archives=structuredClone(s.expeditions.archives),initialSamples=s.samples;
 for(let run=0;run<6;run++){
  const condition=E.voyageCondition(s,route.id);seen.add(condition.id);const before=structuredClone(s);assert.equal(E.voyageCondition(S.inspect(JSON.stringify(s),s.lastAt).state,route.id).id,condition.id);assert.deepEqual(s,before);
  for(const focus of D.HARBOR_FOCUSES){E.setHarborFocus(s,focus.id);for(const method of D.VOYAGE_METHODS){const ps=fits.map(f=>E.voyagePreview(s,route.id,method.id,f));for(const q of ps){for(const key of ['seconds','diversion','dustCost','dust','samples'])assert.ok(Number.isFinite(q[key]));assert.ok(q.seconds>=120&&q.seconds<=4000);assert.ok(q.diversion>=.04&&q.diversion<=.4);assert.ok(q.samples<=20);quotes++;}const legal=ps.filter(p=>p.available),front=legal.filter(p=>!legal.some(q=>dominates(q,p)));assert.ok(front.length>=2,`${condition.id}/${focus.id}/${method.id} meaningful tradeoffs`);frontier=Math.min(frontier,front.length);}}
  assert.ok(E.startVoyage(s,route.id));const token=s.expeditions.active.token;assert.equal(s.expeditions.active.condition,condition.id);
  for(let stage=0;stage<4;stage++){const p=E.voyagePreview(s,route.id,'secure');assert.ok(E.dispatchVoyageLeg(s,token,stage,'secure'));const locked=structuredClone(s.expeditions.active.leg);assert.equal(locked.seconds,p.seconds);assert.equal(locked.condition,condition.id);E.setHarborFocus(s,s.management.focus==='production'?'reception':'production');for(const id of [...s.equipped])E.equip(s,id);E.equip(s,run%2?'solar':'battery');assert.deepEqual(s.expeditions.active.leg,locked);s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.expeditions.active.leg,locked);E.advance(s,s.lastAt+86400000,{offline:true});assert.deepEqual(s.expeditions.active.leg,locked);assert.equal(s.expeditions.active.stage,stage);assert.ok(E.claimVoyageLeg(s,token,stage));assert.equal(E.claimVoyageLeg(s,token,stage),false);}
  const samples=s.samples;assert.ok(E.finishVoyage(s,token));const r=s.expeditions.records[0];assert.equal(r.firstBonus,0);assert.equal(r.condition,condition.id);assert.equal(s.samples,samples+r.samples);assert.equal(E.finishVoyage(s,token),false);assert.deepEqual(E.sanitize(s,s.lastAt),s);assert.deepEqual(s.expeditions.archives,archives);
 }
 assert.equal(seen.size,6);assert.ok(s.samples<=initialSamples+6*80);assert.equal(s.expeditions.records.length,12,'bounded recent history retains existing count');
});
test('v3.27 all schedules have measurable costs/benefits, accepted demand terms remain frozen',()=>{
 const s=base(),offer=E.harborOffers(s)[0];E.acceptHarborNeed(s,offer.id,offer.terms.serial);const terms=structuredClone(s.management.active),qs={};for(const f of D.HARBOR_FOCUSES){E.setHarborFocus(s,f.id);qs[f.id]=E.voyagePreview(s,'freight');assert.deepEqual(s.management.active,terms);}assert.ok(qs.production.dustCost<qs.reception.dustCost);assert.ok(qs.exploration.seconds<qs.production.seconds);assert.ok(qs.reception.samples>qs.production.samples);assert.ok(qs.reception.diversion<qs.production.diversion);
});
test('v3.27 itinerary quote uses the same next condition and preserves old-rule active voyages',()=>{
 let s=base(),steps=Array.from({length:4},()=>({choice:'secure',equipment:[...s.equipped]}));assert.ok(E.saveItinerary(s,'freight',steps));const q=E.itineraryOffer(s,'freight',s.continuation.plans.freight.steps);assert.ok(E.startItinerary(s,'freight'));for(let stage=0;stage<4;stage++){assert.equal(s.expeditions.active.leg.seconds,q.quotes[stage].seconds);assert.equal(s.expeditions.active.leg.dustCost,q.quotes[stage].dustCost);E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.advanceItinerary(s,s.expeditions.active.token,stage));}
 for(const {state} of F.states.filter(x=>x.name.endsWith('-paid'))){let old=E.sanitize(structuredClone(state),state.lastAt);assert.deepEqual(old,state);assert.equal(E.voyageCondition(old,'freight'),undefined);const leg=structuredClone(old.expeditions.active.leg);E.setHarborFocus(old,'reception');E.advance(old,old.lastAt+86400000,{offline:true});assert.deepEqual(old.expeditions.active.leg,leg);assert.ok(E.claimVoyageLeg(old,old.expeditions.active.token,0));}
});
test('v3.27 malformed conditions or dispatch policies are rejected without refund or first-award reset',()=>{const s=base();assert.ok(E.startVoyage(s,'freight'));assert.ok(E.dispatchVoyageLeg(s,s.expeditions.active.token,0,'secure'));for(const patch of [{condition:'constructor'},{schedule:'constructor'}]){const bad=structuredClone(s);Object.assign(bad.expeditions.active.leg,patch);const clean=E.sanitize(bad,bad.lastAt);assert.equal(clean.expeditions.active,null);assert.equal(clean.dust,bad.dust);assert.deepEqual(clean.expeditions.completed,bad.expeditions.completed);assert.deepEqual(clean.epilogue,bad.epilogue);}});
test('v3.28 null voyage legs are discarded without blocking recovery, refunding costs or replaying permanent awards',()=>{
 const fixtures=require('./fixtures/v327-saves.json');
 for(const ending of D.ENDINGS)for(const location of ['active','record','archive']){
  const s=structuredClone(fixtures.states.find(x=>x.name===ending.id+'-v327-'+(location==='active'?'paid':'complete')).state);
  const originalArchive=structuredClone(s.expeditions.archives.freight);
  const run=location==='active'?s.expeditions.active:location==='record'?s.expeditions.records[0]:s.expeditions.archives.freight;
  run.legs=[null];if(location==='active'){run.leg=null;run.stage=1;}
  const clean=S.inspect(JSON.stringify(s),s.lastAt).state;
  assert.equal(clean.dust,s.dust,'already paid costs are not refunded');assert.equal(clean.samples,s.samples);
  for(const key of ['epilogue','lore','modules','loadouts','management','continuation'])assert.deepEqual(clean[key],s[key],key+' survives damaged voyage');
  for(const key of ['serial','settled','completed','collections'])assert.deepEqual(clean.expeditions[key],s.expeditions[key],key+' once-only proof survives');
  if(location==='active')assert.equal(clean.expeditions.active,null);
  if(location==='record')assert.equal(clean.expeditions.records.some(r=>r.token===run.token),false);
  if(location==='archive')assert.deepEqual(clean.expeditions.archives.freight,originalArchive,'valid first-voyage receipt repairs the damaged archive immediately');
  assert.deepEqual(E.sanitize(clean,clean.lastAt),clean);
 }
});
console.log(`v3 conditions ok: ${checks} behavioral checks; ${quotes} bounded condition/fit/schedule quotes; minimum ${frontier} non-dominated alternatives`);
