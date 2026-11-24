/* Cloud save rules for v3: pure decisions and encoding, no Firebase, no DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SalvageCloudCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const META_KEY = "stellarOutpostIdle_v3_cloud";
  const COLLECTION = "savesV3";
  const MAX_SNAPSHOT_CHARS = 700000; // mirrors firestore.rules
  const SYNC_DELAY = 30000;
  const RETRY_DELAY = 45000;
  // Foreground play below this since the last sync is not treated as new progress:
  // the game also saves on close and while time passes, which is not a player decision.
  const ACTIVE_GRACE_SECONDS = 60;

  // Change detection only (not security): FNV-1a over UTF-16 units plus length.
  function hash(text) {
    if (typeof text !== "string") return null;
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return `${text.length.toString(36)}-${h.toString(16).padStart(8, "0")}`;
  }

  function normalizeMeta(raw) {
    const uid = typeof raw?.uid === "string" && raw.uid.length >= 1 && raw.uid.length <= 128 ? raw.uid : null;
    const revision = Number.isSafeInteger(raw?.revision) && raw.revision >= 0 ? raw.revision : null;
    const syncedHash = typeof raw?.syncedHash === "string" && raw.syncedHash.length <= 40 ? raw.syncedHash : null;
    const deviceId = typeof raw?.deviceId === "string" && /^[a-z0-9-]{8,64}$/.test(raw.deviceId) ? raw.deviceId : null;
    const num = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
    const synced = uid && syncedHash !== null;
    return {
      uid, revision: uid ? revision : null, syncedHash: uid ? syncedHash : null, deviceId,
      syncedCreatedAt: synced ? num(raw?.syncedCreatedAt) : null,
      syncedForeground: synced ? num(raw?.syncedForeground) : null,
    };
  }
  // Which voyage a save belongs to and how long it has been played in the foreground.
  function progressOf(text) {
    try {
      const raw = JSON.parse(text);
      const createdAt = Number(raw?.createdAt), foreground = Number(raw?.timing?.foregroundSeconds);
      return { createdAt: Number.isFinite(createdAt) ? createdAt : null, foreground: Number.isFinite(foreground) && foreground >= 0 ? foreground : null };
    } catch (_) { return { createdAt: null, foreground: null }; }
  }
  // grace: only when judging the save a device left behind on reopening, never mid-session.
  function changedSince(meta, localText, grace = false) {
    if (hash(localText) === meta.syncedHash) return false;
    if (!grace) return true;
    const p = progressOf(localText);
    if (meta.syncedCreatedAt === null || meta.syncedForeground === null || p.createdAt === null || p.foreground === null) return true;
    if (p.createdAt !== meta.syncedCreatedAt) return true; // a different voyage (reset or import)
    const played = p.foreground - meta.syncedForeground;
    return !(played >= 0 && played < ACTIVE_GRACE_SECONDS);
  }
  function loadMeta(storage) {
    try { return normalizeMeta(JSON.parse(storage.getItem(META_KEY) || "null")); }
    catch (_) { return normalizeMeta(null); }
  }
  function saveMeta(storage, meta) {
    try { storage.setItem(META_KEY, JSON.stringify(normalizeMeta(meta))); return true; }
    catch (_) { return false; }
  }

  /**
   * What to do after reading the cloud record of `uid`.
   * localText: this device's stored save to judge (null = this device has no earlier save).
   * Never returns an automatic overwrite of progress made on both sides.
   */
  function decide({ uid, meta, remote, localText, remoteHash = null, blocked = false, reopening = false }) {
    const localHash = hash(localText);
    if (!remote) return blocked ? { kind: "idle" } : { kind: "create" };
    if (remoteHash && localHash === remoteHash) return { kind: "adopt" };
    if (blocked) return { kind: "choose", reason: "blocked" };
    if (localText === null) return { kind: "pull", reason: "empty" };
    const known = meta.uid === uid && meta.revision !== null && meta.syncedHash !== null;
    if (!known) return { kind: "choose", reason: "first" };
    const localChanged = changedSince(meta, localText, reopening);
    if (remote.revision === meta.revision) return localChanged ? { kind: "push" } : { kind: "synced" };
    return localChanged ? { kind: "choose", reason: "both" } : { kind: "pull", reason: "remote" };
  }

  function toBase64(bytes) {
    let out = "";
    for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(out);
  }
  async function encode(text) {
    if (typeof text !== "string" || !text) throw new Error("没有可上传的进度。");
    if (typeof CompressionStream === "function") {
      const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      return { encoding: "gzip-base64", snapshot: toBase64(bytes) };
    }
    return { encoding: "json", snapshot: text };
  }
  async function decode(record) {
    if (!record || typeof record.snapshot !== "string" || !record.snapshot) throw new Error("云端记录为空。");
    if (record.encoding === "json") return record.snapshot;
    if (record.encoding !== "gzip-base64") throw new Error("云端记录格式无法识别。");
    if (typeof DecompressionStream !== "function") throw new Error("这个浏览器无法读取压缩的云存档，请更新浏览器后重试。");
    const binary = atob(record.snapshot);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
  }
  function fits(encoded) {
    return typeof encoded?.snapshot === "string" && encoded.snapshot.length >= 1 && encoded.snapshot.length <= MAX_SNAPSHOT_CHARS;
  }
  // Small, finite summary stored beside the snapshot (firestore.rules allows at most 24 keys).
  function summaryFields(summary) {
    const out = {};
    for (const key of ["savedAt", "chapter", "starport", "rebirths", "cores", "samples", "dust"]) {
      const value = Number(summary?.[key]);
      if (Number.isFinite(value) && value >= 0) out[key] = value;
    }
    return out;
  }

  return Object.freeze({
    META_KEY, COLLECTION, MAX_SNAPSHOT_CHARS, SYNC_DELAY, RETRY_DELAY, ACTIVE_GRACE_SECONDS,
    hash, normalizeMeta, progressOf, changedSince, loadMeta, saveMeta, decide, encode, decode, fits, summaryFields,
  });
});
