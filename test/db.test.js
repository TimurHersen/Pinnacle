// The database rules (database.rules.json), checked against the Firebase emulators:
//   npx firebase-tools emulators:exec --only database,auth "node test/db.test.js"
// (needs Java; the first run downloads the database emulator). Exits 1 on a failure.
const DB="http://127.0.0.1:9000",NS="pinnacle-5f36a-default-rtdb",AUTH="http://127.0.0.1:9099";
let failed=0;
async function test(name,fn){try{await fn();console.log("ok   "+name);}catch(e){failed++;console.log("FAIL "+name+"\n     "+(e.message||e));}}

// an anonymous sign-in, as the game makes one
async function signIn(){const r=await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`,{method:"POST",headers:{"Content-Type":"application/json"},body:'{"returnSecureToken":true}'});
  const d=await r.json();return {uid:d.localId,token:d.idToken};}
// a request as someone (null: signed out, "owner": the emulator's admin, who skips the rules); the status comes back
async function req(who,method,path,body){
  const q=[`ns=${NS}`];if(who&&who!=="owner")q.push("auth="+who.token);
  const h={"Content-Type":"application/json"};if(who==="owner")h.Authorization="Bearer owner";
  const r=await fetch(`${DB}/${path}.json?${q.join("&")}`,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});
  return r.status;}
const ok=async(p,what)=>{const s=await p;if(s!==200)throw new Error(`${what}: expected 200, got ${s}`);};
const denied=async(p,what)=>{const s=await p;if(s===200)throw new Error(`${what}: expected a refusal, got 200`);};

const exp={v:2,n:1,pitch:0,anchor:0,rope:3,chalk:1,scout:1,anchors:1};
// (seats: the climbers in the order they joined, as the game writes them; the stand-in has none)
const seatsOf=m=>Object.fromEntries(Object.keys(m).filter(k=>k!=="sim"&&m[k]).sort((a,b)=>m[a].joined-m[b].joined).map((k,i)=>[String(i+1),k]));
const team=(members,extra={})=>({name:"T",code:"ROPE01",members,seats:seatsOf(members),exp,round:{id:1,phase:"map"},...extra});
const seat=(name,a,joined=1)=>({name,joined,...(a?{a}:{})});

(async()=>{
  await req("owner","PUT","",{});
  const A=await signIn(),B=await signIn(),X=await signIn(),TV=await signIn();
  const two=()=>team({pa:seat("Ann",A.uid,1),pb:seat("Bo",B.uid,2)},{auth:{[A.uid]:"pa",[B.uid]:"pb"}});

  await test("signed out: no writes at all",async()=>{
    await denied(req(null,"PUT","teams/ROPE01",team({pa:seat("Ann")})),"create");
    await denied(req(null,"PUT","presence/ROPE01/pa",1),"presence");});

  await test("a new team is made by a climber bound to their own seat",async()=>{
    await ok(req(A,"PUT","teams/ROPE01",team({pa:seat("Ann",A.uid)},{auth:{[A.uid]:"pa"}})),"create");});

  await test("an open team (one climber) takes a second who binds their own seat, and nobody unbound",async()=>{
    const one=team({pa:seat("Ann",A.uid)},{auth:{[A.uid]:"pa"}});
    const unbound={...one,members:{...one.members,pb:seat("Bo",null,2)}};unbound.seats=seatsOf(unbound.members);
    await denied(req(B,"PUT","teams/ROPE01",unbound),"join without binding a seat");
    await denied(req(B,"PUT","teams/ROPE01",team({pb:seat("Bo",B.uid,2)},{auth:{[B.uid]:"pb"}})),"join and push the first climber off");
    await ok(req(B,"PUT","teams/ROPE01",two()),"join");});

  await test("a full team: a stranger with the code can't change it",async()=>{
    await denied(req(X,"PUT","teams/ROPE01",{...two(),name:"Mine now"}),"overwrite");
    await denied(req(X,"PATCH","teams/ROPE01/round",{phase:"summit"}),"patch the round");
    await denied(req(X,"PUT","teams/ROPE01/auth/"+X.uid,"pa"),"claim a bound seat");
    await denied(req(X,"PUT","answers/ROPE01/1/pa",{roundId:1,uid:"pa",at:1,choice:0}),"answer as a climber");
    await denied(req(X,"DELETE","answers/ROPE01"),"wipe the answers");
    await denied(req(X,"PUT","answers/ROPE01/1/_talk/m1",{uid:"pa",text:"hi",at:1}),"radio as a climber");});

  await test("a climber writes the team, their own answers and the stand-in's, never their partner's",async()=>{
    await ok(req(A,"PUT","teams/ROPE01",{...two(),round:{id:2,phase:"answer"}}),"move the climb on");
    await ok(req(B,"PATCH","teams/ROPE01/round/votes/pb",{mtn:"moss"}),"vote");
    await ok(req(B,"PUT","answers/ROPE01/2/pb",{roundId:2,uid:"pb",at:1,choice:1}),"own answer");
    await ok(req(B,"PUT","answers/ROPE01/2/sim",{roundId:2,uid:"sim",at:1,choice:0}),"the stand-in's answer");
    await denied(req(B,"PUT","answers/ROPE01/2/pa",{roundId:2,uid:"pa",at:1,choice:1}),"partner's answer");
    await ok(req(B,"PUT","answers/ROPE01/2/_talk/m1",{uid:"pb",text:"hi",at:1}),"radio");
    await denied(req(B,"PUT","answers/ROPE01/2/_talk/m2",{uid:"pa",text:"hi",at:1}),"radio as the partner");
    await ok(req(A,"PATCH","answers/ROPE01",{"1":null}),"clear old rounds");});

  await test("presence: each climber their own; a big screen (not on the rope) its own too",async()=>{
    await ok(req(A,"PUT","presence/ROPE01/pa",{".sv":"timestamp"}),"own");
    await denied(req(X,"PUT","presence/ROPE01/pa",1),"a climber's, by a stranger");
    await denied(req(X,"DELETE","presence/ROPE01/pa"),"clear a climber's, by a stranger");
    await ok(req(TV,"PUT","presence/ROPE01/screen1",{".sv":"timestamp"}),"a screen's");});

  await test("a third climber is refused",async()=>{
    const t=two();t.members.pc=seat("Cy",A.uid,3);await denied(req(A,"PUT","teams/ROPE01",t),"three on the rope, two seats");
    t.seats["3"]="pc";await denied(req(A,"PUT","teams/ROPE01",t),"a third seat");
    const s=two();s.members.sim={name:"Sim",joined:3,sim:50};await denied(req(A,"PUT","teams/ROPE01",s),"a stand-in beside two climbers");});

  await test("a place is taken over only once its climber has been offline",async()=>{
    const t=two();delete t.members.pa;t.members.px=seat("Ann",X.uid,1);t.seats=seatsOf(t.members);t.auth={[B.uid]:"pb",[X.uid]:"px"};t.took="pa";
    await denied(req(X,"PUT","teams/ROPE01",t),"while online");
    await ok(req(B,"PUT","presence/ROPE01/pb",{".sv":"timestamp"}),"Bo is online");
    await ok(req(A,"DELETE","presence/ROPE01/pa"),"Ann closes the game");
    {const u={...t,took:"pb",members:{px:t.members.px,pa:seat("Ann",A.uid,1)}};u.seats=seatsOf(u.members);await denied(req(X,"PUT","teams/ROPE01",u),"a place still online (Bo's)");}
    await ok(req(X,"PUT","teams/ROPE01",t),"once offline");
    await denied(req(A,"PATCH","teams/ROPE01/round",{phase:"map"}),"the old device after the takeover");});

  await test("a team from before sign-ins: each climber claims their own seat, the stand-in's can't be",async()=>{
    const old=team({pa:seat("Ann"),sim:{name:"Sim",joined:2,sim:50}});delete old.seats;
    await ok(req("owner","PUT","teams/OLD001",{...old,code:"OLD001"}),"seed");
    await denied(req(A,"PATCH","teams/OLD001/round",{phase:"map"}),"before claiming");
    await denied(req(X,"PATCH","teams/OLD001",{"members/sim/a":X.uid,[`auth/${X.uid}`]:"sim"}),"the stand-in's seat");
    await ok(req(A,"PATCH","teams/OLD001",{"members/pa/a":A.uid,[`auth/${A.uid}`]:"pa"}),"claim");
    await denied(req(X,"PATCH","teams/OLD001",{"members/pa/a":X.uid}),"claim a claimed seat");
    await ok(req(A,"PATCH","teams/OLD001/round",{phase:"map"}),"after claiming");
    const full=team({pa:seat("Ann"),pb:seat("Bo",null,2)});delete full.seats;
    await ok(req("owner","PUT","teams/OLD002",{...full,code:"OLD002"}),"seed a full one");
    const grab=team({pa:seat("Ann"),px:seat("X",X.uid,3)},{code:"OLD002",auth:{[X.uid]:"px"}});
    await denied(req(X,"PUT","teams/OLD002",grab),"a stranger joins it");});

  await test("a big screen a climber let in can move the climb on; one that wasn't can't",async()=>{
    await ok(req("owner","PUT","teams/TV0001",{...two(),code:"TV0001"}),"seed");
    await denied(req(TV,"PATCH","teams/TV0001/round",{phase:"reveal"}),"not let in");
    await ok(req(A,"PATCH","teams/TV0001/screens",{[TV.uid]:true}),"a climber lets it in");
    await ok(req(TV,"PATCH","teams/TV0001/round",{phase:"reveal"}),"let in");
    await ok(req(TV,"PATCH","answers/TV0001",{"0":null}),"clears old answers");
    await denied(req(TV,"PUT","answers/TV0001/3/pa",{roundId:3,uid:"pa",at:1,choice:0}),"answers for a climber");});

  await test("nobody can delete a team",async()=>{await denied(req(A,"DELETE","teams/ROPE01"),"delete");});

  console.log(failed?`\n${failed} failed`:"\nall passed");process.exit(failed?1:0);
})();
