/* Shared storage: Pinnacle's own Firebase Realtime Database (access rules live in database.rules.json). */
const FB="https://pinnacle-5f36a-default-rtdb.europe-west1.firebasedatabase.app";
const S={uid:null,myName:"",code:null,team:null,answers:{},names:{},online:new Set(),pres:{},local:{},
  unsubTeam:null,unsubAns:null,unsubPres:null,presTimer:null,ansRound:null,resolving:false,acting:false,
  myTeams:[],panelKey:null,sample:null};
const $=s=>document.querySelector(s);
// the two players' clocks can be seconds apart, so shared times (when a question starts, who is online) are kept on
// the database's clock: each heartbeat has the server write its own time, and what comes back shows how far this
// device is off (see beat)
let SKEW=0;const now=()=>Date.now()+SKEW;
// a pitch opens with a short count before its clock starts, and its result waits a beat before it shows
const LEAD_MS=3000,SUSPENSE_MS=1400;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const fmt=n=>Math.round(n).toLocaleString("en-US").replace(/,/g," ");
// an art file's address at the art's version (see index.html), so a changed picture is fetched fresh
const asset=p=>window.AV?`${p}?${window.AV}`:p;
// a crevasse number as written: a bare count or year (no unit) without the thousands space, so 1523 never reads "1 523"
const qnum=(n,q)=>q&&!q.u?String(Math.round(n)):fmt(n);
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
// in the order they joined, so whoever made the team is player 1
const memberIds=t=>{const m=t.members||{};return Object.keys(m).sort((a,b)=>(m[a].joined||0)-(m[b].joined||0)||(a<b?-1:a>b?1:0));};
function nameOf(id){if(id===S.uid)return "You";return S.names[id]||"Partner";}
function partnerId(t){return memberIds(t).find(i=>i!==S.uid);}
// in test mode each test player keeps its own settings, apart from the real game's
const LS_PRE=window.TEST?`pinnacle.test.${TEST.as}.`:"pinnacle.";
const LS={get(k,d){try{const v=localStorage.getItem(LS_PRE+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){try{localStorage.setItem(LS_PRE+k,JSON.stringify(v));}catch(e){}}};

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
    es.onopen=()=>conn(es,true);es.onerror=()=>conn(es,false);
    return ()=>{es.close();conn(es,true);};}
};
// the connection: when a live link to the database drops (the browser keeps retrying by itself), a note says so
// until it is back; a blip shorter than a second and a half never shows
const CONN={bad:new Set(),timer:null};
function conn(src,ok){if(ok)CONN.bad.delete(src);else CONN.bad.add(src);
  const off=()=>CONN.bad.size>0||navigator.onLine===false,el=$("#conn");if(!el)return;
  clearTimeout(CONN.timer);if(!off())el.hidden=true;else CONN.timer=setTimeout(()=>{el.hidden=!off();},1500);}
addEventListener("offline",()=>conn(null,true));addEventListener("online",()=>conn(null,true));
// test mode (js/testdb.js): the same calls, answered by an in-memory database
if(window.TESTFB)Object.assign(fb,window.TESTFB);
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
  // a team that finished the stage-one prototype picks its route at Camp I; a camp vote is {route, bonus}
  if(t.round.phase==="stage")t.round={id:t.round.id+1,phase:"camp",stage:0,votes:{}};
  // (an expedition starts on the map; one saved before there was a map climbs Kebne Wall, the mountain it began on)
  if(t.round.phase==="ready")t.round={id:t.round.id,phase:"map",votes:t.round.votes};
  if(!MOUNTAINS[e.m])e.m=t.round.phase==="map"?null:"kebne";
  for(const [k,v] of Object.entries(t.round.votes))if(!v||typeof v!=="object")delete t.round.votes[k];
  for(const k of ["order","cut"])if(t.round[k])t.round[k]=Object.values(t.round[k]);
  return t;
}

/* ============================== ROUTE MATH ============================== */
function lens(exp){return [SEG0_TIERS.length, exp.choice[0]?FORKS[0][exp.choice[0]].tiers.length:null, exp.choice[1]?FORKS[1][exp.choice[1]].tiers.length:null];}
function total(exp){const L=lens(exp);return L[0]+(L[1]||0)+(L[2]||0);}
function campStops(exp){const L=lens(exp);const s=[L[0]];if(L[1])s.push(L[0]+L[1]);if(L[1]&&L[2])s.push(L[0]+L[1]+L[2]);return s;}
// the mountain an expedition is on (Kebne Wall until one is picked)
const MT=e=>MOUNTAINS[e&&e.m]||MOUNTAINS.kebne;
// a height on the drawn wall, as that mountain's own height in metres (the wall is drawn the same for all three)
const mAlt=(e,a)=>{const m=MT(e).alt;return Math.round((m.base+(a-ALT.base)*(m.top-m.base)/(ALT.top-ALT.base))/10)*10;};
function altOf(exp,p){return mAlt(exp,geoAlt(exp,p));}
function geoAlt(exp,p){const L=lens(exp);
  if(p<=L[0])return ALT.base+(ALT.c1-ALT.base)*p/L[0];
  if(L[1]&&p<=L[0]+L[1])return ALT.c1+(ALT.c2-ALT.c1)*(p-L[0])/L[1];
  if(L[2])return ALT.c2+(ALT.top-ALT.c2)*(p-L[0]-L[1])/L[2];
  return ALT.c2;}
function needsChoice(exp){const L=lens(exp);
  if(exp.pitch===L[0]&&!exp.choice[0])return 0;
  if(L[1]&&exp.pitch===L[0]+L[1]&&!exp.choice[1])return 1;
  return -1;}
// where a pitch sits: its stage (0 up to Camp I, 1 up to Camp II, 2 up to the summit), its place in it and the
// stage's length
function stageOf(exp,p){const L=lens(exp);if(p<L[0]||!L[1])return {s:0,i:p,n:L[0]};
  if(p<L[0]+L[1]||!L[2])return {s:1,i:p-L[0],n:L[1]};return {s:2,i:p-L[0]-L[1],n:L[2]};}
const STAGE_TO=["Camp I","Camp II","the summit"];
function nextStop(exp){const L=lens(exp);if(exp.pitch<L[0])return L[0];
  if(L[1]&&exp.pitch<L[0]+L[1])return L[0]+L[1];return total(exp);}
// an expedition: the pitch reached, the anchor a fall without a hook drops you to, and the team's gear (rope = hooks)
function newExp(n,prev){return {v:2,n,m:null,choice:[null,null],pitch:0,anchor:0,rope:3,chalk:1,scout:1,anchors:1,used:prev?prev.used.slice(-80):[]};}
// an ascent's score out of 100: the share of questions answered right, less a little for every fall and rope jerk
const ascentScore=run=>Math.max(0,Math.round(100*(run.right||0)/Math.max(1,run.q||0))-5*(run.falls||0)-2*(run.jerks||0));
const ascentStars=run=>{const p=run.pts??ascentScore(run);return p>=85?3:p>=60?2:1;};
const fmtDur=ms=>{const s=Math.round(ms/1000);return s>=3600?`${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min`:s>=60?`${Math.floor(s/60)} min ${s%60} s`:`${s} s`;};

/* ============================== QUESTION PICK ============================== */
// the pitch's question: from this mountain's pool at the pitch's difficulty (set by the route: easy at the foot of
// the wall, hardest on the summit push), one the team hasn't had lately
function tierAt(exp,p){const T=[...SEG0_TIERS,...(exp.choice[0]?FORKS[0][exp.choice[0]].tiers:[]),...(exp.choice[1]?FORKS[1][exp.choice[1]].tiers:[])];return clamp((T[p]||3)+MT(exp).tier,1,4);}
function pickQuiz(tier,used){const pool=QUIZ.filter(q=>q.tier===tier);let fresh=pool.filter(q=>!used.includes(q.id));
  if(!fresh.length)fresh=pool;return fresh[Math.floor(Math.random()*fresh.length)];}
