"use strict";

// v3 background music: device preference, v2 carry-over, real controls, no game-state writes.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
assert.ok(playwrightPath, "CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const root = path.resolve(__dirname, "..");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".webp": "image/webp", ".mp3": "audio/mpeg" };
const server = http.createServer((request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.resolve(root, pathname.slice(1));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  const size = fs.statSync(file).size;
  const headers = { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Accept-Ranges": "bytes" };
  const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range || "");
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    response.writeHead(206, { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": end - start + 1 });
    fs.createReadStream(file, { start, end }).pipe(response);
    return;
  }
  response.writeHead(200, { ...headers, "Content-Length": size });
  fs.createReadStream(file).pipe(response);
});

const MUSIC_KEY = "stellarOutpostIdle_v3_music";
const V3_KEY = "stellarOutpostIdleSave_v3";

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const url = `${origin}/v3/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
  try {
  let checks = 0;
  async function scenario(name, initial, check, options = {}) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
    await require("./helpers/isolate-browser.cjs")(context, origin);
    if (initial) await context.addInitScript((items) => {
      for (const [key, value] of Object.entries(items)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    }, initial);
    const page = await context.newPage();
    const errors = [], logs = [], bad = [], audioRequests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") logs.push(m.text()); });
    page.on("response", (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
    page.on("request", (r) => { if (r.url().includes(".mp3")) audioRequests.push(new URL(r.url()).pathname); });
    try {
      await page.goto(url);
      await page.locator("#next-goal-title").waitFor();
      await check(page, { audioRequests });
      assert.deepEqual(errors, [], "runtime errors");
      assert.deepEqual(bad, [], "asset failures");
      assert.deepEqual(logs, [], "console warnings/errors");
      console.log(`ok ${++checks} - ${name}`);
    } finally {
      await context.close();
    }
  }
  const music = (page) => page.evaluate(() => ({ prefs: SalvageMusic.prefs(), audio: SalvageMusic.state() }));
  const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

  await scenario("defaults: nothing loads before a gesture, first click starts the playlist from ../assets", null, async (page, { audioRequests }) => {
    let m = await music(page);
    assert.deepEqual(m.prefs, { enabled: true, track: "playlist", volume: 0.22, sfx: true });
    assert.equal(m.audio.src, null, "no audio source before a gesture");
    assert.equal(audioRequests.length, 0, "no mp3 request on first paint");
    const button = page.locator("#music-button");
    assert.equal(await button.isHidden(), true, "first screen keeps its three controls");
    assert.equal(await button.getAttribute("aria-pressed"), "true");
    assert.match(await button.getAttribute("aria-label"), /暂停背景音乐：猎户座外的前哨/);
    await page.locator("#main").click({ position: { x: 5, y: 5 } });
    assert.equal(await button.isVisible(), true, "toggle appears once music can play");
    await page.waitForFunction(() => SalvageMusic.state().trackId === "outpost-beyond-orion");
    m = await music(page);
    assert.match(m.audio.src, /^\.\.\/assets\/outpost-beyond-orion\.mp3/);
    assert.equal(m.audio.volume, 0.22);
    assert.equal(await stored(page, MUSIC_KEY), null, "defaults are not written until changed");
  });

  await scenario("v2 player choice carries over read-only on first visit", {
    stellarOutpostIdleSave_v1: JSON.stringify({ version: 31, bgmEnabled: false, bgmTrackSelection: "signal-at-kestrel-nine-2", bgmVolume: 0.5 }),
  }, async (page) => {
    const m = await music(page);
    assert.deepEqual(m.prefs, { enabled: false, track: "signal-at-kestrel-nine-2", volume: 0.5, sfx: true });
    assert.equal(await page.locator("#music-button").getAttribute("aria-pressed"), "false");
    // v3 offers to inherit the v2 station here; a key press is a gesture that leaves it open.
    assert.equal(await page.locator("#dialog").isVisible(), true);
    await page.keyboard.press("Shift");
    assert.equal((await music(page)).audio.src, null, "disabled music stays silent after a gesture");
    assert.equal(await page.locator("#music-button").isVisible(), true, "a disabled player can be turned on from the topbar");
    const legacy = JSON.parse(await stored(page, "stellarOutpostIdleSave_v1"));
    assert.equal(legacy.bgmVolume, 0.5, "v2 save untouched");
  });

  await scenario("topbar toggle, settings track/volume persist across reload without touching the game save", null, async (page) => {
    const before = await stored(page, V3_KEY);
    await page.locator("#main").click({ position: { x: 5, y: 5 } });
    await page.locator("#music-button").click();
    let m = await music(page);
    assert.equal(m.prefs.enabled, false);
    assert.equal(m.audio.paused, true);
    assert.equal(await page.locator("#music-button").getAttribute("aria-pressed"), "false");
    await page.locator("#music-button").click();
    assert.equal((await music(page)).prefs.enabled, true);

    await page.locator("#settings-button").click();
    const dialog = page.locator("#dialog");
    assert.equal(await dialog.locator("#music-track").inputValue(), "playlist");
    assert.equal(await dialog.locator("[data-music='volume-value']").innerText(), "22%");
    assert.match(await dialog.locator("[data-music='now']").innerText(), /正在播放：猎户座外的前哨/);
    await dialog.locator("#music-track").selectOption("signal-at-kestrel-nine");
    await page.waitForFunction(() => SalvageMusic.state().trackId === "signal-at-kestrel-nine");
    await dialog.locator("#music-volume").fill("40");
    m = await music(page);
    assert.deepEqual(m.prefs, { enabled: true, track: "signal-at-kestrel-nine", volume: 0.4, sfx: true });
    assert.equal(m.audio.volume, 0.4);
    assert.equal(await dialog.locator("[data-music='volume-value']").innerText(), "40%");
    // Settings toggle and topbar stay in sync.
    await dialog.locator("[data-music='toggle']").click();
    assert.equal(await page.locator("#music-button").getAttribute("aria-pressed"), "false");
    await dialog.locator("[data-music='toggle']").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => document.activeElement.id), "settings-button");
    assert.equal(await stored(page, V3_KEY), before, "music never writes the game save");

    await page.reload();
    await page.locator("#next-goal-title").waitFor();
    assert.deepEqual((await music(page)).prefs, { enabled: true, track: "signal-at-kestrel-nine", volume: 0.4, sfx: true });
  });

  await scenario("playlist advances on track end; single-track selection repeats", null, async (page) => {
    const ended = async (expected) => {
      // Metadata releases the switch guard, exactly as a real track change does.
      await page.waitForFunction(() => document.getElementById("music-audio").readyState >= 1);
      await page.evaluate(() => document.getElementById("music-audio").dispatchEvent(new Event("ended")));
      await page.waitForFunction((id) => SalvageMusic.state().trackId === id, expected);
    };
    await page.locator("#main").click({ position: { x: 5, y: 5 } });
    await page.waitForFunction(() => SalvageMusic.state().trackId === "outpost-beyond-orion");
    await ended("outpost-beyond-orion-2");
    await ended("signal-at-kestrel-nine");
    await ended("signal-at-kestrel-nine-2");
    await ended("outpost-beyond-orion");
    await page.locator("#settings-button").click();
    await page.locator("#music-track").selectOption("signal-at-kestrel-nine-2");
    await ended("signal-at-kestrel-nine-2");
    await ended("signal-at-kestrel-nine-2");
    assert.equal(await page.evaluate(() => document.getElementById("music-audio").hidden), true);
  });

  await scenario("phone: compact music button fits the topbar without horizontal overflow", null, async (page) => {
    await page.locator("#main").tap({ position: { x: 5, y: 5 } });
    const info = await page.evaluate(() => {
      const button = document.getElementById("music-button");
      const rect = button.getBoundingClientRect();
      return { overflow: document.documentElement.scrollWidth - innerWidth, visible: rect.width > 0 && rect.right <= innerWidth, label: getComputedStyle(button.querySelector(".music-button-label")).display, height: rect.height };
    });
    assert.equal(info.overflow, 0);
    assert.equal(info.visible, true);
    assert.equal(info.label, "none");
    await page.locator("#music-button").tap();
    assert.equal((await music(page)).prefs.enabled, false);
  }, { viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });

  // Records every oscillator the page starts instead of making sound.
  async function withRecorder(page) {
    await page.addInitScript(() => {
      window.__tones = [];
      window.__audioContexts = 0;
      class FakeParam { constructor() { this.value = 0; this.events = []; } setValueAtTime(v) { this.events.push(v); this.value = v; } exponentialRampToValueAtTime() {} }
      class FakeContext {
        constructor() { window.__audioContexts++; this.state = "running"; this.currentTime = 0; this.destination = {}; }
        resume() { return Promise.resolve(); }
        createOscillator() { const o = { type: "", frequency: new FakeParam(), connect() {}, start() { window.__tones.push({ f: o.frequency.value, type: o.type, gain: o.gainNode?.gain.events[0] }); }, stop() {} }; this.last = o; return o; }
        createGain() { const g = { gain: new FakeParam(), connect() {} }; if (this.last) this.last.gainNode = g; return g; }
      }
      window.AudioContext = FakeContext;
      window.webkitAudioContext = FakeContext;
    });
  }
  const tones = (page) => page.evaluate(() => window.__tones.map((t) => t.f));

  await scenario("button tones: v2 pitches by button kind, silent before clicks and for disabled buttons", null, async (page) => {
    await withRecorder(page);
    await page.reload();
    await page.locator("#next-goal-title").waitFor();
    assert.equal(await page.evaluate(() => window.__audioContexts), 0, "no audio context before a click");
    await page.locator("#main").click({ position: { x: 5, y: 5 } });
    assert.deepEqual(await tones(page), [], "clicking empty space plays nothing");
    await page.locator("#settings-button").click();
    assert.deepEqual(await tones(page), [340], "ordinary button");
    await page.keyboard.press("Escape");
    const primary = page.locator("button.primary:not([disabled])").first();
    await primary.click();
    assert.equal((await tones(page)).at(-1), 520, "primary button");
    const nav = page.locator("#navigation button:not([disabled])").first();
    if (await nav.count()) { await nav.click(); assert.equal((await tones(page)).at(-1), 430, "navigation button"); }
    const count = (await tones(page)).length;
    await page.evaluate(() => { const b = document.createElement("button"); b.disabled = true; b.id = "probe-disabled"; b.textContent = "x"; document.body.append(b); b.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    assert.equal((await tones(page)).length, count, "disabled button is silent");
    const gains = await page.evaluate(() => window.__tones.map((t) => t.gain));
    assert.ok(gains.every((g) => Math.abs(g - 0.011) < 1e-9), `default volume matches v2 level: ${gains}`);
    assert.equal(await page.evaluate(() => window.__audioContexts), 1, "one shared audio context");
  });

  await scenario("sound effects toggle and shared volume persist; v2 sound-off carries over", {
    stellarOutpostIdleSave_v1: JSON.stringify({ version: 31, sound: false, bgmVolume: 0.44 }),
  }, async (page) => {
    await withRecorder(page);
    await page.reload();
    await page.locator("#next-goal-title").waitFor();
    assert.equal((await music(page)).prefs.sfx, false, "v2 sound off carries over");
    await page.keyboard.press("Escape"); // v3 offers to inherit the v2 station here
    await page.locator("#settings-button").click();
    assert.deepEqual(await tones(page), [], "effects off: settings click is silent");
    const sfx = page.locator("#dialog [data-music='sfx']");
    assert.equal(await sfx.getAttribute("aria-pressed"), "false");
    assert.equal(await sfx.innerText(), "按键音效关");
    await sfx.click();
    assert.equal(await sfx.getAttribute("aria-pressed"), "true");
    assert.deepEqual(await tones(page), [520], "turning effects on gives a confirmation tone");
    assert.ok(Math.abs((await page.evaluate(() => window.__tones.at(-1).gain)) - 0.04) < 1e-9, "confirmation scaled by 44% volume");
    await page.locator("#music-volume").fill("0");
    const before = (await tones(page)).length;
    await page.keyboard.press("Escape");
    await page.locator("#settings-button").click();
    assert.equal((await tones(page)).length, before, "volume 0 silences effects");
    await page.locator("#music-volume").fill("22");
    await page.reload();
    await page.locator("#next-goal-title").waitFor();
    assert.deepEqual((await music(page)).prefs, { enabled: true, track: "playlist", volume: 0.22, sfx: true });
  });

  await scenario("corrupt music preference falls back to defaults", { [MUSIC_KEY]: "{bad json" }, async (page) => {
    assert.deepEqual((await music(page)).prefs, { enabled: true, track: "playlist", volume: 0.22, sfx: true });
  });
  await scenario("out-of-range music preference is clamped", { [MUSIC_KEY]: JSON.stringify({ enabled: "yes", track: "<script>", volume: 9 }) }, async (page) => {
    assert.deepEqual((await music(page)).prefs, { enabled: true, track: "playlist", volume: 1, sfx: true });
  });

  console.log(`v3 music browser ok: ${checks} scenarios`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
