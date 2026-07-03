// Composition root: boots the game via the public NeonVoid API, owns the state
// machine and the frame loop, and wires input/UI/events together.
import { S } from './state.js';
import { BALANCE, xpToNext } from './config.js';
import { createRng, randomSeed } from './engine/rng.js';
import { bus } from './engine/events.js';
import { createSave, localStorageAdapter } from './engine/save.js';
import { initAudio, sfx, music, setSfxEnabled, sfxEnabled } from './engine/audio.js';
import { bindInput } from './engine/input.js';
import { resetFX, updateParts, updateTexts } from './engine/particles.js';
import { pickTier, makeElite } from './content/enemies.js';
import { initEnemySprites, spawnPos, makeEnemy, spawnBoss, spawnTitan, spawnReaper, spawnLogic, updateEnemies, damageEnemy } from './game/enemies.js';
import { initGemSprites, updateGems } from './game/gems.js';
import { initGoldSprites, updateCoins } from './game/gold.js';
import { initPickups, resetPickups, updatePickups, dropPickup } from './game/pickups.js';
import { initEconomy, grantGold } from './game/economy.js';
import { initShop, closeShop } from './game/shop.js';
import { metaBonuses } from './content/shop.js';
import { dropChest, updateChests, updateChestReveal, dismissChest, resetChests } from './game/chests.js';
import { updateWeapons } from './game/weapons.js';
import { updatePlayer, damagePlayer } from './game/player.js';
import { gainXP, pickCard } from './game/levelup.js';
import { ui, updateHUD, showBestLine, updateWalletUI, showGameOver } from './game/hud.js';
import { drawBackground, drawWorld, drawScreenFX } from './game/render.js';

function resize() {
  S.DPR = Math.min(2, window.devicePixelRatio || 1);
  S.W = window.innerWidth; S.H = window.innerHeight;
  S.cv.width = Math.round(S.W * S.DPR); S.cv.height = Math.round(S.H * S.DPR);
}

function reset() {
  S.enemies.length = 0; S.bolts.length = 0; S.gems.length = 0; S.coins.length = 0; S.novas.length = 0;
  resetChests();
  resetPickups();
  resetFX();
  const P = BALANCE.player, WP = BALANCE.weapons;
  // permanent shop ranks apply once here, on top of the base stat block
  const mb = metaBonuses(S.save.data.shop);
  const lv0 = 1 + mb.startLevel;
  Object.assign(S.stats, { dmg: 1 + mb.dmg, aspd: 1 + mb.aspd, spd: P.spd + mb.spd, maxhp: P.maxhp + mb.maxhp,
    regen: P.regen + mb.regen, magnet: P.magnet + mb.magnet, crit: P.crit, xpgain: P.xpgain, comboWin: P.comboWin,
    goldgain: 1 + mb.goldgain });
  Object.assign(S.player, { x: 0, y: 0, r: P.r, hp: S.stats.maxhp, dir: 0, tilt: 0, inv: 0, mvx: 0, mvy: 0, dead: false, trailT: 0 });
  Object.assign(S.weapons, {
    blade: { lv: 0, ang: 0, trailT: 0, evo: false },
    bolt: { lv: WP.bolt.startLv, t: WP.bolt.startT, evo: false },
    nova: { lv: 0, t: WP.nova.startT, echo: 0, evo: false },
  });
  Object.assign(S.game, { time: 0, kills: 0, gold: 0, level: lv0, xp: 0, next: xpToNext(lv0),
    spawnT: BALANCE.spawn.firstDelay, surgeT: BALANCE.spawn.surgeFirst,
    bossAt: BALANCE.boss.firstAt, bossN: 0, boss: null, bossAlive: 0,
    titanAt: BALANCE.titan.firstAt, titanN: 0, titansKilled: 0,
    eliteAt: BALANCE.elite.firstAt, elitesKilled: 0, bombFlash: 0,
    reaperAt: BALANCE.reaper.at, reaper: null, reaperSpawned: false, reaperWarned: false, reaperSlain: false,
    combo: 0, comboT: 0, comboPulse: 0, threat: 1, pendingLv: 0, lvModalAt: -1e9, overT: 0, overShown: false, flash: 0, dieT: 0 });
  S.cam.x = 0; S.cam.y = 0; S.shake = 0; S.ts = 1; S.tsT = 1; S.freeze = 0;
  ui.timer.classList.remove('warn');
  updateHUD(true);
}

