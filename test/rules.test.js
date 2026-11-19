// The climb's rules, checked without a browser: node test/rules.test.js (no install needed; exits 1 on a failure)
const assert=require("assert/strict");
const g=require("./load.js")();
const {QUIZ,MOUNTAINS,SEG0_TIERS,FORKS,MAX_GAP}=g;

let failed=0;
function test(name,fn){try{fn();console.log("ok   "+name);}catch(e){failed++;console.log("FAIL "+name+"\n     "+(e.message||e).split("\n").join("\n     "));}}

// a two-climber team mid-question: a joined first, so a is player 1. The right answer is in slot 0.
function team({pitch=0,anchor=0,up={},m="snowcap",choice=[null,null],hooks=[]}={}){
  const exp=g.newExp(1);Object.assign(exp,{m,pitch,anchor,up,choice,hooks});
  return g.fixTeam({name:"T",code:"ABC123",members:{a:{name:"Ann",joined:1},b:{name:"Bo",joined:2}},exp,
    round:{id:5,phase:"answer",qid:QUIZ[0].id,leader:"a",order:[0,1,2,3],startedAt:0,dur:45},log:[],stats:{}});}
const RIGHT=0,WRONG=1;
const play=(t,a,b)=>g.applyOutcome(t,{right:0,picks:{a,b}});
const pos=(t,id)=>g.posOf(t.exp,id);

test("both right: both climb a pitch",()=>{
  const n=play(team({pitch:1}),RIGHT,RIGHT);
  assert.equal(pos(n,"a"),2);assert.equal(pos(n,"b"),2);assert.equal(n.exp.run.right,2);assert.equal(n.exp.run.synced,1);});

test("wrong with no hook below: a fall to the last camp",()=>{
  const n=play(team({pitch:2,anchor:1}),RIGHT,WRONG);
  assert.equal(pos(n,"a"),3);assert.equal(pos(n,"b"),1);assert.equal(n.exp.run.falls,1);assert.equal(n.round.result.pl.b.fall,true);});

test("no answer counts as wrong",()=>{
  const n=g.applyOutcome(team({pitch:2,anchor:2}),{right:0,picks:{a:0}});
  assert.equal(pos(n,"b"),2);assert.equal(n.round.result.pl.b.none,true);assert.equal(n.round.result.pl.b.ok,false);});

test("a hook where they hang: a wrong answer only slips, keeping the height",()=>{
  const n=play(team({pitch:2,anchor:0,hooks:[2]}),WRONG,WRONG);
  assert.equal(pos(n,"a"),2);assert.equal(pos(n,"b"),2);assert.equal(n.exp.run.slips,2);assert.equal(n.exp.run.falls,0);});

test("a hook stays in the wall: a fall from above stops at the highest hook below",()=>{
  const n=play(team({pitch:1,up:{a:2},hooks:[1,2]}),WRONG,RIGHT);   // a at 3 falls to the hook at 2; b climbs 1 -> 2
  assert.equal(pos(n,"a"),2);assert.equal(pos(n,"b"),2);assert.equal(n.round.result.pl.a.hooked,true);assert.equal(n.exp.run.falls,1);
  assert.deepEqual([...n.exp.hooks],[1,2]);});

test("a hook above a climber does not catch them",()=>{
  const n=play(team({pitch:1,up:{a:2},hooks:[3]}),RIGHT,WRONG);     // b at 1 falls to base camp; the rope catches at a-3
  assert.equal(pos(n,"b"),Math.max(0,pos(n,"a")-MAX_GAP));assert.equal(n.round.result.pl.b.caught,undefined);});

test(`the rope jerk: nobody gets more than ${MAX_GAP} pitches ahead`,()=>{
  const n=play(team({pitch:0,up:{a:MAX_GAP}}),RIGHT,WRONG);
  assert.equal(pos(n,"a"),MAX_GAP);assert.equal(pos(n,"b"),0);
  assert.equal(n.round.result.pl.a.held,true);assert.equal(n.round.result.jerk,true);assert.equal(n.exp.run.jerks,1);});

test(`the rope catches a fall ${MAX_GAP} pitches below the partner`,()=>{
  // a waits at Camp I (pitch 5); b, two below, falls toward base camp and is caught by the rope
  const n=play(team({pitch:2,up:{a:3}}),RIGHT,WRONG);
  assert.equal(pos(n,"a"),5);assert.equal(pos(n,"b"),5-MAX_GAP);assert.equal(n.round.result.pl.b.roped,true);});

