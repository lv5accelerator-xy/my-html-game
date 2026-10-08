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
    // The installed clock advances between RPCs. Start before the target so
    // pausing never tries to move backwards; the app still starts at exact TIME.
    await page.clock.install({ time: TIME - 60_000 });
    await page.clock.pauseAt(TIME);
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
      assert.equal(page.url(), url);
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
        await page.locator('#dialog [data-action="return-next"]').click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "report",
        );
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
        await page.locator('#dialog [data-action="cancel"]').click();
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
    const workshopSave = ready();
    delete workshopSave.timing; // An actual v3.0 record has no timing field.
    workshopSave.modules = { battery: 1, scanner: 1 };
    workshopSave.equipped = ["battery", "scanner"];
    workshopSave.samples = 60;
    workshopSave.lore = [
      { story: "hospital", choice: "preserve" },
      { story: "garden", choice: "scrap" },
    ];
    await scenario(
      "v3.0 workshop: craft missing story gear, upgrade both to level three, preserve choices and replace full equipment slots",
      { [S.KEY]: JSON.stringify(workshopSave) },
      async (page) => {
        await page.locator('#navigation [data-id="explore"]').click();
        await page.locator(".workshop summary").focus();
        await page.keyboard.press("Space");
        for (const id of ["medbay", "solar"]) {
          await page.locator(`[data-action="module"][data-id="${id}"]`).click();
          assert.equal((await read(page)).modules[id], 1);
          assert.deepEqual((await read(page)).equipped, ["battery", "scanner"]);
          assert.ok(
            await page.locator(".workshop").evaluate((el) => el.open),
            "crafting keeps the workshop open",
          );
          await page.locator(`[data-action="module"][data-id="${id}"]`).click();
          await page.locator(`[data-action="module"][data-id="${id}"]`).click();
          assert.equal((await read(page)).modules[id], 3);
          assert.equal(
            await page
              .locator(`[data-action="module"][data-id="${id}"]`)
              .count(),
            0,
          );
        }
        const saved = await read(page);
        assert.equal(saved.samples, 14);
        assert.deepEqual(saved.lore, workshopSave.lore);
        const before = E.productionRate(saved);
        await page.locator('[data-action="equip"][data-id="battery"]').click();
        await page.locator('[data-action="equip"][data-id="medbay"]').click();
        assert.ok(E.productionRate(await read(page)) > before);
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          if (screenshotDir)
            await page.screenshot({
              path: path.join(screenshotDir, `workshop-${width}.png`),
              fullPage: true,
            });
        }
        await page.reload();
        assert.equal((await read(page)).modules.medbay, 3);
        assert.equal((await read(page)).modules.solar, 3);
        await page.locator("#settings-button").click();
        await page.locator(".timing-panel summary").click();
        assert.match(
          await page.locator(".timing-panel").innerText(),
          /历史用时不补写/,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      },
    );
    const forecast = ready();
    forecast.buildings = { drone: 9, sail: 24, forge: 2, relay: 0 };
    forecast.dust = 1000000;
    forecast.research = D.RESEARCH.map((r) => r.id);
    forecast.modules = { medbay: 3, solar: 2 };
    forecast.equipped = ["medbay", "solar"];
    forecast.totalCores = forecast.cores = 16;
    await scenario(
      "fleet forecasts: selected batch updates gains and payback; actual purchase crosses a milestone with the predicted production",
      { [S.KEY]: JSON.stringify(forecast) },
      async (page) => {
        await page.locator('#navigation [data-id="fleet"]').click();
        const gain = page.locator('[data-buy-effect="drone"]');
        const single = await gain.innerText();
        assert.match(single, /^增产 \+/);
        assert.match(
          await page.locator('[data-buy-payback="drone"]').innerText(),
          /^回本约 /,
        );
        await page.locator('[data-action="mode"][data-id="10"]').click();
        assert.notEqual(await gain.innerText(), single);
        assert.match(
          await page.locator('[data-buy-id="drone"]').innerText(),
          /×10/,
        );
        if (screenshotDir)
          await page.screenshot({
            path: path.join(screenshotDir, "fleet-forecast.png"),
            fullPage: true,
          });
        await page.locator('[data-action="mode"][data-id="1"]').click();
        assert.equal(await gain.innerText(), single);
        const expected = structuredClone(forecast);
        E.buy(expected, "drone");
        await page.locator('[data-buy-id="drone"]').click();
        const saved = await read(page);
        assert.equal(saved.buildings.drone, 10);
        assert.equal(E.productionRate(saved), E.productionRate(expected));
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
    const reportFirst = ready();
    reportFirst.buildings.drone = 1;
    reportFirst.run.routeChosen = false;
    reportFirst.run.dust = 0;
    reportFirst.result = {
      id: "wreck",
      story: "hospital",
      succeeded: true,
      dust: 10,
      samples: 2,
      module: null,
    };
    await scenario(
      "report goal: outranks early construction and route choice; keyboard activation focuses the reachable report",
      { [S.KEY]: JSON.stringify(reportFirst) },
      async (page) => {
        assert.equal(
          await page.locator("#next-goal-title").innerText(),
          D.STORIES.hospital.title,
        );
        const button = page.locator('#main [data-goal-focus="report"]');
        await button.focus();
        await page.keyboard.press("Enter");
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "report",
        );
        assert.ok(await page.locator("#report").isVisible());
        await page.locator('[data-action="claim"][data-id="preserve"]').click();
        assert.equal((await read(page)).result, null);
        assert.equal((await read(page)).lore[0].choice, "preserve");
        assert.equal(
          await page
            .locator('#navigation [data-id="home"]')
            .getAttribute("aria-current"),
          "page",
        );
        assert.match(
          await page.locator("#next-goal-title").innerText(),
          /航次的方向/,
        );
      },
    );
    const waiting = ready();
    waiting.dust = 0;
    waiting.research = ["laser"];
    waiting.lore = [{ story: "hospital", choice: "preserve" }];
    await scenario(
      "live ETA and local timing: income enables a purchase, research is recorded, and exported timing distinguishes offline from foreground",
      { [S.KEY]: JSON.stringify(waiting) },
      async (page) => {
        assert.match(await page.locator("[data-goal-eta]").innerText(), /约 /);
        await page.locator('#main [data-goal-focus="research-panels"]').click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "research-panels",
        );
        assert.match(
          await page.locator('[data-buy-wait="drone"]').innerText(),
          /还需约 /,
        );
        await page.clock.runFor(5000);
        assert.equal(
          await page.locator('[data-buy-wait="drone"]').innerText(),
          "",
        );
        assert.equal(
          await page.locator('[data-buy-id="drone"]').isEnabled(),
          true,
        );
        await page
          .locator('[data-action="research"][data-id="panels"]')
          .click();
        const active = (await read(page)).timing;
        assert.equal(active.events.research.foregroundSeconds, 5);
        assert.equal(active.offlineSeconds, 0);
        await page.clock.fastForward(60000);
        assert.equal(
          await page.locator("#dialog-title").innerText(),
          "归航简报",
        );
        await page.locator('#dialog [data-action="cancel"]').click();
        await page.locator("#settings-button").click();
        await page.locator(".timing-panel summary").click();
        assert.equal(
          await page.locator('[data-timing-active="research"]').innerText(),
          "5 秒",
        );
        assert.match(
          await page.locator("[data-timing-total]").innerText(),
          /离线 1 分 0 秒/,
        );
        const downloading = page.waitForEvent("download");
        await page.locator('[data-action="export"]').click();
        const download = await downloading;
        const exported = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        assert.equal(exported.timing.events.research.foregroundSeconds, 5);
        assert.equal(exported.timing.offlineSeconds, 60);
        await page.setViewportSize({ width: 375, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        if (screenshotDir)
          await page.screenshot({
            path: path.join(screenshotDir, "local-timing.png"),
            fullPage: true,
          });
      },
    );
    const editing = ready();
    editing.rebirths = 2;
    editing.automation.enabled = true;
    await scenario(
      "automatic construction preserves an unfinished reserve input and its keyboard focus",
      { [S.KEY]: JSON.stringify(editing) },
      async (page) => {
        await page.locator('#navigation [data-id="fleet"]').click();
        const reserve = page.locator('[data-config="reserve"]');
        await reserve.fill("200");
        const before = Object.values((await read(page)).buildings).reduce(
          (a, b) => a + b,
          0,
        );
        await page.clock.runFor(2000);
        assert.equal(await reserve.inputValue(), "200");
        assert.equal(
          await page.evaluate(() => document.activeElement.dataset.config),
          "reserve",
        );
        await page.keyboard.type("00");
        await page.keyboard.press("Tab");
        const saved = await read(page);
        assert.equal(saved.automation.reserve, 20000);
        assert.ok(
          Object.values(saved.buildings).reduce((a, b) => a + b, 0) > before,
        );
      },
    );
    const returning = ready();
    returning.lastAt = TIME - 600000;
    returning.rebirths = 4;
    E.configure(returning, { enabled: true, research: true, dispatch: true });
    E.startMission(returning, "wreck");
    const expectedReturn = structuredClone(returning);
    E.advance(expectedReturn, TIME, { offline: true, report: true });
    await scenario(
      "return briefing: actual automation summary, mobile layout, direct report link and immediate reload without duplicate rewards",
      { [S.KEY]: JSON.stringify(returning) },
      async (page) => {
        assert.equal(
          await page.locator("#dialog-title").innerText(),
          "归航简报",
        );
        const body = await page.locator("#dialog-body").innerText();
        assert.match(body, /自动建造与研究支出/);
        assert.match(body, /星尘净变化/);
        assert.match(body, /聚焦扫描/);
        assert.match(body, /最后一盏手术灯/);
        assert.deepEqual(await read(page), expectedReturn);
        await page.setViewportSize({ width: 375, height: 900 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        if (screenshotDir)
          await page.screenshot({
            path: path.join(screenshotDir, "return-briefing.png"),
          });
        await page.locator('#dialog [data-action="return-next"]').click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "report",
        );
        assert.deepEqual((await read(page)).lore, []);
        await page.locator('[data-action="claim"][data-id="repair"]').click();
        const claimed = await read(page);
        await page.reload();
        assert.equal(await page.locator("#dialog").isVisible(), false);
        assert.deepEqual(await read(page), claimed);
        assert.equal(claimed.lore.length, 1);
      },
    );
    const farVoyage = ready();
    farVoyage.starport = 3;
    farVoyage.rebirths = 4;
    farVoyage.cores = 12;
    farVoyage.totalCores = 28;
    farVoyage.samples = 100;
    farVoyage.modules = { medbay: 1 };
    farVoyage.equipped = ["medbay"];
    farVoyage.research = ["navigation"];
    farVoyage.lore = [
      { story: "hospital", choice: "repair" },
      { story: "garden", choice: "scrap" },
    ];
    farVoyage.run.choices = 2;
    farVoyage.run.dust = D.PRESTIGE_DUST;
    farVoyage.lifetimeDust = D.PRESTIGE_DUST;
    await scenario(
      "chapter two: three real voyages, old-choice follow-ups, prerequisite gear, long-voyage reload, permanent construction and jump preservation on desktop and phone",
      { [S.KEY]: JSON.stringify(farVoyage) },
      async (page) => {
        await page.locator('#main [data-goal-focus="mission-message"]').click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "mission-message",
        );
        assert.equal(
          await page
            .locator('[data-action="mission"][data-id="seedbank"]')
            .isDisabled(),
          true,
        );
        assert.equal(
          await page
            .locator('[data-action="project"][data-id="relay"]')
            .isDisabled(),
          true,
        );
        if (screenshotDir)
          await page
            .locator(".chapter-map")
            .screenshot({ path: path.join(screenshotDir, "chapter-map.png") });
        const voyage = async (id, choice, text) => {
          await page
            .locator(`[data-action="mission"][data-id="${id}"]`)
            .click();
          const s = await read(page);
          assert.equal(s.mission.id, id);
          await page.clock.fastForward((s.mission.end - s.clock) * 1000);
          await page.locator('#dialog [data-action="return-next"]').click();
          assert.match(await page.locator("#report").innerText(), text);
          await page
            .locator(`[data-action="claim"][data-id="${choice}"]`)
            .click();
        };
        await voyage("message", "public", /备用电源播出完整离港日志/);
        await page.locator('[data-action="project"][data-id="relay"]').click();
        assert.deepEqual((await read(page)).chapter, ["relay"]);
        await page.locator('#navigation [data-id="home"]').click();
        await page.locator('#main [data-goal-focus="module-nav"]').click();
        assert.equal(await page.locator(".workshop").getAttribute("open"), "");
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "module-nav",
        );
        await page.locator('[data-action="module"][data-id="nav"]').click();
        await page.locator('[data-action="module"][data-id="nav"]').click();
        assert.equal((await read(page)).modules.nav, 2);
        assert.ok((await read(page)).equipped.includes("nav"));
        await page.setViewportSize({ width: 375, height: 900 });
        await voyage("seedbank", "seeds", /回收光照设备时留下的序号/);
        await page
          .locator('[data-action="project"][data-id="nursery"]')
          .click();
        assert.deepEqual((await read(page)).chapter, ["relay", "nursery"]);
        await page.locator('#navigation [data-id="home"]').click();
        await page.locator('#main [data-goal-focus="module-scanner"]').click();
        await page.locator('[data-action="module"][data-id="scanner"]').click();
        await page.locator('[data-action="module"][data-id="scanner"]').click();
        assert.equal(
          await page
            .locator('[data-action="equip"][data-id="scanner"]')
            .isDisabled(),
          true,
        );
        await page.locator('[data-action="equip"][data-id="medbay"]').click();
        await page.locator('[data-action="equip"][data-id="scanner"]').click();
        await page
          .locator('[data-action="mission"][data-id="horizon"]')
          .click();
        await page.clock.fastForward(5000);
        const underway = (await read(page)).mission;
        assert.ok(underway.seconds > 180);
        await page.reload();
        assert.deepEqual((await read(page)).mission, underway);
        await page.locator('#main [data-goal-focus="active-mission"]').click();
        const returning = await read(page);
        await page.clock.fastForward(
          (returning.mission.end - returning.clock) * 1000,
        );
        await page.locator('#dialog [data-action="return-next"]').click();
        assert.match(
          await page.locator("#report").innerText(),
          /阿遥站在观测窗前/,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.locator('[data-action="claim"][data-id="welcome"]').click();
        await page
          .locator('[data-action="project"][data-id="lighthouse"]')
          .click();
        const completed = await read(page);
        assert.deepEqual(completed.chapter, ["relay", "nursery", "lighthouse"]);
        assert.equal(completed.cores, 3);
        assert.equal(completed.totalCores, 28);
        assert.equal(completed.run.choices, 2);
        assert.equal(completed.lore.length, 5);
        assert.deepEqual(completed.lore.slice(0, 2), farVoyage.lore);
        assert.match(
          await page.locator(".chapter-complete").innerText(),
          /第二章「远航星图」完成/,
        );
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          if (screenshotDir)
            await page.locator(".chapter-map").screenshot({
              path: path.join(screenshotDir, `chapter-complete-${width}.png`),
            });
        }
        await page.locator('#navigation [data-id="jump"]').click();
        await page.locator('[data-action="jump"]').click();
        await page.locator('[data-action="confirm-jump"]').click();
        const next = await read(page);
        assert.equal(next.rebirths, 5);
        assert.deepEqual(next.chapter, completed.chapter);
        assert.deepEqual(next.lore, completed.lore);
        assert.deepEqual(next.modules, completed.modules);
        await page.reload();
        assert.deepEqual((await read(page)).chapter, completed.chapter);
      },
    );
    const autoVoyage = ready();
    autoVoyage.rebirths = 4;
    autoVoyage.automation.dispatch = true;
    E.startMission(autoVoyage, "belt");
    await scenario(
      "automatic voyages can pause after the current return without cancelling it or losing its reward",
      { [S.KEY]: JSON.stringify(autoVoyage) },
      async (page) => {
        await page.locator('#navigation [data-id="explore"]').click();
        await page.locator('[data-action="dispatch-stop"]').click();
        const s = await read(page);
        assert.equal(s.automation.dispatch, false);
        assert.equal(s.mission.id, "belt");
        await page.clock.fastForward(120000);
        await page.locator('#dialog [data-action="return-next"]').click();
        assert.equal((await read(page)).result.id, "belt");
        await page.locator('[data-action="claim"]').click();
        await page.clock.runFor(1000);
        assert.equal((await read(page)).mission, null);
        assert.equal((await read(page)).samples, 2);
      },
    );
    const chapterThree = ready();
    chapterThree.rebirths = 4;
    chapterThree.starport = 3;
    chapterThree.chapter = ["relay", "nursery", "lighthouse"];
    chapterThree.modules = { nav: 2, scanner: 2 };
    chapterThree.equipped = ["nav", "scanner"];
    chapterThree.research = ["navigation"];
    chapterThree.samples = 30;
    chapterThree.run.choices = 2;
    chapterThree.lore = [
      { story: "hospital", choice: "preserve" },
      { story: "garden", choice: "repair" },
      { story: "relay", choice: "public" },
      { story: "nursery", choice: "seeds" },
      { story: "horizon", choice: "archive" },
    ];
    await scenario(
      "chapter three: actual preparation previews, saved plans, voyage reload, offline manual decisions, mobile convoy handoff, letters, archive rereading and persistent supply route",
      { [S.KEY]: JSON.stringify(chapterThree) },
      async (page) => {
        await page
          .locator('#main [data-goal-focus="mission-white-noise"]')
          .click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "mission-white-noise",
        );
        assert.equal(
          await page.locator(".completed-sectors").getAttribute("open"),
          null,
        );
        assert.equal(
          await page
            .locator('[data-action="mission"][data-id="white-noise"]')
            .isDisabled(),
          true,
        );
        for (const plan of D.EXPEDITION_PLANS) {
          const p = E.missionPreview(chapterThree, "white-noise", plan.id);
          const option = page.locator(
            `[data-action="prepare"][data-id="${plan.id}"]`,
          );
          assert.match(
            await option.innerText(),
            new RegExp(`${p.samples} 样本`),
          );
          await option.click();
          assert.equal(await option.getAttribute("aria-pressed"), "true");
          assert.deepEqual((await read(page)).campaign.preparation, {
            id: "white-noise",
            plan: plan.id,
          });
        }
        if (screenshotDir)
          await page.locator(".campaign-panel").screenshot({
            path: path.join(screenshotDir, "white-noise-plans-desktop.png"),
          });
        await page.locator('[data-action="prepare"][data-id="supply"]').click();
        await page.reload();
        assert.equal((await read(page)).campaign.preparation.plan, "supply");
        await page
          .locator('#main [data-goal-focus="mission-white-noise"]')
          .click();
        assert.equal(
          await page
            .locator('[data-action="prepare"][data-id="supply"]')
            .getAttribute("aria-pressed"),
          "true",
        );
        await page
          .locator('[data-action="mission"][data-id="white-noise"]')
          .click();
        const preview = E.missionPreview(chapterThree, "white-noise", "supply");
        assert.equal((await read(page)).mission.seconds, preview.seconds);
        assert.equal((await read(page)).mission.diversion, preview.diversion);
        await page.clock.fastForward(5000);
        const underway = (await read(page)).mission;
        await page.reload();
        assert.deepEqual((await read(page)).mission, underway);
        await page.locator('#main [data-goal-focus="active-mission"]').click();
        const s = await read(page);
        await page.clock.fastForward((s.mission.end - s.clock) * 1000);
        await page.locator('#dialog [data-action="return-next"]').click();
        assert.match(
          await page.locator("#report").innerText(),
          /先校验安全航线|优先校验安全航线/,
        );
        assert.match(await page.locator("#report").innerText(), /等待稍长/);
        await page.locator('[data-action="claim"][data-id="share"]').click();
        await page.setViewportSize({ width: 375, height: 900 });
        await page
          .locator('[data-action="prepare"][data-id="calibrate"]')
          .click();
        await page.clock.runFor(3500);
        if (screenshotDir)
          await page.locator(".campaign-panel").screenshot({
            path: path.join(screenshotDir, "white-noise-plans-mobile.png"),
          });
        for (const [id, plan, choice, text] of [
          ["false-beacon", "calibrate", "aid", /两地公开的观测/],
          ["first-convoy", "relay", "letters", /收到应急供给/],
        ]) {
          await page
            .locator(`[data-action="prepare"][data-id="${plan}"]`)
            .click();
          await page
            .locator(`[data-action="mission"][data-id="${id}"]`)
            .click();
          const current = await read(page);
          await page.clock.fastForward(current.mission.seconds * 1000);
          await page.locator('#dialog [data-action="return-next"]').click();
          assert.match(await page.locator("#report").innerText(), text);
          assert.equal(
            (await read(page)).campaign.completed.length,
            id === "false-beacon" ? 1 : 2,
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          await page
            .locator(`[data-action="claim"][data-id="${choice}"]`)
            .click();
        }
        const completed = await read(page);
        assert.equal(completed.campaign.completed.length, 3);
        assert.equal(completed.lore.length, 8);
        assert.deepEqual(completed.lore.slice(0, 5), chapterThree.lore);
        assert.equal(completed.repeatId, "supply-run");
        assert.equal(
          await page
            .locator('[data-action="mission"][data-id="supply-run"]')
            .isEnabled(),
          true,
        );
        assert.match(
          await page.locator(".campaign-complete").textContent(),
          /第一支船队已经安全进港/,
        );
        await page.clock.runFor(3500);
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          if (screenshotDir)
            await page.locator(".campaign-complete").screenshot({
              path: path.join(
                screenshotDir,
                `chapter-three-complete-${width}.png`,
              ),
            });
        }
        await page.locator('[data-focus="chapter-three"]').click();
        await page
          .locator('.campaign-complete [data-goal-focus="route-archive"]')
          .click();
        assert.equal(
          await page.locator("#route-archive").getAttribute("open"),
          "",
        );
        assert.match(
          await page.locator(".archive-current").innerText(),
          /第四章|第4章/,
        );
        await page.locator('[data-focus="letter-receipt"]').click();
        assert.match(
          await page.locator('[data-details-key="letter-receipt"]').innerText(),
          /平安讯息/,
        );
        await page.locator('[data-focus="letter-handoff"]').click();
        assert.match(
          await page.locator('[data-details-key="letter-handoff"]').innerText(),
          /下一班人知道怎么回家/,
        );
        await page.locator('[data-focus="story-observations"]').click();
        assert.match(
          await page
            .locator('[data-details-key="story-observations"]')
            .innerText(),
          /补给优先/,
        );
        assert.equal(
          await page.locator('#route-archive [data-action="claim"]').count(),
          0,
        );
        if (screenshotDir)
          await page
            .locator(".character-file")
            .filter({ hasText: "祁岳" })
            .screenshot({
              path: path.join(screenshotDir, "qiyue-letter-mobile.png"),
            });
        assert.equal(
          (await read(page)).samples,
          completed.samples,
          "rereading never grants rewards",
        );
        assert.deepEqual((await read(page)).lore, completed.lore);
        await page.locator("#settings-button").click();
        const downloadPromise = page.waitForEvent("download");
        await page.locator('[data-action="export"]').click();
        const exported = JSON.parse(
          fs.readFileSync(await (await downloadPromise).path(), "utf8"),
        );
        assert.deepEqual(exported.campaign, completed.campaign);
        await page.keyboard.press("Escape");
        await page.locator("#settings-button").click();
        await page.locator("#import-file").setInputFiles({
          name: "third-chapter.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(exported)),
        });
        assert.deepEqual((await read(page)).campaign, completed.campaign);
        assert.deepEqual((await read(page)).lore, completed.lore);
        await page.reload();
        assert.deepEqual((await read(page)).campaign, completed.campaign);
        await page.locator('#navigation [data-id="explore"]').click();
        await page
          .locator('[data-action="mission"][data-id="supply-run"]')
          .click();
        assert.equal((await read(page)).mission.id, "supply-run");
      },
    );
    const missingPrerequisite = structuredClone(chapterThree);
    missingPrerequisite.research = [];
    missingPrerequisite.modules.scanner = 1;
    missingPrerequisite.samples = 0;
    await scenario(
      "mobile current star map leads directly to research, samples and actual equipped gear; completed sectors remain folded",
      { [S.KEY]: JSON.stringify(missingPrerequisite) },
      async (page) => {
        await page.setViewportSize({ width: 375, height: 900 });
        await page.locator('#navigation [data-id="explore"]').click();
        await page
          .locator('.campaign-panel [data-goal-focus="research-navigation"]')
          .click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "research-navigation",
        );
        await page
          .locator('[data-action="research"][data-id="navigation"]')
          .click();
        await page.locator('#navigation [data-id="explore"]').click();
        await page
          .locator('.campaign-panel [data-goal-focus="mission-belt"]')
          .click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "mission-belt",
        );
        for (let i = 0; i < 2; i++) {
          await page.locator('[data-action="mission"][data-id="belt"]').click();
          const s = await read(page);
          await page.clock.fastForward(s.mission.seconds * 1000);
          await page.locator('#dialog [data-action="return-next"]').click();
          await page.locator('[data-action="claim"]').click();
        }
        await page
          .locator('.campaign-panel [data-goal-focus="module-scanner"]')
          .click();
        assert.equal(
          await page.evaluate(() => document.activeElement.id),
          "module-scanner",
        );
        await page.locator('[data-action="module"][data-id="scanner"]').click();
        assert.equal((await read(page)).modules.scanner, 2);
        assert.equal(
          await page.locator(".completed-sectors").getAttribute("open"),
          null,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        await page.locator('[data-focus="completed-sectors"]').click();
        assert.equal(
          await page.locator(".completed-sectors .sector").count(),
          3,
        );
        await page
          .locator('[data-action="mission"][data-id="message"]')
          .click();
        assert.equal((await read(page)).mission.id, "message");
      },
    );
    const chapterFour = structuredClone(chapterThree);
    for (const m of D.MISSIONS.filter((m) => m.campaign)) {
      E.prepareMission(chapterFour, m.id, "relay");
      E.startMission(chapterFour, m.id);
      E.advance(
        chapterFour,
        chapterFour.lastAt + chapterFour.mission.seconds * 1000,
      );
      E.claimMission(chapterFour, D.STORIES[m.story].choices[0].id);
    }
    chapterFour.lastAt = TIME;
    chapterFour.run.dust = D.PRESTIGE_DUST;
    // These two optional fields were absent in the published v3.3 save format.
    delete chapterFour.council;
    delete chapterFour.loadouts;
    const noOverflow = async (page) =>
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    for (const focus of D.PORT_FOCUSES) {
      await scenario(
        `chapter four ${focus.name}: old v3.3 save, meeting, deliberate construction, real voyage metrics, mid-voyage gear/reload, safe offline report, archives and jump`,
        { [S.KEY]: JSON.stringify(chapterFour) },
        async (page) => {
          const loaded = await read(page);
          for (const key of [
            "dust",
            "cores",
            "samples",
            "buildings",
            "research",
            "modules",
            "lore",
            "campaign",
          ])
            assert.deepEqual(loaded[key], chapterFour[key]);
          await page
            .locator('#main [data-goal-focus="mission-port-council"]')
            .click();
          assert.equal(
            await page.locator(".campaign-complete").getAttribute("open"),
            null,
          );
          assert.ok(await page.locator(".council-panel").isVisible());
          await page
            .locator('[data-action="prepare"][data-id="relay"]')
            .click();
          await page
            .locator('[data-action="mission"][data-id="port-council"]')
            .click();
          let current = await read(page);
          await page.clock.fastForward(current.mission.seconds * 1000);
          await page.locator('#dialog [data-action="return-next"]').click();
          assert.match(
            await page.locator("#report").innerText(),
            /禾继续照顾伤员/,
          );
          await page
            .locator('[data-action="claim"][data-id="capacity"]')
            .click();
          await page.clock.runFor(3500);
          for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 900 });
            await noOverflow(page);
            assert.ok(await page.locator("#port-focus").isVisible());
            if (screenshotDir && focus.id === "reception")
              await page.locator(".council-panel").screenshot({
                path: path.join(screenshotDir, `port-directions-${width}.png`),
              });
          }
          const beforeBuild = await read(page);
          await page
            .locator(`[data-action="port-focus"][data-id="${focus.id}"]`)
            .click();
          assert.match(
            await page.locator("#dialog-body").innerText(),
            /不能重新选择/,
          );
          await page.keyboard.press("Escape");
          assert.deepEqual((await read(page)).council, beforeBuild.council);
          assert.equal((await read(page)).samples, beforeBuild.samples);
          await page
            .locator(`[data-action="port-focus"][data-id="${focus.id}"]`)
            .click();
          await page
            .locator(
              `[data-action="confirm-port-focus"][data-id="${focus.id}"]`,
            )
            .click();
          assert.equal((await read(page)).samples, beforeBuild.samples - 18);
          assert.equal((await read(page)).council.priority, focus.id);
          assert.equal(
            await page.locator('[data-action="port-focus"]').count(),
            0,
          );
          current = await read(page);
          const preview = E.missionPreview(
            current,
            "old-observatory",
            "supply",
          );
          const preparation = page.locator(
            '[data-action="prepare"][data-id="supply"]',
          );
          assert.match(
            await preparation.innerText(),
            new RegExp(`${preview.samples} 样本`),
          );
          assert.match(
            await preparation.innerText(),
            new RegExp(`分流 ${Math.round(preview.diversion * 1000) / 10}%`),
          );
          await preparation.click();
          const saved = (await read(page)).council;
          await page.reload();
          assert.deepEqual((await read(page)).council, saved);
          await page
            .locator('#main [data-goal-focus="mission-old-observatory"]')
            .click();
          await page
            .locator('[data-action="mission"][data-id="old-observatory"]')
            .click();
          const launched = (await read(page)).mission;
          for (const key of ["seconds", "diversion", "dust", "samples"])
            assert.equal(launched[key], preview[key]);
          await page.locator('[data-action="equip"][data-id="nav"]').click();
          assert.deepEqual((await read(page)).mission, launched);
          await page.clock.fastForward(5000);
          await page.reload();
          assert.deepEqual((await read(page)).mission, launched);
          await page
            .locator('#main [data-goal-focus="active-mission"]')
            .click();
          current = await read(page);
          await page.clock.fastForward(
            (current.mission.end - current.clock) * 1000,
          );
          await page.locator('#dialog [data-action="return-next"]').click();
          assert.match(
            await page.locator("#report").innerText(),
            /植物经历过的明暗/,
          );
          await page
            .locator('[data-action="claim"][data-id="crosscheck"]')
            .click();
          await page.locator('[data-action="equip"][data-id="nav"]').click();
          await page
            .locator('[data-action="prepare"][data-id="calibrate"]')
            .click();
          await page
            .locator('[data-action="mission"][data-id="shared-watch"]')
            .click();
          await page.clock.fastForward(8 * 3600 * 1000);
          await page.locator('#dialog [data-action="return-next"]').click();
          assert.equal((await read(page)).council.completed.length, 2);
          assert.match(
            await page.locator("#report").innerText(),
            /把自己的名字写进第一班/,
          );
          await noOverflow(page);
          await page
            .locator('[data-action="claim"][data-id="joint-watch"]')
            .click();
          const completed = await read(page);
          assert.equal(completed.council.completed.length, 3);
          assert.equal(completed.lore.length, 11);
          assert.deepEqual(completed.lore.slice(0, 8), chapterFour.lore);
          assert.equal(
            await page.locator(".council-complete").getAttribute("open"),
            null,
          );
          assert.ok(await page.locator(".rescue-panel").isVisible());
          await page.locator('[data-focus="chapter-four"]').click();
          assert.match(
            await page.locator(".council-complete").innerText(),
            /离线不会导致剧情失败/,
          );
          for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 900 });
            await noOverflow(page);
            if (screenshotDir && focus.id === "reception")
              await page.locator(".council-complete").screenshot({
                path: path.join(
                  screenshotDir,
                  `chapter-four-complete-${width}.png`,
                ),
              });
          }
          await page
            .locator('.council-panel [data-goal-focus="route-archive"]')
            .click();
          assert.match(
            await page.locator(".archive-current").innerText(),
            /第5章/,
          );
          await page.locator('[data-focus="letter-next-watch"]').click();
          assert.match(
            await page
              .locator('[data-details-key="letter-next-watch"]')
              .innerText(),
            /等待不算失败/,
          );
          await page.locator('[data-focus="story-tide-record"]').click();
          assert.match(
            await page
              .locator('[data-details-key="story-tide-record"]')
              .innerText(),
            new RegExp(focus.text),
          );
          assert.equal((await read(page)).samples, completed.samples);
          await page.locator('#navigation [data-id="jump"]').click();
          await page.locator('[data-action="jump"]').click();
          await page.locator('[data-action="confirm-jump"]').click();
          assert.deepEqual((await read(page)).council, completed.council);
          await page.reload();
          assert.deepEqual((await read(page)).council, completed.council);
          assert.deepEqual((await read(page)).lore, completed.lore);
        },
      );
    }
    const presetSave = structuredClone(chapterThree);
    presetSave.modules.battery = 2;
    presetSave.modules.medbay = 2;
    presetSave.samples = 60;
    await scenario(
      "saved equipment presets: real production/voyage comparison, one-click two-slot replacement, active snapshot preservation, reload, upgrades and export/import",
      { [S.KEY]: JSON.stringify(presetSave) },
      async (page) => {
        await page.locator('#navigation [data-id="explore"]').click();
        await page
          .locator('[data-action="loadout-save"][data-id="voyage"]')
          .click();
        await page.locator('[data-action="equip"][data-id="nav"]').click();
        await page.locator('[data-action="equip"][data-id="scanner"]').click();
        await page.locator('[data-action="equip"][data-id="battery"]').click();
        await page.locator('[data-action="equip"][data-id="medbay"]').click();
        await page
          .locator('[data-action="loadout-save"][data-id="production"]')
          .click();
        const production = await read(page);
        assert.deepEqual(production.loadouts.production, ["battery", "medbay"]);
        assert.deepEqual(production.loadouts.voyage, ["nav", "scanner"]);
        assert.equal(production.equipped.length, 2);
        await page.clock.runFor(3500);
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 900 });
          await noOverflow(page);
          assert.ok(await page.locator("#loadouts").isVisible());
          if (screenshotDir)
            await page.locator("#loadouts").screenshot({
              path: path.join(screenshotDir, `equipment-presets-${width}.png`),
            });
        }
        await page
          .locator('[data-action="loadout-apply"][data-id="voyage"]')
          .click();
        assert.deepEqual((await read(page)).equipped, ["nav", "scanner"]);
        assert.equal(
          E.rawRate(await read(page)),
          E.loadoutPreview(production, "voyage", "white-noise").rate,
        );
        await page.locator('[data-action="prepare"][data-id="supply"]').click();
        await page
          .locator('[data-action="mission"][data-id="white-noise"]')
          .click();
        const launched = (await read(page)).mission;
        await page
          .locator('[data-action="loadout-apply"][data-id="production"]')
          .click();
        assert.deepEqual((await read(page)).mission, launched);
        assert.deepEqual((await read(page)).equipped, ["battery", "medbay"]);
        await page.reload();
        assert.deepEqual((await read(page)).loadouts, production.loadouts);
        assert.deepEqual((await read(page)).mission, launched);
        await page.locator('#main [data-goal-focus="active-mission"]').click();
        await page.locator('[data-action="module"][data-id="nav"]').click();
        assert.equal((await read(page)).modules.nav, 3);
        await page
          .locator('[data-action="loadout-apply"][data-id="voyage"]')
          .click();
        assert.deepEqual((await read(page)).mission, launched);
        assert.deepEqual((await read(page)).equipped, ["nav", "scanner"]);
        const saved = await read(page);
        await page.locator("#settings-button").click();
        const downloadPromise = page.waitForEvent("download");
        await page.locator('[data-action="export"]').click();
        const exported = JSON.parse(
          fs.readFileSync(await (await downloadPromise).path(), "utf8"),
        );
        assert.deepEqual(exported.loadouts, saved.loadouts);
        assert.deepEqual(exported.mission, launched);
        await page.keyboard.press("Escape");
        await page.locator("#settings-button").click();
        await page.locator("#import-file").setInputFiles({
          name: "fourth-chapter-presets.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(exported)),
        });
        await page.locator("#confirm-import").click();
        assert.deepEqual((await read(page)).loadouts, saved.loadouts);
        assert.deepEqual((await read(page)).mission, launched);
      },
    );
    function rescueReady(focus = "reception") {
      const s = E.sanitize(structuredClone(chapterFour), TIME);
      const finish = (id) => {
        assert.ok(E.prepareMission(s, id, "relay"));
        assert.ok(E.startMission(s, id));
        E.advance(s, s.lastAt + s.mission.seconds * 1000);
        assert.ok(E.claimMission(s, D.STORIES[s.result.story].choices[0].id));
      };
      finish("port-council");
      assert.ok(E.buildPortFocus(s, focus));
      finish("old-observatory");
      finish("shared-watch");
      s.lastAt = TIME;
      s.beacon.expiresAt = 0;
      return s;
    }
    for (const [index, focus] of D.PORT_FOCUSES.entries()) {
      const initial = rescueReady(focus.id),
        energy = D.RESCUE_ENERGY[index];
      delete initial.rescue; // Published v3.4 progress gets only optional empty rescue fields.
      await scenario(
        `chapter five ${focus.name}/${energy.name}: consent, backup waiting, gear snapshot, offline reports, protocol, archives, import and jump`,
        { [S.KEY]: JSON.stringify(initial) },
        async (page) => {
          const loaded = await read(page);
          for (const key of [
            "dust",
            "samples",
            "cores",
            "buildings",
            "research",
            "modules",
            "lore",
            "campaign",
            "council",
            "loadouts",
          ])
            assert.deepEqual(loaded[key], initial[key]);
          await page.locator('#main [data-goal-focus="rescue-energy"]').click();
          assert.equal(
            await page.locator(".campaign-complete[open]").count(),
            0,
          );
          assert.equal(await page.locator(".rescue-panel").count(), 1);
          for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 900 });
            await noOverflow(page);
            if (screenshotDir && index === 0)
              await page.locator("#rescue-energy").screenshot({
                path: path.join(screenshotDir, `rescue-energy-${width}.png`),
              });
          }
          await page.clock.runFor(5000);
          const before = await read(page);
          await page
            .locator(`[data-action="rescue-energy"][data-id="${energy.id}"]`)
            .click();
          await noOverflow(page);
          await page.keyboard.press("Escape");
          assert.equal((await read(page)).rescue.energy, null);
          assert.equal((await read(page)).samples, before.samples);
          await page
            .locator(`[data-action="rescue-energy"][data-id="${energy.id}"]`)
            .click();
          await page
            .locator(
              `[data-action="confirm-rescue-energy"][data-id="${energy.id}"]`,
            )
            .click();
          assert.equal(
            (await read(page)).samples,
            before.samples - energy.samples,
          );
          const storyChoices = ["watch", "address", "water"];
          for (const [i, m] of D.RESCUE_MISSIONS.entries()) {
            if (m.requiresBackupBerth) {
              assert.ok(
                await page
                  .locator(`[data-action="mission"][data-id="${m.id}"]`)
                  .isDisabled(),
              );
              assert.ok(
                await page
                  .locator('[data-action="rescue-check"][data-id="captain"]')
                  .isDisabled(),
              );
              const waiting = (await read(page)).rescue;
              await page.clock.fastForward(8 * 3600 * 1000);
              await page.locator('#dialog [data-action="return-next"]').click();
              assert.deepEqual((await read(page)).rescue, waiting);
              assert.match(
                await page.locator("#rescue-berth").innerText(),
                /等待没有期限/,
              );
              await page.locator('[data-action="rescue-berth"]').click();
              assert.equal((await read(page)).rescue.berth, true);
            }
            assert.equal(
              (await read(page)).rescue.checks,
              null,
              "each convoy needs fresh consent",
            );
            await page
              .locator('[data-action="rescue-check"][data-id="captain"]')
              .click();
            assert.ok(
              await page
                .locator(`[data-action="mission"][data-id="${m.id}"]`)
                .isDisabled(),
            );
            assert.ok(
              await page
                .locator('[data-action="prepare"][data-id="relay"]')
                .isDisabled(),
            );
            await page.reload();
            assert.deepEqual((await read(page)).rescue.checks.confirmed, [
              "captain",
            ]);
            await page
              .locator('#main [data-goal-focus="rescue-checks"]')
              .click();
            assert.equal(
              await page.evaluate(() => document.activeElement.id),
              "rescue-checks",
            );
            await page
              .locator('[data-action="rescue-check"][data-id="observer"]')
              .click();
            await page
              .locator('[data-action="rescue-check"][data-id="berth"]')
              .click();
            const plan = D.EXPEDITION_PLANS[i];
            await page
              .locator(`[data-action="prepare"][data-id="${plan.id}"]`)
              .click();
            const prepared = await read(page),
              preview = E.missionPreview(prepared, m.id);
            assert.equal(prepared.rescue.preparation.plan, plan.id);
            for (const width of [1280, 375]) {
              await page.setViewportSize({ width, height: 900 });
              await noOverflow(page);
              if (screenshotDir && index === 0 && i === 1) {
                await page.locator("#rescue-berth").scrollIntoViewIfNeeded();
                await page.clock.runFor(3500);
                await page.screenshot({
                  path: path.join(screenshotDir, `backup-consent-${width}.png`),
                });
              }
            }
            await page
              .locator(`[data-action="mission"][data-id="${m.id}"]`)
              .click();
            const launched = (await read(page)).mission;
            for (const key of ["seconds", "samples", "dust", "diversion"])
              assert.equal(launched[key], preview[key]);
            assert.equal(launched.confirmations.length, 3);
            await page
              .locator(`[data-action="equip"][data-id="${m.equipment.id}"]`)
              .click();
            await page.locator('#navigation [data-id="home"]').click();
            assert.equal(
              await page.locator("#next-goal-title").innerText(),
              "等待当前航程归航",
            );
            await page.reload();
            assert.deepEqual((await read(page)).mission, launched);
            await page
              .locator('#main [data-goal-focus="active-mission"]')
              .click();
            await page.clock.fastForward(8 * 3600 * 1000);
            await page.locator('#dialog [data-action="return-next"]').click();
            assert.equal((await read(page)).rescue.completed.length, i);
            assert.equal((await read(page)).result.samples, launched.samples);
            assert.match(
              await page.locator("#report").innerText(),
              new RegExp(D.STORIES[m.story].title),
            );
            await noOverflow(page);
            await page
              .locator(`[data-action="claim"][data-id="${storyChoices[i]}"]`)
              .click();
            assert.equal((await read(page)).rescue.completed.length, i + 1);
            assert.equal((await read(page)).result, null);
            await page
              .locator(`[data-action="equip"][data-id="${m.equipment.id}"]`)
              .click();
          }
          const rescued = await read(page);
          assert.equal(rescued.rescue.protocol, false);
          assert.match(
            await page.locator("#keeper-protocol").innerText(),
            /三队全部安全入港/,
          );
          await page.locator('[data-action="keeper-protocol"]').click();
          const completed = await read(page);
          assert.equal(completed.rescue.protocol, true);
          assert.equal(completed.samples, rescued.samples);
          assert.equal(
            await page.locator('[data-action="keeper-protocol"]').count(),
            0,
          );
          assert.ok(await page.locator(".epilogue-panel").isVisible());
          await page.locator('[data-focus="chapter-five"]').click();
          for (const width of [1280, 375]) {
            await page.setViewportSize({ width, height: 900 });
            await noOverflow(page);
            if (screenshotDir && index === 0)
              await page.locator("#keeper-protocol").screenshot({
                path: path.join(screenshotDir, `protocol-signed-${width}.png`),
              });
          }
          await page
            .locator('.rescue-panel [data-goal-focus="route-archive"]')
            .click();
          assert.match(
            await page.locator(".archive-current").innerText(),
            /第6章.*给未来一个地址/,
          );
          await page.locator('[data-focus="letter-shared-protocol"]').click();
          assert.match(
            await page
              .locator('[data-details-key="letter-shared-protocol"]')
              .innerText(),
            /等待名单清空/,
          );
          assert.equal((await read(page)).samples, completed.samples);
          await page.locator("#settings-button").click();
          const downloaded = page.waitForEvent("download");
          await page.locator('[data-action="export"]').click();
          const download = await downloaded,
            source = await download.path(),
            exported = JSON.parse(fs.readFileSync(source, "utf8"));
          assert.deepEqual(exported.rescue, completed.rescue);
          await page.keyboard.press("Escape");
          await page.locator("#settings-button").click();
          await page.locator("#import-file").setInputFiles({
            name: "rescue-record.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(exported)),
          });
          await page.locator("#confirm-import").click();
          assert.deepEqual((await read(page)).rescue, completed.rescue);
          await page.locator('#navigation [data-id="jump"]').click();
          await page.locator('[data-action="jump"]').click();
          await page.locator('[data-action="confirm-jump"]').click();
          await page.reload();
          assert.deepEqual((await read(page)).rescue, completed.rescue);
          assert.deepEqual((await read(page)).lore, completed.lore);
        },
      );
    }
    const scarce = rescueReady();
    scarce.samples = 0;
    scarce.buildings.drone = 1;
    await scenario(
      "rescue with no spare resources: paid options disabled, free rotation remains reachable, manual supply and safe waiting",
      { [S.KEY]: JSON.stringify(scarce) },
      async (page) => {
        await page.locator('#main [data-goal-focus="rescue-energy"]').click();
        assert.ok(
          await page
            .locator('[data-action="rescue-energy"][data-id="arrays"]')
            .isDisabled(),
        );
        assert.ok(
          await page
            .locator('[data-action="rescue-energy"][data-id="observatory"]')
            .isDisabled(),
        );
        assert.ok(
          await page
            .locator('[data-action="rescue-energy"][data-id="rotation"]')
            .isEnabled(),
        );
        await page.setViewportSize({ width: 375, height: 900 });
        await noOverflow(page);
        await page
          .locator('[data-action="rescue-energy"][data-id="rotation"]')
          .click();
        await page
          .locator('[data-action="confirm-rescue-energy"][data-id="rotation"]')
          .click();
        assert.equal((await read(page)).samples, 0);
        for (const c of D.RESCUE_CONFIRMATIONS)
          await page
            .locator(`[data-action="rescue-check"][data-id="${c.id}"]`)
            .click();
        await page.locator('[data-action="prepare"][data-id="relay"]').click();
        await page
          .locator('[data-action="mission"][data-id="convoy-relay"]')
          .click();
        assert.equal((await read(page)).mission.id, "convoy-relay");
        await noOverflow(page);
      },
    );
    function endingReady(focus, energy) {
      const s = rescueReady(focus);
      assert.ok(E.arrangeRescueEnergy(s, energy));
      for (const m of D.RESCUE_MISSIONS) {
        if (m.requiresBackupBerth) assert.ok(E.confirmBackupBerth(s));
        for (const c of D.RESCUE_CONFIRMATIONS)
          assert.ok(E.confirmRescue(s, m.id, c.id));
        assert.ok(E.prepareMission(s, m.id, "relay"));
        assert.ok(E.startMission(s, m.id));
        E.advance(s, s.lastAt + s.mission.seconds * 1000);
        assert.ok(E.claimMission(s, D.STORIES[m.story].choices[0].id));
      }
      assert.ok(E.adoptKeeperProtocol(s));
      s.samples = s.cores = s.dust = 0;
      s.lastAt = TIME;
      s.legacyArchive = {
        version: 31,
        expedition: { remaining: 55 },
        season: { unclaimed: ["reward"] },
      };
      return s;
    }
    for (const [index, focus] of D.PORT_FOCUSES.entries()) {
      for (const ending of D.ENDINGS) {
        const initial = endingReady(focus.id, D.RESCUE_ENERGY[index].id);
        delete initial.epilogue; // Published v3.5 save, not a constructed v3.6 ending record.
        await scenario(
          `chapter six ${focus.name}/${ending.title}: old save, zero cost, partial reload, preview/cancel, permanent ending, archives and free play`,
          { [S.KEY]: JSON.stringify(initial) },
          async (page) => {
            const before = await read(page);
            for (const key of [
              "dust",
              "cores",
              "samples",
              "buildings",
              "research",
              "rescue",
              "lore",
              "legacyArchive",
            ])
              assert.deepEqual(before[key], initial[key]);
            await page
              .locator('#main [data-goal-focus="epilogue-ayao"]')
              .click();
            assert.ok(await page.locator(".epilogue-panel").isVisible());
            assert.equal(
              await page
                .locator('[data-details-key="chapter-five"]')
                .getAttribute("open"),
              null,
            );
            assert.match(
              await page.locator("#epilogue-ayao").innerText(),
              /禾没有回来/,
            );
            assert.equal(
              await page
                .locator('[data-action="ending-preview"]:disabled')
                .count(),
              3,
            );
            await page
              .locator('[data-action="epilogue-confirm"][data-id="ayao"]')
              .click();
            assert.deepEqual((await read(page)).epilogue, {
              confirmed: ["ayao"],
              ending: null,
            });
            await page.reload();
            await page
              .locator('#main [data-goal-focus="epilogue-qiyue"]')
              .click();
            assert.deepEqual((await read(page)).epilogue.confirmed, ["ayao"]);
            await page
              .locator('[data-action="epilogue-confirm"][data-id="qiyue"]')
              .click();
            if (
              (await page.locator("#epilogue-wei").getAttribute("open")) ===
              null
            )
              await page.locator("#epilogue-wei summary").click();
            assert.match(
              await page.locator("#epilogue-wei").innerText(),
              /苇没有回来/,
            );
            await page
              .locator('[data-action="epilogue-confirm"][data-id="wei"]')
              .click();
            const handed = await read(page);
            assert.equal(handed.epilogue.ending, null);
            for (const key of [
              "dust",
              "cores",
              "samples",
              "buildings",
              "research",
              "rescue",
              "lore",
              "legacyArchive",
            ])
              assert.deepEqual(
                handed[key],
                initial[key],
                "handoffs never charge or re-award old resources",
              );
            assert.equal(
              await page
                .locator('[data-action="ending-preview"]:enabled')
                .count(),
              3,
            );
            for (const width of [1280, 375]) {
              await page.setViewportSize({ width, height: 900 });
              await noOverflow(page);
              await page
                .locator(`#ending-choices [data-id="${ending.id}"]`)
                .click();
              assert.match(
                await page.locator("dialog[open]").innerText(),
                new RegExp(ending.quote),
              );
              await noOverflow(page);
              assert.equal((await read(page)).epilogue.ending, null);
              await page.keyboard.press("Escape");
              assert.equal((await read(page)).epilogue.ending, null);
            }
            await page.reload();
            await page
              .locator('#main [data-goal-focus="ending-choices"]')
              .click();
            assert.equal((await read(page)).epilogue.ending, null);
            await page.setViewportSize({ width: 1280, height: 900 });
            if (screenshotDir && index === 0 && ending.id === "city") {
              await page.clock.runFor(5000);
              await page.locator("#ending-choices").screenshot({
                path: path.join(screenshotDir, "ending-choices-desktop.png"),
                animations: "disabled",
              });
            }
            const beforeEnding = await read(page);
            await page
              .locator(`#ending-choices [data-id="${ending.id}"]`)
              .click();
            await page
              .locator(`[data-action="confirm-ending"][data-id="${ending.id}"]`)
              .click();
            const finished = await read(page);
            assert.equal(finished.epilogue.ending, ending.id);
            for (const key of [
              "dust",
              "cores",
              "samples",
              "buildings",
              "research",
              "rescue",
              "lore",
              "legacyArchive",
            ])
              assert.deepEqual(finished[key], beforeEnding[key]);
            assert.match(
              await page.locator("#ending-record").innerText(),
              new RegExp(ending.quote),
            );
            for (const alternative of D.ENDINGS) {
              await page
                .locator(`#ending-choices [data-id="${alternative.id}"]`)
                .click();
              assert.equal(
                await page.locator('[data-action="confirm-ending"]').count(),
                0,
              );
              await page.keyboard.press("Escape");
              assert.deepEqual((await read(page)).epilogue, finished.epilogue);
            }
            await page.setViewportSize({ width: 375, height: 900 });
            await noOverflow(page);
            if (screenshotDir && index === 0 && ending.id === "city") {
              await page.clock.runFor(3500);
              await page.locator("#ending-record").screenshot({
                path: path.join(screenshotDir, "ending-city-mobile.png"),
                animations: "disabled",
              });
            }
            await page
              .locator('.ending-actions [data-goal-focus="route-archive"]')
              .click();
            assert.match(
              await page.locator(".archive-current").innerText(),
              new RegExp(`第6章.*主线完成.*${ending.title}`),
            );
            assert.equal(
              await page
                .locator('[data-details-key^="archive-handoff-"]')
                .count(),
              3,
            );
            assert.equal(
              await page.locator('[data-focus^="letter-future-"]').count(),
              3,
            );
            await page.locator('[data-focus="letter-future-seed"]').click();
            assert.match(
              await page
                .locator('[data-details-key="letter-future-seed"]')
                .innerText(),
              /苇的种苗/,
            );
            assert.deepEqual((await read(page)).epilogue, finished.epilogue);
            await page.locator("#settings-button").click();
            const downloaded = page.waitForEvent("download");
            await page.locator('[data-action="export"]').click();
            const download = await downloaded;
            const exported = JSON.parse(
              fs.readFileSync(await download.path(), "utf8"),
            );
            assert.deepEqual(exported.epilogue, finished.epilogue);
            await page.keyboard.press("Escape");
            await page.locator("#settings-button").click();
            await page.locator("#import-file").setInputFiles({
              name: "ending-save.json",
              mimeType: "application/json",
              buffer: Buffer.from(JSON.stringify(exported)),
            });
            await page.locator("#confirm-import").click();
            assert.deepEqual((await read(page)).epilogue, finished.epilogue);
            await page.locator('#navigation [data-id="explore"]').click();
            await page
              .locator('.ending-actions [data-goal-focus="mission-supply-run"]')
              .click();
            await page
              .locator('[data-action="mission"][data-id="supply-run"]')
              .click();
            const active = await read(page);
            assert.equal(active.mission.id, "supply-run");
            await page.clock.fastForward(active.mission.seconds * 1000 + 5000);
            if (await page.locator("dialog[open]").count())
              await page.locator('[data-action="return-next"]').click();
            await page.locator('[data-action="claim"]').click();
            assert.ok((await read(page)).samples > 0);
            assert.deepEqual((await read(page)).epilogue, finished.epilogue);
            await page.locator('#navigation [data-id="jump"]').click();
            await page.locator('[data-action="jump"]').click();
            await page.locator('[data-action="confirm-jump"]').click();
            await page.reload();
            assert.deepEqual((await read(page)).epilogue, finished.epilogue);
            assert.deepEqual(
              (await read(page)).legacyArchive,
              initial.legacyArchive,
            );
            assert.ok(await page.locator("#next-goal-title").innerText());
          },
        );
      }
    }
    const automaticEpilogue = endingReady("ecology", "rotation");
    E.configure(automaticEpilogue, { dispatch: true });
    assert.ok(E.startMission(automaticEpilogue, "supply-run"));
    await scenario(
      "chapter six during automatic supply: active voyage survives handoff, eight-hour absence never selects ending, manual continuation still reachable",
      { [S.KEY]: JSON.stringify(automaticEpilogue) },
      async (page) => {
        await page.locator('#main [data-goal-focus="epilogue-ayao"]').click();
        const mission = (await read(page)).mission;
        await page
          .locator('[data-action="epilogue-confirm"][data-id="ayao"]')
          .click();
        assert.deepEqual((await read(page)).mission, mission);
        await page.clock.fastForward(D.OFFLINE_SECONDS * 1000);
        if (await page.locator("dialog[open]").count())
          await page.keyboard.press("Escape");
        const resumed = await read(page);
        assert.deepEqual(resumed.epilogue, {
          confirmed: ["ayao"],
          ending: null,
        });
        assert.ok(resumed.mission || resumed.result);
        await page.reload();
        assert.deepEqual((await read(page)).epilogue, resumed.epilogue);
        if (await page.locator("dialog[open]").count())
          await page.keyboard.press("Escape");
        const goal = page.locator('#main [data-action="nav"]').first();
        await goal.click();
        assert.ok(await page.locator(".epilogue-panel").isVisible());
        for (const h of D.EPILOGUE_HANDOFFS.filter((h) => h.id !== "ayao")) {
          const details = page.locator(`#epilogue-${h.id}`);
          if ((await details.getAttribute("open")) === null)
            await details.locator("summary").click();
          await page
            .locator(`[data-action="epilogue-confirm"][data-id="${h.id}"]`)
            .click();
        }
        const active = await read(page);
        await page.locator('#ending-choices [data-id="watch"]').click();
        await page.locator('[data-action="confirm-ending"]').focus();
        await page.keyboard.press("Enter");
        assert.equal((await read(page)).epilogue.ending, "watch");
        assert.deepEqual((await read(page)).mission, active.mission);
        const supplyFocus = active.result ? "report" : "active-mission";
        await page
          .locator(`.ending-actions [data-goal-focus="${supplyFocus}"]`)
          .click();
        assert.ok(await page.locator(`#${supplyFocus}`).isVisible());
        await noOverflow(page);
      },
    );
    for (let option = 0; option < 3; option++) {
      const initial = ready();
      initial.rebirths = 4;
      initial.cores = 30;
      initial.totalCores = 28;
      initial.samples = 100;
      initial.modules = { nav: 2, scanner: 2 };
      initial.equipped = ["nav", "scanner"];
      initial.research = ["navigation"];
      await scenario(
        `first two chapters dialogue path ${option + 1}: keyboard reading, distinct responses, direct archive focus, construction records, reload and unchanged rewards`,
        { [S.KEY]: JSON.stringify(initial) },
        async (page) => {
          const opening = page.locator('[data-details-key="home-awakening"]');
          const beforeOpening = await read(page);
          await opening.locator("summary").focus();
          await page.keyboard.press("Enter");
          assert.match(await opening.innerText(), /暂时只是一个名字/);
          assert.deepEqual(await read(page), beforeOpening);
          await page.locator('#navigation [data-id="explore"]').click();
          assert.equal(
            await page
              .locator('[data-details-key="archive-scene-port-lit"]')
              .count(),
            0,
          );
          assert.equal(await page.locator("#story-relay").count(), 0);
          for (const [mission, story] of [
            ["wreck", "hospital"],
            ["garden", "garden"],
            ...D.PROJECTS.map((p) => [p.mission, p.story]),
          ]) {
            const button = page.locator(
              `[data-action="mission"][data-id="${mission}"]`,
            );
            await button.click();
            const active = await read(page);
            assert.equal(active.mission.id, mission);
            await page.clock.fastForward(active.mission.seconds * 1000 + 5000);
            if (await page.locator("dialog[open]").count())
              await page.locator('[data-action="return-next"]').click();
            const pending = await read(page);
            const dialogue = page.locator(
              `#report [data-details-key="report-scene-${story}"]`,
            );
            assert.equal(await dialogue.getAttribute("open"), null);
            await dialogue.locator("summary").focus();
            await page.keyboard.press("Enter");
            assert.ok(await dialogue.locator(".scene-transcript").isVisible());
            const scene = E.storyScene(pending, story);
            for (const line of scene.lines)
              assert.ok((await dialogue.innerText()).includes(line.text));
            assert.equal(await dialogue.locator("h4").count(), 0);
            assert.deepEqual(await read(page), pending);
            for (const width of [1280, 375]) {
              await page.setViewportSize({ width, height: 900 });
              await noOverflow(page);
            }
            await page.setViewportSize({ width: 1280, height: 900 });
            if (screenshotDir && option === 1 && story === "hospital")
              await page
                .locator("#report")
                .screenshot({
                  path: path.join(screenshotDir, "dialogue-desktop.png"),
                  animations: "disabled",
                });
            const choice = D.STORIES[story].choices[option];
            await page
              .locator(`[data-action="claim"][data-id="${choice.id}"]`)
              .click();
            const claimed = await read(page),
              response = E.storyScene(claimed, story);
            assert.equal(claimed.result, null);
            assert.equal(claimed.lore.at(-1).choice, choice.id);
            assert.equal(
              await page.locator('[data-action="claim"]').count(),
              0,
            );
            for (const line of response.response)
              assert.ok(
                (await page.locator(".scene-afterword").innerText()).includes(
                  line.text,
                ),
              );
            await page.locator('[data-action="scene-read"]').focus();
            await page.keyboard.press("Enter");
            assert.equal(
              await page.evaluate(() => document.activeElement.id),
              `story-${story}`,
            );
            const archiveEntry = page.locator(`#story-${story}`);
            assert.notEqual(await archiveEntry.getAttribute("open"), null);
            assert.ok(
              await archiveEntry
                .locator(".scene-transcript")
                .first()
                .isVisible(),
            );
            for (const line of response.response)
              assert.ok((await archiveEntry.innerText()).includes(line.text));
            assert.deepEqual(await read(page), claimed);
            await page.setViewportSize({ width: 375, height: 900 });
            await noOverflow(page);
            await page.locator('[data-action="scene-dismiss"]').click();
            assert.deepEqual(await read(page), claimed);
            await page.reload();
            assert.deepEqual(await read(page), claimed);
            await page.locator('#navigation [data-id="explore"]').click();
            assert.equal(await page.locator(".scene-afterword").count(), 0);
            await page.locator("#route-archive > summary").click();
            await page.locator(`#story-${story} > summary`).click();
            assert.ok(
              (await page.locator(`#story-${story}`).innerText()).includes(
                response.response[0].text,
              ),
            );
            assert.deepEqual(await read(page), claimed);
              if (screenshotDir && option === 1 && story === "hospital")
                await page.locator(`#story-${story}`).screenshot({
                  path: path.join(screenshotDir, "dialogue-mobile.png"),
                  animations: "disabled",
                });
            if (story === "hospital") {
              for (const stage of D.PORT)
                await page.locator('[data-action="port"]').click();
              assert.equal((await read(page)).starport, 3);
              assert.equal(
                await page
                  .locator('[data-details-key="archive-scene-port-lit"]')
                  .count(),
                1,
              );
            }
            const project = D.PROJECTS.find((p) => p.story === story);
            if (project) {
              assert.equal(
                await page
                  .locator(
                    `[data-details-key="archive-scene-${project.id}-built"]`,
                  )
                  .count(),
                0,
              );
              await page
                .locator(`[data-action="project"][data-id="${project.id}"]`)
                .click();
              const built = await read(page);
              const record = page.locator(
                `[data-details-key="archive-scene-${project.id}-built"]`,
              );
              await record.locator("summary").click();
              assert.ok(await record.locator(".scene-transcript").isVisible());
              assert.deepEqual(await read(page), built);
              await noOverflow(page);
            }
          }
          assert.equal((await read(page)).lore.length, 5);
          assert.equal((await read(page)).chapter.length, 3);
          await page.locator('#navigation [data-id="home"]').click();
          await page
            .locator('#main [data-goal-focus="mission-white-noise"]')
            .click();
          assert.equal(
            await page.evaluate(() => document.activeElement.id),
            "mission-white-noise",
          );
          assert.ok(
            await page
              .locator('[data-action="prepare"][data-mission="white-noise"]')
              .first()
              .isEnabled(),
          );
        },
      );
    }
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