function startRun(seed) {
  const s = seed != null ? seed >>> 0 : (S.options.seed != null ? S.options.seed >>> 0 : randomSeed());
  S.rng = createRng(s);
  reset();
  S.game.seed = s;
  S.state = 'play';
  ui.start.classList.add('hidden'); ui.over.classList.add('hidden'); ui.levelup.classList.add('hidden');
  music.setMood('run');
  sfx.tick();
}

/* ---------- pause ---------- */
// Only 'play' pauses; the modal states (level/chest) already gate on input.
function pauseGame() {
  if (S.state !== 'play') return;
  S.state = 'pause';
  music.setMood('menu');
  ui.pause.classList.remove('hidden');
}

function resumeGame() {
  if (S.state !== 'pause') return;
  S.state = 'play';
  ui.pause.classList.add('hidden');
}

/* ---------- main update ---------- */
function update(dt, rdt) {
  if (S.state === 'pause') return;
  if (S.state === 'start' || S.state === 'shop') {
    S.cam.x += 18 * rdt; S.cam.y += 6 * rdt; // idle drift behind the menu
    updateParts(rdt);
    return;
  }
  if (S.state === 'over') {
    if (!S.game.overShown) {
      S.game.overT -= rdt;
      if (S.game.overT <= 0) { showGameOver(); music.setMood('menu'); }
    }
    updateParts(dt + rdt * 0.05);
    updateTexts(rdt);
    return;
  }
  S.game.time += dt;
  // music intensifies while a super-boss is loose; the reaper gets its own darker motif
  music.setMood(S.game.reaper && !S.game.reaper.dead ? 'reaper' : (S.game.bossAlive > 0 ? 'boss' : 'run'));
  updatePlayer(dt);
  spawnLogic(dt);
  updateEnemies(dt);
  updateWeapons(dt);
  updateGems(dt);
  updateCoins(dt);
  updatePickups(dt);
  updateChests(dt);
  if (S.state === 'chest') updateChestReveal(rdt);
  updateParts(dt);
  updateTexts(rdt);
  // combo decay runs on real time so slow-mo does not cheese it
  if (S.game.combo > 0) {
    S.game.comboT -= rdt;
    if (S.game.comboT <= 0) { S.game.combo = 0; }
  }
  S.game.comboPulse = Math.max(0, S.game.comboPulse - rdt * 4);
  if (S.game.flash > 0) S.game.flash -= rdt;
  if (S.game.bombFlash > 0) S.game.bombFlash -= rdt * 1.6;
  // camera eases toward the player
  const k = 1 - Math.pow(0.0018, rdt);
  S.cam.x += (S.player.x - S.cam.x) * k;
  S.cam.y += (S.player.y - S.cam.y) * k;
}

