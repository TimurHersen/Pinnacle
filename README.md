# Pinnacle

A quiz climb for two. Rope up with a partner, answer questions together pitch by pitch, and race a rival team from base camp to the summit, drawn as a 1930s rubber-hose cartoon.

Play it at **https://timurhersen.github.io/Pinnacle/**

## How it works

- The whole game is one file, `index.html`. No build step.
- Rope teams, answers and who's online are stored in a Firebase Realtime Database, read and written over its REST API (no SDK).
- `database.rules.json` holds the database access rules. Paste them into Firebase console → Realtime Database → Rules whenever they change.
