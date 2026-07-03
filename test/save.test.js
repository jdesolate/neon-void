import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, defaultSave, SAVE_KEY, SCHEMA_VERSION } from '../src/engine/save.js';

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
  assert.deepEqual(stored, { v: 3, best: { time: 123, kills: 45 }, settings: { music: true } });
});

test('v2 blob migrates to v3, adding default settings without touching bests', () => {
  const blob = JSON.stringify({ v: 2, best: { time: 300, kills: 88 } });
  const save = createSave(memAdapter({ [SAVE_KEY]: blob }));
  assert.equal(save.data.v, 3);
  assert.deepEqual(save.data.best, { time: 300, kills: 88 });
  assert.equal(save.data.settings.music, true);
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
