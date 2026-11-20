/* ============================== TITLE SCREEN ==============================
   The home screen: a peak over the clouds (assets/title-wide.png 320x180, title-tall.png 180x320) fills the screen; the title, the slogan
   and the menu are pixel art drawn at the painting's own pixel size, so the whole screen reads as one picture. The
   logo is drawn in code (the wordmark with a banded fill, an outline and a 3D edge, the emblem above it, a rope with
   carabiners under it); the slogan and button labels use a small hand-made 5-pixel font. */
const BG_W=384,BG_H=216;

// a 5-pixel-high font: each glyph is five rows of "#" and "."
const PF=(()=>{const g={
  A:".##.|#..#|####|#..#|#..#",B:"###.|#..#|###.|#..#|###.",C:".###|#...|#...|#...|.###",D:"###.|#..#|#..#|#..#|###.",
  E:"####|#...|###.|#...|####",F:"####|#...|###.|#...|#...",G:".###|#...|#.##|#..#|.###",H:"#..#|#..#|####|#..#|#..#",
  I:"###|.#.|.#.|.#.|###",J:"..##|...#|...#|#..#|.##.",K:"#..#|#.#.|##..|#.#.|#..#",L:"#...|#...|#...|#...|####",
  M:"#...#|##.##|#.#.#|#...#|#...#",N:"#..#|##.#|#.##|#..#|#..#",O:".##.|#..#|#..#|#..#|.##.",P:"###.|#..#|###.|#...|#...",
  R:"###.|#..#|###.|#.#.|#..#",S:".###|#...|.##.|...#|###.",T:"###|.#.|.#.|.#.|.#.",U:"#..#|#..#|#..#|#..#|.##.",
  V:"#..#|#..#|#..#|.##.|.##.",W:"#...#|#...#|#.#.#|##.##|#...#",X:"#..#|#..#|.##.|#..#|#..#",Y:"#.#|#.#|.#.|.#.|.#.",
  Q:".##.|#..#|#..#|#.#.|.#.#",Z:"####|..#.|.#..|#...|####",
  0:".#.|#.#|#.#|#.#|.#.",1:".#.|##.|.#.|.#.|###",2:"##.|..#|.#.|#..|###",3:"##.|..#|.#.|..#|##.",4:"#.#|#.#|###|..#|..#",
  5:"###|#..|##.|..#|##.",6:".##|#..|###|#.#|###",7:"###|..#|.#.|.#.|.#.",8:"###|#.#|###|#.#|###",9:"###|#.#|###|..#|##.",
  ".":".|.|.|.|#","!":"#|#|#|.|#","?":"##.|..#|.#.|...|.#."," ":"..|..|..|..|.."};
  const rows=s=>s.split("|");
  return {width(t){let w=0;for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);w+=r[0].length+1;}return Math.max(0,w-1);},
    draw(c,t,x,y,col,shadow){for(const pass of shadow?[1,0]:[0]){let cx=x;c.fillStyle=pass?shadow:col;
      for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);
        r.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==="#")c.fillRect(cx+i+pass,y+j+pass,1,1);});cx+=r[0].length+1;}}}};})();

// a canvas of the given native size, shown scaled up by whole pixels (see titleScale)
function pixCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;c.className="pix";c.dataset.w=w;c.dataset.h=h;return c;}

// the title, as in the concept: PINNACLE in thin pixel capitals spaced wide, a line out to each side
const TITLE_G={P:["#####.","#....#","#....#","#####.","#.....","#.....","#.....","#....."],I:["###",".#.",".#.",".#.",".#.",".#.",".#.","###"],
  N:["#....#","##...#","#.#..#","#.#..#","#..#.#","#..#.#","#...##","#....#"],A:["..##..",".#..#.","#....#","#....#","######","#....#","#....#","#....#"],
  C:[".####.","#....#","#.....","#.....","#.....","#.....","#....#",".####."],L:["#.....","#.....","#.....","#.....","#.....","#.....","#.....","######"],
  E:["######","#.....","#.....","#####.","#.....","#.....","#.....","######"]};
