# runall.py : reskin every frame of the two base climbers into the two new ones, 4 frames a call, in parallel
import json,os,glob,subprocess,sys
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
A="/home/user/Pinnacle/assets/climbers"
JOBS={"redcat":("woman",None)}
REF="/home/user/Pinnacle/art/reference/ember-ref.png"
INSTR=("Same character as the reference: long straight vivid red hair with blunt bangs, black long-sleeved top, dark charcoal trousers, small nose ring. "
 "A dark slate-grey cat with yellow eyes, as in the reference, sits on her shoulder in every frame, about as big as her head. "
 "Keep her yellow-tan backpack with its rolled mat, the climbing harness with its carabiners, the rope and the orange-brown boots as in the frames. Keep each frame's pose exactly.")
tasks=[]
for new,(base,dj) in JOBS.items():
    desc=INSTR;seed=7601
    frames=sorted(glob.glob(f"{A}/{base}/*/*.png"))+[f"{A}/{base}/south.png"]
    os.makedirs(f"nc/{new}3/in",exist_ok=True)
    pads=[]
    for f in frames:
        rel=os.path.relpath(f,f"{A}/{base}");im=Image.open(f).convert("RGBA");W,H=im.size
        p=Image.new("RGBA",(128,128));ox,oy=(128-W)//2,(128-H)//2;p.paste(im,(ox,oy))
        pp=f"nc/{new}3/in/"+rel.replace("/","_");p.save(pp);pads.append((pp,rel,ox,oy,W,H))
    for k in range(0,len(pads),3):tasks.append((new,desc,seed,pads[k:k+3],k//3))
def run(t):
    new,desc,seed,grp,n=t;out=f"nc/{new}3/b{n:02d}"
    if all(os.path.exists(f"{out}-{i}.png") for i in range(len(grp))):return n,"cached"
    json.dump({"frame_urls":[g[0] for g in grp],"reference_image_url":REF,"seed":seed,"additional_instructions":desc,"width":128,"height":128},open(out+".json","w"))
    for attempt in range(3):
        r=subprocess.run(["python3","-I","ed.py","transfer_outfit",out+".json",out],capture_output=True,text=True)
        if all(os.path.exists(f"{out}-{i}.png") for i in range(len(grp))):break
    ok=all(os.path.exists(f"{out}-{i}.png") for i in range(len(grp)))
    if ok:
        for i,(pp,rel,ox,oy,W,H) in enumerate(grp):
            im=Image.open(f"{out}-{i}.png").convert("RGBA").crop((ox,oy,ox+W,oy+H));d=f"{A}/{new}/{os.path.dirname(rel)}";os.makedirs(d,exist_ok=True);im.save(f"{A}/{new}/{rel}")
    print(new,n,"ok" if ok else "FAIL "+r.stdout[-300:],flush=True);return n,ok
with ThreadPoolExecutor(3) as ex:list(ex.map(run,tasks))
print("done",len(tasks))