const quizById=id=>QUIZ.find(q=>q.id===id);
// the four options in a fresh order for a round: order[i] is the option shown in slot i (option 0 is the right one)
function shuffled4(){const a=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const LETTERS="ABCD";

/* ============================== JUDGING ==============================
   The rope lock: both climbers lock an answer in secret, and the two are shown together. The leader's answer is the
   one that counts. If the two disagree the rope jerks, which costs a hook whoever was right. A right answer climbs
   one pitch. A wrong one (or none) falls: onto the hook if the team clipped one during the question, so they slip
   but keep their height; otherwise down to their last anchor or camp. */
function judge(t,ans){
  const r=t.round,ids=memberIds(t),right=r.order.indexOf(0),bel=ids.find(i=>i!==r.leader);
  const pick=id=>{const c=ans[id]?.choice;return typeof c==="number"&&c>=0&&c<4?c:null;};
  const L=pick(r.leader),B=bel?pick(bel):null;
  const o={right,lead:L,bel:B,correct:L===right,jerk:!!bel&&L!==null&&B!==null&&B!==L,move:0,fall:false,tone:"good"};
  if(o.correct){o.move=1;o.headline=o.jerk?"Right hold, but the rope jerked.":bel&&B===L?"In sync. Clean move.":"Clean move.";if(o.jerk)o.tone="warn";}
  else{o.fall=true;o.tone="bad";o.headline=L===null?"No answer. Off the wall!":o.jerk?"Wrong hold, and the rope jerked!":"Wrong hold. Off the wall!";}
  return o;}
function applyOutcome(t,o){
  const exp=clone(t.exp),r=t.round,before=exp.pitch,beforeAlt=altOf(exp,before),q=quizById(r.qid);let moveText="";
  if(o.fall){
    if(r.hook){o.caught=true;o.tone="warn";o.headline=o.lead===null?"No answer, but the hook held.":"Wrong hold, but the hook held.";moveText="You keep your height.";}
    else{exp.pitch=exp.anchor;const L=lens(exp),where=exp.anchor===0?"base camp":exp.anchor===L[0]?"Camp I":L[1]&&exp.anchor===L[0]+L[1]?"Camp II":"your anchor";
      moveText=exp.pitch<before?`No hook clipped: fell ${Math.round(beforeAlt-altOf(exp,exp.pitch))} m to ${where}.`:`No hook clipped, but you were at ${where}.`;}}
  else{exp.pitch=Math.min(exp.pitch+1,total(exp));moveText=`Up ${Math.round(altOf(exp,exp.pitch)-beforeAlt)} m to ${fmt(altOf(exp,exp.pitch))} m.`;}
  if(o.jerk){if(exp.rope>0){exp.rope--;o.jerkCost=1;moveText+=" The rope jerk cost a hook.";}else moveText+=" The rope jerked.";}
  // reaching a camp or the top: a camp also becomes the anchor, so no fall ever drops the team below it
  let arrived=null;if(exp.pitch>before){const L=lens(exp);
    arrived=exp.pitch===L[0]?"Camp I":L[1]&&exp.pitch===L[0]+L[1]?"Camp II":exp.choice[1]&&exp.pitch>=total(exp)?"summit":null;
    if(arrived)exp.anchor=exp.pitch;}
  const stats=clone(t.stats||{});stats.rounds=(stats.rounds||0)+1;if(o.jerk)stats.jerks=(stats.jerks||0)+1;
  if(o.correct&&!o.jerk&&o.bel!==null)stats.synced=(stats.synced||0)+1;if(o.fall&&!o.caught)stats.falls=(stats.falls||0)+1;
  // this expedition's own tally, for the end of the stage
  const run=exp.run={...(exp.run||{})};if(o.jerk)run.jerks=(run.jerks||0)+1;run.q=(run.q||0)+1;if(o.correct)run.right=(run.right||0)+1;
  if(o.correct&&!o.jerk&&o.bel!==null)run.synced=(run.synced||0)+1;if(o.fall)run[o.caught?"slips":"falls"]=(run[o.caught?"slips":"falls"]||0)+1;
  // the summit: the ascent is timed and scored, and goes down as the team's best if it is
  if(arrived==="summit"){if(exp.t0)run.ms=Math.max(0,now()-exp.t0);run.pts=ascentScore(run);stats.summits=(stats.summits||0)+1;
    if(!stats.best||run.pts>stats.best.pts){run.best=!!stats.best;stats.best={pts:run.pts,right:run.right||0,q:run.q||0,falls:run.falls||0,jerks:run.jerks||0,ms:run.ms||0,n:exp.n,m:exp.m};}
    // (and on the mountain's own record, which the map shows)
    const pk=stats.peaks=clone(stats.peaks||{}),mine=pk[exp.m]||{n:0,pts:0};pk[exp.m]={n:mine.n+1,pts:Math.max(mine.pts,run.pts)};}
  const log=(t.log||[]).slice(-39);
  log.push({at:Date.now(),text:`P${before+1} ${q.cat}: ${o.headline}`});
  if(arrived)log.push({at:Date.now(),text:arrived==="summit"?`Stood on top of ${MT(exp).name}, ${fmt(mAlt(exp,ALT.top))} m!`:`Reached ${arrived}.`});
  return {...t,exp,stats,log,round:{...r,phase:"reveal",result:{...o,moveText,arrived,from:before,to:exp.pitch},resolvedAt:now()}};}


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
// the next pitch: its question is drawn, and after a short count (so both are ready) its clock starts. At the top of
// a stage the team makes camp and picks the route on; at the top of the last one they're on the summit.
function startPitch(t){
  const ids=memberIds(t),id=(t.round?.id||0)+1,exp=t.exp,nc=needsChoice(exp);
  if(nc>=0)return {...t,round:{id,phase:"camp",stage:nc,votes:{}}};
  if(exp.pitch>=total(exp))return {...t,round:{id,phase:"summit"}};
  const q=pickQuiz(tierAt(exp,exp.pitch),exp.used);exp.used=[...exp.used,q.id].slice(-100);if(!exp.t0)exp.t0=now();
  return {...t,exp,round:{id,phase:"answer",qid:q.id,leader:ids[id%ids.length],order:shuffled4(),startedAt:now()+LEAD_MS,dur:window.TEST?.secs()||MT(exp).secs}};}
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
// a hook: either climber can clip one at any time while the question is open; a wrong answer then only slips them
function useHook(){
  const rid=S.team.round.id;
  guarded(t=>{const r=t.round;if(r.id!==rid||r.phase!=="answer"||r.hook||t.exp.rope<=0)return null;
    t.exp.rope--;return {...t,round:{...r,hook:true,hookBy:S.uid}};});
}
// (a team saved while the game still asked about the hook before each question goes straight on to the question)
function climbOn(){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid||t.round.phase!=="pre")return null;
    return {...t,round:{...t.round,phase:"answer",order:shuffled4(),startedAt:now()+LEAD_MS,dur:window.TEST?.secs()||MT(t.exp).secs}};});
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
// at camp: everything is restocked, and the team picks the route on and one extra piece of gear (each votes, the
// leader confirms); then the next stage starts straight away
const BONUS={hook:{name:"Extra hook",desc:"One more hook for the next stage."},chalk:{name:"Extra chalk",desc:"Wipe out two wrong answers once more."},scout:{name:"Extra scout",desc:"A second hint for the belayer."}};
function campPick(route,k){
  const rid=S.team.round.id;
  guarded(t=>{const s=t.round.stage??needsChoice(t.exp);
    if(t.round.id!==rid||t.round.phase!=="camp"||!BONUS[k]||!FORKS[s]?.[route])return null;
    Object.assign(t.exp,{rope:MT(t.exp).hooks,chalk:1,scout:1,anchors:1});
    if(k==="hook")t.exp.rope++;else t.exp[k]++;
    t.exp.choice[s]=route;
    t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Rested at ${FORKS[s].camp}. Gear restocked, plus ${BONUS[k].name.toLowerCase()}. On via ${FORKS[s][route].name}.`});
    return startPitch(t);});
}
// a camp vote is two picks: the route and the bonus
async function campVote(part,val){
  try{await fb.patch(`teams/${S.code}/round/votes/${S.uid}`,{[part]:val});}catch(e){toast("Couldn't save your vote.");}
}
// on the map: each climber taps a mountain (their pick shows to both); the leader of the first pitch sets off, or
// either of them once both picked the same one. Setting off fits the team out for it and starts the first pitch
function pickMountain(id){if(!MOUNTAINS[id]||!S.team)return;sfx("pop");campVote("mtn",id);}
function mapPick(t){const v=t.round.votes||{},ids=memberIds(t),mine=v[S.uid]?.mtn,all=ids.map(i=>v[i]?.mtn);
  return mine||(all.length&&all.every(x=>x&&x===all[0])?all[0]:null);}
function chooseMountain(id){const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid||t.round.phase!=="map"||!MOUNTAINS[id])return null;const m=MOUNTAINS[id];
    t.exp.m=id;t.exp.rope=m.hooks;t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Set off for ${m.name} (${m.label.toLowerCase()}), ${fmt(m.alt.top)} m.`});
    return startPitch(t);});}
