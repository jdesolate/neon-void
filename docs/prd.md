# PRD — NEON VOID: Modularization + Engagement Roadmap

Status: ready-for-agent
Date: 2026-07-02
Owner: MJ (first game project; future integration into Habit Quest web app)
Working docs: session breakdown in `session-plan.md`, running history in `activity-log.md`

## Problem Statement

NEON VOID is a complete, polished vertical slice of a wave-survivor game, but as a player experience and as a codebase it has ceilings:

- **Runs feel samey and early combat feels weak.** The starting weapon fires too slowly, and enemy spawn pressure outpaces player power unless the level-up RNG happens to offer damage or attack speed. Players can do everything right and still feel like nothing is changing.
- **There is no reason to return after a run ends.** The only persistent hooks are best time and best kills. The genre's proven retention systems — weapon evolutions, permanent meta-progression, unlockables, random reward moments — are absent.
- **The codebase is one ~1,000-line HTML file.** Adding systems safely across many work sessions is hard: tuning constants are scattered, content is entangled with logic, and there is no way to verify changes other than manual play.
- **Future integration is blocked.** The owner plans to embed the game into their Habit Quest web app (habit completions granting in-game rewards). The current architecture has no public surface to mount, configure, or persist through.

## Solution

Restructure the game into zero-build ES modules with data-driven content tables and a single public API seam, then layer in the retention systems that made Vampire Survivors and Brotato genre-defining — in independently shippable increments, each sized to fit one Claude Code session.

From the player's perspective: combat feels responsive from second one and every level-up makes you stronger no matter what you pick; maxed weapons evolve into spectacular super-weapons via boss chests; gold persists between runs and buys permanent upgrades so even a failed run progresses you; rare pickups, elite enemies, achievements, and an unlockable second character give every run side-goals beyond the score.

From the owner's perspective: content additions become data rows, all balance lives in one table, systems communicate through events instead of direct calls, saves are versioned and migratable, and the same API seam that tests use is the one Habit Quest will mount.

## User Stories

### Combat feel and fairness
1. As a player, I want my starting weapon to fire quickly from the first second, so that the game feels responsive before any upgrades.
2. As a player, I want every level-up to make me innately slightly stronger, so that progress never stalls on upgrade luck.
3. As a player, I want at least one offensive option in every upgrade choice, so that I am never locked out of scaling my damage.
4. As a player, I want the first minute to be gentle and the pressure to ramp in readable pulses, so that difficulty feels fair rather than arbitrary.
5. As a player, I want enemy surges and bosses telegraphed before they hit, so that deaths feel like my mistake and not a cheap shot.

### Power fantasy and evolutions
6. As a player, I want each weapon to transform into a visually spectacular evolved form when maxed and conditions are met, so that I chase builds and not just survival time.
7. As a player, I want bosses to drop treasure chests with a suspenseful reveal, so that beating a boss feels like an event.
8. As a player, I want evolved weapons to look and sound clearly different from their base forms, so that reaching one feels like a trophy.
9. As a player, I want to see which evolutions exist and what they need, so that I can plan a build across a run.

### Meta-progression and economy
10. As a player, I want enemies to drop gold that I keep even when I die, so that every run advances me.
11. As a player, I want a shop on the start screen that sells small permanent upgrades, so that I get stronger across runs.
12. As a player, I want shop prices to escalate so choices matter, so that the economy stays interesting over many runs.
13. As a player, I want my bests, gold, unlocks, and achievements to survive page reloads and game updates, so that I never lose progress.

### Moment-to-moment variety
14. As a player, I want rare pickup drops (heal, gem vacuum, screen bomb), so that lucky moments punctuate a run.
15. As a player, I want occasional elite enemies with a guaranteed reward, so that I sometimes want to hunt rather than flee.
16. As a player, I want a reroll and a banish option on the level-up screen, so that I have agency over bad RNG.

### Long-term goals
17. As a player, I want achievements with visible progress, so that I always have a side-objective.
18. As a player, I want achievements to unlock things (a second character with a different starting weapon), so that the same content stays replayable.
19. As a player, I want a "NEW BEST" moment and a target to beat on the start screen, so that one more run always has a purpose. (exists — preserve)

### Platform
20. As a mobile player, I want identical features and stable frame rate on my phone, so that the game is not a lesser experience on touch.
21. As a player, I want sound that reinforces every reward moment, so that getting stronger is audible.

