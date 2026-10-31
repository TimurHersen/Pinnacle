/* ============================== CONTENT ============================== */
const RARE = [
 {id:"cheese",q:"Name a cheese",t:{
  1:"cheddar;mozzarella;parmesan|parmigiano|parmigiano reggiano;brie;gouda;feta",
  2:"camembert;edam;emmental|emmentaler|emmenthal;gruyere;blue cheese;cream cheese;ricotta;halloumi;mascarpone;stilton;roquefort;gorgonzola;manchego;provolone;cottage cheese;havarti;pecorino;jarlsberg;prastost|prästost",
  3:"vasterbottensost|västerbottensost|vasterbotten;greve|grevé;herrgard|herrgårdsost|herrgard;port salut;comte|comté;taleggio;burrata;paneer;monterey jack;colby;pepper jack;wensleydale;red leicester;double gloucester;fontina;asiago;boursin;raclette;tilsit|tilsiter;limburger;munster;leerdammer;mimolette;cheshire;queso fresco;goat cheese|chevre",
  4:"epoisses;reblochon;beaufort;saint agur;cantal;idiazabal;mahon;caciocavallo;scamorza;stracchino;kasseri;kefalotyri;graviera;lancashire;caerphilly;yarg|cornish yarg;gamalost;brunost|mesost|messmor|messmör|geitost;hushallsost|hushållsost;adelost|ädelost;cotija;oaxaca cheese|queso oaxaca;maasdam;appenzeller;tete de moine;vacherin;morbier;ossau iraty;abondance;sbrinz;mozzarella di bufala|buffalo mozzarella",
  5:"casu marzu;milbenkase|milbenkäse;pule;bryndza;oscypek;juustoleipa|leipajuusto|squeaky cheese;mish;tulum;chhurpi;bandel;kalari;queso de bola;ricotta salata;gjetost;vieux boulogne;kashkaval;sulguni;circassian cheese;rauchkase"}},
 {id:"africa",q:"Name a country in Africa",t:{
  1:"egypt;nigeria;south africa;kenya;morocco;ethiopia",
  2:"ghana;algeria;tunisia;libya;sudan;somalia;uganda;tanzania;zimbabwe;senegal;cameroon;democratic republic of the congo|dr congo|drc|congo kinshasa;angola;mozambique;madagascar;rwanda;namibia;botswana;ivory coast|cote divoire|cote d ivoire;mali;zambia",
  3:"niger;chad;liberia;sierra leone;gambia|the gambia;guinea;burkina faso;togo;benin;gabon;eritrea;djibouti;malawi;lesotho;eswatini|swaziland;mauritania;central african republic;south sudan;burundi;mauritius;cape verde|cabo verde;republic of the congo|congo brazzaville|congo",
  4:"equatorial guinea;guinea bissau;comoros;sao tome and principe|sao tome;seychelles",
  5:"western sahara|sahrawi republic"}},
 {id:"swecity",q:"Name a Swedish city or town",t:{
  1:"stockholm;gothenburg|goteborg|göteborg;malmo|malmö;uppsala",
  2:"lund;linkoping|linköping;orebro|örebro;vasteras|västerås;helsingborg;norrkoping|norrköping;jonkoping|jönköping;umea|umeå;kiruna;lulea|luleå;gavle|gävle;sundsvall;karlstad;vaxjo|växjö;halmstad",
  3:"boras|borås;eskilstuna;sodertalje|södertälje;kalmar;karlskrona;ostersund|östersund;falun;visby;trollhattan|trollhättan;kristianstad;skelleftea|skellefteå;uddevalla;nykoping|nyköping;varberg;ystad;landskrona;borlange|borlänge;motala;pitea|piteå;ornskoldsvik|örnsköldsvik",
  4:"arvika;sandviken;karlshamn;angelholm|ängelholm;lidkoping|lidköping;skovde|skövde;enkoping|enköping;sala;hudiksvall;soderhamn|söderhamn;alingsas|alingsås;kungsbacka;falkenberg;vimmerby;vastervik|västervik;oskarshamn;mora;harnosand|härnösand;gallivare|gällivare;haparanda;stromstad|strömstad;mariestad;katrineholm;nassjo|nässjö;ljungby;simrishamn;trelleborg;eslov|eslöv;sigtuna;norrtalje|norrtälje;kungalv|kungälv",
  5:"jokkmokk;arjeplog;are|åre;sorsele;pajala;overkalix|överkalix;gnosjo|gnosjö;toreboda|töreboda;hjo;askersund;filipstad;kramfors;solleftea|sollefteå;vilhelmina;storuman;tranas|tranås;monsteras|mönsterås;borgholm;solvesborg|sölvesborg;skanor|skanör;falsterbo;grisslehamn;oregrund|öregrund;osthammar|östhammar;trosa;vadstena;skara;amal|åmål;sigtuna"}},
 {id:"space",q:"Name a planet, moon or dwarf planet",t:{
  1:"earth;mars;jupiter;saturn;venus;mercury;moon|the moon|luna;neptune;uranus",
  2:"pluto;titan;europa;io;ganymede;callisto;phobos;deimos",
  3:"enceladus;triton;ceres;eris;charon;makemake;haumea;miranda;titania;oberon;rhea;mimas;iapetus;dione;tethys",
  4:"hyperion;umbriel;ariel;nereid;sedna;quaoar;phoebe;amalthea;proteus;janus;epimetheus;pandora;prometheus;orcus;gonggong;metis;thebe;himalia;nix;hydra;kerberos;styx;dysnomia",
  5:"pan;daphnis;atlas;larissa;galatea;despina;thalassa;naiad;puck;cordelia;ophelia;sycorax;caliban;setebos;adrastea;leda;elara;carme;ananke;pasiphae;sinope;weywot;vanth;hiiaka;namaka;salacia;hippocamp;kale;mab"}},
 {id:"instrument",q:"Name a musical instrument",t:{
  1:"guitar;piano;drums|drum kit|drum;violin;flute;trumpet;saxophone|sax",
  2:"cello;bass|bass guitar|electric bass;clarinet;harp;trombone;ukulele;keyboard;harmonica|mouth organ;accordion;banjo;tuba;oboe;xylophone;organ|pipe organ;triangle;tambourine;recorder",
  3:"double bass|contrabass|upright bass;viola;bassoon;french horn|horn;mandolin;cymbals|cymbal;bagpipes|bagpipe;glockenspiel;marimba;synthesizer|synth;sitar;didgeridoo;harpsichord;piccolo;timpani|kettle drum;cornet;bongos|bongo;maracas;castanets;euphonium;kazoo;ocarina;steel drum|steel pan|steelpan",
  4:"nyckelharpa;theremin;hurdy gurdy|vevlira;lute;zither;balalaika;dulcimer;djembe;cajon;tabla;koto;shamisen;erhu;oud;bouzouki;vibraphone;celesta;melodica;lyre;pan flute|panpipes|pan pipes;contrabassoon;cor anglais|english horn;sousaphone;flugelhorn;harmonium;mbira|kalimba|thumb piano;conga|congas;gong;autoharp;clavichord;spinet",
  5:"hardanger fiddle|hardingfele;kantele;duduk;serpent;crumhorn;sackbut;shakuhachi;guzheng;pipa;sarangi;santoor|santur;kora;ngoni;rebab;kemenche;baglama|saz;bandoneon;ondes martenot;glass harmonica|armonica;hang|handpan;langeleik;moraharpa;sheng;suona;gaida;tromba marina;ophicleide;cimbalom;valiha;berimbau;charango"}},
 {id:"dog",q:"Name a dog breed",t:{
  1:"labrador|labrador retriever|lab;golden retriever;german shepherd|alsatian;poodle;bulldog|english bulldog;chihuahua;beagle;husky|siberian husky;pug",
  2:"rottweiler;dachshund|tax|sausage dog;boxer;border collie;cocker spaniel;french bulldog|frenchie;great dane;dalmatian;doberman|dobermann;shih tzu;yorkshire terrier|yorkie;jack russell|jack russell terrier;corgi|welsh corgi;pomeranian;chow chow;st bernard|saint bernard;greyhound;collie|rough collie;maltese;bichon frise;cavalier king charles spaniel|cavalier",
  3:"shiba inu|shiba;akita;samoyed;bernese mountain dog|berner;australian shepherd;whippet;basset hound;bloodhound;newfoundland;staffordshire bull terrier|staffie;bull terrier;weimaraner;vizsla;pointer;irish setter;schnauzer;shar pei;papillon;alaskan malamute|malamute;west highland terrier|westie;scottish terrier|scottie;airedale terrier|airedale;great pyrenees;mastiff;cane corso;rhodesian ridgeback;afghan hound;basenji;keeshond;havanese;lhasa apso;pekingese;boston terrier;springer spaniel;chinese crested;irish wolfhound;dogue de bordeaux",
  4:"swedish vallhund|vastgotaspets|västgötaspets;norrbottenspets;jamthund|jämthund|swedish elkhound;hamiltonstovare|hamiltonstövare;smalandsstovare|smålandsstövare;schillerstovare|schillerstövare;drever;swedish lapphund|svensk lapphund;borzoi;saluki;komondor;puli;leonberger;xoloitzcuintli|xolo;bedlington terrier;schipperke;kooikerhondje;lagotto romagnolo;nova scotia duck tolling retriever|toller;flat coated retriever;chesapeake bay retriever;finnish spitz;norwegian elkhound;icelandic sheepdog;tibetan mastiff;anatolian shepherd;dogo argentino;bergamasco;briard;beauceron;kuvasz",
  5:"otterhound;sloughi;azawakh;mudi;pumi;catalburun;peruvian inca orchid;thai ridgeback;kai ken;kishu;jindo;chinook;mountain cur;lundehund|norwegian lundehund;stabyhoun;drentse patrijshond;dansk svensk gardshund|danish swedish farmdog;lancashire heeler;sapsali;kintamani"}},
 {id:"fruit",q:"Name a fruit",t:{
  1:"apple;banana;orange;strawberry;grape|grapes;pear;mango;pineapple;watermelon",
  2:"kiwi|kiwifruit;lemon;lime;peach;plum;cherry;raspberry;blueberry;apricot;melon;coconut;pomegranate;grapefruit;fig;papaya;passion fruit;avocado;blackberry;nectarine;tangerine|mandarin;clementine",
  3:"lingonberry|lingon;cloudberry|hjortron;gooseberry;cranberry;redcurrant|blackcurrant|currant;lychee|litchi;dragon fruit|pitaya;guava;persimmon|sharon fruit|kaki;quince;date;kumquat;starfruit|carambola;cantaloupe;honeydew;olive;elderberry;mulberry;physalis|cape gooseberry;cherimoya;jackfruit;durian;plantain;bilberry;tomato",
  4:"rambutan;mangosteen;longan;feijoa;tamarillo;sapodilla;soursop|guanabana;pawpaw;loquat;medlar;rowanberry;sloe;damson;greengage;salmonberry;boysenberry;loganberry;tayberry;yuzu;pomelo;ugli fruit;bergamot;kiwano|horned melon;sea buckthorn|havtorn;crowberry|krakbar|kråkbär;acai|açaí;jabuticaba;lucuma;tamarind",
  5:"salak|snake fruit;langsat;duku;santol;marang;bignay;cempedak;ackee;mamey sapote|mamey;black sapote;miracle fruit|miracle berry;ilama;kepel;pulasan;gac;bael;wood apple;jambolan;natal plum;arctic bramble|akerbar|åkerbär;dewberry;wineberry;bearberry;cupuacu"}},
 {id:"nobel",q:"Name a Nobel Prize winner",t:{
  1:"albert einstein|einstein;marie curie|curie;martin luther king|martin luther king jr|mlk;nelson mandela|mandela;barack obama|obama;malala|malala yousafzai;mother teresa",
  2:"ernest hemingway|hemingway;bob dylan|dylan;dalai lama;niels bohr|bohr;richard feynman|feynman;alexander fleming|fleming;max planck|planck;kofi annan;desmond tutu;gabriel garcia marquez|garcia marquez;albert camus|camus;rudyard kipling|kipling;winston churchill|churchill;mikhail gorbachev|gorbachev;al gore;toni morrison;kazuo ishiguro|ishiguro;john steinbeck|steinbeck;pierre curie",
  3:"selma lagerlof|selma lagerlöf|lagerlof;dag hammarskjold|dag hammarskjöld|hammarskjold;alva myrdal;tomas transtromer|tomas tranströmer|transtromer;svante arrhenius|arrhenius;hjalmar branting|branting;gunnar myrdal;peter higgs|higgs;paul dirac|dirac;werner heisenberg|heisenberg;erwin schrodinger|schrödinger|schrodinger;enrico fermi|fermi;linus pauling|pauling;james watson;francis crick|crick;ivan pavlov|pavlov;robert koch;william faulkner|faulkner;samuel beckett|beckett;orhan pamuk|pamuk;doris lessing;alice munro;olga tokarczuk;annie ernaux;han kang;jimmy carter;wangari maathai;aung san suu kyi;lech walesa;kenzaburo oe;rabindranath tagore|tagore;pablo neruda|neruda;paul krugman|krugman;milton friedman;john nash;elie wiesel;henry kissinger;theodore roosevelt;woodrow wilson",
  4:"verner von heidenstam|heidenstam;erik axel karlfeldt|karlfeldt;par lagerkvist|pär lagerkvist|lagerkvist;eyvind johnson;harry martinson|martinson;nelly sachs;hannes alfven|hannes alfvén|alfven;manne siegbahn;kai siegbahn;the svedberg|svedberg;hans von euler chelpin;ulf von euler;arvid carlsson;torsten wiesel;svante paabo|svante pääbo|paabo;gustaf dalen|gustaf dalén|dalen;allvar gullstrand|gullstrand;bertil ohlin;nathan soderblom|nathan söderblom|soderblom;klas pontus arnoldson;ragnar granit;hugo theorell;sune bergstrom|sune bergström;bengt samuelsson;anne l huillier|anne l'huillier;katalin kariko;john hopfield;geoffrey hinton|hinton;demis hassabis|hassabis",
  5:"walter rudolf hess;jean baptiste perrin;frederic passy;henri dunant|dunant;bertha von suttner;theodor mommsen|mommsen;sully prudhomme;bjornstjerne bjornson|bjørnstjerne bjørnson;frans eemil sillanpaa|sillanpää;halldor laxness|laxness;giosue carducci;johannes fibiger;gabriel lippmann;jacobus van t hoff|van t hoff;emil von behring|von behring;ronald ross;wilhelm rontgen|röntgen|rontgen;hendrik lorentz;pieter zeeman"}},
 {id:"abba",q:"Name an ABBA song",t:{
  1:"dancing queen;mamma mia;waterloo;the winner takes it all|winner takes it all;money money money;gimme gimme gimme|gimme gimme gimme a man after midnight",
  2:"fernando;super trouper;take a chance on me;knowing me knowing you;chiquitita;voulez vous;sos;thank you for the music;i have a dream;does your mother know",
  3:"lay all your love on me;the name of the game|name of the game;ring ring;honey honey;one of us;summer night city;hasta manana|hasta mañana;i do i do i do i do i do;the day before you came;under attack;head over heels;angeleyes;eagle;when all is said and done",
  4:"so long;as good as new;my love my life;slipping through my fingers;our last summer;the visitors;cassandra;i still have faith in you;don t shut me down|dont shut me down;kisses of fire;rock me;tiger;intermezzo no 1|intermezzo;move on;hole in your soul;why did it have to be me;bang a boomerang;i ve been waiting for you|ive been waiting for you;nina pretty ballerina;people need love;he is your brother;king kong song;dum dum diddle;happy new year",
  5:"crazy world;put on your white sombrero;should i laugh or cry;elaine;the piper;two for the price of one;man in the middle;love isn t easy|love isnt easy;another town another train;disillusion;sitting in the palmtree;watch out;suzy hang around;little things;just a notion;bumblebee;keep an eye on dan;no doubt about it;i can be that woman;ode to freedom;happy hawaii;lovelight;merry go round;me and i;andante andante;lovers live a little longer;soldiers;if it wasn t for the nights|if it wasnt for the nights;i wonder departure|i wonder;when i kissed the teacher;my mama said"}},
 {id:"element",q:"Name a chemical element",t:{
  1:"oxygen;hydrogen;carbon;gold;iron;silver;nitrogen;helium",
  2:"copper;sodium;calcium;lead;zinc;uranium;aluminium|aluminum;neon;chlorine;sulfur|sulphur;mercury;potassium;magnesium;platinum;tin;silicon;iodine;phosphorus;lithium;titanium;nickel;plutonium",
  3:"argon;fluorine;radon;cobalt;chromium;tungsten|wolfram;manganese;boron;krypton;xenon;radium;arsenic;bismuth;barium;cadmium;beryllium;caesium|cesium;strontium;selenium;bromine;palladium;antimony;gallium;germanium;iridium;osmium;tellurium;vanadium;thorium",
  4:"zirconium;molybdenum;niobium;tantalum;hafnium;rhodium;ruthenium;rubidium;indium;thallium;scandium;yttrium;lanthanum;cerium;neodymium;samarium;europium;gadolinium;terbium;dysprosium;holmium;erbium;thulium;ytterbium;lutetium;polonium;francium;actinium;americium;curium;einsteinium;nobelium;technetium;promethium;astatine;praseodymium;rhenium",
  5:"protactinium;neptunium;berkelium;californium;fermium;mendelevium;lawrencium;rutherfordium;dubnium;seaborgium;bohrium;hassium;meitnerium;darmstadtium;roentgenium;copernicium;nihonium;flerovium;moscovium;livermorium;tennessine;oganesson"}},
 {id:"boardgame",q:"Name a board game",t:{
  1:"monopoly;chess;scrabble;cluedo|clue;risk;ludo|fia med knuff;checkers|draughts|dam",
  2:"trivial pursuit;catan|settlers of catan;backgammon|backgammon;battleship|sank skepp;twister;pictionary;yahtzee|yatzy;connect four|fyra i rad;jenga;guess who;go;mahjong;snakes and ladders|chutes and ladders;othello|reversi;mastermind;carcassonne;ticket to ride;alfapet;labyrinth|the amazing labyrinth",
  3:"pandemic;codenames;dixit;azul;splendor;7 wonders|seven wonders;dominion;stratego;axis and allies;diplomacy;mancala|kalaha;cranium;taboo;operation;mouse trap;the game of life|game of life;sorry;chinese checkers|kinaschack;blokus;terraforming mars;wingspan;king of tokyo;sagrada;love letter;carrom;finns i sjon|finns i sjön;sanktpetersburg",
  4:"agricola;puerto rico;power grid;twilight struggle;gloomhaven;terra mystica;brass|brass birmingham|brass lancashire;scythe;root;spirit island;everdell;cascadia;patchwork;hive;santorini;coup;the resistance|avalon;secret hitler;dead of winter;betrayal at house on the hill;el grande;tigris and euphrates;through the ages;caylus;istanbul;orleans;concordia;viticulture;great western trail;mysterium;hanabi;the crew;sushi go;kingdomino;takenoko;tokaido",
  5:"hnefatafl|tafl;nine men s morris|nine mens morris|kvarn;senet;royal game of ur|game of ur;pachisi;chaturanga;shogi;xiangqi;hex;tak;yinsh;gipf;zertz;onitama;arimaa;crokinole;le havre;mage knight;twilight imperium;war of the ring;food chain magnate;john company;pax pamir;high frontier;kubb"}},
 {id:"greek",q:"Name a Greek god, goddess or titan",t:{
  1:"zeus;poseidon;hades;athena|athene;aphrodite;apollo",
  2:"hera;ares;hermes;artemis;dionysus|dionysos;hephaestus|hephaistos;demeter;persephone;eros;nike",
  3:"hestia;gaia|gaea;kronos|cronus;rhea;uranus|ouranos;helios;selene;eos;pan;hecate|hekate;nemesis;hypnos;thanatos;iris;hebe;morpheus;prometheus;atlas;tyche;nyx",
  4:"erebus;chaos;tartarus;oceanus;tethys;hyperion;theia;themis;mnemosyne;phoebe;coeus;crius;iapetus;metis;leto;dione;asclepius|asklepios;harmonia;deimos;phobos;eris;enyo;boreas;zephyrus;notus;eurus;aeolus;triton;proteus;nereus;amphitrite;hymenaios|hymen;priapus;epimetheus;pontus",
  5:"aether;hemera;ananke;chronos;phanes;ourea;eurynome;styx;achlys;momus;oizys;geras;apate;philotes;pheme;kratos;bia;zelus;hesperus;phosphorus;astraeus;pallas;perses;palaemon;glaucus;aristaeus;cymopoleia;despoina;epione;hygieia;panacea;iaso;aceso;euthenia;eupheme"}}
];

