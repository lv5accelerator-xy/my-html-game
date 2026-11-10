'use strict';
const assert=require('node:assert/strict');
module.exports=async function({scenario,read,E,D,S,TIME,openDetails,screenshotDir,path}){
 const F=require('../fixtures/v324-saves.json');
 const nav=async(page,id)=>{const b=page.locator(`#navigation [data-id="${id}"]`);if(!await b.isDisabled())await b.click();};
 const s=E.sanitize(structuredClone(F.states.find(x=>x.name==='city-v324-contract').state),TIME);E.advance(s,s.lastAt+3600000);s.lastAt=TIME;
 await scenario('v3.25 action center: direct paid delivery, four categories, draft-only four-leg copy and stable controls',{[S.KEY]:JSON.stringify(s)},async page=>{
  const before=await read(page);assert.ok(await page.locator('#arrival-actions').isVisible());assert.ok(await page.locator('#arrival-actions [data-center-ready]').isVisible());
  await page.locator('#arrival-actions [data-action="harbor-deliver"]').click();const after=await read(page);assert.equal(after.management.stats.deliveries,before.management.stats.deliveries+1);assert.equal(after.dust,before.dust-E.harborStatus(before).dustLeft);assert.equal(await page.locator('#arrival-actions [data-action="harbor-deliver"]').count(),0);
  await openDetails(page,'[data-details-key="action-center-more"]');assert.match(await page.locator('#arrival-actions').innerText(),/需要准备/);assert.match(await page.locator('#arrival-actions').innerText(),/正在进行/);assert.match(await page.locator('#arrival-actions').innerText(),/暂时不重要/);
  await nav(page,'explore');await openDetails(page,'[data-details-key="itinerary-freight"]');await page.locator('[data-plan-route="freight"][data-plan-stage="0"][data-plan-field="choice"]').selectOption('recover');const saved=await read(page);await page.locator('[data-action="plan-copy-first"][data-id="freight"]').click();assert.deepEqual((await read(page)).continuation.plans,saved.continuation.plans,'copy only changes local draft');
  for(let i=0;i<4;i++)assert.equal(await page.locator(`[data-plan-route="freight"][data-plan-stage="${i}"][data-plan-field="choice"]`).inputValue(),'recover');
  const control=page.locator('[data-plan-route="freight"][data-plan-stage="2"][data-plan-field="choice"]');await control.focus();await control.evaluate(n=>window.__qualityControl=n);await page.clock.runFor(2000);assert.ok(await control.evaluate(n=>n===window.__qualityControl&&document.activeElement===n));
  await page.locator('[data-action="plan-save"][data-id="freight"]').click();assert.ok((await read(page)).continuation.plans.freight.steps.every(x=>x.choice==='recover'));assert.equal((await read(page)).expeditions.active,null);
  for(const width of [1280,375,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,`v325-${width}.png`)});}
  await page.reload();assert.ok((await read(page)).continuation.plans.freight.steps.every(x=>x.choice==='recover'));
 });
 for(const [index,ending] of D.ENDINGS.entries()){
  const s=E.sanitize(structuredClone(F.states.find(x=>x.name===ending.id+'-v324-mature').state),TIME);s.lastAt=TIME;
  await scenario(`v3.26 ${ending.id}: six cross-system interactions, real deliveries, choice replies, refresh/import and permanent ending`,{[S.KEY]:JSON.stringify(s)},async page=>{
   const close=async()=>{if(await page.locator('#dialog[open]').count())await page.locator('#dialog-close').click();};
   await nav(page,'explore');await openDetails(page,'[data-details-key="resident-link-stories"]');
   for(const [i,d] of D.RESIDENT_LINKS.entries()){
    await page.locator(`[data-action="link-accept"][data-id="${d.id}"]`).click();assert.equal((await read(page)).continuation.links.active.id,d.id);assert.ok(await page.locator(`[data-action="link-complete"][data-id="${d.id}"]`).first().isDisabled());
    if(i===0){await page.reload();await close();await nav(page,'explore');assert.equal((await read(page)).continuation.links.active.id,d.id);}
    const state=await read(page),offer=E.harborOffers(state)[0];await page.locator(`[data-action="harbor-accept"][data-id="${offer.id}"]`).click();await page.clock.fastForward(3600000);await close();const task=E.harborStatus(await read(page));assert.ok(task.available);await page.locator('#harbor-management [data-action="harbor-deliver"]').click();
    const choice=(i+index)%2?'care':'share',before=await read(page),p=E.linkChoiceOffer(before,d.id,choice);await page.locator(`[data-action="link-complete"][data-id="${d.id}"][data-link-choice="${choice}"]`).click();const done=await read(page);assert.equal(done.samples,before.samples-p.costSamples+p.samples);assert.equal(done.dust,before.dust-p.dustCost+p.dust);assert.equal(done.continuation.links.records.at(-1).choice,choice);assert.equal(done.epilogue.ending,ending.id);assert.ok((await page.locator('#dialog-body').innerText()).includes(choice==='share'?d.shared:d.cared));await close();await openDetails(page,'[data-details-key="resident-link-stories"]');assert.ok((await page.locator(`#link-${d.id}`).innerText()).includes(choice==='share'?d.shared:d.cared));
   }
   const done=await read(page);assert.equal(done.continuation.links.earned.length,6);await page.locator('#settings-button').click();const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-action="export"]').click()]);const fs=require('node:fs'),text=fs.readFileSync(await download.path(),'utf8');await page.locator('#import-file').setInputFiles({name:'links.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.locator('#confirm-import').waitFor();assert.match(await page.locator('#dialog-body').innerText(),/居民回响/);await page.locator('#confirm-import').click();assert.deepEqual((await read(page)).continuation.links,done.continuation.links);await nav(page,'home');assert.equal(await page.locator('[data-link-marker]').count(),6);
   for(const width of [1280,375,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,`v326-${ending.id}-${width}.png`)});}
  });
 }
 for(const [index,ending] of D.ENDINGS.entries()){
  const s=E.sanitize(structuredClone(F.states.find(x=>x.name===ending.id+'-v324-mature').state),TIME);for(const id of ['battery','solar'])if(!s.modules[id])assert.ok(E.buildModule(s,id));E.saveLoadout(s,'voyage');for(const id of [...s.equipped])E.equip(s,id);E.equip(s,'battery');E.equip(s,'solar');E.saveLoadout(s,'production');s.lastAt=TIME;
  await scenario(`v3.27 ${ending.id}: six deterministic environment rotations, actual fit tradeoff, locked policy, offline and ledger`,{[S.KEY]:JSON.stringify(s)},async page=>{
   const close=async()=>{if(await page.locator('#dialog[open]').count())await page.locator('#dialog-close').click();};await nav(page,'explore');const conditions=new Set();
   for(let run=0;run<6;run++){
    const before=await read(page),q=E.voyagePreview(before,'freight');conditions.add(q.condition);assert.ok((await page.locator('#deep-route-freight').innerText()).includes(D.VOYAGE_CONDITIONS.find(x=>x.id===q.condition).name));await openDetails(page,'[data-details-key="long-fits-freight-secure-main"]');assert.equal(await page.locator('[data-details-key="long-fits-freight-secure-main"] [data-long-fit]').count(),3);
    await page.locator('#deep-route-freight [data-action="deep-loadout"]').first().click();const p=E.voyagePreview(await read(page),'freight');await page.locator('[data-action="deep-start"][data-id="freight"]').click();await page.locator('[data-action="deep-dispatch"][data-id="secure"]').click();const locked=(await read(page)).expeditions.active.leg;assert.equal(locked.seconds,p.seconds);assert.equal(locked.dustCost,p.dustCost);
    await openDetails(page,'[data-details-key="voyage-schedules"]');await page.locator('#long-voyages [data-action="voyage-focus"][data-id="reception"]').click();assert.deepEqual((await read(page)).expeditions.active.leg,locked);
    if(run===0){await page.reload();await close();await nav(page,'explore');assert.deepEqual((await read(page)).expeditions.active.leg,locked);}
    for(let stage=0;stage<4;stage++){if(stage)await page.locator('[data-action="deep-dispatch"][data-id="secure"]').click();const state=await read(page);await page.clock.fastForward(state.expeditions.active.leg.seconds*1000+1000);await close();await page.locator('#long-voyages [data-action="deep-claim"]').click();}
    await page.locator('#long-voyages [data-action="deep-finish"]').click();const done=await read(page);assert.equal(done.expeditions.records[0].condition,q.condition);assert.equal(done.expeditions.records[0].firstBonus,0);assert.equal(done.epilogue.ending,ending.id);
   }
   assert.equal(conditions.size,6);await openDetails(page,'[data-details-key="deep-records"]');assert.match(await page.locator('#long-voyages').innerText(),/原始航行环境/);for(const width of [1280,375,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,`v327-${ending.id}-${width}.png`)});}
  });
 }
};
