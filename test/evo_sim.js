'use strict';
// Engine-level games: seat 0 has an evolution deck (Charmander line) and both sides are bots. Checks evolutions actually happen and nothing throws.
const E = require('../lib/engine'); const { LIST } = require('../lib/figures'); const { botDeck, botAct } = require('../lib/bot');
const id = n => LIST.find(f => f.name === n).id; let evolved = 0, games = 0, fin = 0, errs = 0;
for (let n = 0; n < 60; n++) {
  const d0 = botDeck(Math.random), d1 = botDeck(Math.random);
  d0.figs = [id('Charmander'), id('Squirtle'), id('Bulbasaur'), ...d0.figs.filter(x => ![id('Charmander'), id('Squirtle'), id('Bulbasaur')].includes(x))].slice(0, 6);
  d0.evo = [[id('Charmeleon'), id('Charizard')], [id('Wartortle'), id('Blastoise')], [id('Ivysaur'), id('Venusaur')], [], [], []]; d0.mega = [0, 0, 0, 0, 0, 0];
  let g; try { g = E.newGame([d0, d1], ['A', 'B']); } catch (e) { console.log('newGame', e.message); errs++; continue; } games++;
  let guard = 0; while (!g.over && guard++ < 4000) { const who = g.phase === 'choose' ? g.pending.task.seat : g.cur; const lv = E.view(g, who).legal; const r = lv && lv.choose ? { t: 'choose', to: lv.choose.options[0] } : botAct(g, who, Math.random, 0.5); if (!r) break; const res = E.apply(g, who, r); if (res && res.error) { errs++; if (errs < 5) console.log('ERR', JSON.stringify(r), res.error); break; } }
  if (g.over) fin++; else if (!global.__p) { global.__p = 1; console.log('unfinished: phase', g.phase, 'cur', g.cur, 'turn', g.turn, 'guard', guard, 'legal', JSON.stringify(Object.keys(E.view(g, g.cur).legal || {}))); } evolved += Object.values(g.figs).filter(f => f.evolved).length;
}
console.log({ games, finished: fin, errs, evolved }); process.exit(errs || !evolved ? 1 : 0);
