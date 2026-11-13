/* ---------- the soundtrack: original tunes, played live through the sound engine (audio.js) ----------
   Four pieces, each a list of bars scheduled a moment ahead on the audio clock, all through soft, rounded voices
   and a low-pass filter (no files, nothing buzzy):
   - "Base Camp" (home screen, and the map in a quieter bed): D major, 84 BPM. A four-bar dawn intro, then a 16-bar
     loop: section A states the climbing motif over D–Bm–G–A, section B reaches up to the high B over G–A–F#m–Bm.
   - "The Wall" (on the climb): B minor, 96 BPM, a steady plucked pattern over Bm–G–D–A | Bm–G–Em–F#. It builds with
     the stage: stage one is the pluck, pad and bass; stage two adds a soft kick and a shaker; the summit push adds
     a high motif and an extra octave. In the last seconds of a question a ticking hat and a low pulse come in.
   - "Night at Camp" (resting at a camp): G major, 66 BPM, a music-box lullaby over a warm pad, with crickets.
   - "Top of the World" (the summit): "Base Camp"'s B section in full, with a brighter echo.
   Changing piece fades the old one out while the new one fades in on its first bar. */
const MUSIC=(()=>{
  const hz=m=>440*Math.pow(2,(m-69)/12);
  // chords: bass root (MIDI) and triad
  const CH={D:[50,[0,4,7]],Bm:[47,[0,3,7]],G:[43,[0,4,7]],A:[45,[0,4,7]],"F#m":[42,[0,3,7]],Em:[40,[0,3,7]],
    "F#":[42,[0,4,7]],C:[48,[0,4,7]],Am:[45,[0,3,7]]};

  /* --- "Base Camp" --- */
  const HA=[[[69,2],[74,2],[76,1],[78,3]],[[78,2],[76,1],[74,1],[71,4]],[[67,1],[71,1],[74,2],[76,2],[74,2]],[[73,2],[74,1],[76,1],[69,4]],
            [[69,2],[74,2],[76,1],[78,3]],[[81,2],[78,1],[76,1],[73,4]],[[71,1],[74,1],[79,2],[78,2],[76,2]],[[76,2],[73,2],[69,2],[0,2]]];
  const HB=[[[74,3],[79,3],[78,2]],[[76,3],[81,3],[79,2]],[[78,3],[73,3],[69,2]],[[71,2],[74,2],[78,2],[83,2]],
            [[79,3],[76,3],[71,2]],[[73,2],[76,2],[81,4]],[[78,2],[76,1],[78,1],[74,4]],[[0,2],[69,1],[71,1],[73,2],[76,2]]];
  const homeA=["D","Bm","G","A","D","F#m","G","A"].map((c,i)=>({c,mel:HA[i],shaker:0}));
  const homeB=["G","A","F#m","Bm","Em","A","D","A"].map((c,i)=>({c,mel:HB[i],shaker:1}));
  const HOME={name:"home",bpm:84,intro:["D","G","Bm","A"].map(c=>({c,mel:[[0,8]],intro:1})),loop:[...homeA,...homeB],play:playHome};
  const SUMMIT={name:"summit",bpm:84,intro:[],loop:[...homeB,...homeA],play:playHome,bright:1};

  /* --- "The Wall" --- */
  const WM=[[[78,2],[81,2],[83,4]],[[81,2],[78,2],[76,4]],[[74,2],[76,2],[78,4]],[[73,3],[74,1],[73,4]],
            [[78,2],[81,2],[86,4]],[[83,2],[81,2],[79,4]],[[79,2],[78,2],[76,4]],[[78,3],[76,1],[73,4]]];
  const WALL={name:"climb",bpm:96,intro:["Bm","G"].map(c=>({c,intro:1})),
    loop:["Bm","G","D","A","Bm","G","Em","F#"].map((c,i)=>({c,mel:WM[i]})),play:playWall};

  /* --- "Night at Camp" --- */
  const CM=[[[79,2],[83,2],[86,4]],[[83,2],[79,2],[76,4]],[[72,2],[76,2],[79,4]],[[78,2],[74,2],[0,4]],
            [[79,2],[83,2],[86,3],[88,1]],[[86,2],[83,2],[79,4]],[[81,2],[84,2],[81,2],[76,2]],[[78,4],[74,2],[0,2]]];
  const CAMP={name:"camp",bpm:66,intro:[{c:"G",intro:1}],loop:["G","Em","C","D","G","Em","Am","D"].map((c,i)=>({c,mel:CM[i]})),play:playCamp};

  let want=false,on=LS.get("music",true),cur=null,next=HOME,calm=false,level=1,tension=false,timer=null,bar=0,t0=0,intro=true;
  let bus=null,echo=null,lp=null,mellow=null;
  const E=()=>60/cur.bpm/2; // one eighth note, in seconds
  const gainOf=()=>cur===HOME?(calm?.42:.8):cur===WALL?.62:cur===CAMP?.55:.85;

  // a mellow wave: a sine with a little of its next few harmonics, rounder than a square, warmer than a pure sine
  function soft(c){const re=new Float32Array([0,0,0,0,0,0]),im=new Float32Array([0,1,.22,.1,.04,.02]);return c.createPeriodicWave(re,im);}
  // a fresh chain for each piece: its own bus (so the old one can fade out under the new), a low-pass and an echo
  function chain(c,song){
    const b=c.createGain();b.gain.value=0;const f=c.createBiquadFilter();f.type="lowpass";f.frequency.value=song===WALL?2600:song===CAMP?2000:2400;f.Q.value=.5;
    b.connect(f);f.connect(SND.out);
    const e=c.createDelay(2);e.delayTime.value=60/song.bpm/2*3;const fb=c.createGain();fb.gain.value=song.bright?.44:.36;const wet=c.createGain();wet.gain.value=song===CAMP?.5:.4;
    const dull=c.createBiquadFilter();dull.type="lowpass";dull.frequency.value=1600;
    e.connect(dull);dull.connect(fb);fb.connect(e);dull.connect(wet);wet.connect(b);
    if(!mellow)mellow=soft(c);return {b,e,f};}
  // one note: a gentle swell in (atk), a slow fall away at the end; decay instead gives a plucked or struck note
  function tone(c,{wave,f,at,len,vol,to,vib,atk=.03,decay}){
    const o=c.createOscillator(),g=c.createGain();if(typeof wave==="string")o.type=wave;else o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f,at);
    if(vib&&len>.6){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=4.5;lg.gain.setValueAtTime(0,at);lg.gain.linearRampToValueAtTime(f*.005,at+.5);
      l.connect(lg);lg.connect(o.frequency);l.start(at);l.stop(at+len+.3);}
    const a=Math.min(atk,len*.4);g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+a);
    if(decay)g.gain.exponentialRampToValueAtTime(.0001,at+a+decay);
    else{g.gain.linearRampToValueAtTime(vol*.7,at+a+Math.min(.25,len*.4));g.gain.setValueAtTime(vol*.7,at+len*.8);g.gain.linearRampToValueAtTime(0,at+len+.12);}
    o.connect(g);for(const d of to)g.connect(d);o.start(at);o.stop(at+(decay?a+decay:len+.15)+.05);}
  function noise(c,at,{f,q=.9,type="bandpass",vol,dec,to=bus}){const s=c.createBufferSource(),b=c.createBiquadFilter(),g=c.createGain();s.buffer=SND.noise;b.type=type;b.frequency.value=f;b.Q.value=q;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+dec);s.connect(b);b.connect(g);g.connect(to);s.start(at,Math.random());s.stop(at+dec+.03);}
  // a soft kick: a sine dropping fast in pitch
  function kick(c,at,vol){const o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(120,at);o.frequency.exponentialRampToValueAtTime(42,at+.14);
    g.gain.setValueAtTime(vol,at);g.gain.exponentialRampToValueAtTime(.0001,at+.24);o.connect(g);g.connect(bus);o.start(at);o.stop(at+.27);}
  // a struck bell for the music box: the note with a quiet, slightly sharp overtone
  function bell(c,f,at,vol){tone(c,{wave:"sine",f,at,len:.1,vol,to:[bus,echo],atk:.004,decay:1.3});tone(c,{wave:"sine",f:f*4.01,at,len:.1,vol:vol*.18,to:[bus],atk:.002,decay:.35});}

  function playHome(c,b,at,E,song){const [root,tri]=CH[b.c],bar=E*8,quiet=calm&&song===HOME;
    for(const k of tri)tone(c,{wave:"sine",f:hz(root+12+k),at,len:bar*.98,vol:.022,to:[bus],atk:.8});
    [0,1,2,1,0,1,2,1].forEach((k,i)=>(!quiet||i%2===0)&&tone(c,{wave:"triangle",f:hz(root+12+tri[k]+(i===2||i===6?12:0)),at:at+i*E,len:E*.9,vol:b.intro?.05:.035,to:[bus],atk:.02}));
    if(b.intro)tone(c,{wave:"triangle",f:hz(root),at,len:bar*.98,vol:.2,to:[bus],atk:.1});
    else{tone(c,{wave:"triangle",f:hz(root),at,len:E*6*.97,vol:.2,to:[bus],atk:.05});tone(c,{wave:"triangle",f:hz(root+7),at:at+E*6,len:E*2*.95,vol:.17,to:[bus],atk:.05});}
    if(quiet||!b.mel)return;
    let pos=0;for(const [m,l] of b.mel){if(m)tone(c,{wave:mellow,f:hz(m),at:at+pos*E,len:l*E*.97,vol:song.bright?.12:.1,to:[bus,echo],vib:true,atk:.04});pos+=l;}
    if(b.shaker)for(let i=1;i<8;i+=2)noise(c,at+i*E,{f:5200,vol:.035,dec:.11});
    if(song.bright&&b===song.loop[0])for(let i=0;i<4;i++)tone(c,{wave:"triangle",f:hz([62,66,69,74][i]+12),at:at+i*E*.5,len:E*.6,vol:.05,to:[bus,echo],atk:.01});}

  function playWall(c,b,at,E){const [root,tri]=CH[b.c],bar=E*8,L=level;
    // pad, held low under everything
    for(const k of tri)tone(c,{wave:"sine",f:hz(root+12+k),at,len:bar*.98,vol:.016,to:[bus],atk:.6});
    // the pluck: chord tones in eighths, root–fifth–octave–third, struck and decaying (sixteenths on the summit push)
    const pat=[0,2,12,1,2,0,12,2],sub=L>=2&&!b.intro?2:1;
    for(let i=0;i<8*sub;i++){const k=pat[Math.floor(i/sub)%8],n=root+12+(k===12?12:tri[k]);
      tone(c,{wave:"triangle",f:hz(n+(i%sub?12:0)),at:at+i*E/sub,len:.1,vol:(i%sub?.018:.04)*(b.intro?.8:1),to:[bus],atk:.004,decay:.32});}
    // bass on the beats: the root, then the fifth on beat three
    for(const [q,iv] of [[0,0],[2,0],[4,7],[6,0]])tone(c,{wave:"triangle",f:hz(root+iv),at:at+q*E,len:E*1.8,vol:.15,to:[bus],atk:.02});
    if(b.intro)return;
    // stage two on: a soft kick on one and three and a shaker on the off-beats
    if(L>=1){kick(c,at,.22);kick(c,at+4*E,.18);for(let i=1;i<8;i+=2)noise(c,at+i*E,{f:6000,vol:.022,dec:.07});}
    // the summit push: a high motif on alternate bars, through the echo
    if(L>=2&&b.mel){let pos=0;for(const [m,l] of b.mel){if(m)tone(c,{wave:mellow,f:hz(m),at:at+pos*E,len:l*E*.95,vol:.06,to:[bus,echo],vib:true,atk:.04});pos+=l;}}
    // the last seconds of a question: a ticking hat on every sixteenth and a low pulse on the beats
    if(tension){for(let i=0;i<16;i++)noise(c,at+i*E/2,{f:8000,type:"highpass",q:.7,vol:i%4===0?.03:.016,dec:.03});
      for(let q=0;q<8;q+=2)tone(c,{wave:"sine",f:hz(root-12),at:at+q*E,len:E*.6,vol:.12,to:[bus],atk:.01,decay:.3});}}

  function playCamp(c,b,at,E){const [root,tri]=CH[b.c],bar=E*8;
    for(const k of tri)tone(c,{wave:"sine",f:hz(root+12+k),at,len:bar*.99,vol:.02,to:[bus],atk:1.2});
    tone(c,{wave:"triangle",f:hz(root),at,len:bar*.96,vol:.12,to:[bus],atk:.4});
    if(b.intro)return;
    let pos=0;for(const [m,l] of b.mel){if(m)bell(c,hz(m),at+pos*E,.06);pos+=l;}
    // crickets: a few soft chirps somewhere in each bar
    for(let i=0;i<3;i++){const t=at+Math.random()*bar,f=4300+Math.random()*500;for(let j=0;j<3;j++)tone(c,{wave:"sine",f,at:t+j*.045,len:.02,vol:.006,to:[bus],atk:.003,decay:.03});}}

  function pump(){
    const c=SND.ctx;if(!c||!cur)return;
    if(t0<c.currentTime-.05)t0=c.currentTime+.05; // (after the tab slept, pick up just ahead of now)
    while(t0<c.currentTime+.6){const list=intro&&cur.intro.length?cur.intro:cur.loop,b=list[bar%list.length],e=E();cur.play(c,b,t0,e,cur);t0+=e*8;
      if(++bar>=list.length){bar=0;intro=false;}}}
  function fade(g,to,s){const c=SND.ctx,now=c.currentTime;g.gain.cancelScheduledValues(now);g.gain.setValueAtTime(g.gain.value,now);g.gain.linearRampToValueAtTime(to,now+s);}
  function begin(song){const c=SND.ctx;
    // the old piece fades out on its own chain while the new one fades in on a fresh one
    if(bus){const old=bus;fade(old,0,1.6);setTimeout(()=>{try{old.disconnect();}catch(e){}},2200);}
    cur=song;const ch=chain(c,song);bus=ch.b;echo=ch.e;lp=ch.f;bar=0;intro=true;t0=c.currentTime+.15;fade(bus,gainOf(),song===cur&&song.intro.length?2.5:1.4);
    if(!timer)timer=setInterval(pump,100);pump();}
  function stop(){if(!cur)return;clearInterval(timer);timer=null;const old=bus;if(old&&SND.ctx){fade(old,0,1.5);setTimeout(()=>{try{old.disconnect();}catch(e){}},2000);}
    bus=null;cur=null;}
  function sync(){const ready=want&&on&&SND.on&&SND.ctx&&SND.ctx.state==="running";
    if(!ready){if(!want||!on||!SND.on)stop();return;}
    if(cur!==next)begin(next);else if(bus)fade(bus,gainOf(),2);}
  // the game says which piece belongs on screen: home, map (the home tune's quiet bed), climb, camp or summit
  function mode(m){calm=m==="map";next=m==="climb"?WALL:m==="camp"?CAMP:m==="summit"?SUMMIT:HOME;}
  addEventListener("pointerdown",()=>setTimeout(sync,60),{passive:true});
  setInterval(()=>{if(want&&(!cur||cur!==next))sync();},1000); // e.g. sound switched back on from the bar
  return {want(v,m){want=!!v;if(m)mode(m);sync();},sync,get playing(){return !!cur;},get piece(){return cur&&cur.name;},
    // (how far up the route the team is, 0 to 2, and whether a question's clock is about to run out)
    level(n){level=Math.max(0,Math.min(2,n|0));},tension(v){tension=!!v;},
    get on(){return on;},toggle(){on=!on;LS.set("music",on);sync();}};
})();
