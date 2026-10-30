/* Shared storage: Pinnacle's own Firebase Realtime Database (access rules live in database.rules.json). */
const FB="https://pinnacle-5f36a-default-rtdb.europe-west1.firebasedatabase.app";
const S={uid:null,myName:"",code:null,team:null,answers:{},names:{},online:new Set(),pres:{},local:{},
  unsubTeam:null,unsubAns:null,unsubPres:null,presTimer:null,ansRound:null,resolving:false,acting:false,
  myTeams:[],panelKey:null,sample:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const fmt=n=>Math.round(n).toLocaleString("en-US").replace(/,/g," ");
function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600);}
const memberIds=t=>Object.keys(t.members||{}).sort();
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
  const e=t.exp=t.exp||newExp(1);const c=e.choice||{};e.choice=[c[0]||null,c[1]||null];
  e.used=Object.values(e.used||{});
  for(const k of ["pitch","anchor","rope"])e[k]=e[k]||0;
  t.round=t.round||{id:0,phase:"ready"};t.round.id=t.round.id||0;t.round.votes=t.round.votes||{};
  if(t.round.result)t.round.result.lines=Object.values(t.round.result.lines||{});
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
function newExp(n,prev){return {n,choice:[null,null],pitch:0,anchor:0,rope:3,used:prev?prev.used.slice(-40):[]};}

/* ============================== QUESTION PICK ============================== */
function poolFor(terrain){return terrain==="slab"||terrain==="chimney"?RARE:terrain==="traverse"?LISTS:terrain==="crevasse"?EST:MCQ;}
function pickQ(terrain,used){const pool=poolFor(terrain);let fresh=pool.filter(q=>!used.includes(q.id));
  if(!fresh.length)fresh=pool;return fresh[Math.floor(Math.random()*fresh.length)].id;}
function qById(terrain,id){return poolFor(terrain).find(q=>q.id===id);}

/* ============================== JUDGING ============================== */
async function llmJudge(prompt,answers){
  if(!S.sample||!answers.length)return null;
  const input=`You judge answers in a trivia game. The prompt was: "${prompt}".
For each submitted answer decide:
- valid: true only if it is a real, correct answer to the prompt (forgive spelling mistakes and Swedish/English name variants; reject jokes, made-up names and wrong categories)
- canonical: the standard English name of the thing
- rarity: 1 to 5, where 1 = among the first things most people would say and 5 = only an expert would think of it
Answers: ${JSON.stringify(answers)}
Reply with JSON only: {"results":[{"answer":"...","valid":true,"canonical":"...","rarity":3}]}`;
  try{const r=await S.sample.json(input,{modelTier:"quick"});return Array.isArray(r?.results)?r.results:null;}
  catch(e){return null;}
}
async function judgeRare(q,texts){ // texts: array of strings -> array of {text,valid,tier,canon,src}
  const out=texts.map(t=>{if(!t||!norm(t))return {text:t||"",valid:false,tier:0,canon:"",src:"empty"};
    const e=matchEntry(q.entries,t);return e?{text:t,valid:true,tier:e.tier,canon:norm(e.canon),label:e.label,src:"list"}:{text:t,valid:null};});
  const unknown=[...new Set(out.filter(o=>o.valid===null).map(o=>o.text))];
  if(unknown.length){const res=await llmJudge(q.q,unknown);
    for(const o of out){if(o.valid!==null)continue;
      const r=res?.find(x=>norm(x.answer)===norm(o.text));
      if(r&&r.valid){o.valid=true;o.tier=Math.max(1,Math.min(5,Math.round(r.rarity||4)));o.canon=norm(r.canonical||o.text);o.label=r.canonical||o.text;o.src="judge";}
      else{o.valid=false;o.tier=0;o.canon="";o.src=res?"judge":"unverified";}}}
  return out;
}
function tagFor(o){if(o.src==="empty")return '<span class="tag no">no answer</span>';
  if(!o.valid)return `<span class="tag no">${o.src==="unverified"?"not on our list":"not valid"}</span>`;
  return `<span class="tag ok"><span class="rar" aria-label="rarity ${o.tier} of 5">${dots(o.tier)}</span></span>`;}

