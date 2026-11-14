/* Background music is a device preference. No game state, no game timers. */
(function () {
  'use strict';
  const KEY = 'stellarOutpostIdle_v3_music';
  const LEGACY_SAVE = 'stellarOutpostIdleSave_v1';
  const PLAYLIST = 'playlist';
  // Same tracks and loop points as the v2 player; files are shared at ../assets/.
  const TRACKS = Object.freeze([
    Object.freeze({ id: 'outpost-beyond-orion', title: '猎户座外的前哨', src: '../assets/outpost-beyond-orion.mp3?v=2.0.0', loopStart: 0.2, endTrim: 3.7 }),
    Object.freeze({ id: 'outpost-beyond-orion-2', title: '猎户座外·静默航线', src: '../assets/outpost-beyond-orion-2.mp3?v=2.0.0', loopStart: 0.1, endTrim: 2.6 }),
    Object.freeze({ id: 'signal-at-kestrel-nine', title: '红隼九号信号', src: '../assets/signal-at-kestrel-nine.mp3?v=2.0.0', loopStart: 0.7, endTrim: 0 }),
    Object.freeze({ id: 'signal-at-kestrel-nine-2', title: '红隼九号·深空回声', src: '../assets/signal-at-kestrel-nine-2.mp3?v=2.0.0', loopStart: 0.7, endTrim: 2 }),
  ]);
  const DEFAULTS = Object.freeze({ enabled: true, track: PLAYLIST, volume: 0.22, sfx: true });

  function normalize(raw) {
    const track = String(raw?.track ?? '');
    const volume = Number(raw?.volume);
    return {
      enabled: raw?.enabled !== false,
      track: track === PLAYLIST || TRACKS.some(t => t.id === track) ? track : DEFAULTS.track,
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULTS.volume,
      sfx: raw?.sfx !== false,
    };
  }
  function loadPrefs() {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored !== null) return normalize(JSON.parse(stored));
      // First visit: carry over the v2 player's choice, read-only.
      const legacy = JSON.parse(localStorage.getItem(LEGACY_SAVE) || 'null');
      if (legacy && typeof legacy === 'object')
        return normalize({ enabled: legacy.bgmEnabled, track: legacy.bgmTrackSelection, volume: legacy.bgmVolume, sfx: legacy.sound });
    } catch (_) { /* Corrupt or unavailable storage falls back to defaults. */ }
    return { ...DEFAULTS };
  }
  const prefs = loadPrefs();
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) { /* Preference stays in memory. */ }
  }

  const audio = new Audio();
  audio.preload = 'none';
  audio.setAttribute('playsinline', '');
  audio.id = 'music-audio';
  audio.hidden = true;
  document.body.append(audio);
  let index = prefs.track === PLAYLIST ? 0 : TRACKS.findIndex(t => t.id === prefs.track);
  let switching = false;
  let unlocked = false;
  const current = () => TRACKS[index] || TRACKS[0];

  function load(nextIndex, { restart = false } = {}) {
    index = ((Math.trunc(nextIndex) % TRACKS.length) + TRACKS.length) % TRACKS.length;
    const track = current();
    if (audio.dataset.trackId !== track.id) {
      switching = true;
      audio.pause();
      audio.dataset.trackId = track.id;
      audio.src = track.src;
      audio.load();
    } else if (restart && audio.readyState >= 1) {
      audio.currentTime = track.loopStart;
    }
  }
  function play() {
    if (!prefs.enabled || !unlocked) return;
    if (!audio.dataset.trackId) load(index);
    audio.volume = prefs.volume;
    if (audio.readyState >= 1 && audio.currentTime < current().loopStart) audio.currentTime = current().loopStart;
    if (audio.paused) audio.play().catch(() => { /* Playback can still be blocked; the next gesture retries. */ });
  }
  function advance() {
    if (switching) return;
    load(prefs.track === PLAYLIST ? index + 1 : TRACKS.findIndex(t => t.id === prefs.track), { restart: true });
    play();
  }
  audio.addEventListener('loadedmetadata', () => {
    switching = false;
    if (audio.currentTime < current().loopStart) audio.currentTime = current().loopStart;
    if (prefs.enabled && unlocked) play();
  });
  audio.addEventListener('timeupdate', () => {
    const duration = Number(audio.duration);
    const trim = current().endTrim;
    if (Number.isFinite(duration) && duration > 0 && trim > 0 && audio.currentTime >= duration - trim) advance();
  });
  audio.addEventListener('ended', advance);
  audio.addEventListener('error', () => { switching = false; });

  function render() {
    const track = current();
    const verb = prefs.enabled ? '暂停' : '播放';
    for (const button of document.querySelectorAll('[data-music="toggle"]')) {
      button.setAttribute('aria-pressed', String(prefs.enabled));
      button.classList.toggle('off', !prefs.enabled);
      button.setAttribute('aria-label', `${verb}背景音乐：${track.title}`);
      button.title = `${verb}背景音乐 · ${track.title}`;
      const label = button.querySelector('[data-music-label]');
      if (label) label.textContent = prefs.enabled ? '音乐开' : '音乐关';
    }
    for (const button of document.querySelectorAll('[data-music="sfx"]')) {
      button.setAttribute('aria-pressed', String(prefs.sfx));
      button.textContent = prefs.sfx ? '按键音效开' : '按键音效关';
    }
    for (const select of document.querySelectorAll('[data-music="track"]')) if (select.value !== prefs.track) select.value = prefs.track;
    const percent = Math.round(prefs.volume * 100);
    for (const range of document.querySelectorAll('[data-music="volume"]')) if (Number(range.value) !== percent) range.value = String(percent);
    for (const out of document.querySelectorAll('[data-music="volume-value"]')) out.textContent = `${percent}%`;
    for (const now of document.querySelectorAll('[data-music="now"]'))
      now.textContent = prefs.enabled ? `正在播放：${track.title}` : `已暂停：${track.title}`;
  }
  function toggle() {
    prefs.enabled = !prefs.enabled;
    unlocked = true;
    reveal();
    if (prefs.enabled) play(); else audio.pause();
    persist(); render();
  }
  function select(value) {
    const requested = String(value || '');
    if (requested !== PLAYLIST && !TRACKS.some(t => t.id === requested)) return;
    prefs.track = requested;
    if (requested !== PLAYLIST) load(TRACKS.findIndex(t => t.id === requested), { restart: true });
    play(); persist(); render();
  }
  function setVolume(percent, save) {
    const value = Number(percent);
    if (!Number.isFinite(value)) return;
    prefs.volume = Math.min(1, Math.max(0, value / 100));
    audio.volume = prefs.volume;
    if (save) persist();
    render();
  }
  function panel() {
    const options = [[PLAYLIST, '自动轮播'], ...TRACKS.map(t => [t.id, t.title])]
      .map(([id, title]) => `<option value="${id}">${title}</option>`).join('');
    return `<fieldset class="reading-settings music-settings"><legend>背景音乐</legend>
      <div><button class="outline" type="button" data-music="toggle" aria-pressed="${prefs.enabled}"><span aria-hidden="true">♫</span> <span data-music-label>${prefs.enabled ? '音乐开' : '音乐关'}</span></button>
        <button class="outline" type="button" data-music="sfx" aria-pressed="${prefs.sfx}">${prefs.sfx ? '按键音效开' : '按键音效关'}</button></div>
      <label for="music-track">曲目</label><select id="music-track" data-music="track">${options}</select>
      <label for="music-volume">音量（音乐与音效） <output data-music="volume-value" for="music-volume">${Math.round(prefs.volume * 100)}%</output></label>
      <input id="music-volume" data-music="volume" type="range" min="0" max="100" step="1" value="${Math.round(prefs.volume * 100)}">
      <p data-music="now"></p><p>只保存在这台设备；首次点击页面后开始播放。</p></fieldset>`;
  }

  // Button tones, synthesised like the v2 station's (no audio files). Created on first click only.
  let tones = null;
  function tone(frequency, duration = 0.032, volume = 0.011) {
    if (!prefs.sfx || prefs.volume <= 0) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      tones ||= new Ctx();
      if (tones.state === 'suspended') tones.resume().catch(() => {});
      const osc = tones.createOscillator(), gain = tones.createGain(), now = tones.currentTime;
      // Scaled by the shared volume slider; at the default 22% this equals the v2 level.
      const level = Math.max(0.0002, volume * (prefs.volume / DEFAULTS.volume));
      osc.type = 'triangle';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(level, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain); gain.connect(tones.destination);
      osc.start(now); osc.stop(now + duration);
    } catch (_) { /* Sound is optional. */ }
  }
  function buttonTone(button) {
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    let frequency = 340;
    if (button.closest('#navigation')) frequency = 430;
    if (button.classList.contains('primary')) frequency = 520;
    tone(frequency);
  }
  function toggleSfx() {
    prefs.sfx = !prefs.sfx;
    persist(); render();
    if (prefs.sfx) tone(520, 0.08, 0.02);
  }
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-music="toggle"]')) toggle();
    if (event.target.closest?.('[data-music="sfx"]')) { toggleSfx(); return; }
    buttonTone(event.target.closest?.('button'));
  });
  document.addEventListener('change', event => {
    const el = event.target;
    if (el?.dataset?.music === 'track') select(el.value);
    else if (el?.dataset?.music === 'volume') setVolume(el.value, true);
  });
  document.addEventListener('input', event => {
    if (event.target?.dataset?.music === 'volume') setVolume(event.target.value, false);
  });
  // Browsers only allow media playback after a user gesture.
  // The first screen keeps its three controls; the topbar toggle appears once music can play.
  function reveal() {
    const button = document.getElementById('music-button');
    if (button) button.hidden = false;
  }
  const unlock = event => {
    if (event.target?.closest?.('[data-music="toggle"]')) return; // the toggle decides
    unlocked = true; reveal(); play();
  };
  document.addEventListener('pointerdown', unlock, { once: true, capture: true });
  document.addEventListener('keydown', unlock, { once: true, capture: true });

  render();
  window.SalvageMusic = Object.freeze({
    panel, render, toggle, select, tone,
    tracks: TRACKS, prefs: () => ({ ...prefs }),
    state: () => ({ trackId: audio.dataset.trackId || null, paused: audio.paused, volume: audio.volume, src: audio.getAttribute('src') }),
  });
})();
