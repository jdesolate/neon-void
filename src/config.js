// BALANCE: every gameplay tuning constant lives here and only here.
export const BALANCE = {
  player: {
    r: 13, maxhp: 100, spd: 235, regen: 0, magnet: 90, crit: 0.05, critMult: 2,
    xpgain: 1, comboWin: 2.5, hurtInv: 0.8, levelupInv: 1,
  },
  xp: { base: 4, perLevel: 3, pow: 1.5 },
  // innate growth per player level: linear from base, never compounding
  innate: { dmgPerLevel: 0.015, aspdPerLevel: 0.02 },
  levelup: { modalCooldown: 4 },
  combo: { maxStack: 50, multPer: 0.02 },
  spawn: {
    firstDelay: 0.5, baseInterval: 1.1, minInterval: 0.13, cap: 230,
    earlyUntilMin: 1, earlyPerMin: 0.06, intervalPerMin: 0.15, steepAfterMin: 3, steepPerMin: 0.10,
    surgeFirst: 14, surgePeriod: 25, surgeBase: 8, surgePerThreat: 2, surgeMax: 26,
    surgeRingMin: 40, surgeRingMax: 120,
    threatEvery: 30, margin: 60,
  },
  tierUnlock: { t3Time: 200, t3Chance: 0.10, t2Time: 100, t2Chance: 0.22, t1Time: 40, t1Chance: 0.42 },
  enemyScale: {
    hpPerMin: 0.6, hpPerMinSq: 0.1, hpCompoundAfterMin: 10, hpCompoundPerMin: 1.18,
    spdPerMin: 0.06, spdCap: 0.5, dmgPerMin: 0.12, spdJitterMin: 0.9, spdJitterMax: 1.1,
  },
  boss: {
    firstAt: 60, every: 60, warnAt: 5, margin: 120, spawnT: 0.6,
    baseHp: 380, hpPerBoss: 0.85, hpPerMin: 0.3, spd: 46, dmg: 22, dmgPerMin: 0.1, xp: 40,
    firstChaseT: 3, chaseT: 2.6, teleT: 0.9, dashT: 0.6, dashSpd: 760, dashReach: 30, recoverT: 1.1, recoverSpdMul: 0.3,
    shockR: 110, shockDmgMul: 0.8, killHeal: 15, gemCount: 10, gemValue: 4, gemRingMin: 20, gemRingMax: 70,
  },
  // Titan: recurring super-boss (~every 5 min after min 5). Rides the compounding
  // enemy curve so it keeps pace with exponential builds; multi-dash attack.
  titan: {
    firstAt: 300, every: 300, warnAt: 6, margin: 150, spawnT: 0.9,
    baseHp: 2600, hpPerTitan: 0.6, hpPerMin: 0.35, spd: 54, dmg: 32, dmgPerMin: 0.12, xp: 140,
    rScale: 2.1, dashes: 3, dashGapT: 0.32,
    firstChaseT: 2.4, chaseT: 2.2, teleT: 1.0, dashT: 0.55, dashSpd: 820, dashReach: 34, recoverT: 1.3, recoverSpdMul: 0.3,
    shockR: 150, shockDmgMul: 0.9, killHeal: 22, gemCount: 16, gemValue: 6, gemRingMin: 30, gemRingMax: 100,
  },
  // Void Reaper: single milestone ultimate (~min 15). Faster than the player,
  // massive compounding HP; killable only by an extreme build. reaperSlain feeds a Session 6 achievement.
  reaper: {
    at: 900, warnAt: 8, margin: 180, spawnT: 1.4,
    baseHp: 12000, hpPerMin: 0.4, spd: 252, dmg: 62, dmgPerMin: 0.1, xp: 600,
    rScale: 2.9, dashes: 2, dashGapT: 0.28,
    firstChaseT: 1.6, chaseT: 1.5, teleT: 0.85, dashT: 0.5, dashSpd: 900, dashReach: 38, recoverT: 0.9, recoverSpdMul: 0.5,
    shockR: 180, shockDmgMul: 1.0, killHeal: 40, gemCount: 26, gemValue: 9, gemRingMin: 40, gemRingMax: 130,
  },
  weapons: {
    maxLv: 5,
    bolt: {
      startLv: 1, startT: 0.4, baseInterval: 0.45, intervalPerLv: 0.024, minInterval: 0.18,
      baseDmg: 7, dmgPerLv: 3, speed: 520, spread: 0.14, life: 1.7, range: 900,
      homingLv: 4, homingRange: 420, homingTurn: 6, retryT: 0.12,
    },
    blade: {
      radiusBase: 48, radiusPerLv: 7, spinBase: 2.3, spinPerLv: 0.3,
      sizeBase: 8, sizePerLv: 1.6, dmgBase: 8, dmgPerLv: 3.5, hitCd: 0.4, knockback: 10,
    },
    nova: {
      startT: 2, baseInterval: 3.4, intervalPerLv: 0.25, radiusBase: 130, radiusPerLv: 26,
      dmgBase: 14, dmgPerLv: 6, echoLv: 5, echoT: 0.35, ringWidth: 16, knockback: 26, expandT: 0.5,
    },
  },
  // evolved weapon forms: multipliers over the base max-level stats
  evolutions: {
    stormlance: { intervalMul: 0.65, dmgMul: 1.3, speedMul: 1.3, r: 9 },
    haloruin: { radiusMul: 1.6, sizeMul: 1.3, spinMul: 1.2, dmgMul: 1.25, hitCd: 0.16 },
    horizon: { radiusMul: 1.4, intervalMul: 0.85, dmgMul: 1.35, pull: 46 },
  },
  chest: { pickupR: 30, slow: 0.12, cycleT: 2.1, lockT: 1.4, bobAmp: 4 },
  // Gold economy: tier-weighted drop chance per kill, guaranteed bursts from bigs/chests.
  gold: {
    cap: 140, pickupR: 18, textMin: 2,
    tierChance: [0.04, 0.05, 0.22, 0.45], tierValue: [1, 1, 2, 4],
    big: { boss: 12, titan: 30, reaper: 150 },
    burstCoin: 4, burstRingMin: 24, burstRingMax: 90,
    chest: 30,
  },
  // Meta shop: permanent upgrades bought with persistent gold; geometric cost growth.
  shop: {
    items: {
      hull:    { ranks: 5, cost: 30, growth: 1.6, add: 15 },
      amp:     { ranks: 5, cost: 40, growth: 1.6, add: 0.05 },
      clock:   { ranks: 5, cost: 40, growth: 1.6, add: 0.04 },
      ion:     { ranks: 3, cost: 35, growth: 1.7, add: 10 },
      tractor: { ranks: 4, cost: 25, growth: 1.6, add: 25 },
      nanite:  { ranks: 4, cost: 45, growth: 1.7, add: 0.25 },
      uplink:  { ranks: 3, cost: 70, growth: 1.9, add: 1 },
      midas:   { ranks: 5, cost: 50, growth: 1.8, add: 0.2 },
    },
  },
  upgrades: {
    // dmgAdd/xpgainAdd stack additively (+15% of base per pick) so player power grows linearly, not exponentially
    dmgAdd: 0.15, aspd: 1.12, aspdCap: 2.4, spd: 1.10, spdCap: 430, hp: 25,
    regen: 1, regenCap: 6, magnet: 1.45, magnetCap: 520, crit: 0.08, critCap: 0.61,
    xpgainAdd: 0.15, comboWin: 0.8, comboWinCap: 7,
  },
  gems: { cap: 300, pickupR: 16, pullBase: 300, pullMax: 1400, maxSpd: 720, bossHealOnKill: 15 },
  time: { levelSlow: 0.1, overSlow: 0.06, freezeBoss: 0.22, freezeBig: 0.05, freezeSmall: 0.025 },
};

