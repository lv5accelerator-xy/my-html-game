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
console.log(`v3 continuation ok: ${checks} behavioral checks`);
