---
name: pinnacle-codebase
description: A map of Pinnacle's code (where each system lives and its key functions), so a change can go straight to the right lines instead of reading whole files. Use before reading or editing js/scene.js, js/game.js or js/title.js.
---

# Where things are

Plain HTML/CSS/JS, no build. `grep -n "^function name\|name(" js/file.js` then read only that range.

**js/scene.js** (the climb on a canvas, ~1700 lines)
- Top: `FX` state, palette `C`, pixel helpers (`rect`, `pline`, `pdisc`), `loadArt` (valley, rock, ledge, tent).
- Route geometry: `holdXY`, `boltXY`, `hookXY`, `rockEdge`, `idxOf`, `restSpot`, `mateIdx`, `rigTargets`.
- Climber art: `CLIMB_GEO`, `MANTLE_SK`, `TIE_GEO`/`tieOf` (rope tie points per frame), `loadClimber`, `climbAt`.
- `class Rig`: moves (`stepUp`, `topOut`, `lowerOff`, `walkTo`, `startFall`, `yank`, `jolt`), `update` (physics,
  idle gestures, sitting), `artFrame` (which frame), `blit` (clip-change easing), `draw` (incl. mantle path).
- Rope: `ropeTones`, `class Rope` (`update` slack springs keyed by pin id, `points`, `draw`, `knots`), `ropePins`,
  `ropeSlack`, `ropeStep` (places climbers, then the rope).
- Camera: `sceneArea`, `damp`, `updateCam` (pair framing, split view). Phone pixel scale in `ensureScene` → `fit`.
- Frame: `frame` (time, lab, tweens), `paint`, `paintView` (draw order), `drawStorm`, `drawNight`.
- Sequences: `makeCamp`, `leaveCamp`, `climbRig`, `downRig`, `caught`, `fallRig`, `runEvent` (a round's result
  played out), `runSummit`, `runDemo`, `DIR`/`enqueue` (one sequence at a time), `drawTopo` (state → sequences).

**js/game.js** (state, Firebase, panels)
- Rules: `MAX_GAP`, `newExp`, `judge`, `applyOutcome`, `pickQuiz`, `EVENTS`, `startPitch`, `advance`.
- Panels: `answerView`, `outcomeOf`, `revealView`, `revealNow`/`tapNext`, `renderPanel`, HUD.
- Map: `renderWorld`, `renderPop`/`placePop`, `MAPFX` (living map canvas: trails, team, clouds), `fitWorld`
  (framing; `S.mapFocus`), drag/paging, `lookMap`.
- Tips: `TIPS`, `coach`, `placeTip`. Tick: `nextAfterMs`, `autoNext`.

**js/title.js**: title menu (`showHome`, `homeMenu`), `TFX` (title painting's motion: flag, summit snow, mist,
cloud rims, sky streaks, snowfall, pine sway, breath, birds). **js/climber.js**: profile, kit, character select
(`charScreen`). **js/quiz.js**: `QUIZ` (id, tier 1–4, cat, q, o[0] right, hint, x), peak-height generator.
**js/audio.js**: `sfx(kind)`, `buzz`. **css/style.css**: later rules override earlier ones; append new rules at the
end with a comment.