function newExpedition(){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid)return null;
    t.exp=newExp((t.exp?.n||1)+1,t.exp);t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Expedition ${t.exp.n} begins at base camp.`});
    return {...t,round:{id:rid+1,phase:"map",votes:{}}};});
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
// the settings rows (title screen and the climb's menu): each button mirrors its switch and flips it on a click
function settingsHtml(){return `<div class="setrow">Sound <button class="btn ghost" data-set="snd"></button></div>
  <div class="setrow">Music <button class="btn ghost" data-set="mus"></button></div>
  ${document.documentElement.requestFullscreen?`<div class="setrow">Fullscreen <button class="btn ghost" data-set="fs"></button></div>`:""}`;}
function syncSettings(){document.querySelectorAll("[data-set]").forEach(b=>{const k=b.dataset.set;
  b.textContent=(k==="snd"?SND.on:k==="mus"?MUSIC.on:!!document.fullscreenElement)?"On":"Off";});}
document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest("[data-set]");if(!b)return;const k=b.dataset.set;
  if(k==="snd")$("#sndBtn").click();else if(k==="mus")MUSIC.toggle();else $("#fsBtn").click();syncSettings();});
document.addEventListener("fullscreenchange",syncSettings);
function rememberTeam(code,name){
  S.myTeams=[{code,name},...S.myTeams.filter(x=>x.code!==code)].slice(0,12);LS.set("teams",S.myTeams);
}
function readName(){const el=$("#myname");const v=((el?el.value:S.myName)||"").trim().slice(0,24);if(v){S.myName=v;LS.set("name",v);}return v;}
function randCode(){const a="ABCDEFGHJKMNPQRSTUVWXYZ23456789";let s="";for(let i=0;i<6;i++)s+=a[Math.floor(Math.random()*a.length)];return s;}
const inviteLink=code=>location.origin+location.pathname+"#t-"+code;
function renderLobby(invite){
  if(typeof MUSIC!=="undefined")MUSIC.want(true,"home"); // the full theme on the home screen (js/music.js)
  $("#teambar").innerHTML="";$("#homeBtn").hidden=true;$("#hud").hidden=true;
  const main=$("#main");main.className="lobby";main.scrollTop=0;main.hidden=true;
  // the title screen (js/title.js) holds the menu; each menu item opens its own panel here, over the painting.
  // The name card shows with every panel that needs it (data-for)
  main.innerHTML=`
    <button class="linkbtn back" id="backBtn">◀ Back</button>
    ${invite?`<div class="card" data-for="secJoin"><h3>You're invited</h3><p class="note">Join <strong>${esc(invite.name)}</strong>: add your name below, then press Join.</p></div>`:""}
    <div class="card" data-for="secNew secJoin secCont"><h3>Your name</h3>
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
      <p class="note">You and your partner pick a mountain on the map and climb it together, one question per pitch, from base camp to the summit.</p>
      <ul class="qrules">
        <li><b>The rope lock.</b> Each pitch is a question with four answers. You both lock in an answer in secret, and they're shown together.</li>
        <li><b>The leader decides.</b> Leader and belayer swap every pitch. The leader's answer is the one that counts. If you disagree, the rope jerks and costs a hook.</li>
        <li><b>Hooks.</b> Clip one at any time during a question, and a wrong answer only slips you. Without one, you fall back to your anchor.</li>
        <li><b>Gear.</b> Chalk wipes out two wrong answers. The route scout gives the belayer a hint. An anchor locks in your height.</li>
        <li><b>Mountains.</b> ${MOUNTAIN_ORDER.map(k=>esc(MOUNTAINS[k].name)).join(", ")}: the higher the mountain, the harder the questions, the less time you get and the fewer hooks you carry.</li>
        <li><b>Camps</b> restock your gear. There you pick the route on, short and hard or long and gentler, and one extra piece of gear.</li>
        <li><b>The rope radio</b> lets you talk when you're apart. Side by side, just talk.</li></ul></div>
    <div class="card" id="secSet"><h3>Settings</h3>
      ${settingsHtml()}
    </div>`;
  drawTopo(null);
  $("#myname").onchange=readName;
  $("#createBtn").onclick=createTeam;
  $("#joinBtn").onclick=()=>joinTeam();
  $("#jcode").onkeydown=e=>{if(e.key==="Enter")joinTeam();};
  main.querySelectorAll(".teamrow").forEach(b=>b.onclick=()=>openTeam(b.dataset.code));
  const open=id=>{main.querySelectorAll(".card").forEach(c=>c.hidden=!(c.id===id||(c.dataset.for||"").split(" ").includes(id)));
    main.hidden=false;main.scrollTop=0;homeMenu(false);
    const f={secNew:"tname",secJoin:"jcode"}[id];if(f)setTimeout(()=>$("#"+f)?.focus({preventScroll:true}),60);};
  const close=()=>{main.hidden=true;homeMenu(true);};
  $("#backBtn").onclick=()=>{sfx("pop");close();};
  main.onkeydown=e=>{if(e.key==="Escape")close();};
  showHome([...(S.myTeams.length?[{id:"secCont",label:"Continue"}]:[]),{id:"secNew",label:"New expedition"},{id:"secJoin",label:"Join team"},
    {id:"secHow",label:"How to play"},{id:"secSet",label:"Settings"}],open);
  if(invite)open("secJoin");
  syncSettings();
}
async function createTeam(){
  const err=$("#createErr");const me=readName();if(!me){err.textContent="Add your name first.";$("#myname").focus();return;}
  const name=($("#tname").value||"").trim()||"Rope Team";const code=randCode();
  const btn=$("#createBtn");btn.disabled=true;
  const t={name,code,createdAt:Date.now(),createdBy:S.uid,members:{[S.uid]:{name:me,joined:Date.now()}},
    exp:newExp(1),round:{id:0,phase:"map",votes:{}},log:[{at:Date.now(),text:`${name} roped up and opened the map.`}],stats:{rounds:0,summits:0,wins:0,echoes:0,falls:0}};
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
  WAKE.off();S.unsubTeam?.();S.unsubAns?.();S.unsubPres?.();clearInterval(S.presTimer);
  S.unsubTeam=S.unsubAns=S.unsubPres=null;S.team=null;S.code=null;S.answers={};S.ansRound=null;S.panelKey=null;S.online=new Set();S.pres={};
  S.sus=S.seen=S.step=null;S.unread=0;S.radioOpen=false;closeMenu();const rb=$("#radioBtn"),bb=$("#rbubble");if(rb)rb.hidden=true;if(bb)bb.hidden=true;
}
function goLobby(){document.body.classList.remove("atmap");closeTeam();try{history.replaceState(null,"",location.pathname+location.search);}catch(e){}renderLobby();}
// the heartbeat: "I'm here", stamped by the server with its own time. The stamp comes straight back, and against
// the moment it was sent (the middle of the round trip) it gives this device's offset from the server's clock
function beat(){if(!S.code||document.visibilityState!=="visible")return;
  const path=`presence/${S.code}/${S.uid}`;if(window.TEST){fb.put(path,Date.now()).catch(()=>{});return;}
  const t0=Date.now();
  fetch(fb.url(path),{method:"PUT",headers:{"Content-Type":"application/json"},body:'{".sv":"timestamp"}'}).then(r=>r.json()).then(v=>{
    const mid=(t0+Date.now())/2;if(Date.now()-t0>3000)return; // (too slow a round trip to trust)
    if(typeof v==="number"){SKEW=v-mid;return;}
    // (should the reply not carry the stamp, it arrives on the presence stream a moment later)
    setTimeout(()=>{const own=S.pres&&S.pres[S.uid];if(typeof own==="number"&&own!==S.ownPres){S.ownPres=own;SKEW=own-mid;}},600);}).catch(()=>{});}
document.addEventListener("visibilitychange",beat);
// a phone would dim and lock its screen while the two talk a question over, so the screen is kept awake during a
// climb (where the browser can; the lock is dropped whenever the page is hidden, so it's taken again on return)
const WAKE={lock:null,
  async on(){if(WAKE.lock||!navigator.wakeLock||document.visibilityState!=="visible")return;
    try{const l=WAKE.lock=await navigator.wakeLock.request("screen");l.addEventListener("release",()=>{if(WAKE.lock===l)WAKE.lock=null;});
      if(!S.code)WAKE.off();}catch(e){WAKE.lock=null;}},
  off(){const l=WAKE.lock;WAKE.lock=null;if(l)l.release().catch(()=>{});}};
document.addEventListener("visibilitychange",()=>{if(S.code)WAKE.on();});
function updateOnline(){const n=now();S.online=new Set(Object.entries(S.pres||{}).filter(([,v])=>n-v<60000).map(([k])=>k));if(S.team)renderBar();}
function openTeam(code){
  closeTeam();S.code=code;hideHome();$("#main").hidden=false;if(typeof MUSIC!=="undefined")MUSIC.want(true,"climb");try{history.replaceState(null,"","#t-"+code);}catch(e){}
  const main=$("#main");main.className="";main.innerHTML=`<div class="panel"><p class="note">Clipping in…</p></div>`;
  let first=true;
  S.unsubTeam=fb.listen("teams/"+code,raw=>{
    const t=fixTeam(raw);
    if(!t||!t.members[S.uid]){if(first||S.team){toast(t?"You're not on this rope team.":"That rope team doesn't exist.");goLobby();}return;}
    first=false;S.team=t;S.names={};
    for(const [id,m] of Object.entries(t.members))S.names[id]=m.name||"Partner";
    if(t.round.id!==S.ansRound)subAnswers(t.round.id);
    render();if(t.round.phase==="pre")climbOn();
  });
  beat();S.presTimer=setInterval(beat,25000);WAKE.on();
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
  heart:pix([".kk...kk.","krrk.krRk","krwrkrrRk","krrrrrrRk",".krrrrRk.","..krrRk..","...kRk...","....k...."]),
  heartUsed:pix([".kk...kk.","kggk.kgGk","kgggkggGk","kggggggGk",".kggggGk.","..kggGk..","...kGk...","....k...."]),
  mtn:pix(["....k.....","...kck....","..kcckk...","..kcSkSk..",".kSSkSSSk.",".kSSSSSSSk","kSSSSSSSSk","kkkkkkkkkk"]),
  x:pix(["c.....c",".c...c.","..c.c..","...c...","..c.c..",".c...c.","c.....c"]),
  star:pix(["....y....","....y....","...yyy...","yyyyyyyyy",".yyyyyyy.","..yyyyy..","..yyyyy..",".yyy.yyy.",".y.....y."]),
  starOff:pix(["....g....","....g....","...ggg...","ggggggggg",".ggggggg.","..ggggg..","..ggggg..",".ggg.ggg.",".g.....g."]),
  radio:pix(["..c......","..c......","..c......",".ccccccc.",".cgggggc.",".cgyyygc.",".cgggggc.",".cgcgcgc.",".cgggggc.",".ccccccc."])
};
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
  const e=t.exp,L=lens(e),tot=total(e),at=e.pitch,dim=["s0","s1","s2"],camps=campStops(e);
  const pit=(gi,n,live)=>`<span class="pit ${live?(gi<at?"done":gi===at?"now":""):""}">${n}${live&&e.anchor===gi+1&&!camps.includes(e.anchor)?ICON.anchor:""}</span>`;
  const stop=(icon,name,alt,i)=>`<div class="mrow">${icon}<div class="mstop ${i===at?"here":""}">${name}<small>${fmt(alt)} m${i===at?" · you are here":""}${e.anchor===i&&i>0?" · anchor":""}</small></div></div>`;
  const stage=(s,start)=>{let h="";
    if(s===0)h=`<div class="mopt"><b>Approach</b>${SEG0_TIERS.map((k,i)=>pit(start+i,i+1,1)).join("")}</div>`;
    else{const F=FORKS[s-1],ch=e.choice[s-1];
      for(const key of ["A","B"]){const opt=F[key],chosen=ch===key;
        h+=`<div class="mopt ${ch&&!chosen?"off":""}"><b>${opt.name}</b>${opt.tiers.map((k,i)=>pit(start+i,i+1,chosen)).join("")}</div>`;}}
    return `<div class="mstage ${dim[s]}">${h}</div>`;};
  const c1=L[0],c2=L[0]+(L[1]||0);
  return `<h3>Route map</h3><div class="map">
    ${stop(ICON.flag,"Summit",mAlt(e,ALT.top),e.choice[1]?tot:-1)}${stage(2,c2)}
    ${stop(ICON.tent,"Camp II",mAlt(e,ALT.c2),e.choice[0]?c2:-1)}${stage(1,c1)}
    ${stop(ICON.tent,"Camp I",mAlt(e,ALT.c1),c1)}${stage(0,0)}
    ${stop(ICON.tent,"Base camp",mAlt(e,ALT.base),0)}</div>
    <div class="mlegend"><span><span class="pit done"></span> climbed</span><span><span class="pit now" style="animation:none"></span> this pitch</span><span>${ICON.anchor} anchor</span></div>`;}
const stars=run=>{const n=ascentStars(run);return `<span class="stars" role="img" aria-label="${n} of 3 stars">${ICON.star.repeat(n)}${ICON.starOff.repeat(3-n)}</span>`;};

/* ============================== THE MENU ==============================
   Over the climb: the route map, the team's record and log, the settings, the invite and the way out. */
function openMenu(){const t=S.team,el=$("#menu");if(!t||!el)return;
  const st=t.stats||{},b=st.best,two=memberIds(t).length>1;
  const row=(k,v)=>`<div class="line"><span class="who">${k}</span><span class="what">${v}</span></div>`;
  el.innerHTML=`<div class="panel msheet" role="dialog" aria-modal="true" aria-label="Menu">
    <div class="mhead"><div><div class="clabel">Rope team · ${esc(t.code)}</div><div class="qtitle">${esc(t.name)}</div></div><button class="ibtn" id="menuX" type="button" aria-label="Close">${ICON.x}</button></div>
    <div class="mbody">
      <section>${mapHtml(t)}</section>
      <section><h3>Team record</h3><div class="lines">${row("Summits",st.summits||0)}${b?row("Best ascent",`${stars(b)} ${b.right}/${b.q} right${b.ms?` · ${fmtDur(b.ms)}`:""}`):""}${row("Questions",st.rounds||0)}${two?row("In sync",st.synced||0):""}${row("Falls",st.falls||0)}</div></section>
      <section><h3>Expedition log</h3><ol class="log">${t.log.slice(-12).reverse().map(l=>`<li>${esc(l.text)}</li>`).join("")}</ol></section>
      <section><h3>Settings</h3>${settingsHtml()}</section>
    </div>
    <div class="actions mfoot"><button class="btn rope" id="menuBack">Back to the climb</button><button class="btn" id="menuInvite">${two?"Share invite link":"Invite partner"}</button><button class="btn ghost" id="menuLeave">Leave to title</button></div></div>`;
  el.hidden=false;syncSettings();sfx("pop");
  $("#menuX").onclick=$("#menuBack").onclick=closeMenu;$("#menuInvite").onclick=invite;$("#menuLeave").onclick=goLobby;
  el.onclick=e=>{if(e.target===el)closeMenu();};$("#menuBack").focus({preventScroll:true});}
function closeMenu(){const el=$("#menu");if(el&&!el.hidden){el.hidden=true;el.innerHTML="";}}
addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
// the invite: on a phone it goes out through the share sheet (messages, mail…); elsewhere the link is copied
async function invite(){const t=S.team;if(!t)return;const l=inviteLink(t.code);
  if(navigator.share&&matchMedia("(pointer:coarse)").matches){
    try{await navigator.share({title:"Pinnacle",text:`Rope up with me on Pinnacle (team code ${t.code})`,url:l});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  try{await navigator.clipboard.writeText(l);toast("Invite link copied");}catch(e){toast("Invite link: "+l);}}

/* ============================== RENDER ==============================
   As in the concept sheet: the climb fills the screen, the HUD sits along the top (both climbers' portraits and
   roles, the team's hooks as hearts, the gear row, altitude and rope), and the question interface is a framed panel
   along the bottom with the rope radio beside it. */
// the chalk bag and the scout's binoculars, drawn to read at the size of a thumb
ICON.chalk=pix(["...kkkk...","..kwwwwk..",".kkkkkkkk.",".kSSSSSSk.",".kSSwSSSk.",".kSwwwSSk.",".kSSwSSSk.",".kSSSSSSk.","..kSSSSk..","...kkkk..."]);
ICON.scout=pix([".kkk..kkk.","kGGGkkGGGk","kGsGkkGsGk","kGGGkkGGGk","kGGGkkGGGk","kSSSkkSSSk","kSSSkkSSSk","kkkk..kkkk"]);
function renderBar(){
  const t=S.team;if(!t){$("#teambar").innerHTML="";return;}
  const ids=memberIds(t);$("#teambar").classList.toggle("full",ids.length>1);
  $("#teambar").innerHTML=`<span class="teamname">${esc(t.name)}</span>
   <button class="chip" id="codeChip" title="Copy invite link">${esc(t.code)}<span class="long"> · copy invite link</span></button>
   <span class="climbers">${ids.map(id=>`<span class="climber"><i class="dot ${id===S.uid||S.online.has(id)?"on":""}"></i>${esc(nameOf(id))}</span>`).join("")}${ids.length<2?'<span class="climber"><i class="dot"></i>Waiting for partner</span>':""}</span>`;
  $("#codeChip").onclick=invite;
  // (phones: the radio opens from the bar, where a dot shows a message waiting)
  const rb=$("#radioBtn");if(rb){rb.hidden=ids.length<2;rb.classList.toggle("unread",!!S.unread&&!S.radioOpen);rb.setAttribute("aria-pressed",!!S.radioOpen);}
  $("#homeBtn").hidden=false;
}
function render(){
  const t=S.team;if(!t)return;renderBar();
  const main=$("#main");
  if(!main.classList.contains("game2")){main.className="game2";main.innerHTML=`<div class="panel qpanel" id="panel"></div><div class="card radio2" id="radio"></div>`;S.hudHtml=S.radioKey=null;}
  // a result seen as it happens waits a beat: the answers show first, then (with the climb) how it went
  const r=t.round;
  if(r.phase==="reveal"&&S.seen&&S.seen.id===r.id&&S.seen.phase==="answer"){S.sus=r.id;
    setTimeout(()=>{if(S.sus===r.id){S.sus=null;S.susDone=r.id;if(S.team)render();}},SUSPENSE_MS);}
  S.seen={id:r.id,phase:r.phase};
  const atMap=r.phase==="map";$("#hud").hidden=atMap;document.body.classList.toggle("atmap",atMap);drawTopo(t);if(S.sus!==r.id&&!atMap)renderHud(t);renderPanel(t);renderRadio(t);renderWorld(t);
}
// who leads this pitch (or the next one, between pitches)
function leaderOf(t){const r=t.round,ids=memberIds(t);return ["pre","answer","reveal"].includes(r.phase)?r.leader:ids[(r.id+1)%ids.length];}
// player 1 (who made the team) climbs in red, player 2 in yellow
const lookOf=(t,id)=>memberIds(t).indexOf(id)>0?LOOK.mate:LOOK.me;
const ptag=(t,id)=>"P"+(memberIds(t).indexOf(id)+1);
function renderHud(t){
  const e=t.exp,alt=altOf(e,e.pitch),ids=memberIds(t),lead=leaderOf(t),so=stageOf(e,e.pitch);
  // a heart that was lost since the last render cracks away (a rope jerk or a clipped hook)
  const lost=S.prevRope!=null&&S.prevRope>e.rope&&S.prevN===e.n?S.prevRope:e.rope;S.prevRope=e.rope;S.prevN=e.n;
  const n=Math.max(MT(e).hooks,e.rope,lost);
  const who=ids.map(id=>`<div class="who ${id===lead?"lead":""}"><img class="port" src="${portrait(lookOf(t,id))}" alt=""><div><div class="nm">${ptag(t,id)} ${esc(S.names[id]||nameOf(id))}${id===S.uid?" (you)":""}</div>
    <span class="role ${id===lead?"lead":"belay"}">${id===lead?"Leader":"Belayer"}</span></div></div>`).join("");
  const hearts=`<div class="hearts" title="Hooks: clip one during a question and a wrong answer only slips you. A rope jerk costs one." aria-label="${e.rope} hooks left">${
    [...Array(n).keys()].map(i=>i<e.rope?ICON.hook:i<lost?`<span class="crack">${ICON.hook}</span>`:ICON.hookUsed).join("")}</div>`;
  const html=`<div class="hud-l">${who}${hearts}</div>
   <div class="hud-r"><div class="stat">${ICON.mtn}<span class="k">Alt</span><span class="v">${fmt(alt)} m</span></div>
     <div class="stat">${ICON.rope}<span class="k">Rope</span><span class="v">${fmt(alt-altOf(e,e.anchor))} m</span></div>
     <div class="stat">${ICON.flag}<span class="k">Pitch</span><span class="v">${Math.min(so.i+1,so.n)}/${so.n}</span></div></div>`;
  if(S.hudHtml!==html){S.hudHtml=html;$("#hud").innerHTML=html;}
}
// seconds left on a question's clock: more than its length during the count before it starts, below zero once it's over
function remaining(r){return (r.startedAt+r.dur*1000-now())/1000;}
const clock=rem=>{const s=Math.max(0,Math.ceil(rem));return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;};
// the question panel's picture: the lumberjack on a scrap of the mountain's granite, painted once the art is in
let PITCH_ART=null;
function pitchArt(){if(PITCH_ART)return PITCH_ART;const R=ART.rocks&&ART.rocks[0],A=LOOK.me.art;if(!R||!A||!A.ready)return asset("assets/emblem.png");
  const [c,g]=mk(72,56);C.sky.forEach((col,i)=>rect(g,0,R0(i*56/C.sky.length),72,56,col));
  const id=g.getImageData(0,0,72,56),d=id.data,T=R.lo;
  for(let y=0;y<56;y++)for(let x=0;x<72;x++){if(x<44+((hash(y>>2,9)*5)|0))continue;const i=(y*72+x)*4,j=(((y+30)%T.h)*T.w+(x%T.w))*4;d[i]=T.d[j];d[i+1]=T.d[j+1];d[i+2]=T.d[j+2];d[i+3]=255;}
  g.putImageData(id,0,0);const fr=A.clips.climb[2],b=boxOf(fr),w=b.x1-b.x0+1;g.drawImage(fr,b.x0,b.y0,w,54,48-w,3,w,54);
  return PITCH_ART=c.toDataURL();}
const tierMarks=k=>`<span class="tier" aria-label="difficulty ${k} of 4">${"▲".repeat(k)}<i>${"▲".repeat(4-k)}</i></span>`;
// "Stage 2 · Pitch 3/5": where a pitch sits on the whole climb
const pitchLabel=(e,p)=>{const so=stageOf(e,p);return `Stage ${so.s+1} · Pitch ${Math.min(so.i+1,so.n)}/${so.n}`;};

function renderPanel(t){
  const r=t.round,e=t.exp,panel=$("#panel"),mine=S.answers[S.uid];
  const key=[r.id,r.phase,!!mine,memberIds(t).length,r.phase==="camp"||r.phase==="map"?JSON.stringify(r.votes||{}):"",JSON.stringify(t.stats?.peaks||{}),r.resolvedAt||"",String(r.cut),!!r.scout,!!r.hook,r.phase==="answer"&&now()<r.startedAt,S.sus===r.id,e.chalk,e.scout,e.rope,Object.values(S.names).join(",")].join("|");
  if(key===S.panelKey){updateDynamic(t);return;}
  if(S.panelKey&&S.panelKey.split("|")[0]!==String(r.id))S.local={};S.panelKey=key;S.local=S.local||{};
  // a new step of the round starts at its top (on a phone the panel is a sheet that scrolls)
  // (and its parts ease in)
  const step=r.id+"|"+r.phase;if(S.step!==step){S.step=step;$("#main").scrollTop=0;panel.classList.remove("enter");void panel.offsetWidth;panel.classList.add("enter");}
  panel.innerHTML=r.phase==="map"?mapView(t):r.phase==="ready"?readyView(t):r.phase==="pre"?`<p class="note">Setting off…</p>`:r.phase==="answer"?answerView(t,mine):r.phase==="reveal"?revealView(t):r.phase==="camp"?campView(t):summitView(t);
  wirePanel(t);updateDynamic(t);
  // the result lands with a sound of its own
  if(r.phase==="reveal"&&S.sus!==r.id&&S.susDone===r.id&&S.stung!==r.id){S.stung=r.id;sfx(r.result?.correct?"right":"wrong");}
}
function frameQ(t,main){return `<div class="qwrap"><div class="qart"><img src="${pitchArt()}" alt=""></div><div class="qmain">${main}</div></div>`;}
function readyView(t){
  const solo=memberIds(t).length<2;
  const m=MT(t.exp);
  return frameQ(t,`<div class="qhead"><span>Expedition ${t.exp.n} · ${esc(QUIZ_THEME)}</span></div>
   <div class="qtitle">${esc(m.name)}</div>
   <p class="qsub">From base camp at ${fmt(m.alt.base)} m to the summit at ${fmt(m.alt.top)} m, one question per pitch.</p>
   ${solo?`<p class="note">Your partner joins with the invite link or the code <strong>${esc(t.code)}</strong>. Climbing alone works too.</p>`:""}
   <div class="actions"><button class="btn rope" id="goBtn">Start the climb</button>${solo?`<button class="btn" id="inviteBtn">Invite partner</button>`:""}</div>`);
}
function answerView(t,mine){
  const r=t.round,q=quizById(r.qid),e=t.exp,ids=memberIds(t),solo=ids.length<2,lead=r.leader===S.uid||solo,cut=r.cut||[];
  const role=solo?"":`<span class="role ${lead?"lead":"belay"}" title="${lead?"Your answer is the one that counts on this pitch.":"Your leader's answer counts. If yours differs, the rope jerks and costs a hook."}">${lead?"Leader":"Belayer"}</span>`;
  // the count before the clock starts: what the question is about and how hard, so both are ready together
  if(now()<r.startedAt)return frameQ(t,`<div class="qhead"><span>${pitchLabel(e,e.pitch)}</span>${role}</div>
   <div class="getready"><div><div class="qtitle">${esc(q.cat)}</div>${tierMarks(q.tier)}</div><div class="count" id="count" aria-hidden="true"></div></div>
   <p class="qsub">${solo?"Get ready.":lead?"You lead: your answer counts. If your partner answers differently, the rope jerks and costs a hook.":`${esc(nameOf(r.leader))} leads: their answer counts. Answer differently and the rope jerks and costs a hook.`}</p>`);
  const sel=mine?mine.choice:S.local.choice;
  const opts=r.order.map((k,i)=>`<button class="qopt ${cut.includes(i)?"cut":""} ${sel===i?"sel":""}" data-i="${i}" ${cut.includes(i)||mine?"disabled":""}><b>${LETTERS[i]}</b><span>${esc(q.o[k])}</span></button>`).join("");
  // the gear, one button each: a hook (either climber, any time while the question is open), chalk, and the scout
  // (the belayer's, or the climber's alone on the rope)
  const gear=`<div class="qgear">
    <button class="gbtn ${r.hook?"on":""}" id="hookBtn" aria-label="${r.hook?"Hook clipped":`Clip a hook, ${e.rope} left`}" title="Clip a hook: a wrong answer then only slips you, instead of dropping you to your anchor" ${!r.hook&&e.rope>0?"":"disabled"}>${ICON.hook}<span>${r.hook?"Clipped":"Hook"}</span><b>${e.rope}</b></button>
    <button class="gbtn" id="chalkBtn" aria-label="Chalk, ${e.chalk} left" title="Chalk: wipes out two wrong answers" ${e.chalk>0&&!r.cut?"":"disabled"}>${ICON.chalk}<span>Chalk</span><b>${e.chalk}</b></button>
    ${!lead||solo?`<button class="gbtn" id="scoutBtn" aria-label="Route scout, ${e.scout} left" title="Route scout: a hint only you see" ${e.scout>0&&!r.scout?"":"disabled"}>${ICON.scout}<span>Scout</span><b>${e.scout}</b></button>`:""}</div>`;
  const hint=!r.scout?"":!lead||solo?`<div class="hint"><b>Scout:</b> ${esc(q.hint)}</div>`:`<p class="note">Your belayer has a hint. Ask on the radio.</p>`;
  const hooked=r.hook?`<div class="hooked">${ICON.hook}<span><b>${r.hookBy===S.uid?"You clipped a hook.":`${esc(nameOf(r.hookBy))} clipped a hook.`}</b> A wrong answer now only slips you.</span></div>`:"";
  return frameQ(t,`<div class="qhead"><span>${pitchLabel(e,e.pitch)} · ${esc(q.cat)}</span>${role}<span class="qtime" id="qtime"></span></div>
   <div class="qtext">${esc(q.q)}</div><div class="qopts">${opts}</div>
   ${hint}${hooked}
   <div class="qfoot">${gear}${mine?`<div class="wait">Locked in: <strong>${mine.choice==null?"no answer":LETTERS[mine.choice]}</strong></div>`:`<button class="btn rope" id="lockBtn" ${sel==null?"disabled":""}>Lock in</button>`}<span class="note" id="partnerTxt"></span></div>
   <div class="timer"><i id="timerBar"></i></div>`);
}
function revealView(t){
  const r=t.round,o=r.result||{},q=quizById(r.qid),e=t.exp,ids=memberIds(t),bel=ids.find(i=>i!==r.leader),sus=S.sus===r.id;
  const atCamp=needsChoice(e)>=0,atTop=!atCamp&&e.pitch>=total(e),canAnchor=!atCamp&&!atTop&&o.move>0&&e.anchors>0&&e.anchor!==e.pitch;
  // (for the beat before the result, both answers show as picked, and nothing says yet which was right)
  const opts=r.order.map((k,i)=>{const tags=(i===o.lead?`<em class="lead">${ptag(t,r.leader)}</em>`:"")+(bel&&i===o.bel?`<em class="belay">${ptag(t,bel)}</em>`:"");
    return `<div class="qopt ${sus?(i===o.lead||(bel&&i===o.bel)?"sel":""):i===o.right?"right":i===o.lead?"wrong":""}"><b>${LETTERS[i]}</b><span>${esc(q.o[k])}</span>${tags}</div>`;}).join("");
  const head=`<div class="qhead"><span>${pitchLabel(e,o.from)} · ${esc(q.cat)}</span>${!sus&&o.jerk?`<span class="jerk">ROPE JERK!</span>`:""}</div>
   <div class="qtext">${esc(q.q)}</div><div class="qopts">${opts}</div>`;
  if(sus)return frameQ(t,head+`<div class="result wait"><div><b class="dots">The rope goes tight</b></div></div>`);
  const oc=o.arrived==="summit"?[ICON.flag,"Summit reached!"]:o.arrived?[ICON.tent,`${o.arrived} reached!`]:o.fall&&o.caught?[ICON.hook,o.headline]:o.fall?[ICON.anchor,o.headline]:[ICON.up,o.headline];
  return frameQ(t,head+`<div class="result ${o.tone||"good"}">${oc[0]}<div><b>${esc(oc[1])}</b><span>${esc(o.moveText||"")}</span></div></div>
   ${q.x?`<p class="fact">${esc(q.x)}</p>`:""}
   <div class="actions">${atCamp?`<button class="btn rope" id="nextBtn">Make camp</button>`:atTop?`<button class="btn rope" id="nextBtn">Stand on top</button>`:`<button class="btn rope" id="nextBtn">Next pitch</button>${canAnchor?`<button class="btn ghost" id="anchorBtn" title="A fall without a hook will drop you no lower than this">Place anchor (${e.anchors} left)</button>`:""}`}</div>`);
}
// the map's panel: the three mountains as cards (the map above has them as pins too), the picked one's details,
// and the way to set off
const diffMarks=k=>`<span class="tier" aria-label="difficulty ${k} of 3">${"▲".repeat(k)}<i>${"▲".repeat(3-k)}</i></span>`;
function mapView(t){
  const r=t.round,votes=r.votes||{},ids=memberIds(t),solo=ids.length<2,lead=solo||leaderOf(t)===S.uid,mine=votes[S.uid]?.mtn,pk=t.stats?.peaks||{};
  const pick=mapPick(t),agreed=ids.every(i=>votes[i]?.mtn===pick),can=pick&&(lead||agreed);
  const who=k=>ids.filter(i=>votes[i]?.mtn===k).map(i=>esc(nameOf(i))).join(", ")||"&nbsp;";
  const card=k=>{const m=MOUNTAINS[k],rec=pk[k];return `<button class="route mcard d${m.diff} ${mine===k?"sel":""}" data-mtn="${k}">
    <h4>${esc(m.name)}</h4><span class="rmeta">${diffMarks(m.diff)} ${m.label}</span>
    <span class="mfacts">${fmt(m.alt.top)} m · ${m.secs} s · ${m.hooks} hooks</span>
    ${rec?`<span class="mrec">${ICON.flag} Climbed ${rec.n}×</span>`:""}<span class="votes">${who(k)}</span></button>`;};
  const m=pick&&MOUNTAINS[pick];
  return frameQ(t,`<div class="qhead"><span>Expedition ${t.exp.n} · Choose a mountain</span></div>
   <div class="routes mts">${MOUNTAIN_ORDER.map(card).join("")}</div>
   ${m?`<p class="qsub"><b>${esc(m.name)}.</b> ${esc(m.desc)}</p>`:`<p class="qsub">Tap a mountain on the map${solo?"":", and talk it over with your partner"}.</p>`}
   ${can?`<button class="btn rope" id="setOffBtn">Set off for ${esc(m.name)}</button>`:pick?`<p class="note">Waiting for ${esc(nameOf(ids.find(i=>i!==S.uid)))} to pick ${esc(m.name)} too, or to set off.</p>`:""}`);
}
/* the map itself, over the climb while the team chooses: the painted island scaled to the open part of the
   screen, a pin on each mountain (its name, its difficulty, who picked it, a flag once climbed) and the team's
   camp at the foot of the trails */
