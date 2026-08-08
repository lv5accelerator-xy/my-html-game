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
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CODEX_CHROMIUM_PATH || undefined,
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await context.addInitScript((save) => {
    localStorage.setItem("stellarOutpostIdleSave_v1", JSON.stringify(save));
    localStorage.setItem("stellarOutpostIdlePatchNotesSeen", "0.23.0");
    localStorage.setItem("stellarOutpostAnnouncementAutoShown_v1", JSON.stringify(["v0200-starfall-launch"]));
    localStorage.removeItem("stellarOutpostIdlePerformanceMode");
  }, {
    version: 6,
    dust: 900000,
    runDust: 900000,
    lifetimeDust: 900000,
    careerDust: 900000,
    buildings: { drone: 10 },
    upgrades: [],
    achievements: [],
    starport: {
      materials: {
        alloy: 20,
        crystal: 20,
        circuit: 20,
        relic: 20,
        prism: 20,
        sensor: 20,
      },
      modules: {},
    },
    activePage: "fleet",
    tutorialSeen: true,
    playerName: "移动端测试",
    bgmEnabled: false,
    lastSeen: Date.now(),
  });

  try {
    const response = await page.goto(origin, { waitUntil: "domcontentloaded" });
    assert.equal(response.status(), 200);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));

    const defaultQuality = await page.evaluate(() => {
      const musicRect = document.querySelector(".music-player-shell").getBoundingClientRect();
      const soundRect = document.querySelector("#sound-button").getBoundingClientRect();
      return {
        diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
        mode: document.documentElement.dataset.performanceMode,
        savedMode: localStorage.getItem("stellarOutpostIdlePerformanceMode"),
        status: document.querySelector("#performance-status").textContent,
        bodyAnimation: getComputedStyle(document.body).animationName,
        fleet: window.StellarOutpostCloudBridge.getFleetCommandDiagnostics(),
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        fleetDeckWidth: document.querySelector("#fleet-command-deck").scrollWidth,
        musicTitle: document.querySelector("#bgm-current-title").textContent,
        musicStatus: document.querySelector("#bgm-status").textContent,
        musicOptions: document.querySelectorAll("#top-bgm-track option").length,
        musicRight: musicRect.right,
        soundLeft: soundRect.left,
      };
    });
    assert.equal(defaultQuality.mode, "quality", "mobile should default to high quality");
    assert.equal(defaultQuality.savedMode, null, "a default must not impersonate a manual choice");
    assert.equal(defaultQuality.status, "高画质");
    assert.equal(defaultQuality.diagnostics.gameTickInterval, 100);
    assert.equal(defaultQuality.diagnostics.starfield.targetFps, 60);
    assert.equal(defaultQuality.diagnostics.starfield.pixelRatio, 2);
    assert.notEqual(defaultQuality.bodyAnimation, "none");
    assert.equal(defaultQuality.fleet.unlocked, true);
    assert.equal(defaultQuality.fleet.presets.length, 3);
    assert.equal(defaultQuality.musicTitle, "猎户座外的前哨");
    assert.equal(defaultQuality.musicStatus, "音乐已暂停");
    assert.equal(defaultQuality.musicOptions, 5);
    assert.ok(defaultQuality.musicRight <= defaultQuality.soundLeft);
    assert.ok(
      defaultQuality.pageWidth <= defaultQuality.viewportWidth,
      `fleet command page must not create horizontal scrolling; got ${defaultQuality.pageWidth}px`,
    );
    assert.ok(defaultQuality.fleetDeckWidth <= defaultQuality.viewportWidth);

    await page.click("#command-page-tab");
    await page.click("#operations-hub > summary");
    await page.waitForTimeout(180);
    if (await page.isVisible("#modal-confirm")) await page.click("#modal-confirm");
    const operationsLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      hubWidth: document.querySelector("#operations-hub").scrollWidth,
      jobs: document.querySelectorAll(".operation-job").length,
      compactNavigation: window.StellarOutpostCloudBridge.getOperationsDiagnostics().compactNavigation,
    }));
    assert.equal(operationsLayout.jobs, 5);
    assert.equal(operationsLayout.compactNavigation, true);
    assert.ok(operationsLayout.pageWidth <= operationsLayout.viewportWidth);
    assert.ok(operationsLayout.hubWidth <= operationsLayout.viewportWidth);

    await page.evaluate(() => window.StellarCommunicationsBridge.openFeedback());
    const communicationLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      modalWidth: document.querySelector(".communication-modal").scrollWidth,
      formCategories: document.querySelectorAll("#feedback-category option").length,
    }));
    assert.equal(communicationLayout.formCategories, 5);
    assert.ok(communicationLayout.pageWidth <= communicationLayout.viewportWidth);
    assert.ok(communicationLayout.modalWidth <= communicationLayout.viewportWidth);
    await page.click("#communication-close");

    await page.click("#research-page-tab");
    const researchLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      branches: document.querySelectorAll(".research-branch").length,
      nodes: document.querySelectorAll(".research-node").length,
      branchColumns: getComputedStyle(document.querySelector("#upgrade-list"))
        .gridTemplateColumns.split(" ").length,
      trackColumns: getComputedStyle(document.querySelector(".research-track"))
        .gridTemplateColumns.split(" ").length,
      overviewColumns: getComputedStyle(document.querySelector(".research-overview"))
        .gridTemplateColumns.split(" ").length,
    }));
    assert.equal(researchLayout.branches, 4);
    assert.equal(researchLayout.nodes, 24);
    assert.equal(researchLayout.branchColumns, 1);
    assert.equal(researchLayout.trackColumns, 1);
    assert.equal(researchLayout.overviewColumns, 1);
    assert.ok(researchLayout.pageWidth <= researchLayout.viewportWidth);

    await page.click("#starfall-page-tab");
    const starfallLayout = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      pageWidth: document.documentElement.scrollWidth,
      panelWidth: document.querySelector("#starfall-page").scrollWidth,
      phase: window.StellarOutpostCloudBridge.getStarfallDiagnostics().phase,
      letters: document.querySelectorAll(".starfall-letter").length,
      milestones: document.querySelectorAll("#starfall-milestone-list article").length,
      storeItems: document.querySelectorAll("#starfall-store-grid article").length,
    }));
    assert.ok(["preview", "active"].includes(starfallLayout.phase));
    assert.equal(starfallLayout.letters, 7);
    assert.equal(starfallLayout.milestones, 7);
    assert.equal(starfallLayout.storeItems, 6);
    assert.ok(starfallLayout.pageWidth <= starfallLayout.viewportWidth);
    assert.ok(starfallLayout.panelWidth <= starfallLayout.viewportWidth);

    await page.click("#fleet-page-tab");

    await page.click("#menu-button");
    await page.click("#performance-button");
    await page.waitForTimeout(120);
    const eco = await page.evaluate(() => ({
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      mode: document.documentElement.dataset.performanceMode,
      savedMode: localStorage.getItem("stellarOutpostIdlePerformanceMode"),
      status: document.querySelector("#performance-status").textContent,
      bodyAnimation: getComputedStyle(document.body).animationName,
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
    }));
    assert.equal(eco.mode, "eco", "players must be able to select eco mode manually");
    assert.equal(eco.savedMode, "eco");
    assert.equal(eco.status, "省电");
    assert.equal(eco.bodyAnimation, "none", "eco mode must disable background animation");
    assert.equal(eco.diagnostics.gameTickInterval, 250);
    assert.equal(eco.diagnostics.starfield.targetFps, 24);
    assert.equal(eco.diagnostics.starfield.pixelRatio, 1);
    assert.ok(eco.diagnostics.starfield.starCount <= 72);

    await page.evaluate(() => {
      const inactiveTargets = [
        "#upgrade-list",
        "#core-shop-list",
        "#starport-slot-map",
        "#skirmish-target-list",
        "#planet-target-list",
        "#transcend-protocol-list",
        "#expedition-route-choices",
        "#expedition-artifact-grid",
      ].map((selector) => document.querySelector(selector));
      window.__performanceMutations = { active: 0, inactive: 0 };
      new MutationObserver((records) => {
        window.__performanceMutations.active += records.length;
      }).observe(document.querySelector("#building-list"), {
        childList: true,
        subtree: true,
        characterData: true,
      });
      inactiveTargets.forEach((target) => {
        new MutationObserver((records) => {
          window.__performanceMutations.inactive += records.length;
        }).observe(target, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      });
    });
    await page.waitForTimeout(1300);
    const ecoAfter = await page.evaluate(() => ({
      mutations: window.__performanceMutations,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    }));
    const mutations = ecoAfter.mutations;
    const ecoTickDelta =
      ecoAfter.diagnostics.gameTickCount - eco.diagnostics.gameTickCount;
    const ecoFrameDelta =
      ecoAfter.diagnostics.starfield.renderedFrames -
      eco.diagnostics.starfield.renderedFrames;
    assert.ok(mutations.active > 0, "active fleet page should continue refreshing");
    assert.equal(mutations.inactive, 0, "inactive detail pages must not rerender");
    assert.ok(
      ecoTickDelta > 0 && ecoTickDelta <= 7,
      `eco mode must remain capped at four game ticks per second; got ${ecoTickDelta}`,
    );
    assert.ok(
      ecoFrameDelta > 0 && ecoFrameDelta <= 38,
      `eco starfield must not exceed its 24 FPS target; got ${ecoFrameDelta}`,
    );

    const ecoCompanions = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const companionSave = bridge.createSnapshot();
      companionSave.activePage = "command";
      companionSave.endgame.companions = [
        "dustMoth",
        "prismJelly",
        "riftRay",
        "orbitFox",
        "echoWhale",
        "voidCat",
        "novaFinch",
        "moonHare",
      ];
      companionSave.endgame.companionSignals = 3;
      bridge.applySnapshot(companionSave);
      const bodies = [
        ...document.querySelectorAll("#command-companion-stage .command-companion"),
      ];
      return {
        count: bodies.length,
        hidden: document.querySelector("#command-companion-system").hidden,
        animationStates: bodies.map(
          (body) => getComputedStyle(body).animationPlayState,
        ),
        observatoryHidden: document.querySelector("#companion-observatory").hidden,
        signalCount: document.querySelector("#companion-signal-count").textContent,
        logCards: document.querySelectorAll("[data-companion-log]").length,
        logColumns: getComputedStyle(
          document.querySelector("#companion-log-grid"),
        ).gridTemplateColumns.split(" ").length,
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
      };
    });
    assert.equal(ecoCompanions.count, 8);
    assert.equal(ecoCompanions.hidden, false);
    assert.equal(ecoCompanions.observatoryHidden, false);
    assert.equal(ecoCompanions.signalCount, "3 / 12");
    assert.equal(ecoCompanions.logCards, 8);
    assert.equal(ecoCompanions.logColumns, 1);
    assert.ok(
      ecoCompanions.pageWidth <= ecoCompanions.viewportWidth,
      `companion observatory must not create horizontal scrolling; got ${ecoCompanions.pageWidth}px`,
    );
    assert.ok(
      ecoCompanions.animationStates.every((state) => state === "paused"),
      "eco mode must freeze companion orbits while keeping companions visible",
    );

    await page.click("#performance-button");
    await page.waitForTimeout(120);
    const quality = await page.evaluate(() => ({
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      mode: document.documentElement.dataset.performanceMode,
      savedMode: localStorage.getItem("stellarOutpostIdlePerformanceMode"),
      status: document.querySelector("#performance-status").textContent,
      companionAnimationStates: [
        ...document.querySelectorAll("#command-companion-stage .command-companion"),
      ].map((body) => getComputedStyle(body).animationPlayState),
    }));
    assert.equal(quality.mode, "quality");
    assert.equal(quality.savedMode, "quality");
    assert.equal(quality.status, "高画质");
    assert.equal(quality.diagnostics.gameTickInterval, 100);
    assert.equal(quality.diagnostics.starfield.targetFps, 60);
    assert.equal(quality.diagnostics.starfield.pixelRatio, 2);
    assert.ok(
      quality.companionAnimationStates.every((state) => state === "running"),
      "quality mode must animate visible companion orbits",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    const reducedMotionCompanions = await page.evaluate(() =>
      [...document.querySelectorAll("#command-companion-stage .command-companion")]
        .map((body) => getComputedStyle(body).animationPlayState),
    );
    assert.ok(
      reducedMotionCompanions.every((state) => state === "paused"),
      "reduced-motion mode must keep companions visible on static orbits",
    );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(1000);
    const qualityAfter = await page.evaluate(
      () => window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    );
    const qualityTickDelta =
      qualityAfter.gameTickCount - quality.diagnostics.gameTickCount;
    const qualityFrameDelta =
      qualityAfter.starfield.renderedFrames -
      quality.diagnostics.starfield.renderedFrames;
    assert.ok(
      qualityTickDelta > 0 && qualityTickDelta <= 13,
      `quality mode must remain capped at ten game ticks per second; got ${qualityTickDelta}`,
    );
    assert.ok(
      qualityFrameDelta > 0 && qualityFrameDelta <= 72,
      `quality starfield must remain capped at 60 FPS; got ${qualityFrameDelta}`,
    );

    await page.click("#performance-button");
    await page.waitForTimeout(120);
    const beforeBackground = await page.evaluate(() => ({
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
      rate: window.StellarOutpostCloudBridge.getStarportDiagnostics().automaticRate,
    }));
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(700);
    const hidden = await page.evaluate(
      () => window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    );
    assert.equal(hidden.hidden, true);
    assert.equal(hidden.gameLoopScheduled, false, "background game timer must stop");
    assert.equal(hidden.starfield.scheduled, false, "background starfield must stop");

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(350);
    const resumed = await page.evaluate(() => ({
      dust: window.StellarOutpostCloudBridge.createSnapshot().dust,
      diagnostics: window.StellarOutpostCloudBridge.getPerformanceDiagnostics(),
    }));
    const settledDust = resumed.dust - beforeBackground.dust;
    assert.ok(
      settledDust > beforeBackground.rate * 0.65,
      "background production must include the paused interval after resume",
    );
    assert.ok(
      settledDust < beforeBackground.rate * 1.4,
      "background settlement must not duplicate production",
    );
    assert.equal(resumed.diagnostics.gameLoopScheduled, true);
    assert.equal(resumed.diagnostics.starfield.scheduled, true);
    const mobileMissionLayout = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const missionSave = bridge.createSnapshot();
      missionSave.activePage = "missions";
      bridge.applySnapshot(missionSave);
      const missionList = document.querySelector("#daily-mission-list");
      return {
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(missionList).gridTemplateColumns.split(" ").length,
        cardCount: missionList.querySelectorAll(".mission-card").length,
        pageVisible: !document.querySelector("#missions-page").hidden,
      };
    });
    assert.equal(mobileMissionLayout.pageVisible, true);
    assert.equal(mobileMissionLayout.columns, 1);
    assert.equal(mobileMissionLayout.cardCount, 5);
    assert.ok(
      mobileMissionLayout.pageWidth <= mobileMissionLayout.viewportWidth,
      `mission page must not create horizontal page scrolling; got ${mobileMissionLayout.pageWidth}px`,
    );
    const mobileExpeditionLayout = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const expeditionSave = bridge.createSnapshot();
      expeditionSave.version = 10;
      expeditionSave.activePage = "expedition";
      expeditionSave.dust = 100000;
      expeditionSave.lifetimeDust = 100000;
      expeditionSave.expedition.activeRun = {
        seed: "mobile-layout",
        depth: 1,
        hull: 70,
        maxHull: 100,
        commandPower: 100,
        gear: ["phaseCoil", "interceptorGrid", "thermalSink"],
        boons: ["phaseLance"],
        boonChoices: [],
        routeChoices: [
          {
            id: "mobile-a",
            typeId: "patrol",
            affixIds: ["phaseShield"],
            enemyPower: 95,
          },
          {
            id: "mobile-b",
            typeId: "anomaly",
            affixIds: ["jammer"],
            enemyPower: 110,
          },
          {
            id: "mobile-c",
            typeId: "elite",
            affixIds: ["swarm", "volatile"],
            enemyPower: 125,
          },
        ],
        status: "route",
        choiceNonce: 0,
        runSupplies: 2,
        runFragments: 3,
        path: [],
      };
      bridge.applySnapshot(expeditionSave);
      const routeList = document.querySelector("#expedition-route-choices");
      return {
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(routeList).gridTemplateColumns.split(" ").length,
        cardCount: routeList.querySelectorAll(".expedition-route-card").length,
        pageVisible: !document.querySelector("#expedition-page").hidden,
      };
    });
    assert.equal(mobileExpeditionLayout.pageVisible, true);
    assert.equal(mobileExpeditionLayout.columns, 1);
    assert.equal(mobileExpeditionLayout.cardCount, 3);
    assert.ok(
      mobileExpeditionLayout.pageWidth <= mobileExpeditionLayout.viewportWidth,
      `expedition page must not create horizontal page scrolling; got ${mobileExpeditionLayout.pageWidth}px`,
    );
    const mobileLeaderboardLayout = await page.evaluate(() => {
      const bridge = window.StellarOutpostCloudBridge;
      const leaderboardSave = bridge.createSnapshot();
      leaderboardSave.activePage = "leaderboard";
      leaderboardSave.expedition.completedRuns = 9;
      leaderboardSave.expedition.bossWins = {
        aegisArk: 1,
        swarmMatriarch: 2,
        voidChoir: 3,
      };
      bridge.applySnapshot(leaderboardSave);
      const categories = document.querySelector(".leaderboard-categories");
      const personalGrid = document.querySelector(".leaderboard-personal-grid");
      return {
        viewportWidth: document.documentElement.clientWidth,
        pageWidth: document.documentElement.scrollWidth,
        pageVisible: !document.querySelector("#leaderboard-page").hidden,
        categoryCount: categories.querySelectorAll("button").length,
        categoryColumns: getComputedStyle(categories).gridTemplateColumns
          .split(" ").length,
        personalCards: personalGrid.querySelectorAll("article").length,
        personalColumns: getComputedStyle(personalGrid).gridTemplateColumns
          .split(" ").length,
      };
    });
    assert.equal(mobileLeaderboardLayout.pageVisible, true);
    assert.equal(mobileLeaderboardLayout.categoryCount, 9);
    assert.equal(mobileLeaderboardLayout.categoryColumns, 3);
    assert.equal(mobileLeaderboardLayout.personalCards, 9);
    assert.equal(mobileLeaderboardLayout.personalColumns, 1);
    assert.ok(
      mobileLeaderboardLayout.pageWidth <= mobileLeaderboardLayout.viewportWidth,
      `leaderboard page must not create horizontal page scrolling; got ${mobileLeaderboardLayout.pageWidth}px`,
    );
    assert.equal(pageErrors.length, 0, pageErrors.join("\n"));

    console.log(
      `mobile performance ok: eco=${eco.diagnostics.starfield.targetFps}fps/` +
        `${eco.diagnostics.gameTickInterval}ms, quality=` +
        `${quality.diagnostics.starfield.targetFps}fps/` +
        `${quality.diagnostics.gameTickInterval}ms`,
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
