// The database's access rules (database.rules.json), checked against the Firebase emulator: who may write what.
//   npx firebase-tools emulators:exec --only database "node test/database.rules.test.js"
// (needs Java; the GitHub workflow runs it on every push). Without an emulator running it says so and stops.
const assert=require("assert/strict");
const HOST=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if(!HOST){console.log("skipped: no database emulator (see the top of this file)");process.exit(0);}
const NS=(process.env.GCLOUD_PROJECT||"pinnacle-5f36a")+"-default-rtdb"; // (the namespace the emulator loaded the rules into)
const url=p=>`http://${HOST}/${p}.json?ns=${NS}`;
// a request as a player (no auth, like the game) or as the emulator's owner (rules skipped, for setting up)
async function req(method,p,body,owner){
  const h={"Content-Type":"application/json"};if(owner)h.Authorization="Bearer owner";
  const r=await fetch(url(p),{method,headers:h,body:body===undefined?undefined:JSON.stringify(body)});return r.ok;}
const put=(p,v)=>req("PUT",p,v),patch=(p,v)=>req("PATCH",p,v),del=p=>req("DELETE",p);

const CODE="ABC123";
const team=(round={id:5,phase:"answer"})=>({name:"T",code:CODE,members:{ann:{name:"Ann",joined:1},bo:{name:"Bo",joined:2}},
  exp:{v:2,n:1,pitch:0},round,log:[],stats:{}});
const answer=(uid,rid=5,extra={})=>({roundId:rid,uid,at:1,choice:1,...extra});

let failed=0;
async function test(name,fn){
  await req("PUT","",{},true); // (a clean database for every test)
  await req("PUT","teams/"+CODE,team(),true);
  try{await fn();console.log("ok   "+name);}catch(e){failed++;console.log("FAIL "+name+"\n     "+(e.message||e));}}

(async()=>{
  await test("a new rope team can be created",async()=>{assert.ok(await put("teams/XYZ789",{...team({id:0,phase:"map"}),code:"XYZ789"}));});
  await test("a rope team can't be deleted",async()=>{assert.equal(await del("teams/"+CODE),false);});
  await test("a team's round never goes back",async()=>{
    assert.equal(await put("teams/"+CODE,team({id:4,phase:"answer"})),false);
    assert.ok(await put("teams/"+CODE,team({id:6,phase:"reveal"})));});
  await test("a camp vote can be saved",async()=>{assert.ok(await patch(`teams/${CODE}/round/votes/ann`,{route:"A"}));});

  await test("a climber locks an answer for the open question",async()=>{assert.ok(await put(`answers/${CODE}/5/ann`,answer("ann")));});
  await test("a locked answer can't be changed",async()=>{
    assert.ok(await put(`answers/${CODE}/5/ann`,answer("ann")));
    assert.equal(await put(`answers/${CODE}/5/ann`,answer("ann",5,{choice:2})),false);});
  await test("nobody answers for someone else",async()=>{
    assert.equal(await put(`answers/${CODE}/5/bo`,answer("ann")),false);});
  await test("someone off the rope can't answer",async()=>{assert.equal(await put(`answers/${CODE}/5/eve`,answer("eve")),false);});
  await test("answers only go to the round that is open",async()=>{
    assert.equal(await put(`answers/${CODE}/4/ann`,answer("ann",4)),false);
    assert.equal(await put(`answers/${CODE}/5/ann`,answer("ann",4)),false);});
  await test("no answers while there's no question",async()=>{
    await req("PUT","teams/"+CODE,team({id:5,phase:"reveal"}),true);
    assert.equal(await put(`answers/${CODE}/5/ann`,answer("ann")),false);});
  await test("the simulated partner answers when it's on the rope",async()=>{
    const t=team();t.members.sim={name:"Sim climber",joined:3,sim:50};await req("PUT","teams/"+CODE,t,true);
    assert.ok(await put(`answers/${CODE}/5/sim`,answer("sim")));});
  await test("old rounds can be cleared",async()=>{
    await req("PUT",`answers/${CODE}/1/ann`,answer("ann",1),true);
    assert.ok(await patch(`answers/${CODE}`,{1:null,2:null}));});
  await test("the open question's answers can't be wiped (and so locked in again)",async()=>{
    assert.ok(await put(`answers/${CODE}/5/ann`,answer("ann")));assert.equal(await del(`answers/${CODE}/5/ann`),false);
    assert.equal(await patch(`answers/${CODE}`,{5:null}),false);});

  await test("a climber talks over the radio, once per message",async()=>{
    const m={uid:"ann",text:"Hi",at:1};assert.ok(await put(`answers/${CODE}/5/_talk/ann_1`,m));
    assert.equal(await put(`answers/${CODE}/5/_talk/ann_1`,{...m,text:"Changed"}),false);});
  await test("someone off the rope can't talk on it",async()=>{
    assert.equal(await put(`answers/${CODE}/5/_talk/eve_1`,{uid:"eve",text:"Hi",at:1}),false);});
  await test("radio messages stay short",async()=>{
    assert.equal(await put(`answers/${CODE}/5/_talk/ann_2`,{uid:"ann",text:"x".repeat(61),at:1}),false);});

  await test("anyone watching the team marks themselves online and leaves",async()=>{
    assert.ok(await put(`presence/${CODE}/tvscreen`,123));assert.ok(await del(`presence/${CODE}/tvscreen`));});
  await test("nothing else in the database can be written",async()=>{assert.equal(await put("other/x",1),false);});

  console.log(failed?`\n${failed} failed`:"\nall passed");process.exit(failed?1:0);
})();
