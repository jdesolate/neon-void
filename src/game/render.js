// World and screen-space rendering: background, entities, FX overlays, touch joystick.
import { S } from '../state.js';
import { TAU, clamp } from '../utils.js';
import { glowDot, starTile } from '../engine/sprites.js';
import { drawParts, drawTexts, drawAnns } from '../engine/particles.js';
import { TOUCH, joy } from '../engine/input.js';
import { bladeStats } from '../content/weapons.js';
import { gemKind } from './gems.js';
import { COIN } from './gold.js';

/* ---------- parallax background ---------- */
const starLayers = [
  { img: starTile(60, 0.4, 1.1, '#7d8fd6', 3), par: 0.12, a: 0.55, tw: 0.7 },
  { img: starTile(38, 0.8, 1.7, '#a9d9ff', 5), par: 0.30, a: 0.75, tw: 1.1 },
  { img: starTile(22, 1.2, 2.3, '#eaf7ff', 7), par: 0.55, a: 0.95, tw: 1.7 },
];
let bgGrad = null, vignette = null, bgH = 0, bgW = 0;

function rebuildBG() {
  const ctx = S.ctx, W = S.W, H = S.H;
  bgW = W; bgH = H;
  bgGrad = ctx.createLinearGradient(0, 0, W * 0.25, H);
  bgGrad.addColorStop(0, '#0a0620'); bgGrad.addColorStop(0.55, '#070516'); bgGrad.addColorStop(1, '#02020a');
  vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.38, W / 2, H / 2, Math.max(W, H) * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,8,0.55)');
}

