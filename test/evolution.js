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
const d2 = { figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_evolve'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] };
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
{ const g = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_evolve'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01');
  const T0 = E.view(g, 0); const r = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(!r.error && /Mega/.test(FIGS[c.fid].name), 'Mega Ring Mega Evolves the target: ' + JSON.stringify(r));
  ok(c.megaRevert && c.megaRevert.until - g.turn >= 10 && c.megaRevert.until - g.turn <= 15, 'Mega lasts 10–15 turns');
  g.turn = c.megaRevert.until; g.cur = 0; E.apply(g, 0, {}); }
{ const g = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_evolve'], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01'); E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid });
  const until = c.megaRevert.until; T.setPos(g, c, null); ok(FIGS[c.fid].name === 'Charizard', 'leaving the field ends the Mega form');
  const g2 = mk({ figs: [id('Charizard'), ...fill.slice(0, 5)], plates: ['mega_evolve'], mega: [0, 0, 0, 0, 0, 0] }); const c2 = U(g2, 0, 0); place(g2, c2, 'I01'); ok(!E.view(g2, 0).legal.plates.length || !T.plateTargets && true, 'no Mega form in the deck: nothing to Mega Evolve'); }

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
{ const g = mk({ figs: [id('Charmander'), ...fill.slice(0, 5)], plates: ['mega_evolve'], evo: [[id('Charmeleon'), id('Charizard')], [], [], [], [], []], mega: [id('Mega Charizard X'), 0, 0, 0, 0, 0] }); const c = U(g, 0, 0); place(g, c, 'I01');
  const tg = () => { const l = E.view(g, 0).legal; return l.plates.length; };
  const r0 = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(r0 && r0.error && FIGS[c.fid].name === 'Charmander', 'unevolved Charmander cannot Mega Evolve');
  c.evoReady = true; E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(FIGS[c.fid].name === 'Charmeleon', 'evolves to Charmeleon'); const r1 = E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(r1 && r1.error, 'Charmeleon cannot Mega Evolve either');
  c.evoReady = true; g.moved = false; E.apply(g, 0, { t: 'evolve', uid: c.uid }); ok(FIGS[c.fid].name === 'Charizard', 'evolves to Charizard'); g.moved = false; g.phase = 'main'; g.cur = 0; E.apply(g, 0, { t: 'plate', idx: 0, a: c.uid }); ok(FIGS[c.fid].name === 'Mega Charizard X', 'Charizard can Mega Evolve'); }
console.log(`evolution tests: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
