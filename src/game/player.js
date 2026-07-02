// Player movement, damage, and death.
import { S, addShake } from '../state.js';
import { BALANCE } from '../config.js';
import { inputVec } from '../engine/input.js';
import { burst, puff } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { ui } from './hud.js';

export function updatePlayer(dt) {
  const player = S.player, stats = S.stats;
  if (player.dead) return;
  const v = inputVec();
  player.mvx = v.x; player.mvy = v.y;
  player.x += v.x * stats.spd * dt;
  player.y += v.y * stats.spd * dt;
  const tilt = v.x * 0.16;
  player.tilt += (tilt - player.tilt) * Math.min(1, dt * 10);
  if (v.x || v.y) player.dir = Math.atan2(v.y, v.x);
  if (player.inv > 0) player.inv -= dt;
  player.hp = Math.min(stats.maxhp, player.hp + stats.regen * dt);
  // engine trail while moving
  player.trailT -= dt;
  if ((v.x || v.y) && player.trailT <= 0) {
    player.trailT = S.lowFX ? 0.06 : 0.03;
    puff(player.x - Math.cos(player.dir) * 12, player.y - Math.sin(player.dir) * 12, '#38f0ff', 7, 0.3,
      -Math.cos(player.dir) * 40, -Math.sin(player.dir) * 40);
  }
}

export function damagePlayer(d) {
  const player = S.player;
  if (player.inv > 0 || player.dead || S.state === 'over') return;
  player.hp -= d;
  player.inv = BALANCE.player.hurtInv; S.game.flash = 0.4;
  addShake(9); sfx.hurt();
  burst(player.x, player.y, '#ff5a7a', 8, 200, 3, 0.5);
  if (player.hp <= 0) { player.hp = 0; die(); }
}

export function die() {
  const player = S.player;
  player.dead = true; S.state = 'over'; S.game.overT = 1.0; S.game.overShown = false; S.tsT = BALANCE.time.overSlow;
  S.game.pendingLv = 0; ui.levelup.classList.add('hidden');
  addShake(18); sfx.over();
  burst(player.x, player.y, '#38f0ff', 40, 420, 5, 1.1);
  burst(player.x, player.y, '#ffffff', 20, 300, 3, 0.8);
  ui.timer.classList.remove('warn');
}
