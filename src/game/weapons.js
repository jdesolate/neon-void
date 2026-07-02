// Weapon runtimes: Pulse Bolt, Orbital Blades, Void Nova.
import { S } from '../state.js';
import { BALANCE } from '../config.js';
import { boltStats, bladeStats, novaStats } from '../content/weapons.js';
import { TAU, clamp, dist2 } from '../utils.js';
import { burst, puff } from '../engine/particles.js';
import { sfx } from '../engine/audio.js';
import { nearestEnemy, damageEnemy } from './enemies.js';

export function updateWeapons(dt) {
  const player = S.player, stats = S.stats, enemies = S.enemies, bolts = S.bolts, novas = S.novas;
  const WB = BALANCE.weapons;

  // --- Pulse Bolt: straight shot -> multishot -> homing, tier colors ---
  const bo = S.weapons.bolt;
  if (bo.lv > 0) {
    bo.t -= dt * stats.aspd;
    if (bo.t <= 0) {
      const tgt = nearestEnemy(player.x, player.y, WB.bolt.range);
      if (tgt) {
        const st = boltStats(bo.lv);
        bo.t = st.interval;
        const base = Math.atan2(tgt.y - player.y, tgt.x - player.x);
        for (let i = 0; i < st.count; i++) {
          const a = base + (i - (st.count - 1) / 2) * WB.bolt.spread;
          bolts.push({ x: player.x, y: player.y, vx: Math.cos(a) * WB.bolt.speed, vy: Math.sin(a) * WB.bolt.speed,
            dmg: st.dmg * stats.dmg, r: st.r,
            homing: st.homing, life: WB.bolt.life, trailT: 0,
            color: st.color });
        }
        sfx.shoot();
      } else bo.t = WB.bolt.retryT;
    }
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life -= dt;
    if (b.life <= 0) { bolts[i] = bolts[bolts.length - 1]; bolts.pop(); continue; }
    if (b.homing) {
      const t = nearestEnemy(b.x, b.y, WB.bolt.homingRange);
      if (t) {
        const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const turn = clamp(da, -WB.bolt.homingTurn * dt, WB.bolt.homingTurn * dt), s = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(cur + turn) * s; b.vy = Math.sin(cur + turn) * s;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.trailT -= dt;
    if (b.trailT <= 0) { b.trailT = S.lowFX ? 0.05 : 0.024; puff(b.x, b.y, b.color, b.r * 1.4, 0.28); }
    let hit = false;
    for (const e of enemies) {
      if (e.dead || e.spawnT > 0.2) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) { damageEnemy(e, b.dmg); hit = true; break; }
    }
    if (hit) {
      burst(b.x, b.y, b.color, 4, 160, 2, 0.3);
      bolts[i] = bolts[bolts.length - 1]; bolts.pop();
    }
  }

  // --- Orbital Blades: count/size/speed/color scale with level ---
  const bl = S.weapons.blade;
  if (bl.lv > 0) {
    const st = bladeStats(bl.lv);
    bl.ang += st.spin * stats.aspd * dt;
    bl.trailT -= dt;
    const doTrail = bl.trailT <= 0;
    if (doTrail) bl.trailT = S.lowFX ? 0.07 : 0.035;
    const dmg = st.dmg * stats.dmg;
    for (let k = 0; k < st.count; k++) {
      const a = bl.ang + k / st.count * TAU;
      const bx = player.x + Math.cos(a) * st.radius, by = player.y + Math.sin(a) * st.radius;
      if (doTrail) puff(bx, by, st.color, st.size * 1.2, 0.3);
      for (const e of enemies) {
        if (e.dead || e.spawnT > 0.2 || e.bladeT > 0) continue;
        const rr = e.r + st.size + 3;
        if (dist2(bx, by, e.x, e.y) < rr * rr) {
          e.bladeT = WB.blade.hitCd;
          damageEnemy(e, dmg);
          if (!e.isBoss) {
            const d = Math.hypot(e.x - player.x, e.y - player.y) || 1;
            e.x += (e.x - player.x) / d * WB.blade.knockback; e.y += (e.y - player.y) / d * WB.blade.knockback;
          }
        }
      }
    }
  }

  // --- Void Nova: expanding ring, double pulse at max level ---
  const nv = S.weapons.nova;
  if (nv.lv > 0) {
    nv.t -= dt * stats.aspd;
    if (nv.echo > 0) { nv.echo -= dt; if (nv.echo <= 0) castNova(); }
    if (nv.t <= 0) {
      nv.t = novaStats(nv.lv).interval;
      castNova();
      if (nv.lv >= WB.nova.echoLv) nv.echo = WB.nova.echoT;
    }
  }
  for (let i = novas.length - 1; i >= 0; i--) {
    const n = novas[i];
    n.r += n.spd * dt;
    if (n.r >= n.maxR) { novas[i] = novas[novas.length - 1]; novas.pop(); continue; }
    for (const e of enemies) {
      if (e.dead || e.spawnT > 0.2 || e.lastNova === n.id) continue;
      const d = Math.hypot(e.x - n.cx, e.y - n.cy);
      if (Math.abs(d - n.r) < e.r + WB.nova.ringWidth) {
        e.lastNova = n.id;
        damageEnemy(e, n.dmg);
        if (!e.isBoss) { const dd = d || 1; e.x += (e.x - n.cx) / dd * WB.nova.knockback; e.y += (e.y - n.cy) / dd * WB.nova.knockback; }
      }
    }
  }
}

export function castNova() {
  const st = novaStats(S.weapons.nova.lv);
  S.novas.push({ cx: S.player.x, cy: S.player.y, r: 10, maxR: st.maxR, spd: st.maxR / BALANCE.weapons.nova.expandT,
    dmg: st.dmg * S.stats.dmg, id: S.novaId++, color: st.color });
  sfx.nova();
  puff(S.player.x, S.player.y, st.color, 60, 0.4);
}
