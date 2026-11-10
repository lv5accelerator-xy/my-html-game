'use strict';
const assert=require('node:assert/strict'),E=require('../v3/engine.js'),D=require('../v3/data.js'),F=require('./fixtures/v320-saves.json');
const modules=D.MODULES.map(x=>x.id),gears=[[]];for(const x of modules)gears.push([x]);for(let a=0;a<modules.length;a++)for(let b=a+1;b<modules.length;b++)gears.push([modules[a],modules[b]]);
const profiles=[{drone:12,sail:2,forge:0,relay:0},{drone:45,sail:30,forge:12,relay:1},{drone:92,sail:74,forge:53,relay:41}],s=E.sanitize(structuredClone(F.states.find(x=>x.name==='city-three-archives').state),0);
let quotes=0,scenarios=0,minFront=Infinity;
function bounded(q){for(const key of ['seconds','diversion','dustCost','costSamples','dust','samples'])assert.ok(Number.isFinite(q[key]),key);assert.ok(q.seconds>=120&&q.seconds<=4000);assert.ok(q.diversion>=.04&&q.diversion<=.4);assert.ok(q.dustCost>=1000&&q.dustCost<=100000);assert.ok(q.dust>=0&&q.dust<=1e6);assert.ok(q.samples>=1&&q.samples<=20);assert.ok(q.costSamples>=0&&q.costSamples<=2);quotes++;}
const dominates=(a,b)=>{const x=[a.seconds,a.diversion,a.dustCost,-(a.dust-a.dustCost),-(a.samples-a.costSamples)],y=[b.seconds,b.diversion,b.dustCost,-(b.dust-b.dustCost),-(b.samples-b.costSamples)];return x.every((n,i)=>n<=y[i])&&x.some((n,i)=>n<y[i]);};
// Controlled legal parameter grid, not player telemetry or a purported earned save.
for(let config=0;config<243;config++){let n=config;for(const id of modules){s.modules[id]=n%3+1;n=Math.floor(n/3);}
 for(const buildings of profiles){s.buildings=buildings;for(const route of D.VOYAGES)for(const method of D.VOYAGE_METHODS){const ps=gears.map(gear=>E.voyagePreview(s,route.id,method.id,gear));ps.forEach(bounded);const legal=ps.filter(p=>p.available),front=legal.filter(p=>!legal.some(q=>dominates(q,p)));assert.ok(front.length>=2,`${config}/${route.id}/${method.id}: at least two real tradeoffs`);minFront=Math.min(minFront,front.length);scenarios++;}}
}
assert.equal(scenarios,6561);assert.equal(quotes,104976);
for(const level of [1,3]){for(const id of modules)s.modules[id]=level;
 for(const v of D.VOYAGES)for(const stage of [0,1,2,3])for(const supplies of [0,8])for(const insight of [0,4])for(const project of [0,3]){
  s.expeditions.active={id:v.id,stage,supplies,insight};s.management.projects={'public-berths':project,'repair-dock':project,'supply-network':project,'route-station':project,habitat:project};
  for(const m of D.VOYAGE_METHODS)for(const g of gears)bounded(E.voyagePreview(s,v.id,m.id,g));
 }
}
assert.equal(quotes,114192);
console.log(`v3 strategy ok: 2 parameter audits; ${scenarios} Pareto scenarios, ${quotes} bounded quotes, minimum ${minFront} non-dominated alternatives; 0 single universal fit`);