### Owner / developer
22. As the owner, I want all tuning numbers in one balance table, so that a balance pass touches one place.
23. As the owner, I want weapons, enemies, upgrades, evolutions, and achievements defined as data rows, so that adding content does not require touching system code.
24. As the owner, I want gameplay systems to announce domain events (kill, level-up, chest, run end) that meta systems subscribe to, so that new features attach without modifying combat.
25. As the owner, I want pure logic covered by zero-dependency unit tests, so that regressions surface before playtesting.
26. As the owner, I want a scripted browser smoke pass, so that any session can prove the game still runs clean end-to-end.
27. As the owner, I want the work split into single-session increments with acceptance criteria, so that Claude sessions can end and resume without losing the thread.
28. As the owner, I want saves versioned with migrations, so that shipping updates never wipes players.

### Habit Quest integration (seam only, integration itself out of scope)
29. As the Habit Quest app, I want to mount the game into a container element with options, so that it can live inside another product.
30. As the Habit Quest app, I want a run-end callback with the run's results, so that gameplay can feed quest logic.
31. As the Habit Quest app, I want to inject a save adapter, so that persistence can move from localStorage to a backend without game changes.
32. As the Habit Quest app, I want to grant currency/unlocks externally through the public API, so that habit completions can reward players in-game.

### Multiplayer seam (parallel play; realtime transport lives in Habit Quest, not the game)
33. As the Habit Quest app, I want to pass a seed when mounting the game, so that two players face the same spawn pattern and upgrade offers in a versus run.
34. As the Habit Quest app, I want a periodic live-stats callback (time, kills, combo, HP, level), so that it can broadcast a player's run over its existing Supabase Realtime channels.
35. As the Habit Quest app, I want to push rival stats into the game, so that players see their opponent's progress on screen during a versus run.
36. As a player, I want to race a friend on the same seed and watch their kills/combo tick live, so that runs become social without waiting for turns.
37. As a player, I want daily seeded runs with shared leaderboards, so that my friends and I compete on identical conditions asynchronously.

## Implementation Decisions

- **Native ES modules, no bundler.** The single HTML file splits into a thin HTML shell plus modules loaded with `type="module"`. GitHub Pages serves this zero-config. Trade-off accepted: the game now requires an HTTP server even locally (`file://` will not work); the repo's existing static-server launch config covers local dev.
- **Module boundaries by responsibility, not by size**: engine concerns (loop/timescale, camera/shake, input, audio, sprite pre-rendering, particles, events, save), content tables (weapons, enemies, upgrades, evolutions, achievements, meta-shop, balance), gameplay systems (player, enemy spawning/AI, weapon runtimes, economy/pickups, level-up flow), presentation (world render, screen FX, HUD/overlay bindings), and one composition/boot module that wires everything.
- **One public seam: the `NeonVoid` API.** `mount(element, options)` boots the game; options carry a run-end callback, an optional save adapter, and external grant methods. Tests, the debug harness, and the future Habit Quest embed all consume this same surface. No second integration path.
- **Debug handle gated behind a `?debug=1` query flag** exposing read/drive access (grant XP, spawn boss, read frame-time average) for scripted browser smoke checks. Absent from normal play.
- **Synchronous event bus** for domain events: enemy-killed, level-up-opened, upgrade-chosen, boss-spawned, chest-opened, pickup-collected, run-ended. Gameplay emits; achievements, economy, and stats subscribe. Combat code never imports meta systems.
- **Single balance table** holding every tuning constant (fire intervals, spawn curves, HP scaling, costs, drop rates). Systems read from it; no magic numbers inline.
- **Combat baseline changes** (numbers live in the balance table, tuned via playtest): starting fire interval roughly halved with per-shot damage trimmed to keep early DPS moderately higher; innate per-player-level attack speed and damage growth; upgrade rolls constrained so every 3-card offer includes at least one offensive card; spawn curve flattened in the first minute and steepened after minute three.
- **Evolutions** are data rows referencing a base weapon, a requirement (max level, later possibly a paired stat), and an evolved behavior/visual variant. Delivery mechanism: bosses drop a chest; opening it plays a reveal sequence and applies the highest-priority eligible evolution, or gold if none.
- **Economy**: gold drops from kills (weighted by tier, elites/bosses guaranteed), persists in the save, and funds a start-screen meta shop of small permanent stat bumps with geometrically escalating costs.
- **Pickups** implemented through one shared drop-table system rolled on kill: heal, magnet vacuum, screen bomb.
- **Elites** are a modifier wrapper over existing enemy tiers (stat multipliers, visual ring, guaranteed drop) rather than new enemy types.
- **Achievements** are threshold subscriptions on the event bus, persisted in the save, with rewards referencing unlockables. First unlockable: a second character with a different starting weapon and stat spread.
- **Versioned save schema**: one storage key holding a JSON blob with a schema version and a migration chain on load. The existing two best-score keys migrate into v2 on first load. The save module hides the storage backend behind an adapter interface.
- **Multiplayer direction: parallel play only.** Sanctioned modes are versus (simultaneous runs with live rival stats exchanged as small latency-tolerant messages) and async seeded competition (daily runs, leaderboards) — the same model as Habit Quest's existing math-challenge multiplayer, carried by the app's Supabase Realtime. The game itself never imports network code; its contribution is three seam features: a seed accepted at mount, a periodic outbound stats callback, and an inbound rival-stats setter rendered as a small opponent panel.
- **Seedable RNG from the start.** All gameplay randomness (spawns, tier picks, upgrade rolls, drops) routes through one seedable RNG helper introduced during the module split; cosmetic randomness (particles) may stay unseeded. Guarantee is seed fairness — same seed produces the same spawn pattern and upgrade offers — not lockstep determinism of full run outcomes.
- **Performance budget preserved**: pooled particles with caps, pre-rendered sprites, adaptive quality fallback. Acceptance bar: stable frame time with 200+ live enemies plus max-level weapons on a mid-range phone.
- **Refactor discipline**: the module split ships as a pure refactor with zero behavior change, verified against the smoke pass, before any feature work begins.