function renderWorld(t){const el=$("#world");if(!el)return;const r=t&&t.round,on=!!(r&&r.phase==="map");
  if(!on){if(!el.hidden){el.hidden=true;el.innerHTML="";S.worldKey=null;}return;}
  const votes=r.votes||{},ids=memberIds(t),pk=t.stats?.peaks||{},key=JSON.stringify([votes,pk,ids]);
  if(el.hidden){el.hidden=false;el.classList.remove("in");void el.offsetWidth;el.classList.add("in");}
  if(S.worldKey!==key){S.worldKey=key;
    const pin=k=>{const m=MOUNTAINS[k],tags=ids.filter(i=>votes[i]?.mtn===k).map(i=>`<em class="${i===S.uid?"me":""}">${ptag(t,i)}</em>`).join("");
      return `<button class="wpin d${m.diff} ${votes[S.uid]?.mtn===k?"sel":""}" data-mtn="${k}" style="left:${100*m.map[0]/MAP_W}%;top:${100*m.map[1]/MAP_W}%" aria-label="${esc(m.name)}, ${m.label}">
        <span class="wflag" aria-hidden="true"></span><span class="wplate"><b>${esc(m.name)}</b><small>${diffMarks(m.diff)}<span class="lbl"> ${m.label}</span>${pk[k]?ICON.flag:""}</small>${tags?`<span class="wtags">${tags}</span>`:""}</span></button>`;};
    el.innerHTML=`<div class="wbox"><div class="wmap"><img src="${asset("assets/map.png")}" alt="A map of three mountains around a valley">
      <span class="wcamp" style="left:${100*MAP_CAMP[0]/MAP_W}%;top:${100*MAP_CAMP[1]/MAP_W}%">Camp</span>${MOUNTAIN_ORDER.map(pin).join("")}</div></div>`;
    el.querySelectorAll(".wpin").forEach(b=>b.onclick=()=>pickMountain(b.dataset.mtn));}
  fitWorld();}
