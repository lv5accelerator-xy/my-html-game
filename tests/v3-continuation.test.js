'use strict';
const assert=require('node:assert/strict'),E=require('../v3/engine.js'),D=require('../v3/data.js'),S=require('../v3/storage.js');
const saves=require('./fixtures/v320-saves.json');let checks=0;
const test=(name,fn)=>{fn();console.log(`ok ${++checks} - ${name}`);};
function veteran(ending='city'){
 const raw=structuredClone(saves.states.find(x=>x.name===ending+'-three-archives').state),s=E.sanitize(raw,raw.lastAt),event=E.encounterOffer(s);
 if(event){const choice=event.choices.find(c=>c.costSamples===0);assert.ok(E.chooseEncounter(s,event.token,choice.id));if(s.encounters.pending)E.advance(s,s.lastAt+Math.max(0,s.encounters.pending.readyAt-s.clock)*1000);}
 return s;
}
function equip(s,items){for(const id of [...s.equipped])assert.ok(E.equip(s,id));for(const id of items)assert.ok(E.equip(s,id));}
function steps(s,id){const def=D.VOYAGES.find(v=>v.id===id),gear=def.module==='nav'?['nav','scanner']:['nav',def.module];equip(s,gear);return ['secure','recover','investigate','secure'].map(choice=>({choice,equipment:[...gear]}));}
for(const ending of D.ENDINGS) for(const route of D.VOYAGES) test(`v3.21 ${ending.id}/${route.id}: five real confirmations equal manual costs/rewards, locked archives and resumable plans`,()=>{
 let s=veteran(ending.id);const plan=steps(s,route.id),archives=structuredClone(s.expeditions.archives);
 assert.ok(E.saveItinerary(s,route.id,plan));const offer=E.itineraryOffer(s,route.id,s.continuation.plans[route.id].steps),manual=structuredClone(s);
 assert.ok(E.startItinerary(s,route.id));assert.ok(E.startVoyage(manual,route.id));assert.ok(E.dispatchVoyageLeg(manual,manual.expeditions.active.token,0,plan[0].choice));
 let confirmations=1;
 for(let stage=0;stage<4;stage++){
  assert.equal(s.expeditions.active.leg.seconds,offer.quotes[stage].seconds);assert.equal(s.expeditions.active.leg.dustCost,offer.quotes[stage].dustCost);
  const ms=s.expeditions.active.leg.seconds*1000;E.advance(s,s.lastAt+ms);E.advance(manual,manual.lastAt+ms);
  assert.equal(s.expeditions.active.stage,stage,'waiting never advances chosen stage');
  s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(E.sanitize(s,s.lastAt),s);
  const token=s.expeditions.active.token;assert.ok(E.advanceItinerary(s,token,stage));confirmations++;
  assert.ok(E.claimVoyageLeg(manual,token,stage));if(stage<3)assert.ok(E.dispatchVoyageLeg(manual,token,stage+1,plan[stage+1].choice));else assert.ok(E.finishVoyage(manual,token));
  const before=structuredClone(s);assert.equal(E.advanceItinerary(s,token,stage),false);assert.deepEqual(s,before,'double click never changes state');
 }
 assert.equal(confirmations,5);assert.deepEqual(s,manual);assert.deepEqual(s.expeditions.archives,archives);assert.equal(s.expeditions.records[0].firstBonus,0);
});
test('v3.21 pending discoveries require the player before a saved itinerary can depart',()=>{
 const raw=structuredClone(saves.states.find(x=>x.name==='city-three-archives').state),s=E.sanitize(raw,raw.lastAt),p=steps(s,'freight');
 assert.ok(E.encounterOffer(s));assert.ok(E.saveItinerary(s,'freight',p));const before=structuredClone(s);
 assert.equal(E.startItinerary(s,'freight'),false);assert.deepEqual(s,before);
});
test('v3.21 missing fees pause atomically, preserve ready leg, then allow deliberate resume',()=>{
 const s=veteran(),p=steps(s,'freight');assert.ok(E.saveItinerary(s,'freight',p));assert.ok(E.startItinerary(s,'freight'));
 E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);s.dust=0;const old=structuredClone(s.expeditions),samples=s.samples;
 assert.equal(E.advanceItinerary(s,s.expeditions.active.token,0),false);assert.deepEqual(s.expeditions,old);assert.equal(s.samples,samples);assert.equal(s.continuation.sequence.paused,true);assert.match(E.itineraryStatus(s).reason,/星尘/);
 E.scan(s);E.advance(s,s.lastAt+1000);assert.ok(E.pauseItinerary(s,s.expeditions.active.token,true));assert.ok(E.advanceItinerary(s,s.expeditions.active.token,0));
});
test('v3.21 changed equipment pauses without changing locked results and explicit restore resumes',()=>{
 const s=veteran(),p=steps(s,'science');E.saveItinerary(s,'science',p);E.startItinerary(s,'science');const locked=structuredClone(s.expeditions.active.leg);
 equip(s,['medbay']);E.advance(s,s.lastAt+locked.seconds*1000);assert.equal(E.advanceItinerary(s,s.expeditions.active.token,0),false);assert.deepEqual(s.expeditions.active.leg,locked);
 assert.ok(E.restoreItineraryEquipment(s,s.expeditions.active.token));assert.ok(E.pauseItinerary(s,s.expeditions.active.token,true));assert.ok(E.advanceItinerary(s,s.expeditions.active.token,0));
});
test('v3.21 eight-hour offline cap never chooses/claims; pausing and stopping retain paid voyage',()=>{
 let s=veteran(),p=steps(s,'beacon');E.saveItinerary(s,'beacon',p);E.startItinerary(s,'beacon');const seq=structuredClone(s.continuation.sequence),leg=structuredClone(s.expeditions.active.leg),before=s.clock;
 E.advance(s,s.lastAt+9*86400000,{offline:true});assert.equal(s.clock-before,28800);assert.equal(s.expeditions.active.stage,0);assert.deepEqual(s.expeditions.active.leg,leg);assert.deepEqual(s.continuation.sequence,seq);
 s=E.sanitize(s,s.lastAt);assert.deepEqual(s.continuation.sequence,seq);assert.ok(E.pauseItinerary(s,seq.token));assert.equal(E.advanceItinerary(s,seq.token,0),false);assert.ok(E.stopItinerary(s,seq.token));assert.deepEqual(s.expeditions.active.leg,leg);assert.ok(E.claimVoyageLeg(s,seq.token,0));
});
test('v3.21 malformed/first-run plans and stale tokens cannot acquire authorization or remove old progress',()=>{
 const s=veteran(),p=steps(s,'freight');const old=structuredClone(s);assert.equal(E.saveItinerary(s,'constructor',p),false);assert.deepEqual(s,old);assert.equal(E.saveItinerary(s,'freight',[...p,p[0]]),false);
 E.saveItinerary(s,'freight',p);E.startItinerary(s,'freight');const locked=structuredClone(s.expeditions.active),bad=structuredClone(s);bad.continuation.sequence.token--;
 const clean=E.sanitize(bad,bad.lastAt);assert.equal(clean.continuation.sequence,null);assert.deepEqual(clean.expeditions.active,locked);
 const another=p.map(x=>({...x,choice:'secure'})),seq=structuredClone(s.continuation.sequence);assert.ok(E.saveItinerary(s,'freight',another));assert.deepEqual(s.continuation.sequence,seq);
 const first=E.sanitize(structuredClone(saves.states.find(x=>x.name==='city-nine-nodes').state),0);const original=structuredClone(first);assert.equal(E.saveItinerary(first,'freight',p),false);assert.deepEqual(first,original);
});
test('v3.21 a different next-leg loadout can be prepared during flight without changing the paid leg',()=>{
 const s=veteran(),p=steps(s,'freight');p[1].equipment=['nav','medbay'];E.saveItinerary(s,'freight',p);E.startItinerary(s,'freight');const leg=structuredClone(s.expeditions.active.leg);
 assert.ok(E.restoreItineraryEquipment(s,s.expeditions.active.token));assert.deepEqual(s.equipped,p[1].equipment);assert.deepEqual(s.expeditions.active.leg,leg);
 E.advance(s,s.lastAt+leg.seconds*1000);assert.ok(E.advanceItinerary(s,s.expeditions.active.token,0));assert.deepEqual(s.expeditions.active.leg.equipment,p[1].equipment);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.21 saved plans persist across jump without replaying first-voyage awards',()=>{
 const s=veteran(),p=steps(s,'freight');E.saveItinerary(s,'freight',p);const before=structuredClone(s.continuation),archives=structuredClone(s.expeditions.archives),samples=s.samples;
 assert.ok(E.prestige(s));assert.deepEqual(s.continuation,before);assert.deepEqual(s.expeditions.archives,archives);assert.equal(s.samples,samples);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});