test("nobody climbs past a camp until both are there",()=>{
  const n=play(team({pitch:4,up:{a:1}}),RIGHT,WRONG);
  assert.equal(pos(n,"a"),SEG0_TIERS.length);});

test("reaching Camp I together: it becomes the anchor, and the team picks a route",()=>{
  const n=play(team({pitch:SEG0_TIERS.length-1}),RIGHT,RIGHT);
  assert.equal(n.round.result.arrived,"Camp I");assert.equal(n.exp.anchor,SEG0_TIERS.length);
  assert.equal(g.needsChoice(n.exp),0);assert.equal(g.startPitch(n).round.phase,"camp");});

test("the summit: scored, counted and kept as the team's best and the mountain's record",()=>{
  const choice=["A","A"],t=team({choice,m:"frostfang"});t.exp.pitch=g.total(t.exp)-1;
  const n=play(t,RIGHT,RIGHT);
  assert.equal(n.round.result.arrived,"summit");assert.equal(n.stats.summits,1);
  assert.equal(n.exp.run.pts,100);assert.equal(n.stats.best.pts,100);assert.deepEqual({...n.stats.peaks.frostfang},{n:1,pts:100,g:7});
  assert.equal(g.startPitch(n).round.phase,"summit");});

test("the first maps' climbs are shorter, growing to full length by Frostreach",()=>{
  const n=m=>{const e=Object.assign(g.newExp(1),{m,choice:["B","B"]});return g.total(e);};
  assert.ok(n("moss")<n("mistgate")&&n("mistgate")<n("redbutte")&&n("redbutte")<n("snowcap"));
  assert.ok(n("moss")>=8&&n("moss")<=11,"Greenvale: "+n("moss"));
  const e=Object.assign(g.newExp(1),{m:"moss",choice:["A","A"]});
  for(let p=0;p<g.total(e);p++)assert.ok(g.tierAt(e,p)>=1);});
test("star goals: top, no falls, no hooks; each one won stays won",()=>{
  const t=team({choice:["A","A"],m:"frostfang"});t.exp.pitch=g.total(t.exp)-1;t.exp.run={falls:1,hu:0};
  let n=play(t,RIGHT,RIGHT);assert.equal(n.stats.peaks.frostfang.g,1|4);assert.equal(g.ascentStars(n.exp.run),2);
  const u=team({choice:["A","A"],m:"frostfang"});u.stats=n.stats;u.exp.pitch=g.total(u.exp)-1;u.exp.run={falls:0,hu:2};
  n=play(u,RIGHT,RIGHT);assert.equal(n.stats.peaks.frostfang.g,7);assert.equal(n.exp.run.newStars,1);});

test("loose rock: hooks within two pitches below don't hold; a calm spell gives the hint; a storm cuts the clock",()=>{
  const t=team({pitch:4,anchor:0,hooks:[1,3,4]});t.round.ev="loose";
  let n=play(t,WRONG,WRONG);assert.equal(n.exp.pitch,1);assert.ok(n.round.result.pl.a.loose);
  n=play(team({pitch:4,anchor:0,hooks:[1,3,4]}),WRONG,WRONG);assert.equal(n.exp.pitch,4);
  const R=Math.random;try{
    Math.random=()=>0.01;const u=team({pitch:3});u.round={id:1,phase:"reveal"};const p=g.startPitch(u).round;
    assert.ok(p.ev);if(p.ev==="storm")assert.ok(p.dur<g.MOUNTAINS.snowcap.secs);if(p.ev==="calm")assert.ok(p.scout);
    const v=team({pitch:0});v.round={id:1,phase:"reveal"};Math.random=()=>0.01;assert.equal(g.startPitch(v).round.ev,undefined);
  }finally{Math.random=R;}});
