import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/engine/rng.js';
import { UPS, OFFENSIVE, rollUpgrades } from '../src/content/upgrades.js';
import { S } from '../src/state.js';
import { BALANCE } from '../src/config.js';

const fullPool = () => UPS.map(u => ({ id: u.id }));

test('every 3-card offer contains at least one offensive card', () => {
  const rng = createRng(42);
  for (let i = 0; i < 500; i++) {
    const picks = rollUpgrades(fullPool(), rng);
    assert.equal(picks.length, 3);
    assert.ok(picks.some(u => OFFENSIVE.has(u.id)), 'offer ' + i + ' had no offensive card');
  }
});

test('offers never contain duplicates', () => {
  const rng = createRng(7);
  for (let i = 0; i < 500; i++) {
    const picks = rollUpgrades(fullPool(), rng);
    assert.equal(new Set(picks.map(u => u.id)).size, picks.length);
  }
});

test('small pools degrade gracefully', () => {
  const rng = createRng(9);
  assert.equal(rollUpgrades([], rng).length, 0);
  const two = rollUpgrades([{ id: 'power' }, { id: 'vital' }], rng);
  assert.equal(two.length, 2);
  // a pool with no offensive cards still fills the offer
  const def = rollUpgrades([{ id: 'vital' }, { id: 'regen' }, { id: 'magnet' }, { id: 'crit' }], rng);
  assert.equal(def.length, 3);
});

test('overcharge and wisdom stack additively, never compounding', () => {
  const U = BALANCE.upgrades;
  const power = UPS.find(u => u.id === 'power'), wisdom = UPS.find(u => u.id === 'wisdom');
  Object.assign(S.stats, { dmg: 1, xpgain: 1 });
  power.app(); wisdom.app();
  assert.ok(Math.abs(S.stats.dmg - (1 + U.dmgAdd)) < 1e-9);
  assert.ok(Math.abs(S.stats.xpgain - (1 + U.xpgainAdd)) < 1e-9);
  // equal increments per pick: pick #20 is worth the same as pick #1
  for (let i = 0; i < 19; i++) { power.app(); wisdom.app(); }
  assert.ok(Math.abs(S.stats.dmg - (1 + 20 * U.dmgAdd)) < 1e-9);
  assert.ok(Math.abs(S.stats.xpgain - (1 + 20 * U.xpgainAdd)) < 1e-9);
});

test('capped upgrades are excluded by their can() gates', () => {
  Object.assign(S.weapons, { bolt: { lv: 5 }, blade: { lv: 5 }, nova: { lv: 5 } });
  const U = BALANCE.upgrades;
  Object.assign(S.stats, {
    aspd: U.aspdCap, spd: U.spdCap, regen: U.regenCap,
    magnet: U.magnetCap, crit: U.critCap, comboWin: U.comboWinCap,
    dmg: 1, maxhp: 100, xpgain: 1,
  });
  const ids = UPS.filter(u => u.can()).map(u => u.id).sort();
  // by design only the uncapped power-fantasy stats remain
  assert.deepEqual(ids, ['power', 'vital', 'wisdom']);
});
