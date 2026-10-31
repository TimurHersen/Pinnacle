/* Shared storage: Pinnacle's own Firebase Realtime Database (access rules live in database.rules.json). */
const FB="https://pinnacle-5f36a-default-rtdb.europe-west1.firebasedatabase.app";
const S={uid:null,myName:"",code:null,team:null,answers:{},names:{},online:new Set(),pres:{},local:{},
  unsubTeam:null,unsubAns:null,unsubPres:null,presTimer:null,ansRound:null,resolving:false,acting:false,
  myTeams:[],panelKey:null,sample:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const fmt=n=>Math.round(n).toLocaleString("en-US").replace(/,/g," ");
// an art file's address at the page's version (see index.html), so new art is fetched fresh after an update
const asset=p=>window.V?`${p}?${window.V}`:p;
// a crevasse number as written: a bare count or year (no unit) without the thousands space, so 1523 never reads "1 523"
const qnum=(n,q)=>q&&!q.u?String(Math.round(n)):fmt(n);
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
// in the order they joined, so whoever made the team is player 1
const memberIds=t=>{const m=t.members||{};return Object.keys(m).sort((a,b)=>(m[a].joined||0)-(m[b].joined||0)||(a<b?-1:a>b?1:0));};
function nameOf(id){if(id===S.uid)return "You";return S.names[id]||"Partner";}
function partnerId(t){return memberIds(t).find(i=>i!==S.uid);}
const LS={get(k,d){try{const v=localStorage.getItem("pinnacle."+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem("pinnacle."+k,JSON.stringify(v));}catch(e){}}};

/* Firebase REST + streaming (EventSource) — no SDK needed */
const fb={
  url:p=>`${FB}/${p}.json`,
  async get(p){const r=await fetch(fb.url(p));if(!r.ok)throw new Error("get "+r.status);return r.json();},
  async getTagged(p){
    try{const r=await fetch(fb.url(p),{headers:{"X-Firebase-ETag":"true"}});if(!r.ok)throw 0;return {val:await r.json(),etag:r.headers.get("ETag")};}
    catch(e){return {val:await fb.get(p),etag:null};}},
  async put(p,v,etag){const h={"Content-Type":"application/json"};if(etag)h["if-match"]=etag;
    const r=await fetch(fb.url(p),{method:"PUT",headers:h,body:JSON.stringify(v)});
    if(r.status===412)return false;if(!r.ok)throw new Error("put "+r.status);return true;},
  async patch(p,v){const r=await fetch(fb.url(p),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(v)});if(!r.ok)throw new Error("patch "+r.status);},
  del(p){return fetch(fb.url(p),{method:"DELETE"}).catch(()=>{});},
  listen(p,cb){
    let tree=null;const es=new EventSource(fb.url(p));
    const isObj=x=>x&&typeof x==="object";
    const apply=(ev,isPatch)=>{let d;try{d=JSON.parse(ev.data);}catch(e){return;}if(!d||typeof d.path!=="string")return;
      const parts=d.path.split("/").filter(Boolean);
      if(!parts.length&&!isPatch){tree=d.data;}
      else{
        if(!isObj(tree))tree={};let o=tree;
        const keys=isPatch?parts:parts.slice(0,-1);
        for(const k of keys){if(!isObj(o[k]))o[k]={};o=o[k];}
        if(isPatch){for(const [k,v] of Object.entries(d.data||{})){if(v===null)delete o[k];else o[k]=v;}}
        else{const k=parts[parts.length-1];if(d.data===null)delete o[k];else o[k]=d.data;}
      }
      cb(tree==null?null:clone(tree));};
    es.addEventListener("put",e=>apply(e,false));
    es.addEventListener("patch",e=>apply(e,true));
    return ()=>es.close();}
};
/* Firebase drops empty arrays/objects and nulls; restore the shape the game expects */
function fixTeam(t){
  if(!t||typeof t!=="object")return null;t=clone(t);
  t.members=t.members||{};t.log=Object.values(t.log||{});t.stats=t.stats||{};
  // a team saved under the old pitch types starts this quiz climb fresh at base camp
  if(!t.exp||t.exp.v!==2){t.exp=newExp((t.exp?.n||0)+1);t.round={id:(t.round?.id||0)+1,phase:"ready"};}
  const e=t.exp;const c=e.choice||{};e.choice=[c[0]||null,c[1]||null];
  e.used=Object.values(e.used||{});
  for(const k of ["pitch","anchor","rope","chalk","scout","anchors"])e[k]=e[k]||0;
  t.round=t.round||{id:0,phase:"ready"};t.round.id=t.round.id||0;t.round.votes=t.round.votes||{};
  for(const k of ["order","cut"])if(t.round[k])t.round[k]=Object.values(t.round[k]);
  return t;
}

/* ============================== ROUTE MATH ============================== */
function lens(exp){return [SEG0.length, exp.choice[0]?FORKS[0][exp.choice[0]].p.length:null, exp.choice[1]?FORKS[1][exp.choice[1]].p.length:null];}
function route(exp){let r=[...SEG0];if(exp.choice[0])r=r.concat(FORKS[0][exp.choice[0]].p);if(exp.choice[1])r=r.concat(FORKS[1][exp.choice[1]].p);return r;}
function total(exp){const L=lens(exp);return L[0]+(L[1]||0)+(L[2]||0);}
function campStops(exp){const L=lens(exp);const s=[L[0]];if(L[1])s.push(L[0]+L[1]);if(L[1]&&L[2])s.push(L[0]+L[1]+L[2]);return s;}
function altOf(exp,p){const L=lens(exp);
  if(p<=L[0])return ALT.base+(ALT.c1-ALT.base)*p/L[0];
  if(L[1]&&p<=L[0]+L[1])return ALT.c1+(ALT.c2-ALT.c1)*(p-L[0])/L[1];
  if(L[2])return ALT.c2+(ALT.top-ALT.c2)*(p-L[0]-L[1])/L[2];
  return ALT.c2;}
function needsChoice(exp){const L=lens(exp);
  if(exp.pitch===L[0]&&!exp.choice[0])return 0;
  if(L[1]&&exp.pitch===L[0]+L[1]&&!exp.choice[1])return 1;
  return -1;}
function nextStop(exp){const L=lens(exp);if(exp.pitch<L[0])return L[0];
  if(L[1]&&exp.pitch<L[0]+L[1])return L[0]+L[1];return total(exp);}
// an expedition: the pitch reached, the anchor a fall without a hook drops you to, and the team's gear (rope = hooks)
function newExp(n,prev){return {v:2,n,choice:[null,null],pitch:0,anchor:0,rope:3,chalk:1,scout:1,anchors:1,used:prev?prev.used.slice(-40):[]};}

/* ============================== QUESTION PICK ============================== */
// the pitch's question: from this mountain's pool at the pitch's difficulty (easy at the foot of the wall, hard just
// below camp), one the team hasn't had lately
const tierFor=p=>p<2?1:p<4?2:3;
function pickQuiz(p,used){const pool=QUIZ.filter(q=>q.tier===tierFor(p));let fresh=pool.filter(q=>!used.includes(q.id));
  if(!fresh.length)fresh=pool;return fresh[Math.floor(Math.random()*fresh.length)];}
const quizById=id=>QUIZ.find(q=>q.id===id);
// the four options in a fresh order for a round: order[i] is the option shown in slot i (option 0 is the right one)
function shuffled4(){const a=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const LETTERS="ABCD";

/* ============================== JUDGING ==============================
   The rope lock: both climbers lock an answer in secret, and the two are shown together. The leader's answer is the
   one that counts. If the two disagree the rope jerks, which costs a hook whoever was right. A right answer climbs
   one pitch. A wrong one (or none) falls: onto the hook if the team clipped one before the question, so they slip
   but keep their height; otherwise down to their last anchor or camp. */
function judge(t,ans){
  const r=t.round,ids=memberIds(t),right=r.order.indexOf(0),bel=ids.find(i=>i!==r.leader);
  const pick=id=>{const c=ans[id]?.choice;return typeof c==="number"&&c>=0&&c<4?c:null;};
  const L=pick(r.leader),B=bel?pick(bel):null;
  const o={right,lead:L,bel:B,correct:L===right,jerk:!!bel&&L!==null&&B!==null&&B!==L,move:0,fall:false,tone:"good"};
  if(o.correct){o.move=1;o.headline=o.jerk?"Right hold, but the rope jerked.":bel&&B===L?"In sync. Clean move.":"Clean move.";if(o.jerk)o.tone="warn";}
  else{o.fall=true;o.tone="bad";o.headline=L===null?"No answer. Off the wall!":"Wrong hold. Off the wall!";}
  return o;}
function applyOutcome(t,o){
  const exp=clone(t.exp),r=t.round,before=exp.pitch,beforeAlt=altOf(exp,before),q=quizById(r.qid);let moveText="";
  if(o.fall){
    if(r.hook){o.caught=true;o.tone="warn";moveText="Your hook held: you keep your height.";}
    else{exp.pitch=exp.anchor;const where=exp.anchor===0?"base camp":"your anchor";
      moveText=exp.pitch<before?`No hook clipped: fell ${Math.round(beforeAlt-altOf(exp,exp.pitch))} m to ${where}.`:`No hook clipped, but you were at ${where}.`;}}
  else{exp.pitch=Math.min(exp.pitch+1,total(exp));moveText=`Up ${Math.round(altOf(exp,exp.pitch)-beforeAlt)} m to ${fmt(altOf(exp,exp.pitch))} m.`;}
  if(o.jerk){if(exp.rope>0){exp.rope--;o.jerkCost=1;moveText+=" The rope jerk cost a hook.";}else moveText+=" The rope jerked.";}
  let arrived=null;if(exp.pitch>before&&exp.pitch>=total(exp)){arrived="Camp I";exp.anchor=exp.pitch;}
  const stats=clone(t.stats||{});stats.rounds=(stats.rounds||0)+1;if(o.jerk)stats.jerks=(stats.jerks||0)+1;
  if(o.correct&&!o.jerk&&o.bel!==null)stats.synced=(stats.synced||0)+1;if(o.fall&&!o.caught)stats.falls=(stats.falls||0)+1;
  // this expedition's own tally, for the end of the stage
  const run=exp.run={...(exp.run||{})};if(o.jerk)run.jerks=(run.jerks||0)+1;
  if(o.correct&&!o.jerk&&o.bel!==null)run.synced=(run.synced||0)+1;if(o.fall)run[o.caught?"slips":"falls"]=(run[o.caught?"slips":"falls"]||0)+1;
  const log=(t.log||[]).slice(-39);
  log.push({at:Date.now(),text:`P${before+1} ${q.cat}: ${o.headline}`});
  if(arrived)log.push({at:Date.now(),text:"Reached Camp I."});
  return {...t,exp,stats,log,round:{...r,phase:"reveal",result:{...o,moveText,arrived,from:before,to:exp.pitch},resolvedAt:Date.now()}};}


/* ============================== ACTIONS ============================== */
async function guarded(fn){
  if(S.acting)return;S.acting=true;
  try{
    for(let attempt=0;attempt<3;attempt++){
      const {val,etag}=await fb.getTagged("teams/"+S.code);const t=fixTeam(val);if(!t)return;
      const next=await fn(t);if(!next)return;
      if(await fb.put("teams/"+S.code,next,etag))return;
    }
  }catch(e){console.error(e);toast("Couldn't save that move. Check your connection and try again.");}
  finally{S.acting=false;}
}
// the next pitch: its question is drawn and its category shown, and the leader decides whether to clip a hook
// before seeing it (both talk it over). At the top of the stage the team is at camp instead.
function startPitch(t){
  const ids=memberIds(t),id=(t.round?.id||0)+1,exp=t.exp;
  if(exp.pitch>=total(exp))return {...t,round:{id,phase:"camp",votes:{}}};
  const q=pickQuiz(exp.pitch,exp.used);exp.used=[...exp.used,q.id].slice(-60);
  return {...t,exp,round:{id,phase:"pre",qid:q.id,leader:ids[id%ids.length]}};}
function advance(withAnchor){
  const rid=S.team.round.id;
  guarded(t=>{
    if(t.round.id!==rid)return null;
    // an anchor sets the height a fall without a hook drops you to
    if(withAnchor&&t.round.phase==="reveal"&&t.exp.anchors>0&&t.exp.anchor!==t.exp.pitch){
      t.exp.anchor=t.exp.pitch;t.exp.anchors--;
      t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Anchor placed at ${fmt(altOf(t.exp,t.exp.pitch))} m.`});}
    return startPitch(t);});
}
// the leader sets off on the pitch, with or without a hook clipped; the question and the clock start
function climbOn(hook){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid||t.round.phase!=="pre")return null;
    const h=!!hook&&t.exp.rope>0;if(h)t.exp.rope--;
    return {...t,round:{...t.round,phase:"answer",hook:h,order:shuffled4(),startedAt:Date.now(),dur:QUIZ_SECS}};});
}
// chalk: two wrong options crumble away, for both climbers
function useChalk(){
  const rid=S.team.round.id;
  guarded(t=>{const r=t.round;if(r.id!==rid||r.phase!=="answer"||r.cut||t.exp.chalk<=0)return null;
    const wrong=[0,1,2,3].filter(i=>r.order[i]!==0).sort(()=>Math.random()-.5).slice(0,2);
    t.exp.chalk--;return {...t,round:{...r,cut:wrong}};});
}
// the route scout: a hint that only the belayer sees (or the climber, alone on the rope)
function useScout(){
  const rid=S.team.round.id;
  guarded(t=>{const r=t.round;if(r.id!==rid||r.phase!=="answer"||r.scout||t.exp.scout<=0)return null;
    t.exp.scout--;return {...t,round:{...r,scout:true}};});
}
// at camp: everything is restocked, and the team picks one extra piece of gear (the leader confirms the vote)
const BONUS={hook:{name:"Extra hook",desc:"A fourth hook for the next stage."},chalk:{name:"Extra chalk",desc:"A second 50/50."},scout:{name:"Extra scout",desc:"A second hint for the belayer."}};
function campPick(k){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid||t.round.phase!=="camp"||!BONUS[k])return null;
    Object.assign(t.exp,{rope:3,chalk:1,scout:1,anchors:1});
    if(k==="hook")t.exp.rope=4;else t.exp[k]++;
    t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Rested at Camp I. Gear restocked, plus ${BONUS[k].name.toLowerCase()}.`});
    return {...t,round:{id:rid+1,phase:"stage",bonus:k}};});
}
function newExpedition(){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid)return null;
    t.exp=newExp((t.exp?.n||1)+1,t.exp);t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Expedition ${t.exp.n} begins at base camp.`});
    return {...t,round:{id:rid+1,phase:"ready"}};});
}
async function vote(choice){
  try{await fb.patch(`teams/${S.code}/round/votes`,{[S.uid]:choice});}catch(e){toast("Couldn't save your vote.");}
}
async function submit(payload){
  const r=S.team.round;if(r.phase!=="answer")return;
  try{await fb.put(`answers/${S.code}/${r.id}/${S.uid}`,{roundId:r.id,uid:S.uid,at:Date.now(),...payload});}
  catch(e){toast("Couldn't send your answer. Check your connection.");}
}
async function tryResolve(){
  if(S.resolving||!S.team)return;const rid=S.team.round.id;S.resolving=true;
  try{
    const {val,etag}=await fb.getTagged("teams/"+S.code);const t=fixTeam(val);
    if(!t||t.round.id!==rid||t.round.phase!=="answer")return;
    const ans=(await fb.get(`answers/${S.code}/${rid}`))||{};
    const ok=await fb.put("teams/"+S.code,applyOutcome(t,judge(t,ans)),etag);
    if(ok)fb.del(`answers/${S.code}/${rid-3}`);
  }catch(e){console.error(e);}
  finally{S.resolving=false;}
}


/* ============================== LOBBY ============================== */
function rememberTeam(code,name){
  S.myTeams=[{code,name},...S.myTeams.filter(x=>x.code!==code)].slice(0,12);LS.set("teams",S.myTeams);
}
function readName(){const el=$("#myname");const v=((el?el.value:S.myName)||"").trim().slice(0,24);if(v){S.myName=v;LS.set("name",v);}return v;}
function randCode(){const a="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
const inviteLink=code=>location.origin+location.pathname+"#t-"+code;
function renderLobby(invite){
  $("#teambar").innerHTML="";$("#homeBtn").hidden=true;$("#hud").hidden=true;
  const main=$("#main");main.className="lobby";main.scrollTop=0;
  // a title screen: the wordmark and a retro menu that jumps to each section below (all real forms, not mock-ups)
  main.innerHTML=`
    <div class="card title"><img class="emblem" src="${asset("assets/emblem.png")}" alt=""><h2 class="wordmark">Pinnacle</h2>
      <div class="slogan">TWO MINDS. ONE ROPE. HIGHER TOGETHER.</div>
      <nav class="menu" aria-label="Main menu">
        ${S.myTeams.length?`<button class="mbtn" data-go="secCont">Continue expedition</button>`:""}
        <button class="mbtn" data-go="secNew" data-f="tname">New expedition</button>
        <button class="mbtn" data-go="secJoin" data-f="jcode">Join team</button>
        <button class="mbtn" data-go="secHow">How to play</button>
        <button class="mbtn" data-go="secSet">Settings</button>
      </nav></div>
    ${invite?`<div class="card"><h3>You're invited</h3><p class="note">Join <strong>${esc(invite.name)}</strong>: add your name below, then press Join.</p></div>`:""}
    <div class="card"><h3>Your name</h3>
      <input type="text" id="myname" maxlength="24" placeholder="What your partner sees" value="${esc(S.myName)}" autocomplete="nickname">
    </div>
    ${S.myTeams.length?`<div class="card" id="secCont"><h3>Continue expedition</h3><div class="teams">${S.myTeams.map(x=>`<button class="teamrow" data-code="${esc(x.code)}"><b>${esc(x.name)}</b><span>${esc(x.code)}</span></button>`).join("")}</div></div>`:""}
    <div class="card" id="secJoin"><h3>Join team</h3>
      <div class="row"><input type="text" id="jcode" maxlength="6" placeholder="Team code" autocomplete="off" style="text-transform:uppercase" value="${invite?esc(invite.code):""}"><button class="btn ${invite?"rope":""}" id="joinBtn">Join</button></div>
      <div class="err" id="joinErr"></div><div id="seats"></div>
    </div>
    <div class="card" id="secNew"><h3>New expedition</h3>
      <label class="note" for="tname">Rope team name</label>
      <input type="text" id="tname" maxlength="32" placeholder="e.g. Kebnekaise Kids">
      <button class="btn ${invite?"":"rope"}" id="createBtn">Create rope team</button>
      <div class="err" id="createErr"></div>
    </div>
    <div class="card" id="secHow"><h3>How to play</h3>
      <p class="note">You and your partner climb ${esc(MOUNTAIN.name)} together, one question per pitch, from base camp ${fmt(ALT.base)} m to Camp I ${fmt(ALT.c1)} m.</p>
      <ul class="qrules">
        <li><b>The rope lock.</b> Each pitch is a question with four answers. You both lock in an answer in secret, and they're shown together.</li>
        <li><b>The leader decides.</b> Leader and belayer swap every pitch. The leader's answer is the one that counts. If you disagree, the rope jerks and costs a hook.</li>
        <li><b>Hooks.</b> Clip one before you see the question, and a wrong answer only slips you. Without one, you fall back to your anchor.</li>
        <li><b>Gear.</b> Chalk wipes out two wrong answers. The route scout gives the belayer a hint. An anchor locks in your height.</li>
        <li><b>Camps</b> restock your gear and let you pick one extra piece.</li>
        <li><b>The rope radio</b> lets you talk when you're apart. Side by side, just talk.</li></ul></div>
    <div class="card" id="secSet"><h3>Settings</h3>
      <div class="setrow">Sound <button class="btn ghost" id="setSnd"></button></div>
      ${document.documentElement.requestFullscreen?`<div class="setrow">Fullscreen <button class="btn ghost" id="setFs"></button></div>`:""}
    </div>`;
  drawTopo(null);
  $("#myname").onchange=readName;
  $("#createBtn").onclick=createTeam;
  $("#joinBtn").onclick=()=>joinTeam();
  $("#jcode").onkeydown=e=>{if(e.key==="Enter")joinTeam();};
  main.querySelectorAll(".teamrow").forEach(b=>b.onclick=()=>openTeam(b.dataset.code));
  main.querySelectorAll(".mbtn").forEach(b=>b.onclick=()=>{const sec=$("#"+b.dataset.go);if(!sec)return;sfx("pop");
    sec.scrollIntoView({behavior:RM.matches?"auto":"smooth",block:"start"});sec.classList.remove("flash");void sec.offsetWidth;sec.classList.add("flash");
    if(b.dataset.f)setTimeout(()=>$("#"+b.dataset.f)?.focus({preventScroll:true}),350);});
  // settings mirror the bar's sound and fullscreen switches
  const setS=$("#setSnd"),setF=$("#setFs"),sync=()=>{setS.textContent=SND.on?"On":"Off";if(setF)setF.textContent=document.fullscreenElement?"On":"Off";};
  setS.onclick=()=>{$("#sndBtn").click();sync();};if(setF){setF.onclick=()=>$("#fsBtn").click();document.addEventListener("fullscreenchange",sync);}sync();
}
async function createTeam(){
  const err=$("#createErr");const me=readName();if(!me){err.textContent="Add your name first.";$("#myname").focus();return;}
  const name=($("#tname").value||"").trim()||"Rope Team";const code=randCode();
  const btn=$("#createBtn");btn.disabled=true;
  const t={name,code,createdAt:Date.now(),createdBy:S.uid,members:{[S.uid]:{name:me,joined:Date.now()}},
    exp:newExp(1),round:{id:0,phase:"ready"},log:[{at:Date.now(),text:`${name} roped up at base camp, ${fmt(ALT.base)} m.`}],stats:{rounds:0,summits:0,wins:0,echoes:0,falls:0}};
  try{await fb.put("teams/"+code,t);rememberTeam(code,name);openTeam(code);}
  catch(e){err.textContent="Couldn't create the team. Check your connection and try again.";btn.disabled=false;}
}
async function joinTeam(){
  const code=($("#jcode").value||"").trim().toUpperCase();const err=$("#joinErr");err.textContent="";$("#seats").innerHTML="";
  if(!/^[A-Z0-9]{6}$/.test(code)){err.textContent="Team codes are 6 letters and digits.";return;}
  const me=readName();if(!me){err.textContent="Add your name first.";$("#myname").focus();return;}
  try{
    const {val,etag}=await fb.getTagged("teams/"+code);const t=fixTeam(val);
    if(!t){err.textContent="No rope team with that code.";return;}
    const ids=Object.keys(t.members);
    if(ids.includes(S.uid)){rememberTeam(code,t.name);openTeam(code);return;}
    if(ids.length>=2){
      err.textContent="This rope team already has two climbers. Playing on a new device? Take over your own place:";
      $("#seats").innerHTML=`<div class="actions" style="margin-top:8px">${ids.map(id=>`<button class="btn ghost" data-id="${esc(id)}">I'm ${esc(t.members[id].name||"this climber")}</button>`).join("")}</div>`;
      $("#seats").querySelectorAll("button").forEach(b=>b.onclick=()=>takeSeat(code,b.dataset.id));
      return;}
    t.members[S.uid]={name:me,joined:Date.now()};
    t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`${me} clipped into the rope.`});
    if(!(await fb.put("teams/"+code,t,etag))){err.textContent="The team just changed. Press Join again.";return;}
    rememberTeam(code,t.name);openTeam(code);
  }catch(e){err.textContent="Couldn't join. Check your connection and try again.";}
}
async function takeSeat(code,old){
  const err=$("#joinErr");
  try{const {val,etag}=await fb.getTagged("teams/"+code);const t=fixTeam(val);if(!t||!t.members[old])return;
    const m=t.members[old];delete t.members[old];t.members[S.uid]={...m,name:readName()||m.name};
    if(t.round.leader===old)t.round.leader=S.uid;
    if(t.round.votes[old]){t.round.votes[S.uid]=t.round.votes[old];delete t.round.votes[old];}
    if(!(await fb.put("teams/"+code,t,etag))){err.textContent="The team just changed. Try again.";return;}
    rememberTeam(code,t.name);openTeam(code);
  }catch(e){err.textContent="Couldn't take over that place. Try again.";}
}

/* ============================== GAME SESSION ============================== */
function closeTeam(){
  S.unsubTeam?.();S.unsubAns?.();S.unsubPres?.();clearInterval(S.presTimer);
  S.unsubTeam=S.unsubAns=S.unsubPres=null;S.team=null;S.code=null;S.answers={};S.ansRound=null;S.panelKey=null;S.online=new Set();S.pres={};
}
function goLobby(){closeTeam();try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}renderLobby();}
function beat(){if(S.code&&document.visibilityState==="visible")fb.put(`presence/${S.code}/${S.uid}`,Date.now()).catch(()=>{});}
document.addEventListener("visibilitychange",beat);
function updateOnline(){const now=Date.now();S.online=new Set(Object.entries(S.pres||{}).filter(([,v])=>now-v<60000).map(([k])=>k));if(S.team)renderBar();}
function openTeam(code){
  closeTeam();S.code=code;try{history.replaceState(null,"","#t-"+code);}catch(e){}
  const main=$("#main");main.className="";main.innerHTML=`<div class="panel"><p class="note">Clipping in…</p></div>`;
  let first=true;
  S.unsubTeam=fb.listen("teams/"+code,raw=>{
    const t=fixTeam(raw);
    if(!t||!t.members[S.uid]){if(first||S.team){toast(t?"You're not on this rope team.":"That rope team doesn't exist.");goLobby();}return;}
    first=false;S.team=t;S.names={};
    for(const [id,m] of Object.entries(t.members))S.names[id]=m.name||"Partner";
    if(t.round.id!==S.ansRound)subAnswers(t.round.id);
    render();
  });
  beat();S.presTimer=setInterval(beat,25000);
  S.unsubPres=fb.listen(`presence/${code}`,p=>{S.pres=p||{};updateOnline();});
}
function subAnswers(rid){
  S.unsubAns?.();S.ansRound=rid;S.answers={};
  S.unsubAns=fb.listen(`answers/${S.code}/${rid}`,a=>{S.answers=a||{};if(S.team)render();});
}

/* ============================== PIXEL UI ART ==============================
   Small pixel icons drawn from character grids (one letter per pixel), a pixel vignette for each pitch type,
   and climber portraits cropped from the same sprites the scene uses. */
const PXPAL={k:"#0a0d17",c:"#efe3c4",y:"#f2b233",Y:"#b5741c",o:"#e8792b",r:"#d23c2a",R:"#8c2a1d",g:"#7a8396",G:"#c7ccd4",
  b:"#8a5a34",B:"#5a3a22",w:"#ffffff",n:"#3c7a3c",N:"#7ccf5a",s:"#9fd0f0",S:"#3c78b4"};
function pix(rows){const h=rows.length,w=rows[0].length;let r="";
  rows.forEach((row,y)=>[...row].forEach((ch,x)=>{if(PXPAL[ch])r+=`<rect x="${x}" y="${y}" width="1.05" height="1.05" fill="${PXPAL[ch]}"/>`;}));
  return `<svg class="px" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;}