function drawTitle(){const word="PINNACLE",gap=5,line=16,sp=7;let w=0;for(const ch of word)w+=TITLE_G[ch][0].length+gap;w-=gap;
  const W=w+2*(line+sp),H=10,c=pixCanvas(W+1,H+1),g=c.getContext("2d");
  const put=(col,dx,dy)=>{g.fillStyle=col;let x=line+sp+dx;for(const ch of word){const G=TITLE_G[ch];G.forEach((r,y)=>{for(let i=0;i<r.length;i++)if(r[i]==="#")g.fillRect(x+i,y+1+dy,1,1);});x+=G[0].length+gap;}
    g.fillRect(dx,5+dy,line,1);g.fillRect(W-line+dx,5+dy,line,1);};
  put("rgba(36,44,104,.45)",1,1);put("#fbf6ec",0,0);return c;}
// the logo: emblem, wordmark, rope and slogan, as one pixel-art picture
const SLOGAN="SAME ROPE. SAME ANSWER.";
async function drawLogo(){
  try{await Promise.race([document.fonts.load('24px "Press Start 2P"'),new Promise(r=>setTimeout(r,1500))]);}catch(e){}
  const word="PINNACLE",FS=24,WW=word.length*FS,sw=PF.width(SLOGAN),W=Math.max(WW+28,sw+4),H=98,c=pixCanvas(W,H),g=c.getContext("2d");
  g.imageSmoothingEnabled=false;
  // the wordmark as a hard-edged mask (the font is drawn, then every half-covered pixel is kept and the rest dropped)
  const m=document.createElement("canvas");m.width=WW;m.height=FS;const mg=m.getContext("2d");
  mg.font=FS+'px "Press Start 2P"';mg.textBaseline="top";mg.fillStyle="#000";mg.fillText(word,0,0);
  const md=mg.getImageData(0,0,WW,FS).data,on=(x,y)=>x>=0&&y>=0&&x<WW&&y<FS&&md[(y*WW+x)*4+3]>128;
  const wx=(W-WW)>>1,wy=48,DEPTH=4;
  // emblem above, its foot tucked behind the letters
  const em=new Image();em.src=asset("assets/emblem.png");await new Promise(r=>{em.onload=em.onerror=r;});
  if(em.width)g.drawImage(em,(W-em.width)>>1,wy-em.height+10);
  // outline around the letters and their 3D edge, then the edge, then the banded face with a lit top edge
  const solid=(x,y)=>{for(let d=0;d<=DEPTH;d++)if(on(x,y-d))return true;return false;};
  g.fillStyle="#1d0c04";
  for(let y=-1;y<FS+DEPTH+1;y++)for(let x=-1;x<=WW;x++){if(solid(x,y))continue;
    if(solid(x-1,y)||solid(x+1,y)||solid(x,y-1)||solid(x,y+1))g.fillRect(wx+x,wy+y,1,1);}
  for(let y=0;y<FS+DEPTH;y++)for(let x=0;x<WW;x++)if(solid(x,y)&&!on(x,y)){g.fillStyle=on(x,y-DEPTH)&&!on(x,y-DEPTH+1)?"#5e2a10":"#8a3f18";g.fillRect(wx+x,wy+y,1,1);}
  const band=y=>y<6?"#fff2c6":y<12?"#ffd86a":y<18?"#f6a93a":"#e27a26";
  for(let y=0;y<FS;y++)for(let x=0;x<WW;x++)if(on(x,y)){g.fillStyle=!on(x,y-1)?"#ffffff":band(y);g.fillRect(wx+x,wy+y,1,1);}
  // the rope: a two-tone twist between two carabiners
  const ry=wy+FS+DEPTH+4,rx0=wx-6,rx1=wx+WW+5;
  for(let x=rx0;x<=rx1;x++){const k=(x-rx0)%4;g.fillStyle=k<2?"#f08a46":"#a9481f";g.fillRect(x,ry,1,1);g.fillStyle=k<2?"#a9481f":"#f08a46";g.fillRect(x,ry+1,1,1);}
  g.fillStyle="#1d0c04";g.fillRect(rx0,ry+2,rx1-rx0+1,1);
  for(const cx of [rx0-4,rx1+1]){const art=[".###.","#...#","#...#","#...#","#...#",".###."];
    art.forEach((row,j)=>{for(let i=0;i<5;i++)if(row[i]==="#"){g.fillStyle=i>2?"#7f8aa3":"#dfe5ef";g.fillRect(cx+i,ry-2+j,1,1);}});}
  // the slogan, pale on a dark drop shadow
  const sx=(W-sw)>>1,sy=ry+9;for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[1,1]])PF.draw(g,SLOGAN,sx+dx,sy+dy,"#141c30");
  PF.draw(g,SLOGAN,sx,sy,"#cfeee6");
  return c;
}
// a menu button's label in the pixel font
function labelCanvas(text){const w=PF.width(text),c=pixCanvas(w+1,6),g=c.getContext("2d");PF.draw(g,text,0,0,"#f4e6c4","#05080f");return c;}

