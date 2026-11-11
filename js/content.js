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
   Every expedition starts on the map (assets/map.png, a painted view of the whole range), where the team picks one of three mountains. They share the
   route above (three stages, two camps, the same pitches); what changes is how hard it is: the questions are drawn
   a tier easier or harder (tier), each comes with more or less time (secs), the team starts every stage with more
   or fewer hooks (hooks), and the snow line sits lower or higher on the wall (snow). Heights are only shown scaled
   to the mountain's own (alt); the climb is drawn the same size whichever it is. `map` is where the mountain's pin
   stands on the map, in the map picture's own pixels. */
const MOUNTAINS = {
 moss: {id:"moss", name:"Mossback",   diff:1,label:"Easy",  alt:{base:900, top:2300},tier:-1,secs:55,hooks:4,snow:-.3,map:[96,152],
        desc:"A green, rounded hill above the forest. Gentler questions and plenty of time to talk them over."},
 kebne:{id:"kebne",name:"Kebne Wall", diff:2,label:"Medium",alt:{base:1800,top:4100},tier:0, secs:45,hooks:3,snow:0,  map:[238,88],
        desc:"A granite wall with a snowy top. The climb as it was meant: steady, then hard near the summit."},
 frost:{id:"frost",name:"Frostfang",  diff:3,label:"Hard",  alt:{base:3200,top:6900},tier:1, secs:35,hooks:2,snow:.32,map:[410,44],
        desc:"An ice-clad giant. The hardest questions, little time to think and only two hooks a stage."}
};
const MOUNTAIN_ORDER = ["moss","kebne","frost"];
const MAP_CAMP = [106,424]; // the team's camp on the map, where every trail starts
const MAP_W = 512;
