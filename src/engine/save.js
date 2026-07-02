// Versioned save behind a storage adapter. One key, JSON blob, migration chain on load.
// v1 was two raw localStorage keys (nv_bestT / nv_bestK); v2 is { v: 2, best: { time, kills } }.
export const SAVE_KEY = 'nv_save';
export const SCHEMA_VERSION = 2;
const LEGACY_KEYS = { time: 'nv_bestT', kills: 'nv_bestK' };

export function localStorageAdapter() {
  return {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    remove(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
}

export function defaultSave() {
  return { v: SCHEMA_VERSION, best: { time: 0, kills: 0 } };
}

function num(v) { const n = +v; return Number.isFinite(n) && n > 0 ? n : 0; }

function readLegacy(adapter) {
  return { time: num(adapter.get(LEGACY_KEYS.time)), kills: num(adapter.get(LEGACY_KEYS.kills)) };
}

// Each entry upgrades from its key's version to the next; run in sequence up to current.
const MIGRATIONS = {};

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
