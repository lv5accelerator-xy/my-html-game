'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('../v3/engine.js'),D=require('../v3/data.js'),F=require('../tests/fixtures/v324-saves.json');
const previous=process.env.V3_AUDIT_PREVIOUS_ENGINE&&require(process.env.V3_AUDIT_PREVIOUS_ENGINE),rows=[];
const pick=p=>({condition:p.condition||null,schedule:p.schedule||null,seconds:p.seconds,diversion:p.diversion,dustCost:p.dustCost,netDust:p.dust-p.dustCost,netSamples:p.samples-p.costSamples});
for(const route of D.VOYAGES){let s=E.sanitize(structuredClone(F.states.find(x=>x.name==='city-v324-mature').state),0);for(const d of D.MODULES)while((s.modules[d.id]||0)<3)assert.ok(E.buildModule(s,d.id));
 for(let run=0;run<6;run++){
  const quotes={};for(const focus of D.HARBOR_FOCUSES){E.setHarborFocus(s,focus.id);for(const fit of [['nav','scanner'],['battery','solar'],['nav','medbay']])quotes[focus.id+':'+fit.join('+')]=pick(E.voyagePreview(s,route.id,'secure',fit));}
  rows.push({route:route.id,token:s.expeditions.serial+1,condition:E.voyageCondition(s,route.id).id,legacy:previous?pick(previous.voyagePreview(s,route.id,'secure',['nav','scanner'])):null,quotes});
  assert.ok(E.startVoyage(s,route.id));const token=s.expeditions.active.token;for(let stage=0;stage<4;stage++){assert.ok(E.dispatchVoyageLeg(s,token,stage,'secure'));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.claimVoyageLeg(s,token,stage));}assert.ok(E.finishVoyage(s,token));
 }
}
const out={version:D.GAME_VERSION,model:'Same earned v324 save; normal paid module upgrades to3; actual six consecutive voyages per route; quotes from identical current fleet; no grants',previousEngine:process.env.V3_AUDIT_PREVIOUS_ENGINE||null,rows};if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
