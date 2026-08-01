"use strict";

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
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath)) {
    response.writeHead(404).end("not found");
    return;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "content-length": stat.size,
  });
  fs.createReadStream(filePath).pipe(response);
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CODEX_CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const failedLocalRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(origin)) {
      failedLocalRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  await context.addInitScript((legacySave) => {
    localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify(legacySave));
    localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "0.13.3");
  }, {
    version: 5,
    dust: 57e18,
    runDust: 58.6e18,
    lifetimeDust: 58.6e18,
    careerDust: 60e18,
    cores: 10.6e6,
    totalCores: 10.6e6,
    rebirths: 12,
    activePage: "transcend",
    buildings: {
      drone: 1200,
      sail: 900,
      lab: 600,
      forge: 400,
      relay: 250,
      dyson: 140,
      ringYard: 80,
      riftNet: 40,
      horizonMine: 20,
      cosmicLoom: 10,
    },
    upgrades: [],
    achievements: [],
    combat: { attackLevel: 28, defenseLevel: 30 },
    lastSeen: Date.now(),
  });

  try {
    const response = await page.goto(origin, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));

    const snapshot = await page.evaluate(() => ({
      footer: document.querySelector("footer").textContent,
      dust: document.querySelector("#dust-value").textContent,
      rate: document.querySelector("#rate-value").textContent,
      cores: document.querySelector("#core-value").textContent,
      lockedHidden: document.querySelector("#transcend-locked").hidden,
      lockedDisplay: getComputedStyle(document.querySelector("#transcend-locked")).display,
      lockedRects: document.querySelector("#transcend-locked").getClientRects().length,
      contentHidden: document.querySelector("#transcend-content").hidden,
      contentDisplay: getComputedStyle(document.querySelector("#transcend-content")).display,
      contentRects: document.querySelector("#transcend-content").getClientRects().length,
      saveVersion: window.StellarOutpostCloudBridge.saveVersion,
      gameVersion: window.StellarOutpostCloudBridge.gameVersion,
      performance: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      metadata: window.StellarOutpostCloudBridge.getMetadata(),
      bgmPath: new URL(document.querySelector("#bgm-audio").src).pathname,
    }));

    assert.equal(snapshot.gameVersion, "0.13.3");
    assert.equal(snapshot.saveVersion, 6);
    assert.equal(snapshot.performance.mode, "quality");
    assert.equal(snapshot.performance.gameTickInterval, 100);
    assert.equal(snapshot.performance.starfield.targetFps, 60);
    assert.match(snapshot.footer, /v0\.13\.3/);
    assert.equal(snapshot.lockedHidden, true, "unlock should hide the locked card");
    assert.equal(snapshot.lockedDisplay, "none", "locked card must be visually hidden");
    assert.equal(snapshot.lockedRects, 0, "locked card must occupy no rendered area");
    assert.equal(snapshot.contentHidden, false, "unlock should expose endgame content");
    assert.notEqual(snapshot.contentDisplay, "none", "endgame content must be visible");
    assert.ok(snapshot.contentRects > 0, "endgame content must occupy rendered area");
    assert.match(snapshot.bgmPath, /stellar-outpost-bgm\.mp3$/);
    assert.ok(snapshot.metadata.lifetimeDust < 1e9);
    assert.ok(snapshot.metadata.totalCores >= 5000);
    assert.doesNotMatch(`${snapshot.dust} ${snapshot.rate} ${snapshot.cores}`, /[BTP]/);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    assert.equal(failedLocalRequests.length, 0, failedLocalRequests.join("\n"));

    console.log(
      `browser smoke ok: dust=${snapshot.dust}, rate=${snapshot.rate}, ` +
        `cores=${snapshot.cores}`,
    );
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
