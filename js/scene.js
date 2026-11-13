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
  birds:[],nextBird:2,label:null,layers:null,base:null,camps:{},text:new Map(),poofs:[]};
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
if(document.fonts)document.fonts.load(`8px ${PXFONT}`).then(()=>{FX.text.clear();},()=>{});

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
  // a bird on the wing, four beats: wings up, level, down, level
  SP.bird=[[".k....k..","..k..k...","..kkkkk..","...kkkko.","........."],[".........","kk....kk.","..kkkkk..","...kkkko.","........."],
           [".........",".........","..kkkkk..",".kkkkkko.","kk......."],[".........","kk....kk.","..kkkkk..","...kkkko.","........."]].map(r=>gridSprite(r,{k:"#1e2436",o:C.gold}));
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
  if(ART.clouds){const im=ART.clouds[seed%ART.clouds.length];g.drawImage(im,x-(im.width>>1),y-(im.height>>1));return;}
  const blobs=[[0,0,6],[7,-3,8],[16,-1,7],[23,1,5],[-6,2,4]].map(([a,b,r],i)=>[x+R0(a*s),y+R0(b*s),Math.max(2,R0(r*s*(.8+hash(seed,i)*.4)))]);
  for(const [bx,by,r] of blobs)pdisc(g,bx,by+1,r,C.cloudD);
  for(const [bx,by,r] of blobs)pdisc(g,bx,by,r,C.cloudS);
  for(const [bx,by,r] of blobs)pdisc(g,bx-1,by-1,r-1,C.cloud);
  rect(g,x-R0(6*s),y+R0(4*s),R0(34*s),2,C.cloudS);}

/* ---------- generated art (PixelLab): the valley backdrop, a near treeline and two granite textures ----------
   Each loads in the background; until it has, the painted version above (and the painted rock below) stands in. */
const ART={},CLOUD_N=3,TENT_UP=9;
(function loadArt(){
  const pixels=im=>{const [,g]=mk(im.width,im.height);g.drawImage(im,0,0);return {w:im.width,h:im.height,d:g.getImageData(0,0,im.width,im.height).data};},
    rgb=(p,x,y)=>{const i=(y*p.w+x)*4;return `rgb(${p.d[i]},${p.d[i+1]},${p.d[i+2]})`;},
    load=(src,fn)=>{const im=new Image();im.onload=()=>fn(im);im.src=src;};
  load(asset("assets/valley.png"),im=>{const p=pixels(im);ART.sky=rgb(p,im.width>>1,0);ART.valleyFoot=rgb(p,4,im.height-1);ART.valley=im;});
  // high on the mountain the same art turns wintry: moss and grass (green-dominant pixels) become snow by brightness,
  // and the rock is cooled halfway to a blue-grey of its own brightness
  const wintry=d=>{for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const r=d[i],gr=d[i+1],b=d[i+2],l=r*.3+gr*.59+b*.11;
    if(gr>r+8&&gr>b+8){const s=l>110?[242,245,247]:l>70?[191,210,230]:[142,170,204];d[i]=s[0];d[i+1]=s[1];d[i+2]=s[2];}
    else{d[i]=R0(lerp(r,l*.86,.5));d[i+1]=R0(lerp(gr,l*.94,.5));d[i+2]=Math.min(255,R0(lerp(b,l*1.12,.5)));}}};
  // the wall's three kinds of rock, bottom to top, all from one painted texture so they share their shapes: warm
  // mossy granite as painted; bare pale granite (the same, greyed and lightened, its moss gone to lichen); and its
  // wintry copy, cold and dark with snow where the moss was. Each carries its average colour, which the wall is
  // pulled toward a little so the climbers stand out against it
  load(asset("assets/rock-low.png"),im=>{const lo=pixels(im),mid=pixels(im),hi=pixels(im);
    for(let i=0,d=mid.d;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2],l=r*.3+g*.59+b*.11,moss=g>r+6&&g>b+6,v=moss?l*.9+50:l*.92+38;
      d[i]=Math.min(255,v*1.02);d[i+1]=Math.min(255,v);d[i+2]=Math.min(255,v*.95);}
    wintry(hi.d);
    {const d=hi.d,W=hi.w,H=hi.h,src=lo.d,L=k=>src[k]*.3+src[k+1]*.59+src[k+2]*.11;
      for(let y=2;y<H-3;y++)for(let x=0;x<W;x++){const k=(y*W+x)*4;
        if(L(k)>95&&L(k-W*4)<62){const n=2+((x*7+y*3)%3);for(let j=0;j<n;j++){const q=k+j*W*4;if(L(q)<62)break;
          const c=j<n-1?[242,245,247]:[191,210,230];d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2];}}}}
    for(const p of [lo,mid,hi]){let r=0,g=0,b=0;const N=p.w*p.h;for(let k=0;k<N*4;k+=4){r+=p.d[k];g+=p.d[k+1];b+=p.d[k+2];}p.mean=[r/N,g/N,b/N];}
    const mean=p=>{let r=0,g=0,b=0;const N=p.w*p.h;for(let k=0;k<N*4;k+=4){r+=p.d[k];g+=p.d[k+1];b+=p.d[k+2];}p.mean=[r/N,g/N,b/N];};
    ART.zones=[lo,mid,hi];ART.rockLo=lo;FX.chunks.clear();
    // (the top of the mountain has its own painting of the same slabs, iced over; the wintry copy stands in until it loads)
    load(asset("assets/rock-high.png"),im2=>{const ice=pixels(im2);mean(ice);ART.zones=[lo,mid,ice];FX.chunks.clear();});});
  // the walkable surface of a platform image: the first opaque row down its middle
  const surface=p=>{const x=p.w>>1;for(let y=0;y<p.h;y++)if(p.d[(y*p.w+x)*4+3]>40)return y;return 0;};
  // camp ledges: Camp I as drawn; Camp II with its grass and moss turned to snow and its rock cooled to blue-grey
  // (the ledge's walkable span: the columns whose top lies within a few pixels of the surface, where a tent can stand)
  load(asset("assets/ledge.png"),im=>{const p=pixels(im),d=p.d;ART.ledgeTop=surface(p);
    // the image came with a ring of logs (an old fire pit) on its grass; it is painted over with the plain grass
    // just to its right
    for(let y=0;y<32;y++)for(let x=60;x<109;x++){const i=(y*p.w+x)*4,j=i+50*4;for(let k=0;k<4;k++)d[i+k]=d[j+k];}
    const top=x=>{for(let y=0;y<p.h;y++)if(d[(y*p.w+x)*4+3]>40)return y;return p.h;};let a=0,b=p.w-1;
    // (the image's back end may carry a slab of cliff rising well above the ledge: it is cut off where that starts,
    // so only the ledge itself is drawn, its back end against the real wall)
    while(a<p.w&&top(a)>ART.ledgeTop+4)a++;let w=a;while(w<p.w&&top(w)>=ART.ledgeTop-6)w++;
    b=w-1;while(b>a&&top(b)>ART.ledgeTop+4)b--;ART.ledgeWalk=[a,b];ART.ledgeW=w;
    // the ground line: the first row of solid grass all along the walkable span (the tufts above it are just grass),
    // which is where the camp's height sits, so feet and the tent stand on the grass, not on the tufts
    let gy=ART.ledgeTop;for(;gy<p.h;gy++){let n=0;for(let x=a;x<=b;x++)if(d[(gy*p.w+x)*4+3]>200)n++;if(n>=.95*(b-a+1))break;}ART.ledgeGround=gy;
    const canvasOf=()=>{const [c,g]=mk(p.w,p.h),id=g.createImageData(p.w,p.h);id.data.set(d);g.putImageData(id,0,0);return c;};
    ART.ledge=canvasOf();wintry(d);ART.ledgeSnow=canvasOf();FX.camps={};});
  load(asset("assets/tent.png"),im=>{ART.tent=im;FX.camps={};FX.base=null;});
  // the tent going up: eight frames from a flat heap of canvas and poles to (the ninth) the pitched tent above,
  // all on the pitched tent's own canvas
  {const fr=[];let left=TENT_UP-1;for(let n=0;n<TENT_UP-1;n++)load(asset(`assets/tent/${n}.png`),im=>{fr[n]=im;if(!--left)ART.tentUp=fr;});}
  // two tall trees (a broad old spruce and a slender pine), well over twice a climber's height
  ART.trees=[];["tree-a","tree-b"].forEach((n,t)=>load(asset(`assets/${n}.png`),im=>{ART.trees[t]=im;FX.base=null;}));
  // camp props: a coil of rope, a cooking pot, a lantern and a supply crate
  ART.props={};for(const n of ["coil","pot","lantern","crate"])load(asset(`assets/props/${n}.png`),im=>{ART.props[n]=im;FX.base=null;});
  // painted clouds (until all are in, the sky's clouds are simple drawn ones)
  {const cl=[];let left=CLOUD_N;for(let i=0;i<CLOUD_N;i++)load(asset(`assets/clouds/${i}.png`),im=>{cl[i]=im;if(!--left)ART.clouds=cl;});}
  // the dust poof: the generated cloud and its burst-and-fade frames
  ART.poof=Array.from({length:7},(_,i)=>{const im=new Image();im.src=asset(`assets/poof/${i}.png`);return im;});
  // the base-camp meadow: a grass-and-soil strip repeated along the valley floor, solid soil below it
  // (solid soil fills in from the strip's deepest row that is opaque all the way across, in that row's colour, so
  // the strip's ragged lower edge never shows the scenery behind it)
  load(asset("assets/ground.png"),im=>{const p=pixels(im);ART.groundTop=surface(p);let y=p.h-1;
    const full=y=>{for(let x=0;x<p.w;x++)if(p.d[(y*p.w+x)*4+3]<250)return false;return true;};
    while(y>ART.groundTop&&!full(y))y--;ART.ground=im;ART.soilAt=y;ART.soil=rgb(p,p.w>>1,y);FX.base=null;});})();
// the backdrop is one tall painting: the valley at the bottom, a sea of clouds above it and the high sky above that.
// At base camp its foot stands just under the meadow, in the open part of the screen; as the team climbs the view
// pans up it, through the clouds, so that at the summit its top is at the top of the screen
function valleyY(h,climb){const A=FX.area,ab=A?R0((A.y+A.h)/FX.px):h,V=ART.valley.height,foot=ab-30,span=-TOPY+80;
  return R0(Math.min(0,foot-V+clamp(climb,0,span)/span*(V-foot)));}
// the backdrop sinks slowly as the team climbs, with its own sky colour above it and mirrored copies either side
// when the view is wider than the picture; the lake sits in the open air left of the cliff
function drawValley(g,w,h,climb){const V=ART.valley,y=valleyY(h,climb),x0=R0(FX.ox-V.width*.6);
  rect(g,0,0,w,Math.max(0,y),ART.sky);if(y+V.height<h)rect(g,0,y+V.height,w,h-y-V.height,ART.valleyFoot);
  for(let k=-2;k<=2;k++){const x=x0+k*V.width;if(x>=w||x+V.width<=0)continue;
    if(k&1){g.save();g.translate(x+V.width,y);g.scale(-1,1);g.drawImage(V,0,0);g.restore();}else g.drawImage(V,x,y);}}
// a texture pixel, the texture mirrored at every edge so neighbouring tiles always meet; its outermost pixel ring
// (a flat border line on some generated images) is left out, so a mirror never doubles it into a stripe
function texAt(T,x,y){const m=(v,n)=>{n-=2;v=(v%(2*n)+2*n)%(2*n);return 1+(v<n?v:2*n-1-v);},i=(m(y,T.h)*T.w+m(x,T.w))*4;return [T.d[i],T.d[i+1],T.d[i+2]];}

/* ---------- the cliff: granite blocks, moss low down, snow high up, painted once per chunk ---------- */
// how high up the wall a point is, 0 to 1 (moved by the mountain's snow line: snow lower on the harder mountains)
const uOf=y=>clamp(y/TOPY+(FX.snow||0),0,1);
// the cliff's left edge; over the last stretch it leans right so the route along it runs up into the summit ridge
const edgeL=y=>R0((fbm(y*.011+3)-.5)*22+(fbm(y*.003+9)-.5)*30+smooth(clamp((y-TOPY-360)/-360,0,1))*36);
// under each camp the cliff swells out into a pillar that carries the camp's ledge: its face runs straight up to the
// ledge's outer tip (LEDGE_TIP) for the last BUT_TOP pixels, and below that leans back into the wall over BUT_H. The
// route follows this edge, so the climbers come up the pillar's face, take hold of the ledge's lip and pull over it,
// instead of crawling out along the underside of the slab
const BUT_TOP=52,BUT_H=300,LEDGE_TIP=-188;
function rockEdge(y){let e=edgeL(y);
  for(const ix of [IDX_C1,IDX_C2]){const d=y+ix*HS-2;if(d<0||d>BUT_TOP+BUT_H)continue;
    const t=Math.max(0,(d-BUT_TOP)/BUT_H);e=Math.min(e,R0(lerp(e,LEDGE_TIP,1-smooth(t))+(fbm(y*.08+ix)-.5)*(t>0?8:2)));}
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
// The wall as big irregular slabs (a jittered grid, Voronoi-style): each slab is one kind of rock, by its height on
// the mountain (with a little luck, so the zones meet slab by slab and not along a line), and shows a patch of that
// rock's texture, offset and maybe flipped by the slab's own hash. A soft dark crack runs between slabs. The colours
// are pulled a little toward the rock's average and dimmed, so the wall sits back behind the climbers and the rope.
const RC_W=96,RC_H=78,ZONE_MID=.36,ZONE_HIGH=.7;
const zoneOf=(u,id)=>{const z=u+(hash(id,9)-.5)*.14;return z<ZONE_MID?0:z<ZONE_HIGH?1:2;};
function rockCell(wx,wy){
  const gx=Math.floor(wx/RC_W),gy=Math.floor(wy/RC_H);let d1=1e9,d2=1e9,sx=0,sy=0,id=0;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=gx+i,cy=gy+j,
    px=(cx+.2+hash(cx,cy*7+3)*.6)*RC_W,py=(cy+.2+hash(cx*5,cy+11)*.6)*RC_H,dx=wx-px,dy=(wy-py)*1.1,d=Math.hypot(dx,dy);
    if(d<d1){d2=d1;d1=d;sx=px;sy=py;id=cx*7919+cy*104729;}else if(d<d2)d2=d;}
  const T=ART.zones[zoneOf(uOf(sy),id)],fx=hash(id,2)<.5?-1:1,ox=R0((hash(id,3)-.5)*90),oy=R0((hash(id,4)-.5)*90);
  const tx=clamp(R0((wx-sx)*fx+T.w/2+ox),1,T.w-2),ty=clamp(R0(wy-sy+T.h/2+oy),1,T.h-2),i=(ty*T.w+tx)*4;
  const e=d2-d1,k=e<1.3?.5:e<2.6?.8:1,m=T.mean;
  return [(T.d[i]*.74+m[0]*.26)*.9*k|0,(T.d[i+1]*.74+m[1]*.26)*.9*k|0,(T.d[i+2]*.74+m[2]*.26)*.92*k|0];}
