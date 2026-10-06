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
    load,
    save,
    restore,
    reset,
  });
});