// the map fills the space the bar and the question box leave, at a whole-pixel scale where it fits
function fitWorld(){const el=$("#world"),box=el&&el.querySelector(".wbox"),map=el&&el.querySelector(".wmap");if(!map||el.hidden)return;
  const W=innerWidth,H=innerHeight,m=$("#main").getBoundingClientRect(),bar=$("#bar").getBoundingClientRect().bottom;
  const side=m.width<W*.7&&m.height>H*.7,x0=side?m.right:0,y0=bar+4,y1=side?H:m.top-4;
  Object.assign(box.style,{left:x0+"px",top:y0+"px",width:(W-x0)+"px",height:Math.max(80,y1-y0)+"px"});
  const avail=Math.min(W-x0-16,y1-y0-8)/MAP_W,k=avail>=1?Math.floor(avail):Math.max(.4,Math.floor(avail*8)/8);
  map.style.width=map.style.height=MAP_W*k+"px";map.classList.toggle("tight",k<.95);}
addEventListener("resize",()=>fitWorld());
// at camp: two rows of cards, the route on and the bonus gear; each climber's picks are shown under the cards
function campView(t){
  const r=t.round,s=r.stage??needsChoice(t.exp),F=FORKS[s],votes=r.votes||{},ids=memberIds(t),solo=ids.length<2,lead=solo||leaderOf(t)===S.uid,my=votes[S.uid]||{};
  const who=(part,k)=>ids.filter(i=>votes[i]?.[part]===k).map(i=>esc(nameOf(i))).join(", ")||"&nbsp;";
  const route=k=>`<button class="route ${my.route===k?"sel":""}" data-part="route" data-k="${k}"><h4>${F[k].name}</h4><span>${F[k].desc}</span>
    <span class="rmeta">${F[k].tiers.length} pitches ${tierMarks(Math.round(F[k].tiers.reduce((a,b)=>a+b,0)/F[k].tiers.length))}</span><span class="votes">${who("route",k)}</span></button>`;
  const bonus=k=>`<button class="route ${my.bonus===k?"sel":""}" data-part="bonus" data-k="${k}"><h4>${BONUS[k].name}</h4><span>${BONUS[k].desc}</span><span class="votes">${who("bonus",k)}</span></button>`;
  const ready=my.route&&my.bonus;
  return frameQ(t,`<div class="qhead"><span>${F.camp} · ${fmt(mAlt(t.exp,s?ALT.c2:ALT.c1))} m</span></div>
   <div class="qtitle">Rest at ${F.camp}</div>
   <p class="qsub">Gear restocked. Pick the way to ${F.next} and one extra piece of gear${solo?"":`; ${lead?"you make":"your partner makes"} the call`}.</p>
   <div class="clabel">Route to ${F.next}</div><div class="routes">${route("A")}${route("B")}</div>
   <div class="clabel">Extra gear</div><div class="routes bonus">${bonus("hook")}${bonus("chalk")}${bonus("scout")}</div>
   ${lead?`<button class="btn rope" id="campBtn" ${ready?"":"disabled"}>${ready?`Climb on via ${F[my.route].name}`:"Pick a route and a piece of gear"}</button>`:`<p class="note">Waiting for your partner to decide.</p>`}`);
}
// the end of the expedition: the summit, how the team climbed (a grade in stars, the numbers behind it), and a way
// to tell someone
function summitView(t){const e=t.exp,st=e.run||{},two=memberIds(t).length>1;
  const via=[FORKS[0][e.choice[0]]?.name,FORKS[1][e.choice[1]]?.name].filter(Boolean).join(" and ");
  const cell=(k,v)=>`<div class="scell"><b>${v}</b><span>${k}</span></div>`;
  const grade=["","Made it to the top","A solid climb","A clean ascent"][ascentStars(st)];
  return frameQ(t,`<div class="qhead"><span>Summit · ${fmt(mAlt(e,ALT.top))} m · Expedition ${e.n}</span></div>
   <div class="qtitle">Top of ${esc(MT(e).name)}!</div>
   <div class="grade">${stars(st)}<b>${grade}</b>${st.best?`<span class="chip0 new">New team best</span>`:""}</div>
   ${via?`<p class="qsub">By way of ${esc(via)}.</p>`:""}
   <div class="sgrid">${cell("Right",`${st.right||0}/${st.q||0}`)}${two?cell("In sync",st.synced||0)+cell("Rope jerks",st.jerks||0):""}${cell("Hooks held",st.slips||0)}${cell("Falls",st.falls||0)}${st.ms?cell("Time",fmtDur(st.ms)):""}</div>
   <div class="actions"><button class="btn rope" id="newExpBtn">Back to the map</button><button class="btn" id="shareBtn">Share</button></div>`);
}
async function shareSummit(){const t=S.team;if(!t)return;const st=t.exp.run||{},f=st.falls||0;
  const text=`We stood on top of ${MT(t.exp).name} (${MT(t.exp).label.toLowerCase()}) in Pinnacle: ${st.right||0} of ${st.q||0} questions right, ${f===1?"1 fall":f+" falls"}${st.ms?`, ${fmtDur(st.ms)}`:""}.`,url=location.origin+location.pathname;
  if(navigator.share){try{await navigator.share({title:"Pinnacle",text,url});return;}catch(e){if(e&&e.name==="AbortError")return;}}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Copied, ready to paste");}catch(e){toast(text);}}

/* the rope radio: messages and quick calls between the two, kept beside the round's answers (answers/<team>/<round>/_talk) */
const talkOf=()=>Object.values(S.answers._talk||{}).filter(m=>m&&m.text).sort((a,b)=>a.at-b.at);
const CALLS=["A?","B?","C?","D?","Not sure","Trust me","Clip a hook","Save it"];
function renderRadio(t){
  const el=$("#radio"),solo=memberIds(t).length<2,key=[t.round.id,solo].join("|");
  if(S.radioKey===key){updateRadio(t);return;}S.radioKey=key;
  el.classList.toggle("solo",solo);el.classList.toggle("open",!!S.radioOpen);
  el.innerHTML=`<div class="rhead"><span>Rope radio</span><span id="rstate"></span><button class="ibtn rclose" id="rclose" type="button" aria-label="Close the radio">${ICON.x}</button></div>
   <div class="rlog" id="rlog"></div>
   ${solo?`<p class="note">The radio links you to your partner once they've joined.</p>`:`<div class="calls">${CALLS.map(c=>`<button class="call" data-c="${esc(c)}">${esc(c)}</button>`).join("")}</div>
   <div class="row"><input type="text" id="rmsg" maxlength="60" autocomplete="off" placeholder="Say something…" aria-label="Message your partner"><button class="btn ghost" id="rsend">Send</button></div>`}`;
  $("#rclose").onclick=()=>toggleRadio(false);
  el.querySelectorAll(".call").forEach(b=>b.onclick=()=>sendTalk(b.dataset.c));
  const inp=$("#rmsg");if(inp){$("#rsend").onclick=()=>{sendTalk(inp.value);inp.value="";};inp.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();sendTalk(inp.value);inp.value="";}};}
  el.querySelector(".rlog").dataset.n="";updateRadio(t);
}
// on a phone the radio is tucked away behind its button in the bar: opening it shows it under the question, and a
// message that comes in while it's shut pops up as a bubble over the climb and leaves a dot on the button
function toggleRadio(open){const el=$("#radio");if(!el)return;S.radioOpen=open??!S.radioOpen;S.unread=0;el.classList.toggle("open",S.radioOpen);
  const bb=$("#rbubble");if(bb)bb.hidden=true;if(S.team)renderBar();
  if(S.radioOpen){const rl=$("#rlog");if(rl)rl.scrollTop=rl.scrollHeight;el.scrollIntoView({block:"nearest"});}}