const ICON={
  hook:pix(["...kkkk...","..kyyyyk..",".kyk..kyk.",".kyk..kyk.",".kyk..kGk.",".kyk...k..",".kyk..kGk.",".kyk..kyk.","..kyyyyk..","...kkkk..."]),
  hookUsed:pix(["...kkkk...","..kggggk..",".kgk..kgk.",".kgk..kgk.",".kgk..kgk.",".kgk...k..",".kgk..kgk.",".kgk..kgk.","..kggggk..","...kkkk..."]),
  anchor:pix(["...kkkk...","..kGGGGk..","..kGkkGk..","..kGGGGk..","...kGGk...","..kkGGkk..",".kGk..kGk.",".kGk..kGk.","..kGGGGk..","...kkkk..."]),
  rope:pix(["..kkkkk...",".kooooook.","kokkkkkok.","kok...kok.","kokkkkkok.",".kooooook.","..kkkkokk.","......ok..","......kok.",".......k.."]),
  tent:pix([".....k....","....kok...","...kooRk..","..koooRRk.",".kooook.Rk","kooook.kRk","kooook.kRk","kkkkkkkkkk"]),
  flag:pix(["k.........","krrrrr....","krrrrrrr..","krrrrr....","kR........","k.........","k.........","kkk......."]),
  up:pix(["....kk....","...kNNk...","..kNNNNk..",".kNNNNNNk.","kkkNNNNkkk","...kNNk...","...kNNk...","...kkkk..."]),
  hold:pix(["kkkkkkkkk","kyyyyyyyk","kkkkkkkkk","....k....","....k....","..kkkkk..","..kGGGk..","..kkkkk.."]),
  heart:pix([".kk...kk.","krrk.krRk","krwrkrrRk","krrrrrrRk",".krrrrRk.","..krrRk..","...kRk...","....k...."]),
  heartUsed:pix([".kk...kk.","kggk.kgGk","kgggkggGk","kggggggGk",".kggggGk.","..kggGk..","...kGk...","....k...."]),
  mtn:pix(["....k.....","...kck....","..kcckk...","..kcSkSk..",".kSSkSSSk.",".kSSSSSSSk","kSSSSSSSSk","kkkkkkkkkk"]),
  peak:pix(["..........kk..........","........kkcck.........",".......kccccck........","......kcccccck.kk.....",".....kcckkcccckcck....","....kcck..kgcccccck...","...kgck....kgggcccck..","..kggk.......kgggggk..",".kggk..........kgggk..","kggk.............kggk."])
};
// a 96x28 pixel vignette for each pitch type, drawn once
const TART={};
function terrainArt(k){if(TART[k])return TART[k];
  const c=document.createElement("canvas");c.width=96;c.height=28;const g=c.getContext("2d"),R=rng(k.length*977+3),p=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  p(0,0,96,28,"#3c78b4");p(0,0,96,9,"#2c5a96");p(0,18,96,10,"#5a96d2");
  for(let x=0;x<96;x++){const h=7+Math.abs(((x*5)%26)-13)*.55;p(x,26-h,1,h+2,"#5a7aa8");if(h>12)p(x,26-h,1,2,"#efe3c4");}
  const rock=(x,y,w,h)=>{p(x,y,w,h,"#8a7462");for(let i=0;i<w*h/22;i++)p(x+Math.floor(R()*w),y+Math.floor(R()*h),2,1,R()<.5?"#6a5646":"#a89078");};
  const climber=(x,y)=>{p(x,y,2,2,"#f2b233");p(x,y+2,2,3,"#d23c2a");p(x,y+5,2,2,"#2a3450");};
  if(k==="slab"){for(let y=0;y<28;y++){const x0=Math.round(14+y*2.6);p(x0,y,96-x0,1,y%6?"#a89c8c":"#8c8070");p(x0,y,2,1,"#d8ccbc");}climber(58,9);}
  else if(k==="chimney"){rock(0,0,42,28);rock(56,0,40,28);p(42,0,14,28,"#2a1e18");p(42,0,1,28,"#0a0d17");p(55,0,1,28,"#0a0d17");p(44,0,2,28,"#3a2a22");climber(47,12);}
  else if(k==="crevasse"){p(0,12,96,16,"#e8f4ff");for(let x=0;x<96;x+=7)p(x,12,4,1,"#ffffff");
    for(let y=12;y<28;y++){const w=Math.max(1,14-(y-12)*.7);p(48-w/2|0,y,w|0,1,y<16?"#9fd0f0":"#1e3c78");}p(36,15,24,2,"#ffffff");p(36,17,24,1,"#9fd0f0");climber(40,8);}
  else if(k==="traverse"){rock(0,0,96,28);p(0,16,96,3,"#c8b498");p(0,19,96,2,"#3a2a22");for(let x=2;x<96;x+=6)p(x,11+(x%12?0:1),3,1,"#e8792b");climber(40,9);}
  else if(k==="overhang"){rock(52,0,44,28);for(let y=0;y<13;y++){const x0=Math.round(4+y*3.6+(R()*3|0));rock(x0,y,96-x0,1);}p(0,13,56,1,"#0a0d17");climber(30,14);p(31,13,1,1,"#efe3c4");}
  return TART[k]=c.toDataURL();}
