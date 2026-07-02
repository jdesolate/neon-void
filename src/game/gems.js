// XP gem drops, magnet pull, and pickup.
import { S } from '../state.js';
import { BALANCE } from '../config.js';
import { TAU } from '../utils.js';
import { bodySprite } from '../engine/sprites.js';
import { puff } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { gainXP } from './levelup.js';

// Gem visual tiers by value.
export const GEM_KINDS = [
  { min: 0, color: '#5affc8', core: '#eafff7', r: 5 },
  { min: 3, color: '#38b6ff', core: '#e3f4ff', r: 6.5 },
  { min: 6, color: '#ffd166', core: '#fff3d6', r: 8 },
];

export function initGemSprites() {
  GEM_KINDS.forEach(k => { k.spr = bodySprite(k.color, k.core, k.r, 4, false); });
}

export function gemKind(v) { return v >= 6 ? GEM_KINDS[2] : v >= 3 ? GEM_KINDS[1] : GEM_KINDS[0]; }

export function dropGem(x, y, v) {
  const gems = S.gems, rng = S.rng;
  if (gems.length >= BALANCE.gems.cap) { const old = gems.shift(); v += old.v; }
  gems.push({ x: x + rng.range(-6, 6), y: y + rng.range(-6, 6), v: v, vx: rng.range(-40, 40), vy: rng.range(-40, 40), t: rng.range(0, TAU) });
}

export function updateGems(dt) {
  const gems = S.gems, player = S.player, stats = S.stats, G = BALANCE.gems;
  for (let i = gems.length - 1; i >= 0; i--) {
    const g = gems[i];
    g.t += dt * 4;
    const d = 1 / (1 + 3 * dt); g.vx *= d; g.vy *= d;
    const dx = player.x - g.x, dy = player.y - g.y, dd = Math.hypot(dx, dy) || 1;
    if (dd < stats.magnet) {
      const pull = G.pullMax * (1 - dd / stats.magnet) + G.pullBase;
      g.vx += dx / dd * pull * dt; g.vy += dy / dd * pull * dt;
      const sp = Math.hypot(g.vx, g.vy);
      if (sp > G.maxSpd) { g.vx *= G.maxSpd / sp; g.vy *= G.maxSpd / sp; }
    }
    g.x += g.vx * dt; g.y += g.vy * dt;
    if (dd < G.pickupR && !player.dead) {
      gainXP(g.v);
      sfx.pickup(S.game.combo);
      puff(g.x, g.y, gemKind(g.v).color, 10, 0.25);
      gems[i] = gems[gems.length - 1]; gems.pop();
    }
  }
}
