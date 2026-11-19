# trails.py <maps.json> <out.json> [preview dir]: trace each map's trail along the paths painted in it.
# The painting's footpaths are thin strokes of tan earth; the route between two stops follows them where it can
# (cheap), crosses grass where it must, keeps out of the forest, the shadows and the sky, and never crosses water.
# Each stop is moved onto the nearest painted path. Output, per map and shape: the stops, the junctions and each
# edge as a simplified polyline (the game resamples it to one point a pixel).
import json,sys,heapq,colorsys,math
from PIL import Image,ImageDraw
A="/home/user/Pinnacle/"
maps=json.load(open(sys.argv[1]));out={};prev=sys.argv[3] if len(sys.argv)>3 else None
def classify(im):
    W,H=im.size;px=im.load();kind=[[0]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            r,g,b=px[x,y][:3];h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if g>150 and b>150 and r<140 and b-r>60 or (b>r+40 and b>g-10 and s>.35 and v>.35):k=5   # water
            elif 0.05<h<0.14 and .2<s<.6 and .42<v<.9:k=1                                         # earth
            elif v<.2:k=4                                                                          # deep shadow, forest
            elif .17<h<.45 and s>.25:k=3 if v<.42 else 2                                           # dark trees / grass
            elif s<.12 and v>.75:k=6                                                               # snow
            else:k=7                                                                               # rock and the rest
            kind[y][x]=k
    # thin earth (a path, a few pixels wide) from broad earth (a sunlit slope)
    thin=[[False]*W for _ in range(H)]
    for y in range(3,H-3):
        row=kind[y]
        for x in range(3,W-3):
            if row[x]!=1:continue
            n=sum(1 for dy in range(-3,4) for dx in range(-3,4) if kind[y+dy][x+dx]==1)
            thin[y][x]=n<26
    return kind,thin
COST={1:4,2:9,3:16,4:22,5:4000,6:10,7:12}
def costgrid(kind,thin,W,H,sky):
    C=[[0]*W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            c=1 if thin[y][x] else COST[kind[y][x]]
            if y<sky:c+=40
            C[y][x]=c
    return C
def astar(C,W,H,a,b):
    a=(int(round(a[0])),int(round(a[1])));b=(int(round(b[0])),int(round(b[1])))
    D={a:0};P={};q=[(0,a)];N=[(1,0,1),(-1,0,1),(0,1,1),(0,-1,1),(1,1,1.414),(1,-1,1.414),(-1,1,1.414),(-1,-1,1.414)]
    while q:
        d,u=heapq.heappop(q)
        if u==b:break
        if d>D.get(u,1e18):continue
        for dx,dy,w in N:
            x,y=u[0]+dx,u[1]+dy
            if 0<=x<W and 0<=y<H:
                nd=d+w*C[y][x]+math.hypot(x-b[0],y-b[1])*0  # (plain Dijkstra: costs vary too much for a safe heuristic)
                if nd<D.get((x,y),1e18):D[(x,y)]=nd;P[(x,y)]=u;heapq.heappush(q,(nd,(x,y)))
    path=[b];u=b
    while u!=a and u in P:u=P[u];path.append(u)
    return path[::-1]
def smooth(pts,k=3):
    o=[]
    for i in range(len(pts)):
        s=pts[max(0,i-k):i+k+1];o.append([sum(p[0] for p in s)/len(s),sum(p[1] for p in s)/len(s)])
    o[0]=list(pts[0]);o[-1]=list(pts[-1]);return o
def rdp(p,e):
    if len(p)<3:return p
    (x1,y1),(x2,y2)=p[0],p[-1];L=math.hypot(x2-x1,y2-y1) or 1;dm,im=0,0
    for i in range(1,len(p)-1):
        d=abs((y2-y1)*p[i][0]-(x2-x1)*p[i][1]+x2*y1-y2*x1)/L
        if d>dm:dm,im=d,i
    if dm>e:return rdp(p[:im+1],e)[:-1]+rdp(p[im:],e)
    return [p[0],p[-1]]
def snap(thin,W,H,pt,r=18):
    x0,y0=int(pt[0]),int(pt[1]);best=None
    for y in range(max(0,y0-r),min(H,y0+r+1)):
        for x in range(max(0,x0-r),min(W,x0+r+1)):
            if thin[y][x]:
                d=(x-x0)**2+(y-y0)**2
                if best is None or d<best[0]:best=(d,x,y)
    return [best[1],best[2]] if best else [x0,y0]
for M in maps:
    for shape,a in M["art"].items():
        im=Image.open(A+a["src"]).convert("RGB");W,H=im.size;kind,thin=classify(im)
        tall=a["h"]>a["w"];sky=int(H*(.08 if tall else .12))
        C=costgrid(kind,thin,W,H,sky)
        feet={k:[x,min(a["camp"][1]-26,y+a["h"]*(.2 if tall else .3))] for k,(x,y) in a["pins"].items()}
        feet={k:snap(thin,W,H,v) for k,v in feet.items()};camp=snap(thin,W,H,a["camp"],10)
        S2=M["steps"];E={};J={}
        cen=lambda ks:[sum(feet[k][0] for k in ks)/len(ks),sum(feet[k][1] for k in ks)/len(ks)]
        def add(p,q,key):E[key]=[[round(x,1),round(y,1)] for x,y in rdp(smooth(astar(C,W,H,p,q)),.6)]
        add(camp,feet[S2[0][0]],"camp>"+S2[0][0])
        for k in range(len(S2)-1):
            aa,bb=S2[k],S2[k+1]
            if len(aa)==1 and len(bb)==1:add(feet[aa[0]],feet[bb[0]],aa[0]+">"+bb[0]);continue
            ca,cb=cen(aa),cen(bb);j=snap(thin,W,H,[(ca[0]+cb[0])/2,(ca[1]+cb[1])/2],22);J["J"+str(k)]=j
            for x in aa:add(feet[x],j,x+">J"+str(k))
            for y in bb:add(j,feet[y],"J"+str(k)+">"+y)
        for k in feet:add(feet[k],a["pins"][k],k+">"+k)          # (the way up each mountain, from its foot to its top)
        out[M["id"]+"|"+shape]={"camp":camp,"feet":feet,"J":J,"e":E}
        if prev:
            pv=im.copy();dr=ImageDraw.Draw(pv)
            for key,pts in E.items():dr.line([tuple(p) for p in pts],fill=(255,40,200) if key.split(">")[0]!=key.split(">")[1] else (40,200,255),width=2)
            for k,v in feet.items():dr.ellipse([v[0]-3,v[1]-3,v[0]+3,v[1]+3],outline=(255,255,0))
            pv.save(f"{prev}/trail-{M['id']}-{shape}.png")
        print(M["id"],shape,len(E),"edges",sum(len(v) for v in E.values()),"points",flush=True)
json.dump(out,open(sys.argv[2],"w"),separators=(",",":"))