/* ---------- frame loop ---------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const ms = now - last; last = now;
  const rdt = Math.min(0.05, ms / 1000);
  S.elapsed += rdt;
  // adaptive quality keeps mid-range phones smooth
  S.frameAvg = S.frameAvg * 0.95 + ms * 0.05;
  if (S.frameAvg > 27) S.lowFX = true; else if (S.frameAvg < 19) S.lowFX = false;
  S.ts += (S.tsT - S.ts) * Math.min(1, rdt * 9);
  let dt = rdt * S.ts;
  if (S.freeze > 0) { S.freeze -= rdt; dt = 0; }
  update(dt, rdt);
  S.shake *= Math.exp(-6.5 * rdt);
  if (S.shake < 0.05) S.shake = 0;
  S.cam.ox = (Math.random() * 2 - 1) * S.shake;
  S.cam.oy = (Math.random() * 2 - 1) * S.shake;
  // draw
  const ctx = S.ctx;
  ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0);
  drawBackground();
  ctx.save();
  ctx.translate(S.W / 2 - S.cam.x + S.cam.ox, S.H / 2 - S.cam.y + S.cam.oy);
  drawWorld();
  ctx.restore();
  drawScreenFX();
  if (S.state === 'play' || S.state === 'level' || S.state === 'over') updateHUD(false);
}

/* ---------- debug handle (?debug=1 only) ---------- */
function makeDebugHandle() {
  return {
    startRun(seed) { startRun(seed); },
    grantXP(n) { gainXP(n == null ? 10 : n); },
    pickCard(i) { pickCard(i); },
    forceBoss() { if (S.state === 'play') spawnBoss(); },
    forceTitan() { if (S.state === 'play') { S.game.titanN++; spawnTitan(); } },
    forceReaper() { if (S.state === 'play' && !S.game.reaper) { S.game.reaperSpawned = true; spawnReaper(); } },
    forceChest() { if (S.state === 'play') dropChest(S.player.x + 40, S.player.y); },
    forcePickup(id) { if (S.state === 'play') dropPickup(S.player.x + 40, S.player.y, id || 'heal'); },
    forceElite() {
      if (S.state !== 'play') return;
      const p = spawnPos(BALANCE.spawn.margin);
      S.enemies.push(makeElite(makeEnemy(pickTier(S.game.time, S.rng.next()), p.x, p.y)));
    },
    setWeapon(id, lv, evo) {
      const w = S.weapons[id];
      if (w) { w.lv = Math.max(0, Math.min(BALANCE.weapons.maxLv, lv)); w.evo = !!evo; }
    },
    killBoss() { const b = S.game.boss; if (b && !b.dead) { b.spawnT = 0; damageEnemy(b, b.hp * 2 + 1e6); } },
    killBig() { for (const e of S.enemies.slice()) if (e.isBoss && !e.dead) { e.spawnT = 0; damageEnemy(e, e.hp * 2 + 1e6); } },
    killPlayer() { if (S.state === 'play') { S.player.inv = 0; damagePlayer(1e9); } },
    grantGold(n) { grantGold(n == null ? 100 : n); },
    pause() { pauseGame(); },
    resume() { resumeGame(); },
    spawn(n) {
      n = n == null ? 50 : n;
      for (let i = 0; i < n && S.enemies.length < BALANCE.spawn.cap; i++) {
        const p = spawnPos(BALANCE.spawn.margin);
        S.enemies.push(makeEnemy(pickTier(S.game.time, S.rng.next()), p.x, p.y));
      }
    },
    frameAvg() { return S.frameAvg; },
    seed() { return S.game.seed; },
    replaySeed() { startRun(S.game.seed); },
    state() {
      return { state: S.state, time: S.game.time, kills: S.game.kills, level: S.game.level,
        hp: S.player.hp, maxhp: S.stats.maxhp, enemies: S.enemies.length, seed: S.game.seed, lowFX: S.lowFX,
        gold: Math.floor(S.game.gold), wallet: S.save.data.gold, shop: Object.assign({}, S.save.data.shop),
        coins: S.coins.length, chests: S.chests.length, pickups: S.pickups.length,
        elites: S.enemies.filter(function (e) { return e.elite && !e.dead; }).length,
        elitesKilled: S.game.elitesKilled, bossAlive: S.game.bossAlive,
        titanN: S.game.titanN, reaper: !!S.game.reaper, reaperSlain: S.game.reaperSlain,
        music: music.enabled(), sfxOn: sfxEnabled(),
        weapons: { bolt: { lv: S.weapons.bolt.lv, evo: !!S.weapons.bolt.evo },
          blade: { lv: S.weapons.blade.lv, evo: !!S.weapons.blade.evo },
          nova: { lv: S.weapons.nova.lv, evo: !!S.weapons.nova.evo } },
        best: { ...S.save.data.best } };
    },
  };
}

