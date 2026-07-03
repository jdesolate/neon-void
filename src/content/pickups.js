// Rare pickup data rows and the pure drop roll. Effects live in game/pickups.js;
// this module stays importable under Node for tests.
import { BALANCE } from '../config.js';

export const PICKUPS = [
  { id: 'heal', name: 'NANO SURGE', icon: '✚', color: '#5aff8f', desc: 'Restores hull integrity' },
  { id: 'magnet', name: 'VOID MAGNET', icon: '◎', color: '#38b6ff', desc: 'Every gem flies to you' },
  { id: 'bomb', name: 'SINGULARITY', icon: '✸', color: '#ff9d3b', desc: 'Shatters everything on screen' },
];

// Pure drop roll: one RNG roll both gates the drop and picks the row by weight
// band, so the whole decision is seed-testable from a single number.
export function rollPickup(roll) {
  const P = BALANCE.pickups;
  if (roll >= P.chance) return null;
  let total = 0;
  for (const row of PICKUPS) total += P.weights[row.id];
  let x = (roll / P.chance) * total;
  for (const row of PICKUPS) {
    x -= P.weights[row.id];
    if (x < 0) return row;
  }
  return PICKUPS[PICKUPS.length - 1];
}