const CHK_X0=216;
function paintChunk(ci){
  // (each chunk starts CHK_X0 left of the route's usual line, far enough out for the pillars under the camps)
  const yTop=-(ci+1)*CHK,w=FX.wallW,[c,g]=mk(w+CHK_X0,CHK);if(yTop+CHK<TOPY-40)return c;
  const id=g.createImageData(w+CHK_X0,CHK),d=id.data,cache={},tex=ART.rockLo&&ART.zones;
  const hex=h=>cache[h]||(cache[h]=[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]);
  for(let py=0;py<CHK;py++){const wy=yTop+py,L=rockEdge(wy);if(wy>0)continue;
    if(L>=w)continue;for(let px=Math.max(0,L+CHK_X0);px<w+CHK_X0;px++){const wx=px-CHK_X0;let col=null,v=null;
      if(wy<peakTop(wx))continue;
      if(wx<L)continue;
      if(wx===L)col=C.crack;
      // the generated granite: warm and mossy low down, cold and snowy high up, with a dithered seam between
      else if(tex){v=rockCell(wx,wy);if(wx===L+1)v=v.map(k=>k+(255-k)*.12|0);}
      else if(wx<=L+2)col=uOf(wy)>.74&&hash(wy>>1,8)<.5?C.snow:uOf(wy)>.6?C.coldL:C.rockL;
      else col=rockAt(wx,wy);
      if(wy-peakTop(wx)<1)col=C.snowS;else if(wy-peakTop(wx)<5)col=C.snow; // snow on the summit ridge
      if(col)v=hex(col);const i=(py*(w+CHK_X0)+px)*4;d[i]=v[0];d[i+1]=v[1];d[i+2]=v[2];d[i+3]=255;}}
  g.putImageData(id,0,0);return c;}
function chunk(ci){let c=FX.chunks.get(ci);if(c){FX.chunks.delete(ci);FX.chunks.set(ci,c);return c;}
  c=paintChunk(ci);FX.chunks.set(ci,c);if(FX.chunks.size>24)FX.chunks.delete(FX.chunks.keys().next().value);return c;}
const chunkRange=(vy0,vy1)=>[Math.max(0,Math.floor(-vy1/CHK)),Math.min(Math.ceil(-(TOPY-40)/CHK),Math.floor(-vy0/CHK))];

/* ---------- route geometry: lanes, holds, bolts and where climbers rest ----------
   The route runs up the cliff's left edge, seen side-on: holds sit on the edge, so a climber hangs in the open
   air beside the rock. Option B of each fork takes a crack a few pixels in from the edge. */
function laneX(ch,y){const a=ALT.base-y/WK,k=a<=ALT.c1?"A":a<=ALT.c2?(ch[0]||"A"):(ch[1]||"A");return rockEdge(y)-8+(k==="B"?6:0);}
const LIP=16; // (the last hold before a camp ledge is on its lip, this far below the ledge's top: where the pull-up
             // frames have the hands, so the climber comes up onto the ledge's surface and not above it)
const holdXY=(ch,i)=>{const y=i===IDX_C1-1||i===IDX_C2-1?-(i+1)*HS+LIP:R0(-i*HS+(hash(i,5)-.5)*3);return [R0(laneX(ch,y)+10+hash(i,3)*2),y];};
// bolts go into the rock just in from the holds
const boltXY=(ch,i)=>[R0(laneX(ch,-i*HS)+15),-i*HS+6];
const idxOf=(exp,p)=>Math.round(-WY(geoAlt(exp,p))/HS);
function restSpot(i,m){if(i<=0)return {x:m?-76:-26,y:0};
  if(i===IDX_C1||i===IDX_C2)return {x:m?-76:-26,y:-i*HS}; // (the edge spot stays clear of the rock face at x -9)
  if(i>=IDX_TOP){const x=m?SX+48:SX+12;return {x,y:R0(peakTop(x))+2};}return null;}
// where the partner belays from while the leader is at li. The two swap leads each pitch, so a partner who has just led
// stays at the stance they reached (cur), well below the new leader; they only move down when a fall leaves them above
// it. Otherwise the stance is just below the team's last anchor (so a fall onto it never comes down through them) and
// eight holds below the leader, or the meadow or camp ledge with no anchor above it (a climber hanging lower than LOW
// holds up would have their boots in the ground)
const LOW=5;
function mateIdx(li,cur){if(li<=0||li===IDX_C1||li===IDX_C2||li>=IDX_TOP)return li;
  const base=li>IDX_C2?IDX_C2:li>IDX_C1?IDX_C1:0;
  if(cur!=null&&cur<=li-LOW&&(cur<=base||cur>=base+LOW+1))return cur;
  const an=FX.exp?idxOf(FX.exp,FX.exp.anchor||0):0,f=Math.min(li-8,an-4);
  return f-base>=LOW+1?f:base;}
// Each climber is drawn at their own place on the route. FX.A.me is the one higher up (the rope's leader, who the
// rope runs up to) and FX.A.mate the other; they swap when one overtakes the other. FX.own is this player's climber,
// which the camera keeps in view.
const isLedge=i=>i<=0||i===IDX_C1||i===IDX_C2||i>=IDX_TOP,ledgeBelow=i=>i>IDX_C2?IDX_C2:i>IDX_C1?IDX_C1:0;
function rigOfId(t,id){const L=lookOf(t,id);return FX.rigs.find(x=>x.L===L);}
function setLead(t){if(!FX.rigs||t.round.phase==="map")return;const ids=memberIds(t);let lead=null;
  if(ids.length<2)lead=rigOfId(t,ids[0]);
  else{const pa=posOf(t.exp,ids[0]),pb=posOf(t.exp,ids[1]);if(pa!==pb)lead=rigOfId(t,pa>pb?ids[0]:ids[1]);}
  FX.own=rigOfId(t,S.uid)||null;
  if(!lead||lead===FX.A.me)return;
  FX.A={me:lead,mate:FX.A.me};
  // standing together on the meadow or a ledge, they trade places: the one now ahead steps up to the wall while the
  // other steps back behind them (drawn behind, so they pass rather than walk through each other)
  for(const x of FX.rigs){const rs=x.mode==="stand"&&!x.hidden&&x.rest(x.hi);if(rs&&Math.abs(rs.x-x.N.x)>3)x.walkTo(rs.x,48);}}
// the hold each climber belongs at: their own pitch's; on the same pitch of the wall, the second hangs a body length
// (five holds) below the first (never so low their boots would be in a ledge). Alone on the rope, the partner drawn with them
// follows as a belayer would
function rigTargets(t){const exp=t.exp,ids=memberIds(t),T=new Map(),A=FX.A;
  if(ids.length<2){const r=rigOfId(t,ids[0])||A.me,o=FX.rigs.find(x=>x!==r),ix=idxOf(exp,posOf(exp,ids[0]));T.set(r,ix);
    // (alone on the rope, the figure drawn as the partner is only company: it follows a pitch below, never left
    // standing at the bottom as if it were a second player who had stopped)
    const f=mateIdx(ix,null),base=ix>IDX_C2?IDX_C2:ix>IDX_C1?IDX_C1:0,g=ix-8;T.set(o,f===ix?ix:g-base>=LOW+1?g:base);return T;}
  const a=idxOf(exp,posOf(exp,ids[0])),b=idxOf(exp,posOf(exp,ids[1]));
  if(a===b&&!isLedge(a)){const lo=Math.max(a-6,ledgeBelow(a)+LOW),hi=Math.max(a,lo+6);T.set(A.me,hi);T.set(A.mate,lo);}
  else{T.set(rigOfId(t,ids[0]),a);T.set(rigOfId(t,ids[1]),b);}
  return T;}

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
// (fall: tipping back off the wall and flailing, its third frame doubles as hanging back in the harness on the rope;
// belay: braced, paying out rope at the waist; yank: dragged a stumbling step forward by a sudden pull on the rope)
const CLIMBER_ART={me:"lumberjack",mate:"woman"},CLIP_N={climb:8,idle:4,cheer:8,walk:6,work:6,fall:6,belay:6,yank:6};
const ART_POSE={hang:["climb",0],chalk:["climb",0],shake1:["climb",0],shake2:["climb",1],reachR:["climb",2],jump:["climb",3],
  pull:["climb",4],crouch:["climb",5],reachL:["climb",6],mantle:["climb",7],look:["idle",1],hop:["idle",3],
  yank1:["yank",1],yank2:["yank",2],yank3:["yank",3],yank4:["yank",4],yank5:["yank",5]};
const HANG_ART=["fall",2]; // hanging back in the harness
const TIE=[68,66];          // the front of the belt in the climbing frames (where the rope ties in)
/* Climbing: the clip is an in-place cycle (reach with one hand as the opposite foot steps up, pull, then the other
   side). So that a hand or boot on the rock stays where it is while the body moves, the frame is taken from the
   climber's height and the sprite is drawn in steps of CLIMB_STEP pixels, one per frame: each new frame, the body is
   that much higher and the planted limbs that much lower in it. Climbing down runs it backwards. */