const LISTS = [
 {id:"eu",q:"Name EU member states",pass:9,great:16,items:"austria;belgium;bulgaria;croatia;cyprus;czechia|czech republic;denmark;estonia;finland;france;germany;greece;hungary;ireland;italy;latvia;lithuania;luxembourg;malta;netherlands|holland;poland;portugal;romania;slovakia;slovenia;spain;sweden"},
 {id:"landskap",q:"Name Swedish provinces (landskap)",pass:8,great:15,items:"skane|skåne;blekinge;halland;smaland|småland;oland|öland;gotland;ostergotland|östergötland;vastergotland|västergötland;bohuslan|bohuslän;dalsland;varmland|värmland;narke|närke;sodermanland|södermanland;uppland;vastmanland|västmanland;dalarna;gastrikland|gästrikland;halsingland|hälsingland;harjedalen|härjedalen;medelpad;jamtland|jämtland;angermanland|ångermanland;vasterbotten|västerbotten;norrbotten;lappland|lapland"},
 {id:"southam",q:"Name countries in South America",pass:6,great:10,items:"brazil;argentina;chile;peru;colombia;venezuela;ecuador;bolivia;paraguay;uruguay;guyana;suriname"},
 {id:"lan",q:"Name Swedish counties (län)",pass:7,great:13,items:"stockholm;uppsala;sodermanland|södermanland;ostergotland|östergötland;jonkoping|jönköping;kronoberg;kalmar;gotland;blekinge;skane|skåne;halland;vastra gotaland|västra götaland;varmland|värmland;orebro|örebro;vastmanland|västmanland;dalarna;gavleborg|gävleborg;vasternorrland|västernorrland;jamtland|jämtland;vasterbotten|västerbotten;norrbotten"},
 {id:"olympic",q:"Name countries that have hosted the Summer Olympics",pass:7,great:12,items:"greece;france;united states|usa|us|america;united kingdom|uk|great britain|britain|england;sweden;belgium;netherlands|holland;germany|west germany;finland;australia;italy;japan;mexico;canada;soviet union|ussr|russia;south korea|korea;spain;china;brazil"},
 {id:"usstates",q:"Name US states",pass:16,great:28,items:"alabama;alaska;arizona;arkansas;california;colorado;connecticut;delaware;florida;georgia;hawaii;idaho;illinois;indiana;iowa;kansas;kentucky;louisiana;maine;maryland;massachusetts;michigan;minnesota;mississippi;missouri;montana;nebraska;nevada;new hampshire;new jersey;new mexico;new york;north carolina;north dakota;ohio;oklahoma;oregon;pennsylvania;rhode island;south carolina;south dakota;tennessee;texas;utah;vermont;virginia;washington;west virginia;wisconsin;wyoming"}
];

