/* ============================== SCENE ==============================
   The climb as true pixel art. The canvas holds one pixel per art pixel and the browser scales it up by a whole
   number with hard edges, so every pixel on screen (sky, rock, sprites, text) is the same size. Nothing is
   antialiased: shapes are filled pixel rows, lines are stepped, text is thresholded.
   World units are art pixels: x = 0 is the cliff's left edge, y = 0 the base-camp meadow, negative going up.
   The valley (sky, clouds, ranges, lake, forest) is screen-space parallax that sinks as the team climbs.
   Event animations play off round.result, so both partners see the same climb. */
const WK=.8,HS=16,CHK=128;
const WY=a=>-(a-ALT.base)*WK,TOPY=WY(ALT.top);
const IDX_C1=Math.round(-WY(ALT.c1)/HS),IDX_C2=Math.round(-WY(ALT.c2)/HS),IDX_TOP=Math.round(-TOPY/HS);
const RM=matchMedia("(prefers-reduced-motion: reduce)");
const INK="#141018",PXFONT='"Press Start 2P",monospace';
const FX={cv:null,g:null,W:1,H:1,px:3,vw:1,vh:1,ox:0,raf:0,last:0,time:0,dt:0,ch:{main:0},tw:[],A:null,exp:null,mode:"",state:null,
  cam:null,area:null,areaAt:0,focus:"me",shake:0,parts:[],pops:[],chunks:new Map(),lit:{c1:1,c2:1},litAt:{},rope:null,pins:[],visible:true,
  birds:[],nextBird:2,label:null,layers:null,base:null,camps:{},text:new Map()};
const DEMO={choice:["A","A"]};

/* ---------- small maths ---------- */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const smooth=k=>k*k*(3-2*k);
function hash(x,y){let h=Math.imul(x|0,374761393)+Math.imul(y|0,668265263)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function noise1(x){const i=Math.floor(x);return lerp(hash(i,7),hash(i+1,7),smooth(x-i));}
const fbm=x=>noise1(x)*.55+noise1(x*2.1+11)*.28+noise1(x*4.3+23)*.17;
function rng(s){return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function play(ms,fn,ch="main"){return new Promise(res=>FX.tw.push({t0:performance.now(),ms,fn,res,ch,id:ch?FX.ch[ch]:0}));}
const wait=(ms,ch)=>play(ms,()=>{},ch);

/* ---------- palette: picked from the concept art ---------- */
const C={
  sky:["#2f5fae","#3567b6","#3b70be","#4479c6","#4f85cd","#5c92d4","#6ba0da","#7cafe0","#8ebee6","#a2cdec"],
  cloud:"#f6f4ec",cloudS:"#d4e2f0",cloudD:"#a9c4e2",
  snow:"#f2f5f7",snowS:"#bfd2e6",snowD:"#8eaacc",
  far:"#7590c4",farL:"#93acd8",farS:"#5a76ac",farD:"#46609a",
  mid:"#4f7aa4",midL:"#6a94ba",midS:"#3c6488",midD:"#2e5072",
  hill:"#2f6656",hillL:"#3f7c62",hillS:"#245246",
  pine:"#1f5432",pineL:"#36763c",pineH:"#5a9a4a",pineD:"#123620",trunk:"#5a3a22",
  lake:"#3d86c8",lakeL:"#79c0ec",lakeD:"#2c6aa8",
  rock:["#9b978e","#8e8a82","#a6a298"],rockL:"#c2bdb0",rockH:"#d6d1c4",rockS:"#76726b",rockD:"#5b5852",crack:"#3a3733",
  cold:["#a2a6ac","#959aa2","#adb1b6"],coldL:"#cdd2d8",coldS:"#7c828c",coldD:"#5e646e",
  moss:"#4e8a2c",mossL:"#76b23a",mossH:"#a6d64e",mossD:"#2f5c1e",
  grass:"#5a9a34",grassL:"#86c444",dirt:"#6a4a2e",dirtD:"#4a3220",
  rope:"#e8792b",ropeD:"#9a4414",metal:"#c7ccd4",metalD:"#7a8396",gold:"#f2b233",red:"#d23c2a",redD:"#8c2a1d",
  cream:"#efe3c4",navy:"#0e1222",wood:"#9a6a3a",woodD:"#5e3e22",woodL:"#c48e52"};

/* ---------- pixel drawing helpers (integer coordinates only) ---------- */
const R0=Math.round;
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(R0(x),R0(y),R0(w),R0(h));}
function dot(g,x,y,c){g.fillStyle=c;g.fillRect(R0(x),R0(y),1,1);}
// a stepped line between two points (Bresenham)
function pline(g,x0,y0,x1,y1,c){x0=R0(x0);y0=R0(y0);x1=R0(x1);y1=R0(y1);g.fillStyle=c;
  const dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let e=dx+dy;
  for(let n=0;n<4000;n++){g.fillRect(x0,y0,1,1);if(x0===x1&&y0===y1)break;const e2=2*e;if(e2>=dy){e+=dy;x0+=sx;}if(e2<=dx){e+=dx;y0+=sy;}}}
// a filled disc, row by row
function pdisc(g,cx,cy,r,c){g.fillStyle=c;for(let y=-r;y<=r;y++){const hw=R0(Math.sqrt(Math.max(0,r*r-y*y)));g.fillRect(R0(cx)-hw,R0(cy)+y,hw*2+1,1);}}
const mk=(w,h)=>{const c=document.createElement("canvas");c.width=Math.max(1,w);c.height=Math.max(1,h);const g=c.getContext("2d");g.imageSmoothingEnabled=false;return [c,g];};
// a sprite from a character grid, one letter per pixel
function gridSprite(rows,pal){const [c,g]=mk(rows[0].length,rows.length);rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(pal[ch])dot(g,x,y,pal[ch]);}));return c;}
// crisp pixel text: drawn with the 8px bitmap face, then every pixel snapped fully on or off; optional 1px outline
function textSprite(text,col=C.cream,out=INK){const key=text+"|"+col+"|"+out;let s=FX.text.get(key);if(s)return s;
  const [m,mg]=mk(1,1);mg.font=`8px ${PXFONT}`;const w=Math.ceil(mg.measureText(text).width)+4,h=12;
  const [c,g]=mk(w,h);g.font=`8px ${PXFONT}`;g.textBaseline="top";g.fillStyle="#fff";g.fillText(text,2,2);
  const id=g.getImageData(0,0,w,h),d=id.data,on=new Uint8Array(w*h);for(let i=0;i<w*h;i++)on[i]=d[i*4+3]>110?1:0;
  const [o,og]=mk(w,h);
  if(out)for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(on[y*w+x])continue;
    if((x>0&&on[y*w+x-1])||(x<w-1&&on[y*w+x+1])||(y>0&&on[(y-1)*w+x])||(y<h-1&&on[(y+1)*w+x]))dot(og,x,y,out);}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on[y*w+x])dot(og,x,y,col);
  if(FX.text.size>200)FX.text.clear();FX.text.set(key,o);return o;}
// signs are baked into cached layers, so those repaint once the face has loaded
if(document.fonts)document.fonts.load(`8px ${PXFONT}`).then(()=>{FX.text.clear();FX.base=null;FX.camps={};},()=>{});

/* ---------- small sprites ---------- */
const SP={};
function sprites(){if(SP.tent)return SP;
  const P={k:INK,r:C.red,R:C.redD,o:C.rope,c:C.cream,y:C.gold,Y:"#b5741c",d:"#2a1a14",w:C.wood,W:C.woodD,g:"#8a8a86",G:"#5e5a54",s:"#c7ccd4",S:C.metalD};
  SP.tent=gridSprite([
    "...........k............",
    "..........kok...........",
    ".........kocRk..........",
    "........kocrRRk.........",
    ".......kocrrdRRk........",
    "......kocrrdddRRk.......",
    ".....kocrrrdddRRRk......",
    "....kocrrrddddRRRRk.....",
    "...kocrrrrddddRRRRRk....",
    "..kocrrrrdddddRRRRRRk...",
    ".kocrrrrrdddddRRRRRRRk..",
    "kkkkkkkkkkkkkkkkkkkkkkk.",
    "W.....................W.",],P);
  const fl=["....yy...","...yoy...","..yooyy..","..yoooy..",".yooyoy..",".yooyoy.."];
  SP.fire=[0,1,2].map(f=>{const [c,g]=mk(11,11);
    const rows=f===0?["....y......","...yoy.....","...yooy....","..yooyoy...","..yoooyoy..",".yooyyooy..","..yoyyyoy.."]
      :f===1?[".....y.....","....yy.....","...yooy....","..yoooy.y..","..yoyooyy..",".yooyyooy..","..yoyyyoy.."]
      :["...y.......","...yy......","..yooy..y..","..yoooyoy..",".yooyyoy...",".yooyyooy..","..yoyyyoy.."];
    g.drawImage(gridSprite(rows,P),0,0);rect(g,1,7,9,1,C.woodL);rect(g,0,8,11,1,C.wood);rect(g,1,9,9,1,C.woodD);
    for(const x of [0,3,7,10])dot(g,x,10,"#8a8a86");return c;});
  SP.flag=[0,1].map(f=>gridSprite(f?["kk.......","kRrrrr...","kRrrrrrr.","kRrrrrr..","kRrr.....","k........","k........","k........","k........","k........","k........","kk......."]
    :["kk.......","kRrrr....","kRrrrrr..","kRrrrrrr.","kRrrrr...","k........","k........","k........","k........","k........","k........","kk......."],P));
  SP.bird=[gridSprite(["k...k",".k.k.","..k.."],P),gridSprite([".....","kkkkk","..k.."],P)];
  return SP;}
// a pine: stepped tiers, lit on the left, with a dark rim, on a short trunk
function pineSprite(h,seed,pal){const w=Math.round(h*.56)|1,[c,g]=mk(w,h),cx=w>>1,R=rng(seed);
  rect(g,cx-1,h-4,2,4,C.trunk);
  const tiers=Math.max(2,Math.round(h/9));let top=0;
  for(let t=0;t<tiers;t++){const y0=Math.round(top+t*(h-6)/tiers*.78),y1=Math.round((t+1)*(h-4)/tiers);
    for(let y=y0;y<=y1;y++){const k=(y-y0)/Math.max(1,y1-y0),hw=Math.max(0,Math.round((t*.18+.25+k*.75)*(w/2-1)*(t+1)/tiers+(R()<.3?1:0)));
      for(let x=cx-hw;x<=cx+hw;x++){const edge=x===cx-hw||x===cx+hw||y===y1;g.fillStyle=edge?pal.d:x<cx-hw*.35?(R()<.15?pal.h:pal.l):x<cx+1?pal.m:pal.d;g.fillRect(x,y,1,1);}}}
  dot(g,cx,0,pal.l);return c;}

/* ---------- the valley: screen-space parallax layers, painted once per view size ---------- */
function ridgeH(x,seed,f){return .5*(1-Math.abs(2*((x/97*f+seed)%1)-1))+.3*(1-Math.abs(2*((x/41*f+seed*1.7)%1)-1))+.2*(1-Math.abs(2*((x/17*f+seed*2.3)%1)-1));}
// a mountain range: a jagged ridge line, faces lit or shaded by which way they slope, snow above a ragged
// snowline, and diagonal gullies (rock through the snow, shadow down the faces) so it never reads as stripes
function paintRange(g,w,base,amp,seed,pal,snowAt,peak){
  const hx=X=>{let v=ridgeH(X+400,seed,1)*amp;if(peak){const d=Math.min(1,Math.abs(X-peak.x)/peak.w);v=Math.max(v,peak.h*Math.pow(1-d,1.25)+ridgeH(X,seed+.3,2.6)*amp*.3);}return v;};
  const H=g.canvas.height,hs=new Float32Array(w+8);for(let x=0;x<w+8;x++)hs[x]=hx(x-4);
  for(let x=0;x<w;x++){const hh=hs[x+4],top=R0(base-hh),lit=hs[x+7]>=hs[x+1];
    for(let y=Math.max(0,top);y<H;y++){const alt=base-y,gl=hash(Math.floor((x+(lit?-1:1)*(y-top)*.7)/3),seed*31|0);
      let col=lit?pal.l:pal.s;
      if(gl<.14&&y-top>2)col=lit?pal.m:pal.d;
      if(snowAt!=null&&alt>snowAt+(noise1(x*.15+seed*9)-.5)*amp*.25){col=lit?C.snow:C.snowS;if(gl<.16&&y-top>3)col=lit?C.snowS:C.snowD;}
      if(alt<snowAt*.3&&hash(x,y)<.5)col=pal.m;
      g.fillStyle=col;g.fillRect(x,y,1,1);
      if(alt<-4){g.fillStyle=pal.m;g.fillRect(x,y,1,H-y);break;}}}}