const CLIMB_STEP=7,CLIMB_X1=93; // (CLIMB_X1: the frames' rightmost pixel, a hand or a toe, which goes into the rock)
const climbQ=y=>Math.round(y/CLIMB_STEP);
const REST_N=9,REST_MS=1700; // the resting and dangling clips: nine frames each, the rest played once through
const REST_STEP=70;  // (the rest starts from the cycle's first frame: the climber shuffles to it, this long a frame)
const TUMBLE_N=8;    // a long fall: flailing on a loop, after the dangle's frames in the fall clip
const SIT_N=9,SIT_DOWN=.9,SIT_UP=.55,SIT_AFTER=1.4; // sitting down to wait on a ledge (after the standing clips)
const SLUMP_N=9,SLUMP_MS=1500; // wrong again from the same stance: a slump and a shake of the head
const restSteps=y=>{const n=CLIP_N.climb,f=((-climbQ(y))%n+n)%n;return f<=n/2?f:n-f;};
// the pull-up onto a ledge: nine frames on a tall canvas, the first the hanging climb frame, the last standing up
// on top. `hang` is where the climb clip's frame sits in that canvas and `stand` where the idle clip's does.
const MANTLE_N=9,MANTLE={lumberjack:{hang:[0,107],stand:[26,18]},woman:{hang:[0,105],stand:[25,22]}};
const STAND_N=9,STAND_MS=2000,LAND_N=5,LAND_MS=900; // standing: a look up the wall, a drink; and up from a hard landing
// the box round a frame's opaque pixels, measured once
function boxOf(im){if(im.bb)return im.bb;const [,g]=mk(im.width,im.height);g.drawImage(im,0,0);
  const d=g.getImageData(0,0,im.width,im.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1;
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(d[(y*im.width+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return im.bb={x0,y0,x1,y1};}
// a climbing frame's toes: the rightmost opaque pixel in the lowest quarter of its figure, and that row
function feetOf(im){if(im.feet)return im.feet;const b=boxOf(im),[,g]=mk(im.width,im.height);g.drawImage(im,0,0);
  const d=g.getImageData(0,0,im.width,im.height).data,y0=b.y1-((b.y1-b.y0)>>2);let fx=b.x0,fy=b.y1;
  for(let y=y0;y<=b.y1;y++)for(let x=b.x1;x>fx;x--)if(d[(y*im.width+x)*4+3]>40){fx=x;fy=y;break;}
  return im.feet={x:fx,y:fy};}
function loadClimber(L){const who=CLIMBER_ART[L.name],A=L.art={clips:{},ready:0};let left=1;
  const img=src=>{left++;const im=new Image();im.onload=()=>{if(--left===0)A.ready=1;};im.src=src;return im;};
  for(const [k,n] of Object.entries(CLIP_N))A.clips[k]=Array.from({length:n},(_,i)=>img(asset(`assets/climbers/${who}/${k}/${i}.png`)));
  A.front=img(asset(`assets/climbers/${who}/south.png`));if(--left===0)A.ready=1;
  // the extra clips ride at the end of the clips whose placement they share: both rests after the climb's frames
  // (hand up as in frame 3, then as in frame 7), the dangle after the fall's
  const extra=(dir,n,done)=>{const fr=[];let k=n;for(let i=0;i<n;i++){const im=new Image();im.onload=()=>{if(!--k)done(fr);};im.src=asset(`assets/climbers/${who}/${dir}/${i}.png`);fr.push(im);}};
  extra("dangle",REST_N,a=>extra("tumble",TUMBLE_N,b=>{A.clips.fall.push(...a,...b);A.dangle=1;A.tumble=1;}));
  extra("rest",REST_N,a=>{A.clips.climb.push(...a);A.rest=1;extra("yes",REST_N,b=>{A.clips.climb.push(...b);A.yes=1;});});
  extra("mantle",MANTLE_N,a=>{A.mantle=a;A.mantleAt=MANTLE[who];});
  extra("look",STAND_N,a=>extra("drink",STAND_N,b=>extra("land",LAND_N,c=>extra("sit",SIT_N,d=>{A.clips.idle.push(...a,...b,...c,...d);A.stand=1;A.sit=1;extra("slump",SLUMP_N,e=>{A.clips.idle.push(...e);A.slump=1;});}))));}
loadClimber(LOOK.me);loadClimber(LOOK.mate);
// all of the climb's pictures are in (until then the scene draws simple stand-ins; the loading screen waits for this)
const artReady=()=>!!(ART.valley&&ART.rockLo&&ART.ledge&&ART.tent&&ART.trees[0]&&ART.trees[1]&&ART.ground&&LOOK.me.art.ready&&LOOK.mate.art.ready);
function ik(rx,ry,tx,ty,a,b,bend){let dx=tx-rx,dy=ty-ry,d=Math.hypot(dx,dy)||1e-4;const m=a+b-.01;if(d>m){tx=rx+dx/d*m;ty=ry+dy/d*m;d=m;}
  const ang=Math.atan2(ty-ry,tx-rx),j=ang+bend*Math.acos(clamp((a*a+d*d-b*b)/(2*a*d),-1,1));return [rx+Math.cos(j)*a,ry+Math.sin(j)*a,tx,ty];}
// sprite box and the hips' place in it; HANG is where the near hand sits (from the hips) when hanging on a hold
const SPR={W:76,H:100,hx:34,hy:58},HANG=[21,-46],LEG=38;
// a move up the wall over time 0..1: still while the hand reaches (the first 42%), then a smooth heave up
const REACH_PULL=k=>{if(k<.42)return 0;const t=(k-.42)/.58;return t*t*(3-2*t);};
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
  // where the rope ties in: the front of the harness, where the sprite was last drawn (see draw)
  tie(){return this.tieW||{x:this.N.x,y:this.N.y};}
  // the hang spot: N is the hips; the near hand sits HANG from them on hold i
  hangAt(i){const a=this.hold(i);return {x:a[0]-HANG[0],y:a[1]-HANG[1]};}
  play(frames,loop=-1){this.clip={frames:frames.map(([p,ms])=>[p,Math.max(40,ms)]),loop,i:0,t:0};this.pose=frames[0][0];}
  standLoop(){this.play([["stand",650],["stand2",650]],0);}
  // (ease, optional, shapes the move: it maps the time 0..1 to how far along the body is)
  slide(x,y,d,wait=0,ease=null){this.mv={x0:this.N.x,y0:this.N.y,x1:x,y1:y,t:0,d:Math.max(d,.001),wait,ease};}
  calm(){this.idleAt=FX.time+2.6+Math.random()*2.6;}
  standAt(x,y){this.mantling=false;this.mode="stand";this.fall=null;this.mv=null;this.gx=x;this.gy=y;this.N.x=x;this.N.y=y-LEG;this.standLoop();this.calm();this.pin();}
  grab(i){this.mode="climb";this.fall=null;this.mv=null;this.hi=i;const p=this.hangAt(i);this.N.x=p.x;this.N.y=p.y;this.play([["hang",1e9]]);this.calm();this.pin();}
  // one move up the wall: the free hand reaches for the next hold while the body stays put, then the climber pulls
  // up onto it in one quick, eased heave (the climb clip plays across both halves, see artFrame)
  stepUp(d){const n=++this.hi,p=this.hangAt(n),ms=d*1000;this.mode="climb";this.slide(p.x,p.y,d);
    this.play([[n%2?"reachR":"reachL",ms*.5],["pull",ms*.5],["hang",1e9]]);this.calm();}
  dyno(d){const ms=d*1000;this.hi+=2;const p=this.hangAt(this.hi);this.mode="climb";this.slide(p.x,p.y,d*.6,d*.3);
    this.play([["crouch",ms*.3],["jump",ms*.6],["pull",ms*.1],["hang",1e9]]);this.calm();}
  stepDown(d){if(this.hi-2<0)return;const n=--this.hi,p=this.hangAt(n),ms=d*1000;this.slide(p.x,p.y,d);
    this.play([["pull",ms*.5],[n%2?"reachL":"reachR",ms*.5],["hang",1e9]]);this.calm();}
  reachFrom(i,d){const ms=d*1000,first=this.mode==="fall"?"pull":"hop";this.mode="climb";this.fall=null;this.hi=i;const p=this.hangAt(i);
    this.slide(p.x,p.y,d*.6,d*.4);this.play([[first,ms*.4],["jump",ms*.6],["hang",1e9]]);this.calm();}
  // over the edge and onto their feet. With the pull-up frames in, those play where the climber hangs (the body's
  // own point slides up meanwhile, for the rope and the camera); without them the body just slides up
  topOut(x,y,d){const A=this.L.art,L=this.lastDraw;
    this.mt=A&&A.mantle&&L&&this.lastArt&&this.lastArt[0]==="climb"?{wx:L.wx-A.mantleAt.hang[0],wy:L.wy-A.mantleAt.hang[1],t0:FX.time,d}:null;
    // (standing up, they are where the last pull-up frame shows them, so the figure doesn't slide once it's over)
    // (and over a camp ledge's tip they come in onto the ledge as they rise, not stand up at its very edge)
    if(this.mt){const b=boxOf(A.clips.idle[0]),x0=this.mt.wx+A.mantleAt.stand[0]+((b.x0+b.x1)>>1);
      this.mt.sh=this.hi<IDX_TOP-1?Math.max(0,LEDGE_TIP+20-x0):0;x=x0+this.mt.sh;}
    this.mantling=true;this.slide(x,y-LEG,d,0,k=>k*k*(3-2*k));this.play([["mantle",d*600],["hop",1e9]]);}
  // (hard: off a fall, they land in a crouch and get up slowly)
  land(x,y,hard){this.standAt(x,y);this.play(hard&&this.L.art&&this.L.art.stand?[["landed",LAND_MS],["stand",650],["stand2",650]]:[["hop",160],["stand",650],["stand2",650]],1);}
  // off the wall and down onto a ledge: the body eases across in a short hop, then stands
  dropTo(x,y,d){this.mantling=false;this.mode="stand";this.fall=null;this.gx=x;this.gy=y;this.slide(x,y-LEG,d);this.play([["hop",d*1000+160],["stand",650],["stand2",650]],1);this.calm();}
  // on a ledge: walk to x at a steady pace (facing the way they go; standing again on arrival), or kneel to work
  // facing dir; both return how long the walk takes in ms
  walkTo(x,speed=30){const d=Math.abs(x-this.N.x)/speed;if(d<.05){this.mode="stand";return 0;}
    this.mode="walk";this.dir=x>this.N.x?1:-1;this.slide(x,this.N.y,d);this.gx=x;return d*1000;}
  work(dir){this.mode="work";this.mv=null;this.dir=dir;}
  // off the wall: pushed out into the air (push, px/s away from the rock) with a little hop. With a rope anchor the
  // rope catches the climber len from it and they swing on it; with a floor instead they land on their feet there
  startFall(ax,ay,len,push=40,floor=null){this.mode="fall";this.mv=null;this.fall={ax,ay,len,caught:0,floor,t0:FX.time};
    this.v.y=-28;this.v.x=-push;this.play([["fall1",110],["fall2",110]],0);}
  // the belayer on the ground is dragged a stumbling step toward the climber, then braces again
  yank(){if(this.mode!=="stand")return this.jolt(5);const k=this.dir;this.slide(this.N.x+7*k,this.N.y,.12);
    setTimeout(()=>{if(this.mode==="stand"&&!this.mv)this.slide(this.N.x-4*k,this.N.y,.45);},260);
    // (the first half of the stumble only: further on, the clip carries the body so far forward it would jump back)
    this.play([["yank1",60],["yank2",80],["yank3",180],["yank2",140],["yank1",120],["stand",650],["stand2",650]],5);this.calm();}
  // a jolt on the wall: the body is snapped down a few pixels and springs back (see draw)
  jolt(a=6){this.joltT=FX.time;this.joltA=a;}
  // where the hands are in the world this frame (for chalk puffs)
  pin(){const P0=POSES[this.pose]||POSES.stand,hp=this.pelvis(),k=this.dir;
    this.h[0].x=hp.x+P0.hn[0]*k;this.h[0].y=hp.y+P0.hn[1];this.h[1].x=hp.x+P0.hf[0]*k;this.h[1].y=hp.y+P0.hf[1];}
  update(dt){
    const c=this.clip;
    if(c){c.t+=dt*1000;while(c.t>=c.frames[c.i][1]){c.t-=c.frames[c.i][1];if(c.i<c.frames.length-1)c.i++;else if(c.loop>=0)c.i=c.loop;else{c.t=0;break;}}
      const np=c.frames[c.i][0];if(np!==this.pose){if((np==="pull"||np==="hang")&&this.mode==="climb"&&this.pose!=="chalk"&&this.pose!=="rest"&&this.pose!=="yes"&&!this.pose.startsWith("shake"))sfx("grab");
        if(np==="chalk"&&this.mode==="climb")puff(this.h[0].x,this.h[0].y); // (a puff only when they chalk up)
        this.pose=np;}}
    if(this.mode==="fall"){const F=this.fall;this.v.y+=450*dt;this.N.x+=this.v.x*dt;this.N.y+=this.v.y*dt;
      // a floor (the meadow or a camp ledge): land on it, feet first, with a thud and a puff of dust
      if(F.floor!=null&&this.N.y>=F.floor){this.land(this.N.x,F.floor+LEG,true);this.dizzy=1.4;FX.shake=Math.max(FX.shake,.8);sfx("thud");pebbles(this);return;}
      if(F.ax!=null){const dx=this.N.x-F.ax,dy=this.N.y-F.ay,d=Math.hypot(dx,dy);
        // (slack while they're still above the anchor: they fall freely until they pass it)
        if(d>F.len&&dy>=0){const nx=dx/d,ny=dy/d,vr=this.v.x*nx+this.v.y*ny;this.N.x=F.ax+nx*F.len;this.N.y=F.ay+ny*F.len;
          // the rope comes taut: the fall stops with a bounce, the rope twangs and the belayer feels it
          if(vr>0){this.v.x-=nx*vr*1.4;this.v.y-=ny*vr*1.4;if(!F.caught){F.caught=1;F.tc=FX.time;caught(this,vr);}}}}
      const dm=Math.pow(.5,dt);this.v.x*=dm;this.v.y*=dm;}
    else if(this.mv){const m=this.mv;if(m.wait>0)m.wait-=dt;else{m.t+=dt;const k=Math.min(1,m.t/m.d),e=m.ease?m.ease(k):k;this.N.x=lerp(m.x0,m.x1,e);this.N.y=lerp(m.y0,m.y1,e);if(k>=1)this.mv=null;}}
    if(this.mode==="walk"&&!this.mv){this.mode="stand";this.standLoop();}
    // (the clips' sounds, in the game only: a footstep as each foot lands, a boot finding the rock on the wall, the
    // mallet coming down on a tent peg)
    if(FX.mode==="game"&&!this.hidden){const t=FX.time;let f=-1,k="";
      if(this.mode==="walk"){f=Math.floor(t*9+this.ph)%CLIP_N.walk;k=f===0||f===3?"step":"";}
      else if(this.mode==="climb"&&!this.mantling){const n=CLIP_N.climb;f=((-climbQ(this.N.y))%n+n)%n;k=f===3||f===7?"scuff":"";}
      else if(this.mode==="work"){f=Math.floor(t*7+this.ph)%CLIP_N.work;k=f===3?"hammer":"";}
      if(f!==this.sndF){this.sndF=f;if(k)sfx(k);}}
    if(this.dizzy>0)this.dizzy-=dt;
    if(this.mode==="stand"){if(this.cheer>0){this.cheer-=dt;if(!(this.clip&&this.clip.joy)){this.play([["cheer1",170],["cheer2",170]],0);this.clip.joy=1;}if(this.cheer<=0)this.standLoop();}
      else if(this.clip&&this.clip.joy)this.standLoop();}
    if(!this.mv&&(this.mode==="climb"||this.mode==="stand")&&this.cheer<=0&&FX.time>this.idleAt&&!RM.matches){this.calm();
      if(this.mode==="climb")this.play(this.L.art&&this.L.art.rest?[["rest",REST_MS+2*restSteps(this.N.y)*REST_STEP],["hang",1e9]]:Math.random()<.5?[["chalk",900],["hang",1e9]]:[["shake1",110],["shake2",110],["shake1",110],["shake2",110],["shake1",110],["shake2",110],["hang",1e9]]);
      // (on their feet with nothing to do, they look up the wall or take a drink; while belaying they just glance up)
      else if(this.sit>0);
      else if(this.pose==="stand"||this.pose==="stand2"){const o=FX.A&&(this===FX.A.me?FX.A.mate:FX.A.me),busy=!this.L.art||!this.L.art.stand||(o&&(o.mode==="climb"||o.mode==="fall"));
        this.play(busy?[["look",1600],["stand",650],["stand2",650]]:[[Math.random()<.5?"slook":"sdrink",STAND_MS],["stand",650],["stand2",650]],1);}}
    // on the wall they face it; on a ledge they face their partner
    const other=FX.A&&(this===FX.A.me?FX.A.mate:FX.A.me);
    // up on a ledge with the partner still well down the wall: after a moment they sit down to wait, and get to
    // their feet again as the partner comes up to the ledge
    {const want=this.mode==="stand"&&!this.mv&&this.cheer<=0&&!(this.dizzy>0)&&this.L.art&&this.L.art.sit&&!RM.matches&&other&&other!==this&&other.mode==="climb"&&other.N.y>this.N.y+96;
      this.sitHold=want?(this.sitHold||0)+dt:0;
      this.sit=this.mode!=="stand"?0:clamp((this.sit||0)+(this.sitHold>SIT_AFTER?dt/SIT_DOWN:-dt/SIT_UP),0,1);}
    // a belayer on the wall leans back out on the rope while the leader climbs past, so the two never overlap
    const lean=other&&this===FX.A.mate&&this.mode==="climb"&&other.mode==="climb"&&Math.abs(other.N.y-this.N.y)<74?-38:0;
    this.passX=(this.passX||0)+(lean-(this.passX||0))*(1-Math.exp(-dt*5));
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
    // jolted on the wall (the rope jerked): snapped back off the rock, arms out, for a moment before grabbing on again
    // (while a move off a ledge or a fall waits to start, the body keeps the frame it had, so it never dips first)
    if(this.mode==="climb"){const n=CLIP_N.climb,q=climbQ(this.N.y),f=((-q)%n+n)%n;
      // a rest: shuffle to the cycle's first stance, drop a hand and shake it out, reach back up, shuffle back
      if((this.pose==="rest"||this.pose==="yes")&&this.clip&&this.L.art[this.pose]&&!this.mv){const b0=this.pose==="yes"?n+REST_N:n;const s=f<=n/2?f:n-f,dir=f<=n/2?-1:1,T=this.clip.t,pre=s*REST_STEP;
        if(T<pre)return ["climb",((f+dir*(Math.floor(T/REST_STEP)+1))%n+n)%n];
        if(T<pre+REST_MS)return ["climb",b0+Math.min(REST_N-1,Math.floor((T-pre)/REST_MS*REST_N))];
        return ["climb",((-dir*Math.min(s,Math.floor((T-pre-REST_MS)/REST_STEP)+1))%n+n)%n];}
      return ["climb",f];}
    // a fall: tipping back off the wall (two frames), then flailing on a loop; once the rope has caught them, they
    // hang back in the harness
    if(this.mode==="fall"){const F=this.fall,ft=FX.time-(F?F.t0:0);
      if(F&&F.caught)return this.L.art.dangle?["fall",CLIP_N.fall+Math.floor((FX.time-(F.tc||0))*7)%REST_N]:HANG_ART;
      return ["fall",ft<.1?1:ft<.2?2:this.L.art.tumble?CLIP_N.fall+REST_N+Math.floor((ft-.2)*10)%TUMBLE_N:3+Math.floor((ft-.2)*11)%3];}
    // sitting down to wait, seated (shifting a little now and then), or getting back up
    if(this.mode==="stand"&&this.sit>0&&this.L.art.sit){const b=CLIP_N.idle+2*STAND_N+LAND_N;
      return ["idle",b+(this.sit>=1?(Math.floor(t*.9+this.ph)%5===0?SIT_N-2:SIT_N-1):Math.floor(this.sit*(SIT_N-1)))];}
    // on the ground or a ledge with the partner climbing above: braced, paying out the rope
    if(this.mode==="stand"&&(this.pose==="stand"||this.pose==="stand2"||this.pose==="look")&&this.cheer<=0){const o=FX.A&&(this===FX.A.me?FX.A.mate:FX.A.me);
      if(o&&(o.mode==="climb"||o.mode==="fall")&&o.N.y<this.N.y-30)return ["belay",Math.floor(t*5+this.ph)%CLIP_N.belay];}
    if(this.mode==="walk")return ["walk",Math.floor(t*9+this.ph)%CLIP_N.walk];
    if(this.mode==="work")return ["work",Math.floor(t*7+this.ph)%CLIP_N.work];
    // a quiet moment on their feet (a look up the wall, a drink), or getting up after landing hard
    if(this.clip&&this.L.art.stand){const at=n=>Math.min(n-1,Math.floor(this.clip.t/(this.pose==="landed"?LAND_MS:STAND_MS)*n));
      if(this.pose==="slook")return ["idle",CLIP_N.idle+at(STAND_N)];
      if(this.pose==="sdrink")return ["idle",CLIP_N.idle+STAND_N+at(STAND_N)];
      if(this.pose==="landed")return ["idle",CLIP_N.idle+2*STAND_N+at(LAND_N)];
      if(this.pose==="slump"&&this.L.art.slump)return ["idle",CLIP_N.idle+2*STAND_N+LAND_N+SIT_N+Math.min(SLUMP_N-1,Math.floor(this.clip.t/SLUMP_MS*SLUMP_N))];}
    const m=ART_POSE[this.pose];if(m)return m;
    if(this.pose.startsWith("cheer"))return ["cheer",Math.floor(t*12+this.ph)%CLIP_N.cheer];
    return ["idle",Math.floor(t*4+this.ph)%CLIP_N.idle];}
  // the sprite is pinned by a different point on the wall (the boots on the rock, or the hands under an overhang),
  // in a fall (the hand) and on a ledge (the feet, each clip centred a little differently, and mirrored when they
  // turn), so switching between them would make it pop sideways: the gap eases out over a moment instead
  blit(g,img,px,py,kind,ox,oy){const wx=px-ox,wy=py-oy,L=this.lastDraw;
    if(L&&L.kind!==kind){const dx=L.wx-wx,dy=L.wy-wy;if(Math.abs(dx)+Math.abs(dy)<140)this.blend={dx,dy,t0:FX.time};}
    let ex=0,ey=0;const B=this.blend;
    if(B){const k=(FX.time-B.t0)/.28;if(k>=1)this.blend=null;else{const s=1-smooth(k);ex=R0(B.dx*s);ey=R0(B.dy*s);}}
    this.lastDraw={kind,wx:wx+ex,wy:wy+ey};this.at=[px+ex,py+ey];g.drawImage(img,px+ex,py+ey);}
  draw(g,t,ox,oy){if(this.hidden)return; // asleep in the tent
    // a jolt (the rope jerked) snaps the body down and lets it spring back over a third of a second
    // (and pulls it out from the wall a little, the way the rope tugs)
    const jt=FX.time-(this.joltT??-9),jd=jt<.35?this.joltA*Math.exp(-jt*9):0,jo=R0(jd*Math.cos(jt*28)),jx=-R0(jd*.7);
    const x=R0(this.N.x)+ox+jx+R0(this.passX||0),y=R0(this.N.y+(FX.sub||0))+oy+jo,A=this.L.art;
    if(this.mt&&this.mantling&&A&&A.mantle){const M=this.mt,S=A.mantleAt,k=clamp((FX.time-M.t0)/M.d,0,.999);
      // (in onto the ledge once over its edge)
      const sx=R0(smooth(clamp((k-.45)/.55,0,1))*(M.sh||0));g.drawImage(A.mantle[Math.floor(k*MANTLE_N)],M.wx+sx+ox,M.wy+oy);
      // (handed on as if the standing frame had been drawn where the last one stands, so the next draw joins up)
      this.lastDraw={kind:"mantle",wx:M.wx+sx+S.stand[0],wy:M.wy+S.stand[1]};this.lastArt=["idle",0];this.tieW={x:this.N.x+4,y:this.N.y+3};return;}
    if(A&&A.ready){const [k,i]=this.lastArt=this.artFrame(t),fr=A.clips[k],b=boxOf(fr[0]),W=fr[0].width,flip=this.dir<0,key=`${k}|${i}|${flip}`;
      let img=this.cache.get(key);
      if(!img){if(flip){const [c,cg]=mk(W,fr[i].height);cg.translate(W,0);cg.scale(-1,1);cg.drawImage(fr[i],0,0);img=c;}else img=fr[i];this.cache.set(key,img);}
      // on the wall the clip's raised hand and its wall-side edge sit on the hold; on a ledge the feet stand
      // LEG below the hips, the body centred on them (each clip anchored by its first frame, so it moves within it)
      // (on the wall the boots, not the reaching hand, set where the body sits: the toes go a few pixels into the
      // rock at their own height, so the climber hugs the face; a falling climber keeps the hand anchor)
      // (but out on the overhang under a camp ledge the rock at the boots lies well in from the hands, so there the
      // hands set it, as they do for the rope and the holds)
      // (on the wall: in steps with the frames, and far enough right that the reaching hand and the toes sit a
      // few pixels into the rock, so the climber is on the face, not beside it)
      if(k==="climb"&&this.mode==="climb"&&!this.mantling){const yq=climbQ(this.N.y)*CLIMB_STEP+R0(FX.sub||0)+oy+jo;
        this.blit(g,img,x+HANG[0]+9-CLIMB_X1,yq+HANG[1]-1-b.y0,"wall",ox,oy);}
      else if(k==="climb")this.blit(g,img,x+HANG[0]+9-CLIMB_X1,y+HANG[1]-1-b.y0,"wall",ox,oy);
      else this.blit(g,img,x-(flip?W-1-((b.x0+b.x1)>>1):(b.x0+b.x1)>>1),y+LEG-b.y1,"feet:"+k+(flip?"<":">"),ox,oy);
      // (the harness: on the wall at the belt's front in the climbing frames; standing, just ahead of the hips)
      this.tieW=k==="climb"?{x:this.at[0]-ox+TIE[0],y:this.at[1]-oy+TIE[1]}:{x:x-ox+4*this.dir,y:y-oy+3+R0((this.sit||0)*26)};}
    else{this.tieW=null;
      const P0=POSES[this.pose]||POSES.stand,blink=!P0.eff&&!P0.oh&&((t+this.ph*1.7)%3.9)<.13,flap=Math.floor(t*4+this.ph)%2,gear=this.gear|0;
      const key=`${this.pose}|${gear}|${blink?1:0}|${flap}|${this.dir}`;let img=this.cache.get(key);
      if(!img){const s=pixelSprite(this.L,this.pose,{gear,blink,flap});
        if(this.dir<0){const [c,cg]=mk(s.width,s.height);cg.translate(s.width,0);cg.scale(-1,1);cg.drawImage(s,0,0);img=c;}else img=s;
        this.cache.set(key,img);}
      g.drawImage(img,x-(this.dir<0?SPR.W-SPR.hx:SPR.hx),y-SPR.hy);}
    if(this.dizzy>0)for(let i=0;i<3;i++){const a=Math.floor(t*8)/8*6+i*2.09;rect(g,x+R0(Math.cos(a)*8)-1,y-50+R0(Math.sin(a)*2)-1,2,2,i%2?C.cream:C.gold);}
  }
}
/* ---------- rope: from the partner's harness through the clipped quickdraws to the leader's harness ----------
   Each span between two points hangs as a curve with real slack, and the low point of that curve is a little weight
   on a spring: when an end moves the slack lags behind, swings and settles, and a light breeze keeps it from ever
   hanging dead still. Standing together on the meadow or a ledge, the rope droops to the ground and lies along it.
   It is drawn as a braided cord: a dark keyline all round, an orange sheath lit from above, and a pale fleck woven
   in every few pixels. When it snaps taut (a rope jerk, or a fall caught on it) the slack goes, it flashes pale for
   an instant and twangs side to side, fading out over about half a second. */
const ROPE={l:"#ffc27a",m:"#e8792b",s:"#b3521a",d:"#2a1408",f:"#fff1cf"};
class Rope{
  constructor(){this.path=null;this.c=[];this.ground=null;}
  update(path,dt=0,o={}){this.path=path;this.ground=o.ground??null;const n=Math.max(0,path.length-1);
    if(this.c.length!==n)this.c=[];
    const jk=FX.time-(FX.ropeJerk??-9),taut=jk<.6;
    for(let i=0;i<n;i++){const [x0,y0]=path[i],[x1,y1]=path[i+1],L=Math.hypot(x1-x0,y1-y0);
      // how much slack a span carries: plenty in the loop at the belayer, a little up to the leader, almost none
      // between two quickdraws; on the ground enough to lie along it
      let sag=this.ground!=null?L*.5+14:i===0?Math.min(o.first??13,4+L*.16)+(o.loose?L*.12:0):i===n-1?Math.min(7,2+L*.1):1.5;if(taut)sag=0;
      const wind=RM.matches||taut?0:Math.sin(FX.time*1.15+i*1.9)*Math.min(1.6,sag*.22);
      const tx=(x0+x1)/2+wind,ty=(y0+y1)/2+sag;let c=this.c[i];
      if(!c||Math.hypot(c.x-tx,c.y-ty)>70||!dt){this.c[i]={x:tx,y:ty,vx:0,vy:0};continue;}
      // (a lightly damped spring, stepped stably whatever the frame time)
      const k=taut?520:95,d=taut?30:5.2,h=Math.min(dt,.033);
      c.vx+=(k*(tx-c.x)-d*c.vx)*h;c.vy+=(k*(ty-c.y)-d*c.vy)*h;c.x+=c.vx*h;c.y+=c.vy*h;}}
  // every pixel the rope passes through, in order, as [x,y]
  points(ox,oy){const p=this.path,out=[];if(!p||p.length<2)return out;
    const jk=FX.time-(FX.ropeJerk??-9),tw=jk<.6?3.4*(1-jk/.6)**2*Math.cos(jk*48):0,gy=this.ground;let lx=null,ly=null;
    for(let i=1;i<p.length;i++){const [x0,y0]=p[i-1],[x1,y1]=p[i],c=this.c[i-1]||{x:(x0+x1)/2,y:(y0+y1)/2};
      // (the curve's own control point is set so that its middle passes through the swinging low point)
      const mx=2*c.x-(x0+x1)/2,my=2*c.y-(y0+y1)/2,L=Math.hypot(x1-x0,y1-y0)||1,nx=-(y1-y0)/L,ny=(x1-x0)/L,n=Math.max(2,Math.ceil(L*1.6+Math.abs(c.y-(y0+y1)/2)*2));
      for(let k=0;k<=n;k++){const t=k/n,w=tw*Math.sin(Math.PI*t);
        let x=(1-t)*(1-t)*x0+2*(1-t)*t*mx+t*t*x1+nx*w,y=(1-t)*(1-t)*y0+2*(1-t)*t*my+t*t*y1+ny*w;
        if(gy!=null&&y>gy-2)y=gy-2+(hash(R0(x)>>2,91)<.3?-1:0); // (lying on the grass, over a tuft here and there)
        x=R0(x)+ox;y=R0(y)+oy;if(x===lx&&y===ly)continue;lx=x;ly=y;out.push([x,y]);}}
    return out;}
  draw(g,ox,oy){const P=this.points(ox,oy);if(!P.length)return;const flash=FX.time-(FX.ropeJerk??-9)<.09;
    // the keyline first (a pixel all round the cord), then the cord over it
    g.fillStyle=ROPE.d;for(const [x,y] of P){g.fillRect(x-1,y,4,2);g.fillRect(x,y-1,2,4);}
    P.forEach(([x,y],s)=>{g.fillStyle=flash?ROPE.f:ROPE.m;g.fillRect(x,y,2,2);if(flash)return;
      const q=s%6;dot(g,x,y,q===3?ROPE.f:ROPE.l);dot(g,x+1,y+1,q===0?ROPE.d:ROPE.s);});
    // a knot at each harness
    const p=this.path;for(const [x,y] of [p[0],p[p.length-1]]){rect(g,R0(x)+ox-1,R0(y)+oy-1,4,4,ROPE.d);rect(g,R0(x)+ox,R0(y)+oy,2,2,ROPE.l);dot(g,R0(x)+ox+1,R0(y)+oy+1,ROPE.s);}}
}
/* ---------- particles and pop-up words ---------- */
function emit(p){if(FX.parts.length<300&&!RM.matches)FX.parts.push(p);}
function puff(x,y){for(let i=0;i<4;i++)emit({k:"chalk",x:x+(Math.random()-.5)*3,y:y+(Math.random()-.5)*2,vx:(Math.random()-.5)*8,vy:-2-Math.random()*4,g:-1,l:.7,m:.7});}
function pebbles(r){for(let i=0;i<6;i++)emit({k:"peb",x:r.N.x+(Math.random()-.5)*10,y:r.N.y-10,vx:(Math.random()-.5)*16,vy:-10-Math.random()*16,g:350,l:1.8,m:1.8});}
function pop(r,text){if(RM.matches)return;FX.pops.push({x:r.N.x,y:r.N.y-58,text,t:0});sfx("pop");}
// a pop-up word: the signs' 5-pixel font at twice its size, gold with a dark keyline (a lone "z" stays small)
function wordSprite(text){const key="w|"+text;let s=FX.text.get(key);if(s)return s;
  const k=text.length>1?2:1,w=PF.width(text),[a,ag]=mk(w+2,7);
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]])PF.draw(ag,text,1+dx,1+dy,INK);PF.draw(ag,text,1,1,C.gold);
  const [c,g]=mk((w+2)*k,7*k);g.drawImage(a,0,0,(w+2)*k,7*k);if(k>1){g.globalCompositeOperation="source-atop";g.fillStyle="rgba(255,255,255,.35)";g.fillRect(0,0,c.width,5);}
  FX.text.set(key,c);return c;}
