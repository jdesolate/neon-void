import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/engine/rng.js';
import { pickTier } from '../src/content/enemies.js';
import { rollUpgrades } from '../src/content/upgrades.js';

test('same seed produces the same sequence', () => {
  const a = createRng(12345), b = createRng(12345);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('different seeds diverge', () => {
  const a = createRng(1), b = createRng(2);
  const seqA = Array.from({ length: 10 }, () => a.next());
  const seqB = Array.from({ length: 10 }, () => b.next());
  assert.notDeepEqual(seqA, seqB);
});

test('next stays in [0, 1)', () => {
  const rng = createRng(99);
  for (let i = 0; i < 1000; i++) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1);
  }
});

test('range and int respect their bounds', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const r = rng.range(-5, 5);
    assert.ok(r >= -5 && r < 5);
    const n = rng.int(12);
    assert.ok(Number.isInteger(n) && n >= 0 && n < 12);
  }
});

test('same seed yields the same first N tier-pick decisions', () => {
  const a = createRng(2026), b = createRng(2026);
  const times = [10, 50, 120, 250, 30, 90, 210, 400];
  for (const t of times) {
    assert.equal(pickTier(t, a.next()), pickTier(t, b.next()));
  }
});

test('same seed yields the same first N upgrade rolls', () => {
  const ids = ['blade', 'bolt', 'nova', 'power', 'rapid', 'swift', 'vital', 'regen', 'magnet', 'crit', 'wisdom', 'combo'];
  const pool = ids.map(id => ({ id }));
  const a = createRng(555), b = createRng(555);
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(rollUpgrades(pool, a).map(u => u.id), rollUpgrades(pool, b).map(u => u.id));
  }
});

test('pickTier respects time gates regardless of roll', () => {
  assert.equal(pickTier(10, 0.0), 0); // nothing unlocked before 40s
  assert.equal(pickTier(41, 0.0), 1);
  assert.equal(pickTier(101, 0.0), 2);
  assert.equal(pickTier(201, 0.0), 3);
  assert.equal(pickTier(201, 0.99), 0); // high roll falls through to grunt
});