function reviewed(ending='city') {const s=veteran(ending);for(const d of D.REVIEWS){assert.ok(E.startReview(s,d.id,'safe',s.continuation.reviews.serial+1));E.advance(s,s.lastAt+s.continuation.reviews.active.seconds*1000);assert.ok(E.claimReview(s,s.continuation.reviews.active.token));}return s;}
let reviewProgress=veteran();
for(const def of D.REVIEWS) test(`v3.22 ${def.id}: all three methods, frozen results, eight-hour recovery and one reward`,()=>{
 let carry;
 for(const method of D.REVIEW_METHODS){let s=structuredClone(reviewProgress);s.encounters.catalog=[];s.encounters.history=[];const q=E.reviewPreview(s,def.id,method.id),dust=s.dust,samples=s.samples;assert.ok(q.available);assert.equal(q.evidence.length,0,'missing old discoveries never lock progress');
  assert.ok(E.startReview(s,def.id,method.id,s.continuation.reviews.serial+1));assert.equal(s.dust,dust-q.dustCost);assert.equal(s.samples,samples-q.costSamples);assert.equal(E.startMission(s,'belt'),false);assert.equal(E.startSurvey(s,def.chain,'safe',3),false);assert.equal(E.startVoyage(s,'freight'),false);assert.equal(E.prestige(s),false);
  const locked=structuredClone(s.continuation.reviews.active);s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.continuation.reviews.active,locked);
  const clock=s.clock;E.advance(s,s.lastAt+86400000,{offline:true});assert.equal(s.clock-clock,28800);assert.deepEqual(s.continuation.reviews.active,locked);assert.equal(E.claimReview(s,locked.token+1),false);const now=s.dust;assert.ok(E.claimReview(s,locked.token));assert.equal(s.dust,now+q.dust);assert.equal(s.samples,samples-q.costSamples+q.samples);assert.equal(E.claimReview(s,locked.token),false);assert.deepEqual(E.sanitize(s,s.lastAt),s);carry=s;
 }
 reviewProgress=carry;
});
for(const def of D.REVIEWS) test(`v3.22 ${def.id}: one matching first-leg permit, exact preview, locked snapshot and no reuse`,()=>{
 let s=reviewed(),route=D.VOYAGES.find(v=>v.chain===def.chain),base=E.voyagePreview(s,route.id);assert.ok(E.selectVoyageSupport(s,def.id));const preview=E.voyagePreview(s,route.id);assert.equal(preview.support,def.id);
 if(def.kind==='time')assert.ok(preview.seconds<base.seconds);if(def.kind==='cost')assert.ok(preview.dustCost<base.dustCost);if(def.kind==='samples')assert.equal(preview.samples,base.samples+1);
 assert.ok(E.startVoyage(s,route.id));assert.equal(s.continuation.reviews.used.length,0);assert.equal(E.selectVoyageSupport(s,null),false);assert.ok(E.dispatchVoyageLeg(s,s.expeditions.active.token,0,'secure'));
 const paid=structuredClone(s.expeditions.active.leg);assert.equal(paid.seconds,preview.seconds);assert.equal(paid.dustCost,preview.dustCost);assert.equal(paid.samples,preview.samples);assert.ok(s.continuation.reviews.used.includes(def.id));assert.equal(s.continuation.reviews.uses.length,1);
 s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.expeditions.active.leg,paid);assert.deepEqual(E.sanitize(s,s.lastAt),s);
 for(let stage=0;stage<4;stage++){if(stage){assert.equal(E.voyagePreview(s,route.id).support,null);assert.ok(E.dispatchVoyageLeg(s,s.expeditions.active.token,stage,'secure'));}E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.claimVoyageLeg(s,s.expeditions.active.token,stage));}
 assert.ok(E.finishVoyage(s,s.expeditions.active.token));assert.equal(s.continuation.reviews.aid,null);assert.equal(E.selectVoyageSupport(s,def.id),false);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.22 nine archives are finite; reward-free practice keeps permits, atlas and permanent endings',()=>{
 const s=reviewed('watch'),prior=structuredClone(s.continuation.reviews.records),atlas=structuredClone(s.atlas),ending=structuredClone(s.epilogue),samples=s.samples;
 const p=E.reviewPreview(s,D.REVIEWS[0].id);assert.equal(p.practice,true);assert.equal(p.dust,0);assert.equal(p.dustCost,0);assert.equal(p.samples,0);assert.ok(E.startReview(s,D.REVIEWS[0].id,'safe',s.continuation.reviews.serial+1));E.advance(s,s.lastAt+p.seconds*1000);E.claimReview(s,s.continuation.reviews.active.token);assert.equal(s.samples,samples);assert.deepEqual(s.continuation.reviews.records,prior);assert.deepEqual(s.atlas,atlas);assert.deepEqual(s.epilogue,ending);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.22 stale/illegal snapshots and double departure cannot duplicate fees, records or permissions',()=>{
 const s=veteran(),d=D.REVIEWS[0],before=structuredClone(s);assert.equal(E.startReview(s,'constructor','safe',1),false);assert.equal(E.startReview(s,d.id,'constructor',1),false);assert.deepEqual(s,before);
 assert.ok(E.startReview(s,d.id,'safe',1));const paid=structuredClone(s);assert.equal(E.startReview(s,d.id,'safe',1),false);assert.deepEqual(s,paid);const bad=structuredClone(s);bad.continuation.reviews.active.samples++;const clean=E.sanitize(bad,bad.lastAt);assert.equal(clean.continuation.reviews.active,null);assert.deepEqual(clean.expeditions,bad.expeditions);assert.equal(clean.dust,bad.dust,'damaged state never refunds unverifiable costs');
 const late=reviewed();const first=D.REVIEWS[0].id;late.continuation.reviews.used.push(first);late.continuation.reviews.selected=first;assert.equal(E.sanitize(late,late.lastAt).continuation.reviews.selected,null);
});
test('v3.22 a damaged archive retains its first-claim marker and cannot replay its reward',()=>{
 const s=reviewed(),id=D.REVIEWS[0].id;const bad=structuredClone(s);bad.continuation.reviews.records[0].samples=999;
 const current=E.sanitize(bad,bad.lastAt);assert.equal(E.reviewDone(current,id),true);assert.equal(E.reviewPreview(current,id).practice,true);assert.equal(E.reviewPreview(current,id).samples,0);assert.deepEqual(E.sanitize(current,current.lastAt),current);
});
test('v3.22 a partially surveyed atlas cannot start another real survey while reviewing',()=>{
 const raw=require('./fixtures/v316-earned.json').city,s=E.sanitize(structuredClone(raw),raw.lastAt);E.configure(s,{enabled:false,research:false,dispatch:false});
 while(E.surveyCount(s,'freight')<3){E.startSurvey(s,'freight','safe',E.surveyCount(s,'freight'));E.advance(s,s.lastAt+s.atlas.active.seconds*1000);E.claimSurvey(s,s.atlas.active.token);}
 assert.equal(E.surveyPreview(s,'science').available,true);assert.ok(E.startReview(s,D.REVIEWS[0].id,'safe',1));assert.equal(E.surveyPreview(s,'science').available,false);assert.equal(E.startSurvey(s,'science','safe',0),false);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.22 a saved four-leg plan consumes exactly one permit and restores its paid snapshot',()=>{
 let s=reviewed(),plan=steps(s,'freight');assert.ok(E.saveItinerary(s,'freight',plan));assert.ok(E.selectVoyageSupport(s,D.REVIEWS[0].id));const p=E.itineraryOffer(s,'freight',s.continuation.plans.freight.steps);
 assert.ok(E.startItinerary(s,'freight'));assert.equal(s.expeditions.active.leg.seconds,p.quotes[0].seconds);assert.equal(s.continuation.reviews.used.length,1);
 s=S.inspect(JSON.stringify(s),s.lastAt).state;
 for(let stage=0;stage<4;stage++){E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.advanceItinerary(s,s.expeditions.active.token,stage));}
 assert.equal(s.continuation.reviews.used.length,1);assert.equal(s.continuation.reviews.uses.length,1);assert.equal(s.continuation.sequence,null);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
const mature=require('./helpers/community-fixture.cjs'),prepared={};
for(const ending of D.ENDINGS) prepared[ending.id]=mature(E,saves.states.find(x=>x.name===ending.id+'-three-archives').state);
for(const ending of D.ENDINGS) for(const focus of D.HARBOR_FOCUSES) test(`v3.23 ${ending.id}/${focus.id}: all nine letters, paid production and actual supply paths, fixed terms, migration and one delivery`,()=>{
 let s=structuredClone(prepared[ending.id]);const epilogue=structuredClone(s.epilogue),beforeRate=E.rawRate(s);
 E.setHarborFocus(s,focus.id);
 for(const d of D.COMMUNITY_STORIES){
  const q=E.communityOffer(s,d.id);assert.ok(q.available,q.reason);assert.ok(E.acceptCommunity(s,d.id,q.serial));assert.equal(E.acceptCommunity(s,d.id,q.serial),false);
  const locked=structuredClone(s.continuation.community.active);E.setHarborFocus(s,focus.id==='production'?'reception':'production');assert.equal(s.continuation.community.active.mode,locked.mode);E.setHarborFocus(s,focus.id);
  s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.continuation.community.active,locked);
  if(focus.id==='reception'){const dust=s.dust,samples=s.samples;assert.ok(E.packCommunity(s,q.serial));assert.equal(s.dust,dust-q.dustCost);assert.equal(s.samples,samples-q.samplesCost);assert.equal(E.packCommunity(s,q.serial),false);}
  // Both routes use exactly this already accepted snapshot and pay exactly once.
  let active=structuredClone(s);assert.ok(E.setCommunityPath(active,q.serial,'exploration'));
  while(!E.communityStatus(active).tripReady){const id=active.continuation.community.active.routes[0];assert.ok(E.startMission(active,id));active=S.inspect(JSON.stringify(active),active.lastAt).state;assert.equal(active.mission.communityOrder,q.serial);E.advance(active,active.lastAt+active.mission.seconds*1000);const old=active.continuation.community.active.trips;assert.ok(E.claimMission(active,active.result.story?D.STORIES[active.result.story].choices[0].id:undefined));assert.equal(active.continuation.community.active.trips,old+1);assert.equal(E.claimMission(active),false);const event=E.encounterOffer(active);if(event&&!event.choice){assert.ok(E.chooseEncounter(active,event.token,event.choices.find(c=>!c.costSamples).id));if(active.encounters.pending)E.advance(active,active.lastAt+Math.max(0,active.encounters.pending.readyAt-active.clock)*1000);}}
  assert.ok(E.communityStatus(active).available);assert.ok(E.deliverCommunity(active,q.serial));assert.equal(active.continuation.community.records.at(-1).path,'exploration');assert.equal(E.deliverCommunity(active,q.serial),false);
  const clock=s.clock;E.advance(s,s.lastAt+86400000,{offline:true});assert.equal(s.clock-clock,28800);const ready=E.communityStatus(s),dust=s.dust,samples=s.samples;assert.ok(ready.available);assert.ok(E.deliverCommunity(s,q.serial));assert.equal(s.dust,dust-ready.dustLeft);assert.equal(s.samples,samples-ready.samplesLeft);const complete=structuredClone(s);assert.equal(E.deliverCommunity(s,q.serial),false);assert.deepEqual(s,complete);assert.equal(E.communityOffer(s,d.id).available,false);assert.deepEqual(E.sanitize(s,s.lastAt),s);
 }
 assert.equal(s.continuation.community.completed.length,9);assert.equal(s.continuation.community.records.length,9);assert.deepEqual(s.epilogue,epilogue);assert.equal(E.rawRate(s),beforeRate);assert.ok(s.samples>=0);
});
test('v3.23 gated stages, unknown state, late focus changes, damaged letters and finite escrow are safe',()=>{
 const s=veteran(),first=D.COMMUNITY_STORIES[0],later=D.COMMUNITY_STORIES[1];assert.equal(E.communityOffer(s,later.id).available,false);assert.equal(E.communityOffer(s,'constructor'),null);assert.equal(E.acceptCommunity(s,first.id,99),false);
 E.setHarborFocus(s,'reception');assert.ok(E.acceptCommunity(s,first.id,1));const empty=structuredClone(s);empty.dust=0;empty.samples=0;assert.equal(E.packCommunity(empty,1),false);assert.equal(E.deliverCommunity(empty,1),false);assert.equal(E.setCommunityPath(s,1,'invalid'),false);
 let bad=structuredClone(s);bad.continuation.community.active.packedDust=1e100;assert.equal(E.sanitize(bad,bad.lastAt).continuation.community.active,null);
 const full=structuredClone(prepared.city);E.acceptCommunity(full,first.id,1);E.advance(full,full.lastAt+3600000);assert.ok(E.deliverCommunity(full,1));bad=structuredClone(full);bad.continuation.community.records=[];const restored=E.sanitize(bad,bad.lastAt);assert.deepEqual(restored.continuation.community.completed,[first.id]);assert.equal(E.communityOffer(restored,first.id).available,false);assert.deepEqual(E.sanitize(restored,restored.lastAt),restored);
});
test('v3.23 all three management directions have a measurable advantage and accepted work does not change',()=>{
 const s=structuredClone(prepared.city),id=D.COMMUNITY_STORIES[0].id,p=E.communityOffer(s,id,'production'),r=E.communityOffer(s,id,'reception'),x=E.communityOffer(s,id,'exploration');
 assert.ok(p.dustCost<r.dustCost&&p.dustCost<x.dustCost);assert.ok(r.samplesCost<p.samplesCost&&r.samplesCost<x.samplesCost);assert.ok(x.tripsRequired<p.tripsRequired&&x.tripsRequired<r.tripsRequired);assert.ok(x.routes.length>p.routes.length);
 E.setHarborFocus(s,'reception');E.acceptCommunity(s,id,1);E.packCommunity(s,1);assert.ok(E.communityStatus(s).secondsLeft<p.workSeconds,'prepacked reception is faster for unattended play');const accepted=structuredClone(s.continuation.community.active);E.setHarborFocus(s,'exploration');assert.deepEqual(s.continuation.community.active,accepted);
});
test('v3.23 a pre-existing flight cannot retroactively fulfill a new community request',()=>{
 const s=structuredClone(prepared.city);E.startMission(s,'garden');E.acceptCommunity(s,'meals-1',1);E.advance(s,s.lastAt+s.mission.seconds*1000);E.claimMission(s);assert.equal(s.continuation.community.active.trips,0);
 const a=s.continuation.community.active;assert.equal(E.setCommunityPath(s,a.serial,'exploration'),true);assert.equal(E.deliverCommunity(s,a.serial),false);
});


