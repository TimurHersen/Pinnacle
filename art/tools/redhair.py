# redhair.py in.png out.png : push the copper hair toward red (only strong orange in the top part of the figure)
import sys,colorsys
from PIL import Image
def red(im,top=.62):
    im=im.convert("RGBA");px=im.load();b=im.getchannel("A").point(lambda v:255 if v>20 else 0).getbbox()
    if not b:return im
    ycut=b[1]+(b[3]-b[1])*top
    for y in range(b[1],min(im.height,int(ycut)+1)):
        for x in range(im.width):
            r,g,bl,a=px[x,y]
            if a<20:continue
            h,s,v=colorsys.rgb_to_hsv(r/255,g/255,bl/255);hd=h*360
            if 6<=hd<=34 and s>=.55 and v>=.28:
                nh=(hd-9*(1-abs(hd-20)/40))/360;ns=min(1,s*1.06)
                r2,g2,b2=colorsys.hsv_to_rgb(nh,ns,v);px[x,y]=(round(r2*255),round(g2*255),round(b2*255),a)
    return im
if __name__=="__main__":red(Image.open(sys.argv[1])).save(sys.argv[2])
