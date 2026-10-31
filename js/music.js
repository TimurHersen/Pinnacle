/* ---------- the home screen's theme: an original tune, played live through the sound engine (audio.js) ----------
   "Base Camp" in D major at a calm 84 BPM: a four-bar dawn intro (pad, arpeggio and bass alone), then a 16-bar loop.
   Section A states the climbing motif over D–Bm–G–A, section B reaches up to the high B (the summit note) over
   G–A–F#m–Bm and turns back home on A. Soft, rounded voices rather than buzzy chip squares: a mellow lead with an
   echo, a slow triangle arpeggio, a sine chord pad, a long-note bass and, in section B only, a quiet shaker. Everything
   passes a low-pass filter to take the edge off. Notes are scheduled a moment ahead on the audio clock. */
const MUSIC=(()=>{
  const BPM=84,E=60/BPM/2; // one eighth note, in seconds
  // chords: bass root (MIDI) and triad; the arpeggio and the pad play the triad an octave above the bass
  const CH={D:[50,[0,4,7]],Bm:[47,[0,3,7]],G:[43,[0,4,7]],A:[45,[0,4,7]],"F#m":[42,[0,3,7]],Em:[40,[0,3,7]]};
  // melody bars: [MIDI note or 0 for a rest, length in eighths], eight eighths a bar
  const A=[[[69,2],[74,2],[76,1],[78,3]],[[78,2],[76,1],[74,1],[71,4]],[[67,1],[71,1],[74,2],[76,2],[74,2]],[[73,2],[74,1],[76,1],[69,4]],
           [[69,2],[74,2],[76,1],[78,3]],[[81,2],[78,1],[76,1],[73,4]],[[71,1],[74,1],[79,2],[78,2],[76,2]],[[76,2],[73,2],[69,2],[0,2]]];
  const B=[[[74,3],[79,3],[78,2]],[[76,3],[81,3],[79,2]],[[78,3],[73,3],[69,2]],[[71,2],[74,2],[78,2],[83,2]],
           [[79,3],[76,3],[71,2]],[[73,2],[76,2],[81,4]],[[78,2],[76,1],[78,1],[74,4]],[[0,2],[69,1],[71,1],[73,2],[76,2]]];
  const INTRO=["D","G","Bm","A"].map(c=>({c,mel:[[0,8]],shaker:0,intro:1}));
  const LOOP=[...["D","Bm","G","A","D","F#m","G","A"].map((c,i)=>({c,mel:A[i],shaker:0})),
              ...["G","A","F#m","Bm","Em","A","D","A"].map((c,i)=>({c,mel:B[i],shaker:1}))];
  const hz=m=>440*Math.pow(2,(m-69)/12);
  let bus=null,echo=null,mellow=null,timer=null,want=false,playing=false,bar=0,t0=0,intro=true;

  // a mellow wave: a sine with a little of its next few harmonics, rounder than a square, warmer than a pure sine
  function soft(c){const re=new Float32Array([0,0,0,0,0,0]),im=new Float32Array([0,1,.22,.1,.04,.02]);return c.createPeriodicWave(re,im);}
  function setup(c){
    if(bus)return;bus=c.createGain();bus.gain.value=0;
    const lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=2400;lp.Q.value=.5;bus.connect(lp);lp.connect(SND.out);
    // a long, soft echo on the lead, as if the tune drifted across the valley
    echo=c.createDelay(2);echo.delayTime.value=E*3;const fb=c.createGain();fb.gain.value=.38;const wet=c.createGain();wet.gain.value=.4;
    const dull=c.createBiquadFilter();dull.type="lowpass";dull.frequency.value=1600;
    echo.connect(dull);dull.connect(fb);fb.connect(echo);dull.connect(wet);wet.connect(bus);
    mellow=soft(c);}
  // one note: a gentle swell in (atk), a slow fall away at the end
  function tone(c,{wave,f,at,len,vol,to,vib,atk=.03}){
    const o=c.createOscillator(),g=c.createGain();if(typeof wave==="string")o.type=wave;else o.setPeriodicWave(wave);
    o.frequency.setValueAtTime(f,at);
    if(vib&&len>.6){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=4.5;lg.gain.setValueAtTime(0,at);lg.gain.linearRampToValueAtTime(f*.005,at+.5);
      l.connect(lg);lg.connect(o.frequency);l.start(at);l.stop(at+len+.3);}
    const a=Math.min(atk,len*.4);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+a);g.gain.linearRampToValueAtTime(vol*.7,at+a+Math.min(.25,len*.4));
    g.gain.setValueAtTime(vol*.7,at+len*.8);g.gain.linearRampToValueAtTime(0,at+len+.12);
    o.connect(g);for(const d of to)g.connect(d);o.start(at);o.stop(at+len+.15);}
  function shaker(c,at,vol){const s=c.createBufferSource(),b=c.createBiquadFilter(),g=c.createGain();s.buffer=SND.noise;b.type="bandpass";b.frequency.value=5200;b.Q.value=.9;
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+.11);s.connect(b);b.connect(g);g.connect(bus);s.start(at,Math.random());s.stop(at+.14);}

  // one bar of every voice, starting at time `at`
  function playBar(c,b,at){
    const [root,tri]=CH[b.c],bar=E*8;
    // pad: the chord held through the bar, swelling in slowly
    for(const k of tri)tone(c,{wave:"sine",f:hz(root+12+k),at,len:bar*.98,vol:.022,to:[bus],atk:.8});
    // arpeggio: chord tones in eighths, up and back
    [0,1,2,1,0,1,2,1].forEach((k,i)=>tone(c,{wave:"triangle",f:hz(root+12+tri[k]+(i===2||i===6?12:0)),at:at+i*E,len:E*.9,vol:b.intro?.05:.035,to:[bus],atk:.02}));
    // bass: one long root, stepping to the fifth for the last beat
    if(b.intro)tone(c,{wave:"triangle",f:hz(root),at,len:bar*.98,vol:.2,to:[bus],atk:.1});
    else{tone(c,{wave:"triangle",f:hz(root),at,len:E*6*.97,vol:.2,to:[bus],atk:.05});tone(c,{wave:"triangle",f:hz(root+7),at:at+E*6,len:E*2*.95,vol:.17,to:[bus],atk:.05});}
    // lead
    let pos=0;for(const [m,l] of b.mel){if(m)tone(c,{wave:mellow,f:hz(m),at:at+pos*E,len:l*E*.97,vol:.1,to:[bus,echo],vib:true,atk:.04});pos+=l;}
    // a quiet shaker on the off-beats while the tune climbs toward the top
    if(b.shaker)for(let i=1;i<8;i+=2)shaker(c,at+i*E,.035);
  }
  function pump(){
    const c=SND.ctx;if(!c||!playing)return;
    // after the tab was asleep, pick up again just ahead of now rather than racing through the missed bars
    if(t0<c.currentTime-.05){t0=c.currentTime+.05;}
    while(t0<c.currentTime+.6){const list=intro?INTRO:LOOP,b=list[bar];playBar(c,b,t0);t0+=E*8;
      if(++bar>=list.length){bar=0;intro=false;}}
  }
  function start(){const c=SND.ctx;if(!c||playing||c.state!=="running")return;setup(c);
    playing=true;bar=0;intro=true;t0=c.currentTime+.1;
    bus.gain.cancelScheduledValues(c.currentTime);bus.gain.setValueAtTime(bus.gain.value,c.currentTime);bus.gain.linearRampToValueAtTime(.8,c.currentTime+2.5);
    pump();timer=setInterval(pump,100);}
  function stop(){const c=SND.ctx;if(!playing||!c)return;playing=false;clearInterval(timer);
    const now=c.currentTime;bus.gain.cancelScheduledValues(now);bus.gain.setValueAtTime(bus.gain.value,now);bus.gain.linearRampToValueAtTime(0,now+1.5);
    // notes already queued fade out with the bus; a fresh bus next time keeps them from bleeding into a restart
    const old=bus;setTimeout(()=>{try{old.disconnect();}catch(e){}},2000);bus=null;}
  // the game says when the theme belongs on screen; it starts as soon as sound can play (after the first tap)
  function sync(){if(want&&SND.on&&SND.ctx&&SND.ctx.state==="running")start();else if(!want)stop();}
  addEventListener("pointerdown",()=>setTimeout(sync,60),{passive:true});
  setInterval(()=>{if(want&&!playing)sync();},1000); // e.g. sound switched back on from the bar
  return {want(v){want=!!v;sync();},sync,get playing(){return playing;}};
})();