function paintForest(g,w,base,pal,seed,minH,maxH,step){const R=rng(seed);
  rect(g,0,base,w,g.canvas.height-base,pal.d);
  for(let x=-6;x<w+6;x+=step+(R()*step*.6|0)){const h=minH+(R()*(maxH-minH)|0),s=pineSprite(h,seed+x,pal);g.drawImage(s,x-(s.width>>1),base-h+3);}}
function makeLayers(w,h){
  const L=[],layer=(hgt,fn,par,y0)=>{const [c,g]=mk(w,hgt);fn(g);L.push({c,par,y0});};
  // far range with one big snowy mountain, like the concept's backdrop
  layer(h,g=>paintRange(g,w,R0(h*.64),h*.16,.13,{l:C.farL,s:C.farS,m:C.far,d:C.farD},h*.13,{x:R0(w*.34),w:w*.3,h:h*.44}),.04,0);
  // mid range: darker, bluer, less snow
  layer(h,g=>paintRange(g,w,R0(h*.74),h*.14,.61,{l:C.midL,s:C.midS,m:C.mid,d:C.midD},h*.11,null),.07,0);
  // the lake and the far forest shore
  layer(h,g=>{const y=R0(h*.78);rect(g,0,y,w,h-y,C.lake);rect(g,0,y,w,1,C.lakeL);
    for(let i=0;i<w/5;i++){const x=hash(i,4)*w|0,yy=y+2+(hash(i,5)*h*.06|0);rect(g,x,yy,2+(hash(i,6)*6|0),1,hash(i,7)<.5?C.lakeL:C.lakeD);}
    paintForest(g,w,R0(h*.77),{l:C.hillL,m:C.hill,d:C.hillS,h:C.pineL},5,8,15,5);},.11,0);
  // near forest, darker and bigger trees
  layer(h,g=>paintForest(g,w,R0(h*.9),{l:C.pineL,m:C.pine,d:C.pineD,h:C.pineH},9,16,30,8),.17,0);
  return L;}
function drawSky(g,w,h,u){const n=C.sky.length,shift=R0(u*2.5);
  for(let i=0;i<n;i++){const y0=R0(i*h*.75/n);rect(g,0,y0,w,h-y0,C.sky[Math.max(0,i-shift)]);
    // a dithered seam between bands
    if(i>0){g.fillStyle=C.sky[Math.max(0,i-1-shift)];for(let x=(i&1);x<w;x+=2)g.fillRect(x,y0,1,1);}}}
// fluffy pixel clouds: a stack of discs, lit on top, with a soft blue underside
function drawCloud(g,x,y,s,seed){
  const blobs=[[0,0,6],[7,-3,8],[16,-1,7],[23,1,5],[-6,2,4]].map(([a,b,r],i)=>[x+R0(a*s),y+R0(b*s),Math.max(2,R0(r*s*(.8+hash(seed,i)*.4)))]);
  for(const [bx,by,r] of blobs)pdisc(g,bx,by+1,r,C.cloudD);
  for(const [bx,by,r] of blobs)pdisc(g,bx,by,r,C.cloudS);
  for(const [bx,by,r] of blobs)pdisc(g,bx-1,by-1,r-1,C.cloud);
  rect(g,x-R0(6*s),y+R0(4*s),R0(34*s),2,C.cloudS);}

/* ---------- generated art (PixelLab): the valley backdrop, a near treeline and two granite textures ----------
   Each loads in the background; until it has, the painted version above (and the painted rock below) stands in. */
const ART={},FIRE_N=6;
(function loadArt(){
  const pixels=im=>{const [,g]=mk(im.width,im.height);g.drawImage(im,0,0);return {w:im.width,h:im.height,d:g.getImageData(0,0,im.width,im.height).data};},
    rgb=(p,x,y)=>{const i=(y*p.w+x)*4;return `rgb(${p.d[i]},${p.d[i+1]},${p.d[i+2]})`;},
    load=(src,fn)=>{const im=new Image();im.onload=()=>fn(im);im.src=src;};
  load(asset("assets/valley.png"),im=>{ART.sky=rgb(pixels(im),im.width>>1,0);ART.valley=im;});
  load(asset("assets/pines.png"),im=>{ART.pineBase=rgb(pixels(im),im.width>>1,im.height-1);ART.pines=im;});
  // high on the mountain the same art turns wintry: moss and grass (green-dominant pixels) become snow by brightness,
  // and the rock is cooled halfway to a blue-grey of its own brightness
  const wintry=d=>{for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const r=d[i],gr=d[i+1],b=d[i+2],l=r*.3+gr*.59+b*.11;
    if(gr>r+8&&gr>b+8){const s=l>110?[242,245,247]:l>70?[191,210,230]:[142,170,204];d[i]=s[0];d[i+1]=s[1];d[i+2]=s[2];}
    else{d[i]=R0(lerp(r,l*.86,.5));d[i+1]=R0(lerp(gr,l*.94,.5));d[i+2]=Math.min(255,R0(lerp(b,l*1.12,.5)));}}};
  // one granite texture for the whole wall: mossy low down, its wintry copy high up; rock chunks painted before it
  // arrived repaint with it
  load(asset("assets/cliff-low.png"),im=>{ART.rockLo=pixels(im);const hi=pixels(im);wintry(hi.d);ART.rockHi=hi;FX.chunks.clear();});
  // the walkable surface of a platform image: the first opaque row down its middle
  const surface=p=>{const x=p.w>>1;for(let y=0;y<p.h;y++)if(p.d[(y*p.w+x)*4+3]>40)return y;return 0;};
  // camp ledges: Camp I as drawn; Camp II with its grass and moss turned to snow and its rock cooled to blue-grey
  // (the ledge's walkable span: the columns whose top lies within a few pixels of the surface, where a tent can stand)
  load(asset("assets/ledge.png"),im=>{const p=pixels(im);ART.ledge=im;ART.ledgeTop=surface(p);
    const top=x=>{for(let y=0;y<p.h;y++)if(p.d[(y*p.w+x)*4+3]>40)return y;return p.h;};let a=0,b=p.w-1;
    // (the image's back end may carry a slab of cliff rising well above the ledge: it is cut off where that starts,
    // so only the ledge itself is drawn, its back end against the real wall)
    while(a<p.w&&top(a)>ART.ledgeTop+4)a++;let w=a;while(w<p.w&&top(w)>=ART.ledgeTop-6)w++;
    b=w-1;while(b>a&&top(b)>ART.ledgeTop+4)b--;ART.ledgeWalk=[a,b];ART.ledgeW=w;wintry(p.d);
    const [c,g]=mk(p.w,p.h),id=g.createImageData(p.w,p.h);id.data.set(p.d);g.putImageData(id,0,0);ART.ledgeSnow=c;FX.camps={};});
  load(asset("assets/tent.png"),im=>{ART.tent=im;FX.camps={};FX.base=null;});
  // the campfire's flicker loop; the unlit pile is its first frame with the flames (bright orange and yellow pixels)
  // taken out, leaving the leaning logs and the stones
  ART.fire=Array.from({length:FIRE_N},(_,i)=>{const im=new Image();im.src=asset(`assets/fire/${i}.png`);
    if(!i)im.onload=()=>{const p=pixels(im),d=p.d;for(let j=0;j<d.length;j+=4)if(d[j]>200&&d[j+1]>90&&d[j]-d[j+2]>80)d[j+3]=0;
      const [c,g]=mk(p.w,p.h),id=g.createImageData(p.w,p.h);id.data.set(d);g.putImageData(id,0,0);ART.firePile=c;};
    return im;});
  load(asset("assets/pine.png"),im=>{ART.pine=im;FX.base=null;});
  // the base-camp meadow: a grass-and-soil strip repeated along the valley floor, solid soil below it
  // (solid soil fills in from the strip's deepest row that is opaque all the way across, in that row's colour, so
  // the strip's ragged lower edge never shows the scenery behind it)
  load(asset("assets/ground.png"),im=>{const p=pixels(im);ART.groundTop=surface(p);let y=p.h-1;
    const full=y=>{for(let x=0;x<p.w;x++)if(p.d[(y*p.w+x)*4+3]<250)return false;return true;};
    while(y>ART.groundTop&&!full(y))y--;ART.ground=im;ART.soilAt=y;ART.soil=rgb(p,p.w>>1,y);FX.base=null;});})();
const valleyY=(h,climb)=>R0(h-ART.valley.height+climb*.05);
// the backdrop sinks slowly as the team climbs, with its own sky colour above it and mirrored copies either side
// when the view is wider than the picture; the lake sits in the open air left of the cliff
function drawValley(g,w,h,climb){const V=ART.valley,y=valleyY(h,climb),x0=R0(FX.ox-V.width*.6);
  rect(g,0,0,w,Math.max(0,y),ART.sky);
  for(let k=-2;k<=2;k++){const x=x0+k*V.width;if(x>=w||x+V.width<=0)continue;
    if(k&1){g.save();g.translate(x+V.width,y);g.scale(-1,1);g.drawImage(V,0,0);g.restore();}else g.drawImage(V,x,y);}}
// the near treeline, sinking faster, solid forest below it
function drawPines(g,w,h,climb){const P=ART.pines,y=R0(h*.9-P.height*.6+climb*.17);if(y>=h)return;
  for(let x=FX.ox%P.width-P.width;x<w;x+=P.width)g.drawImage(P,x,y);
  rect(g,0,y+P.height,w,h-y-P.height,ART.pineBase);}
// a texture pixel, the texture mirrored at every edge so neighbouring tiles always meet; its outermost pixel ring
// (a flat border line on some generated images) is left out, so a mirror never doubles it into a stripe
function texAt(T,x,y){const m=(v,n)=>{n-=2;v=(v%(2*n)+2*n)%(2*n);return 1+(v<n?v:2*n-1-v);},i=(m(y,T.h)*T.w+m(x,T.w))*4;return [T.d[i],T.d[i+1],T.d[i+2]];}

/* ---------- the cliff: granite blocks, moss low down, snow high up, painted once per chunk ---------- */
const uOf=y=>clamp(y/TOPY,0,1);
// the cliff's left edge; over the last stretch it leans right so the route along it runs up into the summit ridge
const edgeL=y=>R0((fbm(y*.011+3)-.5)*22+(fbm(y*.003+9)-.5)*30+smooth(clamp((y-TOPY-360)/-360,0,1))*36);
// under each camp the cliff swells out into a buttress that carries the camp's ledge: well out under the ledge
// just below its top, curving back into the wall over BUT_H pixels, so the ledge grows out of the rock instead of
// floating. The rock and the route both follow this edge.
const BUT_H=84,BUT_OUT=96;
function rockEdge(y){let e=edgeL(y);
  for(const ix of [IDX_C1,IDX_C2]){const t=(y+ix*HS-2)/BUT_H;
    if(t>=0&&t<=1)e=Math.min(e,R0(e-BUT_OUT*(1-smooth(t))+(fbm(y*.08+ix)-.5)*8));}
  return e;}
// the summit: a snowy peak whose tip stands above the route's top
const SX=64,peakTop=x=>TOPY-26+Math.abs(x-SX)*.42+(hash(x>>2,77)<.5?0:1);
// granite as irregular slabs: a jittered Voronoi grid (cells a little wider than tall), each cell lit along its
// upper-left rim and shaded along its lower-right one, with dark cracks between cells; moss or snow on the tops
function rockAt(wx,wy){
  const u=uOf(wy),cold=u>.6,snowy=u>.74,pal=cold?C.cold:C.rock,CW=40,CH=30,gx=Math.floor(wx/CW),gy=Math.floor(wy/CH);
  let d1=1e9,d2=1e9,bx=0,by=0,id=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=gx+i,cy=gy+j,
    sx=(cx+.15+hash(cx,cy*7+1)*.7)*CW,sy=(cy+.15+hash(cx*3,cy+5)*.7)*CH,dx=wx-sx,dy=(wy-sy)*1.15,d=Math.sqrt(dx*dx+dy*dy);
    if(d<d1){d2=d1;d1=d;bx=dx;by=dy;id=cx*977+cy;}else if(d<d2)d2=d;}
  const e=d2-d1,side=(bx*.6+by)/(d1+.01);
  let c=pal[hash(id,3)*3|0];
  if(e<1.7)c=C.crack;
  else if(e<3.4&&side<-.15)c=cold?C.coldL:(e<2.5?C.rockH:C.rockL);
  else if(e<3.4&&side>.3)c=cold?C.coldD:C.rockD;
  else if(e<6.5&&side>.45)c=cold?C.coldS:C.rockS;
  else{const n=hash(wx*7+wy*13,11);if(n<.07)c=cold?C.coldS:C.rockS;else if(n>.965)c=cold?C.coldL:C.rockL;
    // a few fine fractures inside the bigger slabs
    if(hash(id,12)<.3&&Math.abs(bx*.9-by*.35+(hash(id,13)-.5)*10)<.6&&d1>5)c=C.rockD;}
  // a mossy (or snowy) cap on the top rim of some slabs
  const top=by<0&&side<-.35&&e>=1.7;
  if(top&&!snowy&&e<4.5+hash(wx,id)*2.5&&hash(id,5)<.5-u*.6)c=e<2.4?C.mossL:e<3.6?(hash(wx,1)<.3?C.mossH:C.mossL):hash(wx,wy)<.5?C.moss:C.mossD;
  if(top&&snowy&&e<4+hash(wx,id)*3)c=e<3?C.snow:C.snowS;
  return c;}
