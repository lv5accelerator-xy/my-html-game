"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  http = require("node:http"),
  path = require("node:path");
const E = require("../v3/engine.js"),
  S = require("../v3/storage.js"),
  D = require("../v3/data.js");
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || "playwright");
const root = path.resolve(__dirname, ".."),
  TIME = Date.UTC(2026, 9, 5, 12);
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, "http://localhost").pathname,
  );
  const file = path.resolve(
    root,
    `.${pathname.endsWith("/") ? pathname + "index.html" : pathname}`,
  );
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader(
    "Content-Type",
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".webp": "image/webp",
    }[path.extname(file)] || "application/octet-stream",
  );
  response.end(fs.readFileSync(file));
});
function ready() {
  const s = E.createState(TIME, 42);
  s.buildings = { drone: 10, sail: 3, forge: 0, relay: 0 };
  s.run.dust = 10000;
  s.dust = 10000;
  s.run.routeChosen = true;
  return s;
}
async function run() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/v3/`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CODEX_CHROMIUM_PATH || undefined,
  });
  const screenshotDir = process.env.V3_SCREENSHOT_DIR;
  if (screenshotDir) fs.mkdirSync(screenshotDir, { recursive: true });
  let checks = 0;
  async function scenario(name, initial, check) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [],
      badResponses = [],
      logs = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") logs.push(m.text());
    });
    page.on("response", (r) => {
      if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
    });
    await page.clock.install({ time: TIME });
    if (initial)
      await context.addInitScript((items) => {
        for (const [key, value] of Object.entries(items))
          if (localStorage.getItem(key) === null)
            localStorage.setItem(key, value);
      }, initial);
    await page.goto(url);
    await page.locator("#next-goal-title").waitFor();
    try {
      assert.match(await page.title(), /拾荒航线/);
      assert.ok(await page.locator("#main").innerText());
      await check(page, context);
      assert.deepEqual(errors, [], "runtime errors");
      assert.deepEqual(badResponses, [], "asset failures");
      assert.deepEqual(logs, [], "console warnings/errors");
      checks++;
      console.log(`ok ${checks} - ${name}`);
    } finally {
      await context.close();
    }
  }
  const read = (page) =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), S.KEY);
  try {
    await scenario(
      "new save: readable goal, three initial controls, 1280/375 layout, scans and passive production",
      null,
      async (page) => {
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          const screen = await page.evaluate(() => {
            const title = document.querySelector("#next-goal-title");
            const controls = [
              ...document.querySelectorAll(
                "button:not(:disabled),a,input,select",
              ),
            ].filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.width && r.height && r.top >= 0 && r.bottom <= innerHeight
              );
            });
            return {
              title: title.textContent.trim(),
              hidden: Boolean(title.closest("[hidden]")),
              laidOut: title.offsetParent !== null,
              overflow: document.documentElement.scrollWidth > innerWidth,
              controls: controls.length,
              tabs: document.querySelectorAll("#navigation button").length,
            };
          });
          assert.ok(screen.title);
          assert.equal(screen.hidden, false);
          assert.equal(screen.laidOut, true);
          assert.equal(screen.overflow, false);
          assert.ok(screen.controls <= 3, JSON.stringify(screen));
          assert.equal(screen.tabs, 2);
          if (screenshotDir)
            await page.screenshot({
              path: path.join(
                screenshotDir,
                width === 1280 ? "desktop.png" : "mobile.png",
              ),
              fullPage: true,
            });
        }
        await page.setViewportSize({ width: 1280, height: 900 });
        for (let i = 0; i < 6; i++) {
          await page.locator('[data-action="scan"]').click();
          await page.clock.fastForward(1000);
        }
        assert.equal(await page.locator("#dust-value").innerText(), "12");
        await page
          .locator('#main [data-action="nav"][data-id="fleet"]')
          .click();
        await page.locator('[data-buy-id="drone"]').click();
        assert.equal((await read(page)).buildings.drone, 1);
        await page.locator('[data-action="route"][data-id="explore"]').click();
        assert.equal((await read(page)).run.route, "explore");
        await page.clock.fastForward(10000);
        assert.ok((await read(page)).dust > 0);
        await page.locator('#navigation [data-id="home"]').click();
        await page.clock.fastForward(29000);
        assert.ok(await page.locator('[data-action="beacon"]').isVisible());
        const beforeBeacon = (await read(page)).dust;
        await page.locator('[data-action="beacon"]').click();
        assert.ok((await read(page)).dust > beforeBeacon);
        assert.equal((await read(page)).beacon.expiresAt, 0);
        await page.locator("#settings-button").click();
        assert.ok(await page.locator("#dialog").isVisible());
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#dialog").isVisible(), false);
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "settings-button",
        );
      },
    );
    await scenario(
      "safe exploration: report, story choice, permanent equipment, equipment slots and starport repair",
      { [S.KEY]: JSON.stringify(ready()) },
      async (page) => {
        await page.locator('#navigation [data-id="explore"]').click();
        await page.locator('[data-action="mission"][data-id="wreck"]').click();
        assert.equal((await read(page)).mission.id, "wreck");
        await page.clock.fastForward(90000);
        await page.locator('[data-action="claim"][data-id="repair"]').click();
        const saved = await read(page);
        assert.equal(saved.modules.medbay, 1);
        assert.equal(saved.lore[0].story, "hospital");
        assert.equal(saved.result, null);
        assert.ok(
          await page
            .locator("#main")
            .getByText("医疗舱电源", { exact: true })
            .isVisible(),
        );
        await page.locator('[data-action="equip"][data-id="medbay"]').click();
        assert.deepEqual((await read(page)).equipped, []);
        await page.locator('[data-action="equip"][data-id="medbay"]').click();
        assert.deepEqual((await read(page)).equipped, ["medbay"]);
        await page.locator('[data-action="mission"][data-id="echo"]').click();
        assert.equal((await read(page)).mission, null);
        await page.locator('#dialog [data-action="cancel"]').click();
        assert.equal((await read(page)).mission, null);
        await page.locator('[data-action="mission"][data-id="echo"]').click();
        await page.locator('[data-action="risk"]').click();
        assert.equal((await read(page)).mission.id, "echo");
        await page.clock.fastForward(30000);
        const beforeReload = (await read(page)).mission;
        await page.reload();
        assert.deepEqual((await read(page)).mission, beforeReload);
        await page.locator('#navigation [data-id="explore"]').click();
        await page.clock.fastForward(120000);
        await page.locator('[data-action="claim"]').click();
        assert.equal((await read(page)).result, null);
        if (screenshotDir)
          await page.screenshot({
            path: path.join(screenshotDir, "exploration.png"),
            fullPage: true,
          });
      },
    );
    const veteran = ready();
    veteran.run.dust = D.PRESTIGE_DUST;
    veteran.modules.medbay = 2;
    veteran.equipped = ["medbay"];
    veteran.samples = 5;
    veteran.lore = [{ story: "hospital", choice: "repair" }];
    await scenario(
      "jump: preserved collection, first automation unlock and actual automatic purchases",
      { [S.KEY]: JSON.stringify(veteran) },
      async (page) => {
        await page.locator('#navigation [data-id="jump"]').click();
        await page.locator('[data-action="jump"]').click();
        await page.locator('[data-action="confirm-jump"]').click();
        const before = await read(page);
        assert.equal(before.rebirths, 1);
        assert.equal(before.cores, 4);
        assert.equal(before.buildings.drone, 1);
        assert.equal(before.modules.medbay, 2);
        assert.equal(before.lore.length, 1);
        assert.equal(before.samples, 5);
        assert.ok(await page.locator('[data-config="enabled"]').isChecked());
        await page.clock.fastForward(10000);
        assert.ok((await read(page)).buildings.drone > 1);
      },
    );
    const planner = ready();
    planner.rebirths = 3;
    planner.cores = planner.totalCores = 20;
    planner.samples = 20;
    planner.research = ["navigation"];
    await scenario(
      "budget, auto research controls, starport repair and new exploration unlock",
      { [S.KEY]: JSON.stringify(planner) },
      async (page) => {
        await page.locator('#navigation [data-id="fleet"]').click();
        await page.locator('[data-config="reserve"]').fill("20000");
        await page.locator('[data-config="reserve"]').press("Tab");
        await page.locator('[data-config="enabled"]').check();
        await page.locator('[data-config="research"]').check();
        const before = await read(page);
        await page.clock.fastForward(10000);
        const after = await read(page);
        assert.equal(after.automation.reserve, 20000);
        assert.deepEqual(after.buildings, before.buildings);
        assert.deepEqual(after.research, before.research);
        await page.locator('#navigation [data-id="explore"]').click();
        await page.locator('[data-action="port"]').click();
        assert.equal((await read(page)).starport, 1);
        assert.equal((await read(page)).cores, 18);
        assert.equal((await read(page)).samples, 16);
        assert.ok(
          await page
            .locator('[data-action="mission"][data-id="garden"]')
            .isVisible(),
        );
        await page.setViewportSize({ width: 375, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      },
    );
    const old = {
      version: 31,
      dust: 12345.6,
      lifetimeDust: 80000,
      runDust: 20000,
      cores: 7,
      totalCores: 30,
      rebirths: 2,
      buildings: { drone: 13, sail: 4, lab: 20 },
      upgrades: ["gloves", "edge-case"],
      expedition: { active: { stage: 3 } },
      season: { unclaimed: [4] },
    };
    const oldText = JSON.stringify(old, null, 2);
    await scenario(
      "old record: migration retains source, unrecognized research, active expedition and unclaimed rewards",
      { [S.LEGACY_KEY]: oldText },
      async (page) => {
        await page.locator('#dialog [data-action="legacy"]').click();
        await page.locator("#confirm-legacy").click();
        const saved = await read(page);
        assert.equal(saved.dust, old.dust);
        assert.equal(saved.cores, old.cores);
        assert.equal(saved.buildings.drone, old.buildings.drone);
        assert.deepEqual(saved.legacyArchive, old);
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), S.LEGACY_KEY),
          oldText,
        );
        assert.equal(
          await page.evaluate(
            (key) => localStorage.getItem(key),
            S.LEGACY_BACKUP,
          ),
          oldText,
        );
        const downloading = page.waitForEvent("download");
        await page.locator("#settings-button").click();
        await page.locator('[data-action="export"]').click();
        const download = await downloading;
        const exported = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        assert.deepEqual(exported.legacyArchive, old);
      },
    );
    await scenario(
      "corrupt source: original survives autosave interval",
      { [S.KEY]: "{corrupt" },
      async (page) => {
        assert.ok(
          await page
            .locator("#dialog-title")
            .getByText("记录暂未能接续")
            .isVisible(),
        );
        await page.clock.fastForward(10000);
        assert.equal(
          await page.evaluate((key) => localStorage.getItem(key), S.KEY),
          "{corrupt",
        );
      },
    );
    const hostile = ready();
    hostile.journal = [
      { clock: 0, text: '<img src=x onerror="window.injected=true">' },
    ];
    await scenario(
      "imported narrative is text; full keyboard access to settings",
      { [S.KEY]: JSON.stringify(hostile) },
      async (page) => {
        assert.ok(
          (await page.locator(".journal").innerText()).includes("<img"),
        );
        assert.equal(await page.locator(".journal img").count(), 0);
        assert.equal(await page.evaluate(() => window.injected), undefined);
        await page.locator("#settings-button").focus();
        await page.keyboard.press("Enter");
        for (let i = 0; i < 12; i++) {
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(() =>
              Boolean(document.activeElement.closest("dialog")),
            ),
            true,
          );
        }
        await page.keyboard.press("Escape");
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "settings-button",
        );
      },
    );
    const extreme = ready();
    extreme.dust =
      extreme.lifetimeDust =
      extreme.totalCores =
      extreme.cores =
        1e100;
    await scenario(
      "large legacy-scale numbers remain readable without horizontal scroll",
      { [S.KEY]: JSON.stringify(extreme) },
      async (page) => {
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
        }
      },
    );
    console.log(
      `v3 browser ok: ${checks} complete flows; identity/content/assets/console checked in every flow`,
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
run().catch((error) => {
  console.error(error);
  server.close();
  process.exitCode = 1;
});