function stepParts(dt){FX.parts=FX.parts.filter(p=>{p.l-=dt;p.vy+=p.g*dt;if(p.k==="conf"){p.vy=Math.min(p.vy,62);p.x+=Math.sin(FX.time*3+p.ph)*10*dt;}p.x+=p.vx*dt;p.y+=p.vy*dt;return p.l>0;});
  FX.pops=FX.pops.filter(p=>(p.t+=dt)<1.1);}
function drawParts(g,ox,oy,t){for(const p of FX.parts){const a=p.l/p.m,x=R0(p.x)+ox,y=R0(p.y)+oy;
  if(p.k==="chalk")rect(g,x,y,a>.5?2:1,a>.5?2:1,"#f4f1e8");
  // (confetti flutters: each scrap turns edge-on and back as it falls)
  else if(p.k==="conf"){const f=Math.floor(t*9+p.ph)%4;rect(g,x,y,f===1?1:2,f===3?1:2,p.c);}
  else rect(g,x,y,2,2,"#6e6a62");}
  for(const p of FX.pops){const k=p.t/1.1,s=wordSprite(p.text);if(k>.85&&Math.floor(t*16)%2)continue;
    g.drawImage(s,Math.max(4,Math.min(R0(p.x)+ox-(s.width>>1),FX.vw-s.width-4)),R0(p.y-k*14)+oy-(k<.12?R0((.12-k)*30):0));}}

