// Synchronous pub/sub bus for domain events. Gameplay emits; meta systems subscribe.
// Event names: enemy-killed, level-up-opened, upgrade-chosen, boss-spawned, run-ended.
export function createBus() {
  const map = new Map();
  const bus = {
    on(type, fn) {
      let arr = map.get(type);
      if (!arr) { arr = []; map.set(type, arr); }
      arr.push(fn);
      return () => bus.off(type, fn);
    },
    off(type, fn) {
      const arr = map.get(type);
      if (!arr) return;
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    emit(type, payload) {
      const arr = map.get(type);
      if (!arr) return;
      // snapshot so subscribing/unsubscribing mid-emit cannot skip or double-fire
      for (const fn of arr.slice()) fn(payload);
    },
  };
  return bus;
}

export const bus = createBus();
