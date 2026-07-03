// XP gain, level-up flow, and upgrade card UI.
import { S } from '../state.js';
import { BALANCE, xpToNext, comboMult } from '../config.js';
import { UPS, rollUpgrades } from '../content/upgrades.js';
import { EVOLUTIONS } from '../content/evolutions.js';
import { confetti, addText } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { ui, updateHUD } from './hud.js';

export function gainXP(v) {
  const game = S.game;
  game.xp += v * S.stats.xpgain * comboMult(game.combo);
  while (game.xp >= game.next) {
    game.xp -= game.next; game.level++;
    game.next = xpToNext(game.level);
    game.pendingLv++;
  }
  if (game.pendingLv === 0 || S.state !== 'play') return;
  // burst leveling must never trap the player in the modal: only the first
  // pending level may open cards, and never twice within the cooldown window
  while (game.pendingLv > 1) autoPick();
  if (game.time - game.lvModalAt < BALANCE.levelup.modalCooldown) { autoPick(); return; }
  openLevelUp();
}

// Live upgrade pool: capped cards excluded by their gates, banished ids gone for the run.
function livePool() {
  return UPS.filter(function (u) { return u.can() && S.game.banished.indexOf(u.id) === -1; });
}

function autoPick() {
  const game = S.game;
  const pool = livePool();
  game.pendingLv--;
  if (pool.length === 0) return;
  const u = pool[S.rng.int(pool.length)];
  u.app();
  bus.emit('upgrade-chosen', { id: u.id, level: game.level, auto: true });
  addText(S.player.x, S.player.y - S.player.r - 10, u.name, false);
  sfx.tick();
  updateHUD(true);
}

let choices = [];

const evoByBase = {};
EVOLUTIONS.forEach(function (ev) { evoByBase[ev.base] = ev; });

export function openLevelUp() {
  S.state = 'level'; S.tsT = BALANCE.time.levelSlow;
  S.game.lvModalAt = S.game.time;
  S.player.inv = 9999;
  banishArmed = false;
  confetti(S.player.x, S.player.y);
  sfx.level();
  buildCards();
  syncLuBtns();
  ui.levelup.classList.remove('hidden');
  bus.emit('level-up-opened', { level: S.game.level, choices: choices.map(c => c.id) });
}

function buildCards() {
  choices = rollUpgrades(livePool(), S.rng);
  ui.cards.innerHTML = '';
  choices.forEach(function (u, i) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'card';
    btn.style.animationDelay = (i * 0.09) + 's';
    btn.style.borderColor = u.col + '88';
    btn.style.boxShadow = '0 0 16px ' + u.col + '33, 0 6px 18px rgba(0,0,0,.5)';
    const lvTxt = u.lv ? (u.lv() === 0 ? 'NEW!' : 'LV ' + u.lv() + ' → ' + (u.lv() + 1)) : '+';
    // weapon cards advertise their evolution so builds can be planned (PRD story 9)
    const ev = evoByBase[u.id];
    const evoTxt = ev ? '<span class="cEvo" style="color:' + ev.color + '">LV ' + BALANCE.weapons.maxLv + ' + BOSS CHEST → ' + ev.name + '</span>' : '';
    btn.innerHTML = '<span class="cIcon" style="color:' + u.col + ';text-shadow:0 0 10px ' + u.col + '">' + u.icon + '</span>' +
      '<span class="cBody"><span class="cName" style="color:' + u.col + '">' + u.name + '</span>' +
      '<span class="cDesc" style="display:block">' + u.desc() + '</span>' + evoTxt + '</span>' +
      '<span class="cLv">' + lvTxt + '</span>';
    btn.addEventListener('click', function () { pickCard(i); });
    ui.cards.appendChild(btn);
  });
}

/* ---------- reroll / banish (1 each per run) ---------- */
let banishArmed = false;

function syncLuBtns() {
  ui.reroll.textContent = '⟳ REROLL ×' + S.game.rerolls;
  ui.reroll.disabled = S.game.rerolls <= 0;
  ui.banish.textContent = banishArmed ? '✕ PICK A CARD' : '✕ BANISH ×' + S.game.banishes;
  ui.banish.disabled = S.game.banishes <= 0;
  ui.banish.classList.toggle('armed', banishArmed);
  ui.luHint.textContent = banishArmed
    ? 'TAP A CARD TO REMOVE IT FROM THIS RUN'
    : 'CHOOSE ONE — KEYS 1 / 2 / 3 · R REROLL · B BANISH';
}

export function initLevelUp() {
  ui.reroll.addEventListener('click', function () { rerollCards(); });
  ui.banish.addEventListener('click', function () { toggleBanish(); });
}

export function rerollCards() {
  if (S.state !== 'level' || S.game.rerolls <= 0) return;
  S.game.rerolls--;
  banishArmed = false;
  buildCards();
  syncLuBtns();
  sfx.tick();
}

export function toggleBanish() {
  if (S.state !== 'level' || S.game.banishes <= 0) return;
  banishArmed = !banishArmed;
  syncLuBtns();
  sfx.tick();
}

export function banishCard(i) {
  if (S.state !== 'level' || S.game.banishes <= 0 || !choices[i]) return;
  S.game.banishes--;
  S.game.banished.push(choices[i].id);
  banishArmed = false;
  buildCards();
  syncLuBtns();
  sfx.tick();
}

export function pickCard(i) {
  if (S.state !== 'level' || !choices[i]) return;
  if (banishArmed) { banishCard(i); return; }
  choices[i].app();
  bus.emit('upgrade-chosen', { id: choices[i].id, level: S.game.level });
  S.game.pendingLv--;
  sfx.tick();
  if (S.game.pendingLv > 0) { buildCards(); return; }
  ui.levelup.classList.add('hidden');
  S.state = 'play'; S.tsT = 1; S.player.inv = BALANCE.player.levelupInv;
  updateHUD(true);
}