/* ---------- camps, base camp and the summit ---------- */
// a wooden signpost: a small hand-cut board (notched corners, a lit top edge, grain, a nail at each end) lettered
// in the title screen's 5-pixel font, on a square post that pokes up behind it. `post` is how far the board's right
// end is from the post, `h` the post's height from the ground to the top of the board; snow caps both when asked.
// Returns the picture and where the post's foot is in it.
function signpost(text,h,o={}){const key=text+"|"+h+"|"+(o.snow?1:0)+"|"+(o.post??"");let S=(FX.signs||(FX.signs=new Map())).get(key);if(S)return S;
  const tw=PF.width(text),bw=tw+9,bh=11,top=3,post=o.post==null?bw>>1:bw-o.post,[c,g]=mk(bw+2,top+h+1);
  // the post: three pixels of wood between dark edges, lit on the left
  rect(g,post-2,1,5,top+h,INK);rect(g,post-1,2,1,top+h-1,C.woodL);rect(g,post,2,1,top+h-1,C.wood);rect(g,post+1,2,1,top+h-1,C.woodD);
  // the board
  const B=(x,y)=>x>=0&&y>=0&&x<bw&&y<bh&&!((x===0||x===bw-1)&&(y===0||y===bh-1));
  for(let y=0;y<bh;y++)for(let x=0;x<bw;x++){if(!B(x,y))continue;
    const edge=!B(x-1,y)||!B(x+1,y)||!B(x,y-1)||!B(x,y+1);
    let col=edge?INK:y===1?C.woodL:y===bh-2?C.woodD:C.wood;
    if(!edge&&(y===2||y===bh-3)&&hash(x*7+y,text.length)<.3)col=y===2?C.woodL:C.woodD; // grain
    dot(g,1+x,top+y,col);}
  for(const nx of [2,bw-3])dot(g,1+nx,top+5,C.metalD);
  PF.draw(g,text,1+((bw-tw)>>1)+(tw%2?0:0),top+3,C.cream,"#3a2412");
  if(o.snow){for(let x=1;x<bw-1;x++){const d=hash(x,31)<.35?1:0;dot(g,1+x,top-1+d,C.snow);if(!d)dot(g,1+x,top,C.snowS);}
    rect(g,post-1,0,3,2,C.snow);dot(g,post+1,1,C.snowS);}
  S={c,fx:post,w:c.width,h:c.height};if(FX.signs.size>40)FX.signs.clear();FX.signs.set(key,S);return S;}
// (stood with the post's foot at x, on the ground at y)
function drawSign(g,S,x,y){g.drawImage(S.c,x-S.fx,y-S.h+1);}
// a pennant on the breeze: w by h pixels, four frames of a wave running along it, lit where it lifts
function pennant(w,h,col,key){const K="pen"+key;if(FX[K])return FX[K];const hi=tone(col,.3),lo=tone(col,-.3);
  return FX[K]=[0,1,2,3].map(f=>{const [c,g]=mk(w,h+4);
    for(let x=0;x<w;x++){const k=x/(w-1),ph=x/2.6-f*1.57,dy=Math.round(Math.sin(ph)*1.3*k),half=Math.max(1,Math.round((h/2)*(1-k*.8)));
      for(let y=-half;y<half;y++){const yy=2+(h>>1)+y+dy,edge=y===-half||y===half-1||x===w-1;
        dot(g,x,yy,edge?INK:Math.cos(ph)>.35?hi:Math.cos(ph)<-.5?lo:col);}}
    return c;});}
// a tent standing on the ground at y: the generated one once it has loaded, the painted one until then
function drawTent(g,x,y){if(ART.tent)g.drawImage(ART.tent,x,y-boxOf(ART.tent).y1-1);else g.drawImage(sprites().tent,x,y-12);}
// a camp shelf jutting from the cliff: the generated ledge (grassy for Camp I, snowy for Camp II) with its walkable
// top at the camp's height and its right end over the rock, or until it loads a painted slab; a sign and, once pitched, a tent
// the ledge as drawn: the image up to where its cliff slab starts, its back end at x=30 over the wall
const ledgeW=()=>ART.ledge?ART.ledgeW||ART.ledge.width:0,ledgeL=()=>30-ledgeW();
function campLayer(k,cy){if(FX.camps[k])return FX.camps[k];
  // (the buttress under the ledge, painted with the cliff, fills in between the ledge's back end and the wall)
  const x1=30,x0=Math.min(-176,ledgeL()-8),y0=cy-110,y1=cy+100,[c,g]=mk(x1-x0,y1-y0),X=x=>x-x0,Y=y=>y-y0,snow=k==="c2";
  if(ART.ledge){const L=snow?ART.ledgeSnow:ART.ledge,W=ledgeW();g.drawImage(L,0,0,W,L.height,X(ledgeL()),Y(cy-ART.ledgeGround),W,L.height);}
  else for(let x=-170;x<x1;x++){const end=x<-160?(x+170)/10:1,th=R0((9+hash(x>>2,5)*4)*end);
    for(let y=0;y<=th;y++){let col=rockAt(x,cy+y+400);if(y===th)col=C.crack;else if(y>=th-1)col=C.rockD;
      if(y<=1)col=snow?(y?C.snowS:C.snow):(y?C.moss:C.mossL);if(y===2&&!snow&&hash(x,9)<.4)col=C.mossD;dot(g,X(x),Y(cy+y),col);}
    if(!snow&&hash(x,4)<.35)dot(g,X(x),Y(cy-1),hash(x,6)<.5?C.grassL:C.mossH);}
  // the ledge waits empty but for its sign: the team pitches its own camp when it gets here
  // (the sign stands at the ledge's far end, before where the tent will go)
  const sx=ART.ledge&&ART.ledgeWalk?ledgeL()+ART.ledgeWalk[0]+6:-122;
  drawSign(g,signpost(k==="c1"?"CAMP I":"CAMP II",46,{snow}),X(sx),Y(cy));
  return FX.camps[k]={c,x0,y0};}
// where things go on a camp ledge, from the ledge's walkable span: the tent at the outer end, where each climber
// kneels to work (one at each of its corners) and the tent's door
function campSpots(){const L=ART.ledge,T=ART.tent;
  const walk0=L&&ART.ledgeWalk?ledgeL()+ART.ledgeWalk[0]:-140,tb=T?boxOf(T):{x0:0,x1:70,y1:50},tw=tb.x1-tb.x0;
  // (the tent faces out of the screen, so its door is in the middle; one climber pegs out each corner)
  const tentL=walk0+22,tentR=tentL+tw;
  return {tentX:tentL-tb.x0,tentR,meWork:tentL+18,mateWork:tentR-18,door:tentL+(tw>>1)};}
// the tent at stage n of going up: 0 nothing, 1 the canvas and poles in a heap, and so on up to TENT_UP, pitched
function drawTentRise(g,x,y,n){if(n<=0)return;const T=ART.tent;
  if(n>=TENT_UP||!T||!ART.tentUp){if(n>=TENT_UP)drawTent(g,x,y);return;}
  g.drawImage(ART.tentUp[n-1],x,y-(boxOf(T).y1+1));}
// dust poofs: the generated cloud bursting and fading over about half a second, its foot at (x,y); until it loads,
// three cream puffs shrinking away
function poof(x,y,big){FX.poofs.push({x,y,t0:FX.time,big});sfx("pop");}
function drawPoofs(g,ox,oy){FX.poofs=FX.poofs.filter(p=>FX.time-p.t0<.5);
  for(const p of FX.poofs){const k=(FX.time-p.t0)/.5,P=ART.poof,ok=P&&P.every(im=>im.complete&&im.naturalWidth);
    if(ok){const im=P[Math.min(P.length-1,Math.floor(k*P.length))],b=boxOf(P[0]);g.drawImage(im,R0(p.x-((b.x0+b.x1)>>1))+ox,R0(p.y-b.y1-1)+oy);}
    else for(const [dx,r] of [[-7,5],[0,7],[7,5]])pdisc(g,R0(p.x+dx*(1+k))+ox,R0(p.y-6-k*6)+oy,Math.max(1,R0(r*(1-k))),C.cloud);}}
function drawCamp(g,k,cy,t,ox,oy){const L=campLayer(k,cy);g.drawImage(L.c,L.x0+ox,L.y0+oy);
  const C2=FX.camp;if(!C2||C2.k!==k)return;const S=campSpots();
  drawTentRise(g,S.tentX+ox,cy+oy,C2.tent);
  // once the tent is up, in front of it: the cooking pot, a lantern at the door and the rope, coiled
  if(C2.tent>=TENT_UP){prop(g,"pot",S.tentR+4+ox,cy+1+oy);prop(g,"lantern",S.door-18+ox,cy+1+oy);prop(g,"coil",S.tentR-18+ox,cy+1+oy);}
}
// a camp prop standing on the ground at y, its left edge at x
function prop(g,n,x,y){const im=ART.props&&ART.props[n];if(im)g.drawImage(im,R0(x),R0(y)-im.height);}
// the base-camp meadow and the near pines, painted once per view width
const BASE_SIGN_X=-139,BASE_TENT_X=-264;
// a tree standing on the ground at y, its trunk at x (mirrored when asked)
function tree(g,i,x,y,flip){const T=ART.trees&&ART.trees[i];if(!T)return;const dx=R0(x)-(T.width>>1),dy=R0(y)-T.height;
  if(flip){g.save();g.translate(dx+T.width,dy);g.scale(-1,1);g.drawImage(T,0,0);g.restore();}else g.drawImage(T,dx,dy);}
