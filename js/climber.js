"use strict";
/* ============================== THE CLIMBER: PROFILE, LEADERBOARDS, DAILY CLIMB, KIT ==============================
   The profile is the climber's own, across every rope team they climb with: summits, stars won on each mountain,
   maps collected, best times and daily climbs. It's kept on the device, and on the account when signed in (merged,
   so two devices never undo each other). Each summit is counted once, by the team and the expedition.

   Leaderboards: the fastest three-star ascent of each mountain, by rope team, all-time (lb/<mountain>/<team>) and
   this week (lbw/<week>/<mountain>/<team>); and each day's daily climb (lbd/<day>/<team>), fastest to the top.

   The kit: rope colours and summit flags, won by collecting maps and stars, and the lucky charm (three maps), which
   forgives one fall a climb. The team's choice is kept on the team (t.look), so both climbers see the same rope. */

/* ---------- profile ---------- */
function profile(){const p=LS.get("profile",null)||{};
  for(const k of ["peaks","maps","seen","daily","started","runs"])p[k]=p[k]&&typeof p[k]==="object"?p[k]:{};return p;}
function profMerge(a,b){const o={peaks:{},maps:{},seen:{},daily:{},started:{},runs:{}};
  for(const P of [a,b]){if(!P)continue;
    Object.assign(o.seen,P.seen||{});Object.assign(o.maps,P.maps||{});Object.assign(o.started,P.started||{});Object.assign(o.runs,P.runs||{});
    for(const [k,v] of Object.entries(P.peaks||{})){const m=o.peaks[k]||{g:0};o.peaks[k]={g:(m.g|v.g)||0,...((m.ms||v.ms)?{ms:Math.min(m.ms||Infinity,v.ms||Infinity)}:{})};}
    for(const [k,v] of Object.entries(P.daily||{})){const m=o.daily[k];if(!m||(v.ms&&v.ms<m.ms))o.daily[k]=v;}}
  return o;}
function profSave(p){LS.set("profile",p);
  if(typeof acctNamed==="function"&&acctNamed())fb.put("users/"+ACCT.user.uid+"/profile",p).catch(()=>{});}
// (signing in: the account's profile and this device's become one)
async function profSync(uid){try{const r=await fb.get("users/"+uid+"/profile");const p=profMerge(profile(),r);LS.set("profile",p);await fb.put("users/"+uid+"/profile",p);}catch(e){}}
const profSummits=p=>Object.keys(p.seen).length;
function profNumbers(p){const runs=Object.values(p.runs),sum=k=>runs.reduce((a,r)=>a+(r[k]||0),0),summits=profSummits(p);
  const played=Math.max(Object.keys(p.started).length,summits),best=runs.reduce((a,r)=>Math.max(a,r.pts||0),0);
  const fastest=Object.values(p.peaks).reduce((a,v)=>v.ms&&v.ms<a?v.ms:a,Infinity),q=sum("q");
  return {played,summits,unfinished:Math.max(0,played-summits),rate:played?Math.round(100*summits/played):0,best:runs.length?best:null,
    fastest:fastest<Infinity?fastest:null,stars:profStars(p),maps:Object.keys(p.maps).length,daily:Object.keys(p.daily).length,
    q,acc:q?Math.round(100*sum("right")/q):null,falls:sum("falls")};}
const profStars=p=>Object.values(p.peaks).reduce((a,v)=>a+popc(v.g||0),0);

// a summit, seen by one of its climbers: into the profile, once, and onto the leaderboards
function climberSeen(t){const r=t.round,e=t.exp;if(TV()||!t.members[S.uid]||!e||!e.m)return;
  // (a climb counts as played once its first question is up)
  {const k=`${t.code||S.code}:${e.n}`;if(r.phase==="answer"){const p=profile();if(!p.started[k]){p.started[k]=Date.now();profSave(p);}}}
  const top=r.phase==="summit"||(r.phase==="reveal"&&r.result?.arrived==="summit");if(!top||!e.run||e.run.g==null)return;
  const key=`${t.code||S.code}:${e.n}`,p=profile();if(p.seen[key])return;
  const run=e.run;p.started[key]=p.started[key]||Date.now();
  p.runs[key]={q:run.q||0,right:run.right||0,falls:run.falls||0,pts:run.pts??0,ms:run.ms||0,m:e.m,g:run.g,at:Date.now()};
  if(e.daily){p.seen[key]="@"+e.daily;const d=p.daily[e.daily];if(!d||(run.ms&&run.ms<d.ms))p.daily[e.daily]={ms:run.ms||0,g:run.g,right:run.right||0,q:run.q||0};}
  else{p.seen[key]=e.m;const m=p.peaks[e.m]||{g:0};p.peaks[e.m]={g:m.g|run.g,...((m.ms||run.ms)?{ms:Math.min(m.ms||Infinity,run.ms||Infinity)}:{})};
    const M=MT(e);if(M.final)p.maps[M.map]=1;}
  profSave(p);lbSubmit(t);}

