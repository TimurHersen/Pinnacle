/* ---------- sound: synthesised on the fly (no files), started by the first tap ---------- */
const SND={ctx:null,out:null,noise:null,on:LS.get("sound",true),last:{}};
function sndStart(){if(SND.ctx||!SND.on)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{const c=SND.ctx=new AC(),o=SND.out=c.createGain();o.gain.value=.55;o.connect(c.destination);
    const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;SND.noise=nb;
    // wind off the valley: looping band-passed noise with a slow swell
    const src=c.createBufferSource(),bp=c.createBiquadFilter(),wg=c.createGain(),lfo=c.createOscillator(),lg=c.createGain();
    src.buffer=nb;src.loop=true;bp.type="bandpass";bp.frequency.value=420;bp.Q.value=.6;wg.gain.value=.05;lfo.frequency.value=.13;lg.gain.value=.035;
    lfo.connect(lg);lg.connect(wg.gain);src.connect(bp);bp.connect(wg);wg.connect(o);src.start();lfo.start();}catch(e){SND.ctx=null;}}
addEventListener("pointerdown",()=>{sndStart();if(SND.ctx&&SND.ctx.state==="suspended")SND.ctx.resume();},{passive:true});
function sfx(kind){const c=SND.ctx;if(!c||!SND.on||c.state!=="running")return;const now=c.currentTime;
  if(SND.last[kind]&&now-SND.last[kind]<.05)return;SND.last[kind]=now;
  const osc=(type,f,f2,v,a,d,at=0)=>{const o=c.createOscillator(),gn=c.createGain();o.type=type;o.frequency.setValueAtTime(f,now+at);if(f2)o.frequency.exponentialRampToValueAtTime(f2,now+at+a+d);
    gn.gain.setValueAtTime(0,now+at);gn.gain.linearRampToValueAtTime(v,now+at+a);gn.gain.exponentialRampToValueAtTime(.0001,now+at+a+d);o.connect(gn);gn.connect(SND.out);o.start(now+at);o.stop(now+at+a+d+.05);};
  const hiss=(f,q,v,d,at=0)=>{const s=c.createBufferSource(),b=c.createBiquadFilter(),gn=c.createGain();s.buffer=SND.noise;b.type="bandpass";b.frequency.value=f;b.Q.value=q;
    gn.gain.setValueAtTime(v,now+at);gn.gain.exponentialRampToValueAtTime(.0001,now+at+d);s.connect(b);b.connect(gn);gn.connect(SND.out);s.start(now+at,Math.random());s.stop(now+at+d+.05);};
  if(kind==="grab"){hiss(1600,1.5,.2,.05);osc("sine",170+Math.random()*50,110,.1,.003,.08);}
  else if(kind==="chalk")hiss(3200,.8,.05,.18);
  else if(kind==="hup"){osc("square",330,560,.045,.01,.13);hiss(900,1,.06,.1);}
  else if(kind==="whistle")osc("sine",1150,240,.08,.02,.75);
  else if(kind==="boing"){osc("triangle",190,85,.26,.005,.5);osc("sine",380,170,.07,.005,.32);}
  else if(kind==="thud"){osc("sine",130,60,.22,.005,.18);hiss(500,1,.1,.08);}
  else if(kind==="crackle")hiss(2200+Math.random()*1800,4,.04+Math.random()*.05,.03);
  else if(kind==="pop")osc("sine",520,940,.06,.005,.1);
  else if(kind==="tug"){osc("triangle",260,170,.13,.004,.14);hiss(1300,2,.07,.06);} // a message arrives on the rope radio
  else if(kind==="restock"){[660,880,1100].forEach((f,i)=>osc("triangle",f,0,.08,.005,.12,i*.07));hiss(4200,3,.06,.12,.05);}
  else if(kind==="fanfare"||kind==="summit"){const n=kind==="summit"?[523,659,784,1047,880,1047,1319]:[392,494,587,784];
    n.forEach((f,i)=>{osc("square",f,0,.045,.01,.15,i*.11);osc("triangle",f/2,0,.09,.01,.2,i*.11);});osc("triangle",n[n.length-1]/4,0,.12,.02,.6,n.length*.11);}}
