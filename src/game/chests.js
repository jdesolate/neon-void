// Boss treasure chests: drop entity, slow-mo slot-machine reveal, evolution or gold fallback.
import { S } from '../state.js';
import { BALANCE } from '../config.js';
import { dist2 } from '../utils.js';
import { EVOLUTIONS, pickEvolution } from '../content/evolutions.js';
import { burst, puff, addText, announce, confetti } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { dropGoldBurst } from './gold.js';
import { ui } from './hud.js';

const GOLD_RESULT = { id: 'gold', name: 'GOLD HOARD', icon: '◈', color: '#ffd166', desc: 'A burst of void gold' };
const CANDIDATES = EVOLUTIONS.concat([GOLD_RESULT]);

let reveal = null;

export function resetChests() {
  reveal = null;
  S.chests.length = 0;
  if (ui.chest) ui.chest.classList.add('hidden');
}

export function dropChest(x, y) {
  S.chests.push({ x: x, y: y, t: 0 });
  addText(x, y - 24, 'CHEST!', true);
  sfx.chest();
}

export function updateChests(dt) {
  const C = BALANCE.chest, p = S.player;
  for (const c of S.chests) {
    c.t += dt;
    // cosmetic sparkle so the chest reads as loot from across the screen
    if (Math.random() < dt * 3) puff(c.x + (Math.random() * 2 - 1) * 16, c.y + (Math.random() * 2 - 1) * 16, '#ffd166', 9, 0.4);
  }
  if (S.state !== 'play' || p.dead) return;
  for (let i = S.chests.length - 1; i >= 0; i--) {
    const c = S.chests[i];
    const rr = C.pickupR + p.r;
    if (dist2(c.x, c.y, p.x, p.y) < rr * rr) {
      S.chests.splice(i, 1);
      openChest(c);
      break;
    }
  }
}

function openChest(c) {
  const C = BALANCE.chest;
  S.state = 'chest'; S.tsT = C.slow;
  S.player.inv = 9999;
  reveal = { t: 0, swapT: 0, idx: 0, locked: false, doneT: 0, result: pickEvolution(S.weapons) || GOLD_RESULT };
  burst(c.x, c.y, '#ffd166', 26, 300, 4, 0.7);
  sfx.chest();
  showCandidate(CANDIDATES[0]);
  ui.chestDesc.textContent = '';
  ui.chestSlot.classList.remove('lock');
  ui.chestHint.textContent = 'STABILIZING…';
  ui.chest.classList.remove('hidden');
}

// Runs on real time so the reveal keeps its pace under slow-mo.
export function updateChestReveal(rdt) {
  if (!reveal) return;
  const C = BALANCE.chest, r = reveal;
  r.t += rdt;
  if (!r.locked) {
    r.swapT -= rdt;
    if (r.swapT <= 0) {
      // slot swaps decelerate as the lock approaches
      const p = Math.min(1, r.t / C.cycleT);
      r.swapT = 0.06 + 0.24 * p * p;
      showCandidate(CANDIDATES[r.idx++ % CANDIDATES.length]);
      sfx.tick();
    }
    if (r.t >= C.cycleT) lockReveal();
  } else {
    r.doneT += rdt;
    if (r.doneT >= C.lockT) closeChest();
  }
}

function showCandidate(cand) {
  ui.chestIcon.textContent = cand.icon;
  ui.chestIcon.style.color = cand.color;
  ui.chestIcon.style.textShadow = '0 0 14px ' + cand.color;
  ui.chestName.textContent = cand.name;
  ui.chestName.style.color = cand.color;
}

function lockReveal() {
  const r = reveal, res = r.result;
  r.locked = true;
  showCandidate(res);
  ui.chestDesc.textContent = res.desc;
  ui.chestSlot.classList.add('lock');
  ui.chestHint.textContent = 'TAP OR PRESS ANY KEY';
  if (res.id === 'gold') {
    dropGoldBurst(S.player.x, S.player.y, BALANCE.gold.chest);
    sfx.bigKill();
  } else {
    S.weapons[res.base].evo = true;
    announce(res.name, res.color, 2.6);
    confetti(S.player.x, S.player.y);
    sfx.evolve();
    bus.emit('weapon-evolved', { id: res.id, base: res.base, time: S.game.time });
  }
  bus.emit('chest-opened', { result: res.id === 'gold' ? 'gold' : 'evolution', evo: res.id === 'gold' ? null : res.id, time: S.game.time });
}

export function dismissChest() {
  if (reveal && reveal.locked) closeChest();
}

function closeChest() {
  reveal = null;
  ui.chest.classList.add('hidden');
  S.state = 'play'; S.tsT = 1;
  S.player.inv = BALANCE.player.levelupInv;
}
