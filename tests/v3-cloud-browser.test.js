"use strict";

// v3 cloud save across two simulated devices (two isolated browser contexts) sharing one
// in-memory cloud that enforces the firestore.rules revision rule. No network, no Firebase.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
assert.ok(playwrightPath, "CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);
const Core = require("../v3/cloud-core.js");

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".mp3": "audio/mpeg" };
const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, pathname.slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { response.writeHead(404).end(); return; }
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(response);
});

const SAVE_KEY = "stellarOutpostIdleSave_v3";
const ALLOWED = new Set(["revision", "snapshot", "encoding", "schema", "gameVersion", "deviceId", "clientSavedAt", "summary", "updatedAt"]);
const cloud = {
  docs: new Map(), fail: null, writes: 0,
  read(id) { if (this.fail) return { error: this.fail }; return { doc: this.docs.get(id) || null }; },
  commit(id, expected, payload) {
    if (this.fail) return { error: this.fail };
    const actual = this.docs.get(id)?.revision || 0;
    if (actual !== expected) return { conflict: true };
    for (const key of Object.keys(payload)) assert.ok(ALLOWED.has(key), `field ${key} would be refused by rules`);
    assert.ok(["gzip-base64", "json"].includes(payload.encoding));
    assert.ok(payload.snapshot.length >= 1 && payload.snapshot.length <= Core.MAX_SNAPSHOT_CHARS);
    assert.ok(Object.keys(payload.summary).length <= 24);
    this.docs.set(id, { ...payload, revision: actual + 1, updatedAt: Date.now() });
    this.writes++;
    return { revision: actual + 1 };
  },
  remove(id) { if (this.fail) return { error: this.fail }; this.docs.delete(id); return {}; },
};

