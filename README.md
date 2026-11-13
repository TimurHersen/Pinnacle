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
- On a keyboard, 1–4 or A–D picks an answer and Enter locks it in or moves on.
- `manifest.webmanifest` lets the game be installed to a phone's home screen or as a desktop app. There's no offline mode, because the climb needs the database.
- `test.html` plays both climbers side by side on an in-memory database, with controls to jump around the climb.

## Tests

- `node test/rules.test.js` checks the climb's rules (answers, falls, hooks, the rope, camps, the summit score) and the question pool. It needs only Node, nothing to install; run it before every change to `js/game.js`, `js/content.js` or `js/quiz.js`.
- `node test/versions.js <base commit>` checks that `window.V` / `window.AV` went up since that commit wherever `css/`, `js/` or `assets/` changed.
- `npx firebase-tools emulators:exec --only database,auth "node test/db.test.js"` checks the database rules on the Firebase emulators (needs Java).
- GitHub Actions (`.github/workflows/checks.yml`) runs all three on every push and pull request.

## The database

- Rope teams, answers and who's online are stored in a Firebase Realtime Database, read and written over its REST API (no SDK).
- Every device signs in to Firebase anonymously (no account, nothing to type: `AUTH` in `js/game.js`). A climber's seat on a team holds their device's sign-in, so the rules can tell the team's own climbers from anyone else who has the code.
- `database.rules.json` holds the access rules:
  - only a team's two climbers can change it, answer for themselves (and for the simulated partner) or talk on its radio; nobody can delete a team
  - anyone with the code can take a free second seat, and can take over a seat only after its climber has been offline for 90 seconds (playing on a new device)
  - a big screen can move a climb on once a climber's phone has scanned its code
  - each climber's entry on the list of who's online is theirs alone
  - names and messages are capped in length, and what's written is checked for shape
- Teams made before sign-ins keep working: each climber's seat is claimed by their own device the next time they open the team.
- `.github/workflows/deploy-rules.yml` puts the rules live whenever they change on `main`, after checking them on the emulators. It needs a repository secret named `FIREBASE_SERVICE_ACCOUNT`, holding the JSON key of a Google Cloud service account with the *Firebase Realtime Database Admin* role (Google Cloud console → IAM → Service accounts → Keys). Without the secret, paste the rules into Firebase console → Realtime Database → Rules by hand.
- Turning sign-ins on, in this order:
  1. Firebase console → Authentication → Sign-in method: enable **Anonymous**.
  2. Copy the Web API key (Project settings → General) into `FB_KEY` in `js/game.js`, raise `window.V`, and push. The key is public, like the database address.
  3. Once that's live, deploy the rules (with the secret, or by hand). The deploy refuses to run while `FB_KEY` is empty, because the game would be locked out.
- Open the game with `?emu` to play against the Firebase emulators on your own computer instead of the real database.