// a head-and-shoulders portrait cut from the climber's front view (or, until that loads, its painted standing sprite)
const PORT=new Map();
function portrait(L){if(PORT.has(L))return PORT.get(L);
  const art=L.art&&L.art.ready,c=document.createElement("canvas");c.width=c.height=24;const g=c.getContext("2d");
  g.fillStyle="#4479c6";g.fillRect(0,0,24,24);g.fillStyle="#7cafe0";g.fillRect(0,16,24,8);
  if(art){const im=L.art.front,b=boxOf(im);g.drawImage(im,((b.x0+b.x1)>>1)-12,b.y0-2,24,24,0,0,24,24);}
  else g.drawImage(pixelSprite(L,"stand",{}),SPR.hx-9,SPR.hy-45,24,24,0,0,24,24);
  const u=c.toDataURL();if(art)PORT.set(L,u);return u;}
// the expedition as a map: base camp to summit, both route options at each camp, every pitch's state
function mapHtml(t){
  const e=t.exp,L=lens(e),tot=total(e),at=e.pitch,dim=["s0","s1","s2"];
  const pit=(gi,k,live)=>`<span class="pit ${live?(gi<at?"done":gi===at?"now":""):""}" title="${live?`Pitch ${gi+1}: `:""}${TERRAIN[k].name}">${TERRAIN[k].name[0]}${live&&e.anchor===gi+1&&!campStops(e).includes(e.anchor)?ICON.anchor:""}</span>`;
  const stop=(icon,name,alt,i)=>`<div class="mrow">${icon}<div class="mstop ${i===at?"here":""}">${name}<small>${fmt(alt)} m${i===at?" · you are here":""}${e.anchor===i&&i>0?" · anchor":""}</small></div></div>`;
  const stage=(s,start)=>{let h="";
    if(s===0)h=`<div class="mopt"><b>Approach</b>${SEG0.map((k,i)=>pit(start+i,k,1)).join("")}</div>`;
    else{const F=FORKS[s-1],ch=e.choice[s-1];
      for(const key of ["A","B"]){const opt=F[key],chosen=ch===key;
        h+=`<div class="mopt ${ch&&!chosen?"off":""}"><b>${opt.name}${!ch?` · ${opt.p.length}`:""}</b>${opt.p.map((k,i)=>pit(start+i,k,chosen)).join("")}</div>`;}}
    return `<div class="mstage ${dim[s]}">${h}</div>`;};
  const c1=L[0],c2=L[0]+(L[1]||0);
  return `<h3>Route map</h3><div class="map">
    ${stop(ICON.flag,"Summit",ALT.top,e.choice[1]?tot:-1)}${stage(2,c2)}
    ${stop(ICON.tent,"Camp II",ALT.c2,e.choice[0]?c2:-1)}${stage(1,c1)}
    ${stop(ICON.tent,"Camp I",ALT.c1,c1)}${stage(0,0)}
    ${stop(ICON.tent,"Base camp",ALT.base,0)}</div>
    <div class="mlegend"><span><span class="pit done" style="width:12px;height:12px"></span> climbed</span><span><span class="pit now" style="width:12px;height:12px;animation:none"></span> this pitch</span><span>${ICON.anchor} anchor</span></div>`;}