## Testing Decisions

- **A good test exercises external behavior through a public seam** — the `NeonVoid` API, the event bus contract, or a pure function's inputs/outputs. Tests never reach into rendering internals or private state.
- **Unit tests** use Node's built-in test runner (`node --test`), zero dependencies, covering the pure modules: balance/scaling math, upgrade roll constraints (guaranteed offense slot, no duplicates, capped picks excluded), evolution eligibility, economy costs and wallet math, drop-table distribution (with seeded RNG), achievement threshold logic, event bus semantics, and save migrations (v1 keys → current schema; corrupt/missing data paths).
- **Browser smoke pass** each session via the debug handle in a served page: boot with clean console → start run → grant XP and resolve a level-up → force boss cycle → die → verify game-over stats and persistence → restart → read frame-time probe under stress spawn. Prior art: the browser-eval verification flow used to validate the initial build (this is that flow, codified).
- **Manual playtest checklist** for feel changes (fire cadence, pacing pulses, evolution payoff), since feel cannot be asserted.
- No test frameworks, no DOM test rigs, no CI initially; `node --test` runs locally per session.

## Out of Scope

- Multiplayer, server-side leaderboards, accounts, or any backend.
- The actual Habit Quest integration (only the API seam is built and documented here).
- Bundlers, frameworks, TypeScript conversion, external assets (art/audio files), fonts.
- Monetization, analytics, telemetry.
- Native/store builds; the target remains one responsive web build on GitHub Pages.
- **Shared-battlefield co-op** (two players fighting the same enemies in one simulation). This requires an authoritative server or lockstep netcode and is explicitly ruled out; do not design toward it.
- Implementing the versus/async multiplayer modes themselves — matchmaking, channels, presence, and leaderboards are Habit Quest's job. This PRD only builds the game-side seam (seed, stats out, rival stats in).
- Daily seeded challenge runs and streak mechanics (strong future fit with Habit Quest; deliberately deferred, but the seed seam makes them cheap later).
- New enemy species beyond elite modifiers, additional stages/biomes, and third+ characters.

## Further Notes

- Work is sequenced into seven single-session increments in `session-plan.md`; each has its own acceptance criteria and verification steps, and assumes a fresh Claude session with no memory of prior ones.
- Biggest risks: the module split silently changing behavior (mitigated by the pure-refactor rule plus smoke pass) and save-schema changes wiping progress (mitigated by migration tests written before the migration ships).
- Design research grounding the feature set: Vampire Survivors' evolution/meta-shop/achievement loop and constant reward cadence; Brotato's wave pacing and reroll/lock agency; 20 Minutes Till Dawn's build-identity variance. The guiding principle: something good should happen every few seconds, and every run should advance something permanent.
