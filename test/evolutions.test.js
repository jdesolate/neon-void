// Evolution eligibility and evolved-stat contracts (Session 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE } from '../src/config.js';
import { EVOLUTIONS, eligibleEvolutions, pickEvolution } from '../src/content/evolutions.js';
import { boltStats, bladeStats, novaStats } from '../src/content/weapons.js';

const MAX = BALANCE.weapons.maxLv;

function weapons(over) {
  return Object.assign({
    bolt: { lv: 1, evo: false },
    blade: { lv: 0, evo: false },
    nova: { lv: 0, evo: false },
  }, over);
}

test('evolution rows reference real weapons and have unique ids/bases', () => {
  const ids = new Set(), bases = new Set(), known = new Set(['bolt', 'blade', 'nova']);
  for (const ev of EVOLUTIONS) {
    assert.ok(known.has(ev.base), ev.id + ' references unknown weapon ' + ev.base);
    assert.ok(!ids.has(ev.id) && !bases.has(ev.base), 'duplicate row for ' + ev.id);
    ids.add(ev.id); bases.add(ev.base);
  }
});

test('a maxed, unevolved weapon is eligible and wins the chest', () => {
  const w = weapons({ bolt: { lv: MAX, evo: false } });
  assert.equal(pickEvolution(w).id, 'stormlance');
});

test('weapons below max level are not eligible', () => {
  const w = weapons({ bolt: { lv: MAX - 1, evo: false }, blade: { lv: 2, evo: false } });
  assert.equal(eligibleEvolutions(w).length, 0);
  assert.equal(pickEvolution(w), null);
});

test('already evolved weapons are excluded; the next eligible wins', () => {
  const w = weapons({ bolt: { lv: MAX, evo: true }, nova: { lv: MAX, evo: false } });
  assert.equal(pickEvolution(w).id, 'horizon');
});

test('all weapons evolved means no eligible evolution (chest falls back)', () => {
  const w = weapons({
    bolt: { lv: MAX, evo: true }, blade: { lv: MAX, evo: true }, nova: { lv: MAX, evo: true },
  });
  assert.equal(pickEvolution(w), null);
});

test('when several are eligible, priority follows table order', () => {
  const w = weapons({ bolt: { lv: MAX, evo: false }, blade: { lv: MAX, evo: false }, nova: { lv: MAX, evo: false } });
  assert.equal(pickEvolution(w).id, EVOLUTIONS[0].id);
});

test('Storm Lance pierces, fires faster, and hits harder than max-level bolt', () => {
  const base = boltStats(MAX), evo = boltStats(MAX, true);
  assert.equal(base.pierce, false);
  assert.equal(evo.pierce, true);
  assert.ok(evo.interval < base.interval);
  assert.ok(evo.dmg > base.dmg);
  assert.ok(evo.speedMul > 1);
  assert.notEqual(evo.color, base.color);
});

test('Halo of Ruin is a larger ring with sustained (faster) contact ticks', () => {
  const base = bladeStats(MAX), evo = bladeStats(MAX, true);
  assert.ok(evo.radius > base.radius);
  assert.ok(evo.hitCd < base.hitCd);
  assert.ok(evo.dmg > base.dmg);
  assert.equal(evo.count, base.count);
});

test('Event Horizon pulls inward with a bigger, harder double pulse', () => {
  const base = novaStats(MAX), evo = novaStats(MAX, true);
  assert.equal(base.pull, 0);
  assert.ok(evo.pull > 0);
  assert.ok(evo.maxR > base.maxR);
  assert.ok(evo.dmg > base.dmg);
  assert.ok(evo.interval < base.interval);
});
