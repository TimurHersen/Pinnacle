# Pinnacle

A quiz climb for two. Rope up with a partner and answer questions together pitch by pitch, from base camp to the summit, drawn as a 16-bit pixel-art mountain adventure.

Play it at **https://timurhersen.github.io/Pinnacle/**

## How it works

- Plain HTML, CSS and JavaScript with no build step: `index.html` loads `css/style.css` and the scripts in `js/` in order.
  - `js/content.js`: questions, pitch types, the route and answer matching
  - `js/game.js`: team state, Firebase, judging, the lobby and the play panels
  - `js/audio.js`: synthesised sound effects
  - `js/scene.js`: the pixel-art climb on a `<canvas>` (one canvas pixel per art pixel, scaled up by a whole number)
  - `js/main.js`: boot
- Rope teams, answers and who's online are stored in a Firebase Realtime Database, read and written over its REST API (no SDK).
- `database.rules.json` holds the database access rules. Paste them into Firebase console → Realtime Database → Rules whenever they change.
