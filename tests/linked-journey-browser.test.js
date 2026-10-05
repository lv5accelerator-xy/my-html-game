"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const root = path.resolve(__dirname, "..");
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  const file = path.resolve(root, pathname === "/" ? "index.html" : pathname.slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(response);
});
(async () => {
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "2.3.0");
      localStorage.setItem("stellarOutpostAnnouncementAutoShown_v1", JSON.stringify(["v0200-starfall-launch"]));
      if (!localStorage.getItem("stellarOutpostIdleSave_v1")) localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify({ version: 31, tutorialSeen: true, playerName: "联动测试", lastSeen: Date.now() }));
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));
    await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const save = bridge.createSnapshot();
      save.lifetimeDust = 1e8;
      save.dust = 1e6;
      save.endgame.companions = ["dustMoth"];
      save.expedition.supplies = 20;
      save.v2 = window.StellarV2Systems.freshState();
      save.v2.feedback.dismissed = Object.keys(window.StellarV2Systems.FEEDBACK_PROMPTS);
      bridge.applySnapshot(save);
    });
    const closeFeedback = page.locator("#v2-feedback-close");
    if (await closeFeedback.isVisible()) await closeFeedback.click();
    await page.locator(".batch-secondary > summary").filter({ hasText: "今日航线" }).click();
    await page.locator('[data-v2-route="industry"]').click();
    await page.locator("#linked-journey > summary").press("Space");
    await page.locator('[data-route-order="expand"]').press("Enter");
    assert.match(await page.locator("#linked-journey").innerText(), /扩建生产线：0\/5/);
    await page.locator("#return-plan > summary").press("Space");
    await page.locator('[data-return-plan="short"]').press("Enter");
    assert.equal(await page.evaluate(() => window.StellarOutpostCloudBridge.createSnapshot().expedition.supplies), 19);
    assert.equal(await page.locator("#return-plan-claim").isEnabled(), false);
    await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const save = bridge.createSnapshot();
      save.v2.returnPlan.startedAt = Date.now() - 3601000;
      save.v2.echo.stage = 1;
      bridge.applySnapshot(save);
    });
    await page.locator("#return-plan-claim").press("Enter");
    await page.locator("#echo-chain > summary").press("Space");
    await page.locator("#echo-interpret").press("Enter");
    assert.match(await page.locator("#echo-chain").innerText(), /完成一次航站作业/);
    await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const save = bridge.createSnapshot();
      window.StellarV2Systems.recordMetric(save.v2, "operationsCompleted", 1, save);
      bridge.applySnapshot(save);
    });
    await page.locator("#echo-claim").press("Enter");
    const state = await page.evaluate(() => window.StellarOutpostCloudBridge.createSnapshot());
    assert.equal(state.v2.echo.completed, 1);
    assert.equal(state.v2.returnPlan.claimed, true);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));
    const restored = await page.evaluate(() => window.StellarOutpostCloudBridge.createSnapshot());
    assert.equal(restored.v2.echo.completed, 1);
    assert.equal(restored.v2.returnPlan.claimed, true);
    assert.equal(restored.v2.order.id, "expand");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    assert.deepEqual(errors, []);
    console.log("linked browser ok: 390px, route click and keyboard order/plan/interpret/claim, reward deduction, reload persistence, zero pageerrors");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