/* ============================== RENDER ==============================
   As in the concept sheet: the climb fills the screen, the HUD sits along the top (both climbers' portraits and
   roles, the team's hooks as hearts, the gear row, altitude and rope), and the question interface is a framed panel
   along the bottom with the rope radio beside it. */
ICON.chalk=pix(["...kk...","..k..k..",".kkkkkk.",".kcwcck.",".kccccS.",".kccccS.",".kSSSSk.","..kkkk.."]);
ICON.scout=pix(["kkk.kkk","kSk.kSk","kSkkkSk","kSSSSSk","kGSkSGk","kkk.kkk"]);
function renderBar(){
  const t=S.team;if(!t){$("#teambar").innerHTML="";return;}
  const ids=memberIds(t);
  $("#teambar").innerHTML=`<span class="teamname">${esc(t.name)}</span>
   <button class="chip" id="codeChip" title="Copy invite link">${esc(t.code)}<span class="long"> · copy invite link</span></button>
   <span class="climbers">${ids.map(id=>`<span class="climber"><i class="dot ${id===S.uid||S.online.has(id)?"on":""}"></i>${esc(nameOf(id))}</span>`).join("")}${ids.length<2?'<span class="climber"><i class="dot"></i>Waiting for partner</span>':""}</span>`;
  $("#codeChip").onclick=async()=>{const l=inviteLink(t.code);try{await navigator.clipboard.writeText(l);toast("Invite link copied");}catch(e){toast("Invite link: "+l);}};
  $("#homeBtn").hidden=false;
}
function render(){
  const t=S.team;if(!t)return;renderBar();
  const main=$("#main");
  if(!main.classList.contains("game2")){main.className="game2";main.innerHTML=`<div class="panel qpanel" id="panel"></div><div class="card radio2" id="radio"></div>`;S.hudHtml=S.radioKey=null;}
  $("#hud").hidden=false;drawTopo(t);renderHud(t);renderPanel(t);renderRadio(t);
}
// who leads this pitch (or the next one, between pitches)
function leaderOf(t){const r=t.round,ids=memberIds(t);return ["pre","answer","reveal"].includes(r.phase)?r.leader:ids[(r.id+1)%ids.length];}
// player 1 (who made the team) climbs in red, player 2 in yellow
const lookOf=(t,id)=>memberIds(t).indexOf(id)>0?LOOK.mate:LOOK.me;
const ptag=(t,id)=>"P"+(memberIds(t).indexOf(id)+1);
function renderHud(t){
  const e=t.exp,alt=altOf(e,e.pitch),ids=memberIds(t),lead=leaderOf(t),tot=total(e);
  // a heart that was lost since the last render cracks away (a rope jerk or a clipped hook)
  const lost=S.prevRope!=null&&S.prevRope>e.rope&&S.prevN===e.n?S.prevRope:e.rope;S.prevRope=e.rope;S.prevN=e.n;
  const n=Math.max(3,e.rope,lost);
  const who=ids.map(id=>`<div class="who"><img class="port" src="${portrait(lookOf(t,id))}" alt=""><div><div class="nm">${ptag(t,id)} ${esc(S.names[id]||nameOf(id))}${id===S.uid?" (you)":""}</div>
    <span class="role ${id===lead?"lead":"belay"}">${id===lead?"Leader":"Belayer"}</span></div></div>`).join("");
  const hearts=`<div class="hearts" title="Hooks: clip one before a question and a wrong answer only slips you. A rope jerk costs one." aria-label="${e.rope} hooks left">${
    [...Array(n).keys()].map(i=>i<e.rope?ICON.heart:i<lost?`<span class="crack">${ICON.heart}</span>`:ICON.heartUsed).join("")}</div>`;
  const gear=`<div class="gear" aria-label="Gear"><span title="Chalk: wipes out two wrong answers">${ICON.chalk}<b>${e.chalk}</b></span><span title="Route scout: a hint only the belayer sees">${ICON.scout}<b>${e.scout}</b></span><span title="Anchors: lock in your height">${ICON.anchor}<b>${e.anchors}</b></span></div>`;
  const html=`<div class="hud-l">${who}<div class="hudgear">${hearts}${gear}</div></div>
   <div class="hud-r"><div class="stat">${ICON.mtn}<span class="k">Alt</span><span class="v">${fmt(alt)} m</span></div>
     <div class="stat">${ICON.rope}<span class="k">Rope</span><span class="v">${fmt(alt-altOf(e,e.anchor))} m</span></div>
     <div class="stat">${ICON.flag}<span class="k">Pitch</span><span class="v">${Math.min(e.pitch+1,tot)}/${tot}</span></div></div>`;
  if(S.hudHtml!==html){S.hudHtml=html;$("#hud").innerHTML=html;}
}
function remaining(r){return Math.max(0,(r.startedAt+r.dur*1000-Date.now())/1000);}
const clock=rem=>{const s=Math.ceil(rem);return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;};
// the question panel's picture: the lumberjack on a scrap of the mountain's granite, painted once the art is in
let PITCH_ART=null;
function pitchArt(){if(PITCH_ART)return PITCH_ART;const R=ART.rocks&&ART.rocks[0],A=LOOK.me.art;if(!R||!A||!A.ready)return asset("assets/emblem.png");
  const [c,g]=mk(72,56);C.sky.forEach((col,i)=>rect(g,0,R0(i*56/C.sky.length),72,56,col));
  const id=g.getImageData(0,0,72,56),d=id.data,T=R.lo;
  for(let y=0;y<56;y++)for(let x=0;x<72;x++){if(x<44+((hash(y>>2,9)*5)|0))continue;const i=(y*72+x)*4,j=(((y+30)%T.h)*T.w+(x%T.w))*4;d[i]=T.d[j];d[i+1]=T.d[j+1];d[i+2]=T.d[j+2];d[i+3]=255;}
  g.putImageData(id,0,0);const fr=A.clips.climb[2],b=boxOf(fr),w=b.x1-b.x0+1;g.drawImage(fr,b.x0,b.y0,w,54,48-w,3,w,54);
  return PITCH_ART=c.toDataURL();}
