'use strict';
const assert=require('node:assert/strict');
module.exports=function prepare(E,raw){
 const s=E.sanitize(structuredClone(raw),raw.lastAt);E.configure(s,{enabled:false,research:false,dispatch:false});
 const event=E.encounterOffer(s);if(event&&!event.choice){const c=event.choices.find(c=>!c.costSamples);assert.ok(E.chooseEncounter(s,event.token,c.id));}
 if(s.encounters.pending?.choice)E.advance(s,s.lastAt+Math.max(0,s.encounters.pending.readyAt-s.clock)*1000);
 while(s.management.stats.deliveries<14){const o=E.harborOffers(s)[0];assert.ok(E.acceptHarborNeed(s,o.id,o.terms.serial));const a=E.harborStatus(s);E.advance(s,s.lastAt+Math.max(a.workSeconds,Math.ceil(a.productionGoal/E.productionRate(s)))*1000+1000);assert.ok(E.harborStatus(s).available);assert.ok(E.deliverHarborNeed(s,a.serial));}
 for(const id of ['habitat','repair-dock','route-station'])while((s.management.projects[id]||0)<2){const q=E.harborProjectOffer(s,id);assert.ok(q.available,q.reason);assert.ok(E.buildHarborProject(s,id,q.level));}
 return s;
};
