// Meta economy: the persistent gold wallet. Subscribes to run-ended on the bus —
// combat code never imports this module. The shop and the NeonVoid grant seam share it.
import { S } from '../state.js';
import { bus } from '../engine/events.js';

let onChange = null;

export function initEconomy(onWalletChange) {
  onChange = onWalletChange || null;
  bus.on('run-ended', function (p) { creditWallet(p.gold || 0); });
}

export function creditWallet(n) {
  n = Math.round(n);
  if (!Number.isFinite(n) || n <= 0) return;
  S.save.data.gold += n;
  S.save.persist();
  if (onChange) onChange();
}

// External grant seam (Habit Quest): exposed on the NeonVoid handle and the debug handle.
export function grantGold(n) {
  creditWallet(Math.floor(+n));
}

// Deduct-only helper for the shop; the caller persists after applying the purchase.
export function spendGold(n) {
  if (S.save.data.gold < n) return false;
  S.save.data.gold -= n;
  return true;
}
