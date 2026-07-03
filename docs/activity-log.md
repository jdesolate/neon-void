# Activity Log — NEON VOID

Newest entries at the top. One entry per working session: what shipped, deviations from plan, known issues, next step.

## 2026-07-03 — Session 2: combat feel & pacing patch (+ scope amendment from beta feedback)

- **Design decision (owner):** player power stays uncapped — the late-game exponential power fantasy is a feature. Beta testers reported that at level 100+ enemies stop mattering and at 200+ the level-up modal opens every second, freezing movement. Root cause analysis: uncapped Overcharge/Wisdom compound exponentially while enemy HP was only quadratic and `xpToNext` only ~L^1.3; one-shotting the spawn cap floods XP faster than levels cost. Fix chosen: make the world re-catch the player instead of capping the player, and never let level-ups block movement.
- Combat feel (original scope): bolt base interval 0.85 → 0.45s, base damage 10 → 7 (+3/lv from +4/lv), interval floor 0.28 → 0.18. Innate per-player-level growth added: +2% attack speed, +1.5% damage per level, linear-from-base via `innateAspdMul`/`innateDmgMul` in `config.js` (deliberately never compounding), applied at the weapon runtime sites.
- Upgrade rolls: `rollUpgrades(pool, rng)` in `content/upgrades.js` guarantees ≥1 offensive card (bolt/blade/nova/power/rapid) per 3-card offer, no duplicates, seeded shuffle; `buildCards` consumes it.
- Spawn curve now piecewise in `spawnInterval`: gentle first minute (base 1.1, −0.06/min), normal slope after (−0.15/min), extra −0.10/min past minute 3; same 0.13s floor. Surge rings announce "SURGE INCOMING" via the existing announce banner.
- Pacing amendment: `xp.pow` 1.3 → 1.5; enemy HP compounds ×1.3/min past minute 8 (`hpCompoundAfterMin`/`hpCompoundPerMin`), so pressure always re-catches exponential builds and runs regain an ending.
- Overflow level-ups (the one behavior-shape change, logged per plan): only the first pending level opens the card modal and never twice within 4s of game time (`BALANCE.levelup.modalCooldown`); all other levels auto-apply a seeded random eligible upgrade with floating text (`autoPick` in `levelup.js`, `lvModalAt` on run state). Verified in-browser: a 200k XP flood jumped level 2 → 172 in one pickup with zero modals and the player still moving; the next modal opened legitimately after the cooldown with the offensive guarantee intact.
- Session plan updated: Session 2 scope amendment recorded; new **Session 3.5 — Titans + Void Reaper** inserted after evolutions (recurring titan super-bosses ~5min riding the compounding curve + one near-unkillable milestone ultimate at ~minute 15, killable by god-builds, feeding a Session 6 achievement).
- Tests: 37 passing (`node --test`) — new coverage for roll constraint (offensive guarantee, no duplicates, graceful small pools, capped-card exclusion), innate linearity, compounding HP math, spawn-curve shape; bolt pins and the seeded-roll determinism test updated for the new numbers/roller.
- Smoke pass clean: boot zero console errors, level-up via card click and key 2, auto-pick within cooldown, boss telegraph + kill, forced death, game-over stats + NEW BEST + v2 persistence across reload, restart, 210-enemy stress at ~7.0ms frame average, no adaptive-quality thrash.
- Known issues: during one automated check the game-over screen restarted without input — could not reproduce (stable across 3.5s of polling on retry); most likely a stray key event in the preview tab. Watch during Session 3's smoke pass.
- Next step: **Session 3** — weapon evolutions + boss chests. See `docs/session-plan.md`.

## 2026-07-02 — Session 1: module split (pure refactor) + test scaffold

