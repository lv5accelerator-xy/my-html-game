/* v3 cloud save. Optional: without sign-in nothing loads and the game is unchanged. */
(function () {
  "use strict";
  const C = globalThis.SalvageCloudCore;
  const SDK = "https://www.gstatic.com/firebasejs/12.17.0";
  const LABELS = {
    off: "未登录", connecting: "正在连接", synced: "已同步", pending: "等待同步", syncing: "正在同步",
    choose: "需要你选择", offline: "离线", error: "同步失败", large: "已停止自动同步",
  };
  let bridge = null, adapter = null, unsubscribe = null, meta = C.normalizeMeta(null);
  let uid = null, name = "", status = "off", detail = "登录后可在其他设备继续同一份进度。";
  let timer = null, busy = false, firstCheck = true, interacted = false, stopped = false;
  let choice = null, signingIn = false, lastSyncedAt = 0;

  function persist() { C.saveMeta(bridge.storage, meta); }
  function setStatus(next, text) {
    status = next;
    if (text !== undefined) detail = text;
    render();
  }
  function time(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    const d = new Date(ms), pad = (n) => String(n).padStart(2, "0");
    return `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function friendly(error) {
    const code = String(error?.code || "");
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "登录窗口已关闭。";
    if (code === "auth/popup-blocked") return "浏览器拦截了登录窗口，请允许弹出窗口后重试。";
    if (code === "permission-denied") return "云端拒绝了这次操作，请重新登录后再试。";
    if (code === "unavailable" || code === "auth/network-request-failed" || !navigator.onLine) return "网络不可用，联网后会自动重试。";
    return error?.message ? String(error.message).slice(0, 120) : "未知错误。";
  }
  function offline(error) {
    return !navigator.onLine || ["unavailable", "auth/network-request-failed", "deadline-exceeded"].includes(String(error?.code || ""));
  }

  // ---------- Firebase (loaded only after the player chooses to sign in) ----------
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src; el.onload = resolve; el.onerror = () => reject(new Error("云服务配置未能载入。"));
      document.head.append(el);
    });
  }
  async function firebaseAdapter() {
    if (!globalThis.STELLAR_FIREBASE_CONFIG) await loadScript("../firebase-config.js");
    const config = globalThis.STELLAR_FIREBASE_CONFIG;
    if (!config?.apiKey) throw new Error("云服务尚未配置。");
    const [appApi, authApi, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-auth.js`), import(`${SDK}/firebase-firestore.js`),
    ]);
    // Default app name: shares the Google sign-in the old station already holds on this site.
    const app = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp(config);
    const auth = authApi.getAuth(app), db = fs.getFirestore(app);
    const ref = (id) => fs.doc(db, C.COLLECTION, id);
    return {
      onAuth: (cb) => authApi.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || "" } : null)),
      signIn: () => authApi.signInWithPopup(auth, new authApi.GoogleAuthProvider()),
      signOut: () => authApi.signOut(auth),
      async read(id) { const snap = await fs.getDoc(ref(id)); return snap.exists() ? snap.data() : null; },
      commit(id, expected, payload) {
        return fs.runTransaction(db, async (tx) => {
          const snap = await tx.get(ref(id));
          const actual = snap.exists() ? Number(snap.data().revision) || 0 : 0;
          if (actual !== expected) throw Object.assign(new Error("云端已被另一台设备更新。"), { code: "cloud/conflict" });
          tx.set(ref(id), { ...payload, revision: actual + 1, updatedAt: fs.serverTimestamp() });
          return actual + 1;
        });
      },
      remove: (id) => fs.deleteDoc(ref(id)),
    };
  }
  async function connect(interactive) {
    if (!adapter) {
      setStatus("connecting", "正在连接云服务…");
      try {
        // Browser tests provide an in-memory cloud; production always uses Firebase.
        adapter = globalThis.SalvageCloudTestAdapter || await firebaseAdapter();
      } catch (error) {
        adapter = null;
        setStatus(offline(error) ? "offline" : "error", `云服务未能载入：${friendly(error)}`);
        return;
      }
      unsubscribe = adapter.onAuth(onAuth);
    }
    if (interactive) {
      signingIn = true;
      try { await adapter.signIn(); }
      catch (error) { if (!uid) setStatus("off", friendly(error)); }
      finally { signingIn = false; }
    }
  }
  function onAuth(user) {
    if (!user) {
      uid = null; name = "";
      if (meta.uid) { meta = C.normalizeMeta({ deviceId: meta.deviceId }); persist(); }
      if (!signingIn) setStatus("off", "登录后可在其他设备继续同一份进度。");
      return;
    }
    if (uid === user.uid) return;
    uid = user.uid; name = user.name;
    if (meta.uid !== uid) { meta = C.normalizeMeta({ uid, deviceId: meta.deviceId }); persist(); }
    check();
  }

  // ---------- sync ----------
  async function check() {
    if (!uid || !adapter) return;
    if (busy) { schedule(5000); return; }
    busy = true; clearTimeout(timer); timer = null;
    setStatus("syncing", "正在检查云端记录…");
    try {
      const remote = await adapter.read(uid);
      let remoteText = null;
      if (remote) {
        try { remoteText = await C.decode(remote); bridge.inspect(remoteText); }
        catch (error) { setStatus("error", `云端记录无法读取，本机进度未受影响：${friendly(error)}`); return; }
      }
      // Before the player acts in this session, judge the save this device last left behind.
      const reopening = firstCheck && !interacted;
      const localText = reopening ? bridge.bootText : bridge.currentText();
      firstCheck = false;
      const result = C.decide({ uid, meta, remote, localText, remoteHash: C.hash(remoteText), blocked: bridge.blocked(), reopening });
      if (result.kind === "idle") setStatus("synced", "本机记录未能载入，暂不上传。");
      else if (result.kind === "create") await push(0);
      else if (result.kind === "adopt") { record(remote.revision, remoteText); setStatus("synced", syncedText(remote.clientSavedAt)); }
      else if (result.kind === "synced") { lastSyncedAt = remote.clientSavedAt; setStatus("synced", syncedText(remote.clientSavedAt)); }
      else if (result.kind === "push") await push(remote.revision);
      else if (result.kind === "pull") pull(remote, remoteText);
      else showChoice(remote, remoteText, result.reason);
    } catch (error) {
      setStatus(offline(error) ? "offline" : "error", friendly(error));
      if (offline(error)) schedule(C.RETRY_DELAY, true);
    } finally {
      busy = false;
      render();
    }
  }
  function syncedText(at) {
    lastSyncedAt = Number(at) || Date.now();
    return `云端进度保存于 ${time(lastSyncedAt)}。`;
  }
  function record(revision, text) {
    const p = C.progressOf(text);
    meta = C.normalizeMeta({ uid, revision, syncedHash: C.hash(text), deviceId: meta.deviceId, syncedCreatedAt: p.createdAt, syncedForeground: p.foreground });
    persist();
  }
  async function push(expected) {
    const text = bridge.currentText();
    if (!text || bridge.blocked()) { setStatus("synced", "本机记录未能载入，暂不上传。"); return; }
    if (stopped) return;
    const encoded = await C.encode(text);
    if (!C.fits(encoded)) {
      stopped = true;
      setStatus("large", "存档超过云端上限，已停止自动同步；本机存档不受影响，请在设置里导出备份。");
      return;
    }
    setStatus("syncing", "正在上传本机进度…");
    try {
      const summary = bridge.summary();
      const revision = await adapter.commit(uid, expected, {
        ...encoded, schema: bridge.schema(), gameVersion: bridge.gameVersion, deviceId: meta.deviceId,
        clientSavedAt: Number(summary.savedAt) || Date.now(), summary: C.summaryFields(summary),
      });
      record(revision, text);
      setStatus("synced", syncedText(summary.savedAt));
      // Progress made while uploading goes out with the next round.
      if (C.hash(bridge.currentText()) !== meta.syncedHash) schedule();
    } catch (error) {
      if (error?.code === "cloud/conflict") { busy = false; firstCheck = false; await check(); return; }
      setStatus(offline(error) ? "offline" : "error", friendly(error));
      schedule(C.RETRY_DELAY, true);
    }
  }
  function pull(remote, text) {
    if (!bridge.importText(text, "已载入另一台设备的云端进度，本机原进度已备份。")) {
      setStatus("error", "云端进度未能载入，本机进度未改变。");
      return;
    }
    record(remote.revision, bridge.currentText());
    setStatus("synced", syncedText(remote.clientSavedAt));
  }
  function schedule(delay = C.SYNC_DELAY, force = false) {
    if (!uid || stopped || status === "choose") return;
    if (timer && !force) return;
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  }
  async function flush() {
    timer = null;
    if (!uid || status === "choose" || stopped) return;
    if (!navigator.onLine) { setStatus("offline", "网络不可用，联网后会自动同步。"); return; }
    if (busy) { schedule(5000); return; }
    if (C.hash(bridge.currentText()) === meta.syncedHash) return;
    busy = true;
    try { await push(meta.revision ?? 0); } finally { busy = false; render(); }
  }
  function saved() {
    if (!uid || status === "choose" || stopped || firstCheck || meta.revision === null) return;
    if (C.hash(bridge.currentText()) === meta.syncedHash) return;
    // Keep an offline/error message visible until the retry settles it.
    if (status === "synced") setStatus("pending", "本机有新进度，稍后自动上传。");
    schedule();
  }

  // ---------- choosing between two saves ----------
  function showChoice(remote, remoteText, reason) {
    choice = { remote, remoteText, reason };
    setStatus("choose", "云端和本机都有新进度，需要你选择保留哪一份。");
    openChoice();
  }
  function openChoice() {
    if (!choice) return;
    const esc = bridge.escape, local = bridge.blocked() ? null : bridge.summary(), cloud = bridge.summaryOf(choice.remoteText);
    const rows = [
      ["保存时间", (s) => time(s.savedAt)], ["主线章节", (s) => `第 ${s.chapter} 章`],
      ["星港修复", (s) => String(s.starport)], ["跃迁次数", (s) => String(s.rebirths)], ["星核", (s) => bridge.number(s.cores)],
    ];
    const intro = choice.reason === "blocked"
      ? "本机记录未能正常载入。可以查看并改用云端进度；本机原文会先备份。"
      : choice.reason === "first"
        ? "这个账号已有云端进度，这台设备也有自己的进度。不会自动合并或覆盖，请选择保留哪一份。"
        : "两台设备在上次同步后都有新进度。不会自动合并或覆盖，请选择保留哪一份。";
    bridge.openDialog("选择要保留的进度", `<p>${esc(intro)}</p>
      <table class="restore-preview"><caption>本机与云端对照</caption><thead><tr><th scope="col">项目</th><th scope="col">这台设备</th><th scope="col">云端</th></tr></thead>
      <tbody>${rows.map(([label, f]) => `<tr><th scope="row">${esc(label)}</th><td>${local ? esc(f(local)) : "未载入"}</td><td>${esc(f(cloud))}</td></tr>`).join("")}</tbody></table>
      <p>未选的一份会存入本机备份，之后可在设置的备份里恢复。</p>
      <div class="dialog-actions">
        <button type="button" data-cloud-action="later">稍后决定</button>
        ${choice.reason === "blocked" ? "" : '<button type="button" data-cloud-action="keep-local">保留这台设备的进度</button>'}
        <button type="button" class="primary" data-cloud-action="use-cloud">查看并使用云端进度</button>
      </div>`);
  }
  function useCloud() {
    const pending = choice;
    if (!pending) return;
    bridge.previewRestore(pending.remoteText, "云端存档", "confirm-cloud", (ok) => {
      if (!ok) return;
      choice = null;
      record(pending.remote.revision, bridge.currentText());
      setStatus("synced", syncedText(pending.remote.clientSavedAt));
    });
  }
  async function keepLocal() {
    const pending = choice;
    if (!pending || busy) return;
    try { bridge.checkpoint(pending.remoteText, "云端进度（选择本机前）"); }
    catch (error) { bridge.toast(`云端进度未能备份，已取消：${error.message}`); return; }
    choice = null;
    bridge.closeDialog();
    busy = true;
    status = "syncing";
    try { await push(pending.remote.revision); } finally { busy = false; render(); }
    if (status === "synced") bridge.toast("已保留这台设备的进度；原云端进度已存入本机备份。");
  }

  // ---------- account actions ----------
  async function signOut() {
    // No final upload: it could meet a newer cloud copy mid-sign-out. Unsynced progress stays
    // on this device and is reconciled at the next sign-in.
    clearTimeout(timer); timer = null; choice = null;
    try { await adapter?.signOut(); } catch (_) { /* local state below is what matters */ }
    uid = null; name = "";
    meta = C.normalizeMeta({ deviceId: meta.deviceId }); persist();
    setStatus("off", "已退出。本机进度照常保存在这台设备。");
  }
  function confirmDelete() {
    bridge.openDialog("删除云存档", `<p>将删除这个账号保存在云端的拾荒航线进度，并退出登录。这台设备上的进度和备份不受影响。其他设备下次登录时会重新上传它们自己的进度。</p>
      <div class="dialog-actions"><button type="button" data-cloud-action="cancel">取消</button><button type="button" class="primary" data-cloud-action="delete-confirm">删除云存档</button></div>`);
  }
  async function deleteCloud() {
    if (!uid || busy) return;
    busy = true; clearTimeout(timer); timer = null;
    try {
      await adapter.remove(uid);
      busy = false;
      bridge.closeDialog();
      await adapter.signOut().catch(() => {});
      uid = null; choice = null; meta = C.normalizeMeta({ deviceId: meta.deviceId }); persist();
      setStatus("off", "云存档已删除并已退出。本机进度不受影响。");
      bridge.toast("云存档已删除。");
    } catch (error) {
      busy = false;
      bridge.toast(`未能删除：${friendly(error)}`);
    }
  }

  // ---------- settings panel ----------
  function inner() {
    const esc = bridge?.escape || String;
    const buttons = !uid
      ? `<button type="button" class="outline" data-cloud-action="sign-in" ${status === "connecting" ? "disabled" : ""}>使用 Google 登录</button>`
      : `${status === "choose" ? '<button type="button" class="primary" data-cloud-action="resolve">选择要保留的进度</button>' : `<button type="button" class="outline" data-cloud-action="sync" ${busy || stopped ? "disabled" : ""}>立即同步</button>`}
         <button type="button" class="outline" data-cloud-action="sign-out">退出登录</button>
         <button type="button" class="outline" data-cloud-action="delete">删除云存档</button>`;
    return `<legend>云存档</legend>
      <p data-cloud-status data-state="${status}"><strong>${LABELS[status]}</strong>${uid && name ? ` · ${esc(name)}` : ""}<br>${esc(detail)}</p>
      <div>${buttons}</div>
      <p>可选。不登录也能完整游玩；登录后进度自动上传，换设备时提示接续。只保存游戏进度与一个随机设备编号。</p>`;
  }
  function panel() { return `<fieldset class="reading-settings cloud-settings" data-cloud-panel>${inner()}</fieldset>`; }
  function render() {
    for (const el of document.querySelectorAll("[data-cloud-panel]")) {
      const focusedAction = document.activeElement?.dataset?.cloudAction;
      el.innerHTML = inner();
      if (focusedAction) el.querySelector(`[data-cloud-action="${focusedAction}"]`)?.focus();
    }
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-cloud-action]");
    if (!button || !bridge || button.disabled) return;
    const act = button.dataset.cloudAction;
    if (act === "sign-in") connect(true);
    else if (act === "sync") { if (uid) { clearTimeout(timer); timer = null; check(); } }
    else if (act === "sign-out") signOut();
    else if (act === "delete") confirmDelete();
    else if (act === "delete-confirm") deleteCloud();
    else if (act === "cancel" || act === "later") bridge.closeDialog();
    else if (act === "resolve") openChoice();
    else if (act === "use-cloud") useCloud();
    else if (act === "keep-local") keepLocal();
  });
  const markInteracted = () => { interacted = true; };
  document.addEventListener("pointerdown", markInteracted, { once: true, capture: true });
  document.addEventListener("keydown", markInteracted, { once: true, capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && timer) { clearTimeout(timer); flush(); }
  });
  window.addEventListener("online", () => { if (uid && status !== "choose") check(); });

  function attach(api) {
    if (bridge) return;
    bridge = api;
    meta = C.loadMeta(bridge.storage);
    if (!meta.deviceId) {
      const random = globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      meta.deviceId = random.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
      persist();
    }
    // Reconnect only for players who signed in before; everyone else loads nothing.
    if (meta.uid) connect(false);
  }

  globalThis.SalvageCloud = Object.freeze({
    attach, saved, panel, render,
    state: () => ({ status, uid, revision: meta.revision, synced: meta.syncedHash, choice: Boolean(choice), stopped, lastSyncedAt, busy, scheduled: Boolean(timer) }),
  });
})();
