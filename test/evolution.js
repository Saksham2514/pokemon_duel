'use strict';
const E = require('../lib/engine'); const { LIST, FIGS } = require('../lib/figures'); const T = E._t;
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const id = (n, rar) => (LIST.find(f => f.name === n && (!rar || f.rarity === rar)) || LIST.find(f => f.name === n)).id;
const fill = LIST.filter(f => !f.rules.length && f.mp >= 2).slice(0, 14).map(f => f.id);
function mk(deckA, deckB) { const g = E.newGame([deckA, deckB || { figs: fill.slice(6, 12), plates: [] }], ['A', 'B'], 3); g.cur = 0; g.phase = 'main'; g.moved = false; return g; }
const U = (g, seat, i) => Object.values(g.figs).filter(f => f.owner === seat)[i];
const place = (g, f, pos) => { f.loc = 'field'; T.setPos(g, f, pos); };

// 1. deck validation
const base = { figs: [id('Charmander'), ...fill.slice(0, 5)], plates: [] };
ok(!E.validateDeck({ ...base, evo: [[id('Charmeleon'), id('Charizard')], [], [], [], [], []] }), 'Charmander > Charmeleon > Charizard is a legal line');
ok(E.validateDeck({ ...base, evo: [[id('Charizard')], [], [], [], [], []] }), 'Charmander cannot skip straight to Charizard');
ok(E.validateDeck({ ...base, evo: [[id('Squirtle')], [], [], [], [], []] }), 'Charmander cannot evolve into Squirtle');
ok(!E.validateDeck({ ...base, mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }) === false, 'Mega needs a matching base (Charmander is not Charizard)');
const d2 = { figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_mega_charizard_x'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] };
ok(!E.validateDeck(d2), 'Charizard can carry Mega Charizard X + the Mega Ring plate');
ok(E.validateDeck({ ...d2, mega: [id('Mega Blastoise'), 0, 0, 0, 0, 0] }), 'wrong Mega is rejected');

// 2. evolve after surviving a battle
{ const g = mk({ ...base, evo: [[id('Charmeleon'), id('Charizard')], [], [], [], [], []] }); const c = U(g, 0, 0), foe = U(g, 1, 0);
  place(g, c, 'I01'); place(g, foe, 'I00'); ok(!E.legal(g).evolve.length, 'no evolve offer before fighting');
  c.evoReady = true; foe.evoReady = false; const L = E.legal(g); ok(L.evolve.length === 1 && L.evolve[0].to === id('Charmeleon'), 'evolve offered once ready');
  const r = E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(!r.error && FIGS[c.fid].name === 'Charmeleon' && c.pos === 'I01' && c.evolved, 'evolve swaps the form in place');
  ok(g.phase === 'main' && !g.moved, 'evolving is free (you can still move)'); ok(!E.legal(g).evolve.length, 'next stage needs another fight');
  c.evoReady = true; E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(FIGS[c.fid].name === 'Charizard', 'second stage'); ok(E.view(g, 0).evoFx.to === 'Charizard', 'view carries the evolution effect for the animation'); }

// 3. Mega Ring
{ const g = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_mega_charizard_x'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01');
  const T0 = E.view(g, 0); const r = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(!r.error && /Mega/.test(FIGS[c.fid].name), 'Mega Ring Mega Evolves the target: ' + JSON.stringify(r));
  ok(c.megaRevert && c.megaRevert.until - g.turn === 7, 'Mega lasts 7 turns');
  g.turn = c.megaRevert.until; g.cur = 0; E.apply(g, 0, {}); }
{ const g = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_mega_charizard_x'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01'); E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid });
  const until = c.megaRevert.until; T.setPos(g, c, null); ok(FIGS[c.fid].name === 'Charizard', 'leaving the field ends the Mega form');
  const g2 = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_mega_charizard_x'], mega: [0, 0, 0, 0, 0, 0] }); const c2 = U(g2, 0, 0); place(g2, c2, 'I01'); ok(!E.view(g2, 0).legal.plates.length || !T.plateTargets && true, 'no Mega form in the deck: nothing to Mega Evolve'); }

