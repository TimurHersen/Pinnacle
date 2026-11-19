# Pinnacle

A quiz climb for two. Rope up with a partner and answer questions together pitch by pitch, from base camp to the summit, drawn as a 16-bit pixel-art mountain adventure.

Play it at **https://timurhersen.github.io/Pinnacle/**

## How it works

- Plain HTML, CSS and JavaScript with no build step: `index.html` loads `css/style.css` and the scripts in `js/` in order.
  - `js/content.js`: the route (stages, camps, how hard each pitch is) and the maps (`MAPS`): six painted regions
    (`assets/maps/`) of six mountains each, along a trail of four stops (one mountain, a fork of two, another fork, then the map's summit).
    The team travels the trail: after each climb it walks on to that stop, and can go on only to the next one(s);
    climbing the summit collects the map and opens the next. The map is alive (`MAPFX` in `js/game.js`) and fills the
    screen: tap a mountain's banner to choose it, and scroll or swipe to look at the maps ahead. Each mountain's
    difficulty, time per question, hooks and heights follow from how far along the maps it is (`MOUNTAINS`).
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
- Accounts (`js/account.js`, optional): Firebase Authentication, email and password or Google. Every visitor is
  signed in as an anonymous guest from the start, and creating an account keeps that guest's progress. An account
  remembers its player id and rope teams at `users/<account id>`, so they follow it to any device. Switched on by
  pasting the web app's `apiKey` into `FIREBASE_WEB`; until then the game runs without sign-in.
  To switch on, in this order: Firebase console → Authentication → Sign-in method: enable Email/Password, Google
  and Anonymous; Authentication → Settings → Authorized domains: add `timurhersen.github.io`; paste the `apiKey`
  and push; only then paste `database.rules.json` (its writes need a signed-in player, guest or account).
- `database.rules.json` holds the database access rules. Paste them into Firebase console → Realtime Database → Rules whenever they change. They keep a team from being deleted, check the shape of what's written, cap the length of names and messages, and let each climber clear their own entry from the list of who's online.