/* ---------- leaderboards ---------- */
const weekOf=(ms=Date.now())=>"w"+Math.floor((ms/864e5+3)/7); // (weeks start on Monday, UTC)
async function lbPut(path,entry){try{const old=await fb.get(path);if(old&&old.ms&&old.ms<=entry.ms)return;await fb.put(path,entry);delete LBC[path.split("/").slice(0,-1).join("/")];}catch(e){}}
function lbSubmit(t){const e=t.exp,run=e.run,code=t.code||S.code;if(!run||!run.ms||!/^[A-Z0-9]{6}$/.test(code))return;
  const entry={name:String(t.name||"Rope team").slice(0,40),ms:Math.round(run.ms),at:Date.now()};
  if(e.daily){lbPut(`lbd/${e.daily}/${code}`,{...entry,right:run.right||0,q:run.q||0});return;}
  if(run.g!==7)return;
  lbPut(`lb/${e.m}/${code}`,entry);lbPut(`lbw/${weekOf()}/${e.m}/${code}`,entry);}
// the top of a board: fastest first. (A query on the real database; the test database is small, so it's sorted here)
const LBC={};
async function lbTop(path,n=10){const c=LBC[path];if(c&&Date.now()-c.at<60000)return c.rows;
  let v;if(window.TEST)v=await fb.get(path);
  else{await acctWait();const q=`orderBy=%22ms%22&limitToFirst=${n}`+(ACCT.token?`&auth=${encodeURIComponent(ACCT.token)}`:"");
    const r=await fetch(`${FB}/${path}.json?${q}`);if(!r.ok)throw new Error("lb "+r.status);v=await r.json();}
  const rows=Object.entries(v||{}).filter(([k,x])=>x&&x.ms>0).map(([k,x])=>({code:k,...x})).sort((a,b)=>a.ms-b.ms).slice(0,n);
  LBC[path]={at:Date.now(),rows};return rows;}
function lbRows(rows,empty){if(!rows)return `<p class="note">Loading…</p>`;if(!rows.length)return `<p class="note">${empty}</p>`;
  return `<ol class="lbl">${rows.map((x,i)=>`<li class="${x.code===S.code?"me":""}"><i>${i+1}</i><b>${esc(x.name)}</b><span>${fmtDur(x.ms)}</span></li>`).join("")}</ol>`;}
// fill a board in place: from what's known at once, then again when the fresh one arrives (if it's still on screen)
function lbFill(el,path,empty){if(!el)return;const c=LBC[path];el.innerHTML=lbRows(c&&c.rows,empty);el.dataset.path=path;
  lbTop(path,8).then(rows=>{if(el.isConnected&&el.dataset.path===path)el.innerHTML=lbRows(rows,empty);})
    .catch(()=>{if(el.isConnected&&el.dataset.path===path)el.innerHTML=`<p class="note">Couldn't load the leaderboard.</p>`;});}

/* ---------- the kit: rope colours, summit flags, the lucky charm ---------- */
const ROPES=[{id:"orange",name:"Orange",maps:0,c:{l:"#ffc27a",m:"#e8792b",s:"#b3521a"}},{id:"blue",name:"Glacier blue",maps:1,c:{l:"#a8d4ff",m:"#3c86e0",s:"#1f4f96"}},
  {id:"green",name:"Moss green",maps:2,c:{l:"#bdf08e",m:"#4caf3c",s:"#2a6e22"}},{id:"violet",name:"Violet",maps:4,c:{l:"#e2b6ff",m:"#9a4ee0",s:"#5c2496"}},
  {id:"gold",name:"Gold",maps:6,c:{l:"#fff0a0",m:"#f2c233",s:"#a87a10"}}];
