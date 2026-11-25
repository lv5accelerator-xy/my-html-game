'use strict';
// v3 探索页分区标签：非当前分区的内容带 hidden。玩家需要先点分区标签才能操作其中的控件。
// 这里让测试在操作这类控件之前，像玩家一样用真实点击切到对应分区标签。
// 只处理“目标在隐藏的探索分区里”这一种情况；isVisible / isHidden 等可见性断言不受影响。
const ACTIONS = ['click', 'dblclick', 'fill', 'check', 'uncheck', 'setChecked', 'selectOption', 'press', 'pressSequentially', 'type', 'focus', 'hover', 'tap', 'scrollIntoViewIfNeeded', 'boundingBox', 'screenshot', 'waitFor'];
let installed = false;
// 显式切到包含目标的探索分区（用于可见性断言前，表达“玩家打开该分区”）。
async function showExploreSection(page, selector) {
  const id = await page.locator(selector).first().evaluate(el => el.closest('[data-explore-panel]')?.dataset.explorePanel || null);
  if (id && await page.locator(`#explore-tab-${id}`).count()) await page.locator(`#explore-tab-${id}`).click();
}
module.exports = function installExploreTabs(page) {
  if (installed) return;
  const proto = Object.getPrototypeOf(page.locator('html'));
  const original = Object.fromEntries(ACTIONS.concat('evaluateAll').filter(name => typeof proto[name] === 'function').map(name => [name, proto[name]]));
  async function reveal(locator) {
    const panel = await original.evaluateAll.call(locator, els => {
      const hidden = els.map(el => el.closest('[data-explore-panel]')).find(p => p && p.hidden);
      return hidden ? hidden.dataset.explorePanel : null;
    }).catch(() => null);
    if (panel) await original.click.call(locator.page().locator(`#explore-tab-${panel}`));
  }
  for (const name of ACTIONS) {
    if (!original[name]) continue;
    proto[name] = async function (...args) {
      if (!(name === 'waitFor' && args[0]?.state && args[0].state !== 'visible')) await reveal(this);
      return original[name].apply(this, args);
    };
  }
  installed = true;
};
module.exports.showExploreSection = showExploreSection;
