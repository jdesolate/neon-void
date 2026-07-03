// Enemy spawning, AI, separation, boss behavior, and kill/damage resolution.
import { S, addShake } from '../state.js';
import { BALANCE, enemyHpMul, enemySpdMul, enemyDmgMul, spawnInterval, bossHp, bossDmg,
  titanHp, titanDmg, reaperHp, reaperDmg } from '../config.js';
import { TAU, rnd, dist2 } from '../utils.js';
import { TIERS, BOSS_STYLE, TITAN_STYLE, REAPER_STYLE, pickTier, goldFor } from '../content/enemies.js';
import { bodySprite, flatSprite } from '../engine/sprites.js';
import { burst, puff, addText, announce, addPart, confetti } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { damagePlayer } from './player.js';
import { dropGem } from './gems.js';
import { dropGold, dropGoldBurst } from './gold.js';
import { dropChest } from './chests.js';
import { ui } from './hud.js';

export function initEnemySprites() {
  TIERS.forEach(t => { t.spr = bodySprite(t.color, t.core, t.r, t.sides, t.spike); t.flash = flatSprite(t.spr); });
  [BOSS_STYLE, TITAN_STYLE, REAPER_STYLE].forEach(function (st) {
    st.spr = bodySprite(st.color, st.core, st.r, st.sides, true);
    st.flash = flatSprite(st.spr);
  });
}

export function spawnPos(margin) {
  const a = S.rng.range(0, TAU), d = Math.hypot(S.W, S.H) / 2 + (margin || BALANCE.spawn.margin);
  return { x: S.player.x + Math.cos(a) * d, y: S.player.y + Math.sin(a) * d };
}

export function makeEnemy(tier, x, y) {
  const T = TIERS[tier], m = S.game.time / 60, sc = BALANCE.enemyScale;
  const hpMul = enemyHpMul(m), spdMul = enemySpdMul(m), dmgMul = enemyDmgMul(m);
  return { x: x, y: y, r: T.r, tier: tier, color: T.color, spr: T.spr, flash: T.flash,
    hp: T.hp * hpMul, maxhp: T.hp * hpMul, spd: T.spd * spdMul * S.rng.range(sc.spdJitterMin, sc.spdJitterMax),
    dmg: T.dmg * dmgMul, xp: T.xp,
    spawnT: 0.35, hitT: 0, dieT: 0, bladeT: 0, lastNova: 0, sx: 1, sy: 1,
    wob: S.rng.range(0, TAU), rot: S.rng.range(-0.6, 0.6), isBoss: false };
}

