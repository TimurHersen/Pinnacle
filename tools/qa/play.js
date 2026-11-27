// Plays rounds with random forced results in test.html, both climbers' frames watched by monitor.js.
// node tools/qa/play.js [seed=1] [desktop|phone] [startPitch=0] [rounds=12]   -> one JSON line on stdout
// Read: errs (page errors) and mon[].log (glitch flags). Known harmless flags: see .claude/skills/pinnacle-qa.
const {chromium}=require('playwright');const fs=require('fs');const MON=fs.readFileSync(__dirname+'/monitor.js','utf8');
const seed=+(process.argv[2]||1),size=process.argv[3]||'desktop',start=process.argv[4]||'0',rounds=+(process.argv[5]||12);let s=seed;const rnd=()=>(s=s*16807%2147483647)/2147483647;
(async()=>{const port=+(process.env.PORT||8123),srv=await require('./serve.js')(port);const b=await chromium.launch();
const p=await b.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:size==='phone'?3:1});
const errs=[];p.on('pageerror',e=>errs.push('page '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/TUNNEL|ERR_/.test(m.text()))errs.push(m.text())});
await p.goto(`http://127.0.0.1:${port}/test.html?`+Date.now());await p.waitForTimeout(6000);if(size==='phone')await p.click('[data-size="phone"]');
const frames=()=>p.frames().filter(f=>/as=p[12]/.test(f.url()));const all=async fn=>{for(const f of frames())await f.evaluate(fn).catch(()=>{});};
await p.evaluate(()=>document.getElementById('goPitch').dispatchEvent(new Event('focus')));await p.selectOption('#goPitch',start);await p.waitForTimeout(5000);
await all(MON);await all(()=>{S.tipsOff=true;document.querySelector('.cskip')?.click();});
const st=()=>frames()[0].evaluate(()=>{const t=S.team;return {ph:t.round.phase,pos:memberIds(t).map(u=>posOf(t.exp,u)),busy:DIR.busy||DIR.q.length>0};}).catch(()=>({ph:'?'}));
const seen=[];
for(let k=0;k<rounds;k++){let x;const t0=Date.now();
  while(Date.now()-t0<25000){x=await st();if(!x.busy&&x.ph!=='reveal')break;if(x.ph==='reveal'&&!x.busy&&Date.now()-t0>3000)await all(()=>{if(typeof tapNext==='function')tapNext();document.querySelector('#nextBtn')?.click();});await p.waitForTimeout(500);}
  seen.push(x.ph+':'+(x.pos||[]).join('/'));if(x.ph==='summit')break;
  if(x.ph==='camp'){await all(()=>{document.querySelector('#panel .route:not([disabled]), #panel [data-gear]')?.click();});await p.waitForTimeout(700);await all(()=>document.querySelector('#campBtn')?.click());await p.waitForTimeout(2500);continue;}
  if(x.ph!=='answer'){await p.waitForTimeout(1500);continue;}
  const r=rnd(),kind=r<.55?'both':r<.7?'jerkL':r<.85?'jerkB':r<.95?'wrong':'time',hook=rnd()<.25;
  if(hook)await p.click('#withHook');await p.click(`[data-force="${kind}"]`);if(hook)await p.click('#withHook');seen[seen.length-1]+=' '+kind+(hook?'+h':'');await p.waitForTimeout(1200);}
await p.waitForTimeout(3000);const mon=[];for(const f of frames())mon.push(await f.evaluate(()=>window.__MON?{n:__MON.n,log:__MON.log}:null).catch(e=>'x '+e.message));
console.log(JSON.stringify({seed,size,start,seen,errs:errs.slice(0,10),mon}));await b.close();srv.close();})();
