'use strict';
const assert=require('node:assert/strict');
module.exports=async function({scenario,read,E,D,S,TIME,openDetails,fs,path,screenshotDir}){
 const fixtures=require('../fixtures/v320-saves.json');
 const nav=async(page,id)=>{const button=page.locator(`#navigation [data-id="${id}"]`);if(await button.isDisabled())assert.equal(await button.getAttribute('aria-current'),'page');else await button.click();};
 for(const [index,route] of D.VOYAGES.entries()){
  const ending=D.ENDINGS[index],raw=fixtures.states.find(x=>x.name===ending.id+'-three-archives').state,fixture=E.sanitize(structuredClone(raw),raw.lastAt);
  const gear=route.module==='nav'?['nav','scanner']:['nav',route.module];
  for(const x of [...fixture.equipped])E.equip(fixture,x);E.equip(fixture,'scanner');E.saveLoadout(fixture,'production');for(const x of [...fixture.equipped])E.equip(fixture,x);for(const x of gear)E.equip(fixture,x);E.saveLoadout(fixture,'voyage');fixture.lastAt=TIME;
  await scenario(`v3.21 ${route.id}/${ending.id}: saved four-leg plan, manual discovery, five confirmations, home handoff, focus, reload and import`,{[S.KEY]:JSON.stringify(fixture)},async page=>{
   const close=async()=>{if(await page.locator('#dialog[open]').count())await page.locator('#dialog-close').click();};
   await nav(page,'explore');
   await openDetails(page,`[data-details-key="itinerary-${route.id}"]`);
   const choices=['secure','recover','investigate','secure'];
   for(let i=0;i<4;i++)await page.locator(`[data-plan-route="${route.id}"][data-plan-stage="${i}"][data-plan-field="choice"]`).selectOption(choices[i]);
   const input=page.locator(`[data-plan-route="${route.id}"][data-plan-stage="2"][data-plan-field="choice"]`);await input.focus();const node=await input.elementHandle();await page.clock.runFor(1200);assert.equal(await input.evaluate((el,old)=>el===old&&el===document.activeElement,node),true);
   await page.locator(`[data-action="plan-save"][data-id="${route.id}"]`).click();
   let s=await read(page);assert.deepEqual(s.continuation.plans[route.id].steps.map(p=>p.choice),choices);
   const event=E.encounterOffer(s);
   if(event){assert.ok(await page.locator(`[data-action="plan-start"][data-id="${route.id}"]`).isDisabled());const choice=event.choices.find(c=>c.costSamples===0);await page.locator(`#encounter-panel [data-action="encounter"][data-id="${choice.id}"]`).click();if(choice.seconds)await page.clock.fastForward(choice.seconds*1000+1000);await close();}
   const before=await read(page),archives=structuredClone(before.expeditions.archives),quote=E.itineraryOffer(before,route.id,before.continuation.plans[route.id].steps);
   await page.locator(`[data-action="plan-start"][data-id="${route.id}"]`).click();
   assert.equal((await read(page)).expeditions.active.leg.seconds,quote.quotes[0].seconds);let confirmations=1;
   for(let stage=0;stage<4;stage++){
    const depart=await read(page),leg=depart.expeditions.active.leg;
    assert.equal(leg.dustCost,quote.quotes[stage].dustCost);
    if(stage===0){await page.locator('[data-action="loadout-apply"][data-id="production"]').click();assert.deepEqual((await read(page)).expeditions.active.leg,leg);await page.locator('[data-action="plan-restore"]').click();}
    await page.clock.fastForward(leg.seconds*1000+1000);await close();assert.equal((await read(page)).expeditions.active.stage,stage);
    if(stage===1){await page.reload();await close();const checkpoint=await read(page);await page.locator('#settings-button').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action="export"]').click()]);const text=fs.readFileSync(await download.path(),'utf8');await page.locator('#import-file').setInputFiles({name:'plan.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.locator('#confirm-import').click();assert.deepEqual((await read(page)).continuation.sequence,checkpoint.continuation.sequence);}
    if(stage===2){await page.setViewportSize({width:375,height:900});await nav(page,'home');assert.ok(await page.locator('#arrival-actions').isVisible());await page.locator('#arrival-actions [data-action="plan-next"]').click();}
    else {await nav(page,'explore');await page.locator('[data-action="plan-next"]').click();}
    confirmations++;
    if(stage<3){assert.equal((await read(page)).expeditions.active.stage,stage+1);await nav(page,'explore');}
   }
   const done=await read(page);assert.equal(confirmations,5);assert.equal(done.continuation.sequence,null);assert.equal(done.expeditions.completed[route.id],before.expeditions.completed[route.id]+1);assert.deepEqual(done.expeditions.archives,archives);assert.equal(done.epilogue.ending,ending.id);assert.equal(done.expeditions.records[0].firstBonus,0);
   for(const width of [1280,375]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(screenshotDir)await page.locator('#long-voyages').screenshot({path:path.join(screenshotDir,`v321-${route.id}-${width}.png`)});}
   await page.reload();assert.deepEqual((await read(page)).continuation,done.continuation);
  });
 }
};