test("the daily climb: the same mountain, route and questions for everyone; short; not counted on the map",()=>{
  const d="2026-11-19";assert.equal(g.dailyMtn(d),g.dailyMtn(d));assert.ok([1,2,3].includes(MOUNTAINS[g.dailyMtn(d)].map));
  for(let k=0;k<5;k++)assert.equal(g.dailyQuiz(d,2,k).id,g.dailyQuiz(d,2,k).id);
  assert.notEqual([0,1,2,3].map(k=>g.dailyQuiz(d,2,k).id).join(),[0,1,2,3].map(k=>g.dailyQuiz("2026-11-20",2,k).id).join());
  const t=team({m:g.dailyMtn(d),choice:["B","B"]});t.exp.daily=d;assert.ok(g.total(t.exp)<=8,String(g.total(t.exp)));
  t.round={id:1,phase:"reveal"};t.exp.pitch=1;const a=g.startPitch(JSON.parse(JSON.stringify(t))).round,b=g.startPitch(JSON.parse(JSON.stringify(t))).round;
  assert.equal(a.qid,b.qid);assert.equal(a.ev,undefined);
  const u=team({m:g.dailyMtn(d),choice:["B","B"]});u.exp.daily=d;u.exp.pitch=g.total(u.exp)-1;const n=play(u,RIGHT,RIGHT);
  assert.equal(n.round.result.arrived,"summit");assert.ok(n.stats.daily[d]);assert.equal(n.stats.peaks,undefined);assert.equal(n.stats.trail,undefined);});
test("the lucky charm forgives the first fall of a climb, once",()=>{
  const t=team({pitch:3});t.exp.charm=1;let n=play(t,WRONG,RIGHT);
  assert.equal(pos(n,"a"),3);assert.ok(n.round.result.pl.a.charm);assert.equal(n.exp.charm,0);assert.equal(n.exp.run.falls,0);
  n.round={...n.round,phase:"answer"};n=play(n,WRONG,RIGHT);assert.ok(pos(n,"a")<3);});
test("profiles from two devices merge without losing anything",()=>{
  const a={seen:{"X:1":"moss"},maps:{0:1},peaks:{moss:{g:3,ms:500}},daily:{}},b={seen:{"Y:2":"moss"},maps:{1:1},peaks:{moss:{g:4,ms:400},fernhill:{g:1}},daily:{"2026-11-19":{ms:90}}};
  const m=g.profMerge(a,b);assert.equal(Object.keys(m.seen).length,2);assert.equal(m.peaks.moss.g,7);assert.equal(m.peaks.moss.ms,400);
  assert.deepEqual(Object.keys(m.maps).sort(),["0","1"]);assert.ok(m.daily["2026-11-19"]);assert.equal(m.peaks.fernhill.ms,undefined);
  assert.equal(g.weekOf(Date.UTC(2026,10,16)),g.weekOf(Date.UTC(2026,10,22,23)));assert.notEqual(g.weekOf(Date.UTC(2026,10,16)),g.weekOf(Date.UTC(2026,10,15,23)));});
test("choosing climbers: defaults by seat, a choice kept, never both the same",()=>{
  const t=team();assert.equal(g.charOf(t,"a"),"lumberjack");assert.equal(g.charOf(t,"b"),"woman");
  t.members.a.char="redcat";t.members.b.char="modcut";assert.equal(g.charOf(t,"a"),"redcat");assert.equal(g.charOf(t,"b"),"modcut");
  t.members.b.char="redcat";assert.notEqual(g.charOf(t,"b"),"redcat");
  delete t.members.a.char;t.members.b.char="lumberjack";assert.notEqual(g.charOf(t,"b"),"lumberjack");
  t.members.a.char="nobody";assert.equal(g.charOf(t,"a"),"lumberjack");});
test("the ascent score: right answers, less 5 a fall and 2 a rope jerk, never below 0",()=>{
  assert.equal(g.ascentScore({q:10,right:10,falls:1,jerks:1}),93);
  assert.equal(g.ascentScore({q:10,right:1,falls:5}),0);
  assert.equal(g.ascentStars({q:10,right:10}),3);assert.equal(g.ascentStars({q:10,right:6}),2);assert.equal(g.ascentStars({q:10,right:2}),1);});

test("judging only counts real picks",()=>{
  const t=team();t.round.order=[2,0,3,1];
  const o=g.judge(t,{a:{choice:1},b:{choice:"x"},c:{choice:7}});
  assert.equal(o.right,1);assert.deepEqual({...o.picks},{a:1});});

test("each mountain shifts the difficulty a tier, within 1 to 4",()=>{
  const e=m=>Object.assign(g.newExp(1),{m});
  assert.equal(g.tierAt(e("moss"),0),1);assert.equal(g.tierAt(e("sunspire"),0),1);assert.equal(g.tierAt(e("sunspire"),4),3);
  assert.equal(g.tierAt(e("frostfang"),4),4);});

