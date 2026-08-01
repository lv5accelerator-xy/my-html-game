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
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CODEX_CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await context.addInitScript((save) => {
    localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify(save));
    localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "0.13.6");
    localStorage.removeItem("stellarOutpostIdlePerformanceMode");
  }, {
    version: 6,
    dust: 0,
    runDust: 0,
    lifetimeDust: 100,
    careerDust: 100,
    buildings: { drone: 10 },
    upgrades: [],
    achievements: [],
    activePage: "fleet",
    tutorialSeen: true,
    playerName: "移动端测试",
    bgmEnabled: false,
    lastSeen: Date.now(),
  });

  try {
    const response = await page.goto(origin, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));

    const eco = await page.evaluate(() => ({
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      mode: document.documentElement.dataset.performanceMode,
      status: document.querySelector("#performance-status").textContent,
      bodyAnimation: getComputedStyle(document.body).animationName,
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
    }));
    assert.equal(eco.mode, "eco", "mobile should default to eco mode");
    assert.equal(eco.status, "省电");
    assert.equal(eco.bodyAnimation, "none", "eco mode must disable background animation");
    assert.equal(eco.diagnostics.gameTickInterval, 250);
    assert.equal(eco.diagnostics.starfield.targetFps, 24);
    assert.equal(eco.diagnostics.starfield.pixelRatio, 1);
    assert.ok(eco.diagnostics.starfield.starCount <= 72);

    await page.evaluate(() => {
      const inactiveTargets = [
        "#upgrade-list",
        "#core-shop-list",
        "#starport-slot-map",
        "#skirmish-target-list",
        "#planet-target-list",
        "#transcend-protocol-list",
      ].map((selector) => document.querySelector(selector));
      window.__performanceMutations = { active: 0, inactive: 0 };
      new MutationObserver((records) => {
        window.__performanceMutations.active += records.length;
      }).observe(document.querySelector("#building-list"), {
        childList: true,
        subtree: true,
        characterData: true,
      });
      inactiveTargets.forEach((target) => {
        new MutationObserver((records) => {
          window.__performanceMutations.inactive += records.length;
        }).observe(target, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    });
    await page.waitForTimeout(1300);
    const ecoAfter = await page.evaluate(() => ({
      mutations: window.__performanceMutations,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    }));
    const mutations = ecoAfter.mutations;
    const ecoTickDelta =
      ecoAfter.diagnostics.gameTickCount - eco.diagnostics.gameTickCount;
    const ecoFrameDelta =
      ecoAfter.diagnostics.starfield.renderedFrames -
      eco.diagnostics.starfield.renderedFrames;
    assert.ok(mutations.active > 0, "active fleet page should continue refreshing");
    assert.equal(mutations.inactive, 0, "inactive detail pages must not rerender");
    assert.ok(
      ecoTickDelta > 0 && ecoTickDelta <= 7,
      `eco mode must remain capped at four game ticks per second; got ${ecoTickDelta}`,
    );
    assert.ok(
      ecoFrameDelta > 0 && ecoFrameDelta <= 38,
      `eco starfield must not exceed its 24 FPS target; got ${ecoFrameDelta}`,
    );

    await page.click("#menu-button");
    await page.click("#performance-button");
    await page.waitForTimeout(120);
    const quality = await page.evaluate(() => ({
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      mode: document.documentElement.dataset.performanceMode,
      savedMode: localStorage.getItem("stellarOutpostIdlePerformanceMode"),
      status: document.querySelector("#performance-status").textContent,
    }));
    assert.equal(quality.mode, "quality");
    assert.equal(quality.savedMode, "quality");
    assert.equal(quality.status, "高画质");
    assert.equal(quality.diagnostics.gameTickInterval, 100);
    assert.equal(quality.diagnostics.starfield.targetFps, 60);
    assert.equal(quality.diagnostics.starfield.pixelRatio, 2);
    await page.waitForTimeout(1000);
    const qualityAfter = await page.evaluate(
      () => window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    );
    const qualityTickDelta =
      qualityAfter.gameTickCount - quality.diagnostics.gameTickCount;
    const qualityFrameDelta =
      qualityAfter.starfield.renderedFrames -
      quality.diagnostics.starfield.renderedFrames;
    assert.ok(
      qualityTickDelta > 0 && qualityTickDelta <= 13,
      `quality mode must remain capped at ten game ticks per second; got ${qualityTickDelta}`,
    );
    assert.ok(
      qualityFrameDelta > 0 && qualityFrameDelta <= 72,
      `quality starfield must remain capped at 60 FPS; got ${qualityFrameDelta}`,
    );

    await page.click("#performance-button");
    await page.waitForTimeout(120);
    const beforeBackground = await page.evaluate(() => ({
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    }));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(700);
    const hidden = await page.evaluate(
      () => window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    );
    assert.equal(hidden.hidden, true);
    assert.equal(hidden.gameLoopScheduled, false, "background game timer must stop");
    assert.equal(hidden.starfield.scheduled, false, "background starfield must stop");

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(350);
    const resumed = await page.evaluate(() => ({
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    }));
    assert.ok(
      resumed.dust - beforeBackground.dust > 2,
      "background production must include the paused interval after resume",
    );
    assert.ok(
      resumed.dust - beforeBackground.dust < 5,
      "background settlement must not duplicate production",
    );
    assert.equal(resumed.diagnostics.gameLoopScheduled, true);
    assert.equal(resumed.diagnostics.starfield.scheduled, true);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));

    console.log(
      `mobile performance ok: eco=${eco.diagnostics.starfield.targetFps}fps/` +
        `${eco.diagnostics.gameTickInterval}ms, quality=` +
        `${quality.diagnostics.starfield.targetFps}fps/` +
        `${quality.diagnostics.gameTickInterval}ms`,
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
