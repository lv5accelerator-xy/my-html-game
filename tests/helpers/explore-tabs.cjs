'use strict';
// v3 探索页分区标签：非当前分区的内容带 hidden，玩家需要先点分区标签才能操作其中的控件。
// 测试在操作这类控件之前显式调用这里的函数，像玩家一样用真实点击切到对应分区。
// 不改写 Playwright 的任何方法：游戏自己负责的分区切换（例如目标跳转）若失效，
// 没有显式切换的步骤会如实失败，而不是被测试替玩家点开。

// 目标若在隐藏的探索分区里，点击该分区的标签；已显示或不在探索页时什么都不做。
// 用 evaluateAll 而不是 evaluate：目标尚未渲染时不等待，与 Playwright 的动作自行等待互不干扰。
async function revealSection(locator) {
  const panel = await locator.evaluateAll(els => {
    const hidden = els.map(el => el.closest('[data-explore-panel]')).find(p => p && p.hidden);
    return hidden ? hidden.dataset.explorePanel : null;
  });
  if (panel) await locator.page().locator(`#explore-tab-${panel}`).click();
  return locator;
}
const showExploreSection = (page, selector) => revealSection(page.locator(selector));

module.exports = { revealSection, showExploreSection };