export function spawnLogic(dt) {
  const game = S.game, enemies = S.enemies, SP = BALANCE.spawn;
  game.spawnT -= dt;
  const m = game.time / 60;
  const interval = spawnInterval(m);
  if (game.spawnT <= 0 && enemies.length < SP.cap) {
    game.spawnT = interval;
    const p = spawnPos(SP.margin);
    enemies.push(makeEnemy(pickTier(game.time, S.rng.next()), p.x, p.y));
  }
  // periodic surge: a ring closes in, threat level ticks up
  game.surgeT -= dt;
  if (game.surgeT <= 0) {
    game.surgeT = SP.surgePeriod;
    const n = Math.min(SP.surgeMax, SP.surgeBase + game.threat * SP.surgePerThreat);
    if (n > 0 && enemies.length < SP.cap) { announce('SURGE INCOMING', '#ff9d3b', 1.5); sfx.tick(); }
    for (let i = 0; i < n; i++) {
      if (enemies.length >= SP.cap) break;
      const a = i / n * TAU, d = Math.hypot(S.W, S.H) / 2 + S.rng.range(SP.surgeRingMin, SP.surgeRingMax);
      enemies.push(makeEnemy(pickTier(game.time, S.rng.next()), S.player.x + Math.cos(a) * d, S.player.y + Math.sin(a) * d));
    }
  }
  const th = 1 + Math.floor(game.time / SP.threatEvery);
  if (th !== game.threat) {
    game.threat = th; sfx.tick();
    ui.threat.textContent = 'THREAT ' + th;
    ui.threat.classList.remove('flash'); void ui.threat.offsetWidth; ui.threat.classList.add('flash');
  }
  // boss on a fixed cycle, timer pulses red shortly ahead
  const toBoss = game.bossAt - game.time;
  ui.timer.classList.toggle('warn', toBoss < BALANCE.boss.warnAt && toBoss > 0);
  if (game.time >= game.bossAt) {
    game.bossAt += BALANCE.boss.every; game.bossN++;
    spawnBoss();
  }
  // Void Reaper: single milestone ultimate, heavily telegraphed then spawned
  const R = BALANCE.reaper;
  if (!game.reaperSpawned) {
    if (!game.reaperWarned && game.time >= R.at - R.warnAt) {
      game.reaperWarned = true;
      announce('THE VOID REAPER AWAKENS', REAPER_STYLE.aura, R.warnAt);
      sfx.reaperWarn();
    }
    if (game.time >= R.at) { game.reaperSpawned = true; spawnReaper(); }
  }
  // Titans: recurring super-boss every few minutes; suppressed while the reaper is loose.
  // Relative re-arm (not absolute) so a suppressed slot never floods titans on catch-up.
  if (game.time >= game.titanAt) {
    if (!game.reaper) { game.titanN++; spawnTitan(); }
    game.titanAt = game.time + BALANCE.titan.every;
  }
}

// Shared spawner for boss/titan/reaper: same phase machine, per-kind style, HP, and scale.
function spawnBig(kind, style, cfg, hp, dmg) {
  const game = S.game, p = spawnPos(cfg.margin);
  const b = makeEnemy(0, p.x, p.y);
  const scale = cfg.rScale || 1, r = style.r * scale;
  Object.assign(b, { isBoss: true, kind: kind, r: r, color: style.color, aura: style.aura || '#ff4030',
    spr: style.spr, flash: style.flash, sprScale: scale,
    hp: hp, maxhp: hp, spd: cfg.spd, dmg: dmg, xp: cfg.xp,
    phase: 'chase', pt: cfg.firstChaseT, tx: 0, ty: 0, dvx: 0, dvy: 0, dashesLeft: 0,
    spawnT: cfg.spawnT, rot: 0 });
  S.enemies.push(b); game.bossAlive++;
  return b;
}

export function spawnBoss() {
  const game = S.game, m = game.time / 60;
  const b = spawnBig('boss', BOSS_STYLE, BALANCE.boss, bossHp(game.bossN, m), bossDmg(m));
  game.boss = b;
  announce('BOSS INCOMING', '#ff5a7a', 2.4);
  sfx.boss(); addShake(8);
  bus.emit('boss-spawned', { n: game.bossN, time: game.time });
}

export function spawnTitan() {
  const game = S.game, m = game.time / 60;
  spawnBig('titan', TITAN_STYLE, BALANCE.titan, titanHp(game.titanN, m), titanDmg(m));
  announce('TITAN RISES', TITAN_STYLE.aura, 2.8);
  sfx.titan(); addShake(14);
  bus.emit('titan-spawned', { n: game.titanN, time: game.time });
}

export function spawnReaper() {
  const game = S.game, m = game.time / 60;
  const b = spawnBig('reaper', REAPER_STYLE, BALANCE.reaper, reaperHp(m), reaperDmg(m));
  game.reaper = b;
  announce('VOID REAPER', REAPER_STYLE.aura, 3.2);
  sfx.reaper(); addShake(22); game.flash = 0.6;
  bus.emit('reaper-spawned', { time: game.time });
}