const EST = [
 {id:"everest",q:"How tall is Mount Everest, in metres?",a:8849,u:"m",t:[150,600]},
 {id:"islands",q:"How many islands does Sweden have (Statistics Sweden's count)?",a:267570,u:"islands",t:[30000,120000]},
 {id:"nobel1",q:"In what year was the first Nobel Prize awarded?",a:1901,u:"",t:[3,12]},
 {id:"oresund",q:"How long is the Öresund Bridge itself, in metres?",a:7845,u:"m",t:[600,2500]},
 {id:"bones",q:"How many bones are in an adult human body?",a:206,u:"bones",t:[10,40]},
 {id:"abbaev",q:"In what year did ABBA win Eurovision?",a:1974,u:"",t:[1,4]},
 {id:"stogot",q:"Road distance Stockholm to Gothenburg, in km?",a:470,u:"km",t:[30,90]},
 {id:"sound",q:"Speed of sound in air at 20 °C, in metres per second?",a:343,u:"m/s",t:[20,70]},
 {id:"un",q:"How many member states does the UN have?",a:193,u:"",t:[6,25]},
 {id:"ikea",q:"In what year was IKEA founded?",a:1943,u:"",t:[3,10]},
 {id:"nile",q:"How long is the Nile, in km?",a:6650,u:"km",t:[350,1200]},
 {id:"trench",q:"How deep is the Challenger Deep, in metres?",a:10935,u:"m",t:[500,2000]},
 {id:"piano",q:"How many keys on a standard piano?",a:88,u:"keys",t:[4,14]},
 {id:"boil",q:"At what temperature does water boil on the summit of Everest, in °C?",a:71,u:"°C",t:[3,9]},
 {id:"bloodbath",q:"In what year did the Stockholm Bloodbath happen?",a:1520,u:"",t:[8,40]},
 {id:"weekmin",q:"How many minutes are there in a week?",a:10080,u:"min",t:[300,1500]},
 {id:"iphone",q:"In what year was the first iPhone released?",a:2007,u:"",t:[1,3]},
 {id:"moondia",q:"Diameter of the Moon, in km?",a:3474,u:"km",t:[250,900]},
 {id:"vasa",q:"In what year did Gustav Vasa become king of Sweden?",a:1523,u:"",t:[5,20]},
 {id:"eiffel",q:"How tall is the Eiffel Tower including antennas, in metres?",a:330,u:"m",t:[15,45]},
 {id:"moondist",q:"Average distance from Earth to the Moon, in km?",a:384400,u:"km",t:[20000,70000]},
 {id:"dagenh",q:"In what year did Sweden switch to driving on the right?",a:1967,u:"",t:[1,5]},
 {id:"water",q:"What percentage of Earth's surface is covered by water?",a:71,u:"%",t:[3,9]},
 {id:"marathon",q:"How long is a marathon, in metres?",a:42195,u:"m",t:[400,2500]},
 {id:"cheetah",q:"Top speed of a cheetah, in km/h?",a:110,u:"km/h",t:[12,35]},
 {id:"mozart",q:"How old was Mozart when he died?",a:35,u:"years",t:[2,7]},
 {id:"kommuner",q:"How many municipalities (kommuner) does Sweden have?",a:290,u:"",t:[12,45]}
];

