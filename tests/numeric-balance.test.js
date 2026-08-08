"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const math = require("../game-math.js");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");
const cloudSource = fs.readFileSync(path.join(root, "cloud-save.js"), "utf8");
const firestoreRules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");

function readConstant(name) {
  const match = source.match(
    new RegExp(`const\\s+${name}\\s*=\\s*([0-9.eE+-]+);`),
  );
  assert.ok(match, `missing numeric constant ${name}`);
  return Number(match[1]);
}

function readArray(name, nextName) {
  const match = source.match(
    new RegExp(
      `const\\s+${name}\\s*=\\s*(\\[[\\s\\S]*?\\]);\\s*const\\s+${nextName}`,
    ),
  );
  assert.ok(match, `missing array ${name}`);
  return vm.runInNewContext(`(${match[1]})`, Object.create(null));
}

const buildings = readArray("BUILDINGS", "UPGRADES");
const upgrades = readArray("UPGRADES", "ACHIEVEMENTS");
const starportMaterials = readArray("STARPORT_MATERIALS", "STARPORT_MODULES");
const starportModules = readArray("STARPORT_MODULES", "FLEET_DISTRIBUTIONS");
const fleetDistributions = readArray(
  "FLEET_DISTRIBUTIONS",
  "FLEET_FORMATIONS",
);
const fleetFormations = readArray("FLEET_FORMATIONS", "FLEET_WEAPONS");
const fleetWeapons = readArray("FLEET_WEAPONS", "FLEET_TACTICS");
const fleetTactics = readArray("FLEET_TACTICS", "FLEET_CHALLENGE_TRAITS");
const fleetChallengeTraits = readArray(
  "FLEET_CHALLENGE_TRAITS",
  "FLEET_CHALLENGE_NAMES",
);
const fleetChallengeNames = readArray(
  "FLEET_CHALLENGE_NAMES",
  "FLEET_CHALLENGE_HAZARDS",
);
const fleetChallengeHazards = readArray(
  "FLEET_CHALLENGE_HAZARDS",
  "FLEET_COSMETICS",
);
const fleetCosmetics = readArray("FLEET_COSMETICS", "SKIRMISH_TARGETS");
const skirmishes = readArray("SKIRMISH_TARGETS", "PLANET_TARGETS");
const companions = readArray(
  "SINGULARITY_COMPANIONS",
  "COMPANION_OBSERVATION_SIGNAL_CAP",
);
const companionEvents = readArray("COMPANION_EVENTS", "ENDGAME_PROTOCOLS");
const expeditionRoutes = readArray("EXPEDITION_ROUTE_TYPES", "EXPEDITION_AFFIXES");
const expeditionAffixes = readArray("EXPEDITION_AFFIXES", "EXPEDITION_BOONS");
const expeditionBoons = readArray("EXPEDITION_BOONS", "EXPEDITION_GEAR");
const expeditionGear = readArray("EXPEDITION_GEAR", "EXPEDITION_BOSSES");
const expeditionBosses = readArray("EXPEDITION_BOSSES", "EXPEDITION_BOSS_TACTICS");
const expeditionBossTactics = readArray(
  "EXPEDITION_BOSS_TACTICS",
  "EXPEDITION_ARTIFACTS",
);
const expeditionArtifacts = readArray("EXPEDITION_ARTIFACTS", "EXPEDITION_SKINS");
const expeditionSkins = readArray("EXPEDITION_SKINS", "MISSION_TEMPLATES");

const dustCap = readConstant("DUST_RESERVE_CAP");
const careerDustCap = readConstant("CAREER_DUST_CAP");
const maxAutoRate = readConstant("MAX_AUTO_RATE");
const autoRateOverflowScale = readConstant("AUTO_RATE_OVERFLOW_SCALE");
const maxBuildingUnitCost = readConstant("MAX_BUILDING_UNIT_COST");
const maxCombatUpgradeCost = readConstant("MAX_COMBAT_UPGRADE_COST");
const legacyDustSoftCap = readConstant("LEGACY_DUST_SOFT_CAP");
const legacyDustPower = readConstant("LEGACY_DUST_LATE_POWER");
const legacyCoreSoftCap = readConstant("LEGACY_CORE_SOFT_CAP");
const legacyCorePower = readConstant("LEGACY_CORE_LATE_POWER");
const qualityTickInterval = readConstant("QUALITY_GAME_TICK_INTERVAL");
const ecoTickInterval = readConstant("ECO_GAME_TICK_INTERVAL");
const qualityStarfieldFps = readConstant("QUALITY_STARFIELD_FPS");
const ecoStarfieldFps = readConstant("ECO_STARFIELD_FPS");

