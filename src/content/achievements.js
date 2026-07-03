// Achievement data rows: threshold subscriptions over the event bus, persisted in
// the save. Goals live in BALANCE.achievements.goals; `stat` indexes into a metrics
// snapshot (lifetime counters merged with live-run values). `reward` names a
// character id unlocked alongside the achievement.
import { BALANCE } from '../config.js';

const G = BALANCE.achievements.goals;

export const ACHIEVEMENTS = [
  { id: 'recruit', icon: '⌖', col: '#5ad1ff', name: 'RECRUIT', stat: 'runKills', goal: G.recruit,
    desc: G.recruit + ' kills in one run' },
  { id: 'slayer', icon: '☠', col: '#ff5a7a', name: 'SLAYER', stat: 'kills', goal: G.slayer,
    desc: G.slayer + ' lifetime kills', reward: 'vanguard' },
  { id: 'exterminator', icon: '✕', col: '#ff8f5a', name: 'EXTERMINATOR', stat: 'kills', goal: G.exterminator,
    desc: G.exterminator + ' lifetime kills' },
  { id: 'survivor', icon: '◔', col: '#66ffe0', name: 'SURVIVOR', stat: 'time', goal: G.survivor,
    desc: 'Survive ' + Math.round(G.survivor / 60) + ' minutes in one run' },
  { id: 'ascended', icon: '⚡', col: '#ffe066', name: 'ASCENDED', stat: 'evolutions', goal: G.ascended,
    desc: 'Evolve a weapon from a boss chest' },
  { id: 'bossbreaker', icon: '◆', col: '#ff5a7a', name: 'BOSSBREAKER', stat: 'bosses', goal: G.bossbreaker,
    desc: 'Kill ' + G.bossbreaker + ' bosses' },
  { id: 'titanfall', icon: '⬢', col: '#c06bff', name: 'TITANFALL', stat: 'titans', goal: G.titanfall,
    desc: 'Fell ' + G.titanfall + ' titans' },
  { id: 'voidslayer', icon: '❖', col: '#c06bff', name: 'VOIDSLAYER', stat: 'reapers', goal: G.voidslayer,
    desc: 'Slay the Void Reaper' },
  { id: 'hotstreak', icon: '∞', col: '#ff9d3b', name: 'HOT STREAK', stat: 'combo', goal: G.hotstreak,
    desc: 'Reach a ×' + G.hotstreak + ' combo' },
  { id: 'tycoon', icon: '◈', col: '#ffd166', name: 'TYCOON', stat: 'gold', goal: G.tycoon,
    desc: 'Earn ' + G.tycoon + ' lifetime gold' },
  { id: 'headhunter', icon: '◎', col: '#ffd166', name: 'HEADHUNTER', stat: 'elites', goal: G.headhunter,
    desc: 'Kill ' + G.headhunter + ' elites' },
];

// Pure: rows newly satisfied by a metrics snapshot, skipping already-unlocked ids.
export function checkUnlocks(metrics, unlocked) {
  return ACHIEVEMENTS.filter(function (a) {
    return !unlocked[a.id] && (metrics[a.stat] || 0) >= a.goal;
  });
}

// Pure: progress toward a row's goal, clamped to [0, 1].
export function achProgress(row, metrics) {
  return Math.max(0, Math.min(1, (metrics[row.stat] || 0) / row.goal));
}