const FLAGS=[{id:"red",name:"Red",stars:0,c:"#d23c2a"},{id:"blue",name:"Blue",stars:12,c:"#3c78d8"},{id:"green",name:"Green",stars:30,c:"#3caa5a"},{id:"gold",name:"Gold",stars:60,c:"#f2b233"}];
function starsGot(t){const team=Object.keys(t.stats?.peaks||{}).reduce((a,k)=>a+starsOf(t,k),0);return Math.max(team,profStars(profile()));}
const ropeOf=t=>ROPES.find(x=>x.id===t?.look?.rope)||ROPES[0],flagOf=t=>FLAGS.find(x=>x.id===t?.look?.flag)||FLAGS[0];
async function setLook(part,val){if(TV()||!S.code)return;sfx("pop");try{await fb.patch(`teams/${S.code}/look`,{[part]:val});}catch(e){toast("Couldn't save that.");}}

/* ---------- on the map: the daily climb and the kit, two buttons at the top, each opening a card ---------- */
function toolsHtml(t){if(TV())return "";const day=dayOf(),done=(t.stats?.daily||{})[day];
  return `<button class="wtool ${S.mapPop==="@daily"?"on":""}" data-k="@daily">${ICON.flag}<span>Daily climb</span>${done?"":`<i class="dot"></i>`}</button>
    <button class="wtool ${S.mapPop==="@kit"?"on":""}" data-k="@kit">${ICON.hook}<span>Kit</span></button>
    <button class="wtool" data-k="@char"><img class="wtface" src="${typeof portrait==="function"?portrait(lookOf(t,S.uid)):""}" alt=""><span>Climber</span></button>`;}
function wireTools(el){el.querySelectorAll(".wtool").forEach(b=>b.onclick=e=>{e.stopPropagation();sfx("pop");
  if(b.dataset.k==="@char"){S.charOpen=true;CS.view=null;S.mapPop=null;charScreen(S.team,true);return;}S.mapPop=S.mapPop===b.dataset.k?null:b.dataset.k;S.worldKey=null;renderWorld(S.team);});}
function toolPopHtml(t,k){
  if(k==="@daily"){const day=dayOf(),m=MOUNTAINS[dailyMtn(day)],done=(t.stats?.daily||{})[day],ids=memberIds(t),v=t.round.votes||{},pid=partnerId(t);
    const lead=ids.length<2||leaderOf(t)===S.uid||leaderOf(t)===SIM||(pid&&v[pid]?.mtn==="@daily"),mine=v[S.uid]?.mtn==="@daily";
    const e=Object.assign(newExp(1),{m:dailyMtn(day),daily:day,choice:DAILY.route.slice()});
    return `<div class="wphead"><b>Daily climb</b><button class="ibtn wpx" type="button" aria-label="Close">${ICON.x}</button></div>
      <small>${new Date(day+"T12:00:00Z").toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})} · ${esc(m.name)}</small>
      <p>One short route, the same for every team today: ${total(e)} pitches, the same questions in the same order. The fastest to the top leads.</p>
      ${done?`<div class="result good">${ICON.flag}<div><b>Climbed today in ${fmtDur(done.ms)}</b><span>${done.right}/${done.q} right. A new route tomorrow.</span></div></div>`
        :lead?`<button class="btn rope" id="dailyGo">Set off on the daily climb</button>`:mine?`<p class="note">Waiting for ${esc(nameOf(pid))} to choose it too.</p>`:`<button class="btn rope" id="dailyPick">Choose the daily climb</button>`}
      <div class="clabel">Today's fastest</div><div class="lbbox" id="lbDaily"></div>`;}
  if(k==="@kit"){const maps=mapsGot(t),stars=starsGot(t),rp=ropeOf(t),fl=flagOf(t);
    const sw=(list,cur,part,need,col)=>list.map(x=>{const ok=need(x)===true;return `<button class="kitsw ${x.id===cur.id?"on":""}" data-part="${part}" data-id="${x.id}" ${ok?"":"disabled"} title="${esc(x.name)}${ok?"":" · "+need(x)}" aria-label="${esc(x.name)}${ok?"":", "+need(x)}"><i style="background:${col(x)}"></i>${ok?"":ICON.lock||""}</button>`;}).join("");
    return `<div class="wphead"><b>Kit</b><button class="ibtn wpx" type="button" aria-label="Close">${ICON.x}</button></div>
      <small>${maps} of ${MAPS.length} maps · ${stars} stars</small>
      <div class="clabel">Rope · ${esc(rp.name)}</div><div class="kitrow">${sw(ROPES,rp,"rope",x=>maps>=x.maps||`collect ${x.maps} map${x.maps>1?"s":""}`,x=>x.c.m)}</div>
      <div class="clabel">Summit flag · ${esc(fl.name)}</div><div class="kitrow">${sw(FLAGS,fl,"flag",x=>stars>=x.stars||`win ${x.stars} stars`,x=>x.c)}</div>
      <div class="clabel">Lucky charm</div>
      ${charmOK(t)?`<label class="kitcharm"><input type="checkbox" id="charmTgl" ${t.look?.charm?"checked":""}><span>Carry it: once a climb, a fall is forgiven.</span></label>`
        :`<p class="note">Collect ${CHARM_MAPS} maps to win it: once a climb, it forgives a fall.</p>`}`;}
  return "";}