assert.equal(readConstant("SAVE_VERSION"), 13, "starfall event saves need schema version 13");
assert.equal(
  readConstant("NUMERIC_MIGRATION_VERSION"),
  6,
  "v6 saves must not be compressed again when the schema changes",
);
assert.match(
  source,
  /sourceVersion\s*<\s*NUMERIC_MIGRATION_VERSION/,
  "numeric migration must be decoupled from ordinary save migrations",
);
assert.equal(dustCap, 9999000000, "late-game reserve must reach 9999M");
assert.ok(dustCap < 1e10, "active dust reserve must stop at 9999M");
assert.ok(careerDustCap < 1e9, "career dust must remain below B notation");
assert.ok(maxBuildingUnitCost < dustCap, "one facility must always be affordable");
assert.ok(maxCombatUpgradeCost < dustCap, "one combat upgrade must stay affordable");
assert.doesNotMatch(math.formatNumber(dustCap), /[PT]/);
assert.doesNotMatch(math.formatNumber(careerDustCap), /[BTP]/);
assert.equal(qualityTickInterval, 100, "quality logic must be capped at 10 Hz");
assert.equal(ecoTickInterval, 250, "eco logic must be capped at 4 Hz");
assert.equal(qualityStarfieldFps, 60, "quality starfield must be capped at 60 FPS");
assert.equal(ecoStarfieldFps, 24, "eco starfield must be capped at 24 FPS");
assert.doesNotMatch(source, /requestAnimationFrame\(gameLoop\)/);
assert.equal(readConstant("EXPEDITION_ROUTE_COUNT"), 5);
assert.equal(readConstant("EXPEDITION_GEAR_SLOT_LIMIT"), 3);
assert.equal(readConstant("EXPEDITION_PRESET_COUNT"), 3);
assert.equal(readConstant("FLEET_COMMAND_PRESET_COUNT"), 3);
assert.equal(readConstant("FLEET_CHALLENGE_ATTEMPT_LIMIT"), 8);
assert.equal(readConstant("EXPEDITION_UNLOCK_DUST"), 50000);
assert.equal(readConstant("OPERATIONS_UNLOCK_DUST"), 1000);
assert.equal(readConstant("OPERATIONS_ORDER_SECONDS"), 1800);
assert.equal(readConstant("OPERATIONS_MAX_MASTERY"), 30);
assert.equal(readConstant("MAX_EXPEDITION_ENTRY_DUST_COST"), 300000000);
assert.equal(readConstant("ENDGAME_UNLOCK_CORES"), 150);
assert.equal(readConstant("COMPANION_OBSERVATION_SIGNAL_CAP"), 12);
assert.equal(readConstant("BUILDING_COORDINATION_STEP"), 10);
assert.equal(readConstant("BUILDING_COORDINATION_MULTIPLIER"), 2);
assert.equal(readConstant("BUILDING_COORDINATION_MAX_TIERS"), 20);
assert.equal(readConstant("MAX_AUTOMATIC_PRODUCTION_MULTIPLIER"), 1000000000);
assert.equal(expeditionRoutes.length, 5, "expeditions need five route archetypes");
assert.equal(expeditionAffixes.length, 5, "expeditions need five enemy affixes");
assert.equal(expeditionBoons.length, 8, "expeditions need eight temporary protocols");
assert.equal(expeditionGear.length, 12, "starport loadouts need twelve gear pieces");
assert.equal(expeditionBosses.length, 3, "expeditions need three mechanism bosses");
assert.equal(
  expeditionBossTactics.length,
  3,
  "boss encounters need three tactical responses",
);
assert.equal(expeditionArtifacts.length, 8, "collection cabin needs eight artifacts");
assert.equal(expeditionSkins.length, 5, "beacon wardrobe needs five appearances");
assert.equal(fleetDistributions.length, 4, "fleet command needs four allocation doctrines");
assert.equal(fleetFormations.length, 3, "fleet command needs three formations");
assert.equal(fleetWeapons.length, 3, "fleet command needs three weapon families");
assert.equal(fleetTactics.length, 3, "fleet command needs three tactical orders");
assert.equal(fleetChallengeTraits.length, 3, "weekly challenge needs three counters");
assert.ok(fleetChallengeNames.length >= 5, "weekly routes need visible variety");
assert.equal(fleetChallengeHazards.length, 3, "weekly challenge needs three hazards");
assert.equal(fleetCosmetics.length, 4, "fleet rewards need four cosmetic badges");
assert.ok(
  fleetCosmetics.every(
    (cosmetic) => !("multiplier" in cosmetic) && !("power" in cosmetic),
  ),
  "fleet challenge collectibles must remain cosmetic-only",
);
assert.equal(companions.length, 8, "singularity collection needs eight companions");
assert.equal(companionEvents.length, 8, "each companion needs one observation event");
assert.ok(
  companionEvents.every(
    (companionEvent) =>
      companionEvent.choices.length === 2 &&
      companionEvent.choices.every(
        (choice) =>
          !("multiplier" in choice.rewards) && !("power" in choice.rewards),
      ),
  ),
  "companion events must offer two non-multiplier reward choices",
);
assert.ok(
  expeditionArtifacts.every(
    (artifact) => !("multiplier" in artifact) && !("power" in artifact),
  ),
  "expedition collectibles must remain cosmetic-only",
);

