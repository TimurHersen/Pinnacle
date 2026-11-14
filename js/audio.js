/* ---------- sound: synthesised on the fly (no files), started by the first tap ---------- */
const SND={ctx:null,out:null,noise:null,on:LS.get("sound",true),last:{}};
function sndStart(){if(SND.ctx||!SND.on)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{const c=SND.ctx=new AC(),o=SND.out=c.createGain();o.gain.value=.55;o.connect(c.destination);
    const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noise=nb;
    // wind off the valley: looping band-passed noise with a slow swell
    const src=c.createBufferSource(),bp=c.createBiquadFilter(),wg=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
    src.buffer=nb;src.loop=true;bp.type="bandpass";bp.frequency.value=420;bp.Q.value=.6;wg.gain.value=.05;lfo.frequency.value=.13;lg.gain.value=.035;
    lfo.connect(lg);lg.connect(wg.gain);src.connect(bp);bp.connect(wg);wg.connect(o);src.start();lfo.start();SND.wind={bp,wg,lg};}catch(e){SND.ctx=null;}}
// the wind grows with height: louder, higher and gustier toward the summit (u: 0 at the meadow, 1 at the top); at
// a camp it drops to a light breeze
function windAt(u,camp){const w=SND.wind,c=SND.ctx;if(!w||!c)return;const k=Math.max(0,Math.min(1,u)),t=c.currentTime;
  const v=camp?.03:.045+k*.07,f=380+k*520,g=camp?.02:.03+k*.05;
  if(Math.abs((w.v||0)-v)<.002&&Math.abs((w.f||0)-f)<8)return;w.v=v;w.f=f;
  w.wg.gain.setTargetAtTime(v,t,1.5);w.bp.frequency.setTargetAtTime(f,t,1.5);w.lg.gain.setTargetAtTime(g,t,1.5);}
