---
name: pinnacle-qa
description: Check Pinnacle's game visually and for glitches with the ready-made scripts in tools/qa (playthrough with a frame monitor, every-screen sweep, frame capture, map paging). Use whenever reviewing the game, verifying a visual or animation change, or hunting bugs, instead of writing new Playwright scripts.
---

# Pinnacle QA

All scripts serve the repository themselves (no long-running server: starting one in the background is refused in
cloud sessions). Run from the repository root. Pass `PORT=81xx` to run two at once. Output dirs `qa-out/` and
`qa-frames/` are git-ignored.

| Need | Command | Read |
|---|---|---|
| Glitches in play | `PORT=8131 node tools/qa/play.js <seed> <desktop\|phone> <startPitch> <rounds>` | one JSON line: `errs`, `mon[].log` |
| Every screen, 3 sizes | `node tools/qa/screens.js qa-out` | `qa-out/sheet_phone.png`, `sheet_land.png`, `sheet_desk.png` |
| Motion frame by frame | `node tools/qa/capture.js qa-frames wall,jerk,hook,fall` then `python3 tools/qa/sheet.py out.png 'qa-frames/climb_*.png' 3 30 0 230 400 1 10` | contact sheet |
| Map paging stays level | `node tools/qa/mapnav.js` | one `top` value per size |
| Rules | `node test/rules.test.js` | `all passed` |

Look at contact sheets, not single full screenshots: one sheet image costs about the same as one screenshot.

## Monitor flags (tools/qa/monitor.js)
`jump <who> Npx` = the drawn figure moved more than plausible in one frame; `tie jump` = the rope's knot did;
`off screen`; `camera jump`; `non-finite position`.

Known harmless (do not chase): `stand -> work` / `work -> work` (kneeling and the mallet at camp), `cheer -> cheer`
tie jumps (turning round), `idle -> climb` tie jump (knot moves with the pose). Anything on the wall (`climb/wall`)
or a `mantle` transition is real.

## In-page hooks
In a game frame: `FX` (scene state: `FX.A.me/mate` rigs, `FX.rope`, `FX.pins`, `FX.cam`, `FX.split`), `S` (game
state, `S.team`), `DIR` (sequence queue). `test.html` controls: `#goPitch`, `[data-force=both|jerkL|jerkB|wrong|time]`,
`#withHook`, `[data-size=phone]`, `[data-view=p1]`, and the scene lab `[data-lab=".25"|pause]`, `#labStep`.
Set `S.tipsOff=true` and click `.cskip` so first-climb tips don't cover the scene.