export function drawBackground() {
  const ctx = S.ctx, W = S.W, H = S.H, cam = S.cam;
  if (bgW !== W || bgH !== H) rebuildBG();
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  // parallax star layers, tiled and twinkling
  for (const L of starLayers) {
    const ox = ((-cam.x * L.par) % 512 + 512) % 512 - 512, oy = ((-cam.y * L.par) % 512 + 512) % 512 - 512;
    ctx.globalAlpha = L.a * (0.82 + 0.18 * Math.sin(S.elapsed * L.tw));
    for (let x = ox; x < W; x += 512) for (let y = oy; y < H; y += 512) ctx.drawImage(L.img, x, y);
  }
  ctx.globalAlpha = 1;
  // faint grid anchors the world plane
  const sp = 140, p = 0.82;
  const gx = ((-cam.x * p) % sp + sp) % sp, gy = ((-cam.y * p) % sp + sp) % sp;
  ctx.strokeStyle = 'rgba(90,150,255,0.05)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = gx; x < W; x += sp) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = gy; y < H; y += sp) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

/* ---------- world ---------- */
function onScreen(x, y, m) {
  const cam = S.cam;
  return x > cam.x - S.W / 2 - m && x < cam.x + S.W / 2 + m && y > cam.y - S.H / 2 - m && y < cam.y + S.H / 2 + m;
}

function drawEnemy(e) {
  if (!onScreen(e.x, e.y, 80)) return;
  const ctx = S.ctx;
  const spawnMax = e.isBoss ? 0.6 : 0.35;
  let s = 1, alpha = 1;
  if (e.spawnT > 0) {
    const p = 1 - e.spawnT / spawnMax;
    s = p < 0.6 ? (p / 0.6) * 1.25 : 1.25 - 0.25 * ((p - 0.6) / 0.4);
    alpha = Math.min(1, p * 2);
  }
  if (e.dead) {
    const f = Math.max(0, e.dieT / 0.14);
    s = 1 + (1 - f) * 0.7; alpha = f;
  }
  const rot = e.isBoss ? e.rot : Math.sin(S.elapsed * 1.3 + e.wob) * 0.3 + e.rot * S.elapsed;
  const half = e.spr.size / 2, bs = e.sprScale || 1;
  ctx.save();
  ctx.translate(e.x, e.y);
  // dark menace aura behind the super-bosses so they read as wrong from afar
  if (e.isBoss && e.aura && !S.lowFX) {
    const ar = e.r * (1.7 + 0.12 * Math.sin(S.elapsed * 3));
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.28;
    ctx.drawImage(glowDot(e.aura), -ar, -ar, ar * 2, ar * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  ctx.rotate(rot);
  ctx.scale(e.sx * s * bs, e.sy * s * bs);
  ctx.globalAlpha = alpha;
  ctx.drawImage(e.spr.img, -half, -half);
  if (e.hitT > 0) { ctx.globalAlpha = alpha * (e.hitT / 0.09); ctx.drawImage(e.flash.img, -half, -half); }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBossExtras(b) {
  const ctx = S.ctx, col = b.aura || '#ff4030';
  if (b.phase === 'tele') {
    const p = 1 - b.pt / 0.9, pulse = 0.5 + 0.5 * Math.sin(S.elapsed * 22);
    ctx.save();
    ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = S.lowFX ? 0 : 22;
    ctx.globalAlpha = 0.55 * (0.6 + 0.4 * pulse);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 + p * 1.6), 0, TAU); ctx.stroke();
    // aim corridor toward the locked dash target
    ctx.globalAlpha = 0.14; ctx.lineWidth = b.r * 1.6;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke();
    ctx.globalAlpha = 0.7 * pulse; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.tx, b.ty); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.tx, b.ty, 22 + 8 * pulse, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // HP bar, scaled a touch wider for the bigger super-bosses
  const w = b.kind === 'boss' ? 96 : 132, f = clamp(b.hp / b.maxhp, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(20,5,10,0.7)';
  ctx.fillRect(b.x - w / 2, b.y - b.r - 22, w, 7);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = S.lowFX ? 0 : 8;
  ctx.fillRect(b.x - w / 2 + 1, b.y - b.r - 21, (w - 2) * f, 5);
  ctx.restore();
}

function drawPlayer() {
  const ctx = S.ctx, player = S.player;
  if (player.dead) return;
  const flicker = player.inv > 0 && player.inv < 100 ? (Math.sin(S.elapsed * 40) > 0 ? 0.35 : 1) : 1;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalAlpha = flicker;
  const g = glowDot('#38f0ff'), gr = 34;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(g, -gr, -gr, gr * 2, gr * 2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.rotate(player.tilt);
  const moving = player.mvx || player.mvy;
  ctx.shadowColor = '#38f0ff'; ctx.shadowBlur = S.lowFX ? 0 : 16;
  // hull: rounded diamond leaning with motion
  ctx.fillStyle = '#0e2b3d';
  ctx.strokeStyle = '#7df3ff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.quadraticCurveTo(11, -3, 0, 14); ctx.quadraticCurveTo(-11, -3, 0, -14);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  const core = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9);
  core.addColorStop(0, '#ffffff'); core.addColorStop(1, '#38f0ff');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(0, 0, 5.5 + (moving ? Math.sin(S.elapsed * 14) * 0.7 : 0), 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawChests() {
  const ctx = S.ctx;
  for (const c of S.chests) {
    if (!onScreen(c.x, c.y, 60)) continue;
    const y = c.y + Math.sin(c.t * 3) * 4, pulse = 0.8 + 0.2 * Math.sin(S.elapsed * 5);
    const s = 40 * pulse;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowDot('#ffd166'), c.x - s, y - s, s * 2, s * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.translate(c.x, y); ctx.rotate(Math.PI / 4);
    ctx.shadowColor = '#ffd166'; ctx.shadowBlur = S.lowFX ? 0 : 14;
    ctx.fillStyle = '#3a2a08';
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
    ctx.fillRect(-13, -13, 26, 26); ctx.strokeRect(-13, -13, 26, 26);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffe9b0';
    ctx.fillRect(-13, -3, 26, 6);
    ctx.restore();
  }
}

export function drawWorld() {
  const ctx = S.ctx;
  drawChests();
  // gems
  ctx.globalCompositeOperation = 'lighter';
  for (const g of S.gems) {
    if (!onScreen(g.x, g.y, 40)) continue;
    const k = gemKind(g.v), s = (k.spr.size / 2) * (0.85 + 0.15 * Math.sin(g.t));
    ctx.drawImage(k.spr.img, g.x - s, g.y - s, s * 2, s * 2);
  }
  // gold coins: flipping discs so they read differently from the diamond gems
  for (const c of S.coins) {
    if (!onScreen(c.x, c.y, 40)) continue;
    const half = COIN.spr.size / 2, f = 0.3 + 0.7 * Math.abs(Math.sin(c.t));
    ctx.drawImage(COIN.spr.img, c.x - half * f, c.y - half, half * 2 * f, half * 2);
  }
  // nova rings
  for (const n of S.novas) {
    const f = n.r / n.maxR;
    ctx.globalAlpha = (1 - f) * 0.9;
    ctx.strokeStyle = n.color; ctx.lineWidth = 10 * (1 - f) + 3;
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = (1 - f) * 0.5;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // enemies then boss overlays (boss, titans, reaper all get telegraph + HP bar)
  for (const e of S.enemies) drawEnemy(e);
  for (const e of S.enemies) if (e.isBoss && !e.dead) drawBossExtras(e);
  // bolts
  ctx.globalCompositeOperation = 'lighter';
  for (const b of S.bolts) {
    const s = b.r * 3.2;
    ctx.drawImage(glowDot(b.color), b.x - s, b.y - s, s * 2, s * 2);
    ctx.fillStyle = '#ffffff';
    if (b.pierce) {
      // Storm Lance: elongated bolt aligned with its velocity
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 2.6, b.r * 0.5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
    }
  }
  // orbital blades
  const bl = S.weapons.blade;
  if (bl.lv > 0) {
    const st = bladeStats(bl.lv, bl.evo);
    if (bl.evo) {
      // Halo of Ruin: a sustained golden ring links the blades
      ctx.strokeStyle = st.color; ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3 + 0.1 * Math.sin(S.elapsed * 6);
      ctx.beginPath(); ctx.arc(S.player.x, S.player.y, st.radius, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (let k = 0; k < st.count; k++) {
      const a = bl.ang + k / st.count * TAU;
      const bx = S.player.x + Math.cos(a) * st.radius, by = S.player.y + Math.sin(a) * st.radius;
      const s = st.size * 2.6;
      ctx.drawImage(glowDot(st.color), bx - s, by - s, s * 2, s * 2);
      ctx.save();
      ctx.translate(bx, by); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = st.color;
      ctx.beginPath(); ctx.ellipse(0, 0, st.size * 0.42, st.size, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(0, 0, st.size * 0.16, st.size * 0.55, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  drawParts();
  drawPlayer();
  drawTexts();
}

/* ---------- screen-space FX ---------- */
export function drawScreenFX() {
  const ctx = S.ctx, W = S.W, H = S.H, game = S.game;
  // tension tint: hue crawls from violet toward red as minutes stack up
  const m = game.time / 60 || 0;
  let a = Math.min(0.14, m * 0.028);
  if (game.boss && !game.boss.dead) a += 0.05 + 0.03 * Math.sin(S.elapsed * 6);
  if (a > 0) {
    const hue = Math.round(300 + Math.min(60, m * 12));
    ctx.fillStyle = 'hsla(' + hue + ',85%,40%,' + a.toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // Void Reaper loose: the world itself turns oppressive — heavy wash + pulsing blood vignette
  if (game.reaper && !game.reaper.dead) {
    ctx.fillStyle = 'rgba(24,2,20,0.34)';
    ctx.fillRect(0, 0, W, H);
    const pulse = 0.5 + 0.5 * Math.sin(S.elapsed * 4.5);
    const rv = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.7);
    rv.addColorStop(0, 'rgba(0,0,0,0)');
    rv.addColorStop(1, 'rgba(120,0,40,' + (0.32 + 0.16 * pulse).toFixed(3) + ')');
    ctx.fillStyle = rv; ctx.fillRect(0, 0, W, H);
  }
  if (game.flash > 0) {
    ctx.fillStyle = 'rgba(255,40,80,' + (game.flash * 0.4).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (!vignette) rebuildBG();
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  drawAnns();
  // touch joystick
  if (TOUCH && (S.state === 'play' || S.state === 'level')) {
    const bx = joy.active ? joy.bx : 100, by = joy.active ? joy.by : H - 120;
    ctx.globalAlpha = joy.active ? 0.5 : 0.22;
    ctx.strokeStyle = '#38f0ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bx, by, joy.R, 0, TAU); ctx.stroke();
    const kx = bx + joy.dx * joy.R, ky = by + joy.dy * joy.R, ks = 26;
    ctx.globalAlpha = joy.active ? 0.85 : 0.3;
    ctx.drawImage(glowDot('#38f0ff'), kx - ks, ky - ks, ks * 2, ks * 2);
    ctx.fillStyle = '#aef6ff';
    ctx.beginPath(); ctx.arc(kx, ky, 9, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
