---
name: pinnacle-map-trails
description: How Pinnacle's map trails are laid and rebuilt (art/maps/routes.json -> art/tools/trails2.py -> assets/maps/trails.json), and how to inspect a map painting with a labelled grid. Use when a trail looks wrong or a map or stop moves.
---

# Map trails

- Source of truth: `art/maps/routes.json`, per `"<map>|<wide|tall>"`: `camp`, `feet` (each mountain's stop),
  `J` (junctions J0–J2 where the trail forks and rejoins) and `e` (each leg `from>to` → list of waypoints between
  its two ends, in painting pixels). Steps per map are in `js/content.js` (`MAPS[].steps`).
- Rebuild: `python3 art/tools/trails2.py qa-out/trails` (writes `assets/maps/trails.json`, plus previews of every
  route on its painting). Then raise `window.AV` and the boot image's `?art=` in `index.html`.
- Inspect: `python3 art/tools/mapgrid.py <map> <wide|tall> x0 y0 x1 y1` → `qa-out/grid_<map>_<shape>.png`, a zoomed
  painting with a grid labelled in painting pixels, the pins (orange), and the current trail (yellow).
- Rules that worked: follow painted footpaths where they exist; else open ground; never through forest, up a cliff
  or across water away from a ford. Branches that share a stretch get the *same* waypoints so they draw as one line.
- Aurora's wide painting has Frost's layout (routes reused, stops renamed, polarhorn moved); its tall painting
  differs. `art/tools/trails.py` (the automatic tracer) is superseded.