async function judge(t,ans){
  const r=t.round,ids=memberIds(t),leader=r.leader,bel=ids.find(i=>i!==leader);
  const q=qById(r.terrain,r.qid);const o={move:0,fall:false,lines:[],headline:"",tone:"good"};
  const A=id=>id?ans[id]:null;
  if(r.terrain==="slab"){ // both halves must meet: a real answer, in the category, with the letter, and the same for both
    const L=r.letter||"",res=await judgeRare(q,ids.map(id=>A(id)?.text||""));
    const fits=x=>x.valid&&(!L||(x.canon||norm(x.text)).startsWith(L)),f=res.map(fits);
    ids.forEach((id,i)=>o.lines.push({who:id,text:res[i].label||res[i].text,tag:res[i].valid&&!f[i]?`<span class="tag no">not ${L.toUpperCase()}…</span>`:tagFor(res[i])}));
    const up=x=>{o.move=x.tier>=4?2:1;o.best=[x,ids[0]];};
    if(ids.length===1){if(f[0]){up(res[0]);o.headline=res[0].tier>=4?"Rare hold. Two pitches.":"Clean lead. One pitch.";}else{o.fall=true;o.headline="Off the slab!";o.tone="bad";}}
    else if(f[0]&&f[1]&&res[0].canon===res[1].canon){up(res[0]);o.headline=res[0].tier>=4?`In sync on a rare one: ${res[0].label}.`:`Together on ${res[0].label}. One pitch.`;}
    else if(f[0]&&f[1]){o.headline="Both right, but not together.";o.tone="warn";o.detail="You each found a good hold, so nobody fell, but you only climb when you agree on one answer.";}
    else if(f[0]||f[1]){o.headline="Only one of you found it.";o.tone="warn";o.detail="One good answer holds you in place. Agree on the same one to climb.";}
    else{o.fall=true;o.headline="Off the slab!";o.tone="bad";}
  }
  else if(r.terrain==="chimney"){
    const texts=ids.map(id=>A(id)?.text||"");const res=await judgeRare(q,texts);
    ids.forEach((id,i)=>o.lines.push({who:id,text:res[i].label||res[i].text,tag:tagFor(res[i])}));
    const valid=res.filter(x=>x.valid);
    if(ids.length===1){if(valid.length){o.move=valid[0].tier>=4?2:1;o.headline="Solo bridging. You moved up.";o.best=[valid[0],ids[0]];}else{o.fall=true;o.headline="You slipped out of the chimney.";o.tone="bad";}}
    else if(valid.length===2&&res[0].canon===res[1].canon){
      if(valid[0].tier>=3){o.move=2;o.echo=true;o.headline=`Echo! You both said ${valid[0].label}.`;o.best=[valid[0],ids[0]];}
      else{o.fall=true;o.headline=`Collision. You both said ${valid[0].label}.`;o.tone="bad";o.detail="Too obvious to share. Same answer, nothing to brace against.";}}
    else if(valid.length===2){o.move=1;o.headline="Good bracing. One pitch.";const b=res[0].tier>=res[1].tier?0:1;o.best=[res[b],ids[b]];}
    else if(valid.length===1){o.move=0;o.headline="One foot slipped. You hold position.";o.tone="warn";}
    else{o.fall=true;o.headline="Both feet gone.";o.tone="bad";}
  }
  else if(r.terrain==="crevasse"){ // the belayer's window plus the leader's jump
    const v=A(leader)?.num,jumped=typeof v==="number"&&isFinite(v);
    if(typeof r.lo==="number")o.lines.push({who:bel||null,text:`Hint: between ${fmt(r.lo)} and ${fmt(r.hi)}`,tag:"",note:bel?"belayer":""});
    o.lines.push({who:leader,text:jumped?fmt(v)+" "+q.u:"no jump",tag:"",note:bel?"leader":""});
    if(!jumped){o.fall=true;o.headline="Nobody jumped.";o.tone="bad";}
    else{const err=Math.abs(v-q.a);
      o.lines.push({who:null,text:`Answer ${fmt(q.a)} ${q.u}`,tag:`<span class="tag ${err<=q.t[1]?"ok":"no"}">off by ${fmt(err)}</span>`});
      if(err<=q.t[0]){o.move=2;o.headline="Dead centre of the bridge.";}
      else if(err<=q.t[1]){o.move=1;o.headline="Made the jump.";}
      else{o.fall=true;o.headline="Into the crevasse.";o.tone="bad";}}
  }
  else if(r.terrain==="traverse"){
    const sets=ids.map(id=>{const m=new Map();for(const it of (A(id)?.list||[])){const e=matchEntry(q.entries,it);if(e)m.set(e.canon,true);}return [...m.keys()];});
    const all=new Set(sets.flat());const shared=sets.length===2?sets[0].filter(x=>sets[1].includes(x)):[];
    const score=all.size-shared.length;
    ids.forEach((id,i)=>{const n=(A(id)?.list||[]).length;o.lines.push({who:id,text:`${sets[i].length} correct of ${n}`,tag:""});});
    o.lines.push({who:null,text:`${all.size} unique, ${shared.length} doubled${shared.length?": "+shared.slice(0,6).join(", "):""}`,tag:`<span class="tag ${score>=q.pass?"ok":"no"}">${score} / ${q.pass} needed</span>`});
    if(score>=q.great){o.move=2;o.headline=`Flawless traverse. ${score} holds.`;}
    else if(score>=q.pass){o.move=1;o.headline=`Across. ${score} holds.`;}
    else{o.fall=true;o.headline=`Ran out of holds at ${score}.`;o.tone="bad";}
    const missed=q.entries.filter(e=>!all.has(e.canon)).map(e=>e.label);
    if(missed.length)o.detail="Some you missed: "+missed.sort(()=>Math.random()-.5).slice(0,5).join(", ")+".";
  }
  else if(r.terrain==="overhang"){
    const ch=A(leader)?.choice;const clue=bel?A(bel)?.clue:null;
    o.lines.push({who:bel||null,text:clue?`Clue: “${clue}”`:"No clue sent",tag:""});
    const picked=typeof ch==="number"&&ch>=0&&ch<q.o.length;
    o.lines.push({who:leader,text:picked?q.o[ch]:"no pick",tag:`<span class="tag ${ch===q.c?"ok":"no"}">${ch===q.c?"correct":"wrong"}</span>`});
    o.detail=`${q.q} Answer: ${q.o[q.c]}.`;
    if(ch===q.c){o.move=1;o.headline="Pulled over the roof.";}else{o.fall=true;o.headline="Off the overhang!";o.tone="bad";}
  }
  return o;
}