for (const field of [
  "expeditionRuns",
  "expeditionBossWins",
  "expeditionArtifacts",
]) {
  assert.match(
    cloudSource,
    new RegExp(`${field}\\s*:`),
    `cloud leaderboard must publish ${field}`,
  );
  assert.match(
    firestoreRules,
    new RegExp(`request\\.resource\\.data\\.${field}`),
    `Firestore rules must validate ${field}`,
  );
  assert.match(
    firestoreRules,
    new RegExp(
      `request\\.resource\\.data\\.${field}\\s*>=\\s*resource\\.data\\.${field}`,
    ),
    `Firestore rules must keep ${field} monotonic`,
  );
}

const saveRules = firestoreRules.match(
  /match \/saves\/\{userId\} \{([\s\S]*?)\n    match \/leaderboards/,
);
assert.ok(saveRules, "Firestore rules must include the cloud-save scope");
assert.match(
  saveRules[1],
  /request\.auth != null && request\.auth\.uid == userId/,
  "cloud saves must remain isolated to their authenticated owner",
);
assert.match(
  saveRules[1],
  /keys\(\)\.hasAll\(\[\s*"revision",\s*"snapshot"\s*\]\)/,
  "cloud saves must validate the cross-version envelope",
);
assert.match(
  saveRules[1],
  /request\.resource\.data\.snapshot is map/,
  "cloud saves must keep accepting legacy map snapshots",
);
assert.match(
  saveRules[1],
  /request\.resource\.data\.snapshot is string/,
  "cloud saves must accept JSON string snapshots",
);
assert.match(
  saveRules[1],
  /request\.resource\.data\.snapshot\.size\(\) <= 700000/,
  "cloud saves must cap JSON snapshot size",
);
assert.doesNotMatch(
  saveRules[1],
  /hasOnly/,
  "cloud save metadata must remain forward compatible",
);
assert.match(
  cloudSource,
  /currentUser\.getIdToken\(true\)/,
  "permission failures must refresh the Firebase identity token once",
);
assert.match(
  cloudSource,
  /JSON\.stringify\(snapshot\)/,
  "cloud saves must serialize nested game arrays before Firestore upload",
);
assert.match(
  cloudSource,
  /JSON\.parse\(snapshot\)/,
  "cloud saves must decode JSON snapshots after Firestore download",
);
assert.match(
  cloudSource,
  /new TextEncoder\(\)\.encode\(serialized\)\.byteLength/,
  "cloud saves must enforce the document-safe byte limit",
);
assert.match(
  firestoreRules,
  /match \/feedback\/\{feedbackId\}[\s\S]*?allow create: if request\.auth != null/,
  "feedback must require an authenticated player",
);
assert.match(
  firestoreRules,
  /request\.resource\.data\.userId == request\.auth\.uid/,
  "feedback must carry the submitting player's uid",
);
assert.match(
  firestoreRules,
  /request\.resource\.data\.message\.size\(\) <= 2000/,
  "feedback text must have a document-safe limit",
);
assert.match(
  firestoreRules,
  /match \/announcements\/\{announcementId\}[\s\S]*?allow read: if resource\.data\.published == true/,
  "only published announcements may be read",
);
assert.match(
  firestoreRules,
  /match \/announcements\/\{announcementId\}[\s\S]*?allow write: if false/,
  "the game client must never publish announcements",
);
assert.match(
  cloudSource,
  /firebaseFirestoreApi\.addDoc\([\s\S]*?FEEDBACK_COLLECTION/,
  "the in-game form must write feedback through Firestore",
);

for (const building of buildings) {
  assert.ok(building.baseCost <= 16e6, `${building.id} base cost is too large`);
  assert.ok(building.unlock <= 50e6, `${building.id} unlock is too large`);
  assert.ok(building.baseRate <= 36000, `${building.id} base rate is too large`);
  const lateUnitCost = math.cappedGeometricSeriesCost(
    building.baseCost,
    1.12,
    10000,
    1,
    3,
    maxBuildingUnitCost,
  );
  assert.equal(lateUnitCost, maxBuildingUnitCost, `${building.id} cap failed`);
  assert.equal(
    math.maxAffordableCappedGeometric(
      building.baseCost,
      1.12,
      dustCap,
      10000,
      3,
      maxBuildingUnitCost,
    ),
    Math.floor(dustCap / maxBuildingUnitCost),
    `${building.id} capped batch affordability is incorrect`,
  );
}

assert.equal(companions.length, 8, "singularity collapse needs eight collectible companions");
assert.ok(
  companions.every(
    (companion) =>
      typeof companion.color === "string" &&
      companion.color.startsWith("#") &&
      typeof companion.glow === "string" &&
      companion.glow.startsWith("rgba("),
  ),
  "every companion needs a distinct physical display palette",
);
assert.equal(
  new Set(companions.map((companion) => companion.id)).size,
  companions.length,
  "singularity companion ids must be unique",
);

for (const upgrade of upgrades) {
  assert.ok(upgrade.cost < dustCap, `${upgrade.id} cannot fit in the reserve cap`);
  assert.ok(upgrade.unlock <= 50e6, `${upgrade.id} unlock is too large`);
}

for (const target of skirmishes) {
  assert.equal(
    Object.keys(target.drops).length,
    1,
    `${target.id} must drop exactly one dedicated material`,
  );
  for (const [material, range] of Object.entries(target.drops)) {
    assert.ok(range[0] >= 1, `${target.id}/${material} can still drop zero`);
    assert.ok(range[1] >= range[0], `${target.id}/${material} range is invalid`);
  }
}

assert.equal(starportMaterials.length, 6, "starport needs six material types");
assert.equal(starportModules.length, 6, "starport needs six module slots");
const materialIds = new Set(starportMaterials.map((material) => material.id));
const moduleMaterialIds = new Set();
for (const module of starportModules) {
  const requiredMaterials = Object.keys(module.baseCost);
  assert.equal(
    requiredMaterials.length,
    1,
    `${module.id} must require exactly one dedicated material`,
  );
  assert.ok(
    materialIds.has(requiredMaterials[0]),
    `${module.id} references an unknown material`,
  );
  moduleMaterialIds.add(requiredMaterials[0]);
  assert.ok(module.baseDustCost >= 30000, `${module.id} dust cost is not substantial`);
  const finalDustCost = Math.ceil(
    module.baseDustCost * module.dustGrowth ** (module.maxRank - 1),
  );
  assert.ok(
    finalDustCost <= maxBuildingUnitCost,
    `${module.id} final dust cost exceeds the affordable cap`,
  );
}
assert.deepEqual(
  [...moduleMaterialIds].sort(),
  [...materialIds].sort(),
  "each module must consume a different material",
);
assert.deepEqual(
  [...new Set(skirmishes.flatMap((target) => Object.keys(target.drops)))].sort(),
  [...materialIds].sort(),
  "near-zone targets must cover every starport material exactly once",
);

const overflowInput = maxAutoRate * 10;
const overflowRate =
  maxAutoRate +
  Math.log1p((overflowInput - maxAutoRate) / maxAutoRate) *
    autoRateOverflowScale;
assert.ok(overflowRate > maxAutoRate, "automatic production must grow past 999K/s");
assert.ok(overflowRate < 2e6, "overflow production must remain in the low M range");
assert.doesNotMatch(math.formatNumber(overflowRate), /[BTP]/);
assert.doesNotMatch(
  source,
  /return\s+Math\.min\(\s*MAX_AUTO_RATE/,
  "automatic production must not use the former hard cap",
);
assert.match(
  source,
  /function calculateBuildingRate\([\s\S]*?compressAutomaticRate/,
  "each facility type needs an independent monotonic production stream",
);
assert.match(
  source,
  /function calculateRate\([\s\S]*?BUILDINGS\.reduce/,
  "fleet production must add independent facility contributions",
);

const legacyDust = Math.min(
  dustCap,
  math.softCapGameNumber(57e18, legacyDustSoftCap, legacyDustPower),
);
assert.ok(legacyDust <= dustCap, "57E legacy dust must fit the new reserve");
assert.doesNotMatch(math.formatNumber(legacyDust), /[BTP]/);

const legacyCores = math.softCapGameNumber(
  10.6e6,
  legacyCoreSoftCap,
  legacyCorePower,
);
assert.ok(legacyCores < 100000, "10.6M legacy cores should migrate to K scale");

assert.doesNotMatch(source, /1e18|1e12/);

assert.equal(
  math.cappedGeometricSeriesCost(100, 2, 0, 4, 1, 250),
  800,
  "batch cost must sum each capped unit",
);
assert.equal(
  math.maxAffordableCappedGeometric(100, 2, 550, 0, 1, 250),
  3,
  "max purchase must use the same capped batch curve",
);

console.log(
  `numeric balance ok: stream=${math.formatNumber(overflowRate)}, ` +
    `legacyDust=${math.formatNumber(legacyDust)}, ` +
    `legacyCores=${math.formatNumber(legacyCores)}`,
);