function baseLayer(){const ox=FX.ox,w=FX.vw;if(FX.base&&FX.base.ox===ox&&FX.base.w===w)return FX.base;
  const x0=-ox-8,x1=w-ox+8,y0=-215,y1=120,[c,g]=mk(x1-x0,y1-y0),X=x=>x-x0,Y=y=>y-y0;
  // distant pines first, then the meadow, then the big pines in front of the cliff foot
  // (once the generated pine is in, the generated treeline behind stands in for these painted ones)
  if(!ART.trees[0])for(let x=x0;x<-30;x+=9+(hash(x,1)*8|0)){const h=22+(hash(x,2)*26|0),s=pineSprite(h,x*7,{l:C.pineL,m:C.pine,d:C.pineD,h:C.pineH});g.drawImage(s,X(x)-(s.width>>1),Y(2-h));}
  // the generated meadow strip, its grass rising a few pixels above the ground line, soil below it
  if(ART.ground){const G=ART.ground,gy=-6-ART.groundTop;
    rect(g,0,Y(gy+ART.soilAt),x1-x0,y1-gy-ART.soilAt,ART.soil);
    for(let x=x0-((x0%G.width)+G.width)%G.width;x<x1;x+=G.width){g.drawImage(G,X(x),Y(gy));
    }
    // (below the strip the earth just darkens, in a few dithered steps, down into the dark)
    for(let k=0;k<5;k++){const yy=Y(gy+ART.soilAt+6+k*9);g.fillStyle=`rgba(6,5,9,${(.22+k*.17).toFixed(2)})`;g.fillRect(0,yy,x1-x0,y1);
      for(let x=(k&1)*2;x<x1-x0;x+=4)g.fillRect(x,yy-2,2,2);}}
  else for(let x=x0;x<x1;x++){const top=hash(x>>1,3)<.3?-1:0;
    for(let y=top;y<y1;y++){let col=y<=0?C.grassL:y<4?C.grass:y<7?(hash(x,y)<.5?C.grass:C.dirt):y<40?(hash(x,y)<.08?C.dirtD:C.dirt):C.dirtD;
      if(y>=1&&y<4&&hash(x*3,y)<.12)col=C.mossH;dot(g,X(x),Y(y),col);}
    if(hash(x,8)<.18)dot(g,X(x),Y(-2),C.grassL);}
  // the tent and the camp's signpost at its corner
  // (two tall trees stand behind the camp: the spruce out past the stores, the pine rising over the tent)
  tree(g,0,X(-360),Y(3),true);tree(g,1,X(-208),Y(3));
  drawTent(g,X(BASE_TENT_X),Y(0));
  drawSign(g,signpost("BASE CAMP",57,{post:7}),X(BASE_SIGN_X),Y(0));
  // (a supply crate by the tent's far corner, a lantern standing on it, the cooking pot beside it)
  prop(g,"crate",X(-290),Y(1));if(ART.props.crate)prop(g,"lantern",X(-287),Y(1-ART.props.crate.height+1));prop(g,"pot",X(-314),Y(1));
  return FX.base={c,x0,y0,ox,w};}
// (no tree stands at the foot of the cliff any more: the first pitch read as climbing it, and anywhere nearer the
// camp it covered the signpost; the two tall trees behind the tent carry the forest)
function drawFrontPines(g,ox,oy){}
// a tall flag on the tip (a red pennant on a pole, in a little cairn), and a signpost down the left ridge
function drawSummit(g,t,ox,oy){const fx=SX-18,fy=R0(peakTop(fx))+1,F=pennant(15,9,C.red,"summit");
  rect(g,fx+ox-1,fy-36+oy,3,37,INK);rect(g,fx+ox,fy-35+oy,1,35,C.metal);dot(g,fx+ox,fy-37+oy,INK);
  g.drawImage(F[RM.matches?0:Math.floor(t*6)%4],fx+2+ox,fy-37+oy);
  for(const [dx,dy,w,col] of [[-4,-2,4,C.metalD],[1,-3,5,C.metal],[-2,-5,4,"#9aa2b0"],[-5,0,11,INK]])rect(g,fx+dx+ox,fy+dy+oy,w,dy===0?1:2,col);
  // the sign's post stands on the ridge just in from the cliff edge (which leans right near the top), and its board
  // reaches out left over the drop so it never hides the flag
  const sx=Math.max(SX-62,edgeL(TOPY)+6),sy=R0(peakTop(sx));drawSign(g,signpost("SUMMIT",18,{snow:true,post:6}),sx+ox,sy+oy);}
// the route's hardware: a steel hanger bolted to the rock every few holds all the way up, and on the ones between
// the two climbers a quickdraw (a carabiner on the bolt, a short red sling, and the carabiner the rope runs through)
const QD=[0,9]; // where the rope runs, from the bolt
// a clipped hook: on the bolt-in-from-the-hold of its index, the rope running through its carabiner
const hookXY=(ch,i)=>{const b=boltXY(ch,i);return [b[0]+QD[0],b[1]+QD[1]];};
// the hooks the team has clipped into the wall (FX.hooks: the hold each one is at), where the rope is attached
function drawHook(g,ox,oy){if(!FX.exp||!FX.hooks)return;for(const i of FX.hooks)drawHook1(g,ox,oy,i);}
function drawHook1(g,ox,oy,i){const [bx,by]=boltXY(FX.exp.choice,i),x=bx+ox,y=by+oy;
  // (it pops in with a little drop when clipped)
  const k=i===FX.hookNew?clamp((FX.time-(FX.hookAt||0))/.25,0,1):1,d=-R0(5*(1-k)*(1-k));
  rect(g,x-2,y-2,5,5,INK);rect(g,x-1,y-1,3,3,C.metal);dot(g,x,y,INK);
  rect(g,x-1,y+2+d,3,5,INK);rect(g,x,y+2+d,1,5,C.red);
  rect(g,x-3,y+6+d,7,8,INK);rect(g,x-2,y+7+d,5,6,C.gold);rect(g,x-1,y+8+d,3,4,INK);dot(g,x-2,y+7+d,"#fff1cf");dot(g,x+2,y+12+d,"#b5741c");}
// a hold at each move of the route: a little lip of rock catching the light, dark underneath, snow-capped high on the
// mountain, with a dab of chalk once a hand has been on it
function holds(g,ox,oy,vy0,vy1){if(!FX.exp||FX.mode!=="game"||!FX.A)return;const ch=FX.exp.choice,used=Math.max(FX.A.me.hi,FX.A.mate.hi);
  for(let i=Math.max(1,Math.floor(-vy1/HS)-1);i<=Math.min(IDX_TOP-1,Math.ceil(-vy0/HS)+1);i++){if(i===IDX_C1||i===IDX_C2||i===IDX_C1-1||i===IDX_C2-1)continue;
    const [hx,hy]=holdXY(ch,i),x=hx+ox,y=hy+oy,snowy=uOf(hy)>ZONE_HIGH,w=4+(hash(i,41)*3|0);
    rect(g,x-1,y+2,w+2,2,"#241a14");rect(g,x,y,w,2,snowy?C.snowS:"#b39c7c");rect(g,x,y,w-1,1,snowy?C.snow:"#e0cfae");
    if(i<=used){dot(g,x+1,y,"#ffffff");dot(g,x+2,y+1,"#f4f1e8");}}}
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
  // (where each stands on the meadow, a ledge or the top depends on their role: the leader by the wall, the belayer back)
  const me=new Rig(LOOK.me,i=>holdXY(FX.exp.choice,i),null),mate=new Rig(LOOK.mate,i=>holdXY(FX.exp.choice,i),null);
  for(const r of [me,mate])r.rest=i=>restSpot(i,FX.A&&FX.A.me===r?0:1);
  FX.A={me,mate};FX.rigs=[me,mate];FX.fxEl=$("#fx");
  if(!FX.raf)FX.raf=requestAnimationFrame(frame);
  if(!FX.pre){FX.pre=1;prefetch();}
  return true;
}
function stepAmbient(dt){
  FX.nextBird-=dt;if(FX.nextBird<0&&!RM.matches){FX.nextBird=14+Math.random()*16;FX.birds.push({x:-12,y:.12+Math.random()*.3,v:11+Math.random()*6,n:1+(Math.random()*3|0),t:0});}
  FX.birds=FX.birds.filter(b=>{b.x+=b.v*dt;b.t+=dt;return b.x<FX.vw+30;});
  const c=FX.cam;if(!c)return;
  const cp=FX.camp;
  // while the team sleeps, a "z" drifts up from the tent now and then
  if(cp&&cp.sleep&&!RM.matches&&(FX.nextZ=(FX.nextZ||0)-dt)<0){FX.nextZ=1.4;const S=campSpots();FX.pops.push({x:S.door+8,y:cp.cy-6,text:"z",t:0});}
}
// the part of the window the cards and bar leave open, in CSS px: the camera frames the climb inside it
// (below the HUD when it shows, so the portraits and the altitude box never sit over the leader)
function sceneArea(){const W=FX.W,H=FX.H,wide=W>=900,hud=$("#hud"),hb=hud&&!hud.hidden?hud.getBoundingClientRect().bottom+8:0,
    top=Math.max(64,hb),m=$("#main");let a={x:0,y:top,w:W,h:H-top};
  // (beside the lobby's column on wide screens; above the bottom question panel in a climb and on phones)
  const r=m&&m.getBoundingClientRect(),dock=m&&m.classList.contains("game2");
  // (a phone on its side has the panel as a column down the left edge instead: the climb is framed beside it)
  if(r&&r.width>0&&r.height>0){if((wide&&!dock)||r.width<W*.7){a.x=Math.min(W-240,r.right+8);a.w=W-a.x;}else a.h=Math.max(150,r.top-top);}
  return a;}
