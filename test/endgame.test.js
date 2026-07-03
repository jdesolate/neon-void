import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, hpCompound, bossHp, nthTitanTime, titanHp, titanDmg, reaperHp, reaperDmg } from '../src/config.js';

test('hpCompound is 1 up to the threshold, then geometric', () => {
  const s = BALANCE.enemyScale;
  assert.equal(hpCompound(0), 1);
  assert.equal(hpCompound(s.hpCompoundAfterMin), 1);
  const expected = Math.pow(s.hpCompoundPerMin, 3);
  assert.ok(Math.abs(hpCompound(s.hpCompoundAfterMin + 3) - expected) < 1e-9);
});

test('regular boss HP adopts the compounding term past the threshold', () => {
  const b = BALANCE.boss, s = BALANCE.enemyScale, after = s.hpCompoundAfterMin;
  // unchanged before the threshold (compound factor is 1)
  assert.equal(bossHp(1, 0), b.baseHp);
  assert.equal(bossHp(1, 3), b.baseHp * (1 + 3 * b.hpPerMin));
  // compounds after it: two identical minutes-apart ratios exceed the compound factor
  const r = bossHp(1, after + 6) / bossHp(1, after + 5);
  assert.ok(r > s.hpCompoundPerMin);
});

test('titan schedule: first at firstAt, then every `every` seconds', () => {
  const t = BALANCE.titan;
  assert.equal(nthTitanTime(1), t.firstAt);
  assert.equal(nthTitanTime(2), t.firstAt + t.every);
  assert.equal(nthTitanTime(4), t.firstAt + 3 * t.every);
});

test('titan HP scales with titan count and minute, and compounds late', () => {
  assert.ok(titanHp(2, 5) > titanHp(1, 5));           // later titans are tankier
  assert.ok(titanHp(1, 10) > titanHp(1, 5));           // scales with time
  const s = BALANCE.enemyScale, after = s.hpCompoundAfterMin;
  const r = titanHp(1, after + 6) / titanHp(1, after + 5);
  assert.ok(r > s.hpCompoundPerMin);                   // re-catches exponential builds
  assert.ok(titanDmg(5) > titanDmg(0));
});

test('titans out-tank the concurrent regular boss so they read as super-bosses', () => {
  // at the first titan (min 5), boss count is roughly 5; titan should still dwarf it
  assert.ok(titanHp(1, 5) > bossHp(5, 5));
});

test('reaper HP is massive and compounds; its milestone is late-game', () => {
  const r = BALANCE.reaper, s = BALANCE.enemyScale;
  assert.ok(r.at >= 900);                               // ~minute 15+
  assert.ok(reaperHp(15) > reaperHp(10));
  // reaper at its milestone dwarfs a same-time titan
  assert.ok(reaperHp(15) > titanHp(3, 15));
  const ratio = reaperHp(s.hpCompoundAfterMin + 6) / reaperHp(s.hpCompoundAfterMin + 5);
  assert.ok(ratio > s.hpCompoundPerMin);
  assert.ok(reaperDmg(10) > reaperDmg(0));
});

test('reaper is faster than the player so it cannot simply be outrun', () => {
  assert.ok(BALANCE.reaper.spd > BALANCE.player.spd);
});
