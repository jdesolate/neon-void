// Per-level derived weapon stats. Numbers come from BALANCE; visual tier colors are content.
import { BALANCE } from '../config.js';

const B = BALANCE.weapons;

export function boltStats(lv) {
  return {
    interval: Math.max(B.bolt.minInterval, B.bolt.baseInterval - lv * B.bolt.intervalPerLv),
    dmg: B.bolt.baseDmg + lv * B.bolt.dmgPerLv,
    count: lv >= 5 ? 3 : lv >= 3 ? 2 : 1,
    r: lv >= 5 ? 7 : lv >= 3 ? 6 : 5,
    homing: lv >= B.bolt.homingLv,
    color: lv >= 5 ? '#ffe066' : lv >= 3 ? '#66ffe0' : '#38f0ff',
  };
}

export function bladeStats(lv) {
  return {
    count: 1 + lv,
    radius: B.blade.radiusBase + lv * B.blade.radiusPerLv,
    spin: B.blade.spinBase + lv * B.blade.spinPerLv,
    size: B.blade.sizeBase + lv * B.blade.sizePerLv,
    dmg: B.blade.dmgBase + lv * B.blade.dmgPerLv,
    color: lv >= 5 ? '#ffffff' : lv >= 3 ? '#8affc1' : '#5ad1ff',
  };
}

export function novaStats(lv) {
  return {
    interval: B.nova.baseInterval - lv * B.nova.intervalPerLv,
    maxR: B.nova.radiusBase + lv * B.nova.radiusPerLv,
    dmg: B.nova.dmgBase + lv * B.nova.dmgPerLv,
    color: lv >= 3 ? '#c66bff' : '#7a5cff',
  };
}
