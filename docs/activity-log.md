# Activity Log — NEON VOID

Newest entries at the top. One entry per working session: what shipped, deviations from plan, known issues, next step.

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