function paintChunk(ci){
  const yTop=-(ci+1)*CHK,w=FX.wallW,[c,g]=mk(w+40,CHK);if(yTop+CHK<TOPY-40)return c;
  const id=g.createImageData(w+40,CHK),d=id.data,cache={},tex=ART.rockLo&&ART.rockHi;
  const hex=h=>cache[h]||(cache[h]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
  for(let py=0;py<CHK;py++){const wy=yTop+py,L=rockEdge(wy);if(wy>0)continue;
    for(let px=0;px<w+40;px++){const wx=px-40;let col=null,v=null;
      if(wy<peakTop(wx))continue;
      if(wx<L)continue;
      if(wx===L)col=C.crack;
      // the generated granite: warm and mossy low down, cold and snowy high up, with a dithered seam between
      else if(tex){v=texAt(uOf(wy)>.6+(hash(wx,wy)-.5)*.06?ART.rockHi:ART.rockLo,wx,wy);if(wx===L+1)v=v.map(k=>k+(255-k)*.12|0);}
      else if(wx<=L+2)col=uOf(wy)>.74&&hash(wy>>1,8)<.5?C.snow:uOf(wy)>.6?C.coldL:C.rockL;
      else col=rockAt(wx,wy);
      if(wy-peakTop(wx)<1)col=C.snowS;else if(wy-peakTop(wx)<5)col=C.snow; // snow on the summit ridge
      if(col)v=hex(col);const i=(py*(w+40)+px)*4;d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];d[i+3]=255;}}
  g.putImageData(id,0,0);return c;}
function chunk(ci){let c=FX.chunks.get(ci);if(c){FX.chunks.delete(ci);FX.chunks.set(ci,c);return c;}
  c=paintChunk(ci);FX.chunks.set(ci,c);if(FX.chunks.size>24)FX.chunks.delete(FX.chunks.keys().next().value);return c;}
const chunkRange=(vy0,vy1)=>[Math.max(0,Math.floor(-vy1/CHK)),Math.min(Math.ceil(-(TOPY-40)/CHK),Math.floor(-vy0/CHK))];

/* ---------- route geometry: lanes, holds, bolts and where climbers rest ----------
   The route runs up the cliff's left edge, seen side-on: holds sit on the edge, so a climber hangs in the open
   air beside the rock. Option B of each fork takes a crack a few pixels in from the edge. */
function laneX(ch,y){const a=ALT.base-y/WK,k=a<=ALT.c1?"A":a<=ALT.c2?(ch[0]||"A"):(ch[1]||"A");return rockEdge(y)-8+(k==="B"?6:0);}
const holdXY=(ch,i)=>{const y=R0(-i*HS+(hash(i,5)-.5)*3);return [R0(laneX(ch,y)+10+hash(i,3)*2),y];};
// bolts go into the rock just in from the holds
const boltXY=(ch,i)=>[R0(laneX(ch,-i*HS)+15),-i*HS+6];
const idxOf=(exp,p)=>Math.round(-WY(altOf(exp,p))/HS);
function restSpot(i,m){if(i<=0)return {x:m?-74:-26,y:0};
  if(i===IDX_C1||i===IDX_C2)return {x:m?-54:-16,y:-i*HS};
  if(i>=IDX_TOP){const x=m?SX+48:SX+12;return {x,y:R0(peakTop(x))+2};}return null;}
function mateIdx(li){if(li<=0||li===IDX_C1||li===IDX_C2||li>=IDX_TOP)return li;return Math.max(li>IDX_C2?IDX_C2:li>IDX_C1?IDX_C1:0,li-7);}

/* ---------- climbers: side-view explorer sprites ----------
   Human proportions (head about a sixth of the body), seen side-on facing the wall, after the concept sheet.
   Every pose is rasterised once per climber into a grid of hard pixels and cached: each body part is a tapered
   capsule or ellipse lit from the upper left in three tones of its material, then given a dark outline, layer by
   layer (far limbs, pack, body, near limbs, head) so overlapping parts stay readable. Pose spots are in art
   pixels relative to the hips, facing right: hn/hf = near/far hand, fn/ff = near/far foot (ankle), lean tips the
   torso toward the wall in degrees, dy drops the body; feet stay planted unless the frame is airborne. */
const OUTLINE="#1c120e";
const SKIN={l:"#ffd9b4",m:"#f0b48a",d:"#c47c56"};
// player 1: a bearded lumberjack (red beanie, red-and-black plaid, jeans, brown boots, green pack);
// player 2: yellow bobble beanie, orange jacket, long auburn hair, navy trousers, a tan pack
const LOOK={
  me:{name:"me",top:{l:"#ea4a3c",m:"#c4262a",d:"#7e1418",plaid:1},sleeve:null,pants:{l:"#5574a0",m:"#385682",d:"#22375e"},boot:{l:"#b0703c",m:"#7c4622",d:"#4a2812"},
    hat:{l:"#f2564a",m:"#cc2a26",d:"#861a1a"},band:{l:"#c02424",m:"#9a1c1c",d:"#661010"},hair:{l:"#8e5c32",m:"#66401e",d:"#3e2612"},beard:1,
    pack:{l:"#86a24e",m:"#5e7832",d:"#3a4c1e"},roll:{l:"#d8b07a",m:"#a8804a",d:"#6e5028"},coil:"#e8792b"},
  mate:{name:"mate",top:{l:"#ffad66",m:"#e8792b",d:"#a8481a"},zip:1,pants:{l:"#55678e",m:"#3c4a6a",d:"#262f48"},boot:{l:"#9a6a44",m:"#6e4426",d:"#40240f"},
    hat:{l:"#ffe27a",m:"#f2b233",d:"#b5741c"},band:{l:"#e8a028",m:"#c4841a",d:"#8a5a10"},stripe:"#d23c2a",pom:{l:"#ffffff",m:"#efe3c4",d:"#bfb090"},
    hair:{l:"#a84a24",m:"#7a3418",d:"#4a1e0c"},long:1,freck:1,scarf:{l:"#5a9ae0",m:"#3c78b4",d:"#24507e"},
    pack:{l:"#d08a4a",m:"#a8682a",d:"#6e4218"},roll:{l:"#5aa86a",m:"#3c7a4a",d:"#24502c"},coil:"#d23c2a"}};
/* ---------- climber art (PixelLab): east-facing animation frames, mirrored to face west ----------
   Each climber has a climb clip, an idle (breathing) clip, a cheer clip and a front view for the HUD portrait.
   Until every frame has loaded, the painted sprites below stand in. */
const CLIMBER_ART={me:"lumberjack",mate:"woman"},CLIP_N={climb:8,idle:4,cheer:8,walk:6,work:6};
const ART_POSE={hang:["climb",0],chalk:["climb",0],shake1:["climb",0],shake2:["climb",1],reachR:["climb",2],jump:["climb",3],
  pull:["climb",4],crouch:["climb",5],reachL:["climb",6],mantle:["climb",7],fall1:["climb",3],fall2:["climb",7],look:["idle",1],hop:["idle",3]};
