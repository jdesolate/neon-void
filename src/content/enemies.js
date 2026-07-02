// Enemy tier and boss style data rows. Sprites are attached at mount (browser only)
// so this module stays importable under Node for tests.
import { BALANCE } from '../config.js';

export const TIERS = [
  { name: 'grunt', r: 13, hp: 18, spd: 62, dmg: 8, xp: 1, color: '#ff4d9d', core: '#ffd7e6', sides: 3, spike: false },
  { name: 'swift', r: 10, hp: 14, spd: 108, dmg: 6, xp: 2, color: '#33e6ff', core: '#dffcff', sides: 4, spike: false },
  { name: 'brute', r: 21, hp: 75, spd: 42, dmg: 14, xp: 4, color: '#ff9d3b', core: '#ffe9cf', sides: 6, spike: false },
  { name: 'elite', r: 16, hp: 135, spd: 80, dmg: 12, xp: 7, color: '#b76bff', core: '#efdcff', sides: 10, spike: true },
];

export const BOSS_STYLE = { r: 34, color: '#ff3b3b', core: '#ffd3c9', sides: 12, spike: true };

// Pure tier pick: takes elapsed run time and one RNG roll so it is seed-testable.
export function pickTier(time, r) {
  const T = BALANCE.tierUnlock;
  if (time > T.t3Time && r < T.t3Chance) return 3;
  if (time > T.t2Time && r < T.t2Chance) return 2;
  if (time > T.t1Time && r < T.t1Chance) return 1;
  return 0;
}