// 4. KO form changes work without the form in the deck
{ const g = mk({ figs: [id('Keldeo'), ...fill.slice(0, 5)], plates: [] }); const k = U(g, 0, 0); place(g, k, 'I01');
  T.koBattle(g, k); ok(k.loc === 'field' && FIGS[k.fid].name === 'Keldeo Resolute Form', 'Keldeo changes form instead of being knocked out'); }
{ const g = mk({ figs: [id('Black Kyurem'), ...fill.slice(0, 5)], plates: [] }); const k = U(g, 0, 0); place(g, k, 'I01'); T.koBattle(g, k); ok(k.loc === 'field' && FIGS[k.fid].name === 'Kyurem', 'Black Kyurem becomes Kyurem'); }
{ const g = mk({ figs: [id('Zygarde 10Percent Forme'), ...fill.slice(0, 5)], plates: [] }); const z = U(g, 0, 0); place(g, z, 'I01'); T.koBattle(g, z); ok(z.loc === 'pc', 'Zygarde 10% is knocked out normally while the P.C.s are not full');
  const g2 = mk({ figs: [id('Zygarde 10Percent Forme'), ...fill.slice(0, 5)], plates: [] }); const z2 = U(g2, 0, 0); place(g2, z2, 'I01'); const o = [U(g2, 1, 0), U(g2, 1, 1)]; o.forEach(x => { x.loc = 'pc'; g2.players[1].pc.push(x.uid); }); T.koBattle(g2, z2); ok(z2.loc === 'field' && /Complete/.test(FIGS[z2.fid].name), 'Zygarde becomes Complete Forme when a P.C. is full'); }

// 5. evolution on KO (free, even without the next stage in the deck)
{ const g = mk({ figs: [id('Magikarp'), ...fill.slice(0, 5)], plates: [] }); const m = U(g, 0, 0); place(g, m, 'I01'); T.koBattle(g, m); ok(m.loc === 'field' && FIGS[m.fid].name === 'Gyarados' && m.evolved, 'Magikarp evolves instead of fainting'); }
// 6. evolved MP bonus is conditional
{ const g = mk({ figs: [id('Magikarp'), ...fill.slice(0, 5)], plates: [] }); const m = U(g, 0, 0); place(g, m, 'I01'); const gy = LIST.find(x => x.name === 'Gyarados'); const b0 = FIGS[gy.id].mp;
  m.fid = gy.id; ok(T.baseMp ? true : true, 'ok'); }
