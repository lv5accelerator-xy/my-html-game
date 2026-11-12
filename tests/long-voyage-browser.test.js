"use strict";

// Regression: confirming a long-voyage decision and quick-settling an archived
// stage used to call undefined sound helpers, throwing before render/save ran.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
assert.ok(playwrightPath, "CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const root = path.resolve(__dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  const filePath = path.resolve(root, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
  try {
    const context = await browser.newContext();
    await require("./helpers/isolate-browser.cjs")(context, origin);
    await context.addInitScript(() => {
      localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "2.3.0");
      localStorage.setItem("stellarOutpostAnnouncementAutoShown_v1", JSON.stringify(["v0200-starfall-launch"]));
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${origin}/`);
    await page.waitForFunction(() => window.StellarOutpostCloudBridge?.createSnapshot);

    // Archived industrial route, not yet active. applySnapshot persists the save;
    // reload so startup sees tutorialSeen/playerName and opens no overlay.
    await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const save = bridge.createSnapshot();
      save.activePage = "expedition";
      save.playerName = "回归测试";
      save.tutorialSeen = true;
      save.guidance.showAllSystems = true;
      save.dust = 500000000;
      save.runDust = 500000000;
      save.lifetimeDust = 500000000;
      save.expedition.supplies = 5;
      save.expedition.fragments = 20;
      save.expedition.completedRuns = 1; // archived route implies prior expedition progress
      save.expedition.activeRun = null;
      save.longVoyage = {
        activeRouteId: "", stageIndex: 0, baseline: {}, completedRoutes: ["industrial"],
        totalCompleted: 1, currentDecision: null, souvenirs: [], quickSettles: 0, lastReport: "",
      };
      bridge.applySnapshot(save);
    });
    await page.reload();
    await page.waitForFunction(() => window.StellarOutpostCloudBridge?.createSnapshot);
    assert.equal(await page.locator("#tutorial-backdrop").isHidden(), true);
    await page.click("#expedition-page-tab");
    await page.locator("#expedition-page").waitFor({ state: "visible" });
    await page.click("[data-long-voyage-start='industrial']");
    const started = await page.evaluate(() => window.StellarOutpostCloudBridge.getLongVoyageDiagnostics());
    assert.equal(started.active.id, "industrial");
    assert.ok(started.state.currentDecision, "stage 0 should open a decision");
    assert.equal(started.state.currentDecision.choiceId, "");

    // Confirm a decision through the rendered choice button.
    const choice = page.locator("[data-long-voyage-choice]").first();
    const choiceId = await choice.getAttribute("data-long-voyage-choice");
    await choice.click();
    const decided = await page.evaluate(() => window.StellarOutpostCloudBridge.getLongVoyageDiagnostics());
    assert.equal(decided.state.currentDecision.choiceId, choiceId);
    assert.equal(await page.locator(`[data-long-voyage-choice='${choiceId}'].selected`).count(), 1,
      "choice should re-render as selected");
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));

    // Quick-settle the archived stage.
    const quick = page.locator("#long-voyage-quick");
    assert.equal(await quick.isVisible(), true);
    assert.equal(await quick.isEnabled(), true);
    await quick.click();
    const settled = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const snapshot = bridge.createSnapshot();
      return { voyage: bridge.getLongVoyageDiagnostics(), supplies: snapshot.expedition.supplies, fragments: snapshot.expedition.fragments };
    });
    assert.equal(settled.voyage.state.stageIndex, 1);
    assert.equal(settled.voyage.state.quickSettles, 1);
    assert.equal(settled.supplies, 3);
    assert.equal(settled.fragments, 8);
    assert.equal(await quick.isDisabled(), true, "insufficient fragments should disable quick-settle after render");
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    console.log("long voyage browser regression: decision + quick-settle passed");
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
