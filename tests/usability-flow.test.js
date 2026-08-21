"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cloud = fs.readFileSync(path.join(root, "cloud-save.js"), "utf8");

assert.match(game, /const GAME_VERSION = "1\.9\.0";/);
assert.match(html, /id="resource-cycle-grid" class="resource-cycle-grid"/);
assert.match(game, /const RESOURCE_RECLAIM_RECIPES = Object\.freeze/);
assert.match(game, /playerName: "无名拾荒者"/);
assert.match(game, /const TUTORIAL_STEPS = TUTORIAL_STEP_LIBRARY\.slice\(0, 3\);/);
assert.match(html, /id="command-secondary-plans" class="command-secondary-plans"/);
assert.match(html, /<div class="scan-card" hidden>/);
assert.match(html, /id="command-guide"[^>]+hidden>/);
assert.match(html, /id="rebuild-hub" class="rebuild-hub"/);
assert.match(game, /function processRebuild\(now = Date\.now\(\)\)/);
assert.match(html, /id="companion-echoes" class="companion-echoes"/);
assert.match(game, /const COMPANION_ECHOES = \[/);
assert.match(html, /id="long-voyage" class="long-voyage"/);
assert.match(game, /const LONG_VOYAGES = \[/);
assert.match(game, /const LONG_VOYAGE_CHOICES = Object\.freeze/);
assert.match(html, /id="long-voyage-decision-choices" class="long-voyage-decision-choices"/);
assert.match(html, /id="starport-gallery-stats" class="starport-gallery-stats"/);
assert.match(game, /const STARPORT_LIFE_EVENTS = Object\.freeze/);
assert.match(cloud, /async function hydrateAnnouncementGoals\(\)/);
assert.match(cloud, /getAggregateFromServer/);
assert.equal((html.match(/class="panel game-page/g) || []).length, 11);

console.log("usability flow ok: 3-step tutorial, optional plans collapsed, 11 primary pages");
