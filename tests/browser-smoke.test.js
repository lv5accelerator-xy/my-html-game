"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH;
assert.ok(playwrightPath, "CODEX_PLAYWRIGHT_PATH is required");
const { chromium } = require(playwrightPath);

const root = path.resolve(__dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://local").pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(filePath)) {
    response.writeHead(404).end("not found");
    return;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, {
    "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "content-length": stat.size,
  });
  fs.createReadStream(filePath).pipe(response);
});

async function main() {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CODEX_CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  const failedLocalRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith(origin)) {
      failedLocalRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  await context.addInitScript((legacySave) => {
    localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify(legacySave));
    localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "0.14.0");
  }, {
    version: 5,
    playerName: "测试指挥官",
    tutorialSeen: true,
    dust: 57e18,
    runDust: 58.6e18,
    lifetimeDust: 58.6e18,
    careerDust: 60e18,
    cores: 10.6e6,
    totalCores: 10.6e6,
    rebirths: 12,
    activePage: "transcend",
    buildings: {
      drone: 1200,
      sail: 900,
      lab: 600,
      forge: 400,
      relay: 250,
      dyson: 140,
      ringYard: 80,
      riftNet: 40,
      horizonMine: 20,
      cosmicLoom: 10,
    },
    upgrades: [],
    achievements: [],
    starport: {
      materials: { alloy: 11, crystal: 12, circuit: 13, relic: 14 },
      modules: {},
    },
    combat: { attackLevel: 28, defenseLevel: 30 },
    lastSeen: Date.now(),
  });

  try {
    const response = await page.goto(origin, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));

    const snapshot = await page.evaluate(() => ({
      footer: document.querySelector("footer").textContent,
      dust: document.querySelector("#dust-value").textContent,
      rate: document.querySelector("#rate-value").textContent,
      cores: document.querySelector("#core-value").textContent,
      lockedHidden: document.querySelector("#transcend-locked").hidden,
      lockedDisplay: getComputedStyle(document.querySelector("#transcend-locked")).display,
      lockedRects: document.querySelector("#transcend-locked").getClientRects().length,
      contentHidden: document.querySelector("#transcend-content").hidden,
      contentDisplay: getComputedStyle(document.querySelector("#transcend-content")).display,
      contentRects: document.querySelector("#transcend-content").getClientRects().length,
      saveVersion: window.StellarOutpostCloudBridge.saveVersion,
      gameVersion: window.StellarOutpostCloudBridge.gameVersion,
      performance: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      metadata: window.StellarOutpostCloudBridge.getMetadata(),
      bgmPath: new URL(document.querySelector("#bgm-audio").src).pathname,
    }));

    assert.equal(snapshot.gameVersion, "0.14.0");
    assert.equal(snapshot.saveVersion, 7);
    assert.equal(snapshot.performance.mode, "quality");
    assert.equal(snapshot.performance.gameTickInterval, 100);
    assert.equal(snapshot.performance.starfield.targetFps, 60);
    assert.match(snapshot.footer, /v0\.14\.0/);
    assert.equal(snapshot.lockedHidden, true, "unlock should hide the locked card");
    assert.equal(snapshot.lockedDisplay, "none", "locked card must be visually hidden");
    assert.equal(snapshot.lockedRects, 0, "locked card must occupy no rendered area");
    assert.equal(snapshot.contentHidden, false, "unlock should expose endgame content");
    assert.notEqual(snapshot.contentDisplay, "none", "endgame content must be visible");
    assert.ok(snapshot.contentRects > 0, "endgame content must occupy rendered area");
    assert.match(snapshot.bgmPath, /stellar-outpost-bgm\.mp3$/);
    assert.ok(snapshot.metadata.lifetimeDust < 1e9);
    assert.ok(snapshot.metadata.totalCores >= 5000);
    assert.doesNotMatch(`${snapshot.dust} ${snapshot.rate} ${snapshot.cores}`, /[BTP]/);

    const globalRadarPages = [
      "fleet",
      "starport",
      "research",
      "core-shop",
      "combat",
      "missions",
      "transcend",
      "leaderboard",
    ];
    const globalRadarCheck = await page.evaluate((pageIds) => {
      const bridge = window.StellarOutpostCloudBridge;
      const baseSave = bridge.createSnapshot();
      return pageIds.map((pageId) => {
        const radarSave = JSON.parse(JSON.stringify(baseSave));
        radarSave.activePage = pageId;
        radarSave.event = null;
        radarSave.buff = null;
        radarSave.nextEventAt = Date.now() + 125000;
        radarSave.lastSeen = Date.now();
        bridge.applySnapshot(radarSave);
        return {
          pageId,
          title: document.querySelector("#event-title").textContent,
          countdown: document.querySelector("#event-countdown").textContent,
        };
      });
    }, globalRadarPages);
    for (const radarState of globalRadarCheck) {
      assert.equal(radarState.title, "正在扫描航道");
      assert.match(
        radarState.countdown,
        /^02:0[4-5]$/,
        `${radarState.pageId} must refresh the global radar immediately`,
      );
    }

    const cappedGrowthBefore = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const growthSave = bridge.createSnapshot();
      growthSave.version = 6;
      growthSave.activePage = "fleet";
      growthSave.dust = 999000000;
      growthSave.runDust = 999000000;
      growthSave.lifetimeDust = 999000000;
      growthSave.cores = 999000000;
      growthSave.totalCores = 999000000;
      growthSave.buyMode = "10";
      growthSave.buff = null;
      Object.keys(growthSave.buildings).forEach((id) => {
        growthSave.buildings[id] = 10000;
      });
      growthSave.coreShop.automation = 10;
      growthSave.coreShop.resonance = 10;
      growthSave.starport.modules.refinery = 12;
      growthSave.starport.modules.droneDock = 12;
      growthSave.endgame.sectorLevel = 1000000000000000;
      growthSave.endgame.protocols.production = 20;
      bridge.applySnapshot(growthSave);
      return {
        rate: bridge.getStarportDiagnostics().automaticRate,
        label: document.querySelector("#rate-value").textContent,
      };
    });
    assert.ok(
      cappedGrowthBefore.rate > 999000,
      "late-game production must grow past the former 999K hard cap",
    );
    const overflowPurchaseButton = page.locator(
      '[data-building-id="cosmicLoom"]',
    );
    assert.equal(await overflowPurchaseButton.isEnabled(), true);
    await overflowPurchaseButton.click();
    const cappedGrowthAfter = await page.evaluate(() => ({
      rate: window.StellarOutpostCloudBridge.getStarportDiagnostics()
        .automaticRate,
      label: document.querySelector("#rate-value").textContent,
      toast: document.querySelector("#toast-region").textContent,
    }));
    assert.ok(
      cappedGrowthAfter.rate > cappedGrowthBefore.rate,
      "buying fleet units above 999K/s must still increase production",
    );
    assert.notEqual(
      cappedGrowthAfter.label,
      cappedGrowthBefore.label,
      "the higher-precision production label must expose the increase",
    );
    assert.match(cappedGrowthAfter.toast, /舰队产量已提升/);

    const fleetAndCombatCheck = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const fleetSave = bridge.createSnapshot();
      fleetSave.version = 6;
      fleetSave.activePage = "fleet";
      fleetSave.dust = 900000000;
      fleetSave.runDust = 900000000;
      fleetSave.lifetimeDust = 900000000;
      fleetSave.buyMode = "10";
      fleetSave.cores = 0;
      fleetSave.totalCores = 0;
      fleetSave.upgrades = [];
      fleetSave.achievements = [];
      fleetSave.buff = null;
      Object.keys(fleetSave.buildings).forEach((id) => {
        fleetSave.buildings[id] = id === "cosmicLoom" ? 5 : 0;
      });
      Object.keys(fleetSave.coreShop).forEach((id) => {
        fleetSave.coreShop[id] = 0;
      });
      Object.keys(fleetSave.starport.modules).forEach((id) => {
        fleetSave.starport.modules[id] = 0;
      });
      bridge.applySnapshot(fleetSave);
      const cosmicButton = document.querySelector('[data-building-id="cosmicLoom"]');
      const topRate = document.querySelector("#rate-value").textContent.split(" / 秒")[0];
      const fleetRate = cosmicButton
        .closest(".building-card")
        .querySelector(".building-rate").textContent;

      const combatSave = bridge.createSnapshot();
      combatSave.activePage = "combat";
      combatSave.starport.materials.alloy = 66;
      combatSave.starport.materials.crystal = 12;
      bridge.applySnapshot(combatSave);
      const readCombatMaterials = () =>
        Object.fromEntries(
          [...document.querySelectorAll("#combat-material-list .material-chip")].map(
            (chip) => [
              chip.querySelector("small").textContent,
              chip.querySelector("strong").textContent,
            ],
          ),
        );
      const beforeLoot = readCombatMaterials();
      const updatedCombatSave = bridge.createSnapshot();
      updatedCombatSave.starport.materials.alloy += 5;
      bridge.applySnapshot(updatedCombatSave);
      const afterLoot = readCombatMaterials();

      const companionSave = bridge.createSnapshot();
      companionSave.activePage = "transcend";
      companionSave.cores = 5000;
      companionSave.totalCores = 5000;
      companionSave.endgame.transcensions = 2;
      delete companionSave.endgame.companions;
      bridge.applySnapshot(companionSave);

      const companionName = document.querySelector(
        "#singularity-companion-name",
      ).textContent;
      const companionDescription = document.querySelector(
        "#singularity-companion-description",
      ).textContent;
      const collapsePreview = document.querySelector(
        "#collapse-button small",
      ).textContent;
      const commandCompanionSave = bridge.createSnapshot();
      commandCompanionSave.activePage = "command";
      bridge.applySnapshot(commandCompanionSave);
      const commandCompanionBodies = [
        ...document.querySelectorAll("#command-companion-stage .command-companion"),
      ];

      return {
        dust: document.querySelector("#dust-value").textContent,
        topRate,
        fleetRate,
        buyLabel: cosmicButton.textContent,
        buyEnabled: !cosmicButton.disabled,
        combatMaterialCount: Object.keys(afterLoot).length,
        beforeLoot,
        afterLoot,
        companionName,
        companionDescription,
        collapsePreview,
        commandCompanionHidden: document.querySelector(
          "#command-companion-system",
        ).hidden,
        commandCompanionCount: document.querySelector(
          "#command-companion-count",
        ).textContent,
        commandCompanionNames: commandCompanionBodies.map(
          (body) => body.dataset.companionName,
        ),
        commandCompanionAnimation: getComputedStyle(
          commandCompanionBodies[0],
        ).animationName,
      };
    });
    assert.equal(fleetAndCombatCheck.dust, "900M");
    assert.ok(fleetAndCombatCheck.buyEnabled, "late-game ×10 purchase must be usable");
    assert.match(fleetAndCombatCheck.buyLabel, /\+10/);
    assert.ok(
      fleetAndCombatCheck.fleetRate.includes(
        `实际贡献 ${fleetAndCombatCheck.topRate} / 秒`,
      ),
      "fleet contribution must match the actual compressed total",
    );
    assert.equal(fleetAndCombatCheck.combatMaterialCount, 6);
    assert.equal(fleetAndCombatCheck.beforeLoot.星港合金, "66");
    assert.equal(fleetAndCombatCheck.afterLoot.星港合金, "71");
    assert.equal(fleetAndCombatCheck.companionName, "棱镜水母");
    assert.match(fleetAndCombatCheck.companionDescription, /图鉴 2\/8/);
    assert.match(fleetAndCombatCheck.collapsePreview, /唤醒裂隙鳐/);
    assert.equal(fleetAndCombatCheck.commandCompanionHidden, false);
    assert.equal(fleetAndCombatCheck.commandCompanionCount, "2 / 8");
    assert.deepEqual(fleetAndCombatCheck.commandCompanionNames, [
      "尘光蛾",
      "棱镜水母",
    ]);
    assert.equal(
      fleetAndCombatCheck.commandCompanionAnimation,
      "command-companion-orbit",
    );
    await page.hover(".beacon-zone");
    await page.click('[data-companion-id="prismJelly"]');
    assert.match(await page.locator("#toast-region").textContent(), /棱镜水母/);
    assert.match(await page.locator("#toast-region").textContent(), /纯观赏/);

    const starportCheck = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const starportSave = bridge.createSnapshot();
      starportSave.activePage = "starport";
      starportSave.starport.materials.alloy = 11;
      starportSave.starport.materials.crystal = 12;
      starportSave.starport.materials.circuit = 13;
      starportSave.starport.materials.relic = 14;
      starportSave.starport.materials.prism = 0;
      starportSave.starport.materials.sensor = 0;
      bridge.applySnapshot(starportSave);
      const baseline = bridge.getStarportDiagnostics();
      const boostedSave = bridge.createSnapshot();
      boostedSave.activePage = "starport";
      boostedSave.starport.modules.refinery = 1;
      boostedSave.starport.modules.droneDock = 1;
      boostedSave.starport.modules.battery = 1;
      boostedSave.starport.modules.shield = 1;
      boostedSave.starport.modules.radar = 1;
      bridge.applySnapshot(boostedSave);
      const boosted = bridge.getStarportDiagnostics();
      return {
        baseline,
        boosted,
        materialCount: document.querySelectorAll(
          "#starport-material-list .material-chip",
        ).length,
        buttonLabels: [...document.querySelectorAll("[data-starport-module]")].map(
          (button) => button.textContent,
        ),
        effectLabels: [...document.querySelectorAll(".starport-slot-footer > span")].map(
          (label) => label.textContent,
        ),
      };
    });
    assert.equal(starportCheck.materialCount, 6);
    assert.equal(starportCheck.baseline.materials.alloy, 11);
    assert.equal(starportCheck.baseline.materials.crystal, 12);
    assert.equal(starportCheck.baseline.materials.circuit, 13);
    assert.equal(starportCheck.baseline.materials.relic, 14);
    assert.equal(starportCheck.baseline.materials.prism, 0);
    assert.equal(starportCheck.baseline.materials.sensor, 0);
    assert.ok(
      starportCheck.buttonLabels.every((label) => label.includes("星尘")),
      "every starport build action must show a dust cost",
    );
    assert.ok(
      starportCheck.effectLabels.every((label) => label.includes("→")),
      "starport cards must preview the next effective bonus",
    );
    assert.equal(starportCheck.boosted.productionMultiplier, 1.08 * 1.04);
    assert.equal(starportCheck.boosted.clickMultiplier, 1.08);
    assert.equal(starportCheck.boosted.attackMultiplier, 1.08);
    assert.equal(starportCheck.boosted.defenseMultiplier, 1.08);
    assert.equal(starportCheck.boosted.lootMultiplier, 1.08);
    assert.ok(
      Math.abs(
        starportCheck.boosted.automaticRate /
          starportCheck.baseline.automaticRate -
          1.08 * 1.04,
      ) < 0.001,
      "production starport bonus must apply after late-game compression",
    );
    assert.ok(
      Math.abs(
        starportCheck.boosted.attackPower /
          starportCheck.baseline.attackPower -
          1.08,
      ) < 0.002,
      "attack starport bonus must apply after late-game compression",
    );
    assert.ok(
      Math.abs(
        starportCheck.boosted.defensePower /
          starportCheck.baseline.defensePower -
          1.08,
      ) < 0.002,
      "defense starport bonus must apply after late-game compression",
    );

    const purchaseBefore = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const purchaseSave = bridge.createSnapshot();
      purchaseSave.activePage = "starport";
      purchaseSave.dust = 1000000;
      purchaseSave.lifetimeDust = 1000000;
      Object.keys(purchaseSave.buildings).forEach((id) => {
        purchaseSave.buildings[id] = 0;
      });
      purchaseSave.buff = null;
      Object.keys(purchaseSave.starport.modules).forEach((id) => {
        purchaseSave.starport.modules[id] = 0;
      });
      Object.keys(purchaseSave.starport.materials).forEach((id) => {
        purchaseSave.starport.materials[id] = 100;
      });
      bridge.applySnapshot(purchaseSave);
      return bridge.getStarportDiagnostics();
    });
    const refineryButton = page.locator('[data-starport-module="refinery"]');
    assert.equal(await refineryButton.count(), 1);
    assert.equal(await refineryButton.isEnabled(), true);
    assert.match(await refineryButton.textContent(), /星尘 30K/);
    assert.match(await refineryButton.textContent(), /合金 4/);
    await refineryButton.click();
    const purchaseAfter = await page.evaluate(() =>
      window.StellarOutpostCloudBridge.getStarportDiagnostics(),
    );
    assert.equal(purchaseAfter.ranks.refinery, 1);
    assert.equal(purchaseAfter.dust, purchaseBefore.dust - 30000);
    assert.equal(purchaseAfter.materials.alloy, purchaseBefore.materials.alloy - 4);
    assert.equal(purchaseAfter.materials.crystal, purchaseBefore.materials.crystal);

    const missionBefore = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const missionSave = bridge.createSnapshot();
      missionSave.version = 7;
      missionSave.activePage = "missions";
      missionSave.missions.tokens = 0;
      missionSave.missions.daily.items = [
        {
          templateId: "manualClicks",
          target: 2,
          progress: 1,
          claimed: false,
        },
      ];
      missionSave.missions.daily.completionClaimed = false;
      missionSave.missions.weekly.items = [
        {
          templateId: "dailyClaims",
          target: 15,
          progress: 0,
          claimed: false,
        },
      ];
      missionSave.missions.weekly.milestonesClaimed = [];
      bridge.applySnapshot(missionSave);
      return bridge.getMissionDiagnostics();
    });
    assert.equal(missionBefore.daily.items[0].progress, 1);
    await page.evaluate(() => document.querySelector("#collect-button").click());
    const missionClaimButton = page.locator(
      '[data-mission-kind="daily"][data-mission-claim="0"]',
    );
    await page.waitForFunction(() => {
      const button = document.querySelector(
        '[data-mission-kind="daily"][data-mission-claim="0"]',
      );
      return button && !button.disabled;
    });
    assert.equal(await missionClaimButton.isEnabled(), true);
    await missionClaimButton.click();
    const missionAfter = await page.evaluate(() => ({
      diagnostics: window.StellarOutpostCloudBridge.getMissionDiagnostics(),
      tokenLabel: document.querySelector("#mission-token-balance").textContent,
      tabLabel: document.querySelector("#command-mission-status").textContent,
    }));
    assert.equal(missionAfter.diagnostics.tokens, 5);
    assert.equal(missionAfter.diagnostics.daily.items[0].claimed, true);
    assert.equal(missionAfter.diagnostics.weekly.items[0].progress, 1);
    assert.equal(missionAfter.tokenLabel, "5");
    assert.match(missionAfter.tabLabel, /今日 1 \/ 3/);

    await page.route("**/index.html?check=*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: '<!doctype html><meta name="stellar-game-version" content="0.14.1"><meta name="stellar-release-title" content="更新检测测试">',
      }),
    );
    await page.evaluate(() =>
      window.StellarOutpostCloudBridge.checkForGameUpdate(),
    );
    await page.waitForFunction(
      () => !document.querySelector("#update-banner").hidden,
    );
    assert.match(await page.locator("#update-banner-title").textContent(), /v0\.14\.1/);
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));
    assert.equal(failedLocalRequests.length, 0, failedLocalRequests.join("\n"));

    console.log(
      `browser smoke ok: dust=${snapshot.dust}, rate=${snapshot.rate}, ` +
        `cores=${snapshot.cores}`,
    );
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
