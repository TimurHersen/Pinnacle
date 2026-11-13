// Checks the version numbers in index.html (see the README): node test/versions.js [base]
// With a base commit (CI passes the one before the push, or the pull request's base): when anything in css/ or js/
// changed, window.V must have been raised, and when anything under assets/ changed, window.AV. Always: the loading
// screen's picture is fetched at the same art version as the rest. Exits 1 on a failure. No dependencies.
const {execFileSync}=require("child_process"),fs=require("fs"),path=require("path");
const root=path.join(__dirname,"..");
const git=(...a)=>execFileSync("git",a,{cwd:root,encoding:"utf8"});
const versions=html=>({V:(/window\.V="code=(\d+)"/.exec(html)||[])[1],AV:(/window\.AV="art=(\d+)"/.exec(html)||[])[1],
  boot:(/<div id="boot"[^]*?\?art=(\d+)"/.exec(html)||[])[1]});
let failed=0;const fail=m=>{failed++;console.log("FAIL "+m);},ok=m=>console.log("ok   "+m);

const now=versions(fs.readFileSync(path.join(root,"index.html"),"utf8"));
if(!now.V||!now.AV)fail("index.html sets window.V and window.AV");
if(now.boot===now.AV)ok(`the loading screen's picture is at the art version (art=${now.AV})`);
else fail(`the loading screen's picture is at art=${now.boot}, the rest at art=${now.AV}: make them match`);

const base=process.argv[2];
if(!base||/^0+$/.test(base))console.log("(no base commit given: the version bumps aren't checked)");
else{
  let changed,before;
  try{changed=git("diff","--name-only",base,"HEAD").split("\n").filter(Boolean);before=versions(git("show",`${base}:index.html`));}
  catch(e){console.log(`(can't compare with ${base}: the version bumps aren't checked)`);changed=null;}
  if(changed){
    const code=changed.filter(f=>/^(css|js)\//.test(f)),art=changed.filter(f=>/^assets\//.test(f));
    if(!code.length)ok("nothing in css/ or js/ changed");
    else if(+now.V>+before.V)ok(`css/ or js/ changed and window.V went up (code=${before.V} → ${now.V})`);
    else fail(`css/ or js/ changed (${code.join(", ")}) but window.V in index.html is still code=${now.V}: raise it`);
    if(!art.length)ok("nothing under assets/ changed");
    else if(+now.AV>+before.AV)ok(`assets/ changed and window.AV went up (art=${before.AV} → ${now.AV})`);
    else fail(`assets/ changed (${art.length} file${art.length>1?"s":""}) but window.AV in index.html is still art=${now.AV}: raise it, and the loading screen's picture with it`);
  }
}
console.log(failed?`\n${failed} failed`:"\nall passed");process.exit(failed?1:0);
