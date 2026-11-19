# sheet.py out.png scale img... : lay images in a row over a slate background
import sys
from PIL import Image
out,sc=sys.argv[1],int(sys.argv[2]);ims=[Image.open(p).convert("RGBA") for p in sys.argv[3:]]
s=Image.new("RGBA",(sum(i.width for i in ims)+4*len(ims),max(i.height for i in ims)),(70,90,110,255));x=0
for i in ims:s.alpha_composite(i,(x,0));x+=i.width+4
s.resize((s.width*sc,s.height*sc),Image.NEAREST).save(out);print([i.size for i in ims])