const MCQ = [
 {id:"moons",cat:"Space",q:"Which planet has the most known moons?",o:["Saturn","Jupiter","Uranus","Neptune"],c:0},
 {id:"w",cat:"Chemistry",q:"Which element has the chemical symbol W?",o:["Tungsten","Tin","Vanadium","Xenon"],c:0},
 {id:"starry",cat:"Art",q:"Who painted The Starry Night?",o:["Vincent van Gogh","Claude Monet","Edvard Munch","Paul Cézanne"],c:0},
 {id:"organ",cat:"Biology",q:"What is the largest organ of the human body?",o:["Skin","Liver","Lungs","Brain"],c:0},
 {id:"native",cat:"Language",q:"Which language has the most native speakers?",o:["Mandarin Chinese","Spanish","English","Hindi"],c:0},
 {id:"smallest",cat:"Geography",q:"What is the smallest country by area?",o:["Vatican City","Monaco","San Marino","Liechtenstein"],c:0},
 {id:"mineral",cat:"Geology",q:"What is the hardest natural mineral?",o:["Diamond","Quartz","Corundum","Topaz"],c:0},
 {id:"scot",cat:"Culture",q:"What is the national animal of Scotland?",o:["Unicorn","Red deer","Lion","Golden eagle"],c:0},
 {id:"wall",cat:"History",q:"In which year did the Berlin Wall fall?",o:["1989","1991","1987","1979"],c:0},
 {id:"celsius",cat:"Science",q:"On Anders Celsius's original scale, what was 100 degrees?",o:["Freezing point of water","Boiling point of water","Body temperature","Room temperature"],c:0},
 {id:"donor",cat:"Medicine",q:"Which blood type is the universal donor for red cells?",o:["O negative","AB positive","A negative","O positive"],c:0},
 {id:"aus",cat:"Geography",q:"What is the capital of Australia?",o:["Canberra","Sydney","Melbourne","Perth"],c:0},
 {id:"atmos",cat:"Science",q:"Which gas makes up most of Earth's atmosphere?",o:["Nitrogen","Oxygen","Argon","Carbon dioxide"],c:0},
 {id:"ocean",cat:"Geography",q:"Which is the largest ocean?",o:["Pacific","Atlantic","Indian","Arctic"],c:0},
 {id:"bandy",cat:"Sport",q:"How many players does a bandy team have on the ice?",o:["11","6","9","7"],c:0},
 {id:"countdown",cat:"Music",q:"Which Swedish band recorded The Final Countdown?",o:["Europe","Roxette","Ace of Base","The Hives"],c:0},
 {id:"deaf",cat:"Music",q:"Which composer kept composing after going deaf?",o:["Beethoven","Mozart","Bach","Chopin"],c:0},
 {id:"river",cat:"Sweden",q:"Which is Sweden's longest river system?",o:["Klarälven / Göta älv","Torne älv","Dalälven","Ångermanälven"],c:0},
 {id:"liberty",cat:"History",q:"Which country gave the Statue of Liberty to the USA?",o:["France","United Kingdom","Spain","Netherlands"],c:0},
 {id:"ytterby",cat:"Chemistry",q:"How many chemical elements are named after the Swedish village Ytterby?",o:["Four","One","Two","Seven"],c:0},
 {id:"fika",cat:"Sweden",q:"Which Swedish city is home to the Turning Torso?",o:["Malmö","Gothenburg","Stockholm","Uppsala"],c:0},
 {id:"octo",cat:"Animals",q:"How many hearts does an octopus have?",o:["Three","One","Two","Eight"],c:0},
 {id:"mona",cat:"Art",q:"In which museum hangs the Mona Lisa?",o:["The Louvre","The Prado","The Uffizi","The Met"],c:0},
 {id:"speedlight",cat:"Physics",q:"About how long does sunlight take to reach Earth?",o:["8 minutes","8 seconds","80 minutes","8 hours"],c:0}
];