function applyOutcome(t,o){
  const exp=clone(t.exp);const before=exp.pitch;const beforeAlt=altOf(exp,before);let moveText="";
  if(o.fall){
    if(exp.rope>0){exp.rope--;o.caught=true;moveText=`Your gear caught you. ${exp.rope} hook${exp.rope===1?"":"s"} left.`;if(o.tone==="bad")o.tone="warn";}
    else{exp.pitch=exp.anchor;moveText=exp.pitch<before?`Out of gear. Fell ${Math.round(beforeAlt-altOf(exp,exp.pitch))} m to your anchor.`:"Out of gear, but you were at your anchor.";}
  }else if(o.move>0){
    exp.pitch=Math.min(exp.pitch+o.move,nextStop(exp));
    moveText=`Up ${Math.round(altOf(exp,exp.pitch)-beforeAlt)} m to ${fmt(altOf(exp,exp.pitch))} m.`;
  }else moveText="Holding position.";
  const stops=campStops(exp);let arrived=null;
  if(exp.pitch>before&&stops.includes(exp.pitch)){
    exp.anchor=exp.pitch;exp.rope=3;
    if(exp.pitch===total(exp)&&exp.choice[1])arrived="summit";else arrived=exp.pitch===lens(exp)[0]?"Camp I":"Camp II";
  }
  const stats=clone(t.stats||{});stats.rounds=(stats.rounds||0)+1;
  if(o.echo)stats.echoes=(stats.echoes||0)+1;
  if(o.fall&&!o.caught)stats.falls=(stats.falls||0)+1;
  if(o.best){const [b,who]=o.best;const q=qById(t.round.terrain,t.round.qid);
    if(b.tier>=4&&(!stats.best||b.tier>=stats.best.tier))stats.best={answer:b.label||b.text,tier:b.tier,prompt:q.q,by:who};}
  if(arrived==="summit"){exp.finished="won";stats.summits=(stats.summits||0)+1;}
  const log=(t.log||[]).slice(-39);
  const tname=TERRAIN[t.round.terrain].name;
  log.push({at:Date.now(),text:`P${before+1} ${tname}: ${o.headline}`});
  if(arrived)log.push({at:Date.now(),text:arrived==="summit"?"Summit! Expedition complete.":`Reached ${arrived}. Gear restocked, anchor set.`});
  const result={...o,moveText,arrived,from:before,to:exp.pitch};
  delete result.best;
  return {...t,exp,stats,log,round:{...t.round,phase:"reveal",result,resolvedAt:Date.now()}};
}

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
function startAnswerRound(t){
  const ids=memberIds(t);const id=(t.round?.id||0)+1;const exp=t.exp;
  const c=needsChoice(exp);
  if(exp.pitch>=total(exp)&&exp.choice[1])return {...t,round:{id,phase:"summit"}};
  if(c>=0)return {...t,round:{id,phase:"camp",fork:c,votes:{}}};
  const terrain=route(exp)[exp.pitch];const qid=pickQ(terrain,exp.used),q=qById(terrain,qid);
  exp.used=[...exp.used,qid].slice(-60);
  const round={id,phase:"answer",terrain,qid,leader:ids[id%ids.length],startedAt:Date.now(),dur:TERRAIN[terrain].dur};
  if(terrain==="slab")round.letter=pickLetter(q);         // the belayer's half of a Slab
  if(terrain==="crevasse")Object.assign(round,hintRange(q)); // the belayer's half of a Crevasse
  return {...t,exp,round};
}
// a first letter that several answers share, so the two clues together still leave real choices
function pickLetter(q){const n={};for(const e of q.entries){const c=norm(e.canon)[0];if(c&&/[a-z]/.test(c))n[c]=(n[c]||0)+1;}
  const ok=Object.entries(n).filter(([,k])=>k>=3),pool=ok.length?ok:Object.entries(n);let r=Math.random()*pool.reduce((s,[,k])=>s+k,0);
  for(const [c,k] of pool){if((r-=k)<=0)return c;}return pool[0][0];}
// a fair but fuzzy window around the answer: a few years either side for dates, otherwise roughly ±10–35%
function hintRange(q){const a=q.a,R=Math.random;
  if(!q.u&&a>1000&&a<2100)return {lo:a-Math.round(4+R()*16),hi:a+Math.round(4+R()*16)};
  const nice=x=>{const p=Math.pow(10,Math.max(0,Math.floor(Math.log10(Math.abs(x)))-1));return Math.round(x/p)*p;};
  let lo=nice(a*(1-.1-R()*.25)),hi=nice(a*(1+.1+R()*.25));if(lo>=a)lo=Math.floor(a*.9);if(hi<=a)hi=Math.ceil(a*1.1);return {lo,hi};}
