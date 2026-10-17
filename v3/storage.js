(function (root, factory) {
  const engine =
    typeof module === "object" && module.exports
      ? require("./engine.js")
      : root.SalvageEngine;
  const api = factory(engine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SalvageStorage = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (E) {
  "use strict";
  const KEY = "stellarOutpostIdleSave_v3";
  const LEGACY_KEY = "stellarOutpostIdleSave_v1";
  const LEGACY_BACKUP = "stellarOutpostIdleSave_v31_backup_before_v3";
  const BACKUP = "stellarOutpostIdleSave_v3_before_restore";
  const UI_KEY = "stellarOutpostIdle_v3_reading";
  const BACKUP_PREFIX = "stellarOutpostIdle_v3_backup_";
  const BACKUP_INTERVAL = 5 * 60 * 1000;
  const MAX_TEXT_BYTES = 4 * 1024 * 1024;
  const BACKUP_IDS = ["auto-0", "auto-1", "auto-2", "kept-0", "kept-1", "kept-2"];
  function inspect(text, now = Date.now()) {
    if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_TEXT_BYTES)
      throw new Error("记录超过 4 MB，请检查是否选对文件。");
    const raw = JSON.parse(text);
    const legacy = raw?.schema !== "salvage-orbit";
    const state = legacy ? E.migrateLegacy(raw, now) : E.sanitize(raw, now);
    return { state, legacy, summary: summarize(state) };
  }
  function summarize(state) {
    return {
      savedAt: state.lastAt, dust: state.dust, samples: state.samples,
      cores: state.cores, rebirths: state.rebirths, starport: state.starport,
      chapter: E.routeArchive(state).chapter, ending: state.epilogue.ending,
      lore: state.lore.map(({ story, choice }) => ({ story, choice })),
      residents: state.afterword.completed.length,
      mission: state.mission?.id || null, pending: state.result?.id || null,
    };
  }
  function readBackup(storage, id, now = Date.now()) {
    if (id !== "previous" && !BACKUP_IDS.includes(id)) throw new Error("未知备份。");
    const raw = storage.getItem(id === "previous" ? BACKUP : BACKUP_PREFIX + id);
    if (raw === null) return null;
    let record = { text: raw, createdAt: 0, order: 0, kind: "previous", label: "上次覆盖前备份" };
    let envelopeError = null;
    if (id !== "previous") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.version !== 1 || typeof parsed.text !== "string" ||
          !["auto", "manual", "restore", "reset"].includes(parsed.kind) ||
          !Number.isFinite(parsed.createdAt) || parsed.createdAt < 0)
          throw new Error("备份封装不完整。");
        record = { text: parsed.text, createdAt: Math.min(now, parsed.createdAt),
          order: Number.isSafeInteger(parsed.order) && parsed.order >= 0 ? Math.min(parsed.order, Number.MAX_SAFE_INTEGER - 1000) : parsed.createdAt, kind: parsed.kind,
          label: typeof parsed.label === "string" ? parsed.label.slice(0, 40) : "" };
      } catch (error) { envelopeError = error.message; }
    }
    try {
      if (envelopeError) throw new Error(envelopeError);
      return { id, ...record, valid: true, summary: inspect(record.text, now).summary };
    } catch (error) { return { id, ...record, valid: false, error: error.message, summary: null }; }
  }
  function backups(storage, now = Date.now()) {
    try {
      const entries = BACKUP_IDS.map(id => readBackup(storage, id, now)).filter(Boolean);
      const previous = readBackup(storage, "previous", now);
      if (previous && !entries.some(entry => entry.text === previous.text)) entries.push(previous);
      return { entries: entries.sort((a, b) => b.order - a.order || b.createdAt - a.createdAt), error: null };
    } catch (error) { return { entries: [], error: error.message }; }
  }
  function verifiedWrite(storage, key, text) {
    storage.setItem(key, text);
    if (storage.getItem(key) !== text) throw new Error("本机写入校验未通过，未接续新记录。");
  }
  function checkpoint(storage, text, kind = "manual", label = "", now = Date.now(), options = {}) {
    if (!["auto", "manual", "restore", "reset"].includes(kind)) throw new Error("未知备份类型。");
    if (kind === "auto" || kind === "manual") inspect(text, now);
    if (typeof text !== "string" || new TextEncoder().encode(text).length > MAX_TEXT_BYTES)
      throw new Error("原记录超过 4 MB，请先导出原文。");
    const ids = BACKUP_IDS.filter(id => id.startsWith(kind === "auto" ? "auto-" : "kept-") && id !== options.preserveId);
    const slots = ids.map(id => ({ id, record: readBackup(storage, id, now) }));
    const slot = slots.find(item => !item.record) || slots.sort((a, b) => a.record.order - b.record.order)[0];
    const order = Math.max(now, ...slots.map(item => item.record?.order || 0)) + 1;
    const record = JSON.stringify({ version: 1, createdAt: now, order, kind, label: String(label).trim().slice(0, 40), text });
    verifiedWrite(storage, BACKUP_PREFIX + slot.id, record);
    return slot.id;
  }
  function reading(storage) {
    try {
      const raw = JSON.parse(storage.getItem(UI_KEY) || "null");
      return {
        size: ["normal", "large", "larger"].includes(raw?.size) ? raw.size : "normal",
        anchor: typeof raw?.anchor === "string" && /^[a-z0-9-]{1,100}$/.test(raw.anchor) ? raw.anchor : null,
        offset: Math.min(600, Math.max(-100000, Number(raw?.offset) || 0)),
        open: Object.fromEntries(Object.entries(raw?.open && typeof raw.open === "object" ? raw.open : {}).filter(([key, value]) => /^[a-z0-9-]{1,100}$/.test(key) && typeof value === "boolean").slice(0, 150)),
      };
    } catch (_) { return { size: "normal", anchor: null, offset: 0, open: {} }; }
  }
  function saveReading(storage, preferences) {
    try { storage.setItem(UI_KEY, JSON.stringify(preferences)); return true; }
    catch (_) { return false; }
  }
  function load(storage, now = Date.now()) {
    let source = null;
    try {
      const text = source = storage.getItem(KEY);
      if (text) {
        const state = E.sanitize(JSON.parse(text), now);
        // A signal visible before leaving is never offered as an offline reward.
        state.beacon.expiresAt = 0;
        const report = E.advance(state, now, {
          offline: now - state.lastAt > 30000,
          report: true,
        });
        return { state, report, legacy: null, error: null, source };
      }
      const legacy = storage.getItem(LEGACY_KEY);
      return { state: E.createState(now), report: null, legacy, error: null, source };
    } catch (error) {
      // The UI disables autosave here. Do not overwrite a corrupt or future record.
      return {
        state: E.createState(now),
        report: null,
        legacy: null,
        error: error.message,
        source,
      };
    }
  }
  function save(storage, state, now = Date.now(), options = {}) {
    const text = JSON.stringify(state);
    const current = storage.getItem(KEY);
    if (Object.hasOwn(options, "expected") && current !== options.expected)
      throw new Error("另一窗口已更新进度，请重新载入后再保存。");
    // Reserve space for the primary first; optional backups must not consume its quota.
    verifiedWrite(storage, KEY, text);
    let backupError = null;
    try {
      const automatic = BACKUP_IDS.filter(id => id.startsWith("auto-")).map(id => readBackup(storage, id, now)).filter(entry => entry?.valid);
      if (!automatic.length || now - Math.max(...automatic.map(entry => entry.createdAt)) >= BACKUP_INTERVAL)
        checkpoint(storage, current || text, "auto", "", now);
    } catch (error) { backupError = error.message; }
    if (storage.getItem(KEY) !== text) throw new Error("另一窗口已更新进度，请重新载入后再保存。");
    return { backupError };
  }
  function protectCurrent(storage, kind, now, options) {
    const current = storage.getItem(KEY);
    if (Object.hasOwn(options, "expected") && current !== options.expected)
      throw new Error("本机进度已变化，请重新打开预览，避免覆盖另一窗口。");
    if (current !== null) {
      checkpoint(storage, options.snapshot || current, kind, "", now, options);
      verifiedWrite(storage, BACKUP, current);
    }
    if (storage.getItem(KEY) !== current)
      throw new Error("另一窗口已更新进度，请重新载入后再操作。");
    return current;
  }
  function restore(storage, text, now = Date.now(), options = {}) {
    const state = inspect(text, now).state;
    if (Object.hasOwn(options, "expected") && storage.getItem(KEY) !== options.expected)
      throw new Error("本机进度已变化，请重新打开预览，避免覆盖另一窗口。");
    // Keep the chosen recovery source even if the final primary write fails.
    const source = BACKUP_IDS.map(id => readBackup(storage, id, now)).find(entry => entry?.text === text);
    let preserveId = source?.id;
    if (!source && storage.getItem(BACKUP) === text)
      preserveId = checkpoint(storage, text, "restore", "恢复来源（保留）", now);
    const current = protectCurrent(storage, "restore", now, { ...options, preserveId });
    if (state.legacyArchive) {
      // Never replace the first migration backup or the playable v2 record.
      if (!storage.getItem(LEGACY_BACKUP)) verifiedWrite(storage, LEGACY_BACKUP, text);
    }
    if (storage.getItem(KEY) !== current) throw new Error("另一窗口已更新进度，请重新打开预览。");
    state.lastAt = now;
    state.carryMs = 0;
    state.beacon.expiresAt = 0;
    verifiedWrite(storage, KEY, JSON.stringify(state));
    return state;
  }
  function reset(storage, now = Date.now(), options = {}) {
    protectCurrent(storage, "reset", now, options);
    const state = E.createState(now);
    verifiedWrite(storage, KEY, JSON.stringify(state));
    return state;
  }
  return Object.freeze({
    KEY,
    LEGACY_KEY,
    LEGACY_BACKUP,
    BACKUP,
    UI_KEY,
    BACKUP_PREFIX,
    BACKUP_INTERVAL,
    MAX_TEXT_BYTES,
    inspect,
    summarize,
    backups,
    readBackup,
    checkpoint,
    reading,
    saveReading,
    load,
    save,
    restore,
    reset,
  });
});
