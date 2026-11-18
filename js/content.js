/* ============================== THE ROUTE ==============================
   The climb in three stages: base camp to Camp I, on to Camp II, then the summit. Every pitch is one question, and
   each pitch has a difficulty tier (see js/quiz.js). */
// the first stage: five pitches from base camp to Camp I
const SEG0_TIERS = [1,1,2,2,3];
// at each camp the team picks the route on: short and hard, or long and gentler
const FORKS = [
 {camp:"Camp I", next:"Camp II",
  A:{name:"The Icefall",desc:"Direct and steep: five pitches, mostly hard questions.",tiers:[2,3,3,3,4]},
  B:{name:"Shoulder Ridge",desc:"Longer and gentler: seven pitches, mostly easier questions.",tiers:[2,2,2,3,2,3,3]}},
 {camp:"Camp II",next:"the summit",
  A:{name:"Summit Couloir",desc:"Four pitches straight up, every one a summit question.",tiers:[4,4,4,4]},
  B:{name:"North Ridge",desc:"Six pitches along the exposed ridge, hard but fairer.",tiers:[3,3,4,3,4,4]}}
];
const ALT = {base:1800,c1:2600,c2:3400,top:4100};
/* ============================== THE MOUNTAINS ==============================
   The mountains come on maps: three painted regions of six mountains each, played in order. On a map a trail leads
   from the team's camp through four steps: one mountain to start, then a choice of two, then another choice of two,
   then the map's own summit. Climbing any mountain on a step opens the next; climbing the summit completes the map
   (it joins the team's collection) and opens the next map. Any mountain once open can be climbed again.
   Every mountain shares the route above (three stages, two camps, the same pitches); what changes is how hard it is:
   the questions are drawn a tier easier or harder (tier), each comes with more or less time (secs), the team starts
   every stage with more or fewer hooks (hooks), and the snow line sits lower or higher on the wall (snow). Heights are
   only shown scaled to the mountain's own (alt). Difficulty rises along each map and from map to map. */
const MAPS = [
 {id:"green",name:"Greenvale",label:"Easy",blurb:"Forested foothills and green summits: the place to learn the ropes.",
  steps:[["moss"],["fernhill","pineknoll"],["stonehorn","bramble"],["greycrown"]],
  names:{moss:"Mossback",fernhill:"Fernhill",pineknoll:"Pine Knoll",stonehorn:"Stonehorn",bramble:"Bramble Peak",greycrown:"Greycrown"},
  desc:{moss:"A green, rounded hill above the forest. Gentle questions and plenty of time.",fernhill:"A low peak of ferns and slabs, a short step up.",
   pineknoll:"A brown pyramid above the pines.",stonehorn:"A dark horn of rock, steep near the top.",bramble:"A rocky shoulder above the lake.",
   greycrown:"Greenvale's snow-capped crown. Climb it to finish the map."},
  art:{wide:{src:"assets/maps/green-wide.png",w:688,h:384,camp:[230,330],pins:{moss:[102,98],fernhill:[222,98],pineknoll:[343,58],stonehorn:[470,48],bramble:[640,116],greycrown:[588,20]}},
       tall:{src:"assets/maps/green-tall.png",w:384,h:688,camp:[195,646],pins:{moss:[88,502],fernhill:[135,274],pineknoll:[265,499],stonehorn:[72,132],bramble:[292,188],greycrown:[190,56]}}}},
 {id:"frost",name:"Frostreach",label:"Medium",blurb:"Snowfields, frozen lakes and glaciers: less time, harder questions.",
  steps:[["snowcap"],["rimehill","iceblade"],["glacierdome","shardpeak"],["frostfang"]],
  names:{snowcap:"Snowcap",rimehill:"Rimehill",iceblade:"Iceblade",glacierdome:"Glacier Dome",shardpeak:"Shardpeak",frostfang:"Frostfang"},
  desc:{snowcap:"A broad snowy dome above the forest.",rimehill:"A small, frosted peak at the edge of the range.",iceblade:"A sharp ice-clad blade above the lake.",
   glacierdome:"A glacier-wrapped summit; the snow comes down low.",shardpeak:"A shattered ridge of ice and rock.",
   frostfang:"An ice-clad giant. Climb it to finish Frostreach."},
  art:{wide:{src:"assets/maps/frost-wide.png",w:688,h:384,camp:[232,330],pins:{snowcap:[118,98],rimehill:[32,140],iceblade:[342,58],glacierdome:[478,108],shardpeak:[634,124],frostfang:[594,20]}},
       tall:{src:"assets/maps/frost-tall.png",w:384,h:688,camp:[180,628],pins:{snowcap:[54,542],rimehill:[322,542],iceblade:[187,210],glacierdome:[82,150],shardpeak:[302,134],frostfang:[192,20]}}}},
 {id:"ember",name:"Emberlands",label:"Hard",blurb:"Volcanoes, ash and lava: the hardest questions and only two hooks.",
  steps:[["ashcone"],["cinder","smokestack"],["basaltfang","obsidian"],["emberheart"]],
  names:{ashcone:"Ashcone",cinder:"Cinder Cone",smokestack:"Smokestack",basaltfang:"Basalt Fang",obsidian:"Obsidian Spire",emberheart:"Emberheart"},
  desc:{ashcone:"A small, quiet cone on the ash plain.",cinder:"A black cinder cone between the hot springs.",smokestack:"A smoking cone that never quite sleeps.",
   basaltfang:"A jagged tooth of basalt, cracked with glowing seams.",obsidian:"A needle of black glass, the steepest of them all.",
   emberheart:"The great volcano. Climb it to finish the Emberlands."},
  art:{wide:{src:"assets/maps/ember-wide.png",w:688,h:384,camp:[225,330],pins:{ashcone:[55,154],cinder:[148,126],smokestack:[245,94],basaltfang:[375,82],obsidian:[468,42],emberheart:[600,76]}},
       tall:{src:"assets/maps/ember-tall.png",w:384,h:688,camp:[160,640],pins:{ashcone:[85,580],cinder:[215,474],smokestack:[138,380],basaltfang:[95,188],obsidian:[300,244],emberheart:[190,68]}}}}
];
// each mountain's numbers, from how far along the maps it is (d: 0 at the first mountain of the first map, 11 at the last)
const MOUNTAINS = {};
MAPS.forEach((M,mi)=>M.steps.forEach((step,si)=>step.forEach(id=>{const d=mi*4+si;
  MOUNTAINS[id]={id,name:M.names[id],desc:M.desc[id],map:mi,step:si,diff:mi+1,label:M.label,final:si===M.steps.length-1,
    alt:{base:800+d*230,top:Math.round((2100+d*440)/10)*10},tier:[-1,-1,0,0, 0,0,0,1, 1,1,1,1][d],secs:Math.round(58-d*2.2),hooks:d<3?4:d<7?3:2,snow:+(-.3+d*.058).toFixed(2)};})));
const MOUNTAIN_ORDER = MAPS.flatMap(M=>M.steps.flat());
// (teams from before the maps: their mountains under the names they have now)
const OLD_MOUNTAIN = {kebne:"fernhill",frost:"frostfang"};
