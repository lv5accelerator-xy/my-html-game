'use strict';
const assert=require('node:assert/strict'),prepare=require('./community-fixture.cjs'),D=require('../../v3/data.js');
module.exports=function(E,raw){
 const s=prepare(E,raw);E.setHarborFocus(s,'production');
 while(s.management.stats.deliveries<35){const q=E.harborOffers(s)[0];assert.ok(E.acceptHarborNeed(s,q.id,q.terms.serial));const a=E.harborStatus(s);E.advance(s,s.lastAt+Math.max(a.workSeconds,Math.ceil(a.productionGoal/E.productionRate(s)))*1000+1000);assert.ok(E.deliverHarborNeed(s,a.serial));}
 for(const id of ['public-berths','habitat'])while((s.management.projects[id]||0)<3){const q=E.harborProjectOffer(s,id);assert.ok(q.available,q.reason);assert.ok(E.buildHarborProject(s,id,q.level));}
 for(const route of D.VOYAGES){assert.ok(E.startVoyage(s,route.id));const token=s.expeditions.active.token;for(const [stage,method] of ['recover','recover','secure','secure'].entries()){assert.ok(E.dispatchVoyageLeg(s,token,stage,method));E.advance(s,s.lastAt+s.expeditions.active.leg.seconds*1000);assert.ok(E.claimVoyageLeg(s,token,stage));}assert.ok(E.finishVoyage(s,token));}
 for(const d of D.REVIEWS){assert.ok(E.startReview(s,d.id,'safe',s.continuation.reviews.serial+1));E.advance(s,s.lastAt+s.continuation.reviews.active.seconds*1000);assert.ok(E.claimReview(s,s.continuation.reviews.active.token));}
 for(const d of D.COMMUNITY_STORIES){const q=E.communityOffer(s,d.id);assert.ok(E.acceptCommunity(s,d.id,q.serial));E.advance(s,s.lastAt+Math.max(q.workSeconds,Math.ceil(q.productionGoal/E.productionRate(s)))*1000+1000);assert.ok(E.deliverCommunity(s,q.serial));}
 assert.deepEqual(E.sanitize(s,s.lastAt),s);return s;
};
