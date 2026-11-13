"use strict";
const assert = require("node:assert/strict");
const C = require("../v3/cloud-core.js");
const fixtures = require("./fixtures/v326-saves.json");

let checks = 0;
const ok = (name) => console.log(`ok ${++checks} - ${name}`);

async function main() {
  // hash
  assert.equal(C.hash(null), null);
  assert.equal(C.hash("abc"), C.hash("abc"));
  assert.notEqual(C.hash("abc"), C.hash("abd"));
  assert.notEqual(C.hash("ab"), C.hash("ab\u0000"));
  ok("hash is stable and change-sensitive");

  // meta normalisation
  const empty = { uid: null, revision: null, syncedHash: null, deviceId: null, syncedCreatedAt: null, syncedForeground: null };
  assert.deepEqual(C.normalizeMeta(null), empty);
  assert.deepEqual(C.normalizeMeta({ uid: "u1", revision: 3, syncedHash: "a-1", deviceId: "dev-12345678", syncedCreatedAt: 10, syncedForeground: 5 }),
    { uid: "u1", revision: 3, syncedHash: "a-1", deviceId: "dev-12345678", syncedCreatedAt: 10, syncedForeground: 5 });
  assert.equal(C.normalizeMeta({ uid: "u1", syncedHash: "h", syncedForeground: -3 }).syncedForeground, null);
  assert.equal(C.normalizeMeta({ uid: "u1", syncedForeground: 3 }).syncedForeground, null, "no progress marker without a synced hash");
  assert.deepEqual(C.normalizeMeta({ uid: "", revision: 3, syncedHash: "x" }).revision, null, "no uid, no revision");
  assert.equal(C.normalizeMeta({ uid: "u", revision: -1 }).revision, null);
  assert.equal(C.normalizeMeta({ uid: "u", revision: 1.5 }).revision, null);
  assert.equal(C.normalizeMeta({ uid: "u", revision: "2" }).revision, null);
  assert.equal(C.normalizeMeta({ uid: "u".repeat(129) }).uid, null);
  assert.equal(C.normalizeMeta({ deviceId: "<script>" }).deviceId, null);
  const store = new Map();
  const storage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
  assert.equal(C.loadMeta(storage).uid, null);
  store.set(C.META_KEY, "{bad");
  assert.equal(C.loadMeta(storage).uid, null, "corrupt meta falls back");
  assert.equal(C.saveMeta(storage, { uid: "u1", revision: 2, syncedHash: "h", deviceId: "device-abc1" }), true);
  assert.deepEqual(C.loadMeta(storage), { uid: "u1", revision: 2, syncedHash: "h", deviceId: "device-abc1", syncedCreatedAt: null, syncedForeground: null });
  assert.equal(C.saveMeta({ setItem() { throw new Error("quota"); } }, {}), false);
  ok("meta normalises bad values and survives storage errors");

  // decide: every branch
  const L = "local-save", R = "remote-save";
  const synced = { uid: "u1", revision: 4, syncedHash: C.hash(L), deviceId: "device-abc1" };
  const d = (args) => C.decide({ uid: "u1", meta: synced, remote: { revision: 4 }, localText: L, remoteHash: C.hash(R), ...args });
  assert.deepEqual(d({ remote: null }), { kind: "create" });
  assert.deepEqual(d({ remote: null, blocked: true }), { kind: "idle" }, "never upload a save that failed to load");
  assert.deepEqual(d({ remoteHash: C.hash(L) }), { kind: "adopt" }, "identical content");
  assert.deepEqual(d({ blocked: true }), { kind: "choose", reason: "blocked" });
  assert.deepEqual(d({ localText: null }), { kind: "pull", reason: "empty" });
  assert.deepEqual(d({ meta: { ...synced, uid: "other" } }), { kind: "choose", reason: "first" }, "different account");
  assert.deepEqual(d({ meta: { ...synced, revision: null } }), { kind: "choose", reason: "first" });
  assert.deepEqual(d({ meta: { ...synced, syncedHash: null } }), { kind: "choose", reason: "first" });
  assert.deepEqual(d({}), { kind: "synced" });
  assert.deepEqual(d({ localText: "local-save-more" }), { kind: "push" });
  assert.deepEqual(d({ remote: { revision: 5 } }), { kind: "pull", reason: "remote" });
  assert.deepEqual(d({ remote: { revision: 5 }, localText: "local-save-more" }), { kind: "choose", reason: "both" });
  assert.deepEqual(d({ remote: { revision: 1 }, localText: "local-save-more" }), { kind: "choose", reason: "both" }, "cloud recreated after delete");
  ok("decide covers create/idle/adopt/pull/push/synced/choose");

  // The only automatic overwrites are of an unchanged or empty local save.
  const metas = [synced, { ...synced, uid: "other" }, { uid: null, revision: null, syncedHash: null }];
  const locals = [null, L, "local-save-more"];
  const remotes = [null, { revision: 4 }, { revision: 9 }];
  for (const meta of metas) for (const localText of locals) for (const remote of remotes) for (const blocked of [false, true]) {
    const r = C.decide({ uid: "u1", meta, remote, localText, remoteHash: C.hash(R), blocked });
    if (r.kind === "pull") assert.ok(localText === null || C.hash(localText) === meta.syncedHash, JSON.stringify({ meta, localText, remote, r }));
    if (r.kind === "push") assert.ok(meta.uid === "u1" && remote.revision === meta.revision && !blocked);
    if (blocked) assert.ok(!["push", "create", "pull"].includes(r.kind), "a broken local save never uploads or is silently replaced");
  }
  ok("no automatic overwrite of local progress made since the last sync (54 combinations)");

  // Foreground grace: close-time saves and passive time are not "new progress".
  const save = (createdAt, foreground, extra = 0) => JSON.stringify({ schema: "salvage-orbit", createdAt, lastAt: 1000 + extra, timing: { foregroundSeconds: foreground } });
  const base = save(111, 300);
  const gm = { uid: "u1", revision: 7, syncedHash: C.hash(base), deviceId: "device-abc1", syncedCreatedAt: 111, syncedForeground: 300 };
  const g = (localText, revision, reopening = true) => C.decide({ uid: "u1", meta: gm, remote: { revision }, localText, remoteHash: "other", reopening }).kind;
  assert.deepEqual(C.progressOf(base), { createdAt: 111, foreground: 300 });
  assert.deepEqual(C.progressOf("{bad"), { createdAt: null, foreground: null });
  assert.equal(C.changedSince(gm, base), false);
  assert.equal(C.changedSince(gm, save(111, 300, 99), true), false, "saved on close, no play");
  assert.equal(C.changedSince(gm, save(111, 300, 99)), true, "mid-session: any change counts");
  assert.equal(C.changedSince(gm, save(111, 359, 99), true), false, "59 s of foreground play");
  assert.equal(C.changedSince(gm, save(111, 360, 99), true), true, "60 s of foreground play");
  assert.equal(C.changedSince(gm, save(222, 301, 99), true), true, "different voyage");
  assert.equal(C.changedSince(gm, save(111, 299, 99), true), true, "foreground went backwards");
  assert.equal(C.changedSince({ ...gm, syncedForeground: null }, save(111, 300, 99), true), true, "unknown marker -> changed");
  assert.equal(g(save(111, 330, 5), 8), "pull", "reopened device takes the newer cloud save");
  assert.equal(g(save(111, 400, 5), 8), "choose");
  assert.equal(g(save(111, 330, 5), 7), "synced");
  assert.equal(g(save(111, 400, 5), 7), "push");
  assert.equal(g(save(111, 330, 5), 8, false), "choose", "mid-session conflict always asks");
  ok("on reopening, close-time saves and < 60 s of foreground play are not new progress; mid-session any change is");

  // encode / decode with a real late-game save
  const entries = Array.isArray(fixtures) ? fixtures : Object.values(fixtures);
  const big = entries.map((e) => JSON.stringify(e.state || e.save || e)).sort((a, b) => b.length - a.length)[0];
  assert.ok(big.length > 150000, `fixture ${big.length}`);
  const enc = await C.encode(big);
  assert.equal(enc.encoding, "gzip-base64");
  assert.ok(C.fits(enc));
  assert.ok(enc.snapshot.length < big.length / 3, `compressed ${enc.snapshot.length} of ${big.length}`);
  assert.equal(await C.decode(enc), big);
  const unicode = JSON.stringify({ note: "苇的窗台 ✦ 🌌", n: 1 });
  assert.equal(await C.decode(await C.encode(unicode)), unicode);
  assert.equal(await C.decode({ encoding: "json", snapshot: unicode }), unicode);
  ok(`gzip round-trip of a ${big.length}-char save (${enc.snapshot.length} chars in the cloud)`);

  await assert.rejects(C.encode(""), /没有可上传/);
  await assert.rejects(C.decode(null), /为空/);
  await assert.rejects(C.decode({ encoding: "zip", snapshot: "x" }), /无法识别/);
  await assert.rejects(C.decode({ encoding: "gzip-base64", snapshot: "bm90IGd6aXA=" }));
  assert.equal(C.fits({ snapshot: "x".repeat(C.MAX_SNAPSHOT_CHARS) }), true);
  assert.equal(C.fits({ snapshot: "x".repeat(C.MAX_SNAPSHOT_CHARS + 1) }), false);
  assert.equal(C.fits({ snapshot: "" }), false);
  ok("bad records are rejected; size limit matches firestore.rules");

  assert.deepEqual(C.summaryFields({ savedAt: 5, chapter: 3, cores: Infinity, dust: -1, extra: 9, rebirths: "2" }), { savedAt: 5, chapter: 3, rebirths: 2 });
  assert.ok(Object.keys(C.summaryFields({ savedAt: 1, chapter: 1, starport: 1, rebirths: 1, cores: 1, samples: 1, dust: 1 })).length <= 24);
  ok("summary keeps finite non-negative known fields only");

  console.log(`v3 cloud core ok: ${checks} checks`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
