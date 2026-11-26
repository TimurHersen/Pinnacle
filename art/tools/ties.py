"""Find where the rope ties in (the front of the harness) on every frame of a base climber's clips.

The harness was marked by hand on one frame of each clip (ANCHORS: the front of the belt, where the rope's knot
sits). Every frame is then matched to the marked frames by its torso: the block of pack, jacket and belt above the
tie point is slid over the frame until it fits best, and the tie point moves with it. A frame is tried against its
own clip's mark and the marks of the poses it passes through (a sit starts standing, a pull-up starts from the
climb's grip), and the best fit wins.
Prints one JSON object, {who: {clip: [[x, y], ...]}}, for js/scene.js (TIE_GEO); with a file name, also draws a sheet
with every point marked, to check by eye.
Run from the repository root: python3 art/tools/ties.py [sheet.png]
"""
import json, sys
from PIL import Image, ImageDraw
import numpy as np
from numpy.lib.stride_tricks import sliding_window_view

CLIPS = ["climb", "rest", "yes", "idle", "look", "drink", "slump", "land", "sit", "walk", "belay", "yank", "cheer",
         "fall", "dangle", "tumble", "mantle"]
# (clip: the frame marked by hand and the tie point on it)
ANCHORS = {
    "lumberjack": {"climb": (0, 70, 58), "idle": (0, 55, 54), "walk": (0, 54, 53), "belay": (0, 66, 58), "yank": (3, 76, 60),
                   "fall": (0, 66, 56), "dangle": (0, 68, 54), "tumble": (0, 64, 53), "land": (0, 59, 57), "sit": (8, 59, 77),
                   "cheer": (0, 75, 68), "mantle": (8, 78, 53)},
    "woman": {"climb": (0, 70, 58), "idle": (0, 53, 55), "walk": (0, 54, 54), "belay": (0, 65, 60), "yank": (3, 72, 60),
              "fall": (0, 63, 58), "dangle": (0, 65, 56), "tumble": (0, 61, 55), "land": (0, 55, 64), "sit": (8, 58, 71),
              "cheer": (0, 73, 67), "mantle": (8, 76, 52)}}
# (clips drawn in the pose of another's marked frame)
SAME = {"rest": "climb", "yes": "climb", "look": "idle", "drink": "idle", "slump": "idle"}
ALSO = {"sit": ["idle"], "land": ["idle"], "mantle": ["climb", "idle"], "yank": ["belay", "idle"], "cheer": ["idle"],
        "fall": ["climb", "dangle"], "tumble": ["dangle"], "dangle": ["tumble"], "belay": ["idle"], "walk": ["idle"]}

def load(who, clip, i):
    return np.asarray(Image.open(f"assets/climbers/{who}/{clip}/{i}.png").convert("RGBA")).astype(np.float32)

def count(who, clip):
    n = 0
    while True:
        try: Image.open(f"assets/climbers/{who}/{clip}/{n}.png")
        except FileNotFoundError: return n
        n += 1

def template(who, src):
    f, tx, ty = ANCHORS[who][src]; ref = load(who, src, f); x0, y0 = tx - 22, ty - 24
    tpl = ref[y0:ty + 2, x0:tx + 1]
    return tpl, (tpl[..., 3] > 40).astype(np.float32), x0, y0, tx, ty

def match(tpl, mask, im, cx, cy, r=36):
    """Where the block fits the frame best, as an offset from (cx, cy), and how well (lower is better)."""
    h, w = mask.shape
    W = sliding_window_view(im, (h, w, 4))[:, :, 0]
    # colour difference where the block has the figure, and a penalty where the frame has nothing there
    cost = (((W[..., :3] - tpl[..., :3]) ** 2).sum(-1) * mask).sum((-1, -2)) + ((W[..., 3] < 40) * mask).sum((-1, -2)) * 3e4
    ys, xs = np.mgrid[0:cost.shape[0], 0:cost.shape[1]]
    cost[(abs(ys - cy) > r) | (abs(xs - cx) > r)] = np.inf
    y, x = np.unravel_index(np.argmin(cost), cost.shape)
    return x - cx, y - cy, cost[y, x] / mask.sum()

def run(who):
    out = {}
    for clip in CLIPS:
        src = SAME.get(clip, clip)
        T = [template(who, k) for k in [src] + ALSO.get(src, [])]
        pts = []
        for i in range(count(who, clip)):
            im = load(who, clip, i); best = None
            for tpl, mask, x0, y0, tx, ty in T:
                dx, dy, c = match(tpl, mask, im, x0, y0)
                if best is None or c < best[0]: best = (c, tx + dx, ty + dy)
            pts.append([int(best[1]), int(best[2])])
        a = ANCHORS[who][src]; out[clip] = tidy(clip, pts, a[1:])
    return out

# (the match can lock onto the wrong side of a figure that is turning: in the loops, where the body hangs or stands in
# much the same place throughout, a point far from the one marked by hand is put back on it; in the sit, which only moves one
# way, the frames between standing and seated are spaced evenly between the two)
LOOPS = {"idle", "look", "drink", "slump", "walk", "belay", "dangle", "tumble"}
def tidy(clip, pts, mark):
    if clip in LOOPS:
        mx, my = mark
        pts = [p if abs(p[0] - mx) + abs(p[1] - my) <= 6 else [mx, my] for p in pts]
    if clip == "sit":
        a, b = pts[2], pts[-1]; n = len(pts) - 3
        pts = pts[:3] + [[round(a[0] + (b[0] - a[0]) * k / n), round(a[1] + (b[1] - a[1]) * k / n)] for k in range(1, n)] + [b]
    return pts

if __name__ == "__main__":
    res = {w: run(w) for w in ANCHORS}
    print(json.dumps(res, separators=(",", ":")))
    if len(sys.argv) > 1:
        SC = 3; rows = []
        for who in res:
            for clip, pts in res[who].items():
                row = Image.new("RGBA", (9 * 96 * SC, 96 * SC), (90, 120, 160, 255))
                for i, (x, y) in enumerate(pts):
                    im = Image.open(f"assets/climbers/{who}/{clip}/{i}.png").convert("RGBA").crop((16, 16, 112, 112)).resize((96 * SC, 96 * SC), Image.NEAREST)
                    row.alpha_composite(im, (i * 96 * SC, 0)); d = ImageDraw.Draw(row); X = i * 96 * SC + (x - 16) * SC; Y = (y - 16) * SC
                    d.ellipse((X - 6, Y - 6, X + 6, Y + 6), fill=(255, 0, 255, 255)); d.text((i * 96 * SC + 3, 3), f"{clip} {i}", fill=(255, 255, 255, 255))
                rows.append(row)
        S = Image.new("RGBA", (rows[0].width, sum(r.height for r in rows)), (40, 40, 40, 255)); y = 0
        for r in rows: S.paste(r, (0, y)); y += r.height
        S.save(sys.argv[1])
