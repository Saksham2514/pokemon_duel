'use strict';
// Evolution & form data. Species are matched by name (Shiny variants count as the same species).
// CHAINS: "A>B>C" is a straight line, "A>B|C|D" is a branch (A evolves into any ONE of B, C, D).
const CHAINS = `Bulbasaur>Ivysaur>Venusaur;Charmander>Charmeleon>Charizard;Squirtle>Wartortle>Blastoise;Caterpie>Metapod>Butterfree;Weedle>Kakuna>Beedrill;
Rattata>Raticate;Spearow;Ekans>Arbok;Pichu>Pikachu>Raichu;Pikachu>Alolan Raichu;Sandshrew;Alolan Sandshrew>Alolan Sandslash;Nidoran♂;Vulpix;Alolan Vulpix>Alolan Ninetales;
Jigglypuff>Wigglytuff;Igglybuff>Jigglypuff;Zubat>Golbat>Crobat;Bellsprout;Poliwag>Poliwhirl>Poliwrath|Politoed;Abra>Kadabra>Alakazam;Machop>Machoke>Machamp;
Geodude>Graveler>Golem;Ponyta>Rapidash;Slowpoke;Magnemite>Magneton>Magnezone;Doduo;Drowzee>Hypno;Koffing>Weezing;Rhyhorn>Rhydon>Rhyperior;Exeggcute>Exeggutor;
Tentacool>Tentacruel;Onix>Steelix;Krabby;Voltorb>Electrode;Eevee>Vaporeon|Jolteon|Flareon|Espeon|Umbreon|Leafeon|Glaceon|Sylveon;Kabuto;Omanyte>Omastar;
Magikarp>Gyarados;Dratini>Dragonair>Dragonite;Cyndaquil>Quilava>Typhlosion;Chikorita>Bayleef;Totodile>Croconaw>Feraligatr;Hoothoot>Noctowl;Ledyba>Ledian;
Natu>Xatu;Mareep>Flaaffy>Ampharos;Marill>Azumarill;Aipom;Sneasel>Weavile;Murkrow>Honchkrow;Larvitar>Pupitar>Tyranitar;Elekid>Electabuzz>Electivire;
Magby>Magmar>Magmortar;Smoochum;Tyrogue>Hariyama;Treecko>Grovyle>Sceptile;Torchic>Combusken>Blaziken;Mudkip>Marshtomp>Swampert;Poochyena>Mightyena;
Seedot>Nuzleaf>Shiftry;Lotad>Lombre>Ludicolo;Taillow>Swellow;Ralts>Kirlia>Gardevoir|Gallade;Shroomish;Slakoth>Vigoroth>Slaking;Nincada>Ninjask;Makuhita>Hariyama;
Carvanha>Sharpedo;Trapinch>Vibrava>Flygon;Cacnea>Cacturne;Swablu>Altaria;Shuppet>Banette;Feebas>Milotic;Snorunt>Glalie|Froslass;Bagon>Shelgon>Salamence;
Beldum>Metang>Metagross;Aron>Lairon>Aggron;Corphish>Crawdaunt;Wynaut;Turtwig>Grotle>Torterra;Chimchar>Monferno>Infernape;Piplup>Prinplup>Empoleon;
Shinx>Luxio>Luxray;Bidoof>Bibarel;Bronzor>Bronzong;Drifloon>Drifblim;Gible>Gabite>Garchomp;Munchlax>Snorlax;Croagunk>Toxicroak;Skorupi>Drapion;
Snover>Abomasnow;Misdreavus>Mismagius;Purrloin>Liepard;Joltik>Galvantula;Tynamo>Eelektrik>Eelektross;Zorua>Zoroark;Gothita>Gothorita>Gothitelle;
Solosis>Duosion>Reuniclus;Elgyem>Beheeyem;Litwick>Lampent>Chandelure;Axew>Fraxure>Haxorus;Scraggy>Scrafty;Larvesta>Volcarona;Vullaby>Mandibuzz;
Deino>Zweilous>Hydreigon;Drilbur>Excadrill;Tympole>Palpitoad>Seismitoad;Yamask>Cofagrigus;Chespin>Quilladin>Chesnaught;Fennekin>Braixen>Delphox;
Froakie>Frogadier>Greninja;Fletchling>Fletchinder>Talonflame;Honedge>Doublade>Aegislash Blade Forme;Espurr>Meowstic;Inkay>Malamar;Skrelp>Dragalge;
Goomy>Sliggoo>Goodra;Phantump>Trevenant;Pumpkaboo>Gourgeist;Bergmite>Avalugg;Noibat>Noivern;Pancham>Pangoro;Rowlet>Dartrix>Decidueye;Litten>Torracat>Incineroar;
Popplio>Brionne>Primarina;Rockruff>Lycanroc Midday Form|Lycanroc Midnight Form;Grubbin>Charjabug>Vikavolt;Morelull>Shiinotic;Salandit>Salazzle;
Stufful>Bewear;Bounsweet>Steenee>Tsareena;Wimpod>Golisopod;Mareanie>Toxapex;Cosmog>Cosmoem>Solgaleo|Lunala;Poipole>Naganadel;Tyrunt>Tyrantrum;Amaura>Aurorus;
Togedemaru;Petilil>Lilligant;Cottonee>Whimsicott;Fomantis>Lurantis;Chinchou>Lanturn;Electrike>Manectric;Goldeen>Seaking;Combee>Vespiquen;Houndour>Houndoom;
Meowth;Growlithe>Arcanine;Spinarak;Sentret;Teddiursa;Kabuto>Kabutops;Scyther>Scizor;Tangela>Tangrowth;Riolu>Lucario;Mime Jr.>Mr. Mime;Corsola;Delibird;
Gastly>Haunter>Gengar;Diglett;Mankey;Slowpoke;Rhyhorn;Spinda;Staraptor;Sableye;Mawile;Plusle;Minun;Pachirisu;Dedenne;Emolga;Audino;Heracross;Pinsir;Lapras;
Zangoose;Seviper;Wobbuffet;Girafarig;Tropius;Absol;Stantler;Tauros;Hawlucha;Kangaskhan;Murkrow;Skarmory;Aerodactyl;Relicanth;Armaldo;Druddigon;Durant;Heatmor;
Sigilyph;Carnivine;Stunfisk;Trubbish>Garbodor;Voltorb;Oricorio Baile Style;Sylveon;Wimpod;Sandshrew>Sandslash;Vulpix>Ninetales;Raichu;Nidoran♂>Nidorino>Nidoking;
Staryu>Starmie;Krabby>Kingler;Horsea>Seadra>Kingdra;Pidgey>Pidgeotto>Pidgeot;Staravia>Staraptor;Starly>Staravia>Staraptor;Wingull>Pelipper;Sewaddle>Swadloon>Leavanny;
Archen>Archeops;Tirtouga>Carracosta;Clauncher>Clawitzer;Binacle>Barbaracle;Karrablast>Escavalier;Shelmet>Accelgor;Spheal>Sealeo>Walrein;Clamperl>Huntail|Gorebyss;
Azurill>Marill;Budew>Roselia>Roserade;Cranidos>Rampardos;Shieldon>Bastiodon;Buneary>Lopunny;Glameow>Purugly;Stunky>Skuntank;Mime Jr.>Mr. Mime`;
// Pairs derived from CHAINS: NEXT[name] = [names it can evolve into]
const NEXT = {};
for (const raw of CHAINS.replace(/\n/g, '').split(';')) {
  const parts = raw.trim().split('>'); if (parts.length < 2) continue;
  for (let i = 0; i < parts.length - 1; i++) { for (const a of parts[i].split('|')) for (const b of parts[i + 1].split('|')) { (NEXT[a] = NEXT[a] || new Set()).add(b); } }
}
for (const k of Object.keys(NEXT)) NEXT[k] = [...NEXT[k]];
const species = name => String(name).replace(/^Shiny\s+/, '');
const isMega = name => /^(?:Shiny\s+)?(?:Mega|Primal)\s+/.test(name);
const megaBase = name => species(name).replace(/^(?:Mega|Primal)\s+/, '').replace(/\s+[XY]$/, '');
const canEvolveTo = (fromName, toName) => (NEXT[species(fromName)] || []).includes(species(toName));
const canMegaFrom = (fromName, megaName) => isMega(megaName) && megaBase(megaName) === species(fromName);
// Form changes on KO: instead of being knocked out these figures change form (the target form does NOT have to be in the deck).
const KO_FORMS = [
  { re: /^Keldeo$/, to: 'Keldeo Resolute Form' },
  { re: /^(?:Black|White) Kyurem$/, to: 'Kyurem' },
  { re: /^Zygarde 10Percent Forme$/, to: 'Zygarde Complete Forme', cond: 'pcFull' },
];
module.exports = { NEXT, species, isMega, megaBase, canEvolveTo, canMegaFrom, KO_FORMS };
