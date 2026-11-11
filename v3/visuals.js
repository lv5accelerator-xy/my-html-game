/* Presentation only: read existing engine state; never write progress or game time. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./engine.js') : root.SalvageEngine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SalvageVisuals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E) {
  'use strict';
  const labels = { home: '归航航站', dock: '轨道舰队船坞', production: '自动化生产线', sector: '深空星区探索', bridge: '远航舰桥', wreck: '星际残骸调查', habitat: '星港居民生活区', greenhouse: '生态温室', jump: '星核跃迁' };
  function model(s) {
    const fleet = Object.values(s.buildings).reduce((a, b) => a + b, 0);
    return { repair: s.starport, fleet, ships: Math.min(5, fleet), residents: E.portActivity(s).residents,
      facilities: E.portFacilities(s).filter(n => n.live).map(n => ({id:n.id, level:n.level || 1, name:n.name})),
      nodes: s.atlas.nodes.length, stage: s.expeditions.active?.stage ?? null,
      traveling: Boolean(s.mission || s.atlas.active || s.expeditions.active?.leg), ending: s.epilogue.ending };
  }
  function reachable(s, page) {
    if (page === 'voyage') return Boolean(s.epilogue.ending);
    if (page === 'residents') return E.portActivity(s).residents;
    if (page === 'archive') return s.lore.length > 0;
    return E.reachable(s, page);
  }
  const ART = { dock:'orbital-dock', production:'production-line', sector:'sector-nebula', bridge:'voyage-bridge', wreck:'wreck-investigation', habitat:'resident-habitat', greenhouse:'ecology-greenhouse', jump:'starcore-jump' };
  function picture(id, eager = false, alt = '', css = '') {
    return `<picture class="scene-picture ${css}"><source media="(max-width:600px)" srcset="assets/${id}-mobile.webp"><img data-game-art src="assets/${id}.webp" width="1280" height="720" alt="${alt}" loading="${eager?'eager':'lazy'}" decoding="async" fetchpriority="${eager?'high':'low'}"></picture>`;
  }
  function prop(id, css = '') {
    return `<img class="illustrated-prop ${css}" data-game-art src="assets/${id}.webp" width="120" height="100" alt="" loading="lazy" decoding="async">`;
  }
  function overlay(m, kind) {
    if (!['home','dock'].includes(kind)) return '';
    return `<div class="living-overlay" aria-hidden="true"><svg class="port-light-layer" viewBox="0 0 720 280">${[0,1,2].map(i=>`<g class="port-light ${i<m.repair?'is-lit':''}" transform="translate(${70+i*290} 120)"><path d="M0 0v75m-7-67h14M-4 76h8"/><circle cy="8" r="5"/></g>`).join('')}</svg><div class="docked-ships" data-scene-ships="${m.ships}">${Array.from({length:m.ships},()=>prop('salvage-tug')).join('')}</div></div>`;
  }
  function districts(s) {
    const facilities=E.portFacilities(s).filter(f=>f.kind==='longterm'&&f.live);
    const scenes={'habitat':'resident-habitat','repair-dock':'production-line','route-station':'voyage-bridge','public-berths':'orbital-dock'};
    return facilities.length?`<section class="finished-districts" aria-label="已建成的星港街区"><h2>灯光延伸的地方</h2><div>${facilities.map(f=>`<figure data-scene-facility="${f.id}" data-level="${f.level}">${picture(scenes[f.id]||'ecology-greenhouse')}<figcaption><strong>${f.name}</strong><span>已建成 ${f.level}/3 期</span></figcaption></figure>`).join('')}</div></section>`:'';
  }
  function media(kind, s, options = {}) {
    const m = model(s), title = labels[kind], id = kind==='home'?(m.repair===3?'orbital-dock':'unrepaired-orbit'):ART[kind];
    return `<figure class="world-scene world-scene--${kind}" data-scene="${kind}" data-repair="${m.repair}" data-residents="${m.residents}"><div class="art-stage">${picture(id,Boolean(options.eager),title)}${overlay(m,kind)}</div><figcaption><strong>${title}</strong><span>${kind==='home'||kind==='dock'||kind==='production'?`舰队 ${m.fleet.toLocaleString('zh-CN')} 艘 · 修复 ${m.repair}/3${m.fleet?' · 停泊标记为示意':''}`:kind==='sector'?`已归档 ${m.nodes}/9 处坐标`:kind==='habitat'?m.residents?'居民已抵达':'等待船队抵达':kind==='bridge'?m.stage===null?'港内整备':`阶段 ${Math.min(4,m.stage+1)}/4`:kind==='jump'?'永久记录将随你启航':'已确认的航行记录'}</span></figcaption></figure>`;
  }
  return { model, reachable, media, picture, prop, ART, districts };
});
