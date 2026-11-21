# boots.py [--fix]: some of Onyx's redrawn frames came back from the redraw with the bottom of the figure cut off
# (the boots and the shins below a straight line), so mid-animation his boots vanished and came back. Each such
# frame is found by its silhouette's lowest row lying well above (or, once, well below) the frame it was drawn from; with --fix, everything
# from just above that cut down is rebuilt from the original frame, recoloured into the reskin's own palette (each
# original colour becomes the colour the reskin most often has in its place, over all the frames that were not cut).
import glob,os,sys
from collections import Counter,defaultdict
import numpy as np
from PIL import Image
A=os.path.dirname(os.path.abspath(__file__))+"/../../assets/climbers"
PAIRS={"modcut":"lumberjack","redcat":"woman"}
def rgba(p):return np.asarray(Image.open(p).convert("RGBA")).copy()
def low(a):ys=np.where((a[:,:,3]>60).any(1))[0];return int(ys[-1]) if len(ys) else -1
fix="--fix" in sys.argv
for new,src in PAIRS.items():
  files=sorted(glob.glob(f"{A}/{new}/*/*.png"))
  pairs=[(f,f"{A}/{src}/{os.path.relpath(f,f'{A}/{new}')}") for f in files]
  pairs=[(f,s) for f,s in pairs if os.path.exists(s)]
  cut=[(f,s) for f,s in pairs if abs(low(rgba(s))-low(rgba(f)))>=3]
  if not cut:print(new,"no cut frames");continue
  # the palette: over the lower third of every good frame, each original colour and what the reskin has there
  # (two palettes: the boots, from the lowest BOOT rows only, so a dark sole never borrows the trousers' colour, and
  # the legs above them)
  BOOT=10;votes=[defaultdict(Counter),defaultdict(Counter)]
  for f,s in pairs:
    if (f,s) in cut:continue
    a,b=rgba(s),rgba(f);ys=np.where((a[:,:,3]>60).any(1))[0];y0=ys[0]+(ys[-1]-ys[0])*2//3
    for y in range(y0,a.shape[0]):
      for x in range(a.shape[1]):
        if a[y,x,3]>200 and b[y,x,3]>200:votes[1 if y>ys[-1]-BOOT else 0][tuple(a[y,x,:3])][tuple(b[y,x,:3])]+=1
  pals=[{k:v.most_common(1)[0][0] for k,v in V.items()} for V in votes]
  keys=[np.array(list(P.keys()),dtype=np.float32) for P in pals]
  def mapc(c,boot):
    c=tuple(int(v) for v in c);P,K=pals[boot],keys[boot]
    if c in P:return P[c]
    d=((K-np.array(c,dtype=np.float32))**2).sum(1);return P[tuple(int(v) for v in K[d.argmin()])]
  for f,s in cut:
    a,b=rgba(s),rgba(f);c=min(low(b),low(a)-4);y0=max(0,c-2)
    print(new,os.path.relpath(f,f"{A}/{new}"),"cut at",c,"original foot",low(a))
    if not fix:continue
    out=b.copy();out[y0:]=0
    for y in range(y0,a.shape[0]):
      for x in range(a.shape[1]):
        if a[y,x,3]>40:out[y,x,:3]=mapc(a[y,x,:3],1 if y>low(a)-BOOT else 0);out[y,x,3]=a[y,x,3]
        # (just above the cut the reskin's own pixels stay where the original has none)
        elif y<c and b[y,x,3]>40:out[y,x]=b[y,x]
    Image.fromarray(out).save(f)