- Split the ~1,250-line `index.html` into a thin HTML shell + native ES modules, zero behavior change: `src/main.js` (boot/state machine/loop/`NeonVoid` API), `src/config.js` (BALANCE table + pure scaling math), `src/engine/` (events, save, rng, audio, input, sprites, particles), `src/content/` (enemies, weapons, upgrades as data rows), `src/game/` (player, enemies, weapons, gems, levelup, hud, render).
- `NeonVoid.mount(element, {seed, saveAdapter, onRunEnd, debug})` skeleton; the page boots through it. Domain events on the bus: enemy-killed, level-up-opened, upgrade-chosen, boss-spawned, run-ended (payload: time, kills, level, seed, best/new-best flags → fed to `onRunEnd`).
- Seedable RNG (`src/engine/rng.js`, mulberry32). Gameplay randomness routed through it: spawn positions, surge rings, tier picks, enemy stat jitter, crits, gem drops, upgrade rolls. Cosmetic randomness (particles, shake, boss spark FX, star tiles) stays `Math.random`. Each run gets a fresh seed unless `mount` got one; debug can read/replay the current seed.
- Save v2: single `nv_save` key, versioned JSON with migration chain; legacy `nv_bestT`/`nv_bestK` migrate on load and are removed after the first successful persist (persist happens on new best). Corrupt/missing blobs fall back to legacy keys, then defaults — progress is never lost.
- Debug handle `window.NV_DEBUG` behind `?debug=1`: startRun(seed), grantXP, pickCard, forceBoss, killBoss, killPlayer, spawn(n), frameAvg, seed/replaySeed, state.
- Tests: `node --test`, 30 passing — event bus semantics, save migration/corruption paths, RNG determinism (same seed → same tier picks and upgrade rolls), balance math + weapon stat formulas. Added a minimal `package.json` (`"type": "module"`, no dependencies) so Node treats the source as ESM.
- Browser smoke pass clean: boot zero console errors, v1 keys migrated (best line correct), run start, WASD drive, level-up via card click and keys 1/2, boss telegraph + kill, forced death, game-over stats, NEW BEST + v2 persistence across reload, restart, 224-enemy stress at ~13.3ms frame average with no adaptive-quality thrash.
- Deviations from the planned layout (logged per plan): added `src/state.js` (the monolith's shared mutable state, imported by both engine and game modules) and `src/utils.js` (TAU/clamp/dist2/fmtTime + cosmetic `rnd`). `content/weapons.js` exports per-level stat functions (`boltStats`/`bladeStats`/`novaStats`) reading BALANCE rather than static tables, since v1 weapon stats are formula-based.
- Known issues: none found.
- Next step: **Session 2** — combat feel & pacing patch (balance-table changes only). See `docs/session-plan.md`.

## 2026-07-02 — v1 build, research, PRD + session plan

- Built the complete v1 game as a single self-contained `index.html` (canvas, WebAudio, touch joystick, 3 weapons with tiers, boss cycle, combo system, localStorage bests, particles/shake/hit-stop, parallax background). Verified in browser: zero console errors, ~7ms frame average with 200+ enemies, mobile 375px layout OK.
- Researched genre leaders (Vampire Survivors, Brotato, 20 Minutes Till Dawn): key missing hooks identified as evolutions, meta shop, pickups, elites, achievements/unlocks, reroll/banish. Known issue: base fire rate too slow, spawn pressure outpaces power without offense-upgrade luck (fix scheduled Session 2).
- Decisions: split into native ES modules (no bundler, still GitHub Pages zero-config); testing seam = Node built-in test runner for pure logic + `?debug=1` browser handle for smoke passes; PRD lives in docs/ (no git repo yet).
- Wrote `docs/prd.md`, `docs/session-plan.md`, project `CLAUDE.md`.
- Multiplayer decision: game stays an independent repo/engine; sanctioned modes are parallel play only — versus (live rival stats over the host app's Supabase Realtime) and async seeded leaderboards. Shared-battlefield co-op explicitly out of scope. Game-side seam: `seed` at mount (seedable RNG lands in Session 1 as `rng.js`), `onStats` outbound ~1/s, `setRival` inbound with a small HUD opponent panel (API frozen in Session 7). The game never imports network code.
- Known issues: none in v1 beyond the balance complaints above. `.claude/launch.json` (`static` config) serves the game locally on port 8137.
- Next step: **Session 1** — module split (pure refactor) + test scaffold. See `docs/session-plan.md`.
