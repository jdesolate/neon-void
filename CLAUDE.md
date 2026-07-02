# NEON VOID — wave-survivor web game

Vampire Survivors-style canvas game. Plain HTML/CSS/JS, **zero build tools, zero dependencies, no external assets** — deploys as-is to GitHub Pages. One responsive build for desktop (WASD) and mobile (touch joystick). This is the owner's first game; it will later be embedded into their Habit Quest web app via the `NeonVoid` API seam.

## Where things are

- Product spec: @docs/prd.md
- Multi-session work breakdown (do sessions in order): @docs/session-plan.md
- Session history / handoff notes: @docs/activity-log.md

At session start: read the current session's entry in the session plan and the last two activity-log entries. At session end: run all checks and append an activity-log entry.

## Run & verify

- Serve locally: `.claude/launch.json` config `static` (python http.server, port 8137). After the Session 1 module split, `file://` will NOT work — always serve over HTTP.
- Unit tests: `node --test` (Node built-in runner, no dependencies) against `test/`.
- Browser smoke pass: open with `?debug=1` and follow the checklist at the top of @docs/session-plan.md. Zero console errors is a hard requirement on desktop and mobile.

## Hard rules

- No frameworks, bundlers, CDNs, or asset files. System fonts only.
- Content (weapons, enemies, upgrades, evolutions, achievements) = data rows in `src/content/`; tuning numbers live only in `src/config.js` (BALANCE table). No magic numbers inline in systems.
- Gameplay systems emit domain events; meta systems (achievements, economy, stats) subscribe. Combat code never imports meta systems.
- Saves: one storage key, versioned JSON schema with a migration chain. Never ship a schema change without a migration + test. Never wipe player progress.
- The game never imports network code (no Supabase, no fetch to backends). Multiplayer is parallel-play only, carried by the host app through the `NeonVoid` seam: `seed` in, `onStats` out, `setRival` in. Shared-battlefield co-op is explicitly out of scope — do not design toward it.
- Gameplay randomness (spawns, tiers, upgrade rolls, drops) goes through the seedable RNG helper; only cosmetic randomness may use `Math.random`.
- Pure refactors are never mixed with behavior changes in the same session.
- Performance budget: stable frame time with 200+ enemies + max weapons on a mid-range phone; particles pooled and capped; pre-rendered sprites over per-frame gradients/shadowBlur in hot paths.
- Touch targets ≥44px; HUD respects safe-area insets; audio initializes only after a user gesture.
