// Achievements meta system: subscribes to domain events on the bus, tracks
// lifetime counters in the save, unlocks threshold rows with a toast, and renders
// the start-screen list. Combat code never imports this module.
import { S } from '../state.js';
import { fmtTime } from '../utils.js';
import { ACHIEVEMENTS, checkUnlocks, achProgress } from '../content/achievements.js';
import { bus } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { ui } from './hud.js';

function life() { return S.save.data.life; }

// Metrics snapshot for the pure checker: lifetime counters plus run-scoped values
// (live mid-run, best-so-far on the menus so the list still shows progress).
function metrics() {
  const L = life(), best = S.save.data.best;
  const idle = S.state === 'start' || S.state === 'shop' || S.state === 'ach';
  return Object.assign({}, L, {
    runKills: idle ? best.kills : S.game.kills,
    time: idle ? best.time : S.game.time,
    combo: Math.max(L.combo, idle ? 0 : S.game.combo),
  });
}

function checkNow() {
  const fresh = checkUnlocks(metrics(), S.save.data.ach);
  for (const a of fresh) unlock(a);
}

function unlock(a) {
  S.save.data.ach[a.id] = 1;
  S.save.persist();
  toast(a);
  sfx.achieve();
  bus.emit('achievement-unlocked', { id: a.id, name: a.name, reward: a.reward || null, time: S.game.time || 0 });
}

// DOM toast above every overlay so unlocks read mid-run and mid-modal.
function toast(a) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<span class="tIcon" style="color:' + a.col + ';text-shadow:0 0 10px ' + a.col + '">' + a.icon + '</span>' +
    '<span class="tBody"><span class="tName" style="color:' + a.col + '">' + a.name + '</span>' +
    '<span class="tSub">ACHIEVEMENT UNLOCKED' + (a.reward ? ' · NEW PILOT' : '') + '</span></span>';
  ui.toasts.appendChild(el);
  setTimeout(function () { el.remove(); }, 3800);
}

export function initAchievements() {
  bus.on('enemy-killed', function (p) {
    const L = life();
    L.kills++;
    if (p.kind === 'boss') L.bosses++;
    if (p.combo > L.combo) L.combo = p.combo;
    checkNow();
  });
  bus.on('elite-killed', function () { life().elites++; checkNow(); });
  bus.on('titan-killed', function () { life().titans++; checkNow(); });
  bus.on('reaper-killed', function () { life().reapers++; checkNow(); });
  bus.on('weapon-evolved', function () { life().evolutions++; checkNow(); });
  bus.on('run-ended', function (p) {
    life().gold += p.gold || 0;
    checkNow();
    S.save.persist(); // counters accumulated during the run land once here
  });
  ui.achBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  ui.achBtn.addEventListener('click', function () { openAch(); });
  ui.achClose.addEventListener('click', function () { closeAch(); });
  // retro-check once at boot: historical bests satisfy run-scoped thresholds
  checkNow();
}

export function openAch() {
  if (S.state !== 'start') return;
  S.state = 'ach';
  renderAch();
  ui.start.classList.add('hidden');
  ui.ach.classList.remove('hidden');
}

export function closeAch() {
  if (S.state !== 'ach') return;
  S.state = 'start';
  ui.ach.classList.add('hidden');
  ui.start.classList.remove('hidden');
}

function renderAch() {
  const un = S.save.data.ach, m = metrics();
  ui.achItems.innerHTML = '';
  ACHIEVEMENTS.forEach(function (a) {
    const got = !!un[a.id];
    const val = Math.min(m[a.stat] || 0, a.goal);
    const prog = a.stat === 'time'
      ? fmtTime(Math.floor(val)) + ' / ' + fmtTime(a.goal)
      : Math.floor(val) + ' / ' + a.goal;
    const row = document.createElement('div');
    row.className = 'achRow' + (got ? ' got' : '');
    row.style.borderColor = a.col + (got ? '88' : '33');
    row.innerHTML = '<span class="cIcon" style="color:' + a.col + ';text-shadow:0 0 10px ' + a.col + '">' + a.icon + '</span>' +
      '<span class="cBody"><span class="cName" style="color:' + a.col + '">' + a.name + '</span>' +
      '<span class="cDesc" style="display:block">' + a.desc + '</span>' +
      '<span class="achBar"><span style="width:' + Math.round(achProgress(a, m) * 100) + '%;background:' + a.col + '"></span></span></span>' +
      '<span class="sRight"><span class="sCost">' + (got ? '✓' : prog) + '</span></span>';
    ui.achItems.appendChild(row);
  });
}

// Debug seam: bump a lifetime counter and re-check, so smoke passes can drive unlocks.
export function bumpLife(stat, n) {
  if (life()[stat] == null) return;
  life()[stat] += n == null ? 1 : n;
  checkNow();
}
