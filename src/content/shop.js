// Meta-shop data rows: permanent upgrades bought with persistent gold.
// Rank counts, costs, growth, and per-rank amounts live in BALANCE.shop.items.
import { BALANCE } from '../config.js';

const IT = BALANCE.shop.items;

export const SHOP = [
  { id: 'hull', icon: '⬢', col: '#ff5a7a', name: 'Reactor Plating', stat: 'maxhp',
    desc: function () { return '+' + IT.hull.add + ' max HP per rank'; } },
  { id: 'amp', icon: '▲', col: '#ff8f5a', name: 'Core Amplifier', stat: 'dmg',
    desc: function () { return '+' + Math.round(IT.amp.add * 100) + '% damage per rank'; } },
  { id: 'clock', icon: '≡', col: '#ffe066', name: 'Overclock Chip', stat: 'aspd',
    desc: function () { return '+' + Math.round(IT.clock.add * 100) + '% attack speed per rank'; } },
  { id: 'ion', icon: '»', col: '#66ffe0', name: 'Ion Drive', stat: 'spd',
    desc: function () { return '+' + IT.ion.add + ' move speed per rank'; } },
  { id: 'tractor', icon: '◍', col: '#38b6ff', name: 'Tractor Array', stat: 'magnet',
    desc: function () { return '+' + IT.tractor.add + ' pickup range per rank'; } },
  { id: 'nanite', icon: '✚', col: '#5affc8', name: 'Nanite Cloud', stat: 'regen',
    desc: function () { return '+' + IT.nanite.add + ' HP/s regen per rank'; } },
  { id: 'uplink', icon: '◆', col: '#b76bff', name: 'Neural Uplink', stat: 'startLevel',
    desc: function () { return 'Start ' + IT.uplink.add + ' level higher per rank'; } },
  { id: 'midas', icon: '◈', col: '#ffd166', name: 'Midas Protocol', stat: 'goldgain',
    desc: function () { return '+' + Math.round(IT.midas.add * 100) + '% gold per rank'; } },
];

// Geometric cost curve: rank n costs base * growth^n, rounded.
export function shopCost(id, owned) {
  const c = IT[id];
  return Math.round(c.cost * Math.pow(c.growth, owned));
}

// Owned rank from the save's shop map, clamped to the item's max.
export function ownedRank(ranks, id) {
  const n = ranks ? Math.floor(+ranks[id] || 0) : 0;
  return Math.min(IT[id].ranks, Math.max(0, n));
}

// Aggregate stat bonuses from purchased ranks; applied once at run start.
export function metaBonuses(ranks) {
  const b = { maxhp: 0, dmg: 0, aspd: 0, spd: 0, magnet: 0, regen: 0, startLevel: 0, goldgain: 0 };
  for (const row of SHOP) b[row.stat] += ownedRank(ranks, row.id) * IT[row.id].add;
  return b;
}
