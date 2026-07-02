// Seedable mulberry32 RNG. All gameplay randomness routes through one instance per run
// so the same seed reproduces the same spawn pattern and upgrade offers.
export function randomSeed() {
  return (Math.random() * 4294967296) >>> 0;
}

export function createRng(seed) {
  let s = seed >>> 0;
  const rng = {
    seed: s >>> 0,
    next() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(a, b) { return a + rng.next() * (b - a); },
    int(n) { return Math.floor(rng.next() * n); },
    chance(p) { return rng.next() < p; },
  };
  return rng;
}