function advance(withAnchor){
  const rid=S.team.round.id;
  guarded(t=>{
    if(t.round.id!==rid)return null;
    // an anchor locks in your height but costs one of this stage's hooks
    if(withAnchor&&t.round.phase==="reveal"&&t.exp.anchor!==t.exp.pitch&&t.exp.rope>0){
      t.exp.anchor=t.exp.pitch;t.exp.rope--;
      t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Anchor placed at ${fmt(altOf(t.exp,t.exp.pitch))} m, using one hook.`});}
    return startAnswerRound(t);});
}
function setOff(choice){
  const rid=S.team.round.id;
  guarded(t=>{if(t.round.id!==rid||t.round.phase!=="camp")return null;
    const f=t.round.fork;t.exp.choice[f]=choice;t.exp.anchor=t.exp.pitch;
    t.log=t.log.slice(-39);t.log.push({at:Date.now(),text:`Set off from ${FORKS[f].camp} on ${FORKS[f][choice].name}.`});
    return startAnswerRound(t);});
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
    const o=await judge(t,ans);
    const ok=await fb.put("teams/"+S.code,applyOutcome(t,o),etag);
    if(ok)fb.del(`answers/${S.code}/${rid-2}`);
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
    <div class="card title">${ICON.peak.replace('class="px"','class="px emblem"')}<h2 class="wordmark">Pinnacle</h2>
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
      <p class="note">You and your partner climb one mountain, pitch by pitch: base camp ${fmt(ALT.base)} m, Camp I ${fmt(ALT.c1)} m, Camp II ${fmt(ALT.c2)} m, summit ${fmt(ALT.top)} m. Leader and belayer swap every pitch. Three hooks per stage catch your falls; out of hooks, you drop to your last anchor. Camps restock your gear and let you choose the next route. Progress is saved.</p>
      <div class="terrains">${Object.entries(TERRAIN).map(([k,x])=>`<div><b>${x.name}</b><img src="${terrainArt(k)}" alt="">${esc(x.rule)}</div>`).join("")}</div></div>
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
// a head-and-shoulders portrait cut from the climber's standing sprite
const PORT=new Map();
function portrait(L){if(PORT.has(L))return PORT.get(L);
  const s=pixelSprite(L,"stand",{}),c=document.createElement("canvas");c.width=c.height=20;const g=c.getContext("2d");
  g.fillStyle="#4479c6";g.fillRect(0,0,20,20);g.fillStyle="#7cafe0";g.fillRect(0,13,20,7);g.drawImage(s,SPR.hx-6,SPR.hy-33,20,20,0,0,20,20);
  const u=c.toDataURL();PORT.set(L,u);return u;}
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

/* ============================== RENDER ============================== */
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
  if(!main.classList.contains("game")){main.className="game";main.innerHTML=`<div class="panel" id="panel"></div><div class="card mapcard" id="mapcard"></div>`;S.mapKey=S.hudHtml=null;}
  $("#hud").hidden=false;drawTopo(t);renderHud(t);renderPanel(t);
  const mk=JSON.stringify([t.exp.pitch,t.exp.anchor,t.exp.choice,t.exp.n]);if(S.mapKey!==mk){S.mapKey=mk;$("#mapcard").innerHTML=mapHtml(t);}
}
// who leads this pitch (or the next one, between pitches)
function leaderOf(t){const r=t.round,ids=memberIds(t);return r.phase==="answer"||r.phase==="reveal"?r.leader:ids[(r.id+1)%ids.length];}
// player 1 (who made the team) climbs in red, player 2 in yellow
const lookOf=(t,id)=>memberIds(t).indexOf(id)>0?LOOK.mate:LOOK.me;
function renderHud(t){
  const e=t.exp,alt=altOf(e,e.pitch),ids=memberIds(t),lead=leaderOf(t),tot=total(e);
  // left, as in the concept: each climber's portrait and role, then the team's hooks as hearts (each catches a fall);
  // right: altitude, rope out above the last anchor (how far a fall with no hooks would drop you) and the pitch
  const who=ids.map((id,i)=>`<div class="who"><img class="port" src="${portrait(lookOf(t,id))}" alt=""><div><div class="nm">P${i+1} ${esc(S.names[id]||nameOf(id))}${id===S.uid?" (you)":""}</div>
    <span class="role ${id===lead?"lead":"belay"}">${id===lead?"Leader":"Belayer"}</span></div></div>`).join("");
  const hearts=`<div class="hearts" title="Hooks: each one catches a fall. Camps restock them." aria-label="${e.rope} of 3 hooks left">${[0,1,2].map(i=>i<e.rope?ICON.heart:ICON.heartUsed).join("")}</div>`;
  const html=`<div class="hud-l">${who}${hearts}</div>
   <div class="hud-r"><div class="stat">${ICON.mtn}<span class="k">Alt</span><span class="v">${fmt(alt)} m</span></div>
     <div class="stat">${ICON.rope}<span class="k">Rope</span><span class="v">${fmt(alt-altOf(e,e.anchor))} m</span></div>
     <div class="stat">${ICON.flag}<span class="k">${alt>=ALT.top?"Top":"Pitch"}</span><span class="v">${alt>=ALT.top?"Summit":`${Math.min(e.pitch+1,tot)}/${tot}${e.choice[1]?"":"+"}`}</span></div></div>`;
  if(S.hudHtml!==html){S.hudHtml=html;$("#hud").innerHTML=html;}
}
function remaining(r){return Math.max(0,(r.startedAt+r.dur*1000-Date.now())/1000);}
function logHtml(t){const st=t.stats||{};
  return `<div class="log"><h5>Expedition ${t.exp.n} · ${st.summits||0} summit${st.summits===1?"":"s"} · ${st.echoes||0} echoes${st.best?` · rarest: ${esc(st.best.answer)}`:""}</h5><ol>${(t.log||[]).slice().reverse().slice(0,14).map(l=>`<li><b>${new Date(l.at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</b> ${esc(l.text)}</li>`).join("")}</ol></div>`;}

function renderPanel(t){
  const r=t.round;const panel=$("#panel");const mine=S.answers[S.uid];
  const key=[r.id,r.phase,!!mine,memberIds(t).length,r.phase==="camp"?JSON.stringify(r.votes||{}):"",r.phase==="reveal"?r.resolvedAt:"",Object.values(S.names).join(",")].join("|");
  if(key===S.panelKey){updateDynamic(t);return;}
  S.panelKey=key;S.local={items:[],choice:null};panel.dataset.t=r.phase==="answer"||r.phase==="reveal"?r.terrain:"";
  if(r.phase==="ready")panel.innerHTML=readyView(t);
  else if(r.phase==="answer")panel.innerHTML=answerView(t,mine);
  else if(r.phase==="reveal")panel.innerHTML=revealView(t);
  else if(r.phase==="camp")panel.innerHTML=campView(t);
  else if(r.phase==="summit")panel.innerHTML=summitView(t);
  panel.insertAdjacentHTML("beforeend",logHtml(t));
  wirePanel(t);updateDynamic(t);
}
function readyView(t){
  const ids=memberIds(t);
  return `<div class="eyebrow">Base camp · ${fmt(ALT.base)} m</div>
   <div class="terrain">Expedition ${t.exp.n}</div>
   <p class="rule">${ids.length<2?`Send your partner the invite link from the top bar (or the code <strong>${esc(t.code)}</strong>). You can start alone, but every pitch is built for two.`:"Both climbers are on the rope. Leader and belayer swap every pitch, and most pitches give you a few tugs on the rope radio to talk."} The first pitch is a ${TERRAIN[SEG0[0]].name}.</p>
   <p class="rule">Your gear catches falls: three hooks per stage. Out of gear, a fall drops you to your last anchor. Every camp restocks your gear.</p>
   <button class="btn rope" id="goBtn">Start the climb</button>`;
}
function answerView(t,mine){
  const r=t.round,q=qById(r.terrain,r.qid),T=TERRAIN[r.terrain];
  const ids=memberIds(t);const lead=r.leader===S.uid;const solo=ids.length<2;
  const head=`<img class="tart" src="${terrainArt(r.terrain)}" alt="">
   <div class="eyebrow">Pitch ${t.exp.pitch+1} · ${fmt(altOf(t.exp,t.exp.pitch))} m <span class="role ${lead?"lead":"belay"}">${lead?"You lead":"You belay"}</span>${T.talk&&!solo?"":`<span>· no radio</span>`}</div>
   <div class="terrain">${T.name}</div><p class="rule">${esc(T.rule)}</p>`;
  const radio=T.talk&&!solo?radioHtml(T):"";
  const foot=radio+`<div class="timer"><i id="timerBar"></i></div><div class="meta"><span id="timerTxt"></span><span id="partnerTxt"></span></div>`;
  if(mine&&!(r.terrain==="overhang"&&!lead))return head+halves(r,q,lead,solo)+`<div class="wait">Locked in: <strong>${esc(answerSummary(r.terrain,mine,q))}</strong></div>`+foot;
  let body="";
  if(r.terrain==="slab"){
    body=halves(r,q,lead,solo)+`<div class="row"><input type="text" id="ans" maxlength="60" autocomplete="off" placeholder="${solo?"Your answer":"The answer you both agree on"}" aria-label="Your answer"><button class="btn rope" id="sendBtn">Lock in</button></div>`;
  }else if(r.terrain==="chimney"){
    body=`<div class="prompt">${esc(q.q)}</div><div class="row"><input type="text" id="ans" maxlength="60" autocomplete="off" placeholder="Your answer" aria-label="Your answer"><button class="btn rope" id="sendBtn">Lock in</button></div>`;
  }else if(r.terrain==="crevasse"){
    body=halves(r,q,lead,solo)+(lead||solo?`<div class="row"><input type="number" id="ans" inputmode="decimal" placeholder="Your jump${q.u?" ("+q.u+")":""}" aria-label="Your estimate"><button class="btn rope" id="sendBtn">Jump</button></div>`
      :`<p class="rule">Guide your leader onto the bridge over the radio. They make the jump.</p>`);
  }else if(r.terrain==="traverse"){
    body=`<div class="prompt">${esc(q.q)}</div><div class="row"><input type="text" id="ans" maxlength="40" autocomplete="off" placeholder="Type one, press Enter" aria-label="Add an answer"><button class="btn ghost" id="addBtn">Add</button></div>
     <div class="chips" id="chips"></div><div style="margin-top:12px"><button class="btn rope" id="sendBtn">Done, lock in my list</button></div>`;
  }else if(r.terrain==="overhang"){
    if(solo){body=`<div class="prompt">${esc(q.q)}</div><div class="opts">${q.o.map((x,i)=>`<button class="opt" data-i="${i}">${esc(x)}</button>`).join("")}</div>`;}
    else if(lead){body=`<div class="prompt">Category: ${esc(q.cat)}</div><div class="wait" id="clueBox">Waiting for your belayer's clue…</div><div class="opts" style="margin-top:12px">${shuffleIdx(q.o.length,r.id).map(i=>`<button class="opt" data-i="${i}">${esc(q.o[i])}</button>`).join("")}</div>`;}
    else{body=`<div class="prompt">${esc(q.q)}</div><div class="opts">${q.o.map((x,i)=>`<button class="opt ${i===q.c?"correct":""}" disabled>${esc(x)}${i===q.c?" ✓":""}</button>`).join("")}</div>
      <p class="rule" style="margin-top:12px">Your leader sees only the four options. Send one word that points to the right one. Words from the options are not allowed.</p>
      ${mine?`<div class="wait">Clue sent: <strong>${esc(mine.clue)}</strong></div>`:`<div class="row"><input type="text" id="ans" maxlength="20" autocomplete="off" placeholder="One-word clue" aria-label="One-word clue"><button class="btn rope" id="sendBtn">Send clue</button></div>`}`;}
  }
  return head+body+`<div class="err" id="ansErr"></div>`+foot;
}
// what each climber is allowed to see of the pitch: their own half, and a note that the partner holds the other
function halves(r,q,lead,solo){
  if(r.terrain==="slab"){const L=`<div class="clue2">Starts with <b>${esc((r.letter||"").toUpperCase())}</b></div>`;
    return solo?`<div class="prompt">${esc(q.q)}</div>${L}`:lead?`<div class="prompt">${esc(q.q)}</div><div class="hidden2">Your belayer has the first letter.</div>`:`${L}<div class="hidden2">Your leader has the category.</div>`;}
  if(r.terrain==="crevasse"){const H=typeof r.lo==="number"?`<div class="clue2">Between <b>${fmt(r.lo)}</b> and <b>${fmt(r.hi)}</b>${q.u?" "+esc(q.u):""}</div>`:"";
    return `<div class="prompt">${esc(q.q)}</div>`+(solo||!lead?H:`<div class="hidden2">Your belayer can see roughly where the answer lies.</div>`);}
  return `<div class="prompt">${esc(r.terrain==="overhang"&&lead&&!solo?"Category: "+q.cat:q.q)}</div>`;}
/* the rope radio: a few short messages per pitch, stored beside the answers under answers/<team>/<round>/_talk */
const talkOf=()=>Object.values(S.answers._talk||{}).filter(m=>m&&m.text).sort((a,b)=>a.at-b.at);
function radioHtml(T){return `<div class="radio"><div class="rhead">Rope radio <span id="rleft"></span></div><div class="rlog" id="rlog"></div>
  <div class="row"><input type="text" id="rmsg" maxlength="48" autocomplete="off" placeholder="Up to ${T.talk[1]} words" aria-label="Message your partner"><button class="btn ghost" id="rsend">Tug</button></div><div class="err" id="rerr"></div></div>`;}
async function sendTalk(){const r=S.team.round,T=TERRAIN[r.terrain],inp=$("#rmsg"),err=$("#rerr");if(!T.talk||!inp)return;const [n,w]=T.talk;
  const text=inp.value.trim().replace(/\s+/g," ");if(!text)return;
  if(text.split(" ").length>w){err.textContent=`Keep it to ${w} words.`;return;}
  const k=talkOf().filter(m=>m.uid===S.uid).length;if(k>=n){err.textContent="No tugs left on this pitch.";return;}
  err.textContent="";inp.value="";
  try{await fb.put(`answers/${S.code}/${r.id}/_talk/${S.uid}_${k}`,{uid:S.uid,text,at:Date.now()});}catch(e){toast("Couldn't send that over the radio.");}}
function answerSummary(terrain,a,q){
  if(terrain==="crevasse")return fmt(a.num)+(q.u?" "+q.u:"");
  if(terrain==="traverse")return (a.list||[]).length+" answers";
  if(terrain==="overhang")return typeof a.choice==="number"?q.o[a.choice]:a.clue||"";
  return a.text||"(blank)";}
function shuffleIdx(n,seed){const a=[...Array(n).keys()];let s=seed*9301+49297;for(let i=n-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function revealView(t){
  const o=t.round.result||{};const q=qById(t.round.terrain,t.round.qid);
  const nextIsCamp=needsChoice(t.exp)>=0;const atTop=t.exp.pitch>=total(t.exp)&&t.exp.choice[1];
  const canAnchor=!nextIsCamp&&!atTop&&t.exp.anchor!==t.exp.pitch&&t.exp.rope>0;
  // what happened on the rope, as one pixel-iconed strip: climbed, held, caught by a hook, or dropped to the anchor
  const oc=o.arrived?["good",o.arrived==="summit"?ICON.flag:ICON.tent,o.arrived==="summit"?"Summit reached!":`${o.arrived}: anchor set, 3 hooks restocked`]
    :o.fall&&o.caught?["warn",ICON.hook,"A hook caught the fall"]:o.fall?["bad",ICON.anchor,"Out of hooks: back to the anchor"]
    :o.move>0?["good",ICON.up,`Climbed ${o.move} pitch${o.move>1?"es":""}`]:["warn",ICON.hold,"Holding position"];
  const badge=o.echo?`<div class="echo">ECHO! x2</div>`:/^Collision/.test(o.headline||"")?`<div class="echo bad">COLLISION</div>`:"";
  return `<img class="tart" src="${terrainArt(t.round.terrain)}" alt="">
   <div class="eyebrow">${TERRAIN[t.round.terrain].name} · ${esc(q.q&&t.round.terrain!=="overhang"?q.q:q.cat||"")}</div>
   ${badge}<div class="headline ${o.tone||"good"}">${esc(o.headline)}</div>
   <div class="outcome ${oc[0]}">${oc[1]}<span>${oc[2]}</span></div>
   ${o.detail?`<p class="rule">${esc(o.detail)}</p>`:""}
   <div class="lines">${(o.lines||[]).map(l=>`<div class="line"><span class="who">${l.who?esc(nameOf(l.who))+(l.note?" · "+l.note:""):"Team"}</span><span class="what">${esc(l.text)}</span>${l.tag||"<span></span>"}</div>`).join("")}</div>
   <div class="moves"><div><b>${esc(o.moveText||"")}</b></div>${o.arrived&&o.arrived!=="summit"?`<div>Reached ${esc(o.arrived)}. Anchor set and gear restocked.</div>`:""}</div>
   <div class="actions">${atTop?`<button class="btn rope" id="nextBtn">Stand on the summit</button>`:nextIsCamp?`<button class="btn rope" id="nextBtn">Rest at camp</button>`:`<button class="btn rope" id="nextBtn">Climb on</button>${canAnchor?`<button class="btn ghost" id="anchorBtn" title="Locks in this height so a fall can't drop you lower, but uses one of your hooks">Place anchor (uses 1 hook)</button>`:""}`}</div>`;
}
function campView(t){
  const f=FORKS[t.round.fork];const votes=t.round.votes||{};const ids=memberIds(t);
  const lead=ids[t.round.id%ids.length]===S.uid||ids.length<2;const my=votes[S.uid];
  const card=k=>{const x=f[k];const n=x.p.length;
    return `<button class="route ${my===k?"sel":""}" data-k="${k}"><h4>${x.name}</h4><span>${esc(x.desc)}</span><span class="pp">${n} pitches · ${x.p.map(p=>TERRAIN[p].name).join(" · ")}</span><span class="votes">${ids.filter(i=>votes[i]===k).map(i=>esc(nameOf(i))).join(", ")||"&nbsp;"}</span></button>`;};
  return `<div class="eyebrow">${f.camp} · ${fmt(altOf(t.exp,t.exp.pitch))} m · gear restocked</div>
   <div class="terrain">Choose a route</div><p class="rule">Talk it over. Vote, then ${lead?"you":"your partner"} make${lead?"":"s"} the final call.</p>
   <div class="routes">${card("A")}${card("B")}</div>
   ${lead?`<button class="btn rope" id="setOffBtn" ${my?"":"disabled"}>${my?`Set off on ${f[my].name}`:"Vote to set off"}</button>`:`<p class="note">Waiting for your partner to set off.</p>`}`;
}
function summitView(t){const st=t.stats||{};
  return `<div class="eyebrow">Summit · ${fmt(ALT.top)} m</div>
   <div class="terrain">You made it!</div>
   <p class="rule">Expedition ${t.exp.n} is on top of the pillar. The mountain will be here whenever you want another go.</p>
   <div class="lines">
     <div class="line"><span class="who">Summits</span><span class="what">${st.summits||0}</span><span></span></div>
     <div class="line"><span class="who">Echoes</span><span class="what">${st.echoes||0}</span><span></span></div>
     <div class="line"><span class="who">Pitches played</span><span class="what">${st.rounds||0}</span><span></span></div>
     ${st.best?`<div class="line"><span class="who">Rarest</span><span class="what">${esc(st.best.answer)} <span class="note">for “${esc(st.best.prompt)}”</span></span><span class="tag"><span class="rar">${dots(st.best.tier)}</span></span></div>`:""}
   </div>
   <button class="btn rope" id="newExpBtn">Start a new expedition</button>`;}

function wirePanel(t){
  const r=t.round;const P=$("#panel");
  P.querySelector("#goBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#nextBtn")?.addEventListener("click",()=>advance(false));
  P.querySelector("#anchorBtn")?.addEventListener("click",()=>advance(true));
  P.querySelector("#newExpBtn")?.addEventListener("click",newExpedition);
  P.querySelectorAll(".route").forEach(b=>b.addEventListener("click",()=>vote(b.dataset.k)));
  P.querySelector("#setOffBtn")?.addEventListener("click",()=>{const v=(t.round.votes||{})[S.uid];if(v)setOff(v);});
  if(r.phase!=="answer")return;
  P.querySelector("#rsend")?.addEventListener("click",sendTalk);
  P.querySelector("#rmsg")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();sendTalk();}});
  const inp=P.querySelector("#ans"),send=P.querySelector("#sendBtn"),err=P.querySelector("#ansErr");
  if(r.terrain==="traverse"&&inp){
    const add=()=>{const v=inp.value.trim();if(!v)return;if(!S.local.items.some(x=>norm(x)===norm(v)))S.local.items.push(v);inp.value="";drawChips();};
    inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();add();}});
    P.querySelector("#addBtn").addEventListener("click",add);
    send.addEventListener("click",()=>{add();submit({list:S.local.items.slice(0,80)});});
  }else if(inp&&send){
    const go=()=>{const q=qById(r.terrain,r.qid);
      if(r.terrain==="crevasse"){const n=parseFloat(String(inp.value).replace(",","."));if(!isFinite(n)){err.textContent="Enter a number.";return;}submit({num:n});}
      else if(r.terrain==="overhang"){const c=norm(inp.value);
        if(!/^[a-z0-9]{2,20}$/.test(c.replace(/ /g,"_"))||c.includes(" ")){err.textContent="One word, letters only.";return;}
        const banned=q.o.flatMap(x=>norm(x).split(" ")).filter(w=>w.length>=3);
        if(banned.some(w=>c.includes(w)||w.includes(c)&&c.length>=4)){err.textContent="That word is in the options. Try another.";return;}
        submit({clue:inp.value.trim()});}
      else{if(!inp.value.trim()){err.textContent="Type an answer first.";return;}submit({text:inp.value.trim()});}};
    send.addEventListener("click",go);inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();go();}});
    if(!matchMedia("(hover:none)").matches)inp.focus();
  }
  P.querySelectorAll(".opt[data-i]").forEach(b=>b.addEventListener("click",()=>{if(S.answers[S.uid])return;P.querySelectorAll(".opt").forEach(x=>x.classList.toggle("sel",x===b));submit({choice:+b.dataset.i});}));
  if(r.terrain==="traverse")drawChips();
}
function drawChips(){const c=$("#chips");if(!c)return;c.innerHTML=S.local.items.map(x=>`<span>${esc(x)}</span>`).join("");}