/* Terrain definitions. Each pitch splits the puzzle between the two climbers, so neither can climb alone.
   `talk` is that pitch's rope-radio allowance: [messages per climber, words per message]. Chimneys and
   overhangs have no radio: one is telepathy, the other has its own one-word clue. */
const TERRAIN = {
 slab:{name:"Slab",dur:50,talk:[2,4],rule:"Two clues, one answer. The leader knows the category, the belayer knows the first letter. Talk on the rope radio, then both lock in the same answer. Rarer answers climb further."},
 chimney:{name:"Chimney",dur:35,rule:"No radio in a chimney. Both answer in secret: the same rare answer is an Echo, a double pitch. The same obvious answer and you collide and slip."},
 crevasse:{name:"Crevasse",dur:50,talk:[3,5],rule:"You both see the question, but only the belayer sees roughly where the answer lies. Talk it through on the radio, then the leader jumps with one number."},
 traverse:{name:"Traverse",dur:70,talk:[2,6],rule:"Split the list. Agree on the radio who takes what, then type as many as you can. Every unique answer counts; answers you both give cancel out."},
 overhang:{name:"Overhang",dur:50,rule:"The belayer sees the question and answer, and sends one word. The leader sees only the options."}
};
// the first stage: five pitches from base camp to Camp I (the pitch types now only name and colour each pitch)
const SEG0 = ["slab","crevasse","chimney","traverse","overhang"];
const FORKS = [
 {camp:"Camp I", A:{name:"The Icefall",desc:"Direct and steep. Fewer pitches, more teamwork.",p:["chimney","overhang","crevasse","chimney","overhang"]},
                 B:{name:"Shoulder Ridge",desc:"Longer, gentler. More knowledge, less telepathy.",p:["slab","traverse","slab","crevasse","slab","traverse","chimney"]}},
 {camp:"Camp II",A:{name:"Summit Couloir",desc:"Four hard pitches straight to the top.",p:["overhang","chimney","crevasse","chimney"]},
                 B:{name:"North Ridge",desc:"Six pitches along the exposed ridge.",p:["slab","traverse","crevasse","slab","overhang","chimney"]}}
];
const ALT = {base:1800,c1:2600,c2:3400,top:4100};

