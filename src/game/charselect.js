// Start-screen pilot picker: renders CHARACTERS with lock state, persists the pick.
import { S } from '../state.js';
import { CHARACTERS, activeCharacter } from '../content/characters.js';
import { ACHIEVEMENTS } from '../content/achievements.js';
import { bus } from '../engine/events.js';
import { sfx } from '../engine/audio.js';
import { ui } from './hud.js';

const achById = {};
ACHIEVEMENTS.forEach(function (a) { achById[a.id] = a; });

export function initCharSelect() {
  // stop the tap from reaching the start overlay, which would launch a run
  ui.pilots.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  bus.on('achievement-unlocked', function () { renderPilots(); });
  renderPilots();
}

export function renderPilots() {
  const un = S.save.data.ach;
  const sel = activeCharacter(S.save.data.character, un).id;
  ui.pilots.innerHTML = '';
  CHARACTERS.forEach(function (c) {
    const locked = !!(c.unlock && !un[c.unlock]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pilot' + (c.id === sel ? ' sel' : '') + (locked ? ' locked' : '');
    if (c.id === sel) btn.style.borderColor = c.col;
    const sub = locked ? achById[c.unlock].desc.toUpperCase() + ' TO UNLOCK' : c.desc;
    btn.innerHTML = '<span class="pIcon" style="color:' + c.col + (locked ? '' : ';text-shadow:0 0 10px ' + c.col) + '">' + c.icon + '</span>' +
      '<span class="pName">' + c.name + '</span>' +
      '<span class="pDesc">' + sub + '</span>';
    btn.addEventListener('click', function () { pick(c, locked); });
    ui.pilots.appendChild(btn);
  });
}

function pick(c, locked) {
  if (locked) { sfx.tick(); return; }
  if (S.save.data.character !== c.id) {
    S.save.data.character = c.id;
    S.save.persist();
    sfx.tick();
    bus.emit('character-selected', { id: c.id });
  }
  renderPilots();
}
