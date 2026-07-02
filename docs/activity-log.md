# Activity Log — NEON VOID

Newest entries at the top. One entry per working session: what shipped, deviations from plan, known issues, next step.

## 2026-07-02 — v1 build, research, PRD + session plan

- Built the complete v1 game as a single self-contained `index.html` (canvas, WebAudio, touch joystick, 3 weapons with tiers, boss cycle, combo system, localStorage bests, particles/shake/hit-stop, parallax background). Verified in browser: zero console errors, ~7ms frame average with 200+ enemies, mobile 375px layout OK.
- Researched genre leaders (Vampire Survivors, Brotato, 20 Minutes Till Dawn): key missing hooks identified as evolutions, meta shop, pickups, elites, achievements/unlocks, reroll/banish. Known issue: base fire rate too slow, spawn pressure outpaces power without offense-upgrade luck (fix scheduled Session 2).
- Decisions: split into native ES modules (no bundler, still GitHub Pages zero-config); testing seam = Node built-in test runner for pure logic + `?debug=1` browser handle for smoke passes; PRD lives in docs/ (no git repo yet).
- Wrote `docs/prd.md`, `docs/session-plan.md`, project `CLAUDE.md`.
- Multiplayer decision: game stays an independent repo/engine; sanctioned modes are parallel play only — versus (live rival stats over the host app's Supabase Realtime) and async seeded leaderboards. Shared-battlefield co-op explicitly out of scope. Game-side seam: `seed` at mount (seedable RNG lands in Session 1 as `rng.js`), `onStats` outbound ~1/s, `setRival` inbound with a small HUD opponent panel (API frozen in Session 7). The game never imports network code.
- Known issues: none in v1 beyond the balance complaints above. `.claude/launch.json` (`static` config) serves the game locally on port 8137.
- Next step: **Session 1** — module split (pure refactor) + test scaffold. See `docs/session-plan.md`.
