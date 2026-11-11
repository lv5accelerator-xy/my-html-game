/* Presentation only: read existing engine state; never write progress or game time. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./engine.js') : root.SalvageEngine);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SalvageVisuals = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (E) {
  'use strict';
  const labels = { dock: '轨道舰队船坞', production: '自动化生产线', sector: '深空星区探索', bridge: '远航舰桥', wreck: '星际残骸调查', habitat: '星港居民生活区', greenhouse: '生态温室', jump: '星核跃迁' };
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
  function media(kind, s) {
    const m = model(s), title = labels[kind];
    return `<figure class="world-scene world-scene--${kind}" data-scene="${kind}" data-repair="${m.repair}" data-residents="${m.residents}"><svg class="instrument-art" viewBox="0 0 720 280" aria-hidden="true"><path d="M0 220H720M80 40V240M640 40V240M160 40H560M160 240H560"/><ellipse cx="360" cy="140" rx="200" ry="94"/><ellipse cx="360" cy="140" rx="120" ry="64"/><path d="M200 160 300 100H440L520 160 440 180H300zM300 100V180M440 100V180M180 70V210M540 70V210"/>${Array.from({length:m.ships},(_,i)=>`<path class="scene-ship" d="M${240+i*44} 224l18-9 18 9-18 5z"/>`).join('')}</svg><figcaption><strong>${title}</strong><span>${kind==='dock'||kind==='production'?`舰队 ${m.fleet} 艘 · 修复 ${m.repair}/3`:kind==='sector'?`已归档 ${m.nodes}/9 处坐标`:kind==='habitat'?m.residents?'居民已抵达':'等待船队抵达':kind==='bridge'?m.stage===null?'港内整备':`阶段 ${Math.min(4,m.stage+1)}/4`:kind==='jump'?'永久记录将随你启航':'已确认的航行记录'}</span></figcaption></figure>`;
  }
  return { model, reachable, media };
});
