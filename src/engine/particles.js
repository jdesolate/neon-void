// Pooled, capped particles plus transient floating text and announcements (all cosmetic FX).
import { S } from '../state.js';
import { TAU, rnd, clamp } from '../utils.js';
import { glowDot } from './sprites.js';

const parts = [], texts = [], anns = [];

export function resetFX() { parts.length = 0; texts.length = 0; anns.length = 0; }

function pCap() { return S.lowFX ? 140 : 300; }
export function addPart(o) { if (parts.length >= pCap()) parts.shift(); parts.push(o); }

export function burst(x, y, color, n, spd, size, life) {
  if (S.lowFX) n = Math.ceil(n * 0.5);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU), v = rnd(spd * 0.3, spd);
    addPart({ t: 'shard', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(life * 0.5, life), max: life,
      size: rnd(size * 0.6, size * 1.3), color: color, rot: rnd(0, TAU), vr: rnd(-8, 8), drag: 3.2 });
  }
}

export function puff(x, y, color, size, life, vx, vy) {
  addPart({ t: 'glow', x: x, y: y, vx: vx || 0, vy: vy || 0, life: life, max: life, size: size, color: color, drag: 1.5 });
}

// Expanding shockwave ring, drawn as a stroked circle that grows and fades.
export function ring(x, y, color, maxR, life) {
  addPart({ t: 'ring', x: x, y: y, vx: 0, vy: 0, life: life, max: life, size: maxR, color: color, drag: 0 });
}

export function confetti(x, y) {
  const cols = ['#38f0ff', '#7a5cff', '#ffe066', '#ff4d9d', '#5affc8'];
  for (let i = 0; i < 36; i++) {
    const a = rnd(0, TAU), v = rnd(90, 340);
    addPart({ t: 'shard', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rnd(0.5, 1.1), max: 1.1,
      size: rnd(2.5, 5), color: cols[i % 5], rot: rnd(0, TAU), vr: rnd(-10, 10), drag: 1.6 });
  }
}

export function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    const d = 1 / (1 + p.drag * dt);
    p.vx *= d; p.vy *= d; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
  }
}

export function drawParts() {
  const ctx = S.ctx;
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const f = p.life / p.max;
    if (p.t === 'glow') {
      const s = p.size * (0.5 + f);
      ctx.globalAlpha = f * 0.8;
      ctx.drawImage(glowDot(p.color), p.x - s, p.y - s, s * 2, s * 2);
    } else if (p.t === 'ring') {
      ctx.globalAlpha = f * 0.85;
      ctx.strokeStyle = p.color; ctx.lineWidth = 2 + 8 * f;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - f), 0, TAU); ctx.stroke();
    } else {
      ctx.globalAlpha = f;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

export function addText(x, y, str, crit) {
  if (texts.length >= 40) texts.shift();
  texts.push({ x: x + rnd(-8, 8), y: y, vy: -58, life: 0.75, max: 0.75, str: str, crit: crit });
}

export function announce(str, color, life) { anns.push({ str: str, color: color, t: 0, life: life || 1.8 }); }

export function updateTexts(rdt) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= rdt;
    if (t.life <= 0) { texts[i] = texts[texts.length - 1]; texts.pop(); continue; }
    t.y += t.vy * rdt; t.vy *= 1 - 2.5 * rdt;
  }
  for (let i = anns.length - 1; i >= 0; i--) {
    anns[i].t += rdt;
    if (anns[i].t >= anns[i].life) anns.splice(i, 1);
  }
}

// Damage numbers, drawn in world space (inside the camera transform).
export function drawTexts() {
  const ctx = S.ctx;
  ctx.textAlign = 'center';
  for (const t of texts) {
    const f = t.life / t.max;
    ctx.globalAlpha = Math.min(1, f * 2);
    if (t.crit) {
      ctx.font = '900 19px system-ui,sans-serif';
      ctx.fillStyle = '#ffd166'; ctx.shadowColor = '#ffd166';
    } else {
      ctx.font = '800 13px system-ui,sans-serif';
      ctx.fillStyle = '#ffffff'; ctx.shadowColor = '#9fd8ff';
    }
    ctx.shadowBlur = S.lowFX ? 0 : 8;
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

// Announcements, drawn in screen space.
export function drawAnns() {
  const ctx = S.ctx;
  for (const an of anns) {
    const inT = Math.min(1, an.t / 0.18), outT = clamp((an.life - an.t) / 0.4, 0, 1);
    const s = 0.6 + inT * 0.4;
    ctx.save();
    ctx.translate(S.W / 2, S.H * 0.3);
    ctx.scale(s, s);
    ctx.globalAlpha = inT * outT;
    ctx.font = '900 34px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = an.color; ctx.shadowColor = an.color; ctx.shadowBlur = 24;
    ctx.fillText(an.str, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
