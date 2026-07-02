# NEON VOID — Wave Survivor

A Vampire Survivors-style neon arcade shooter. Plain canvas + WebAudio, native ES modules — no frameworks, no build step, no assets.

**Play:** enable GitHub Pages on this repo (Settings → Pages → Deploy from branch → `main` / root) and open the published URL. Works on desktop (WASD/arrows) and mobile (drag anywhere to move).

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

Zero-dependency unit tests (Node built-in runner) covering the pure modules: event bus, save migrations, seedable RNG, balance math. A browser smoke checklist lives at the top of [docs/session-plan.md](docs/session-plan.md); open the game with `?debug=1` to expose the `NV_DEBUG` driving handle.

## Project docs

- [PRD](docs/prd.md) — product spec and roadmap
- [Session plan](docs/session-plan.md) — the work, broken into single-session increments
- [Activity log](docs/activity-log.md) — running history
