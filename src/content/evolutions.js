// Evolution data rows: a base weapon at max level transforms via a boss chest.
// Row order is priority: the first eligible row wins the chest.
import { BALANCE } from '../config.js';

export const EVOLUTIONS = [
  { id: 'stormlance', base: 'bolt', name: 'STORM LANCE', icon: '↯', color: '#aee9ff',
    desc: 'Piercing lightning lances, faster fire' },
  { id: 'haloruin', base: 'blade', name: 'HALO OF RUIN', icon: '◎', color: '#ffe9b0',
    desc: 'A huge searing ring of white-gold' },
  { id: 'horizon', base: 'nova', name: 'EVENT HORIZON', icon: '◉', color: '#8a3ff2',
    desc: 'Twin pulses that drag foes inward' },
];

export function eligibleEvolutions(weapons, maxLv) {
  const max = maxLv != null ? maxLv : BALANCE.weapons.maxLv;
  return EVOLUTIONS.filter(function (ev) {
    const w = weapons[ev.base];
    return !!w && w.lv >= max && !w.evo;
  });
}

export function pickEvolution(weapons, maxLv) {
  const list = eligibleEvolutions(weapons, maxLv);
  return list.length > 0 ? list[0] : null;
}