test('v3.23 only complete voyages arranged after acceptance count, never stage reports or old flights',()=>{
 const s=structuredClone(prepared.city);assert.ok(E.startVoyage(s,'freight'));assert.ok(E.acceptCommunity(s,'workshop-1',1));
 const finish=()=>{const a=s.expeditions.active;for(let stage=0;stage<4;stage++){assert.ok(E.dispatchVoyageLeg(s,a.token,stage,'secure'));E.advance(s,s.lastAt+a.leg.seconds*1000);assert.ok(E.claimVoyageLeg(s,a.token,stage));}return a.token;};
 let token=finish();assert.ok(E.finishVoyage(s,token));assert.equal(s.continuation.community.active.trips,0,'same-clock earlier voyage was not authorized');
 assert.ok(E.startVoyage(s,'freight'));token=finish();assert.equal(s.continuation.community.active.trips,0,'four partial reports do not count a complete delivery');assert.ok(E.finishVoyage(s,token));assert.equal(s.continuation.community.active.trips,1);assert.equal(E.finishVoyage(s,token),false);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.23 interleaved resident groups retain chronological receipts across restoration and jump',()=>{
 let s=structuredClone(prepared.city);for(const id of ['signals-1','meals-1','workshop-1']){const q=E.communityOffer(s,id);assert.ok(E.acceptCommunity(s,id,q.serial));E.advance(s,s.lastAt+3600000);assert.ok(E.deliverCommunity(s,q.serial));assert.deepEqual(E.sanitize(s,s.lastAt),s);}
 assert.deepEqual(s.continuation.community.completed,['signals-1','meals-1','workshop-1']);const snapshot=structuredClone(s.continuation.community);assert.ok(E.prestige(s));assert.deepEqual(s.continuation.community,snapshot);
});