/* layout: the logo and the menu are measured in the painting's pixels and given the largest whole-pixel size at
   which they can't touch. Normally the logo sits at the top and the menu below it (stacked); on a short, wide
   screen (a phone on its side) they sit side by side instead. Sizes below are in native pixels. */
const MENU_GAP=5,BTN_H=13,TOP=6,BOTTOM=14,BETWEEN=10,EDGE=16;
function titleScale(){
  const home=document.getElementById("home");if(!home)return;const W=innerWidth,H=innerHeight,tall=H>=W;
  // (the painting for the screen's shape: tall on a phone held upright, wide otherwise)
  const bg=document.getElementById("menubg"),src=asset(tall?"assets/title-tall.png":"assets/title-wide.png");if(bg&&bg.dataset.src!==src){bg.dataset.src=src;bg.src=src;}
  const t=home.querySelector(".tlogo canvas");if(t){const k=Math.max(2,Math.floor(Math.min(W*.82/t.width,H*.075/t.height)));t.style.width=t.width*k+"px";t.style.height=t.height*k+"px";}
  // (the menu sits over the clouds, below the peak: lower on a tall screen, where the peak takes the upper middle)
  home.style.setProperty("--mtop",tall?"44%":"41%");}
addEventListener("resize",()=>titleScale());

// the title screen; items are [{id,label}], and onPick(id) opens that part of the menu
let HOME_N=0;
async function showHome(items,onPick){
  const n=++HOME_N;document.body.classList.add("home");
  let home=document.getElementById("home");
  if(!home){home=document.createElement("div");home.id="home";document.body.appendChild(home);
    const bg=document.createElement("img");bg.id="menubg";bg.alt="";document.querySelector(".scene").appendChild(bg);
    bg.addEventListener("load",()=>{bg.classList.add("in");if(document.body.classList.contains("home"))TFX.start(bg);const h=document.getElementById("home");if(h)requestAnimationFrame(()=>h.classList.add("ready"));});}
  home.hidden=false;home.innerHTML=`<div class="tlogo" role="img" aria-label="Pinnacle. ${SLOGAN.toLowerCase()}"><div class="tslogan">${SLOGAN}</div></div><nav class="pmenu" aria-label="Main menu"></nav>`;
  home.querySelector(".tlogo").prepend(drawTitle());
  const nav=home.querySelector(".pmenu");
  for(const it of items){const b=document.createElement("button");b.className="pbtn";b.dataset.id=it.id;b.setAttribute("aria-label",it.label);
    b.textContent=it.label;nav.appendChild(b);
    b.onclick=()=>{sfx("pop");nav.querySelectorAll(".pbtn").forEach(x=>x.setAttribute("aria-current",x===b));onPick(it.id);};}
  titleScale();
  // (the menu's items rise in one after another, once the painting is there; seen before, straight away)
  nav.querySelectorAll(".pbtn").forEach((b,i)=>b.style.setProperty("--i",i));
  const bg=document.getElementById("menubg");if(bg&&bg.complete&&bg.naturalWidth){bg.classList.add("in");home.classList.add("ready");TFX.start(bg);}
  setTimeout(()=>{home.classList.add("ready");document.getElementById("menubg")?.classList.add("in");},1500);
}
// the menu steps aside for a panel (the painting stays), or the title screen goes away for the climb
function homeMenu(on){const h=document.getElementById("home");if(!h)return;h.classList.toggle("away",!on);
  if(on)h.querySelectorAll(".pbtn").forEach(x=>x.removeAttribute("aria-current"));}
function hideHome(){HOME_N++;TFX.stop();document.body.classList.remove("home");const h=document.getElementById("home");if(h){h.hidden=true;h.innerHTML="";}}

/* ---------- the painting comes alive: one transparent canvas at the painting's own pixels, laid exactly over it
   (as object-fit:cover places it), so everything drawn is in the same big pixels. The summit flag flutters, snow
   blows off the peak in the wind, the sea of clouds slowly drifts (soft puffs that move only where the painting has
   cloud, so they pass behind the cliff and the climber) and, now and then, a pair of birds crosses the sky. With
   reduced motion nothing runs. ---------- */
