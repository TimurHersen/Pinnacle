# mapgrid.py map shape x0 y0 x1 y1 ['[[r,g,b],...]']: a zoomed, labelled grid over a map painting with its pins and current trail (and any listed colours in magenta), to lay routes by hand. Writes qa-out/grid_<map>_<shape>.png
import json,sys,subprocess,os
import numpy as np
from PIL import Image, ImageDraw
# grid2.py map shape x0 y0 x1 y1 [routes]: zoomed grid, painted path colour (if given) in magenta, current routes in yellow
m,s=sys.argv[1],sys.argv[2];x0,y0,x1,y1=map(int,sys.argv[3:7]);cols=json.loads(sys.argv[7]) if len(sys.argv)>7 else []
pins=json.loads(subprocess.check_output(['node','-e',f"const fs=require('fs');global.window={{}};eval(fs.readFileSync('js/content.js','utf8').replace(/^const /gm,'var '));const M=MAPS.find(x=>x.id==='{m}');console.log(JSON.stringify({{camp:M.art['{s}'].camp,pins:M.art['{s}'].pins}}))"]))
a=np.asarray(Image.open(f'assets/maps/{m}-{s}.png').convert('RGB')).copy()
for c in cols:a[(a==c).all(-1)]=[255,0,255]
im=Image.fromarray(a);W=x1-x0;SC=max(2,min(4,1300//W))
c=im.crop((x0,y0,x1,y1)).resize((W*SC,(y1-y0)*SC),Image.NEAREST);d=ImageDraw.Draw(c)
for X in range((x0//10+1)*10,x1,10):
    d.line(((X-x0)*SC,0,(X-x0)*SC,c.height),fill=(255,255,255) if X%50==0 else (150,150,150),width=1)
    if X%50==0:d.text(((X-x0)*SC+2,2),str(X),fill=(255,255,0))
for Y in range((y0//10+1)*10,y1,10):
    d.line((0,(Y-y0)*SC,c.width,(Y-y0)*SC),fill=(255,255,255) if Y%50==0 else (150,150,150),width=1)
    if Y%50==0:d.text((2,(Y-y0)*SC+2),str(Y),fill=(255,255,0))
T=json.load(open('assets/maps/trails.json')).get(f'{m}|{s}')
if T:
    for leg,pts in T['e'].items():d.line([((x-x0)*SC,(y-y0)*SC) for x,y in pts],fill=(255,255,0),width=2)
    for k,(x,y) in {**T['feet'],**T['J'],'camp':T['camp']}.items():d.ellipse(((x-x0)*SC-4,(y-y0)*SC-4,(x-x0)*SC+4,(y-y0)*SC+4),fill=(0,255,255));d.text(((x-x0)*SC+6,(y-y0)*SC-6),k,fill=(0,255,255))
for k,(x,y) in pins['pins'].items():d.ellipse(((x-x0)*SC-4,(y-y0)*SC-4,(x-x0)*SC+4,(y-y0)*SC+4),fill=(255,80,0));d.text(((x-x0)*SC+6,(y-y0)*SC-6),k,fill=(255,120,0))
import os;os.makedirs('qa-out',exist_ok=True)
c.save(f'qa-out/grid_{m}_{s}.png')
