"""Build assets/maps/trails.json from the hand-laid routes in art/maps/routes.json.

Each map's trail is laid by hand on the painting (each shape, wide and tall, separately): the camp, each mountain's
stop at its foot (feet), the junctions where the trail forks and meets again (J0, J1, J2), and for each leg of the
trail the waypoints between its two ends, following the painted footpaths where there are any and open ground
where there aren't (never through the forest, across water away from a ford, or up a cliff). Each leg is a smooth
curve through its waypoints (Catmull-Rom), written out as a polyline a couple of pixels a point; the game resamples
it. The way up each mountain from its stop is left to the game (a gentle curve to the summit).
Run from the repository root: python3 art/tools/trails2.py [preview-dir]  (the preview draws every route on its
painting, to check by eye)
"""
import json, math, os, sys
from PIL import Image, ImageDraw

def catmull(pts, step=2.0):
    if len(pts) < 3:
        (x0, y0), (x1, y1) = pts; n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        return [[round(x0 + (x1 - x0) * k / n, 1), round(y0 + (y1 - y0) * k / n, 1)] for k in range(n + 1)]
    P = [pts[0]] + pts + [pts[-1]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        n = max(2, int(math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
        for k in range(n):
            t = k / n; t2, t3 = t * t, t * t * t
            out.append([round(.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3), 1) for c in (0, 1)])
    out.append([float(pts[-1][0]), float(pts[-1][1])]); return out

def build(src):
    out = {}
    for key, R in src.items():
        if key.startswith("_"): continue
        at = {"camp": R["camp"], **R["feet"], **R["J"]}; E = {}
        for leg, mid in R["e"].items():
            a, b = leg.split(">"); E[leg] = catmull([at[a]] + mid + [at[b]])
        out[key] = {"camp": R["camp"], "feet": R["feet"], "J": R["J"], "e": E}
    return out

if __name__ == "__main__":
    src = json.load(open("art/maps/routes.json")); res = build(src)
    json.dump(res, open("assets/maps/trails.json", "w"), separators=(",", ":"))
    if len(sys.argv) > 1:
        os.makedirs(sys.argv[1], exist_ok=True)
        for key, R in res.items():
            m, s = key.split("|"); im = Image.open(f"assets/maps/{m}-{s}.png").convert("RGB"); d = ImageDraw.Draw(im)
            for leg, pts in R["e"].items(): d.line([tuple(p) for p in pts], fill=(255, 0, 255), width=2)
            for k, (x, y) in {**R["feet"], **R["J"], "camp": R["camp"]}.items():
                d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 255, 0)); d.text((x + 4, y - 5), k, fill=(255, 255, 255))
            im.resize((im.width * 2, im.height * 2), Image.NEAREST).save(f"{sys.argv[1]}/{m}_{s}.png")