// Stand-in for Firebase: auth survives reloads like Firebase's own persistence does.
const FAKE_ADAPTER = () => {
  const call = async (name, ...args) => {
    const out = await window.__cloud(name, ...args);
    if (out.error) throw Object.assign(new Error(out.error), { code: out.error });
    if (out.conflict) throw Object.assign(new Error("conflict"), { code: "cloud/conflict" });
    return out;
  };
  let listener = () => {};
  const current = () => JSON.parse(localStorage.getItem("__fakeAuth") || "null");
  window.SalvageCloudTestAdapter = {
    onAuth(cb) { listener = cb; setTimeout(() => cb(current()), 0); return () => {}; },
    async signIn() { const user = { uid: "player-1", name: "测试指挥官" }; localStorage.setItem("__fakeAuth", JSON.stringify(user)); listener(user); },
    async signOut() { localStorage.removeItem("__fakeAuth"); listener(null); },
    read: async (id) => (await call("read", id)).doc,
    commit: async (id, expected, payload) => (await call("commit", id, expected, payload)).revision,
    remove: async (id) => { await call("remove", id); },
  };
};

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
  let checks = 0;
  const ok = (name) => console.log(`ok ${++checks} - ${name}`);
  const devices = [];

  async function device(label, { fake = true, viewport = { width: 1280, height: 900 }, init = null } = {}) {
    const context = await browser.newContext({ viewport });
    await require("./helpers/isolate-browser.cjs")(context, origin);
    await context.exposeFunction("__cloud", (name, ...args) => cloud[name](...args));
    if (fake) await context.addInitScript(FAKE_ADAPTER);
    if (init) await context.addInitScript(init.fn, init.arg);
    const page = await context.newPage();
    const d = { label, context, page, errors: [], external: [] };
    page.on("pageerror", (e) => d.errors.push(e.message));
    page.on("request", (r) => { if (!r.url().startsWith(origin)) d.external.push(r.url()); });
    await page.clock.install({ time: Date.parse("2026-11-13T12:00:00Z") });
    await open(d);
    devices.push(d);
    return d;
  }
  async function open(d) {
    await d.page.goto(`${origin}/v3/`);
    await d.page.locator("#next-goal-title").waitFor();
  }
  const cs = (d) => d.page.evaluate(() => SalvageCloud.state());
  const until = (d, fn, arg) => d.page.waitForFunction(fn, arg, { timeout: 15000 });
  const status = (d, s) => until(d, (want) => SalvageCloud.state().status === want, s);
  const local = (d) => d.page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
  const settings = async (d) => {
    if (await d.page.locator("#dialog[open] [data-cloud-panel]").count()) return d.page.locator("[data-cloud-panel]");
    if (await d.page.locator("#dialog[open]").count()) await d.page.keyboard.press("Escape");
    await d.page.locator("#settings-button").click();
    return d.page.locator("[data-cloud-panel]");
  };
  const closeDialog = async (d) => { if (await d.page.locator("#dialog[open]").count()) await d.page.keyboard.press("Escape"); };
  async function cloudText() { return Core.decode(cloud.docs.get("player-1")); }
  async function play(d, ms = 12000) { await d.page.clock.runFor(ms); } // the game saves every 5 s while visible
  async function signIn(d) { const panel = await settings(d); await panel.locator('[data-cloud-action="sign-in"]').click(); }
  async function backups(d) {
    return d.page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("stellarOutpostIdle_v3_backup_"))
      .map((k) => JSON.parse(localStorage.getItem(k))).map((b) => ({ kind: b.kind, label: b.label, text: b.text })));
  }

  try {
    // 1. Without sign-in nothing loads.
    const solo = await device("solo", { fake: false });
    let state = await cs(solo);
    assert.equal(state.status, "off");
    const panel = await settings(solo);
    assert.match(await panel.innerText(), /未登录[\s\S]*使用 Google 登录/);
    assert.match(await panel.innerText(), /不登录也能完整游玩/);
    await play(solo);
    assert.deepEqual(solo.external, [], "no Firebase or other external request without sign-in");
    assert.equal(await solo.page.evaluate(() => typeof globalThis.STELLAR_FIREBASE_CONFIG), "undefined");
    const soloMeta = JSON.parse(await solo.page.evaluate(() => localStorage.getItem("stellarOutpostIdle_v3_cloud")));
    assert.equal(soloMeta.uid, null);
    assert.match(soloMeta.deviceId, /^[a-z0-9-]{8,64}$/);
    ok("not signed in: settings shows sign-in, no external requests, no Firebase loaded");

    // 2. Real Firebase path offline (external blocked): fails softly, game keeps saving.
    await panel.locator('[data-cloud-action="sign-in"]').click();
    await until(solo, () => ["error", "offline"].includes(SalvageCloud.state().status));
    assert.match(await solo.page.locator("[data-cloud-status]").innerText(), /云服务未能载入/);
    assert.equal(await solo.page.evaluate(() => typeof globalThis.STELLAR_FIREBASE_CONFIG), "object", "config is only loaded once sign-in is chosen");
    const before = await local(solo);
    await closeDialog(solo);
    await play(solo);
    assert.notEqual(await local(solo), before, "local autosave continues");
    // The isolation helper serves an empty config, so the client stops before requesting the SDK.
    assert.match(await solo.page.locator("[data-cloud-status]").innerText(), /云服务尚未配置/);
    assert.deepEqual(solo.external, [], "still no external request");
    assert.deepEqual(solo.errors, []);
    await solo.context.close();
    ok("sign-in without a cloud service fails softly; local saving unaffected");

    // 3. Device A signs in with an empty cloud: creates revision 1 from its own save.
    const A = await device("A");
    await play(A);
    await signIn(A);
    await status(A, "synced");
    assert.equal(cloud.docs.get("player-1").revision, 1);
    assert.equal(cloud.docs.get("player-1").encoding, "gzip-base64");
    assert.equal(await cloudText(), await local(A));
    assert.match(await A.page.locator("[data-cloud-status]").innerText(), /已同步 · 测试指挥官/);
    assert.equal(await A.page.locator('[data-cloud-action="sync"]').isEnabled(), true, "sync now is available once idle");
    ok("first sign-in uploads this device's save as revision 1 (gzip)");

    // 4. Play on A: autosave schedules an upload 30 s later.
    await closeDialog(A);
    await play(A, 6000);
    await until(A, () => SalvageCloud.state().status === "pending");
    await play(A, 31000);
    await until(A, () => SalvageCloud.state().revision >= 2);
    const revA = cloud.docs.get("player-1").revision;
    assert.ok(revA >= 2);
    ok(`progress uploads automatically after the 30 s delay (revision ${revA})`);

    // 5. New device B with no save of its own: signs in and takes the cloud progress.
    const B = await device("B");
    await signIn(B);
    await status(B, "synced");
    const bText = JSON.parse(await local(B)), cText = JSON.parse(await cloudText());
    assert.equal(bText.createdAt, cText.createdAt, "B now continues A's voyage");
    assert.equal(bText.dust, cText.dust);
    ok("a device without its own progress picks up the cloud save");

    // 6. A plays on and uploads; B reopens without having played: loads the newer cloud save.
    await play(A, 40000);
    await until(A, (r) => SalvageCloud.state().revision > r, cloud.docs.get("player-1").revision - 1);
    const revBefore = cloud.docs.get("player-1").revision;
    await play(B, 20000); // a little idle time on B; the reload also saves on close
    await open(B);
    await until(B, (r) => SalvageCloud.state().status === "synced" && SalvageCloud.state().revision === r, revBefore);
    assert.equal(JSON.parse(await local(B)).createdAt, JSON.parse(await cloudText()).createdAt);
    assert.ok(Math.abs(JSON.parse(await local(B)).clock - JSON.parse(await cloudText()).clock) < 1, "B continues from A's latest point");
    assert.ok((await backups(B)).some((b) => b.kind === "restore"), "B's own copy was backed up first");
    ok("reopening an unplayed device loads the newer cloud progress, after a backup");

    // 7. Both devices progress: A's upload meets B's newer revision -> A must choose, nothing overwritten.
    await play(B, 70000); // B plays over a minute and uploads
    await until(B, (r) => SalvageCloud.state().revision > r, revBefore);
    const bRevision = cloud.docs.get("player-1").revision;
    const bCloud = await cloudText();
    await play(A, 70000); // A also plays over a minute, then tries to upload on an older revision
    await status(A, "choose");
    assert.equal(cloud.docs.get("player-1").revision, bRevision, "A did not overwrite B's upload");
    assert.equal(await cloudText(), bCloud);
    await A.page.locator("#dialog[open]").waitFor();
    assert.equal(await A.page.locator("#dialog-title").innerText(), "选择要保留的进度");
    assert.match(await A.page.locator("#dialog-body").innerText(), /两台设备在上次同步后都有新进度[\s\S]*这台设备[\s\S]*云端/);
    await play(A, 60000);
    assert.equal(cloud.docs.get("player-1").revision, bRevision, "no uploads while a choice is pending");
    ok("progress on both devices asks the player; neither side is overwritten meanwhile");

    // 8. A chooses the cloud copy: preview, confirm, A's own copy kept as a backup.
    const aBefore = await local(A);
    await A.page.locator('[data-cloud-action="use-cloud"]').click();
    await A.page.locator("#confirm-cloud").click();
    await status(A, "synced");
    assert.equal(JSON.parse(await local(A)).clock, JSON.parse(bCloud).clock);
    // The restore backs up A's in-memory state, which can be a few ticks newer than its last stored copy.
    const aClock = JSON.parse(aBefore).clock;
    assert.ok((await backups(A)).some((b) => b.kind === "restore" && JSON.parse(b.text).clock >= aClock && b.text !== bCloud), "A's replaced progress is in its backups");
    ok("choosing the cloud copy goes through the restore preview and keeps a backup");

    // 9. Next conflict, B keeps its own copy: cloud copy backed up on B first.
    await play(A, 70000);
    await until(A, (r) => SalvageCloud.state().revision > r, bRevision);
    const aCloud = await cloudText();
    await play(B, 70000);
    await status(B, "choose");
    await B.page.locator('[data-cloud-action="keep-local"]').click();
    await status(B, "synced");
    assert.equal(await cloudText(), await local(B), "cloud now holds B's progress");
    assert.ok((await backups(B)).some((b) => b.label === "云端进度（选择本机前）" && b.text === aCloud), "replaced cloud copy kept on B");
    ok("keeping this device's copy backs up the cloud copy before replacing it");

    // 10. Offline: upload fails softly and retries.
    cloud.fail = "unavailable";
    await play(B, 40000);
    await status(B, "offline");
    assert.match(await B.page.locator("#save-label").innerText(), /自动保存/);
    cloud.fail = null;
    const rOffline = cloud.docs.get("player-1").revision;
    await play(B, 50000);
    await until(B, (r) => SalvageCloud.state().revision > r && ["synced", "pending"].includes(SalvageCloud.state().status), rOffline);
    assert.equal(cloud.docs.get("player-1").revision, (await cs(B)).revision);
    ok("network failure shows offline, local saving continues, upload retries");

    // 11. A corrupt cloud record is refused; local progress untouched.
    const goodDoc = cloud.docs.get("player-1");
    cloud.docs.set("player-1", { ...goodDoc, snapshot: "bm90IGEgc2F2ZQ==" });
    const aLocal = await local(A);
    await (await settings(A)).locator('[data-cloud-action="sync"]').click();
    await status(A, "error");
    assert.match(await A.page.locator("[data-cloud-status]").innerText(), /云端记录无法读取，本机进度未受影响/);
    assert.ok(JSON.parse(await local(A)).clock >= JSON.parse(aLocal).clock);
    cloud.docs.set("player-1", goodDoc);
    await closeDialog(A);
    ok("unreadable cloud record is refused without touching local progress");

    // 12. Sign out keeps the cloud; delete removes it and signs out.
    await (await settings(A)).locator('[data-cloud-action="sign-out"]').click();
    await status(A, "off");
    assert.ok(cloud.docs.has("player-1"), "sign-out keeps the cloud save");
    assert.equal(JSON.parse(await A.page.evaluate(() => localStorage.getItem("stellarOutpostIdle_v3_cloud"))).uid, null);
    await closeDialog(B);
    await (await settings(B)).locator('[data-cloud-action="delete"]').click();
    await B.page.locator('[data-cloud-action="delete-confirm"]').click();
    await status(B, "off");
    assert.equal(cloud.docs.has("player-1"), false);
    assert.ok(await local(B), "local save kept");
    ok("sign-out keeps the cloud save; delete removes it and signs out, local untouched");

    // 13. A save that failed to load is never uploaded; only the cloud copy is offered.
    const C = await device("C", { init: { fn: (k) => { if (!localStorage.getItem(k)) localStorage.setItem(k, "{broken"); }, arg: SAVE_KEY } });
    cloud.docs.set("player-1", { ...goodDoc, revision: 1 });
    await signIn(C);
    await status(C, "choose");
    assert.equal(await C.page.locator('[data-cloud-action="keep-local"]').count(), 0);
    assert.match(await C.page.locator("#dialog-body").innerText(), /本机记录未能正常载入/);
    assert.equal(cloud.docs.get("player-1").revision, 1);
    ok("a broken local save is never uploaded; only the cloud copy is offered");

    // 14. Phone width: the settings panel fits.
    const P = await device("phone", { viewport: { width: 375, height: 800 } });
    await settings(P);
    const overflow = await P.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(overflow, 0);
    const box = await P.page.locator("[data-cloud-panel]").boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 375);
    ok("settings panel fits a 375 px screen");

    for (const d of devices) assert.deepEqual(d.errors, [], `${d.label} page errors`);
    for (const d of devices) if (d.label !== "solo") assert.deepEqual(d.external, [], `${d.label} external requests`);
    console.log(`v3 cloud browser ok: ${checks} scenarios, ${cloud.writes} cloud writes`);
  } catch (error) {
    for (const d of devices) {
      const info = await d.page.evaluate(() => ({ cloud: SalvageCloud.state(), dialog: document.querySelector("#dialog[open] #dialog-title")?.textContent || null,
        fg: (() => { try { return JSON.parse(localStorage.getItem("stellarOutpostIdleSave_v3") || "{}").timing?.foregroundSeconds; } catch (_) { return "unreadable"; } })() })).catch(() => "closed");
      console.error(`[${d.label}]`, JSON.stringify(info));
    }
    console.error("cloud revision", cloud.docs.get("player-1")?.revision, "writes", cloud.writes);
    throw error;
  } finally {
    for (const d of devices) await d.context.close().catch(() => {});
    await browser.close();
    server.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