// a critically damped spring: eases into a move and settles without overshoot (implicit, so stable at any dt)
function damp(x,v,to,w,dt){const f=1+2*dt*w,hw=dt*w*w,d=1/(f+dt*hw);return [(f*x+dt*v+dt*hw*to)*d,(v+hw*(to-x))*d];}
function updateCam(dt){const me=FX.A.me,mt=FX.A.mate,now=performance.now();
  if(now-FX.areaAt>250||!FX.area){FX.area=sceneArea();FX.areaAt=now;}
  const A=FX.area,px=FX.px,ax=A.x/px,ay=A.y/px,aw=A.w/px,ah=A.h/px;
  // the cliff's edge sits a little left of the open area's middle so the valley shows beside it
  // (at a camp the view eases over to centre the wide ledge, from its far end to the wall, in the open part of the
  // screen, so the tent is never under the cards)
  // (likewise at base camp, from the tent out to the wall, while both stand there)
  const atBase=!FX.camp&&me.mode==="stand"&&mt.mode==="stand"&&me.hi<=0&&mt.hi<=0;
  // (out on the pillar under a camp the view follows this player's climber across, so they stay where they'd be on
  // the plain wall, and slides back as they come in onto the ledge)
  const own0=FX.own||me,yb=own0.mode==="stand"?own0.N.y+LEG+20:own0.N.y+20,bo=FX.mode==="game"?rockEdge(yb)-edgeL(yb):0;
  const oxT=FX.camp?ax+aw/2-(ledgeL()+30)/2:atBase?ax+aw/2+104:ax+aw*(FX.W>=900?.42:.38)-bo*(own0.mode==="stand"?.55:.9);
  // (a new camera, such as the first frames on load, snaps; after that the view always pans, however far)
  if(FX.oxF==null||!FX.cam){FX.oxF=oxT;FX.oxV=0;}else[FX.oxF,FX.oxV]=damp(FX.oxF,FX.oxV||0,oxT,2.8,dt);FX.ox=R0(FX.oxF);
  const own=FX.own||me,oth=own===me?mt:me;
  let fy=FX.focus==="summit"?TOPY-30:lerp(own.N.y,oth.N.y,.3);
  // (a short open area can't hold both: this player's own climber stays in view, head to boots)
  if(FX.focus!=="summit")fy=clamp(fy,own.N.y+44-ah/2,own.N.y-40+ah/2);
  // camera y is the world y at the open area's vertical middle; keep the summit sky and the meadow in frame
  let y=clamp(fy,TOPY-120+(ah/2),60-(ah/2));
  if(FX.fxEl){const s=FX.fxEl.style,v=[A.x,A.y,A.w,A.h].map(n=>Math.round(n)+"px");if(s.width!==v[2]||s.height!==v[3]||s.top!==v[1]||s.left!==v[0]){s.left=v[0];s.top=v[1];s.width=v[2];s.height=v[3];}}
  // (a dead zone: within it the view holds still and the climber is seen moving up the screen; beyond it, it follows)
  if(FX.cam&&FX.focus!=="summit"){const dz=ah*.14,d=y-FX.cam.y;y=Math.abs(d)<=dz?FX.cam.y:y-Math.sign(d)*dz;}
  // (the screen point it centres on eases too, so a question panel growing or shrinking never jolts the view)
  if(!FX.cam||Math.abs(y-FX.cam.y)>900)FX.cam={y,v:0,my:ay+ah/2,mv:0};
  else{const c=FX.cam;[c.y,c.v]=damp(c.y,c.v,y,4,dt);[c.my,c.mv]=damp(c.my,c.mv,ay+ah/2,6,dt);}
  // (whatever the easing and the dead zone do, this player's climber stays inside the open area, hat to boots: the
  // view is carried along with them at its edges, so they never slip under the bar or the question panel)
  if(FX.focus!=="summit"&&ah>=110){const c=FX.cam,hi=own.N.y-56+(c.my-ay),lo=own.N.y+46-(ay+ah-c.my);if(lo<=hi){const k=clamp(c.y,lo,hi);if(k!==c.y){c.y=k;c.v=0;}}}
  // (an open area too short for a whole climber, such as a desktop window under a tall result panel: they are kept
  // centred in what there is)
  else if(FX.focus!=="summit"&&!FX.camp){const c=FX.cam,mid=own.N.y-4+(c.my-(ay+ah/2)),k=clamp(c.y,mid-8,mid+8);if(k!==c.y){c.y=k;c.v=0;}}
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
    const ch=FX.exp.choice,pm=A.mate.tie(),pl=A.me.tie(),path=[[pm.x,pm.y]],clips=[];
    // the rope runs through the clipped bolts between the two only while the leader is on the wall (once the leader
    // has topped out onto a ledge they belay from there), and only bolts that lie between them on the way up
    // (it hangs free between the two, and runs through the hooks clipped into the wall between them, and through one
    // just above a leader who has dropped onto it)
    let hk=null;
    for(const i of FX.hooks||[]){const h=hookXY(ch,i);if(h[1]<pm.y-6&&(h[1]>pl.y+6||(A.me.mode==="fall"&&h[1]>pl.y-90))){path.push(h);clips.push(i);hk=h;}}
    // (off a leader on the wall the rope first drops straight down from the harness, between them and the rock,
    // so it never cuts across behind their pack on its way to the belayer)
    if(A.me.mode==="climb"&&pm.y>pl.y+30&&!(hk&&hk[1]>pl.y))path.push([pl.x+1,pl.y+20]);
    // (from a leader up on a ledge it comes over the ledge's lip, not down through the rock)
    if(A.me.mode==="stand"&&A.me.hi>0&&A.me.hi<IDX_TOP&&(A.mate.mode==="climb"||A.mate.mode==="fall")&&pm.y>pl.y+30){path.push([LEDGE_TIP+3,-A.me.hi*HS+1]);}
    path.push([pl.x,pl.y]);if(FX.camp)path.length=0; // (coiled away while camp is up)
    // (with both on their feet the rope lies on the ground between them; a belayer on the wall keeps a short loop)
    const up=r=>r.mode==="climb"||r.mode==="fall";
    FX.pins=path;FX.clips=clips;FX.rope.update(path,dt,{ground:!up(A.me)&&!up(A.mate)?Math.max(A.me.gy,A.mate.gy):null,first:A.mate.mode==="climb"?6:20,
      loose:A.me.mode==="fall"&&!(A.me.fall&&A.me.fall.caught)});}
  stepParts(dt);stepAmbient(dt);updateCam(dt);
  if(typeof windAt==="function")windAt(FX.mode==="game"&&FX.cam?uOf(FX.cam.y):0,!!FX.camp);
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
  const oyF=c.my-c.y,ox=FX.ox+shk(),oy=R0(oyF)+shk(),vy0=-oy,vy1=h-oy,u=uOf(c.y);
  // the valley sinks as the team climbs: each layer by its own share of the camera's height
  const climb=-c.y,art=ART.valley;
  if(art)drawValley(g,w,h,climb);else drawSky(g,w,h,u);
  // drifting clouds stay in the open sky (over the backdrop, only above its peaks)
  const cloudMax=h*.7;
  for(let k=0;k<6;k++){const cx=R0(((hash(k,1)*w*1.6+t*(1.2+hash(k,3)*1.5))%(w*1.6))-w*.3),cy=R0(h*(.08+hash(k,4)*.3)+climb*.03);
    if(cy<cloudMax)drawCloud(g,cx,cy,.8+hash(k,2)*.6,k);}
  for(const b of FX.birds)for(let i=0;i<b.n;i++)g.drawImage(sprites().bird[Math.floor(b.t*7+i*1.3)%4],R0(b.x-i*13),R0(b.y*h+(i%2?5:-2)*i+Math.sin(b.t*1.4+i)*2));
  if(!art)for(const L of FX.layers){const y=R0(climb*L.par);if(y<h)g.drawImage(L.c,0,y);}
  if(vy1>-215){const B=baseLayer();g.drawImage(B.c,B.x0+ox,B.y0+oy);}
  const [c1,c2]=chunkRange(vy0,vy1);for(let ci=c1;ci<=c2;ci++)g.drawImage(chunk(ci),-CHK_X0+ox,-(ci+1)*CHK+oy);
  if(vy1>-215)drawFrontPines(g,ox,oy);
  for(const [kk,ix] of [["c1",IDX_C1],["c2",IDX_C2]]){const y=-ix*HS;if(y>vy0-70&&y<vy1+30)drawCamp(g,kk,y,t,ox,oy);}
  if(vy0<TOPY+60)drawSummit(g,t,ox,oy);
  // the next pitch's goal: a little gold pennant pinned to the rock at the route, with the pitch's number beside it
  // (outlined, so it reads against the busy granite)
  if(FX.label){const i=FX.label.i,[hx,hy]=holdXY(FX.exp.choice,i),x=hx+6+ox,y=hy+oy,txt=FX.label.text,F=pennant(9,7,C.gold,"goal");
    rect(g,x-1,y-12,3,13,INK);rect(g,x,y-11,1,11,C.metal);g.drawImage(F[RM.matches?0:Math.floor(t*6)%4],x+2,y-13);
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]])PF.draw(g,txt,x+13+dx,y-9+dy,INK);PF.draw(g,txt,x+13,y-9,C.cream);}
  // (the climbers keep the camera's fraction of a pixel, so the one it follows holds still on screen rather than
  // flickering a pixel up and down as their rounding and the camera's take turns)
  FX.sub=oyF-R0(oyF);
  holds(g,ox,oy,vy0,vy1);drawHook(g,ox,oy);FX.rope.draw(g,ox,oy);
  FX.A.mate.draw(g,t,ox,oy);FX.A.me.draw(g,t,ox,oy);
  drawPoofs(g,ox,oy);
  if(FX.night>0)drawNight(g,w,h,t,ox,oy);
  drawParts(g,ox,oy,t); // (after the night, so the sleepers' z's stay bright)
}
// night at camp: the whole scene sinks into deep blue, stars come out over the valley, and the tent and its
// lantern glow through it
function drawNight(g,w,h,t,ox,oy){const n=FX.night,cp=FX.camp;
  g.fillStyle=`rgba(6,10,32,${(.66*n).toFixed(3)})`;g.fillRect(0,0,w,h);
  const edge=ox-20;for(let i=0;i<70;i++){const sx=R0(hash(i,21)*w),sy=R0(hash(i,22)*h*.55);if(sx>edge)continue;
    if(hash(i,23)*1.3>n)continue;const tw=Math.sin(t*2+i*1.7)>.7;dot(g,sx,sy,tw?"#ffffff":"#c9d6f2");}
  if(!cp)return;const S=campSpots(),cy=cp.cy;
  // (the tent glows through the dark only once both are inside it; while they still stand at its door, redrawing
  // it would show it through them)
  if(cp.tent>0&&cp.sleep){g.globalAlpha=.55*n;drawTentRise(g,S.tentX+ox,cy+oy,cp.tent);g.globalAlpha=1;}
  // (the lantern at the tent door burns through the night)
  if(cp.tent>=TENT_UP&&ART.props&&ART.props.lantern){const lx=S.door-12+ox,ly=cy-9+oy;
    for(const [r,a] of [[13,.10],[8,.16],[4,.22]]){g.globalAlpha=a*n;pdisc(g,lx,ly,r,"#ffd27a");}g.globalAlpha=1;prop(g,"lantern",S.door-18+ox,cy+1+oy);}}

/* ---------- overlays: pixel title cards, captions and confetti ---------- */
function title(text,sub,tone){const fx=$("#fx");if(!fx)return;fx.querySelectorAll(".tcard").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="tcard "+(tone||"");
  el.innerHTML=`<b>${[...text].map((ch,i)=>`<span style="--i:${i}">${ch===" "?"&nbsp;":esc(ch)}</span>`).join("")}</b>${sub?`<small>${esc(sub)}</small>`:""}`;
  fx.appendChild(el);setTimeout(()=>el.remove(),2700);}
function caption(text){const fx=$("#fx");if(!fx)return;fx.querySelectorAll(".cap").forEach(x=>x.remove());
  const el=document.createElement("div");el.className="cap";el.textContent=text;fx.appendChild(el);setTimeout(()=>el.remove(),2900);}
// confetti: scraps of colour let go across the top of the view, drawn on the scene's own pixel grid
function confetti(n=28){const c=FX.cam;if(!c||RM.matches)return;const cols=[C.red,C.gold,"#2f8f8a",C.cream,"#9bd16a"],top=-R0(c.my-c.y);
  for(let i=0;i<n*2&&FX.parts.length<300;i++)FX.parts.push({k:"conf",x:Math.random()*FX.vw-FX.ox,y:top-6+Math.random()*FX.vh*.3,vx:(Math.random()-.5)*14,vy:14+Math.random()*30,g:60,
    l:3.5+Math.random()*2,m:6,c:cols[i%cols.length],ph:Math.random()*6});}

/* ---------- sequences ---------- */
const stepMsFor=n=>clamp(3600/Math.max(n,1),230,460);
function place(r,i){const rs=r.rest(i);if(rs){r.standAt(rs.x,rs.y);r.hi=i;}else r.grab(Math.max(i,2));}
function placeTeam(exp,li){FX.exp=exp;FX.camp=null;FX.night=0;FX.leaving=null;FX.A.me.hidden=FX.A.mate.hidden=false;
  for(const r of [FX.A.me,FX.A.mate])r.lastDraw=r.blend=null; // (a placement is a cut, not a move)
  place(FX.A.me,li);place(FX.A.mate,mateIdx(li));}
/* ---------- camp: pitched on arrival, slept in through the night, packed away in the morning ---------- */
const campOf=ix=>ix===IDX_C1?"c1":ix===IDX_C2?"c2":null;
// the team has both arrived on the ledge: they kneel at the tent's two corners (the one further in at the far
// corner, so neither walks through the other) and pitch it; dusk falls, and they walk to the door and turn in
async function makeCamp(ix,ch="main"){const k=campOf(ix);if(!k)return true;const A=FX.A,S=campSpots(),cy=-ix*HS;
  const [me,mate]=A.me.N.x<=A.mate.N.x?[A.me,A.mate]:[A.mate,A.me]; // (one at each corner of the tent)
  FX.camp={k,ix,cy,tent:0,sleep:false};FX.leaving=null;const cp=FX.camp;
  const walk=Math.max(me.walkTo(S.meWork),mate.walkTo(S.mateWork));if(!(await wait(walk+150,ch)))return false;
  me.work(1);mate.work(-1);
  // the canvas and poles are thrown down in a puff of dust, and the tent rises between the two of them
  if(!(await wait(350,ch)))return false;poof(S.door,cy,true);
  for(let n=1;n<=TENT_UP;n++){cp.tent=n;if(n===TENT_UP)sfx("thud");if(!(await wait(n===1?420:230,ch)))return false;}
  if(!(await wait(700,ch)))return false;
  me.standAt(me.N.x,cy);mate.standAt(mate.N.x,cy);if(!(await wait(500,ch)))return false;
  if(!(await play(2400,p=>{FX.night=smooth(p);},ch)))return false;
  const w2=Math.max(me.walkTo(S.door),mate.walkTo(S.door+6));if(!(await wait(w2+100,ch)))return false;
  me.hidden=mate.hidden=true;FX.camp.sleep=true;sfx("zip");return true;}
// the next pitch starts from camp: dawn breaks, the team comes out, the partner packs the tent away from its far
// corner while the leader waits by the door, and both walk back toward the wall, the leader ahead,
// so nobody passes anybody. Both climbers' moves wait on the same morning.
function leaveCamp(ch="main"){if(!FX.camp)return Promise.resolve(true);if(FX.leaving)return FX.leaving;
  return FX.leaving=(async()=>{const A=FX.A,me=A.me,mate=A.mate,cp=FX.camp,S=campSpots(),ix=cp.ix;
    me.hidden=mate.hidden=false;cp.sleep=false;me.standAt(S.door+8,cp.cy);mate.standAt(S.door,cp.cy);me.hi=mate.hi=ix;
    if(!(await play(1800,p=>{FX.night=1-smooth(p);},ch)))return false;
    const w=mate.walkTo(S.meWork);if(!(await wait(w+100,ch)))return false;
    // the tent comes down the way it went up, and its heap is packed away in a puff of dust
    mate.work(1);
    for(let n=TENT_UP-1;n>=1;n--){if(!(await wait(n===TENT_UP-1?350:190,ch)))return false;cp.tent=n;}
    if(!(await wait(350,ch)))return false;cp.tent=0;poof(S.door,cp.cy,true);if(!(await wait(300,ch)))return false;
    mate.standAt(mate.N.x,cp.cy);const w3=Math.max(me.walkTo(me.rest(ix).x),mate.walkTo(mate.rest(ix).x));
    if(!(await wait(w3+100,ch)))return false;
    me.standAt(me.rest(ix).x,cp.cy);mate.standAt(mate.rest(ix).x,cp.cy);FX.camp=null;FX.night=0;return true;})();}
