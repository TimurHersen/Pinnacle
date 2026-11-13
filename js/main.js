/* ============================== BOOT ============================== */
$("#homeBtn").onclick=()=>S.team?openMenu():goLobby(); // (in a climb: the menu, with the way out in it)
$("#radioBtn").onclick=()=>toggleRadio();
{const fs=$("#fsBtn"),root=document.documentElement; // real fullscreen where the browser allows it
  if(!root.requestFullscreen)fs.hidden=true;
  else{fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():root.requestFullscreen().catch(()=>{});
    document.addEventListener("fullscreenchange",()=>fs.setAttribute("aria-pressed",document.fullscreenElement?"true":"false"));}}
(function boot(){
  // test mode: a fixed test player, straight onto the test rope team
  // (with a big-screen or controller link in the address, test mode tries those instead)
  if(window.TEST&&!/^#(tv|pad)-/.test(location.hash||"")){S.uid=TEST.as;S.myName=TEST.name;document.title=`Pinnacle test · ${TEST.as.toUpperCase()}`;openTeam(TEST.code);return;}
  if(window.TEST){S.uid=TEST.as;S.myName=TEST.name;S.myTeams=[];}else{
  S.uid=LS.get("pid",null);
  if(!S.uid){const a="abcdefghijkmnpqrstuvwxyz23456789";S.uid=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>a[b%32]).join("");LS.set("pid",S.uid);}
  S.myName=LS.get("name","");S.myTeams=LS.get("teams",[]);}
  S.tipsOff=LS.get("tips",false);
  renderLobby();
  // a big screen opened on its link goes straight back to watching; a phone that scanned the screen's code becomes
  // a controller (straight in if it is already on that rope, otherwise after giving a name)
  const tv=/^#tv-([A-Z0-9]{6})$/.exec(location.hash||""),pd=/^#pad-([A-Z0-9]{6})$/.exec(location.hash||"");
  if(tv){openScreen(tv[1]);return;}
  if(pd){S.wantPad=pd[1];fb.get("teams/"+pd[1]).then(v=>{const t=fixTeam(v);
      if(t&&t.members[S.uid])openTeam(pd[1]);else renderLobby({code:pd[1],name:t?t.name:"the big screen",pad:true});})
    .catch(()=>toast("Couldn't reach the mountain. Check your connection."));return;}
  const m=/^#t-([A-Z0-9]{6})$/.exec(location.hash||"");
  if(m)fb.get("teams/"+m[1]).then(v=>{const t=fixTeam(v);
    if(t&&t.members[S.uid])openTeam(m[1]);
    else if(t)renderLobby({code:m[1],name:t.name});
    else toast("That invite link's rope team doesn't exist.");}).catch(()=>toast("Couldn't reach the mountain. Check your connection."));
})();
// the loading screen lifts once the first picture can be shown whole: the title painting with its logo, or (opened
// straight onto a climb) the climb's art; after eight seconds it lifts anyway
{const t0=Date.now(),boot=$("#boot"),ready=()=>{if(document.body.classList.contains("home")){const bg=$("#menubg");return !!(bg&&bg.complete&&bg.naturalWidth&&$("#home .tlogo canvas"));}
    return S.code?artReady():false;};
  const iv=setInterval(()=>{if(!ready()&&Date.now()-t0<8000)return;clearInterval(iv);if(boot){boot.classList.add("out");setTimeout(()=>boot.remove(),400);}},80);}
