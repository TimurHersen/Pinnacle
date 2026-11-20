/* ============================== THE ROUTE ==============================
   The climb in three stages: base camp to Camp I, on to Camp II, then the summit. Every pitch is one question, and
   each pitch has a difficulty tier (see js/quiz.js). */
// the first stage: five pitches from base camp to Camp I
const SEG0_TIERS = [1,1,2,2,3];
// the way on from each camp: one route per stage, harder the higher it goes (at camp the team only rests and picks
// an extra piece of gear; there is no choice of route)
const FORKS = [
 {camp:"Camp I", next:"Camp II",
  A:{name:"Shoulder Ridge",tiers:[2,2,3,3,3,4]}},
 {camp:"Camp II",next:"the summit",
  A:{name:"Summit Ridge",tiers:[3,4,3,4,4]}}
];
const ALT = {base:1800,c1:2600,c2:3400,top:4100};
/* ============================== THE MOUNTAINS ==============================
   The mountains come on maps: six painted regions of six mountains each, played in order. On a map a trail leads
   from the team's camp through four steps: one mountain to start, then a choice of two, then another choice of two,
   then the map's own summit. Climbing any mountain on a step opens the next; climbing the summit completes the map
   (it joins the team's collection) and opens the next map. Any mountain once open can be climbed again.
   Every mountain shares the route above (three stages, two camps, the same pitches); what changes is how hard it is:
   the questions are drawn a tier easier or harder (tier), each comes with more or less time (secs), the team starts
   every stage with more or fewer hooks (hooks), and the snow line sits lower or higher on the wall (snow). Heights are
   only shown scaled to the mountain's own (alt). Difficulty rises along each map and from map to map. */
