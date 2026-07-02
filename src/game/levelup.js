// XP gain, level-up flow, and upgrade card UI.
import { S } from '../state.js';
import { BALANCE, xpToNext, comboMult } from '../config.js';
import { UPS } from '../content/upgrades.js';
import { confetti } from '../engine/particles.js';
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
  if (game.pendingLv > 0 && S.state === 'play') openLevelUp();
}

let choices = [];

export function openLevelUp() {
  S.state = 'level'; S.tsT = BALANCE.time.levelSlow;
  S.player.inv = 9999;
  confetti(S.player.x, S.player.y);
  sfx.level();
  buildCards();
  ui.levelup.classList.remove('hidden');
  bus.emit('level-up-opened', { level: S.game.level, choices: choices.map(c => c.id) });
}

function buildCards() {
  const pool = UPS.filter(function (u) { return u.can(); });
  choices = [];
  while (choices.length < 3 && pool.length > 0) {
    choices.push(pool.splice(S.rng.int(pool.length), 1)[0]);
  }
  ui.cards.innerHTML = '';
  choices.forEach(function (u, i) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'card';
    btn.style.animationDelay = (i * 0.09) + 's';
    btn.style.borderColor = u.col + '88';
    btn.style.boxShadow = '0 0 16px ' + u.col + '33, 0 6px 18px rgba(0,0,0,.5)';
    const lvTxt = u.lv ? (u.lv() === 0 ? 'NEW!' : 'LV ' + u.lv() + ' → ' + (u.lv() + 1)) : '+';
    btn.innerHTML = '<span class="cIcon" style="color:' + u.col + ';text-shadow:0 0 10px ' + u.col + '">' + u.icon + '</span>' +
      '<span class="cBody"><span class="cName" style="color:' + u.col + '">' + u.name + '</span>' +
      '<span class="cDesc" style="display:block">' + u.desc() + '</span></span>' +
      '<span class="cLv">' + lvTxt + '</span>';
    btn.addEventListener('click', function () { pickCard(i); });
    ui.cards.appendChild(btn);
  });
}

export function pickCard(i) {
  if (S.state !== 'level' || !choices[i]) return;
  choices[i].app();
  bus.emit('upgrade-chosen', { id: choices[i].id, level: S.game.level });
  S.game.pendingLv--;
  sfx.tick();
  if (S.game.pendingLv > 0) { buildCards(); return; }
  ui.levelup.classList.add('hidden');
  S.state = 'play'; S.tsT = 1; S.player.inv = BALANCE.player.levelupInv;
  updateHUD(true);
}