export function updateEnemies(dt) {
  const enemies = S.enemies, player = S.player;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) {
      e.dieT -= dt;
      if (e.dieT <= 0) { enemies[i] = enemies[enemies.length - 1]; enemies.pop(); }
      continue;
    }
    if (e.spawnT > 0) e.spawnT -= dt;
    if (e.hitT > 0) e.hitT -= dt;
    e.sx += (1 - e.sx) * Math.min(1, dt * 12); e.sy += (1 - e.sy) * Math.min(1, dt * 12);
    if (e.bladeT > 0) e.bladeT -= dt;

    if (e.isBoss) { updateBoss(e, dt); }
    else {
      const dx = player.x - e.x, dy = player.y - e.y, d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(S.elapsed * 2.2 + e.wob) * 0.35;
      const ax = dx / d, ay = dy / d;
      e.x += (ax - ay * wob) * e.spd * dt;
      e.y += (ay + ax * wob) * e.spd * dt;
    }
    // contact damage
    if (e.spawnT <= 0 && !player.dead) {
      const rr = e.r + player.r - 3;
      if (dist2(e.x, e.y, player.x, player.y) < rr * rr) damagePlayer(e.dmg);
    }
  }
  separate();
}

// cheap grid-bucketed separation so crowds do not stack into one blob
function separate() {
  const grid = new Map();
  for (const e of S.enemies) {
    if (e.dead) continue;
    const k = ((e.x / 72) | 0) + '_' + ((e.y / 72) | 0);
    let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); }
    arr.push(e);
  }
  grid.forEach(function (arr) {
    const n = Math.min(arr.length, 10);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = arr[i], b = arr[j];
      const rr = (a.r + b.r) * 0.85;
      let dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (rr - d) * 0.5 / d;
        dx *= push; dy *= push;
        if (!a.isBoss) { a.x -= dx; a.y -= dy; }
        if (!b.isBoss) { b.x += dx; b.y += dy; }
      }
    }
  });
}

function updateBoss(b, dt) {
  const B = BALANCE[b.kind] || BALANCE.boss, player = S.player;
  b.pt -= dt;
  if (b.phase === 'chase') {
    const dx = player.x - b.x, dy = player.y - b.y, d = Math.hypot(dx, dy) || 1;
    b.x += dx / d * b.spd * dt; b.y += dy / d * b.spd * dt;
    if (b.pt <= 0) { b.dashesLeft = B.dashes || 1; enterTele(b, B); }
  } else if (b.phase === 'tele') {
    // charge-up: sparks pull inward toward the boss (cosmetic randomness)
    if (Math.random() < dt * 30) {
      const a = rnd(0, TAU), r = b.r * 3;
      addPart({ t: 'glow', x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, vx: -Math.cos(a) * r * 2.4, vy: -Math.sin(a) * r * 2.4,
        life: 0.4, max: 0.4, size: 7, color: b.aura, drag: 0 });
    }
    if (b.pt <= 0) {
      b.phase = 'dash'; b.pt = B.dashT;
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
      b.dvx = dx / d * B.dashSpd; b.dvy = dy / d * B.dashSpd;
    }
  } else if (b.phase === 'dash') {
    b.x += b.dvx * dt; b.y += b.dvy * dt;
    puff(b.x + rnd(-8, 8), b.y + rnd(-8, 8), b.color, b.r * 1.1, 0.3);
    const reached = dist2(b.x, b.y, b.tx, b.ty) < B.dashReach * B.dashReach;
    if (reached || b.pt <= 0) {
      addShake(b.kind === 'boss' ? 11 : 15); sfx.dash();
      burst(b.x, b.y, b.aura, 16, 320, 4, 0.5);
      // landing shockwave clips the player if close
      if (!player.dead && dist2(b.x, b.y, player.x, player.y) < B.shockR * B.shockR) damagePlayer(b.dmg * B.shockDmgMul);
      // multi-dash: super-bosses re-aim and lunge again before recovering
      if (--b.dashesLeft > 0) enterTele(b, B, B.dashGapT);
      else { b.phase = 'recover'; b.pt = B.recoverT; }
    }
  } else { // recover
    const dx = player.x - b.x, dy = player.y - b.y, d = Math.hypot(dx, dy) || 1;
    b.x += dx / d * b.spd * B.recoverSpdMul * dt; b.y += dy / d * b.spd * B.recoverSpdMul * dt;
    if (b.pt <= 0) { b.phase = 'chase'; b.pt = B.chaseT; }
  }
  b.rot += dt * 0.7;
}

