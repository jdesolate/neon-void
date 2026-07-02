// Pre-rendered sprite canvases so hot-path draws are single drawImage calls.
import { TAU, rnd } from '../utils.js';

const glowCache = {};
export function glowDot(color) {
  let c = glowCache[color];
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  gr.addColorStop(0, color); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalAlpha = 0.9; g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, TAU); g.fill();
  glowCache[color] = c; return c;
}

// Body sprite: glow halo + polygon core, pre-rendered so per-enemy draw is one drawImage.
export function bodySprite(color, coreColor, r, sides, spike) {
  const pad = r * 2.2, s = Math.ceil((r + pad) * 2), c = document.createElement('canvas');
  c.width = c.height = s; const g = c.getContext('2d'); const cx = s / 2;
  const gr = g.createRadialGradient(cx, cx, r * 0.3, cx, cx, r + pad * 0.9);
  gr.addColorStop(0, color); gr.addColorStop(0.45, color + '55'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(cx, cx, r + pad * 0.9, 0, TAU); g.fill();
  g.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = -Math.PI / 2 + i / sides * TAU, rr = spike && i % 2 ? r * 0.55 : r;
    if (i === 0) g.moveTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
    else g.lineTo(cx + Math.cos(a) * rr, cx + Math.sin(a) * rr);
  }
  g.closePath();
  const bg = g.createRadialGradient(cx - r * 0.3, cx - r * 0.3, r * 0.1, cx, cx, r);
  bg.addColorStop(0, coreColor); bg.addColorStop(1, color);
  g.fillStyle = bg; g.fill();
  g.lineWidth = Math.max(1.5, r * 0.14); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.stroke();
  return { img: c, size: s, r: r };
}

export function flatSprite(base) {
  const c = document.createElement('canvas'); c.width = c.height = base.size;
  const g = c.getContext('2d');
  g.drawImage(base.img, 0, 0); g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#fff'; g.fillRect(0, 0, base.size, base.size);
  return { img: c, size: base.size, r: base.r };
}

export function starTile(count, rmin, rmax, color, blur) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.shadowColor = color; g.shadowBlur = blur;
  for (let i = 0; i < count; i++) {
    g.globalAlpha = rnd(0.35, 1);
    g.fillStyle = color;
    g.beginPath(); g.arc(rnd(0, 512), rnd(0, 512), rnd(rmin, rmax), 0, TAU); g.fill();
  }
  return c;
}
