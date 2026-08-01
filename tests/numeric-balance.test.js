"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const math = require("../game-math.js");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "game.js"), "utf8");

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
const starportModules = readArray("STARPORT_MODULES", "SKIRMISH_TARGETS");
const skirmishes = readArray("SKIRMISH_TARGETS", "PLANET_TARGETS");
const companions = readArray("SINGULARITY_COMPANIONS", "ENDGAME_PROTOCOLS");

const dustCap = readConstant("DUST_RESERVE_CAP");
const careerDustCap = readConstant("CAREER_DUST_CAP");
const productionSoftCap = readConstant("PRODUCTION_SOFT_CAP");
const productionPower = readConstant("PRODUCTION_LATE_POWER");
const maxAutoRate = readConstant("MAX_AUTO_RATE");
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

assert.equal(readConstant("SAVE_VERSION"), 6, "save migration must stay enabled");
assert.equal(dustCap, 999000000, "late-game reserve must allow long idle sessions");
assert.ok(dustCap < 1e9, "active dust reserve must remain below B notation");
assert.ok(careerDustCap < 1e9, "career dust must remain below B notation");
assert.ok(maxBuildingUnitCost < dustCap, "one facility must always be affordable");
assert.ok(maxCombatUpgradeCost < dustCap, "one combat upgrade must stay affordable");
assert.doesNotMatch(math.formatNumber(dustCap), /[BTP]/);
assert.doesNotMatch(math.formatNumber(careerDustCap), /[BTP]/);
assert.equal(qualityTickInterval, 100, "quality logic must be capped at 10 Hz");
assert.equal(ecoTickInterval, 250, "eco logic must be capped at 4 Hz");
assert.equal(qualityStarfieldFps, 60, "quality starfield must be capped at 60 FPS");
assert.equal(ecoStarfieldFps, 24, "eco starfield must be capped at 24 FPS");
assert.doesNotMatch(source, /requestAnimationFrame\(gameLoop\)/);

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

const screenshotRawRate = 90.4e15;
const compressedRate = Math.min(
  maxAutoRate,
  math.softCapGameNumber(
    screenshotRawRate,
    productionSoftCap,
    productionPower,
  ),
);
assert.ok(compressedRate < 1e6, "90.4P/s must compress below 1M/s");
assert.doesNotMatch(math.formatNumber(compressedRate), /[BTP]/);

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
  `numeric balance ok: rate=${math.formatNumber(compressedRate)}, ` +
    `legacyDust=${math.formatNumber(legacyDust)}, ` +
    `legacyCores=${math.formatNumber(legacyCores)}`,
);
