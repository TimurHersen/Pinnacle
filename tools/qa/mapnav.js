// Pages through all six maps and prints the map's left/top each step: a map that should only slide sideways must
// keep one top. node tools/qa/mapnav.js
const {chromium}=require('playwright');
(async()=>{const port=+(process.env.PORT||8123),srv=await require('./serve.js')(port);const b=await chromium.launch();
for(const [w,h,tag] of [[1180,930,'wide'],[1440,1000,'big'],[390,844,'tall']]){const p=await b.newPage({viewport:{width:w,height:h}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(`http://127.0.0.1:${port}/index.html?test&as=p1&x=`+Date.now());await p.waitForTimeout(4500);
  await p.evaluate(()=>document.querySelector('#cpDone')?.click());await p.waitForTimeout(2500);await p.evaluate(()=>{S.tipsOff=true;document.querySelector('.cskip')?.click();});
  const tops=[];const at=()=>p.evaluate(()=>{const m=S.liveMap;return m.dataset.map+':'+Math.round(parseFloat(m.style.top))});
  for(let k=0;k<5;k++){await p.click('#mapNext');for(let i=0;i<6;i++){await p.waitForTimeout(150);tops.push(await at());}}
  for(let k=0;k<5;k++){await p.click('#mapPrev');await p.waitForTimeout(700);}await p.waitForTimeout(1500);tops.push('back '+await at());
  console.log(tag,[...new Set(tops)].join(' '),errs);await p.close();}
await b.close();srv.close();})();