const tierMarks=k=>`<span class="tier" aria-label="difficulty ${k} of 3">${"▲".repeat(k)}<i>${"▲".repeat(3-k)}</i></span>`;

function renderPanel(t){
  const r=t.round,e=t.exp,panel=$("#panel"),mine=S.answers[S.uid];
  const key=[r.id,r.phase,!!mine,memberIds(t).length,r.phase==="camp"?JSON.stringify(r.votes||{}):"",r.resolvedAt||"",String(r.cut),!!r.scout,e.chalk,e.scout,e.rope,Object.values(S.names).join(",")].join("|");
  if(key===S.panelKey){updateDynamic(t);return;}
  if(S.panelKey&&S.panelKey.split("|")[0]!==String(r.id))S.local={};S.panelKey=key;S.local=S.local||{};
  panel.innerHTML=r.phase==="ready"?readyView(t):r.phase==="pre"?preView(t):r.phase==="answer"?answerView(t,mine):r.phase==="reveal"?revealView(t):r.phase==="camp"?campView(t):stageView(t);
  wirePanel(t);updateDynamic(t);
}
function frameQ(t,main,side){return `<div class="qwrap${side?"":" noside"}"><div class="qart"><img src="${pitchArt()}" alt=""></div><div class="qmain">${main}</div>${side?`<div class="qside">${side}</div>`:""}</div>`;}
function roleSide(t,lead,solo){return `<div class="qrole ${lead?"lead":"belay"}">${ptag(t,S.uid)} · ${solo?"Solo":lead?"Leader view":"Belayer view"}</div>`;}
function readyView(t){
  const solo=memberIds(t).length<2;
  return frameQ(t,`<div class="qhead"><span>Expedition ${t.exp.n} · ${esc(MOUNTAIN.theme)}</span></div>
   <div class="qtitle">${esc(MOUNTAIN.name)}</div>
   <p class="qsub">${esc(MOUNTAIN.stage)}: base camp ${fmt(ALT.base)} m to Camp I ${fmt(ALT.c1)} m, ${total(t.exp)} pitches.</p>
   <ul class="qrules"><li>One question per pitch. You both lock in an answer in secret.</li>
     <li>The leader's answer counts. Disagree and the rope jerks: it costs a hook.</li>
     <li>Clip a hook before a question, and a wrong answer only slips you.</li>
     <li>Chalk wipes out two wrong answers. The route scout gives the belayer a hint.</li></ul>
   ${solo?`<p class="note">Send your partner the invite link from the top bar (code <strong>${esc(t.code)}</strong>). You can climb alone to try it out.</p>`:""}
   <button class="btn rope" id="goBtn">Start the climb</button>`);
}
function preView(t){
  const r=t.round,q=quizById(r.qid),e=t.exp,ids=memberIds(t),solo=ids.length<2,lead=r.leader===S.uid||solo;
  return frameQ(t,`<div class="qhead"><span>Pitch ${e.pitch+1} / ${total(e)} · ${fmt(altOf(e,e.pitch))} m</span>${tierMarks(q.tier)}</div>
   <div class="qtitle">${esc(q.cat)}</div>
   <p class="qsub">${lead?"Clip a hook before you see the question? If you get it wrong, the hook holds you.":`${esc(nameOf(r.leader))} decides whether to clip a hook. Talk it over on the radio.`}</p>
   ${lead?`<div class="actions"><button class="btn rope" id="hookBtn" ${e.rope>0?"":"disabled"}>Clip a hook (${e.rope} left)</button><button class="btn" id="noHookBtn">Climb without</button></div>`:`<div class="wait">Waiting for your leader…</div>`}`,
   roleSide(t,lead,solo)+`<p class="note">${lead?"Your answer will be the one that counts on this pitch.":"On this pitch you belay: your answer can't move you, but if you disagree, the rope jerks."}</p>`);
}
function answerView(t,mine){
  const r=t.round,q=quizById(r.qid),e=t.exp,ids=memberIds(t),solo=ids.length<2,lead=r.leader===S.uid||solo,cut=r.cut||[];
  const sel=mine?mine.choice:S.local.choice;
  const opts=r.order.map((k,i)=>`<button class="qopt ${cut.includes(i)?"cut":""} ${sel===i?"sel":""}" data-i="${i}" ${cut.includes(i)||mine?"disabled":""}><b>${LETTERS[i]}</b><span>${esc(q.o[k])}</span></button>`).join("");
  const seeHint=r.scout&&(!lead||solo);
  return frameQ(t,`<div class="qhead"><span>Pitch ${e.pitch+1} / ${total(e)} · ${esc(q.cat)}</span>${r.hook?`<span class="chip0">Hook clipped</span>`:""}<span class="qtime" id="qtime"></span></div>
   <div class="qtext">${esc(q.q)}</div><div class="qopts">${opts}</div>
   <div class="qfoot">${mine?`<div class="wait">Locked in: <strong>${mine.choice==null?"no answer":LETTERS[mine.choice]}</strong></div>`:`<button class="btn rope" id="lockBtn" ${sel==null?"disabled":""}>Lock in</button>`}<span class="note" id="partnerTxt"></span></div>
   <div class="timer"><i id="timerBar"></i></div>`,
   roleSide(t,lead,solo)+`<p class="note">${solo?"Your answer counts.":lead?"Your answer is the one that counts.":"Agree with your leader, or the rope jerks."}</p>
   <button class="gbtn" id="chalkBtn" ${e.chalk>0&&!r.cut?"":"disabled"}>${ICON.chalk}<span>Chalk 50/50</span><b>${e.chalk}</b></button>
   ${!lead||solo?`<button class="gbtn" id="scoutBtn" ${e.scout>0&&!r.scout?"":"disabled"}>${ICON.scout}<span>Route scout</span><b>${e.scout}</b></button>`:`<p class="note">${r.scout?"Your belayer has a hint. Ask on the radio.":"Only your belayer can use the scout."}</p>`}
   ${seeHint?`<div class="hint"><b>Scout:</b> ${esc(q.hint)}</div>`:""}`);
}
function revealView(t){
  const r=t.round,o=r.result||{},q=quizById(r.qid),e=t.exp,ids=memberIds(t),bel=ids.find(i=>i!==r.leader);
  const atCamp=e.pitch>=total(e),canAnchor=!atCamp&&o.move>0&&e.anchors>0&&e.anchor!==e.pitch;
  const opts=r.order.map((k,i)=>{const tags=(i===o.lead?`<em class="lead">${ptag(t,r.leader)}</em>`:"")+(bel&&i===o.bel?`<em class="belay">${ptag(t,bel)}</em>`:"");
    return `<div class="qopt ${i===o.right?"right":i===o.lead?"wrong":""}"><b>${LETTERS[i]}</b><span>${esc(q.o[k])}</span>${tags}</div>`;}).join("");
  const oc=o.arrived?["good",ICON.tent,"Camp I reached!"]:o.fall&&o.caught?["warn",ICON.hook,"Your hook held"]:o.fall?["bad",ICON.anchor,"Off the wall"]:["good",ICON.up,"Climbed a pitch"];
  return frameQ(t,`<div class="qhead"><span>Pitch ${o.from+1} · ${esc(q.cat)}</span>${o.jerk?`<span class="jerk">ROPE JERK!</span>`:""}</div>
   <div class="qtext">${esc(q.q)}</div><div class="qopts">${opts}</div>
   <div class="headline ${o.tone||"good"}">${esc(o.headline)}</div>
   <div class="outcome ${oc[0]}">${oc[1]}<span>${esc(o.moveText||"")}</span></div>
   <div class="actions">${atCamp?`<button class="btn rope" id="nextBtn">Make camp</button>`:`<button class="btn rope" id="nextBtn">Next pitch</button>${canAnchor?`<button class="btn ghost" id="anchorBtn" title="A fall without a hook will drop you no lower than this">Place anchor (${e.anchors} left)</button>`:""}`}</div>`);
}
function campView(t){
  const votes=t.round.votes||{},ids=memberIds(t),solo=ids.length<2,lead=solo||leaderOf(t)===S.uid,my=votes[S.uid];
  const card=k=>`<button class="route ${my===k?"sel":""}" data-k="${k}"><h4>${BONUS[k].name}</h4><span>${BONUS[k].desc}</span><span class="votes">${ids.filter(i=>votes[i]===k).map(i=>esc(nameOf(i))).join(", ")||"&nbsp;"}</span></button>`;
  return frameQ(t,`<div class="qhead"><span>Camp I · ${fmt(ALT.c1)} m</span></div>
   <div class="qtitle">Rest at camp</div>
   <p class="qsub">Your gear is restocked: 3 hooks, chalk, a route scout and an anchor. Pick one extra piece together${solo?"":`, then ${lead?"you make":"your partner makes"} the call`}.</p>
   <div class="routes bonus">${card("hook")}${card("chalk")}${card("scout")}</div>
   ${lead?`<button class="btn rope" id="campBtn" ${my?"":"disabled"}>${my?`Take the ${BONUS[my].name.toLowerCase()}`:"Pick one to continue"}</button>`:`<p class="note">Waiting for your partner to decide.</p>`}`);
}
function stageView(t){const st=t.exp.run||{};
  return frameQ(t,`<div class="qhead"><span>Camp I · ${fmt(ALT.c1)} m</span></div>
   <div class="qtitle">Stage complete!</div>
   <p class="qsub">You made it to Camp I with ${BONUS[t.round.bonus]?.name.toLowerCase()||"your gear"} in the pack. This prototype ends here: the climb to Camp II and the summit comes next.</p>
   <div class="lines">${memberIds(t).length>1?`<div class="line"><span class="who">In sync</span><span class="what">${st.synced||0} moves</span><span></span></div>
     <div class="line"><span class="who">Rope jerks</span><span class="what">${st.jerks||0}</span><span></span></div>`:""}
     <div class="line"><span class="who">Hooks that held</span><span class="what">${st.slips||0}</span><span></span></div>
     <div class="line"><span class="who">Falls</span><span class="what">${st.falls||0}</span><span></span></div></div>
   <button class="btn rope" id="newExpBtn">Climb again</button>`);
}

