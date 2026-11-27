// Canvas frames of the climb at its own pixel size, for a scenario, to read motion frame by frame.
// node tools/qa/capture.js <outDir> <scenario,...>   scenarios: wall (a climb), jerk (rope jerk), hook (fall onto a
// hook), fall (fall to a ledge). Frames: <outDir>/<name>_NNN.png, ~100 ms apart. Make sheets with sheet.py.
const {chromium}=require('playwright');const fs=require('fs');const OUT=process.argv[2]||'qa-frames';fs.mkdirSync(OUT,{recursive:true});
const SC={wall:async t=>{await t.go('2');await t.grab('wall',4,150);await t.force('both');await t.grab('climb',60,100);},
  jerk:async t=>{await t.go('4');for(const k of ['a','b','c']){await t.force('jerkL');await t.grab(k,40,120);await t.wait(3500);}},
  hook:async t=>{await t.go('4');await t.p.click('#withHook');await t.force('jerkB');await t.grab('h',50,100);},
  fall:async t=>{await t.go('5');await t.force('jerkB');await t.grab('f',60,100);}};
(async()=>{const port=+(process.env.PORT||8123),srv=await require('./serve.js')(port);const b=await chromium.launch();const errs=[];
for(const name of (process.argv[3]||'wall').split(',')){const p=await b.newPage({viewport:{width:1400,height:800}});p.on('pageerror',e=>errs.push(name+': '+e.message));
  await p.goto(`http://127.0.0.1:${port}/test.html?`+Date.now());await p.waitForTimeout(6000);await p.click('[data-view="p1"]');const fr=()=>p.frame({url:/as=p1/});
  const t={p,wait:ms=>p.waitForTimeout(ms),force:k=>p.click(`[data-force="${k}"]`),
    grab:async(n,c,dt)=>{for(let i=0;i<c;i++){await p.waitForTimeout(dt);const d=await fr().evaluate(()=>document.querySelector('#topo').toDataURL());fs.writeFileSync(`${OUT}/${n}_${String(i).padStart(3,'0')}.png`,Buffer.from(d.split(',')[1],'base64'));}},
    go:async v=>{await p.evaluate(()=>document.getElementById('goPitch').dispatchEvent(new Event('focus')));await p.selectOption('#goPitch',v);await p.waitForTimeout(6000);await fr().evaluate(()=>{S.tipsOff=true;document.querySelector('.cskip')?.click();}).catch(()=>{});await p.waitForTimeout(800);}};
  await SC[name](t);await p.close();}
console.log('errors:',JSON.stringify(errs));await b.close();srv.close();})();
