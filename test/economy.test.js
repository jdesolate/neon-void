import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE } from '../src/config.js';
import { goldFor } from '../src/content/enemies.js';
import { SHOP, shopCost, ownedRank, metaBonuses } from '../src/content/shop.js';

const G = BALANCE.gold;
const IT = BALANCE.shop.items;

test('gold roll is tier-weighted: below the chance drops the tier value, above drops nothing', () => {
  for (let tier = 0; tier < G.tierChance.length; tier++) {
    assert.equal(goldFor(tier, G.tierChance[tier] - 1e-9), G.tierValue[tier]);
    assert.equal(goldFor(tier, G.tierChance[tier]), 0);
    assert.equal(goldFor(tier, 0.999), 0);
  }
});

test('gold drop table shape: chances are probabilities, values positive, bigs escalate', () => {
  assert.equal(G.tierChance.length, G.tierValue.length);
  G.tierChance.forEach(c => { assert.ok(c > 0 && c < 1); });
  G.tierValue.forEach(v => { assert.ok(v >= 1); });
  assert.ok(G.big.boss > 0);
  assert.ok(G.big.titan > G.big.boss);
  assert.ok(G.big.reaper > G.big.titan);
  assert.ok(G.chest > 0);
});

test('shop rows are integral: unique ids, balance config present, 3-5 ranks, growth over 1', () => {
  const seen = new Set();
  const stats = Object.keys(metaBonuses({}));
  for (const row of SHOP) {
    assert.ok(!seen.has(row.id), 'duplicate id ' + row.id);
    seen.add(row.id);
    const cfg = IT[row.id];
    assert.ok(cfg, 'missing BALANCE.shop.items entry for ' + row.id);
    assert.ok(cfg.ranks >= 3 && cfg.ranks <= 5);
    assert.ok(cfg.cost > 0);
    assert.ok(cfg.growth > 1);
    assert.ok(cfg.add > 0);
    assert.ok(stats.includes(row.stat), 'unknown stat ' + row.stat);
    assert.ok(typeof row.desc() === 'string' && row.desc().length > 0);
  }
  assert.ok(SHOP.length >= 6 && SHOP.length <= 8);
});

test('shop costs follow the geometric curve and rise strictly per rank', () => {
  for (const row of SHOP) {
    const cfg = IT[row.id];
    for (let r = 0; r < cfg.ranks; r++) {
      assert.equal(shopCost(row.id, r), Math.round(cfg.cost * Math.pow(cfg.growth, r)));
      if (r > 0) assert.ok(shopCost(row.id, r) > shopCost(row.id, r - 1));
    }
  }
});

test('metaBonuses is linear: each rank adds the same increment', () => {
  for (const row of SHOP) {
    const one = metaBonuses({ [row.id]: 1 })[row.stat];
    const two = metaBonuses({ [row.id]: 2 })[row.stat];
    const three = metaBonuses({ [row.id]: 3 })[row.stat];
    assert.ok(Math.abs(two - 2 * one) < 1e-12);
    assert.ok(Math.abs(three - 3 * one) < 1e-12);
  }
});

test('metaBonuses clamps above max rank and zeroes bad input', () => {
  for (const row of SHOP) {
    const cfg = IT[row.id];
    const capped = metaBonuses({ [row.id]: 99 })[row.stat];
    assert.ok(Math.abs(capped - cfg.ranks * cfg.add) < 1e-12);
    assert.equal(metaBonuses({ [row.id]: -4 })[row.stat], 0);
  }
  // empty, missing, and unknown-id maps all produce a full zeroed shape
  for (const ranks of [{}, undefined, { bogus: 3 }]) {
    const b = metaBonuses(ranks);
    Object.keys(b).forEach(k => assert.equal(b[k], 0));
  }
});

test('ownedRank floors fractional ranks and clamps to the item max', () => {
  const id = SHOP[0].id;
  assert.equal(ownedRank({ [id]: 2.9 }, id), 2);
  assert.equal(ownedRank({ [id]: 99 }, id), IT[id].ranks);
  assert.equal(ownedRank({}, id), 0);
  assert.equal(ownedRank(undefined, id), 0);
});