function bubble(html){const b=$("#rbubble");if(!b)return;b.innerHTML=html;b.hidden=false;clearTimeout(bubble._t);bubble._t=setTimeout(()=>b.hidden=true,4500);}
async function sendTalk(text){text=String(text||"").trim().replace(/\s+/g," ").slice(0,60);if(!text||!S.team)return;
  const r=S.team.round,k=talkOf().filter(m=>m.uid===S.uid).length;
  try{await fb.put(`answers/${S.code}/${r.id}/_talk/${S.uid}_${k}`,{uid:S.uid,text,at:Date.now()});}catch(e){toast("Couldn't send that over the radio.");}}
function updateRadio(t){const rl=$("#rlog");if(!rl)return;const msgs=talkOf();
  if(rl.dataset.n!==String(msgs.length)){const fresh=msgs.length>(+rl.dataset.n||0);rl.dataset.n=msgs.length;
    rl.innerHTML=msgs.map(m=>`<div class="msg ${m.uid===S.uid?"me":""}"><b>${ptag(t,m.uid)}</b>${esc(m.text)}</div>`).join("")||`<div class="note">Nothing on the radio yet.</div>`;
    const last=msgs[msgs.length-1];rl.scrollTop=rl.scrollHeight;
    if(fresh&&last&&last.uid!==S.uid){sfx("tug");if(!S.radioOpen){S.unread=(S.unread||0)+1;bubble(`<b>${esc(S.names[last.uid]||ptag(t,last.uid))}</b> ${esc(last.text)}`);renderBar();}}}
  const pid=partnerId(t),st=$("#rstate");if(st)st.textContent=pid?(S.online.has(pid)?"partner online":"partner away"):"";}

