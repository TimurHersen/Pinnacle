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
