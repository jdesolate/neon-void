import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, xpToNext, enemyHpMul, enemySpdMul, spawnInterval, bossHp, comboMult, innateDmgMul, innateAspdMul } from '../src/config.js';
import { boltStats, bladeStats, novaStats } from '../src/content/weapons.js';

test('xp curve starts at 8 and grows monotonically', () => {
  assert.equal(xpToNext(1), 8);
  for (let l = 1; l < 50; l++) assert.ok(xpToNext(l + 1) > xpToNext(l));
});

test('enemy scaling starts at 1x and grows with minutes', () => {
  assert.equal(enemyHpMul(0), 1);
  assert.ok(enemyHpMul(5) > enemyHpMul(1));
  assert.equal(enemySpdMul(0), 1);
  // speed multiplier is capped
  assert.equal(enemySpdMul(100), 1 + BALANCE.enemyScale.spdCap);
});

test('enemy hp compounds past the threshold minute so pressure re-catches any build', () => {
  const s = BALANCE.enemyScale, after = s.hpCompoundAfterMin;
  // quadratic-only before the threshold
  const quad = m => 1 + m * s.hpPerMin + m * m * s.hpPerMinSq;
  assert.equal(enemyHpMul(after), quad(after));
  // exact compound factor two minutes past the threshold
  const expected = quad(after + 2) * Math.pow(s.hpCompoundPerMin, 2);
  assert.ok(Math.abs(enemyHpMul(after + 2) - expected) < 1e-9);
  // per-minute growth stays at least the compound factor, so it eventually
  // outpaces any polynomial player curve
  const r1 = enemyHpMul(after + 4) / enemyHpMul(after + 3);
  const r2 = enemyHpMul(after + 12) / enemyHpMul(after + 11);
  assert.ok(r1 > s.hpCompoundPerMin && r2 > s.hpCompoundPerMin);
});

test('spawn interval shrinks over time but never below the floor', () => {
  assert.equal(spawnInterval(0), BALANCE.spawn.baseInterval);
  assert.ok(spawnInterval(2) < spawnInterval(1));
  assert.equal(spawnInterval(60), BALANCE.spawn.minInterval);
});

test('spawn curve is flatter in the first minute and steeper after minute 3', () => {
  const early = spawnInterval(0) - spawnInterval(1);
  const mid = spawnInterval(2) - spawnInterval(3);
  const late = spawnInterval(3) - spawnInterval(4);
  assert.ok(early < mid);
  assert.ok(late > mid);
});

test('innate growth is linear from base, never compounding', () => {
  assert.equal(innateDmgMul(1), 1);
  assert.equal(innateAspdMul(1), 1);
  assert.ok(Math.abs(innateDmgMul(11) - (1 + 10 * BALANCE.innate.dmgPerLevel)) < 1e-9);
  assert.ok(Math.abs(innateAspdMul(11) - (1 + 10 * BALANCE.innate.aspdPerLevel)) < 1e-9);
  // equal steps between equal level spans
  const a = innateDmgMul(21) - innateDmgMul(11), b = innateDmgMul(11) - innateDmgMul(1);
  assert.ok(Math.abs(a - b) < 1e-9);
});

test('boss hp scales with boss count and run time', () => {
  assert.equal(bossHp(1, 0), BALANCE.boss.baseHp);
  assert.ok(bossHp(2, 0) > bossHp(1, 0));
  assert.ok(bossHp(1, 3) > bossHp(1, 0));
});

test('combo multiplier caps at the max stack', () => {
  assert.equal(comboMult(0), 1);
  assert.equal(comboMult(50), comboMult(200));
});

test('bolt stats match the balance table', () => {
  const lv1 = boltStats(1);
  assert.ok(Math.abs(lv1.interval - 0.426) < 1e-9);
  assert.equal(lv1.dmg, 10);
  assert.equal(lv1.count, 1);
  assert.equal(lv1.homing, false);
  const lv5 = boltStats(5);
  assert.equal(lv5.count, 3);
  assert.equal(lv5.homing, true);
  assert.ok(lv5.interval >= BALANCE.weapons.bolt.minInterval);
});

test('blade and nova stats scale with level', () => {
  assert.equal(bladeStats(1).count, 2);
  assert.equal(bladeStats(5).count, 6);
  assert.ok(novaStats(5).interval < novaStats(1).interval);
  assert.equal(novaStats(5).maxR, 260);
});
