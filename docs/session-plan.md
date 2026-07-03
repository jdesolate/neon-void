# Session Plan — NEON VOID

Companion to `prd.md`. Eight single-session increments, each self-contained enough for a fresh Claude Code session with no memory of previous ones. Do them in order; each builds on the last.

## How to run any session

1. Read `CLAUDE.md` (auto-loaded), `docs/prd.md`, this file's entry for the current session, and the last two entries of `docs/activity-log.md`.
2. Confirm the previous session's acceptance criteria still hold (run `node --test`, then the browser smoke pass below) before writing new code.
3. Work only the session's IN scope. If something outside scope is broken, log it in the activity log and move on unless it blocks the session.
4. End-of-session ritual: all tests pass, smoke pass clean, append an activity-log entry (date, what shipped, deviations, known issues, next step), and update this file if scope shifted.

**Browser smoke pass** (serve via the `static` launch config, open with `?debug=1`):
boot with zero console errors → start a run → drive movement → grant XP, resolve a level-up via card click and via keys 1–3 → force a boss and observe telegraph + dash → kill the boss → force player death → verify game-over stats, NEW BEST logic, persistence across reload → restart → stress-spawn 200 enemies and confirm frame-time average stays under ~16ms desktop / no adaptive-quality thrash.

---

## Session 1 — Module split (pure refactor) + test scaffold

**Goal:** Split `index.html` into an HTML shell + native ES modules with zero behavior change, and stand up the testing seam everything later relies on.

**Why first:** Every later session adds systems; they need module boundaries, the event bus, the balance table, and tests to attach to.

**IN scope**
- HTML shell keeps DOM/CSS; script becomes `type="module"` entry point.
- Target layout (create exactly this; adjust only with a logged reason):
  - `src/main.js` — boot, state machine, game loop, composition
  - `src/config.js` — BALANCE table: every tuning constant currently inline
  - `src/engine/` — `events.js` (pub/sub), `save.js` (versioned schema v2 + adapter over localStorage, migrates the two v1 keys `nv_bestT`/`nv_bestK`), `audio.js`, `input.js`, `sprites.js`, `particles.js`
  - `src/content/` — `enemies.js` (tier/boss tables), `upgrades.js` (upgrade pool), `weapons.js` (weapon stat tables)
  - `src/game/` — `player.js`, `enemies.js` (spawn/AI/separation/boss), `weapons.js` (runtimes), `gems.js`, `levelup.js`, `hud.js`, `render.js`
- `NeonVoid` API skeleton: `mount(element, options)` with `onRunEnd` callback and optional `saveAdapter`; the page itself uses this API to boot.
- Seedable RNG helper (`src/engine/rng.js`): one mulberry32-style generator; route all *gameplay* randomness through it (spawn positions/timing, tier picks, upgrade rolls) — cosmetic randomness (particles, shake jitter) may keep `Math.random`. `mount` accepts an optional `seed`; unseeded runs use a random seed. Unit test: same seed → same sequence and same first N spawn/upgrade decisions.
- Debug handle behind `?debug=1`: expose grant-XP, force-boss, kill-player, read frame average, read state, read/replay current seed.
- Gameplay emits events (enemy-killed, level-up-opened, upgrade-chosen, boss-spawned, run-ended); HUD/stats consume where natural. No new features.
- Tests via `node --test` in `test/`: event bus semantics, save migration (v1→v2, missing, corrupt), one balance-math test as the pattern.

**OUT:** any balance change, any new feature, any visual change. If the game plays differently, the session failed.

**Acceptance criteria**
- Game is pixel-for-pixel behaviorally identical (smoke pass + short manual play).
- Zero console errors; works served over HTTP; note in README/CLAUDE.md that `file://` no longer works.
- `node --test` green. Old best scores survive (migration verified in a test and in the browser).

---

## Session 2 — Combat feel & pacing patch

**Goal:** Fix "shooting too slow / nothing changes" with balance-table changes only.

**IN scope**
- Bolt base interval ~0.45s (from ~0.8s), per-shot damage trimmed ~25% (net early DPS up, late scaling unchanged).
- Innate per-player-level growth: +2% attack speed, +1.5% damage per level, applied automatically.
- Upgrade roll constraint: every 3-card offer contains ≥1 offensive card (weapon level, damage, attack speed).
- Spawn curve: flatter first 60s, steeper after 180s; surge rings announced with a brief on-screen cue.
- All numbers in `config.js` only.

