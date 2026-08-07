const FIREBASE_SDK_VERSION = "12.17.0";
const FIREBASE_SDK_ROOT =
  `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;
const CLOUD_COLLECTION = "saves";
const LEADERBOARD_COLLECTION = "leaderboards";
const AUTO_SYNC_DELAY = 45_000;
const LEADERBOARD_SYNC_DELAY = 60_000;
const LEADERBOARD_LIMIT = 50;
const DEVICE_ID_KEY = "stellarOutpostCloudDeviceId_v1";

const $ = (selector) => document.querySelector(selector);
const elements = {
  accountButton: $("#account-button"),
  cloudStatusDot: $("#cloud-status-dot"),
  cloudMenuButton: $("#cloud-menu-button"),
  cloudMenuStatus: $("#cloud-menu-status"),
  settingsMenu: $("#settings-menu"),
  backdrop: $("#account-backdrop"),
  close: $("#account-close"),
  banner: $("#cloud-service-banner"),
  bannerIcon: $("#cloud-service-icon"),
  bannerTitle: $("#cloud-service-title"),
  bannerMessage: $("#cloud-service-message"),
  loadingView: $("#account-loading-view"),
  unconfiguredView: $("#account-unconfigured-view"),
  signedOutView: $("#account-signed-out-view"),
  signedInView: $("#account-signed-in-view"),
  error: $("#account-error"),
  googleLogin: $("#account-google-login"),
  googleLoginLabel: $("#account-google-login-label"),
  userEmail: $("#account-user-email"),
  signOut: $("#account-sign-out"),
  conflictPanel: $("#cloud-conflict-panel"),
  syncPanel: $("#cloud-sync-panel"),
  localSaveName: $("#local-save-name"),
  localSaveSummary: $("#local-save-summary"),
  remoteSaveName: $("#remote-save-name"),
  remoteSaveSummary: $("#remote-save-summary"),
  chooseLocal: $("#choose-local-save"),
  chooseCloud: $("#choose-cloud-save"),
  syncIcon: $("#cloud-sync-icon"),
  syncStatus: $("#cloud-sync-status"),
  syncTime: $("#cloud-sync-time"),
  upload: $("#cloud-upload"),
  download: $("#cloud-download"),
  leaderboardTab: $("#leaderboard-page-tab"),
  leaderboardStatus: $("#leaderboard-status"),
  leaderboardRefresh: $("#leaderboard-refresh"),
  leaderboardLogin: $("#leaderboard-login-button"),
  leaderboardServiceNote: $("#leaderboard-service-note"),
  leaderboardServiceTitle: $("#leaderboard-service-note strong"),
  leaderboardServiceMessage: $("#leaderboard-service-note p"),
  leaderboardUpdatedAt: $("#leaderboard-updated-at"),
  leaderboardList: $("#leaderboard-list"),
  leaderboardCategories: Array.from(
    document.querySelectorAll("[data-leaderboard-category]"),
  ),
};

let bridge = null;
let firebaseAppApi = null;
let firebaseAuthApi = null;
let firebaseFirestoreApi = null;
let auth = null;
let db = null;
let currentUser = null;
let knownRevision = null;
let remoteRecord = null;
let syncReady = false;
let dirty = false;
let applyingRemote = false;
let syncTimer = null;
let busy = false;
let serviceConfigured = false;
let serviceReady = false;
let leaderboardCategory = "careerDust";
let leaderboardTimer = null;
let leaderboardBusy = false;

function getDeviceId() {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created =
      globalThis.crypto?.randomUUID?.() ||
      `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch (error) {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const deviceId = getDeviceId();

function hasValidFirebaseConfig(config) {
  if (!config || typeof config !== "object") return false;
  return ["apiKey", "authDomain", "projectId", "appId"].every(
    (key) =>
      typeof config[key] === "string" &&
      config[key].trim().length > 0 &&
      !config[key].includes("YOUR_"),
  );
}

function setView(viewName) {
  elements.loadingView.hidden = viewName !== "loading";
  elements.unconfiguredView.hidden = viewName !== "unconfigured";
  elements.signedOutView.hidden = viewName !== "signed-out";
  elements.signedInView.hidden = viewName !== "signed-in";
}

function setBanner(kind, icon, title, message) {
  elements.banner.className = `cloud-service-banner ${kind || ""}`.trim();
  elements.bannerIcon.textContent = icon;
  elements.bannerTitle.textContent = title;
  elements.bannerMessage.textContent = message;
}

function setCloudState(stateName, label, title) {
  elements.accountButton.dataset.cloudState = stateName;
  elements.cloudMenuButton.dataset.cloudState = stateName;
  elements.cloudMenuStatus.textContent = label;
  elements.accountButton.title = title;
  elements.accountButton.setAttribute("aria-label", title);
}

function setSyncStatus(stateName, status, detail, icon = "☁") {
  elements.syncIcon.textContent = icon;
  elements.syncStatus.textContent = status;
  elements.syncTime.textContent = detail;
  const labels = {
    local: "本地",
    "signed-out": "登录",
    syncing: "同步",
    synced: "已同步",
    conflict: "冲突",
    error: "异常",
  };
  setCloudState(
    stateName,
    labels[stateName] || "本地",
    `账号与云端存档 · ${status}`,
  );
}

function openAccount() {
  elements.settingsMenu.hidden = true;
  elements.backdrop.hidden = false;
  document.body.classList.add("cloud-account-open");
  window.requestAnimationFrame(() => {
    if (!serviceConfigured) {
      elements.close.focus();
    } else if (!currentUser) {
      elements.googleLogin.focus();
    } else if (!elements.conflictPanel.hidden) {
      elements.chooseLocal.focus();
    } else {
      elements.upload.focus();
    }
  });
}

function closeAccount() {
  elements.backdrop.hidden = true;
  document.body.classList.remove("cloud-account-open");
  elements.accountButton.focus();
}

function setBusy(nextBusy) {
  busy = nextBusy;
  [
    elements.googleLogin,
    elements.signOut,
    elements.chooseLocal,
    elements.chooseCloud,
    elements.upload,
    elements.download,
  ].forEach((button) => {
    button.disabled = nextBusy;
  });
}

function clearAuthError() {
  elements.error.textContent = "";
}

function friendlyError(error) {
  const code = String(error?.code || "");
  const messages = {
    "auth/popup-blocked": "登录窗口被浏览器拦截，请允许弹出窗口后重试。",
    "auth/popup-closed-by-user": "登录窗口已关闭，尚未连接账号。",
    "auth/cancelled-popup-request": "已有一个登录窗口正在打开。",
    "auth/unauthorized-domain": "当前网站域名尚未获得 Firebase 登录授权。",
    "auth/operation-not-allowed": "Firebase 项目尚未启用 Google 登录。",
    "auth/account-exists-with-different-credential": "这个邮箱已使用其他登录方式创建账号。",
    "auth/too-many-requests": "尝试次数过多，请稍后再试。",
    "auth/network-request-failed": "网络连接失败，本地存档仍会继续保存。",
    "permission-denied": "云端拒绝了本次操作，请检查 Firestore 安全规则。",
    "cloud/conflict": "云端记录已被另一台设备更新，请先选择要保留的存档。",
  };
  return messages[code] || "云端航站暂时无法完成操作，请稍后重试。";
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  return `${minutes} 分钟`;
}

function formatGameNumber(value) {
  const numeric = Math.max(0, Number(value) || 0);
  if (numeric >= 1e9) {
    return numeric.toExponential(2).replace("+", "").toUpperCase();
  }
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: numeric < 100 ? 1 : 0,
  }).format(numeric);
}