const TFX=(()=>{
  let cv=null,g=null,img=null,raf=0,last=0,t=0,W=0,H=0,flag=null,peak=null,mask=null,src=null,rims=[],wisps=[],snow=[],birds=[],nextBird=2.5;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function place(){if(!cv||!img||!img.naturalWidth)return;const r=img.getBoundingClientRect(),s=Math.max(r.width/W,r.height/H),
      cs=getComputedStyle(img).objectPosition.split(" ").map(v=>parseFloat(v)/100),px=isNaN(cs[0])?.5:cs[0],py=isNaN(cs[1])?.7:cs[1];
    Object.assign(cv.style,{left:r.left+(r.width-W*s)*px+"px",top:r.top+(r.height-H*s)*py+"px",width:W*s+"px",height:H*s+"px"});}
  // read the painting once: the flag's cloth, the summit, which pixels are cloud, and the cloud colours
  function survey(){const c=document.createElement("canvas");c.width=W;c.height=H;const sg=c.getContext("2d");sg.drawImage(img,0,0);
    const d=sg.getImageData(0,0,W,H).data,at=(x,y)=>{const i=(y*W+x)*4;return [d[i],d[i+1],d[i+2],d[i+3]];};
    // the flag: the red pixels high up; the pole is the dark column at its left
    let fx0=W,fx1=-1,fy0=H,fy1=-1;for(let y=0;y<H*.45;y++)for(let x=0;x<W;x++){const [r,gg,b]=at(x,y);if(r>150&&gg<120&&b<120&&r-gg>60){fx0=Math.min(fx0,x);fx1=Math.max(fx1,x);fy0=Math.min(fy0,y);fy1=Math.max(fy1,y);}}
    flag=null;if(fx1>=0&&fx1-fx0<12&&fy1-fy0<10){const cloth=[];for(let y=fy0;y<=fy1;y++)for(let x=fx0;x<=fx1;x++){const p=at(x,y);if(p[0]>110&&p[0]-p[2]>30)cloth.push([x,y,p]);}
      const sky=at(Math.min(W-1,fx1+3),fy0);flag={x0:fx0,x1:fx1,y0:fy0,y1:fy1,cloth,sky};}
    // the summit: the first bright, snowy pixel from the top under the flag
    peak=null;const cx=flag?flag.x0-1:W>>1;for(let y=flag?flag.y1:0;y<H*.6&&!peak;y++)for(let x=cx-3;x<=cx+3;x++){const [r,gg,b]=at(x,y);if(r>215&&gg>215&&b>215){peak={x,y};break;}}
    // cloud: light lavender-to-cream pixels below the mountain's foot; the warm, brightest of them are the sunlit rims
    src=d;mask=new Uint8Array(W*H);rims=[];const top=Math.floor(H*(H>W?.36:.52));
    for(let y=top;y<H;y++)for(let x=0;x<W;x++){const [r,gg,b]=at(x,y),l=(r+gg+b)/3;
      if(l>165&&b>=gg-6&&r>=gg-40&&!(b>235&&gg<215))mask[y*W+x]=1;
      if(r>238&&gg>228&&b<230&&r>=b+12)rims.push(x,y);}
    wisps=[];const n=H>W?7:8;for(let k=0;k<n;k++)wisps.push(newWisp(rnd(0,W)));}
  function newWisp(x){return {x,y:Math.floor(rnd(H*(H>W?.42:.58),H*.97)),len:rnd(16,34)*(H>W?.75:1),v:rnd(1.5,3)*(Math.random()<.5?1:-1),th:Math.random()<.5?2:1};}
  const nz=(i,s)=>{const v=Math.sin(i*12.9898+s*78.233)*43758.5453;return v-Math.floor(v);};
  function draw(dt){t+=dt;g.clearRect(0,0,W,H);
    // sunlight slowly sweeping along the cloud tops: rim pixels brighten as a broad, slanted band passes over them
    g.fillStyle="#fffdf1";for(let i=0;i<rims.length;i+=2){const x=rims[i],y=rims[i+1],v=Math.sin(x*.045+y*.03-t*.5);if(v>.82)g.fillRect(x,y,1,1);}
    // thin streaks of mist drifting through the cloud sea, in the clouds' own colours lifted a little, only over cloud
    for(const w of wisps){w.x+=w.v*dt;if(w.x<-w.len-4||w.x>W+w.len+4)Object.assign(w,newWisp(w.v>0?-w.len-2:W+w.len+2),{v:w.v});
      for(let k=0;k<w.len;k++){const x=Math.round(w.x+k),f=k/w.len,rows=(f>.2&&f<.8)?w.th:1;
        for(let j=0;j<rows;j++){const y=w.y+j;if(x<0||x>=W||!mask[y*W+x])continue;const i=(y*W+x)*4,m=.42;
          g.fillStyle=`rgb(${src[i]+(255-src[i])*m|0},${src[i+1]+(253-src[i+1])*m|0},${src[i+2]+(246-src[i+2])*m|0})`;g.fillRect(x,y,1,1);}}}
    // the summit flag, rippling in the wind: the cloth redrawn with each column lifted or dropped a pixel in a wave
    if(flag){const f=flag;g.fillStyle=`rgb(${f.sky[0]},${f.sky[1]},${f.sky[2]})`;g.fillRect(f.x0+1,f.y0-1,f.x1-f.x0+2,f.y1-f.y0+3);
      for(const [x,y,c] of f.cloth){if(x===f.x0)continue;const k=x-f.x0,dy=Math.round(Math.sin(t*7-k*1.1)*(k/(f.x1-f.x0+1))*1.2);g.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;g.fillRect(x,y+dy,1,1);}
      for(const [x,y,c] of f.cloth)if(x===f.x0){g.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`;g.fillRect(x,y,1,1);}}
    // snow blown off the summit, streaming away downwind and thinning out
    if(peak){if(Math.random()<dt*14)snow.push({x:peak.x+rnd(-1,2),y:peak.y+rnd(0,4),vx:rnd(8,16),vy:rnd(-1.5,1.5),life:0,max:rnd(1.4,2.8)});
      snow=snow.filter(s=>(s.life+=dt)<s.max);for(const s of snow){s.x+=s.vx*dt;s.y+=(s.vy+Math.sin(t*3+s.max*9)*1.2)*dt;const a=s.life/s.max;
        g.fillStyle=a<.45?"#ffffff":a<.8?"#e3ecfb":"#c7d4f0";g.fillRect(Math.round(s.x),Math.round(s.y),1,1);}}
    // now and then a pair of birds glides across the sky, wings flapping
    if((nextBird-=dt)<=0){nextBird=rnd(9,15);const dir=Math.random()<.5?1:-1,y=rnd(H*.08,H*(H>W?.22:.3)),v=rnd(9,14)*dir,x=dir>0?-8:W+8;birds.push({x,y,v},{x:x-dir*rnd(7,11),y:y+rnd(2,5),v});}
    birds=birds.filter(b=>(b.x+=b.v*dt)>-14&&b.x<W+14);g.fillStyle="#4b4f86";
    for(const b of birds){const up=Math.floor(t*5+b.y*3)%2,x=Math.round(b.x),y=Math.round(b.y+Math.sin(t*1.3+b.y)*1.2);
      for(const [dx,dy] of up?[[0,1],[1,0],[2,1],[3,0],[4,1]]:[[0,0],[1,1],[2,1],[3,1],[4,0]])g.fillRect(x+dx,y+dy,1,1);}}
  function loop(now){raf=requestAnimationFrame(loop);const dt=Math.min(.1,(now-(last||now))/1000);if(dt<1/30&&last)return;last=now;draw(dt||1/30);}
  async function start(el){if(RM.matches)return;img=el;
    if(!img.complete)await new Promise(r=>{img.addEventListener("load",r,{once:true});img.addEventListener("error",r,{once:true});});if(!img.naturalWidth)return;
    if(!cv){cv=document.createElement("canvas");cv.className="tfx";document.querySelector(".scene").appendChild(cv);g=cv.getContext("2d");}
    if(cv.dataset.src!==img.currentSrc){cv.dataset.src=img.currentSrc;W=cv.width=img.naturalWidth;H=cv.height=img.naturalHeight;survey();snow=[];birds=[];}
    place();cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(loop);}
  function stop(){cancelAnimationFrame(raf);raf=0;snow=[];birds=[];if(g)g.clearRect(0,0,W,H);}
  addEventListener("resize",()=>{place();setTimeout(place,250);});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(document.body.classList.contains("home")&&cv&&img){last=0;raf=requestAnimationFrame(loop);}});
  return {start,stop,place};
})();
