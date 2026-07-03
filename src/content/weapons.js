// Per-level derived weapon stats. Numbers come from BALANCE; visual tier colors are content.
// Passing evo=true returns the evolved form's stats (Session 3 evolutions).
import { BALANCE } from '../config.js';

const B = BALANCE.weapons;
const E = BALANCE.evolutions;

export function boltStats(lv, evo) {
  const st = {
    interval: Math.max(B.bolt.minInterval, B.bolt.baseInterval - lv * B.bolt.intervalPerLv),
    dmg: B.bolt.baseDmg + lv * B.bolt.dmgPerLv,
    count: lv >= 5 ? 3 : lv >= 3 ? 2 : 1,
    r: lv >= 5 ? 7 : lv >= 3 ? 6 : 5,
    homing: lv >= B.bolt.homingLv,
    speedMul: 1, pierce: false,
    color: lv >= 5 ? '#ffe066' : lv >= 3 ? '#66ffe0' : '#38f0ff',
  };
  if (evo) {
    st.interval *= E.stormlance.intervalMul;
    st.dmg *= E.stormlance.dmgMul;
    st.speedMul = E.stormlance.speedMul;
    st.r = E.stormlance.r;
    st.pierce = true; st.homing = true;
    st.color = '#aee9ff';
  }
  return st;
}

export function bladeStats(lv, evo) {
  const st = {
    count: 1 + lv,
    radius: B.blade.radiusBase + lv * B.blade.radiusPerLv,
    spin: B.blade.spinBase + lv * B.blade.spinPerLv,
    size: B.blade.sizeBase + lv * B.blade.sizePerLv,
    dmg: B.blade.dmgBase + lv * B.blade.dmgPerLv,
    hitCd: B.blade.hitCd,
    color: lv >= 5 ? '#ffffff' : lv >= 3 ? '#8affc1' : '#5ad1ff',
  };
  if (evo) {
    st.radius *= E.haloruin.radiusMul;
    st.size *= E.haloruin.sizeMul;
    st.spin *= E.haloruin.spinMul;
    st.dmg *= E.haloruin.dmgMul;
    st.hitCd = E.haloruin.hitCd;
    st.color = '#ffe9b0';
  }
  return st;
}

export function novaStats(lv, evo) {
  const st = {
    interval: B.nova.baseInterval - lv * B.nova.intervalPerLv,
    maxR: B.nova.radiusBase + lv * B.nova.radiusPerLv,
    dmg: B.nova.dmgBase + lv * B.nova.dmgPerLv,
    pull: 0,
    color: lv >= 3 ? '#c66bff' : '#7a5cff',
  };
  if (evo) {
    st.interval *= E.horizon.intervalMul;
    st.maxR *= E.horizon.radiusMul;
    st.dmg *= E.horizon.dmgMul;
    st.pull = E.horizon.pull;
    st.color = '#8a3ff2';
  }
  return st;
}
