'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const E=require(path.join(root,'v3/engine.js')),D=require(path.join(root,'v3/data.js'));
const earned=require(path.join(root,'tests/fixtures/v316-earned.json'));
const output={sourceSha:'d2fc83cda98d0162ba585d9027d724ceae8458e1',scope:'Read-only model comparison of three actual earned ending fixtures, after paying for all nine safe surveys. Stage-zero previews only; not player telemetry or a complete economy/optimality proof.',profiles:[],previews:0};
for(const [ending,original] of Object.entries(earned)){
 const s=E.sanitize(structuredClone(original),original.lastAt);E.configure(s,{enabled:false,research:false,dispatch:false});
 for(const chain of D.SECTORS)while(E.surveyCount(s,chain.id)<3){assert.ok(E.startSurvey(s,chain.id,'safe',E.surveyCount(s,chain.id)));E.advance(s,s.lastAt+s.atlas.active.seconds*1000);assert.ok(E.claimSurvey(s,s.atlas.active.token));}
 const ids=D.MODULES.filter(m=>s.modules[m.id]>0).map(m=>m.id),loadouts=[[]];
 for(let i=0;i<ids.length;i++){loadouts.push([ids[i]]);for(let j=i+1;j<ids.length;j++)loadouts.push([ids[i],ids[j]]);}
 const profile={ending,modules:s.modules,baseBuildings:s.buildings,baseResearch:s.research,loadouts:loadouts.length,cases:[],harbor:[]};
 for(const route of D.VOYAGES)for(const method of D.VOYAGE_METHODS){
  const rows=loadouts.map(equipment=>E.voyagePreview(s,route.id,method.id,equipment)).filter(p=>p.available).map(p=>({equipment:p.equipment,seconds:p.seconds,diversion:p.diversion,dustNet:p.dust-p.dustCost,samplesNet:p.samples-p.costSamples}));output.previews+=rows.length;
  const dominates=(a,b)=>a.seconds<=b.seconds&&a.diversion<=b.diversion&&a.dustNet>=b.dustNet&&a.samplesNet>=b.samplesNet&&(a.seconds<b.seconds||a.diversion<b.diversion||a.dustNet>b.dustNet||a.samplesNet>b.samplesNet);
  const pareto=rows.filter(b=>!rows.some(a=>dominates(a,b)));
  profile.cases.push({route:route.id,method:method.id,legalPreviews:rows.length,pareto});
 }
 for(const focus of D.HARBOR_FOCUSES){E.setHarborFocus(s,focus.id);for(const need of D.HARBOR_NEEDS){const p=E.harborTerms(s,need.id);profile.harbor.push({focus:focus.id,need:need.id,dustCost:p.dustCost,samplesCost:p.samplesCost,workSeconds:p.workSeconds,tripsRequired:p.tripsRequired,mode:p.plan.mode,alternates:p.plan.alternates});}}
 output.profiles.push(profile);
}
fs.writeFileSync(path.join(__dirname,'strategy-audit.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({profiles:output.profiles.length,legalStageZeroPreviews:output.previews,harborComparisons:output.profiles.reduce((n,p)=>n+p.harbor.length,0),fronts:output.profiles[0].cases.map(c=>({route:c.route,method:c.method,pareto:c.pareto}))},null,2));
