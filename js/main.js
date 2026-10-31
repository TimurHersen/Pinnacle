/* ============================== BOOT ============================== */
$("#homeBtn").onclick=goLobby;
{const fs=$("#fsBtn"),root=document.documentElement; // real fullscreen where the browser allows it
  if(!root.requestFullscreen)fs.hidden=true;
  else{fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():root.requestFullscreen().catch(()=>{});
    document.addEventListener("fullscreenchange",()=>fs.setAttribute("aria-pressed",document.fullscreenElement?"true":"false"));}}
(function boot(){
  // test mode: a fixed test player, straight onto the test rope team
  if(window.TEST){S.uid=TEST.as;S.myName=TEST.name;document.title=`Pinnacle test · ${TEST.as.toUpperCase()}`;openTeam(TEST.code);return;}
  S.uid=LS.get("pid",null);
  if(!S.uid){const a="abcdefghijkmnpqrstuvwxyz23456789";S.uid=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>a[b%32]).join("");LS.set("pid",S.uid);}
  S.myName=LS.get("name","");S.myTeams=LS.get("teams",[]);
  renderLobby();
  const m=/^#t-([A-Z0-9]{6})$/.exec(location.hash||"");
  if(m)fb.get("teams/"+m[1]).then(v=>{const t=fixTeam(v);
    if(t&&t.members[S.uid])openTeam(m[1]);
    else if(t)renderLobby({code:m[1],name:t.name});
    else toast("That invite link's rope team doesn't exist.");}).catch(()=>toast("Couldn't reach the mountain. Check your connection."));
})();
