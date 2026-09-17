"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
assert.ok(playwrightPath, "CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);
const root = path.resolve(__dirname, "..");
const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".mp3": "audio/mpeg" };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  const file = path.resolve(root, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.writeHead(200, { "content-type": mime[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify({ version: 30, playerName: "迁移测试", tutorialSeen: true, dust: 10, lifetimeDust: 10, lastSeen: Date.now() }));
    localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "2.3.0");
    localStorage.setItem("stellarOutpostAnnouncementAutoShown_v1", JSON.stringify(["v0200-starfall-launch"]));
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));
    const migrated = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const legacy = bridge.createSnapshot();
      legacy.version = 30;
      delete legacy.v2;
      legacy.playerName = "v1.10老玩家";
      legacy.dust = 123456;
      legacy.lifetimeDust = Math.max(legacy.lifetimeDust, 654321);
      legacy.cores = 17;
      legacy.totalCores = 29;
      legacy.buildings.drone = 23;
      legacy.upgrades = ["gloves"];
      legacy.endgame.companions = ["dustMoth"];
      legacy.expedition.completedRuns = 3;
      legacy.missions.tokens = 42;
      bridge.applySnapshot(legacy);
      const result = bridge.createSnapshot();
      return {
        version: result.version,
        playerName: result.playerName,
        dust: result.dust,
        lifetimeDust: result.lifetimeDust,
        cores: result.cores,
        totalCores: result.totalCores,
        drone: result.buildings.drone,
        upgrades: result.upgrades,
        companions: result.endgame.companions,
        expeditionRuns: result.expedition.completedRuns,
        missionTokens: result.missions.tokens,
        v2: result.v2,
      };
    });
    assert.equal(migrated.version, 31);
    assert.equal(migrated.playerName, "v1.10老玩家");
    assert.ok(migrated.dust >= 123456, "旧档星尘不得在迁移中减少");
    assert.ok(migrated.lifetimeDust >= 654321);
    assert.equal(migrated.cores, 17);
    assert.equal(migrated.totalCores, 29);
    assert.equal(migrated.drone, 23);
    assert.deepEqual(migrated.upgrades, ["gloves"]);
    assert.deepEqual(migrated.companions, ["dustMoth"]);
    assert.equal(migrated.expeditionRuns, 3);
    assert.equal(migrated.missionTokens, 42);
    assert.equal(migrated.v2.retention.enabled, false);
    assert.equal(migrated.v2.dailyRoute.routeId, "");
    assert.equal(Array.isArray(migrated.v2.runBuild.reports), true);
    assert.equal(Array.isArray(migrated.v2.season.archive), true);
    assert.deepEqual(Object.keys(migrated.v2.companionStories.records), ["dustMoth"]);
    assert.equal(migrated.v2.companionStories.records.dustMoth.stage, 0);
    assert.deepEqual(errors, []);
    console.log("save migration v200 ok: v1.10 resources and progression preserved, v2 fields safely filled");
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
