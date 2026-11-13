/* ============================== THE RULES ==============================
   The climb's rules, with nothing on screen and no database: the route and its pitches, the question each pitch
   draws, judging a round and what it does to the team, and the shape a saved team is brought into. Everything here
   works on plain objects (a team as it is stored), so node test/rules.test.js can load this file on its own. */
// the two players' clocks can be seconds apart, so shared times (when a question starts, who is online) are kept on
// the database's clock: each heartbeat has the server write its own time, and what comes back shows how far this
// device is off (see beat)
let SKEW=0;const now=()=>Date.now()+SKEW;
// a pitch opens with a short count before its clock starts, and its result waits a beat before it shows
const LEAD_MS=3000,SUSPENSE_MS=1400;
const fmt=n=>Math.round(n).toLocaleString("en-US").replace(/,/g," ");
const clone=o=>JSON.parse(JSON.stringify(o));
// in the order they joined, so whoever made the team is player 1
const memberIds=t=>{const m=t.members||{};return Object.keys(m).sort((a,b)=>(m[a].joined||0)-(m[b].joined||0)||(a<b?-1:a>b?1:0));};
/* Firebase drops empty arrays/objects and nulls; restore the shape the game expects */
function fixTeam(t){
  if(!t||typeof t!=="object")return null;t=clone(t);
  t.members=t.members||{};t.log=Object.values(t.log||{});t.stats=t.stats||{};if(t.stats.history)t.stats.history=Object.values(t.stats.history);
  // a team saved under the old pitch types starts this quiz climb fresh at base camp
  if(!t.exp||t.exp.v!==2){t.exp=newExp((t.exp?.n||0)+1);t.round={id:(t.round?.id||0)+1,phase:"ready"};}
  const e=t.exp;const c=e.choice||{};e.choice=[c[0]||null,c[1]||null];
  e.used=Object.values(e.used||{});e.up=e.up&&typeof e.up==="object"?e.up:{};
  for(const k of ["pitch","anchor","rope","chalk","scout"])e[k]=e[k]||0;
  delete e.anchors; // (the anchor gear is gone: the last camp is the anchor now)
  e.hooks=Object.values(e.hooks||{}).filter(n=>typeof n==="number").sort((a,b)=>a-b);
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
/* Each climber has their own place on the route. exp.pitch is the pitch both have reached (the lower climber's);
   exp.up says how many pitches above it each one is. The rope lets them get MAX_GAP pitches apart and no more, and
   nobody climbs past a camp (or the top) until both are there. */
const MAX_GAP=3;
const capOf=exp=>needsChoice(exp)>=0?exp.pitch:Math.max(exp.pitch,nextStop(exp));
const posOf=(exp,id)=>Math.min(exp.pitch+Math.min(MAX_GAP,Math.max(0,(exp.up||{})[id]|0)),capOf(exp));
// an expedition: the pitch reached, the last camp (anchor: no fall goes below it), the hooks clipped into the wall
// (hooks: the pitch each one is at) and the team's gear (rope = hooks left to clip)
// where a fall from pitch `from` stops: the highest hook at or below it, or the last camp (base camp at the start)
const fallTo=(exp,from)=>Math.max(exp.anchor||0,...(exp.hooks||[]).filter(h=>h<=from));
function newExp(n,prev){return {v:2,n,m:null,choice:[null,null],pitch:0,anchor:0,hooks:[],rope:3,chalk:1,scout:1,used:prev?prev.used.slice(-80):[]};}
// an ascent's score out of 100: the share of questions answered right, less a little for every fall and rope jerk
const ascentScore=run=>Math.max(0,Math.round(100*(run.right||0)/Math.max(1,run.q||0))-5*(run.falls||0)-2*(run.jerks||0));
const ascentStars=run=>{const p=run.pts??ascentScore(run);return p>=85?3:p>=60?2:1;};
const fmtDur=ms=>{const s=Math.round(ms/1000);return s>=3600?`${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min`:s>=60?`${Math.floor(s/60)} min ${s%60} s`:`${s} s`;};

/* ============================== QUESTION PICK ============================== */
// the pitch's question: from this mountain's pool at the pitch's difficulty (set by the route: easy at the foot of
// the wall, hardest on the summit push), one the team hasn't had lately
function tierAt(exp,p){const T=[...SEG0_TIERS,...(exp.choice[0]?FORKS[0][exp.choice[0]].tiers:[]),...(exp.choice[1]?FORKS[1][exp.choice[1]].tiers:[])];return Math.max(1,Math.min(4,(T[p]||3)+MT(exp).tier));}
function pickQuiz(tier,used){const pool=QUIZ.filter(q=>q.tier===tier);let fresh=pool.filter(q=>!used.includes(q.id));
  if(!fresh.length)fresh=pool;return fresh[Math.floor(Math.random()*fresh.length)];}
const quizById=id=>QUIZ.find(q=>q.id===id);
// the four options in a fresh order for a round: order[i] is the option shown in slot i (option 0 is the right one)
function shuffled4(){const a=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const LETTERS="ABCD";

/* ============================== JUDGING ==============================
   Both climbers lock an answer in secret, and the two are shown together. Each climbs on their own answer: right,
   and they go up a pitch; wrong (or no answer), and they fall, as far as the highest hook below them (a hook stays
   in the wall where it was clipped, and catches either climber), or to the last camp if there is none. A hook
   clipped where they hang keeps them where they are.
   The rope ties the two together: they can be MAX_GAP pitches apart and no more. A climber who would go further
   ahead than that is held back by the rope (a rope jerk: they stay where they are until their partner catches up),
   and one who falls is caught by it MAX_GAP pitches below their partner. */
function judge(t,ans){const r=t.round,right=r.order.indexOf(0),picks={};
  for(const id of memberIds(t)){const c=ans[id]?.choice;if(typeof c==="number"&&c>=0&&c<4)picks[id]=c;}
  return {right,picks};}
function applyOutcome(t,o){
  const exp=clone(t.exp),r=t.round,ids=memberIds(t),q=quizById(r.qid),cap=capOf(exp),before=exp.pitch,pl={};
  for(const id of ids){const from=posOf(exp,id),ok=o.picks[id]===o.right,x=pl[id]={from,to:from,ok,none:o.picks[id]==null};
    if(ok)x.to=Math.min(from+1,cap);
    else{x.fall=true;const f=Math.min(from,fallTo(exp,from)),onHook=(exp.hooks||[]).includes(f);
      if(f===from&&onHook)x.caught=true;else{x.to=f;if(onHook&&f<from)x.hooked=true;}}}
  // the rope: the one who would get too far ahead is held where they were; one who falls too far is caught by it
  if(ids.length>1)for(const [hi,lo] of [[ids[0],ids[1]],[ids[1],ids[0]]]){const H=pl[hi],L=pl[lo];
    if(H.to-L.to>MAX_GAP&&H.to>H.from){H.to=H.from;H.held=true;}
    if(H.to-L.to>MAX_GAP){L.to=H.to-MAX_GAP;L.roped=true;}}
  exp.pitch=Math.min(...ids.map(id=>pl[id].to));exp.up={};for(const id of ids)exp.up[id]=pl[id].to-exp.pitch;
  // reaching a camp or the top (both of them): a camp also becomes the anchor, so no fall ever drops them below it
  let arrived=null;if(exp.pitch>before){const L=lens(exp);
    arrived=exp.pitch===L[0]?"Camp I":L[1]&&exp.pitch===L[0]+L[1]?"Camp II":exp.choice[1]&&exp.pitch>=total(exp)?"summit":null;
    if(arrived)exp.anchor=exp.pitch;}
  const all=ids.map(id=>pl[id]),n=f=>all.filter(f).length,jerk=n(x=>x.held)>0;
  const stats=clone(t.stats||{});stats.rounds=(stats.rounds||0)+1;stats.jerks=(stats.jerks||0)+n(x=>x.held);
  if(ids.length>1&&all.every(x=>x.ok))stats.synced=(stats.synced||0)+1;stats.falls=(stats.falls||0)+n(x=>x.fall&&!x.caught);
  // this expedition's own tally, for the end of the climb
  const run=exp.run={...(exp.run||{})};run.q=(run.q||0)+ids.length;run.right=(run.right||0)+n(x=>x.ok);run.jerks=(run.jerks||0)+n(x=>x.held);
  if(ids.length>1&&all.every(x=>x.ok))run.synced=(run.synced||0)+1;run.slips=(run.slips||0)+n(x=>x.caught);run.falls=(run.falls||0)+n(x=>x.fall&&!x.caught);
  // the summit: the ascent is timed and scored, and goes down as the team's best if it is
  if(arrived==="summit"){if(exp.t0)run.ms=Math.max(0,now()-exp.t0);run.pts=ascentScore(run);stats.summits=(stats.summits||0)+1;
    if(!stats.best||run.pts>stats.best.pts){run.best=!!stats.best;stats.best={pts:run.pts,right:run.right||0,q:run.q||0,falls:run.falls||0,jerks:run.jerks||0,ms:run.ms||0,n:exp.n,m:exp.m};}
    // (and on the mountain's own record, which the map shows)
    const pk=stats.peaks=clone(stats.peaks||{}),mine=pk[exp.m]||{n:0,pts:0};pk[exp.m]={n:mine.n+1,pts:Math.max(mine.pts,run.pts)};
    // (and on the team's list of its last ten summits, which the menu shows)
    stats.history=[...Object.values(stats.history||{}),{n:exp.n,m:exp.m,pts:run.pts,right:run.right||0,q:run.q||0,falls:run.falls||0,ms:run.ms||0,at:Date.now()}].slice(-10);}
  const word=x=>x.held?"held by the rope":x.ok?(x.to>x.from?"climbed":"waited at the ledge"):x.caught?"slipped onto the hook":x.hooked?"fell to the hook":x.roped?"fell onto the rope":x.to<x.from?"fell":"came off";
  const headline=ids.map(id=>`${t.members[id]?.name||"Climber"} ${word(pl[id])}`).join(", ")+".";
  const log=(t.log||[]).slice(-39);
  log.push({at:Date.now(),text:`${q.cat}: ${headline}`});
  if(arrived)log.push({at:Date.now(),text:arrived==="summit"?`Stood on top of ${MT(exp).name}, ${fmt(mAlt(exp,ALT.top))} m!`:`Reached ${arrived}.`});
  return {...t,exp,stats,log,round:{...r,phase:"reveal",result:{right:o.right,picks:o.picks,pl,jerk,headline,arrived,from:before,to:exp.pitch},resolvedAt:now()}};}


// the next pitch: its question is drawn, and after a short count (so both are ready) its clock starts. At the top of
// a stage the team makes camp and picks the route on; at the top of the last one they're on the summit.
function startPitch(t){
  const ids=memberIds(t),id=(t.round?.id||0)+1,exp=t.exp,nc=needsChoice(exp);
  if(nc>=0)return {...t,round:{id,phase:"camp",stage:nc,votes:{}}};
  if(exp.pitch>=total(exp))return {...t,round:{id,phase:"summit"}};
  const q=pickQuiz(tierAt(exp,exp.pitch),exp.used);exp.used=[...exp.used,q.id].slice(-100);if(!exp.t0)exp.t0=now();
  return {...t,exp,round:{id,phase:"answer",qid:q.id,leader:ids[id%ids.length],order:shuffled4(),startedAt:now()+LEAD_MS,dur:window.TEST?.secs()||MT(exp).secs}};}
