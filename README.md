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
- Styles and scripts are fetched fresh every minute, so an update reaches everyone quickly. The art under `assets/` is cached instead: when a picture is changed or added, raise `window.AV` in `index.html` (and the same number on the loading screen's image there).
- `test.html` plays both climbers side by side on an in-memory database, with controls to jump around the climb.
- Rope teams, answers and who's online are stored in a Firebase Realtime Database, read and written over its REST API (no SDK).
- `database.rules.json` holds the database access rules. Paste them into Firebase console → Realtime Database → Rules whenever they change.