test("a map's theme: about half its questions come from its category",()=>{
  let n=0;for(let i=0;i<400;i++)if(g.pickQuiz(2,[],"Animals").cat==="Animals")n++;
  const base=QUIZ.filter(q=>q.tier===2&&q.cat==="Animals").length/QUIZ.filter(q=>q.tier===2).length;
  assert.ok(n/400>0.5&&n/400<0.5+base+0.12,String(n/400));
  assert.equal(g.pickQuiz(4,[],"Animals").tier,4);});
test("made-up questions: right answer first, rebuilt the same from the id, closer heights on harder pitches",()=>{
  for(let tier=1;tier<=4;tier++)for(let i=0;i<300;i++){const q=g.genQuiz(tier);
    assert.ok(q&&q.o.length>=2&&new Set(q.o).size===q.o.length,q&&q.id);
    assert.deepEqual(g.quizById(q.id+":"+tier).o,q.o);
    const ix=q.id.split(":")[2].split(".").map(Number),P=ix.map(k=>g.PEAKS[k]);
    if(q.gen==="higher"){assert.equal(q.o.length,2);assert.equal(q.o[0],(P[0][1]>P[1][1]?P[0]:P[1])[0]);}
    if(q.gen==="order"){const s=[...P].sort((x,y)=>y[1]-x[1]).map(p=>p[0]).join(", ");assert.equal(q.o[0],s);}
    if(q.gen==="near"){const [a,b]=q.o[0].replace(/,/g,"").replace(" m","").split("–").map(Number);assert.ok(P[0][1]>=a&&P[0][1]<b,q.o[0]);}}
  const hi=t=>{let s=0,n=0;for(let i=0;i<300;i++){const q=g.genQuiz(t);if(q.gen!=="higher")continue;const ix=q.id.split(":")[2].split(".").map(Number);
    s+=Math.abs(g.PEAKS[ix[0]][1]-g.PEAKS[ix[1]][1]);n++;}return s/n;};
  assert.ok(hi(1)>hi(4));});
test("a question the team had lately isn't drawn again while others are left",()=>{
  const pool=QUIZ.filter(q=>q.tier===1),used=pool.slice(1).map(q=>q.id);
  for(let i=0;i<20;i++)assert.equal(g.pickQuiz(1,used).id,pool[0].id);});

test("old saves load into today's shape",()=>{
  const t=g.fixTeam({name:"Old",members:{z:{name:"Z",joined:2},y:{name:"Y",joined:1}},round:{id:3,phase:"ready"}});
  assert.equal(t.exp.v,2);assert.equal(t.round.phase,"map");assert.equal(t.exp.m,null);assert.deepEqual([...g.memberIds(t)],["y","z"]);
  // (the database drops empty arrays and turns sparse ones into objects)
  const u=g.fixTeam({name:"T",members:{},exp:{v:2,n:1,choice:{0:"B"},used:{0:"q1"},pitch:5},round:{id:1,phase:"camp"}});
  assert.deepEqual([...u.exp.choice],["B",null]);assert.deepEqual([...u.exp.used],["q1"]);assert.equal(u.exp.m,"fernhill");
  assert.equal(g.fixTeam(null),null);});

test("every question is well formed",()=>{
  const ids=new Set(),cats=new Set(["Mountains","Animals","Weather","Geography","Nature"]);
  for(const q of QUIZ){assert.ok(!ids.has(q.id),"duplicate id "+q.id);ids.add(q.id);
    assert.ok([1,2,3,4].includes(q.tier),q.id+" tier");assert.ok(cats.has(q.cat),q.id+" category "+q.cat);
    assert.equal(q.o.length,4,q.id+" options");assert.equal(new Set(q.o).size,4,q.id+" repeats an option");
    for(const k of ["q","hint","x"])assert.ok(typeof q[k]==="string"&&q[k].length>5,q.id+" "+k);}});

