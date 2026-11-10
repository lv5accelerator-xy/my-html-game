'use strict';
const assert=require('node:assert/strict'),E=require('../v3/engine.js'),D=require('../v3/data.js'),S=require('../v3/storage.js'),F=require('./fixtures/v324-saves.json');let checks=0;
const test=(name,fn)=>{fn();console.log(`ok ${++checks} - ${name}`);};
for(const row of F.states)test(`v3.25 action center ${row.name}: unique, reachable, observational and compatible`,()=>{
 const s=E.sanitize(structuredClone(row.state),row.state.lastAt),before=structuredClone(s),groups=E.actionCenter(s),items=['ready','prepare','ongoing','later'].flatMap(k=>groups[k]);
 assert.equal(new Set(items.map(x=>x.key)).size,items.length);assert.ok(items.every(x=>x.focus&&x.title));assert.deepEqual(s,before);assert.deepEqual(s,row.state,'every v3.24 field remains equal');assert.deepEqual(S.inspect(JSON.stringify(s),s.lastAt).state,s);
});
test('v3.25 new and post-jump saves never suggest locked secondary navigation',()=>{const s=E.createState(0);assert.equal(Object.values(E.actionCenter(s)).flat().filter(x=>x?.focus).length,0);const old=E.sanitize(structuredClone(F.states[0].state),F.states[0].state.lastAt);assert.ok(E.prestige(old));assert.equal(Object.values(E.actionCenter(old)).flat().filter(x=>x?.focus).length,0);});
test('v3.25 ready commands reuse atomic once-only delivery and voyage report rules',()=>{const raw=F.states.find(x=>x.name==='city-v324-contract').state,s=E.sanitize(structuredClone(raw),raw.lastAt);E.advance(s,s.lastAt+3600000);const item=E.actionCenter(s).ready.find(x=>x.key==='need');assert.equal(item.command,'harbor-deliver');assert.ok(E.deliverHarborNeed(s,item.id));assert.equal(E.deliverHarborNeed(s,item.id),false);assert.equal(E.actionCenter(s).ready.some(x=>x.key==='need'),false);});
console.log(`v3 quality ok: ${checks} behavioral checks`);
