// Loads the game's rule code (js/content.js, js/quiz.js, js/game.js) into a sandbox with just enough of a browser
// stubbed in for the files to run, and hands back the functions the tests need. No dependencies.
const vm=require("vm"),fs=require("fs"),path=require("path");
module.exports=function load(){
  const noop=()=>{},el=()=>null;
  const document={addEventListener:noop,querySelector:el,querySelectorAll:()=>[],visibilityState:"hidden",documentElement:{},body:{classList:{add:noop,remove:noop,toggle:noop,contains:()=>false}}};
  const store=new Map();
  const ctx={console,Math,Date,JSON,setTimeout:noop,clearTimeout:noop,setInterval:noop,clearInterval:noop,document, // (no timers: nothing here waits)
   
    window:{},navigator:{},location:{origin:"",pathname:"/",search:"",hash:""},history:{replaceState:noop},
    localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v))},
    addEventListener:noop,fetch:()=>Promise.reject(new Error("no network in tests")),EventSource:function(){},
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v))}; // (clamp lives in js/scene.js, which draws and isn't loaded here)
  vm.createContext(ctx);
  for(const f of ["content","quiz","game"])vm.runInContext(fs.readFileSync(path.join(__dirname,"..","js",f+".js"),"utf8"),ctx,{filename:f+".js"});
  return vm.runInContext(`({QUIZ,MOUNTAINS,SEG0_TIERS,FORKS,MAX_GAP,S,fixTeam,newExp,lens,total,posOf,capOf,needsChoice,tierAt,
    pickQuiz,applyOutcome,judge,ascentScore,ascentStars,startPitch,memberIds})`,ctx);
};