const MAPS = [
 {id:"green",theme:"Nature",name:"Greenvale",label:"Easy",blurb:"Forested foothills and green summits: the place to learn the ropes.",
  steps:[["moss"],["fernhill","pineknoll"],["stonehorn","bramble"],["greycrown"]],
  names:{moss:"Mossback",fernhill:"Fernhill",pineknoll:"Pine Knoll",stonehorn:"Stonehorn",bramble:"Bramble Peak",greycrown:"Greycrown"},
  desc:{moss:"A green, rounded hill above the forest. Gentle questions and plenty of time.",fernhill:"A low peak of ferns and slabs, a short step up.",
   pineknoll:"A brown pyramid above the pines.",stonehorn:"A dark horn of rock, steep near the top.",bramble:"A rocky shoulder above the lake.",
   greycrown:"Greenvale's snow-capped crown. Climb it to finish the map."},
  art:{wide:{src:"assets/maps/green-wide.png",w:688,h:384,camp:[230,330],pins:{moss:[102,98],fernhill:[222,98],pineknoll:[343,58],stonehorn:[470,48],bramble:[640,116],greycrown:[588,20]}},
       tall:{src:"assets/maps/green-tall.png",w:384,h:688,camp:[195,646],pins:{moss:[88,502],fernhill:[135,274],pineknoll:[265,499],stonehorn:[72,132],bramble:[292,188],greycrown:[190,56]}}}},
 {id:"jade",theme:"Animals",name:"Jade Peaks",label:"Easy",blurb:"Misty limestone pillars, waterfalls and terraces.",
  steps:[["mistgate"],["bamboo","cranepeak"],["cloudpillar","jadefall"],["jadecrown"]],
  names:{mistgate:"Mistgate",bamboo:"Bamboo Spire",cranepeak:"Crane Peak",cloudpillar:"Cloud Pillar",jadefall:"Jadefall",jadecrown:"Jade Crown"},
  desc:{mistgate:"A green pillar rising out of the morning mist.",bamboo:"A tall spire with bamboo clinging to its ledges.",cranepeak:"A rounded peak where the cranes nest.",
   cloudpillar:"A pillar so tall its top is often in cloud.",jadefall:"A cliff with a waterfall pouring off its edge.",jadecrown:"The great mist-wrapped pillar. Climb it to finish Jade Peaks."},
  art:{wide:{src:"assets/maps/jade-wide.png",w:688,h:384,camp:[236,330],pins:{mistgate:[75,140],bamboo:[155,112],cranepeak:[255,84],jadefall:[355,62],cloudpillar:[465,40],jadecrown:[600,16]}},tall:{src:"assets/maps/jade-tall.png",w:384,h:688,camp:[156,612],pins:{mistgate:[105,240],bamboo:[46,268],cranepeak:[205,215],cloudpillar:[315,192],jadefall:[85,95],jadecrown:[205,35]}}}},
 {id:"canyon",theme:"Geography",name:"Sunstone Canyons",label:"Medium",blurb:"Red rock towers, arches and a river deep below.",
  steps:[["redbutte"],["dustarch","mesatop"],["sunspire","vulturerock"],["sunstone"]],
  names:{redbutte:"Red Butte",dustarch:"Dust Arch",mesatop:"Mesa Top",sunspire:"Sun Spire",vulturerock:"Vulture Rock",sunstone:"Sunstone"},
  desc:{redbutte:"A flat-topped butte at the canyon's mouth.",dustarch:"A tower beside a great stone arch.",mesatop:"A wide mesa above the river.",
   sunspire:"A slender spire that glows at sunset.",vulturerock:"A crooked tower where the vultures circle.",sunstone:"The towering red spire. Climb it to finish the canyons."},
  art:{wide:{src:"assets/maps/canyon-wide.png",w:688,h:384,camp:[232,330],pins:{redbutte:[80,130],dustarch:[100,214],mesatop:[215,112],sunspire:[360,90],vulturerock:[480,68],sunstone:[612,30]}},tall:{src:"assets/maps/canyon-tall.png",w:384,h:688,camp:[205,640],pins:{redbutte:[205,440],dustarch:[130,325],mesatop:[355,290],sunspire:[130,120],vulturerock:[250,210],sunstone:[205,22]}}}},
 {id:"frost",theme:"Weather",name:"Frostreach",label:"Medium",blurb:"Snowfields, frozen lakes and glaciers: less time, harder questions.",
  steps:[["snowcap"],["rimehill","iceblade"],["glacierdome","shardpeak"],["frostfang"]],
  names:{snowcap:"Snowcap",rimehill:"Rimehill",iceblade:"Iceblade",glacierdome:"Glacier Dome",shardpeak:"Shardpeak",frostfang:"Frostfang"},
  desc:{snowcap:"A broad snowy dome above the forest.",rimehill:"A small, frosted peak at the edge of the range.",iceblade:"A sharp ice-clad blade above the lake.",
   glacierdome:"A glacier-wrapped summit; the snow comes down low.",shardpeak:"A shattered ridge of ice and rock.",
   frostfang:"An ice-clad giant. Climb it to finish Frostreach."},
  art:{wide:{src:"assets/maps/frost-wide.png",w:688,h:384,camp:[232,330],pins:{snowcap:[118,98],rimehill:[32,140],iceblade:[342,58],glacierdome:[478,108],shardpeak:[634,124],frostfang:[594,20]}},
       tall:{src:"assets/maps/frost-tall.png",w:384,h:688,camp:[180,628],pins:{snowcap:[54,542],rimehill:[322,542],iceblade:[187,210],glacierdome:[82,150],shardpeak:[302,134],frostfang:[192,20]}}}},
 {id:"ember",theme:"Mountains",name:"Emberlands",label:"Hard",blurb:"Volcanoes, ash and lava: the hardest questions and only two hooks.",
  steps:[["ashcone"],["cinder","smokestack"],["basaltfang","obsidian"],["emberheart"]],
  names:{ashcone:"Ashcone",cinder:"Cinder Cone",smokestack:"Smokestack",basaltfang:"Basalt Fang",obsidian:"Obsidian Spire",emberheart:"Emberheart"},
  desc:{ashcone:"A small, quiet cone on the ash plain.",cinder:"A black cinder cone between the hot springs.",smokestack:"A smoking cone that never quite sleeps.",
   basaltfang:"A jagged tooth of basalt, cracked with glowing seams.",obsidian:"A needle of black glass, the steepest of them all.",
   emberheart:"The great volcano. Climb it to finish the Emberlands."},
  art:{wide:{src:"assets/maps/ember-wide.png",w:688,h:384,camp:[225,330],pins:{ashcone:[55,154],cinder:[148,126],smokestack:[245,94],basaltfang:[375,82],obsidian:[468,42],emberheart:[600,76]}},
       tall:{src:"assets/maps/ember-tall.png",w:384,h:688,camp:[160,640],pins:{ashcone:[85,580],cinder:[215,474],smokestack:[138,380],basaltfang:[95,188],obsidian:[300,244],emberheart:[190,68]}}}},
 {id:"aurora",theme:"",name:"Aurora Reach",label:"Expert",blurb:"Polar night, ice and the northern lights. The last map.",
  steps:[["starfall"],["polarhorn","driftpeak"],["nightglass","icewarden"],["auroraspire"]],
  names:{starfall:"Starfall",polarhorn:"Polar Horn",driftpeak:"Drift Peak",nightglass:"Nightglass",icewarden:"Ice Warden",auroraspire:"Aurora Spire"},
  desc:{starfall:"A snowy peak under the first stars.",polarhorn:"A curved horn of ice.",driftpeak:"A peak buried in wind-blown drifts.",
   nightglass:"A peak of clear blue ice that holds the aurora's light.",icewarden:"A great ice wall that guards the fjord.",auroraspire:"The colossal ice spire under the aurora. The last summit of all."},
  art:{wide:{src:"assets/maps/aurora-wide.png",w:688,h:384,camp:[232,330],pins:{starfall:[115,92],polarhorn:[220,94],driftpeak:[343,50],nightglass:[468,40],icewarden:[660,115],auroraspire:[595,8]}},tall:{src:"assets/maps/aurora-tall.png",w:384,h:688,camp:[90,632],pins:{starfall:[55,520],polarhorn:[210,445],driftpeak:[58,318],nightglass:[240,250],icewarden:[315,196],auroraspire:[190,24]}}}}
];
// each mountain's numbers, from how far along the maps it is (d: 0 at the first mountain of the first map, 11 at the
// last one of the last map, in even steps between)
const MOUNTAINS = {};
MAPS.forEach((M,mi)=>M.steps.forEach((step,si)=>step.forEach(id=>{const d=(mi*4+si)*11/(MAPS.length*4-1);
  MOUNTAINS[id]={id,name:M.names[id],desc:M.desc[id],map:mi,step:si,diff:Math.min(3,1+Math.floor(mi/2)),label:M.label,final:si===M.steps.length-1,
    alt:{base:Math.round((800+d*230)/10)*10,top:Math.round((2100+d*440)/10)*10},tier:d<2.5?-1:d<6.5?0:1,len:mi===0?.55:mi===1?.7:mi===2?.85:1,secs:Math.round(58-d*2.2),hooks:d<2.5?4:d<6.5?3:2,snow:+(-.3+d*.058).toFixed(2)};})));
const MOUNTAIN_ORDER = MAPS.flatMap(M=>M.steps.flat());
// (teams from before the maps: their mountains under the names they have now)
const OLD_MOUNTAIN = {kebne:"fernhill",frost:"frostfang"};