/* the rope radio: messages and quick calls between the two, kept beside the round's answers (answers/<team>/<round>/_talk) */
const talkOf=()=>Object.values(S.answers._talk||{}).filter(m=>m&&m.text).sort((a,b)=>a.at-b.at);
const CALLS=["A?","B?","C?","D?","Not sure","Trust me","Clip a hook","Save it"];
function renderRadio(t){
  const el=$("#radio"),solo=memberIds(t).length<2,key=[t.round.id,solo].join("|");
  if(S.radioKey===key){updateRadio(t);return;}S.radioKey=key;
  el.innerHTML=`<div class="rhead">Rope radio <span id="rstate"></span></div><div class="rlog" id="rlog"></div>
   ${solo?`<p class="note">The radio links you to your partner once they've joined.</p>`:`<div class="calls">${CALLS.map(c=>`<button class="call" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
   <div class="row"><input type="text" id="rmsg" maxlength="60" autocomplete="off" placeholder="Say something…" aria-label="Message your partner"><button class="btn ghost" id="rsend">Send</button></div>`}`;
  el.querySelectorAll(".call").forEach(b=>b.onclick=()=>sendTalk(b.dataset.c));
  const inp=$("#rmsg");if(inp){$("#rsend").onclick=()=>{sendTalk(inp.value);inp.value="";};inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();sendTalk(inp.value);inp.value="";}};}
  el.querySelector(".rlog").dataset.n="";updateRadio(t);
}
async function sendTalk(text){text=String(text||"").trim().replace(/\s+/g," ").slice(0,60);if(!text||!S.team)return;
  const r=S.team.round,k=talkOf().filter(m=>m.uid===S.uid).length;
  try{await fb.put(`answers/${S.code}/${r.id}/_talk/${S.uid}_${k}`,{uid:S.uid,text,at:Date.now()});}catch(e){toast("Couldn't send that over the radio.");}}
