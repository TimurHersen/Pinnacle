/* ============================== TITLE SCREEN ==============================
   The home screen: the dusk camp painting (assets/menu-dusk.png, 384x216) fills the screen, and the logo, the slogan
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
  ".":".|.|.|.|#"," ":"..|..|..|..|.."};
  const rows=s=>s.split("|");
  return {width(t){let w=0;for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);w+=r[0].length+1;}return Math.max(0,w-1);},
    draw(c,t,x,y,col,shadow){for(const pass of shadow?[1,0]:[0]){let cx=x;c.fillStyle=pass?shadow:col;
      for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);
        r.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==="#")c.fillRect(cx+i+pass,y+j+pass,1,1);});cx+=r[0].length+1;}}}};})();

// a canvas of the given native size, shown scaled up by whole pixels (see titleScale)
function pixCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;c.className="pix";c.dataset.w=w;c.dataset.h=h;return c;}

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
  const home=document.getElementById("home");if(!home)return;
  const W=innerWidth,H=innerHeight,p=Math.max(W/BG_W,H/BG_H),narrow=W<600&&H>=W; // (narrow: a phone held upright)
  const logo=home.querySelector(".tlogo canvas"),LW=+(logo?.dataset.w||220),LH=+(logo?.dataset.h||98);
  const n=home.querySelectorAll(".pbtn").length||4,MH=n*BTN_H+(n-1)*MENU_GAP+3;
  const MW=Math.max(84,...[...home.querySelectorAll(".pbtn canvas")].map(c=>+c.dataset.w))+16;
  // stacked: logo, a gap, then the whole menu must fit the height; on wide screens the logo also stays under 60% wide
  let u=Math.floor(Math.min(H/(TOP+LH+BETWEEN+MH+BOTTOM),narrow?W/(MW+8):W*.6/LW,Math.max(2,Math.round(p))));
  let side=false,availW=W-24;
  // side by side, the menu keeps a readable size and the logo shrinks into the space beside it if it must
  let availH=Infinity;
  if(u<2&&!narrow){side=true;u=Math.floor(Math.min(H/(MH+8),W/(EDGE+MW+BETWEEN+LW*.5+EDGE)));
    u=Math.max(2,u);availW=W-(EDGE+MW+BETWEEN+EDGE)*u;availH=H-16;}
  u=Math.max(2,u);
  home.classList.toggle("side",side);home.style.setProperty("--u",u+"px");
  // side by side, the logo is centred in the space to the right of the menu
  home.style.setProperty("--lx",side?((EDGE+MW+BETWEEN)*u+(W-(EDGE+MW+BETWEEN)*u)/2)+"px":"50%");
  // (the logo may shrink below whole pixels when even that is too wide, rather than spill off the sides)
  home.querySelectorAll("canvas.pix").forEach(c=>{const k=c.closest(".tlogo")?Math.min(u,availW/c.dataset.w,availH/c.dataset.h):u;c.style.width=c.dataset.w*k+"px";c.style.height=c.dataset.h*k+"px";});}
addEventListener("resize",()=>titleScale());

// the title screen; items are [{id,label}], and onPick(id) opens that part of the menu
let HOME_N=0;
async function showHome(items,onPick){
  const n=++HOME_N;document.body.classList.add("home");
  let home=document.getElementById("home");
  if(!home){home=document.createElement("div");home.id="home";document.body.appendChild(home);
    const bg=document.createElement("img");bg.id="menubg";bg.alt="";bg.src=asset("assets/menu-dusk.png");document.querySelector(".scene").appendChild(bg);}
  TFX.start(document.getElementById("menubg"));
  home.hidden=false;home.innerHTML=`<div class="tlogo" role="img" aria-label="Pinnacle. ${SLOGAN.toLowerCase()}"></div><nav class="pmenu" aria-label="Main menu"></nav>`;
  const nav=home.querySelector(".pmenu");
  for(const it of items){const b=document.createElement("button");b.className="pbtn";b.dataset.id=it.id;b.setAttribute("aria-label",it.label);
    b.appendChild(labelCanvas(it.label));nav.appendChild(b);
    b.onclick=()=>{sfx("pop");nav.querySelectorAll(".pbtn").forEach(x=>x.setAttribute("aria-current",x===b));onPick(it.id);};}
  titleScale();
  const logo=await drawLogo();if(n!==HOME_N)return;
  home.querySelector(".tlogo").appendChild(logo);titleScale();
}
// the menu steps aside for a panel (the painting stays), or the title screen goes away for the climb
function homeMenu(on){const h=document.getElementById("home");if(!h)return;h.classList.toggle("away",!on);
  if(on)h.querySelectorAll(".pbtn").forEach(x=>x.removeAttribute("aria-current"));}
function hideHome(){HOME_N++;TFX.stop();document.body.classList.remove("home");const h=document.getElementById("home");if(h){h.hidden=true;h.innerHTML="";}}

/* ---------- the painting comes alive: two transparent layers at the painting's own 384x216 pixels, laid exactly
   over it. The light layer is screen-blended, so it can only brighten: the fire's flickering glow on the ground and
   the tent and both climbers, sparks and twinkling stars. The other layer is drawn normally: a living flame over the
   painted fire, a column of smoke drifting off it and, every few seconds, two birds crossing the sky. ---------- */