test("every tier has enough questions for three climbs of any mountain without a repeat",()=>{
  // the most questions of a tier one climb can ask (with no falls), over every route and mountain
  const most={};
  for(const m of Object.values(MOUNTAINS))for(const a of ["A","B"])for(const b of ["A","B"]){const n={};
    for(const t of [...SEG0_TIERS,...FORKS[0][a].tiers,...FORKS[1][b].tiers]){const k=Math.max(1,Math.min(4,t+m.tier));n[k]=(n[k]||0)+1;}
    for(const k in n)most[k]=Math.max(most[k]||0,n[k]);}
  for(const k in most){const have=QUIZ.filter(q=>q.tier===+k).length;assert.ok(have>=3*most[k],`tier ${k}: ${have} questions, a climb can ask ${most[k]}`);}});

console.log(failed?`\n${failed} failed`:"\nall passed");process.exit(failed?1:0);

test("the maps: six mountains each, opened step by step, and the next map once the summit is climbed",()=>{
  const {MAPS}=g,t=team(),done=k=>{t.stats.peaks={...(t.stats.peaks||{}),[k]:{n:1,pts:50}};};
  assert.equal(MAPS.length,3);for(const M of MAPS)assert.equal(M.steps.flat().length,6);
  assert.ok(g.isOpen(t,"moss"));assert.ok(!g.isOpen(t,"fernhill"));assert.ok(!g.isOpen(t,"snowcap"));assert.equal(g.currentMap(t),0);
  done("moss");assert.ok(g.isOpen(t,"fernhill")&&g.isOpen(t,"pineknoll"));assert.ok(!g.isOpen(t,"stonehorn"));
  done("pineknoll");assert.ok(g.isOpen(t,"stonehorn")&&g.isOpen(t,"bramble"));assert.ok(!g.isOpen(t,"greycrown"));
  done("bramble");assert.ok(g.isOpen(t,"greycrown"));assert.ok(!g.mapDone(t,0));assert.ok(!g.isOpen(t,"snowcap"));
  done("greycrown");assert.ok(g.mapDone(t,0));assert.ok(g.isOpen(t,"snowcap"));assert.equal(g.currentMap(t),1);assert.ok(!g.isOpen(t,"ashcone"));});

test("a team's record from before the maps keeps its climbs",()=>{
  const t=g.fixTeam({name:"T",members:{},exp:{v:2,n:3,m:"frost",choice:[null,null],used:[]},round:{id:4,phase:"answer"},stats:{peaks:{moss:{n:2,pts:80},kebne:{n:1,pts:60}}}});
  assert.equal(t.exp.m,"frostfang");assert.deepEqual({...t.stats.peaks.fernhill},{n:1,pts:60});assert.equal(t.stats.peaks.kebne,undefined);
  assert.ok(g.isOpen(t,"stonehorn"));});

test("every mountain on a map is harder than the one before it on the trail, and every map harder than the last",()=>{
  const {MAPS,MOUNTAINS}=g;let prev=null;
  for(const M of MAPS)for(const step of M.steps){const ms=step.map(k=>MOUNTAINS[k]);
    if(prev)for(const m of ms){assert.ok(m.secs<=prev.secs,m.id+" time");assert.ok(m.hooks<=prev.hooks,m.id+" hooks");assert.ok(m.tier>=prev.tier,m.id+" tier");}
    prev=ms[0];}});

test("the trail: the team stands at its last climb and can only go on to the next step, until the map is done",()=>{
  const t=team(),done=k=>{t.stats.peaks={...(t.stats.peaks||{}),[k]:{n:1,pts:50}};t.stats.trail={...(t.stats.trail||{}),["m"+g.MOUNTAINS[k].map]:k};};
  assert.deepEqual([...g.nextOn(t,0)],["moss"]);
  done("moss");assert.ok(!g.isOpen(t,"moss"));assert.deepEqual([...g.nextOn(t,0)],["fernhill","pineknoll"]);
  done("fernhill");assert.ok(!g.isOpen(t,"pineknoll"),"the other branch of the fork is behind them");assert.ok(g.isOpen(t,"stonehorn")&&g.isOpen(t,"bramble"));
  done("stonehorn");done("greycrown");assert.ok(g.isOpen(t,"pineknoll")&&g.isOpen(t,"moss"),"a done map can be climbed again");
  // (and a summit there moves the team along the trail)
  const u=team({m:"moss",choice:["A","A"]});u.exp.pitch=g.total(u.exp)-1;const n=play(u,RIGHT,RIGHT);assert.equal(n.stats.trail.m0,"moss");});
