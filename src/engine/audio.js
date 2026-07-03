// WebAudio SFX + procedural BGM, gesture-gated: initAudio only does work after a user gesture resumes the context.
let AC = null, master = null, lastHitSfx = 0, lastCoinSfx = 0;

export function initAudio() {
  try {
    if (!AC) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      AC = new Ctor();
      master = AC.createGain(); master.gain.value = 0.5; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    music.start();
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
  coin() { const n = performance.now(); if (n - lastCoinSfx < 60) return; lastCoinSfx = n; tone(1050, 1500, .06, 'sine', .05); tone(1580, 1580, .05, 'sine', .035, .04); },
  buy() { tone(660, 990, .12, 'sine', .12); tone(1320, 1760, .12, 'sine', .08, .08); },
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
  // grim super-boss stings
  titan() { tone(70, 32, 1.4, 'sawtooth', .3); tone(180, 60, .8, 'square', .12, .15); tone(300, 120, .5, 'square', .08, .5); },
  reaper() { tone(48, 26, 2.2, 'sawtooth', .34); tone(150, 70, 1.4, 'square', .14, .2); tone(92, 40, 1.6, 'triangle', .16, .5); },
  reaperWarn() { tone(60, 40, .26, 'sine', .3); tone(60, 40, .26, 'sine', .3, .5); tone(54, 34, .45, 'sine', .34, 1.05); },
};

/* ---------- procedural BGM ---------- */
// Zero-asset synthesized music: a lookahead scheduler arpeggiates the current mood's
// scale over a root, with bass on downbeats and a low drone for the reaper. Muting only
// touches musicGain, so SFX stay audible.
let musicGain = null, musicOn = true, musicStarted = false, schedId = 0;
let nextNote = 0, stepIx = 0, curMood = 'menu';

function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

// spb = seconds per 16th step; darker scales + faster tempo as threat rises.
const MOODS = {
  menu: { spb: 0.30, root: 45, steps: [0, 7, 12, 7, 3, 10, 7, 3], bass: false, drone: false, wave: 'sine', vol: 0.9 },
  run: { spb: 0.22, root: 45, steps: [0, 7, 12, 15, 12, 7, 10, 3], bass: true, drone: false, wave: 'triangle', vol: 1.0 },
  boss: { spb: 0.17, root: 40, steps: [0, 6, 7, 12, 13, 7, 6, 1], bass: true, drone: false, wave: 'sawtooth', vol: 1.1 },
  reaper: { spb: 0.14, root: 33, steps: [0, 1, 6, 7, 6, 1, 12, 6], bass: true, drone: true, wave: 'sawtooth', vol: 1.2 },
};

function voice(time, freq, dur, wave, vol) {
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = wave; o.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(vol, time + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g); g.connect(musicGain); o.start(time); o.stop(time + dur + 0.02);
}

function scheduler() {
  if (!AC || AC.state !== 'running' || !musicGain) return;
  const M = MOODS[curMood];
  while (nextNote < AC.currentTime + 0.12) {
    if (musicOn) {
      const s = M.steps[stepIx % M.steps.length];
      voice(nextNote, midiFreq(M.root + 12 + s), M.spb * 1.6, M.wave, 0.05 * M.vol);
      if (M.bass && stepIx % 4 === 0) voice(nextNote, midiFreq(M.root - 12), M.spb * 3.5, 'sine', 0.11 * M.vol);
      if (M.drone && stepIx % 8 === 0) voice(nextNote, midiFreq(M.root - 24), M.spb * 8, 'sawtooth', 0.06 * M.vol);
    }
    nextNote += M.spb; stepIx++;
  }
}

export const music = {
  start() {
    if (musicStarted || !AC) return;
    musicGain = AC.createGain();
    musicGain.gain.value = musicOn ? 0.5 : 0.0001;
    musicGain.connect(AC.destination);
    nextNote = AC.currentTime + 0.1; stepIx = 0;
    schedId = setInterval(scheduler, 40);
    musicStarted = true;
  },
  setMood(m) { if (MOODS[m]) curMood = m; },
  setEnabled(on) {
    musicOn = !!on;
    if (musicGain && AC) {
      musicGain.gain.cancelScheduledValues(AC.currentTime);
      musicGain.gain.setTargetAtTime(musicOn ? 0.5 : 0.0001, AC.currentTime, 0.05);
    }
  },
  enabled() { return musicOn; },
};