async function climbRig(r,to,ms,id,ch="main"){
  const ok=()=>FX.ch[ch]===id,lead=r===FX.A.me;
  if(FX.camp&&to!==FX.camp.ix&&!(await leaveCamp(ch)))return false;
  if(to<r.hi)return downRig(r,to,ms,id,ch);
  // (still walking somewhere on the ledge, such as trading places with the partner: finish the walk first)
  while(r.mode==="walk"){if(!(await wait(50,ch)))return false;}
  // from the meadow or a ledge: walk over to the foot of the rock, then reach up onto it, high enough that the boots
  // clear the ground
  if(r.mode==="stand"){if(to<=r.hi)return ok();const first=Math.min(to,r.hi+LOW),hp=r.hangAt(first);
    if(Math.abs(hp.x-4-r.N.x)>6){const d=r.walkTo(hp.x-4,40);if(!(await wait(d,ch)))return false;}
    r.reachFrom(first,.4);if(!(await wait(440,ch)))return false;}
  // (onto a ledge the last move is the pull over its tip, not a move up to the ledge level, which lies back by the wall)
  const last=r.rest(to)?to-1:to;
  while(r.hi<last){
    // on long runs the leader throws the odd dyno: both hands let go and catch two holds higher
    if(lead&&to-r.hi>=4&&ms<=330&&++r.cnt%5===0){r.dyno(ms*1.4/1000);sfx("hup");if(!(await wait(ms*1.7,ch)))return false;continue;}
    r.stepUp(ms/1000);if(!(await wait(ms,ch)))return false;}
  // onto a ledge: the route comes up under its outer tip, so they pull straight up over the tip and walk in: to the
  // spot by the wall, or, if their partner already stands there, to the one short of it (so nobody passes anybody)
  const rs=r.rest(to);
  if(rs&&r.mode==="climb"){const o=r===FX.A.me?FX.A.mate:FX.A.me,there=o.mode==="stand"&&o.hi===to,spot=restSpot(to,there?1:0);
    const ey=to>=IDX_TOP?R0(peakTop(r.N.x))+2:spot.y; // (the summit slopes: stand on it where they come up)
    const d=r.L.art&&r.L.art.mantle?1.05:.45;sfx("mantle");
    r.topOut(r.N.x,ey,d);if(!(await wait(d*1000,ch)))return false;
    r.land(r.N.x,ey);r.hi=to;sfx("step");if(!(await wait(140,ch)))return false;
    // (straight in from the edge, so a partner coming up behind has room)
    if(to<IDX_TOP&&Math.abs(r.N.x-spot.x)>3){const d=r.walkTo(spot.x,36);if(!(await wait(d,ch)))return false;}
    if(!(await wait(220,ch)))return false;}
  return ok();
}
async function downRig(r,to,ms,id,ch){const ok=()=>FX.ch[ch]===id,rs=r.rest(to),stop=rs?to+LOW:to;
  if(r.mode==="stand")r.grab(Math.max(r.hi,stop+1));
  while(r.hi>stop){r.stepDown(ms/1000);if(!(await wait(ms,ch)))return false;}
  if(rs){r.dropTo(rs.x,rs.y,.3);if(!(await wait(320,ch)))return false;r.land(rs.x,rs.y);r.hi=to;sfx("thud");if(!(await wait(400,ch)))return false;}
  return ok();}
// the rope catches a falling climber: it snaps taut and twangs, the view jolts and the partner is dragged by it
function caught(r,vr){FX.ropeJerk=FX.time;FX.shake=Math.max(FX.shake,clamp(vr/120,.4,1.3));sfx("catch");
  const o=r===FX.A.me?FX.A.mate:FX.A.me;o.yank();if(r===FX.A.me)pop(r,r.catchWord||"WHOA!");r.catchWord=null;}
// a fall. Slipping with a hook clipped, the climber drops a body length, the rope catches them and they swing back
// to the rock. Without one they fall to the anchor: past a bolt on the wall the rope catches them below it, and
// they hang and swing a moment before climbing back to it; down to the meadow or a camp they land on their feet
async function fallRig(r,anchor,back,id,ch,hook,hookIdx){
  const rs=r.rest(anchor),near=r===FX.A.me;pebbles(r);if(near&&!hook)sfx("whistle");sfx("woosh");
  // (well out from the wall over the meadow, so the fall clears a partner on the rock below; only a little over a
  // camp ledge, so it lands on it)
  if(rs&&!hook){r.startFall(null,null,0,anchor?14:62,rs.y-LEG);
    // (on the feet again: a moment dazed, then back to where they stand at camp)
    while(r.mode==="fall"){if(!(await wait(60,ch)))return false;}
    if(!(await wait(LAND_MS+500,ch)))return false;const d=r.walkTo(rs.x,34);if(d&&!(await wait(d,ch)))return false;
    r.hi=anchor;return ok();}
  // (caught below an anchor, the rope holds them a little out from the wall, so they hang clear of a partner below)
  // (onto a clipped hook: the rope runs through its carabiner, so they drop past it by as far as they were above
  // it, and the rope catches them below it)
  const hp=hookIdx!=null?hookXY(FX.exp.choice,hookIdx):null;
  const [hx,ay]=r.hold(anchor),ax=hp?hp[0]:hook?hx:hx-24,ayy=hp?hp[1]:ay+(hook?8:0);
  if(hook||hp)r.catchWord="HOOK HELD!";
  r.startFall(ax,ayy,hook?Math.hypot(r.N.x-ax,r.N.y-ayy)+10:30,hook?22:60);
  if(!(await wait(hook?1300:2100,ch)))return false;
  r.reachFrom(clamp(Math.round(-(r.N.y+HANG[1])/HS),2,IDX_TOP-1),.3);
  if(!(await wait(hook?360:600,ch)))return false;
  return climbRig(r,back,260,id,ch);
  function ok(){return FX.ch[ch]===id;}
}
// reaching the summit is a celebration; reaching a camp is quieter: a title, then the team gets to work
function arrive(name,exp,to){const top=name==="summit";title(top?"SUMMIT!":name.toUpperCase(),`${fmt(mAlt(exp,to*HS/WK+ALT.base))} m`,"camp");
  if(top){confetti();sfx("summit");FX.A.me.cheer=2.6;}else sfx("thud");}
// a round plays out: a beat while both chalk up; the rope jerks whoever it holds back; whoever got it wrong comes
// off (onto the hook, the rope or down to the anchor); whoever got it right climbs to their next pitch, the higher
// one first; and if that brings both onto a camp ledge or the top, they arrive
// the hold a hook clipped at pitch p is on: just under the hands of a climber hanging there (none on a ledge)
const hookIdxAt=(exp,p)=>{const i=idxOf(exp,p);return i>1&&i!==IDX_C1&&i!==IDX_C2&&i<IDX_TOP?i-1:null;};
async function runEvent(exp,o,t){
  const id=++FX.ch.main,A=FX.A,ok=()=>FX.ch.main===id,T=rigTargets(t);
  const who=memberIds(t).map(u=>({r:rigOfId(t,u),x:(o.pl||{})[u]||{}})).filter(w=>w.r);
  for(const w of who)puff(w.r.N.x+5,w.r.N.y-38);sfx("chalk");if(!(await wait(SUSPENSE_MS)))return;
  // the rope jerk: the one too far ahead is snapped back onto their holds, the rope twangs, their partner feels it
  const held=who.find(w=>w.x.held);
  if(held){const hr=held.r,y0=hr.N.y,up=hr.mode==="climb";
    if(up){hr.slide(hr.N.x,y0-9,.36);sfx("hup");if(!(await wait(360)))return;}
    FX.ropeJerk=FX.time;FX.shake=Math.max(FX.shake,1.8);sfx("boing");sfx("thud");pebbles(hr);pebbles(hr);pop(hr,"ROPE JERK!");
    if(up)hr.slide(hr.N.x,y0,.1);
    caption(`Rope jerk! ${MAX_GAP} pitches ahead is as far as the rope goes`);
    hr.jolt(up?14:6);const other=who.find(w=>w!==held);if(other){other.r.yank();if(other.r.mode==="climb")other.r.jolt(8);}
    if(!(await wait(950)))return;}
  const side=[];
  for(const w of who.filter(w=>w.x.fall)){const r=w.r,tg=T.get(r);
    // still on the meadow or a ledge they never get far: a few moves up, then off, landing back on their feet. That
    // plays once at a stance; wrong again from the same spot, they just slump. Neither holds the partner up.
    if(r.mode==="stand"){const at=r.hi;
      if(r.stumbledAt===at&&r.L.art&&r.L.art.slump){caption("No way up this time");r.play([["slump",SLUMP_MS],["stand",650],["stand2",650]],1);r.calm();}
      else{r.stumbledAt=at;caption("Off at the first moves!");side.push(climbRig(r,at+LOW+2,280,id).then(z=>z&&fallRig(r,at,at,id,"main",false)));}}
    else if(w.x.caught||tg>=r.hi){caption(w.x.caught?"Wrong hold, but the hook holds":"Wrong hold!");if(!(await fallRig(r,r.hi-1,r.hi,id,"main",true,w.x.caught?hookIdxAt(exp,w.x.to):null)))return;}
    else{title("WHOOPS!",w.x.hooked?`Onto the hook at ${fmt(mAlt(exp,tg*HS/WK+ALT.base))} m`:`Down to ${fmt(mAlt(exp,tg*HS/WK+ALT.base))} m`,"bad");
      if(!(await fallRig(r,tg,tg,id,"main",false,w.x.hooked?hookIdxAt(exp,w.x.to):null)))return;}}
  const ups=who.filter(w=>!w.x.fall&&T.get(w.r)>w.r.hi).sort((a,b)=>T.get(b.r)-T.get(a.r));
  const jobs=ups.map((w,k)=>wait(k*700).then(z=>z&&climbRig(w.r,T.get(w.r),stepMsFor(T.get(w.r)-w.r.hi),id)).then(z=>{if(z&&!o.arrived)pop(w.r,"HUP!");return z;}));
  for(const j of [...jobs,...side])if(!(await j))return;
  for(const w of who)if(w.r.mode!=="stand")w.r.stumbledAt=null;
  // both right, both up: a fist in the air
  if(who.length>1&&who.every(w=>w.x.ok&&w.x.to>w.x.from)&&!o.arrived)for(const w of who){const r=w.r;
    if(r.mode==="climb"&&r.L.art&&r.L.art.yes){r.play([["yes",REST_MS+2*restSteps(r.N.y)*REST_STEP],["hang",1e9]]);r.calm();}else if(r.mode==="stand")r.cheer=.9;}
  // (anyone not yet where they belong, such as the partner drawn beside a lone climber, moves there)
  for(const r of FX.rigs){const tg=T.get(r);if(ok()&&tg!=null&&r.hi!==tg&&r.mode!=="fall"&&!(await climbRig(r,tg,320,id)))return;}
  if(o.arrived&&ok()){const to=idxOf(exp,exp.pitch);arrive(o.arrived,exp,to);
    if(o.arrived==="summit")A.mate.cheer=1.8;else if(campOf(to))await makeCamp(to);}
}
async function runSummit(t){++FX.ch.main;const A=FX.A;
  if(A.me.mode!=="stand"||A.me.hi<IDX_TOP)placeTeam(t.exp,IDX_TOP);
  title("TOP OF THE WORLD!",`${MT(t.exp).name} · ${fmt(mAlt(t.exp,ALT.top))} m`,"camp");confetti(44);sfx("summit");
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
  else if(campOf(ix)){FX.camp={k:campOf(ix),ix,cy:-ix*HS,tent:TENT_UP,sleep:true};FX.night=1;A.me.hidden=A.mate.hidden=true;}
  else for(const [rg,tg] of rigTargets(t))if(rg&&tg!==ix)place(rg,tg); // (each at their own pitch)
  FX.cam=null;}

function drawTopo(t){
  if(!ensureScene())return;
  if(!t){FX.focus="me";FX.label=null;FX.lit={c1:1,c2:1};FX.litAt={};FX.A.me.gear=3;
    if(FX.mode!=="lobby"){FX.mode="lobby";FX.exp=DEMO;FX.cam=null;runDemo();}return;}
  const exp=t.exp,r=t.round;FX.exp=exp;setLead(t);
  // the hooks in the wall, each where it was clipped; a new one drops in with a word from whoever clipped it
  {const hs=(exp.hooks||[]).map(p=>hookIdxAt(exp,p)).filter(i=>i!=null),old=FX.hooks||[],fresh=hs.filter(i=>!old.includes(i));
    if(fresh.length&&FX.mode==="game"&&r.phase==="answer"&&FX.hooksOf===exp.n){FX.hookNew=fresh[fresh.length-1];FX.hookAt=FX.time;if(r.hookBy!==(typeof S!=="undefined"&&S.uid))sfx("clip");const who=rigOfId(t,r.hookBy);if(who)pop(who,"CLIPPED!");}
    FX.hooks=hs;FX.hooksOf=exp.n;}
  const reached=Math.max(idxOf(exp,exp.pitch),idxOf(exp,exp.anchor));
  for(const [k,ix] of [["c1",IDX_C1],["c2",IDX_C2]]){const on=reached>=ix;if(on&&!FX.lit[k]&&FX.mode==="game")FX.litAt[k]=FX.time+1.6;FX.lit[k]=on;}
  FX.focus=r.phase==="summit"?"summit":"me";
  const tot=total(exp);
  // (the goal marker stands at this player's own next pitch, while there is one to climb to)
  const mine=posOf(exp,memberIds(t).includes(S.uid)?S.uid:memberIds(t)[0]);
  FX.label=r.phase!=="summit"&&mine<tot&&mine<capOf(exp)?{i:idxOf(exp,mine+1),text:`P${stageOf(exp,mine).i+1}`}:null;
  const st={n:exp.n,m:exp.m||"",pitch:exp.pitch,pos:memberIds(t).map(u=>posOf(exp,u)).join(","),res:r.phase==="reveal"?r.resolvedAt:null,phase:r.phase,gear:exp.rope};
  const prev=FX.state;FX.state=st;
  // (the mountain sets the snow line: the wall is repainted when it changes)
  const sn=MT(exp).snow;if(FX.snow!==sn){FX.snow=sn;FX.chunks.clear();FX.camps={};}
  if(FX.mode!=="game"||!prev||prev.n!==st.n||prev.m!==st.m){FX.mode="game";FX.litAt={};snap(exp,t);return;}
  // spent hooks leave the rack at once; a restock waits until the leader has pulled onto the camp ledge
  if(st.gear<prev.gear)FX.A.me.gear=st.gear;
  else if(st.gear>prev.gear)setTimeout(()=>{if(FX.mode!=="game"||!FX.state||FX.state.n!==st.n||FX.state.gear!==st.gear)return;const me=FX.A.me;me.gear=st.gear;pop(me,"GEAR RESTOCKED!");sfx("restock");},2600);
  if(st.res&&st.res!==prev.res&&r.result)runEvent(exp,r.result,t);
  else if(st.pos!==prev.pos){const id=++FX.ch.main,T=rigTargets(t);
    (async()=>{for(const rg of [FX.A.me,FX.A.mate]){const tg=T.get(rg);if(tg!=null&&tg!==rg.hi&&!(await climbRig(rg,tg,300,id)))return;}})();}
  if(st.phase==="summit"&&prev.phase!=="summit")runSummit(t);
  // morning: once the route on is picked, the team packs up camp before the next pitch
  else if(prev.phase==="camp"&&st.phase!=="camp"&&FX.camp)leaveCamp();
}