**Scope amendment (2026-07-03, owner decision after beta feedback):** player power stays uncapped by design — the late-game power fantasy is a feature. The level-100+ runaway (one-shotting everything, level-up modal every second) is fixed on the world side instead:
- Enemy HP gains a compounding per-minute term after ~minute 8, so pressure eventually re-catches any exponential build and runs regain an ending.
- XP curve steepened (`pow` 1.3 → 1.5) so late levels arrive every few seconds, not several per second.
- Overflow level-up handling (the one behavior-shape change, logged per the discipline rule): when one pickup grants multiple levels, only the first opens the card modal — the rest auto-apply a random eligible upgrade with floating text; the modal also opens at most once per cooldown window (BALANCE knob). Reason: beta testers at level 200+ were locked in the modal every second and could no longer move.

**OUT:** new systems, new content rows, visual work beyond the surge cue.

**Acceptance:** roll-constraint + innate-scaling + compounding-HP unit tests green; playtest confirms first 30s feels active and minute 4+ feels dangerous; smoke pass clean.

---

## Session 3 — Weapon evolutions + boss chests

**Goal:** The genre's signature hook: maxed weapons transform via boss chests.

**IN scope**
- Evolution data table: Pulse Bolt Lv5 → **Storm Lance** (piercing, faster, lightning palette); Blades Lv5 → **Halo of Ruin** (larger ring, sustained contact damage, white-gold); Nova Lv5 → **Event Horizon** (double pulse pull-in, dark-purple).
- Boss death drops a chest entity; touching it slow-mos and plays a 2–3s slot-machine reveal (reuse overlay styling), then applies the highest-priority eligible evolution or a gold burst (gold lands fully in Session 4; stub as bonus XP if needed, logged).
- Evolved visuals/SFX distinct; evolution state shown in HUD or level-up cards (maxed weapons show their evolution requirement).
- Events: chest-opened, weapon-evolved.

**OUT:** paired-passive requirements (VS-style item pairings), multiple chest rarities.

**Acceptance:** eligibility unit tests green (maxed → evolves; not maxed → fallback; already evolved → excluded); full-run playtest reaching one evolution; smoke pass extended with a force-chest step.

---

## Session 3.5 — Endgame threat: Titans + the Void Reaper

*(Added 2026-07-03 after beta feedback: with player power uncapped by design, late-game enemies stop mattering and there is no climactic threat. Placed after Session 3 so both bosses can drop evolution chests.)*

**Goal:** Restore danger and give god-builds a mountain to climb: recurring titan super-bosses plus one milestone ultimate boss.

**IN scope**
- **Titans:** every ~5 minutes after minute 5, a super-boss whose HP rides the Session 2 compounding enemy curve (so it tracks exponential builds), visually distinct (scaled-up silhouette + aura), a modified attack pattern (e.g. multi-dash), and a guaranteed chest drop.
- **Void Reaper:** at a fixed milestone (~minute 15), a heavily telegraphed ultimate spawns — faster than the player, massive compounding HP, ends most runs. Finite HP, so an extreme build *can* kill it; doing so is the game's crowning moment (big reward burst + `reaperSlain` flag in the run-ended payload, feeding a Session 6 achievement).
- Regular boss HP adopts the compounding late-game term here too, so the 60s boss cycle stays relevant.
- Events: titan-spawned, titan-killed, reaper-spawned, reaper-killed.
- All numbers in BALANCE; scheduling and HP scaling as pure testable functions.

**OUT:** new regular enemy species, multiple reaper difficulty tiers, reaper-specific arenas.

**Acceptance:** titan/reaper scheduling + HP-scaling unit tests green; playtest: a strong build at minute 10+ feels pressured again; reaper kill achievable with a debug-boosted build; smoke pass extended with force-titan and force-reaper steps.

---

## Session 3.6 — Power-curve rebalance (additive stacking)

*(Added 2026-07-03, owner decision — reverses the Session 2 "player power stays uncapped" amendment. Playtesting showed bosses and enemies still melt by mid-late game: Overcharge and Wisdom stacked multiplicatively without a cap, so player damage/XP grew exponentially while enemy HP was only polynomial until the late compounding term. Owner wants the io-survivor feel: linear, realistic power progression that keeps runs challenging.)*

**Goal:** Player power grows linearly; the world stays a credible threat for the whole run.

**IN scope**
- Overcharge and Wisdom Shard stack **additively** (+15% of base per pick — `dmgAdd`/`xpgainAdd` in BALANCE) instead of multiplying; every pick still helps, but pick #10 no longer multiplies everything before it. Kills the Wisdom→levels→Overcharge exponential feedback loop.
- World compounding retuned against the new linear player curve: `hpCompoundAfterMin` 8 → 10, `hpCompoundPerMin` 1.3 → 1.18 (the ×1.3 curve was tuned to chase exponential builds and would wall a linear player at ~min 11, making the Reaper unreachable). Target: a well-played run ends ~min 15–20, with the min-15 Reaper as the climactic wall.
- Boss/titan/reaper base HP untouched first pass; revisit after owner playtest.
- Unit test: additive stacking is linear (equal increments per pick).

