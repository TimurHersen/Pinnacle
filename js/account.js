"use strict";
/* ============================== ACCOUNTS ==============================
   Optional accounts, through Firebase Authentication: sign up or in with an email and password, or with Google.
   Everyone is signed in to Firebase from the start, as an anonymous guest, so the database can tell real players
   from anything else; creating an account turns that guest into a named one and keeps everything it had.

   A player's identity in the game stays their player id (S.uid, kept on the device). An account remembers it at
   users/<account id>: {pid, name, teams}. Signing in on another device takes up that player id and those rope teams,
   so every team, map, star and record follows the account. Signing out goes back to a fresh guest on this device.

   Until FIREBASE_WEB is filled in (Firebase console, Project settings, Your apps, Web app config), or if the sign-in
   service can't be reached, the game simply runs as before, with no sign-in and no token on its requests. */
const FIREBASE_WEB={
  apiKey:"AIzaSyAdM4N-9OB4OqKz63NbtPnmro7kwP7VzDI",   // (a web app's key is public by design; access is governed by the rules)
  authDomain:"pinnacle-5f36a.firebaseapp.com",
  databaseURL:"https://pinnacle-5f36a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:"pinnacle-5f36a",
  storageBucket:"pinnacle-5f36a.firebasestorage.app",
  messagingSenderId:"454707911322",
  appId:"1:454707911322:web:55ca94eabc516fbed49d23"
};
const ACCT={on:false,auth:null,user:null,token:null,ready:false,waiters:[]};
const SDK="https://www.gstatic.com/firebasejs/10.12.2/";
function acctScript(src){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s);});}
// (a request waits for the first sign-in, at most a couple of seconds, so even the very first one carries a token)
function acctReady(){if(ACCT.ready||!ACCT.on)return Promise.resolve();return new Promise(r=>{ACCT.waiters.push(r);setTimeout(r,2500);});}
async function acctStart(){
  if(window.TEST||!FIREBASE_WEB.apiKey){ACCT.ready=true;return;}
  try{await acctScript(SDK+"firebase-app-compat.js");await acctScript(SDK+"firebase-auth-compat.js");}
  catch(e){ACCT.ready=true;return;}
  ACCT.on=true;firebase.initializeApp(FIREBASE_WEB);const A=ACCT.auth=firebase.auth();
  A.getRedirectResult().catch(e=>acctError(e));
  A.onIdTokenChanged(async u=>{ACCT.user=u;ACCT.token=u?await u.getIdToken():null;
    if(!u){A.signInAnonymously().catch(()=>{ACCT.ready=true;ACCT.waiters.splice(0).forEach(r=>r());});return;}
    if(!ACCT.ready){ACCT.ready=true;ACCT.waiters.splice(0).forEach(r=>r());}
    if(!u.isAnonymous)await acctAdopt(u);
    acctRender();});
}
const acctNamed=()=>!!(ACCT.user&&!ACCT.user.isAnonymous);
// signed in with an account: take up the player id it remembers (or give it this device's), and merge the teams
async function acctAdopt(u){
  if(ACCT.adopted===u.uid)return;ACCT.adopted=u.uid;
  try{const p=await fb.get("users/"+u.uid);
    if(p&&p.pid&&p.pid!==S.uid){const was=S.code;if(was)closeTeam();S.uid=p.pid;LS.set("pid",p.pid);if(was)openTeam(was);}
    const teams=[...(S.myTeams||[]),...Object.values(p?.teams||{})].filter((x,i,a)=>x&&x.code&&a.findIndex(y=>y.code===x.code)===i).slice(0,12);
    S.myTeams=teams;LS.set("teams",teams);
    const name=p?.name||S.myName||(u.displayName||"").split(" ")[0].slice(0,24);if(name&&!S.myName){S.myName=name;LS.set("name",name);}
    await fb.put("users/"+u.uid,{pid:S.uid,name:S.myName||name||"",teams,email:u.email||"",since:p?.since||Date.now()});
    if(typeof profSync==="function")await profSync(u.uid);
    if(!S.code&&document.body.classList.contains("home"))renderLobby();
  }catch(e){}}
// (the account's copy of the team list, kept up to date as teams are made, joined or opened)
function acctSaveTeams(){if(!acctNamed())return;fb.patch("users/"+ACCT.user.uid,{teams:S.myTeams,name:S.myName||"",pid:S.uid}).catch(()=>{});}
const ACCT_ERR={"auth/invalid-email":"That email address doesn't look right.","auth/missing-password":"Add a password.",
  "auth/weak-password":"Use a password of at least 6 characters.","auth/email-already-in-use":"There's already an account with that email. Sign in instead.",
  "auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"No account with that email. Create one instead.",
  "auth/too-many-requests":"Too many tries. Wait a minute and try again.","auth/popup-closed-by-user":"","auth/cancelled-popup-request":"",
  "auth/credential-already-in-use":"That Google account already has a Pinnacle account. Signing in to it instead…","auth/network-request-failed":"Couldn't reach the sign-in service. Check your connection."};
