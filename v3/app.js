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
  const reading = S.reading(storage);
  document.documentElement.dataset.readingSize = reading.size;
  let state = loaded.state,
    blocked = Boolean(loaded.error),
    persistedText = loaded.source,
    conflicted = false,
    backupWarningShown = false,
    page = "home",
    buyMode = "1",
    signature = "",
    rebuilding = false,
    recentStory = null,
    lastReturnReport = loaded.report?.seconds >= 60 ? loaded.report : null,
    absence = null,
    toastTimer,
    dialogOrigin,
    wasVisible = !document.hidden;
  const dialog = $("#dialog");
  let readingTimer;
  function rememberReading() {
    const archive = $("#route-archive");
    if (!archive?.open) return;
    const visible = [...archive.querySelectorAll("[data-read-anchor]")].filter((el) => el.getClientRects().length && el.getBoundingClientRect().top < innerHeight && el.getBoundingClientRect().bottom > 0);
    const anchor = visible.findLast((el) => el.getBoundingClientRect().top <= 160) || visible[0];
    if (!anchor) return;
    reading.anchor = anchor.id;
    reading.offset = Math.min(600, Math.max(-100000, anchor.getBoundingClientRect().top));
    S.saveReading(storage, reading);
  }
  document.addEventListener("toggle", (event) => {
    const el = event.target;
    if (rebuilding || !el.matches?.("#route-archive, #route-archive details[data-details-key]")) return;
    if (el._readingOpen === el.open) return;
    el._readingOpen = el.open;
    reading.open[el.dataset.detailsKey] = el.open;
    if (el.open && el.id) { reading.anchor = el.id; reading.offset = 100; }
    S.saveReading(storage, reading);
  }, true);
  window.addEventListener("scroll", () => {
    clearTimeout(readingTimer);
    readingTimer = setTimeout(rememberReading, 200);
  }, { passive: true });
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
      const result = S.save(storage, state, Date.now(), { expected: persistedText });
      persistedText = JSON.stringify(state);
      $("#save-label").textContent = result.backupError ? "已保存 · 备份未更新" : "自动保存";
      if (result.backupError && !backupWarningShown) {
        backupWarningShown = true;
        toast("当前进度已保存，但自动备份未能更新。请导出记录留存。");
      }
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
    // Native close is queued; keep focus chosen after dismissal.
    const active = document.activeElement;
    if (dialog.open || (
      active?.isConnected && active !== document.body &&
      active !== document.documentElement && !dialog.contains(active) &&
      !active.disabled && active.getClientRects().length
    )) return;
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
  function downloadText(text, name) {
    const link = document.createElement("a"),
      url = URL.createObjectURL(
        new Blob([text], {
          type: "application/json",
        }),
      );
    link.href = url;
    link.download = `${name}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("航线记录已导出。");
  }
  function exportSave() { downloadText(JSON.stringify(state, null, 2), "拾荒航线"); }
  const savedDate = (value) => value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "时间未记录";
  const endingName = (id) => D.ENDINGS.find(item => item.id === id)?.title || "未确认";
  function backupPanel() {
    const result = S.backups(storage);
    const names = { auto: "自动备份", manual: "手动备份", restore: "恢复前", reset: "重新启航前", previous: "旧备份" };
    return `<section class="backup-panel" aria-labelledby="backup-heading"><h3 id="backup-heading">航线备份</h3>
      <p>每 5 分钟留存一份，保留最近 3 份自动备份；另保留最近 3 份手动／恢复前备份。仅在本机保存，换设备请导出 JSON 后导入。</p>
      <label for="backup-label">备份备注（可选）</label><div class="backup-create"><input id="backup-label" maxlength="40" placeholder="例如：下一次跃迁前"><button ${action("checkpoint")} ${blocked ? "disabled" : ""}>保存手动备份</button></div>
      ${result.error ? `<p class="save-warning">备份暂不可读取：${escape(result.error)}。请先导出当前记录。</p>` : result.entries.length ? `<ol class="backup-list">${result.entries.map(entry => `<li><div><strong>${escape(entry.label || names[entry.kind] || "备份")}</strong><small>${escape(names[entry.kind])} · ${escape(savedDate(entry.createdAt || entry.summary?.savedAt))}</small><p>${entry.valid ? `第 ${entry.summary.chapter} 章 · 跃迁 ${number(entry.summary.rebirths)} 次 · ${entry.summary.lore.length} 份决定${entry.summary.ending ? ` · ${escape(endingName(entry.summary.ending))}` : ""}` : "暂不能接续，原文仍可导出"}</p></div><div class="backup-actions"><button class="outline" ${action("backup", entry.id)} ${!entry.valid || conflicted ? "disabled" : ""}>预览恢复</button><button class="text-button" ${action("backup-export", entry.id)}>导出原文</button></div></li>`).join("")}</ol>` : '<p class="backup-empty">还没有备份。可先保存一份手动备份，或等待下一次自动保存。</p>'}
      <p><small>轮换会替换同组最旧记录；重要节点请另外导出。自动备份不会替换手动备份，旧版航站存档不参与轮换。</small></p></section>`;
  }
  function settings() {
    openDialog(
      "航站设置",
      `<p>进度保存在这台设备。跃迁不会清除舰装、故事、航站修复和永久能力。</p>${blocked ? '<p class="save-warning">自动保存已暂停。请先导出记录，再恢复备份或重新启航。</p>' : ""}
      <fieldset class="reading-settings"><legend>阅读字号</legend><div>${[["normal", "标准"], ["large", "大字"], ["larger", "特大"]].map(([id, label]) => `<button class="outline" ${action("reading-size", id)} aria-pressed="${reading.size === id}">${label}</button>`).join("")}</div><p>仅改变这台设备的显示，航线进度独立保存。</p></fieldset>
      <div class="settings-links"><button ${action("export")}>导出当前航线</button><button ${action("raw-export")}>导出本机原始记录</button><button ${action("import")} ${conflicted ? "disabled" : ""}>导入记录</button><input id="import-file" type="file" accept=".json,application/json" hidden></div>
      ${backupPanel()}
      ${state.legacyArchive ? "<p>继承的旧航站记录已完整封存。原版的远征和活动奖励可在旧版继续处理。</p>" : ""}
      <div class="settings-links"><a href="../">返回旧版航站</a><button ${action("legacy")}>继承本机旧航站</button><button ${action("reset")}>重新启航</button></div>
      <details class="timing-panel"><summary>本机航线用时</summary><p>前台用时按页面可见的秒数记录；航线用时包含已结算的离线时间。${state.timing.late ? "从本版本接续后开始记录，历史用时不补写。" : "记录从这条新航线启航时开始。"} 记录随导出文件保存。</p><p data-timing-total></p><table><caption>${state.timing.late ? "本版本首次记录" : "首次抵达"}</caption><thead><tr><th scope="col">节点</th><th scope="col">前台用时</th><th scope="col">航线用时</th></tr></thead><tbody>${[
        ["drone", "建造无人机"],
        ["research", "完成研究"],
        ["report", "领取报告"],
        ["prestige", "完成跃迁"],
      ]
        .map(
          ([id, label]) =>
            `<tr><th scope="row">${label}<small data-timing-source="${id}"></small></th><td data-timing-active="${id}"></td><td data-timing-elapsed="${id}"></td></tr>`,
        )
        .join("")}</tbody></table></details>
      <p><small>拾荒航线 ${D.GAME_VERSION} · 离线结算最多 ${D.OFFLINE_SECONDS / 3600} 小时。故事选择不会自动代选。</small></p>`,
    );
    updateNumbers();
  }
  $("#settings-button").addEventListener("click", settings);
  function navigate(target, focusId) {
    if (!E.reachable(state, target)) return;
    page = target;
    signature = "";
    render();
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
    if (focusId) {
      const destination = document.getElementById(focusId);
      if (destination?.matches("details")) destination.open = true;
      for (
        let parent = destination?.parentElement;
        parent;
        parent = parent.parentElement
      )
        if (parent.matches("details")) parent.open = true;
      if (destination && !destination.matches("button, input, select, summary, a, [tabindex]")) destination.tabIndex = -1;
      destination?.focus({ preventScroll: true });
      destination?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }
  function starportOverview() {
    if (!state.starport) return "";
    const focus = D.PORT_FOCUSES.find((p) => p.id === state.council.priority);
    const facilities = E.portFacilities(state), nodes = facilities.filter(n => n.kind === "core"), activity = E.portActivity(state);
    return `<section class="starport-overview" id="starport-overview" aria-label="星港总览"><div class="section-title"><h2>归航星港</h2><span>${state.epilogue.ending ? "居民开始新的日常" : `已接回 ${state.rescue.completed.length} / 3 支救援船队`}</span></div><div class="port-atlas" data-port-focus="${focus?.id || "none"}"><svg viewBox="0 0 600 ${state.epilogue.ending ? 420 : 310}" role="group" aria-label="星港建设示意图，亮起的节点表示已完成建设"><path class="atlas-orbit" d="M110 68 300 160 490 68M110 250 300 160 490 250"/>${nodes.map((n) => `<g transform="translate(${n.x} ${n.y})" class="atlas-node ${n.live ? "is-built" : ""}" data-port-node="${n.id}" data-built="${n.live}" ${action("port-region", n.id)} role="button" tabindex="0" aria-label="${n.name} · ${n.status}"><title>${n.name} · ${n.status}</title><circle r="42"/><path d="${n.shape}"/></g>`).join("")}${facilities.filter(n => n.kind !== "core").map(n => `<g class="atlas-extension ${n.live ? "is-built" : ""}" transform="translate(${n.x} ${n.y})" data-facility="${n.id}" data-built="${n.live}" ${action("port-region", n.id)} role="button" tabindex="0" aria-label="${n.name} · ${n.status}"><title>${n.name} · ${n.status}</title><circle r="22"/><path d="${n.shape}"/>${n.kind === "longterm" ? `<text y="36" text-anchor="middle" class="atlas-level">${n.level}/3</text>` : ""}</g>`).join("")}${activity.firstConvoy ? '<g class="atlas-regular-arrival" aria-label="第三章第一支船队已抵达"><path d="M239 235l8-12 8 12-8-3z"/></g>' : ""}${activity.residents ? '<g class="atlas-residents" aria-label="已抵达居民的共同值班"><circle cx="280" cy="191" r="3"/><circle cx="290" cy="195" r="3"/><path d="M280 196v7M290 200v7"/></g>' : ""}<g class="atlas-arrivals" aria-hidden="true">${state.rescue.completed.map((_, i) => `<path d="M${268 + i * 32} 235l8-12 8 12-8-3z"/>`).join("")}</g></svg><div class="atlas-caption"><strong>${focus ? focus.name : "第一束光已接通"}</strong><p>${focus ? focus.id === "reception" ? "轮班接待区与候泊联络围绕中枢展开。" : focus.id === "ecology" ? "两港种植记录在育种舱汇合，灯光按植物需要轮换。" : "每一段航路与交接记录都能找到来源。" : "每一次修复和建设，都会在这张图上留下变化。"}</p></div></div><div class="atlas-legend">${nodes.map((n) => `<button class="text-button" ${action("nav", "explore")} data-goal-focus="${n.live || n.id === "hub" ? n.target : "route-archive"}"><span class="atlas-dot ${n.live ? "is-built" : ""}"></span>${n.name}<small>${n.status || (n.live ? "已建成" : "待建设")}</small></button>`).join("")}</div><div class="facility-controls">${facilities.map(n => `<button class="text-button" ${action("port-region", n.id)}>查看${n.name}状态</button>`).join("")}</div><p class="port-activity">${activity.transport} · 已到港船队 ${Number(activity.firstConvoy) + activity.rescued} 支</p>${state.epilogue.ending ? `<button class="outline" ${action("nav", "explore")} data-goal-focus="resident-requests">看看居民的新委托</button>` : ""}</section>`;
  }
  function showPortRegion(id) {
    const region = E.portFacilities(state).find(n => n.id === id);
    if (!region) return;
    const goal = E.nextGoal(state);
    openDialog(`${region.name} · ${region.status}`, `<p>${escape(region.benefit)}</p><p>已完成建设：${region.live ? escape(region.name) : "本区域尚未完工"}</p><p>对应剧情：${region.record ? escape(region.record.title) : "尚无可归档的已完成记录"}</p><p>下一项可达工作：${escape(goal.title)}。${escape(goal.detail)}</p><div class="dialog-actions"><button ${action("region-go", region.target)}>查看对应工程</button>${region.record ? `<button ${action("region-go", `read-archive-scene-${region.record.id}`)}>重读剧情记录</button>` : ""}<button class="primary" ${action("region-next")}>${goal.label}</button></div>`);
  }
  document.addEventListener("keydown", event => {
    const region = event.target.closest?.('g[data-action="port-region"], g[data-action="sector-select"]');
    if (region && ["Enter", " "].includes(event.key)) { event.preventDefault(); if(region.dataset.action === "sector-select") { E.setSurveyPriority(state,region.dataset.id); save(); render(); } else showPortRegion(region.dataset.id); }
  });
  function quote(id) {
    return E.purchasePreview(
      state,
      id,
      buyMode === "max" ? "max" : Number(buyMode),
    );
  }
  function showReturn(report = lastReturnReport) {
    if (!report) return;
    lastReturnReport = report;
    const pending = state.result;
    const signed = (value) =>
      `${value > 0 ? "+" : value < 0 ? "−" : ""}${number(Math.abs(value))}`;
    const changes = [
      ...(report.continuationChanges || []),
      ...(report.harborChanges || []),
      ...report.buildings.map(
        (b) =>
          `${D.BUILDINGS.find((item) => item.id === b.id).name} +${b.count} 艘`,
      ),
      ...report.research.map(
        (id) => `完成研究：${D.RESEARCH.find((r) => r.id === id).name}`,
      ),
      ...report.modules.map(
        (m) =>
          `${D.MODULES.find((item) => item.id === m.id).name}升至 ${m.level} 级`,
      ),
    ];
    openDialog(
      "归航简报",
      `<p>离开期间，航站运行了 ${duration(report.seconds)}${report.capped ? "（已达到 8 小时结算上限）" : ""}。</p>
      <dl class="return-totals"><div><dt>生产与回收收入</dt><dd>${number(report.dust)} 星尘</dd></div><div><dt>自动建造与研究支出</dt><dd>${number(report.spentDust)} 星尘</dd></div><div><dt>星尘净变化</dt><dd>${signed(report.netDust)} 星尘</dd></div></dl>
      <p>样本 ${signed(report.samples)} 份 · 探索归航 ${report.missionsCompleted} 次 · 自动领取 ${report.reportsClaimed} 次</p>
      ${changes.length ? `<ul class="return-changes">${changes.map((text) => `<li>${text}</li>`).join("")}</ul>` : "<p>舰队按原配置持续运行。</p>"}
      ${pending?.story ? `<p class="return-pending">「${D.STORIES[pending.story].title}」等待你的选择。</p>` : pending ? '<p class="return-pending">一份归航报告等待领取。</p>' : ""}
      <div class="return-ready"><h3>现在可以安排</h3>${E.arrivalTasks(state).map(text => `<p>${escape(text)}</p>`).join("") || "<p>所有已完成内容均已入库。</p>"}<p>推荐：${escape(E.nextGoal(state).title)}</p></div>
      <div class="dialog-actions"><button ${action("cancel")}>留在航站</button><button class="primary" ${action("return-next")}>${state.result ? "处理归航报告" : "查看下一个目标"} →</button></div>`,
    );
    signature = "";
    render();
  }
  function addAbsence(report) {
    if (!absence) return;
    for (const key of [
      "seconds",
      "dust",
      "spentDust",
      "missionsCompleted",
      "reportsClaimed",
    ])
      absence.totals[key] += report[key] || 0;
    absence.totals.capped ||= report.capped;
  }
  function tutorialFeedback() {
    const guide = E.onboarding(state);
    return guide ? `<p class="guide-feedback">启航 ${guide.completed} / ${guide.total} · ${guide.feedback}</p>` : "";
  }
  function currentGoal() {
    const g = E.nextGoal(state);
    return `<aside class="current-goal" aria-label="当前主要目标"><div><small>当前目标</small><strong>${g.title}</strong><p data-goal-detail>${g.detail}</p><small data-goal-eta></small></div><button class="outline" ${action("current-goal")}>${g.label} →</button></aside>`;
  }
  function harborHome() {
    if (!state.epilogue.ending) return "";
    const h = state.management;
    return `<section class="harbor-home"><h2>星港的这一班</h2><p>已交付 ${h.stats.deliveries} 份需求 · 长期工程 ${Object.values(h.projects).reduce((a, b) => a + b, 0)} / 15 期 · 回信 ${h.collections.length} / 12</p>${h.history.slice(0, 3).map(r => `<p>${D.HARBOR_NEEDS.find(n => n.id === r.id).name}已完成，回信已归档。</p>`).join("") || "<p>居民值班组已经准备好下一轮需求，三个结局均可接续。</p>"}<button class="outline" ${action("nav", "explore")} data-goal-focus="harbor-management">规划港务与查看近期变化</button><button class="outline" ${action("nav","explore")} data-goal-focus="long-voyages">编排长期远航与查看收藏</button></section>`;
  }
  function home() {
    const goal = E.nextGoal(state),
      recent = state.journal.slice(0, 3);
    return `${lastReturnReport ? `<section class="return-banner"><div><strong>上次归航简报</strong><p>${duration(lastReturnReport.seconds)} · 探索归航 ${lastReturnReport.missionsCompleted} 次</p></div><button class="outline" ${action("return-report")}>查看简报</button></section>` : ""}<div class="home-layout"><section class="scene" aria-label="归航航站"><div class="scene-heading"><h1>在寂静里，重建航线。</h1><p>一次扫描，一艘无人机，一段更远的旅程。</p></div>
      <button class="beacon-button" ${action("beacon")} ${state.beacon.expiresAt ? "" : "hidden"}>捕获金色信标<small>剩余 <span data-beacon-seconds>15</span> 秒</small></button>
      <div class="scan-area"><button id="scan-control" class="primary scan-button" ${action("scan")}>${icon("scan")}扫描信标 <strong>+<span data-scan-value>2</span> 星尘</strong></button><p>无人机启动后，离线也会继续生产。</p></div></section>
      <aside class="goal-rail"><h2 class="rail-heading">下一个目标</h2>${tutorialFeedback()}<h2 id="next-goal-title">${goal.title}</h2><p data-goal-detail>${goal.detail}</p><p class="goal-eta" data-goal-eta></p><div class="goal-meter"><div><strong data-goal-value>0</strong> / <span>${number(goal.target)}</span></div><div class="progress" role="progressbar" aria-label="下一个目标进度" aria-valuemin="0" aria-valuemax="100" data-goal-progress><span></span></div></div><button class="outline" ${action("nav", goal.action)} data-goal-focus="${goal.focus || ""}">${E.actionCenter(state).primaryRepresented?"查看完整条款与进度":goal.label} →</button>
      <div class="journal"><h3>航站日志</h3>${recent.length ? recent.map((r) => `<p>${escape(r.text)}</p>`).join("") : "<p>航站仍在沉默中，但远处的星光从未熄灭。</p><p>每一块漂泊的残骸，都能让航线再向前延伸一点。</p>"}</div></aside></div>
      ${state.buildings.drone ? `<div class="quick-row"><h3>拾荒无人机</h3><span>${state.buildings.drone} 艘</span><span>基础每艘 +0.8 星尘/秒</span><button class="outline" ${action("buy", "drone")} data-buy-id="drone"></button></div>` : ""}${state.discoveries>=3?`<p><button class="outline" ${action("nav","explore")} data-goal-focus="sector-atlas">查看星区图谱 · ${state.atlas.nodes.length}/9</button></p>`:""}${readyActions()}${starportOverview()}${communityScene()}${honorsHome()}${sceneRecord(E.storyScene(state, "awakening"), "home-awakening")}`;
  }
  function routePanel() {
    const route = D.ROUTES.find((r) => r.id === state.run.route);
    if (state.run.routeChosen)
      return `<div class="route-active"><h3>${route.name} · ${route.subtitle}</h3><p>${route.detail} 跃迁后可以重选。</p></div>`;
    if (!state.buildings.drone) return "";
    return `<div class="section-title"><h2>这一航次，向哪里去？</h2><small>只选一次</small></div><div class="route-choices" id="route-choices" tabindex="-1">${D.ROUTES.map((r) => `<div class="route-option"><h3>${r.name}</h3><p>${r.detail}</p><button class="outline" ${action("route", r.id)}>选择</button></div>`).join("")}</div>`;
  }
  function automation() {
    if (!E.capability(state, "autoBuy"))
      return `<p class="empty">第一次跃迁后，会有无人机替你继续购买设施。</p>`;
    return `<section class="automation"><h3>舰队自动化</h3><div class="control-row"><label><input type="checkbox" data-config="enabled" data-focus="config-enabled" ${state.automation.enabled ? "checked" : ""}>自动购买 · 每秒购买 1 艘</label></div>
      ${E.capability(state, "planning") ? `<div class="control-row"><label>购买策略 <select data-config="policy" data-focus="config-policy"><option value="balanced" ${state.automation.policy === "balanced" ? "selected" : ""}>产量回本优先</option><option value="milestone" ${state.automation.policy === "milestone" ? "selected" : ""}>接近里程碑优先</option><option value="advanced" ${state.automation.policy === "advanced" ? "selected" : ""}>高级设施优先</option></select></label><label>保留星尘 <input data-config="reserve" data-focus="config-reserve" type="number" min="0" max="1000000000000" step="100" value="${state.automation.reserve}"></label></div>` : "<p><small>第二次跃迁后可设置购买优先级与保留预算。</small></p>"}
      ${E.capability(state, "autoResearch") ? `<div class="control-row"><label><input type="checkbox" data-config="research" data-focus="config-research" ${state.automation.research ? "checked" : ""}>自动研究 · 每 5 秒完成一项可负担科技</label></div>` : ""}
      ${E.capability(state, "autoDispatch") ? `<div class="control-row"><label><input type="checkbox" data-config="dispatch" data-focus="config-dispatch" ${state.automation.dispatch ? "checked" : ""}>重复派遣${D.MISSIONS.find((m) => m.id === state.repeatId).name} · 新故事出现时暂停</label></div>` : ""}</section>`;
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
            `<div class="building-row" id="building-${b.id}" tabindex="-1"><div><h3>${b.name}</h3><p>${b.detail}</p><div class="milestone-track">${D.MILESTONES.map((n) => `<span class="${state.buildings[b.id] >= n ? "achieved" : ""}">${n} 艘 ×2</span>`).join("")}</div></div><div class="building-stats"><strong>${state.buildings[b.id]} 艘</strong><small>本设施基础 ${number(b.rate * state.buildings[b.id] * E.milestone(state.buildings[b.id]))} / 秒</small></div><div class="row-action"><button class="outline" ${action("buy", b.id)} data-buy-id="${b.id}"></button><small class="purchase-gain" data-buy-effect="${b.id}"></small><small data-buy-payback="${b.id}"></small><small data-buy-wait="${b.id}"></small><small>下个里程碑 ${D.MILESTONES.find((n) => n > state.buildings[b.id]) || "已完成"}</small></div></div>`,
        )
        .join(
          "",
        )}</section><p class="estimate-note">增产包含路线、研究、舰装和里程碑；回本按常态产量估算。等待时间按现有舰队估算，自动购买与研究会使用星尘，实际等待会变化。</p>
      ${
        state.run.dust >= 40
          ? `<section><div class="section-title"><h2>航站研究</h2><small>本航次有效</small></div>${D.RESEARCH.filter(
              (r) => state.run.dust >= r.unlock,
            )
              .map(
                (r) =>
                  `<div class="research-row" id="research-${r.id}" tabindex="-1"><div><h3>${r.name}</h3><p>${r.detail}</p></div><small>${number(r.cost)} 星尘</small><div class="row-action"><button ${action("research", r.id)} ${state.research.includes(r.id) ? "disabled" : `data-min-dust="${r.cost}"`}>${state.research.includes(r.id) ? "已完成" : "研究"}</button></div></div>`,
              )
              .join("")}</section>`
          : ""
      }
      ${automation()}</div>`;
  }
  function sceneLines(lines) {
    return `<div class="scene-transcript">${lines.map((line) => `<div class="scene-line"><strong>${escape(line.speaker)}</strong><p>${escape(line.text)}</p></div>`).join("")}</div>`;
  }
  function sceneRecord(scene, key) {
    if (!scene) return "";
    return `<details class="story-scene" data-details-key="${key}"><summary data-focus="${key}">展开通信记录 · ${escape(scene.title)}</summary><p class="scene-location">${escape(scene.location)}</p>${sceneLines(scene.lines)}${scene.response.length ? `<h4>你的选择 · ${escape(scene.choice)}</h4>${sceneLines(scene.response)}` : ""}</details>`;
  }
  function sceneAfterword() {
    if (!recentStory || state.mission || state.result) return "";
    const scene = E.storyScene(state, recentStory);
    if (!scene?.response.length) return "";
    const goal = E.nextGoal(state);
    return `<section class="scene-afterword" aria-label="选择回响"><span class="scene-location">选择回响 · ${escape(scene.choice)}</span><h2>${escape(scene.title)}</h2>${sceneLines(scene.response)}<div class="scene-actions"><button class="outline" ${action("nav", goal.action)} data-goal-focus="${goal.focus || ""}">${goal.label} →</button><button class="text-button" ${action("scene-read", scene.id)}>重读完整通信</button><button class="text-button" ${action("scene-dismiss")}>收起回响</button></div></section>`;
  }
  function missionReport() {
    if (!state.result) return sceneAfterword();
    const r = state.result,
      story = r.story && D.STORIES[r.story];
    const text = story ? E.storyText(state, r.story) : r.succeeded ? "探索船安全归航，回收物已经送达。" : "裂隙干扰超出预期，探索船安全撤回，带回 1 份样本。";
    const summary = text.split(/(?<=[。！？])/)[0];
    return `<section class="report" id="report" tabindex="-1" aria-label="归航报告"><h2>${story ? story.title : D.MISSIONS.find((m) => m.id === r.id).name + " · 归航报告"}</h2><p class="report-summary">${escape(summary)}</p><p class="report-reward">回收 ${number(r.dust)} 星尘 · ${r.samples} 份样本${r.module ? ` · 舰装「${D.MODULES.find((m) => m.id === r.module).name}」` : ""}</p><p class="report-next">${story ? "下一步：阅读发现并选择回应，领取后永久记录。" : state.afterword.active && r.id === "supply-run" ? "下一步：领取补给，再回居民委托留下回信。" : "下一步：领取回收物，继续当前航线。"}</p>${story ? `<details class="report-discovery" data-details-key="report-discovery-${r.story}"><summary>阅读完整发现</summary><p>${escape(text)}</p></details>` : ""}
      ${story ? sceneRecord(E.storyScene(state, r.story), `report-scene-${r.story}`) : ""}${story ? story.choices.map((c) => `<button class="story-choice" ${action("claim", c.id)}><strong>${c.name}</strong><small>${c.detail}</small></button>`).join("") : `<button class="primary" ${action("claim")}>收取回收物</button>`}</section>`;
  }
  function chapterMap() {
    if (state.starport < D.PORT.length) return "";
    const complete = state.chapter.length === D.PROJECTS.length;
    const sector = (p) => {
      const i = D.PROJECTS.indexOf(p);
      const m = D.MISSIONS.find((item) => item.id === p.mission),
        lock = E.missionLock(state, m.id);
      const preview = E.missionPreview(state, m.id),
        offer = E.projectOffer(state, p.id);
      const known = state.lore.some((r) => r.story === p.story);
      return `<article class="sector ${offer.built ? "connected" : "current-sector"}" id="mission-${m.id}" tabindex="-1"><span class="sector-status">0${i + 1} · ${offer.built ? "已连通" : lock ? "等待航路条件" : known ? "故事已记录" : "信号已定位"}</span><h3>${m.name}</h3><p>${m.detail}</p><p class="sector-metrics">${duration(preview.seconds)} · 分流 ${Math.round(preview.diversion * 100)}%<br>安全回收 ${number(preview.dust)} 星尘 · ${preview.samples} 份样本</p>${lock ? `<p class="blueprint-lock">${lock}</p>${prerequisiteButton(m.id)}` : ""}${voyageComparison(m.id)}<button class="outline" ${action("mission", m.id)} ${lock || state.mission || state.result || state.atlas.active || state.expeditions.active || state.continuation.reviews.active || state.run.dust < 600 ? "disabled" : ""}>${known ? "再次安全探索" : "安全派遣"}</button><div class="sector-project" id="project-${p.id}" tabindex="-1"><h4>${p.name}${offer.built ? " · 已建成" : ""}</h4><p>${p.detail}</p>${offer.built ? "<small>永久效果已生效 · 跃迁保留</small>" : `<p>${p.cores} 星核 + ${p.samples} 样本<br>当前 ${number(state.cores)} 星核 · ${number(state.samples)} 样本</p>${known ? "" : "<small>先处理这个星域的首次故事。</small>"}<button ${action("project", p.id)} ${offer.available ? "" : "disabled"}>建设${p.name}</button>`}</div></article>`;
    };
    const remaining = D.PROJECTS.filter((p) => !state.chapter.includes(p.id));
    const completed = D.PROJECTS.filter((p) => state.chapter.includes(p.id));
    return `<section class="chapter-map" aria-label="远航星图"><div class="section-title"><div><small>第二章${complete ? " · 已完成" : " · 当前航段"}</small><h2>远航星图</h2></div><span>永久建设 ${state.chapter.length} / ${D.PROJECTS.length}</span></div>
      ${remaining.length ? `<p>先接续当前星域。所有旧选择都能继续这条航线。</p>${sector(remaining[0])}` : ""}
      ${remaining
        .slice(1)
        .map(
          (p) =>
            `<details data-details-key="sector-${p.id}"><summary data-focus="sector-${p.id}">后续星域 · ${D.MISSIONS.find((m) => m.id === p.mission).name}</summary>${sector(p)}</details>`,
        )
        .join("")}
      ${completed.length ? `<details class="completed-sectors" data-details-key="completed-sectors"><summary data-focus="completed-sectors">已连通星域 · ${completed.length} / 3 · 展开重访</summary><div class="sector-grid">${completed.map(sector).join("")}</div></details>` : ""}
      ${complete ? `<p class="chapter-complete">${D.PROJECTS.at(-1).text} ${E.campaignMission(state) ? "白噪声海的第一支来船正在等待交接。" : "两港补给线已经连通。"}</p>` : ""}</section>`;
  }
  function prerequisiteButton(id) {
    const goal = E.missionPrerequisite(state, id);
    return goal && E.reachable(state, goal.action)
      ? `<button class="outline prerequisite-link" ${action("nav", goal.action)} data-goal-focus="${goal.focus}">${goal.label} · ${goal.title} →</button>`
      : "";
  }
  function campaignPanel() {
    if (!state.chapter.includes("lighthouse")) return "";
    const m = E.campaignMission(state),
      count = state.campaign.completed.length;
    const header = `<div class="section-title"><div><small>第三章 · ${m ? "当前航段" : "已完成"}</small><h2>白噪声海</h2></div><span>交接 ${count} / 3</span></div>`;
    const archiveLink = `<button class="outline" ${action("nav", "explore")} data-goal-focus="route-archive">查看航线与人物档案 →</button>`;
    if (!m)
      return `<details class="campaign-panel campaign-complete" aria-label="白噪声海" data-details-key="chapter-three"><summary data-focus="chapter-three">第三章已完成 · 展开白噪声海交接记录</summary>${header}<h3>第一支船队已经安全进港。</h3><p>两港补给线永久开放，可手动探索，也可重复派遣。阿遥开始第一班值守，祁岳交出了能接班的记录。</p><p>第三章的来信与选择已经归档。第四章将一起核对接待、生态与航路记录，为仍在等待的三支船队准备。</p>${archiveLink}</details>`;
    const stages = D.MISSIONS.filter((item) => item.campaign);
    return `<section class="campaign-panel" aria-label="白噪声海">${header}<ol class="campaign-stages">${stages.map((item, i) => `<li ${i === count ? 'aria-current="step"' : ""}>${i < count ? "✓" : `0${i + 1}`} ${item.name}</li>`).join("")}</ol>${preparedVoyage(m, state.campaign)}</section>`;
  }
  function preparedVoyage(m, track) {
    const archiveLink = `<button class="outline" ${action("nav", "explore")} data-goal-focus="route-archive">查看航线与人物档案 →</button>`;
    const lock = state.mission?.id === m.id ? "" : E.missionLock(state, m.id),
      busy = Boolean(state.mission || state.result || state.atlas.active || state.expeditions.active || state.continuation.reviews.active);
    const selected = track.preparation?.id === m.id && track.preparation.plan;
    return `<article id="mission-${m.id}" tabindex="-1"><h3>${m.name}</h3><p>${m.detail}</p><p>所有方案都是安全航程。派遣前比较准备方案；没有倒计时惩罚，归航后等你决定。</p>${lock ? `<p class="blueprint-lock">${lock}</p>${prerequisiteButton(m.id)}` : ""}
      ${voyageComparison(m.id)}<div class="preparation-grid" aria-label="航前准备方案">${D.EXPEDITION_PLANS.map(
        (plan) => {
          const p = E.missionPreview(state, m.id, plan.id);
          return `<button class="preparation-option" ${action("prepare", plan.id)} data-mission="${m.id}" aria-pressed="${selected === plan.id}" ${lock || busy ? "disabled" : ""}><strong>${plan.name}</strong><span>${plan.detail}</span><span>${duration(p.seconds)} · 分流 ${Math.round(p.diversion * 1000) / 10}%</span><span>${number(p.dust)} 星尘 · ${p.samples} 样本</span></button>`;
        },
      ).join("")}</div>
      <p id="preparation-status" role="status">${selected ? `已准备：${D.EXPEDITION_PLANS.find((p) => p.id === selected).name}。派遣时锁定航程与回收，刷新保留。` : busy ? "当前探索与报告处理后，再安排这一段航程。" : "先选择一种准备方案，再派遣。"}</p>
      <div class="campaign-actions"><button class="primary" ${action("mission", m.id)} ${lock || busy || !selected || state.run.dust < 600 ? "disabled" : ""}>派遣${m.name}</button>${archiveLink}</div></article>`;
  }
  function councilPanel() {
    if (E.campaignMission(state) || !state.chapter.includes("lighthouse"))
      return "";
    const m = E.councilMission(state),
      focus = D.PORT_FOCUSES.find((p) => p.id === state.council.priority),
      count = state.council.completed.length + (focus ? 1 : 0);
    const header = `<div class="section-title"><div><small>第四章 · ${m ? "当前安排" : "已完成"}</small><h2>谁的归航权</h2></div><span>准备 ${count} / 4</span></div>`;
    const archiveLink = `<button class="outline" ${action("nav", "explore")} data-goal-focus="route-archive">重读两港记录与人物来信 →</button>`;
    if (!m)
      return `<details class="campaign-panel council-panel council-complete campaign-complete" aria-label="谁的归航权" data-details-key="chapter-four"><summary data-focus="chapter-four">第四章已完成 · 展开两港准备记录</summary>${header}<h3>把承诺交给下一班。</h3><p>${focus.name}已建成。双向中继、备用泊位与暂停条件完成演练，所有记录永久保留。</p><p>第五章《没有唯一灯塔》的救援已开放，可以逐队确认并接引。你可以继续生产与两港补给，离线不会导致剧情失败。</p>${archiveLink}</details>`;
    const phases = [
      "双港会议与离港日志",
      "港口建设重点",
      "旧观测站修复",
      "分段接续演练",
    ];
    const building = m.requiresPortFocus && !focus;
    const focusStatus = focus
      ? `<div class="port-focus-built" id="port-focus" tabindex="-1"><strong>永久建设 · ${focus.name}</strong><p>${focus.detail}</p><small>以下预览已包含建设效果，所有救援方向都能继续。</small></div>`
      : "";
    const construction = `<article id="port-focus" tabindex="-1"><h3>先把承诺建起来</h3><p>三种方向均使用 18 份样本。选择一项永久建设，跃迁后保留；所有方向都能完成救援和抵达终章。</p><p>当前 ${number(state.samples)} 份样本${state.samples < 18 ? " · 可通过两港补给收集" : ""}</p><div class="port-focus-grid">${D.PORT_FOCUSES.map(
      (p) => {
        const offer = E.portFocusOffer(state, p.id),
          preview = E.missionPreview(
            { ...state, council: { ...state.council, priority: p.id } },
            m.id,
            "relay",
          );
        return `<div class="port-focus-option"><h4>${p.name}</h4><p>${p.detail}</p><p class="focus-example">下一段采用分段接续：${duration(preview.seconds)} · 分流 ${Math.round(preview.diversion * 1000) / 10}% · ${preview.samples} 样本</p><button class="outline" ${action("port-focus", p.id)} ${offer.available ? "" : "disabled"}>建设 · ${p.samples} 样本</button></div>`;
      },
    ).join(
      "",
    )}</div>${state.samples < 18 ? prerequisiteButton(m.id) : ""}</article>`;
    return `<section class="campaign-panel council-panel" aria-label="谁的归航权">${header}<ol class="campaign-stages">${phases.map((p, i) => `<li ${i === count ? 'aria-current="step"' : ""}>${i < count ? "✓" : `0${i + 1}`} ${p}</li>`).join("")}</ol>${focusStatus}${building ? construction : preparedVoyage(m, state.council)}</section>`;
  }
  function rescuePanel() {
    if (!E.rescueUnlocked(state)) return "";
    const m = E.rescueMission(state),
      count = state.rescue.completed.length,
      energy = D.RESCUE_ENERGY.find((e) => e.id === state.rescue.energy),
      busy = Boolean(state.mission || state.result || state.atlas.active || state.expeditions.active || state.continuation.reviews.active);
    const header = `<div class="section-title"><div><small>第五章 · ${state.rescue.protocol ? "已完成" : m ? "当前接引" : "协议核对"}</small><h2>没有唯一灯塔</h2></div><span>安全抵达 ${count} / 3</span></div>`;
    const stages = `<ol class="campaign-stages">${D.RESCUE_MISSIONS.map((item, i) => `<li ${i === count ? 'aria-current="step"' : ""}>${i < count ? "✓" : `0${i + 1}`} ${item.name}</li>`).join("")}</ol>`;
    const archive = `<button class="outline" ${action("nav", "explore")} data-goal-focus="route-archive">重读救援记录与人物来信 →</button>`;
    if (!m) {
      const body = `${header}${stages}<article id="keeper-protocol" tabindex="-1"><h3>${state.rescue.protocol ? "新守灯协议 · 已共同签署" : "最后一项：共同核对守灯协议"}</h3><p>先前抵达的船队结束这一班值守，等待名单上的三队全部安全入港。</p><p>${D.KEEPER_PROTOCOL}</p>${sceneRecord(E.storyScene(state, "keeper-signed", { preview: true }), "keeper-scene")}${state.rescue.protocol ? `<p class="protocol-signed">✓ 等待名单已清空，交接记录永久归档。</p><p>第六章《给未来一个地址》已开放。听完居民交接，再公开选择一个未来；所有建港方向均可抵达三种结局。</p>${archive}` : `<p>核对后由两港居民和抵达船长共同签署，不消耗资源。</p><button class="primary" ${action("keeper-protocol")} ${busy ? "disabled" : ""}>共同确认新守灯协议</button>`}</article>`;
      return state.rescue.protocol
        ? `<details class="campaign-panel rescue-panel rescue-complete campaign-complete" aria-label="没有唯一灯塔" data-details-key="chapter-five"><summary data-focus="chapter-five">第五章已完成 · 展开三队救援与协议</summary>${body}</details>`
        : `<section class="campaign-panel rescue-panel rescue-complete" aria-label="没有唯一灯塔">${body}</section>`;
    }
    const power = energy
      ? `<div class="port-focus-built" id="rescue-energy" tabindex="-1"><strong>救援供电 · ${energy.name}</strong><p>${energy.detail}</p>${sceneRecord(E.storyScene(state, "rescue-power"), "rescue-power-scene")}</div>`
      : `<article id="rescue-energy" tabindex="-1"><h3>先安排救援供电</h3><p>三种方案只作用于本章救援，确认后保留。轮换照明无需资源，所有方向都能接回三队。</p><div class="port-focus-grid">${D.RESCUE_ENERGY.map(
          (e) => {
            const offer = E.rescueEnergyOffer(state, e.id),
              preview = E.missionPreview(
                { ...state, rescue: { ...state.rescue, energy: e.id } },
                m.id,
                "relay",
              );
            return `<div class="port-focus-option"><h4>${e.name}</h4><p>${e.detail}</p><p class="focus-example">第一队 · 分段接续：${duration(preview.seconds)} · ${preview.samples} 样本</p>${offer.reason ? `<small>${offer.reason}</small>` : ""}<button class="outline" ${action("rescue-energy", e.id)} ${offer.available ? "" : "disabled"}>安排 · ${e.samples ? `${e.samples} 样本` : "无需资源"}</button></div>`;
          },
        ).join("")}</div></article>`;
    const berth = m.requiresBackupBerth
      ? `<article class="rescue-wait" id="rescue-berth" tabindex="-1"><h3>窗口关闭时，先给等待一个地址</h3><p>第二队停在核验过的备用泊位，由阿遥与轮班队照看。等待没有期限，离线不会导致失败。</p>${state.rescue.berth ? `<p>✓ 备用泊位和接班人已确认。核验下一窗口后再出发。</p>${sceneRecord(E.storyScene(state, "backup-berth"), "backup-berth-scene")}` : `<button class="outline" ${action("rescue-berth")} ${!energy || busy ? "disabled" : ""}>确认备用泊位与接班人</button>`}</article>`
      : "";
    const checks =
      state.rescue.checks?.id === m.id ? state.rescue.checks.confirmed : [];
    const confirmations = `<article id="rescue-checks" tabindex="-1"><h3>每队出发前，三方重新确认</h3><p>通信中断时停在已核验的位置。收到明确应答后再选择航前准备。</p><div class="rescue-confirmations">${D.RESCUE_CONFIRMATIONS.map((c) => `<div class="rescue-confirmation"><strong>${c.name}</strong><p>${c.detail}</p><button class="outline" ${action("rescue-check", c.id)} data-mission="${m.id}" ${!energy || busy || (m.requiresBackupBerth && !state.rescue.berth) || checks.includes(c.id) ? "disabled" : ""}>${checks.includes(c.id) ? "✓ 已确认" : "记录确认"}</button></div>`).join("")}</div><p role="status">本队三方应答：${checks.length} / 3 · 各队分别核对</p></article>`;
    return `<section class="campaign-panel rescue-panel" aria-label="没有唯一灯塔">${header}${stages}${power}${berth}${confirmations}${preparedVoyage(m, state.rescue)}</section>`;
  }
  function endingText(ending, context = "epilogue") {
    return `${ending.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}<blockquote class="ending-quote">${escape(ending.quote)}</blockquote>${sceneRecord(E.storyScene(state, `ending-${ending.id}`, { preview: true }), `${context}-ending-${ending.id}`)}`;
  }
  function epiloguePanel() {
    if (!E.epilogueUnlocked(state)) return "";
    const selected = D.ENDINGS.find((e) => e.id === state.epilogue.ending);
    const supplyFocus = state.result
      ? "report"
      : state.mission
        ? "active-mission"
        : "mission-supply-run";
    const supplyLabel = state.result
      ? "查看归航报告"
      : state.mission
        ? "查看补给进度"
        : "继续两港补给";
    const endings = [...D.ENDINGS].sort(
      (a, b) =>
        Number(b.proposal === state.council.priority) -
        Number(a.proposal === state.council.priority),
    );
    const choices = `<article id="ending-choices" tabindex="-1"><h3>${selected ? "公开尾声 · 可以重读，不会改写选择" : "这次会议，由你明确选择"}</h3><p>三个结局无需资源。先阅读尾声，再二次确认；确认后永久保留，不自动选择、不重复发奖。${selected ? "未选择的尾声仅供预览。" : "先前建设只影响提案顺序，所有选择均开放。"}</p><div class="ending-grid">${endings.map((e) => `<div class="ending-option"><small>${e.id === state.epilogue.ending ? "✓ 已选择" : e.proposal === state.council.priority ? "居民先提出的方案 · 不是默认选择" : "公开提案"}</small><h4>${e.title}</h4><p>${e.summary}</p><button class="outline" ${action("ending-preview", e.id)} ${!selected && !E.endingOffer(state, e.id).available ? "disabled" : ""}>${selected ? "重读尾声" : "阅读尾声与选择"}</button></div>`).join("")}</div></article>`;
    const residents = `<div class="epilogue-handoffs">${D.EPILOGUE_HANDOFFS.map((h) => `<details id="epilogue-${h.id}" tabindex="-1" data-details-key="epilogue-${h.id}" ${!state.epilogue.confirmed.includes(h.id) ? "open" : ""}><summary>${state.epilogue.confirmed.includes(h.id) ? "✓ " : ""}${h.title}</summary>${h.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}${sceneRecord(E.storyScene(state, `epilogue-${h.id}`, { preview: true }), `epilogue-scene-${h.id}`)}${state.epilogue.confirmed.includes(h.id) ? "<small>交接已保存 · 重读不发奖</small>" : `<button class="outline" ${action("epilogue-confirm", h.id)}>${h.label}</button>`}</details>`).join("")}</div>`;
    return `<section class="campaign-panel epilogue-panel" aria-label="给未来一个地址"><div class="section-title"><div><small>第六章 · ${selected ? "主线已完成" : "共同交接"}</small><h2>给未来一个地址</h2></div><span>居民交接 ${state.epilogue.confirmed.length} / 3</span></div>${selected ? `<article class="ending-record" id="ending-record" tabindex="-1"><small>你的永久结局</small><h3>${selected.title}</h3>${endingText(selected)}<p class="protocol-signed">✓ 六章主线已完成。生产、舰装、自由探索与跃迁继续开放；结局与全部建设跨航次保留。</p><div class="ending-actions"><button class="primary" ${action("nav", "fleet")}>继续扩建舰队</button><button class="outline" ${action("nav", "explore")} data-goal-focus="${supplyFocus}">${supplyLabel}</button><button class="outline" ${action("nav", "explore")} data-goal-focus="route-archive">回顾完整航线</button></div></article>` : D.EPILOGUE_INTRO.map((p) => `<p>${escape(p)}</p>`).join("")}<p class="epilogue-context">${escape(E.epilogueContext(state))}</p>${sceneRecord(E.storyScene(state, "future-meeting"), "future-meeting-scene")}${residents}${choices}</section>`;
  }
  function loadoutPanel() {
    if (!Object.values(state.modules).some((n) => n > 0)) return "";
    let m =
      E.campaignMission(state) ||
      E.councilMission(state) ||
      E.rescueMission(state) ||
      D.MISSIONS.find((m) => m.id === state.repeatId);
    if (
      (state.mission || state.result)?.id === m.id &&
      (m.campaign || m.council || m.rescue)
    ) {
      const stages = [
        ...D.MISSIONS.filter((m) => m.campaign),
        ...D.COUNCIL_MISSIONS,
        ...D.RESCUE_MISSIONS,
      ];
      m =
        stages[stages.findIndex((item) => item.id === m.id) + 1] ||
        D.MISSIONS.find((m) => m.id === state.repeatId);
    }
    const names = (items) =>
      items.length
        ? items
            .map(
              (id) =>
                `${D.MODULES.find((m) => m.id === id).name} ${state.modules[id]} 级`,
            )
            .join("、")
        : "空槽";
    return `<section class="loadout-panel" id="loadouts" tabindex="-1" aria-label="装备方案"><div class="section-title"><h2>装备方案</h2><small>一键切换 · 跃迁保留</small></div><p>当前装备：${names(state.equipped)}。先在随舰装备中选好，再保存到对应方案。</p><p>预览用于下一段「${m.name}」，未选择航前方案时按基础航程比较。切换会改变当前生产；已出发航程按派遣时的时间、分流和回收结算。</p><div class="loadout-grid">${D.LOADOUTS.map(
      (loadout) => {
        const items = state.loadouts[loadout.id],
          preview = E.loadoutPreview(state, loadout.id, m.id),
          matched =
            items &&
            items.length === state.equipped.length &&
            items.every((id) => state.equipped.includes(id));
        return `<article class="loadout-option"><h3>${loadout.name}${matched ? " · 使用中" : ""}</h3><p>${items ? names(items) : "尚未保存"}</p>${preview ? `<p class="loadout-metrics">常态产量 ${number(preview.rate)} / 秒<br>下一段 ${duration(preview.mission.seconds)} · 分流 ${Math.round(preview.mission.diversion * 1000) / 10}%<br>${number(preview.mission.dust)} 星尘 · ${preview.mission.samples} 样本</p>${preview.lock ? `<small>${preview.lock}</small>` : "<small>满足本航段进入条件</small>"}` : ""}<div class="loadout-actions"><button class="outline" ${action("loadout-save", loadout.id)}>保存当前装备</button><button ${action("loadout-apply", loadout.id)} ${!preview || matched ? "disabled" : ""}>使用${loadout.name}</button></div></article>`;
      },
    ).join("")}</div></section>`;
  }
  function routeArchive() {
    const archive = E.routeArchive(state);
    const sender = (id) => D.CHARACTERS.find((c) => c.id === id).name;
    const entry = (r) => `<details class="lore-entry" id="story-${r.story}" tabindex="-1" data-details-key="story-${r.story}"><summary data-focus="story-${r.story}">${r.title} · ${r.decision}</summary>${r.plan ? `<p>航前准备：${r.plan}</p>` : ""}<p>${escape(r.text)}</p>${r.scene ? `<p class="scene-location">${escape(r.scene.location)}</p>${sceneLines(r.scene.lines)}<h4>选择回响 · ${escape(r.decision)}</h4>${sceneLines(r.scene.response)}` : ""}<p>你的选择：${r.decision}。奖励已结算，重读保留原记录。</p></details>`;
    const letter = (l) => `<details data-details-key="letter-${l.id}"><summary data-focus="letter-${l.id}">${l.title} · ${sender(l.from)}</summary><p>${escape(l.text)}</p></details>`;
    const chapters = archive.chapters.map((c) => {
      const milestones = c.milestones.filter((scene) => !scene.id.startsWith("epilogue-") && !scene.id.startsWith("ending-"));
      const finale = c.number === 6
        ? `${archive.epilogueContext ? `<p>${escape(archive.epilogueContext)}</p>` : ""}${archive.handoffs.map((h) => `<details data-details-key="archive-handoff-${h.id}"><summary data-focus="archive-handoff-${h.id}">${h.title} · 已记录</summary>${h.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}${sceneRecord(E.storyScene(state, `epilogue-${h.id}`), `handoff-dialogue-archive-${h.id}`)}</details>`).join("")}${archive.ending ? `<article class="ending-record"><h3>永久结局 · ${archive.ending.title}</h3>${endingText(archive.ending, "archive")}<p>只读回顾，不消耗资源、不改写结局。</p></article>` : ""}`
        : "";
      return `<details class="archive-chapter" id="archive-chapter-${c.number}" tabindex="-1" data-details-key="archive-chapter-${c.number}" ${c.current ? "open" : ""}><summary data-focus="archive-chapter-${c.number}">第${c.number}章 · ${c.title}<small>${c.entries.length + c.milestones.length} 份记录 · ${c.letters.length} 封来信${c.current ? " · 当前" : ""}</small></summary>${c.entries.map(entry).join("")}${milestones.map((scene) => sceneRecord(scene, `archive-scene-${scene.id}`)).join("")}${finale}${c.letters.length ? `<h3>本章人物来信</h3>${c.letters.map(letter).join("")}` : ""}${!c.entries.length && !c.milestones.length ? '<p class="empty">本章已归档记录会显示在这里。待领取通信请先在归航报告中阅读。</p>' : ""}</details>`;
    }).join("");
    return `<details class="route-archive" id="route-archive" tabindex="-1" data-details-key="lore"><summary data-focus="details-lore">航线与人物档案 · ${state.lore.length} 段故事</summary><div class="archive-reading-actions"><button class="outline" ${action("archive-current")}>返回当前章节</button><button class="text-button" ${action("archive-resume")}>继续上次阅读</button></div>
      <p class="archive-current">当前：第${archive.chapter}章 · ${archive.title}${archive.complete ? ` · 主线完成 · ${archive.ending.title}` : ""}</p>
      <p>第一章 · 星港 ${state.starport} / 3　第二章 · 建设 ${state.chapter.length} / 3　第三章 · 交接 ${state.campaign.completed.length} / 3　第四章 · 准备 ${state.council.completed.length + (state.council.priority ? 1 : 0)} / 4　第五章 · 救援 ${archive.rescued} / 3</p>${archive.priority ? `<p>永久建设方向：${archive.priority}。所有救援与结局入口保留。</p>` : ""}
      <div class="archive-nav" role="navigation" aria-label="章节档案">${archive.chapters.map((c) => `<button class="outline" ${action("nav", "explore")} data-goal-focus="archive-chapter-${c.number}">第${c.number}章${c.current ? " · 当前" : ""}</button>`).join("")}</div>
      <details class="archive-people" data-details-key="archive-people"><summary data-focus="archive-people">已联系的人物 · ${archive.characters.length}</summary>${archive.characters.map((c) => `<article class="character-file"><h4>${c.name} <small>${c.role}</small></h4><p>${escape(c.text)}</p></article>`).join("") || '<p class="empty">回应远方讯息后，人物档案逐渐开放。</p>'}</details>
      ${chapters}</details>`;
  }
  function residentPanel() {
    const requests = E.residentRequests(state);
    if (!requests.length) return "";
    const ending = D.ENDINGS.find((e) => e.id === state.epilogue.ending);
    return `<section class="resident-requests" id="resident-requests" tabindex="-1" aria-label="居民委托"><div class="section-title"><h2>星港的下一封信</h2><span>收藏 ${state.afterword.completed.length} / ${requests.length}</span></div><p>${ending.title}之后，日常继续。接下委托、完成一趟两港安全补给，再亲手留下回信。没有期限，收藏与回复跨航次保留。</p>${requests.map((r) => {
      const reply = r.record && r.replies.find((x) => x.id === r.record.reply);
      return `<article class="resident-request" id="resident-${r.id}"><div><small>${r.from}</small><h3>${r.title}</h3><p>${r.record ? escape(reply.text) : r.ready ? r.arrival : r.brief}</p></div><div class="resident-request-actions">${r.record ? `<p class="resident-collection">已收藏 · ${r.collection}</p><details data-details-key="resident-letter-${r.id}"><summary>重读回信</summary><p>${escape(reply.label)}</p><p>${escape(reply.text)}</p><small>你的星港 · ${ending.title}；${D.PORT_FOCUSES.find((p) => p.id === state.council.priority)?.name || "共同建设"}</small></details>` : r.ready ? r.replies.map((x) => `<button class="outline" ${action("resident-reply", r.id)} data-reply="${x.id}">${x.label}</button>`).join("") : r.active ? `<p>已接下 · ${state.mission ? "等待本次补给归航" : "请派遣两港补给并领取报告"}</p><button class="outline" ${action("nav", "explore")} data-goal-focus="${state.result ? "report" : state.mission ? "active-mission" : "mission-supply-run"}">前往补给交接</button>` : `<button class="outline" ${action("resident-accept", r.id)} ${r.available ? "" : "disabled"}>接下委托</button><small>同一时间接一份；先处理当前航程。接下后暂停自动派遣。</small>`}</div></article>`;
    }).join("")}</section>`;
  }
  function voyageComparison(id) {
    const fit = E.missionFit(state, id), current = E.missionPreview(state, id);
    const names = items => items.length ? items.map(id => `${D.MODULES.find(m => m.id === id).name} ${state.modules[id]}级`).join("、") : "空槽";
    const alternate = D.LOADOUTS.find(l => state.loadouts[l.id] && state.loadouts[l.id].join(",") !== state.equipped.join(","));
    const other = alternate && E.loadoutPreview(state, alternate.id, id);
    const signed = n => `${n > 0 ? "+" : ""}${Math.round(n * 10) / 10}`;
    return `<div class="voyage-comparison"><small>当前装备：${names(state.equipped)}</small><p>${fit.labels.length ? fit.labels.join("；") : "此组合无额外任务适配，使用基础回收与既有舰装效果。"}</p>${other ? `<small>对比「${alternate.name}」：航程 ${signed(other.mission.seconds - current.seconds)}秒 · 分流 ${signed((other.mission.diversion - current.diversion) * 100)}个百分点 · 星尘 ${signed(other.mission.dust - current.dust)} · 样本 ${signed(other.mission.samples - current.samples)}${other.lock ? ` · 条件：${other.lock}` : ""}</small><button class="text-button" ${action("loadout-quick", alternate.id)}>切换${alternate.name}</button>` : `<small>在装备方案中保存另一套配置后，可在此对比实际差异。</small>`}</div>`;
  }
  function deepComparison(id,choice,context='main') {
    const p=E.voyagePreview(state,id,choice),names=items=>items.map(x=>D.MODULES.find(m=>m.id===x).name).join('、')||'空槽';
    const other=D.LOADOUTS.find(l=>state.loadouts[l.id]&&state.loadouts[l.id].join(',')!==state.equipped.join(','));
    const rows=E.longVoyageComparison(state,id,choice),signed=n=>`${n>0?'+':''}${number(n)}`;
    const env=p.condition&&D.VOYAGE_CONDITIONS.find(d=>d.id===p.condition),schedule=p.schedule&&D.VOYAGE_SCHEDULES.find(d=>d.id===p.schedule);
    return `${env?`<p class="condition-preview"><strong>本次环境：${env.name}</strong> · ${env.detail}</p><p>${schedule.name}：${schedule.detail} 下次环境在本次完整归航后轮换；无失效日期。</p>`:''}${p.support?`<p>本次首段许可：${escape(reviewSupportLabel(p.support))}</p>`:''}<p>当前编成：${names(p.equipment)}</p><p>${duration(p.seconds)} · 分流 ${Math.round(p.diversion*1000)/10}% · 支出 ${number(p.dustCost)} 星尘 / ${p.costSamples} 样本</p><p>预计随船净变化 ${signed(p.dust-p.dustCost)} 星尘 / ${signed(p.samples-p.costSamples)} 样本；港内生产另计。</p><p>随船回收 ${number(p.dust)} 星尘 / ${p.samples} 样本<br>补给 ${p.suppliesBefore} → ${p.suppliesAfter} · 调查 ${p.insightBefore} → ${p.insightAfter}</p><details data-details-key="long-fits-${id}-${choice}-${context}"><summary>对比两套已保存编成与当前方案</summary><p>各项分别比较；航时、分流、费用和样本会有取舍。储能减少长航分流，集光阵减少费用，医疗设备强化居民信标，透镜强化货运回收和科研取样，导航缩短航程。出发后可以调整港内生产编成，随船回收保持出发快照。</p><div class="long-fit-comparison">${rows.map(row=>row.legal?`<article data-long-fit="${row.id}"><h4>${row.name} · ${names(row.equipment)}</h4><p>${duration(row.seconds)} · 分流 ${Math.round(row.diversion*1000)/10}%</p><p>费用 ${number(row.dustCost)} 星尘 / ${row.costSamples} 样本；随船净变化 ${signed(row.netDust)} 星尘 / ${signed(row.netSamples)} 样本</p><small>相对当前：航时 ${signed(row.seconds-p.seconds)} 秒，分流 ${signed((row.diversion-p.diversion)*100)} 个百分点，费用 ${signed(row.dustCost-p.dustCost)} 星尘；港内分流折合 ${duration(Math.round(row.portDiversionSeconds))} 满产秒数（收入随港内实际编成另计）。${escape(row.reason)}</small></article>`:`<p>${row.name}尚未保存合法双槽方案。</p>`).join('')}</div></details>${other?`<button class="text-button" ${action('deep-loadout',other.id)}>切换${other.name}</button>`:''}<small>${escape(p.reason)}</small>`;
  }
  const itineraryDrafts = {};
  let lastItineraryClock = -1;
  function planDraft(id) {
    const saved = itineraryDrafts[id] || state.continuation.plans[id]?.steps;
    return (saved || Array.from({length:4}, () => ({choice:'secure', equipment:[...state.equipped]}))).map(p => ({choice:p.choice, equipment:[...p.equipment], ...(p.preset?{preset:p.preset}:{})}));
  }
  function planEditor(id) {
    if (!state.expeditions.completed[id]) return '';
    const draft = planDraft(id), offer = E.itineraryOffer(state,id,draft), saved=state.continuation.plans[id];
    const current = saved && E.itineraryOffer(state,id,saved.steps);
    const def=D.VOYAGES.find(v=>v.id===id), same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
    const first=saved?.steps[0], firstOffer=first&&E.voyagePreview(state,id,first.choice);
    const canStart=current?.available && firstOffer.available && !state.expeditions.active && !state.encounters.pending && same(state.equipped,first.equipment);
    return `<details class="itinerary-editor" data-details-key="itinerary-${id}"><summary>四段重访安排${saved?' · 已保存':' · 首航后开放'}</summary><p>先比较四段，再保存。每次领取可按安排接续一次；离线不派遣下一段，不自动选择剧情。资源缺口按全程费用保守计算，未假设未来生产。</p>
      <button class="outline" ${action("plan-copy-first",id)}>把首段处置与编成填入其余三段草稿</button>
      ${draft.map((p,i)=>{const key=p.preset||D.LOADOUTS.find(x=>state.loadouts[x.id]&&same(state.loadouts[x.id],p.equipment))?.id || 'current';return `<fieldset><legend>${i+1} · ${def.stages[i]}</legend><label>处置<select data-plan-route="${id}" data-plan-stage="${i}" data-plan-field="choice" data-focus="plan-${id}-${i}-choice">${D.VOYAGE_METHODS.map(m=>`<option value="${m.id}" ${m.id===p.choice?'selected':''}>${m.name}</option>`).join('')}</select></label><label>编成<select data-plan-route="${id}" data-plan-stage="${i}" data-plan-field="equipment" data-focus="plan-${id}-${i}-equipment"><option value="current" ${key==='current'?'selected':''}>编辑时的当前编成</option>${D.LOADOUTS.map(l=>`<option value="${l.id}" ${key===l.id?'selected':''} ${state.loadouts[l.id]?'':'disabled'}>${l.name}</option>`).join('')}</select></label><small>${p.equipment.map(x=>D.MODULES.find(m=>m.id===x)?.name).join('、')||'空槽'} · ${offer?duration(offer.quotes[i].seconds):'请重新选择合法编成'}</small></fieldset>`;}).join('')}
      ${offer?`<p>四段合计 ${duration(offer.seconds)} · 星尘费用 ${number(offer.dustCost)} / 随船回收 ${number(offer.dust)} · 样本费用 ${offer.costSamples} / 回收 ${offer.samples}</p><p data-itinerary-gap="${id}">全程保守缺口 ${number(offer.dustGap)} 星尘 / ${offer.sampleGap} 样本；实际每段分别扣费。</p><p>${escape(offer.reason)}</p>`:''}
      <button class="outline" ${action('plan-save',id)} ${offer?.available?'':'disabled'}>保存四段安排</button>
      ${saved?`<p>${escape(current?.reason||(state.encounters.pending?'先处理等待你决定的动态发现':firstOffer?.reason)||'首段按当前条件执行，后续每次由你确认。')}</p><button class="text-button" ${action('plan-equip',id)}>套用首段编成</button><button class="primary" ${action('plan-start',id)} ${canStart?'':'disabled'}>按已保存安排开始并派遣首段</button>`:''}</details>`;
  }
  function planControls() {
    const q=E.itineraryStatus(state),a=state.expeditions.active;
    if(!q || !a) return '';
    return `<div class="itinerary-controls"><p>本次重访按已确认的四段安排接续 · ${q.paused?'已暂停':'每次接续由你确认'}</p><p>${escape(q.reason)}</p>
      ${q.ready&&!q.paused?`<button class="primary" ${action('plan-next',String(a.token))} data-stage="${a.stage}">${a.stage===3?'领取末段并归航入库':'领取本段并按安排接续'}</button>`:''}
      <button class="outline" ${action(q.paused?'plan-resume':'plan-pause',String(a.token))}>${q.paused?'恢复本次安排':'本次归航后暂停接续'}</button>${q.stage<4?`<button class="text-button" ${action('plan-restore',String(a.token))}>恢复已确认的下一段编成</button>`:''}<button class="text-button" ${action('plan-stop',String(a.token))}>改为逐段手动安排</button></div>`;
  }
  function residentLinks() {
    if(!state.epilogue.ending)return '';
    const h=state.continuation.links||{earned:[],records:[],active:null},a=E.linkStatus(state);
    const reply=r=>{const d=D.RESIDENT_LINKS.find(d=>d.id===r.id),ending=D.ENDINGS.find(d=>d.id===r.ending).title;return `<p>${escape(r.choice==='share'?d.shared:d.cared)}</p><p>这封回信属于「${ending}」之后的共同值班；正式结局没有改变。</p>`;};
    return `<section class="panel resident-links" id="resident-links" tabindex="-1"><div class="section-title"><h2>发现与居民的回响</h2><span>永久回信 ${h.earned.length}/6</span></div><p>证据、首航和居民接班一起改变今天的星港。接下后实际完成一份居民需求或一条完整远航，再选择资料用途；没有期限。</p>
      ${a?`<article class="harbor-active"><h3>${D.RESIDENT_LINKS.find(d=>d.id===a.id).name}</h3><p>${escape(a.reason)}</p><button class="outline" ${action('nav','explore')} data-goal-focus="harbor-management">接续居民需求</button><button class="outline" ${action('nav','explore')} data-goal-focus="long-voyages">安排完整远航</button><div class="review-methods">${['share','care'].map(choice=>{const q=E.linkChoiceOffer(state,a.id,choice),d=D.RESIDENT_LINKS.find(d=>d.id===a.id);return `<article><h4>${escape(choice==='share'?d.share:d.care)}</h4><p>交接支出 ${q.dustCost} 星尘 / ${q.costSamples} 样本；一次回收 ${q.dust} 星尘 / ${q.samples} 样本。</p><p>${escape(q.reason)}</p><button class="outline" ${action('link-complete',a.id)} data-link-choice="${choice}" ${q.available?'':'disabled'}>确认此用途并寄出回信</button></article>`;}).join('')}</div></article>`:''}
      <details data-details-key="resident-link-stories" ${a?'open':''}><summary>六份互动与已保存回信</summary>${D.RESIDENT_LINKS.map(d=>{const q=E.linkOffer(state,d.id);return `<article id="link-${d.id}" tabindex="-1"><h3>${q.done?'✓ ':''}${d.name}</h3><p>${escape(d.text)}</p>${q.echo?`<p>${escape(q.echo)}</p>`:''}${q.record?reply(q.record):`<p>${escape(q.reason)}</p>${!q.done?`<button class="outline" ${action('link-accept',d.id)} ${q.available?'':'disabled'}>接下这次协作</button>`:'<p>原始回信损坏，已领取标记保留，不再结算收益。</p>'}`}</article>`;}).join('')}</details></section>`;
  }

  function readyActions() {
    if(!E.reachable(state,'explore'))return '';
    const groups=E.actionCenter(state);
    const row=item=>`<article data-center-key="${item.key}"><strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p><button class="outline" ${action(item.command,item.id)} data-goal-focus="${item.focus}" ${item.stage!==undefined?`data-stage="${item.stage}"`:''}>${item.command==='nav'?'查看操作位置':'确认'+escape(item.title)} →</button></article>`;
    return `<section id="arrival-actions" class="arrival-actions action-center" aria-label="智能行动中心"><h2>行动中心</h2><div data-center-ready><h3>现在可以完成</h3>${groups.ready.slice(0,3).map(row).join('')||'<p>当前没有需要领取的报告，按上方目标继续即可。</p>'}</div><details data-details-key="action-center-more"><summary>其他安排 · 准备 ${groups.prepare.length} / 进行 ${groups.ongoing.length} / 稍后 ${groups.later.length}${groups.ready.length>3?` / 其他就绪 ${groups.ready.length-3}`:''}</summary>${groups.ready.length>3?groups.ready.slice(3).map(row).join(''):''}${[['prepare','需要准备'],['ongoing','正在进行'],['later','暂时不重要']].map(([key,title])=>`<h3>${title}</h3>${groups[key].map(row).join('')||'<p>暂无其他安排。</p>'}`).join('')}</details></section>`;
  }

  function longVoyages() {
    if(!state.epilogue.ending) return '';
    const h=state.expeditions,a=h.active,def=a&&D.VOYAGES.find(v=>v.id===a.id);
    const collectionName=id=>D.VOYAGE_COLLECTIONS.find(c=>c.id===id)?.name||id;
    return `<section class="long-voyages" id="long-voyages" tabindex="-1" aria-label="长期远航"><div class="section-title"><h2>长期远航</h2><span>已归航 ${Object.values(h.completed).reduce((n,v)=>n+v,0)} 次 · 纪念 ${h.collections.length}/13</span></div><p>已写完的六章保留在身后。沿图谱验证过的航路分段远航，每段可以换装、回收、调查或保障补给。离线可完成当前阶段；报告、下一段与最终回收始终等待你的确认。</p>
    <details data-details-key="voyage-schedules"><summary>比较三种长期经营调度</summary>${D.VOYAGE_SCHEDULES.map(q=>`<p>${q.name}：${q.detail}</p><button class="outline" ${action('voyage-focus',q.id)} aria-pressed="${state.management.focus===q.id}">采用${q.name}</button>`).join('')}</details>${reviewSupportPicker()}${a?`<article class="voyage-active">${!a.condition?'<p>旧版已编排远航：本次保留原规则与快照；下次新编排才应用环境和长期调度。</p>':''}<h3>${def.name} · 阶段 ${Math.min(4,a.stage+1)}/4</h3><ol class="voyage-stages">${def.stages.map((name,i)=>`<li ${i===a.stage?'aria-current="step"':''}>${i<a.stage?'✓ ':''}${name}</li>`).join('')}</ol><p>随船封存 ${number(a.dust)} 星尘 / ${a.samples} 样本 · 补给 ${a.supplies}/8 · 调查 ${a.insight}/4</p><p>补给为0时下一段耗时增加12%，4份以上减少6%；调查每份缩时3%、减少1个百分点分流。本次远航结束后重新编排。</p>
    ${a.condition?`<p>已锁定航行环境：${D.VOYAGE_CONDITIONS.find(d=>d.id===a.condition).name}</p>`:''}${planControls()}${a.leg?`<div class="harbor-active"><p data-deep-time></p><p>${D.VOYAGE_METHODS.find(m=>m.id===a.leg.choice).name} · 已锁定编成 ${a.leg.equipment.map(x=>D.MODULES.find(m=>m.id===x).name).join('、')||'空槽'} · 分流 ${Math.round(a.leg.diversion*100)}%</p><button class="primary" ${action('deep-claim',String(a.token))} data-stage="${a.stage}" ${state.clock>=a.leg.end?'':'disabled'}>领取阶段报告</button></div>`:a.stage===4?`<p>四段航程已全部完成。${h.completed[a.id]?'再次归航只结算本次回收与新达成的有限纪念。':'首次归航另有6份样本与航线纪念。'}</p><button class="primary" ${action('deep-finish',String(a.token))}>归航入库并封存记录</button>`:`<div class="deep-methods">${D.VOYAGE_METHODS.map(m=>{const p=E.voyagePreview(state,a.id,m.id);return `<article><h4>${m.name}</h4>${deepComparison(a.id,m.id)}<button class="outline" ${action('deep-dispatch',m.id)} data-token="${a.token}" data-stage="${a.stage}" ${p.available?'':'disabled'}>按此方案出发</button></article>`;}).join('')}</div>`}</article>`:`<div class="deep-routes">${D.VOYAGES.map(v=>{const p=E.voyagePreview(state,v.id);return `<article id="deep-route-${v.id}"><h3>${v.name}</h3><p>${v.detail}</p><p>四阶段 · 已归航 ${h.completed[v.id]||0} 次${h.best[v.id]?` · 个人最短航行 ${duration(h.best[v.id])}`:''}</p>${deepComparison(v.id,'secure')}<details data-details-key="deep-plans-${v.id}"><summary>比较三种出航方案与专用舰装</summary>${D.VOYAGE_METHODS.map(m=>`<article><h4>${m.name}</h4>${deepComparison(v.id,m.id,'methods')}</article>`).join('')}</details><button class="outline" ${action('deep-start',v.id)} ${p.available?'':'disabled'}>编排这条远航</button>${planEditor(v.id)}<button class="text-button" ${action('nav','explore')} data-goal-focus="sector-atlas">查看对应图谱</button></article>`;}).join('')}</div>`}
    <details data-details-key="deep-collections"><summary>永久远航纪念与居民来信 · ${h.collections.length}/13</summary>${h.collections.map(id=>`<article><h4>${collectionName(id)}</h4><p>${escape(D.VOYAGE_COLLECTIONS.find(c=>c.id===id).text)}</p></article>`).join('')||'<p>每条航线首次归航，以及不同的回收、调查与补给安排，留下有限纪念。收集不叠永久倍率。</p>'}</details>
    <details data-details-key="deep-first-archives"><summary>永久首航档案 · ${Object.keys(h.archives).length}/3 条航线</summary>${Object.values(h.archives).map(r=>`<article><h4>${D.VOYAGES.find(v=>v.id===r.id).name}</h4><p>首航回收 ${number(r.dust)} 星尘 / ${r.samples} 样本；首航6份样本已领取。</p>${ledgerView(r)}${r.legs.map(l=>`<p>${D.VOYAGES.find(v=>v.id===r.id).stages[l.stage]} · ${D.VOYAGE_METHODS.find(m=>m.id===l.choice).name} · ${l.equipment.map(x=>D.MODULES.find(m=>m.id===x).name+' '+l.levels[x]+'级').join('、')||'空槽'} · ${duration(l.seconds)} · ${number(l.dust)} 星尘 / ${l.samples} 样本</p>`).join('')}</article>`).join('')||'<p>首次完成每条航线后，四阶段原始记录永久保存在这里，不参与近期列表轮换。</p>'}</details>
    <details data-details-key="deep-records"><summary>远航档案 · 最近 ${h.records.length}/12 次</summary><p>累计回收 ${number(h.dust)} 星尘 / ${number(h.samples)} 样本；三条航线完成次数、个人最短航行与纪念永久保留。</p>${h.records.map(r=>`<article><h4>${D.VOYAGES.find(v=>v.id===r.id).name} · 第${r.token}航行</h4><p>最终回收 ${number(r.dust)} 星尘 / ${r.samples} 样本${r.firstBonus?` + 首航${r.firstBonus}样本`:''}</p>${ledgerView(r)}${r.legs.map(l=>`<p>${D.VOYAGES.find(v=>v.id===r.id).stages[l.stage]}：${D.VOYAGE_METHODS.find(m=>m.id===l.choice).name} · ${l.equipment.map(x=>D.MODULES.find(m=>m.id===x).name+' '+l.levels[x]+'级').join('、')||'空槽'} · ${duration(l.seconds)} · ${number(l.dust)} 星尘 / ${l.samples} 样本</p>`).join('')}</article>`).join('')}</details></section>`;
  }

  function reviewSupportLabel(id) {
    const d=D.REVIEWS.find(x=>x.id===id);return d?`${d.name} · ${d.kind==='time'?'首段航时-5%':d.kind==='cost'?'首段星尘费用-5%':'首段额外1样本'}`:'';
  }
  function reviewSupportPicker() {
    const h=state.continuation.reviews;
    if(!h.earned.length)return '';
    return `<div class="review-support"><label>航前支援许可<select data-review-support="true" data-focus="review-support" ${state.expeditions.active?'disabled':''}><option value="">本次不使用许可</option>${h.earned.filter(id=>!h.used.includes(id)).map(id=>({id})).map(r=>`<option value="${r.id}" ${h.selected===r.id?'selected':''}>${reviewSupportLabel(r.id)}</option>`).join('')}</select></label><p>每份仅能用一次，只作用于对应航线首段；未匹配航线不会消耗。${h.aid?'本次已预留：'+escape(reviewSupportLabel(h.aid.id)):''}</p></div>`;
  }
  function ledgerView(record) {
    const q=E.voyageLedger(record);if(!q)return '';
    const signed=n=>`${n>0?'+':''}${number(n)}`;
    return `<div class="voyage-ledger">${record.condition?`<p>原始航行环境：${D.VOYAGE_CONDITIONS.find(d=>d.id===record.condition).name}；调度按各段出发时锁定。</p>`:''}<p>实际航行 ${duration(q.seconds)} · 平均分流 ${Math.round(q.diversion*1000)/10}%</p><p>航段支出 ${number(q.dustCost)} 星尘 / ${q.costSamples} 样本；随船回收 ${number(q.dust)} 星尘 / ${q.samples} 样本${q.firstBonus?`，首航另 ${q.firstBonus} 样本`:''}。</p><strong>随船净变化 ${signed(q.netDust)} 星尘 / ${signed(q.netSamples)} 样本</strong><small>港内生产另计，不把挂机收入当作随船回收。分流按实际航行时长加权；停港等待不计入航时。</small></div>`;
  }
  function honorsPanel() {
    if(!state.epilogue.ending) return '';
    const claimed=state.continuation.honors.claimed,next=D.HONORS.map(d=>E.honorOffer(state,d.id)).find(q=>!q.claimed),changes=E.recentHarborChanges(state),last=state.expeditions.records[0];
    const nextStory=D.COMMUNITY_STORIES.find(d=>!state.continuation.community.completed.includes(d.id)),terms=nextStory&&D.HARBOR_FOCUSES.map(f=>({...E.communityTerms(state,nextStory.id,f.id),name:f.name}));
    return `<section class="panel" id="long-term-honors" tabindex="-1"><div class="section-title"><h2>星港长期荣誉</h2><span>陈列 ${claimed.length}/12</span></div><p>十二项有限纪念，由永久记录证明，手动陈列。没有货币、倍率、每日任务或失效日期。${next?`下一项：${next.name}（${next.value}/${next.target}）。`: '全部已陈列；仍可重访自己的航行纪录。'}</p>
      <div class="honor-showcase" aria-label="已陈列的长期荣誉">${claimed.length?claimed.map(id=>`<span>${D.HONORS.find(d=>d.id===id).name}</span>`).join(''):'第一份纪念等待你亲手放上陈列架。'}</div>
      ${last?`<details data-details-key="latest-voyage-ledger"><summary>最近完整归航 · ${D.VOYAGES.find(v=>v.id===last.id).name}收支</summary>${ledgerView(last)}</details>`:''}
      ${changes.length?`<details data-details-key="recent-harbor-changes"><summary>近期星港变化 · 最近 ${changes.length} 项</summary><ul>${changes.map(c=>`<li>${escape(c.text)}</li>`).join('')}</ul></details>`:''}
      ${terms?`<details data-details-key="management-advice"><summary>下一份协作的经营取舍</summary><p>缺星尘时考虑生产；样本少且愿意预装时考虑接待；主动安排补给时考虑探索。以下采用「${nextStory.name}」的真实报价，只供规划，不自动切换方向。</p><div class="review-methods">${terms.map(q=>`<p>${q.name}：${number(q.dustCost)} 星尘 / ${q.samplesCost} 样本；筹备 ${duration(q.workSeconds)}，或 ${q.tripsRequired} 次补给。</p>`).join('')}</div></details>`:''}
      <div class="honor-groups">${[['budget','航海收支'],['care','补给保障'],['proof','证据收藏'],['life','居民协作']].map(([group,name])=>`<details data-details-key="honors-${group}"><summary>${name} · ${D.HONORS.filter(d=>d.group===group&&claimed.includes(d.id)).length}/3</summary>${D.HONORS.filter(d=>d.group===group).map(d=>{const q=E.honorOffer(state,d.id),focus=d.focus==='sector-reviews'&&!D.SECTORS.some(c=>E.surveyCount(state,c.id)===3)?'sector-atlas':d.focus;return `<article id="honor-${d.id}" tabindex="-1"><h3>${q.claimed?'✓ ':''}${q.name}</h3><p>${q.detail}</p><p>${q.value}/${q.target} · 只保存有限纪念</p><div class="harbor-actions"><button class="outline" ${action('honor-claim',d.id)} ${q.available?'':'disabled'}>${q.claimed?'已经陈列':'亲手陈列这份纪念'}</button><button class="text-button" ${action('nav','explore')} data-goal-focus="${focus}">${focus!==d.focus?'先完成图谱调查':'查看实际进度'}</button></div></article>`;}).join('')}</details>`).join('')}</div></section>`;
  }

  function honorsHome() {
    if(!state.epilogue.ending)return '';
    const ready=D.HONORS.map(d=>E.honorOffer(state,d.id)).filter(q=>q.available),claimed=state.continuation.honors.claimed;
    return `<section class="honors-home"><h3>长期纪念陈列 ${claimed.length}/12</h3><p>${ready.length?`${ready.length} 份有限荣誉已达成，等待你亲手陈列。`:'按自己的节奏继续航行与接班；已陈列纪念永久保留。'}</p><button class="outline" ${action('nav','explore')} data-goal-focus="long-term-honors" ${E.reachable(state,'explore')?'':'disabled'}>查看荣誉、收支与近期变化</button>${E.reachable(state,'explore')?'':'<small>本航次累计获得600星尘后开放探索页。</small>'}</section>`;
  }

  function communityScene() {
    if(!state.epilogue.ending) return '';
    const h=state.continuation.community;
    return `<section class="community-scene" aria-label="居民值班区"><h3>星港里的下一班</h3><svg viewBox="0 0 360 116" role="img" aria-label="居民工作牌与已归档值班记录">${D.COMMUNITY_GROUPS.map((g,i)=>{const level=state.management.projects[g.project]||0,count=D.COMMUNITY_STORIES.filter(d=>d.group===g.id&&h.completed.includes(d.id)).length,x=i*120;return `<g transform="translate(${x},0)"><rect class="${level?'is-built':''}" x="8" y="12" width="104" height="70" rx="8"/><text x="60" y="34" text-anchor="middle">${g.id==='meals'?'食堂':g.id==='workshop'?'维修':'通信'} · 工程${level}期</text>${[0,1,2].map(n=>`<rect class="${n<count?'is-built':''}" x="${26+n*23}" y="49" width="15" height="18" rx="3"/>`).join('')}<text x="60" y="105" text-anchor="middle">值班记录 ${count}/3</text></g>`;}).join('')}</svg><p>设施轮廓来自已建工程，点亮的工作牌来自已确认居民回信。通信联络保留原有地址。${E.reachable(state,'explore')?'':'本航次累计获得600星尘后可打开探索页，已有回信继续保留。'}</p><div class="link-markers" aria-label="居民选择留下的星港变化">${(state.continuation.links?.records||[]).map(r=>{const d=D.RESIDENT_LINKS.find(d=>d.id===r.id);return `<span data-link-marker="${r.id}">${escape(r.choice==='share'?d.shared:d.cared)}</span>`;}).join('')}</div><div class="harbor-actions">${D.COMMUNITY_GROUPS.map(g=>`<button class="outline" ${action('nav','explore')} data-goal-focus="community-group-${g.id}" ${E.reachable(state,'explore')?'':'disabled'}>${g.name}</button>`).join('')}</div></section>`;
  }
  function communityPanel() {
    if(!state.epilogue.ending) return '';
    const h=state.continuation.community,a=E.communityStatus(state),missionName=id=>D.MISSIONS.find(m=>m.id===id).name;
    const route=a&&(a.routes.find(id=>!E.missionLock(state,id))||a.routes[0]);
    const supply=a&&(state.result?{action:'explore',focus:'report',label:'处理归航报告'}:state.mission?{action:'explore',focus:'active-mission',label:'查看在途探索'}:state.expeditions.active?E.voyageGoal(state):state.atlas.active?E.surveyGoal(state):state.continuation.reviews.active?E.reviewGoal(state):E.missionPrerequisite(state,route)||{action:'explore',focus:`mission-${route}`,label:'安排匹配补给'});
    const ending=state.epilogue.ending==='city'?'在归航星港接续公共生活。':state.epilogue.ending==='watch'?'值班仍以既有灯塔与安全港联络。':'两处地址各有值班，运输按既有记录交接。';
    return `<section class="panel" id="community-life" tabindex="-1"><div class="section-head"><h2>居民生活与接班</h2><span>回信 ${h.completed.length}/9</span></div><p>${ending}没有交付期限，不强制在线；生产与实际补给都能推进。</p>${communityScene()}
      ${a?`<article class="harbor-active" id="community-${D.COMMUNITY_STORIES.find(d=>d.id===a.id).group}" tabindex="-1"><h3>${D.COMMUNITY_STORIES.find(d=>d.id===a.id).name}</h3><p>${D.COMMUNITY_STORIES.find(d=>d.id===a.id).detail}</p><p>已锁定${D.HARBOR_FOCUSES.find(f=>f.id===a.mode).name}：${number(a.dustCost)} 星尘 / ${a.samplesCost} 样本。已预装 ${number(a.packedDust)} / ${a.packedSamples}；余款交接时扣除。</p><div class="harbor-actions">${['production','exploration'].map(path=>`<button class="outline" ${action('community-path',path)} data-serial="${a.serial}" aria-pressed="${a.path===path}">${path==='production'?'选择港内筹备':'选择实际补给'}</button>`).join('')}</div><p>港内工作量 <span data-community-produced>${number(a.produced)}</span> / ${number(a.productionGoal)} · <span data-community-time></span></p><progress data-community-progress aria-label="居民协作工作量" max="${a.productionGoal}" value="${a.produced}"></progress><p>匹配补给 ${a.trips}/${a.tripsRequired} 次：${a.routes.map(missionName).join('、')}，或${D.VOYAGES.find(v=>v.id===D.COMMUNITY_GROUPS.find(g=>g.id===D.COMMUNITY_STORIES.find(d=>d.id===a.id).group).voyage).name}完整归航；仅接下后出发并确认的航程计入。</p><p data-community-reason>${escape(a.reason||'准备完成，可以确认交接')}</p><div class="harbor-actions">${a.mode==='reception'?`<button class="outline" ${action('community-pack',String(a.serial))} ${a.dustLeft||a.samplesLeft?'':'disabled'}>预装当前可用资源</button>`:''}<button class="primary" ${action('community-deliver',String(a.serial))} ${a.available?'':'disabled'}>完成协作并阅读回信</button><button class="outline" ${action('nav',supply.action)} data-community-supply data-goal-focus="${supply.focus}">${supply.label}</button></div></article>`:''}
      ${!a?`<div class="community-focus"><p>下一份协作采用当前经营方向；接下后不因方向切换改变条件。</p>${D.HARBOR_FOCUSES.map(f=>`<button class="outline" ${action('community-focus',f.id)} aria-pressed="${state.management.focus===f.id}">${f.name}</button>`).join('')}</div>`:''}
      ${D.COMMUNITY_GROUPS.map(g=>{const next=D.COMMUNITY_STORIES.find(d=>d.group===g.id&&!h.completed.includes(d.id));const records=D.COMMUNITY_STORIES.filter(d=>d.group===g.id&&h.completed.includes(d.id));return `<details id="community-group-${g.id}" tabindex="-1" data-details-key="community-${g.id}" ${a&&D.COMMUNITY_STORIES.find(d=>d.id===a.id).group===g.id?'open':''}><summary>${g.name} · ${records.length}/3</summary>${next&&!a?(()=>{const p=E.communityOffer(state,next.id);return `<article id="community-${g.id}" tabindex="-1"><h3>${next.name}</h3><p>${next.detail}</p><div class="review-methods">${D.HARBOR_FOCUSES.map(f=>{const q=E.communityOffer(state,next.id,f.id);return `<p>${f.name}：${number(q.dustCost)} 星尘 / ${q.samplesCost} 样本；筹备 ${duration(q.workSeconds)}，或 ${q.tripsRequired} 次补给${f.id==='reception'?'；全预装后筹备缩短':''}${f.id==='exploration'?'；可用残骸带与补给线替代':''}。</p>`;}).join('')}</div><p>${escape(p.reason||'现在可以接下；交接时扣除资源')}</p><div class="harbor-actions"><button class="outline" ${action('community-accept',next.id)} data-serial="${p.serial}" ${p.available?'':'disabled'}>接下这份居民协作</button>${p.reason?`<button class="text-button" ${action('nav','explore')} data-goal-focus="harbor-project-${g.project}">查看对应工程与港务需求</button>`:''}</div></article>`;})():''}${records.map(d=>{const r=h.records.find(r=>r.id===d.id);return `<article><h3>✓ ${d.name}</h3><p>${d.letter}</p><small>${r?`${r.path==='production'?'港内筹备':'实际补给'}交接 · ${D.HARBOR_FOCUSES.find(f=>f.id===r.mode).name}`:'首次交接标记保留；原始回信收据不可读'}</small></article>`;}).join('')}</details>`;}).join('')}</section>`;
  }

  function reviewsPanel() {
    if(!D.SECTORS.some(c=>E.surveyCount(state,c.id)===3))return '';
    const h=state.continuation.reviews,a=h.active;
    return `<section id="sector-reviews" class="sector-reviews" tabindex="-1" aria-label="星区证据复查"><div class="section-title"><h2>星区证据复查</h2><span>档案 ${h.earned.length}/9 · 已用许可 ${h.used.length}/9</span></div><p>保留原九节点，复核发现的来源。没有旧发现也能由本次安全观测补录，不必等随机事件。首次归档获得有限回信和一份首段支援；演练不重复发奖。</p>
      ${a?`<article class="harbor-active"><h3>${D.REVIEWS.find(d=>d.id===a.id).name}${a.practice?' · 无奖励演练':''}</h3><p data-review-time></p><p>分流 ${Math.round(a.diversion*100)}% · 已锁定回收 ${number(a.dust)} 星尘 / ${a.samples} 样本</p><div class="progress" role="progressbar" aria-label="证据复查进度" aria-valuemin="0" aria-valuemax="100" data-review-progress><span></span></div><button class="primary" ${action('review-claim',String(a.token))} ${state.clock>=a.end?'':'disabled'}>归档复查与回信</button></article>`:''}
      <div class="review-chains">${D.SECTORS.map(chain=>`<details data-details-key="reviews-${chain.id}" ${D.REVIEWS.find(d=>d.id===(a?.id||h.records.at(-1)?.id))?.chain===chain.id?'open':''}><summary>${chain.name} · ${D.REVIEWS.filter(d=>d.chain===chain.id&&E.reviewDone(state,d.id)).length}/3</summary>${D.REVIEWS.filter(d=>d.chain===chain.id).map(def=>{
        const record=h.records.find(r=>r.id===def.id),done=E.reviewDone(state,def.id),p=E.reviewPreview(state,def.id,'safe');
        return `<article id="review-${def.id}" tabindex="-1"><h3>${done?'✓ ':''}${def.name}</h3><p>${def.detail}</p><p>关联发现：${def.events.map(id=>D.ENCOUNTERS.find(e=>e.id===id).name).join('、')}</p>${done?`<p>${def.letter}</p><small>核验来源：${record?(record.evidence.length?'实际已收藏的相关发现':'本次直接实测补录'):'原始快照不可读，首次结算标记保留'} · ${reviewSupportLabel(def.id)} · ${h.used.includes(def.id)?'许可已使用':'许可可在终章后航前选择'}</small><button class="text-button" ${action('review-start','safe')} data-review-id="${def.id}" data-serial="${h.serial+1}" ${p.available?'':'disabled'}>无奖励安全演练</button>`:
        `<div class="review-methods">${D.REVIEW_METHODS.map(method=>{const q=E.reviewPreview(state,def.id,method.id);return `<div><h4>${method.name}</h4><p>${duration(q.seconds)} · 分流 ${Math.round(q.diversion*100)}%</p><p>费用 ${number(q.dustCost)} 星尘 / ${q.costSamples} 样本；回收 ${number(q.dust)} 星尘 / ${q.samples} 样本</p><small>${q.evidence.length?'旧发现对照缩短15%核验时间':'缺失来源由本次直接观测补齐'} · ${escape(q.reason)}</small><button class="outline" ${action('review-start',method.id)} data-review-id="${def.id}" data-serial="${h.serial+1}" ${q.available?'':'disabled'}>按此方法复查</button></div>`;}).join('')}</div>`}</article>`;
      }).join('')}</details>`).join('')}</div></section>`;
  }

  function sectorAtlas() {
    if(state.discoveries < 3) return '';
    const a=state.atlas, active=a.active;
    return `<section id="sector-atlas" class="sector-atlas" tabindex="-1" aria-label="星区探索图谱"><div class="section-title"><h2>星区探索图谱</h2><span>已调查 ${a.nodes.length} / 9 处</span></div><p>三份归航报告确认了调查入口。选择优先线索，再沿安全短线逐处核验。动态发现可缩短相关调查；所有路径都能安全完成。</p>
    <svg viewBox="0 0 600 260" role="group" aria-label="三条连续调查航线">${D.SECTORS.map((c,i)=>{const n=E.surveyCount(state,c.id);return `<path d="M100 ${55+i*80}H500" stroke="#354750"/>${c.nodes.map((name,j)=>`<g class="sector-node ${j<n?'is-complete':''}" role="button" tabindex="0" ${action('sector-select',c.id)} transform="translate(${100+j*200} ${55+i*80})" aria-label="${c.name} · ${name} · ${j<n?'已完成':j===n?'待调查':'待前序线索'}"><circle r="18"/><text text-anchor="middle" y="5">${j<n?'✓':j+1}</text></g>`).join('')}`;}).join('')}</svg>
    <div class="sector-chains">${D.SECTORS.map(c=>{const count=E.surveyCount(state,c.id);return `<article><h3>${c.name} · ${count}/3</h3><p>${count===3?`已发现：${c.discovery} · 纪念品「${c.collection}」 · ${c.route}`:`下一项：${c.nodes[count]}`}</p><button class="outline" ${action('sector-select',c.id)} aria-pressed="${a.priority===c.id}">${count===3?'重读发现档案':'优先调查此线'}</button></article>`;}).join('')}</div>
    ${active?`<article class="harbor-active"><h3>${D.SECTORS.find(c=>c.id===active.chain).nodes[active.node]}</h3><p data-survey-time></p><p>锁定收益 ${number(active.dust)} 星尘 + ${active.samples} 样本 · 分流 ${Math.round(active.diversion*100)}%</p><button class="primary" ${action('survey-claim',String(active.token))} ${state.clock>=active.end?'':'disabled'}>归档本次调查</button></article>`:a.priority && E.surveyCount(state,a.priority)<3?`<div class="survey-methods">${D.SURVEY_METHODS.map(m=>{const p=E.surveyPreview(state,a.priority,m.id);return `<article><h3>${m.name}</h3><p>${duration(p.seconds)} · 分流 ${Math.round(p.diversion*100)}% · 支出 ${p.costSamples} 样本</p><p>回收 ${number(p.dust)} 星尘 + ${p.samples} 样本 · 事件证据 ${p.evidence} 份</p><button class="outline" ${action('survey-start',m.id)} data-node="${p.node}" ${p.available?'':'disabled'}>安排调查</button><small>${p.reason}</small></article>`;}).join('')}</div>`:''}
    <details data-details-key="sector-records"><summary>已完成节点与发现档案</summary>${a.nodes.map(n=>`<p>${D.SECTORS.find(c=>c.id===n.chain).nodes[n.node]} · ${D.SURVEY_METHODS.find(m=>m.id===n.approach).name} · ${number(n.dust)} 星尘 / ${n.samples} 样本</p>`).join('')||'<p>首份调查归档后，后续坐标将点亮。</p>'}</details></section>`;
  }

  function harborPanel() {
    if (!state.epilogue.ending) return "";
    const h = state.management, task = E.harborStatus(state), offers = E.harborOffers(state);
    const missionName = id => D.MISSIONS.find(m => m.id === id).name;
    const planText=t=>!t.plan?'原需求条款保留':t.plan.mode==='production'?`建设/研究的实际支出可抵工作量，最多 ${Math.round(t.plan.workshopCap*100)}%，不减交付费用` : t.plan.mode==='reception'?`可分批预装实际资源；全部预装后值班组筹备 ${duration(Math.ceil(t.workSeconds*t.plan.careFactor))} 即可交付`:'普通安全回收或两港补给也可计入指定准备';
    const terms = t => `<p>交付 ${number(t.dustCost)} 星尘 + ${t.samplesCost} 样本</p><small>完成 ${t.tripsRequired} 次「${missionName(t.mission)}」并领取，或港内生产 ${number(t.productionGoal)} 星尘工作量并筹备 ${duration(t.workSeconds)}，两者选一。</small>`;
    const projectCards = D.HARBOR_PROJECTS.map(p => {
      const offer = E.harborProjectOffer(state, p.id);
      return `<article class="harbor-project" id="harbor-project-${p.id}" tabindex="-1"><h3>${p.name} <small>${offer.level} / 3 期</small></h3><p>${p.benefit}</p>${offer.level < 3 ? `<p>下一期 ${number(offer.dustCost)} 星尘 + ${offer.samplesCost} 样本</p><small>${offer.reason || "条件已齐备，可建设"}</small><button class="outline" ${action("harbor-build", p.id)} data-level="${offer.level}" ${offer.available ? "" : "disabled"}>建设第${offer.next}期</button>` : `<p>三期建成 · 永久保存 · 纪念回信已收藏</p>`}</article>`;
    }).join("");
    const letters = h.collections.map(id => {
      const need = D.HARBOR_NEEDS.find(n => `need-${n.id}` === id), project = D.HARBOR_PROJECTS.find(p => `project-${p.id}` === id);
      return `<article><h4>${need ? need.collection : project.name + " · 三期纪念"}</h4><p>${escape((need || project).letter)}</p></article>`;
    }).join("");
    return `<section class="harbor-management" id="harbor-management" tabindex="-1" aria-label="归航星港经营"><div class="section-title"><div><small>六章之后 · 永久结局保留</small><h2>归航星港经营</h2></div><span>已交付 ${h.stats.deliveries} 份需求</span></div><p>居民提出需求 → 规划生产或航线 → 交付 → 分期建设与收藏回信。没有过期或离线失败；同一需求的两条准备路径任选其一。</p>
      <div class="harbor-focuses" aria-label="短期经营方向">${D.HARBOR_FOCUSES.map(f => `<button class="outline" ${action("harbor-focus", f.id)} aria-pressed="${h.focus === f.id}"><strong>${f.name}</strong><small>${f.detail}</small></button>`).join("")}</div><p class="harbor-focus-description">${D.HARBOR_FOCUSES.find(f => f.id === h.focus).detail}</p><p><small>可随时调整，已接需求沿用接单时的费用与工作量。工作量计入接单后的被动生产；生产计划另计真实建设和研究支出。扫描、旧报告和事件奖励不计入。</small></p>
      ${task ? `<article class="harbor-active"><small>${task.from} · 第 ${task.serial} 份 · ${D.HARBOR_FOCUSES.find(f => f.id === task.focus).name}</small><h3>${task.name}</h3><p>${task.description}</p>${terms(task)}<p>${planText(task)}</p>${task.plan?.mode==="reception"?`<p>已预装 ${number(task.plan.packedDust)} 星尘 / ${task.plan.packedSamples} 样本</p><button class="outline" ${action("harbor-pack",String(task.serial))} ${task.dustLeft||task.samplesLeft?"":"disabled"}>预装可用交付资源</button>`:""}<p>指定补给 ${task.trips} / ${task.tripsRequired} 次 · 准备工作量 <span data-harbor-production>${number(task.produced)}</span> / ${number(task.productionGoal)}</p><progress data-harbor-progress max="${task.productionGoal}" value="${task.produced}" aria-label="居民需求准备工作量"></progress><p>港内筹备剩余 <strong data-harbor-preparation></strong></p><p data-harbor-reason>${task.reason || "准备完成，可以交付"}</p><div class="harbor-actions"><button class="primary" ${action("harbor-deliver", String(task.serial))} ${task.available ? "" : "disabled"}>完成交付</button><button class="outline" ${action("nav", "explore")} data-goal-focus="${state.result ? "report" : state.mission ? "active-mission" : E.missionLock(state, task.mission) ? "mission-belt" : `mission-${task.mission}`}">规划探索与样本</button><button class="text-button" ${action("nav", "fleet")}>生产与自动购买预算</button><button class="outline" ${action("harbor-reserve")} ${E.capability(state,"planning")?"":"disabled"}>为交付保留自动购买预算</button></div><small>当前探索：${state.mission ? missionName(state.mission.id) + "，完成后手动或自动领取基础报告" : "尚未派遣"}。自动派遣可完成匹配的安全补给，居民交付由你确认。</small></article>` : `<div class="harbor-offers">${offers.map(n => `<article><small>${n.from}</small><h3>${n.name}</h3><p>${n.description}</p>${terms(n.terms)}<p>${planText(n.terms)}</p><button class="outline" ${action("harbor-accept", n.id)} data-serial="${n.terms.serial}">接下这份需求</button></article>`).join("")}</div>`}
      <div id="harbor-schedule" aria-label="资源调度比较"><h3>资源调度</h3><p data-schedule-rate></p><p data-schedule-task></p><div data-schedule-projects></div><small>时间按现有舰队估算，不假定未来扩建。自动购买可能推迟余额准备；缺少样本需要手动领取安全探索。</small></div>
      <details class="harbor-projects" data-details-key="harbor-projects"><summary>长期工程 · ${Object.values(h.projects).reduce((a,b) => a+b,0)} / 15 期 · 五项有限工程</summary><div class="harbor-project-grid">${projectCards}</div></details>
      <details data-details-key="harbor-letters"><summary>居民回信与纪念品 · ${h.collections.length} / 12</summary>${letters || "<p>首次完成不同需求或三期工程后，回信会收录于此。</p>"}</details>
      <details data-details-key="harbor-history"><summary>近期交付记录与经营统计</summary><p>完成需求 ${h.stats.deliveries} 份 · 匹配补给 ${h.stats.voyages} 次 · 交付星尘 ${number(h.stats.dustSpent)} · 样本 ${h.stats.samplesSpent}</p>${h.history.map(r => `<p>第${r.serial}份 · ${D.HARBOR_NEEDS.find(n => n.id === r.id).name} · ${D.HARBOR_FOCUSES.find(f => f.id === r.focus).name}</p>`).join("") || "<p>尚无交付。每份需求都可以慢慢准备。</p>"}<small>保留最近24次交付；统计、七类回信与五项三期纪念永久保留。</small></details></section>`;
  }
  function encounterPanel() {
    const event = E.encounterOffer(state);
    const history = state.encounters.history;
    if (!event && !history.length && !state.encounters.catalog.length) return "";
    return `<section class="encounter-panel" id="encounter-panel" tabindex="-1" aria-label="动态拾荒发现"><h2>${event ? event.name : "航行发现记录"}</h2><p>永久发现收藏 ${state.encounters.catalog.length} / ${D.ENCOUNTERS.reduce((n, e) => n + e.choices.length, 0)}</p>${event ? `<p>${event.description}</p><p>本次额外发现 · 普通探索收益独立领取 · 无选择期限</p>${event.choice ? `<p>正在处理 · 剩余 <strong data-encounter-time></strong> · 原结果已锁定</p>` : `<div class="event-choices">${event.choices.map(c => `<button class="outline" ${action("encounter", c.id)} data-token="${event.token}" ${c.available ? "" : "disabled"}><strong>${c.name}</strong><small>+${number(c.dust)} 星尘 · +${c.samples} 样本 · ${duration(c.seconds)}${c.costSamples ? ` · 支出 ${c.costSamples} 样本` : ""}</small></button>`).join("")}</div>`}` : ""}${history.length ? `<details data-details-key="encounter-history"><summary>已记录 ${history.length} 次发现（保留最近32次）</summary>${history.map(r => `<p>${escape(D.ENCOUNTERS.find(e => e.id === r.id).choices.find(c => c.id === r.choice).record)}</p>`).join("")}</details>` : ""}<details data-details-key="encounter-catalog"><summary>永久发现收藏</summary>${state.encounters.catalog.map(key => { const e = D.ENCOUNTERS.find(e => key.startsWith(e.id + ":")); const c = e.choices.find(c => `${e.id}:${c.id}` === key); return `<p>${escape(c.record)}</p>`; }).join("")}</details></section>`;
  }
  function explore() {
    const port = D.PORT[state.starport];
    return `<div class="page"><div class="page-header"><div><h1>有些残骸，仍在等待。</h1><p>安全探索只分流产量。风险探索由你主动选择，结果与回收预期会在派遣前显示。</p></div></div>
      ${missionReport()}${encounterPanel()}${residentLinks()}${communityPanel()}${honorsPanel()}${longVoyages()}${sectorAtlas()}${reviewsPanel()}${harborPanel()}${state.mission ? `<section class="mission-status" id="active-mission" tabindex="-1"><h3>${D.MISSIONS.find((m) => m.id === state.mission.id).name} · 探索中</h3><p>剩余 <strong data-mission-time></strong> · 当前分流 ${Math.round(state.mission.diversion * 1000) / 10}% 产量${state.mission.plan ? ` · ${D.EXPEDITION_PLANS.find((p) => p.id === state.mission.plan).name}` : ""}</p><div class="progress" role="progressbar" aria-label="探索进度" aria-valuemin="0" aria-valuemax="100" data-mission-progress><span></span></div>${state.automation.dispatch ? `<button class="outline" ${action("dispatch-stop")}>本次归航后暂停派遣</button>` : ""}</section>` : ""}${residentPanel()}${epiloguePanel()}${rescuePanel()}${councilPanel()}${campaignPanel()}${chapterMap()}
      <section aria-label="探索航线">${E.missionOptions(state)
        .filter((m) => !m.chapter && !m.campaign && !m.council && !m.rescue)
        .map((m) => {
          const p = E.missionPreview(state, m.id);
          return `<div class="mission-row" id="mission-${m.id}" tabindex="-1"><div><h3>${m.name}</h3><p>${m.detail}</p></div><div class="mission-metrics"><small>${duration(p.seconds)} · 分流 ${Math.round(p.diversion * 100)}%</small><p>成功率 ${Math.round(p.chance * 100)}%<br>成功回收 ${number(p.dust)} 星尘<br>${p.samples} 份样本</p></div><div class="row-action">${voyageComparison(m.id)}<button class="${m.chance < 1 ? "" : "outline"}" ${action("mission", m.id)} ${state.mission || state.result || state.atlas.active || state.expeditions.active || state.continuation.reviews.active ? "disabled" : ""}>${m.chance < 1 ? "风险派遣" : "安全派遣"}</button></div></div>`;
        })
        .join("")}</section>
      <section class="port-panel" id="port-panel" tabindex="-1"><span class="port-progress">星港修复 ${state.starport} / ${D.PORT.length}</span><h2>${port ? port.name : "这里终于可以成为家。"}</h2><p>${port ? `需要 ${port.cores} 星核与 ${port.samples} 份样本。你拥有 ${number(state.cores)} 星核与 ${number(state.samples)} 份样本。` : D.PORT.at(-1).text}</p>${port ? `<button class="outline" ${action("port")} ${state.cores >= port.cores && state.samples >= port.samples ? "" : "disabled"}>修复航站</button>` : "<p>归航星港已建成。远航星图已经开放，新的回信正在等待。</p>"}</section>
      ${loadoutPanel()}<section><div class="section-title"><h2>随舰装备</h2><small>${state.equipped.length} / 2 槽位 · 跃迁保留</small></div>${
        D.MODULES.filter((m) => state.modules[m.id])
          .map((m) => {
            const offer = E.moduleOffer(state, m.id);
            return `<div class="module-row" id="module-${m.id}" tabindex="-1" data-module-id="${m.id}"><div><h3>${m.name}</h3><p>${m.detail}</p></div><small>${state.modules[m.id]} / ${D.MODULE_MAX_LEVEL} 级</small><div class="row-action"><button ${action("equip", m.id)} ${!state.equipped.includes(m.id) && state.equipped.length >= 2 ? "disabled" : ""}>${state.equipped.includes(m.id) ? "卸下" : "装备"}</button>${offer.level < D.MODULE_MAX_LEVEL ? `<button class="outline" ${action("module", m.id)} ${offer.available ? "" : "disabled"}>升级 · ${offer.samples} 样本</button>` : "<small>已达到最高等级</small>"}</div></div>`;
          })
          .join("") ||
        '<p class="empty">回应医院船的信号，或进入裂隙寻找第一件舰装。</p>'
      }</section>
      ${workshop()}${routeArchive()}</div>`;
  }
  function workshop() {
    const missing = D.MODULES.filter((m) => !state.modules[m.id]);
    return `<details class="workshop" data-details-key="workshop"><summary data-focus="details-workshop">舰装工坊 · ${number(state.samples)} 份样本</summary><p>探索样本可以装配缺少的舰装，也可以将已有舰装升至 ${D.MODULE_MAX_LEVEL} 级。处理过故事的任意选择，都能开放对应图纸。装配后可在上方替换装备，最多同时装备 2 件。</p>${
      missing
        .map((m) => {
          const offer = E.moduleOffer(state, m.id);
          return `<div class="module-row" id="module-${m.id}" tabindex="-1" data-module-id="${m.id}"><div><h3>${m.name}</h3><p>${m.detail}</p>${offer.unlocked ? "" : `<p class="blueprint-lock">${offer.reason}</p>`}</div><small>${offer.unlocked ? `${offer.samples} 份样本` : "图纸未开放"}</small><div class="row-action">${offer.unlocked ? `<button class="outline" ${action("module", m.id)} ${offer.available ? "" : "disabled"}>装配舰装</button>` : ""}</div></div>`;
        })
        .join("") ||
      '<p class="empty">所有舰装均已装配。可以继续升级已有舰装。</p>'
    }</details>`;
  }
  function jump() {
    const gain = E.prestigeGain(state);
    return `<div class="page"><div class="page-header"><div><h1>下一次启航，会有所不同。</h1><p>用这一航次的积累换取星核和永久能力。舰装、故事、样本、修复的星港与远航建设会与你同行。</p></div></div><div class="jump-layout"><div><div class="jump-number">${gain || 4} <small>星核${gain ? "可获得" : "起"}</small></div><p>本航次收集 <strong data-run-dust>${number(state.run.dust)}</strong> / ${number(D.PRESTIGE_DUST)} 星尘</p><div class="progress" role="progressbar" aria-label="跃迁进度" aria-valuemin="0" aria-valuemax="100" data-jump-progress><span></span></div><p>星核带来的全舰队产量：×${number(1 + Math.sqrt(state.totalCores) * 0.25)}。消费星核修复航站也不会减少这项历史加成。</p><p><small>新航次从 1 艘无人机与 12 星尘开始。临时设施与研究需要重新建设。</small></p>${state.mission || state.result || state.atlas.active || state.expeditions.active || state.continuation.reviews.active ? '<p class="save-warning">请先等待探索或调查归航，并处理报告。</p>' : ""}<button class="primary" ${action("jump")} ${gain && !state.mission && !state.result && !state.atlas.active && !state.expeditions.active ? "" : "disabled"}>${gain ? "开启下一航次" : "尚在积累能量"}</button></div><div><h2>每次都能解锁新工作</h2>${D.CAPABILITIES.map((c) => `<div class="capability-row ${E.capability(state, c.id) ? "unlocked" : ""}"><span>${E.capability(state, c.id) ? "已解锁" : `第 ${c.run} 次跃迁`}</span><div><h3>${c.name}</h3><p>${c.detail}</p></div></div>`).join("")}</div></div><section><h2>最近的航次</h2>${state.records.map((r, i) => `<div class="history-row"><span>${D.ROUTES.find((route) => route.id === r.route).name}</span><span>${duration(r.seconds)}</span><span>+${number(r.gain)} 星核</span></div>`).join("") || '<p class="empty">第一条航线正在由你写下。</p>'}</section></div>`;
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
      const label = p.count
        ? `建造${p.count > 1 ? ` ×${p.count}` : ""} · ${number(p.cost)} 星尘`
        : "建造已达上限";
      if (button.textContent !== label) {
        if (button.childNodes.length === 1 && button.firstChild.nodeType === Node.TEXT_NODE) button.firstChild.nodeValue = label;
        else button.textContent = label;
      }
      button.disabled = !p.count || p.cost > state.dust;
      const field = (name, text) => {
        const el = $(`[data-buy-${name}="${button.dataset.buyId}"]`);
        if (el) el.textContent = text;
      };
      field("effect", p.count ? `增产 +${number(p.delta)} / 秒` : "");
      field(
        "payback",
        p.payback === null ? "" : `回本约 ${duration(p.payback)}`,
      );
      field(
        "wait",
        !p.count || p.wait === 0
          ? ""
          : p.wait === null
            ? "扫描信标积累星尘"
            : `还需约 ${duration(p.wait)}`,
      );
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
    document.querySelectorAll("[data-goal-detail]").forEach(el => el.textContent !== goal.detail && (el.textContent = goal.detail));
    if ($("[data-goal-eta]"))
      $("[data-goal-eta]").textContent =
        goal.etaHint ||
        (goal.eta === 0
          ? "现在可以处理"
          : goal.eta === null
            ? `还需扫描约 ${Math.ceil(Math.max(0, goal.target - goal.value) / E.scanValue(state))} 次，或先启动生产`
            : `按现有舰队，约 ${duration(goal.eta)}`);
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
    if(state.clock!==lastItineraryClock) {
      lastItineraryClock=state.clock;
      document.querySelectorAll('[data-itinerary-gap]').forEach(el=>{
        if(!el.getClientRects().length) return;
        const p=E.itineraryOffer(state,el.dataset.itineraryGap,planDraft(el.dataset.itineraryGap));
        if(p) el.textContent=`全程保守缺口 ${number(p.dustGap)} 星尘 / ${p.sampleGap} 样本；实际每段分别扣费。`;
      });
    }
    const review=state.continuation.reviews.active;
    if(review&&$('[data-review-time]')) {
      $('[data-review-time]').textContent=state.clock>=review.end?'复查已完成，等待手动归档':`复查剩余 ${duration(review.end-state.clock)}`;
      progress('[data-review-progress]',(state.clock-review.start)/review.seconds);
      $('[data-action="review-claim"]').disabled=state.clock<review.end;
    }
    const leg=state.expeditions.active?.leg;
    if(leg && $("[data-deep-time]")) $("[data-deep-time]").textContent=state.clock>=leg.end ? "本阶段已完成，等待手动领取报告" : `本阶段剩余 ${duration(leg.end-state.clock)}`;
    const survey=state.atlas.active;
    if(survey && $("[data-survey-time]")) {
      $("[data-survey-time]").textContent=state.clock>=survey.end ? "调查已完成，等待手动归档" : `剩余 ${duration(survey.end-state.clock)}`;
      $('[data-action="survey-claim"]').disabled=state.clock<survey.end;
    }
    const schedule=E.harborSchedule(state);
    if(schedule && $("#harbor-schedule")) {
      $("[data-schedule-rate]").textContent=`当前可用生产 ${number(schedule.rate)} 星尘/秒 · 自动购买保留 ${number(state.automation.reserve)} 星尘`;
      const t=schedule.task;
      $("[data-schedule-task]").textContent=t?`交付尚需 ${number(t.dustLeft)} 星尘 / ${t.samplesLeft} 样本；港内生产预计 ${t.productionEta===null?'需先启动生产':duration(t.productionEta)}；指定探索预计 ${duration(t.explorationSeconds)}，单次回收 ${number(t.explorationDust)} 星尘 / ${t.explorationSamples} 样本`:'接下需求后可比较生产与探索准备';
      $("[data-schedule-projects]").textContent=schedule.projects.filter(p=>p.level<3).map(p=>`${D.HARBOR_PROJECTS.find(x=>x.id===p.id).name}：差 ${number(p.dustGap)} 星尘 / ${p.samplesGap} 样本，星尘约 ${p.eta===null?'待生产':duration(p.eta)}`).join('；');
    }
    const harbor = E.harborStatus(state);
    if (harbor && $("[data-harbor-production]")) {
      $("[data-harbor-preparation]").textContent = duration(harbor.preparationLeft);
      $("[data-harbor-production]").textContent = number(harbor.produced);
      $("[data-harbor-progress]").value = harbor.produced;
      $("[data-harbor-reason]").textContent = harbor.reason || "准备完成，可以交付";
      $('[data-action="harbor-deliver"]').disabled = !harbor.available;
    }
    const community=E.communityStatus(state);
    if(community&&$('[data-community-produced]')){
      $('[data-community-produced]').textContent=number(community.produced);$('[data-community-progress]').value=community.produced;
      $('[data-community-time]').textContent=`筹备剩余 ${duration(community.secondsLeft)}`;$('[data-community-reason]').textContent=community.reason||'准备完成，可以确认交接';
      $('[data-action="community-deliver"]').disabled=!community.available;
    }
    if ($('[data-encounter-time]')) $("[data-encounter-time]").textContent = duration(Math.max(0, state.encounters.pending.readyAt - state.clock));
    if (state.mission) {
      const m = state.mission;
      if ($("[data-mission-time]"))
        $("[data-mission-time]").textContent = duration(
          Math.max(0, m.end - state.clock),
        );
      progress("[data-mission-progress]", (state.clock - m.start) / m.seconds);
    }
    if ($("[data-timing-total]")) {
      $("[data-timing-total]").textContent =
        `累计前台 ${duration(state.timing.foregroundSeconds)} · 离线 ${duration(state.timing.offlineSeconds)}`;
      for (const id of ["drone", "research", "report", "prestige"]) {
        const event = state.timing.events[id];
        $(`[data-timing-active="${id}"]`).textContent = event
          ? duration(event.foregroundSeconds)
          : "待记录";
        $(`[data-timing-elapsed="${id}"]`).textContent = event
          ? duration(event.elapsedSeconds)
          : "待记录";
        $(`[data-timing-source="${id}"]`).textContent = event
          ? `第 ${event.run} 航次 · ${{ manual: "手动", auto: "自动", offline: "离线自动" }[event.source]}`
          : "";
      }
    }
  }
  // Reconcile native DOM locally by stable identity. Unchanged controls remain
  // connected across automation ticks; focused form drafts are not overwritten.
  function patchContent(parent, html) {
    const template = document.createElement("template");
    template.innerHTML = html;
    const key = (n) => n.nodeType === 1 ? n.id || n.dataset.focus || n.dataset.detailsKey || "" : "";
    const compatible = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && key(a) === key(b)));
    function sync(host, fresh) {
      const previous = [...host.childNodes], used = new Set();
      let cursor = host.firstChild;
      for (const next of [...fresh.childNodes]) {
        const id = key(next);
        const node = previous.find(n => !used.has(n) && compatible(n, next) && (id || n.nodeType !== 1 || n.className === next.className));
        if (!node) {
          host.insertBefore(next, cursor);
          continue;
        }
        used.add(node);
        if (node !== cursor) host.insertBefore(node, cursor);
        if (node.nodeType !== 1) {
          if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
        } else {
          const editing = node === document.activeElement && node.matches("input,textarea,select");
          const keep = name => (node.tagName === "DETAILS" && name === "open") || (editing && ["value", "checked", "selected"].includes(name));
          for (const attr of [...node.attributes]) if (!keep(attr.name) && !next.hasAttribute(attr.name)) node.removeAttribute(attr.name);
          for (const attr of [...next.attributes]) if (!keep(attr.name) && node.getAttribute(attr.name) !== attr.value) node.setAttribute(attr.name, attr.value);
          if (!editing && node.matches('input[type="checkbox"]')) node.checked = next.checked;
          // Purchase labels belong to updateNumbers. The authored template is
          // empty; clearing that live text during input blur can cancel WebKit's click.
          if (!node.hasAttribute("data-buy-id")) sync(node, next);
        }
        cursor = node.nextSibling;
      }
      for (const node of previous) if (!used.has(node)) node.remove();
    }
    sync(parent, template.content);
  }
  function render() {
    if (rebuilding) return;
    if (!E.reachable(state, page)) page = "home";
    const goal = E.nextGoal(state);
    const tiers = [40, 120, 150, 600, 1500, 2400, 15000].map(
      (n) => state.run.dust >= n,
    );
    const next = JSON.stringify([
      page,
      buyMode,
      recentStory,
      tiers,
      state.buildings,
      state.research,
      state.run.route,
      state.run.routeChosen,
      E.reachable(state, "explore"),
      E.reachable(state, "jump"),
      goal.title,
      goal.action, goal.focus, goal.label,
      state.cores,
      state.rebirths,
      state.starport,
      state.chapter,
      state.campaign,
      state.council,
      {...state.continuation,community:{...state.continuation.community,active:state.continuation.community.active?{...state.continuation.community.active,produced:undefined}:null}}, itineraryDrafts,
      E.communityStatus(state)?.available,
      Boolean(state.continuation.reviews.active&&state.clock>=state.continuation.reviews.active.end),
      state.expeditions,
      Boolean(state.expeditions.active?.leg && state.clock>=state.expeditions.active.leg.end),
      D.VOYAGES.map(v=>D.VOYAGE_METHODS.map(m=>E.voyagePreview(state,v.id,m.id).available)),
      state.atlas,
      Boolean(state.atlas.active && state.clock >= state.atlas.active.end),
      state.encounters,
      { ...state.management, active: state.management.active ? { ...state.management.active, produced: undefined } : null },
      E.harborStatus(state)?.available,
      D.HARBOR_PROJECTS.map(p => E.harborProjectOffer(state, p.id).available),
      state.mission?.id,
      state.result,
      state.rescue,
      state.epilogue,
      state.afterword,
      state.loadouts,
      state.samples,
      state.equipped,
      state.modules,
      state.discoveries,
      state.mission,
      state.result,
      state.lore,
      state.records,
      state.journal,
      Boolean(state.beacon.expiresAt),
      state.automation,
      lastReturnReport?.seconds,
    ]);
    if (next !== signature) {
      const active = document.activeElement;
      const focus = active?.dataset.focus;
      const hadMainFocus = $("#main").contains(active);
      const editing = active?.matches('input[data-config][type="number"]')
        ? active.value
        : null;
      const openDetails = new Map(
        Array.from(
          $("#main").querySelectorAll("details[data-details-key]"),
          (el) => [el.dataset.detailsKey, el.open],
        ),
      );
      // Removing a focused input can fire change synchronously. It is still being
      // edited, so preserve it without committing a budget or entering render twice.
      rebuilding = true;
      try {
        patchContent($("#navigation"), [
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
          .join(""));
        patchContent($("#main"), (page === "home" ? "" : currentGoal()) + { home, fleet, explore, jump }[page]());
        Array.from(
          $("#main").querySelectorAll("details[data-details-key]"),
        ).forEach((el) => {
          const inArchive = el.matches("#route-archive, #route-archive details");
          el.open = openDetails.get(el.dataset.detailsKey) ?? (inArchive ? reading.open[el.dataset.detailsKey] : undefined) ?? el.open;
          if (inArchive) {
            if (!el.id) el.id = `read-${el.dataset.detailsKey}`;
            el.dataset.readAnchor = "";
            el._readingOpen = el.open;
          }
        });
        if (focus && !active?.isConnected) {
          const replacement = document.querySelector(
            `[data-focus="${CSS.escape(focus)}"]`,
          );
          if (replacement && editing !== null) replacement.value = editing;
          if (replacement && !replacement.disabled)
            replacement.focus({ preventScroll: true });
          else if (hadMainFocus) $("#main").focus({ preventScroll: true });
        }
      } finally {
        rebuilding = false;
      }
      signature = next;
    }
    updateNumbers();
  }
  function importText(text) {
    try {
      if (conflicted) throw new Error("另一窗口正在运行，请先接续最新进度。");
      state = S.restore(storage, text, Date.now(), {
        expected: persistedText, ...(!blocked ? { snapshot: JSON.stringify(state) } : {}),
      });
      persistedText = JSON.stringify(state);
      lastReturnReport = null;
      absence = null;
      recentStory = null;
      blocked = false;
      backupWarningShown = false;
      $("#save-label").textContent = "自动保存";
      page = "home";
      signature = "";
      closeDialog();
      render();
      toast("航线记录已接续，恢复前的记录已备份。");
    } catch (error) {
      toast(`未能接续：${error.message}`);
    }
  }
  function previewRestore(text, source, confirmId = "confirm-import") {
    if (conflicted) throw new Error("另一窗口正在运行，请先接续最新进度。");
    const incoming = S.inspect(text), next = incoming.summary, current = S.summarize(state);
    const warnings = [];
    if (blocked) warnings.push("本机记录未正常载入，下表当前一栏不能代表原记录。原文将先备份，建议另外导出原文。");
    else {
      if (next.savedAt < current.savedAt) warnings.push("所选记录的保存时间更早，之后的进度不会合并。");
      if (next.chapter < current.chapter || next.lore.length < current.lore.length || next.starport < current.starport || next.rebirths < current.rebirths || next.residents < current.residents || next.harborDeliveries < current.harborDeliveries || next.harborProjects < current.harborProjects || next.sectors < current.sectors || next.voyages < current.voyages || next.voyageCollections < current.voyageCollections || next.reviewArchives<current.reviewArchives || next.communityLetters<current.communityLetters || next.honors<current.honors || next.residentLinks<current.residentLinks)
        warnings.push("部分永久进度将回到所选记录，请核对章节、修复、跃迁和回信。");
      if ((current.residentLinks>0&&next.linkChoices!==current.linkChoices) || next.ending !== current.ending || current.lore.some(item => next.lore.some(other => item.story === other.story && item.choice !== other.choice)))
        warnings.push("故事选择或结局与当前记录不同，接续后以所选记录为准。");
    }
    if (incoming.legacy) warnings.push("这是旧版航站记录，将按迁移规则接入；不覆盖旧版原存档，也不连接旧版云端。");
    const rows = [
      ["保存时间", savedDate(current.savedAt), savedDate(next.savedAt)],
      ["主线章节", `第 ${current.chapter} 章`, `第 ${next.chapter} 章`],
      ["星港修复", `${current.starport} / ${D.PORT.length}`, `${next.starport} / ${D.PORT.length}`],
      ["跃迁 / 决定 / 回信", `${current.rebirths} / ${current.lore.length} / ${current.residents}`, `${next.rebirths} / ${next.lore.length} / ${next.residents}`],
      ["故事结局", endingName(current.ending), endingName(next.ending)],
      ["星区节点 / 远航次数 / 远航纪念", `${current.sectors} / ${current.voyages} / ${current.voyageCollections}`, `${next.sectors} / ${next.voyages} / ${next.voyageCollections}`],
      ["经营交付 / 工程期数 / 发现收藏", `${current.harborDeliveries} / ${current.harborProjects} / ${current.encounters}`, `${next.harborDeliveries} / ${next.harborProjects} / ${next.encounters}`],
      ["复查档案 / 居民回信 / 长期荣誉", `${current.reviewArchives} / ${current.communityLetters} / ${current.honors}`, `${next.reviewArchives} / ${next.communityLetters} / ${next.honors}`],
      ["重访安排 / 接续授权", `${current.itineraryPlans} / ${current.itineraryActive ? "本航次" : "无"}`, `${next.itineraryPlans} / ${next.itineraryActive ? "本航次" : "无"}`],
      ["居民回响 / 用途记录", `${current.residentLinks} / ${current.linkChoices}`, `${next.residentLinks} / ${next.linkChoices}`],
      ["星尘", number(current.dust), number(next.dust)],
      ["样本 / 星核", `${number(current.samples)} / ${number(current.cores)}`, `${number(next.samples)} / ${number(next.cores)}`],
    ];
    openDialog("恢复前预览", `<p>来源：${escape(source)}。预览不会发奖或改写进度。</p>
      <table class="restore-preview"><caption>当前航线与所选记录对照</caption><thead><tr><th scope="col">项目</th><th scope="col">当前${blocked ? "（未载入）" : ""}</th><th scope="col">接续后</th></tr></thead><tbody>${rows.map(([name, before, after]) => `<tr><th scope="row">${escape(name)}</th><td>${blocked ? "—" : escape(before)}</td><td>${escape(after)}</td></tr>`).join("")}</tbody></table>
      ${warnings.length ? `<ul class="restore-warnings">${warnings.map(warning => `<li>${escape(warning)}</li>`).join("")}</ul>` : ""}
      <p>接续会完整替换，不叠加资源。当前记录先经备份校验，备份失败就停止；从确认时刻继续，不补算导入前的离线收益。${next.pending ? "有一份待领取报告，会继续等待手动安排。" : next.mission ? "正在进行的航程按原剩余时间继续。" : ""}</p>
      <div class="dialog-actions"><button ${action("cancel")}>取消</button><button class="primary" id="${confirmId}">确认接续记录</button></div>`);
    const confirm = document.getElementById(confirmId);
    confirm.addEventListener("click", () => {
      confirm.disabled = true;
      importText(text);
      if (dialog.open) confirm.disabled = false;
    });
  }
  document.addEventListener("change", async (event) => {
    const target = event.target;
    if(target.dataset.reviewSupport&&!rebuilding) {E.selectVoyageSupport(state,target.value||null);save();render();return;}
    if (target.dataset.planRoute && !rebuilding) {
      const id=target.dataset.planRoute, stage=Number(target.dataset.planStage), steps=planDraft(id);
      if(!D.VOYAGES.some(v=>v.id===id)||!Number.isInteger(stage)||stage<0||stage>3) return;
      if(target.dataset.planField==='choice') steps[stage].choice=target.value;
      else {steps[stage].equipment=[...(target.value==='current'?state.equipped:state.loadouts[target.value]||[])];steps[stage].preset=target.value;}
      itineraryDrafts[id]=steps; signature=''; render(); return;
    }
    if (target.id === "import-file" && target.files?.[0]) {
      const file = target.files[0];
      if (file.size > 4 * 1024 * 1024) {
        toast("记录超过 4 MB，请检查是否选对文件。");
        return;
      }
      try {
        const text = await file.text();
        previewRestore(text, file.name);
      } catch (error) {
        toast(`文件未能读取：${error.message}`);
      }
    }
    if (target.dataset.config && !rebuilding) {
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
    if (kind === "settings") { settings(); return; }
    if (kind === "reading-size") {
      if (!["normal", "large", "larger"].includes(id)) return;
      reading.size = id;
      document.documentElement.dataset.readingSize = id;
      S.saveReading(storage, reading);
      dialog.querySelectorAll('[data-action="reading-size"]').forEach((el) => el.setAttribute("aria-pressed", String(el.dataset.id === id)));
      return;
    }
    if (kind === "archive-current" || kind === "archive-resume") {
      const anchor = reading.anchor, offset = reading.offset;
      const target = kind === "archive-resume" && anchor && document.getElementById(anchor)?.closest("#route-archive") ? anchor : `archive-chapter-${E.routeArchive(state).chapter}`;
      navigate("explore", target);
      if (kind === "archive-resume" && target === anchor)
        window.scrollBy({ top: document.getElementById(target).getBoundingClientRect().top - offset, behavior: "instant" });
      return;
    }
    if (kind === "scene-read") {
      navigate("explore", `story-${id}`);
      return;
    }
    if (kind === "scene-dismiss") {
      recentStory = null;
      render();
      return;
    }
    if(kind==='honor-claim'){if(E.claimHonor(state,id)){save();render();toast('有限荣誉已陈列，永久保留。');}return;}
    if(kind==='community-focus'){if(E.setHarborFocus(state,id)){save();render();toast('下一份居民协作将按新方向准备。');}return;}
    if(kind==='community-accept'){if(E.acceptCommunity(state,id,button.dataset.serial)){save();render();toast('居民协作已接下，条件已锁定，无交付期限。');}return;}
    if(kind==='community-path'){if(E.setCommunityPath(state,button.dataset.serial,id)){save();render();}return;}
    if(kind==='community-pack'){if(E.packCommunity(state,id)){save();render();toast('可用资源已预装，不会被自动购买花掉。');}return;}
    if(kind==='link-accept'){if(E.acceptLink(state,id))toast('已接下协作。请完成一份新的居民需求或一条完整远航。');save();render();return;}
    if(kind==='link-complete'){
      if(E.completeLink(state,id,button.dataset.linkChoice)){save();render();const d=D.RESIDENT_LINKS.find(d=>d.id===id);openDialog('新的居民回信',`<h3>${escape(d.name)}</h3><p>${escape(button.dataset.linkChoice==='share'?d.shared:d.cared)}</p><p>用途、回信与一次结算已永久归档。</p><button class="primary" ${action('cancel')}>收好回信</button>`);}return;
    }
    if(kind==='plan-copy-first') {
      const draft=planDraft(id);itineraryDrafts[id]=draft.map(()=>({...draft[0],equipment:[...draft[0].equipment]}));
      signature='';render();toast('四段草稿已填好。请检查每段预览，再保存；尚未派遣或花费资源。');return;
    }
    if(kind==='community-deliver'){const task=E.communityStatus(state);if(E.deliverCommunity(state,id)){save();render();const story=D.COMMUNITY_STORIES.find(d=>d.id===task.id);openDialog('居民来信',`<h3>${story.name}</h3><p>${story.letter}</p><p>交接完成，回信与星港工作牌已经保存。</p><button class="primary" ${action('community-read-close')}>收好这封回信</button>`);}return;}
    if(kind==='community-read-close'){closeDialog();return;}
    if(kind==='review-start') {if(E.startReview(state,button.dataset.reviewId,id,button.dataset.serial)) {save();render();toast('复查已出发，证据来源和结果已锁定。');}return;}
    if(kind==='review-claim') {if(E.claimReview(state,id)){save();render();toast('复查已归档，首次回信与许可已保存。');}return;}
    if(kind.startsWith('plan-')) {
      let ok=false;
      if(kind==='plan-save') ok=E.saveItinerary(state,id,planDraft(id));
      if(kind==='plan-equip') ok=E.equipItinerary(state,id);
      if(kind==='plan-start') ok=E.startItinerary(state,id);
      if(kind==='plan-next') ok=E.advanceItinerary(state,id,button.dataset.stage);
      if(kind==='plan-pause'||kind==='plan-resume') ok=E.pauseItinerary(state,id,kind==='plan-resume');
      if(kind==='plan-restore') ok=E.restoreItineraryEquipment(state,id);
      if(kind==='plan-stop') ok=E.stopItinerary(state,id);
      save();render();toast(ok?'远航安排已更新，资源和阶段记录已保存。':E.itineraryStatus(state)?.reason||'条件已变化，请核对编成与费用。');return;
    }
    if(kind === 'deep-loadout') { if(E.applyLoadout(state,id)) {save();render();toast('已换装，已出发的阶段仍沿用原编成。');} return; }
    if(kind === 'deep-start') { if(E.startVoyage(state,id)) {save();render();toast('远航已编排，请选择第一段方案。');} return; }
    if(kind === 'deep-dispatch') { if(E.dispatchVoyageLeg(state,button.dataset.token,button.dataset.stage,id)) {save();render();toast('本阶段已出发，收益与编成已锁定。');} return; }
    if(kind === 'deep-claim') { if(E.claimVoyageLeg(state,id,button.dataset.stage)) {save();render();toast('阶段报告已记录，回收物仍随船封存。');} return; }
    if(kind === 'deep-finish') { if(E.finishVoyage(state,id)) {save();render();toast('远航已归航入库，永久档案已保存。');} return; }
    if (kind === "sector-select") {
      if(E.setSurveyPriority(state,id)) { save(); render(); }
      return;
    }
    if (kind === "survey-start") {
      if(E.startSurvey(state,state.atlas.priority,id,button.dataset.node)) { save(); render(); toast("调查已出发，结果与编成已锁定。"); }
      return;
    }
    if (kind === "survey-claim") {
      if(E.claimSurvey(state,id)) { save(); render(); toast("调查已归档，下一处线索已更新。"); }
      return;
    }
    if (kind === "harbor-pack") { if(E.packHarborNeed(state,id)) {save();render();toast("预装资源已保留。");} return; }
    if (kind === "harbor-reserve") { if(E.reserveHarborNeed(state)) {save();render();toast("预算已保留，交付仍由你确认。");} return; }
    if (kind === "harbor-focus" || kind === "voyage-focus") {
      if (E.setHarborFocus(state, id)) toast("经营方向已调整；已接需求保留原方案。");
      render(); save(); return;
    }
    if (kind === "harbor-accept") {
      if (E.acceptHarborNeed(state, id, button.dataset.serial)) toast("需求已接下。生产和指定探索均可准备，没有期限。");
      render(); save(); return;
    }
    if (kind === "harbor-deliver") {
      if (E.deliverHarborNeed(state, id)) toast("居民需求已交付，回信与下一轮目标已保存。");
      render(); save(); return;
    }
    if (kind === "harbor-build") {
      if (E.buildHarborProject(state, id, button.dataset.level)) toast("星港工程已建成一期，总览与后续任务能力已更新。");
      render(); save(); return;
    }
    if (kind === "port-region") { showPortRegion(id); return; }
    if (kind === "region-go" || kind === "region-next") {
      const goal = E.nextGoal(state);
      closeDialog(); navigate(kind === "region-next" ? goal.action : "explore", kind === "region-next" ? goal.focus : id);
      return;
    }
    if (kind === "current-goal") {
      const goal = E.nextGoal(state);
      navigate(goal.action, goal.focus);
      return;
    }
    if (kind === "nav") {
      navigate(id, button.dataset.goalFocus);
      return;
    }
    if (kind === "cancel") {
      closeDialog();
      return;
    }
    if (kind === "return-report") {
      showReturn();
      return;
    }
    if (kind === "return-next") {
      const goal = E.nextGoal(state);
      closeDialog();
      navigate(goal.action, goal.focus);
      dialogOrigin = document.activeElement;
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
    else if (kind === "route") { if (E.chooseRoute(state, id)) toast("航线已确认，当前目标已更新。"); }
    else if (kind === "research") { if (E.research(state, id)) toast(`研究完成：${D.RESEARCH.find(r => r.id === id).name}。`); }
    else if (kind === "beacon") { const gain = E.claimBeacon(state); if (gain) toast(`信标补给 +${number(gain)} 星尘。`); }
    else if (kind === "prepare")
      E.prepareMission(state, button.dataset.mission, id);
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
      if (E.startMission(state, id)) { recentStory = null; toast(`探索已派遣，约 ${duration(state.mission.seconds)} 后归航。`); }
    } else if (kind === "risk") {
      if (E.startMission(state, id)) { recentStory = null; toast(`探索已派遣，约 ${duration(state.mission.seconds)} 后归航。`); }
      closeDialog();
    } else if (kind === "claim") {
      const story = state.result?.story;
      if (E.claimMission(state, id || undefined)) {
        recentStory = E.storyScene(state, story)?.response.length
          ? story
          : null;
        toast(story ? "重要发现已永久归档，故事奖励已入库。" : "探索回收物已入库，当前目标已更新。");
      }
    } else if (kind === "encounter") {
      if (E.chooseEncounter(state, button.dataset.token, id)) toast("发现处理方案已确认，结果与航行记录会自动保存。");
    } else if (kind === "resident-accept") E.acceptResidentRequest(state, id);
    else if (kind === "resident-reply") {
      if (E.completeResidentRequest(state, id, button.dataset.reply)) toast("回信与收藏已归档。星港的日常还会继续。");
    } else if (kind === "equip") E.equip(state, id);
    else if (kind === "loadout-save") {
      if (E.saveLoadout(state, id))
        toast(`${D.LOADOUTS.find((p) => p.id === id).name}方案已保存。`);
    } else if (["loadout-apply", "loadout-quick"].includes(kind)) {
      if (E.applyLoadout(state, id))
        toast("装备方案已切换，当前生产按新装备运行；已出发航程保留原准备。");
    } else if (kind === "port-focus") {
      const offer = E.portFocusOffer(state, id);
      if (!offer?.available) return;
      openDialog(
        "确定港口建设重点？",
        `<p>${offer.name}：${offer.detail}</p><p>使用 ${offer.samples} 份样本，建成后永久保留，不能重新选择。三种方向都能继续主线，所有结局均保留入口。</p><div class="dialog-actions"><button ${action("cancel")}>继续比较</button><button class="primary" ${action("confirm-port-focus", id)}>建设${offer.name}</button></div>`,
      );
      return;
    } else if (kind === "confirm-port-focus") {
      if (E.buildPortFocus(state, id)) {
        closeDialog();
        toast(
          `${D.PORT_FOCUSES.find((p) => p.id === id).name}已建成，航程预览已更新。`,
        );
      }
    } else if (kind === "rescue-energy") {
      const offer = E.rescueEnergyOffer(state, id);
      if (!offer?.available) return;
      openDialog(
        "安排本章救援供电？",
        `<p>${offer.name}：${offer.detail}</p><p>本章统一使用此方案，确认后保存，使用 ${offer.samples} 份样本。三队均能安全抵达。</p><div class="dialog-actions"><button ${action("cancel")}>继续比较</button><button class="primary" ${action("confirm-rescue-energy", id)}>确认供电安排</button></div>`,
      );
      return;
    } else if (kind === "confirm-rescue-energy") {
      if (E.arrangeRescueEnergy(state, id)) {
        closeDialog();
        toast("救援供电已安排，每队出发前逐项确认应答。");
      }
    } else if (kind === "rescue-berth") {
      if (E.confirmBackupBerth(state))
        toast("备用泊位与接班人已确认，等待没有期限。");
    } else if (kind === "rescue-check") {
      if (E.confirmRescue(state, button.dataset.mission, id))
        toast(
          `${D.RESCUE_CONFIRMATIONS.find((c) => c.id === id).name}已记录。`,
        );
    } else if (kind === "keeper-protocol") {
      if (E.adoptKeeperProtocol(state))
        toast("新守灯协议已共同签署，等待名单清空。");
    } else if (kind === "epilogue-confirm") {
      if (E.confirmEpilogue(state, id)) toast("居民交接已保存，不消耗资源。");
    } else if (kind === "ending-preview") {
      const offer = E.endingOffer(state, id);
      if (!offer || (!offer.available && !state.epilogue.ending)) return;
      openDialog(
        `${state.epilogue.ending ? "尾声重读" : "结局预览"} · ${offer.title}`,
        `${endingText(offer, "preview")}<p>${state.epilogue.ending ? "此处仅为阅读，不会改写已经确认的结局。" : "这是永久结局，确认后不能改选。无需资源，不重置进度；结局后仍能自由游玩。"}</p><div class="dialog-actions"><button ${action("cancel")}>${state.epilogue.ending ? "返回星港" : "继续比较"}</button>${offer.available ? `<button class="primary" ${action("confirm-ending", id)}>确认结局 · ${offer.title}</button>` : ""}</div>`,
      );
      return;
    } else if (kind === "confirm-ending") {
      if (E.chooseEnding(state, id)) {
        closeDialog();
        toast("六章主线已完成。你的结局永久保留，星港仍然继续运转。");
      }
    } else if (kind === "module") {
      if (E.buildModule(state, id))
        toast(
          `${D.MODULES.find((m) => m.id === id).name}已升至 ${state.modules[id]} 级。${state.equipped.includes(id) ? "舰装效果已生效。" : "可在随舰装备中替换装备。"}`,
        );
    } else if (kind === "port") {
      if (E.repairPort(state)) toast("航站的一盏灯，重新亮起了。");
    } else if (kind === "project") {
      if (E.buildProject(state, id))
        toast(
          `${D.PROJECTS.find((p) => p.id === id).name}已建成，永久效果已生效。`,
        );
    } else if (kind === "dispatch-stop") {
      E.configure(state, { dispatch: false });
      toast("本次探索继续。归航后将等待你的下一次安排。");
    } else if (kind === "jump") {
      openDialog(
        "开启下一航次？",
        `<p>获得 ${E.prestigeGain(state)} 星核，并解锁${D.CAPABILITIES.find((c) => c.run === state.rebirths + 1)?.name || "新航次"}。</p><p>临时设施、研究和本轮星尘重置。舰装、故事、样本、星核、星港修复与远航建设保留，新航次携带 1 艘无人机与 12 星尘。</p><div class="dialog-actions"><button ${action("cancel")}>继续这一航次</button><button class="primary" ${action("confirm-jump")}>启航</button></div>`,
      );
      return;
    } else if (kind === "confirm-jump") {
      if (E.prestige(state)) {
        recentStory = null;
        closeDialog();
        page = "fleet";
        toast("新的航次已开始，自动购买已启动。");
      }
    } else if (kind === "export") {
      exportSave();
      return;
    } else if (kind === "raw-export" || kind === "backup-export") {
      try {
        const text = kind === "raw-export" ? storage.getItem(S.KEY) : S.readBackup(storage, id)?.text;
        if (text === null || text === undefined) toast("还没有可导出的本机记录。");
        else downloadText(text, kind === "raw-export" ? "拾荒航线-本机原文" : "拾荒航线-备份原文");
      } catch (error) { toast(`未能导出：${error.message}`); }
      return;
    } else if (kind === "checkpoint") {
      if (blocked || !save()) return;
      try {
        S.checkpoint(storage, JSON.stringify(state), "manual", $("#backup-label")?.value || "");
        settings();
        toast("手动备份已保存并通过写入校验。");
      } catch (error) { toast(`备份未能完成：${error.message}。当前进度未被替换。`); }
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
        if (conflicted) throw new Error("另一窗口正在运行");
        state = S.reset(storage, Date.now(), { expected: persistedText, ...(!blocked ? { snapshot: JSON.stringify(state) } : {}) });
        persistedText = JSON.stringify(state);
        lastReturnReport = null;
        absence = null;
        recentStory = null;
        blocked = false;
        page = "home";
        closeDialog();
      } catch (_) {
        toast("备份未能完成，当前记录已保留。");
        return;
      }
    } else if (kind === "backup") {
      try {
        const entry = S.readBackup(storage, id || "previous");
        if (entry) previewRestore(entry.text, entry.label || "本机备份", "confirm-backup");
        else toast("这份备份已变化，请重新打开设置。");
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
        previewRestore(text, "本机旧航站（完整旧记录仍会封存）", "confirm-legacy");
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
      `<p>${escape(loaded.error)}</p><p>原记录仍保留在本机，自动保存已经暂停。可先导出原文，再进入设置检查备份或导入记录。</p><div class="dialog-actions"><button ${action("raw-export")}>导出本机原始记录</button><button ${action("settings")}>查看备份与设置</button></div>`,
    );
  } else if (loaded.legacy)
    openDialog(
      "选择你的启航方式",
      `<p>这台设备上已有旧航站记录。可以继承星尘、星核和匹配舰队，也可以从一艘新无人机开始体验航线。</p><p>旧研究、远征和未领取奖励会完整保留，随时可回旧版继续。</p><div class="dialog-actions"><button ${action("cancel")}>从零启航</button><button class="primary" ${action("legacy")}>继承旧航站</button></div>`,
    );
  else if (lastReturnReport) showReturn();
  if (loaded.report?.seconds > 0 && !blocked) save();
  setInterval(() => {
    const offline = !wasVisible || Date.now() - state.lastAt > 30000;
    const report = E.advance(state, Date.now(), {
      offline,
      active: !offline,
      report: Boolean(absence) || offline,
    });
    if (absence) addAbsence(report);
    else if (offline && report.seconds >= 60 && !blocked) {
      lastReturnReport = report;
      save();
      if (!dialog.open) showReturn(report);
    }
    render();
  }, 250);
  setInterval(save, 5000);
  function syncVisibility(visible) {
    if (visible === wasVisible) { save(); return; }
    rememberReading();
    state.beacon.expiresAt = 0;
    const report = E.advance(state, Date.now(), {
      offline: !wasVisible,
      active: wasVisible,
      report: !wasVisible,
    });
    if (!wasVisible && absence) {
      addAbsence(report);
      const summary = E.returnReport(state, absence.before, absence.totals);
      absence = null;
      if (summary.seconds >= 60 && !blocked) {
        lastReturnReport = summary;
        if (!dialog.open) showReturn(summary);
      }
    }
    wasVisible = visible;
    document.documentElement.dataset.paused = String(!visible);
    if (!wasVisible)
      absence = {
        before: E.progressSnapshot(state),
        totals: {
          seconds: 0,
          dust: 0,
          spentDust: 0,
          missionsCompleted: 0,
          reportsClaimed: 0,
          capped: false,
        },
      };
    save();
    render();
  }
  document.addEventListener("visibilitychange", () => syncVisibility(!document.hidden));
  window.addEventListener("pagehide", () => syncVisibility(false));
  window.addEventListener("pageshow", (event) => {
    if (event.persisted || !wasVisible) syncVisibility(!document.hidden);
  });
  window.addEventListener("beforeunload", () => { rememberReading(); save(); });
  window.addEventListener("storage", (event) => {
    if (event.key !== S.KEY && event.key !== null) return;
    conflicted = true;
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
