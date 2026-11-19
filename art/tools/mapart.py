# mapart.py: the map's own small art. (1) each climber at map size, walking (6 frames, facing right) and standing,
# shrunk from their own frames, hard-edged and outlined like the paintings; (2) the signposts' wooden plaques, as
# nine-slice images: plain wood, gold-trimmed (climbed) and weathered grey (not reached yet)
import os
from PIL import Image,ImageDraw
A="assets/climbers";O="assets/maps/mini"
def mini(src,h=22):
    im=Image.open(src).convert("RGBA");im=im.crop(im.getbbox());w=round(im.width*h/im.height)
    sm=im.resize((w*4,h*4),Image.BOX).resize((w,h),Image.BOX);px=sm.load()
    for y in range(h):
        for x in range(w):r,g,b,a=px[x,y];px[x,y]=(r,g,b,255 if a>110 else 0)
    o=Image.new("RGBA",(w+2,h+2));o.paste(sm,(1,1));op=o.load();m=[[op[x,y][3]>0 for x in range(w+2)] for y in range(h+2)]
    for y in range(h+2):
        for x in range(w+2):
            if not m[y][x] and any(0<=x+dx<w+2 and 0<=y+dy<h+2 and m[y+dy][x+dx] for dx,dy in ((1,0),(-1,0),(0,1),(0,-1))):op[x,y]=(20,14,12,255)
    return o
for c in ["lumberjack","woman","modcut","redcat"]:
    d=f"{O}/{c}";os.makedirs(d,exist_ok=True)
    fr=[mini(f"{A}/{c}/walk/{i}.png") for i in range(6)]+[mini(f"{A}/{c}/idle/0.png")]
    W=max(f.width for f in fr);H=max(f.height for f in fr)
    # one strip: six walking frames then the standing one, each bottom-centred in its cell
    s=Image.new("RGBA",(W*7,H))
    for i,f in enumerate(fr):s.alpha_composite(f,(i*W+(W-f.width)//2,H-f.height))
    s.save(f"{O}/{c}.png");print(c,W,H)
# the plaques: 30x20, slice 7. Outline, a lit top edge, three planks with grain, nails in the corners
def plank(name,wood,trim=None):
    W,H=30,20;im=Image.new("RGBA",(W,H));d=ImageDraw.Draw(im);L,M,D,G=wood
    d.rectangle([0,0,W-1,H-1],fill=(28,16,10,255))
    d.rectangle([1,1,W-2,H-2],fill=M)
    for y in (7,13):d.line([(2,y),(W-3,y)],fill=D)                                   # plank seams
    for x,y,l in [(4,4,6),(15,3,8),(9,10,5),(19,10,6),(5,16,7),(17,16,5)]:d.line([(x,y),(x+l,y)],fill=G)   # grain
    d.line([(1,1),(W-2,1)],fill=L);d.line([(1,1),(1,H-2)],fill=L)                    # lit edge
    d.line([(1,H-2),(W-2,H-2)],fill=D);d.line([(W-2,1),(W-2,H-2)],fill=D)            # shaded edge
    if trim:d.rectangle([2,2,W-3,H-3],outline=trim[0]);d.point([(2,2),(W-3,2),(2,H-3),(W-3,H-3)],fill=trim[1])
    for x,y in [(3,3),(W-4,3),(3,H-4),(W-4,H-4)]:d.point((x,y),fill=(210,210,200,255));d.point((x+1,y+1),fill=(60,56,52,255))   # nails
    im.save(f"assets/maps/{name}.png")
plank("plank",[(200,140,84,255),(150,98,54,255),(102,62,32,255),(126,80,42,255)])
plank("plank-gold",[(214,154,92,255),(160,106,58,255),(104,64,32,255),(134,86,46,255)],trim=[(242,178,51,255),(255,236,150,255)])
plank("plank-grey",[(150,146,138,255),(110,106,100,255),(70,68,66,255),(92,88,84,255)])
