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
    try {
      const text = storage.getItem(KEY);
      if (text) {
        const state = E.sanitize(JSON.parse(text), now);
        // A signal visible before leaving is never offered as an offline reward.
        state.beacon.expiresAt = 0;
        const report = E.advance(state, now, {
          offline: now - state.lastAt > 30000,
          report: true,
        });
        return { state, report, legacy: null, error: null };
      }
      const legacy = storage.getItem(LEGACY_KEY);
      return { state: E.createState(now), report: null, legacy, error: null };
    } catch (error) {
      // The UI disables autosave here. Do not overwrite a corrupt or future record.
      return {
        state: E.createState(now),
        report: null,
        legacy: null,
        error: error.message,
      };
    }
  }
  function save(storage, state) {
    storage.setItem(KEY, JSON.stringify(state));
  }
  function restore(storage, text, now = Date.now()) {
    const raw = JSON.parse(text);
    const state =
      raw?.schema === "salvage-orbit"
        ? E.sanitize(raw, now)
        : E.migrateLegacy(raw, now);
    const current = storage.getItem(KEY);
    if (current) storage.setItem(BACKUP, current);
    if (state.legacyArchive) {
      // Never replace the first migration backup or the playable v2 record.
      if (!storage.getItem(LEGACY_BACKUP)) storage.setItem(LEGACY_BACKUP, text);
    }
    state.lastAt = now;
    state.carryMs = 0;
    state.beacon.expiresAt = 0;
    save(storage, state);
    return state;
  }
  function reset(storage, now = Date.now()) {
    const current = storage.getItem(KEY);
    if (current) storage.setItem(BACKUP, current);
    const state = E.createState(now);
    save(storage, state);
    return state;
  }
  return Object.freeze({
    KEY,
    LEGACY_KEY,
    LEGACY_BACKUP,
    BACKUP,
    UI_KEY,
    reading,
    saveReading,
    load,
    save,
    restore,
    reset,
  });
});
