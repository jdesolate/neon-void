// Versioned save behind a storage adapter. One key, JSON blob, migration chain on load.
// v1 was two raw localStorage keys (nv_bestT / nv_bestK); v2 is { v: 2, best: { time, kills } };
// v3 adds { settings: { music } } for the audio toggle; v4 adds { gold, shop } for the meta
// economy; v5 adds { settings: { sfx } } for the SFX toggle; v6 adds { ach, life, character }
// for achievements, lifetime counters, and the selected character.
export const SAVE_KEY = 'nv_save';
export const SCHEMA_VERSION = 6;
const LEGACY_KEYS = { time: 'nv_bestT', kills: 'nv_bestK' };

export function localStorageAdapter() {
  return {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
}

export function defaultSettings() {
  return { music: true, sfx: true };
}

export function defaultLife() {
  return { kills: 0, bosses: 0, titans: 0, reapers: 0, elites: 0, evolutions: 0, gold: 0, combo: 0 };
}

export function defaultSave() {
  return { v: SCHEMA_VERSION, best: { time: 0, kills: 0 }, settings: defaultSettings(), gold: 0, shop: {},
    ach: {}, life: defaultLife(), character: 'striker' };
}

function num(v) { const n = +v; return Number.isFinite(n) && n > 0 ? n : 0; }

function readLegacy(adapter) {
  return { time: num(adapter.get(LEGACY_KEYS.time)), kills: num(adapter.get(LEGACY_KEYS.kills)) };
}

// Each entry upgrades from its key's version to the next; run in sequence up to current.
const MIGRATIONS = {
  // v2 -> v3: introduce audio settings, music on by default. Additive, never wipes bests.
  2(data) { return { v: 3, best: data.best, settings: defaultSettings() }; },
  // v3 -> v4: introduce the gold wallet and meta-shop ranks. Additive, never wipes bests.
  3(data) { return { v: 4, best: data.best, settings: data.settings, gold: 0, shop: {} }; },
  // v4 -> v5: introduce the SFX toggle, on by default. Additive, never wipes bests.
  4(data) { return { v: 5, best: data.best, settings: Object.assign({}, data.settings, { sfx: true }), gold: data.gold, shop: data.shop }; },
  // v5 -> v6: introduce achievements, lifetime counters, and the character pick. Additive, never wipes bests.
  5(data) { return { v: 6, best: data.best, settings: data.settings, gold: data.gold, shop: data.shop,
    ach: {}, life: defaultLife(), character: 'striker' }; },
};

function migrateChain(data) {
  let v = data.v;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) return null;
    data = step(data);
    v = data.v;
  }
  return v === SCHEMA_VERSION ? data : null;
}

function load(adapter) {
  const raw = adapter.get(SAVE_KEY);
  if (raw != null) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.v === 'number' && parsed.best) {
        const migrated = migrateChain(parsed);
        if (migrated) {
          migrated.best.time = num(migrated.best.time);
          migrated.best.kills = num(migrated.best.kills);
          if (!migrated.settings || typeof migrated.settings !== 'object') migrated.settings = defaultSettings();
          if (typeof migrated.settings.music !== 'boolean') migrated.settings.music = true;
          if (typeof migrated.settings.sfx !== 'boolean') migrated.settings.sfx = true;
          migrated.gold = Math.floor(num(migrated.gold));
          const shop = {};
          if (migrated.shop && typeof migrated.shop === 'object') {
            for (const k of Object.keys(migrated.shop)) {
              const r = Math.floor(+migrated.shop[k]);
              if (Number.isFinite(r) && r > 0) shop[k] = r;
            }
          }
          migrated.shop = shop;
          const ach = {};
          if (migrated.ach && typeof migrated.ach === 'object') {
            for (const k of Object.keys(migrated.ach)) if (migrated.ach[k]) ach[k] = 1;
          }
          migrated.ach = ach;
          const life = defaultLife();
          if (migrated.life && typeof migrated.life === 'object') {
            for (const k of Object.keys(life)) {
              const n = Math.floor(+migrated.life[k]);
              if (Number.isFinite(n) && n > 0) life[k] = n;
            }
          }
          migrated.life = life;
          if (typeof migrated.character !== 'string' || !migrated.character) migrated.character = 'striker';
          return migrated;
        }
      }
    } catch (e) {}
  }
  // Missing or corrupt blob: fall back to legacy v1 keys so progress is never lost.
  const legacy = readLegacy(adapter);
  const data = defaultSave();
  data.best.time = legacy.time;
  data.best.kills = legacy.kills;
  return data;
}

export function createSave(adapter) {
  const data = load(adapter);
  return {
    data,
    persist() {
      if (adapter.set(SAVE_KEY, JSON.stringify(data))) {
        adapter.remove(LEGACY_KEYS.time);
        adapter.remove(LEGACY_KEYS.kills);
        return true;
      }
      return false;
    },
  };
}
