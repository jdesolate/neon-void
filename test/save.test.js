import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, defaultSave, defaultLife, SAVE_KEY, SCHEMA_VERSION } from '../src/engine/save.js';

function memAdapter(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    get(k) { return m.has(k) ? m.get(k) : null; },
    set(k, v) { m.set(k, v); return true; },
    remove(k) { m.delete(k); },
    _m: m,
  };
}

test('fresh storage loads defaults', () => {
  const save = createSave(memAdapter());
  assert.deepEqual(save.data, defaultSave());
  assert.equal(save.data.v, SCHEMA_VERSION);
});

test('v1 legacy keys migrate into the v2 blob', () => {
  const save = createSave(memAdapter({ nv_bestT: '123', nv_bestK: '45' }));
  assert.equal(save.data.best.time, 123);
  assert.equal(save.data.best.kills, 45);
});

test('persist writes one key and removes the legacy keys', () => {
  const adapter = memAdapter({ nv_bestT: '123', nv_bestK: '45' });
  const save = createSave(adapter);
  assert.equal(save.persist(), true);
  assert.equal(adapter.get('nv_bestT'), null);
  assert.equal(adapter.get('nv_bestK'), null);
  const stored = JSON.parse(adapter.get(SAVE_KEY));
  assert.deepEqual(stored, { v: 6, best: { time: 123, kills: 45 }, settings: { music: true, sfx: true }, gold: 0, shop: {},
    ach: {}, life: defaultLife(), character: 'striker' });
});

