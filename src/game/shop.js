// Start-screen meta shop: renders SHOP rows, buys ranks with wallet gold, persists.
import { S } from '../state.js';
import { BALANCE } from '../config.js';
import { SHOP, shopCost, ownedRank } from '../content/shop.js';
import { initAudio, sfx } from '../engine/audio.js';
import { bus } from '../engine/events.js';
import { spendGold } from './economy.js';
import { ui, updateWalletUI } from './hud.js';

export function initShop() {
  // stop the tap from reaching the start overlay, which would launch a run
  ui.shopBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  ui.shopBtn.addEventListener('click', function () { initAudio(); openShop(); });
  ui.shopClose.addEventListener('click', function () { closeShop(); });
}

export function openShop() {
  if (S.state !== 'start') return;
  S.state = 'shop';
  renderShop();
  updateWalletUI();
  ui.start.classList.add('hidden');
  ui.shop.classList.remove('hidden');
}

export function closeShop() {
  if (S.state !== 'shop') return;
  S.state = 'start';
  ui.shop.classList.add('hidden');
  ui.start.classList.remove('hidden');
}

function renderShop() {
  ui.shopItems.innerHTML = '';
  SHOP.forEach(function (row) {
    const cfg = BALANCE.shop.items[row.id];
    const owned = ownedRank(S.save.data.shop, row.id);
    const maxed = owned >= cfg.ranks;
    const cost = maxed ? 0 : shopCost(row.id, owned);
    const afford = !maxed && S.save.data.gold >= cost;
    let pips = '';
    for (let i = 0; i < cfg.ranks; i++) pips += i < owned ? '●' : '○';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shopRow' + (maxed ? ' maxed' : (afford ? '' : ' locked'));
    btn.style.borderColor = row.col + '55';
    btn.innerHTML = '<span class="cIcon" style="color:' + row.col + ';text-shadow:0 0 10px ' + row.col + '">' + row.icon + '</span>' +
      '<span class="cBody"><span class="cName" style="color:' + row.col + '">' + row.name + '</span>' +
      '<span class="cDesc" style="display:block">' + row.desc() + '</span></span>' +
      '<span class="sRight"><span class="pips">' + pips + '</span><span class="sCost">' + (maxed ? 'MAX' : '◈ ' + cost) + '</span></span>';
    btn.addEventListener('click', function () { buy(row.id); });
    ui.shopItems.appendChild(btn);
  });
}

function buy(id) {
  const cfg = BALANCE.shop.items[id];
  const owned = ownedRank(S.save.data.shop, id);
  if (owned >= cfg.ranks) return;
  const cost = shopCost(id, owned);
  if (!spendGold(cost)) { sfx.tick(); return; }
  S.save.data.shop[id] = owned + 1;
  S.save.persist();
  sfx.buy();
  bus.emit('shop-purchased', { id: id, rank: owned + 1, cost: cost });
  renderShop();
  updateWalletUI();
}
