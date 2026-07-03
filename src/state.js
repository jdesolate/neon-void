// All mutable run/session state in one shared object so modules stay import-cycle-safe.
export const S = {
  state: 'start',              // start | shop | play | level | chest | over
  ts: 1, tsT: 1, freeze: 0,    // timescale, target, hit-stop seconds
  shake: 0,
  elapsed: 0, frameAvg: 16, lowFX: false,
  W: 0, H: 0, DPR: 1,
  cam: { x: 0, y: 0, ox: 0, oy: 0 },
  enemies: [], bolts: [], gems: [], coins: [], novas: [], chests: [],
  player: {}, stats: {}, weapons: {}, game: {},
  novaId: 1,
  cv: null, ctx: null,
  rng: null,                   // seeded gameplay RNG, re-created each run
  save: null,
  options: {},
};

export function addShake(a) { S.shake = Math.min(26, S.shake + a); }
