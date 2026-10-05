(function (root) {
  "use strict";
  // 仅专家模式加载；后台共享逻辑继续保留在主入口。
  let enabled = false;
  const modules = {};
  function mount(host) {
    if (!host || typeof host.getState !== "function") return false;
    let state;
    const { $, COMBAT_UNLOCK_DUST, EXPEDITION_SUPPLY_CAP, EXPEDITION_UNLOCK_DUST, MISSION_STORE_ITEMS, MISSION_TEMPLATES, OPERATION_COMPONENTS, SINGULARITY_COMPANIONS, STARFALL_DAILY_REWARD, STARFALL_EVENT_END, STARFALL_EVENT_START, STARFALL_EXCHANGE_END, STARFALL_LETTERS, STARFALL_LETTER_REWARD, STARFALL_MILESTONES, STARFALL_STORE_ITEMS, STARPORT_BLUEPRINTS, STARPORT_LIFE_EVENTS, STARPORT_MATERIALS, STARPORT_MODULES, WEEKLY_MISSION_MILESTONES, addDust, addLog, addOperationComponent, applyStarfallCosmetics, canAffordStarportModule, checkAchievements, clamp, clampGameCount, clampGameNumber, createMissionAssignment, describeMission, describeStarportCost, describeStarportModuleEffect, elements, ensureMissionPeriods, ensureStarfallDays, ensureStarportLifeDay, formatCompanionRewards, formatMissionCountdown, formatMissionProgress, formatNumber, formatStarfallCountdown, formatStarfallDayLabel, getAvailableStarfallDayKeys, getCompletedMissionCount, getMissionClaimableCount, getMissionRewardDust, getMissionTemplate, getNextDailyReset, getNextWeeklyReset, getSingularityCompanions, getStarfallLetterUnlockAt, getStarfallPhase, getStarfallRoute, getStarportAttackMultiplier, getStarportBlueprint, getStarportBlueprintPreview, getStarportBlueprintSynergy, getStarportBuildingCostMultiplier, getStarportDefenseMultiplier, getStarportGalleryStats, getStarportLootMultiplier, getStarportModuleCost, getStarportProductionMultiplier, getStarportRank, getTotalStarportRanks, getUtcDailyKey, grantCompanionRewards, grantCompanionSignals, grantMissionMaterials, grantMissionTokens, grantStarfallCurrency, playAchievementTone, playTone, recordCrescentProgress, recordMissionProgress, renderMaterialWallet, safeAdd, saveGame, seededMissionShuffle, showToast, updateMissionSummary, updateStarfallSummary, updateUi } = host;
  function renderStarport() {
    renderMaterialWallet(elements.starportMaterialList);
    renderStarportLife();
    renderStarportBlueprints();
    if (!elements.starportSlotMap) return;
    elements.starportSlotMap.textContent = "";
    STARPORT_MODULES.forEach((module) => {
      const rank = getStarportRank(module.id);
      const unlocked = state.lifetimeDust >= module.unlock;
      const maxed = rank >= module.maxRank;
      const cost = getStarportModuleCost(module);
      const affordable = canAffordStarportModule(module);
      const card = document.createElement("article");
      card.className = [
        "starport-slot",
        `slot-${module.position}`,
        rank > 0 ? "online" : "",
        unlocked ? "" : "locked",
      ]
        .filter(Boolean)
        .join(" ");

      const line = document.createElement("span");
      line.className = "starport-callout-line";
      line.setAttribute("aria-hidden", "true");
      line.appendChild(document.createElement("i"));

      const heading = document.createElement("div");
      heading.className = "starport-slot-heading";
      const icon = document.createElement("span");
      icon.className = "starport-slot-icon";
      icon.textContent = unlocked ? module.icon : "?";
      const titleCopy = document.createElement("span");
      const category = document.createElement("small");
      category.textContent = `${module.category}附属建筑`;
      const title = document.createElement("strong");
      title.textContent = unlocked ? module.name : "未开放栏位";
      titleCopy.append(category, title);
      const rankLabel = document.createElement("b");
      rankLabel.textContent = unlocked ? `${rank} / ${module.maxRank}` : "锁定";
      heading.append(icon, titleCopy, rankLabel);

      const description = document.createElement("p");
      description.textContent = unlocked
        ? module.description
        : `累计获得 ${formatNumber(module.unlock, 0)} 星尘后开放`;

      const footer = document.createElement("div");
      footer.className = "starport-slot-footer";
      const effect = document.createElement("span");
      const currentEffect = describeStarportModuleEffect(module, rank);
      effect.textContent = maxed
        ? currentEffect
        : `${currentEffect} → ${describeStarportModuleEffect(module, rank + 1)}`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starportModule = module.id;
      button.disabled = !unlocked || maxed || !affordable;
      if (!unlocked) {
        button.textContent = "未开放";
      } else if (maxed) {
        button.textContent = "已满级";
      } else {
        button.textContent = `${rank === 0 ? "建造" : "强化"} · ${describeStarportCost(cost)}`;
      }
      footer.append(effect, button);
      card.append(line, heading, description, footer);
      elements.starportSlotMap.appendChild(card);
    });

    const totalRank = getTotalStarportRanks();
    elements.starportRankTotal.textContent = `${totalRank} / ${STARPORT_MODULES.reduce(
      (total, module) => total + module.maxRank,
      0,
    )}`;
    elements.starportProductionBoost.textContent = `×${formatNumber(
      getStarportProductionMultiplier(),
      2,
    )}`;
    elements.starportCostEfficiency.textContent = `-${formatNumber(
      (1 - getStarportBuildingCostMultiplier()) * 100,
      1,
    )}%`;
    elements.starportAttackBoost.textContent = `×${formatNumber(
      getStarportAttackMultiplier(),
      2,
    )}`;
    elements.starportDefenseBoost.textContent = `×${formatNumber(
      getStarportDefenseMultiplier(),
      2,
    )}`;
    elements.starportLootBoost.textContent = `×${formatNumber(
      getStarportLootMultiplier(),
      2,
    )}`;
  }

  function renderStarportBlueprints() {
    if (!elements.starportBlueprintList) return;
    const active = getStarportBlueprint();
    const currentPreview = getStarportBlueprintPreview(active.id);
    elements.starportBlueprintActive.textContent = `当前：${active.name}`;
    elements.starportBlueprintList.replaceChildren();
    STARPORT_BLUEPRINTS.forEach((blueprint) => {
      const isActive = blueprint.id === active.id;
      const synergy = getStarportBlueprintSynergy(blueprint.id);
      const preview = getStarportBlueprintPreview(blueprint.id);
      const component = OPERATION_COMPONENTS.find(
        (entry) => entry.id === blueprint.componentId,
      );
      const componentCount = state.operations.components[blueprint.componentId] || 0;
      const card = document.createElement("article");
      card.className = `starport-plan-card${isActive ? " active" : ""}`;
      const heading = document.createElement("header");
      heading.innerHTML = `<span aria-hidden="true">${blueprint.icon}</span><div><small>${blueprint.role}</small><strong>${blueprint.name}</strong></div><b>${isActive ? "运行中" : `协同 ×${formatNumber(synergy, 2)}`}</b>`;
      const description = document.createElement("p");
      description.textContent = blueprint.description;
      const effect = document.createElement("div");
      effect.className = "starport-plan-effect";
      effect.textContent = blueprint.id === "industrial"
        ? `自动生产 ×${formatNumber(synergy, 2)}`
        : blueprint.id === "bastion"
          ? `攻击与防御 ×${formatNumber(synergy, 2)}`
          : `战利品 ×${formatNumber(synergy, 2)} · 远征成功率 +${formatNumber(preview.expeditionChance * 100, 1)}%`;
      const comparison = document.createElement("small");
      comparison.className = "starport-plan-preview";
      comparison.textContent = [
        `产量 ${formatNumber(currentPreview.automaticRate)} → ${formatNumber(preview.automaticRate)}`,
        `战力 ${formatNumber(currentPreview.attackPower)} → ${formatNumber(preview.attackPower)}`,
        `防御 ${formatNumber(currentPreview.defensePower)} → ${formatNumber(preview.defensePower)}`,
        `掉落 ×${formatNumber(currentPreview.lootMultiplier, 2)} → ×${formatNumber(preview.lootMultiplier, 2)}`,
      ].join(" · ");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starportBlueprint = blueprint.id;
      button.disabled = isActive || componentCount < 1;
      button.textContent = isActive
        ? "当前方案"
        : `切换 · ${component?.name || "航站组件"} 1（持有 ${formatNumber(componentCount, 0)}）`;
      card.append(heading, description, effect, comparison, button);
      elements.starportBlueprintList.appendChild(card);
    });
  }

  function renderStarportLife() {
    const event = ensureStarportLifeDay();
    const companion = SINGULARITY_COMPANIONS.find(
      (entry) => entry.id === state.starportLife.companionId,
    );
    const stats = getStarportGalleryStats();
    elements.starportGalleryStats.innerHTML = stats.map((entry) => `<span><i>${entry.icon}</i><small>${entry.label}</small><strong>${entry.value} / ${entry.total}</strong></span>`).join("");
    elements.starportLifeEventIcon.textContent = companion?.icon || event?.icon || "·";
    elements.starportLifeEventTitle.textContent = event?.title || "等待第一位住客";
    elements.starportLifeEventStory.textContent = event
      ? event.story.replace("{companion}", companion?.name || "一只伴星")
      : "首次奇点超越并唤醒伴星后，这里每天会出现一段不影响倍率的星港生活。";
    elements.starportLifeEventReward.textContent = event
      ? `今日小礼物：${formatCompanionRewards(event.reward)}`
      : "不会新增货币，也不会错过主线进度。";
    elements.starportLifeEventClaim.disabled = !event || state.starportLife.claimed;
    elements.starportLifeEventClaim.textContent = !event
      ? "唤醒伴星后开放"
      : state.starportLife.claimed
        ? "今日已收藏"
        : "收下并收藏片段";
    const recentLogs = state.starportLife.eventLog.slice(-3).reverse();
    elements.starportLifeLog.textContent = recentLogs.length
      ? `最近片段：${recentLogs.map((record) => STARPORT_LIFE_EVENTS.find((entry) => entry.id === record.eventId)?.title).filter(Boolean).join(" · ")} · 累计 ${formatNumber(state.starportLife.totalEvents, 0)} 次`
      : "生活日志尚未写下第一行。";
  }

  function upgradeStarportModule(moduleId) {
    const module = STARPORT_MODULES.find((entry) => entry.id === moduleId);
    if (!module || state.lifetimeDust < module.unlock) return;
    const rank = getStarportRank(module.id);
    if (rank >= module.maxRank) return;
    const cost = getStarportModuleCost(module);
    if (!canAffordStarportModule(module)) {
      showToast("建设资源不足", `需要 ${describeStarportCost(cost)}。`, "⌬");
      playTone(150, 0.06, "square", 0.018);
      return;
    }
    state.dust = clampGameNumber(state.dust - cost.dust);
    recordMissionProgress("dustSpent", cost.dust);
    STARPORT_MATERIALS.forEach((material) => {
      const amount = cost[material.id] || 0;
      if (amount <= 0) return;
      state.starport.materials[material.id] = clampGameCount(
        state.starport.materials[material.id] - amount,
      );
    });
    state.starport.modules[module.id] = clamp(
      rank + 1,
      0,
      module.maxRank,
    );
    recordCrescentProgress("starportUpgrades");
    recordMissionProgress("starportUpgrades", 1);
    const action = rank === 0 ? "建造" : "强化";
    const message = `${module.name}${action}完成，当前等级 ${rank + 1} / ${module.maxRank}。`;
    addLog(message);
    showToast(
      `${module.name}${action}完成`,
      `${describeStarportModuleEffect(module, rank + 1)}，增幅已生效。`,
      module.icon,
    );
    playAchievementTone();
    checkAchievements();
    renderStarport();
    updateUi();
    saveGame();
  }

  function switchStarportBlueprint(blueprintId) {
    const blueprint = STARPORT_BLUEPRINTS.find((entry) => entry.id === blueprintId);
    if (!blueprint || state.starport.activeBlueprintId === blueprint.id) return;
    const component = OPERATION_COMPONENTS.find(
      (entry) => entry.id === blueprint.componentId,
    );
    if ((state.operations.components[blueprint.componentId] || 0) < 1) {
      showToast(
        "缺少蓝图切换组件",
        `切换到${blueprint.name}需要 1 件${component?.name || "航站组件"}，可在航站作业台获取。`,
        blueprint.icon,
      );
      return;
    }
    state.operations.components[blueprint.componentId] = clampGameCount(
      state.operations.components[blueprint.componentId] - 1,
    );
    state.starport.activeBlueprintId = blueprint.id;
    state.starport.blueprintSwitches = clampGameCount(
      state.starport.blueprintSwitches + 1,
    );
    showToast(
      `已启用${blueprint.name}`,
      `${component?.name || "航站组件"} -1 · 新协同已进入生产、战斗与远征计算。`,
      blueprint.icon,
    );
    addLog(`星港蓝图切换为${blueprint.name}。`);
    renderStarport();
    updateUi();
    saveGame();
  }

  function claimStarportLifeEvent() {
    const event = ensureStarportLifeDay();
    if (!event || state.starportLife.claimed) return;
    const companion = SINGULARITY_COMPANIONS.find(
      (entry) => entry.id === state.starportLife.companionId,
    );
    grantCompanionRewards(event.reward);
    state.starportLife.claimed = true;
    state.starportLife.totalEvents = clampGameCount(state.starportLife.totalEvents + 1);
    state.starportLife.eventLog.push({ eventId: event.id, dayKey: state.starportLife.dayKey });
    state.starportLife.eventLog = state.starportLife.eventLog.slice(-12);
    addLog(`星港日常：${event.title}。`);
    showToast("今日星港片段已收藏", `${event.title} · ${formatCompanionRewards(event.reward)}`, companion?.icon || event.icon);
    playAchievementTone();
    renderStarport();
    updateUi();
    saveGame();
  }

  function renderStarfallEvent(now = Date.now()) {
    ensureStarfallDays(now);
    const phase = getStarfallPhase(now);
    const phaseLabels = {
      preview: "活动预告",
      active: "流星观测中",
      exchange: "余辉兑换期",
      archived: "星雨纪念档案",
    };
    const targetTime = phase === "preview"
      ? STARFALL_EVENT_START
      : phase === "active"
        ? STARFALL_EVENT_END
        : STARFALL_EXCHANGE_END;
    elements.starfallPhaseLabel.textContent = phaseLabels[phase];
    elements.starfallCountdown.textContent = phase === "archived"
      ? "活动与兑换均已结束"
      : `${phase === "preview" ? "距离开启" : phase === "active" ? "距离观测结束" : "距离兑换关闭"} ${formatStarfallCountdown(targetTime - now)}`;
    elements.starfallStatusNote.textContent = phase === "preview"
      ? "活动持续至 8 月 22 日，兑换开放至 9 月 22 日。"
      : phase === "active"
        ? "每天选一路；错过时可追赶最近三天。"
        : phase === "exchange"
          ? "不再获得余辉；信笺可继续阅读，余辉可继续兑换。"
          : "已获得的外观、信笺选择与收藏会永久保留。";
    elements.starfallCurrency.textContent = formatNumber(state.starfall.currency, 0);
    elements.starfallTotalEarned.textContent = formatNumber(state.starfall.totalEarned, 0);
    const letterCount = Object.keys(state.starfall.letterChoices).length;
    const milestoneCount = state.starfall.claimedMilestones.length;
    elements.starfallLetterCount.textContent = `${letterCount} / ${STARFALL_LETTERS.length}`;
    elements.starfallLetterSummary.textContent = `${letterCount} / ${STARFALL_LETTERS.length}`;
    elements.starfallMilestoneSummary.textContent = `${milestoneCount} / ${STARFALL_MILESTONES.length}`;
    renderStarfallDays(now, phase);
    renderStarfallLetters(now, phase);
    renderStarfallMilestones(phase);
    renderStarfallStore(phase);
    renderStarfallCollection();
    updateStarfallSummary(now);
  }

  function renderStarfallDays(now, phase) {
    elements.starfallDayList.textContent = "";
    if (phase !== "active") {
      const empty = document.createElement("article");
      empty.className = "starfall-empty-state";
      empty.innerHTML = phase === "preview"
        ? "<span>☄</span><div><strong>第一条星路将在 8 月 8 日出现</strong><p>活动开始后，每天从三种玩法中选择一种；晚到也能补做最近三天。</p></div>"
        : "<span>◇</span><div><strong>本次流星观测已经结束</strong><p>星路不再产生余辉，已获得的余辉仍可在兑换期内使用。</p></div>";
      elements.starfallDayList.appendChild(empty);
      return;
    }
    ensureStarfallDays(now);
    const availableKeys = getAvailableStarfallDayKeys(now);
    availableKeys.forEach((key, index) => {
      const record = state.starfall.dayRecords.find((entry) => entry.key === key);
      if (!record) return;
      const card = document.createElement("article");
      card.className = `starfall-day-card${record.claimed ? " claimed" : ""}`;
      const isToday = index === availableKeys.length - 1;
      const heading = document.createElement("header");
      heading.innerHTML = `<span><small>${isToday ? "今日星路" : "追赶星路"}</small><strong>${formatStarfallDayLabel(key)}</strong></span><b>${record.claimed ? "已抵达" : `+${STARFALL_DAILY_REWARD} 余辉`}</b>`;
      card.appendChild(heading);
      if (!record.selectedId) {
        const options = document.createElement("div");
        options.className = "starfall-route-options";
        record.optionIds.forEach((routeId) => {
          const route = getStarfallRoute(routeId);
          if (!route) return;
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.starfallRoute = route.id;
          button.dataset.starfallDay = key;
          button.innerHTML = `<span>${route.icon}</span><strong>${route.title}</strong><small>${route.description}</small><em>选择此星路</em>`;
          options.appendChild(button);
        });
        card.appendChild(options);
      } else {
        const route = getStarfallRoute(record.selectedId);
        const progress = document.createElement("div");
        progress.className = "starfall-route-progress";
        const ratio = record.target > 0 ? clamp(record.progress / record.target, 0, 1) : 0;
        progress.innerHTML = `<span class="starfall-route-icon">${route?.icon || "☄"}</span><div><small>已选择 · ${route?.title || "星路"}</small><strong>${formatMissionProgress(route || { format: "count" }, record.progress)} / ${formatMissionProgress(route || { format: "count" }, record.target)}</strong><div aria-hidden="true"><span style="width:${ratio * 100}%"></span></div></div>`;
        const claim = document.createElement("button");
        claim.type = "button";
        claim.dataset.starfallClaim = key;
        claim.disabled = record.claimed || record.progress < record.target;
        claim.textContent = record.claimed
          ? "已领取"
          : record.progress >= record.target
            ? "领取余辉"
            : "航行中";
        progress.appendChild(claim);
        card.appendChild(progress);
      }
      elements.starfallDayList.appendChild(card);
    });
  }

  function renderStarfallLetters(now, phase) {
    elements.starfallLetterList.textContent = "";
    STARFALL_LETTERS.forEach((letter, index) => {
      const unlockAt = getStarfallLetterUnlockAt(letter);
      const unlocked = now >= unlockAt && phase !== "preview";
      const selectedId = state.starfall.letterChoices[letter.id];
      const selectedChoice = letter.choices.find((choice) => choice.id === selectedId);
      const card = document.createElement("article");
      card.className = `starfall-letter${unlocked ? " unlocked" : " locked"}${selectedChoice ? " answered" : ""}`;
      const header = document.createElement("header");
      header.innerHTML = `<span>${index + 1}</span><div><small>${unlocked ? "信笺已抵达" : `${formatStarfallDayLabel(getUtcDailyKey(unlockAt))} 解锁`}</small><strong>${unlocked ? letter.title : "未抵达的星光"}</strong></div>`;
      card.appendChild(header);
      if (unlocked) {
        const body = document.createElement("p");
        body.textContent = letter.body;
        card.appendChild(body);
        if (selectedChoice) {
          const result = document.createElement("blockquote");
          result.innerHTML = `<strong>${selectedChoice.label}</strong><span>${selectedChoice.result}</span>`;
          card.appendChild(result);
        } else {
          const choices = document.createElement("div");
          choices.className = "starfall-letter-choices";
          letter.choices.forEach((choice) => {
            const button = document.createElement("button");
            button.type = "button";
            button.dataset.starfallLetter = letter.id;
            button.dataset.starfallChoice = choice.id;
            button.disabled = phase === "archived";
            button.textContent = choice.label;
            choices.appendChild(button);
          });
          card.appendChild(choices);
        }
      }
      elements.starfallLetterList.appendChild(card);
    });
  }

  function renderStarfallMilestones(phase) {
    elements.starfallMilestoneList.textContent = "";
    STARFALL_MILESTONES.forEach((milestone) => {
      const claimed = state.starfall.claimedMilestones.includes(milestone.id);
      const reached = state.starfall.totalEarned >= milestone.required;
      const card = document.createElement("article");
      card.className = `${reached ? "reached" : ""}${claimed ? " claimed" : ""}`;
      card.innerHTML = `<span>✦</span><div><small>${formatNumber(milestone.required, 0)} 累计余辉</small><strong>${milestone.title}</strong><p>${milestone.reward}</p></div>`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starfallMilestone = milestone.id;
      button.disabled = !reached || claimed || phase === "preview" || phase === "archived";
      button.textContent = claimed ? "已领取" : reached ? "领取" : `${formatNumber(state.starfall.totalEarned, 0)} / ${formatNumber(milestone.required, 0)}`;
      card.appendChild(button);
      elements.starfallMilestoneList.appendChild(card);
    });
  }

  function renderStarfallStore(phase) {
    elements.starfallStoreGrid.textContent = "";
    STARFALL_STORE_ITEMS.forEach((item) => {
      const bought = clampGameCount(state.starfall.purchases[item.id]);
      const soldOut = item.limit > 0 && bought >= item.limit;
      const card = document.createElement("article");
      card.innerHTML = `<span>${item.id === "emblem" ? "◇" : item.id === "postcard" ? "✉" : "✦"}</span><div><small>${item.limit ? "限定兑换" : "可重复兑换"}</small><strong>${item.title}</strong><p>${item.description}</p></div><b>${item.cost} 余辉</b>`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.starfallStore = item.id;
      button.disabled = soldOut || state.starfall.currency < item.cost || !["active", "exchange"].includes(phase);
      button.textContent = soldOut ? "已拥有" : "兑换";
      card.appendChild(button);
      elements.starfallStoreGrid.appendChild(card);
    });
  }

  function renderStarfallCollection() {
    const collection = [
      ["title", "等一场星雨", "限定称号"],
      ["beacon", "流星尾迹", "信标外观"],
      ["letter", "英仙星笺", "纪念收藏"],
      ["starport", "英仙夜航", "星港外观"],
      ["emblem", "双星愿签", "限定徽记"],
      ["postcard", "英仙纪念卡", "信笺纪念"],
      ["keepsake", "第八颗流星", "最终收藏"],
    ];
    elements.starfallCollectionGrid.innerHTML = collection.map(([id, name, type]) => {
      const unlocked = state.starfall.cosmetics[id] === true;
      return `<article class="${unlocked ? "unlocked" : "locked"}"><span>${unlocked ? "☄" : "◇"}</span><small>${type}</small><strong>${unlocked ? name : "尚未获得"}</strong></article>`;
    }).join("");
  }

  function selectStarfallRoute(dayKey, routeId) {
    if (getStarfallPhase() !== "active") return;
    ensureStarfallDays();
    if (!getAvailableStarfallDayKeys().includes(dayKey)) return;
    const record = state.starfall.dayRecords.find((entry) => entry.key === dayKey);
    const route = getStarfallRoute(routeId);
    if (!record || record.selectedId || !record.optionIds.includes(routeId) || !route) return;
    record.selectedId = routeId;
    record.target = Math.max(1, clampGameNumber(route.target(state)));
    record.progress = 0;
    showToast("星路已确认", `${route.title} · 完成后获得 ${STARFALL_DAILY_REWARD} 余辉`, "☄");
    renderStarfallEvent();
    saveGame();
  }

  function claimStarfallRoute(dayKey) {
    if (getStarfallPhase() !== "active") return;
    const record = state.starfall.dayRecords.find((entry) => entry.key === dayKey);
    if (
      !record ||
      !getAvailableStarfallDayKeys().includes(dayKey) ||
      record.claimed ||
      record.progress < record.target
    ) return;
    record.claimed = true;
    if (!state.starfall.completedDays.includes(dayKey)) {
      state.starfall.completedDays.push(dayKey);
    }
    const gained = grantStarfallCurrency(STARFALL_DAILY_REWARD);
    addLog(`星雨寄航：完成 ${dayKey} 星路。`);
    showToast("星路抵达", `星雨余辉 +${gained}`, "☄");
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function chooseStarfallLetter(letterId, choiceId) {
    const phase = getStarfallPhase();
    if (!state.starfall || phase === "preview" || phase === "archived") return;
    const letter = STARFALL_LETTERS.find((entry) => entry.id === letterId);
    const choice = letter?.choices.find((entry) => entry.id === choiceId);
    if (!letter || !choice || Date.now() < getStarfallLetterUnlockAt(letter)) return;
    if (state.starfall.letterChoices[letter.id]) return;
    state.starfall.letterChoices[letter.id] = choice.id;
    const reward = phase === "active" ? grantStarfallCurrency(STARFALL_LETTER_REWARD) : 0;
    showToast(
      "星雨信笺已归档",
      reward ? `${choice.result} · 余辉 +${reward}` : choice.result,
      "✉",
    );
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function claimStarfallMilestone(milestoneId) {
    const phase = getStarfallPhase();
    if (phase === "preview" || phase === "archived") return;
    const milestone = STARFALL_MILESTONES.find((entry) => entry.id === milestoneId);
    if (
      !milestone ||
      state.starfall.totalEarned < milestone.required ||
      state.starfall.claimedMilestones.includes(milestone.id)
    ) return;
    state.starfall.claimedMilestones.push(milestone.id);
    if (milestone.type === "dust") {
      addDust(getMissionRewardDust(5), { trackMissions: false });
    } else if (milestone.type === "supplies") {
      state.expedition.supplies = Math.min(EXPEDITION_SUPPLY_CAP, state.expedition.supplies + 4);
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 12);
    } else if (milestone.type === "title") {
      state.starfall.cosmetics.title = true;
    } else if (milestone.type === "beacon") {
      state.starfall.cosmetics.beacon = true;
    } else if (milestone.type === "letter") {
      state.starfall.cosmetics.letter = true;
    } else if (milestone.type === "starport") {
      state.starfall.cosmetics.starport = true;
    } else if (milestone.type === "eighth") {
      state.starfall.cosmetics.backdrop = true;
      state.starfall.cosmetics.keepsake = true;
    }
    applyStarfallCosmetics();
    showToast("星雨里程碑已领取", milestone.reward, "✦");
    renderStarfallEvent();
    saveGame();
  }

  function purchaseStarfallItem(itemId) {
    const phase = getStarfallPhase();
    if (phase !== "active" && phase !== "exchange") return;
    const item = STARFALL_STORE_ITEMS.find((entry) => entry.id === itemId);
    const bought = clampGameCount(state.starfall.purchases[itemId]);
    if (!item || state.starfall.currency < item.cost || (item.limit && bought >= item.limit)) return;
    state.starfall.currency -= item.cost;
    state.starfall.purchases[itemId] = bought + 1;
    if (item.id === "emblem") {
      state.starfall.cosmetics.emblem = true;
    } else if (item.id === "postcard") {
      state.starfall.cosmetics.postcard = true;
    } else if (item.id === "dust") {
      addDust(getMissionRewardDust(5), { trackMissions: false });
    } else if (item.id === "materials") {
      STARPORT_MATERIALS.forEach((material) => {
        state.starport.materials[material.id] = Math.min(
          999000,
          state.starport.materials[material.id] + 3,
        );
      });
    } else if (item.id === "components") {
      OPERATION_COMPONENTS.forEach((component) => addOperationComponent(component.id, 2));
    } else if (item.id === "expedition") {
      state.expedition.supplies = Math.min(EXPEDITION_SUPPLY_CAP, state.expedition.supplies + 2);
      state.expedition.fragments = Math.min(999000, state.expedition.fragments + 6);
    }
    applyStarfallCosmetics();
    showToast("兑换完成", `${item.title}已送达航站。`, "☄");
    renderStarfallEvent();
    updateStarfallSummary();
    saveGame();
  }

  function renderMissions() {
    ensureMissionPeriods();
    const now = Date.now();
    const claimable = getMissionClaimableCount();
    const dailyCompleted = getCompletedMissionCount(state.missions.daily);
    const weeklyCompleted = getCompletedMissionCount(state.missions.weekly);
    elements.missionTokenBalance.textContent = formatNumber(
      state.missions.tokens,
      0,
    );
    elements.claimAllMissionsButton.disabled = claimable < 1;
    elements.claimAllMissionsButton.textContent = claimable > 0
      ? `一键领取全部（${claimable}）`
      : "暂无可领奖励";
    elements.dailyResetCountdown.textContent =
      `距离刷新 ${formatMissionCountdown(getNextDailyReset(now) - now)}`;
    elements.weeklyResetCountdown.textContent =
      `距离刷新 ${formatMissionCountdown(getNextWeeklyReset(now) - now, true)}`;
    elements.dailyRerollButton.disabled = state.missions.daily.rerollsUsed >= 1;
    elements.dailyRerollButton.textContent = state.missions.daily.rerollsUsed >= 1
      ? "今日已重签"
      : "免费重签一项";
    renderMissionList("daily", elements.dailyMissionList);
    renderMissionList("weekly", elements.weeklyMissionList);

    elements.dailyBonusProgress.textContent = `完成 ${Math.min(
      dailyCompleted,
      3,
    )} / 3`;
    elements.dailyBonusButton.disabled =
      dailyCompleted < 3 || state.missions.daily.completionClaimed;
    elements.dailyBonusButton.textContent = state.missions.daily.completionClaimed
      ? "今日已领取"
      : dailyCompleted >= 3
        ? "领取总奖励"
        : "尚未达成";

    elements.weeklyMilestoneList.textContent = "";
    WEEKLY_MISSION_MILESTONES.forEach((milestone, index) => {
      const claimed = state.missions.weekly.milestonesClaimed.includes(index);
      const reached = weeklyCompleted >= milestone.required;
      const card = document.createElement("article");
      card.className = `weekly-milestone${reached ? " completed" : ""}${
        claimed ? " claimed" : ""
      }`;
      const title = document.createElement("strong");
      title.textContent = `${milestone.required} 项里程碑`;
      const reward = document.createElement("span");
      reward.textContent = `+${milestone.tokens} 凭证 · ${milestone.dustMinutes} 分钟产量${
        milestone.materials > 0 ? ` · 每种材料 +${milestone.materials}` : ""
      }`;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.weeklyMilestone = String(index);
      button.disabled = !reached || claimed;
      button.textContent = claimed
        ? "已领取"
        : reached
          ? "领取奖励"
          : `${weeklyCompleted} / ${milestone.required}`;
      card.append(title, reward, button);
      elements.weeklyMilestoneList.appendChild(card);
    });

    elements.missionStore.querySelectorAll("[data-mission-store]").forEach((button) => {
      const item = MISSION_STORE_ITEMS[button.dataset.missionStore];
      const lockedMaterial =
        button.dataset.missionStore === "materialCrate" &&
        state.lifetimeDust < COMBAT_UNLOCK_DUST;
      const noCombatCooldown =
        button.dataset.missionStore === "combatRefit" &&
        state.combat.attackCooldownUntil <= now &&
        state.combat.skirmishCooldownUntil <= now;
      const lockedExpeditionSupply =
        button.dataset.missionStore === "expeditionSupply" &&
        state.lifetimeDust < EXPEDITION_UNLOCK_DUST;
      button.disabled =
        !item ||
        state.missions.tokens < item.cost ||
        lockedMaterial ||
        noCombatCooldown ||
        lockedExpeditionSupply;
    });
    updateMissionSummary();
  }

  function renderMissionList(kind, container) {
    const period = kind === "weekly" ? state.missions.weekly : state.missions.daily;
    container.textContent = "";
    period.items.forEach((item, index) => {
      const template = getMissionTemplate(item.templateId);
      if (!template) return;
      const completed = item.progress >= item.target;
      const card = document.createElement("article");
      card.className = `mission-card${completed ? " completed" : ""}${
        item.claimed ? " claimed" : ""
      }`;

      const icon = document.createElement("span");
      icon.className = "mission-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = template.icon;

      const copy = document.createElement("div");
      copy.className = "mission-card-copy";
      const title = document.createElement("strong");
      title.textContent = template.title;
      const detail = document.createElement("small");
      detail.textContent = `${describeMission(template, kind, item.target)} · ${formatMissionProgress(
        template,
        item.progress,
      )} / ${formatMissionProgress(template, item.target)}`;
      const track = document.createElement("div");
      track.className = "mission-progress-track";
      const fill = document.createElement("span");
      fill.style.width = `${clamp(item.progress / item.target, 0, 1) * 100}%`;
      track.appendChild(fill);
      copy.append(title, detail, track);

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.missionClaim = String(index);
      button.dataset.missionKind = kind;
      button.disabled = !completed || item.claimed;
      button.textContent = item.claimed
        ? "已领取"
        : completed
          ? kind === "weekly" ? "领取 12" : "领取 5"
          : "进行中";
      button.setAttribute(
        "aria-label",
        `${item.claimed ? "已领取" : "领取"}${template.title}奖励`,
      );
      card.append(icon, copy, button);
      container.appendChild(card);
    });
  }

  function claimMission(kind, index) {
    ensureMissionPeriods();
    const period = kind === "weekly" ? state.missions.weekly : state.missions.daily;
    const item = period.items[index];
    if (!item || item.claimed || item.progress < item.target) return;
    item.claimed = true;
    const tokens = kind === "weekly" ? 12 : 5;
    const rewardDust = getMissionRewardDust(kind === "weekly" ? 5 : 1);
    grantMissionTokens(tokens);
    addDust(rewardDust, { trackMissions: false });
    if (kind === "daily") recordMissionProgress("dailyClaims", 1);
    const template = getMissionTemplate(item.templateId);
    addLog(`${kind === "weekly" ? "每周" : "每日"}委托完成：${template.title}。`);
    showToast(
      "航站委托已交付",
      `${template.title} · +${tokens} 凭证 · +${formatNumber(rewardDust)} 星尘`,
      template.icon,
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function claimDailyMissionBonus() {
    ensureMissionPeriods();
    if (
      state.missions.daily.completionClaimed ||
      getCompletedMissionCount(state.missions.daily) < 3
    ) {
      return;
    }
    state.missions.daily.completionClaimed = true;
    const rewardDust = getMissionRewardDust(10);
    grantMissionTokens(15);
    addDust(rewardDust, { trackMissions: false });
    const signalReward = getSingularityCompanions().length > 0
      ? grantCompanionSignals(1)
      : 0;
    addLog("今日航站委托总奖励已领取。");
    showToast(
      "今日航线已稳定",
      `+15 凭证 · +${formatNumber(rewardDust)} 星尘${signalReward ? ` · 观测信号 +${signalReward}` : ""}`,
      "☷",
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function claimWeeklyMissionMilestone(index) {
    ensureMissionPeriods();
    const milestone = WEEKLY_MISSION_MILESTONES[index];
    if (
      !milestone ||
      state.missions.weekly.milestonesClaimed.includes(index) ||
      getCompletedMissionCount(state.missions.weekly) < milestone.required
    ) {
      return;
    }
    state.missions.weekly.milestonesClaimed.push(index);
    const rewardDust = getMissionRewardDust(milestone.dustMinutes);
    grantMissionTokens(milestone.tokens);
    grantMissionMaterials(milestone.materials);
    addDust(rewardDust, { trackMissions: false });
    const materialText = milestone.materials > 0
      ? ` · 每种材料 +${milestone.materials}`
      : "";
    showToast(
      "本周委托里程碑",
      `+${milestone.tokens} 凭证 · +${formatNumber(rewardDust)} 星尘${materialText}`,
      "◆",
    );
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function rerollDailyMission() {
    ensureMissionPeriods();
    const period = state.missions.daily;
    if (period.rerollsUsed >= 1) return;
    const replaceIndex = period.items.findIndex(
      (item) => !item.claimed && item.progress < item.target,
    );
    if (replaceIndex < 0) {
      showToast("没有可重签的委托", "当前每日委托都已完成。", "☷");
      return;
    }
    const usedIds = new Set(period.items.map((item) => item.templateId));
    const candidates = seededMissionShuffle(
      MISSION_TEMPLATES.filter(
        (template) =>
          !template.weeklyOnly &&
          !usedIds.has(template.id) &&
          template.eligible(state),
      ),
      `${period.key}:reroll:${period.items[replaceIndex].templateId}`,
    );
    if (!candidates.length) {
      showToast("暂时没有替代委托", "解锁更多航站系统后会出现更多任务。", "☷");
      return;
    }
    period.items[replaceIndex] = createMissionAssignment(candidates[0], "daily");
    period.rerollsUsed = 1;
    showToast("每日委托已重签", `新任务：${candidates[0].title}`, candidates[0].icon);
    renderMissions();
    updateMissionSummary();
    saveGame();
  }

  function purchaseMissionStoreItem(itemId) {
    ensureMissionPeriods();
    const item = MISSION_STORE_ITEMS[itemId];
    if (!item || state.missions.tokens < item.cost) {
      showToast("航站凭证不足", "完成更多每日与每周委托即可兑换。", "☷");
      return;
    }
    if (itemId === "materialCrate" && state.lifetimeDust < COMBAT_UNLOCK_DUST) {
      showToast("材料仓尚未接入", "解锁战斗系统后即可兑换星港材料箱。", "⌬");
      return;
    }
    if (
      itemId === "expeditionSupply" &&
      state.lifetimeDust < EXPEDITION_UNLOCK_DUST
    ) {
      showToast("远征补给尚未接入", "累计获得 5 万星尘后即可兑换远征补给。", "▱");
      return;
    }
    const now = Date.now();
    if (
      itemId === "combatRefit" &&
      state.combat.attackCooldownUntil <= now &&
      state.combat.skirmishCooldownUntil <= now
    ) {
      showToast("舰队已经就绪", "当前没有需要清除的主动战斗冷却。", "⬡");
      return;
    }
    state.missions.tokens = clampGameCount(state.missions.tokens - item.cost);
    if (itemId === "dustCrate") {
      const rewardDust = getMissionRewardDust(5);
      addDust(rewardDust, { trackMissions: false });
      showToast("星尘整备包已接收", `星尘 +${formatNumber(rewardDust)}`, "✦");
    } else if (itemId === "materialCrate") {
      grantMissionMaterials(3);
      showToast("星港材料箱已接收", "六种专属材料各 +3", "⌬");
    } else if (itemId === "combatRefit") {
      state.combat.attackCooldownUntil = now;
      state.combat.skirmishCooldownUntil = now;
      showToast("舰队紧急整备完成", "主动远征与近域清剿均已就绪。", "⬡");
    } else if (itemId === "expeditionSupply") {
      state.expedition.supplies = Math.min(
        EXPEDITION_SUPPLY_CAP,
        clampGameCount(safeAdd(state.expedition.supplies, 3)),
      );
      showToast("远征补给已装载", "远征补给 +3", "▱");
    }
    renderMissions();
    updateMissionSummary();
    updateUi();
    saveGame();
  }

    // 每次调用读取当前存档，导入或云端同步后也不会引用旧对象。
    modules.renderStarport = (...args) => { state = host.getState(); return renderStarport(...args); };
    modules.renderStarportBlueprints = (...args) => { state = host.getState(); return renderStarportBlueprints(...args); };
    modules.renderStarportLife = (...args) => { state = host.getState(); return renderStarportLife(...args); };
    modules.upgradeStarportModule = (...args) => { state = host.getState(); return upgradeStarportModule(...args); };
    modules.switchStarportBlueprint = (...args) => { state = host.getState(); return switchStarportBlueprint(...args); };
    modules.claimStarportLifeEvent = (...args) => { state = host.getState(); return claimStarportLifeEvent(...args); };
    modules.renderStarfallEvent = (...args) => { state = host.getState(); return renderStarfallEvent(...args); };
    modules.renderStarfallDays = (...args) => { state = host.getState(); return renderStarfallDays(...args); };
    modules.renderStarfallLetters = (...args) => { state = host.getState(); return renderStarfallLetters(...args); };
    modules.renderStarfallMilestones = (...args) => { state = host.getState(); return renderStarfallMilestones(...args); };
    modules.renderStarfallStore = (...args) => { state = host.getState(); return renderStarfallStore(...args); };
    modules.renderStarfallCollection = (...args) => { state = host.getState(); return renderStarfallCollection(...args); };
    modules.selectStarfallRoute = (...args) => { state = host.getState(); return selectStarfallRoute(...args); };
    modules.claimStarfallRoute = (...args) => { state = host.getState(); return claimStarfallRoute(...args); };
    modules.chooseStarfallLetter = (...args) => { state = host.getState(); return chooseStarfallLetter(...args); };
    modules.claimStarfallMilestone = (...args) => { state = host.getState(); return claimStarfallMilestone(...args); };
    modules.purchaseStarfallItem = (...args) => { state = host.getState(); return purchaseStarfallItem(...args); };
    modules.renderMissions = (...args) => { state = host.getState(); return renderMissions(...args); };
    modules.renderMissionList = (...args) => { state = host.getState(); return renderMissionList(...args); };
    modules.claimMission = (...args) => { state = host.getState(); return claimMission(...args); };
    modules.claimDailyMissionBonus = (...args) => { state = host.getState(); return claimDailyMissionBonus(...args); };
    modules.claimWeeklyMissionMilestone = (...args) => { state = host.getState(); return claimWeeklyMissionMilestone(...args); };
    modules.rerollDailyMission = (...args) => { state = host.getState(); return rerollDailyMission(...args); };
    modules.purchaseMissionStoreItem = (...args) => { state = host.getState(); return purchaseMissionStoreItem(...args); };
    enabled = true;
    return true;
  }
  root.StellarLegacySystems = Object.freeze({ get enabled() { return enabled; }, modules, mount });
})(typeof globalThis !== "undefined" ? globalThis : this);