function wirePanel(t){
  const r=t.round,P=$("#panel");
  P.querySelector("#goBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#nextBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#anchorBtn")?.addEventListener("click",()=>advance(true));
  P.querySelector("#newExpBtn")?.addEventListener("click",newExpedition);
  P.querySelector("#shareBtn")?.addEventListener("click",shareSummit);
  P.querySelector("#inviteBtn")?.addEventListener("click",invite);
  P.querySelectorAll(".route[data-part]").forEach(b=>b.addEventListener("click",()=>{sfx("pop");campVote(b.dataset.part,b.dataset.k);}));
  P.querySelectorAll(".route[data-mtn]").forEach(b=>b.addEventListener("click",()=>pickMountain(b.dataset.mtn)));
  P.querySelector("#setOffBtn")?.addEventListener("click",()=>{const v=mapPick(t);if(v)chooseMountain(v);});
  P.querySelector("#campBtn")?.addEventListener("click",()=>{const v=(t.round.votes||{})[S.uid];if(v?.route&&v?.bonus)campPick(v.route,v.bonus);});
  if(r.phase!=="answer")return;
  P.querySelector("#hookBtn")?.addEventListener("click",()=>{sfx("grab");useHook();});
  P.querySelector("#chalkBtn")?.addEventListener("click",useChalk);
  P.querySelector("#scoutBtn")?.addEventListener("click",useScout);
  P.querySelectorAll(".qopt[data-i]").forEach(b=>b.addEventListener("click",()=>{if(S.answers[S.uid])return;S.local.choice=+b.dataset.i;sfx("pop");
    P.querySelectorAll(".qopt").forEach(x=>x.classList.toggle("sel",x===b));const l=$("#lockBtn");if(l)l.disabled=false;}));
  P.querySelector("#lockBtn")?.addEventListener("click",()=>{if(S.local.choice!=null&&!S.answers[S.uid])submit({choice:S.local.choice});});
}
function updateDynamic(t){
  const r=t.round;updateRadio(t);if(r.phase!=="answer")return;
  // the count before the clock starts, a tick for each number
  if(now()<r.startedAt){const c=$("#count"),n=String(Math.ceil((r.startedAt-now())/1000));if(c&&c.textContent!==n){c.textContent=n;sfx("tick");}return;}
  const rem=remaining(r),bar=$("#timerBar"),txt=$("#qtime"),ptx=$("#partnerTxt");
  if(bar)bar.style.width=Math.max(0,Math.min(100,100*rem/r.dur))+"%";
  if(txt){txt.textContent=clock(rem);txt.classList.toggle("low",rem<=10);}
  // the last five seconds tick, for whoever hasn't locked in yet
  const s=Math.ceil(rem);if(rem>0&&s<=5&&!S.answers[S.uid]&&S._beep!==r.id+":"+s){S._beep=r.id+":"+s;sfx("tick");}
  const pid=partnerId(t);if(ptx)ptx.textContent=pid?(S.answers[pid]?`${nameOf(pid)} is locked in`:`${nameOf(pid)} is thinking…`):"";
}

/* ============================== TICK ============================== */
let tickN=0;
setInterval(()=>{
  if(++tickN%40===0)updateOnline();
  const t=S.team;if(!t)return;if(t.round.phase!=="answer"){updateDynamic(t);return;}
  renderPanel(t); // (the count gives way to the question; otherwise this only moves the clock)
  const r=t.round,rem=remaining(r);
  // out of time: whatever is selected is locked in (or no answer)
  if(rem<=0&&!S.answers[S.uid]&&S._autoSent!==r.id){S._autoSent=r.id;submit({choice:S.local.choice??null});}
  const all=memberIds(t).every(id=>S.answers[id]);
  // the pitch's leader judges; the partner steps in if the leader is away or slow
  const mine=r.leader===S.uid||!t.members[r.leader]||!S.online.has(r.leader)||rem<=-10;
  if((all||rem<=-2)&&mine&&Date.now()-(S._lastTry||0)>2500){S._lastTry=Date.now();tryResolve();}
},250);