// the box round a frame's opaque pixels, measured once
function boxOf(im){if(im.bb)return im.bb;const [,g]=mk(im.width,im.height);g.drawImage(im,0,0);
  const d=g.getImageData(0,0,im.width,im.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1;
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(d[(y*im.width+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return im.bb={x0,y0,x1,y1};}
function loadClimber(L){const who=CLIMBER_ART[L.name],A=L.art={clips:{},ready:0};let left=1;
  const img=src=>{left++;const im=new Image();im.onload=()=>{if(--left===0)A.ready=1;};im.src=src;return im;};
  for(const [k,n] of Object.entries(CLIP_N))A.clips[k]=Array.from({length:n},(_,i)=>img(asset(`assets/climbers/${who}/${k}/${i}.png`)));
  A.front=img(asset(`assets/climbers/${who}/south.png`));if(--left===0)A.ready=1;}
loadClimber(LOOK.me);loadClimber(LOOK.mate);
function ik(rx,ry,tx,ty,a,b,bend){let dx=tx-rx,dy=ty-ry,d=Math.hypot(dx,dy)||1e-4;const m=a+b-.01;if(d>m){tx=rx+dx/d*m;ty=ry+dy/d*m;d=m;}
  const ang=Math.atan2(ty-ry,tx-rx),j=ang+bend*Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));return [rx+Math.cos(j)*a,ry+Math.sin(j)*a,tx,ty];}
// sprite box and the hips' place in it; HANG is where the near hand sits (from the hips) when hanging on a hold
const SPR={W:76,H:100,hx:34,hy:58},HANG=[21,-46],LEG=38;
const POSES={
  hang:  {hn:[21,-46],hf:[19,-36],fn:[13,22],ff:[10,11],lean:14},
  reachL:{hn:[22,-52],hf:[19,-30],fn:[13,26],ff:[13,8],lean:12,eff:1},
  reachR:{hn:[19,-30],hf:[22,-51],fn:[13,8],ff:[13,26],lean:12,eff:1},
  pull:  {hn:[21,-34],hf:[19,-37],fn:[14,6],ff:[11,11],lean:18,eff:1,dy:-2},
  crouch:{hn:[21,-40],hf:[19,-37],fn:[14,7],ff:[11,7],lean:20,eff:1,dy:3},
  jump:  {hn:[18,-50],hf:[21,-48],fn:[5,30],ff:[9,26],lean:6,eff:1,air:1},
  mantle:{hn:[24,-18],hf:[22,-20],fn:[16,-2],ff:[8,27],lean:34,eff:1},
  chalk: {hn:[21,-46],hf:[-3,3],fn:[13,22],ff:[10,11],lean:14},
  shake1:{hn:[21,-46],hf:[-6,13],fn:[13,22],ff:[10,11],lean:14},
  shake2:{hn:[21,-46],hf:[0,16],fn:[13,22],ff:[10,11],lean:14},
  stand: {hn:[7,10],hf:[-5,10],fn:[5,35],ff:[-3,35],lean:2},
  stand2:{hn:[7,11],hf:[-5,11],fn:[5,35],ff:[-3,35],lean:2,dy:1},
  hop:   {hn:[13,-6],hf:[6,-8],fn:[6,35],ff:[-2,35],lean:6,dy:4},
  look:  {hn:[15,-40],hf:[-5,10],fn:[5,35],ff:[-3,35],lean:-4,up:1},
  cheer1:{hn:[9,-50],hf:[-3,-48],fn:[6,32],ff:[-4,33],lean:0,dy:-8,air:1,joy:1},
  cheer2:{hn:[15,-38],hf:[-7,-36],fn:[5,35],ff:[-3,35],lean:0,joy:1},
  fall1: {hn:[-13,-38],hf:[18,-34],fn:[-10,22],ff:[13,19],lean:-12,oh:1},
  fall2: {hn:[-5,-46],hf:[19,-24],fn:[8,26],ff:[-13,16],lean:-6,oh:1}};
function hexRGB(h){const n=parseInt(h.slice(1,7),16);return [n>>16&255,n>>8&255,n&255];}
function tone(h,k){const c=hexRGB(h),t=k<0?[20,12,10]:[255,250,232],a=Math.abs(k);return "#"+c.map((v,i)=>Math.round(v+(t[i]-v)*a).toString(16).padStart(2,"0")).join("");}
const farOf=p=>({l:p.m,m:p.d,d:tone(p.d,-.35),plaid:p.plaid});
function pixelSprite(L,pose,o){
  const P=POSES[pose]||POSES.stand,{W,H}=SPR,out=new Array(W*H).fill(null);
  // a layer: parts painted with explicit light, then one dark outline around the layer's silhouette
  const layer=paint=>{const b=new Array(W*H).fill(null),set=(x,y,c)=>{x=Math.round(x);y=Math.round(y);if(x>=0&&y>=0&&x<W&&y<H&&c)b[y*W+x]=c;},
      get=(x,y)=>x>=0&&y>=0&&x<W&&y<H?b[y*W+x]:null;
    // the colour of a lit surface: n is the outward normal (unit-ish), light comes from the upper left
    const shade=(pal,nx,ny,x,y)=>{const li=-.6*nx-.8*ny;let k=li>.3?"l":li<-.32?"d":"m";
      if(pal.plaid){const a=((x|0)%4+4)%4===0,c=((y|0)%4+4)%4===1;if(a&&c)return "#2a1018";if(a||c)k=k==="l"?"m":k==="m"?"d":"d";}
      return pal[k];};
    // a tapered capsule from (x0,y0) radius r0 to (x1,y1) radius r1
    const cap=(x0,y0,x1,y1,r0,r1,pal)=>{const dx=x1-x0,dy=y1-y0,L2=dx*dx+dy*dy||1e-4,R=Math.max(r0,r1)+1;
      for(let y=Math.floor(Math.min(y0,y1)-R);y<=Math.ceil(Math.max(y0,y1)+R);y++)for(let x=Math.floor(Math.min(x0,x1)-R);x<=Math.ceil(Math.max(x0,x1)+R);x++){
        const t=clamp(((x-x0)*dx+(y-y0)*dy)/L2,0,1),cx=x0+dx*t,cy=y0+dy*t,r=lerp(r0,r1,t),ex=x-cx,ey=y-cy,d=Math.hypot(ex,ey);
        if(d<=r+.1)set(x,y,shade(pal,ex/(r||1),ey/(r||1),x,y));}};
    const ell=(cx,cy,rx,ry,pal,clip)=>{for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
        const ex=(x-cx)/rx,ey=(y-cy)/ry;if(ex*ex+ey*ey<=1.05&&(!clip||clip(x,y)))set(x,y,shade(pal,ex,ey,x,y));}};
    paint({set,get,cap,ell,shade});
    for(let i=0;i<W*H;i++){const x=i%W,y=(i/W)|0;
      if(b[i])out[i]=b[i];else if(get(x-1,y)||get(x+1,y)||get(x,y-1)||get(x,y+1))out[i]=OUTLINE;}};
  const dy=P.dy||0,hx=SPR.hx,hy=SPR.hy+dy,fy=SPR.hy+(P.air?dy:0),a=(P.lean||0)*Math.PI/180,rot=(x,y)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
  const at=(x,y)=>{const [u,v]=rot(x,y);return [hx+u,hy+v];};
  const [sx,sy]=at(1,-23),[nx,ny]=at(1,-26),[cx,cy]=[nx+1+Math.sin(a)*3,ny-7-(P.up?0:0)];
  const arm=(d,h,far)=>{const tx=hx+h[0],ty=hy+h[1],[ex,ey,wx,wy]=ik(sx,sy,tx,ty,14,13,ty<sy?-1:1),top=far?farOf(L.top):L.top,sk=far?farOf(SKIN):SKIN;
    d.cap(sx,sy,ex,ey,3.8,3.2,top);d.cap(ex,ey,wx,wy,3.2,2.7,top);
    const hx2=wx+(wx-ex)/13*2.5,hy2=wy+(wy-ey)/13*2.5;d.cap(wx-(wx-ex)/13*.5,wy-(wy-ey)/13*.5,hx2,hy2,1.6,2.2,sk);};
  const leg=(d,f,far)=>{const tx=hx+f[0],ty=fy+f[1],[kx,ky,ax,ay]=ik(hx,hy+2,tx,ty,17,17,-1),pt=far?farOf(L.pants):L.pants,bt=far?farOf(L.boot):L.boot;
    d.cap(hx,hy+2,kx,ky,4.8,4,pt);d.cap(kx,ky,ax,ay,4,3.3,pt);
    // a laced hiking boot pointing toward the wall, with a dark sole
    d.cap(ax-1,ay,ax+4,ay+1.5,3,2.4,bt);for(let x=Math.round(ax)-3;x<=Math.round(ax)+6;x++)d.set(x,Math.round(ay)+3,"#2a1a10");
    d.set(Math.round(ax)+1,Math.round(ay)-2,bt.l);};
  // far limbs first, a shade darker
  layer(d=>{arm(d,P.hf,1);});
  layer(d=>{leg(d,P.ff,1);});
  // the pack: a tall rucksack on the back with a rolled mat on top, a coiled rope and a side pocket
  layer(d=>{const [p0x,p0y]=at(-10,-4),[p1x,p1y]=at(-11,-25);d.cap(p0x,p0y,p1x,p1y,6.5,7,L.pack);
    const [fx,fy2]=at(-10,-26);d.ell(fx,fy2,6.5,3,{l:L.pack.m,m:L.pack.d,d:tone(L.pack.d,-.3)});
    const [r0x,r0y]=at(-16,-31),[r1x,r1y]=at(-4,-31);d.cap(r0x,r0y,r1x,r1y,2.6,2.6,L.roll);
    const [kx,ky]=at(-15,-8);for(let k=0;k<14;k++){const q=k/14*6.283;d.set(kx+Math.cos(q)*3.2,ky+Math.sin(q)*3.6,L.coil);}
    const [qx,qy]=at(-6,-6);d.ell(qx,qy,2.5,3.5,{l:L.pack.m,m:L.pack.d,d:tone(L.pack.d,-.3)});});
  // body: torso, harness and gear, the near leg, scarf
  layer(d=>{d.cap(hx,hy-2,sx,sy+2,6.8,8,L.top);
    if(L.zip){for(let k=0;k<22;k++){const [x,y]=at(6,-3-k);if(d.get(Math.round(x),Math.round(y)))d.set(x,y,L.top.d);}}
    // harness: a waist belt with a buckle, and carabiners clipped at the hip
    for(let x=-7;x<=7;x++){const [u,v]=at(x,1);d.set(u,v,"#34343c");const [u2,v2]=at(x,0);if(d.get(Math.round(u2),Math.round(v2)))d.set(u2,v2,"#4a4a54");}
    const [bx,by]=at(5,0);d.set(bx,by,"#c7ccd4");d.set(bx+1,by,"#c7ccd4");
    for(let i=0;i<(o.gear|0);i++){const [gx,gy]=at(-5+i*3,3),c=i%2?"#f2b233":"#c7ccd4";for(let k=0;k<4;k++)d.set(gx,gy+k,c);d.set(gx+1,gy+3,c);}
    // a pack strap over the shoulder
    for(let k=0;k<16;k++){const [x,y]=at(-2+k*.35,-22+k*1.1);d.set(x,y,tone(L.pack.d,-.2));}
    leg(d,P.fn,0);
    if(L.scarf){const fl=o.flap?1:0;d.cap(nx-4,ny+1,nx+4,ny+1,2,2,L.scarf);d.cap(nx-4,ny+2,nx-10,ny+5+fl,2,1.4,L.scarf);}});
  // the near arm goes over the body but under the head, so a raised arm never hides the face
  layer(d=>{arm(d,P.hn,0);});
  // head: skull, face in profile, hair or beard, then the beanie
  layer(d=>{const hr=L.hair;
    if(L.long){d.cap(cx-3,cy-2,cx-6,cy+14,4.2,3.4,hr);}
    d.cap(nx,ny+2,nx+1,ny-2,2.6,2.6,SKIN); // neck
    d.ell(cx,cy,6,7,{l:SKIN.l,m:SKIN.m,d:SKIN.m});for(let x=Math.round(cx)-1;x<=Math.round(cx)+4;x++)if(d.get(x,Math.round(cy)+6))d.set(x,Math.round(cy)+6,SKIN.d);
    // short hair at the back of the head and an ear
    if(!L.long)for(let y=cy-2;y<=cy+4;y++)for(let x=cx-6;x<=cx-2;x++)if(d.get(Math.round(x),Math.round(y)))d.set(x,y,d.shade(hr,(x-cx)/6,(y-cy)/7,x,y));
    if(L.long)for(let y=cy-2;y<=cy+3;y++)for(let x=cx-6;x<=cx-1;x++)if(d.get(Math.round(x),Math.round(y)))d.set(x,y,d.shade(hr,(x-cx)/6,(y-cy)/7,x,y));
    d.set(cx-1,cy+1,SKIN.d);d.set(cx-1,cy+2,SKIN.d);d.set(cx-2,cy+1,SKIN.m);
    // nose, eye and brow facing the wall
    const ex=cx+3,ey=cy-(P.up?2:0);
    d.set(cx+6,cy+1,SKIN.m);d.set(cx+7,cy+1,SKIN.d);d.set(cx+6,cy+2,SKIN.d);
    if(P.oh){d.set(ex,ey-1,"#ffffff");d.set(ex,ey,"#ffffff");d.set(ex+1,ey,OUTLINE);d.set(ex+1,ey-1,"#ffffff");}
    else if(o.blink||P.eff){d.set(ex,ey,OUTLINE);d.set(ex+1,ey,OUTLINE);}
    else{d.set(ex,ey,OUTLINE);d.set(ex,ey-1,OUTLINE);d.set(ex+1,ey-1,"#ffffff");}
    for(let x=ex-1;x<=ex+2;x++)d.set(x,ey-2-(P.eff?0:0),hr.d);
    if(L.freck){d.set(cx+3,cy+2,SKIN.d);d.set(cx+5,cy+2,SKIN.d);}
    // a full beard over jaw and chin, with the mouth showing through; otherwise just a mouth
    if(L.beard){for(let y=cy+1;y<=cy+9;y++)for(let x=cx-2;x<=cx+7;x++){const inHead=d.get(x,y),chin=y>cy+5&&x>=cx-1&&x<=cx+5-Math.max(0,y-cy-7)*2;
        if((inHead&&y>=cy+3&&x>=cx-1)||chin)d.set(x,y,d.shade(hr,(x-cx-2)/6,(y-cy-3)/6,x,y));}
      for(let x=cx+4;x<=cx+6;x++)d.set(x,cy+4,P.oh||P.joy?"#5a1a14":hr.d);}
    else{if(P.oh||P.joy){d.set(cx+5,cy+4,"#5a1a14");d.set(cx+6,cy+4,"#5a1a14");d.set(cx+5,cy+5,"#8c2a1d");}else{d.set(cx+5,cy+4,"#a04a3a");d.set(cx+6,cy+4,SKIN.d);}}
    // beanie: a dome over the crown, a ribbed fold-up band, an optional stripe and bobble
    d.ell(cx-1,cy-4,7,6.5,L.hat,(x,y)=>y<=cy-2);
    for(let x=Math.round(cx)-7;x<=Math.round(cx)+6;x++)for(let y=Math.round(cy)-3;y<=Math.round(cy)-1;y++){if(x>cx+5&&y>cy-2)continue;d.set(x,y,(x&1)?L.band.m:L.band.d);}
    if(L.stripe)for(let x=Math.round(cx)-7;x<=Math.round(cx)+5;x++)if(d.get(x,Math.round(cy)-6))d.set(x,Math.round(cy)-6,L.stripe);
    if(L.pom)d.ell(cx-3,cy-11,2.6,2.4,L.pom);});
  const [c,g]=mk(W,H);
  for(let i=0;i<W*H;i++)if(out[i]){g.fillStyle=out[i];g.fillRect(i%W,(i/W)|0,1,1);}
  return c;}
class Rig{
  constructor(L,hold,rest){this.L=L;this.hold=hold;this.rest=rest;this.mode="stand";this.N={x:0,y:0};this.v={x:0,y:0};
    this.h=[{x:0,y:0},{x:0,y:0}];this.hi=0;this.gx=0;this.gy=0;this.cheer=0;this.dizzy=0;this.fall=null;this.cnt=0;
    this.mv=null;this.clip=null;this.pose="stand";this.dir=1;this.idleAt=0;this.ph=Math.random()*6;this.cache=new Map();}
  pelvis(){return {x:this.N.x,y:this.N.y};}
  // the hang spot: N is the hips; the near hand sits HANG from them on hold i
  hangAt(i){const a=this.hold(i);return {x:a[0]-HANG[0],y:a[1]-HANG[1]};}
  play(frames,loop=-1){this.clip={frames:frames.map(([p,ms])=>[p,Math.max(40,ms)]),loop,i:0,t:0};this.pose=frames[0][0];}
  standLoop(){this.play([["stand",650],["stand2",650]],0);}
  slide(x,y,d,wait=0){this.mv={x0:this.N.x,y0:this.N.y,x1:x,y1:y,t:0,d:Math.max(d,.001),wait};}
  calm(){this.idleAt=FX.time+2.6+Math.random()*2.6;}
  standAt(x,y){this.mode="stand";this.fall=null;this.mv=null;this.gx=x;this.gy=y;this.N.x=x;this.N.y=y-LEG;this.standLoop();this.calm();this.pin();}
  grab(i){this.mode="climb";this.fall=null;this.mv=null;this.hi=i;const p=this.hangAt(i);this.N.x=p.x;this.N.y=p.y;this.play([["hang",1e9]]);this.calm();this.pin();}
  stepUp(d){const n=++this.hi,p=this.hangAt(n),ms=d*1000;this.mode="climb";this.slide(p.x,p.y,d);
    this.play([[n%2?"reachR":"reachL",ms*.5],["pull",ms*.5],["hang",1e9]]);this.calm();}
  dyno(d){const ms=d*1000;this.hi+=2;const p=this.hangAt(this.hi);this.mode="climb";this.slide(p.x,p.y,d*.6,d*.3);
    this.play([["crouch",ms*.3],["jump",ms*.6],["pull",ms*.1],["hang",1e9]]);this.calm();}
  stepDown(d){if(this.hi-2<0)return;const n=--this.hi,p=this.hangAt(n),ms=d*1000;this.slide(p.x,p.y,d);
    this.play([["pull",ms*.5],[n%2?"reachL":"reachR",ms*.5],["hang",1e9]]);this.calm();}
  reachFrom(i,d){const ms=d*1000,first=this.mode==="fall"?"pull":"hop";this.mode="climb";this.fall=null;this.hi=i;const p=this.hangAt(i);
    this.slide(p.x,p.y,d*.6,d*.4);this.play([[first,ms*.4],["jump",ms*.6],["hang",1e9]]);this.calm();}
  topOut(x,y,d){this.slide(x,y-LEG,d);this.play([["mantle",d*600],["hop",1e9]]);}
  land(x,y){this.standAt(x,y);this.play([["hop",160],["stand",650],["stand2",650]],1);}
  // on a ledge: walk to x at a steady pace (facing the way they go; standing again on arrival), or kneel to work
  // facing dir; both return how long the walk takes in ms
  walkTo(x,speed=30){const d=Math.abs(x-this.N.x)/speed;if(d<.05){this.mode="stand";return 0;}
    this.mode="walk";this.dir=x>this.N.x?1:-1;this.slide(x,this.N.y,d);this.gx=x;return d*1000;}
  work(dir){this.mode="work";this.mv=null;this.dir=dir;}
  startFall(ax,ay,len){this.mode="fall";this.mv=null;this.fall={ax,ay,len,caught:0};this.v.y=-35;this.v.x=(Math.random()-.5)*20;this.play([["fall1",110],["fall2",110]],0);}
  // where the hands are in the world this frame (for chalk puffs)
  pin(){const P0=POSES[this.pose]||POSES.stand,hp=this.pelvis(),k=this.dir;
    this.h[0].x=hp.x+P0.hn[0]*k;this.h[0].y=hp.y+P0.hn[1];this.h[1].x=hp.x+P0.hf[0]*k;this.h[1].y=hp.y+P0.hf[1];}
  update(dt){
    const c=this.clip;
    if(c){c.t+=dt*1000;while(c.t>=c.frames[c.i][1]){c.t-=c.frames[c.i][1];if(c.i<c.frames.length-1)c.i++;else if(c.loop>=0)c.i=c.loop;else{c.t=0;break;}}
      const np=c.frames[c.i][0];if(np!==this.pose){if((np==="pull"||np==="hang")&&this.mode==="climb"&&this.pose!=="chalk"&&!this.pose.startsWith("shake")){sfx("grab");puff(this.h[0].x,this.h[0].y);}this.pose=np;}}
    if(this.mode==="fall"){const F=this.fall;this.v.y+=450*dt;this.N.x+=this.v.x*dt;this.N.y+=this.v.y*dt;
      const dx=this.N.x-F.ax,dy=this.N.y-F.ay,d=Math.hypot(dx,dy);
      if(d>F.len){const nx=dx/d,ny=dy/d,vr=this.v.x*nx+this.v.y*ny;this.N.x=F.ax+nx*F.len;this.N.y=F.ay+ny*F.len;
        if(vr>0){this.v.x-=nx*vr*1.4;this.v.y-=ny*vr*1.4;if(!F.caught){F.caught=1;if(this.onCatch)this.onCatch(vr);}}}
      const dm=Math.pow(.5,dt);this.v.x*=dm;this.v.y*=dm;}
    else if(this.mv){const m=this.mv;if(m.wait>0)m.wait-=dt;else{m.t+=dt;const k=Math.min(1,m.t/m.d);this.N.x=lerp(m.x0,m.x1,k);this.N.y=lerp(m.y0,m.y1,k);if(k>=1)this.mv=null;}}
    if(this.mode==="walk"&&!this.mv){this.mode="stand";this.standLoop();}
    if(this.dizzy>0)this.dizzy-=dt;
    if(this.mode==="stand"){if(this.cheer>0){this.cheer-=dt;if(!(this.clip&&this.clip.joy)){this.play([["cheer1",170],["cheer2",170]],0);this.clip.joy=1;}if(this.cheer<=0)this.standLoop();}
      else if(this.clip&&this.clip.joy)this.standLoop();}
    if(!this.mv&&(this.mode==="climb"||this.mode==="stand")&&this.cheer<=0&&FX.time>this.idleAt&&!RM.matches){this.calm();
      if(this.mode==="climb")this.play(Math.random()<.5?[["chalk",900],["hang",1e9]]:[["shake1",110],["shake2",110],["shake1",110],["shake2",110],["shake1",110],["shake2",110],["hang",1e9]]);
      else if(this.pose==="stand"||this.pose==="stand2")this.play([["look",1600],["stand",650],["stand2",650]],1);}
    // on the wall they face it; on a ledge they face their partner
    const other=FX.A&&(this===FX.A.me?FX.A.mate:FX.A.me);
    if(this.mode==="climb")this.dir=1;
    else if(this.mode==="stand"&&other&&other!==this&&Math.abs(other.N.x-this.N.x)>4)this.dir=other.N.x>this.N.x?1:-1;
    this.pin();
  }
  // the PixelLab frame for this pose: climbing poses pick a frame of the climb clip, a fall flails through its
  // arms-up frames, standing breathes through the idle clip and cheering plays the cheer clip, both by the clock
  // On the wall the climb clip plays in step with the body: each move up runs half the cycle (one hand reaching,
  // pulling and the feet stepping up) while the body slides to the next hold, and the next move runs the other half
  // with the other hand, so a run of moves loops the whole clip smoothly. Hanging still holds the frame the last
  // move ended on (a shake-out flicks to the next one); a fall flails through the arms-up frames.
  artFrame(t){
    // (while a move off a ledge or a fall waits to start, the body keeps the frame it had, so it never dips first)
    if(this.mode==="climb"&&this.mv&&this.mv.wait>0&&this.lastArt)return this.lastArt;
    if(this.mode==="climb"){const half=CLIP_N.climb>>1,base=(this.hi&1)*half,m=this.mv;
      if(m&&m.wait<=0)return ["climb",(base+Math.min(half-1,Math.floor(m.t/m.d*half)))%CLIP_N.climb];
      return ["climb",(base+half-1+(this.pose==="shake2"?1:0))%CLIP_N.climb];}
    if(this.mode==="fall")return ["climb",[3,7][Math.floor(t*9)%2]];
    if(this.mode==="walk")return ["walk",Math.floor(t*9+this.ph)%CLIP_N.walk];
    if(this.mode==="work")return ["work",Math.floor(t*7+this.ph)%CLIP_N.work];
    const m=ART_POSE[this.pose];if(m)return m;
    if(this.pose.startsWith("cheer"))return ["cheer",Math.floor(t*12+this.ph)%CLIP_N.cheer];
    return ["idle",Math.floor(t*4+this.ph)%CLIP_N.idle];}
  draw(g,t,ox,oy){if(this.hidden)return; // asleep in the tent
    const x=R0(this.N.x)+ox,y=R0(this.N.y)+oy,A=this.L.art;
    if(A&&A.ready){const [k,i]=this.lastArt=this.artFrame(t),fr=A.clips[k],b=boxOf(fr[0]),W=fr[0].width,flip=this.dir<0,key=`${k}|${i}|${flip}`;
      let img=this.cache.get(key);
      if(!img){if(flip){const [c,cg]=mk(W,fr[i].height);cg.translate(W,0);cg.scale(-1,1);cg.drawImage(fr[i],0,0);img=c;}else img=fr[i];this.cache.set(key,img);}
      // on the wall the clip's raised hand and its wall-side edge sit on the hold; on a ledge the feet stand
      // LEG below the hips, the body centred on them (each clip anchored by its first frame, so it moves within it)
      if(k==="climb")g.drawImage(img,x+HANG[0]+2-b.x1,y+HANG[1]-1-b.y0);
      else g.drawImage(img,x-(flip?W-1-((b.x0+b.x1)>>1):(b.x0+b.x1)>>1),y+LEG-b.y1);}
    else{
      const P0=POSES[this.pose]||POSES.stand,blink=!P0.eff&&!P0.oh&&((t+this.ph*1.7)%3.9)<.13,flap=Math.floor(t*4+this.ph)%2,gear=this.gear|0;
      const key=`${this.pose}|${gear}|${blink?1:0}|${flap}|${this.dir}`;let img=this.cache.get(key);
      if(!img){const s=pixelSprite(this.L,this.pose,{gear,blink,flap});
        if(this.dir<0){const [c,cg]=mk(s.width,s.height);cg.translate(s.width,0);cg.scale(-1,1);cg.drawImage(s,0,0);img=c;}else img=s;
        this.cache.set(key,img);}
      g.drawImage(img,x-(this.dir<0?SPR.W-SPR.hx:SPR.hx),y-SPR.hy);}
    if(this.dizzy>0)for(let i=0;i<3;i++){const a=Math.floor(t*8)/8*6+i*2.09;rect(g,x+R0(Math.cos(a)*8)-1,y-50+R0(Math.sin(a)*2)-1,2,2,i%2?C.cream:C.gold);}
  }
}
/* ---------- rope: a stepped sagging line from the partner's harness through the clipped bolts to the leader ---------- */
const ROPE={l:"#f0b464",m:"#d0702a",s:"#8a3c14",d:"#3a1a0c"};
class Rope{
  constructor(){this.path=null;}
  update(path){this.path=path;}
  // a 2px kernmantle rope: every pixel along the sagging curve gets a 2x2 dab, dark on the lower right, and a twisted
  // sheath pattern (a light fleck every few pixels, a dark one between) so it reads as a braided cord, not a line
  draw(g,ox,oy){const p=this.path;if(!p||p.length<2)return;let s=0;
    const dab=(x,y,c)=>{g.fillStyle=c;g.fillRect(x,y,2,2);};
    for(let pass=0;pass<2;pass++){s=0;
      for(let i=1;i<p.length;i++){const [x0,y0]=p[i-1],[x1,y1]=p[i],L=Math.hypot(x1-x0,y1-y0),sag=Math.min(8,L*.12),n=Math.max(2,Math.ceil(L));
        const mx=(x0+x1)/2+sag*.4,my=(y0+y1)/2+sag;let lx=null,ly=null;
        for(let k=0;k<=n;k++){const t=k/n,x=R0((1-t)*(1-t)*x0+2*(1-t)*t*mx+t*t*x1)+ox,y=R0((1-t)*(1-t)*y0+2*(1-t)*t*my+t*t*y1)+oy;
          if(x===lx&&y===ly)continue;lx=x;ly=y;s++;
          if(pass===0)dab(x+1,y+1,ROPE.d);
          else{dab(x,y,ROPE.m);const q=s%4;if(q===0)dot(g,x,y,ROPE.l);else if(q===2)dot(g,x+1,y+1,ROPE.s);}}}}}
}
/* ---------- particles and pop-up words ---------- */
function emit(p){if(FX.parts.length<300&&!RM.matches)FX.parts.push(p);}
function puff(x,y){for(let i=0;i<4;i++)emit({k:"chalk",x:x+(Math.random()-.5)*3,y:y+(Math.random()-.5)*2,vx:(Math.random()-.5)*8,vy:-2-Math.random()*4,g:-1,l:.7,m:.7});}
function pebbles(r){for(let i=0;i<6;i++)emit({k:"peb",x:r.N.x+(Math.random()-.5)*10,y:r.N.y-10,vx:(Math.random()-.5)*16,vy:-10-Math.random()*16,g:350,l:1.8,m:1.8});}
function embers(x,y,amt){const dt=FX.dt;if(Math.random()<dt*7*amt)emit({k:"ember",x:x+(Math.random()-.5)*5,y:y-4,vx:(Math.random()-.5)*5+3,vy:-14-Math.random()*10,g:-3,l:1.1+Math.random(),m:2.1});
  if(Math.random()<dt*1.4*amt)emit({k:"smoke",x:x+(Math.random()-.5)*3,y:y-9,vx:4,vy:-8,g:-1,l:2.6,m:2.6});}
function pop(r,text){if(RM.matches)return;FX.pops.push({x:r.N.x,y:r.N.y-58,text,t:0});sfx("pop");}
function stepParts(dt){FX.parts=FX.parts.filter(p=>{p.l-=dt;p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;return p.l>0;});
  FX.pops=FX.pops.filter(p=>(p.t+=dt)<1.1);}
function drawParts(g,ox,oy,t){for(const p of FX.parts){const a=p.l/p.m,x=R0(p.x)+ox,y=R0(p.y)+oy;
  if(p.k==="chalk")rect(g,x,y,a>.5?2:1,a>.5?2:1,"#f4f1e8");
  else if(p.k==="ember")dot(g,x,y,a>.5?C.gold:C.rope);
  else if(p.k==="smoke"){if(((x+y)&1)===0||a>.6)rect(g,x,y,a>.4?3:2,2,a>.5?"#d8d4cc":"#b8b4ac");}
  else rect(g,x,y,2,2,"#6e6a62");}
  for(const p of FX.pops){const k=p.t/1.1,s=textSprite(p.text,C.gold);if(k>.85&&Math.floor(t*16)%2)continue;
    g.drawImage(s,R0(p.x)+ox-(s.width>>1),R0(p.y-k*14)+oy-(k<.12?R0((.12-k)*30):0));}}

/* ---------- camps, base camp and the summit ---------- */
// a plank sign with pixel text
function sign(text){const s=textSprite(text,C.cream,null),[c,g]=mk(s.width+6,s.height+4);
  rect(g,0,0,c.width,c.height,INK);rect(g,1,1,c.width-2,c.height-2,C.wood);rect(g,1,1,c.width-2,1,C.woodL);rect(g,1,c.height-2,c.width-2,1,C.woodD);
  g.drawImage(s,3,1);return c;}
// a tent standing on the ground at y: the generated one once it has loaded, the painted one until then
function drawTent(g,x,y){if(ART.tent)g.drawImage(ART.tent,x,y-boxOf(ART.tent).y1-1);else g.drawImage(sprites().tent,x,y-12);}
// a camp shelf jutting from the cliff: the generated ledge (grassy for Camp I, snowy for Camp II) with its walkable
// top at the camp's height and its right end over the rock, or until it loads a painted slab; a tent, sign and fire
// the ledge as drawn: the image up to where its cliff slab starts, its back end at x=30 over the wall
const ledgeW=()=>ART.ledge?ART.ledgeW||ART.ledge.width:0,ledgeL=()=>30-ledgeW();
function campLayer(k,cy){if(FX.camps[k])return FX.camps[k];
  // (the buttress under the ledge, painted with the cliff, fills in between the ledge's back end and the wall)
  const x1=30,x0=Math.min(-176,ledgeL()-8),y0=cy-110,y1=cy+100,[c,g]=mk(x1-x0,y1-y0),X=x=>x-x0,Y=y=>y-y0,snow=k==="c2";
  if(ART.ledge){const L=snow?ART.ledgeSnow:ART.ledge,W=ledgeW();g.drawImage(L,0,0,W,L.height,X(ledgeL()),Y(cy-ART.ledgeTop),W,L.height);}
  else for(let x=-170;x<x1;x++){const end=x<-160?(x+170)/10:1,th=R0((9+hash(x>>2,5)*4)*end);
    for(let y=0;y<=th;y++){let col=rockAt(x,cy+y+400);if(y===th)col=C.crack;else if(y>=th-1)col=C.rockD;
      if(y<=1)col=snow?(y?C.snowS:C.snow):(y?C.moss:C.mossL);if(y===2&&!snow&&hash(x,9)<.4)col=C.mossD;dot(g,X(x),Y(cy+y),col);}
    if(!snow&&hash(x,4)<.35)dot(g,X(x),Y(cy-1),hash(x,6)<.5?C.grassL:C.mossH);}
  // the ledge waits empty but for its sign: the team pitches its own camp when it gets here
  // (the sign stands at the ledge's far end, before where the tent will go)
  const sx=ART.ledge&&ART.ledgeWalk?ledgeL()+ART.ledgeWalk[0]+6:-122,s=sign(k==="c1"?"CAMP I":"CAMP II");
  g.drawImage(s,X(sx)-6,Y(cy-92));rect(g,X(sx),Y(cy-92)+s.height,1,92-s.height,C.woodD);
  return FX.camps[k]={c,x0,y0};}
// where things go on a camp ledge, from the ledge's walkable span: the tent at the outer end, the fire beside it,
// where each climber kneels to work (the leader at the tent, the partner at the fire) and the tent's door
function campSpots(){const L=ART.ledge,T=ART.tent,F=ART.fire&&ART.fire[0];
  const walk0=L&&ART.ledgeWalk?ledgeL()+ART.ledgeWalk[0]:-140,tb=T?boxOf(T):{x0:0,x1:70,y1:50},tw=tb.x1-tb.x0;
  // (the tent faces out of the screen, so its door is in the middle; the sign's post takes the first few pixels)
  const fb=F&&F.complete&&F.naturalWidth?boxOf(F):{x0:4,x1:34},fw=fb.x1-fb.x0,tentL=walk0+12,tentR=tentL+tw,fireL=tentR+14;
  return {tentX:tentL-tb.x0,tentR,fireX:fireL-fb.x0,fireC:fireL+(fw>>1),meWork:tentR+12,mateWork:fireL+fw+14,door:tentL+(tw>>1)};}
// the tent, risen from the ground up to fraction p (being pitched or packed away)
function drawTentRise(g,x,y,p){if(p<=0)return;if(!ART.tent){if(p>=1)drawTent(g,x,y);return;}
  const T=ART.tent,b=boxOf(T),h=b.y1+1-b.y0,v=Math.max(1,R0(h*p)),sy=b.y1+1-v;g.drawImage(T,0,sy,T.width,v,x,y-v,T.width,v);}
// the campfire: a pile of logs, then the generated flame loop (until those load, the small painted fire)
function drawFire(g,x,y,lit,t){const F=ART.fire,ok=F&&F.every(im=>im.complete&&im.naturalWidth);
  if(!ok){g.drawImage(sprites().fire[lit?Math.floor(t*8)%3:0],x+12,y-11);return;}
  const im=lit?F[Math.floor(t*9)%FIRE_N]:(ART.firePile||F[0]);g.drawImage(im,x,y-boxOf(im).y1-1);}
function drawCamp(g,k,cy,t,ox,oy){const L=campLayer(k,cy);g.drawImage(L.c,L.x0+ox,L.y0+oy);
  const C2=FX.camp;if(!C2||C2.k!==k)return;const S=campSpots();
  drawTentRise(g,S.tentX+ox,cy+oy,C2.tent);
  if(C2.fire){drawFire(g,S.fireX+ox,cy+oy,C2.fire==="lit",t);if(C2.fire==="lit")embers(S.fireC,cy-10,1);}}
// the base-camp meadow and the near pines, painted once per view width
function baseLayer(){const ox=FX.ox,w=FX.vw;if(FX.base&&FX.base.ox===ox&&FX.base.w===w)return FX.base;
  const x0=-ox-8,x1=w-ox+8,y0=-90,y1=120,[c,g]=mk(x1-x0,y1-y0),X=x=>x-x0,Y=y=>y-y0;
  // distant pines first, then the meadow, then the big pines in front of the cliff foot
  // (once the generated pine is in, the generated treeline behind stands in for these painted ones)
  if(!ART.pine)for(let x=x0;x<-30;x+=9+(hash(x,1)*8|0)){const h=22+(hash(x,2)*26|0),s=pineSprite(h,x*7,{l:C.pineL,m:C.pine,d:C.pineD,h:C.pineH});g.drawImage(s,X(x)-(s.width>>1),Y(2-h));}
  // the generated meadow strip, its grass rising a few pixels above the ground line, soil below it
  if(ART.ground){const G=ART.ground,gy=-6-ART.groundTop;
    rect(g,0,Y(gy+ART.soilAt),x1-x0,y1-gy-ART.soilAt,ART.soil);
    for(let x=x0-((x0%G.width)+G.width)%G.width;x<x1;x+=G.width)g.drawImage(G,X(x),Y(gy));}
  else for(let x=x0;x<x1;x++){const top=hash(x>>1,3)<.3?-1:0;
    for(let y=top;y<y1;y++){let col=y<=0?C.grassL:y<4?C.grass:y<7?(hash(x,y)<.5?C.grass:C.dirt):y<40?(hash(x,y)<.08?C.dirtD:C.dirt):C.dirtD;
      if(y>=1&&y<4&&hash(x*3,y)<.12)col=C.mossH;dot(g,X(x),Y(y),col);}
    if(hash(x,8)<.18)dot(g,X(x),Y(-2),C.grassL);}
  // the sign raised behind the tent, the tent, then (drawn each frame) the fire beside the climbers
  const s=sign("BASE CAMP");g.drawImage(s,X(-160)-(s.width>>1),Y(-80));rect(g,X(-160),Y(-80)+s.height,1,80-s.height,C.woodD);
  drawTent(g,X(-196),Y(0));
  return FX.base={c,x0,y0,ox,w};}
// the big pines in front of the cliff foot: the generated pine (every other one mirrored) once it has loaded
function drawFrontPines(g,ox,oy){
  if(ART.pine){const P=ART.pine,b=boxOf(P);[[-214,0],[-6,1],[14,0]].forEach(([x,f])=>{const dx=x+ox-(P.width>>1),dy=2-b.y1-1+oy;
      if(f){g.save();g.translate(dx+P.width,dy);g.scale(-1,1);g.drawImage(P,0,0);g.restore();}else g.drawImage(P,dx,dy);});return;}
  for(const [x,h] of [[-214,64],[-6,46],[14,58]]){const s=FX.pines?.[h]||(FX.pines=FX.pines||{},FX.pines[h]=pineSprite(h,h*13,{l:C.pineL,m:C.pine,d:C.pineD,h:C.pineH}));
  g.drawImage(s,x+ox-(s.width>>1),2-h+oy);}}
// a tall flag on the tip, and a sign on a post down the left ridge
function drawSummit(g,t,ox,oy){const fx=SX-18,fy=R0(peakTop(fx))+1;rect(g,fx+ox,fy-30+oy,1,30,INK);g.drawImage(sprites().flag[Math.floor(t*3)%2],fx+ox,fy-30+oy);
  // the sign's post stands on the ridge just in from the cliff edge (which leans right near the top), and its board
  // reaches out left over the drop so it never hides the flag
  const sx=Math.max(SX-62,edgeL(TOPY)+6),sy=R0(peakTop(sx)),s=sign("SUMMIT");rect(g,sx+ox,sy-14+oy,1,14,C.woodD);g.drawImage(s,sx+ox-s.width+6,sy-14-s.height+oy);}
const fireAmt=k=>!FX.lit[k]?0:FX.litAt[k]?clamp((FX.time-FX.litAt[k])/1.2,0,1):1;
function quickdraws(g,ox,oy){const p=FX.pins;if(!p.length)return;for(let i=1;i<p.length-1;i++){const x=R0(p[i][0])+ox,y=R0(p[i][1])+oy;rect(g,x,y,1,3,C.gold);rect(g,x-1,y+3,3,3,C.metal);dot(g,x,y+4,C.navy);}}

/* ---------- setup, loop and frame ---------- */
function ensureScene(){
  const cv=$("#topo");if(!cv)return false;if(FX.cv===cv)return true;
  FX.cv=cv;FX.g=cv.getContext("2d");FX.mode="";FX.state=null;FX.tw=[];FX.ch.main++;FX.cam=null;FX.parts=[];FX.pops=[];FX.rope=new Rope();FX.label=null;FX.pins=[];
  // one canvas pixel per art pixel, scaled up by a whole number: about 300 art pixels tall on any screen
  const box=cv.parentElement||cv,fit=()=>{const r=box.getBoundingClientRect(),W=Math.max(1,r.width),H=Math.max(1,r.height),px=Math.max(2,Math.round(Math.min(H/300,W/190)));
    if(W===FX.W&&H===FX.H&&px===FX.px&&FX.layers)return;FX.W=W;FX.H=H;FX.px=px;FX.vw=Math.ceil(W/px);FX.vh=Math.ceil(H/px);
    cv.width=FX.vw;cv.height=FX.vh;cv.style.width=FX.vw*px+"px";cv.style.height=FX.vh*px+"px";FX.g.imageSmoothingEnabled=false;
    FX.layers=makeLayers(FX.vw,FX.vh);FX.areaAt=0;FX.base=null;
    const ww=FX.vw+60;if(ww>(FX.wallW||0)){FX.wallW=ww;FX.chunks.clear();}};
  FX.fit=fit;fit();try{new ResizeObserver(fit).observe(box);}catch(e){addEventListener("resize",fit);}
  FX.visible=true;
  try{const io=new IntersectionObserver(es=>{if(es[0].target!==FX.cv){io.disconnect();return;}FX.visible=es[0].isIntersecting;});io.observe(cv);}catch(e){}
  const btn=$("#sndBtn");if(btn){const sync=()=>btn.setAttribute("aria-pressed",SND.on?"true":"false");sync();
    btn.onclick=()=>{SND.on=!SND.on;LS.set("sound",SND.on);sync();if(SND.on)sndStart();if(SND.out)SND.out.gain.value=SND.on?.55:0;};}
  const me=new Rig(LOOK.me,i=>holdXY(FX.exp.choice,i),i=>restSpot(i,0)),mate=new Rig(LOOK.mate,i=>holdXY(FX.exp.choice,i),i=>restSpot(i,1));
  me.onCatch=v=>{FX.shake=Math.max(FX.shake,clamp(v/120,.35,1.3));if(mate.mode==="climb")mate.play([["crouch",260],["hang",1e9]]);else if(mate.mode==="stand")mate.land(mate.gx,mate.gy);sfx("boing");pop(me,"WHOA!");};
  FX.A={me,mate};FX.fxEl=$("#fx");
  if(!FX.raf)FX.raf=requestAnimationFrame(frame);
  if(!FX.pre){FX.pre=1;prefetch();}
  return true;
}
function stepAmbient(dt){
  FX.nextBird-=dt;if(FX.nextBird<0&&!RM.matches){FX.nextBird=8+Math.random()*10;FX.birds.push({x:-10,y:.12+Math.random()*.3,v:9+Math.random()*6,n:2+(Math.random()*3|0),t:0});}
  FX.birds=FX.birds.filter(b=>{b.x+=b.v*dt;b.t+=dt;return b.x<FX.vw+30;});
  const c=FX.cam;if(!c)return;
  const vy0=c.y-FX.vh/2,vy1=c.y+FX.vh/2,cp=FX.camp;if(cp&&cp.fire==="lit"&&cp.cy>vy0&&cp.cy<vy1&&Math.random()<dt*5)sfx("crackle");
  // while the team sleeps, a "z" drifts up from the tent now and then
  if(cp&&cp.sleep&&!RM.matches&&(FX.nextZ=(FX.nextZ||0)-dt)<0){FX.nextZ=1.4;const S=campSpots();FX.pops.push({x:S.door+8,y:cp.cy-6,text:"z",t:0});}
}
// the part of the window the cards and bar leave open, in CSS px: the camera frames the climb inside it
function sceneArea(){const W=FX.W,H=FX.H,wide=W>=900,top=wide?64:96,m=$("#main");let a={x:0,y:top,w:W,h:H-top};
  const r=m&&m.getBoundingClientRect();if(r&&r.width>0&&r.height>0){if(wide){a.x=Math.min(W-240,r.right+8);a.w=W-a.x;}else a.h=Math.max(150,r.top-top);}
  return a;}
function updateCam(dt){const me=FX.A.me,mt=FX.A.mate,now=performance.now();
  if(now-FX.areaAt>250||!FX.area){FX.area=sceneArea();FX.areaAt=now;}
  const A=FX.area,px=FX.px,ax=A.x/px,ay=A.y/px,aw=A.w/px,ah=A.h/px;
  // the cliff's edge sits a little left of the open area's middle so the valley shows beside it
  // (at a camp the view eases over to centre the wide ledge, from its far end to the wall, in the open part of the
  // screen, so the tent and fire are never under the cards)
  const oxT=FX.camp?ax+aw/2-(ledgeL()+30)/2:ax+aw*(FX.W>=900?.42:.38);
  FX.oxF=FX.oxF==null?oxT:lerp(FX.oxF,oxT,1-Math.exp(-dt*2.5));FX.ox=R0(FX.oxF);
  let fy=FX.focus==="summit"?TOPY-30:lerp(me.N.y,mt.N.y,.3);
  // camera y is the world y at the open area's vertical middle; keep the summit sky and the meadow in frame
  let y=clamp(fy,TOPY-120+(ah/2),60-(ah/2));
  if(FX.fxEl){const s=FX.fxEl.style,v=[A.x,A.y,A.w,A.h].map(n=>Math.round(n)+"px");if(s.width!==v[2]||s.height!==v[3]||s.top!==v[1]||s.left!==v[0]){s.left=v[0];s.top=v[1];s.width=v[2];s.height=v[3];}}
  if(!FX.cam||Math.abs(y-FX.cam.y)>900)FX.cam={y,my:ay+ah/2};
  else{const k=1-Math.exp(-dt*4);FX.cam.y+=(y-FX.cam.y)*k;FX.cam.my=ay+ah/2;}
  FX.shake*=Math.exp(-dt*4);}
function frame(now){
  const cv=FX.cv;if(!cv||!cv.isConnected){FX.raf=0;FX.cv=null;return;}
  const dt=Math.min(.05,Math.max(0,(now-(FX.last||now))/1000));FX.last=now;
  FX.time+=dt;FX.dt=dt;const t=FX.time;
  for(const w of FX.tw.slice()){
    if(w.ch&&FX.ch[w.ch]!==w.id){FX.tw.splice(FX.tw.indexOf(w),1);w.res(false);continue;}
    const k=w.ms?clamp((now-w.t0)/w.ms,0,1):1;w.fn(k);if(k>=1){FX.tw.splice(FX.tw.indexOf(w),1);w.res(true);}}
  const A=FX.A;
  if(FX.exp){A.me.update(dt);A.mate.update(dt);
    const ch=FX.exp.choice,pm=A.mate.pelvis(),pl=A.me.pelvis(),path=[[pm.x,pm.y]];
    if(A.me.mode!=="stand"||A.mate.mode!=="stand")for(let i=A.mate.hi+1;i<A.me.hi;i++)if(i%4===2)path.push(boltXY(ch,i));
    path.push([pl.x,pl.y]);if(A.me.hidden&&A.mate.hidden)path.length=0; // (coiled away while they sleep)
    FX.pins=path;FX.rope.update(path);}
  stepParts(dt);stepAmbient(dt);updateCam(dt);
  if(FX.visible&&!document.hidden)paint(t);
  FX.raf=requestAnimationFrame(frame);
}
// paint rock chunks near the camera when the browser is idle, so climbing never stalls on them
function prefetch(){const go=window.requestIdleCallback||(f=>setTimeout(f,120));
  go(()=>{const c=FX.cam;if(c&&FX.cv){const [n1,n2]=chunkRange(c.y-FX.vh-CHK,c.y+FX.vh+CHK);for(let ci=n1;ci<=n2;ci++)if(!FX.chunks.has(ci)){chunk(ci);break;}}
    setTimeout(prefetch,150);});}
function paint(t){
  const g=FX.g,w=FX.vw,h=FX.vh,c=FX.cam;if(!c||!FX.exp)return;
  const shk=()=>R0((Math.random()-.5)*FX.shake*5);
  // screen = world + (ox, oy): every offset is a whole pixel, so nothing ever shimmers
  const ox=FX.ox+shk(),oy=R0(c.my-c.y)+shk(),vy0=-oy,vy1=h-oy,u=uOf(c.y);
  // the valley sinks as the team climbs: each layer by its own share of the camera's height
  const climb=-c.y,art=ART.valley&&ART.pines;
  if(art)drawValley(g,w,h,climb);else drawSky(g,w,h,u);
  // drifting clouds stay in the open sky (over the backdrop, only above its peaks)
  const cloudMax=art?valleyY(h,climb)+60:h*.7;
  for(let k=0;k<6;k++){const cx=R0(((hash(k,1)*w*1.6+t*(1.2+hash(k,3)*1.5))%(w*1.6))-w*.3),cy=R0(h*(.08+hash(k,4)*.3)+climb*.03);
    if(cy<cloudMax)drawCloud(g,cx,cy,.8+hash(k,2)*.6,k);}
  for(const b of FX.birds)for(let i=0;i<b.n;i++)g.drawImage(SP.bird?SP.bird[Math.floor(b.t*5+i)%2]:sprites().bird[0],R0(b.x-i*7),R0(b.y*h+(i%2?3:-1)*i));
  if(art)drawPines(g,w,h,climb);
  else for(const L of FX.layers){const y=R0(climb*L.par);if(y<h)g.drawImage(L.c,0,y);}
  if(vy1>-120){const B=baseLayer();g.drawImage(B.c,B.x0+ox,B.y0+oy);drawFire(g,-118+ox,oy,true,t);embers(-100,-10,1);}
  const [c1,c2]=chunkRange(vy0,vy1);for(let ci=c1;ci<=c2;ci++)g.drawImage(chunk(ci),-40+ox,-(ci+1)*CHK+oy);
  if(vy1>-120)drawFrontPines(g,ox,oy);
  for(const [kk,ix] of [["c1",IDX_C1],["c2",IDX_C2]]){const y=-ix*HS;if(y>vy0-70&&y<vy1+30)drawCamp(g,kk,y,t,ox,oy);}
  if(vy0<TOPY+60)drawSummit(g,t,ox,oy);
  if(FX.label){const i=FX.label.i,[hx,hy]=holdXY(FX.exp.choice,i),x=hx+8+ox,y=hy+oy,s=textSprite(FX.label.text,C.cream,INK);
    g.drawImage(sprites().flag[Math.floor(t*3)%2],x,y-12);g.drawImage(s,x+9,y-15);}
  FX.rope.draw(g,ox,oy);quickdraws(g,ox,oy);
  FX.A.mate.draw(g,t,ox,oy);FX.A.me.draw(g,t,ox,oy);
  if(FX.night>0)drawNight(g,w,h,t,ox,oy);
  drawParts(g,ox,oy,t); // (after the night, so embers and the sleepers' z's stay bright)
}
// night at camp: the whole scene sinks into deep blue, stars come out over the valley, and the fire and the tent
// glow through it (redrawn on top, the fire with a warm dithered halo)
function drawNight(g,w,h,t,ox,oy){const n=FX.night,cp=FX.camp;
  g.fillStyle=`rgba(6,10,32,${(.66*n).toFixed(3)})`;g.fillRect(0,0,w,h);
  const edge=ox-20;for(let i=0;i<70;i++){const sx=R0(hash(i,21)*w),sy=R0(hash(i,22)*h*.55);if(sx>edge)continue;
    if(hash(i,23)*1.3>n)continue;const tw=Math.sin(t*2+i*1.7)>.7;dot(g,sx,sy,tw?"#ffffff":"#c9d6f2");}
  if(!cp)return;const S=campSpots(),cy=cp.cy;
  if(cp.tent>0){g.globalAlpha=.55*n;drawTentRise(g,S.tentX+ox,cy+oy,cp.tent);g.globalAlpha=1;}
  if(cp.fire==="lit"){const fx=S.fireC+ox,fy=cy-8+oy;
    for(const [r,a,c] of [[30,.10,"#ff9a3a"],[20,.16,"#ffb04a"],[12,.22,"#ffd27a"]]){g.globalAlpha=a*n;pdisc(g,fx,fy,r,c);}
    g.globalAlpha=1;drawFire(g,S.fireX+ox,cy+oy,true,t);}}

/* ---------- overlays: pixel title cards, captions and confetti ---------- */
function title(text,sub,tone){const fx=$("#fx");if(!fx)return;fx.querySelectorAll(".tcard").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="tcard "+(tone||"");
  el.innerHTML=`<b>${[...text].map((ch,i)=>`<span style="--i:${i}">${ch===" "?"&nbsp;":esc(ch)}</span>`).join("")}</b>${sub?`<small>${esc(sub)}</small>`:""}`;
  fx.appendChild(el);setTimeout(()=>el.remove(),2700);}
function caption(text){const fx=$("#fx");if(!fx)return;fx.querySelectorAll(".cap").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="cap";el.textContent=text;fx.appendChild(el);setTimeout(()=>el.remove(),2900);}
function confetti(n=28){const fx=$("#fx");if(!fx||RM.matches)return;const cols=[C.red,C.gold,"#2f8f8a",C.cream,"#9bd16a"];
  for(let i=0;i<n;i++){const c=document.createElement("i");c.className="conf";
    c.style.cssText=`--x:${(Math.random()*100).toFixed(1)}%;--d:${(Math.random()*.5).toFixed(2)}s;--c:${cols[i%cols.length]};--dr:${Math.round((Math.random()*2-1)*60)}px;--dur:${(1.4+Math.random()).toFixed(2)}s`;
    fx.appendChild(c);setTimeout(()=>c.remove(),3200);}}

/* ---------- sequences ---------- */
const stepMsFor=n=>clamp(3600/Math.max(n,1),230,460);
function place(r,i){const rs=r.rest(i);if(rs){r.standAt(rs.x,rs.y);r.hi=i;}else r.grab(Math.max(i,2));}
function placeTeam(exp,li){FX.exp=exp;FX.camp=null;FX.night=0;FX.leaving=null;FX.A.me.hidden=FX.A.mate.hidden=false;
  place(FX.A.me,li);place(FX.A.mate,mateIdx(li));}
/* ---------- camp: pitched on arrival, slept in through the night, packed away in the morning ---------- */
const campOf=ix=>ix===IDX_C1?"c1":ix===IDX_C2?"c2":null;
// the team has both arrived on the ledge: the leader walks to the tent spot and pitches it while the partner builds
// the fire and lights it; dusk falls, and they walk to the door and turn in for the night
async function makeCamp(ix,ch="main"){const k=campOf(ix);if(!k)return true;const A=FX.A,me=A.me,mate=A.mate,S=campSpots(),cy=-ix*HS;
  FX.camp={k,ix,cy,tent:0,fire:null,sleep:false};FX.leaving=null;
  const walk=Math.max(me.walkTo(S.meWork),mate.walkTo(S.mateWork));if(!(await wait(walk+150,ch)))return false;
  me.work(-1);mate.work(-1);
  setTimeout(()=>{if(FX.camp&&FX.camp.k===k&&!FX.camp.fire)FX.camp.fire="pile";},700);
  setTimeout(()=>{if(FX.camp&&FX.camp.k===k&&FX.camp.fire==="pile"){FX.camp.fire="lit";sfx("crackle");}},2300);
  if(!(await play(2800,p=>{FX.camp.tent=smooth(p);},ch)))return false;
  me.standAt(me.N.x,cy);mate.standAt(mate.N.x,cy);if(!(await wait(500,ch)))return false;
  if(!(await play(2400,p=>{FX.night=smooth(p);},ch)))return false;
  const w2=Math.max(me.walkTo(S.door),mate.walkTo(S.door+6));if(!(await wait(w2+100,ch)))return false;
  me.hidden=mate.hidden=true;FX.camp.sleep=true;return true;}
// the next pitch starts from camp: dawn breaks, the team comes out, the leader packs the tent away as the fire dies,
// and both walk back to the foot of the wall. Both climbers' moves wait on the same morning.
function leaveCamp(ch="main"){if(!FX.camp)return Promise.resolve(true);if(FX.leaving)return FX.leaving;
  return FX.leaving=(async()=>{const A=FX.A,me=A.me,mate=A.mate,cp=FX.camp,S=campSpots(),ix=cp.ix;
    me.hidden=mate.hidden=false;cp.sleep=false;me.standAt(S.door,cp.cy);mate.standAt(S.door+6,cp.cy);me.hi=mate.hi=ix;
    if(!(await play(1800,p=>{FX.night=1-smooth(p);},ch)))return false;
    const w=Math.max(me.walkTo(S.meWork),mate.walkTo(mate.rest(ix).x));if(!(await wait(w+100,ch)))return false;
    me.work(-1);cp.fire="pile";
    if(!(await play(1400,p=>{cp.tent=1-smooth(p);},ch)))return false;
    cp.fire=null;me.standAt(me.N.x,cp.cy);const w3=Math.max(me.walkTo(me.rest(ix).x),mate.walkTo(mate.rest(ix).x));
    if(!(await wait(w3+100,ch)))return false;
    me.standAt(me.rest(ix).x,cp.cy);mate.standAt(mate.rest(ix).x,cp.cy);FX.camp=null;FX.night=0;return true;})();}
async function climbRig(r,to,ms,id,ch="main"){
  const ok=()=>FX.ch[ch]===id,lead=r===FX.A.me;
  if(FX.camp&&to!==FX.camp.ix&&!(await leaveCamp(ch)))return false;
  if(to<r.hi)return downRig(r,to,ms,id,ch);
  if(r.mode==="stand"){if(to<=r.hi)return ok();r.reachFrom(r.hi+3,.4);if(!(await wait(440,ch)))return false;}
  while(r.hi<to){
    // on long runs the leader throws the odd dyno: both hands let go and catch two holds higher
    if(lead&&to-r.hi>=4&&ms<=330&&++r.cnt%5===0){r.dyno(ms*1.4/1000);sfx("hup");pop(r,"HUP!");if(!(await wait(ms*1.7,ch)))return false;continue;}
    r.stepUp(ms/1000*.92);if(!(await wait(ms,ch)))return false;}
  const rs=r.rest(to);
  if(rs&&r.mode==="climb"){r.topOut(rs.x,rs.y,.34);if(!(await wait(340,ch)))return false;
    r.land(rs.x,rs.y);r.hi=to;sfx("thud");if(!(await wait(520,ch)))return false;}
  return ok();
}
async function downRig(r,to,ms,id,ch){const ok=()=>FX.ch[ch]===id,rs=r.rest(to),stop=rs?to+2:to;
  if(r.mode==="stand")r.grab(Math.max(r.hi,stop+1));
  while(r.hi>stop){r.stepDown(ms/1000*.9);if(!(await wait(ms,ch)))return false;}
  if(rs){r.land(rs.x,rs.y);r.hi=to;if(!(await wait(520,ch)))return false;}
  return ok();}
async function fallRig(r,anchor,back,id,ch,caught){
  const rs=r.rest(anchor),[ax,ay]=rs?[rs.x,rs.y-40]:r.hold(anchor),near=r===FX.A.me;
  pebbles(r);if(near)sfx("whistle");r.startFall(ax,ay+(caught?8:0),caught?Math.hypot(r.N.x-ax,r.N.y-ay-8)+12:30);
  if(!(await wait(caught?1500:1900,ch)))return false;
  if(!caught){r.dizzy=1.6;FX.shake=Math.max(FX.shake,.6);}
  r.reachFrom(clamp(Math.round(-(r.N.y+HANG[1])/HS),2,IDX_TOP-1),.3);
  if(!(await wait(caught?360:900,ch)))return false;
  return climbRig(r,back,260,id,ch);
}
// reaching the summit is a celebration; reaching a camp is quieter: a title, then the team gets to work
function arrive(name,exp,to){const top=name==="summit";title(top?"SUMMIT!":name.toUpperCase(),`${fmt(to*HS/WK+ALT.base)} m`,"camp");
  if(top){confetti();sfx("summit");FX.A.me.cheer=2.6;}else sfx("thud");}
async function runEvent(exp,o){
  const id=++FX.ch.main,A=FX.A,me=A.me,mate=A.mate,ok=()=>FX.ch.main===id;
  const to=idxOf(exp,typeof o.to==="number"?o.to:exp.pitch),plan=mateIdx(to);
  if(o.fall&&to<me.hi){title("WHOOPS!",`Down to ${fmt(to*HS/WK+ALT.base)} m`,"bad");
    const lower=wait(500).then(r=>r&&mate.hi>plan&&climbRig(mate,plan,240,id)); // the partner lowers off to meet them
    if(!(await fallRig(me,to,to,id,"main",false)))return;await lower;}
  else if(o.fall){caption("Slip! The rope holds");if(!(await fallRig(me,me.hi-1,me.hi,id,"main",true)))return;}
  else if(to>me.hi){const ms=stepMsFor(to-me.hi),follow=wait(700).then(r=>r&&climbRig(mate,plan,ms,id));
    if(!(await climbRig(me,to,ms,id)))return;
    if(o.arrived)arrive(o.arrived,exp,to);else if(o.echo)title("ECHO!","A double pitch","good");else pop(me,o.move>=2?"HUP HUP!":"HUP!");
    if(!(await follow))return;
    if(o.arrived==="summit")mate.cheer=1.8;else if(o.arrived&&campOf(to)){await makeCamp(to);return;}}
  else{caption("Holding on…");pop(me,"PHEW!");}
  if(ok()&&mate.hi!==plan)await climbRig(mate,plan,320,id);
}
async function runSummit(t){++FX.ch.main;const A=FX.A;
  if(A.me.mode!=="stand"||A.me.hi<IDX_TOP)placeTeam(t.exp,IDX_TOP);
  title("TOP OF THE WORLD!",`${fmt(ALT.top)} m · expedition ${t.exp.n}`,"camp");confetti(44);sfx("summit");
  A.me.cheer=3.2;if(!(await wait(400)))return;A.mate.cheer=3;}
async function runDemo(){ // lobby: a rope team climbs the whole cliff on a loop
  const id=++FX.ch.main,A=FX.A,ok=()=>FX.ch.main===id,tot=total(DEMO);
  placeTeam(DEMO,0);if(RM.matches)return;
  while(ok()){placeTeam(DEMO,0);FX.cam=null;if(!(await wait(1500)))return;
    for(let p=0;p<tot;p++){const to=idxOf(DEMO,p+1),ms=stepMsFor(to-A.me.hi),f=wait(700).then(r=>r&&climbRig(A.mate,mateIdx(to),ms,id));
      if(!(await climbRig(A.me,to,ms,id)))return;
      if(p===2&&!(await fallRig(A.me,A.me.hi-1,A.me.hi,id,"main",true)))return;
      if(to>=IDX_TOP){A.me.cheer=2;pop(A.me,"SUMMIT!");}
      if(!(await f))return;
      if(to>=IDX_TOP){A.mate.cheer=1.6;if(!(await wait(2600)))return;}
      else if(campOf(to)){if(!(await makeCamp(to))||!(await wait(2200)))return;}
      else if(!(await wait(600)))return;}
    if(!(await wait(2500)))return;}}
// (opened or reloaded while the team is at a camp: the camp is already up and they are asleep in it)
function snap(exp,t){FX.ch.main++;const A=FX.A,ix=idxOf(exp,exp.pitch);placeTeam(exp,ix);
  A.me.gear=exp.rope;if(t.round.phase==="summit"){A.me.cheer=2;A.mate.cheer=2;}
  else if(campOf(ix)){FX.camp={k:campOf(ix),ix,cy:-ix*HS,tent:1,fire:"lit",sleep:true};FX.night=1;A.me.hidden=A.mate.hidden=true;}
  FX.cam=null;}

function drawTopo(t){
  if(!ensureScene())return;
  if(!t){FX.focus="me";FX.label=null;FX.lit={c1:1,c2:1};FX.litAt={};FX.A.me.gear=3;
    if(FX.mode!=="lobby"){FX.mode="lobby";FX.exp=DEMO;FX.cam=null;runDemo();}return;}
  const exp=t.exp,r=t.round;FX.exp=exp;
  const reached=Math.max(idxOf(exp,exp.pitch),idxOf(exp,exp.anchor));
  for(const [k,ix] of [["c1",IDX_C1],["c2",IDX_C2]]){const on=reached>=ix;if(on&&!FX.lit[k]&&FX.mode==="game")FX.litAt[k]=FX.time+1.6;FX.lit[k]=on;}
  FX.focus=r.phase==="summit"?"summit":"me";
  const tot=total(exp),ter=route(exp)[exp.pitch];
  FX.label=r.phase!=="summit"&&exp.pitch<tot&&needsChoice(exp)<0&&ter?{i:idxOf(exp,exp.pitch+1),text:`P${exp.pitch+1} ${TERRAIN[ter].name.toUpperCase()}`}:null;
  const st={n:exp.n,pitch:exp.pitch,res:r.phase==="reveal"?r.resolvedAt:null,phase:r.phase,gear:exp.rope};
  const prev=FX.state;FX.state=st;
  if(FX.mode!=="game"||!prev||prev.n!==st.n){FX.mode="game";FX.litAt={};snap(exp,t);return;}
  // spent hooks leave the rack at once; a restock waits until the leader has pulled onto the camp ledge
  if(st.gear<prev.gear)FX.A.me.gear=st.gear;
  else if(st.gear>prev.gear)setTimeout(()=>{if(FX.mode!=="game"||!FX.state||FX.state.n!==st.n||FX.state.gear!==st.gear)return;const me=FX.A.me;me.gear=st.gear;pop(me,"GEAR RESTOCKED!");sfx("restock");},2600);
  if(st.res&&st.res!==prev.res&&r.result)runEvent(exp,r.result);
  else if(st.pitch!==prev.pitch){const id=++FX.ch.main,to=idxOf(exp,st.pitch);climbRig(FX.A.me,to,300,id).then(k=>k&&climbRig(FX.A.mate,mateIdx(to),300,id));}
  if(st.phase==="summit"&&prev.phase!=="summit")runSummit(t);
}
