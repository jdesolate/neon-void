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
    hpPerMin: 0.6, hpPerMinSq: 0.1, hpCompoundAfterMin: 8, hpCompoundPerMin: 1.3,
    spdPerMin: 0.06, spdCap: 0.5, dmgPerMin: 0.12, spdJitterMin: 0.9, spdJitterMax: 1.1,
  },
  boss: {
    firstAt: 60, every: 60, warnAt: 5, margin: 120, spawnT: 0.6,
    baseHp: 380, hpPerBoss: 0.85, hpPerMin: 0.3, spd: 46, dmg: 22, dmgPerMin: 0.1, xp: 40,
    firstChaseT: 3, chaseT: 2.6, teleT: 0.9, dashT: 0.6, dashSpd: 760, dashReach: 30, recoverT: 1.1, recoverSpdMul: 0.3,
    shockR: 110, shockDmgMul: 0.8, killHeal: 15, gemCount: 10, gemValue: 4, gemRingMin: 20, gemRingMax: 70,
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
  upgrades: {
    dmg: 1.15, aspd: 1.12, aspdCap: 2.4, spd: 1.10, spdCap: 430, hp: 25,
    regen: 1, regenCap: 6, magnet: 1.45, magnetCap: 520, crit: 0.08, critCap: 0.61,
    xpgain: 1.15, comboWin: 0.8, comboWinCap: 7,
  },
  gems: { cap: 300, pickupR: 16, pullBase: 300, pullMax: 1400, maxSpd: 720, bossHealOnKill: 15 },
  time: { levelSlow: 0.1, overSlow: 0.06, freezeBoss: 0.22, freezeBig: 0.05, freezeSmall: 0.025 },
};

// Pure scaling math, unit-testable without a browser.
export function xpToNext(level) {
  return Math.floor(BALANCE.xp.base + level * BALANCE.xp.perLevel + Math.pow(level, BALANCE.xp.pow));
}
export function enemyHpMul(min) {
  const s = BALANCE.enemyScale;
  let m = 1 + min * s.hpPerMin + min * min * s.hpPerMinSq;
  // late-game compounding so the world re-catches uncapped player builds
  if (min > s.hpCompoundAfterMin) m *= Math.pow(s.hpCompoundPerMin, min - s.hpCompoundAfterMin);
  return m;
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
  const b = BALANCE.boss; return b.baseHp * (1 + (bossN - 1) * b.hpPerBoss) * (1 + min * b.hpPerMin);
}
export function bossDmg(min) {
  const b = BALANCE.boss; return b.dmg * (1 + min * b.dmgPerMin);
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