/* ============================== MATCHING ============================== */
const norm = s => (s||"").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
  .replace(/ø/g,"o").replace(/æ/g,"ae").replace(/&/g," and ").replace(/[^a-z0-9 ]/g," ")
  .replace(/\b(the|a|an)\b/g," ").replace(/\s+/g," ").trim();
function parseEntries(str,tier){
  return str.split(";").map(e=>{const al=e.split("|").map(x=>x.trim()).filter(Boolean);
    const pretty=al.find(x=>/[^\x00-\x7f]/.test(x)&&norm(x)===norm(al[0]))||al[0];
    const label=pretty.replace(/(^|[\s-])(\S)/g,(m,a,b)=>a+b.toUpperCase());
    return {canon:al[0],label,keys:[...new Set(al.map(norm))],tier};});
}
RARE.forEach(p=>{p.entries=[];for(const k of [1,2,3,4,5]) p.entries.push(...parseEntries(p.t[k],k));});
LISTS.forEach(l=>{l.entries=parseEntries(l.items,1);});
function lev(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}
  return prev[n];}
function matchEntry(entries,input){
  const k=norm(input); if(!k) return null;
  const variants=[k,k.replace(/s$/,""),k+"s",k.replace(/ (cheese|dog|breed|city|town)$/,"")];
  let best=null,bd=99;
  for(const e of entries){for(const key of e.keys){
    if(variants.includes(key)) return e;
    const lim=key.length>=9?2:key.length>=5?1:0; if(!lim) continue;
    const d=lev(k,key); if(d<=lim&&d<bd){bd=d;best=e;}
  }}
  return best;
}
const dots = t => "●".repeat(t)+"○".repeat(5-t);

/* ============================== STATE ============================== */
