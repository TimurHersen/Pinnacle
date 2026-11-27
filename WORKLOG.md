# Pinnacle worklog

Read this first in every session. It records what has been done, what was decided and why, and what is open, so
a session can pick up the work without re-reading the code or re-reviewing the game. Add an entry at the top of
**Log** for every piece of work you commit (newest first, a few lines each). Keep **State** and **Open** current.

## State (2026-11-27)

- `main` is what players get (GitHub Pages). Everything in the log below from 2026-11-26 on is on the branch
  `claude/exciting-cori-6zus7w` and is **not on `main` yet**: nothing reaches players until that branch is merged.
- Rules tests: `node test/rules.test.js` (all pass). Raise `window.V` in `index.html` for any change in `css/` or
  `js/`, and `window.AV` (and the boot image's `?art=`) for any changed picture under `assets/`.
- QA tools live in `tools/qa/` (see `.claude/skills/pinnacle-qa`). Map trails are hand-laid in
  `art/maps/routes.json` (see `.claude/skills/pinnacle-map-trails`).

## Decisions (keep these unless the owner says otherwise)

- **The rope jerk stays strong.** A climber who answers right but is already 3 pitches ahead is held with the full
  jolt, shake (1.8), "ROPE JERK!" pop-up and caption. It is deliberate: it stops climbers getting too far apart.
  Polish around it, never soften it.
- **The rope is a quiet, state-driven cord**: 1 px core + 1 px shade in tones from the kit colour, no outline, slack
  set by the gap (loose loop when level, straight at 3 pitches), still unless something happens.
- **Motion has a purpose.** No effect just to look busy; reduced motion turns ambient motion off.
- Pixel art stays crisp: whole device pixels per art pixel (phones scale by device pixels, e.g. 1.33 CSS px).

## Open

- Aurora Reach has no question theme (every other map has one). Owner to choose: a theme (Weather?) or keep mixed.
- The 16 tier-4 questions added 2026-11-27 (ids: seaotterfur, vicuna, crows, squideye, chiru, takin, markhor,
  lammergeier, ruppell, hoodedseal, bristlecone, watermelonsnow, krummholz, sequoia, cushionplant, yellowleaves)
  want a human fact-check.
- Known, accepted: the monitor flags kneeling/hammering at camp, turning to cheer, and the rope knot moving with a
  pose change. These are measurement artefacts, not glitches.

## Log

### 2026-11-27 — map plate, map paging, worklog and skills
- Map plate: subtitle split into two lines; nothing can widen the plate past its frame (it overflowed on Aurora).
- Paging maps keeps the view's height; only the team's own map settles vertically (it glided up/down on tall windows).
- Added this worklog, `CLAUDE.md`, `.claude/skills/` and `tools/qa/` (static server, frame monitor, playthrough,
  screen sweep, frame capture, map-paging check) and `art/tools/mapgrid.py`.

### 2026-11-27 — living title screen
- Snow at two depths on the summit's wind, high cloud streaks behind the peak (sky mask), pine crowns swaying a
  pixel in gusts, the climber's breath every few seconds, the first menu item's markers nudging at rest. `js/title.js` (TFX).

### 2026-11-27 — quiz
- 16 tier-4 Animals/Nature questions (tier 4 was 93/136 Mountains). Canyon hint fixed. The pre-result beat reads
  "Testing the holds" (rope wording only on a real jerk). Camp/summit results worded as the push to them.

### 2026-11-27 — glitch pass, camp, falls
- Climber select in phone landscape (two columns); map card scrolls on short screens; team menu close X visible;
  Privacy link hidden over open title panels; post-fall reach timed by distance; pull-up eases in (was a 9 px snap).
- Camp make/break ~4 s each (was ~7). After a fall the rope swings the climber in to the rock before they reach.

### 2026-11-27 — phone framing, rope down the face
- Phones scale by whole device pixels, ~300 art px of open height: a pair a pitch apart no longer splits the view.
- From a belayer standing back, the rope runs to the wall's foot and up the face.

### 2026-11-26 — map trails, title birds
- All 12 trails (6 maps × wide/tall) hand-laid on the paintings (`art/maps/routes.json` → `art/tools/trails2.py` →
  `assets/maps/trails.json`); the old tracer cut through forest and up cliffs. Painted, frozen birds removed from
  the title art; animated flocks start in the sky.

### 2026-11-26 — polish review and the rope
- Review published as an artifact. Quiet rope (palette, damping, springs keyed by pin id, tie points per frame from
  `art/tools/ties.py`, knots over sprites, split-view divider as the rope), falls caught on a real pin, pass-by
  without floating, directional shake gated by reduced motion, fewer pop-up words, climb rhythm, scene-clock timers,
  HUD "Gap", tap to continue, rope lab in `test.html`.
