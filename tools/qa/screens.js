// Screenshots of every screen outside the climb (title, each title panel, climber select, map, mountain card,
// team menu) at phone, phone-on-its-side and desktop sizes, plus a contact sheet per size.
// node tools/qa/screens.js [outDir=qa-out]   (needs python3 + Pillow for the sheets)
const {chromium}=require('playwright');const fs=require('fs');const out=process.argv[2]||'qa-out';fs.mkdirSync(out,{recursive:true});
(async()=>{const port=+(process.env.PORT||8123),srv=await require('./serve.js')(port);const b=await chromium.launch();const errs=[];const U=`http://127.0.0.1:${port}/index.html`;
for(const [w,h,dsf,tag] of [[390,844,3,'phone'],[844,390,3,'land'],[1440,900,1,'desk']]){
  const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:dsf});p.on('pageerror',e=>errs.push(tag+' '+e.message));
  const shot=async n=>{await p.waitForTimeout(900);await p.screenshot({path:`${out}/${tag}_${n}.png`});};
  await p.goto(U+'?x='+Date.now());await p.waitForTimeout(3500);await shot('1title');
  for(const id of await p.$$eval('.pbtn',bs=>bs.map(b=>b.dataset.id))){await p.click(`.pbtn[data-id="${id}"]`).catch(()=>{});await shot('2menu_'+id);await p.keyboard.press('Escape');await p.evaluate(()=>document.querySelector('.back')?.click()).catch(()=>{});await p.waitForTimeout(600);}
  await p.goto(U+'?test&as=p1&x='+Date.now());await p.waitForTimeout(5000);await shot('3charpick');
  await p.evaluate(()=>document.querySelector('#cpDone')?.click());await p.waitForTimeout(2000);await p.evaluate(()=>{S.tipsOff=true;document.querySelector('.cskip')?.click();});await shot('4map');
  await p.evaluate(()=>document.querySelector('.wpin.nx')?.click());await shot('5mappop');
  await p.evaluate(()=>openMenu());await shot('6menu');await p.close();}
console.log(JSON.stringify(errs.filter(e=>!/TUNNEL/.test(e))));await b.close();srv.close();
try{require('child_process').execFileSync('python3',['-c',`
import glob
from PIL import Image,ImageDraw
for tag,cols,w in [('phone',5,300),('land',3,620),('desk',3,620)]:
  fs=sorted(glob.glob('${out}/'+tag+'_*.png'));ims=[Image.open(f).convert('RGB') for f in fs]
  if not ims:continue
  h=int(w*ims[0].height/ims[0].width);rows=(len(ims)+cols-1)//cols;S=Image.new('RGB',(cols*(w+6),rows*(h+22)),(30,30,30));d=ImageDraw.Draw(S)
  for i,(f,im) in enumerate(zip(fs,ims)):x,y=(i%cols)*(w+6),(i//cols)*(h+22);S.paste(im.resize((w,h)),(x,y+18));d.text((x+2,y+3),f.split('/')[-1],fill=(255,255,0))
  S.save('${out}/sheet_'+tag+'.png')`]);}catch(e){console.error('sheets skipped:',e.message);}})();