function formatSaveTime(value) {
  const date = new Date(Number(value) || 0);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= 0) {
    return "时间未知";
  }
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LEADERBOARD_CATEGORIES = Object.freeze({
  careerDust: {
    field: "careerDust",
    label: "累计星尘",
  },
  highestPower: {
    field: "highestPower",
    label: "最高综合战力",
  },
  battleCount: {
    field: "battleCount",
    label: "战斗次数",
  },
});

function setLeaderboardStatus(stateName, label) {
  if (!elements.leaderboardStatus) return;
  elements.leaderboardStatus.dataset.state = stateName;
  elements.leaderboardStatus.textContent = label;
}

function setLeaderboardNote(title, message, { hidden = false } = {}) {
  if (!elements.leaderboardServiceNote) return;
  elements.leaderboardServiceTitle.textContent = title;
  elements.leaderboardServiceMessage.textContent = message;
  elements.leaderboardServiceNote.hidden = hidden;
}

function renderLeaderboardEmpty(message) {
  if (!elements.leaderboardList) return;
  elements.leaderboardList.textContent = "";
  const item = document.createElement("li");
  item.className = "leaderboard-empty";
  item.textContent = message;
  elements.leaderboardList.appendChild(item);
}

function leaderboardTimestamp(value) {
  if (value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return Number(value) || 0;
}

function normalizeLeaderboardEntry(snapshot) {
  const data = snapshot?.data?.();
  if (!data || typeof data !== "object") return null;
  return {
    id: snapshot.id,
    playerName: String(data.playerName || "未命名指挥官").slice(0, 12),
    careerDust: Math.max(0, Number(data.careerDust) || 0),
    highestPower: Math.max(0, Number(data.highestPower) || 0),
    battleCount: Math.max(0, Math.floor(Number(data.battleCount) || 0)),
    transcensions: Math.max(
      0,
      Math.floor(Number(data.transcensions) || 0),
    ),
    updatedAt: leaderboardTimestamp(data.updatedAt),
  };
}

function renderLeaderboardRows(entries) {
  if (!elements.leaderboardList) return;
  elements.leaderboardList.textContent = "";
  const category = LEADERBOARD_CATEGORIES[leaderboardCategory];
  if (!entries.length) {
    renderLeaderboardEmpty("这个分类还没有指挥官留下记录。");
    return;
  }
  entries.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = `leaderboard-row${
      entry.id === currentUser?.uid ? " is-current" : ""
    }`;

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${index + 1}`;

    const identity = document.createElement("span");
    identity.className = "leaderboard-identity";
    const name = document.createElement("strong");
    name.textContent = entry.playerName;
    const detail = document.createElement("small");
    detail.textContent = `奇点超越 ${entry.transcensions} 次${
      entry.id === currentUser?.uid ? " · 当前账号" : ""
    }`;
    identity.append(name, detail);

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    const value = document.createElement("strong");
    value.textContent = formatGameNumber(entry[category.field]);
    const scoreLabel = document.createElement("small");
    scoreLabel.textContent = category.label;
    score.append(value, scoreLabel);

    row.append(rank, identity, score);
    elements.leaderboardList.appendChild(row);
  });
}

function updateLeaderboardAccessState() {
  if (!elements.leaderboardRefresh) return;
  elements.leaderboardRefresh.disabled =
    !currentUser || !serviceReady || !syncReady || leaderboardBusy;
  elements.leaderboardLogin.hidden = Boolean(currentUser);
  if (!serviceConfigured) {
    setLeaderboardStatus("error", "服务未配置");
    setLeaderboardNote(
      "排行榜服务尚未配置",
      "本地永久记录仍会正常保存，完成 Firebase 配置后即可参加排名。",
    );
  } else if (!serviceReady) {
    setLeaderboardStatus("error", "连接异常");
    setLeaderboardNote(
      "排行榜暂时无法连接",
      "请检查网络连接；本地游戏与永久记录不受影响。",
    );
  } else if (!currentUser) {
    setLeaderboardStatus("local", "本地记录");
    setLeaderboardNote(
      "登录后查看跨设备排行榜",
      "本地记录不会丢失，登录并确认云存档后才会发布成绩。",
    );
  } else if (!syncReady) {
    setLeaderboardStatus("loading", "等待存档确认");
    setLeaderboardNote(
      "先确认本设备使用的存档",
      "云端存档确认完成后，系统才会上传这份进度的排行榜成绩。",
    );
  } else if (elements.leaderboardStatus?.dataset.state !== "error") {
    setLeaderboardNote("排行榜已连接", "当前成绩会定时更新。", {
      hidden: true,
    });
  }
}

function refreshLeaderboardIfVisible(delay = 250) {
  if (!elements.leaderboardTab?.classList.contains("active")) return;
  window.setTimeout(() => refreshLeaderboard(), delay);
}

function renderSaveSummary(container, metadata) {
  container.textContent = "";
  const rows = [
    ["游玩时间", formatDuration(metadata.playTime)],
    ["历史星尘", formatGameNumber(metadata.lifetimeDust)],
    ["历史星核", formatGameNumber(metadata.totalCores)],
    ["奇点超越", `${metadata.transcensions || 0} 次`],
    ["存档时间", formatSaveTime(metadata.lastSeen)],
  ];
  rows.forEach(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const detail = document.createElement("dd");
    detail.textContent = value;
    container.append(term, detail);
  });
}

function showConflict(record) {
  if (!record?.snapshot) return;
  remoteRecord = record;
  knownRevision = record.revision;
  syncReady = false;
  const localSnapshot = bridge.createSnapshot();
  const localMetadata = bridge.getMetadata(localSnapshot);
  const remoteMetadata = bridge.getMetadata(record.snapshot);
  elements.localSaveName.textContent = localMetadata.playerName;
  elements.remoteSaveName.textContent = remoteMetadata.playerName;
  renderSaveSummary(elements.localSaveSummary, localMetadata);
  renderSaveSummary(elements.remoteSaveSummary, remoteMetadata);
  elements.conflictPanel.hidden = false;
  setSyncStatus(
    "conflict",
    "等待选择存档",
    "检测到其他设备的云端记录",
    "!",
  );
  updateLeaderboardAccessState();
  if (elements.backdrop.hidden) {
    window.setTimeout(openAccount, 300);
  }
}

function hideConflict() {
  elements.conflictPanel.hidden = true;
}

function normalizeRemoteRecord(snapshot) {
  if (!snapshot?.exists()) return null;
  const data = snapshot.data();
  if (
    !data ||
    typeof data !== "object" ||
    !data.snapshot ||
    typeof data.snapshot !== "object"
  ) {
    return null;
  }
  return {
    revision: Math.max(0, Math.floor(Number(data.revision) || 0)),
    deviceId: typeof data.deviceId === "string" ? data.deviceId : "",
    clientSavedAt: Math.max(
      0,
      Number(data.clientSavedAt) ||
        Number(data.snapshot.lastSeen) ||
        0,
    ),
    snapshot: data.snapshot,
  };
}

async function readRemoteRecord() {
  if (!currentUser || !db) return null;
  const reference = firebaseFirestoreApi.doc(
    db,
    CLOUD_COLLECTION,
    currentUser.uid,
  );
  const snapshot = await firebaseFirestoreApi.getDoc(reference);
  return normalizeRemoteRecord(snapshot);
}

function getLocalLeaderboardEntry() {
  if (!bridge?.getLeaderboardEntry) return null;
  const entry = bridge.getLeaderboardEntry();
  return {
    playerName: String(entry.playerName || "未命名指挥官").slice(0, 12),
    careerDust: Math.min(1e300, Math.max(0, Number(entry.careerDust) || 0)),
    highestPower: Math.min(
      1e300,
      Math.max(0, Number(entry.highestPower) || 0),
    ),
    battleCount: Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(0, Math.floor(Number(entry.battleCount) || 0)),
    ),
    transcensions: Math.min(
      Number.MAX_SAFE_INTEGER,
      Math.max(0, Math.floor(Number(entry.transcensions) || 0)),
    ),
  };
}

function clearLeaderboardTimer() {
  if (leaderboardTimer !== null) {
    window.clearTimeout(leaderboardTimer);
    leaderboardTimer = null;
  }
}

function scheduleLeaderboardPublish(delay = LEADERBOARD_SYNC_DELAY) {
  if (
    leaderboardTimer !== null ||
    !currentUser ||
    !syncReady ||
    !navigator.onLine
  ) {
    return;
  }
  leaderboardTimer = window.setTimeout(() => {
    leaderboardTimer = null;
    publishLeaderboardEntry({ silent: true }).catch(() => {
      // The leaderboard panel shows a recoverable status on the next visit.
    });
  }, Math.max(800, delay));
}

async function publishLeaderboardEntry({ silent = false } = {}) {
  if (!currentUser || !db || !bridge || !syncReady) return false;
  const localEntry = getLocalLeaderboardEntry();
  if (!localEntry) return false;
  const userId = currentUser.uid;
  const reference = firebaseFirestoreApi.doc(
    db,
    LEADERBOARD_COLLECTION,
    userId,
  );
  clearLeaderboardTimer();
  if (!silent) setLeaderboardStatus("loading", "正在上传成绩");
  try {
    await firebaseFirestoreApi.runTransaction(
      db,
      async (transaction) => {
        const remoteSnapshot = await transaction.get(reference);
        const remote = remoteSnapshot.exists()
          ? remoteSnapshot.data()
          : {};
        transaction.set(reference, {
          gameVersion: bridge.gameVersion,
          playerName: localEntry.playerName,
          careerDust: Math.max(
            localEntry.careerDust,
            Number(remote.careerDust) || 0,
          ),
          highestPower: Math.max(
            localEntry.highestPower,
            Number(remote.highestPower) || 0,
          ),
          battleCount: Math.max(
            localEntry.battleCount,
            Math.floor(Number(remote.battleCount) || 0),
          ),
          transcensions: Math.max(
            localEntry.transcensions,
            Math.floor(Number(remote.transcensions) || 0),
          ),
          updatedAt: firebaseFirestoreApi.serverTimestamp(),
        });
      },
    );
    setLeaderboardStatus(
      "online",
      silent ? "成绩已同步" : "成绩已上传",
    );
    return true;
  } catch (error) {
    setLeaderboardStatus("error", "排行榜异常");
    setLeaderboardNote(
      "成绩暂时无法上传",
      error?.code === "permission-denied"
        ? "排行榜安全规则尚未生效，或当前登录状态已经过期。"
        : friendlyError(error),
    );
    throw error;
  } finally {
    updateLeaderboardAccessState();
  }
}

async function loadLeaderboard() {
  updateLeaderboardAccessState();
  if (!currentUser || !db || !serviceReady) {
    renderLeaderboardEmpty("登录后即可读取排行榜。");
    return;
  }
  if (!syncReady) {
    renderLeaderboardEmpty("请先在账号窗口确认要使用的云端存档。");
    return;
  }
  const category = LEADERBOARD_CATEGORIES[leaderboardCategory];
  leaderboardBusy = true;
  setLeaderboardStatus("loading", "正在读取排名");
  updateLeaderboardAccessState();
  try {
    const rankingQuery = firebaseFirestoreApi.query(
      firebaseFirestoreApi.collection(db, LEADERBOARD_COLLECTION),
      firebaseFirestoreApi.orderBy(category.field, "desc"),
      firebaseFirestoreApi.limit(LEADERBOARD_LIMIT),
    );
    const snapshot = await firebaseFirestoreApi.getDocs(rankingQuery);
    const entries = snapshot.docs
      .map(normalizeLeaderboardEntry)
      .filter(Boolean);
    renderLeaderboardRows(entries);
    setLeaderboardStatus("online", "排行榜在线");
    elements.leaderboardUpdatedAt.textContent =
      `前 ${LEADERBOARD_LIMIT} 名 · 更新于 ${formatSaveTime(Date.now())}`;
    setLeaderboardNote("排行榜已连接", "当前成绩会定时更新。", {
      hidden: true,
    });
  } catch (error) {
    setLeaderboardStatus("error", "读取失败");
    renderLeaderboardEmpty("排行榜暂时无法读取，请稍后重试。");
    setLeaderboardNote(
      "排行榜暂时无法读取",
      error?.code === "permission-denied"
        ? "请确认已经登录，并部署最新的 Firestore 排行榜安全规则。"
        : friendlyError(error),
    );
  } finally {
    leaderboardBusy = false;
    updateLeaderboardAccessState();
  }
}

async function refreshLeaderboard() {
  if (!currentUser || !syncReady || leaderboardBusy) return;
  leaderboardBusy = true;
  updateLeaderboardAccessState();
  try {
    await publishLeaderboardEntry({ silent: true });
  } catch (error) {
    // Loading may still succeed and show the last accepted score.
  } finally {
    leaderboardBusy = false;
  }
  await loadLeaderboard();
}

async function deleteLeaderboardEntry() {
  clearLeaderboardTimer();
  if (!currentUser || !db) return;
  try {
    const reference = firebaseFirestoreApi.doc(
      db,
      LEADERBOARD_COLLECTION,
      currentUser.uid,
    );
    await firebaseFirestoreApi.deleteDoc(reference);
    setLeaderboardStatus("online", "榜单记录已重置");
    renderLeaderboardEmpty("当前账号的新纪录会在下一次同步后重新加入排行榜。");
    scheduleLeaderboardPublish(2_000);
  } catch (error) {
    setLeaderboardStatus("error", "榜单重置失败");
  }
}

function clearSyncTimer() {
  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }
}

function scheduleCloudSync(delay = AUTO_SYNC_DELAY) {
  clearSyncTimer();
  if (!currentUser || !syncReady || !dirty || !navigator.onLine) return;
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    uploadLocalSave().catch(() => {
      // uploadLocalSave updates the visible status and keeps the dirty marker.
    });
  }, Math.max(500, delay));
}

async function uploadLocalSave({ force = false } = {}) {
  if (!currentUser || !db || !bridge) return;
  if (!force && !syncReady) return;
  const localSnapshot = bridge.createSnapshot();
  const metadata = bridge.getMetadata(localSnapshot);
  const expectedRevision = Math.max(0, Number(knownRevision) || 0);
  const reference = firebaseFirestoreApi.doc(
    db,
    CLOUD_COLLECTION,
    currentUser.uid,
  );

  clearSyncTimer();
  setSyncStatus("syncing", "正在上传本地存档", "请保持网络连接", "↥");
  try {
    const result = await firebaseFirestoreApi.runTransaction(
      db,
      async (transaction) => {
        const remoteSnapshot = await transaction.get(reference);
        const current = normalizeRemoteRecord(remoteSnapshot);
        const actualRevision = current?.revision || 0;
        if (!force && actualRevision !== expectedRevision) {
          const conflictError = new Error("Cloud revision changed");
          conflictError.code = "cloud/conflict";
          throw conflictError;
        }
        const nextRevision = actualRevision + 1;
        transaction.set(reference, {
          gameVersion: bridge.gameVersion,
          saveVersion: bridge.saveVersion,
          revision: nextRevision,
          updatedAt: firebaseFirestoreApi.serverTimestamp(),
          clientSavedAt: metadata.lastSeen,
          deviceId,
          playerName: metadata.playerName,
          playTime: metadata.playTime,
          lifetimeDust: metadata.lifetimeDust,
          totalCores: metadata.totalCores,
          transcensions: metadata.transcensions,
          snapshot: localSnapshot,
        });
        return { revision: nextRevision };
      },
    );
    knownRevision = result.revision;
    remoteRecord = {
      revision: result.revision,
      deviceId,
      clientSavedAt: metadata.lastSeen,
      snapshot: localSnapshot,
    };
    syncReady = true;
    dirty = false;
    hideConflict();
    setSyncStatus(
      "synced",
      "云端存档已同步",
      `最近同步 ${formatSaveTime(metadata.lastSeen)}`,
      "✓",
    );
    scheduleLeaderboardPublish(1_500);
    updateLeaderboardAccessState();
    refreshLeaderboardIfVisible();
  } catch (error) {
    dirty = true;
    if (error?.code === "cloud/conflict") {
      try {
        const latest = await readRemoteRecord();
        if (latest) showConflict(latest);
      } catch (readError) {
        setSyncStatus("error", "无法读取冲突记录", friendlyError(readError), "!");
      }
    } else {
      setSyncStatus("error", "云端同步失败", friendlyError(error), "!");
      scheduleCloudSync(AUTO_SYNC_DELAY);
    }
    throw error;
  }
}

function applyRemoteSave(record, { claimCurrentDevice = false } = {}) {
  if (!record?.snapshot) return;
  applyingRemote = true;
  try {
    bridge.applySnapshot(record.snapshot);
  } finally {
    applyingRemote = false;
  }
  knownRevision = record.revision;
  remoteRecord = record;
  syncReady = true;
  dirty = claimCurrentDevice;
  hideConflict();
  setSyncStatus(
    "synced",
    "已载入云端存档",
    claimCurrentDevice
      ? "正在将当前设备登记为最新航站"
      : `云端记录 ${formatSaveTime(record.clientSavedAt)}`,
    "✓",
  );
  if (claimCurrentDevice) {
    scheduleCloudSync(1_500);
  }
  scheduleLeaderboardPublish(1_800);
  updateLeaderboardAccessState();
  refreshLeaderboardIfVisible();
}

async function promptRemoteChoice() {
  if (!currentUser || busy) return;
  setBusy(true);
  setSyncStatus("syncing", "正在读取云端存档", "请稍候", "↧");
  try {
    const latest = await readRemoteRecord();
    if (!latest) {
      setSyncStatus("synced", "云端尚无存档", "可上传当前本地进度", "☁");
      bridge.notify("没有云端记录", "可以先上传当前设备的本地存档。", "☁");
      return;
    }
    showConflict(latest);
  } catch (error) {
    setSyncStatus("error", "读取云端失败", friendlyError(error), "!");
  } finally {
    setBusy(false);
  }
}

async function chooseLocalSave() {
  if (busy) return;
  setBusy(true);
  try {
    syncReady = true;
    dirty = true;
    await uploadLocalSave({ force: true });
    bridge.notify("已保留本地存档", "当前设备的进度已上传并成为最新云端记录。", "↥");
  } catch (error) {
    // The upload function already displays a precise status.
  } finally {
    setBusy(false);
  }
}

function chooseCloudSave() {
  if (busy || !remoteRecord) return;
  setBusy(true);
  try {
    applyRemoteSave(remoteRecord, { claimCurrentDevice: true });
  } finally {
    setBusy(false);
  }
}

async function handleSignedIn(user) {
  currentUser = user;
  elements.userEmail.textContent = user.email || "已验证账号";
  setView("signed-in");
  setBanner(
    "success",
    "✓",
    "账号已连接",
    "本地存档仍会保留，云端仅保存此账号自己的记录。",
  );
  clearSyncTimer();
  clearLeaderboardTimer();
  knownRevision = null;
  remoteRecord = null;
  syncReady = false;
  dirty = false;
  hideConflict();
  setSyncStatus("syncing", "正在检查云端记录", "请稍候", "◇");
  updateLeaderboardAccessState();

  try {
    const latest = await readRemoteRecord();
    const localSnapshot = bridge.createSnapshot();
    const localMetadata = bridge.getMetadata(localSnapshot);
    if (!latest) {
      knownRevision = 0;
      syncReady = true;
      dirty = true;
      await uploadLocalSave();
      bridge.notify("云端航站已建立", "当前本地进度已成为这个账号的首份云存档。", "☁");
      return;
    }

    knownRevision = latest.revision;
    remoteRecord = latest;
    if (latest.deviceId === deviceId) {
      syncReady = true;
      if (latest.clientSavedAt > localMetadata.lastSeen + 1_500) {
        applyRemoteSave(latest);
      } else if (localMetadata.lastSeen > latest.clientSavedAt + 1_500) {
        dirty = true;
        setSyncStatus(
          "synced",
          "本地进度等待同步",
          `云端记录 ${formatSaveTime(latest.clientSavedAt)}`,
          "☁",
        );
        scheduleCloudSync(3_000);
      } else {
        setSyncStatus(
          "synced",
          "云端存档已同步",
          `最近同步 ${formatSaveTime(latest.clientSavedAt)}`,
          "✓",
        );
      }
      scheduleLeaderboardPublish(1_500);
      updateLeaderboardAccessState();
      refreshLeaderboardIfVisible();
      return;
    }

    showConflict(latest);
  } catch (error) {
    setSyncStatus("error", "无法检查云端记录", friendlyError(error), "!");
  }
}

function handleSignedOut() {
  currentUser = null;
  knownRevision = null;
  remoteRecord = null;
  syncReady = false;
  dirty = false;
  clearSyncTimer();
  clearLeaderboardTimer();
  hideConflict();
  setView("signed-out");
  setBanner(
    "",
    "◇",
    "使用 Google 账号同步游戏进度",
    "未登录时继续使用当前浏览器的本地自动存档。",
  );
  setCloudState(
    "signed-out",
    "登录",
    "账号与云端存档 · 当前未登录",
  );
  clearAuthError();
  updateLeaderboardAccessState();
  renderLeaderboardEmpty("登录后即可读取排行榜。");
  elements.leaderboardUpdatedAt.textContent = "等待连接排行榜服务";
}

async function signInWithGoogle() {
  if (!serviceReady || busy) return;
  clearAuthError();
  setBusy(true);
  elements.googleLoginLabel.textContent = "正在打开安全登录窗口……";
  try {
    const provider = new firebaseAuthApi.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await firebaseAuthApi.signInWithPopup(auth, provider);
  } catch (error) {
    elements.error.textContent = friendlyError(error);
  } finally {
    elements.googleLoginLabel.textContent = "使用 Google 登录";
    setBusy(false);
  }
}

async function signOutAccount() {
  if (!serviceReady || busy) return;
  setBusy(true);
  if (dirty && syncReady && navigator.onLine) {
    try {
      await uploadLocalSave();
    } catch (error) {
      // Signing out must remain available even when the final sync fails.
    }
  }
  try {
    await firebaseAuthApi.signOut(auth);
    bridge.notify("已退出云端账号", "本地存档仍保留在当前设备。", "◇");
  } catch (error) {
    setSyncStatus("error", "退出前同步失败", friendlyError(error), "!");
  } finally {
    setBusy(false);
  }
}

function bindUi() {
  elements.accountButton.addEventListener("click", openAccount);
  elements.cloudMenuButton.addEventListener("click", openAccount);
  elements.close.addEventListener("click", closeAccount);
  elements.backdrop.addEventListener("click", (event) => {
    if (event.target === elements.backdrop) closeAccount();
  });
  elements.googleLogin.addEventListener("click", signInWithGoogle);
  elements.signOut.addEventListener("click", signOutAccount);
  elements.chooseLocal.addEventListener("click", chooseLocalSave);
  elements.chooseCloud.addEventListener("click", chooseCloudSave);
  elements.upload.addEventListener("click", async () => {
    if (busy) return;
    setBusy(true);
    try {
      dirty = true;
      await uploadLocalSave();
      bridge.notify("云端同步完成", "当前本地进度已上传。", "✓");
    } catch (error) {
      // The sync status already shows the failure.
    } finally {
      setBusy(false);
    }
  });
  elements.download.addEventListener("click", promptRemoteChoice);
  // Optional chaining: the leaderboard page markup isn't in index.html yet,
  // so these elements are currently null. Without the "?." here, this line
  // throws and aborts the rest of bindUi() — including the stellar-local-save
  // listener below, which is what drives automatic cloud sync. That's why
  // uploads/downloads and even login were silently failing.
  elements.leaderboardLogin?.addEventListener("click", openAccount);
  elements.leaderboardRefresh?.addEventListener("click", refreshLeaderboard);
  elements.leaderboardCategories.forEach((button) => {
    button.addEventListener("click", () => {
      const nextCategory = button.dataset.leaderboardCategory;
      if (!LEADERBOARD_CATEGORIES[nextCategory]) return;
      leaderboardCategory = nextCategory;
      elements.leaderboardCategories.forEach((entry) => {
        entry.classList.toggle(
          "active",
          entry.dataset.leaderboardCategory === leaderboardCategory,
        );
      });
      loadLeaderboard();
    });
  });
  window.addEventListener("stellar-leaderboard-open", () => {
    if (currentUser && syncReady) {
      refreshLeaderboard();
    } else {
      updateLeaderboardAccessState();
    }
  });
  window.addEventListener("stellar-career-reset", () => {
    deleteLeaderboardEntry();
  });
  window.addEventListener("online", () => {
    if (currentUser && dirty && syncReady) {
      scheduleCloudSync(1_000);
    }
    if (currentUser && syncReady) {
      scheduleLeaderboardPublish(1_200);
    }
  });
  window.addEventListener("offline", () => {
    if (currentUser) {
      setSyncStatus(
        "error",
        "当前处于离线状态",
        "本地存档继续工作，联网后会重新同步",
        "⌁",
      );
      setLeaderboardStatus("error", "当前离线");
    }
  });
  window.addEventListener("stellar-local-save", (event) => {
    if (applyingRemote || !currentUser) return;
    dirty = true;
    const urgent =
      event.detail?.manual === true || event.detail?.urgent === true;
    scheduleCloudSync(urgent ? 750 : AUTO_SYNC_DELAY);
    scheduleLeaderboardPublish(
      urgent ? 1_500 : LEADERBOARD_SYNC_DELAY,
    );
  });
}

async function waitForBridge() {
  if (globalThis.StellarOutpostCloudBridge) {
    return globalThis.StellarOutpostCloudBridge;
  }
  await new Promise((resolve) => {
    window.addEventListener("stellar-game-ready", resolve, { once: true });
  });
  return globalThis.StellarOutpostCloudBridge;
}

async function initializeCloudService() {
  try {
    bindUi();
  } catch (error) {
    setView("unconfigured");
    setBanner(
      "error",
      "!",
      "账号面板初始化失败",
      "页面缺少必要的界面元素，云端同步暂不可用；本地自动存档不受影响。",
    );
    setCloudState("error", "异常", "账号与云端存档 · 初始化失败");
    return;
  }
  bridge = await waitForBridge();
  const config = globalThis.STELLAR_FIREBASE_CONFIG;
  serviceConfigured = hasValidFirebaseConfig(config);
  if (!serviceConfigured) {
    setView("unconfigured");
    setBanner(
      "warning",
      "⌁",
      "云端航站尚未配置",
      "游戏仍会正常使用本地自动存档，不会丢失当前进度。",
    );
    setCloudState("local", "本地", "账号与云端存档 · 尚未配置");
    updateLeaderboardAccessState();
    return;
  }

  setView("loading");
  try {
    [firebaseAppApi, firebaseAuthApi, firebaseFirestoreApi] =
      await Promise.all([
        import(`${FIREBASE_SDK_ROOT}/firebase-app.js`),
        import(`${FIREBASE_SDK_ROOT}/firebase-auth.js`),
        import(`${FIREBASE_SDK_ROOT}/firebase-firestore.js`),
      ]);
    const app = firebaseAppApi.initializeApp(config);
    auth = firebaseAuthApi.getAuth(app);
    db = firebaseFirestoreApi.getFirestore(app);
    await firebaseAuthApi.setPersistence(
      auth,
      firebaseAuthApi.browserLocalPersistence,
    );
    serviceReady = true;
    updateLeaderboardAccessState();
    firebaseAuthApi.onAuthStateChanged(auth, (user) => {
      if (user) {
        handleSignedIn(user);
      } else {
        handleSignedOut();
      }
    });
  } catch (error) {
    serviceReady = false;
    setView("unconfigured");
    setBanner(
      "error",
      "!",
      "云端服务连接失败",
      "本地自动存档仍在工作，请稍后检查网络或 Firebase 配置。",
    );
    setCloudState("error", "异常", "账号与云端存档 · 连接失败");
    updateLeaderboardAccessState();
  }
}

initializeCloudService();
