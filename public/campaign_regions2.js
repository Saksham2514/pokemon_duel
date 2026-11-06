// Expansion regions: spliced into CAMP_REGIONS after the region named in `after`.
(function () {
  const NEW = [
    { after: 'magma', id: 'desert', name: 'Mirage Desert', icon: '🏜️', badge: 'Dune Badge', allow: ['ground', 'psychic', 'dark', 'normal'], blurb: 'Shifting dunes, hidden ruins and heat mirages. Ground, psychic, dark and normal types only.',
      fights: [
        ['Nomad Sahir', 'Nomad', ['ground'], 'Sandshrew', 'The sand remembers every traveler. It will remember you too.'],
        ['Mirage Maker Zia', 'Illusionist', ['psychic'], 'Kadabra', 'Is the road ahead real? Are you sure?'],
        ['Bandit Khal', 'Bandit', ['dark', 'normal'], 'Meowth', 'Your supplies are mine now. Let\'s battle for them.'],
        ['Excavator Tarek', 'Excavator', ['ground', 'psychic'], 'Stunfisk', 'Ancient things sleep below. Don\'t wake them.'],
        ['Sandstorm Nura', 'Stormcaller', ['ground', 'dark'], 'Rhyperior', 'When the storm rises, nobody sees the end of the fight.'],
        ['Dune Champion Amun', 'Region Champion', ['ground', 'psychic', 'dark'], 'Excadrill', 'The desert has swallowed kings. You are no different.'],
      ] },
    { after: 'azure', id: 'tundra', name: 'Frostpeak Tundra', icon: '❄️', badge: 'Glacier Badge', allow: ['ice', 'steel', 'fighting', 'water'], blurb: 'Whiteouts, frozen lakes and iron-willed fighters. Ice, steel, fighting and water types only.',
      fights: [
        ['Skier Nils', 'Skier', ['ice'], 'Sneasel', 'Fresh powder and a fresh opponent!'],
        ['Ice Fisher Odd', 'Fisher', ['water', 'ice'], 'Piplup', 'I\'ve waited all day for a bite. You\'ll do.'],
        ['Sparring Monk Torv', 'Monk', ['fighting'], 'Machamp', 'Cold air sharpens the fists.'],
        ['Metalsmith Brage', 'Smith', ['steel'], 'Bronzor', 'Forged in the cold, tempered by the storm.'],
        ['Blizzard Scout Ylva', 'Scout', ['ice', 'steel'], 'Glalie', 'Can you even see me through the snow?'],
        ['Glacier Champion Hrafn', 'Region Champion', ['ice', 'fighting', 'steel'], 'Weavile', 'Only the strong survive the long winter.'],
      ] },
    { after: 'tundra', id: 'isles', name: 'Storm Isles', icon: '🏝️', badge: 'Reef Badge', allow: ['water', 'grass', 'flying', 'psychic'], blurb: 'Palm islands, tide pools and island guardians. Water, grass, flying and psychic types only.',
      fights: [
        ['Surfer Kai', 'Surfer', ['water'], 'Taillow', 'Catch the wave or wipe out!'],
        ['Lei Maker Mele', 'Islander', ['grass'], 'Bounsweet', 'Every flower is a blessing from the guardian.'],
        ['Kahuna Apprentice Noa', 'Apprentice', ['psychic', 'flying'], 'Oricorio', 'Dance with me, trial taker!'],
        ['Pearl Diver Lani', 'Diver', ['water', 'psychic'], 'Slowpoke', 'The deep holds gems and guardians.'],
        ['Island Elder Makoa', 'Elder', ['grass', 'flying'], 'Decidueye', 'The old ways are still strong on these shores.'],
        ['Island Champion Pele', 'Region Champion', ['water', 'grass', 'psychic'], 'Tapu Fini', 'The guardians watch every trial. Make them proud.'],
      ] },
    { after: 'hollow', id: 'caverns', name: 'Crystal Caverns', icon: '💎', badge: 'Prism Badge', allow: ['rock', 'fairy', 'steel', 'psychic'], blurb: 'Glittering geodes and singing stone. Rock, fairy, steel and psychic types only.',
      fights: [
        ['Gem Cutter Opal', 'Jeweler', ['rock'], 'Aron', 'Every stone has a flaw. I find yours.'],
        ['Crystal Sage Lumi', 'Sage', ['fairy', 'psychic'], 'Mawile', 'The crystals hum when someone worthy arrives.'],
        ['Delver Brick', 'Delver', ['rock', 'steel'], 'Aggron', 'Deeper, harder, stronger!'],
        ['Singer Aria', 'Singer', ['fairy'], 'Mime Jr.', 'Hear the echo? That\'s your cue.'],
        ['Lapidary Garnet', 'Lapidary', ['rock', 'psychic'], 'Bronzong', 'The cave glows brightest right before the end.'],
        ['Cavern Champion Diamanta', 'Region Champion', ['rock', 'fairy', 'steel'], 'Diancie', 'Under pressure, even the soft become brilliant.'],
      ] },
    { after: 'spire', id: 'neon', name: 'Neon Metropolis', icon: '🏙️', badge: 'Circuit Badge', allow: ['electric', 'steel', 'poison', 'normal'], blurb: 'Skyscrapers, power grids and back-alley brawls. Electric, steel, poison and normal types only.',
      fights: [
        ['Courier Jet', 'Courier', ['normal'], 'Rattata', 'Deliveries first. Battles when I feel like it!'],
        ['Hacker Byte', 'Hacker', ['electric'], 'Magnemite', 'Your team? Already scanned.'],
        ['Mechanic Gear', 'Mechanic', ['steel', 'electric'], 'Magnezone', 'Let\'s see how you handle overclocking.'],
        ['Chemist Toxa', 'Chemist', ['poison'], 'Weezing', 'The city air is thick for a reason.'],
        ['Gang Boss Rex', 'Boss', ['normal', 'poison'], 'Garbodor', 'This block is mine. Pay the toll or battle.'],
        ['Metropolis Champion Dynamo', 'Region Champion', ['electric', 'steel', 'normal'], 'Magnezone', 'The whole grid is behind me. Feel the surge!'],
      ] },
    { after: 'stormwing', id: 'ruins', name: 'Twilight Ruins', icon: '🏛️', badge: 'Dusk Badge', allow: ['ghost', 'psychic', 'rock', 'ground'], blurb: 'A forgotten city at eternal dusk. Ghost, psychic, rock and ground types only.',
      fights: [
        ['Caretaker Elm', 'Caretaker', ['ghost'], 'Misdreavus', 'Please keep your voice down. They\'re sleeping.'],
        ['Archaeologist Dr. Sol', 'Scholar', ['rock', 'ground'], 'Armaldo', 'A living fossil! And a living opponent!'],
        ['Oracle Pythia', 'Oracle', ['psychic'], 'Xatu', 'I already know how this ends.'],
        ['Grave Keeper Morte', 'Keeper', ['ghost', 'ground'], 'Mismagius', 'Some doors are locked for a reason.'],
        ['High Priest Anubis', 'Priest', ['psychic', 'ghost'], 'Gardevoir', 'Kneel before the ancient king!'],
        ['Ruins Champion Nyx', 'Region Champion', ['ghost', 'psychic', 'rock'], 'Spiritomb', 'A hundred and eight souls. All of them want to battle you.'],
      ] },
    { after: 'ruins', id: 'citadel', name: 'Iron Citadel', icon: '🏰', badge: 'Bastion Badge', allow: ['steel', 'fighting', 'dragon', 'dark'], blurb: 'A fortress of knights and war dragons. Steel, fighting, dragon and dark types only.',
      fights: [
        ['Squire Garrick', 'Squire', ['steel'], 'Honedge', 'Every knight starts somewhere. Even me.'],
        ['Duelist Mara', 'Duelist', ['fighting'], 'Lucario', 'One on one, honor on the line!'],
        ['Shadow Guard Kage', 'Shadow Guard', ['dark', 'steel'], 'Absol', 'The citadel has eyes in every wall.'],
        ['War Dragoon Vala', 'Dragoon', ['dragon', 'steel'], 'Dragonite', 'Charge! Hold nothing back!'],
        ['Marshal Drake', 'Marshal', ['fighting', 'dragon'], 'Haxorus', 'My axes have never been dulled.'],
        ['Citadel Champion Aegis', 'Region Champion', ['steel', 'fighting', 'dragon'], 'Aegislash Blade', 'None have breached the gates. Not one.'],
      ] },
    { after: 'dragon', id: 'celestial', name: 'Celestial Spire', icon: '✨', badge: 'Starlight Badge', allow: ['fairy', 'psychic', 'flying', 'dragon'], blurb: 'A tower above the clouds where legends sleep. Fairy, psychic, flying and dragon types only.',
      fights: [
        ['Stargazer Luna', 'Stargazer', ['fairy'], 'Sylveon', 'The stars told me you were coming.'],
        ['Cloud Walker Zephyr', 'Walker', ['flying', 'psychic'], 'Altaria', 'Up here, the air is thin and the battles thick.'],
        ['Dream Weaver Somni', 'Weaver', ['psychic', 'fairy'], 'Alakazam', 'Shall we dream together? A short one.'],
        ['Seraph Aurelia', 'Seraph', ['fairy', 'flying'], 'Whimsicott', 'A blessing for the worthy. A trial for the rest.'],
        ['Astral Drake Orion', 'Astral Knight', ['dragon', 'psychic'], 'Latios', 'Beyond the sky, the real contest begins.'],
        ['Celestial Champion Stellara', 'Region Champion', ['fairy', 'psychic', 'dragon', 'flying'], 'Latias', 'Only the brightest star reaches the summit. Shine, or fade.'],
      ] },
  ];
  const R = window.CAMP_REGIONS;
  NEW.forEach(n => { const a = n.after; delete n.after; const i = R.findIndex(r => r.id === a); R.splice(i < 0 ? R.length - 1 : i + 1, 0, n); });
})();
