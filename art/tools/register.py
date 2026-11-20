# register.py [--fix]: the reskinned climbers (Onyx over Birch, Ember over Juniper) were redrawn frame by frame, and
# the redraw sometimes moved the figure inside its canvas. Each frame is matched against the frame it was drawn
# from (the overlap of their silhouettes, over shifts of up to 24 px) and, with --fix, moved back into register,
# so every pose sits exactly where the game's placement (measured on the originals) expects it.
import glob,os,sys
import numpy as np
from PIL import Image
A=os.path.dirname(os.path.abspath(__file__))+"/../../assets/climbers"
PAIRS={"modcut":"lumberjack","redcat":"woman"};R=24
def mask(im):return (np.asarray(im.convert("RGBA"))[:,:,3]>60).astype(np.float32)
def best(a,b):
    H,W=a.shape;bs=(-1,0,0)
    for dy in range(-R,R+1,1):
        for dx in range(-R,R+1,1):
            sb=np.zeros_like(b);ys,ye=max(0,dy),min(H,H+dy);xs,xe=max(0,dx),min(W,W+dx)
            sb[ys:ye,xs:xe]=b[ys-dy:ye-dy,xs-dx:xe-dx]
            s=(a*sb).sum()/max(1,np.sqrt(a.sum()*sb.sum()))
            if s>bs[0]:bs=(s,dx,dy)
    return bs
fix="--fix" in sys.argv;moved=[]
for new,src in PAIRS.items():
    for f in sorted(glob.glob(f"{A}/{new}/*/*.png")):
        rel=os.path.relpath(f,f"{A}/{new}");s=f"{A}/{src}/{rel}"
        if not os.path.exists(s):continue
        im=Image.open(f).convert("RGBA");a=mask(Image.open(s));b=mask(im)
        # (coarse search on every 2nd px, then fine around it)
        sc,dx,dy=best(a,b)
        if (dx or dy) and fix:
            out=Image.new("RGBA",im.size);out.paste(im,(dx,dy),im);out.save(f)
        if abs(dx)+abs(dy)>=2:moved.append((new,rel,dx,dy,round(sc,2)))
for m in moved:print(*m)
print(len(moved),"frames out of register")
