---
name: pinnacle-release
description: The checklist for committing a change to Pinnacle: tests, cache versions, worklog entry, commit style, and how changes reach players. Use before every commit to this repository.
---

# Committing a Pinnacle change

1. `node test/rules.test.js` must say `all passed` (required for any change to `js/game.js`, `js/content.js`,
   `js/quiz.js`).
2. Cache versions in `index.html`: raise `window.V="code=N"` for any change in `css/` or `js/`; raise
   `window.AV="art=N"` **and** the boot image's `?art=N` for any changed picture under `assets/` (trails.json too).
3. Verify visually with the `pinnacle-qa` skill when the change is visible.
4. Add an entry at the top of `WORKLOG.md` → Log (date, title, 2–4 lines), and update State/Open if they changed.
5. Commit message: a short title, then a few prose lines on what was wrong and what changed (see `git log`),
   ending with the attribution lines the session gives.
6. Push to the session's branch. **Players only get `main`** (GitHub Pages): say so plainly when reporting, and
   don't merge or open a PR unless the owner asks.

Code style: dense one-line JavaScript, no build step, comments in plain prose explaining why. Match it.
