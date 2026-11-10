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
};
