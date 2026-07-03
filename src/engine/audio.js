// WebAudio SFX, gesture-gated: initAudio only does work after a user gesture resumes the context.
let AC = null, master = null, lastHitSfx = 0;

export function initAudio() {
  try {
    if (!AC) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      AC = new Ctor();
      master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { AC = null; }
}

function tone(f0, f1, dur, type, vol, delay) {
  if (!AC || AC.state !== 'running') return;
  const t = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(Math.max(1, f0), t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.03);
}

export const sfx = {
  shoot() { tone(760, 320, .05, 'triangle', .03); },
  hit() { const n = performance.now(); if (n - lastHitSfx < 50) return; lastHitSfx = n; tone(520, 260, .05, 'square', .06); },
  kill() { tone(300, 60, .16, 'sawtooth', .13); tone(900, 300, .07, 'square', .06); },
  bigKill() { tone(200, 40, .3, 'sawtooth', .2); tone(1100, 300, .12, 'square', .09); },
  pickup(c) { const f = 520 + Math.min(c, 40) * 14; tone(f, f * 1.9, .07, 'sine', .05); },
  level() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, .14, 'sine', .16, i * .07)); tone(2093, 1568, .3, 'triangle', .05, .28); },
  boss() { tone(60, 34, 1.1, 'sawtooth', .26); tone(233, 110, .5, 'square', .1, .1); tone(233, 110, .5, 'square', .1, .7); },
  dash() { tone(420, 80, .28, 'sawtooth', .14); },
  nova() { tone(80, 340, .32, 'sine', .15); },
  hurt() { tone(200, 50, .26, 'sawtooth', .22); },
  over() { [392, 311, 247, 196].forEach((f, i) => tone(f, f * .94, .3, 'triangle', .18, i * .2)); },
  newbest() { [523, 659, 1046].forEach((f, i) => tone(f, f, .16, 'sine', .18, .9 + i * .09)); },
  tick() { tone(1200, 900, .05, 'square', .05); },
  chest() { tone(240, 480, .35, 'sine', .12); tone(120, 240, .35, 'triangle', .08, .05); },
  evolve() { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, f, .2, 'sine', .17, i * .09)); tone(70, 300, .7, 'sawtooth', .16, .45); },
  lance() { tone(1400, 500, .05, 'sawtooth', .035); },
};
