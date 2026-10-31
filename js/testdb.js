/* ============================== TEST MODE ==============================
   index.html?test&as=p1 (or p2) runs the game against an in-memory database instead of Firebase. Inside test.html
   both players share the page's database, so two frames side by side play one rope team; opened on its own, a
   frame keeps a database of its own. Nothing here ever reaches the real mountain. */
window.TEST=(()=>{const q=new URLSearchParams(location.search);if(!q.has("test"))return null;
  const as=q.get("as")==="p2"?"p2":"p1";return {as,code:"TEST01",name:as==="p1"?"Red":"Yellow"};})();

// the database: a JSON tree with Firebase's habits (writing null deletes) and listeners on any path
function TestDB(){
  let tree={};const subs=new Set();this.config={secs:0};
  const parts=p=>String(p).split("/").filter(Boolean);
  const read=p=>{let o=tree;for(const k of parts(p)){if(!o||typeof o!=="object")return null;o=o[k];}return o===undefined?null:o;};
  const write=(p,v)=>{const ks=parts(p);if(!ks.length){tree=v??{};return;}let o=tree;
    for(const k of ks.slice(0,-1)){if(!o[k]||typeof o[k]!=="object")o[k]={};o=o[k];}
    const last=ks[ks.length-1];if(v===null||v===undefined)delete o[last];else o[last]=v;};
  // a cheap fingerprint of a value, standing in for Firebase's ETag
  const tag=v=>{const s=JSON.stringify(v);let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return String(h);};
  const notify=p=>{const w=parts(p).join("/");
    for(const s of subs){const l=s.path;if(w===l||w.startsWith(l+"/")||l.startsWith(w+"/")||!l||!w)setTimeout(()=>subs.has(s)&&s.cb(JSON.stringify(read(l))),0);}};
  // values go in and out as JSON text, so each frame gets objects of its own
  this.get=p=>JSON.stringify(read(p));
  this.tag=p=>tag(read(p));
  this.put=(p,json,etag)=>{if(etag&&etag!==tag(read(p)))return false;write(p,JSON.parse(json));notify(p);return true;};
  this.patch=(p,json)=>{const v=JSON.parse(json);for(const [k,x] of Object.entries(v))write(p+"/"+k,x);notify(p);};
  this.listen=(p,cb)=>{const s={path:parts(p).join("/"),cb};subs.add(s);setTimeout(()=>subs.has(s)&&cb(JSON.stringify(read(p))),0);return ()=>subs.delete(s);};
  this.reset=()=>{tree={};notify("");};
}
// a rope team waiting at base camp, with both test players (or only the first) clipped in
function testTeam(two){const now=Date.now(),members={p1:{name:"Red",joined:now}};if(two)members.p2={name:"Yellow",joined:now+1};
  return {name:"Test Team",code:"TEST01",createdAt:now,createdBy:"p1",members,
    exp:{v:2,n:1,choice:[null,null],pitch:0,anchor:0,rope:3,chalk:1,scout:1,anchors:1,used:[]},
    round:{id:0,phase:"ready"},log:[{at:now,text:"Test Team roped up at base camp."}],stats:{}};}

if(window.TEST){
  let db=null;try{db=window.parent!==window&&window.parent.TESTDB;}catch(e){}
  if(!db){db=window.TESTDB=new TestDB();db.put("teams/TEST01",JSON.stringify(testTeam(true)));}
  TEST.db=db;TEST.secs=()=>db.config.secs||0;
  // the second player starts with the sound off, so the two frames don't play everything twice
  try{const k="pinnacle.test.p2.sound";if(localStorage.getItem(k)==null)localStorage.setItem(k,"false");}catch(e){}
  // the game's database calls, answered from the test database (game.js swaps these in for its Firebase ones)
  window.TESTFB={
    async get(p){return JSON.parse(db.get(p));},
    async getTagged(p){return {val:JSON.parse(db.get(p)),etag:db.tag(p)};},
    async put(p,v,etag){return db.put(p,JSON.stringify(v??null),etag);},
    async patch(p,v){db.patch(p,JSON.stringify(v));},
    async del(p){db.put(p,"null");},
    listen(p,cb){return db.listen(p,j=>cb(JSON.parse(j)));}
  };
}