const TFX=(()=>{
  const FIRE={x:285,y:190,top:180},BG_POS=[.88,.6]; // the painted fire's core; BG_POS matches #menubg's object-position
  let light=null,air=null,lg=null,ag=null,raf=0,last=0,t=0,stars=[],lightMap=null,glow=.8,nextGlow=0,sparks=[],smoke=[],birds=[],nextBird=3,nextSmoke=0;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  function layer(cls){const c=document.createElement("canvas");c.width=BG_W;c.height=BG_H;c.className="tfx "+cls;document.querySelector(".scene").appendChild(c);return c;}
  // lay both layers over the painting exactly as object-fit:cover places it
  function place(){if(!light)return;const W=innerWidth,H=innerHeight,s=Math.max(W/BG_W,H/BG_H),w=BG_W*s,h=BG_H*s,x=(W-w)*BG_POS[0],y=(H-h)*BG_POS[1];
    for(const c of [light,air])Object.assign(c.style,{left:x+"px",top:y+"px",width:w+"px",height:h+"px"});}
  // read the painting once: where the night sky is (for stars) and how the firelight falls on the camp
  function survey(img){const c=document.createElement("canvas");c.width=BG_W;c.height=BG_H;const g=c.getContext("2d");g.drawImage(img,0,0);
    const d=g.getImageData(0,0,BG_W,BG_H).data,px=(x,y)=>{const i=(y*BG_W+x)*4;return [d[i],d[i+1],d[i+2]];};
    stars=[];for(let tries=0;stars.length<22&&tries<600;tries++){const x=(Math.random()*290)|0,y=(Math.random()*26)|0,[r,gg,b]=px(x,y);
      if(b>=r*.8&&r+gg+b<330)stars.push({x,y,ph:rnd(0,6.3),sp:rnd(.6,1.8),big:Math.random()<.2});}
    // the firelight, worked out once: light falls off with distance from the fire, and surfaces that are already
    // bright in the painting (the tent, logs, the climbers) catch more of it than dark grass. It's stepped into four
    // levels with an ordered dither between them, like hand-shaded pixel art, and only its brightness flickers
    const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],LEV=["#2a1406","#4a2309","#6e360f","#94501a"];
    const tentAt=new Set();for(let y=150;y<210;y++)for(let x=250;x<350;x++){const [r,gg,b]=px(x,y);if(r>190&&gg>80&&gg<160&&b<70)tentAt.add(y*BG_W+x);}
    lightMap=document.createElement("canvas");lightMap.width=BG_W;lightMap.height=BG_H;const lm=lightMap.getContext("2d");
    for(let y=FIRE.y-46;y<Math.min(BG_H,FIRE.y+26);y++)for(let x=FIRE.x-84;x<FIRE.x+84;x++){
      const dx=(x-FIRE.x)/84,dy=(y-FIRE.y+4)/42,dd=dx*dx+dy*dy;if(dd>=1)continue;
      const [r,gg,b]=px(x,y),lum=(r*.3+gg*.59+b*.11)/255,fall=(1-Math.sqrt(dd))**1.6;
      let w=fall*(.3+.9*lum)+(tentAt.has(y*BG_W+x)?.18*fall+.06:0);
      w+=(BAYER[(y&3)*4+(x&3)]/16-.5)*.1;const lv=w>.62?3:w>.4?2:w>.22?1:w>.1?0:-1;
      if(lv>=0){lm.fillStyle=LEV[lv];lm.fillRect(x,y,1,1);}}}
  // a repeatable 0..1 noise from two numbers (so the flame's shape holds for a frame, then changes)
  const nz=(i,s)=>{const v=Math.sin(i*12.9898+s*78.233)*43758.5453;return v-Math.floor(v);};
  function draw(dt){
    t+=dt;lg.clearRect(0,0,BG_W,BG_H);ag.clearRect(0,0,BG_W,BG_H);
    // with reduced motion only the fire itself moves (the flame, its light and the stars); nothing drifts or flies
    const calm=RM.matches;
    // firelight: the light map at a brightness that wanders unevenly between a few levels, as a real fire does
    if((nextGlow-=dt)<=0){nextGlow=rnd(.07,.16);glow=Math.max(.5,Math.min(1,glow+(Math.random()<.5?-1:1)*rnd(.08,.18)));}
    if(lightMap){lg.globalAlpha=glow;lg.drawImage(lightMap,0,0);lg.globalAlpha=1;}
    // the flame: drawn over the painted one, taller in the middle, every column changing height ten times a second
    const fs=Math.floor(t*10),fb=FIRE.y+4;
    for(let i=-6;i<=6;i++){const h=Math.round((6+12*(1-(i/7)**2))*(.65+.35*nz(i,fs)));
      for(let j=0;j<h;j++){const k=j/h;ag.fillStyle=Math.abs(i)<=2&&k<.45?"#fff4b8":k<.35?"#ffd24a":k<.65?"#ff9a2a":k<.85?"#e2541a":"#9e2f10";ag.fillRect(FIRE.x+i,fb-j,1,1);}}
    if(nz(99,fs)>.55){ag.fillStyle="#ff9a2a";ag.fillRect(FIRE.x+Math.round((nz(7,fs)-.5)*8),fb-20-Math.round(nz(3,fs)*4),1,2);}
    // sparks, rising well above the fire
    if(!calm&&Math.random()<dt*7)sparks.push({x:FIRE.x+rnd(-4,4),y:fb-12,vy:rnd(-30,-18),ph:rnd(0,6),life:rnd(1.5,3.5),age:0,big:Math.random()<.3});
    sparks=sparks.filter(s=>(s.age+=dt)<s.life);
    for(const s of sparks){s.y+=s.vy*dt;const k=s.age/s.life,x=Math.round(s.x+Math.sin(s.age*3+s.ph)*3);
      if(k>.8&&Math.floor(t*14)%2)continue;lg.fillStyle=k<.3?"#ffe08a":k<.65?"#ff9a3a":"#b5481a";const z=s.big&&k<.25?2:1;lg.fillRect(x,Math.round(s.y),z,z);}
    // stars twinkling in the last of the night sky
    for(const s of stars){const v=Math.sin(t*s.sp+s.ph);if(v<.15)continue;lg.fillStyle=v>.8?"#ffffff":v>.5?"#a9b4d8":"#5a6088";
      lg.fillRect(s.x,s.y,1,1);if(s.big&&v>.85){lg.fillStyle="#5a6088";lg.fillRect(s.x-1,s.y,1,1);lg.fillRect(s.x+1,s.y,1,1);lg.fillRect(s.x,s.y-1,1,1);lg.fillRect(s.x,s.y+1,1,1);}}
    if(calm)return;
    // smoke: a column of soft puffs rising off the fire and leaning with the breeze
    if((nextSmoke-=dt)<=0){nextSmoke=rnd(.25,.45);smoke.push({x:FIRE.x+rnd(-2,2),y:fb-18,age:0,life:rnd(5,7),ph:rnd(0,6)});}
    smoke=smoke.filter(p=>(p.age+=dt)<p.life);
    for(const p of smoke){const k=p.age/p.life,sz=k<.2?2:k<.6?3:4,x=Math.round(p.x+p.age*3+Math.sin(p.age*1.2+p.ph)*2.5)-(sz>>1),y=Math.round(p.y-p.age*12);
      ag.globalAlpha=.6*(1-k);ag.fillStyle=k<.4?"#d8d0dc":"#a8a2bc";ag.fillRect(x,y,sz,sz);}
    ag.globalAlpha=1;
    // now and then two birds glide across the sky, wings flapping
    if((nextBird-=dt)<=0){nextBird=rnd(8,14);const y=rnd(30,60),v=rnd(12,17);birds.push({x:-8,y,v},{x:-16,y:y+rnd(3,6),v});}
    birds=birds.filter(b=>(b.x+=b.v*dt)<BG_W+8);ag.fillStyle="#2a2036";
    for(const b of birds){const up=Math.floor(t*5+b.y)%2,x=Math.round(b.x),y=Math.round(b.y+Math.sin(t*1.3+b.y)*1.5);
      for(const [dx,dy] of up?[[0,1],[1,0],[2,1],[3,0],[4,1]]:[[0,0],[1,1],[2,1],[3,1],[4,0]])ag.fillRect(x+dx,y+dy,1,1);}
  }
  function loop(now){raf=requestAnimationFrame(loop);const dt=Math.min(.1,(now-(last||now))/1000);
    if(dt<1/24&&last)return;last=now;draw(dt||1/24);}
  async function start(img){
    if(!light){light=layer("light");air=layer("air");lg=light.getContext("2d");ag=air.getContext("2d");}
    if(!img.complete)await new Promise(r=>{img.onload=img.onerror=r;});if(!img.naturalWidth)return;
    if(!stars.length)survey(img);place();cancelAnimationFrame(raf);last=0;
    // (with reduced motion it still runs, but draw() keeps to the fire and the stars)
    raf=requestAnimationFrame(loop);}
  function stop(){cancelAnimationFrame(raf);raf=0;sparks=[];smoke=[];birds=[];}
  addEventListener("resize",place);
  document.addEventListener("visibilitychange",()=>{if(document.hidden)cancelAnimationFrame(raf);else if(document.body.classList.contains("home")&&light){last=0;raf=requestAnimationFrame(loop);}});
  return {start,stop};
})();