**OUT:** new content, caps on any player stat, touching the innate-growth or spawn curves.

**Acceptance:** stacking + curve unit tests green; owner playtest confirms mid-game bosses no longer melt and good runs end ~min 15–20; smoke pass clean.

---

## Session 4 — Gold economy + meta shop

**Goal:** Permanent progression: dying still advances you.

**IN scope**
- Gold drops (tier-weighted chance; elites/bosses guaranteed) with distinct look vs XP gems; wallet persisted in save (schema **v4** + migration + tests — Session 3.5 took v3 for the audio `settings` field; add the wallet as a `2->3`-style additive step to v4).
- Start-screen meta shop: 6–8 permanent upgrades (max HP, damage, attack speed, move speed, magnet, regen, starting level, gold gain), 3–5 ranks each, geometric cost growth; 44px+ tap targets; shows owned ranks.
- Run-start applies purchased ranks; run-end summary shows gold earned.
- `NeonVoid` grant method for external gold (Habit Quest seam, tested via debug handle).

**OUT:** shop UI polish beyond functional-clean, refunds/respec, chest gold balancing beyond a first pass.

**Acceptance:** wallet/cost/migration unit tests green; buy → die → reload → rank persists and applies; smoke pass clean.

---

## Session 5 — Pickups + elite enemies

**Goal:** Variable-ratio reward moments inside a run.

**IN scope**
- Shared drop-table system rolling through the Session 1 `rng.js` helper (so it is seed-testable): heal (+30% HP), magnet vacuum (all gems fly to player), bomb (damages+staggers everything on screen, big FX).
- Elite modifier wrapper on existing tiers (~1 per 45–60s after minute 1): larger, glowing ring, 6× HP, 1.5× damage, guaranteed chest-or-gold drop.
- Events: pickup-collected, elite-killed.

**OUT:** new enemy species, elite special attacks.

**Acceptance:** drop-table distribution tests green (seeded); playtest confirms pickups read clearly at a glance; elites feel worth hunting; perf budget still met with bomb FX (stress check in smoke pass).

---

## Session 6 — Level-up agency + achievements + second character

**Goal:** Agency over RNG and long-term goals.

**IN scope**
- Reroll (1/run) and Banish (1/run, removes the card's upgrade from this run's pool) buttons on the level-up screen, 44px+ targets.
- Achievement table (~10: kills lifetime/single-run, survival time, evolutions seen, bosses killed, titans killed, Void Reaper slain, combo peak, gold earned…) as event-bus subscriptions persisted in save (schema bump + migration + tests); toast on unlock; list visible from start screen.
- First unlock reward: second character (e.g. "Vanguard": starts with Blades Lv1, +20% move speed, −20% max HP) selectable on the start screen.
- Events: achievement-unlocked, character-selected.

**OUT:** third+ characters, achievement rewards beyond the character, banish persistence across runs.

**Acceptance:** threshold + reroll/banish unit tests green; unlock toast fires mid-run; character select persists; smoke pass clean.

---

## Session 7 — Integration API hardening + mobile/perf QA + ship

**Goal:** Freeze the Habit Quest seam (including the multiplayer hooks) and certify the whole game on mobile.

**IN scope**
- Finalize `NeonVoid` API: `mount(element, {seed, saveAdapter, onRunEnd, onStats, grants})`, run-end payload (time, kills, level, gold, evolutions, achievements, seed), unmount/cleanup; document it in a short `docs/api.md`.
- Multiplayer seam: `onStats` fires ~1/s with a small payload (time, kills, combo, HP%, level); `setRival(stats)` renders a compact opponent panel in the HUD (name, kills, combo, alive/dead), styled to the neon aesthetic, hidden when unused. The game performs no networking — transport is the host app's job. Verify both via the debug handle (fake a rival feed).
- Save adapter contract test (in-memory adapter proves localStorage isn't assumed).
- Full mobile QA: touch joystick, all overlays/tap targets, safe-area, orientation change mid-run, iOS audio unlock, adaptive-quality behavior under stress.
- Perf pass: 200+ enemies + evolved weapons + bomb on mid-range phone stays smooth; fix hotspots.
- GitHub Pages deploy checklist (repo, Pages enabled, everything relative-pathed).

**OUT:** actual Habit Quest embedding, backend adapters.

**Acceptance:** all tests green; documented API consumed by the page itself; mobile checklist signed off in the activity log; deployed URL plays clean.