function wireToolPop(el,k){
  el.querySelector("#dailyGo")?.addEventListener("click",()=>{S.mapPop=null;chooseDaily();});
  el.querySelector("#dailyPick")?.addEventListener("click",()=>{sfx("pop");campVote("mtn","@daily");});
  if(k==="@daily")lbFill(el.querySelector("#lbDaily"),`lbd/${dayOf()}`,"No one has climbed it yet today. Be the first.");
  el.querySelectorAll(".kitsw").forEach(b=>b.onclick=()=>setLook(b.dataset.part,b.dataset.id));
  el.querySelector("#charmTgl")?.addEventListener("change",e=>setLook("charm",e.target.checked));}

/* ---------- the profile, on the title screen ---------- */
function profileHtml(){const p=profile(),n=profSummits(p),st=profStars(p),best=Object.entries(p.peaks).filter(([k,v])=>MOUNTAINS[k]&&v.ms&&popc(v.g)===3).sort((a,b)=>a[1].ms-b[1].ms).slice(0,5);
  const days=Object.keys(p.daily).length,cell=(k,v)=>`<div class="scell"><b>${v}</b><span>${k}</span></div>`;
  return `<div class="sgrid p4">${cell("Summits",n)}${cell("Stars",`${st}/${Object.keys(MOUNTAINS).length*3}`)}${cell("Maps",`${Object.keys(p.maps).length}/${MAPS.length}`)}${cell("Daily climbs",days)}</div>
    <div class="clabel">Maps collected</div><div class="pmaps">${MAPS.map((M,i)=>`<span class="${p.maps[i]?"on":""}">${ICON.flag}<b>${esc(M.name)}</b></span>`).join("")}</div>
    <div class="clabel">Best three-star ascents</div>
    ${best.length?`<ol class="lbl">${best.map(([k,v],i)=>`<li><i>${i+1}</i><b>${esc(MOUNTAINS[k].name)}</b><span>${fmtDur(v.ms)}</span></li>`).join("")}</ol>`:`<p class="note">Climb a mountain with no falls and no hooks to set one.</p>`}
    <p class="note">${typeof acctNamed==="function"&&acctNamed()?"Saved to your account.":"Kept on this device. Sign in to keep it on every device."}</p>`;}

/* ---------- choosing your climber ----------
   Each climber picks who they climb as (members[id].char); two on a rope can't both be the same one. Until they
   choose, player one is the lumberjack and player two the explorer. The choice shows on the map (a button at the top)
   and opens by itself the first time a climber reaches the map without having chosen. */
// (the two new ones are drawn over the first two's frames, in the same poses: js/scene.js gives them those two's measurements)
const CHARS=[{id:"lumberjack",name:"Birch",desc:"Red beanie, plaid shirt and a beard you could get lost in."},
  {id:"woman",name:"Juniper",desc:"Bobble hat, orange jacket and a scarf against the wind."},
  {id:"modcut",name:"Onyx",base:"lumberjack",desc:"A pitch-black mod cut and his navy track jacket."},
  {id:"redcat",name:"Ember",base:"woman",desc:"Fiery red hair and bangs, with Ash, her grey cat, on her shoulder."}];
