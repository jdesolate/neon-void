// Upgrade pool data rows. desc/can/app read live run state; values come from BALANCE.
import { S } from '../state.js';
import { BALANCE } from '../config.js';

const U = BALANCE.upgrades;
const MAXLV = BALANCE.weapons.maxLv;

export const UPS = [
  { id: 'blade', icon: '◎', col: '#5ad1ff', name: 'Orbital Blades',
    desc: function () { return S.weapons.blade.lv === 0 ? 'Summon 2 spinning blades' : '+1 blade — bigger, faster'; },
    lv: function () { return S.weapons.blade.lv; }, can: function () { return S.weapons.blade.lv < MAXLV; },
    app: function () { S.weapons.blade.lv++; } },
  { id: 'bolt', icon: '➤', col: '#38f0ff', name: 'Pulse Bolt',
    desc: function () { const l = S.weapons.bolt.lv; return l >= 4 ? '+1 shot, faster fire' : l >= 3 ? 'Bolts seek their prey' : l >= 2 ? 'Twin shot unlocked' : '+damage, faster fire'; },
    lv: function () { return S.weapons.bolt.lv; }, can: function () { return S.weapons.bolt.lv < MAXLV; },
    app: function () { S.weapons.bolt.lv++; } },
  { id: 'nova', icon: '◉', col: '#c66bff', name: 'Void Nova',
    desc: function () { return S.weapons.nova.lv === 0 ? 'Unleash an expanding shockwave' : S.weapons.nova.lv >= 4 ? 'Double pulse, huge radius' : 'Bigger, harder, more often'; },
    lv: function () { return S.weapons.nova.lv; }, can: function () { return S.weapons.nova.lv < MAXLV; },
    app: function () { S.weapons.nova.lv++; } },
  { id: 'power', icon: '▲', col: '#ff8f5a', name: 'Overcharge', desc: function () { return '+15% all damage'; },
    lv: null, can: function () { return true; }, app: function () { S.stats.dmg *= U.dmg; } },
  { id: 'rapid', icon: '≡', col: '#ffe066', name: 'Rapid Core', desc: function () { return '+12% attack speed'; },
    lv: null, can: function () { return S.stats.aspd < U.aspdCap; }, app: function () { S.stats.aspd *= U.aspd; } },
  { id: 'swift', icon: '»', col: '#66ffe0', name: 'Ion Thrusters', desc: function () { return '+10% move speed'; },
    lv: null, can: function () { return S.stats.spd < U.spdCap; }, app: function () { S.stats.spd *= U.spd; } },
  { id: 'vital', icon: '+', col: '#ff5a7a', name: 'Vitality Core', desc: function () { return '+25 max HP, heal 25'; },
    lv: null, can: function () { return true; }, app: function () { S.stats.maxhp += U.hp; S.player.hp = Math.min(S.stats.maxhp, S.player.hp + U.hp); } },
  { id: 'regen', icon: '✚', col: '#5affc8', name: 'Nanite Swarm', desc: function () { return '+1 HP per second'; },
    lv: null, can: function () { return S.stats.regen < U.regenCap; }, app: function () { S.stats.regen += U.regen; } },
  { id: 'magnet', icon: '◍', col: '#38b6ff', name: 'Tractor Field', desc: function () { return '+45% pickup range'; },
    lv: null, can: function () { return S.stats.magnet < U.magnetCap; }, app: function () { S.stats.magnet *= U.magnet; } },
  { id: 'crit', icon: '✕', col: '#ffd166', name: 'Deadeye', desc: function () { return '+8% crit chance (2× damage)'; },
    lv: null, can: function () { return S.stats.crit < U.critCap; }, app: function () { S.stats.crit += U.crit; } },
  { id: 'wisdom', icon: '◆', col: '#b76bff', name: 'Wisdom Shard', desc: function () { return '+15% XP gain'; },
    lv: null, can: function () { return true; }, app: function () { S.stats.xpgain *= U.xpgain; } },
  { id: 'combo', icon: '∞', col: '#ff9d3b', name: 'Adrenaline', desc: function () { return '+0.8s combo window'; },
    lv: null, can: function () { return S.stats.comboWin < U.comboWinCap; }, app: function () { S.stats.comboWin += U.comboWin; } },
];