function updateRadio(t){const rl=$("#rlog");if(!rl)return;const msgs=talkOf();
  if(rl.dataset.n!==String(msgs.length)){const fresh=msgs.length>(+rl.dataset.n||0);rl.dataset.n=msgs.length;
    rl.innerHTML=msgs.map(m=>`<div class="msg ${m.uid===S.uid?"me":""}"><b>${ptag(t,m.uid)}</b>${esc(m.text)}</div>`).join("")||`<div class="note">Nothing on the radio yet.</div>`;
    rl.scrollTop=rl.scrollHeight;if(fresh&&msgs.length&&msgs[msgs.length-1].uid!==S.uid)sfx("tug");}
  const pid=partnerId(t),st=$("#rstate");if(st)st.textContent=pid?(S.online.has(pid)?"partner online":"partner away"):"";}

function wirePanel(t){
  const r=t.round,P=$("#panel");
  P.querySelector("#goBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#nextBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#anchorBtn")?.addEventListener("click",()=>advance(true));
  P.querySelector("#hookBtn")?.addEventListener("click",()=>{sfx("grab");climbOn(true);});
  P.querySelector("#noHookBtn")?.addEventListener("click",()=>climbOn(false));
  P.querySelector("#newExpBtn")?.addEventListener("click",newExpedition);
  P.querySelectorAll(".route").forEach(b=>b.addEventListener("click",()=>vote(b.dataset.k)));
  P.querySelector("#campBtn")?.addEventListener("click",()=>{const v=(t.round.votes||{})[S.uid];if(v)campPick(v);});
  if(r.phase!=="answer")return;
  P.querySelector("#chalkBtn")?.addEventListener("click",useChalk);
  P.querySelector("#scoutBtn")?.addEventListener("click",useScout);
  P.querySelectorAll(".qopt[data-i]").forEach(b=>b.addEventListener("click",()=>{if(S.answers[S.uid])return;S.local.choice=+b.dataset.i;sfx("pop");
    P.querySelectorAll(".qopt").forEach(x=>x.classList.toggle("sel",x===b));const l=$("#lockBtn");if(l)l.disabled=false;}));
  P.querySelector("#lockBtn")?.addEventListener("click",()=>{if(S.local.choice!=null&&!S.answers[S.uid])submit({choice:S.local.choice});});
}
function updateDynamic(t){
  const r=t.round;updateRadio(t);if(r.phase!=="answer")return;
  const rem=remaining(r),bar=$("#timerBar"),txt=$("#qtime"),ptx=$("#partnerTxt");
  if(bar)bar.style.width=(100*rem/r.dur)+"%";
  if(txt){txt.textContent=clock(rem);txt.classList.toggle("low",rem<=10);}
  const pid=partnerId(t);if(ptx)ptx.textContent=pid?(S.answers[pid]?`${nameOf(pid)} is locked in`:`${nameOf(pid)} is thinking…`):"";
}

/* ============================== TICK ============================== */
let tickN=0;
setInterval(()=>{
  if(++tickN%20===0)updateOnline();
  const t=S.team;if(!t)return;updateDynamic(t);if(t.round.phase!=="answer")return;
  const r=t.round,rem=remaining(r);
  // out of time: whatever is selected is locked in (or no answer)
  if(rem<=0&&!S.answers[S.uid]&&S._autoSent!==r.id){S._autoSent=r.id;submit({choice:S.local.choice??null});}
  const all=memberIds(t).every(id=>S.answers[id]);
  // the pitch's leader judges; the partner steps in if the leader is away or slow
  const mine=r.leader===S.uid||!t.members[r.leader]||!S.online.has(r.leader)||rem<=-10;
  if((all||rem<=-2)&&mine&&Date.now()-(S._lastTry||0)>2500){S._lastTry=Date.now();tryResolve();}
},500);