/* ---------- public API seam ---------- */
// options: { seed, saveAdapter, onRunEnd, debug } — the same surface tests and
// the future Habit Quest embed consume. Hardened in Session 7.
function mount(root, options) {
  S.options = options || {};
  S.cv = root.querySelector('#game') || document.getElementById('game');
  S.ctx = S.cv.getContext('2d');
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });
  resize();

  S.save = createSave(S.options.saveAdapter || localStorageAdapter());
  S.rng = createRng(S.options.seed != null ? S.options.seed >>> 0 : randomSeed());
  initEnemySprites();
  initGemSprites();
  initGoldSprites();
  initEconomy(updateWalletUI);
  initShop();
  initPickups();

  bindInput(S.cv, {
    onKeyAction(code) {
      if (S.state === 'pause') {
        if (code === 'Escape' || code === 'Enter' || code === 'NumpadEnter' || code === 'Space') resumeGame();
        return;
      }
      if (S.state === 'play') { if (code === 'Escape') pauseGame(); return; }
      if (S.state === 'shop') { if (code === 'Escape') closeShop(); return; }
      if (S.state === 'start') { startRun(); return; }
      if (S.state === 'over' && S.game.overShown) { startRun(); return; }
      if (S.state === 'level') {
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[code];
        if (n !== undefined) pickCard(n);
        return;
      }
      if (S.state === 'chest') dismissChest();
    },
    onPrimaryTouch() {
      if (S.state === 'start') { startRun(); return true; }
      if (S.state === 'pause') return true; // no joystick while paused; RESUME is the way back
      return false;
    },
  });
  ui.start.addEventListener('pointerdown', function () { initAudio(); if (S.state === 'start') startRun(); });
  ui.restart.addEventListener('click', function () { initAudio(); if (S.state === 'over' && S.game.overShown) startRun(); });
  ui.chest.addEventListener('pointerdown', function () { dismissChest(); });

  // pause: pill during play, RESUME on the overlay, auto-pause when focus leaves the game
  ui.pauseBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); initAudio(); pauseGame(); });
  ui.resume.addEventListener('click', function () { resumeGame(); });
  window.addEventListener('blur', function () { pauseGame(); });

  // music/SFX toggles, persisted in the save's settings; labels reflect state
  function syncAudioBtns() {
    const st = S.save.data.settings;
    ui.music.textContent = st.music ? '♪ MUSIC' : '♪ MUTED';
    ui.music.classList.toggle('off', !st.music);
    ui.sfxBtn.textContent = st.sfx ? '✦ SFX' : '✦ MUTED';
    ui.sfxBtn.classList.toggle('off', !st.sfx);
  }
  music.setEnabled(S.save.data.settings.music);
  setSfxEnabled(S.save.data.settings.sfx);
  syncAudioBtns();
  ui.music.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    initAudio();
    const on = !S.save.data.settings.music;
    S.save.data.settings.music = on;
    music.setEnabled(on);
    S.save.persist();
    syncAudioBtns();
  });
  ui.sfxBtn.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    initAudio();
    const on = !S.save.data.settings.sfx;
    S.save.data.settings.sfx = on;
    setSfxEnabled(on);
    S.save.persist();
    syncAudioBtns();
  });

  if (typeof S.options.onRunEnd === 'function') {
    bus.on('run-ended', function (payload) { S.options.onRunEnd(payload); });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { pauseGame(); return; }
    last = performance.now(); initAudio();
  });

  reset();
  S.state = 'start';
  showBestLine();
  updateWalletUI();
  requestAnimationFrame(frame);

  // grantGold is part of the public seam: Habit Quest rewards flow in through it
  const handle = { bus: bus, grantGold: grantGold };
  if (S.options.debug) {
    handle.debug = makeDebugHandle();
    window.NV_DEBUG = handle.debug;
  }
  return handle;
}

export const NeonVoid = { mount: mount };
