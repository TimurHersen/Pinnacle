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
  for(const k of ["peaks","maps","seen","daily"])p[k]=p[k]&&typeof p[k]==="object"?p[k]:{};return p;}
function profMerge(a,b){const o={peaks:{},maps:{},seen:{},daily:{}};
  for(const P of [a,b]){if(!P)continue;
    Object.assign(o.seen,P.seen||{});Object.assign(o.maps,P.maps||{});
    for(const [k,v] of Object.entries(P.peaks||{})){const m=o.peaks[k]||{g:0};o.peaks[k]={g:(m.g|v.g)||0,...((m.ms||v.ms)?{ms:Math.min(m.ms||Infinity,v.ms||Infinity)}:{})};}
    for(const [k,v] of Object.entries(P.daily||{})){const m=o.daily[k];if(!m||(v.ms&&v.ms<m.ms))o.daily[k]=v;}}
  return o;}
function profSave(p){LS.set("profile",p);
  if(typeof acctNamed==="function"&&acctNamed())fb.put("users/"+ACCT.user.uid+"/profile",p).catch(()=>{});}
// (signing in: the account's profile and this device's become one)
async function profSync(uid){try{const r=await fb.get("users/"+uid+"/profile");const p=profMerge(profile(),r);LS.set("profile",p);await fb.put("users/"+uid+"/profile",p);}catch(e){}}
const profSummits=p=>Object.keys(p.seen).length;
const profStars=p=>Object.values(p.peaks).reduce((a,v)=>a+popc(v.g||0),0);

// a summit, seen by one of its climbers: into the profile, once, and onto the leaderboards
function climberSeen(t){const r=t.round,e=t.exp;if(TV()||!t.members[S.uid]||!e||!e.m)return;
  const top=r.phase==="summit"||(r.phase==="reveal"&&r.result?.arrived==="summit");if(!top||!e.run||e.run.g==null)return;
  const key=`${t.code||S.code}:${e.n}`,p=profile();if(p.seen[key])return;
  const run=e.run;
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
    <button class="wtool ${S.mapPop==="@kit"?"on":""}" data-k="@kit">${ICON.hook}<span>Kit</span></button>`;}
function wireTools(el){el.querySelectorAll(".wtool").forEach(b=>b.onclick=e=>{e.stopPropagation();sfx("pop");S.mapPop=S.mapPop===b.dataset.k?null:b.dataset.k;S.worldKey=null;renderWorld(S.team);});}
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
