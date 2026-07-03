// Rare pickup entities and their effects: heal, gem vacuum, screen bomb.
// Drops roll off the enemy-killed event (seeded, synchronous) so combat code
// never imports this module and the import graph stays cycle-free.
import { S, addShake } from '../state.js';
import { BALANCE } from '../config.js';
import { dist2 } from '../utils.js';
import { PICKUPS, rollPickup } from '../content/pickups.js';
import { burst, puff, ring, addText } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { damageEnemy } from './enemies.js';

export function initPickups() {
  bus.on('enemy-killed', function (e) {
    if (e.isBoss || e.elite) return;
    const row = rollPickup(S.rng.next());
    if (row) dropPickup(e.x, e.y, row.id);
  });
}

export function resetPickups() { S.pickups.length = 0; }

export function dropPickup(x, y, id) {
  let row = null;
  for (const r of PICKUPS) if (r.id === id) row = r;
  if (!row) return;
  if (S.pickups.length >= BALANCE.pickups.cap) S.pickups.shift();
  S.pickups.push({ x: x, y: y, row: row, t: 0 });
  addText(x, y - 20, row.name, true);
  sfx.tick();
}

export function updatePickups(dt) {
  const P = BALANCE.pickups, p = S.player;
  for (const u of S.pickups) u.t += dt;
  if (S.state !== 'play' || p.dead) return;
  for (let i = S.pickups.length - 1; i >= 0; i--) {
    const u = S.pickups[i];
    const rr = P.pickupR + p.r;
    if (dist2(u.x, u.y, p.x, p.y) < rr * rr) {
      S.pickups.splice(i, 1);
      applyPickup(u);
    }
  }
}

function applyPickup(u) {
  const id = u.row.id, P = BALANCE.pickups;
  if (id === 'heal') {
    const amt = Math.round(S.stats.maxhp * P.healPct);
    S.player.hp = Math.min(S.stats.maxhp, S.player.hp + amt);
    addText(S.player.x, S.player.y - 24, '+' + amt + ' HP', true);
    puff(S.player.x, S.player.y, u.row.color, 40, 0.5);
    sfx.powerup();
  } else if (id === 'magnet') {
    // every gem and coin homes in until picked up, regardless of magnet range
    for (const g of S.gems) g.vac = true;
    for (const c of S.coins) c.vac = true;
    ring(S.player.x, S.player.y, u.row.color, 280, 0.5);
    sfx.powerup();
  } else {
    screenBomb(u.x, u.y, u.row.color);
  }
  bus.emit('pickup-collected', { id: id, x: u.x, y: u.y, time: S.game.time });
}

// Heavy percent damage plus stagger and shove for everything on screen; bosses
// take a trimmed chunk so the bomb stays a panic button, not a boss killer.
function screenBomb(x, y, color) {
  const B = BALANCE.pickups.bomb, cam = S.cam;
  const hw = S.W / 2 + B.margin, hh = S.H / 2 + B.margin;
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (Math.abs(e.x - cam.x) > hw || Math.abs(e.y - cam.y) > hh) continue;
    if (!e.isBoss) {
      e.stagT = B.stagger;
      const d = Math.hypot(e.x - x, e.y - y) || 1;
      e.x += (e.x - x) / d * B.knock; e.y += (e.y - y) / d * B.knock;
    }
    damageEnemy(e, e.isBoss ? e.maxhp * B.bossPct : Math.max(B.min, e.maxhp * B.pct));
  }
  S.game.bombFlash = 0.5;
  addShake(20);
  ring(x, y, color, Math.max(S.W, S.H) * 0.7, 0.6);
  ring(x, y, '#ffffff', Math.max(S.W, S.H) * 0.45, 0.45);
  burst(x, y, color, 40, 520, 5, 0.8);
  sfx.bomb();
}
