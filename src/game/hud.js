// DOM HUD/overlay bindings and game-over stats. Reads run state, writes DOM.
import { S } from '../state.js';
import { clamp, fmtTime } from '../utils.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { EVOLUTIONS } from '../content/evolutions.js';

const $ = function (id) { return document.getElementById(id); };
export const ui = {
  xp: $('xpfill'), hp: $('hpfill'), lvl: $('lvltag'), timer: $('timer'), threat: $('threat'), kills: $('kills'),
  combo: $('combo'), comboX: $('comboX'), start: $('start'), bestLine: $('bestLine'), levelup: $('levelup'), cards: $('cards'),
  over: $('over'), nbTime: $('nbTime'), nbKills: $('nbKills'), goTime: $('goTime'), goKills: $('goKills'), goBest: $('goBest'), restart: $('restartBtn'),
  chest: $('chest'), chestSlot: $('chestSlot'), chestIcon: $('chestIcon'), chestName: $('chestName'), chestDesc: $('chestDesc'), chestHint: $('chestHint'),
  music: $('musicBtn'),
};

export function showBestLine() {
  const b = S.save.data.best;
  ui.bestLine.textContent = b.time > 0 ? ('BEST ' + fmtTime(b.time) + '  ·  ' + b.kills + ' KILLS — BEAT IT') : 'FIRST RUN — SET THE BAR';
}

const hudCache = { hp: -1, xp: -1, lvl: -1, timer: '', kills: -1, combo: -1 };
export function updateHUD(force) {
  const hpP = Math.round(clamp(S.player.hp / S.stats.maxhp, 0, 1) * 100);
  if (force || hpP !== hudCache.hp) { hudCache.hp = hpP; ui.hp.style.width = hpP + '%'; }
  const xpP = Math.round(clamp(S.game.xp / S.game.next, 0, 1) * 100);
  if (force || xpP !== hudCache.xp) { hudCache.xp = xpP; ui.xp.style.width = xpP + '%'; }
  if (force || S.game.level !== hudCache.lvl) { hudCache.lvl = S.game.level; ui.lvl.textContent = 'LV ' + S.game.level; }
  const tStr = fmtTime(S.game.time);
  if (force || tStr !== hudCache.timer) { hudCache.timer = tStr; ui.timer.textContent = tStr; }
  if (force || S.game.kills !== hudCache.kills) {
    hudCache.kills = S.game.kills;
    ui.kills.innerHTML = S.game.kills + '<small>KILLS</small>';
  }
  if (force || S.game.combo !== hudCache.combo) {
    hudCache.combo = S.game.combo;
    if (S.game.combo >= 2) {
      ui.combo.style.opacity = '1';
      ui.comboX.textContent = '×' + S.game.combo;
      const heat = Math.min(1, S.game.combo / 40);
      ui.comboX.style.textShadow = '0 0 ' + (8 + heat * 22) + 'px rgba(255,224,102,' + (0.6 + heat * 0.4) + ')';
    } else ui.combo.style.opacity = '0';
  }
  if (S.game.combo >= 2) {
    ui.combo.style.transform = 'scale(' + (1 + S.game.comboPulse * 0.3).toFixed(3) + ')';
  }
  if (force) { ui.threat.textContent = 'THREAT ' + S.game.threat; }
}

export function showGameOver() {
  S.game.overShown = true;
  const b = S.save.data.best;
  const t = Math.floor(S.game.time), k = S.game.kills;
  const nbT = t > b.time, nbK = k > b.kills;
  ui.nbTime.classList.toggle('hidden', !nbT);
  ui.nbKills.classList.toggle('hidden', !nbK);
  ui.goTime.textContent = fmtTime(t);
  ui.goKills.textContent = String(k);
  ui.goBest.textContent = (b.time > 0) ? ('PREVIOUS BEST ' + fmtTime(b.time) + ' · ' + b.kills + ' KILLS') : '';
  if (nbT || nbK) {
    b.time = Math.max(t, b.time); b.kills = Math.max(k, b.kills);
    S.save.persist();
    sfx.newbest();
  }
  ui.over.classList.remove('hidden');
  bus.emit('run-ended', {
    time: t, kills: k, level: S.game.level, seed: S.game.seed,
    evolutions: EVOLUTIONS.filter(function (ev) { return S.weapons[ev.base] && S.weapons[ev.base].evo; }).map(function (ev) { return ev.id; }),
    titansKilled: S.game.titansKilled, reaperSlain: !!S.game.reaperSlain,
    newBestTime: nbT, newBestKills: nbK, bestTime: b.time, bestKills: b.kills,
  });
}