test('v2 blob migrates through the chain to v6 without touching bests', () => {
  const blob = JSON.stringify({ v: 2, best: { time: 300, kills: 88 } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.v, 6);
  assert.deepEqual(save.data.best, { time: 300, kills: 88 });
  assert.equal(save.data.settings.music, true);
  assert.equal(save.data.settings.sfx, true);
  assert.equal(save.data.gold, 0);
  assert.deepEqual(save.data.shop, {});
  assert.deepEqual(save.data.ach, {});
  assert.deepEqual(save.data.life, defaultLife());
  assert.equal(save.data.character, 'striker');
});

test('v3 blob migrates onward, adding an empty wallet and keeping settings', () => {
  const blob = JSON.stringify({ v: 3, best: { time: 300, kills: 88 }, settings: { music: false } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.v, 6);
  assert.deepEqual(save.data.best, { time: 300, kills: 88 });
  assert.equal(save.data.settings.music, false);
  assert.equal(save.data.gold, 0);
  assert.deepEqual(save.data.shop, {});
});

test('v4 blob migrates onward, adding the sfx flag and keeping wallet, ranks, and music', () => {
  const blob = JSON.stringify({ v: 4, best: { time: 300, kills: 88 }, settings: { music: false }, gold: 240, shop: { hull: 3 } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.v, 6);
  assert.equal(save.data.settings.music, false);
  assert.equal(save.data.settings.sfx, true);
  assert.equal(save.data.gold, 240);
  assert.deepEqual(save.data.shop, { hull: 3 });
});

test('v5 blob migrates to v6, adding achievements, lifetime counters, and the character pick', () => {
  const blob = JSON.stringify({ v: 5, best: { time: 300, kills: 88 }, settings: { music: false, sfx: false },
    gold: 240, shop: { hull: 3, midas: 2 } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.v, 6);
  assert.deepEqual(save.data.best, { time: 300, kills: 88 });
  assert.equal(save.data.settings.music, false);
  assert.equal(save.data.settings.sfx, false);
  assert.equal(save.data.gold, 240);
  assert.deepEqual(save.data.shop, { hull: 3, midas: 2 });
  assert.deepEqual(save.data.ach, {});
  assert.deepEqual(save.data.life, defaultLife());
  assert.equal(save.data.character, 'striker');
});

test('achievements, life counters, and character round-trip through persist', () => {
  const adapter = memAdapter();
  const save = createSave(adapter);
  save.data.ach = { slayer: 1, recruit: 1 };
  save.data.life.kills = 1234;
  save.data.life.combo = 61;
  save.data.character = 'vanguard';
  save.persist();
  const again = createSave(adapter);
  assert.deepEqual(again.data.ach, { slayer: 1, recruit: 1 });
  assert.equal(again.data.life.kills, 1234);
  assert.equal(again.data.life.combo, 61);
  assert.equal(again.data.character, 'vanguard');
});

test('corrupt ach, life, and character values sanitize instead of breaking the load', () => {
  const blob = JSON.stringify({ v: 6, best: { time: 1, kills: 1 }, settings: { music: true, sfx: true },
    gold: 0, shop: {}, ach: { slayer: 1, bogus: 0, weird: 'yes' }, life: { kills: -3, gold: 'x', combo: 12.9, extra: 99 },
    character: 42 });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  // falsy unlock values drop; truthy non-1 values normalize to 1
  assert.deepEqual(save.data.ach, { slayer: 1, weird: 1 });
  // unknown counter keys drop; bad numbers floor to defaults, fractions floor down
  assert.deepEqual(save.data.life, Object.assign(defaultLife(), { combo: 12 }));
  assert.equal(save.data.character, 'striker');
});

test('sfx setting round-trips and corrupt sfx sanitizes to on', () => {
  const adapter = memAdapter();
  const save = createSave(adapter);
  save.data.settings.sfx = false;
  save.persist();
  assert.equal(createSave(adapter).data.settings.sfx, false);
  const bad = JSON.stringify({ v: 5, best: { time: 1, kills: 1 }, settings: { music: true, sfx: 'loud' }, gold: 0, shop: {} });
  assert.equal(createSave(memAdapter({ [SAVE_KEY]: bad })).data.settings.sfx, true);
});

test('gold wallet and shop ranks round-trip through persist', () => {
  const adapter = memAdapter();
  const save = createSave(adapter);
  save.data.gold = 120;
  save.data.shop = { hull: 2, midas: 1 };
  save.persist();
  const again = createSave(adapter);
  assert.equal(again.data.gold, 120);
  assert.deepEqual(again.data.shop, { hull: 2, midas: 1 });
});

test('corrupt gold and shop values sanitize instead of breaking the load', () => {
  const blob = JSON.stringify({ v: 4, best: { time: 1, kills: 1 }, settings: { music: true },
    gold: 'banana', shop: { hull: -2, amp: 'x', ion: 2.9, midas: 0 } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.gold, 0);
  assert.deepEqual(save.data.shop, { ion: 2 });
  // negative gold also floors to zero; fractional gold floors down
  const neg = JSON.stringify({ v: 4, best: { time: 1, kills: 1 }, settings: { music: true }, gold: -5, shop: {} });
  assert.equal(createSave(memAdapter({ [SAVE_KEY]: neg })).data.gold, 0);
  const frac = JSON.stringify({ v: 4, best: { time: 1, kills: 1 }, settings: { music: true }, gold: 12.7, shop: {} });
  assert.equal(createSave(memAdapter({ [SAVE_KEY]: frac })).data.gold, 12);
});

test('music setting round-trips and corrupt settings sanitize to on', () => {
  const adapter = memAdapter();
  const save = createSave(adapter);
  save.data.settings.music = false;
  save.persist();
  assert.equal(createSave(adapter).data.settings.music, false);
  // a blob with a non-boolean music flag falls back to on
  const bad = JSON.stringify({ v: 3, best: { time: 1, kills: 1 }, settings: { music: 'yes' } });
  assert.equal(createSave(memAdapter({ [SAVE_KEY]: bad })).data.settings.music, true);
});

test('corrupt blob falls back to legacy keys, never loses progress', () => {
  const save = createSave(memAdapter({ [SAVE_KEY]: '{oops', nv_bestT: '77', nv_bestK: '9' }));
  assert.equal(save.data.best.time, 77);
  assert.equal(save.data.best.kills, 9);
});

test('corrupt blob with no legacy keys loads defaults', () => {
  const save = createSave(memAdapter({ [SAVE_KEY]: 'not json at all' }));
  assert.deepEqual(save.data, defaultSave());
});

test('non-numeric or negative legacy values sanitize to zero', () => {
  const save = createSave(memAdapter({ nv_bestT: 'banana', nv_bestK: '-5' }));
  assert.equal(save.data.best.time, 0);
  assert.equal(save.data.best.kills, 0);
});

test('persist then reload round-trips', () => {
  const adapter = memAdapter();
  const save = createSave(adapter);
  save.data.best.time = 240;
  save.data.best.kills = 512;
  save.persist();
  const again = createSave(adapter);
  assert.deepEqual(again.data.best, { time: 240, kills: 512 });
});

test('blob with wrong shape (missing best) falls back safely', () => {
  const save = createSave(memAdapter({ [SAVE_KEY]: JSON.stringify({ v: 2 }), nv_bestT: '11' }));
  assert.equal(save.data.best.time, 11);
});

test('unknown future version without a migration path falls back to defaults', () => {
  const blob = JSON.stringify({ v: 1, best: { time: 5, kills: 5 } });
  // v:1 as a blob never shipped (v1 was raw keys), so there is no 1->2 blob migration.
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.deepEqual(save.data, defaultSave());
});
