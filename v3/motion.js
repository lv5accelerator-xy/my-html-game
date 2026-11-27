/* Motion is a disposable view. No game state, requestAnimationFrame or game timers. */
(function () {
  'use strict';
  const key='stellarOutpostIdle_v3_motion', root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const constrained=(navigator.hardwareConcurrency||4)<=2 || (navigator.deviceMemory||4)<=2 || Boolean(navigator.connection?.saveData);
  let mode='auto',timer,origin;
  try { const stored=localStorage.getItem(key);if(['auto','off','full'].includes(stored))mode=stored; } catch (_) { /* Optional preference; gameplay storage has its own error handling. */ }
  const observed=new Set(), feedback=document.getElementById('scene-feedback');
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(document.hidden||root.dataset.motion==='off')return;entries.forEach(entry=>{entry.target.dataset.inView=String(entry.isIntersecting);});},{threshold:0.08}):null;
  // 短暂的界面标记：重复触发时先移除再设置，让同一段 CSS 动画重新播放。
  const flags=new WeakMap();
  function flag(el,name,value,ms) {
    if(!el||root.dataset.motion==='off'||document.hidden)return;
    const timers=flags.get(el)||{};flags.set(el,timers);
    clearTimeout(timers[name]);el.removeAttribute(name);void el.offsetWidth;el.setAttribute(name,value);
    timers[name]=setTimeout(()=>el.removeAttribute(name),ms);
  }
  const GAIN=['scan','arrival','return','discovery','honor'], SPEND=['build','research'];
  let lastSurface=null,lastGoal=null,terminalBooted=false;
  function dismiss() { const restore=feedback.contains(document.activeElement);clearTimeout(timer);feedback.hidden=true;feedback.replaceChildren();document.querySelectorAll('[data-cue]').forEach(el=>el.removeAttribute('data-cue'));if(restore)(origin?.isConnected&&!origin.disabled?origin:document.getElementById('main')).focus({preventScroll:true}); }
  function apply() {
    root.dataset.motion=mode==='off'||reduced.matches||(mode==='auto'&&constrained)?'off':'on';
    root.dataset.paused=String(document.hidden);
    if(root.dataset.motion==='off'||document.hidden)dismiss();else for(const el of observed){observer?.unobserve(el);observer?.observe(el);}
  }
  function set(value) {
    if(!['auto','off','full'].includes(value))return;
    mode=value;try {localStorage.setItem(key,mode);}catch(_) { /* Settings remain usable in memory. */ }
    apply();
  }
  function observe() {
    for(const el of observed)if(!el.isConnected){observer?.unobserve(el);observed.delete(el);}
    for(const el of document.querySelectorAll('.world-scene,.atlas-space'))if(!observed.has(el)){
      observed.add(el);if(observer)observer.observe(el);else el.dataset.inView='false';
    }
    // 换页：港灯点亮一次。只在页面真正切换时播放，普通重绘不重复。
    const surface=root.dataset.surface;
    const moved=lastSurface!==null&&surface!==lastSurface;
    if(moved)flag(root,'data-arrive',surface,1300);
    lastSurface=surface;
    // 港务终端：本次打开游戏第一次出现时播放开场。
    if(!terminalBooted&&document.querySelector('#main .harbor-terminal')){terminalBooted=true;flag(root,'data-terminal-boot','true',2600);}
    // 目标更新：同一页内目标换了，横幅扫过一道光。
    const goalEl=document.querySelector('.current-goal, .goal-rail');
    const goal=goalEl?.querySelector('#next-goal-title, strong')?.textContent||null;
    if(goal&&!moved&&lastGoal!==null&&goal!==lastGoal)flag(goalEl,'data-fresh','true',1400);
    if(goal)lastGoal=goal;
    if(!feedback.hidden&&!document.hidden){const scene=document.querySelector('#main .world-scene');if(scene&&!scene.dataset.cue)scene.dataset.cue=feedback.dataset.effect;}
  }
  // A short nonmodal cue never takes focus or waits before applying an action.
  function notice(kind, label, important=false) {
    dismiss();if(root.dataset.motion==='off'||document.hidden)return;
    const resources=document.querySelector('.resources');
    if(GAIN.includes(kind))flag(resources,'data-bump','gain',900);else if(SPEND.includes(kind))flag(resources,'data-bump','spend',700);
    origin=document.activeElement;
    const scene=document.querySelector('#main .world-scene');if(scene)scene.dataset.cue=kind;
    feedback.dataset.effect=kind;
    const text=document.createElement('strong');text.textContent=label;
    const stars=document.createElement('span');stars.className='feedback-sparks';stars.setAttribute('aria-hidden','true');
    for(let i=0;i<6;i++){const spark=document.createElement('i');spark.style.setProperty('--spark',i);stars.append(spark);}
    feedback.append(stars,text);
    if(important){const skip=document.createElement('button');skip.type='button';skip.className='text-button';skip.textContent='跳过演出';skip.addEventListener('click',dismiss);feedback.append(skip);}
    feedback.hidden=false;timer=setTimeout(dismiss,important?2200:650);
  }
  document.addEventListener('visibilitychange',apply);
  window.addEventListener('pagehide',dismiss);
  reduced.addEventListener('change',apply);
  document.getElementById('navigation').addEventListener('click',dismiss);
  apply();
  window.SalvageMotion={set,mode:()=>mode,notice,observe,dismiss,flag};
})();