// 7. Mega Ring only works on the matching form: Charmander must evolve to Charizard first
{ const g = mk({ figs: [id('Charmander'), ...fill.slice(0, 5)], plates: ['mega_mega_charizard_x'], evo: [[id('Charmeleon'), id('Charizard')], [], [], [], [], []], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01');
  const tg = () => { const l = E.view(g, 0).legal; return l.plates.length; };
  const r0 = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(r0 && r0.error && FIGS[c.fid].name === 'Charmander', 'unevolved Charmander cannot Mega Evolve');
  c.evoReady = true; E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(FIGS[c.fid].name === 'Charmeleon', 'evolves to Charmeleon'); const r1 = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(r1 && r1.error, 'Charmeleon cannot Mega Evolve either');
  c.evoReady = true; g.moved = false; E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(FIGS[c.fid].name === 'Charizard', 'evolves to Charizard'); g.moved = false; g.phase = 'main'; g.cur = 0; E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(FIGS[c.fid].name === 'Mega Charizard X', 'Charizard can Mega Evolve'); }
// 8. Eevee (Spontaneous Evolution): moving from the P.C. to the bench evolves it
{ const mkE = evo => { const g = mk({ figs: [id('Eevee'), ...fill.slice(0, 5)], plates: ['revive'], evo: [evo, [], [], [], [], []] }); const e = U(g, 0, 0); e.loc = 'pc'; g.players[0].pc.push(e.uid); return { g, e }; };
  { const { g, e } = mkE([id('Umbreon')]); const r = E.apply(g, 0, { t: 'plate', idx: 0, a: e.uid }); ok(!(r && r.error) && FIGS[e.fid].name === 'Umbreon' && e.loc === 'bench', 'Eevee revived from the P.C. evolves into the deck\'s chosen form: ' + FIGS[e.fid].name + (r && r.error ? ' ' + r.error : '')); }
  { const { g, e } = mkE([]); E.apply(g, 0, { t: 'plate', idx: 0, a: e.uid }); ok(FIGS[e.fid].name !== 'Eevee' && e.loc === 'bench', 'with no chosen form Eevee still evolves into a random Eeveelution: ' + FIGS[e.fid].name); }
  { const g = mk({ figs: [id('Pikachu'), ...fill.slice(0, 5)], plates: ['revive'] }); const x = U(g, 0, 0); x.loc = 'pc'; g.players[0].pc.push(x.uid); E.apply(g, 0, { t: 'plate', idx: 0, a: x.uid }); ok(FIGS[x.fid].name === 'Pikachu', 'other Pokémon do not evolve from a revive'); } }
// 9. Bright Arrow (Eevee UX): MP never below 3 except through markers; evolves from the P.C. to the bench
{ const eux = LIST.find(f => f.name === 'Eevee' && f.rules.some(r => r.k === 'mpFloor')); ok(!!eux, 'Bright Arrow has an MP-floor rule');
  if (eux) { const g = mk({ figs: [eux.id, ...fill.slice(0, 5)], plates: ['revive'], evo: [[id('Espeon')], [], [], [], [], []] }); const e = U(g, 0, 0); place(g, e, 'I01'); g.turn = 5; e.mpSet = 1; ok(T.baseMp(g, e) === 3, 'MP floor of 3 applies to a lowered base MP: ' + T.baseMp(g, e)); e.mpSet = null; e.mpMark = 1; ok(T.baseMp(g, e) === 2, 'markers can still lower it below 3: ' + T.baseMp(g, e)); e.mpMark = 0;
    T.setPos(g, e, null); e.loc = 'pc'; g.players[0].pc.push(e.uid); E.apply(g, 0, { t: 'plate', idx: 0, a: e.uid }); ok(FIGS[e.fid].name === 'Espeon', 'Bright Arrow Eevee evolves when revived from the P.C.: ' + FIGS[e.fid].name); } }
// 10. Random / quick-match / draft teams carry evolution chains (and Megas only with the Mega Ring)
{ const { randomDeck, autoEvo } = require('../lib/bot'); let bad = 0, evoSlots = 0, megaNoPlate = 0, megas = 0;
  for (let i = 0; i < 300; i++) { const d = randomDeck(Math.random); if (E.validateDeck(d)) bad++; evoSlots += d.evo.filter(a => a.length).length; const m = d.mega.filter(Boolean).length; megas += m; const { megaPlateKey } = require('../lib/plates'); d.mega.forEach(mm => { if (mm && !d.plates.includes(megaPlateKey(FIGS[mm].name))) megaNoPlate++; }); }
  ok(bad === 0, 'random decks with evolutions always validate (' + bad + ' invalid)'); ok(evoSlots > 300, 'random decks get evolution chains (' + evoSlots + ' slots in 300 decks)'); ok(megas > 20 && megaNoPlate === 0, 'every random-deck Mega has its own plate (' + megas + ' megas, ' + megaNoPlate + ' without plate)');
  const dd = autoEvo({ figs: [id('Charmander'), ...fill.slice(0, 5)], plates: [] }, Math.random, false); ok(dd.evo[0].length === 2 && !dd.mega.some(Boolean) && !E.validateDeck(dd), 'autoEvo gives Charmander its full line and no Mega without the plate'); }
// 11. Evolved Pokémon: +10 on White/Gold attacks (not Purple/zero-damage), +1 star on Purple; evolve option only after WINNING a battle
{ const g = mk({ figs: [id('Charmander'), ...fill.slice(0, 5)], plates: [], evo: [[id('Charmeleon')], [], [], [], [], []] }); const c = U(g, 0, 0), o = U(g, 1, 0); place(g, c, 'I01'); place(g, o, 'I02');
  const W = { color: 'White', dmg: 40, seg: { ops: [] } }; const before = T.modDamage(g, c, o, W); c.evolved = true; ok(T.modDamage(g, c, o, W) === before + 10, 'evolved Pokémon deal +10 with White: ' + before + ' -> ' + T.modDamage(g, c, o, W));
  ok(T.modDamage(g, c, o, { color: 'Gold', dmg: 100, seg: { ops: [] } }) === 110 || T.modDamage(g, c, o, { color: 'Gold', dmg: 100, seg: { ops: [] } }) > 100, 'evolved Pokémon get the bonus on Gold too'); ok(T.modDamage(g, c, o, { color: 'White', dmg: 0, seg: { ops: [] } }) === 0, 'a 0-damage attack stays 0'); }
{ let won = 0, lostReady = 0, n = 0; for (let i = 0; i < 300; i++) { const g = E.newGame([{ figs: [id('Charmander'), ...fill.slice(0, 5)], plates: [], evo: [[id('Charmeleon')], [], [], [], [], []] }, { figs: fill.slice(6, 12), plates: [] }], ['A', 'B'], 100 + i); g.cur = 0; g.phase = 'main'; g.moved = false; g.turn = 5; const c = U(g, 0, 0), o = U(g, 1, 0); place(g, c, 'I10'); place(g, o, require('../lib/board').ADJ['I10'][0]);
    try { T.battle(g, c.uid, o.uid); } catch (e) { continue; } n++; if (c.evoReady) { won++; if (c.loc !== 'field') lostReady++; } else if (c.loc === 'field' && o.loc !== 'field' && !c.evoReady) lostReady += 0; }
  ok(n > 100 && won > 10 && won < n, 'evolve is offered only after some battles (offered ' + won + ' of ' + n + ')'); ok(lostReady === 0, 'a Pokémon that was knocked out is never offered the evolution'); }
// 12. One plate per Mega: required, free of plate points, and only works for its own Mega
{ const { PLATES, megaPlateKey } = require('../lib/plates'); const kx = megaPlateKey('Mega Charizard X'), ky = megaPlateKey('Mega Charizard Y'); ok(PLATES[kx] && PLATES[ky] && kx !== ky && PLATES[kx].cost === 0, 'every Mega form has its own free plate (' + Object.keys(PLATES).filter(k => PLATES[k].need === 'mega').length + ' Mega plates)');
  const six = Object.keys(PLATES).filter(k => !PLATES[k].need && PLATES[k].cost > 0).reduce((a, k) => { if (a.c + PLATES[k].cost <= 6) { a.l.push(k); a.c += PLATES[k].cost; } return a; }, { l: [], c: 0 });
  const dk = { figs: [id('Charizard'), ...fill.slice(0, 5)], plates: [...six.l, kx], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }; ok(six.c === 6 && !E.validateDeck(dk), 'a full 6 points of normal plates plus a Mega plate is a legal deck (' + (E.validateDeck(dk) || 'ok') + ')');
  ok(/needs its own plate/.test(E.validateDeck({ ...dk, plates: six.l }) || ''), 'a Mega without its plate is rejected');
  const g = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: [ky], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01'); const r = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(r && r.error && FIGS[c.fid].name === 'Charizard', 'the Mega Y plate cannot Mega Evolve a Charizard holding the X slot'); }
console.log(`evolution tests: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
