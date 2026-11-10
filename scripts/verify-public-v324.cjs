"use strict";

// Read-only public-site acceptance. Only fresh, nonpersistent browser contexts
// are used; production Firebase is disabled in test responses by the existing
// isolation helper. No player browser profile or production storage is opened.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const D = require("../v3/data.js");
const S = require("../v3/storage.js");
const fixtures = require("../tests/fixtures/v316-saves.json");
const canonicalSets=['v311','v316','v320','v321','v322','v323'].map(version=>({version,rows:require(`../tests/fixtures/${version}-saves.json`).states}));
const isolate = require("../tests/helpers/isolate-browser.cjs");
const engineName = process.env.V3_BROWSER_ENGINE || "chromium";
const playwright = require(process.env.CODEX_PLAYWRIGHT_PATH || "playwright");
const base = new URL(process.env.PUBLIC_GAME_URL || "https://lv5accelerator-xy.github.io/my-html-game/");
assert.ok(base.pathname.endsWith("/"), "PUBLIC_GAME_URL must end with /");
const root = path.resolve(__dirname, "..");
const output = process.env.PUBLIC_AUDIT_DIR || path.join(root, "public-audit", engineName);
fs.mkdirSync(output, { recursive: true });
const files = ["index.html", "styles.css", "game.js", "game-math.js", "v2-systems.js", "legacy-systems.js", "firebase-config.js", "cloud-save.js", ...["index.html", "style.css", "data.js", "engine.js", "storage.js", "app.js"].map(x => "v3/" + x)];
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const result = { engine: engineName, expectedVersion: D.GAME_VERSION, referenceSha: process.env.RELEASE_SOURCE_SHA || null, publicUrl: base.href, assets: [], flows: [], canonicalSnapshots: 0, notes: [] };