function acctError(e){const m=ACCT_ERR[e&&e.code];const el=$("#acctErr");if(m===""||!e)return;if(el)el.textContent=m||"Something went wrong. Try again.";}
// signing up turns the guest into the account (so it keeps this device's player id); signing in uses the account's
async function acctEmail(mode){const em=($("#acctEmail")?.value||"").trim(),pw=$("#acctPw")?.value||"",A=ACCT.auth;if(!A)return;$("#acctErr").textContent="";
  try{if(mode==="up"){const cred=firebase.auth.EmailAuthProvider.credential(em,pw);
      if(A.currentUser&&A.currentUser.isAnonymous)await A.currentUser.linkWithCredential(cred);else await A.createUserWithEmailAndPassword(em,pw);}
    else await A.signInWithEmailAndPassword(em,pw);
    toast(mode==="up"?"Account created. Your progress is saved to it.":"Signed in");}
  catch(e){acctError(e);}}
async function acctGoogle(){const A=ACCT.auth;if(!A)return;$("#acctErr").textContent="";const P=new firebase.auth.GoogleAuthProvider();
  const narrow=matchMedia("(pointer:coarse)").matches; // (phones: a redirect, which popups often can't)
  try{if(A.currentUser&&A.currentUser.isAnonymous){
      try{narrow?await A.currentUser.linkWithRedirect(P):await A.currentUser.linkWithPopup(P);}
      catch(e){if(e.code==="auth/credential-already-in-use"&&e.credential)await A.signInWithCredential(e.credential);else throw e;}}
    else narrow?await A.signInWithRedirect(P):await A.signInWithPopup(P);
    toast("Signed in with Google");}
  catch(e){acctError(e);}}
async function acctReset(){const em=($("#acctEmail")?.value||"").trim();$("#acctErr").textContent="";
  if(!em){$("#acctErr").textContent="Type your email above first.";return;}
  try{await ACCT.auth.sendPasswordResetEmail(em);toast("Check your email for a link to set a new password");}catch(e){acctError(e);}}
async function acctSignOut(){if(!ACCT.auth)return;if(S.code)goLobby();
  // (back to a fresh guest on this device: the account keeps the progress)
  const a="abcdefghijkmnpqrstuvwxyz23456789";S.uid=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>a[b%32]).join("");LS.set("pid",S.uid);
  S.myTeams=[];LS.set("teams",[]);ACCT.adopted=null;await ACCT.auth.signOut();toast("Signed out");renderLobby();}
// the account card on the title screen
function acctHtml(){
  if(!ACCT.on)return `<p class="note">Accounts aren't switched on yet.</p>`;
  if(acctNamed()){const u=ACCT.user;return `<p class="note">Signed in as <strong>${esc(u.email||u.displayName||"you")}</strong>. Your rope teams, maps and stars are saved to your account and follow you to any device.</p>
    <button class="btn ghost" id="acctOut">Sign out</button>`;}
  return `<p class="note">Playing as a guest. Sign in to save your teams, maps and stars, and pick up on any device.</p>
    <button class="btn google" id="acctG"><span class="gmark" aria-hidden="true">G</span> Continue with Google</button>
    <div class="or"><span>or with email</span></div>
    <input type="email" id="acctEmail" placeholder="Email" autocomplete="email">
    <input type="password" id="acctPw" placeholder="Password (6+ characters)" autocomplete="current-password">
    <div class="row"><button class="btn rope" id="acctIn">Sign in</button><button class="btn" id="acctUp">Create account</button></div>
    <button class="linkbtn" id="acctReset" type="button">Forgot password?</button>
    <div class="err" id="acctErr"></div>`;}
function acctRender(){const el=$("#acctBody");if(el){el.innerHTML=acctHtml();acctWire();}
  const b=document.querySelector('.pbtn[data-id="secAcct"]');if(b)b.classList.toggle("signed",acctNamed());}
function acctWire(){$("#acctG")&&($("#acctG").onclick=acctGoogle);$("#acctIn")&&($("#acctIn").onclick=()=>acctEmail("in"));
  $("#acctUp")&&($("#acctUp").onclick=()=>acctEmail("up"));$("#acctReset")&&($("#acctReset").onclick=acctReset);$("#acctOut")&&($("#acctOut").onclick=acctSignOut);
  $("#acctPw")&&($("#acctPw").onkeydown=e=>{if(e.key==="Enter")acctEmail("in");});}
acctStart();