// Lock the dash target on the player and enter the charge-up phase.
function enterTele(b, B, teleT) {
  b.phase = 'tele'; b.pt = teleT != null ? teleT : B.teleT;
  b.tx = S.player.x; b.ty = S.player.y;
  sfx.dash();
}

export function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of S.enemies) {
    if (e.dead || e.spawnT > 0.2) continue;
    const d = dist2(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

export function damageEnemy(e, dmg) {
  if (e.dead || e.spawnT > 0.2) return;
  const crit = S.rng.next() < S.stats.crit;
  if (crit) dmg *= BALANCE.player.critMult;
  e.hp -= dmg;
  e.hitT = 0.09; e.sx = 1.3; e.sy = 0.7;
  addText(e.x, e.y - e.r - 4, String(Math.round(dmg)), crit);
  sfx.hit();
  if (e.hp <= 0) { e.dead = true; e.dieT = 0.14; onKill(e); }
}

function onKill(e) {
  const game = S.game, T = BALANCE.time, B = BALANCE.boss;
  game.kills++;
  game.combo++; game.comboT = S.stats.comboWin; game.comboPulse = 1;
  const big = e.isBoss || e.tier >= 2;
  S.freeze += e.isBoss ? T.freezeBoss : (big ? T.freezeBig : T.freezeSmall);
  if (e.isBoss) { addShake(18); } else if (big) { addShake(4); }
  (e.isBoss || big) ? sfx.bigKill() : sfx.kill();
  burst(e.x, e.y, e.color, e.isBoss ? 46 : (big ? 18 : 10), e.isBoss ? 420 : 260, e.isBoss ? 6 : 3.5, e.isBoss ? 1 : 0.6);
  puff(e.x, e.y, e.color, e.r * 2.2, 0.35);
  if (e.isBoss) {
    const kind = e.kind || 'boss', cfg = BALANCE[kind] || B;
    game.bossAlive = Math.max(0, game.bossAlive - 1);
    if (kind === 'boss') { game.boss = null; announce('BOSS DOWN', '#ffe066', 2.2); }
    else if (kind === 'titan') { game.titansKilled++; announce('TITAN FELLED', '#ffe066', 2.6); bus.emit('titan-killed', { n: game.titansKilled, time: game.time }); }
    else if (kind === 'reaper') {
      game.reaper = null; game.reaperSlain = true; game.flash = 0.8; addShake(24);
      announce('THE REAPER IS SLAIN', '#c06bff', 3.4);
      confetti(e.x, e.y); sfx.evolve();
      bus.emit('reaper-killed', { time: game.time });
    }
    for (let i = 0; i < cfg.gemCount; i++) {
      const a = i / cfg.gemCount * TAU;
      dropGem(e.x + Math.cos(a) * S.rng.range(cfg.gemRingMin, cfg.gemRingMax), e.y + Math.sin(a) * S.rng.range(cfg.gemRingMin, cfg.gemRingMax), cfg.gemValue);
    }
    S.player.hp = Math.min(S.stats.maxhp, S.player.hp + cfg.killHeal);
    dropGoldBurst(e.x, e.y, BALANCE.gold.big[kind]);
    dropChest(e.x, e.y);
  } else {
    dropGem(e.x, e.y, e.xp);
    const gv = goldFor(e.tier, S.rng.next());
    if (gv > 0) dropGold(e.x, e.y, gv);
  }
  bus.emit('enemy-killed', { tier: e.tier, isBoss: e.isBoss, kind: e.kind || null, xp: e.xp, x: e.x, y: e.y, combo: game.combo });
}
