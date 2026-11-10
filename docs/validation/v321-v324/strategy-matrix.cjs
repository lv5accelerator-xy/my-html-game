'use strict';
const E=require(process.env.STRATEGY_ENGINE||process.cwd()+'/v3/engine.js'),D=require(process.cwd()+'/v3/data.js'),F=require(process.cwd()+'/tests/fixtures/v320-saves.json');
const modules=D.MODULES.map(x=>x.id),gears=[[]];for(const x of modules)gears.push([x]);for(let a=0;a<modules.length;a++)for(let b=a+1;b<modules.length;b++)gears.push([modules[a],modules[b]]);
const profiles=[{drone:12,sail:2,forge:0,relay:0},{drone:45,sail:30,forge:12,relay:1},{drone:92,sail:74,forge:53,relay:41}],rows=[],s=E.sanitize(structuredClone(F.states.find(x=>x.name==='city-three-archives').state),0);
let scenarios=0,quotes=0,single=0,dominated=0,minFront=Infinity,maxFront=0,examples=[];
const dominates=(a,b)=>{const x=[a.seconds,a.diversion,a.dustCost,-(a.dust-a.dustCost),-(a.samples-a.costSamples)],y=[b.seconds,b.diversion,b.dustCost,-(b.dust-b.dustCost),-(b.samples-b.costSamples)];return x.every((n,i)=>n<=y[i])&&x.some((n,i)=>n<y[i]);};
for(let config=0;config<243;config++){
 let n=config;for(const id of modules){s.modules[id]=n%3+1;n=Math.floor(n/3);}
 for(let profile=0;profile<3;profile++){s.buildings=profiles[profile];
  for(const route of D.VOYAGES)for(const method of D.VOYAGE_METHODS){
   const ps=gears.map(gear=>E.voyagePreview(s,route.id,method.id,gear)).filter(p=>p.available);quotes+=gears.length;scenarios++;
   const front=ps.filter(p=>!ps.some(q=>dominates(q,p)));minFront=Math.min(minFront,front.length);maxFront=Math.max(maxFront,front.length);if(front.length===1){single++;if(examples.length<9)examples.push({config,profile,route:route.id,method:method.id,gear:front[0].equipment,rate:E.rawRate({...s,equipped:front[0].equipment})});}
   // A dominant pair must cover every ordinary safe/recover mission, not just pass optional module gates.
   if(method.id!=='investigate'&&front.length===1)dominated++;
  }
 }
}
console.log(JSON.stringify({parameterMatrix:true,earnedBase:'v320 city-three-archives',modules,gears:gears.length,levelSets:243,productionProfiles:profiles,scenarios,quotes,singleFrontiers:single,singleOrdinaryFrontiers:dominated,minFront,maxFront,examples},null,2));
