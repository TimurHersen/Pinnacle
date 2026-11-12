"use strict";
/* A small QR code maker (byte mode, versions 1 to 6, error correction M, or L when the text is too long for M),
   enough for a join link. QR.matrix(text) gives the modules as rows of 0/1 (no quiet zone), or null if the text is
   too long; QR.svg(text) draws them as an SVG with the quiet zone round it. */
const QR=(()=>{
  // per version: total codewords; for M and L: error-correction words per block, and the data words of each block
  const V=[null,
    {n:26, M:[10,[16]],       L:[7,[19]]},
    {n:44, M:[16,[28]],       L:[10,[34]]},
    {n:70, M:[26,[44]],       L:[15,[55]]},
    {n:100,M:[18,[32,32]],    L:[20,[80]]},
    {n:134,M:[24,[43,43]],    L:[26,[108]]},
    {n:172,M:[16,[27,27,27,27]],L:[18,[68,68]]}];
  const ALIGN=[0,0,18,22,26,30,34],LEVEL={L:1,M:0};
  // GF(256) tables, and a Reed-Solomon remainder
  const EXP=[],LOG=[];for(let i=0,x=1;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11d;}
  const mul=(a,b)=>a&&b?EXP[(LOG[a]+LOG[b])%255]:0;
  function rs(data,n){let g=[1];for(let i=0;i<n;i++){const h=new Array(g.length+1).fill(0);
      for(let j=0;j<g.length;j++){h[j]^=g[j];h[j+1]^=mul(g[j],EXP[i]);}g=h;}
    const r=new Array(n).fill(0);
    for(const d of data){const f=d^r.shift();r.push(0);for(let j=0;j<n;j++)r[j]^=mul(g[j+1],f);}
    return r;}
  function pick(len){for(const lv of ["M","L"])for(let v=1;v<=6;v++){const cap=V[v][lv][1].reduce((a,b)=>a+b,0);if(len+2<=cap)return {v,lv};}return null;}
  function codewords(bytes,v,lv){const [ec,blocks]=V[v][lv],cap=blocks.reduce((a,b)=>a+b,0),bits=[];
    const put=(x,n)=>{for(let i=n-1;i>=0;i--)bits.push(x>>i&1);};
    put(4,4);put(bytes.length,8);for(const b of bytes)put(b,8);
    put(0,Math.min(4,cap*8-bits.length));while(bits.length%8)bits.push(0);
    const data=[];for(let i=0;i<bits.length;i+=8)data.push(parseInt(bits.slice(i,i+8).join(""),2));
    for(let p=0;data.length<cap;p++)data.push(p%2?0x11:0xec);
    const D=[],E=[];let at=0;for(const n of blocks){const d=data.slice(at,at+n);at+=n;D.push(d);E.push(rs(d,ec));}
    const out=[];for(let i=0;i<Math.max(...blocks);i++)for(const d of D)if(i<d.length)out.push(d[i]);
    for(let i=0;i<ec;i++)for(const e of E)out.push(e[i]);return out;}
  const MASK=[(r,c)=>(r+c)%2===0,(r,c)=>r%2===0,(r,c)=>c%3===0,(r,c)=>(r+c)%3===0,(r,c)=>((r>>1)+Math.floor(c/3))%2===0,
    (r,c)=>r*c%2+r*c%3===0,(r,c)=>(r*c%2+r*c%3)%2===0,(r,c)=>((r+c)%2+r*c%3)%2===0];
  function build(words,v,lv,mask){const N=17+4*v,m=Array.from({length:N},()=>new Array(N).fill(0)),fn=Array.from({length:N},()=>new Array(N).fill(false));
    const set=(r,c,b)=>{if(r>=0&&r<N&&c>=0&&c<N){m[r][c]=b?1:0;fn[r][c]=true;}};
    const finder=(r,c)=>{for(let y=-1;y<=7;y++)for(let x=-1;x<=7;x++){const in7=y>=0&&y<=6&&x>=0&&x<=6;
      set(r+y,c+x,in7&&(y===0||y===6||x===0||x===6||(y>=2&&y<=4&&x>=2&&x<=4)));}};
    finder(0,0);finder(0,N-7);finder(N-7,0);
    if(v>1){const a=ALIGN[v];for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)set(a+y,a+x,Math.max(Math.abs(x),Math.abs(y))!==1);}
    for(let i=8;i<N-8;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
    set(N-8,8,1); // the dark module
    // the format bits (level and mask, with their BCH code), twice
    let f=LEVEL[lv]<<3|mask,rem=f;for(let i=0;i<10;i++)rem=rem<<1^((rem>>9)*0x537);f=(f<<10|rem)^0x5412;
    const bit=i=>f>>i&1;
    for(let i=0;i<=5;i++)set(i,8,bit(i));set(7,8,bit(6));set(8,8,bit(7));set(8,7,bit(8));for(let i=9;i<15;i++)set(8,14-i,bit(i));
    for(let i=0;i<8;i++)set(8,N-1-i,bit(i));for(let i=8;i<15;i++)set(N-15+i,8,bit(i));
    // the data, zigzagging up and down in two-module columns from the bottom right
    let k=0;const total=words.length*8;
    for(let c=N-1,up=true;c>0;c-=2,up=!up){if(c===6)c--;
      for(let i=0;i<N;i++){const r=up?N-1-i:i;
        for(const cc of [c,c-1]){if(fn[r][cc])continue;let b=k<total?words[k>>3]>>(7-(k&7))&1:0;k++;if(MASK[mask](r,cc))b^=1;m[r][cc]=b;}}}
    return m;}
  // the standard's penalty score: runs, blocks, finder look-alikes and the balance of dark and light
  function penalty(m){const N=m.length;let p=0,dark=0;
    const line=get=>{for(let i=0;i<N;i++){let run=1;for(let j=1;j<=N;j++){if(j<N&&get(i,j)===get(i,j-1))run++;else{if(run>=5)p+=run-2;run=1;}}
      for(let j=0;j+10<N;j++){const s=[];for(let q=0;q<11;q++)s.push(get(i,j+q));const t=s.join("");if(t==="10111010000"||t==="00001011101")p+=40;}}};
    line((i,j)=>m[i][j]);line((i,j)=>m[j][i]);
    for(let r=0;r<N-1;r++)for(let c=0;c<N-1;c++){const b=m[r][c];if(b===m[r][c+1]&&b===m[r+1][c]&&b===m[r+1][c+1])p+=3;}
    for(const row of m)for(const b of row)dark+=b;
    return p+Math.floor(Math.abs(dark*100/(N*N)-50)/5)*10;}
  function matrix(text){const bytes=[...new TextEncoder().encode(String(text))],pk=pick(bytes.length);if(!pk)return null;
    const words=codewords(bytes,pk.v,pk.lv);let best=null,bp=1e9;
    for(let k=0;k<8;k++){const m=build(words,pk.v,pk.lv,k),p=penalty(m);if(p<bp){bp=p;best=m;}}
    return best;}
  function svg(text,o={}){const m=matrix(text);if(!m)return "";const N=m.length,q=o.quiet??4,S=N+2*q;let d="";
    for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(m[r][c]){let w=1;while(c+w<N&&m[r][c+w])w++;d+=`M${c+q} ${r+q}h${w}v1h-${w}z`;c+=w-1;}
    return `<svg class="qr" viewBox="0 0 ${S} ${S}" role="img" aria-label="${o.label||"QR code"}" shape-rendering="crispEdges"><rect width="${S}" height="${S}" fill="${o.light||"#fff"}"/><path d="${d}" fill="${o.dark||"#0b1524"}"/></svg>`;}
  return {matrix,svg};})();