const honorReady=require('./helpers/honors-fixture.cjs');
for(const ending of D.ENDINGS)test(`v3.24 ${ending.id}: all twelve honors earned through existing paid systems, explicit finite claims, archive proofs and save restoration`,()=>{
 let s=honorReady(E,saves.states.find(x=>x.name===ending.id+'-three-archives').state),permanent=structuredClone(s.epilogue);
 assert.equal(s.continuation.honors.claimed.length,0,'eligibility never auto-claims old progress');
 for(const def of D.HONORS){const q=E.honorOffer(s,def.id);assert.ok(q.available,def.id);const dust=s.dust,samples=s.samples,rate=E.rawRate(s);assert.ok(E.claimHonor(s,def.id));assert.equal(E.claimHonor(s,def.id),false);assert.equal(s.dust,dust);assert.equal(s.samples,samples);assert.equal(E.rawRate(s),rate);s=S.inspect(JSON.stringify(s),s.lastAt).state;}
 assert.equal(s.continuation.honors.claimed.length,12);assert.deepEqual(s.epilogue,permanent);const all=structuredClone(s.continuation.honors);assert.ok(E.prestige(s));assert.deepEqual(s.continuation.honors,all);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.24 honors reject invented history, unknown IDs, premature rewards and unproved imported claims',()=>{
 const s=E.createState(0);for(const d of D.HONORS)assert.equal(E.claimHonor(s,d.id),false);assert.equal(E.honorOffer(s,'constructor'),null);assert.equal(E.claimHonor(s,'constructor'),false);
 const old=veteran();old.continuation.honors.claimed=D.HONORS.map(d=>d.id);const restored=E.sanitize(old,old.lastAt);assert.deepEqual(restored.continuation.honors.claimed,D.HONORS.filter(d=>E.honorProgress(old,d.id)>=d.target).map(d=>d.id));assert.equal(restored.continuation.honors.claimed.includes('life-all'),false);assert.equal(E.claimHonor(restored,'life-all'),false);
});
test('v3.24 completed voyage ledgers use actual locked costs, weighted diversion and one first reward',()=>{
 const s=veteran(),record=s.expeditions.records[0],q=E.voyageLedger(record);assert.equal(q.dustCost,record.legs.reduce((n,l)=>n+l.dustCost,0));assert.equal(q.netDust,record.dust-q.dustCost);assert.equal(q.netSamples,record.samples+record.firstBonus-q.costSamples);assert.equal(q.seconds,record.legs.reduce((n,l)=>n+l.seconds,0));assert.ok(q.diversion>=.04&&q.diversion<=.4);
 const old=structuredClone(q);for(const id of ['solar','battery'])if(!s.modules[id])assert.ok(E.buildModule(s,id));equip(s,['solar','battery']);assert.deepEqual(E.voyageLedger(record),old);assert.equal(E.voyageLedger({legs:[]}),null);
 const notices=E.recentHarborChanges(s);assert.ok(notices.length<=5);assert.ok(notices.every(x=>Number.isFinite(x.clock)&&x.text));
});
test('v3.24 both stored fits compare without mutation and new long-voyage roles have actual tradeoffs',()=>{
 const s=veteran();for(const id of D.MODULES.map(d=>d.id))while((s.modules[id]||0)<3)assert.ok(E.buildModule(s,id));
 equip(s,['battery','solar']);E.saveLoadout(s,'production');equip(s,['nav','scanner']);E.saveLoadout(s,'voyage');const before=structuredClone(s),rows=E.longVoyageComparison(s,'freight','secure');assert.equal(rows.length,3);for(const row of rows){const q=E.voyagePreview(s,'freight','secure',row.equipment);assert.equal(row.seconds,q.seconds);assert.equal(row.netDust,q.dust-q.dustCost);}assert.deepEqual(s,before);
 const plain=E.voyagePreview(s,'beacon','secure',[]),battery=E.voyagePreview(s,'beacon','secure',['battery']),solar=E.voyagePreview(s,'beacon','secure',['solar']),medbay=E.voyagePreview(s,'beacon','secure',['medbay']);assert.ok(battery.diversion<plain.diversion);assert.ok(solar.dustCost<plain.dustCost);assert.ok(medbay.samples>plain.samples);assert.ok(E.voyagePreview(s,'science','investigate',['scanner','nav']).samples>E.voyagePreview(s,'science','investigate',['nav']).samples);
 assert.ok(E.startVoyage(s,'beacon'));assert.ok(E.dispatchVoyageLeg(s,s.expeditions.active.token,0,'secure'));const locked=structuredClone(s.expeditions.active.leg);E.applyLoadout(s,'production');assert.deepEqual(s.expeditions.active.leg,locked);assert.deepEqual(E.sanitize(s,s.lastAt),s);
});
test('v3.24 evidence and resident honors remain provable after recent voyage records rotate',()=>{
 const s=honorReady(E,saves.states.find(x=>x.name==='city-three-archives').state);for(const d of D.HONORS)assert.ok(E.claimHonor(s,d.id));
 for(let run=0;run<13;run++){assert.ok(E.startVoyage(s,'freight'));const token=s.expeditions.active.token;for(let stage=0;stage<4;stage++){assert.ok(E.dispatchVoyageLeg(s,token,stage,'secure'));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.claimVoyageLeg(s,token,stage));}assert.ok(E.finishVoyage(s,token));}
 assert.equal(s.expeditions.records.length,12);assert.equal(s.continuation.honors.claimed.length,12);assert.deepEqual(E.sanitize(s,s.lastAt),s);assert.equal(E.recentHarborChanges(s).length,5);assert.equal(s.continuation.community.records.length,9);assert.equal(s.continuation.reviews.records.length,9);
 const summary=S.summarize(s);assert.equal(summary.honors,12);assert.equal(summary.communityLetters,9);assert.equal(summary.reviewArchives,9);
});


