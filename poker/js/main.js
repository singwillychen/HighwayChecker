/* 主控制器：畫面切換、遊戲流程、動畫、存讀檔 */
(function () {
  const { Cards, Engine, AI, Avatar, Backdrop, Chips, Audio, Storage, Levels, Characters, Dialogue } = HP;
  const { CHARS, EXTRAS } = Characters;
  const LEVELS = Levels.LEVELS;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const stage = $('#stage');
  let settings = Storage.loadSettings();
  const App = { run: null, screen: null, overlayScreens: [] };

  class Abort extends Error {}

  // ═════════════ 縮放／畫質 ═════════════
  function applyScale() {
    const fit = Math.min(innerWidth / 1280, innerHeight / 720);
    let s = fit;
    if (settings.resolution !== 'auto') {
      const w = parseInt(settings.resolution, 10);
      s = Math.min(w / 1280, fit);
    }
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  function applySettings() {
    stage.classList.remove('q-low', 'q-mid', 'q-high');
    stage.classList.add('q-' + settings.quality);
    const sp = { slow: 1.4, normal: 1, fast: 0.5 }[settings.speed] || 1;
    stage.style.setProperty('--anim', sp);
    Backdrop.setQuality(settings.quality);
    Audio.configure({ master: settings.master, music: settings.music, sfx: settings.sfx, quality: settings.audioQuality });
    applyScale();
  }
  addEventListener('resize', applyScale);
  const speedK = () => ({ slow: 1.4, normal: 1, fast: 0.45 }[settings.speed] || 1);

  // ═════════════ 小工具 ═════════════
  const avatarHTML = (charId, expr) => Avatar.svg((CHARS[charId] || EXTRAS[charId] || {}).look, expr);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function sleep(ms, G) {
    return new Promise((res, rej) => setTimeout(() => {
      if (G && G !== App.run) rej(new Abort()); else res();
    }, ms * speedK()));
  }
  async function gate(G) {
    while (G.paused) { await new Promise((r) => setTimeout(r, 120)); if (G !== App.run) throw new Abort(); }
    if (G !== App.run) throw new Abort();
  }
  function cardHTML(c, opts = {}) {
    const size = opts.size || '';
    if (c === undefined || c === null || opts.back) return `<div class="card back ${size} ${opts.cls || ''}" style="${opts.style || ''}"></div>`;
    const r = Cards.RANK_LABEL[c >> 2], s = Cards.SUIT_SYM[c & 3];
    return `<div class="card ${size} ${Cards.isRed(c) ? 'red' : ''} ${opts.cls || ''}" data-c="${c}" style="${opts.style || ''}"><span class="rk">${r}</span><span class="st">${s}</span><span class="big">${s}</span></div>`;
  }
  function sceneInto(node, name, stageIdx) { Backdrop.mount(node, name, stageIdx); }

  // ═════════════ 畫面切換 ═════════════
  function show(id) {
    for (const s of $$('.screen')) s.classList.remove('active');
    App.overlayScreens = [];
    const el = $('#' + id);
    el.classList.add('active');
    el.style.zIndex = '';
    App.screen = id;
    const bg = $('.scene-bg[data-scene]', el);
    if (bg && !bg.innerHTML) sceneInto(bg, bg.dataset.scene);
    if (['title', 'newgame', 'free', 'settings', 'slots'].includes(id)) Audio.playMusic('menu');
  }
  function openOver(id) {
    const el = $('#' + id);
    el.classList.add('active');
    el.style.zIndex = 150;
    const bg = $('.scene-bg[data-scene]', el);
    if (bg) bg.style.opacity = '.0';
    App.overlayScreens.push(id);
  }
  function closeOver(id) {
    const el = $('#' + id);
    el.classList.remove('active');
    el.style.zIndex = '';
    const bg = $('.scene-bg[data-scene]', el);
    if (bg) bg.style.opacity = '';
    App.overlayScreens = App.overlayScreens.filter((x) => x !== id);
  }

  document.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (!go) return;
    Audio.resume(); Audio.sfx('click');
    const id = go.dataset.go;
    if (id === 'title') { App.run = null; buildTitle(); show('title'); }
    else if (id === 'newgame') { buildNewGame(); show('newgame'); }
    else if (id === 'load') { openSlots('load'); }
    else if (id === 'settings') { buildSettings(() => show('title')); show('settings'); }
    else if (id === 'free') { buildFree(); show('free'); }
  });
  document.addEventListener('pointerdown', () => Audio.resume(), { once: true });

  // ═════════════ 標題 ═════════════
  function buildTitle() {
    const ids = ['hero_a', 'k_sakura', 'o_kevin', 'n_don', 's_homie', 'b_maitreya', 'h_noah', 'a_zorg', 'a_unit9'];
    $('#title .lineup').innerHTML = ids.map((id, i) => `<div class="av">${avatarHTML(id, ['happy', 'smug', 'neutral', 'think'][i % 4])}</div>`).join('');
  }

  // ═════════════ 開新遊戲 ═════════════
  const NG = { look: 'hero_a', diff: 'normal' };
  function buildNewGame() {
    $('#ng-look').innerHTML = ['hero_a', 'hero_b', 'hero_c'].map((id) => `<button class="choice ${NG.look === id ? 'on' : ''}" data-look="${id}" aria-label="外觀"><div class="av">${avatarHTML(id, 'happy')}</div></button>`).join('');
    $('#ng-diff').innerHTML = AI.DIFFICULTIES.map((d, i) => `<button class="choice diff ${NG.diff === d.id ? 'on' : ''}" data-diff="${d.id}"><b>${d.name}</b><div class="pips">${'★'.repeat(i + 1)}${'☆'.repeat(4 - i)}</div><span>${d.desc}</span></button>`).join('');
    $('#ng-mods').innerHTML = modsHTML();
    const slots = Storage.allSlots();
    const first = Storage.firstEmpty();
    $('#ng-slot').innerHTML = slots.map((s, i) => `<option value="${i}" ${i === first ? 'selected' : ''}>紀錄 ${i + 1}${s ? '（覆蓋：' + esc(s.name) + '）' : '（空）'}</option>`).join('');
  }
  $('#ng-look').addEventListener('click', (e) => { const b = e.target.closest('[data-look]'); if (!b) return; NG.look = b.dataset.look; Audio.sfx('click'); buildNewGame(); });
  $('#ng-diff').addEventListener('click', (e) => { const b = e.target.closest('[data-diff]'); if (!b) return; NG.diff = b.dataset.diff; Audio.sfx('click'); buildNewGame(); });
  $('#ng-start').addEventListener('click', () => {
    Audio.sfx('click');
    const name = ($('#ng-name').value || '阿賭').trim().slice(0, 10) || '阿賭';
    const G = newRun({ mode: 'story', name, look: NG.look, diff: NG.diff, slot: +$('#ng-slot').value, levelIdx: 0, stageIdx: 0 });
    saveRun(G);
    storyScreen({ title: '序章　夢的開始', sub: '一場關於撲克的奇幻夢境', lines: Levels.PROLOGUE, scene: 'menu', next: () => levelIntro(G) });
  });

  // ═════════════ 存讀檔 ═════════════
  let slotsMode = 'load', slotsBack = null;
  function openSlots(mode, back) {
    slotsMode = mode; slotsBack = back || null;
    $('#slots-title').textContent = mode === 'save' ? '儲存紀錄' : '讀取紀錄';
    $('#slots-tag').textContent = mode === 'save' ? 'SAVE' : 'LOAD';
    renderSlots();
    if (back) openOver('slots'); else show('slots');
  }
  function fmtTime(sec) { sec = Math.floor(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h} 時 ${m} 分` : `${m} 分`; }
  function renderSlots() {
    const slots = Storage.allSlots();
    $('#slot-grid').innerHTML = slots.map((s, i) => {
      if (!s) return `<div class="slot empty" data-i="${i}" tabindex="0" role="button"><span class="no">${i + 1}</span>${slotsMode === 'save' ? '＋ 存在這裡' : '— 空 —'}</div>`;
      const L = LEVELS[s.levelIdx] || LEVELS[0];
      const d = AI.DIFFICULTIES.find((x) => x.id === s.diff) || AI.DIFFICULTIES[2];
      const stTitle = L.stages[s.stageIdx] && L.stages.length > 1 ? '・' + L.stages[s.stageIdx].title.split('：')[0].split('　')[0] : '';
      const heroChips = s.state ? s.state.players[0].chips : s.snap ? s.snap.players[0].chips : null;
      const where = s.mode === 'free' ? '🎲 自由模式・' + L.title.split('　')[1] : L.title.replace('　', ' ') + stTitle;
      const when = s.state ? (s.state.phase === 'betting' || s.state.phase === 'street_done' ? `第 ${s.state.handNo} 手進行中` : `第 ${s.state.handNo} 手結束`) : '關卡開始前';
      return `<div class="slot" data-i="${i}" tabindex="0" role="button"><span class="no">${i + 1}</span><div class="face">${avatarHTML(s.look, 'neutral')}</div>
        <div class="nm">${esc(s.name)}</div><div class="lv">${s.cleared ? '🏆 全破！' : esc(where)}</div>
        <div>難度：${d.name}・${when}</div><div>籌碼：${heroChips !== null ? Chips.fmt(heroChips) : '-'}</div>
        <div>勝場：${(s.stats && s.stats.handsWon) || 0}／${(s.stats && s.stats.hands) || 0} 手</div>
        <div class="muted">${new Date(s.savedAt).toLocaleString('zh-TW', { hour12: false })}・${fmtTime(s.playtime)}</div>
        <button class="del" data-del="${i}">刪除</button></div>`;
    }).join('');
  }
  $('#slot-grid').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) {
      e.stopPropagation();
      const i = +del.dataset.del;
      confirmBox(`確定刪除紀錄 ${i + 1}？`, () => { Storage.deleteSlot(i); renderSlots(); });
      return;
    }
    const s = e.target.closest('.slot');
    if (!s) return;
    const i = +s.dataset.i;
    Audio.sfx('click');
    const data = Storage.allSlots()[i];
    if (slotsMode === 'save') {
      const G = App.run;
      if (!G) return;
      const doSave = () => { G.slot = i; saveRun(G); renderSlots(); toast('已儲存到紀錄 ' + (i + 1)); };
      if (data && i !== G.slot) confirmBox(`覆蓋紀錄 ${i + 1}（${esc(data.name)}）？`, doSave); else doSave();
    } else {
      if (!data) return;
      loadRun(i, data);
    }
  });
  $('#slot-grid').addEventListener('keydown', (e) => { if (e.key === 'Enter') e.target.click(); });
  $('#slots-back').addEventListener('click', () => {
    Audio.sfx('click');
    if (slotsBack) { closeOver('slots'); slotsBack(); } else { buildTitle(); show('title'); }
  });

  // 存下「此時此刻」：牌桌完整狀態（含牌堆、手牌、下注進度），讀檔從同一刻接續
  function saveRun(G) {
    if (G.slot === null || G.slot === undefined) return false;
    G.playtime += (Date.now() - G.tick) / 1000; G.tick = Date.now();
    return Storage.saveSlot(G.slot, {
      mode: G.mode, free: G.free || null,
      name: G.name, look: G.look, diff: G.diff, levelIdx: G.levelIdx, stageIdx: G.stageIdx,
      state: G.inStage && G.table ? G.table.serialize() : null,
      flags: { heroVoluntary: !!G.heroVoluntary, heroAggrRiver: !!G.heroAggrRiver, revealed: !!G.revealed },
      stats: G.stats, model: G.model, playtime: G.playtime, cleared: !!G.cleared,
    });
  }
  function loadRun(i, d) {
    const G = newRun({ mode: d.mode || 'story', name: d.name, look: d.look, diff: d.diff, slot: i, levelIdx: d.levelIdx, stageIdx: d.stageIdx });
    G.free = d.free || null;
    G.stats = d.stats || G.stats; G.model = d.model || G.model; G.playtime = d.playtime || 0; G.cleared = d.cleared;
    if (d.cleared) { storyScreen({ title: '終章', sub: '你已經從夢中醒來', lines: Levels.EPILOGUE, scene: 'space', next: () => { buildTitle(); show('title'); } }); return; }
    if (d.state) startStage(G, { state: d.state, flags: d.flags });
    else if (d.snap) startStage(G, { snap: d.snap });
    else if (G.mode === 'free') startStage(G); else levelIntro(G);
  }

  // ═════════════ 設定 ═════════════
  function buildSettings(onBack) {
    const seg = (key, opts) => `<div class="seg" data-key="${key}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(settings[key]) === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    const range = (key) => `<input type="range" min="0" max="100" value="${Math.round(settings[key] * 100)}" data-range="${key}" aria-label="${key}"><span class="kbd">${Math.round(settings[key] * 100)}</span>`;
    $('#settings-rows').innerHTML = `<div class="set-col">
      <h3>🖥️ 畫面</h3>
      <div class="row"><span class="label">畫質</span>${seg('quality', [['low', '低（省電）'], ['mid', '中'], ['high', '高（全動畫）']])}</div>
      <div class="row"><span class="label">螢幕解析度</span><select data-sel="resolution">${['auto', '960x540', '1280x720', '1600x900', '1920x1080'].map((r) => `<option value="${r}" ${settings.resolution === r ? 'selected' : ''}>${r === 'auto' ? '自動符合視窗' : r.replace('x', ' × ')}</option>`).join('')}</select>
        <button class="btn small alt" id="fs-btn">${document.fullscreenElement ? '離開全螢幕' : '⛶ 全螢幕'}</button></div>
      <h3>🔊 聲音</h3>
      <div class="row"><span class="label">音質</span>${seg('audioQuality', [['low', '低 22k'], ['mid', '中 44.1k'], ['high', '高 48k＋混響']])}</div>
      <div class="row"><span class="label">主音量</span>${range('master')}</div>
      <div class="row"><span class="label">音樂</span>${range('music')}</div>
      <div class="row"><span class="label">音效</span>${range('sfx')}</div>
    </div><div class="set-col">
      <h3>🃏 牌局</h3>
      <div class="row"><span class="label">遊戲速度</span>${seg('speed', [['slow', '慢'], ['normal', '標準'], ['fast', '快']])}</div>
      <div class="row"><span class="label">每手結束</span>${seg('autoNext', [['false', '按「下一手」'], ['true', '3 秒自動']])}</div>
      <h3>🧩 輔助模組 <small class="muted">（點選開／關，常駐記憶）</small></h3>
      ${modsHTML()}
    </div>`;
    $('#settings-back').onclick = () => { Audio.sfx('click'); Storage.saveSettings(settings); onBack(); };
    $('#settings-reset').onclick = () => { settings = JSON.parse(JSON.stringify(Storage.DEFAULT_SETTINGS)); applySettings(); buildSettings(onBack); };
    $('#fs-btn').onclick = () => {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      setTimeout(() => buildSettings(onBack), 300);
    };
  }
  $('#settings-rows').addEventListener('click', (e) => {
    const b = e.target.closest('.seg button'); if (!b) return;
    const key = b.parentNode.dataset.key;
    settings[key] = key === 'autoNext' ? b.dataset.v === 'true' : b.dataset.v; Audio.sfx('click'); applySettings();
    $$('button', b.parentNode).forEach((x) => x.classList.toggle('on', x === b));
    Storage.saveSettings(settings);
  });
  $('#settings-rows').addEventListener('input', (e) => {
    const k = e.target.dataset.range;
    if (k) { settings[k] = e.target.value / 100; e.target.nextElementSibling.textContent = e.target.value; applySettings(); }
    const sel = e.target.dataset.sel;
    if (sel) { settings[sel] = e.target.value; applySettings(); }
    Storage.saveSettings(settings);
  });
  $('#settings-rows').addEventListener('change', (e) => { if (e.target.dataset.range) Audio.sfx('chip'); });

  // ═════════════ 自由模式 ═════════════
  const FREE = { levelIdx: 0, opps: [], all: false, diff: 'normal', chips: 1000, bb: 20, every: 10 };
  function rosterOf(levelIdx) { return [...new Set(LEVELS[levelIdx].stages.flatMap((s) => s.opponents))]; }
  function buildFree() {
    $('#free-levels').innerHTML = LEVELS.map((L, i) => `<div class="lv-card ${i === FREE.levelIdx ? 'on' : ''}" data-lv="${i}" tabindex="0" role="button"><div class="thumb"></div><div class="t">${L.title.replace('　', ' ')}</div></div>`).join('');
    $$('#free-levels .thumb').forEach((th, i) => { const c = Backdrop.still(LEVELS[i].scene, 0, 240, 135); c.style.cssText = 'width:100%;height:100%;display:block'; th.appendChild(c); });
    if (!FREE.opps.length) FREE.opps = rosterOf(FREE.levelIdx).slice(0, 4);
    renderFreeOpps();
    const seg = (key, opts) => `<div class="seg" data-fkey="${key}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(FREE[key]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    $('#free-opts').innerHTML = `
      <div class="row"><span class="label" style="min-width:90px">難度</span><select data-fsel="diff">${AI.DIFFICULTIES.map((d) => `<option value="${d.id}" ${FREE.diff === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}</select></div>
      <div class="row"><span class="label" style="min-width:90px">起始籌碼</span><select data-fsel="chips">${[500, 1000, 2500, 5000, 10000, 50000, 200000].map((v) => `<option value="${v}" ${FREE.chips === v ? 'selected' : ''}>${v.toLocaleString()}</option>`).join('')}</select></div>
      <div class="row"><span class="label" style="min-width:90px">起始大盲</span><select data-fsel="bb">${[2, 10, 20, 50, 100, 200, 500, 1000].map((v) => `<option value="${v}" ${FREE.bb === v ? 'selected' : ''}>${v / 2} / ${v}</option>`).join('')}</select></div>
      <div class="row"><span class="label" style="min-width:90px">升盲</span>${seg('every', [[0, '不升'], [5, '5 手'], [10, '10 手'], [20, '20 手']])}</div>
      <div class="muted" id="free-summary"></div>`;
    updateFreeSummary();
  }
  function renderFreeOpps() {
    const ids = FREE.all ? LEVELS.flatMap((_, i) => rosterOf(i)) : rosterOf(FREE.levelIdx);
    $('#free-opps').innerHTML = ids.map((id) => {
      const c = CHARS[id];
      const st = AI.STYLES[c.style];
      return `<button class="choice opp-pick ${FREE.opps.includes(id) ? 'on' : ''}" data-opp="${id}" title="${esc(c.title)}・${st ? st.name : ''}"><div class="av">${avatarHTML(id, FREE.opps.includes(id) ? 'happy' : 'neutral')}</div>${esc(c.name)}</button>`;
    }).join('');
  }
  function updateFreeSummary() {
    const n = $('#free-summary');
    if (n) n.textContent = `已選 ${FREE.opps.length} 位對手：${FREE.opps.map((id) => CHARS[id].name).join('、') || '（請至少選 1 位）'}`;
    $('#free-start').disabled = !FREE.opps.length;
  }
  $('#free-levels').addEventListener('click', (e) => {
    const c = e.target.closest('[data-lv]'); if (!c) return;
    FREE.levelIdx = +c.dataset.lv; FREE.opps = rosterOf(FREE.levelIdx).slice(0, 4);
    const L = LEVELS[FREE.levelIdx];
    FREE.chips = L.chips; FREE.bb = L.blindBase;
    Audio.sfx('click'); buildFree();
  });
  $('#free-opps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-opp]'); if (!b) return;
    const id = b.dataset.opp;
    if (FREE.opps.includes(id)) FREE.opps = FREE.opps.filter((x) => x !== id);
    else if (FREE.opps.length < 5) FREE.opps.push(id);
    else { toast('最多 5 位對手'); return; }
    Audio.sfx('click'); renderFreeOpps(); updateFreeSummary();
  });
  $('#free-all').addEventListener('change', (e) => { FREE.all = e.target.checked; renderFreeOpps(); });
  $('#free-opts').addEventListener('click', (e) => {
    const b = e.target.closest('.seg button'); if (!b) return;
    FREE[b.parentNode.dataset.fkey] = +b.dataset.v; Audio.sfx('click');
    $$('button', b.parentNode).forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#free-opts').addEventListener('change', (e) => {
    const k = e.target.dataset.fsel; if (!k) return;
    FREE[k] = k === 'diff' ? e.target.value : +e.target.value;
  });
  $('#free-start').addEventListener('click', () => {
    if (!FREE.opps.length) return;
    Audio.sfx('click');
    const G = newRun({ mode: 'free', name: '你', look: NG.look, diff: FREE.diff, levelIdx: FREE.levelIdx, stageIdx: 0 });
    G.free = { ...FREE, opps: FREE.opps.slice() };
    startStage(G);
  });

  // ═════════════ 故事畫面 ═════════════
  let storyNext = null, storyTimer = null;
  function storyScreen({ title, sub, lines, scene, stageIdx, cast, next, btn }) {
    show('story');
    sceneInto($('#story .scene-bg'), scene || 'menu', stageIdx);
    $('#story-title').textContent = title;
    $('#story-sub').textContent = sub || '';
    $('#story-lines').innerHTML = lines.map((l) => `<p>${esc(l)}</p>`).join('');
    $('#story-cast').innerHTML = (cast || []).map((id) => {
      const c = CHARS[id];
      return `<div class="c"><div class="av">${avatarHTML(id, 'smug')}</div><b>${esc(c.name)}</b>${esc(c.title)}</div>`;
    }).join('');
    $('#story-next').textContent = btn || '繼續 ▶';
    const ps = $$('#story-lines p');
    let i = 0;
    clearInterval(storyTimer);
    const reveal = () => { if (i < ps.length) { ps[i++].classList.add('show'); Audio.sfx('flip'); } else clearInterval(storyTimer); };
    reveal();
    storyTimer = setInterval(reveal, 1100 * speedK());
    storyNext = () => {
      if (i < ps.length) { while (i < ps.length) ps[i++].classList.add('show'); clearInterval(storyTimer); return; }
      clearInterval(storyTimer); storyNext = null; Audio.sfx('click'); next();
    };
  }
  $('#story-next').addEventListener('click', (e) => { e.stopPropagation(); storyNext && storyNext(); });
  $('#story .panel').addEventListener('click', () => storyNext && storyNext());

  // ═════════════ 遊戲執行物件 ═════════════
  function newRun(o) {
    const G = {
      mode: o.mode, name: o.name, look: o.look || 'hero_a', diff: o.diff || 'normal', slot: o.slot === undefined ? null : o.slot,
      levelIdx: o.levelIdx || 0, stageIdx: o.stageIdx || 0,
      stats: { hands: 0, handsWon: 0, biggestPot: 0, levelsCleared: 0, busts: 0 },
      model: AI.newModel(), playtime: 0, tick: Date.now(), paused: false, inStage: false,
    };
    App.run = G;
    return G;
  }

  function levelIntro(G) {
    const L = LEVELS[G.levelIdx];
    G.inStage = false; saveRun(G);
    storyScreen({
      title: L.title, sub: L.sub, lines: L.story, scene: L.scene, stageIdx: 0,
      cast: L.stages.length === 1 ? L.stages[0].opponents : [], next: () => stageIntro(G),
    });
  }
  function stageIntro(G) {
    const L = LEVELS[G.levelIdx], S = L.stages[G.stageIdx];
    if (L.stages.length === 1) { startStage(G); return; }
    storyScreen({ title: S.title, sub: L.title, lines: [S.story], scene: L.scene, stageIdx: G.stageIdx, cast: S.opponents, next: () => startStage(G), btn: '入座 ▶' });
  }

  // ═════════════ 座位配置 ═════════════
  const CENTER = { x: 640, y: 390 };
  const POS = {
    hero: { x: 110, y: 648, stack: [205, 650], bet: [640, 505], dealer: [505, 548], bubble: { left: 150, top: 470, tx: 40 }, cards: null },
    A: { x: 95, y: 420, bubble: { left: 130, top: 216, tx: 30 } },
    B: { x: 255, y: 236, bubble: { left: 300, top: 40, tx: 30 } },
    C: { x: 640, y: 178, bubble: { left: 706, top: 30, tx: 18 } },
    D: { x: 1025, y: 236, bubble: { right: 300, top: 40, tx: 200 } },
    E: { x: 1185, y: 420, bubble: { right: 130, top: 216, tx: 200 } },
  };
  const LAYOUTS = { 1: ['C'], 2: ['B', 'D'], 3: ['B', 'C', 'D'], 4: ['A', 'B', 'D', 'E'], 5: ['A', 'B', 'C', 'D', 'E'] };
  const lerp = (a, b, t) => a + (b - a) * t;
  function seatGeom(key) {
    const p = POS[key];
    if (key === 'hero') return { ...p, stackXY: p.stack, betXY: p.bet, dealerXY: p.dealer };
    return {
      ...p,
      stackXY: [lerp(p.x, CENTER.x, 0.2), lerp(p.y + 30, CENTER.y, 0.2)],
      betXY: [lerp(p.x, CENTER.x, 0.42), lerp(p.y + 30, CENTER.y, 0.42)],
      dealerXY: [lerp(p.x, CENTER.x, 0.3) + (key === 'C' ? -70 : 26), lerp(p.y + 30, CENTER.y, 0.3) + (key === 'C' ? 0 : -20)],
    };
  }

  // ═════════════ 開始一站 ═════════════
  function startStage(G, from) {
    from = from || {};
    const snap = from.snap;
    const L = LEVELS[G.levelIdx];
    let oppIds, chips, blinds, every;
    if (G.mode === 'free') {
      oppIds = G.free.opps; chips = G.free.chips;
      blinds = Levels.schedule(G.free.bb); every = G.free.every || 0;
    } else {
      oppIds = L.stages[G.stageIdx].opponents; chips = L.chips; blinds = L.blinds; every = L.every;
    }
    G.L = L; G.oppIds = oppIds; G.blinds = blinds; G.every = every;
    G.chars = ['hero', ...oppIds];
    G.ctx = G.chars.map((id, i) => i === 0 ? null : {
      skill: AI.computeSkill(G.diff, G.mode === 'free' ? G.levelIdx * 0.5 : G.levelIdx, CHARS[id].skill),
      style: CHARS[id].style, model: G.model,
    });
    const players = G.chars.map((id, i) => {
      const sp = snap && snap.players.find((p) => p.id === (i === 0 ? 'hero' : id));
      return { id: i === 0 ? 'hero' : id, name: i === 0 ? G.name : CHARS[id].name, isHuman: i === 0, chips: sp ? sp.chips : chips, out: sp ? sp.out : false };
    });
    if (from.state) {
      G.table = Engine.Table.restore(from.state, { log: (e) => logEvent(G, e) });
      Object.assign(G, from.flags || {});
    } else {
      G.table = new Engine.Table({ players, sb: blinds[0][0], bb: blinds[0][1], dealer: snap ? snap.dealer : -1, handNo: snap ? snap.handNo : 0, log: (e) => logEvent(G, e) });
      G.revealed = false;
    }
    G.startChips = chips;
    G.inStage = true;
    G.paused = false;
    hideActions();
    buildTable(G);
    show('game');
    Audio.playMusic(L.music);
    G.stageStartedAt = Date.now();
    saveRun(G);
    runStage(G, !!from.state).catch((e) => { if (!(e instanceof Abort)) console.error(e); });
  }

  function buildTable(G) {
    const L = G.L;
    sceneInto($('#game .scene-bg'), L.scene, G.stageIdx);
    const felt = $('#game .felt');
    felt.style.setProperty('--felt', L.felt);
    felt.dataset.logo = G.mode === 'free' ? 'FREE PLAY' : 'DREAM POKER';
    felt.classList.toggle('dark-ink', !!L.feltDark);
    $('#game .board').innerHTML = '<div class="slot-c"></div>'.repeat(5);
    $('#game .hero-cards').innerHTML = '';
    $('#log').innerHTML = '';
    $('#hud-level').innerHTML = G.mode === 'free' ? `🎲 自由模式・${esc(L.title.split('　')[1])}` : `${esc(L.title)}${L.stages.length > 1 ? '・' + esc(L.stages[G.stageIdx].title.split('：')[0].split('　')[0]) : ''}`;
    const n = G.chars.length - 1;
    const keys = ['hero', ...LAYOUTS[n]];
    G.seatKeys = keys;
    const seats = $('#game .seats');
    seats.innerHTML = '';
    G.seatEls = keys.map((key, i) => {
      const g = seatGeom(key);
      const el = document.createElement('div');
      el.className = 'seat seat-' + key;
      el.style.left = g.x + 'px'; el.style.top = g.y + 'px';
      el.innerHTML = `<div class="av"></div><div class="hole"></div><div class="plate"><div class="nm"></div><div class="ch"></div><div class="rd" style="display:none"></div></div><div class="act-tag"></div><div class="hand-name"></div>`;
      if (key === 'hero') { $('.av', el).style.cssText = 'width:110px;height:165px;left:-55px;top:-152px'; }
      const stackEl = document.createElement('div'); stackEl.className = 'seat-stack'; stackEl.style.cssText = `position:absolute;left:${g.stackXY[0]}px;top:${g.stackXY[1]}px;transform:translate(-50%,-100%);z-index:20`;
      const betEl = document.createElement('div'); betEl.className = 'seat-bet'; betEl.style.cssText = `position:absolute;left:${g.betXY[0]}px;top:${g.betXY[1]}px;transform:translate(-50%,-50%);z-index:22;display:flex;flex-direction:column;align-items:center`;
      seats.appendChild(el); seats.appendChild(stackEl); seats.appendChild(betEl);
      const holeEl = $('.hole', el);
      if (key !== 'hero') holeEl.style.cssText = ['D', 'E'].includes(key) ? 'left:-178px;top:-46px' : 'left:80px;top:-46px';
      return { key, g, el, av: $('.av', el), hole: holeEl, nm: $('.nm', el), ch: $('.ch', el), tag: $('.act-tag', el), hn: $('.hand-name', el), rd: $('.rd', el), stackEl, betEl, expr: 'neutral', exprTimer: null };
    });
    const db = document.createElement('div'); db.className = 'dealer-btn'; db.textContent = 'D'; db.style.display = 'none';
    seats.appendChild(db); G.dealerEl = db;
    $$('.bubble, .next-box, #game .banner', stage).forEach((b) => b.remove());
    $('#hand-chart').style.display = settings.mods.chart ? '' : 'none';
    G.seatEls.forEach((s, i) => { setExpr(G, i, 'neutral'); updateSeat(G, i); });
    $('#game .extras-layer').innerHTML = '';
    clearInterval(G.extraTimer);
    if (G.L.extras && G.L.extras.length) G.extraTimer = setInterval(() => spawnExtra(G), 14000);
    setTimeout(() => spawnExtra(G), 3000);
    updateHud(G);
    updatePot(G);
  }

  function charIdAt(G, i) { return i === 0 ? G.look : G.chars[i]; }
  function setExpr(G, i, expr, ms) {
    const s = G.seatEls[i];
    if (!s) return;
    clearTimeout(s.exprTimer);
    if (ms) {
      const base = s.baseExpr || 'neutral';
      s.exprTimer = setTimeout(() => { if (App.run === G) setExpr(G, i, base); }, ms);
    } else s.baseExpr = expr;
    if (s.expr === expr && s.av.innerHTML) return;
    s.expr = expr;
    s.av.innerHTML = avatarHTML(charIdAt(G, i), expr);
  }
  function updateSeat(G, i) {
    const p = G.table.players[i], s = G.seatEls[i];
    s.nm.textContent = p.name;
    if (i > 0 && G.ctx[i]) {
      const st = AI.STYLES[G.ctx[i].style];
      s.rd.textContent = settings.mods.reader ? `${st ? st.name : ''}・功力${'★'.repeat(1 + Math.round(G.ctx[i].skill * 4))}` : '';
      s.rd.style.display = settings.mods.reader ? '' : 'none';
    }
    s.ch.textContent = p.out ? '出局' : Chips.fmt(p.chips);
    s.el.classList.toggle('folded', p.folded && !p.out);
    s.el.classList.toggle('out', p.out);
    s.stackEl.innerHTML = p.out ? '' : Chips.stackHTML(p.chips, { bb: G.table.bb, scale: i === 0 ? 0.9 : 0.72, perCol: 12, maxCols: 7, max: 64 });
    s.betEl.innerHTML = p.bet > 0 ? Chips.stackHTML(p.bet, { bb: G.table.bb, scale: 0.6, perCol: 8, maxCols: 4, max: 24 }) + `<div class="v" style="background:rgba(0,0,0,.7);color:#fff;font-weight:900;font-size:13px;padding:1px 8px;border-radius:99px;margin-top:2px">${Chips.fmt(p.bet)}</div>` : '';
  }
  function updateAllSeats(G) { G.seatEls.forEach((_, i) => updateSeat(G, i)); }
  function updateHud(G) {
    const t = G.table;
    $('#hud-blinds').innerHTML = `盲注 <b>${Chips.fmt(t.sb)} / ${Chips.fmt(t.bb)}</b>`;
    const left = G.every ? G.every - (t.handNo % G.every) : 0;
    $('#hud-hand').innerHTML = `第 <b>${t.handNo}</b> 手${G.every ? `・${left} 手後升盲` : ''}`;
  }
  function updatePot(G) {
    const t = G.table;
    const collected = t.phase === 'hand_done' ? 0 : t.potCollected();
    $('#game .pot .amt').textContent = '底池 ' + Chips.fmt(t.phase === 'hand_done' ? 0 : t.potTotal());
    $('#game .pot .chips-here').innerHTML = collected > 0 ? `<div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%)">${Chips.stackHTML(collected, { bb: t.bb, scale: 0.7, perCol: 10, maxCols: 6, max: 50 })}</div>` : '';
    const pots = t.phase !== 'hand_done' && t.players.some((p) => p.allIn) ? t.buildPots() : [];
    $('#game .pot .sidepots').textContent = pots.length > 1 ? pots.map((p, i) => (i ? '邊池' + i : '主池') + ' ' + Chips.fmt(p.amount)).join('・') : '';
    $('#game .pot .sidepots').style.display = pots.length > 1 ? '' : 'none';
  }
  function placeDealer(G) {
    const s = G.seatEls[G.table.dealer];
    G.dealerEl.style.display = '';
    G.dealerEl.style.left = s.g.dealerXY[0] - 17 + 'px';
    G.dealerEl.style.top = s.g.dealerXY[1] - 17 + 'px';
  }
  function showTag(G, i, text, cls) {
    const t = G.seatEls[i].tag;
    t.textContent = text; t.className = 'act-tag show ' + (cls || '');
  }
  function clearTags(G) { G.seatEls.forEach((s) => { s.tag.className = 'act-tag'; s.hn.className = 'hand-name'; }); }

  // ═════════════ 對話泡泡 ═════════════
  function say(G, i, text, ms = 2800) {
    if (!text) return;
    const s = G.seatEls[i];
    $$('.bubble.seat-' + i, stage).forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'bubble seat-' + i;
    b.textContent = text;
    const bc = s.g.bubble || {};
    if (bc.left !== undefined) b.style.left = bc.left + 'px';
    if (bc.right !== undefined) b.style.right = bc.right + 'px';
    b.style.top = bc.top + 'px';
    b.style.setProperty('--tx', bc.tx + 'px');
    $('#game .table-wrap').appendChild(b);
    // 泡泡往上長，底部對齊原 top
    requestAnimationFrame(() => { b.style.top = Math.max(50, bc.top + 110 - b.offsetHeight) + 'px'; });
    setTimeout(() => b.remove(), ms * Math.max(0.8, speedK()));
  }
  function charLine(G, i, event, prob = 1) {
    if (i === 0 || Math.random() > prob) return;
    const id = G.chars[i];
    say(G, i, Dialogue.line(id, CHARS[id].style, event, { name: G.name }));
  }

  // ═════════════ 背景跑龍套 ═════════════
  function spawnExtra(G) {
    if (App.run !== G || settings.quality !== 'high' || !G.L.extras || G.paused) return;
    const id = Dialogue.pick(G.L.extras);
    const layer = $('#game .extras-layer');
    if (layer.children.length > 1) return;
    const e = document.createElement('div');
    const rtl = Math.random() < 0.5;
    const dur = 11 + Math.random() * 5;
    e.className = 'extra fly' + (rtl ? ' rtl' : '');
    e.style.top = (8 + Math.random() * 40) + 'px';
    e.style.setProperty('--dur', dur + 's');
    e.innerHTML = `<div class="bob">${avatarHTML(id, Math.random() < 0.6 ? 'happy' : 'neutral')}</div>`;
    layer.appendChild(e);
    const lines = Dialogue.EXTRAS[id];
    if (lines) setTimeout(() => {
      if (!e.isConnected) return;
      const b = document.createElement('div'); b.className = 'bubble'; b.textContent = Dialogue.pick(lines);
      b.style.cssText = 'top:120px;left:20px;font-size:13px;' + (rtl ? 'transform:scaleX(-1)' : '');
      e.appendChild(b); setTimeout(() => b.remove(), 3000);
    }, dur * 300);
    setTimeout(() => e.remove(), dur * 1000 + 200);
  }

  // ═════════════ 牌局紀錄 ═════════════
  const ACT_ZH = { fold: '棄牌', check: '過牌', call: '跟注', raise: '加注到', bet: '下注', allin: '全下' };
  function logEvent(G, e) {
    const log = $('#log');
    let h = '';
    if (e.type === 'hand') h = `<div class="h">── 第 ${e.handNo} 手（盲注 ${e.sb}/${e.bb}）──</div>`;
    else if (e.type === 'action') h = `<div>${esc(e.name)}：${ACT_ZH[e.label] || e.label}${e.amount ? ' ' + Chips.fmt(e.amount) : ''}</div>`;
    else if (e.type === 'street') h = `<div class="h">${Engine.STREET_NAMES[e.street]}：${e.board.map(Cards.label).join(' ')}</div>`;
    else if (e.type === 'result') {
      const r = e.result;
      for (const s in r.won) h += `<div style="color:#ffd43b">🏆 ${esc(G.table.players[s].name)} 贏得 ${Chips.fmt(r.won[s])}${r.hands[s] ? '（' + r.hands[s].name + '）' : ''}</div>`;
    }
    log.insertAdjacentHTML('beforeend', h);
    while (log.children.length > 300) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  $('#hud-log').addEventListener('click', () => { Audio.sfx('click'); $('#log').classList.toggle('show'); });

  // ═════════════ 主流程 ═════════════
  async function runStage(G, resume) {
    const t = G.table;
    await sleep(500, G);
    if (resume && (t.phase === 'betting' || t.phase === 'street_done')) {
      toast('從存檔的那一刻接續！');
      renderHandState(G);
      await handLoop(G);
      await afterHand(G);
    } else if (!resume) {
      // 打招呼
      const order = G.seatEls.map((_, i) => i).filter((i) => i > 0 && !t.players[i].out);
      for (const i of order.slice(0, 3)) { charLine(G, i, 'greet'); setExpr(G, i, 'happy', 2200); await sleep(700, G); }
      await sleep(600, G);
    }
    for (;;) {
      await gate(G);
      if (t.players[0].out) return gameOver(G);
      if (t.players.every((p, i) => i === 0 || p.out)) return stageClear(G);
      // 升盲
      if (G.every) {
        const idx = Math.min(G.blinds.length - 1, Math.floor(t.handNo / G.every));
        const [sb, bb] = G.blinds[idx];
        if (bb !== t.bb) { t.setBlinds(sb, bb); if (t.handNo > 0) { toast(`盲注提升！${Chips.fmt(sb)} / ${Chips.fmt(bb)}`); Audio.sfx('turn'); await sleep(900, G); } }
      }
      await playHand(G);
      await afterHand(G);
    }
  }

  async function afterHand(G) {
    const t = G.table;
    saveRun(G);
    const goesOn = !t.players[0].out && t.players.some((p, i) => i > 0 && !p.out);
    if (goesOn) await nextHandPrompt(G);
    $$('#game .banner').forEach((b) => b.remove());
  }

  // 每手結束：畫面停住，詢問「下一手」；可切換成 3 秒後自動繼續
  function nextHandPrompt(G) {
    return new Promise((res) => {
      $$('.next-box').forEach((b) => b.remove());
      const box = document.createElement('div');
      box.className = 'next-box';
      box.innerHTML = `<button class="btn pink" data-n>下一手 ▶ <span class="k">空白鍵</span></button>
        <label class="auto-tg"><input type="checkbox" ${settings.autoNext ? 'checked' : ''}><span class="sw"></span>3 秒後自動下一手</label>
        <div class="cd"><i></i></div>`;
      $('#game .table-wrap').appendChild(box);
      let timer = null, start = 0;
      const done = () => { clearInterval(timer); box.remove(); G.nextResolve = null; res(); };
      const arm = () => {
        clearInterval(timer);
        const cd = box.querySelector('.cd'), bar = box.querySelector('.cd i');
        cd.style.visibility = settings.autoNext ? 'visible' : 'hidden'; bar.style.width = '0%';
        if (!settings.autoNext) return;
        start = Date.now();
        timer = setInterval(() => {
          if (G !== App.run) { clearInterval(timer); box.remove(); return; }
          if (G.paused) { start = Date.now(); bar.style.width = '0%'; return; }
          const u = (Date.now() - start) / 3000;
          bar.style.width = Math.min(100, u * 100) + '%';
          if (u >= 1) done();
        }, 50);
      };
      box.querySelector('[data-n]').onclick = () => { Audio.sfx('click'); done(); };
      box.querySelector('input').onchange = (e) => { settings.autoNext = e.target.checked; Storage.saveSettings(settings); Audio.sfx('click'); arm(); };
      G.nextResolve = done;
      arm();
    });
  }

  // 讀檔接續：把牌桌畫面還原到存檔當下
  const TAG_ZH = { fold: '棄牌', check: '過牌', call: '跟注', bet: '下注', raise: '加注', allin: '全下！' };
  function renderHandState(G) {
    const t = G.table;
    clearTags(G);
    $('#game .board').innerHTML = t.board.map((c) => cardHTML(c)).join('') + '<div class="slot-c"></div>'.repeat(5 - t.board.length);
    G.handBoardShown = t.board.length;
    const hero = t.players[0];
    $('#game .hero-cards').innerHTML = hero.out ? '' : hero.hole.map((c) => cardHTML(c, { size: 'lg', cls: hero.folded ? 'dim' : '' })).join('');
    t.players.forEach((p, i) => {
      if (p.lastAction && !p.out) showTag(G, i, TAG_ZH[p.lastAction] || p.lastAction, p.lastAction);
      if (i === 0) return;
      G.seatEls[i].hole.innerHTML = p.out ? '' : p.hole.map((c, r) => cardHTML(G.revealed && !p.folded ? c : null, { size: 'sm', cls: p.folded ? 'dim' : '', style: `--r:${r ? 8 : -8}deg` })).join('');
    });
    updateHud(G); placeDealer(G); updateAllSeats(G); updatePot(G);
    refreshExpressions(G);
  }

  async function playHand(G) {
    const t = G.table;
    clearTags(G);
    $$('#game .banner').forEach((b) => b.remove());
    $('#game .board').innerHTML = '<div class="slot-c"></div>'.repeat(5);
    $('#game .hero-cards').innerHTML = '';
    G.seatEls.forEach((s) => (s.hole.innerHTML = ''));
    t.startHand();
    G.handBoardShown = 0;
    G.heroVoluntary = false; G.heroAggrRiver = false;
    updateHud(G); placeDealer(G); updateAllSeats(G); updatePot(G);
    G.stats.hands++;
    // 發牌動畫
    const live = t.players.filter((p) => !p.out);
    for (let r = 0; r < 2; r++) {
      for (const p of live) {
        const s = G.seatEls[p.seat];
        if (p.seat === 0) {
          $('#game .hero-cards').insertAdjacentHTML('beforeend', cardHTML(p.hole[r], { size: 'lg', cls: 'deal', style: '--fy:-260px' }));
        } else {
          s.hole.insertAdjacentHTML('beforeend', cardHTML(null, { size: 'sm', cls: 'deal', style: `--r:${r ? 8 : -8}deg;--fx:${(640 - s.g.x) * 0.5}px;--fy:${(360 - s.g.y)}px` }));
        }
        Audio.sfx('card');
        await sleep(90, G);
      }
    }
    refreshExpressions(G);
    saveRun(G);
    await handLoop(G);
  }

  async function handLoop(G) {
    const t = G.table;
    await showHint(G);
    while (t.phase !== 'hand_done') {
      await gate(G);
      if (t.phase === 'betting') {
        const i = t.toAct;
        G.seatEls.forEach((s, k) => s.el.classList.toggle('acting', k === i));
        let act;
        if (i === 0) act = await humanTurn(G);
        else {
          await sleep(500 + Math.random() * 900 * (0.6 + G.ctx[i].skill), G);
          await gate(G);
          act = AI.decide(t, t.players[i], { ...G.ctx[i], model: G.model });
        }
        applyAction(G, i, act);
        saveRun(G);
        await sleep(i === 0 ? 250 : 350, G);
      } else if (t.phase === 'street_done') {
        G.seatEls.forEach((s) => s.el.classList.remove('acting'));
        await sleep(450, G);
        await collectBets(G);
        const runout = t.inHand().length > 1 && t.canActCount() < 2;
        if (runout && !G.revealed) { G.revealed = true; revealHands(G); await sleep(900, G); }
        t.advanceStreet();
        saveRun(G);
        if (t.phase !== 'hand_done' || t.result && !t.result.uncontested) await showBoard(G);
        updatePot(G);
        if (t.phase !== 'hand_done') {
          G.seatEls.forEach((s, k) => { if (!t.players[k].folded && t.players[k].lastAction !== 'allin') s.tag.className = 'act-tag'; });
          refreshExpressions(G);
          await showHint(G);
        }
      }
    }
    G.seatEls.forEach((s) => s.el.classList.remove('acting'));
    hideActions(); $('#game .hint').style.display = 'none';
    await finishHand(G);
    G.revealed = false;
  }

  function applyAction(G, i, act) {
    const t = G.table;
    const p = t.players[i];
    const street = t.street;
    const before = t.currentBet;
    const info = t.act(act);
    const lab = info.label;
    const txt = { fold: '棄牌', check: '過牌', call: '跟注 ' + Chips.fmt(info.amount), bet: '下注 ' + Chips.fmt(info.amount), raise: '加注到 ' + Chips.fmt(info.amount), allin: '全下！' }[lab] || lab;
    showTag(G, i, txt, lab);
    Audio.sfx(lab === 'fold' ? 'fold' : lab === 'check' ? 'check' : lab === 'allin' ? 'allin' : 'chip');
    if (lab === 'fold') {
      const cards = i === 0 ? $$('#game .hero-cards .card') : $$('.card', G.seatEls[i].hole);
      cards.forEach((c) => c.classList.add('dim'));
    }
    updateSeat(G, i); updatePot(G);
    if (i === 0) {
      // 記錄玩家習慣給 AI 用
      if (['raise', 'bet', 'allin'].includes(lab)) { G.model.aggr++; if (street === 'river') G.heroAggrRiver = true; }
      if (lab === 'call') G.model.passive++;
      if (lab === 'fold') G.model.folds++;
      if (street === 'preflop' && lab !== 'fold' && lab !== 'check' && !G.heroVoluntary) { G.heroVoluntary = true; G.model.vpip++; }
    } else {
      const prob = { allin: 0.9, raise: 0.4, bet: 0.35, call: 0.12, check: 0.08, fold: 0.22 }[lab] || 0.2;
      charLine(G, i, lab === 'bet' ? 'raise' : lab, prob);
      if (lab === 'allin' || lab === 'raise') setExpr(G, i, act.bluff && G.ctx[i].skill > 0.5 ? 'smug' : lab === 'allin' ? 'angry' : 'smug', 2000);
      if (lab === 'fold') setExpr(G, i, 'sad', 1800);
    }
    // 大額加注讓其他人嚇一跳
    if ((lab === 'allin' || lab === 'raise') && t.currentBet > before * 2.5 && t.currentBet > t.bb * 6) {
      G.seatEls.forEach((_, k) => { if (k !== i && !t.players[k].folded && Math.random() < 0.5) setExpr(G, k, k === 0 ? 'shock' : (Math.random() < G.ctx[k].skill ? 'neutral' : 'shock'), 1500); });
    }
  }

  async function collectBets(G) {
    const t = G.table;
    const any = t.players.some((p) => p.bet > 0);
    if (!any) return;
    const potXY = [640, 285];
    G.seatEls.forEach((s, i) => {
      const p = t.players[i];
      if (p.bet <= 0) return;
      flyChips(p.bet, s.g.betXY, potXY);
      s.betEl.innerHTML = '';
    });
    Audio.sfx('chip');
    await sleep(520, G);
  }
  function flyChips(amount, from, to, cb) {
    const f = document.createElement('div');
    f.className = 'fly-chips';
    f.innerHTML = Chips.stackHTML(amount, { bb: App.run && App.run.table ? App.run.table.bb : 0, scale: 0.6, perCol: 6, maxCols: 3, max: 15 });
    f.style.left = from[0] - 30 + 'px'; f.style.top = from[1] - 20 + 'px';
    $('#game .table-wrap').appendChild(f);
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.left = to[0] - 30 + 'px'; f.style.top = to[1] - 20 + 'px'; }));
    setTimeout(() => { f.remove(); cb && cb(); }, 650 * speedK());
  }

  async function showBoard(G) {
    const t = G.table;
    const slots = $$('#game .board > *');
    for (let k = G.handBoardShown; k < t.board.length; k++) {
      slots[k].outerHTML = cardHTML(t.board[k], { cls: 'flip' });
      Audio.sfx('flip');
      await sleep(k < 3 && G.handBoardShown < 3 ? 160 : 260, G);
    }
    if (t.board.length > G.handBoardShown && t.board.length >= 4) Audio.sfx('turn');
    G.handBoardShown = t.board.length;
  }

  function revealHands(G, onlySeats) {
    const t = G.table;
    t.players.forEach((p, i) => {
      if (i === 0 || p.folded || p.out) return;
      if (onlySeats && !onlySeats.includes(i)) return;
      G.seatEls[i].hole.innerHTML = p.hole.map((c, r) => cardHTML(c, { size: 'sm', cls: 'flip', style: `--r:${r ? 8 : -8}deg` })).join('');
    });
    Audio.sfx('flip');
  }

  // 依牌力更新表情（低手會洩漏 tell）
  function refreshExpressions(G) {
    const t = G.table;
    t.players.forEach((p, i) => {
      if (p.out || p.folded) return;
      const nOpp = Math.max(1, t.inHand().length - 1);
      const eq = Cards.equity(p.hole, t.board, nOpp, 120);
      if (i === 0) { setExpr(G, 0, eq * (nOpp + 1) > 1.5 ? 'happy' : eq * (nOpp + 1) < 0.7 ? 'worried' : 'neutral'); return; }
      setExpr(G, i, AI.expressionFor(eq, nOpp, G.ctx[i].skill, Math.random, false));
    });
  }

  // ═════════════ 提示 ═════════════
  // ═════════════ 輔助模組（Mods）═════════════
  const MODS = [
    { id: 'equity', name: '勝率顯示器', desc: '即時顯示目前牌型與勝率' },
    { id: 'odds', name: '底池賠率計算', desc: '要跟多少、賠率多少' },
    { id: 'advice', name: '行動建議', desc: '依勝率與賠率建議棄／跟／加' },
    { id: 'chart', name: '牌型速查表', desc: '左側顯示牌型大小排行' },
    { id: 'reader', name: '讀心術', desc: '名牌下顯示對手個性與功力' },
  ];
  function modsHTML() {
    return `<div class="mods">${MODS.map((m) => `<button class="mod ${settings.mods[m.id] ? 'on' : ''}" data-mod="${m.id}" aria-pressed="${!!settings.mods[m.id]}"><span class="sw"></span><b>${m.name}</b><small>${m.desc}</small></button>`).join('')}</div>`;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mod]'); if (!b) return;
    const id = b.dataset.mod;
    settings.mods[id] = !settings.mods[id];
    Storage.saveSettings(settings); Audio.sfx('click');
    $$(`[data-mod="${id}"]`).forEach((x) => { x.classList.toggle('on', settings.mods[id]); x.setAttribute('aria-pressed', settings.mods[id]); });
    applyMods();
  });
  function applyMods() {
    const G = App.run;
    $('#hand-chart').style.display = settings.mods.chart ? '' : 'none';
    if (G && G.table && G.seatEls) { updateAllSeats(G); if (G.table.phase !== 'hand_done') showHint(G).then(() => { if (humanResolve) updateHintOdds(G, G.table.legalActions(G.table.players[0])); }); }
  }
  function openModsPanel(back) {
    const G = App.run; if (G) G.paused = true;
    overlay(`<h2 style="justify-content:center">🧩 輔助模組</h2><p class="muted" style="margin-top:-6px">選擇要常駐開啟的輔助工具（設定會記住）</p>${modsHTML()}
      <div class="row" style="justify-content:center;margin-top:14px"><button class="btn" data-a="ok">完成</button></div>`, (p) => {
      p.querySelector('[data-a=ok]').onclick = () => { if (back) back(); else { closeOverlay(); if (G) G.paused = false; } };
    });
  }
  $('#hud-mods').addEventListener('click', () => { Audio.sfx('click'); if (App.screen === 'game') openModsPanel(); });

  const anyHint = () => settings.mods.equity || settings.mods.odds || settings.mods.advice;
  async function showHint(G) {
    const box = $('#game .hint');
    const t = G.table, p = t.players[0];
    const made = p.hole.length ? (t.board.length ? Cards.handName(Cards.evaluate(p.hole.concat(t.board))) : (p.hole[0] >> 2) === (p.hole[1] >> 2) ? '口袋對子' : '起手牌') : '';
    $$('#hand-chart li').forEach((li) => li.classList.toggle('now', !p.folded && t.board.length > 0 && li.dataset.n === made));
    if (!anyHint() || p.folded || p.out || !p.hole.length) { box.style.display = 'none'; return; }
    const nOpp = Math.max(1, t.inHand().length - 1);
    const eq = Cards.equity(p.hole, t.board, nOpp, 900);
    G.heroEq = eq;
    box.innerHTML = (settings.mods.equity ? `目前：<span class="adv">${made}</span><br>勝率約 <b>${Math.round(eq * 100)}%</b>（對 ${nOpp} 人）` : '') + '<div class="pot-odds"></div>';
    box.style.display = '';
    if (!settings.mods.equity) box.querySelector('.pot-odds').innerHTML = '<span class="muted2">輪到你時顯示</span>';
  }
  function updateHintOdds(G, L) {
    const box = $('#game .hint .pot-odds');
    if (!box || G.heroEq === undefined) return;
    const t = G.table;
    let h = '';
    if (L.toCall <= 0) {
      if (settings.mods.odds) h += '不用跟注，可免費過牌<br>';
      if (settings.mods.advice) h += `<span class="adv">${G.heroEq * t.inHand().length > 1.3 ? '建議：下注取得價值' : '建議：免費看牌'}</span>`;
    } else {
      const odds = L.toCall / (t.potTotal() + L.toCall);
      if (settings.mods.odds) h += `需跟 ${Chips.fmt(L.toCall)}，賠率 ${Math.round(odds * 100)}%<br>`;
      if (settings.mods.advice) h += `<span class="adv">${G.heroEq > odds + 0.08 ? (G.heroEq > 0.6 ? '建議：加注' : '建議：跟注') : G.heroEq > odds - 0.03 ? '建議：勉強可跟' : '建議：棄牌'}</span>`;
    }
    box.innerHTML = h;
  }

  // ═════════════ 玩家回合 ═════════════
  let humanResolve = null;
  function hideActions() { $('#actions').classList.remove('show'); humanResolve = null; }
  function humanTurn(G) {
    const t = G.table, L = t.legalActions(t.players[0]);
    const panel = $('#actions');
    const rng = $('#raise-range');
    $('#a-call').innerHTML = (L.canCheck ? '過牌' : '跟注 ' + Chips.fmt(L.toCall)) + ' <span class="k">C</span>';
    $('#a-raise').innerHTML = (L.isBet ? '下注' : '加注') + ' <span class="k">R</span>';
    $('#a-raise').disabled = !L.canRaise || L.minRaiseTo >= L.maxRaiseTo;
    $('#a-allin').disabled = !L.canRaise && L.toCall === 0;
    $('.raise-box', panel).style.display = L.canRaise && L.minRaiseTo < L.maxRaiseTo ? '' : 'none';
    const step = Math.max(1, t.bb >= 100 ? t.bb / 10 : 1);
    rng.min = L.minRaiseTo; rng.max = L.maxRaiseTo; rng.step = step; rng.value = L.minRaiseTo;
    const showVal = () => { $('#raise-val').textContent = Chips.fmt(+rng.value); };
    rng.oninput = showVal; showVal();
    const potAfterCall = t.potTotal() + L.toCall;
    $$('.presets button', panel).forEach((b) => {
      b.onclick = () => {
        Audio.sfx('click');
        const f = { min: 0, half: 0.5, '3q': 0.75, pot: 1, '2x': 2 }[b.dataset.p];
        const v = b.dataset.p === 'min' ? L.minRaiseTo : t.currentBet + potAfterCall * f;
        rng.value = Math.max(L.minRaiseTo, Math.min(L.maxRaiseTo, Math.round(v / step) * step)); showVal();
      };
    });
    updateHintOdds(G, L);
    panel.classList.add('show');
    setExpr(G, 0, G.seatEls[0].baseExpr === 'happy' ? 'smug' : 'think', 0);
    const thinkStart = Date.now();
    const taunter = setInterval(() => {
      if (Date.now() - thinkStart > 12000 && Math.random() < 0.3) {
        const opp = t.players.filter((p) => p.seat > 0 && !p.folded && !p.out);
        if (opp.length) charLine(G, Dialogue.pick(opp).seat, 'taunt');
      }
    }, 4000);
    return new Promise((res) => {
      humanResolve = (a) => { clearInterval(taunter); hideActions(); setExpr(G, 0, G.seatEls[0].baseExpr || 'neutral'); res(a); };
    });
  }
  const doHuman = (type) => {
    if (!humanResolve) return;
    Audio.sfx('click');
    if (type === 'raise') humanResolve({ type: 'raise', amount: +$('#raise-range').value });
    else humanResolve({ type });
  };
  $('#a-fold').addEventListener('click', () => doHuman('fold'));
  $('#a-call').addEventListener('click', () => doHuman('call'));
  $('#a-raise').addEventListener('click', () => doHuman('raise'));
  $('#a-allin').addEventListener('click', () => doHuman('allin'));

  // ═════════════ 結算 ═════════════
  async function finishHand(G) {
    const t = G.table, r = t.result;
    updateAllSeats(G); // 籌碼已入帳但先顯示動畫
    if (!r.uncontested) {
      // 依攤牌順序亮牌
      for (const s of r.showOrder) {
        if (s !== 0) { revealHands(G, [s]); }
        const h = r.hands[s];
        G.seatEls[s].hn.textContent = h.name; G.seatEls[s].hn.className = 'hand-name show';
        await sleep(650, G);
      }
      // 高亮主池贏家的五張牌
      const mainWinners = r.pots[0].winners;
      const best = new Set(mainWinners.flatMap((s) => r.hands[s].best));
      $$('#game .board .card').forEach((c) => { if (best.has(+c.dataset.c)) c.classList.add('win'); else c.classList.add('dim'); });
      mainWinners.forEach((s) => {
        const cards = s === 0 ? $$('#game .hero-cards .card') : $$('.card', G.seatEls[s].hole);
        cards.forEach((c) => best.has(+c.dataset.c) && c.classList.add('win'));
      });
    }
    // 底池飛向贏家
    const potXY = [640, 285];
    $('#game .pot .chips-here').innerHTML = '';
    $('#game .pot .amt').textContent = '底池 0';
    for (const s in r.won) {
      const g = G.seatEls[s].g;
      flyChips(r.won[s], potXY, s == 0 ? g.stackXY : [g.x, g.y - 10]);
      showTag(G, +s, '贏得 ' + Chips.fmt(r.won[s]), 'win');
    }
    Audio.sfx('chip');
    await sleep(600, G);
    updateAllSeats(G); updatePot(G);

    // 表情與台詞
    const total = Object.values(r.won).reduce((a, b) => a + b, 0);
    const heroWon = r.won[0] || 0;
    const heroPut = t.players[0].total;
    if (heroWon > 0) { G.stats.handsWon++; G.stats.biggestPot = Math.max(G.stats.biggestPot, total); Audio.sfx('win'); setExpr(G, 0, 'happy', 2500); }
    else if (heroPut > t.bb * 5) { Audio.sfx('lose'); setExpr(G, 0, 'sad', 2500); }
    // 玩家攤牌時若在河牌主動下注卻是弱牌 → 記為詐唬
    if (!r.uncontested && r.hands[0]) {
      G.model.showdowns++;
      if (G.heroAggrRiver && Cards.categoryOf(r.hands[0].score) <= 1 && !heroWon) G.model.bluffsShown++;
    }
    const winnerNames = Object.keys(r.won).map((s) => t.players[s].name);
    const hn = !r.uncontested ? r.hands[Object.keys(r.won)[0]].name : '';
    banner(`${winnerNames.join('、')} 贏得 ${Chips.fmt(total)}`, r.uncontested ? '其他人都棄牌了' : '以「' + hn + '」勝出');
    let talked = false;
    for (const s in r.won) if (s != 0 && !talked) { talked = true; setExpr(G, +s, 'happy', 2500); charLine(G, +s, r.uncontested && t.lastAggressor == s ? (Math.random() < 0.5 ? 'bluff' : 'win') : 'win', 0.7); }
    t.players.forEach((p, i) => {
      if (i === 0 || r.won[i] || p.out) return;
      if (p.total > t.bb * 8) { setExpr(G, i, Math.random() < 0.5 ? 'angry' : 'sad', 2500); if (!talked) { talked = true; charLine(G, i, 'lose', 0.6); } }
    });
    await sleep(1600, G);
    // 淘汰
    for (let i = 1; i < t.n; i++) {
      const p = t.players[i];
      if (p.out && p.bustedHand === t.handNo) {
        setExpr(G, i, 'sad'); charLine(G, i, 'bust');
        toast(`${p.name} 被你贏下桌了！`); Audio.sfx('fanfare');
        G.seatEls[i].hole.innerHTML = '';
        await sleep(1700, G);
      }
    }
    if (t.players[0].out) { setExpr(G, 0, 'shock'); G.stats.busts++; $$('#game .banner').forEach((b) => b.remove()); }
    await sleep(300, G);
  }

  function toast(msg) {
    $$('.toast', stage).forEach((t) => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    stage.appendChild(t);
    setTimeout(() => t.remove(), 1800 * Math.max(0.8, speedK()));
  }
  function banner(main, sub) {
    $$('#game .banner').forEach((b) => b.remove());
    const b = document.createElement('div'); b.className = 'banner';
    b.innerHTML = `${esc(main)}<small>${esc(sub)}</small>`;
    $('#game .table-wrap').appendChild(b);
  }

  // ═════════════ 過關／失敗 ═════════════
  function confetti() {
    if (settings.quality === 'low') return;
    const colors = ['#ffd43b', '#ff4f9a', '#38d9a9', '#748ffc', '#ff922b'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('div'); c.className = 'confetti';
      c.style.left = Math.random() * 1280 + 'px'; c.style.background = colors[i % 5];
      c.style.animationDuration = 2 + Math.random() * 2.5 + 's'; c.style.animationDelay = Math.random() * 0.8 + 's';
      stage.appendChild(c); setTimeout(() => c.remove(), 5500);
    }
  }
  function overlay(html, wire) {
    $('#overlay-panel').innerHTML = html;
    $('#overlay').classList.add('show');
    wire && wire($('#overlay-panel'));
  }
  function closeOverlay() { $('#overlay').classList.remove('show'); }

  function stageClear(G) {
    clearInterval(G.extraTimer);
    if (G.mode === 'free') { G.inStage = false; saveRun(G); }
    Audio.sfx('fanfare'); confetti();
    setExpr(G, 0, 'happy');
    const t = G.table;
    if (G.mode === 'free') {
      overlay(`<h2 class="result-title">🏆 你贏了！</h2><p style="font-size:20px;font-weight:700">共打了 ${t.handNo} 手，把 ${G.oppIds.length} 位對手全部贏下桌。</p>
        <div class="stack-btns"><button class="btn pink" data-a="again">再玩一次</button><button class="btn alt" data-a="setup">回自由模式設定</button><button class="btn alt" data-a="title">回主選單</button></div>`, (p) => {
        p.querySelector('[data-a=again]').onclick = () => { closeOverlay(); const N = newRun({ mode: 'free', name: '你', look: G.look, diff: G.diff, levelIdx: G.levelIdx }); N.free = G.free; startStage(N); };
        p.querySelector('[data-a=setup]').onclick = () => { closeOverlay(); App.run = null; buildFree(); show('free'); };
        p.querySelector('[data-a=title]').onclick = () => { closeOverlay(); App.run = null; buildTitle(); show('title'); };
      });
      return;
    }
    const L = G.L;
    const lastStage = G.stageIdx >= L.stages.length - 1;
    const lastLevel = G.levelIdx >= LEVELS.length - 1;
    if (!lastStage) {
      G.stageIdx++; G.inStage = false; saveRun(G);
      overlay(`<h2 class="result-title">✨ 過關！</h2><p style="font-size:20px;font-weight:700">${esc(L.stages[G.stageIdx - 1].title)} 完成！下一站：${esc(L.stages[G.stageIdx].title)}</p>
        <div class="stack-btns"><button class="btn pink" data-a="next">繼續旅程 ▶</button><button class="btn alt" data-a="title">存檔並回主選單</button></div>`, (p) => {
        p.querySelector('[data-a=next]').onclick = () => { closeOverlay(); stageIntro(G); };
        p.querySelector('[data-a=title]').onclick = () => { closeOverlay(); App.run = null; buildTitle(); show('title'); };
      });
      return;
    }
    G.stats.levelsCleared++;
    if (lastLevel) {
      G.cleared = true; G.inStage = false; saveRun(G);
      overlay(`<h2 class="result-title">👑 你就是賭神！</h2><p style="font-size:20px;font-weight:700">十關全破！總共打了 ${G.stats.hands} 手，贏下 ${G.stats.handsWon} 手。<br>最大底池：${Chips.fmt(G.stats.biggestPot)}</p>
        <div class="stack-btns"><button class="btn pink" data-a="end">觀看結局 ▶</button></div>`, (p) => {
        p.querySelector('[data-a=end]').onclick = () => { closeOverlay(); storyScreen({ title: '終章　醒來', sub: '夢的盡頭', lines: Levels.EPILOGUE, scene: 'space', next: () => { App.run = null; buildTitle(); show('title'); }, btn: '回主選單' }); };
      });
      return;
    }
    G.levelIdx++; G.stageIdx = 0; G.inStage = false; saveRun(G);
    overlay(`<h2 class="result-title">🎉 ${esc(L.title.split('　')[0])} 完成！</h2><p style="font-size:20px;font-weight:700">「${esc(L.title.split('　')[1])}」的對手全部被你贏下桌！<br>下一關：${esc(LEVELS[G.levelIdx].title)}</p>
      <p class="muted">已自動存檔到紀錄 ${G.slot + 1}</p>
      <div class="stack-btns"><button class="btn pink" data-a="next">前往下一關 ▶</button><button class="btn alt" data-a="title">回主選單</button></div>`, (p) => {
      p.querySelector('[data-a=next]').onclick = () => { closeOverlay(); levelIntro(G); };
      p.querySelector('[data-a=title]').onclick = () => { closeOverlay(); App.run = null; buildTitle(); show('title'); };
    });
  }

  function gameOver(G) {
    clearInterval(G.extraTimer);
    Audio.sfx('lose');
    const t = G.table;
    const winner = t.players.filter((p) => !p.out && p.seat > 0).sort((a, b) => b.chips - a.chips)[0];
    if (winner) { setExpr(G, winner.seat, 'happy'); charLine(G, winner.seat, 'win'); }
    G.inStage = false; saveRun(G);
    overlay(`<h2 class="result-title">💸 籌碼輸光了</h2><p style="font-size:20px;font-weight:700">在這場夢裡，你被${winner ? esc(winner.name) : '對手'}贏下桌了……<br>但夢還沒醒，你可以再試一次。</p>
      <div class="stack-btns"><button class="btn pink" data-a="retry">重新挑戰 ▶</button><button class="btn alt" data-a="title">回主選單</button></div>`, (p) => {
      p.querySelector('[data-a=retry]').onclick = () => {
        closeOverlay();
        if (G.mode === 'free') { const N = newRun({ mode: 'free', name: '你', look: G.look, diff: G.diff, levelIdx: G.levelIdx }); N.free = G.free; startStage(N); }
        else { App.run = G; startStage(G); }
      };
      p.querySelector('[data-a=title]').onclick = () => { closeOverlay(); App.run = null; buildTitle(); show('title'); };
    });
  }

  function confirmBox(msg, yes) {
    const prev = $('#overlay').classList.contains('show') ? $('#overlay-panel').innerHTML : null;
    overlay(`<h2 style="justify-content:center">${msg}</h2><div class="row" style="justify-content:center;margin-top:16px"><button class="btn alt" data-a="no">取消</button><button class="btn red" data-a="yes">確定</button></div>`, (p) => {
      p.querySelector('[data-a=no]').onclick = () => { closeOverlay(); if (prev) reopenPause(); };
      p.querySelector('[data-a=yes]').onclick = () => { closeOverlay(); yes(); if (prev) reopenPause(); };
    });
  }

  // ═════════════ 暫停選單 ═════════════
  function reopenPause() { if (App.run && App.screen === 'game') openPause(); }
  function openPause() {
    const G = App.run;
    if (!G || App.screen !== 'game') return;
    G.paused = true;
    overlay(`<h2 style="justify-content:center">⏸ 暫停</h2>
      <div class="stack-btns">
        <button class="btn pink" data-a="resume">繼續遊戲</button>
        <button class="btn alt" data-a="save">💾 儲存紀錄（此時此刻）</button>
        <button class="btn alt" data-a="mods">🧩 輔助模組</button>
        <button class="btn alt" data-a="settings">⚙️ 設定</button>
        <button class="btn alt" data-a="rules">📖 德州撲克規則</button>
        <button class="btn red" data-a="quit">離開到主選單</button>
      </div><p class="muted">${G.slot !== null ? `每個動作都會自動存到紀錄 ${G.slot + 1}。` : '自由模式尚未指定存檔格，請手動儲存一次。'}讀檔會從存檔的那一刻繼續。</p>`, (p) => {
      p.querySelector('[data-a=resume]').onclick = () => { closeOverlay(); G.paused = false; };
      p.querySelector('[data-a=save]').onclick = () => { closeOverlay(); openSlots('save', () => openPause()); };
      p.querySelector('[data-a=mods]').onclick = () => openModsPanel(() => openPause());
      p.querySelector('[data-a=settings]').onclick = () => { closeOverlay(); buildSettings(() => { closeOver('settings'); openPause(); }); openOver('settings'); };
      p.querySelector('[data-a=rules]').onclick = () => showRules();
      p.querySelector('[data-a=quit]').onclick = () => { closeOverlay(); saveRun(G); clearInterval(G.extraTimer); App.run = null; hideActions(); buildTitle(); show('title'); };
    });
  }
  function showRules() {
    overlay(`<h2 style="justify-content:center">📖 德州撲克規則（無限注）</h2>
      <div style="text-align:left;font-size:15px;line-height:1.7;max-width:640px;font-weight:500">
      <b>流程：</b>每人 2 張底牌 → 翻牌前下注 → 翻牌（3 張公牌）→ 下注 → 轉牌（第 4 張）→ 下注 → 河牌（第 5 張）→ 下注 → 攤牌。<br>
      <b>盲注：</b>按鈕位（D）左手為小盲、再左為大盲；單挑時按鈕位是小盲並在翻牌前先行動。<br>
      <b>加注：</b>至少要加上一次加注的幅度（最少一個大盲）。不足額的全下不會重新開放已行動玩家的加注權。<br>
      <b>邊池：</b>有人全下時，超出他投入的部分另成邊池，他只能贏主池。<br>
      <b>牌型大小：</b>同花順 ＞ 四條 ＞ 葫蘆 ＞ 同花 ＞ 順子 ＞ 三條 ＞ 兩對 ＞ 一對 ＞ 高牌（A2345 為最小順子）。平手平分底池。<br>
      <b>過關：</b>把同桌所有對手的籌碼贏光；你的籌碼歸零就要重來。</div>
      <div class="row" style="justify-content:center;margin-top:12px"><button class="btn" data-a="back">返回</button></div>`, (p) => {
      p.querySelector('[data-a=back]').onclick = () => openPause();
    });
  }
  $('#hud-menu').addEventListener('click', () => { Audio.sfx('click'); openPause(); });

  // 主角嗆聲
  const HERO_LINES = ['你在詐唬吧？', '我全都看穿了。', '這把我贏定了！', '快一點啦～', '好牌！', '你的表情出賣你了。', '我只是運氣好～'];
  $('#hud-chat').addEventListener('click', () => {
    const G = App.run; if (!G || App.screen !== 'game') return;
    Audio.sfx('click');
    say(G, 0, Dialogue.pick(HERO_LINES), 2200);
    setExpr(G, 0, 'smug', 2000);
    const opp = G.table.players.filter((p) => p.seat > 0 && !p.out);
    if (opp.length) setTimeout(() => { if (App.run === G) charLine(G, Dialogue.pick(opp).seat, 'taunt', 0.8); }, 1200);
  });

  // ═════════════ 鍵盤 ═════════════
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (App.screen === 'story' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); storyNext && storyNext(); return; }
    if (App.screen !== 'game') return;
    if (e.key === 'Escape') { if ($('#overlay').classList.contains('show') && App.run && App.run.paused && !App.overlayScreens.length) { closeOverlay(); App.run.paused = false; } else if (!$('#overlay').classList.contains('show')) openPause(); return; }
    if (App.run && App.run.nextResolve && !App.run.paused && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); App.run.nextResolve(); return; }
    if (!humanResolve) return;
    const k = e.key.toLowerCase();
    if (k === 'f') doHuman('fold');
    else if (k === 'c' || k === ' ') { e.preventDefault(); doHuman('call'); }
    else if (k === 'r' && !$('#a-raise').disabled) doHuman('raise');
    else if (k === 'a' && !$('#a-allin').disabled) doHuman('allin');
  });

  // ═════════════ 啟動 ═════════════
  // 牌桌絨布紋理（程式產生的雜訊）
  try {
    const nc = document.createElement('canvas'); nc.width = nc.height = 128;
    const nx = nc.getContext('2d'), d = nx.createImageData(128, 128);
    for (let i = 0; i < d.data.length; i += 4) { const v = 110 + Math.random() * 40; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
    nx.putImageData(d, 0, 0);
    stage.style.setProperty('--noise', `url(${nc.toDataURL()})`);
  } catch (e) { /* 無紋理也可 */ }
  applySettings();
  buildTitle();
  show('title');
  HP.App = App; // 方便除錯
  HP.Debug = {
    free(levelIdx, opps, diff = 'normal') {
      const G = newRun({ mode: 'free', name: '你', look: NG.look, diff, levelIdx });
      const L = LEVELS[levelIdx];
      G.free = { levelIdx, opps: opps || rosterOf(levelIdx).slice(0, 5), diff, chips: L.chips, bb: L.blindBase, every: L.every };
      startStage(G);
    },
  };
})();
