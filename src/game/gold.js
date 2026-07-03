// Gold coin drops: tier-rolled from kills, guaranteed bursts from bigs and chests.
// Coins are gameplay entities; the persistent wallet belongs to the economy meta system,
// which hears about pickups through the gold-collected event.
import { S } from '../state.js';
import { BALANCE } from '../config.js';
import { TAU } from '../utils.js';
import { bodySprite } from '../engine/sprites.js';
import { puff, addText } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';

export const COIN = { spr: null, color: '#ffd166' };

export function initGoldSprites() {
  COIN.spr = bodySprite(COIN.color, '#fff6d9', 7, 24, false);
}

export function dropGold(x, y, v) {
  const coins = S.coins, rng = S.rng;
  if (coins.length >= BALANCE.gold.cap) { const old = coins.shift(); v += old.v; }
  coins.push({ x: x + rng.range(-6, 6), y: y + rng.range(-6, 6), v: v,
    vx: rng.range(-50, 50), vy: rng.range(-50, 50), t: rng.range(0, TAU) });
}

// Split a guaranteed amount into a ring of coins (bosses, chest fallback).
export function dropGoldBurst(x, y, total) {
  const G = BALANCE.gold, n = Math.max(1, Math.ceil(total / G.burstCoin));
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, d = S.rng.range(G.burstRingMin, G.burstRingMax);
    dropGold(x + Math.cos(a) * d, y + Math.sin(a) * d, Math.min(G.burstCoin, total - i * G.burstCoin));
  }
}

// Same drift/magnet/pickup motion as gems so coins feel native; distinct look and sound.
export function updateCoins(dt) {
  const coins = S.coins, player = S.player, stats = S.stats, G = BALANCE.gems, GO = BALANCE.gold;
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.t += dt * 5;
    const drag = 1 / (1 + 3 * dt); c.vx *= drag; c.vy *= drag;
    const dx = player.x - c.x, dy = player.y - c.y, dd = Math.hypot(dx, dy) || 1;
    if (c.vac || dd < stats.magnet) {
      // vacuumed coins home at full pull no matter the distance
      const pull = c.vac ? G.pullMax + G.pullBase : G.pullMax * (1 - dd / stats.magnet) + G.pullBase;
      c.vx += dx / dd * pull * dt; c.vy += dy / dd * pull * dt;
      const sp = Math.hypot(c.vx, c.vy);
      if (sp > G.maxSpd) { c.vx *= G.maxSpd / sp; c.vy *= G.maxSpd / sp; }
    }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if (dd < GO.pickupR && !player.dead) {
      const amount = c.v * stats.goldgain;
      S.game.gold += amount;
      sfx.coin();
      puff(c.x, c.y, COIN.color, 10, 0.25);
      if (c.v >= GO.textMin) addText(c.x, c.y - 12, '+' + Math.round(amount) + ' GOLD', false);
      bus.emit('gold-collected', { amount: amount, x: c.x, y: c.y });
      coins[i] = coins[coins.length - 1]; coins.pop();
    }
  }
}
