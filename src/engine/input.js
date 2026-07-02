// Keyboard + touch joystick input. State-machine reactions are injected via callbacks
// so this module never imports gameplay code.
import { initAudio } from './audio.js';

export const TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
export const keys = {};
export const joy = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0, R: 54 };

export function inputVec() {
  let x = 0, y = 0;
  if (keys.KeyW || keys.ArrowUp) y -= 1;
  if (keys.KeyS || keys.ArrowDown) y += 1;
  if (keys.KeyA || keys.ArrowLeft) x -= 1;
  if (keys.KeyD || keys.ArrowRight) x += 1;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  if (joy.active) { x = joy.dx; y = joy.dy; const jl = Math.hypot(x, y); if (jl > 1) { x /= jl; y /= jl; } }
  return { x: x, y: y };
}

// cb.onKeyAction(code): state-machine key handling. cb.onPrimaryTouch(): return true to
// consume the touch (e.g. start screen tap) instead of starting the joystick.
export function bindInput(cv, cb) {
  window.addEventListener('keydown', function (e) {
    keys[e.code] = true;
    initAudio();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) >= 0) e.preventDefault();
    cb.onKeyAction(e.code);
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  cv.addEventListener('touchstart', function (e) {
    e.preventDefault(); initAudio();
    if (cb.onPrimaryTouch()) return;
    for (const t of e.changedTouches) {
      if (!joy.active) {
        joy.active = true; joy.id = t.identifier;
        joy.bx = t.clientX; joy.by = t.clientY; joy.dx = 0; joy.dy = 0;
      }
    }
  }, { passive: false });
  cv.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier === joy.id) {
        let dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
        const d = Math.hypot(dx, dy);
        if (d > joy.R) { dx = dx / d * joy.R; dy = dy / d * joy.R; }
        joy.dx = dx / joy.R; joy.dy = dy / joy.R;
      }
    }
  }, { passive: false });
  function endTouch(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (joy.active && t.identifier === joy.id) { joy.active = false; joy.dx = 0; joy.dy = 0; }
    }
  }
  cv.addEventListener('touchend', endTouch, { passive: false });
  cv.addEventListener('touchcancel', endTouch, { passive: false });
  // block pinch-zoom / double-tap zoom / long-press artifacts globally
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('pointerdown', initAudio, { passive: true });
}
