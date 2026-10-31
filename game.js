/* =========================================================
   ZERO//CHESS — game logic
   Single-player auto battler · Zenless Zone Zero inspired
   ========================================================= */
(() => {
  'use strict';

  const STAR_MULT = { 1: 1, 2: 1.8, 3: 3.2 };
  const LOG_LIMIT = 40;
  const PLAYER_START_ROW = 4;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const dist = (a, b) => Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
  const cheb = (a, b) => Math.max(Math.abs(a.c - b.c), Math.abs(a.r - b.r));
  const cellKey = (p) => p.c + ',' + p.r;

  const els = {
    title: $('#title-screen'),
    game: $('#game'),
    titleAgents: $('#title-agents'),
    board: $('#board'),
    boardShell: $('#board-shell'),
    unitLayer: $('#unit-layer'),
    fxLayer: $('#fx-layer'),
    bench: $('#bench'),
    shop: $('#shop-cards'),
    synergyList: $('#synergy-list'),
    synCount: $('#syn-count'),
    detail: $('#detail'),
    nextWave: $('#next-wave'),
    combatLog: $('#combat-log'),
    hudHp: $('#hud-hp'),
    hudGold: $('#hud-gold'),
    hudLevel: $('#hud-level'),
    hudXp: $('#hud-xp'),
    hudStreak: $('#hud-streak'),
    hudStreakIcon: $('#hud-streak-icon'),
    hudStage: $('#hud-stage'),
    hudWave: $('#hud-wave'),
    hudTimer: $('#hud-timer'),
    timerLabel: $('#timer-label'),
    benchCount: $('#bench-count'),
    boardCap: $('#board-cap'),
    roundBadge: $('#round-badge'),
    battleBtn: $('#btn-battle'),
    rerollBtn: $('#btn-reroll'),
    xpBtn: $('#btn-xp'),
    lockBtn: $('#btn-lock'),
    shopLockLabel: $('#shop-lock-label'),
    selBar: $('#sel-bar'),
    sbFace: $('#sb-face'),
    sbName: $('#sb-name'),
    sbSub: $('#sb-sub'),
    sbPrice: $('#sb-price'),
    banner: $('#round-banner'),
    rbInner: $('#rb-inner'),
    rbKicker: $('#rb-kicker'),
    rbTitle: $('#rb-title'),
    rbLines: $('#rb-lines'),
    rbContinue: $('#rb-continue'),
    rbCount: $('#rb-count'),
    endScreen: $('#end-screen'),
    endCard: $('.end-card'),
    endKicker: $('#end-kicker'),
    endTitle: $('#end-title'),
    endSub: $('#end-sub'),
    endStats: $('#end-stats'),
    help: $('#help-modal'),
    toast: $('#toast'),
    ghost: $('#ghost'),
    flash: $('#screen-flash'),
    speedGroup: $('#speed-group')
  };

  const cells = [];

  function makeState() {
    return {
      screen: 'title',
      phase: 'prep',
      hp: START_HP,
      gold: START_GOLD,
      level: START_LEVEL,
      xp: 0,
      round: 0,
      timer: PREP_TIME,
      board: new Array(COLS * ROWS).fill(null),
      bench: new Array(BENCH_SIZE).fill(null),
      shop: new Array(5).fill(null),
      locked: false,
      streak: 0,
      speed: 1,
      sel: null,
      muted: false,
      paused: false,
      wins: 0,
      losses: 0,
      totalGold: 0,
      uid: 1,
      log: [],
      lastWin: false
    };
  }

  let state = makeState();
  let combat = null;
  let timerId = null;
  let bannerId = null;
  let bannerLeft = 0;
  let toastId = null;
  let dragState = null;

  /* ---------------- audio ---------------- */
  let audioCtx = null;
  function tone(freq, dur, type = 'sine', vol = 0.035, delay = 0) {
    if (state.muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t0 = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (e) { /* ignore audio failures */ }
  }
  function sfx(kind) {
    switch (kind) {
      case 'buy': tone(520, 0.09, 'triangle', 0.04); tone(780, 0.1, 'triangle', 0.03, 0.06); break;
      case 'sell': tone(420, 0.09, 'triangle', 0.035); tone(300, 0.1, 'triangle', 0.03, 0.06); break;
      case 'place': tone(360, 0.06, 'square', 0.025); break;
      case 'star': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.04, i * 0.07)); break;
      case 'deny': tone(150, 0.12, 'sawtooth', 0.03); break;
      case 'start': [330, 440, 660].forEach((f, i) => tone(f, 0.18, 'triangle', 0.04, i * 0.09)); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.24, 'triangle', 0.045, i * 0.1)); break;
      case 'loss': [400, 320, 240, 180].forEach((f, i) => tone(f, 0.26, 'sawtooth', 0.03, i * 0.11)); break;
      case 'cast': tone(880, 0.08, 'sine', 0.02); break;
      case 'level': [660, 880].forEach((f, i) => tone(f, 0.15, 'triangle', 0.04, i * 0.08)); break;
      case 'click': tone(600, 0.04, 'square', 0.015); break;
      default: break;
    }
  }

  /* ---------------- toast ---------------- */
  function toast(msg, kind = '') {
    els.toast.textContent = msg;
    els.toast.className = 'toast show ' + kind;
    clearTimeout(toastId);
    toastId = setTimeout(() => { els.toast.className = 'toast'; }, 1800);
  }

  /* ---------------- helpers ---------------- */
  function makeUnit(charId, star = 1) {
    return { uid: state.uid++, charId, star };
  }

  function unitAt(type, idx) {
    return type === 'board' ? state.board[idx] : state.bench[idx];
  }

  function unitLoc(unit) {
    if (!unit) return null;
    for (let i = 0; i < state.board.length; i++) if (state.board[i] === unit) return { type: 'board', idx: i };
    for (let i = 0; i < state.bench.length; i++) if (state.bench[i] === unit) return { type: 'bench', idx: i };
    return null;
  }

  function boardUnits() { return state.board.filter(Boolean); }
  function benchCount() { return state.bench.filter(Boolean).length; }

  function statFor(unit) {
    const c = CHARS_BY_ID[unit.charId];
    const m = STAR_MULT[unit.star] || 1;
    return {
      hp: Math.round(c.hp * m),
      atk: Math.round(c.atk * m),
      armor: c.armor,
      atkSpd: c.atkSpd,
      range: c.range,
      mana: c.mana
    };
  }

  function sellPrice(unit) {
    return CHARS_BY_ID[unit.charId].cost * Math.pow(3, unit.star - 1);
  }

  function starStr(star) { return '★'.repeat(star); }

  /* ---------------- synergies ---------------- */
  function traitCounts() {
    const f = {}, r = {};
    for (const u of boardUnits()) {
      const c = CHARS_BY_ID[u.charId];
      f[c.faction] = (f[c.faction] || 0) + 1;
      r[c.role] = (r[c.role] || 0) + 1;
    }
    return { f, r };
  }

  function traitTier(def, count) {
    let tier = 0, idx = -1;
    def.tiers.forEach((t, i) => {
      if (count >= t) { tier = t; idx = i; }
    });
    return { tier, idx };
  }

  function synergyState() {
    const counts = traitCounts();
    const factions = Object.entries(FACTIONS).map(([id, def]) => {
      const count = counts.f[id] || 0;
      const { tier, idx } = traitTier(def, count);
      const next = def.tiers.find(t => count < t) || 0;
      return { id, def, count, tier, idx, next, active: tier > 0 };
    }).filter(x => x.count > 0);
    const roles = Object.entries(ROLES).map(([id, def]) => {
      const count = counts.r[id] || 0;
      const { tier, idx } = traitTier(def, count);
      const next = def.tiers.find(t => count < t) || 0;
      return { id, def, count, tier, idx, next, active: tier > 0 };
    }).filter(x => x.count > 0);
    return { factions, roles };
  }

  function applyBonus(u, b) {
    if (!b) return;
    if (b.hp) { u.maxHp += b.hp; u.hp += b.hp; }
    if (b.atkPct) u.buffAtk += b.atkPct;
    if (b.spdPct) u.buffSpd += b.spdPct;
    if (b.armor) u.armor += b.armor;
    if (b.dr) u.buffDr += b.dr;
    if (b.abilityPct) u.abilityMul += b.abilityPct;
    if (b.mana) u.mana = Math.min(u.manaMax, u.mana + b.mana);
    if (b.shield) u.shield += b.shield;
    if (b.lifesteal) u.lifesteal += b.lifesteal;
    if (b.healPct) u.healPct += b.healPct;
  }

  function applySynergies(playerUnits) {
    const counts = traitCounts();
    for (const u of playerUnits) {
      const c = CHARS_BY_ID[u.charId];
      const fT = traitTier(FACTIONS[c.faction], counts.f[c.faction] || 0);
      if (fT.idx >= 0) applyBonus(u, FACTIONS[c.faction].bonuses[fT.idx]);
      if (c.role !== 'support') {
        const rT = traitTier(ROLES[c.role], counts.r[c.role] || 0);
        if (rT.idx >= 0) applyBonus(u, ROLES[c.role].bonuses[rT.idx]);
      }
    }
    const sT = traitTier(ROLES.support, counts.r.support || 0);
    if (sT.idx >= 0) {
      const b = ROLES.support.bonuses[sT.idx];
      for (const u of playerUnits) {
        if (b.mana) u.mana = Math.min(u.manaMax, u.mana + b.mana);
        if (b.healPct) u.healPct += b.healPct;
      }
    }
    for (const u of playerUnits) {
      u.hp = Math.min(u.hp, u.maxHp);
      u.mana = Math.min(u.mana, u.manaMax);
    }
  }

  /* ---------------- shop / economy ---------------- */
  function weightedCost(odds) {
    let roll = Math.random(), acc = 0;
    for (let i = 0; i < odds.length; i++) {
      acc += odds[i];
      if (roll < acc) return i + 1;
    }
    return 1;
  }

  function pickCharForCost(cost) {
    const pool = CHARS.filter(c => c.cost === cost);
    return pool.length ? pick(pool) : pick(CHARS.filter(c => c.cost === 1));
  }

  function rollShop(force = false) {
    if (!force && state.locked) return;
    const odds = SHOP_ODDS[state.level] || SHOP_ODDS[MAX_LEVEL];
    state.shop = Array.from({ length: 5 }, () => pickCharForCost(weightedCost(odds)).id);
    renderShop();
  }

  function buyFromShop(i) {
    if (state.phase !== 'prep') { toast('전투 중에는 영입할 수 없습니다', 'bad'); return false; }
    const id = state.shop[i];
    if (!id) return false;
    const c = CHARS_BY_ID[id];
    if (state.gold < c.cost) { toast('골드가 부족합니다', 'bad'); sfx('deny'); return false; }
    if (benchCount() >= BENCH_SIZE) { toast('벤치가 가득 찼습니다', 'bad'); sfx('deny'); return false; }
    state.gold -= c.cost;
    state.shop[i] = null;
    const unit = makeUnit(id);
    state.bench[state.bench.indexOf(null)] = unit;
    const merged = checkCombines();
    if (!merged) toast(`${c.name} 영입 · ${c.cost}G`);
    sfx('buy');
    renderAll();
    return true;
  }

  function rerollShop() {
    if (state.phase !== 'prep') { toast('전투 중에는 새로고침할 수 없습니다', 'bad'); return; }
    if (state.gold < 2) { toast('골드가 부족합니다 (2G)', 'bad'); sfx('deny'); return; }
    state.gold -= 2;
    rollShop(true);
    renderHUD();
    sfx('click');
  }

  function buyXp() {
    if (state.phase !== 'prep') { toast('전투 중에는 경험치를 살 수 없습니다', 'bad'); return; }
    if (state.level >= MAX_LEVEL) { toast('이미 최고 레벨입니다'); return; }
    if (state.gold < 4) { toast('골드가 부족합니다 (4G)', 'bad'); sfx('deny'); return; }
    state.gold -= 4;
    addXp(4);
    renderHUD();
    sfx('click');
  }

  function addXp(amount) {
    if (state.level >= MAX_LEVEL) return;
    state.xp += amount;
    while (state.level < MAX_LEVEL) {
      const need = XP_TO_NEXT[state.level];
      if (!need || state.xp < need) break;
      state.xp -= need;
      state.level++;
      sfx('level');
      toast(`레벨 ${state.level} — 배치 가능 ${state.level}명`);
    }
    if (state.level >= MAX_LEVEL) state.xp = 0;
    renderHUD();
  }

  function toggleLock() {
    state.locked = !state.locked;
    renderShop();
    renderHUD();
    sfx('click');
  }

  function sellSelected() {
    if (state.phase !== 'prep') { toast('전투 중에는 판매할 수 없습니다', 'bad'); return; }
    if (!state.sel) return;
    const { unit, from, idx } = state.sel;
    const c = CHARS_BY_ID[unit.charId];
    const price = sellPrice(unit);
    state.gold += price;
    if (from === 'board') state.board[idx] = null; else state.bench[idx] = null;
    state.sel = null;
    sfx('sell');
    toast(`${c.name} 판매 +${price}G`);
    renderAll();
  }

  function benchSelected() {
    if (!state.sel || state.sel.from !== 'board') return;
    const slot = state.bench.indexOf(null);
    if (slot < 0) { toast('벤치가 가득 찼습니다', 'bad'); return; }
    placeUnit('board', state.sel.idx, 'bench', slot);
  }

  /* ---------------- placement / combine ---------------- */
  function placeUnit(from, fromIdx, toType, toIdx) {
    if (state.phase !== 'prep') return false;
    if (from === toType && fromIdx === toIdx) return false;
    const unit = unitAt(from, fromIdx);
    if (!unit) return false;

    if (toType === 'board') {
      const r = Math.floor(toIdx / COLS);
      if (r < PLAYER_START_ROW) { toast('아군 배치 구역이 아닙니다', 'bad'); sfx('deny'); return false; }
    }

    const target = unitAt(toType, toIdx);
    if (target === unit) return false;

    if (toType === 'board' && !target && from === 'bench' && boardUnits().length >= state.level) {
      toast(`배치 한도 ${state.level}명 — 레벨업이 필요합니다`, 'bad');
      sfx('deny');
      return false;
    }

    // unlink source
    if (from === 'board') state.board[fromIdx] = null;
    else state.bench[fromIdx] = null;

    // swap target back to source
    if (target) {
      if (from === 'board') state.board[fromIdx] = target;
      else state.bench[fromIdx] = target;
    }

    if (toType === 'board') state.board[toIdx] = unit;
    else state.bench[toIdx] = unit;

    state.sel = null;
    checkCombines();
    sfx('place');
    renderAll();
    return true;
  }

  function checkCombines() {
    let combinedAny = false;
    for (const star of [1, 2]) {
      let looping = true;
      while (looping) {
        looping = false;
        const groups = new Map();
        const collect = (u, type, idx) => {
          if (!u || u.star !== star) return;
          if (!groups.has(u.charId)) groups.set(u.charId, []);
          groups.get(u.charId).push({ u, type, idx });
        };
        state.board.forEach((u, i) => collect(u, 'board', i));
        state.bench.forEach((u, i) => collect(u, 'bench', i));
        for (const [id, list] of groups) {
          if (list.length < 3) continue;
          const keeper = list.find(e => e.type === 'board') || list[0];
          const others = list.filter(e => e !== keeper).slice(0, 2);
          const removed = [];
          for (const e of others) {
            if (e.type === 'board') state.board[e.idx] = null;
            else state.bench[e.idx] = null;
            removed.push(e.u);
            if (state.sel && state.sel.unit === e.u) state.sel = null;
          }
          keeper.u.star++;
          combinedAny = true;
          looping = true;
          const c = CHARS_BY_ID[id];
          sfx('star');
          toast(`${c.name} ${keeper.u.star}★ 각성!`, '');
          break;
        }
      }
    }
    return combinedAny;
  }

  function selectUnit(unit, from, idx) {
    if (state.phase !== 'prep') return;
    if (state.sel && state.sel.unit === unit) {
      state.sel = null;
    } else {
      state.sel = { unit, from, idx };
      sfx('click');
    }
    refreshSelectionUI();
  }

  function onCellClick(idx) {
    if (state.phase !== 'prep') return;
    const r = Math.floor(idx / COLS);
    if (!state.sel) {
      if (state.board[idx]) selectUnit(state.board[idx], 'board', idx);
      return;
    }
    if (r < PLAYER_START_ROW) { toast('적 구역에는 배치할 수 없습니다', 'bad'); return; }
    placeUnit(state.sel.from, state.sel.idx, 'board', idx);
  }

  function onBenchClick(idx) {
    if (state.phase !== 'prep') return;
    const u = state.bench[idx];
    if (!state.sel) {
      if (u) selectUnit(u, 'bench', idx);
      return;
    }
    if (u === state.sel.unit) { state.sel = null; refreshSelectionUI(); return; }
    placeUnit(state.sel.from, state.sel.idx, 'bench', idx);
  }

  /* ---------------- drag ---------------- */
  function bindDrag(el, unit, from, idx) {
    el.addEventListener('pointerdown', (e) => {
      if (state.phase !== 'prep' || e.button === 2) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragState = { unit, from, idx, startX: e.clientX, startY: e.clientY, moved: false, el };
      el.setPointerCapture && el.setPointerCapture(e.pointerId);

      const onMove = (ev) => {
        if (!dragState || dragState.el !== el) return;
        const dx = ev.clientX - dragState.startX;
        const dy = ev.clientY - dragState.startY;
        if (!dragState.moved && Math.hypot(dx, dy) > 9) {
          dragState.moved = true;
          el.classList.add('dragging');
          showGhost(unit, ev.clientX, ev.clientY);
          markValidCells(true);
        }
        if (dragState.moved) moveGhost(ev.clientX, ev.clientY);
      };

      const finish = (drop, ev) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        const d = dragState;
        dragState = null;
        el.classList.remove('dragging');
        hideGhost();
        markValidCells(false);
        if (!d) return;
        if (d.moved && drop && ev) {
          handleDrop(d, ev.clientX, ev.clientY);
        } else if (!d.moved) {
          selectUnit(d.unit, d.from, d.idx);
        } else {
          markValidCells(!!state.sel);
        }
      };
      const onUp = (ev) => finish(true, ev);
      const onCancel = () => finish(false);

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    });
    el.addEventListener('click', (e) => e.stopPropagation());
  }

  function showGhost(unit, x, y) {
    const c = CHARS_BY_ID[unit.charId];
    els.ghost.innerHTML = `<div class="u-card" style="background:linear-gradient(155deg,${c.c1},${c.c2})">` +
      `<span style="position:relative;z-index:2;font-size:22px;font-weight:900;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)">${c.name[0]}</span></div>`;
    els.ghost.classList.remove('hidden');
    moveGhost(x, y);
  }
  function moveGhost(x, y) {
    els.ghost.style.left = x + 'px';
    els.ghost.style.top = y + 'px';
  }
  function hideGhost() { els.ghost.classList.add('hidden'); }

  function markValidCells(on) {
    for (const cell of cells) {
      const r = Number(cell.dataset.r);
      cell.classList.toggle('valid', on && r >= PLAYER_START_ROW);
    }
  }

  function handleDrop(d, x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const token = el.closest('.unit[data-board]');
    const cell = el.closest('.cell');
    const benchSlot = el.closest('.bench-slot');
    if (token) placeUnit(d.from, d.idx, 'board', Number(token.dataset.board));
    else if (benchSlot) placeUnit(d.from, d.idx, 'bench', Number(benchSlot.dataset.bench));
    else if (cell) placeUnit(d.from, d.idx, 'board', Number(cell.dataset.cell));
  }

  /* ---------------- render helpers ---------------- */
  function updateCellVar() {
    const w = els.boardShell.clientWidth;
    if (w) els.boardShell.style.setProperty('--cell', (w / COLS) + 'px');
  }

  function tokenMarkup(v) {
    const stars = v.star >= 2 ? '★'.repeat(v.star) : '';
    const portrait = v.img ? `<img class="u-img" src="${v.img}" alt="" draggable="false" onerror="this.remove()" />` : '';
    return `<div class="u-card">` +
      portrait +
      (stars ? `<span class="u-star">${stars}</span>` : '') +
      `<span class="u-role">${v.roleIcon || ''}</span>` +
      `<span class="u-face">${v.face}</span>` +
      `<span class="u-name">${v.name}</span>` +
      `<span class="u-shield" style="width:0%;opacity:0"></span>` +
      `<div class="u-bars">` +
        `<div class="u-bar u-hp ${v.side === 'enemy' ? 'enemy' : ''}"><i style="width:100%"></i></div>` +
        `<div class="u-bar u-mana"><i style="width:0%"></i></div>` +
      `</div>` +
    `</div>`;
  }

  function prepView(unit) {
    const c = CHARS_BY_ID[unit.charId];
    return {
      uid: unit.uid,
      name: c.name,
      face: c.name[0],
      star: unit.star,
      c1: c.c1,
      c2: c.c2,
      side: 'player',
      img: c.icon,
      roleIcon: ROLES[c.role].icon
    };
  }

  function createPrepToken(unit, idx) {
    const r = Math.floor(idx / COLS), c = idx % COLS;
    const v = prepView(unit);
    const el = document.createElement('div');
    el.className = 'unit';
    el.dataset.board = idx;
    el.dataset.uid = unit.uid;
    el.style.setProperty('--c1', v.c1);
    el.style.setProperty('--c2', v.c2);
    el.style.left = (c / COLS * 100) + '%';
    el.style.top = (r / ROWS * 100) + '%';
    el.innerHTML = tokenMarkup(v);
    if (state.sel && state.sel.unit === unit) el.classList.add('selected');
    bindDrag(el, unit, 'board', idx);
    return el;
  }

  function renderBoard() {
    if (state.phase === 'combat') return;
    els.unitLayer.innerHTML = '';
    state.board.forEach((u, idx) => {
      if (u) els.unitLayer.appendChild(createPrepToken(u, idx));
    });
  }

  function renderBench() {
    els.bench.innerHTML = '';
    for (let i = 0; i < BENCH_SIZE; i++) {
      const u = state.bench[i];
      const slot = document.createElement('div');
      slot.className = 'bench-slot';
      slot.dataset.bench = i;
      if (u) {
        const c = CHARS_BY_ID[u.charId];
        const chip = document.createElement('div');
        chip.className = 'bench-unit' + (state.sel && state.sel.unit === u ? ' selected' : '');
        chip.dataset.bench = i;
        chip.style.setProperty('--c1', c.c1);
        chip.style.setProperty('--c2', c.c2);
        chip.innerHTML = `<span class="bu-star">${u.star >= 2 ? '★'.repeat(u.star) : ''}</span>` +
          `<img class="bu-img" src="${c.icon}" alt="" draggable="false" onerror="this.remove()" />` +
          `<span class="bu-face">${c.name[0]}</span>` +
          `<span class="bu-name">${c.name}</span>`;
        bindDrag(chip, u, 'bench', i);
        slot.appendChild(chip);
      } else {
        slot.innerHTML = `<span class="empty-plus">+</span>`;
      }
      els.bench.appendChild(slot);
    }
    els.benchCount.textContent = `${benchCount()}/${BENCH_SIZE}`;
  }

  function renderShop() {
    els.shop.innerHTML = state.shop.map((id, i) => {
      if (!id) {
        return `<div class="shop-card sold" aria-hidden="true"><div class="sc-sold">SOLD</div></div>`;
      }
      const c = CHARS_BY_ID[id];
      const cant = state.gold < c.cost || state.phase !== 'prep';
      return `<button class="shop-card cost-${c.cost}${cant ? ' cant' : ''}" data-shop="${i}" style="--cost-color:${COST_COLORS[c.cost]}">` +
        `<div class="sc-top"><span class="sc-cost">${c.cost}</span><span class="sc-traits">${FACTIONS[c.faction].icon} ${ROLES[c.role].icon}</span></div>` +
        `<div class="sc-portrait" style="--c1:${c.c1};--c2:${c.c2}"><span class="sc-face">${c.name[0]}</span><img class="sc-img" src="${c.img}" alt="" loading="lazy" draggable="false" onerror="this.remove()" /></div>` +
        `<div class="sc-bottom">` +
          `<div class="sc-name">${c.name}</div>` +
          `<div class="sc-sub">${FACTIONS[c.faction].short} · ${ROLES[c.role].name}</div>` +
          `<div class="sc-ability">${c.ability.name}</div>` +
        `</div>` +
      `</button>`;
    }).join('');
  }

  function renderHUD() {
    els.hudHp.textContent = state.hp;
    els.hudGold.textContent = state.gold;
    els.hudLevel.textContent = state.level;
    const need = XP_TO_NEXT[state.level] || 0;
    els.hudXp.style.width = state.level >= MAX_LEVEL ? '100%' : `${clamp((state.xp / need) * 100, 0, 100)}%`;

    const s = state.streak;
    els.hudStreak.textContent = s > 0 ? `+${s}` : `${s}`;
    els.hudStreak.style.color = s > 0 ? 'var(--green)' : s < 0 ? 'var(--red)' : '';
    els.hudStreakIcon.textContent = s > 0 ? '🔥' : s < 0 ? '❄' : '✦';

    const wave = WAVES[state.round];
    els.hudStage.textContent = wave ? wave.stage : '—';
    els.hudWave.textContent = wave ? wave.name : '';
    els.roundBadge.textContent = String(state.round + 1).padStart(2, '0');
    els.boardCap.textContent = `${boardUnits().length}/${state.level}`;
    els.benchCount.textContent = `${benchCount()}/${BENCH_SIZE}`;

    els.lockBtn.classList.toggle('on', state.locked);
    els.lockBtn.innerHTML = `잠금 <b>${state.locked ? 'ON' : 'OFF'}</b>`;
    els.shopLockLabel.textContent = state.locked ? '🔒 잠김' : '';

    const prep = state.phase === 'prep';
    els.rerollBtn.disabled = !prep;
    els.xpBtn.disabled = !prep || state.level >= MAX_LEVEL;
    els.battleBtn.disabled = !prep;
    els.battleBtn.textContent = state.phase === 'combat' ? '전투 중' : state.phase === 'result' ? '정산 중' : '전투 시작';

    els.speedGroup.querySelectorAll('.spd').forEach(b => {
      b.classList.toggle('on', Number(b.dataset.speed) === state.speed);
    });
    updateTimerUI();
  }

  function synthItem(x, kind) {
    const def = x.def;
    const active = x.active;
    const line = active ? def.lines[x.idx] : (x.next ? `다음 ${x.next}명` : '');
    const maxTier = def.tiers[def.tiers.length - 1];
    return `<div class="syn${active ? ' active' : ''}${x.tier === maxTier ? ' max' : ''}" style="--syn-color:${def.color}" title="${def.lines.join(' / ')}">` +
      `<span class="syn-icon">${def.icon}</span>` +
      `<div class="syn-main"><b>${def.name}</b><small>${line}</small>` +
        `<div class="syn-pips">${def.tiers.map(t => `<i class="${x.count >= t ? 'on' : ''}"></i>`).join('')}</div>` +
      `</div>` +
      `<span class="syn-count">${x.count}<em>/${x.next || x.tier || def.tiers[0]}</em></span>` +
    `</div>`;
  }

  function renderSynergies() {
    const s = synergyState();
    const activeCount = s.factions.filter(x => x.active).length + s.roles.filter(x => x.active).length;
    els.synCount.textContent = activeCount;
    if (!s.factions.length && !s.roles.length) {
      els.synergyList.innerHTML = `<div class="syn-empty">요원을 배치하면<br />시너지가 표시됩니다</div>`;
      return;
    }
    const sortFn = (a, b) => (b.active - a.active) || (b.tier - a.tier) || (b.count - a.count);
    s.factions.sort(sortFn);
    s.roles.sort(sortFn);
    let html = s.factions.map(x => synthItem(x, 'faction')).join('');
    if (s.roles.length) {
      html += `<div class="syn-role-head">ROLE / 역할</div>`;
      html += s.roles.map(x => synthItem(x, 'role')).join('');
    }
    els.synergyList.innerHTML = html;
  }

  function renderNextWave() {
    const wave = WAVES[state.round];
    if (!wave) { els.nextWave.innerHTML = ''; return; }
    const counts = {};
    for (const [t] of wave.units) counts[t] = (counts[t] || 0) + 1;
    const chips = Object.entries(counts).map(([t, n]) => {
      const e = ENEMY_TYPES[t];
      return `<span class="nw-chip${e.boss ? ' boss' : ''}">${e.glyph} ${e.name} ×${n}</span>`;
    }).join('');
    const isCombat = state.phase === 'combat';
    els.nextWave.innerHTML = `<div class="nw-head"><span>${isCombat ? 'CURRENT WAVE' : 'NEXT WAVE'}</span><b>${wave.stage}</b></div>` +
      `<div class="nw-name">${wave.name}</div>` +
      (wave.boss ? `<div class="nw-boss-tag">⚠ BOSS ENCOUNTER</div>` : '') +
      `<div class="nw-units">${chips}</div>`;
  }

  function renderDetail() {
    const sel = state.sel;
    if (!sel || state.phase !== 'prep') {
      els.detail.innerHTML = `<div class="detail-empty">` +
        `<b>작전 브리핑</b><br />` +
        `벤치의 요원을 탭한 뒤 <b>하단 4줄</b>을 탭해 배치하세요.<br />` +
        `같은 요원 3명 = 자동 각성.<br />` +
        `요원을 선택하면 상세 정보와 판매 버튼이 표시됩니다.</div>`;
      return;
    }
    const c = CHARS_BY_ID[sel.unit.charId];
    const st = statFor(sel.unit);
    const f = FACTIONS[c.faction], r = ROLES[c.role];
    const price = sellPrice(sel.unit);
    els.detail.innerHTML = `<div class="detail-top">` +
        `<div class="detail-face" style="--c1:${c.c1};--c2:${c.c2}"><span>${c.name[0]}</span><img class="detail-img" src="${c.img}" alt="" loading="lazy" draggable="false" onerror="this.remove()" /></div>` +
        `<div class="detail-name"><b>${c.name}</b><small>${c.en} · ${COST_NAMES[c.cost]} ${c.cost}G</small>` +
          `<span class="detail-stars">${'★'.repeat(sel.unit.star)}</span>` +
          `<div class="detail-traits"><span class="trait-pill">${f.icon} ${f.short}</span><span class="trait-pill">${r.icon} ${r.name}</span></div>` +
        `</div>` +
      `</div>` +
      `<div class="detail-stats">` +
        `<div class="ds"><span>HP</span><b>${st.hp}</b></div>` +
        `<div class="ds"><span>ATK</span><b>${st.atk}</b></div>` +
        `<div class="ds"><span>ARMOR</span><b>${st.armor}</b></div>` +
        `<div class="ds"><span>SPD</span><b>${st.atkSpd.toFixed(2)}</b></div>` +
        `<div class="ds"><span>RANGE</span><b>${st.range}</b></div>` +
        `<div class="ds"><span>MANA</span><b>${st.mana}</b></div>` +
      `</div>` +
      `<div class="detail-ability"><div class="da-head"><b>${c.ability.name}</b><span>MANA ${c.mana}</span></div>` +
        `<p>${c.ability.desc}</p></div>` +
      `<div class="detail-actions">` +
        `<button class="btn btn-sell" data-action="sell">판매 <b class="detail-sell-price">+${price}G</b></button>` +
        (sel.from === 'board' ? `<button class="btn btn-shop" data-action="tobench">벤치로</button>` : '') +
      `</div>`;
  }

  function updateSelBar() {
    const sel = state.sel;
    const show = !!sel && state.phase === 'prep';
    els.selBar.classList.toggle('hidden', !show);
    if (!sel) return;
    const c = CHARS_BY_ID[sel.unit.charId];
    els.sbFace.innerHTML = `<span class="sb-fallback">${c.name[0]}</span>` +
      `<img class="sb-img" src="${c.icon}" alt="" draggable="false" onerror="this.remove()" />`;
    els.sbFace.style.setProperty('--c1', c.c1);
    els.sbFace.style.setProperty('--c2', c.c2);
    els.sbName.textContent = `${c.name} ${'★'.repeat(sel.unit.star)}`;
    els.sbSub.textContent = `${FACTIONS[c.faction].short} · ${ROLES[c.role].name} · ${statFor(sel.unit).hp} HP`;
    els.sbPrice.textContent = `+${sellPrice(sel.unit)}G`;
  }

  function refreshSelectionUI() {
    $$('.unit.selected', els.unitLayer).forEach(el => el.classList.remove('selected'));
    $$('.bench-unit.selected', els.bench).forEach(el => el.classList.remove('selected'));
    if (state.sel) {
      const loc = unitLoc(state.sel.unit);
      if (!loc) state.sel = null;
      else {
        state.sel.from = loc.type;
        state.sel.idx = loc.idx;
        const el = loc.type === 'board'
          ? els.unitLayer.querySelector(`.unit[data-board="${loc.idx}"]`)
          : els.bench.querySelector(`.bench-unit[data-bench="${loc.idx}"]`);
        if (el) el.classList.add('selected');
      }
    }
    markValidCells(!!state.sel && state.phase === 'prep');
    renderDetail();
    updateSelBar();
  }

  function logEvent(text, cls = '') {
    state.log.push({ text, cls });
    if (state.log.length > LOG_LIMIT) state.log.shift();
    if (els.combatLog) {
      els.combatLog.innerHTML = state.log.slice(-14).map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
      els.combatLog.scrollTop = els.combatLog.scrollHeight;
    }
  }

  function renderLog() {
    els.combatLog.innerHTML = state.log.slice(-14).map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
    els.combatLog.scrollTop = els.combatLog.scrollHeight;
  }

  function updateTimerUI() {
    if (state.phase === 'combat') {
      els.timerLabel.textContent = '전투';
      els.hudTimer.textContent = '—';
      els.hudTimer.classList.remove('warn');
      return;
    }
    if (state.phase === 'result') {
      els.timerLabel.textContent = '정산';
      els.hudTimer.textContent = '—';
      els.hudTimer.classList.remove('warn');
      return;
    }
    els.timerLabel.textContent = '배치';
    els.hudTimer.textContent = Math.max(0, state.timer);
    els.hudTimer.classList.toggle('warn', state.timer <= 10 && state.phase === 'prep');
  }

  function startTimer() {
    clearInterval(timerId);
    state.timer = PREP_TIME;
    updateTimerUI();
    timerId = setInterval(() => {
      if (state.screen !== 'game' || state.phase !== 'prep' || state.paused) return;
      state.timer--;
      updateTimerUI();
      if (state.timer <= 0) {
        state.timer = 0;
        startBattle();
      }
    }, 1000);
  }
  function clearTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  function renderAll() {
    if (state.phase !== 'combat') renderBoard();
    renderBench();
    renderShop();
    renderHUD();
    renderSynergies();
    renderNextWave();
    renderDetail();
    updateSelBar();
    updateCellVar();
    markValidCells(!!state.sel && state.phase === 'prep');
    if (state.sel && state.phase === 'prep') refreshSelectionUI();
  }

  /* ---------------- boot / title ---------------- */
  function buildBoardCells() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        const cell = document.createElement('div');
        cell.className = 'cell ' + ((r + c) % 2 ? 'alt ' : '') + (r < PLAYER_START_ROW ? 'enemy' : 'player');
        cell.dataset.cell = idx;
        cell.dataset.r = r;
        cell.dataset.c = c;
        els.board.appendChild(cell);
        cells.push(cell);
      }
    }
    els.board.addEventListener('click', (e) => {
      const cell = e.target.closest('.cell');
      if (cell) onCellClick(Number(cell.dataset.cell));
    });
  }

  function renderTitleAgents() {
    const pool = CHARS.filter(c => c.cost >= 4);
    const chosen = [];
    while (chosen.length < 6 && pool.length) {
      const i = rand(pool.length);
      chosen.push(pool.splice(i, 1)[0]);
    }
    els.titleAgents.innerHTML = chosen.map(c =>
      `<div class="t-agent" style="--c1:${c.c1};--c2:${c.c2};animation-delay:${(Math.random() * 4).toFixed(1)}s" data-face="${c.name[0]}">` +
        `<img class="t-img" src="${c.img}" alt="" loading="lazy" draggable="false" onerror="this.remove()" />` +
        `<span>${c.en}</span>` +
      `</div>`
    ).join('');
  }

  /* ---------------- combat setup ---------------- */
  function makeCombatUnit(def, pos) {
    const c = CHARS_BY_ID[def.charId];
    const st = statFor(def);
    return {
      uid: 'p' + def.uid,
      defUid: def.uid,
      charId: def.charId,
      name: c.name,
      face: c.name[0],
      img: c.icon,
      star: def.star,
      side: 'player',
      faction: c.faction,
      role: c.role,
      roleIcon: ROLES[c.role].icon,
      c1: c.c1,
      c2: c.c2,
      maxHp: st.hp,
      hp: st.hp,
      atk: st.atk,
      armor: st.armor,
      atkSpd: st.atkSpd,
      range: st.range,
      manaMax: st.mana,
      mana: 0,
      shield: 0,
      ability: c.ability,
      abilityPower: Math.round(c.ability.power * (STAR_MULT[def.star] || 1)),
      abilityMul: 0,
      buffAtk: 0,
      buffSpd: 0,
      buffDr: 0,
      lifesteal: 0,
      healPct: 0,
      pos: { c: pos.c, r: pos.r },
      cd: 0.15 + Math.random() * 0.35,
      moveCd: 0,
      stun: 0,
      castLock: 0,
      alive: true,
      target: null,
      timed: [],
      boss: false,
      el: null,
      _lc: -1,
      _lr: -1,
      totalDamage: 0
    };
  }

  function makeEnemyUnit(typeKey, pos, wave) {
    const t = ENEMY_TYPES[typeKey];
    const hpMul = (1 + state.round * 0.145) * (wave.final && t.boss ? 1.15 : 1);
    const atkMul = 1 + state.round * 0.115;
    let name = t.name;
    if (t.boss) {
      if (wave.final) name = '제로 에테리얼';
      else if (wave.stage === '2-4') name = '데드엔드 부처';
      else if (wave.stage === '3-2') name = '쌍둥이 환영';
      else name = '아홉번째 손';
    }
    return {
      uid: `e${typeKey}${pos.c}${pos.r}${Math.random().toString(36).slice(2, 6)}`,
      defUid: null,
      charId: null,
      name,
      face: t.glyph,
      img: null,
      star: 0,
      side: 'enemy',
      faction: null,
      role: null,
      roleIcon: t.boss ? '👑' : '✦',
      c1: t.c1,
      c2: t.c2,
      maxHp: Math.round(t.hp * hpMul),
      hp: Math.round(t.hp * hpMul),
      atk: Math.round(t.atk * atkMul),
      armor: t.armor + state.round,
      atkSpd: t.atkSpd,
      range: t.range,
      manaMax: t.mana,
      mana: 0,
      shield: 0,
      ability: t.ability,
      abilityPower: Math.round(t.ability.power * (1 + state.round * 0.12)),
      abilityMul: 0,
      buffAtk: 0,
      buffSpd: 0,
      buffDr: 0,
      lifesteal: 0,
      healPct: 0,
      pos: { c: pos.c, r: pos.r },
      cd: 0.2 + Math.random() * 0.4,
      moveCd: 0,
      stun: 0,
      castLock: 0,
      alive: true,
      target: null,
      timed: [],
      boss: !!t.boss,
      el: null,
      _lc: -1,
      _lr: -1,
      totalDamage: 0
    };
  }

  function renderCombatTokens(units) {
    els.unitLayer.innerHTML = '';
    els.fxLayer.innerHTML = '';
    for (const u of units) {
      const el = document.createElement('div');
      el.className = 'unit combat' + (u.side === 'enemy' ? ' enemy' : '') + (u.boss ? ' boss' : '');
      el.dataset.uid = u.uid;
      el.style.setProperty('--c1', u.c1);
      el.style.setProperty('--c2', u.c2);
      el.style.left = (u.pos.c / COLS * 100) + '%';
      el.style.top = (u.pos.r / ROWS * 100) + '%';
      el.innerHTML = tokenMarkup(u);
      el._hp = el.querySelector('.u-hp i');
      el._mana = el.querySelector('.u-mana i');
      el._shield = el.querySelector('.u-shield');
      u.el = el;
      u._lc = u.pos.c;
      u._lr = u.pos.r;
      els.unitLayer.appendChild(el);
    }
  }

  function updateCombatToken(u) {
    const el = u.el;
    if (!el) return;
    if (u.pos.c !== u._lc || u.pos.r !== u._lr) {
      el.style.left = (u.pos.c / COLS * 100) + '%';
      el.style.top = (u.pos.r / ROWS * 100) + '%';
      u._lc = u.pos.c;
      u._lr = u.pos.r;
    }
    if (el._hp) el._hp.style.width = clamp((u.hp / u.maxHp) * 100, 0, 100) + '%';
    if (el._mana) el._mana.style.width = clamp((u.mana / u.manaMax) * 100, 0, 100) + '%';
    if (el._shield) {
      const pct = clamp((u.shield / u.maxHp) * 100, 0, 100);
      el._shield.style.width = pct + '%';
      el._shield.style.opacity = pct > 0 ? '0.7' : '0';
    }
    el.classList.toggle('stunned', u.stun > 0 && u.alive);
    if (!u.alive) el.classList.add('dead');
  }

  function startBattle() {
    if (state.screen !== 'game' || state.phase !== 'prep') return;
    if (!boardUnits().length) {
      state.timer = 15;
      updateTimerUI();
      toast('최소 1명의 요원을 배치하세요', 'bad');
      sfx('deny');
      return;
    }
    clearTimer();
    state.phase = 'combat';
    state.sel = null;
    hideGhost();
    updateSelBar();
    markValidCells(false);
    renderDetail();

    const wave = WAVES[state.round];
    const units = [];
    state.board.forEach((u, idx) => {
      if (u) units.push(makeCombatUnit(u, { c: idx % COLS, r: Math.floor(idx / COLS) }));
    });
    wave.units.forEach(([type, c, r]) => units.push(makeEnemyUnit(type, { c, r }, wave)));
    applySynergies(units.filter(u => u.side === 'player'));

    combat = {
      units,
      time: 0,
      last: performance.now(),
      over: false,
      raf: 0,
      wave
    };
    renderCombatTokens(units);
    updateCellVar();
    logEvent(`전투 시작 — ${wave.name}`, 'sys');
    logEvent(`아군 ${units.filter(u => u.side === 'player').length} · 적 ${units.filter(u => u.side === 'enemy').length}`, 'sys');
    renderHUD();
    renderNextWave();
    sfx('start');
    combat.raf = requestAnimationFrame(combatLoop);
  }

  function combatLoop(now) {
    if (!combat || combat.over) return;
    let dt = (now - combat.last) / 1000;
    combat.last = now;
    dt = clamp(dt, 0, 0.06) * state.speed;
    stepCombat(dt);
    if (combat && !combat.over) combat.raf = requestAnimationFrame(combatLoop);
  }

  function stepCombat(dt) {
    if (!combat || combat.over) return;
    combat.time += dt;
    const units = combat.units;

    for (const u of units) {
      if (!u.alive) continue;
      if (u.timed.length) {
        u.timed = u.timed.filter(t => { t.remaining -= dt; return t.remaining > 0; });
      }
      if (u.castLock > 0) u.castLock -= dt;
      if (u.stun > 0) { u.stun = Math.max(0, u.stun - dt); continue; }
      if (u.castLock > 0) continue;

      if (u.mana >= u.manaMax) {
        castAbility(u, u.target && u.target.alive ? u.target : nearestEnemy(u));
        continue;
      }

      let target = u.target;
      if (!target || !target.alive || target.side === u.side) {
        target = nearestEnemy(u);
        u.target = target;
      }
      if (!target) continue;

      if (cheb(u.pos, target.pos) <= u.range) {
        u.cd -= dt;
        if (u.cd <= 0) {
          doAttack(u, target);
          if (!u.alive) continue;
          if (u.mana >= u.manaMax) castAbility(u, target);
        }
      } else {
        u.moveCd -= dt;
        if (u.moveCd <= 0) {
          moveToward(u, target);
          u.moveCd = 0.36;
        }
      }
    }

    for (const u of units) if (u.el && (u.alive || u.el.isConnected)) updateCombatToken(u);

    if (!units.some(u => u.alive && u.side === 'enemy')) { endCombat(true); return; }
    if (!units.some(u => u.alive && u.side === 'player')) { endCombat(false); return; }
    if (combat.time >= 45) { endCombat(false, 'timeout'); }
  }

  function nearestEnemy(u) {
    let best = null, bd = Infinity;
    for (const e of combat.units) {
      if (!e.alive || e.side === u.side) continue;
      const d = dist(u.pos, e.pos);
      if (d < bd || (d === bd && best && e.hp < best.hp)) { bd = d; best = e; }
    }
    return best;
  }

  function doAttack(u, target) {
    const spd = Math.max(0.25, u.atkSpd + u.buffSpd);
    u.cd = 1 / spd;
    const timed = u.timed.reduce((a, t) => a + (t.atkPct || 0), 0);
    const dmg = u.atk * (1 + u.buffAtk + timed);
    dealDamage(u, target, dmg, false);
    u.mana = Math.min(u.manaMax, u.mana + 10);
    if (u.lifesteal > 0) healUnit(u, dmg * u.lifesteal, null);
  }

  function dealDamage(src, target, raw, isAbility) {
    if (!target || !target.alive) return 0;
    let dmg = raw;
    if (isAbility) dmg *= 1 + (src ? src.abilityMul : 0);
    dmg *= 100 / (100 + Math.max(0, target.armor));
    dmg *= 1 - Math.min(0.6, target.buffDr || 0);

    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, dmg);
      target.shield -= absorbed;
      dmg -= absorbed;
      if (absorbed > 0.5) floatText(target.pos, Math.round(absorbed), 'shield');
    }
    dmg = Math.round(dmg);
    if (dmg <= 0) return 0;
    target.hp -= dmg;
    if (src) src.totalDamage += dmg;
    floatText(target.pos, '-' + dmg, isAbility ? 'ability' : 'dmg');
    target.mana = Math.min(target.manaMax, target.mana + (isAbility ? 4 : 6));
    if (target.el) {
      target.el.classList.add('hit');
      setTimeout(() => { if (target.el) target.el.classList.remove('hit'); }, 110);
    }
    if (target.hp <= 0) killUnit(target, src);
    return dmg;
  }

  function healUnit(u, amount, src) {
    if (!u || !u.alive) return;
    const bonus = 1 + (src ? src.healPct : 0);
    const heal = Math.max(1, Math.round(amount * bonus));
    u.hp = Math.min(u.maxHp, u.hp + heal);
    floatText(u.pos, '+' + heal, 'heal');
  }

  function addShield(u, amount) {
    if (!u || !u.alive) return;
    const add = Math.max(1, Math.round(amount));
    u.shield += add;
    floatText(u.pos, '+' + add, 'shield');
  }

  function applyStun(target, duration) {
    if (!target || !target.alive) return;
    target.stun = Math.max(target.stun, duration);
    floatText(target.pos, 'STUN', 'shield');
  }

  function lowestAlly(side) {
    let best = null, ratio = Infinity;
    for (const u of combat.units) {
      if (!u.alive || u.side !== side) continue;
      const r = u.hp / u.maxHp;
      if (r < ratio) { ratio = r; best = u; }
    }
    return best;
  }

  function enemiesInRadius(center, radius, side) {
    return combat.units.filter(u => u.alive && u.side !== side && cheb(u.pos, center) <= radius);
  }

  function castAbility(u, target) {
    if (!u.alive || !u.ability) return;
    const ab = u.ability;
    u.mana = 0;
    u.castLock = 0.32;
    if (u.el) {
      u.el.classList.add('casting');
      setTimeout(() => { if (u.el) u.el.classList.remove('casting'); }, 460);
    }
    const enemies = combat.units.filter(e => e.alive && e.side !== u.side);
    const allies = combat.units.filter(a => a.alive && a.side === u.side);
    let tgt = target && target.alive ? target : (enemies.length ? nearestEnemy(u) : null);
    const power = u.abilityPower;
    let focus = tgt ? tgt.pos : u.pos;

    switch (ab.type) {
      case 'strike': {
        if (tgt) {
          dealDamage(u, tgt, power, true);
          if (ab.stun) applyStun(tgt, ab.stun);
        }
        break;
      }
      case 'aoe': {
        if (tgt) {
          focus = tgt.pos;
          for (const e of enemiesInRadius(tgt.pos, ab.radius || 1, u.side)) {
            dealDamage(u, e, power, true);
            if (ab.stun) applyStun(e, ab.stun);
          }
        }
        break;
      }
      case 'aoeSelf': {
        focus = u.pos;
        for (const e of enemiesInRadius(u.pos, ab.radius || 1, u.side)) {
          dealDamage(u, e, power, true);
          if (ab.stun) applyStun(e, ab.stun);
        }
        break;
      }
      case 'chain': {
        const list = [...enemies].sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos)).slice(0, ab.targets || 3);
        for (const e of list) dealDamage(u, e, power, true);
        if (list[0]) focus = list[0].pos;
        break;
      }
      case 'execute': {
        if (tgt) {
          const low = tgt.hp / tgt.maxHp <= 0.5;
          dealDamage(u, tgt, power * (low ? (ab.bonus || 1.5) : 1), true);
        }
        break;
      }
      case 'heal': {
        const ally = lowestAlly(u.side) || u;
        healUnit(ally, power, u);
        focus = ally.pos;
        break;
      }
      case 'healAll': {
        for (const a of allies) {
          healUnit(a, power, u);
          if (ab.shield) addShield(a, ab.shield * (u.star ? STAR_MULT[Math.max(1, u.star)] : 1));
        }
        focus = u.pos;
        break;
      }
      case 'shieldAll': {
        for (const a of allies) addShield(a, power);
        focus = u.pos;
        break;
      }
      case 'shieldSelf': {
        addShield(u, power);
        focus = u.pos;
        break;
      }
      case 'buffAtk': {
        for (const a of allies) a.timed.push({ atkPct: ab.power, remaining: ab.duration || 6 });
        focus = u.pos;
        break;
      }
      default: break;
    }

    vfxRing(focus, u.side);
    logEvent(`<b>${u.name}</b> · ${ab.name}`, 'cast');
    sfx('cast');
  }

  function moveToward(u, target) {
    const occupied = new Set();
    for (const o of combat.units) {
      if (!o.alive || o === u) continue;
      occupied.add(cellKey(o.pos));
    }

    const start = cellKey(target.pos);
    const distances = new Map([[start, 0]]);
    const queue = [target.pos];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const d = distances.get(cellKey(cur));
      const nbs = [
        { c: cur.c + 1, r: cur.r },
        { c: cur.c - 1, r: cur.r },
        { c: cur.c, r: cur.r + 1 },
        { c: cur.c, r: cur.r - 1 }
      ];
      for (const n of nbs) {
        if (n.c < 0 || n.c >= COLS || n.r < 0 || n.r >= ROWS) continue;
        const k = cellKey(n);
        if (distances.has(k) || occupied.has(k)) continue;
        distances.set(k, d + 1);
        queue.push(n);
      }
    }

    let best = null, bestD = Infinity;
    const steps = [
      { c: u.pos.c + 1, r: u.pos.r },
      { c: u.pos.c - 1, r: u.pos.r },
      { c: u.pos.c, r: u.pos.r + 1 },
      { c: u.pos.c, r: u.pos.r - 1 }
    ];
    for (const n of steps) {
      if (n.c < 0 || n.c >= COLS || n.r < 0 || n.r >= ROWS) continue;
      if (occupied.has(cellKey(n))) continue;
      const d = distances.get(cellKey(n));
      if (d !== undefined && d < bestD) { bestD = d; best = n; }
    }
    if (best) {
      u.pos = { c: best.c, r: best.r };
      return;
    }
    // fallback: direct step, ignoring pathing (rare block)
    const dc = Math.sign(target.pos.c - u.pos.c);
    const dr = Math.sign(target.pos.r - u.pos.r);
    const options = [
      { c: u.pos.c + dc, r: u.pos.r },
      { c: u.pos.c, r: u.pos.r + dr }
    ];
    for (const n of options) {
      if (n.c < 0 || n.c >= COLS || n.r < 0 || n.r >= ROWS) continue;
      if (occupied.has(cellKey(n))) continue;
      u.pos = { c: n.c, r: n.r };
      return;
    }
  }

  function killUnit(u, src) {
    if (!u.alive) return;
    u.alive = false;
    u.stun = 0;
    u.target = null;
    const el = u.el;
    if (el) {
      el.classList.add('dead');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
    }
    if (u.boss) logEvent(`<b>${u.name}</b> 처치!`, 'win');
  }

  /* ---------------- vfx ---------------- */
  function floatText(pos, text, cls) {
    if (!pos) return;
    const f = document.createElement('div');
    f.className = 'fx-float ' + (cls || '');
    f.textContent = text;
    const jitter = (Math.random() - 0.5) * 8;
    f.style.left = ((pos.c + 0.5) / COLS * 100 + jitter) + '%';
    f.style.top = ((pos.r + 0.35) / ROWS * 100) + '%';
    els.fxLayer.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  function vfxRing(pos, side) {
    if (!pos) return;
    const ring = document.createElement('div');
    ring.className = 'fx-ring' + (side === 'enemy' ? ' enemy' : '');
    ring.style.left = ((pos.c + 0.5) / COLS * 100) + '%';
    ring.style.top = ((pos.r + 0.5) / ROWS * 100) + '%';
    els.fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 650);
  }

  /* ---------------- round flow ---------------- */
  function endCombat(win, reason = '') {
    if (!combat || combat.over) return;
    combat.over = true;
    cancelAnimationFrame(combat.raf);
    if (combat.raf) cancelAnimationFrame(combat.raf);

    state.phase = 'result';
    state.lastWin = win;
    state.sel = null;
    hideGhost();
    if (win) state.wins++; else state.losses++;

    const prevStreak = state.streak;
    if (win) state.streak = prevStreak > 0 ? prevStreak + 1 : 1;
    else state.streak = prevStreak < 0 ? prevStreak - 1 : -1;

    const interest = Math.min(5, Math.floor(state.gold / 10));
    const absStreak = Math.abs(state.streak);
    const streakBonus = absStreak >= 5 ? 3 : absStreak >= 3 ? 2 : absStreak >= 2 ? 1 : 0;
    const base = 5;
    const winBonus = win ? 1 : 0;
    const income = base + interest + streakBonus + winBonus;
    state.gold += income;
    state.totalGold += income;

    addXp(2);

    let damage = 0;
    let survivors = 0;
    if (!win) {
      survivors = combat.units.filter(u => u.alive && u.side === 'enemy').length;
      damage = 3 + Math.floor(state.round / 2) + survivors * 2;
      if (reason === 'timeout') damage = Math.max(2, Math.ceil(damage * 0.7));
      state.hp = Math.max(0, state.hp - damage);
    }

    logEvent(win ? `라운드 승리 · +${income}G` : `라운드 패배 · 생명력 -${damage}`, win ? 'win' : 'loss');
    updateTimerUI();
    renderHUD();
    renderNextWave();
    updateSelBar();
    renderDetail();
    sfx(win ? 'win' : 'loss');

    const info = {
      win, income, interest, streakBonus, winBonus, damage, survivors,
      timeout: reason === 'timeout',
      stage: WAVES[state.round].stage,
      gold: state.gold
    };
    const battleRef = combat;
    setTimeout(() => {
      if (combat === battleRef && state.phase === 'result' && state.screen === 'game') showRoundBanner(info);
    }, 850);
  }

  function showRoundBanner(info) {
    bannerLeft = 4;
    els.banner.classList.remove('hidden');
    els.rbInner.className = 'rb-inner ' + (info.win ? 'win' : 'loss');
    els.rbKicker.textContent = `ROUND ${info.stage}`;
    els.rbTitle.textContent = info.win ? 'VICTORY' : 'DEFEAT';
    const lines = [];
    lines.push(`<div><span>기본 수입</span><b class="pos">+5G</b></div>`);
    if (info.winBonus) lines.push(`<div><span>승리 보너스</span><b class="pos">+${info.winBonus}G</b></div>`);
    lines.push(`<div><span>이자</span><b class="pos">+${info.interest}G</b></div>`);
    if (info.streakBonus) lines.push(`<div><span>연승/연패 보너스</span><b class="pos">+${info.streakBonus}G</b></div>`);
    lines.push(`<div><span>경험치</span><b class="pos">+2 XP</b></div>`);
    if (info.damage) lines.push(`<div><span>생명력</span><b class="neg">-${info.damage}</b></div>`);
    if (!info.win) lines.push(`<div><span>남은 적</span><b>${info.survivors}명${info.timeout ? ' · 시간 초과' : ''}</b></div>`);
    lines.push(`<div><span>보유 골드</span><b>${info.gold}G</b></div>`);
    els.rbLines.innerHTML = lines.join('');
    els.rbCount.textContent = bannerLeft;
    els.rbContinue.innerHTML = `계속 <span id="rb-count">${bannerLeft}</span>`;
    els.rbCount = $('#rb-count');
    updateTimerUI();
    clearInterval(bannerId);
    bannerId = setInterval(() => {
      bannerLeft--;
      if (els.rbCount) els.rbCount.textContent = Math.max(0, bannerLeft);
      if (bannerLeft <= 0) {
        clearInterval(bannerId);
        advanceRound();
      }
    }, 1000);
  }

  function clearBanner() {
    clearInterval(bannerId);
    bannerId = null;
    els.banner.classList.add('hidden');
  }

  function advanceRound() {
    clearBanner();
    if (state.hp <= 0) { showEnd(false); return; }
    const isFinal = state.round >= WAVES.length - 1;
    if (isFinal) { showEnd(state.lastWin); return; }

    state.round++;
    state.phase = 'prep';
    state.sel = null;
    state.paused = false;
    state.timer = PREP_TIME;
    combat = null;
    els.unitLayer.innerHTML = '';
    els.fxLayer.innerHTML = '';
    if (!state.locked) rollShop();
    renderAll();
    startTimer();
  }

  function showEnd(win) {
    state.screen = 'end';
    state.phase = 'end';
    clearTimer();
    clearBanner();
    hideGhost();
    els.endScreen.classList.remove('hidden');
    els.endCard.className = 'end-card ' + (win ? 'win' : 'loss');
    const wave = WAVES[state.round];
    els.endKicker.textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    els.endTitle.textContent = win ? '작전 성공' : '작전 실패';
    els.endSub.textContent = win
      ? '뉴에리두의 홀로우를 모두 정화했습니다. 최고의 작전이었습니다.'
      : `웨이브 ${wave ? wave.stage : '—'}에서 작전이 중단되었습니다.`;
    els.endStats.innerHTML =
      `<div><small>도달 웨이브</small><b>${wave ? wave.stage : '—'}</b></div>` +
      `<div><small>최종 레벨</small><b>${state.level}</b></div>` +
      `<div><small>남은 생명력</small><b>${state.hp}</b></div>` +
      `<div><small>전적</small><b>${state.wins}승 ${state.losses}패</b></div>` +
      `<div><small>누적 수입</small><b>${state.totalGold}G</b></div>` +
      `<div><small>보유 요원</small><b>${boardUnits().length + benchCount()}</b></div>`;
    els.flash.classList.remove('flash');
    void els.flash.offsetWidth;
    els.flash.classList.add('flash');
    sfx(win ? 'win' : 'loss');
  }

  function initGame() {
    Object.assign(state, makeState());
    state.screen = 'game';
    state.phase = 'prep';
    combat = null;
    clearTimer();
    clearBanner();
    els.title.classList.add('hidden');
    els.game.classList.remove('hidden');
    els.endScreen.classList.add('hidden');
    els.banner.classList.add('hidden');
    els.help.classList.add('hidden');
    els.unitLayer.innerHTML = '';
    els.fxLayer.innerHTML = '';
    state.log = [];
    rollShop(true);
    renderAll();
    renderLog();
    logEvent('작전 개시 — 12개 홀로우 웨이브를 돌파하세요.', 'sys');
    startTimer();
    sfx('start');
  }

  function openHelp() {
    state.paused = true;
    els.help.classList.remove('hidden');
  }
  function closeHelp() {
    state.paused = false;
    els.help.classList.add('hidden');
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    $('#btn-start').addEventListener('click', initGame);
    $('#btn-title-help').addEventListener('click', openHelp);
    $('#btn-help').addEventListener('click', openHelp);
    $('#btn-help-close').addEventListener('click', closeHelp);
    $('#btn-help-ok').addEventListener('click', closeHelp);
    els.help.addEventListener('click', (e) => { if (e.target === els.help) closeHelp(); });

    $('#btn-sound').addEventListener('click', (e) => {
      state.muted = !state.muted;
      e.currentTarget.classList.toggle('muted', state.muted);
      e.currentTarget.textContent = state.muted ? '✕' : '♪';
      if (!state.muted) sfx('click');
    });

    els.battleBtn.addEventListener('click', startBattle);
    els.rerollBtn.addEventListener('click', rerollShop);
    els.xpBtn.addEventListener('click', buyXp);
    els.lockBtn.addEventListener('click', toggleLock);
    els.rbContinue.addEventListener('click', advanceRound);

    els.shop.addEventListener('click', (e) => {
      const card = e.target.closest('[data-shop]');
      if (card) buyFromShop(Number(card.dataset.shop));
    });

    els.bench.addEventListener('click', (e) => {
      if (e.target.closest('.bench-unit')) return;
      const slot = e.target.closest('.bench-slot');
      if (slot) onBenchClick(Number(slot.dataset.bench));
    });

    els.detail.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'sell') sellSelected();
      else if (btn.dataset.action === 'tobench') benchSelected();
    });

    $('#sb-sell').addEventListener('click', sellSelected);
    $('#sb-close').addEventListener('click', () => { state.sel = null; refreshSelectionUI(); });
    $('#btn-restart').addEventListener('click', initGame);
    $('#btn-clear-log').addEventListener('click', () => { state.log = []; renderLog(); });

    els.speedGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.spd');
      if (!btn) return;
      state.speed = Number(btn.dataset.speed);
      renderHUD();
      sfx('click');
    });

    window.addEventListener('resize', updateCellVar);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!els.help.classList.contains('hidden')) closeHelp();
        else if (state.sel) { state.sel = null; refreshSelectionUI(); }
      }
    });
  }

  /* ---------------- debug ---------------- */
  function addUnitDebug(id, star = 1, where = 'bench') {
    const u = makeUnit(id, star);
    if (where === 'board') {
      const idx = state.board.findIndex((x, i) => !x && Math.floor(i / COLS) >= PLAYER_START_ROW);
      if (idx < 0) return null;
      state.board[idx] = u;
    } else {
      const idx = state.bench.indexOf(null);
      if (idx < 0) return null;
      state.bench[idx] = u;
    }
    checkCombines();
    renderAll();
    return u;
  }

  window.__ZC = {
    get state() { return state; },
    get combat() { return combat; },
    initGame,
    startBattle,
    advanceRound,
    stepCombat,
    buyFromShop,
    rollShop,
    addXp,
    placeUnit,
    checkCombines,
    addUnit: addUnitDebug,
    endCombat,
    renderAll
  };

  /* ---------------- boot ---------------- */
  buildBoardCells();
  renderTitleAgents();
  bindEvents();
  updateCellVar();
})();
