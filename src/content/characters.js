// Playable character data rows. Stat multipliers live in BALANCE.characters;
// a row with an `unlock` field needs that achievement id unlocked in the save.
import { BALANCE } from '../config.js';

const C = BALANCE.characters;

export const CHARACTERS = [
  { id: 'striker', icon: '➤', col: '#38f0ff', name: 'STRIKER', weapon: 'bolt',
    desc: 'PULSE BOLT · BALANCED HULL', unlock: null },
  { id: 'vanguard', icon: '◎', col: '#5ad1ff', name: 'VANGUARD', weapon: 'blade',
    desc: 'BLADES · +' + Math.round((C.vanguard.spdMul - 1) * 100) + '% SPEED · −' + Math.round((1 - C.vanguard.hpMul) * 100) + '% HULL',
    unlock: 'slayer' },
];

export function charById(id) {
  return CHARACTERS.find(function (c) { return c.id === id; }) || CHARACTERS[0];
}

// Pure: the character a run actually uses — falls back to the default when the
// saved pick is unknown or its unlock is not owned.
export function activeCharacter(id, unlocked) {
  const c = charById(id);
  return (c.unlock && !(unlocked && unlocked[c.unlock])) ? CHARACTERS[0] : c;
}

export function charMults(id) {
  return C[id] || C.striker;
}
