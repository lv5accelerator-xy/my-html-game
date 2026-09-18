"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const game = fs.readFileSync(path.join(root, "game.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const cloud = fs.readFileSync(path.join(root, "cloud-save.js"), "utf8");

assert.match(game, /const GAME_VERSION = "2\.3\.0";/);
assert.match(html, /id="v2-daily-route"/);
assert.match(html, /id="v2-run-build"/);
assert.match(html, /id="v2-season-card"/);
assert.match(html, /id="v2-companion-stories"/);
assert.match(html, /id="resource-cycle-grid" class="resource-cycle-grid"/);
assert.match(game, /const RESOURCE_RECLAIM_RECIPES = Object\.freeze/);
assert.match(game, /playerName: "无名拾荒者"/);
assert.match(game, /const TUTORIAL_STEPS = TUTORIAL_STEP_LIBRARY\.slice\(0, 3\);/);
assert.match(html, /id="command-secondary-plans" class="command-secondary-plans"/);
// v2.4.0 起，"下一个目标"恢复首屏可见。
// 原断言（必须隐藏）来自早期"减少首屏信息"的决策，但实测发现：
// 隐藏下一个目标会让新玩家失去唯一的导航锚点，
// 与改造目标（10 秒内知道该做什么）冲突。
// 实际文本、祖先 hidden 与布局可见性在下方浏览器测试中断言。
assert.match(html, /id="command-guide"[^>]+hidden>/);
assert.match(html, /id="rebuild-hub" class="rebuild-hub"/);
assert.match(game, /function processRebuild\(now = Date\.now\(\)\)/);
assert.match(html, /id="companion-echoes" class="companion-echoes"/);
assert.match(game, /const COMPANION_ECHOES = \[/);
assert.match(html, /id="long-voyage" class="long-voyage"/);
assert.match(game, /const LONG_VOYAGES = \[/);
assert.match(game, /const LONG_VOYAGE_CHOICES = Object\.freeze/);
assert.match(html, /id="long-voyage-decision-choices" class="long-voyage-decision-choices"/);
assert.match(html, /id="starport-gallery-stats" class="starport-gallery-stats"/);
assert.match(game, /const STARPORT_LIFE_EVENTS = Object\.freeze/);
assert.match(cloud, /async function hydrateAnnouncementGoals\(\)/);
assert.match(cloud, /getAggregateFromServer/);
for (const illustration of [
  "fleet-hangar.webp",
  "research-observatory.webp",
  "orbital-defense.webp",
  "singularity-transcend.webp",
]) {
  assert.match(html, new RegExp(`assets/${illustration}`));
  assert.ok(fs.statSync(path.join(root, "assets", illustration)).size < 180_000);
}
assert.equal((html.match(/class="page-illustration /g) || []).length, 4);
assert.equal((html.match(/class="panel game-page/g) || []).length, 11);

console.log("usability static checks ok: 3-step tutorial, 4 lazy illustrations, 11 primary pages");

async function verifyVisibleGoalAndReachableActions() {
  const http = require("node:http");
  const playwrightPath = process.env.CODEX_PLAYWRIGHT_PATH
    || (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES
      ? path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, "playwright") : "playwright");
  const { chromium } = require(playwrightPath);
  // 仅在测试响应中暴露闭包函数，不增加生产调试接口。
  const instrumented = game.replace("\n  loadGame();\n", `
  globalThis.usabilityTest = {
    getCommandRecommendation, getFocusRoutes, isActionReachable,
    setScenario(action, showAllSystems) {
      state.guidance.showAllSystems = showAllSystems;
      getCurrentJourneyChapter = () => ({
        icon: "⌁", title: "测试航路", goal: 1, action, actionLabel: "继续", description: "测试",
      });
      getJourneyProgress = () => 0;
    },
  };
  loadGame();
`);
  assert.notEqual(instrumented, game, "测试函数注入必须成功");
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, "http://local").pathname;
    const file = path.resolve(root, pathname === "/" ? "index.html" : `.${pathname}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", ({ ".html": "text/html", ".js": "text/javascript", ".css": "text/css" })[path.extname(file)] || "application/octet-stream");
    response.end(file === path.join(root, "game.js") ? instrumented : fs.readFileSync(file));
  });
  let browser;
  try {
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    browser = await chromium.launch({ headless: true, executablePath: process.env.CODEX_CHROMIUM_PATH || undefined });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => Boolean(window.StellarOutpostCloudBridge));
    for (const width of [1280, 375]) {
      await page.setViewportSize({ width, height: 900 });
      const goal = await page.locator("#next-goal-title").evaluate((element) => ({
        text: element.textContent.trim(), hiddenAncestor: Boolean(element.closest("[hidden]")),
        hasLayout: element.offsetParent !== null,
      }));
      assert.ok(goal.text, "下一个目标的文本必须非空");
      assert.equal(goal.hiddenAncestor, false, "下一个目标不能位于 hidden 容器内");
      assert.equal(goal.hasLayout, true, "下一个目标必须可见，offsetParent 不能为 null");
    }
    const failures = await page.evaluate(() => {
      const api = window.usabilityTest;
      const failures = [];
      for (const action of ["missions", "starport", "starfall", "fleet", "collect", "claim-missions", "prestige"]) {
        api.setScenario(action, false);
        const recommendation = api.getCommandRecommendation();
        if (!api.isActionReachable(recommendation.action)) failures.push(`推荐不可达：${action}`);
        if (["missions", "starport", "starfall"].includes(action) && recommendation.action !== "fleet") failures.push(`缺少兜底：${action}`);
        if (!["missions", "starport", "starfall"].includes(action) && recommendation.action !== action) failures.push(`非隐藏动作被改写：${action}`);
        for (const route of api.getFocusRoutes()) {
          if (!api.isActionReachable(route.action)) failures.push(`航路不可达：${route.action}`);
        }
      }
      return failures;
    });
    assert.deepEqual(failures, [], "关闭全部系统后，每个推荐动作必须可达");
    assert.deepEqual(errors, [], "页面不能出现运行时异常");
    console.log("usability browser ok: visible goal at 1280/375px; recommendations reachable");
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
verifyVisibleGoalAndReachableActions().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
