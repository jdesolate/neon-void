import test from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, checkUnlocks, achProgress } from '../src/content/achievements.js';
import { CHARACTERS, charById, activeCharacter, charMults } from '../src/content/characters.js';
import { defaultLife } from '../src/engine/save.js';
import { BALANCE } from '../src/config.js';

function zeroMetrics() {
  return Object.assign(defaultLife(), { runKills: 0, time: 0 });
}

test('achievement rows are integral: unique ids, goals from BALANCE, known stats', () => {
  assert.ok(ACHIEVEMENTS.length >= 10);
  const ids = new Set(ACHIEVEMENTS.map(a => a.id));
  assert.equal(ids.size, ACHIEVEMENTS.length);
  const stats = new Set(Object.keys(zeroMetrics()));
  for (const a of ACHIEVEMENTS) {
    assert.ok(stats.has(a.stat), a.id + ' tracks unknown stat ' + a.stat);
    assert.equal(a.goal, BALANCE.achievements.goals[a.id], a.id + ' goal must live in BALANCE');
    assert.ok(a.goal > 0 && a.name && a.desc && a.icon && a.col);
  }
});

test('rewards reference real characters, and the second character is achievement-gated', () => {
  const charIds = new Set(CHARACTERS.map(c => c.id));
  for (const a of ACHIEVEMENTS) if (a.reward) assert.ok(charIds.has(a.reward));
  // exactly one row hands out the second character
  assert.equal(ACHIEVEMENTS.filter(a => a.reward).length, 1);
  const second = CHARACTERS[1];
  assert.ok(ACHIEVEMENTS.some(a => a.id === second.unlock && a.reward === second.id));
});

test('below every threshold nothing unlocks; at a threshold exactly that row unlocks', () => {
  assert.deepEqual(checkUnlocks(zeroMetrics(), {}), []);
  for (const a of ACHIEVEMENTS) {
    const m = zeroMetrics();
    m[a.stat] = a.goal - 1;
    assert.ok(!checkUnlocks(m, {}).some(r => r.id === a.id), a.id + ' unlocked below goal');
    m[a.stat] = a.goal;
    assert.ok(checkUnlocks(m, {}).some(r => r.id === a.id), a.id + ' did not unlock at goal');
  }
});

test('already-unlocked rows never re-unlock', () => {
  const m = zeroMetrics();
  m.kills = 1e9; m.runKills = 1e9; m.time = 1e9; m.gold = 1e9; m.combo = 1e9;
  m.bosses = 1e9; m.titans = 1e9; m.reapers = 1e9; m.elites = 1e9; m.evolutions = 1e9;
  const all = checkUnlocks(m, {});
  assert.equal(all.length, ACHIEVEMENTS.length);
  const unlocked = {};
  for (const a of all) unlocked[a.id] = 1;
  assert.deepEqual(checkUnlocks(m, unlocked), []);
});

test('several thresholds crossed at once unlock together', () => {
  const m = zeroMetrics();
  const kills = ACHIEVEMENTS.filter(a => a.stat === 'kills');
  m.kills = Math.max(...kills.map(a => a.goal));
  const fresh = checkUnlocks(m, {});
  for (const a of kills) assert.ok(fresh.some(r => r.id === a.id));
});

test('achProgress clamps to [0, 1] and grows with the metric', () => {
  const a = ACHIEVEMENTS[0];
  const m = zeroMetrics();
  assert.equal(achProgress(a, m), 0);
  m[a.stat] = a.goal / 2;
  assert.ok(Math.abs(achProgress(a, m) - 0.5) < 1e-9);
  m[a.stat] = a.goal * 3;
  assert.equal(achProgress(a, m), 1);
});

test('character rows are integral and multipliers live in BALANCE', () => {
  assert.equal(CHARACTERS.length, 2);
  assert.equal(new Set(CHARACTERS.map(c => c.id)).size, 2);
  assert.equal(CHARACTERS[0].unlock, null, 'default character must be free');
  assert.ok(CHARACTERS[1].unlock, 'second character must be achievement-gated');
  for (const c of CHARACTERS) {
    assert.ok(['bolt', 'blade', 'nova'].includes(c.weapon));
    const m = charMults(c.id);
    assert.ok(m.spdMul > 0 && m.hpMul > 0 && m.startLv >= 1);
  }
  // vanguard trades hull for speed, per the session plan
  assert.ok(Math.abs(charMults('vanguard').spdMul - 1.2) < 1e-9);
  assert.ok(Math.abs(charMults('vanguard').hpMul - 0.8) < 1e-9);
});

test('activeCharacter falls back to the default when locked or unknown', () => {
  const vg = CHARACTERS[1];
  assert.equal(activeCharacter(vg.id, {}).id, CHARACTERS[0].id);
  assert.equal(activeCharacter(vg.id, null).id, CHARACTERS[0].id);
  assert.equal(activeCharacter('nonsense', {}).id, CHARACTERS[0].id);
  const un = {}; un[vg.unlock] = 1;
  assert.equal(activeCharacter(vg.id, un).id, vg.id);
  assert.equal(charById(vg.id).id, vg.id);
});