function requiredIds(t){const r=t.round;const ids=memberIds(t);return r.terrain==="overhang"||r.terrain==="crevasse"?[r.leader]:ids;}
function updateDynamic(t){
  const r=t.round;if(r.phase!=="answer")return;
  const rem=remaining(r);const bar=$("#timerBar"),txt=$("#timerTxt"),ptx=$("#partnerTxt");
  if(bar)bar.style.width=(100*rem/r.dur)+"%";
  if(txt)txt.textContent=rem>0?`${Math.ceil(rem)} s`:"Time";
  const pid=partnerId(t);
  if(ptx)ptx.textContent=pid?(S.answers[pid]?`${nameOf(pid)} is locked in`:`${nameOf(pid)} is thinking…`):"";
  const cb=$("#clueBox");if(cb){const c=pid&&S.answers[pid]?.clue;cb.innerHTML=c?`Clue from ${esc(nameOf(pid))}: <span class="clue">${esc(c)}</span>`:"Waiting for your belayer's clue…";}
  const rl=$("#rlog");if(rl){const msgs=talkOf();
    if(rl.dataset.n!==String(msgs.length)){const fresh=msgs.length>(+rl.dataset.n||0);rl.dataset.n=msgs.length;
      rl.innerHTML=msgs.map(m=>`<div class="msg ${m.uid===S.uid?"me":""}"><b>${esc(nameOf(m.uid))}</b>${esc(m.text)}</div>`).join("")||`<div class="note">Nothing on the radio yet.</div>`;
      rl.scrollTop=rl.scrollHeight;if(fresh&&msgs[msgs.length-1].uid!==S.uid)sfx("tug");}
    const left=TERRAIN[r.terrain].talk[0]-msgs.filter(m=>m.uid===S.uid).length;$("#rleft").textContent=`${left} tug${left===1?"":"s"} left`;
    const ri=$("#rmsg"),rb=$("#rsend");if(ri){ri.disabled=rb.disabled=left<=0;}}
}

