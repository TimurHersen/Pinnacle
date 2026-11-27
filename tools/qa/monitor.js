// injected into a game frame: watches every painted frame for glitches
(function(){if(window.__MON)return;const M=window.__MON={log:[],n:0,prev:null};
 const orig=window.requestAnimationFrame.bind(window);
 const check=()=>{try{if(typeof FX==='undefined'||!FX.A||!FX.exp||FX.mode!=='game')return;M.n++;
   const cur={t:FX.time,cut:FX.ch.main,split:!!FX.split,camY:FX.cam&&FX.cam.y,ox:FX.ox,rigs:FX.rigs.map(r=>({w:r.L.art&&r.L.art.who,mode:r.mode,pose:r.pose,hidden:!!r.hidden,
     d:r.lastDraw?{kind:r.lastDraw.kind,cx:r.lastDraw.cx,cy:r.lastDraw.cy,fx:r.lastDraw.fx,fy:r.lastDraw.fy}:null,N:[r.N.x,r.N.y],tie:r.tieW?[r.tieW.x,r.tieW.y]:null,art:r.lastArt})),
     ropeN:FX.rope.P.length,pins:FX.pins.map(p=>p.id).join(',')};
   const bad=(m)=>{if(M.log.length<400)M.log.push(Object.assign({at:+FX.time.toFixed(2),msg:m}));};
   for(const r of cur.rigs){for(const v of [...r.N,...(r.tie||[])])if(!isFinite(v))bad('non-finite position '+r.w);}
   const p=M.prev;
   if(p&&p.cut===cur.cut&&!p.split&&!cur.split){const dt=cur.t-p.t;
     cur.rigs.forEach((r,i)=>{const q=p.rigs[i];if(r.hidden||q.hidden||!r.d||!q.d||r.mode==='fall'||q.mode==='fall')return;
       // figure jumps: the drawn body's centre moving more than a body's normal per-frame motion
       const ft=/^feet:/.test(r.d.kind)&&/^feet:/.test(q.d.kind),dx=ft?r.d.fx-q.d.fx:r.d.cx-q.d.cx,dy=ft?r.d.fy-q.d.fy:r.d.cy-q.d.cy,j=Math.hypot(dx,dy),lim=6+120*dt;if(r.d.kind==='mantle'&&q.d.kind==='mantle')return;
       if(j>lim)bad(`jump ${r.w} ${j.toFixed(1)}px  ${q.mode}/${q.d.kind}/${q.art} -> ${r.mode}/${r.d.kind}/${r.art}`);
       if(r.tie&&q.tie&&!FX.camp){const tj=Math.hypot(r.tie[0]-q.tie[0],r.tie[1]-q.tie[1]);if(tj>lim+4)bad(`tie jump ${r.w} ${tj.toFixed(1)}px ${q.art}->${r.art}`);}});
     if(p.camY!=null&&Math.abs(cur.camY-p.camY)>40)bad('camera jump '+(cur.camY-p.camY).toFixed(0));}
   // both should be on screen unless split / hidden / at camp
   if(!cur.split&&!FX.camp&&FX.cam){const ah=FX.aS.h,top=FX.cam.y-(FX.cam.my-FX.aS.y);for(const r of FX.rigs){if(r.hidden)continue;const y=r.N.y;if(y<top-10||y>top+ah+60)bad('off screen '+r.L.art.who+' y'+y.toFixed(0)+' view '+top.toFixed(0)+'..'+(top+ah).toFixed(0));}}
   M.prev=cur;}catch(e){M.log.push({at:-1,msg:'monitor '+e.message});}};
 window.requestAnimationFrame=cb=>orig(ts=>{cb(ts);check();});
})();
