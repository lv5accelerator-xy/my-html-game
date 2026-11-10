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
console.log(`v3 continuation ok: ${checks} behavioral checks`);
