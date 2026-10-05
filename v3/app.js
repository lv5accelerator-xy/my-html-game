(function () {
  "use strict";
  const D = globalThis.SalvageData,
    E = globalThis.SalvageEngine,
    S = globalThis.SalvageStorage;
  const $ = (selector) => document.querySelector(selector);
  const escape = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const number = (value) => {
    if (!Number.isFinite(value)) return "—";
    if (value >= 1e15) return value.toExponential(2).replace("+", "");
    if (value < 1000)
      return value.toLocaleString("zh-CN", {
        maximumFractionDigits: value < 10 ? 1 : 0,
      });
    for (const [size, label] of [
      [1e12, "万亿"],
      [1e8, "亿"],
      [1e4, "万"],
      [1e3, "千"],
    ])
      if (value >= size)
        return `${(value / size).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}${label}`;
    return value.toExponential(1);
  };
  const duration = (seconds) =>
    seconds >= 3600
      ? `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分`
      : seconds >= 60
        ? `${Math.floor(seconds / 60)} 分 ${Math.ceil(seconds % 60)} 秒`
        : `${Math.ceil(seconds)} 秒`;
  const icon = (name) => {
    const shapes = {
      home: '<path d="m3 11 9-8 9 8v10h-6v-7H9v7H3z"/>',
      fleet: '<path d="m12 2 8 19-8-5-8 5zM12 2v14"/>',
      explore: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
      jump: '<path d="M20 9a8 8 0 0 0-14-3M4 15a8 8 0 0 0 14 3M6 2v4H2m20 12h-4v4"/><circle cx="12" cy="12" r="3"/>',
      scan: '<path d="M8 8a6 6 0 0 0 0 8m8-8a6 6 0 0 1 0 8M5 4a11 11 0 0 0 0 16M19 4a11 11 0 0 1 0 16"/><circle cx="12" cy="12" r="2"/>',
    };
    return `<svg aria-hidden="true" viewBox="0 0 24 24">${shapes[name] || shapes.home}</svg>`;
  };
  const action = (name, id = "") =>
    `data-action="${name}" data-id="${id}" data-focus="${name}-${id}"`;
  let storage;
  try {
    storage = window.localStorage;
  } catch (error) {
    storage = {
      getItem() {
        throw error;
      },
      setItem() {
        throw error;
      },
    };
  }
  const loaded = S.load(storage);
  let state = loaded.state,
    blocked = Boolean(loaded.error),
    page = "home",
    buyMode = "1",
    signature = "",
    toastTimer,
    dialogOrigin;
  const dialog = $("#dialog");
  function toast(message) {
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
      () => $("#toast").classList.remove("visible"),
      3200,
    );
  }
  function save() {
    if (blocked) return false;
    try {
      S.save(storage, state);
      $("#save-label").textContent = "自动保存";
      return true;
    } catch (error) {
      blocked = true;
      $("#save-label").textContent = "保存未完成";
      toast("本机未能保存进度，请在设置里导出记录。");
      return false;
    }
  }
  function openDialog(title, body) {
    if (!dialog.open) dialogOrigin = document.activeElement;
    $("#dialog-title").textContent = title;
    $("#dialog-body").innerHTML = body;
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog() {
    dialog.close();
  }
  dialog.addEventListener("close", () => {
    const replacement =
      dialogOrigin?.dataset.focus &&
      document.querySelector(
        `[data-focus="${CSS.escape(dialogOrigin.dataset.focus)}"]`,
      );
    const target = dialogOrigin?.isConnected ? dialogOrigin : replacement;
    if (target && !target.disabled) target.focus({ preventScroll: true });
    else $("#main").focus({ preventScroll: true });
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [
      ...dialog.querySelectorAll(
        "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)",
      ),
    ].filter((el) => el.getClientRects().length);
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  });
  $("#dialog-close").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeDialog();
    }
  });
  function exportSave() {
    const link = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
      );
    link.href = url;
    link.download = `拾荒航线-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("航线记录已导出。");
  }
  function settings() {
    let backup = false;
    try {
      backup = Boolean(storage.getItem(S.BACKUP));
    } catch (_) {
      /* Error shown below. */
    }
    openDialog(
      "航站设置",
      `<p>进度保存在这台设备。跃迁不会清除舰装、故事、航站修复和永久能力。</p>${blocked ? '<p class="save-warning">自动保存已暂停。请先导出记录，再恢复备份或重新启航。</p>' : ""}
      <div class="settings-links"><button ${action("export")}>导出航线记录</button><button ${action("import")}>导入记录</button><input id="import-file" type="file" accept=".json,application/json" hidden>${backup ? `<button ${action("backup")}>恢复上次备份</button>` : ""}</div>
      ${state.legacyArchive ? "<p>继承的旧航站记录已完整封存。原版的远征和活动奖励可在旧版继续处理。</p>" : ""}
      <div class="settings-links"><a href="../">返回旧版航站</a><button ${action("legacy")}>继承本机旧航站</button><button ${action("reset")}>重新启航</button></div><p><small>拾荒航线 ${D.GAME_VERSION} · 离线结算最多 ${D.OFFLINE_SECONDS / 3600} 小时。故事选择不会自动代选。</small></p>`,
    );
  }
  $("#settings-button").addEventListener("click", settings);
  function navigate(target) {
    if (!E.reachable(state, target)) return;
    page = target;
    signature = "";
    render();
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function quote(id) {
    let count = buyMode === "max" ? 50 : Number(buyMode);
    while (count > 1 && E.buildingCost(state, id, count) > state.dust) count--;
    return { count, cost: E.buildingCost(state, id, count) };
  }
  function home() {
    const goal = E.nextGoal(state),
      recent = state.journal.slice(0, 3);
    return `<div class="home-layout"><section class="scene" aria-label="归航航站"><div class="scene-heading"><h1>在寂静里，重建航线。</h1><p>一次扫描，一艘无人机，一段更远的旅程。</p></div>
      <button class="beacon-button" ${action("beacon")} ${state.beacon.expiresAt ? "" : "hidden"}>捕获金色信标<small>剩余 <span data-beacon-seconds>15</span> 秒</small></button>
      <div class="scan-area"><button class="primary scan-button" ${action("scan")}>${icon("scan")}扫描信标 <strong>+<span data-scan-value>2</span> 星尘</strong></button><p>无人机启动后，离线也会继续生产。</p></div></section>
      <aside class="goal-rail"><h2 class="rail-heading">下一个目标</h2><h2 id="next-goal-title">${goal.title}</h2><p>${goal.detail}</p><div class="goal-meter"><div><strong data-goal-value>0</strong> / <span>${number(goal.target)}</span></div><div class="progress" role="progressbar" aria-label="下一个目标进度" aria-valuemin="0" aria-valuemax="100" data-goal-progress><span></span></div></div><button class="outline" ${action("nav", goal.action)}>${goal.label} →</button>
      <div class="journal"><h3>航站日志</h3>${recent.length ? recent.map((r) => `<p>${escape(r.text)}</p>`).join("") : "<p>航站仍在沉默中，但远处的星光从未熄灭。</p><p>每一块漂泊的残骸，都能让航线再向前延伸一点。</p>"}</div></aside></div>
      ${state.buildings.drone ? `<div class="quick-row"><h3>拾荒无人机</h3><span>${state.buildings.drone} 艘</span><span>基础每艘 +0.8 星尘/秒</span><button class="outline" ${action("buy", "drone")} data-buy-id="drone"></button></div>` : ""}`;
  }
  function routePanel() {
    const route = D.ROUTES.find((r) => r.id === state.run.route);
    if (state.run.routeChosen)
      return `<div class="route-active"><h3>${route.name} · ${route.subtitle}</h3><p>${route.detail} 跃迁后可以重选。</p></div>`;
    if (!state.buildings.drone) return "";
    return `<div class="section-title"><h2>这一航次，向哪里去？</h2><small>只选一次</small></div><div class="route-choices">${D.ROUTES.map((r) => `<div class="route-option"><h3>${r.name}</h3><p>${r.detail}</p><button class="outline" ${action("route", r.id)}>选择</button></div>`).join("")}</div>`;
  }
  function automation() {
    if (!E.capability(state, "autoBuy"))
      return `<p class="empty">第一次跃迁后，会有无人机替你继续购买设施。</p>`;
    return `<section class="automation"><h3>舰队自动化</h3><div class="control-row"><label><input type="checkbox" data-config="enabled" ${state.automation.enabled ? "checked" : ""}>自动购买 · 每秒购买 1 艘</label></div>
      ${E.capability(state, "planning") ? `<div class="control-row"><label>购买策略 <select data-config="policy"><option value="balanced" ${state.automation.policy === "balanced" ? "selected" : ""}>产量回本优先</option><option value="milestone" ${state.automation.policy === "milestone" ? "selected" : ""}>接近里程碑优先</option><option value="advanced" ${state.automation.policy === "advanced" ? "selected" : ""}>高级设施优先</option></select></label><label>保留星尘 <input data-config="reserve" type="number" min="0" max="1000000000000" step="100" value="${state.automation.reserve}"></label></div>` : "<p><small>第二次跃迁后可设置购买优先级与保留预算。</small></p>"}
      ${E.capability(state, "autoResearch") ? `<div class="control-row"><label><input type="checkbox" data-config="research" ${state.automation.research ? "checked" : ""}>自动研究 · 每 5 秒完成一项可负担科技</label></div>` : ""}
      ${E.capability(state, "autoDispatch") ? `<div class="control-row"><label><input type="checkbox" data-config="dispatch" ${state.automation.dispatch ? "checked" : ""}>重复派遣安全探索 · 故事等待手动选择</label></div>` : ""}</section>`;
  }
  function fleet() {
    return `<div class="page"><div class="page-header"><div><h1>把残骸，变成舰队。</h1><p>每种设施在 10、25、50 艘时产量翻倍。研究与路线会改变它们如何协同。</p></div><div class="buy-modes" aria-label="每次购买上限">${[
      ["1", "1 艘"],
      ["10", "最多 10"],
      ["max", "最大"],
    ]
      .map(
        ([value, label]) =>
          `<button ${action("mode", value)} aria-pressed="${buyMode === value}" class="${buyMode === value ? "selected" : ""}">${label}</button>`,
      )
      .join("")}</div></div>
      ${routePanel()}<section aria-label="生产设施">${D.BUILDINGS.filter(
        (b) => state.run.dust >= b.unlock || state.buildings[b.id],
      )
        .map(
          (b) =>
            `<div class="building-row"><div><h3>${b.name}</h3><p>${b.detail}</p><div class="milestone-track">${D.MILESTONES.map((n) => `<span class="${state.buildings[b.id] >= n ? "achieved" : ""}">${n} 艘 ×2</span>`).join("")}</div></div><div class="building-stats"><strong>${state.buildings[b.id]} 艘</strong><small>本设施基础 ${number(b.rate * state.buildings[b.id] * E.milestone(state.buildings[b.id]))} / 秒</small></div><div class="row-action"><button class="outline" ${action("buy", b.id)} data-buy-id="${b.id}"></button><small>下个里程碑 ${D.MILESTONES.find((n) => n > state.buildings[b.id]) || "已完成"}</small></div></div>`,
        )
        .join("")}</section>
      ${
        state.run.dust >= 40
          ? `<section><div class="section-title"><h2>航站研究</h2><small>本航次有效</small></div>${D.RESEARCH.filter(
              (r) => state.run.dust >= r.unlock,
            )
              .map(
                (r) =>
                  `<div class="research-row"><div><h3>${r.name}</h3><p>${r.detail}</p></div><small>${number(r.cost)} 星尘</small><div class="row-action"><button ${action("research", r.id)} ${state.research.includes(r.id) ? "disabled" : `data-min-dust="${r.cost}"`}>${state.research.includes(r.id) ? "已完成" : "研究"}</button></div></div>`,
              )
              .join("")}</section>`
          : ""
      }
      ${automation()}</div>`;
  }
  function missionReport() {
    if (!state.result) return "";
    const r = state.result,
      story = r.story && D.STORIES[r.story];
    return `<section class="report" aria-label="归航报告"><h2>${story ? story.title : D.MISSIONS.find((m) => m.id === r.id).name + " · 归航报告"}</h2><p>${story ? story.text : r.succeeded ? "探索船安全归航，回收物已经送达。" : "裂隙干扰超出预期，探索船安全撤回，带回 1 份样本。"}</p><p>回收 ${number(r.dust)} 星尘 · ${r.samples} 份样本${r.module ? ` · 舰装「${D.MODULES.find((m) => m.id === r.module).name}」` : ""}</p>
      ${story ? story.choices.map((c) => `<button class="story-choice" ${action("claim", c.id)}><strong>${c.name}</strong><small>${c.detail}</small></button>`).join("") : `<button class="primary" ${action("claim")}>收取回收物</button>`}</section>`;
  }
  function explore() {
    const port = D.PORT[state.starport];
    return `<div class="page"><div class="page-header"><div><h1>有些残骸，仍在等待。</h1><p>安全探索只分流产量。风险探索由你主动选择，结果与回收预期会在派遣前显示。</p></div></div>
      ${missionReport()}${state.mission ? `<section class="mission-status"><h3>${D.MISSIONS.find((m) => m.id === state.mission.id).name} · 探索中</h3><p>剩余 <strong data-mission-time></strong> · 当前分流 ${Math.round(state.mission.diversion * 100)}% 产量</p><div class="progress" role="progressbar" aria-label="探索进度" aria-valuemin="0" aria-valuemax="100" data-mission-progress><span></span></div></section>` : ""}
      <section aria-label="探索航线">${E.missionOptions(state)
        .map((m) => {
          const p = E.missionPreview(state, m.id);
          return `<div class="mission-row"><div><h3>${m.name}</h3><p>${m.detail}</p></div><div class="mission-metrics"><small>${duration(p.seconds)} · 分流 ${Math.round(p.diversion * 100)}%</small><p>成功率 ${Math.round(p.chance * 100)}%<br>成功回收 ${number(p.dust)} 星尘<br>${p.samples} 份样本</p></div><div class="row-action"><button class="${m.chance < 1 ? "" : "outline"}" ${action("mission", m.id)} ${state.mission || state.result ? "disabled" : ""}>${m.chance < 1 ? "风险派遣" : "安全派遣"}</button></div></div>`;
        })
        .join("")}</section>
      <section class="port-panel"><span class="port-progress">星港修复 ${state.starport} / ${D.PORT.length}</span><h2>${port ? port.name : "这里终于可以成为家。"}</h2><p>${port ? `需要 ${port.cores} 星核与 ${port.samples} 份样本。你拥有 ${number(state.cores)} 星核与 ${number(state.samples)} 份样本。` : D.PORT.at(-1).text}</p>${port ? `<button class="outline" ${action("port")} ${state.cores >= port.cores && state.samples >= port.samples ? "" : "disabled"}>修复航站</button>` : "<p>归航星港已建成。你可以继续选择不同航线，收集故事与舰装。</p>"}</section>
      <section><div class="section-title"><h2>随舰装备</h2><small>${state.equipped.length} / 2 槽位 · 跃迁保留</small></div>${
        D.MODULES.filter((m) => state.modules[m.id])
          .map(
            (m) =>
              `<div class="module-row"><div><h3>${m.name}</h3><p>${m.detail}</p></div><small>${state.modules[m.id]} / 3 级</small><div class="row-action"><button ${action("equip", m.id)} ${!state.equipped.includes(m.id) && state.equipped.length >= 2 ? "disabled" : ""}>${state.equipped.includes(m.id) ? "卸下" : "装备"}</button></div></div>`,
          )
          .join("") ||
        '<p class="empty">回应医院船的信号，或进入裂隙寻找第一件舰装。</p>'
      }</section>
      <details><summary>已收藏的航线故事 · ${state.lore.length} / 2</summary>${state.lore.map((r) => `<div class="lore-entry"><h3>${D.STORIES[r.story].title}</h3><p>${D.STORIES[r.story].text}</p><p>你的选择：${D.STORIES[r.story].choices.find((c) => c.id === r.choice).name}</p></div>`).join("") || '<p class="empty">你的每一个决定，都将留在这里。</p>'}</details></div>`;
  }
  function jump() {
    const gain = E.prestigeGain(state);
    return `<div class="page"><div class="page-header"><div><h1>下一次启航，会有所不同。</h1><p>用这一航次的积累换取星核和永久能力。舰装、故事、样本与修复的星港会与你同行。</p></div></div><div class="jump-layout"><div><div class="jump-number">${gain || 4} <small>星核${gain ? "可获得" : "起"}</small></div><p>本航次收集 <strong data-run-dust>${number(state.run.dust)}</strong> / ${number(D.PRESTIGE_DUST)} 星尘</p><div class="progress" role="progressbar" aria-label="跃迁进度" aria-valuemin="0" aria-valuemax="100" data-jump-progress><span></span></div><p>星核带来的全舰队产量：×${number(1 + Math.sqrt(state.totalCores) * 0.25)}。消费星核修复航站也不会减少这项历史加成。</p><p><small>新航次从 1 艘无人机与 12 星尘开始。临时设施与研究需要重新建设。</small></p>${state.mission || state.result ? '<p class="save-warning">请先等待探索归航，并处理报告。</p>' : ""}<button class="primary" ${action("jump")} ${gain && !state.mission && !state.result ? "" : "disabled"}>${gain ? "开启下一航次" : "尚在积累能量"}</button></div><div><h2>每次都能解锁新工作</h2>${D.CAPABILITIES.map((c) => `<div class="capability-row ${E.capability(state, c.id) ? "unlocked" : ""}"><span>${E.capability(state, c.id) ? "已解锁" : `第 ${c.run} 次跃迁`}</span><div><h3>${c.name}</h3><p>${c.detail}</p></div></div>`).join("")}</div></div><section><h2>最近的航次</h2>${state.records.map((r, i) => `<div class="history-row"><span>${D.ROUTES.find((route) => route.id === r.route).name}</span><span>${duration(r.seconds)}</span><span>+${number(r.gain)} 星核</span></div>`).join("") || '<p class="empty">第一条航线正在由你写下。</p>'}</section></div>`;
  }
  function updateNumbers() {
    $("#dust-value").textContent = number(state.dust);
    $("#rate-value").textContent = `+${number(E.productionRate(state))} / 秒`;
    $("#core-resource").hidden = state.rebirths === 0 && !state.totalCores;
    $("#core-value").textContent = number(state.cores);
    $("#run-label").textContent = `第 ${state.rebirths + 1} 航次`;
    $("#route-label").textContent = D.ROUTES.find(
      (r) => r.id === state.run.route,
    ).name;
    document.querySelectorAll("[data-buy-id]").forEach((button) => {
      const p = quote(button.dataset.buyId);
      button.textContent = `建造${p.count > 1 ? ` ×${p.count}` : ""} · ${number(p.cost)} 星尘`;
      button.disabled = p.cost > state.dust;
    });
    document.querySelectorAll("[data-min-dust]").forEach((button) => {
      button.disabled = state.dust < Number(button.dataset.minDust);
    });
    document.querySelectorAll("[data-scan-value]").forEach((el) => {
      el.textContent = number(E.scanValue(state));
    });
    const scanButton = $('[data-action="scan"]');
    if (scanButton) scanButton.disabled = state.clock - state.lastScanClock < 1;
    document.querySelectorAll("[data-run-dust]").forEach((el) => {
      el.textContent = number(state.run.dust);
    });
    const goal = E.nextGoal(state);
    document.querySelectorAll("[data-goal-value]").forEach((el) => {
      el.textContent = number(Math.min(goal.value, goal.target));
    });
    const progress = (selector, value) => {
      const el = $(selector);
      if (el) {
        const percent = Math.max(0, Math.min(100, value * 100));
        el.setAttribute("aria-valuenow", Math.round(percent));
        el.firstElementChild.style.width = `${percent}%`;
      }
    };
    progress("[data-goal-progress]", goal.value / goal.target);
    progress("[data-jump-progress]", state.run.dust / D.PRESTIGE_DUST);
    const remaining = Math.max(0, state.beacon.expiresAt - state.clock);
    document.querySelectorAll("[data-beacon-seconds]").forEach((el) => {
      el.textContent = remaining;
    });
    if (state.mission) {
      const m = state.mission;
      if ($("[data-mission-time]"))
        $("[data-mission-time]").textContent = duration(
          Math.max(0, m.end - state.clock),
        );
      progress("[data-mission-progress]", (state.clock - m.start) / m.seconds);
    }
  }
  function render() {
    if (!E.reachable(state, page)) page = "home";
    const goal = E.nextGoal(state);
    const tiers = [40, 120, 150, 600, 1500, 2400, 15000].map(
      (n) => state.run.dust >= n,
    );
    const next = JSON.stringify([
      page,
      buyMode,
      tiers,
      state.buildings,
      state.research,
      state.run.route,
      state.run.routeChosen,
      E.reachable(state, "explore"),
      E.reachable(state, "jump"),
      goal.title,
      state.cores,
      state.rebirths,
      state.starport,
      state.samples,
      state.equipped,
      state.modules,
      state.mission,
      state.result,
      state.lore,
      state.records,
      state.journal,
      Boolean(state.beacon.expiresAt),
      state.automation,
    ]);
    if (next !== signature) {
      const focus = document.activeElement?.dataset.focus;
      const openDetails = Array.from(
        $("#main").querySelectorAll("details"),
      ).map((el) => el.open);
      $("#navigation").innerHTML = [
        ["home", "航站"],
        ["fleet", "舰队"],
        ["explore", "探索"],
        ["jump", "跃迁"],
      ]
        .filter(([id]) => E.reachable(state, id))
        .map(
          ([id, label]) =>
            `<button ${action("nav", id)} class="${page === id ? "active" : ""}" ${page === id ? 'disabled aria-current="page"' : id === "fleet" && !state.buildings.drone && page === "home" ? 'disabled title="从下一个目标启动舰队"' : ""}>${icon(id)}${label}</button>`,
        )
        .join("");
      $("#main").innerHTML = { home, fleet, explore, jump }[page]();
      Array.from($("#main").querySelectorAll("details")).forEach((el, i) => {
        el.open = openDetails[i] || false;
      });
      if (focus)
        document
          .querySelector(`[data-focus="${CSS.escape(focus)}"]`)
          ?.focus({ preventScroll: true });
      signature = next;
    }
    updateNumbers();
  }
  function importText(text) {
    try {
      state = S.restore(storage, text);
      blocked = false;
      page = "home";
      signature = "";
      closeDialog();
      render();
      toast("航线记录已接续，恢复前的记录已备份。");
    } catch (error) {
      toast(`未能接续：${error.message}`);
    }
  }
  document.addEventListener("change", async (event) => {
    const target = event.target;
    if (target.id === "import-file" && target.files?.[0]) {
      const file = target.files[0];
      if (file.size > 4 * 1024 * 1024) {
        toast("记录超过 4 MB，请检查是否选对文件。");
        return;
      }
      try {
        const text = await file.text();
        const raw = JSON.parse(text);
        raw.schema ? E.sanitize(raw) : E.migrateLegacy(raw);
        openDialog(
          "接续这条航线？",
          `<p>当前航线会先备份，再接续所选记录。旧版航站会继续保留。</p><div class="dialog-actions"><button ${action("cancel")}>取消</button><button class="primary" id="confirm-import">接续记录</button></div>`,
        );
        $("#confirm-import").addEventListener("click", () => importText(text), {
          once: true,
        });
      } catch (error) {
        toast(`文件未能读取：${error.message}`);
      }
    }
    if (target.dataset.config) {
      E.configure(state, {
        [target.dataset.config]:
          target.type === "checkbox" ? target.checked : target.value,
      });
      signature = "";
      render();
      save();
    }
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    const { action: kind, id } = button.dataset;
    if (kind === "nav") {
      navigate(id);
      return;
    }
    if (kind === "cancel") {
      closeDialog();
      return;
    }
    if (kind === "scan") {
      const gain = E.scan(state);
      if (gain) {
        button.classList.remove("flash");
        void button.offsetWidth;
        button.classList.add("flash");
      }
    } else if (kind === "buy") {
      const count = E.buy(
        state,
        id,
        buyMode === "max" ? "max" : Number(buyMode),
      );
      if (count)
        toast(`建造 ${count} 艘${D.BUILDINGS.find((b) => b.id === id).name}。`);
    } else if (kind === "mode") buyMode = id;
    else if (kind === "route") E.chooseRoute(state, id);
    else if (kind === "research") E.research(state, id);
    else if (kind === "beacon") E.claimBeacon(state);
    else if (kind === "mission") {
      const mission = D.MISSIONS.find((m) => m.id === id);
      if (mission.chance < 1) {
        const p = E.missionPreview(state, id);
        openDialog(
          "进入裂隙回声？",
          `<p>探索将持续 ${duration(p.seconds)}，分流 ${p.diversion * 100}% 的产量。成功率 ${Math.round(p.chance * 100)}%，成功可带回舰装，失败仍带回 1 份样本。</p><div class="dialog-actions"><button ${action("cancel")}>继续安全回收</button><button class="outline" ${action("risk", id)}>确认风险派遣</button></div>`,
        );
        return;
      }
      E.startMission(state, id);
    } else if (kind === "risk") {
      E.startMission(state, id);
      closeDialog();
    } else if (kind === "claim") {
      E.claimMission(state, id || undefined);
      toast("回收物已入库，发现会陪你继续航行。");
    } else if (kind === "equip") E.equip(state, id);
    else if (kind === "port") {
      if (E.repairPort(state)) toast("航站的一盏灯，重新亮起了。");
    } else if (kind === "jump") {
      openDialog(
        "开启下一航次？",
        `<p>获得 ${E.prestigeGain(state)} 星核，并解锁${D.CAPABILITIES.find((c) => c.run === state.rebirths + 1)?.name || "新航次"}。</p><p>临时设施、研究和本轮星尘重置。舰装、故事、样本、星核和星港修复保留，新航次携带 1 艘无人机与 12 星尘。</p><div class="dialog-actions"><button ${action("cancel")}>继续这一航次</button><button class="primary" ${action("confirm-jump")}>启航</button></div>`,
      );
      return;
    } else if (kind === "confirm-jump") {
      if (E.prestige(state)) {
        closeDialog();
        page = "fleet";
        toast("新的航次已开始，自动购买已启动。");
      }
    } else if (kind === "export") {
      exportSave();
      return;
    } else if (kind === "import") {
      $("#import-file").click();
      return;
    } else if (kind === "reset") {
      openDialog(
        "重新从寂静航站出发？",
        `<p>当前航线会先备份，再从零开始。旧版航站记录会保留。</p><div class="dialog-actions"><button ${action("cancel")}>留下</button><button ${action("confirm-reset")}>重新启航</button></div>`,
      );
      return;
    } else if (kind === "confirm-reset") {
      try {
        state = S.reset(storage);
        blocked = false;
        page = "home";
        closeDialog();
      } catch (_) {
        toast("备份未能完成，当前记录已保留。");
        return;
      }
    } else if (kind === "backup") {
      try {
        const text = storage.getItem(S.BACKUP);
        if (text) importText(text);
      } catch (error) {
        toast(error.message);
      }
      return;
    } else if (kind === "legacy") {
      try {
        const text = storage.getItem(S.LEGACY_KEY);
        if (!text) {
          toast("这台设备上还没有旧航站记录。");
          return;
        }
        E.migrateLegacy(JSON.parse(text));
        openDialog(
          "继承旧航站？",
          `<p>星尘、星核、跃迁次数和匹配的设施会接入这条航线。旧研究、远征和未领取奖励完整封存，仍可回旧版继续。</p><p>当前航线会先备份；旧版原记录保持可用。</p><div class="dialog-actions"><button ${action("cancel")}>继续当前航线</button><button class="primary" id="confirm-legacy">继承航站</button></div>`,
        );
        $("#confirm-legacy").addEventListener("click", () => importText(text), {
          once: true,
        });
      } catch (error) {
        toast(`旧记录未能读取：${error.message}`);
      }
      return;
    }
    render();
    if (!["scan", "mode"].includes(kind)) save();
  });
  render();
  if (loaded.error) {
    $("#save-label").textContent = "保存已暂停";
    openDialog(
      "记录暂未能接续",
      `<p>${escape(loaded.error)}</p><p>原记录仍保留在本机。自动保存已经暂停，请在设置中恢复备份、导入记录或导出当前航线。</p>`,
    );
  } else if (loaded.legacy)
    openDialog(
      "选择你的启航方式",
      `<p>这台设备上已有旧航站记录。可以继承星尘、星核和匹配舰队，也可以从一艘新无人机开始体验航线。</p><p>旧研究、远征和未领取奖励会完整保留，随时可回旧版继续。</p><div class="dialog-actions"><button ${action("cancel")}>从零启航</button><button class="primary" ${action("legacy")}>继承旧航站</button></div>`,
    );
  else if (loaded.report?.seconds >= 60)
    openDialog(
      "欢迎归航",
      `<p>离开期间，航站继续运行了 ${duration(loaded.report.seconds)}${loaded.report.capped ? "（已达到离线结算上限）" : ""}。</p><p>收集 ${number(loaded.report.dust)} 星尘${E.capability(state, "autoBuy") && state.automation.enabled ? "，自动购买也已完成" : ""}。${state.result ? "有一份探索报告在等你。" : ""}</p><div class="dialog-actions"><button class="primary" ${action("cancel")}>继续航线</button></div>`,
    );
  setInterval(() => {
    E.advance(state, Date.now(), {
      offline: document.hidden || Date.now() - state.lastAt > 30000,
    });
    render();
  }, 250);
  setInterval(save, 5000);
  document.addEventListener("visibilitychange", () => {
    state.beacon.expiresAt = 0;
    E.advance(state, Date.now(), { offline: true });
    save();
    render();
  });
  window.addEventListener("beforeunload", save);
  window.addEventListener("storage", (event) => {
    if (event.key !== S.KEY) return;
    blocked = true;
    $("#save-label").textContent = "另一窗口正在运行";
    openDialog(
      "另一窗口接续了航线",
      `<p>自动保存已暂停，避免覆盖另一窗口的进度。你可以导出当前记录，或接续最新的航线。</p><div class="dialog-actions"><button ${action("export")}>导出当前记录</button><button class="primary" id="reload-game">接续最新进度</button></div>`,
    );
    $("#reload-game").addEventListener("click", () => location.reload(), {
      once: true,
    });
  });
})();
