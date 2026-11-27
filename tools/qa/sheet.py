# sheet.py out.png "glob" step x0 y0 x1 y1 scale cols: a contact sheet of frames (crop, scale, every step-th)
import sys,glob
from PIL import Image
# usage: sheet.py out.png pattern step x0 y0 x1 y1 scale cols
out,pat,step,x0,y0,x1,y1,sc,cols=sys.argv[1],sys.argv[2],int(sys.argv[3]),*map(int,sys.argv[4:8]),int(sys.argv[8]),int(sys.argv[9])
fs=sorted(glob.glob(pat))[::step];w,h=(x1-x0)*sc,(y1-y0)*sc;rows=(len(fs)+cols-1)//cols
S=Image.new('RGB',(cols*(w+4),rows*(h+4)),(20,20,20))
for i,f in enumerate(fs):S.paste(Image.open(f).crop((x0,y0,x1,y1)).resize((w,h),Image.NEAREST),((i%cols)*(w+4),(i//cols)*(h+4)))
S.save(out);print(len(fs),S.size)