test('v3.24 old-rule paid medical/solar voyages retain old time, diversion, fees and rewards across new balance',()=>{
 const rows=require('./fixtures/v323-saves.json').states.filter(x=>x.name.endsWith('old-balance-paid-medical-solar'));assert.equal(rows.length,3);
 for(const {state:raw} of rows){const s=E.sanitize(structuredClone(raw),raw.lastAt),old=structuredClone(raw.expeditions.active.leg),next=E.voyagePreview(s,'beacon','secure');assert.deepEqual(s.expeditions.active.leg,old);assert.ok(next.diversion<old.diversion);assert.ok(next.dustCost<old.dustCost);assert.ok(next.samples>old.samples);E.advance(s,s.lastAt+old.seconds*1000);assert.ok(E.claimVoyageLeg(s,s.expeditions.active.token,0));assert.equal(s.expeditions.active.dust,old.dust);assert.equal(s.expeditions.active.samples,old.samples);assert.deepEqual(E.sanitize(s,s.lastAt),s);}
});
test('v3.24 partial community escrow remains finite and actual offline work is included in the return brief',()=>{
 let s=structuredClone(prepared.city);E.setHarborFocus(s,'reception');E.acceptCommunity(s,'meals-1',1);E.advance(s,s.lastAt+3600000);E.deliverCommunity(s,1);const q=E.communityOffer(s,'meals-2');assert.ok(E.acceptCommunity(s,'meals-2',q.serial));
 // Explicit zero/partial resource boundary, separate from earned economic fixtures.
 s.dust=q.dustCost/2;s.samples=0;assert.ok(E.packCommunity(s,q.serial));const a=structuredClone(s.continuation.community.active);assert.equal(a.packedDust,q.dustCost/2);assert.equal(a.packedSamples,0);assert.equal(E.packCommunity(s,q.serial),false);s=S.inspect(JSON.stringify(s),s.lastAt).state;assert.deepEqual(s.continuation.community.active,a);assert.equal(E.deliverCommunity(s,q.serial),false);
 const report=E.advance(s,s.lastAt+86400000,{offline:true,report:true});assert.equal(report.seconds,28800);assert.ok(report.continuationChanges.some(x=>x.includes('居民协作')));assert.equal(s.continuation.community.completed.includes('meals-2'),false);assert.equal(E.communityStatus(s).available,false,'zero samples still block payment');
});

console.log(`v3 continuation ok: ${checks} behavioral checks`);