/* ============================== TICK ============================== */
let tickN=0;
setInterval(()=>{
  if(++tickN%20===0)updateOnline();
  const t=S.team;if(!t||t.round.phase!=="answer")return;
  updateDynamic(t);const r=t.round;const rem=remaining(r);
  if(rem<=0&&!S.answers[S.uid]&&S._autoSent!==r.id){S._autoSent=r.id;
    const inp=$("#ans");const lead=r.leader===S.uid;
    if(r.terrain==="traverse")submit({list:S.local.items.concat(inp&&inp.value.trim()?[inp.value.trim()]:[])});
    else if(r.terrain==="crevasse"){if(lead||memberIds(t).length<2){const n=parseFloat(String(inp?.value||"").replace(",","."));submit(isFinite(n)?{num:n}:{num:null});}}
    else if(r.terrain==="overhang"){if(lead)submit({choice:-1});}
    else submit({text:inp?.value.trim()||""});}
  const all=requiredIds(t).every(id=>S.answers[id]);
  // the round's leader judges; the partner steps in if the leader is away or slow
  const mine=r.leader===S.uid||!t.members[r.leader]||!S.online.has(r.leader)||rem<=-10;
  if((all||rem<=-2)&&mine&&Date.now()-(S._lastTry||0)>2500){S._lastTry=Date.now();tryResolve();}
},500);