// Pure scaling math, unit-testable without a browser.
export function xpToNext(level) {
  return Math.floor(BALANCE.xp.base + level * BALANCE.xp.perLevel + Math.pow(level, BALANCE.xp.pow));
}
// Late-game compounding factor: 1 until the threshold minute, then geometric.
// Tuned against the linear (additive-stacking) player curve so good runs end ~min 15-20.
export function hpCompound(min) {
  const s = BALANCE.enemyScale;
  return min > s.hpCompoundAfterMin ? Math.pow(s.hpCompoundPerMin, min - s.hpCompoundAfterMin) : 1;
}
export function enemyHpMul(min) {
  const s = BALANCE.enemyScale;
  const m = 1 + min * s.hpPerMin + min * min * s.hpPerMinSq;
  return m * hpCompound(min);
}
export function enemySpdMul(min) {
  const s = BALANCE.enemyScale; return 1 + Math.min(s.spdCap, min * s.spdPerMin);
}
export function enemyDmgMul(min) {
  return 1 + min * BALANCE.enemyScale.dmgPerMin;
}
export function spawnInterval(min) {
  // piecewise ramp: gentle first minute, normal slope after, extra slope past minute 3
  const s = BALANCE.spawn;
  let t = s.baseInterval - Math.min(min, s.earlyUntilMin) * s.earlyPerMin;
  if (min > s.earlyUntilMin) t -= (min - s.earlyUntilMin) * s.intervalPerMin;
  if (min > s.steepAfterMin) t -= (min - s.steepAfterMin) * s.steepPerMin;
  return Math.max(s.minInterval, t);
}
export function bossHp(bossN, min) {
  // adopts the late-game compounding term so the 60s boss cycle stays relevant vs god-builds
  const b = BALANCE.boss; return b.baseHp * (1 + (bossN - 1) * b.hpPerBoss) * (1 + min * b.hpPerMin) * hpCompound(min);
}
export function bossDmg(min) {
  const b = BALANCE.boss; return b.dmg * (1 + min * b.dmgPerMin);
}
// nth titan spawn time (seconds): first at firstAt, then every `every` seconds.
export function nthTitanTime(n) {
  const t = BALANCE.titan; return t.firstAt + (n - 1) * t.every;
}
export function titanHp(titanN, min) {
  const t = BALANCE.titan;
  return t.baseHp * (1 + (titanN - 1) * t.hpPerTitan) * (1 + min * t.hpPerMin) * hpCompound(min);
}
export function titanDmg(min) {
  const t = BALANCE.titan; return t.dmg * (1 + min * t.dmgPerMin);
}
export function reaperHp(min) {
  const r = BALANCE.reaper; return r.baseHp * (1 + min * r.hpPerMin) * hpCompound(min);
}
export function reaperDmg(min) {
  const r = BALANCE.reaper; return r.dmg * (1 + min * r.dmgPerMin);
}
export function comboMult(combo) {
  const c = BALANCE.combo; return 1 + Math.min(combo, c.maxStack) * c.multPer;
}
export function innateDmgMul(level) {
  return 1 + (level - 1) * BALANCE.innate.dmgPerLevel;
}
export function innateAspdMul(level) {
  return 1 + (level - 1) * BALANCE.innate.aspdPerLevel;
}