async function run() {
  console.log("AUDIT_TARGET " + base.href + " engine=" + engineName);
  const client = await playwright.request.newContext();
  try {
    for (const file of files) {
      const response = await client.get(new URL(file, base).href);
      assert.equal(response.status(), 200, file + " HTTP status");
      const bytes = await response.body();
      const expected = hash(fs.readFileSync(path.join(root, file)));
      const actual = hash(bytes);
      result.assets.push({ file, status: response.status(), bytes: bytes.length, sha256: actual });
      assert.equal(actual, expected, file + " published bytes must match reviewed source");
    }
  } finally { await client.dispose(); }
  const browser = await playwright[engineName].launch({ headless: true, executablePath: engineName === "chromium" ? process.env.CODEX_CHROMIUM_PATH || undefined : undefined });
  async function flow(name, viewport, target, initial, check) {
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    await isolate(context, target);
    const page = await context.newPage();
    const errors = [], consoleErrors = [], warnings = [], badResponses = [], failedRequests = [];
    const responses = new Map();
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
      if (message.type() === "warning") warnings.push(message.text());
    });
    page.on("response", response => {
      responses.set(response.url(), response);
      if (response.status() >= 400) badResponses.push({ url: response.url(), status: response.status() });
    });
    page.on("requestfailed", request => {
      const failure = { url: request.url(), error: request.failure()?.errorText };
      // Changing/stopping a soundtrack legitimately cancels its media stream.
      if (new URL(request.url()).pathname.endsWith(".mp3") && /ABORTED|cancelled/i.test(failure.error || "")) result.notes.push(failure);
      else failedRequests.push(failure);
    });
    if (initial) {
      await page.clock.install({ time: initial.lastAt - 60000 });
      await page.clock.pauseAt(initial.lastAt);
      await context.addInitScript(({ key, state }) => {
        if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(state));
      }, { key: S.KEY, state: initial });
    }
    const sceneReady = async () => {
      if (!new URL(target).pathname.endsWith("/v3/")) return;
      await page.locator(".scene").waitFor();
      const asset = new URL("assets/salvage-orbit.webp", target).href;
      const response = responses.get(asset) || await page.waitForResponse(r => r.url() === asset);
      assert.equal(response.status(), 200, "visible scene image HTTP status");
      assert.equal(await response.finished(), null, "visible scene image body fully loaded");
    };
    const reload = async () => {
      // The app inserts its CSS background dynamically. A load event can precede
      // that image's completion, especially in WebKit. Verify its body before
      // deliberately navigating, rather than ignoring a cancelled request.
      await sceneReady(); responses.clear();
      await page.reload({ waitUntil: "load" });
      await sceneReady();
    };
    try {
      const response = await page.goto(target, { waitUntil: "load" });
      assert.equal(response.status(), 200);
      await sceneReady();
      const navigation = initial ? { measured: false, reason: "Migration fixtures use a controlled clock; loading timings are measured in fresh contexts." } : await page.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0];
        if (!n) throw new Error("Fresh navigation timing entry is missing");
        return { measured: true, domContentLoadedMs: n.domContentLoadedEventEnd, loadMs: n.loadEventEnd, transferBytes: n.transferSize, resources: performance.getEntriesByType("resource").length };
      });
      await check(page, reload);
      const layout = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      assert.ok(layout.document <= viewport.width + 1 && layout.body <= viewport.width + 1, name + ": no horizontal overflow");
      assert.deepEqual(errors, [], name + ": pageerrors");
      assert.deepEqual(consoleErrors, [], name + ": console errors");
      assert.deepEqual(badResponses, [], name + ": bad asset responses");
      assert.deepEqual(failedRequests, [], name + ": failed resource requests");
      assert.deepEqual(warnings, [], name + ": console warnings");
      await page.screenshot({ path: path.join(output, name + ".png"), fullPage: false });
      result.flows.push({ name, viewport, navigation, layout, pageerrors: errors.length, consoleErrors: consoleErrors.length, warnings: warnings.length, badResponses: badResponses.length, failedRequests: failedRequests.length });
      console.log("PUBLIC_FLOW_OK " + name);
    } finally { await context.close(); }
  }
  try {
    for (const width of [1280, 375]) {
      await flow("v2-fresh-" + width, { width, height: 900 }, base.href, null, async (page, reload) => {
        await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));
        // Release notes appear first. The timed announcement is above the
        // tutorial (z-index 295 vs 250), so handle it before that lower layer.
        // Wait for actual UI state, with no fixed delay or forced click.
        const startup = ["patch-notes-close", "communication-close", "tutorial-skip"], closed = [];
        for (const id of startup) {
          await page.locator("#" + id).waitFor({ state: "visible" });
          await page.locator("#" + id).click(); closed.push(id);
          assert.equal(await page.locator("#" + id).isVisible(), false, id + " really closed");
        }
        assert.deepEqual([...closed].sort(), [...startup].sort(), "all fresh v2 startup modals closed through UI");
        assert.equal(await page.evaluate(() => StellarOutpostCloudBridge.gameVersion), "2.3.0");
        const before = await page.evaluate(() => StellarOutpostCloudBridge.createSnapshot().dust);
        const scan = page.locator("#collect-button");
        await scan.click();
        assert.ok(await page.evaluate(n => StellarOutpostCloudBridge.createSnapshot().dust > n, before), "real v2 click adds dust");
        await page.waitForFunction(() => JSON.parse(localStorage.getItem("stellarOutpostIdleSave_v1") || "null")?.dust > 0);
        await reload();
        assert.ok(await page.evaluate(() => StellarOutpostCloudBridge.createSnapshot().dust > 0));
        assert.equal(await page.evaluate(() => localStorage.getItem("stellarOutpostIdleSave_v3")), null);
        assert.equal(await page.evaluate(() => Object.keys(globalThis.STELLAR_FIREBASE_CONFIG).length), 0);
      });
      await flow("v3-fresh-" + width, { width, height: 900 }, new URL("v3/", base).href, null, async (page, reload) => {
        await page.locator("#next-goal-title").waitFor();
        assert.equal(await page.evaluate(() => SalvageData.GAME_VERSION), D.GAME_VERSION);
        const scan = page.locator('[data-action="scan"]');
        const node = await scan.elementHandle();
        await scan.click();
        await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) || "null")?.dust > 0, S.KEY);
        await scan.focus();
        await page.waitForFunction(el => el === document.activeElement && el.isConnected, node);
        assert.ok(await scan.evaluate((el, original) => el === original, node), "scan DOM continuity");
        await reload();
        const state = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), S.KEY);
        assert.equal(state.version, 32); assert.ok(state.dust > 0);
        assert.equal(await page.evaluate(() => localStorage.getItem("stellarOutpostIdleSave_v1")), null);
        for(const set of canonicalSets){
          const migrated=await page.evaluate(({version,rows})=>rows.map(({name,state})=>{
            const current=SalvageEngine.sanitize(state,state.lastAt),old=structuredClone(current);
            if(version==='v311')for(const key of ['encounters','management','atlas','expeditions','continuation'])delete old[key];
            if(version==='v316')for(const key of ['atlas','expeditions','continuation'])delete old[key];
            if(version==='v320')delete old.continuation;
            if(version==='v321')for(const key of ['reviews','community','honors'])delete old.continuation[key];
            if(version==='v322')for(const key of ['community','honors'])delete old.continuation[key];
            if(version==='v323')delete old.continuation.honors;
            return {name,old,idempotent:JSON.stringify(SalvageEngine.sanitize(current,current.lastAt))===JSON.stringify(current)};
          }),set);
          for(let i=0;i<migrated.length;i++){assert.deepEqual(migrated[i].old,set.rows[i].state,set.version+'/'+migrated[i].name+': published engine preserves every prior field');assert.equal(migrated[i].idempotent,true);}
        }
        result.canonicalSnapshots=canonicalSets.reduce((n,set)=>n+set.rows.length,0);
      });
    }
    for (const fixture of fixtures.states.filter(row => /-ending$/.test(row.name))) {
      await flow("v316-restore-" + fixture.name, { width: 375, height: 900 }, new URL("v3/", base).href, fixture.state, async (page, reload) => {
        await page.locator("#next-goal-title").waitFor();
        const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), S.KEY);
        const { atlas, expeditions, continuation, ...old } = await read();
        assert.deepEqual(old, fixture.state, fixture.name + ": actual UI load preserves old earned state");
        await reload();
        const again = await read();
        assert.equal(again.epilogue.ending, fixture.state.epilogue.ending);
        assert.deepEqual(again.management, fixture.state.management);
        assert.deepEqual(again.modules, fixture.state.modules);
        assert.deepEqual(again.loadouts, fixture.state.loadouts);
        assert.deepEqual(again.lore, fixture.state.lore);
        assert.equal(again.samples, fixture.state.samples, "reload does not replay awards");
      });
    }
    assert.equal(result.flows.length, 7, "four fresh viewport flows and three ending UI restores must all run");
    console.log(`PUBLIC_RESULT: ${files.length} exact target runtime hashes, ${result.flows.length} browser flows, ${result.canonicalSnapshots} unique canonical v3.11–v3.23 snapshots, 0 failed/0 skipped; ${engineName}`);
  } finally { await browser.close(); }
}
run().then(() => { fs.writeFileSync(path.join(output, "result.json"), JSON.stringify(result, null, 2)); }).catch(error => {
  fs.writeFileSync(path.join(output, "failure.json"), JSON.stringify({ ...result, error: error.stack }, null, 2));
  console.error(error); process.exitCode = 1;
});
