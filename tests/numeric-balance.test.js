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
const skirmishes = readArray("SKIRMISH_TARGETS", "PLANET_TARGETS");

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

assert.equal(readConstant("SAVE_VERSION"), 6, "save migration must stay enabled");
assert.ok(dustCap < 1e9, "active dust reserve must remain below B notation");
assert.ok(careerDustCap < 1e9, "career dust must remain below B notation");
assert.ok(maxBuildingUnitCost < dustCap, "one facility must always be affordable");
assert.ok(maxCombatUpgradeCost < dustCap, "one combat upgrade must stay affordable");
assert.doesNotMatch(math.formatNumber(dustCap), /[BTP]/);
assert.doesNotMatch(math.formatNumber(careerDustCap), /[BTP]/);

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
    1,
    `${building.id} should remain purchasable one at a time`,
  );
}

for (const upgrade of upgrades) {
  assert.ok(upgrade.cost < dustCap, `${upgrade.id} cannot fit in the reserve cap`);
  assert.ok(upgrade.unlock <= 50e6, `${upgrade.id} unlock is too large`);
}

for (const target of skirmishes) {
  for (const [material, range] of Object.entries(target.drops)) {
    assert.ok(range[0] >= 1, `${target.id}/${material} can still drop zero`);
    assert.ok(range[1] >= range[0], `${target.id}/${material} range is invalid`);
  }
}

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
