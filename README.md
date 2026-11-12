# Pinnacle

A quiz climb for two. Rope up with a partner and answer questions together pitch by pitch, from base camp to the summit, drawn as a 16-bit pixel-art mountain adventure.

Play it at **https://timurhersen.github.io/Pinnacle/**

## How it works

- Plain HTML, CSS and JavaScript with no build step: `index.html` loads `css/style.css` and the scripts in `js/` in order.
  - `js/content.js`: the route (stages, camps, how hard each pitch is) and the three mountains on the map (`MOUNTAINS`: difficulty, time per question, hooks, heights, where each pin sits on `assets/map.png`)
  - `js/quiz.js`: the questions, each with a hint and a line shown with the answer
  - `js/game.js`: team state, Firebase, judging, the lobby, the play panels and the menu
  - `js/audio.js`, `js/music.js`: synthesised sound effects and the theme
  - `js/title.js`: the title screen
  - `js/scene.js`: the pixel-art climb on a `<canvas>` (one canvas pixel per art pixel, scaled up by a whole number)
  - `js/main.js`: boot
- Browsers keep the game's files between visits, at a version set in `index.html`:
  - when anything in `css/` or `js/` changes, raise `window.V` (`code=…`)
  - when a picture under `assets/` is changed or added, raise `window.AV` (and the same number on the loading screen's image there)
- Two ways to play: each climber on their own device, or on a big screen (title menu → Big screen). The big screen
  shows the climb and a QR code (`js/qr.js`); a phone that scans it joins as a controller. Links: `#t-CODE` an invite,
  `#tv-CODE` the big screen, `#pad-CODE` a controller.
- `test.html` plays both climbers side by side on an in-memory database, with controls to jump around the climb.
- `node test/rules.test.js` checks the climb's rules (answers, falls, hooks, the rope, camps, the summit score) and the question pool. It needs only Node, nothing to install; run it before every change to `js/game.js`, `js/content.js` or `js/quiz.js`.
- Rope teams, answers and who's online are stored in a Firebase Realtime Database, read and written over its REST API (no SDK).
- `database.rules.json` holds the database access rules. Paste them into Firebase console → Realtime Database → Rules whenever they change. They keep a team from being deleted, check the shape of what's written, cap the length of names and messages, and let each climber clear their own entry from the list of who's online.
