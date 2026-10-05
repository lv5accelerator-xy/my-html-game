"use strict";
const assert = require("node:assert/strict");
const D = require("../v3/data.js");
const E = require("../v3/engine.js");

// A documented player model, not a prediction of every player's completion time:
// one scan/second for 30 seconds; revisit every 15 seconds; buy up to 10 at a time;
// collect visible beacons; make the first story choice; reclamation scans every 5 seconds.
function playRun(route, state = E.createState(0)) {
  const start = state.clock,
    initialRebirths = state.rebirths;
  const events = {
    drone: null,
    route: null,
    milestone: null,
    research: null,
    exploration: null,
    story: null,
    jump: null,
  };
  for (let elapsed = 1; elapsed <= 3600; elapsed++) {
    E.advance(state, state.lastAt + 1000);
    if (elapsed <= 30 || (route === "reclaim" && elapsed % 5 === 0))
      E.scan(state);
    if (elapsed % 15 === 0) {
      if (!state.run.routeChosen && state.buildings.drone)
        E.chooseRoute(state, route);
      const research = D.RESEARCH.find(
        (r) =>
          !state.research.includes(r.id) &&
          state.run.dust >= r.unlock &&
          state.dust >= r.cost,
      );
      if (research) E.research(state, research.id);
      else {
        const building = E.affordableBest(state);
        if (building) E.buy(state, building.id, 10);
      }
      if (state.beacon.expiresAt) E.claimBeacon(state);
      if (state.result)
        E.claimMission(state, state.result.story ? "repair" : undefined);
      else if (!state.mission && (route === "explore" || !state.lore.length))
        E.startMission(state, state.lore.length ? "belt" : "wreck");
    }
    if (events.drone === null && state.buildings.drone) events.drone = elapsed;
    if (events.route === null && state.run.routeChosen) events.route = elapsed;
    if (events.milestone === null && state.buildings.drone >= 10)
      events.milestone = elapsed;
    if (events.research === null && state.research.length)
      events.research = elapsed;
    if (events.exploration === null && E.reachable(state, "explore"))
      events.exploration = elapsed;
    if (events.story === null && state.lore.length) events.story = elapsed;
    if (E.prestigeGain(state) && !state.mission && !state.result) {
      events.jump = elapsed;
      break;
    }
  }
  return {
    state,
    events,
    seconds: state.clock - start,
    route,
    initialRebirths,
  };
}

function verify() {
  const rows = [];
  for (const route of D.ROUTES) {
    const first = playRun(route.id);
    assert.ok(first.events.drone <= 30, `${route.id}: drone within 30 seconds`);
    assert.ok(
      first.events.milestone < 600 &&
        first.events.research < 600 &&
        first.events.story < 600,
      `${route.id}: meaningful changes in first 10 minutes`,
    );
    assert.ok(
      first.events.jump >= 15 * 60 && first.events.jump <= 25 * 60,
      `${route.id}: first jump should be 15–25 minutes in the documented player model; got ${first.events.jump}`,
    );
    const firstSeconds = first.seconds;
    assert.equal(E.prestige(first.state), 4);
    const second = playRun(route.id, first.state);
    assert.ok(
      second.events.jump && second.seconds < firstSeconds * 0.8,
      `${route.id}: automation and cores should shorten the second run by at least 20%`,
    );
    rows.push({
      route: route.name,
      drone: first.events.drone,
      milestone: first.events.milestone,
      story: first.events.story,
      firstJump: firstSeconds,
      secondJump: second.seconds,
      samples: second.state.samples,
    });
  }
  const sample = E.createState(0);
  sample.buildings = { drone: 25, sail: 25, forge: 10, relay: 1 };
  sample.run.dust = 10000;
  sample.run.route = "industry";
  const industrialRate = E.rawRate(sample);
  sample.run.route = "reclaim";
  const reclaimRate = E.rawRate(sample),
    reclaimScan = E.scanValue(sample);
  sample.run.route = "industry";
  assert.ok(industrialRate > reclaimRate * 1.25);
  assert.ok(
    reclaimScan > E.scanValue(sample) * 1.8,
    "active scanning offsets the industrial production advantage",
  );
  const normal = E.missionPreview(sample, "belt");
  sample.run.route = "explore";
  const explorer = E.missionPreview(sample, "belt");
  assert.ok(
    explorer.seconds < normal.seconds * 0.7 &&
      explorer.diversion === normal.diversion / 2 &&
      explorer.samples > normal.samples,
  );
  let campaign = E.createState(0);
  for (let run = 0; run < 4; run++) {
    campaign = playRun("explore", campaign).state;
    assert.ok(E.prestige(campaign));
    E.repairPort(campaign);
    if (E.capability(campaign, "autoResearch"))
      E.configure(campaign, { research: true });
  }
  assert.equal(
    campaign.starport,
    3,
    "four runs can finish the starport vertical slice",
  );
  assert.ok(
    campaign.clock <= 60 * 60,
    "the documented explorer campaign completes within 60 minutes",
  );
  assert.ok(E.capability(campaign, "autoDispatch"));
  console.table(rows);
  console.log(
    `v3 balance ok: three routes, first-run beats, 15–25 minute jumps and faster second runs; starport campaign ${campaign.clock}s`,
  );
  return rows;
}
if (require.main === module) verify();
module.exports = { playRun, verify };
