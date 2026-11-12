// The climb's rules, checked without a browser: node test/rules.test.js (no install needed; exits 1 on a failure)
const assert=require("assert/strict");
const g=require("./load.js")();
const {QUIZ,MOUNTAINS,SEG0_TIERS,FORKS,MAX_GAP}=g;

let failed=0;
function test(name,fn){try{fn();console.log("ok   "+name);}catch(e){failed++;console.log("FAIL "+name+"\n     "+(e.message||e).split("\n").join("\n     "));}}

// a two-climber team mid-question: a joined first, so a is player 1. The right answer is in slot 0.
function team({pitch=0,anchor=0,up={},m="kebne",choice=[null,null],hooks=[]}={}){
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
  const choice=["A","A"],t=team({choice,m:"frost"});t.exp.pitch=g.total(t.exp)-1;
  const n=play(t,RIGHT,RIGHT);
  assert.equal(n.round.result.arrived,"summit");assert.equal(n.stats.summits,1);
  assert.equal(n.exp.run.pts,100);assert.equal(n.stats.best.pts,100);assert.deepEqual({...n.stats.peaks.frost},{n:1,pts:100});
  assert.equal(g.startPitch(n).round.phase,"summit");});

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
  assert.equal(g.tierAt(e("moss"),0),1);assert.equal(g.tierAt(e("kebne"),0),1);assert.equal(g.tierAt(e("kebne"),4),3);
  assert.equal(g.tierAt(e("frost"),4),4);});

test("a question the team had lately isn't drawn again while others are left",()=>{
  const pool=QUIZ.filter(q=>q.tier===1),used=pool.slice(1).map(q=>q.id);
  for(let i=0;i<20;i++)assert.equal(g.pickQuiz(1,used).id,pool[0].id);});

test("old saves load into today's shape",()=>{
  const t=g.fixTeam({name:"Old",members:{z:{name:"Z",joined:2},y:{name:"Y",joined:1}},round:{id:3,phase:"ready"}});
  assert.equal(t.exp.v,2);assert.equal(t.round.phase,"map");assert.equal(t.exp.m,null);assert.deepEqual([...g.memberIds(t)],["y","z"]);
  // (the database drops empty arrays and turns sparse ones into objects)
  const u=g.fixTeam({name:"T",members:{},exp:{v:2,n:1,choice:{0:"B"},used:{0:"q1"},pitch:5},round:{id:1,phase:"camp"}});
  assert.deepEqual([...u.exp.choice],["B",null]);assert.deepEqual([...u.exp.used],["q1"]);assert.equal(u.exp.m,"kebne");
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
