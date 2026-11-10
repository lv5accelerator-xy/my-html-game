'use strict';
// Deterministic earned-resource player model. No balance shortcuts or resource grants.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),enginePath=require.resolve('../v3/engine.js'),E=require(process.env.V3_AUDIT_ENGINE||enginePath),D=require(path.join(path.dirname(process.env.V3_AUDIT_ENGINE||enginePath),'data.js'));
let calls={},success={},wait=0,trace=[];
const wrapped=Object.fromEntries(Object.entries(E).map(([k,fn])=>[k,typeof fn==='function'?function(...args){const out=fn(...args);if(!/Preview|Offer|Goal|Rate|Status|Options|Archive|Count|Ledger|Terms|Progress|^sanitize$|^createState$/.test(k)&&!['advance','capability','milestone','reachable','productionBreakdown','buildingCost','affordableBest','prestigeGain','onboarding','encounterCandidates','scanValue','missionLock','arrivalTasks','portFacilities','portActivity','incomeEta'].includes(k)){calls[k]=(calls[k]||0)+1;if(out)success[k]=(success[k]||0)+1;}if(k==='advance'){wait+=out?.seconds||0;const s=args[0];if(s.clock-s.run.startedClock===600)trace.push({clock:s.clock,dust:s.dust,earnedDust:s.run.dust,samples:s.samples,cores:s.cores,rate:E.rawRate(s),buildings:{...s.buildings},missionRemaining:s.mission?Math.max(0,s.mission.end-s.clock):0});}return out;}:fn]));
if(!require.cache[enginePath])require(enginePath);require.cache[enginePath].exports=wrapped;
const balance=require('../tests/v3-balance.test.js'),rows=[];
for(const route of D.ROUTES){let s=E.createState(0);for(let run=1;run<=4;run++){calls={};success={};trace=[];const p=balance.playRun(route.id,s);s=p.state;rows.push({route:route.id,run,seconds:p.seconds,events:p.events,atTenMinutes:trace,availableDust:s.dust,earnedDust:s.run.dust,samples:s.samples,cores:s.totalCores,attempts:{...calls},successful:{...success}});assert.ok(E.prestige(s));E.repairPort(s);}}
calls={};success={};balance.verify();
const campaignCalls={attempts:calls,successful:success};
const F=require('../tests/fixtures/v320-saves.json'),honor=require('../tests/helpers/honors-fixture.cjs');
const late=[];for(const ending of D.ENDINGS){const raw=F.states.find(x=>x.name===ending.id+'-three-archives').state,s=honor(wrapped,raw),start=s.clock,quotes=D.VOYAGES.map(v=>({route:v.id,...E.itineraryOffer(s,v.id,Array.from({length:4},()=>({choice:'secure',equipment:s.equipped})))}));late.push({ending:ending.id,clock:s.clock,availableDust:s.dust,samples:s.samples,rate:E.rawRate(s),deliveries:s.management.stats.deliveries,projects:s.management.projects,honors:D.HONORS.filter(d=>E.honorOffer(s,d.id).available).length,quotes});assert.ok(start>0);}
const out={version:D.GAME_VERSION,model:'one scan/s first30s; visits15s; normal fees/rewards; no injected resources; action counts are engine calls, not browser clicks',runs:rows,campaignCalls,late};
const dest=process.argv[2];if(dest)fs.writeFileSync(dest,JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
