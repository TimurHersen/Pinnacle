/* ============================== THE QUIZ ==============================
   Each mountain has its own theme. Every question has four options, the first one right (the game shuffles them
   per round), a category, a difficulty tier (1 at the foot of the wall, 3 just below camp) and a hint that only
   the belayer sees when the team spends a route scout. */
const MOUNTAIN = {name:"Kebne Wall",theme:"Nature & geography",stage:"The Approach"};
const QUIZ_SECS = 45; // per question: time to talk it over, but still a little pressure
const QUIZ = [
 // tier 1: warm-up pitches
 {id:"everest",tier:1,cat:"Mountains",q:"What is the highest mountain on Earth?",o:["Mount Everest","K2","Kilimanjaro","Mont Blanc"],hint:"It sits on the border of Nepal and China."},
 {id:"lion",tier:1,cat:"Animals",q:"Which animal is called the 'king of the jungle'?",o:["Lion","Tiger","Gorilla","Elephant"],hint:"Despite the name, it lives on the savanna."},
 {id:"hail",tier:1,cat:"Weather",q:"What do you call balls of ice that fall in a storm?",o:["Hail","Sleet","Snow","Frost"],hint:"It can dent cars in a summer thunderstorm."},
 {id:"sahara",tier:1,cat:"Geography",q:"On which continent is the Sahara Desert?",o:["Africa","Asia","Australia","South America"],hint:"The same continent as Egypt."},
 {id:"co2",tier:1,cat:"Nature",q:"Which gas do plants take from the air to make their food?",o:["Carbon dioxide","Oxygen","Nitrogen","Helium"],hint:"Its formula is CO₂."},
 {id:"pacific",tier:1,cat:"Geography",q:"Which is the largest ocean?",o:["Pacific","Atlantic","Indian","Arctic"],hint:"Its name means 'peaceful'."},
 {id:"joey",tier:1,cat:"Animals",q:"What is a baby kangaroo called?",o:["Joey","Cub","Kid","Calf"],hint:"It's also a nickname for Joseph."},
 {id:"fuji",tier:1,cat:"Mountains",q:"In which country is Mount Fuji?",o:["Japan","China","South Korea","Nepal"],hint:"Its capital is Tokyo."},
 // tier 2: the middle of the wall
 {id:"volga",tier:2,cat:"Geography",q:"What is the longest river in Europe?",o:["Volga","Danube","Rhine","Dnieper"],hint:"It flows through Russia into the Caspian Sea."},
 {id:"urals",tier:2,cat:"Mountains",q:"Which mountain range is the traditional border between Europe and Asia?",o:["Ural Mountains","Alps","Pyrenees","Carpathians"],hint:"It runs north to south through Russia."},
 {id:"humming",tier:2,cat:"Animals",q:"Which bird can fly backwards?",o:["Hummingbird","Swift","Kingfisher","Sparrow"],hint:"It hovers at flowers to drink nectar."},
 {id:"conifer",tier:2,cat:"Nature",q:"Which of these trees is a conifer?",o:["Spruce","Birch","Oak","Maple"],hint:"Christmas trees are often one."},
 {id:"oslo",tier:2,cat:"Geography",q:"What is the capital of Norway?",o:["Oslo","Bergen","Stockholm","Copenhagen"],hint:"It sits at the end of a long fjord."},
 {id:"kebne",tier:2,cat:"Mountains",q:"What is the highest mountain in Sweden?",o:["Kebnekaise","Sarektjåkkå","Helagsfjället","Åreskutan"],hint:"It's in Lapland, not far from Kiruna."},
 {id:"moose",tier:2,cat:"Animals",q:"Which is the largest member of the deer family?",o:["Moose","Reindeer","Red deer","Fallow deer"],hint:"Swedes call it älg."},
 {id:"snowleo",tier:2,cat:"Animals",q:"Which big cat lives high in the mountains of Central Asia?",o:["Snow leopard","Puma","Jaguar","Lynx"],hint:"It wraps its thick tail around itself like a scarf."},
 // tier 3: just below camp
 {id:"aconcagua",tier:3,cat:"Mountains",q:"On which continent is Aconcagua, the highest peak outside Asia?",o:["South America","Africa","North America","Antarctica"],hint:"It's in the Andes."},
 {id:"baikal",tier:3,cat:"Geography",q:"Which is the deepest lake in the world?",o:["Lake Baikal","Lake Tanganyika","Lake Superior","Caspian Sea"],hint:"It's in Siberia."},
 {id:"granite",tier:3,cat:"Nature",q:"What type of rock is granite?",o:["Igneous","Sedimentary","Metamorphic","Organic"],hint:"It forms when magma cools slowly underground."},
 {id:"hillary",tier:3,cat:"Mountains",q:"Who were the first confirmed climbers on the summit of Everest, in 1953?",o:["Edmund Hillary and Tenzing Norgay","George Mallory and Andrew Irvine","Reinhold Messner and Peter Habeler","Junko Tabei and Ang Tsering"],hint:"One of them kept bees in New Zealand."},
 {id:"lapse",tier:3,cat:"Weather",q:"Roughly how fast does dry air cool as you climb?",o:["About 10 °C per 1 000 m","About 1 °C per 1 000 m","About 30 °C per 1 000 m","It doesn't cool at all"],hint:"Think of about one degree for every hundred metres."},
 {id:"deathzone",tier:3,cat:"Mountains",q:"What do climbers call the altitudes above about 8 000 m?",o:["The death zone","The dead line","The thin belt","The red zone"],hint:"The name is as grim as it sounds."},
 {id:"brazil",tier:3,cat:"Geography",q:"Which is the largest country in South America by area?",o:["Brazil","Argentina","Peru","Colombia"],hint:"Its people speak Portuguese."},
 {id:"tundra",tier:3,cat:"Nature",q:"What is the treeless, frozen landscape of the far north called?",o:["Tundra","Taiga","Steppe","Savanna"],hint:"Its name comes from a Sami word for a treeless plateau."}
];
