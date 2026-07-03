# NEON VOID — Wave Survivor

A Vampire Survivors-style neon arcade shooter. Plain canvas + WebAudio, native ES modules — no frameworks, no build step, no assets.

**▶ Play now:** https://jdesolate.github.io/neon-void/ — desktop (WASD/arrows) and mobile (drag anywhere to move).

## Features

- **Three weapons** — Pulse Bolt, orbiting Blades, and Nova shockwaves, each leveling through tiers (homing, echoes, wider rings).
- **Weapon evolutions** — max a weapon and open a boss chest to transform it: Storm Lance, Halo of Ruin, Event Horizon, revealed through a slot-machine sequence.
- **Escalating threat** — a boss every 60s, telegraphed enemy surges, and a late-game compounding difficulty curve so runs always find an ending.
- **Titans & the Void Reaper** — recurring multi-dash super-bosses, and a milestone ultimate that's faster than you and turns the whole screen oppressive. Slay it if your build is strong enough.
- **Gold & meta shop** — enemies drop gold you keep even when you die; the start-screen VOID SHOP sells eight permanent upgrades (HP, damage, attack speed, move speed, magnet, regen, starting level, gold gain) with escalating costs.
- **Rare pickups & elite hunts** — kills occasionally drop a heal, a gem vacuum, or a screen-clearing singularity bomb; golden-ringed elite enemies stalk in every minute with 6× health and a guaranteed chest or gold burst for whoever brings them down.
- **Reroll & banish** — one reroll and one banish per run on the level-up screen, so bad card luck never locks a build.
- **Achievements & a second pilot** — eleven feats with visible progress (lifetime kills, combo peaks, titan falls, slaying the Reaper…); reach 1,000 lifetime kills to unlock the Vanguard, a blade-first pilot that trades hull for speed.
- **Synthesized adaptive music** — zero-asset procedural BGM that darkens and speeds up while a super-boss is loose, plus persisted music and SFX toggles. WebAudio SFX on every reward.
- **Pause anywhere** — Esc or the pause pill; the game also auto-pauses the moment the window loses focus, so alt-tabbing never costs you a run.
- **Combo scoring, seedable runs, and versioned saves** — best time/kills persist across updates via a migration chain; all gameplay randomness routes through one seedable RNG.
- **One responsive build** — desktop and mobile share the same code, with a touch joystick, safe-area-aware HUD, and adaptive quality under load.
- **Embed seam** — the whole game boots through a single `NeonVoid.mount(element, options)` API for future integration.

## Run locally

Any static server works. Opening `index.html` over `file://` does NOT work — the game is split into native ES modules, which browsers only load over HTTP:

```
python -m http.server 8137
```

then open http://localhost:8137

## Tests

```
node --test
```

Zero-dependency unit tests (Node built-in runner) covering the pure modules: event bus, save migrations, seedable RNG, balance/scaling math, upgrade-roll constraints, weapon evolutions, endgame (titan/reaper) HP scaling, the gold economy (drop table, shop costs, meta bonuses), the pickup drop table plus elite scheduling, and achievement thresholds plus character unlock gating. A browser smoke checklist lives at the top of [docs/session-plan.md](docs/session-plan.md); open the game with `?debug=1` to expose the `NV_DEBUG` driving handle.

## Project docs

- [PRD](docs/prd.md) — product spec and roadmap
- [Session plan](docs/session-plan.md) — the work, broken into single-session increments
- [Activity log](docs/activity-log.md) — running history
