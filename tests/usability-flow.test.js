"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(game, /const GAME_VERSION = "1\.2\.0";/);
assert.match(game, /playerName: "无名拾荒者"/);
assert.match(game, /const TUTORIAL_STEPS = TUTORIAL_STEP_LIBRARY\.slice\(0, 3\);/);
assert.match(html, /id="command-secondary-plans" class="command-secondary-plans"/);
assert.match(html, /<div class="scan-card" hidden>/);
assert.match(html, /id="command-guide"[^>]+hidden>/);
assert.equal((html.match(/class="panel game-page/g) || []).length, 11);

console.log("usability flow ok: 3-step tutorial, optional plans collapsed, 11 primary pages");
