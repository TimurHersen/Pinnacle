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
  ".":".|.|.|.|#"," ":"..|..|..|..|.."};
  const rows=s=>s.split("|");
  return {width(t){let w=0;for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);w+=r[0].length+1;}return Math.max(0,w-1);},
    draw(c,t,x,y,col,shadow){for(const pass of shadow?[1,0]:[0]){let cx=x;c.fillStyle=pass?shadow:col;
      for(const ch of t.toUpperCase()){const r=rows(g[ch]||g[" "]);
        r.forEach((row,j)=>{for(let i=0;i<row.length;i++)if(row[i]==="#")c.fillRect(cx+i+pass,y+j+pass,1,1);});cx+=r[0].length+1;}}}};})();

// a canvas of the given native size, shown scaled up by whole pixels (see titleScale)
function pixCanvas(w,h){const c=document.createElement("canvas");c.width=w;c.height=h;c.className="pix";c.dataset.w=w;c.dataset.h=h;return c;}

// the logo: emblem, wordmark, rope and slogan, as one pixel-art picture
const SLOGAN="TWO MINDS. ONE ROPE. HIGHER TOGETHER.";
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

/* scaling: the painting covers the screen; the logo and menu use the nearest whole-pixel size to it, capped so
   they always fit, and every pixel canvas is sized to match */
function titleScale(){
  const W=innerWidth,H=innerHeight,p=Math.max(W/BG_W,H/BG_H);
  const u=Math.max(2,Math.min(Math.round(p),Math.floor(W/200),Math.floor(H/150)));
  const home=document.getElementById("home");if(!home)return;home.style.setProperty("--u",u+"px");
  // (the logo may shrink below whole pixels on a narrow phone rather than spill off the sides)
  home.querySelectorAll("canvas.pix").forEach(c=>{const k=c.closest(".tlogo")?Math.min(u,(W-24)/c.dataset.w):u;c.style.width=c.dataset.w*k+"px";c.style.height=c.dataset.h*k+"px";});}
addEventListener("resize",()=>titleScale());

// the title screen; items are [{id,label}], and onPick(id) opens that part of the menu
let HOME_N=0;
async function showHome(items,onPick){
  const n=++HOME_N;document.body.classList.add("home");
  let home=document.getElementById("home");
  if(!home){home=document.createElement("div");home.id="home";document.body.appendChild(home);
    const bg=document.createElement("img");bg.id="menubg";bg.alt="";bg.src=asset("assets/menu-dusk.png");document.querySelector(".scene").appendChild(bg);}
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
function hideHome(){HOME_N++;document.body.classList.remove("home");const h=document.getElementById("home");if(h){h.hidden=true;h.innerHTML="";}}