const CHAR_DEFAULT=["lumberjack","woman"];
function charOf(t,id){const ids=memberIds(t),i=Math.max(0,ids.indexOf(id)),m=t.members[id]||{},o=ids.find(x=>x!==id),om=o&&t.members[o]?.char;
  let c=CHARS.some(x=>x.id===m.char&&!x.soon)?m.char:CHAR_DEFAULT[i]||CHAR_DEFAULT[0];
  // (if both ended up the same, the second in the team takes the first one free)
  if(o&&i>0&&c===(CHARS.some(x=>x.id===om)?om:CHAR_DEFAULT[1-i]))c=CHARS.find(x=>!x.soon&&x.id!==c&&x.id!==(om||CHAR_DEFAULT[0]))?.id||c;
  return c;}
async function pickChar(id){if(!S.code||TV())return;sfx("pop");
  try{await fb.patch(`teams/${S.code}/members/${S.uid}`,{char:id});LS.set("char",id);}catch(e){toast("Couldn't save your climber.");}}
/* the climber select: one climber at a time on a lit stage (breathing, in their own idle frames), arrows and a swipe
   to go through them, the roster below (faces), and the partner's pick marked and locked. A pick is saved at once. */
const CS={view:null,frame:0,timer:0};
function charFace(id){return asset(`assets/climbers/${id}/south.png`);}
function charScreen(t,open){let el=$("#charPick");
  if(!open||!t||TV()){if(el)el.remove();clearInterval(CS.timer);CS.timer=0;S.charOpen=false;return;}
  const mine=charOf(t,S.uid),pid=partnerId(t),theirs=pid&&charOf(t,pid),list=CHARS.filter(c=>!c.soon);
  if(!CS.view||!list.some(c=>c.id===CS.view))CS.view=mine;
  const v=list.find(c=>c.id===CS.view)||list[0],taken=c=>pid&&c.id===theirs,key=[mine,theirs,pid&&nameOf(pid),v.id].join("|");
  if(!el){el=document.createElement("div");el.id="charPick";el.className="gscreen charpick";el.setAttribute("role","dialog");el.setAttribute("aria-label","Choose your climber");
    el.innerHTML=`<div class="gs-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="cs-wrap"><div class="gs-eyebrow">Choose your climber</div>
        <div class="cs-stage"><button class="cs-arrow l" type="button" aria-label="Previous climber">◀</button>
          <div class="cs-hero"><div class="cs-glow" aria-hidden="true"></div><div class="cs-ped" aria-hidden="true"></div><img class="cs-fig" alt=""><div class="cs-burst" aria-hidden="true"></div></div>
          <button class="cs-arrow r" type="button" aria-label="Next climber">▶</button></div>
        <div class="cs-name"></div><div class="cs-sub"></div>
        <div class="cs-roster" role="listbox" aria-label="Climbers"></div>
        <button class="btn rope cs-go" id="cpDone">Let's climb</button></div>`;
    document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add("in"));
    const step=d=>{const L=CHARS.filter(c=>!c.soon);let k=L.findIndex(c=>c.id===CS.view);for(let n=0;n<L.length;n++){k=(k+d+L.length)%L.length;if(!(partnerId(S.team)&&L[k].id===charOf(S.team,partnerId(S.team))))break;}
      CS.view=L[k].id;sfx("pop");pickChar(CS.view);el.dataset.dir=d>0?"r":"l";charScreen(S.team,true);};
    el.querySelector(".cs-arrow.l").onclick=()=>step(-1);el.querySelector(".cs-arrow.r").onclick=()=>step(1);
    el.querySelector("#cpDone").onclick=()=>{sfx("pop");S.charOpen=false;S.charSeen=true;el.classList.remove("in");setTimeout(()=>charScreen(null,false),220);};
    el.onkeydown=e=>{if(e.key==="ArrowLeft")step(-1);else if(e.key==="ArrowRight")step(1);else if(e.key==="Escape"||e.key==="Enter")el.querySelector("#cpDone").click();};
    let sx=null;el.querySelector(".cs-stage").addEventListener("pointerdown",e=>{sx=e.clientX;});
    el.querySelector(".cs-stage").addEventListener("pointerup",e=>{if(sx!=null&&Math.abs(e.clientX-sx)>40)step(e.clientX<sx?1:-1);sx=null;});
    // (the climber on show breathes: their own idle frames, over and over)
    CS.timer=setInterval(()=>{const f=el.querySelector(".cs-fig");if(!f||!CS.view)return;CS.frame=(CS.frame+1)%4;f.src=asset(`assets/climbers/${CS.view}/idle/${CS.frame}.png`);},260);
    setTimeout(()=>el.querySelector("#cpDone")?.focus({preventScroll:true}),60);}
  if(el.dataset.key===key)return;const was=el.dataset.view;el.dataset.key=key;el.dataset.view=v.id;
  const fig=el.querySelector(".cs-fig");fig.src=asset(`assets/climbers/${v.id}/idle/${CS.frame}.png`);fig.alt=v.name;
  if(was&&was!==v.id){const h=el.querySelector(".cs-hero");h.classList.remove("swap","l","r");void h.offsetWidth;h.classList.add("swap",el.dataset.dir||"r");}
  el.querySelector(".cs-name").textContent=v.name;
  el.querySelector(".cs-sub").innerHTML=v.id===mine?`<span class="me">You</span>`:"";
  el.querySelector(".cs-roster").innerHTML=list.map(c=>`<button class="cs-tile ${c.id===mine?"on":""} ${taken(c)?"taken":""}" role="option" aria-selected="${c.id===mine}" data-id="${c.id}" ${taken(c)?"disabled":""} aria-label="${esc(c.name)}${taken(c)?`, ${esc(nameOf(pid))}'s pick`:""}">
      <span class="cs-face" style="background-image:url('${charFace(c.id)}')"></span><b>${esc(c.name)}</b>${taken(c)?`<em>${esc(ptag(t,pid))}</em>`:c.id===mine?`<em class="me">${esc(ptag(t,S.uid))}</em>`:""}</button>`).join("");
  el.querySelectorAll(".cs-tile").forEach(b=>b.onclick=()=>{if(b.dataset.id===CS.view)return;el.dataset.dir=list.findIndex(c=>c.id===b.dataset.id)>list.findIndex(c=>c.id===CS.view)?"r":"l";CS.view=b.dataset.id;pickChar(CS.view);charScreen(S.team,true);});
  if(was!==v.id){const bu=el.querySelector(".cs-burst");bu.classList.remove("go");void bu.offsetWidth;bu.classList.add("go");}}
// (called on every render: open it the first time a climber without a choice reaches the map; keep it up to date)
function charCheck(t){const me=t.members[S.uid];if(!me||TV()){charScreen(null,false);return;}
  if(t.round.phase==="map"&&!me.char&&!S.charSeen&&!S.charOpen){S.charOpen=true;CS.view=null;
    // (a choice made on this device before joins a new team with it)
    const was=LS.get("char",null),pid=partnerId(t);if(was&&CHARS.some(c=>c.id===was&&!c.soon)&&!(pid&&charOf(t,pid)===was))pickChar(was);}
  if(S.charOpen&&t.round.phase!=="map")S.charOpen=false;
  charScreen(t,S.charOpen);}

/* ---------- the profile panel: the account and the climber's numbers ----------
   Opened from the account button in the corner (and Profile in the menu). Same stage as the climber select: the
   climber they last chose as the avatar, their name and account, and tiles of numbers. A climb played is one whose
   first question came up; a summit is a win; one not (yet) finished counts as unfinished. */
// (a time as a clock: 5:12, or 1:02:09 past an hour)
const clockOf=ms=>{const t=Math.round(ms/1000),h=Math.floor(t/3600),m=Math.floor(t/60)%60,x=String(t%60).padStart(2,"0");return h?`${h}:${String(m).padStart(2,"0")}:${x}`:`${m}:${x}`;};
function myChar(){const t=S.team;if(t&&t.members[S.uid])return charOf(t,S.uid);const c=LS.get("char",null);return CHARS.some(x=>x.id===c&&!x.soon)?c:"lumberjack";}
function openProfile(){sfx("pop");let el=$("#profPanel");if(el)el.remove();
  const p=profile(),N=profNumbers(p),named=typeof acctNamed==="function"&&acctNamed(),u=named?ACCT.user:null,ch=CHARS.find(c=>c.id===myChar());
  const since=u&&u.metadata&&u.metadata.creationTime?new Date(u.metadata.creationTime).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"";
  const best=Object.entries(p.peaks).filter(([k,v])=>MOUNTAINS[k]&&v.ms&&popc(v.g)===3).sort((a,b)=>a[1].ms-b[1].ms).slice(0,5);
  const tile=(lab,val,cls="")=>`<div class="pf-tile ${cls}"><b>${val}</b><span>${lab}</span></div>`;
  el=document.createElement("div");el.id="profPanel";el.className="gscreen profpanel";el.setAttribute("role","dialog");el.setAttribute("aria-label","Your profile");
  el.innerHTML=`<div class="gs-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
   <div class="pf-wrap"><button class="ibtn pf-x" type="button" aria-label="Close">${ICON.x}</button>
    <div class="gs-eyebrow">${named?"Your profile":"Guest climber"}</div>
    <div class="pf-head"><div class="pf-av"><div class="cs-glow" aria-hidden="true"></div><img src="${charFace(ch.id)}" alt="${esc(ch.name)}">${named?`<i class="pf-dot" title="Signed in"></i>`:""}</div>
      <div class="pf-id"><div class="pf-name">${esc(S.myName||(u&&u.displayName)||"Climber")}</div>
        <div class="pf-meta">${named?`${esc(u.email||"Google account")}${since?` · since ${esc(since)}`:""}`:"Playing as a guest on this device"}</div>
        <div class="pf-meta">Climbs as <b>${esc(ch.name)}</b></div></div></div>
    <div class="pf-grid">
      ${tile("Climbs played",N.played)}${tile("Summits",N.summits,"good")}${tile("Unfinished",N.unfinished)}
      ${tile("Summit rate",N.played?N.rate+"%":"–")}${tile("Best score",N.best!=null?N.best:"–","gold")}${tile("Fastest summit",N.fastest?clockOf(N.fastest):"–")}
      ${tile("Stars",`${N.stars}<small>/${Object.keys(MOUNTAINS).length*3}</small>`,"gold")}${tile("Maps",`${N.maps}<small>/${MAPS.length}</small>`)}${tile("Daily climbs",N.daily)}
      ${tile("Questions",N.q)}${tile("Right",N.acc!=null?N.acc+"%":"–","good")}${tile("Falls",N.falls)}</div>
    <div class="gs-label">Best three-star ascents</div>
    ${best.length?`<ol class="lbl">${best.map(([k,v],i)=>`<li><i>${i+1}</i><b>${esc(MOUNTAINS[k].name)}</b><span>${fmtDur(v.ms)}</span></li>`).join("")}</ol>`:`<p class="note">Climb a mountain with no falls and no hooks to set one.</p>`}
    <div class="pf-acts">${named?`<button class="btn ghost" id="pfOut">Sign out</button>`:`<button class="btn rope" id="pfIn">Sign in to save progress</button>`}<button class="btn" id="pfClose">Close</button></div>
    <p class="note pf-foot">${named?"Saved to your account, on every device.":"Kept on this device only until you sign in."}</p></div>`;
  document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add("in"));
  const close=()=>{el.classList.remove("in");setTimeout(()=>el.remove(),220);};
  el.querySelector(".pf-x").onclick=close;el.querySelector("#pfClose").onclick=close;el.onclick=e=>{if(e.target===el)close();};
  el.onkeydown=e=>{if(e.key==="Escape")close();};setTimeout(()=>el.querySelector("#pfClose")?.focus({preventScroll:true}),60);
  el.querySelector("#pfOut")?.addEventListener("click",()=>{close();acctSignOut();});
  el.querySelector("#pfIn")?.addEventListener("click",()=>{close();if(S.code&&typeof goLobby==="function")goLobby();setTimeout(()=>document.querySelector('.pbtn[data-id="secAcct"]')?.click(),S.code?300:0);});}