addEventListener("pointerdown",()=>{sndStart();if(SND.ctx&&SND.ctx.state==="suspended")SND.ctx.resume();},{passive:true});
function sfx(kind){const c=SND.ctx;if(!c||!SND.on||c.state!=="running")return;const now=c.currentTime;
  if(SND.last[kind]&&now-SND.last[kind]<(kind==="step"?.12:.05))return;SND.last[kind]=now;
  const osc=(type,f,f2,v,a,d,at=0)=>{const o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.setValueAtTime(f,now+at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,now+at+a+d);
    gn.gain.setValueAtTime(0,now+at);gn.gain.linearRampToValueAtTime(v,now+at+a);gn.gain.exponentialRampToValueAtTime(.0001,now+at+a+d);o.connect(gn);gn.connect(SND.out);o.start(now+at);o.stop(now+at+a+d+.05);};
  const hiss=(f,q,v,d,at=0)=>{const s=c.createBufferSource(),b=c.createBiquadFilter(),gn=c.createGain();s.buffer=SND.noise;b.type="bandpass";b.frequency.value=f;b.Q.value=q;
    gn.gain.setValueAtTime(v,now+at);gn.gain.exponentialRampToValueAtTime(.0001,now+at+d);s.connect(b);b.connect(gn);gn.connect(SND.out);s.start(now+at,Math.random());s.stop(now+at+d+.05);};
  const rnd=(a,b)=>a+Math.random()*(b-a);
  // (a hiss whose band sweeps from f to f2: a scrape, a whoosh)
  const sweep=(f,f2,q,v,d,at=0)=>{const s=c.createBufferSource(),b=c.createBiquadFilter(),gn=c.createGain();s.buffer=SND.noise;b.type="bandpass";b.Q.value=q;
    b.frequency.setValueAtTime(f,now+at);b.frequency.exponentialRampToValueAtTime(f2,now+at+d);
    gn.gain.setValueAtTime(0,now+at);gn.gain.linearRampToValueAtTime(v,now+at+d*.25);gn.gain.exponentialRampToValueAtTime(.0001,now+at+d);
    s.connect(b);b.connect(gn);gn.connect(SND.out);s.start(now+at,Math.random());s.stop(now+at+d+.05);};
  if(kind==="grab"){hiss(1600,1.5,.2,.05);osc("sine",170+Math.random()*50,110,.1,.003,.08);}
  // a footstep: on grass and grit, a soft low thump and a short scuff, a little different every time
  else if(kind==="step"){hiss(rnd(500,800),.9,.05,.05);osc("sine",rnd(80,105),55,.06,.004,.05);}
  // a boot finding the rock on the wall
  else if(kind==="scuff")hiss(rnd(1500,2200),1.4,.035,.05);
  // pulling over a ledge's lip: an effort breath, a scrape of boots and clothes over rock, a knee down
  else if(kind==="mantle"){sweep(700,380,.9,.06,.22);sweep(1800,900,1.2,.07,.32,.18);osc("sine",110,70,.08,.004,.09,.42);hiss(600,1,.05,.06,.42);}
  // a hook clipped into the wall: the gate of a carabiner snapping shut on metal, twice
  else if(kind==="clip"){osc("square",2600,2300,.025,.001,.03);hiss(5200,4,.07,.03);osc("triangle",3300,3100,.05,.001,.09,.06);hiss(6400,5,.05,.04,.06);}
  // the rope catching a fall: a deep twang and the thud of the harness taking the weight
  else if(kind==="catch"){osc("sawtooth",98,82,.06,.004,.4);osc("triangle",196,160,.1,.004,.35);osc("sine",90,50,.16,.004,.14);hiss(900,1,.07,.08);}
  // air rushing past in a fall
  else if(kind==="woosh")sweep(500,1600,.6,.11,.55);
  // tent work: a mallet on a peg, and the door's zip
  else if(kind==="hammer"){osc("sine",rnd(330,380),200,.1,.002,.05);hiss(2600,2,.07,.03);}
  else if(kind==="zip")for(let i=0;i<7;i++)hiss(2600+i*260,2.5,.035,.025,i*.032);
  // an answer locked in: two soft wooden knocks
  else if(kind==="lock"){osc("triangle",540,480,.09,.002,.07);osc("triangle",810,760,.08,.002,.11,.07);}
  else if(kind==="chalk")hiss(3200,.8,.05,.18);
  else if(kind==="hup"){osc("square",330,560,.045,.01,.13);hiss(900,1,.06,.1);}
  else if(kind==="whistle")osc("sine",1150,240,.08,.02,.75);
  else if(kind==="boing"){osc("triangle",190,85,.26,.005,.5);osc("sine",380,170,.07,.005,.32);}
  else if(kind==="thud"){osc("sine",130,60,.22,.005,.18);hiss(500,1,.1,.08);}
  else if(kind==="crackle")hiss(2200+Math.random()*1800,4,.04+Math.random()*.05,.03);
  else if(kind==="pop")osc("sine",520,940,.06,.005,.1);
  else if(kind==="tick")osc("square",880,0,.03,.002,.05); // a count before the clock starts, and its last seconds
  // the result: two bright notes up for a right answer, a low slide down for a wrong one
  else if(kind==="right"){osc("triangle",660,0,.1,.005,.12);osc("triangle",990,0,.1,.005,.22,.1);osc("sine",1320,0,.04,.005,.3,.1);}
  else if(kind==="wrong"){osc("sawtooth",220,130,.06,.01,.3);osc("triangle",165,98,.12,.01,.38,.04);}
  else if(kind==="tug"){osc("triangle",260,170,.13,.004,.14);hiss(1300,2,.07,.06);} // a message arrives on the rope radio
  else if(kind==="restock"){[660,880,1100].forEach((f,i)=>osc("triangle",f,0,.08,.005,.12,i*.07));hiss(4200,3,.06,.12,.05);}
  else if(kind==="fanfare"||kind==="summit"){const n=kind==="summit"?[523,659,784,1047,880,1047,1319]:[392,494,587,784];
    n.forEach((f,i)=>{osc("square",f,0,.045,.01,.15,i*.11);osc("triangle",f/2,0,.09,.01,.2,i*.11);});osc("triangle",n[n.length-1]/4,0,.12,.02,.6,n.length*.11);}}

/* ---------- haptics: a short buzz under the thumb at the moments that matter (on phones that can; iPhones can't) ----------
   a right answer: one short tap; wrong or a fall: one longer; the rope jerking: a hard double; the last seconds: a
   tick; locking in and choosing: the lightest touch. The big screen never buzzes. Off with the sound. */
const BUZZ={right:[18],wrong:[70],fall:[40,30,90],jerk:[90,40,90],catch:[50],tick:[8],lock:[12],pick:[6],arrive:[25,40,25,40,60]};
function buzz(kind){if(!SND.on||!navigator.vibrate||document.body.classList.contains("tv"))return;
  if(!matchMedia("(pointer:coarse)").matches)return;try{navigator.vibrate(BUZZ[kind]||[10]);}catch(e){}}
