/* ============================== THE QUIZ ==============================
   Each mountain has its own theme. Every question has four options, the first one right (the game shuffles them
   per round), a category, a difficulty tier (1 at the foot of the wall up to 4 on the summit push; each route
   sets the tier of its pitches, see FORKS) and a hint
   that only the belayer sees when the team spends a route scout. */
const MOUNTAIN = {name:"Kebne Wall",theme:"Nature & geography"};
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
 {id:"amazon",tier:2,cat:"Geography",q:"Which river carries the most water in the world?",o:["Amazon","Nile","Yangtze","Mississippi"],hint:"It flows through the world's largest rainforest."},
 {id:"glacier",tier:2,cat:"Nature",q:"What is a slow-moving river of ice called?",o:["Glacier","Iceberg","Avalanche","Moraine"],hint:"Most valleys in the Alps were carved by them."},
 {id:"kili",tier:2,cat:"Mountains",q:"Which is the highest mountain in Africa?",o:["Kilimanjaro","Mount Kenya","Toubkal","Mount Stanley"],hint:"It's a volcano in Tanzania."},
 {id:"owl",tier:2,cat:"Animals",q:"Which bird can turn its head about 270 degrees?",o:["Owl","Eagle","Parrot","Crow"],hint:"It hunts at night."},
 {id:"canberra",tier:2,cat:"Geography",q:"What is the capital of Australia?",o:["Canberra","Sydney","Melbourne","Perth"],hint:"It was built as a compromise between two bigger rival cities."},
 {id:"rainbow",tier:2,cat:"Weather",q:"Which colour is on the outside of a rainbow's arc?",o:["Red","Violet","Blue","Green"],hint:"It's the colour with the longest wavelength."},
 {id:"edelweiss",tier:2,cat:"Nature",q:"Which white, woolly flower is a famous symbol of the Alps?",o:["Edelweiss","Gentian","Alpine rose","Snowdrop"],hint:"There's a song about it in The Sound of Music."},
 {id:"andes",tier:2,cat:"Mountains",q:"Which is the longest mountain range on land?",o:["Andes","Himalayas","Rocky Mountains","Alps"],hint:"It runs down the whole west side of South America."},
 {id:"penguin",tier:2,cat:"Animals",q:"Wild penguins live almost only in which half of the world?",o:["The Southern Hemisphere","The Northern Hemisphere","Around the North Pole","Only on the Equator"],hint:"Think Antarctica."},
 {id:"iceland",tier:2,cat:"Geography",q:"Which country is known as the land of fire and ice?",o:["Iceland","Greenland","Norway","Finland"],hint:"It has glaciers and active volcanoes side by side."},
 // tier 3: just below camp
 {id:"aconcagua",tier:3,cat:"Mountains",q:"On which continent is Aconcagua, the highest peak outside Asia?",o:["South America","Africa","North America","Antarctica"],hint:"It's in the Andes."},
 {id:"baikal",tier:3,cat:"Geography",q:"Which is the deepest lake in the world?",o:["Lake Baikal","Lake Tanganyika","Lake Superior","Caspian Sea"],hint:"It's in Siberia."},
 {id:"granite",tier:3,cat:"Nature",q:"What type of rock is granite?",o:["Igneous","Sedimentary","Metamorphic","Organic"],hint:"It forms when magma cools slowly underground."},
 {id:"hillary",tier:3,cat:"Mountains",q:"Who were the first confirmed climbers on the summit of Everest, in 1953?",o:["Edmund Hillary and Tenzing Norgay","George Mallory and Andrew Irvine","Reinhold Messner and Peter Habeler","Junko Tabei and Ang Tsering"],hint:"One of them kept bees in New Zealand."},
 {id:"lapse",tier:3,cat:"Weather",q:"Roughly how fast does dry air cool as you climb?",o:["About 10 °C per 1 000 m","About 1 °C per 1 000 m","About 30 °C per 1 000 m","It doesn't cool at all"],hint:"Think of about one degree for every hundred metres."},
 {id:"deathzone",tier:3,cat:"Mountains",q:"What do climbers call the altitudes above about 8 000 m?",o:["The death zone","The dead line","The thin belt","The red zone"],hint:"The name is as grim as it sounds."},
 {id:"brazil",tier:3,cat:"Geography",q:"Which is the largest country in South America by area?",o:["Brazil","Argentina","Peru","Colombia"],hint:"Its people speak Portuguese."},
 {id:"tundra",tier:3,cat:"Nature",q:"What is the treeless, frozen landscape of the far north called?",o:["Tundra","Taiga","Steppe","Savanna"],hint:"Its name comes from a Sami word for a treeless plateau."},
 {id:"k2",tier:3,cat:"Mountains",q:"What is the second-highest mountain in the world?",o:["K2","Kangchenjunga","Lhotse","Makalu"],hint:"It's named after a survey mark."},
 {id:"stalactite",tier:3,cat:"Nature",q:"In a cave, which formation hangs down from the ceiling?",o:["Stalactite","Stalagmite","Column","Geode"],hint:"It holds 'tight' to the ceiling."},
 {id:"montblanc",tier:3,cat:"Mountains",q:"Mont Blanc stands on the border of France and which other country?",o:["Italy","Switzerland","Austria","Germany"],hint:"On that side it's called Monte Bianco."},
 {id:"plates",tier:3,cat:"Nature",q:"The Himalayas rose when India pushed into which tectonic plate?",o:["The Eurasian Plate","The Pacific Plate","The African Plate","The Arabian Plate"],hint:"The plate that carries most of Europe and Asia."},
 {id:"foehn",tier:3,cat:"Weather",q:"What is the warm, dry wind that sweeps down the lee side of the Alps called?",o:["Föhn","Mistral","Sirocco","Bora"],hint:"In German the same word means a hair dryer."},
 {id:"ibex",tier:3,cat:"Animals",q:"Which wild goat with huge, curved horns climbs the steepest cliffs of the Alps?",o:["Alpine ibex","Chamois","Mouflon","Markhor"],hint:"An old male's horns can grow about a metre long."},
 {id:"atacama",tier:3,cat:"Geography",q:"Which is the driest desert outside the polar regions?",o:["Atacama","Sahara","Gobi","Kalahari"],hint:"It's in Chile."},
 {id:"denali",tier:3,cat:"Mountains",q:"What is the highest mountain in North America?",o:["Denali","Mount Logan","Mount Whitney","Pico de Orizaba"],hint:"It's in Alaska."},
 {id:"permafrost",tier:3,cat:"Nature",q:"What is ground that stays frozen for at least two years in a row called?",o:["Permafrost","Tundra","Hoarfrost","Firn"],hint:"The name says how long it stays frozen."},
 {id:"boiling",tier:3,cat:"Nature",q:"Why does water boil at a lower temperature high on a mountain?",o:["The air pressure is lower","The air is colder","There is less oxygen","The water is purer"],hint:"It's why pasta takes longer to cook at a high camp."},
 // tier 4: the summit push, the hardest of all
 {id:"annapurna",tier:4,cat:"Mountains",q:"Which 8 000 m peak was the first to be climbed, in 1950?",o:["Annapurna","Everest","Nanga Parbat","K2"],hint:"A French expedition led by Maurice Herzog."},
 {id:"messner",tier:4,cat:"Mountains",q:"Who was the first person to climb all fourteen 8 000 m peaks?",o:["Reinhold Messner","Jerzy Kukuczka","Edmund Hillary","Nirmal Purja"],hint:"He's from South Tyrol, and also climbed Everest first without bottled oxygen."},
 {id:"tabei",tier:4,cat:"Mountains",q:"Who was the first woman to reach the summit of Everest, in 1975?",o:["Junko Tabei","Wanda Rutkiewicz","Lydia Bradey","Pasang Lhamu Sherpa"],hint:"She was from Japan."},
 {id:"oxygen",tier:4,cat:"Nature",q:"On the summit of Everest, about how much oxygen does each breath hold compared with sea level?",o:["About a third","About two thirds","About the same","About a tenth"],hint:"The air pressure up there is roughly a third of sea level."},
 {id:"chimborazo",tier:4,cat:"Geography",q:"Which mountain's summit is the point farthest from the centre of the Earth?",o:["Chimborazo","Mount Everest","Kilimanjaro","Denali"],hint:"It's in Ecuador, close to the Equator, where the Earth bulges."},
 {id:"maunakea",tier:4,cat:"Mountains",q:"Measured from its base on the sea floor, which mountain is the tallest on Earth?",o:["Mauna Kea","Mount Everest","K2","Mount Fuji"],hint:"It's a volcano in Hawaii."},
 {id:"kebnetop",tier:4,cat:"Mountains",q:"Why has Kebnekaise's southern summit been getting lower?",o:["Its ice cap is melting","Wind is wearing down the rock","Earthquakes","Climbers are wearing it down"],hint:"Since 2018 the rocky northern summit has been the higher one."},
 {id:"seracs",tier:4,cat:"Mountains",q:"What do climbers call the huge, unstable towers of ice in an icefall?",o:["Seracs","Cornices","Crevasses","Moraines"],hint:"The Khumbu Icefall on Everest is full of them."},
 {id:"cornice",tier:4,cat:"Weather",q:"What is an overhanging lip of wind-blown snow along a ridge called?",o:["A cornice","A serac","A bergschrund","A couloir"],hint:"Never walk out to the edge of one."},
 {id:"bergschrund",tier:4,cat:"Mountains",q:"What is the crevasse between a moving glacier and the steep ice or rock above it called?",o:["Bergschrund","Moulin","Arête","Couloir"],hint:"It's a German word meaning 'mountain cleft'."},
 {id:"hace",tier:4,cat:"Nature",q:"Which illness causes swelling of the brain in climbers who go up too fast?",o:["HACE","Hypothermia","Frostbite","Snow blindness"],hint:"It's the most dangerous form of altitude sickness."},
 {id:"nangaparbat",tier:4,cat:"Mountains",q:"Which 8 000 m peak earned the nickname 'Killer Mountain'?",o:["Nanga Parbat","Annapurna","Makalu","Cho Oyu"],hint:"It stands at the western end of the Himalayas, in Pakistan."},
 {id:"savage",tier:4,cat:"Mountains",q:"Which mountain is known as the 'Savage Mountain'?",o:["K2","The Eiger","The Matterhorn","Annapurna"],hint:"It's the second-highest in the world."},
 {id:"eiger",tier:4,cat:"Mountains",q:"The infamous north face, the Nordwand, belongs to which Swiss peak?",o:["The Eiger","The Matterhorn","The Jungfrau","The Mönch"],hint:"Its name sounds like the German word for 'ogre'."},
 {id:"vinson",tier:4,cat:"Geography",q:"What is the highest mountain in Antarctica?",o:["Mount Vinson","Mount Erebus","Mount Kirkpatrick","Mount Sidley"],hint:"It's in the Ellsworth Mountains."}
];
