# NEON VOID — Wave Survivor

A Vampire Survivors-style neon arcade shooter in a single HTML file. Plain canvas + WebAudio — no frameworks, no build step, no assets.

**Play:** enable GitHub Pages on this repo (Settings → Pages → Deploy from branch → `main` / root) and open the published URL. Works on desktop (WASD/arrows) and mobile (drag anywhere to move).

## Run locally

Any static server works (ES modules won't load over `file://` after the planned module split):

```
python -m http.server 8137
```

then open http://localhost:8137

## Project docs

- [PRD](docs/prd.md) — product spec and roadmap
- [Session plan](docs/session-plan.md) — the work, broken into single-session increments
- [Activity log](docs/activity-log.md) — running history
