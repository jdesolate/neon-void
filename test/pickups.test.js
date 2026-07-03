import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, nextEliteGap } from '../src/config.js';
import { PICKUPS, rollPickup } from '../src/content/pickups.js';
import { makeElite } from '../src/content/enemies.js';
import { createRng } from '../src/engine/rng.js';

const P = BALANCE.pickups;
const E = BALANCE.elite;

test('pickup rows are integral: the three planned kinds, unique ids, weighted', () => {
  assert.deepEqual(PICKUPS.map(r => r.id).sort(), ['bomb', 'heal', 'magnet']);
  const seen = new Set();
  for (const row of PICKUPS) {
    assert.ok(!seen.has(row.id), 'duplicate id ' + row.id);
    seen.add(row.id);
    assert.ok(P.weights[row.id] > 0, 'missing weight for ' + row.id);
    assert.ok(row.name.length > 0 && row.icon.length > 0 && row.color.length > 0);
  }
  assert.ok(P.chance > 0 && P.chance < 0.05, 'pickups must stay rare');
  assert.ok(P.healPct > 0 && P.healPct <= 1);
  assert.ok(P.bomb.pct > 0 && P.bomb.pct <= 1);
  assert.ok(P.bomb.bossPct < P.bomb.pct, 'bosses must take the trimmed chunk');
});

test('rollPickup gates on the drop chance: at or above it, nothing drops', () => {
  assert.equal(rollPickup(P.chance), null);
  assert.equal(rollPickup(0.5), null);
  assert.equal(rollPickup(0.999), null);
  assert.ok(rollPickup(0) !== null);
  assert.ok(rollPickup(P.chance - 1e-12) !== null);
});

test('one roll picks the row by weight band, in table order', () => {
  const total = PICKUPS.reduce((s, r) => s + P.weights[r.id], 0);
  let cum = 0;
  for (const row of PICKUPS) {
    const lo = (cum / total) * P.chance;
    cum += P.weights[row.id];
    const hi = (cum / total) * P.chance;
    assert.equal(rollPickup((lo + hi) / 2).id, row.id);
    assert.equal(rollPickup(lo).id, row.id);
  }
});

test('seeded distribution matches the weight table', () => {
  const rng = createRng(1234);
  const N = 200000, counts = { heal: 0, magnet: 0, bomb: 0 };
  let drops = 0;
  for (let i = 0; i < N; i++) {
    const row = rollPickup(rng.next());
    if (row) { drops++; counts[row.id]++; }
  }
  // drop rate within 20% of the configured chance
  assert.ok(Math.abs(drops / N - P.chance) < P.chance * 0.2, 'drop rate ' + drops / N);
  // relative frequencies within 15% of the weight ratios
  const total = PICKUPS.reduce((s, r) => s + P.weights[r.id], 0);
  for (const row of PICKUPS) {
    const want = P.weights[row.id] / total, got = counts[row.id] / drops;
    assert.ok(Math.abs(got - want) < want * 0.15, row.id + ' freq ' + got + ' want ' + want);
  }
});

test('same seed yields the same drop decisions', () => {
  const a = createRng(77), b = createRng(77);
  for (let i = 0; i < 5000; i++) {
    const ra = rollPickup(a.next()), rb = rollPickup(b.next());
    assert.equal(ra && ra.id, rb && rb.id);
  }
});

test('makeElite multiplies the wrapped tier stats and flags the enemy', () => {
  const e = { hp: 20, maxhp: 20, dmg: 8, r: 13 };
  makeElite(e);
  assert.equal(e.elite, true);
  assert.equal(e.hp, 20 * E.hpMul);
  assert.equal(e.maxhp, 20 * E.hpMul);
  assert.equal(e.dmg, 8 * E.dmgMul);
  assert.equal(e.r, 13 * E.rMul);
  assert.equal(e.sprScale, E.rMul);
  assert.equal(E.hpMul, 6);
  assert.equal(E.dmgMul, 1.5);
});

test('elite cadence: first after minute 1, then one per gapMin..gapMax seconds', () => {
  assert.ok(E.firstAt >= 60);
  assert.equal(nextEliteGap(0), E.gapMin);
  assert.ok(nextEliteGap(1 - 1e-9) < E.gapMax + 1e-6);
  assert.ok(E.gapMin >= 45 && E.gapMax <= 60);
  const rng = createRng(9);
  for (let i = 0; i < 1000; i++) {
    const g = nextEliteGap(rng.next());
    assert.ok(g >= E.gapMin && g < E.gapMax);
  }
});

test('elite reward split is a probability and gold burst is positive', () => {
  assert.ok(E.chestChance > 0 && E.chestChance < 1);
  assert.ok(E.gold > 0);
});
