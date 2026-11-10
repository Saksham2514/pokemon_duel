'use strict';
// Mini Arena: board sanity + full bot-vs-bot games on the mini board (no exceptions, games finish, board stays isolated from the classic one).
const E = require('../lib/engine'); const B = require('../lib/board'); const bot = require('../lib/bot'); const { LIST } = require('../lib/figures');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const M = B.BOARDS.mini, C = B.BOARDS.classic;
ok(M.POINTS.length === 13 && Object.keys(M.XY).length === 15, 'mini board: 13 route points + 2 goals');
for (const [k, b] of Object.entries(B.BOARDS)) {
  const sym = Object.entries(b.ADJ).every(([a, ns]) => ns.every(n => b.ADJ[n].includes(a))); ok(sym, k + ': adjacency is symmetric');
  B.use(k); for (const seat of [0, 1]) { const goal = b.GOALS[seat]; ok(b.ENTRY[seat].every(e => e in B.bfs(goal)), k + ': goal ' + goal + ' reachable from every entry of seat ' + seat); ok(!b.ENTRY[seat].includes(goal), k + ': entry points are not goals'); }
  ok(b.ENTRY[0].every(e => !b.ENTRY[1].includes(e)), k + ': entries are distinct');
  const d0 = B.bfs(b.ENTRY[0][0])[b.GOALS[0]], d1 = B.bfs(b.ENTRY[1][0])[b.GOALS[1]]; ok(d0 === d1, k + ': the board is fair (distance entry→goal ' + d0 + ' = ' + d1 + ')');
  ok(Object.values(b.ADJ).every(ns => ns.length >= 2), k + ': every point has at least 2 neighbours');
  const sx = Object.values(b.XY).reduce((a, p) => a + p.x, 0) / Object.keys(b.XY).length; ok(Math.abs(sx - 297) < 1, k + ': board is centred on x=297 (rotation for seat 1 stays aligned)');
}
B.use('classic'); ok(B.POINTS.length === 26, 'classic board restored');
// whole games
const pool = LIST.filter(f => f.mp >= 1 && !/^(Mega|Primal|Shiny) /.test(f.name)); let sd = 7; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
const mk = () => { const o = [], used = {}; while (o.length < 6) { const f = pool[(rnd() * pool.length) | 0]; const b = f.name.split(' ')[0]; if (used[b]) continue; used[b] = 1; o.push(f.id); } return { figs: o, plates: [] }; };
let fin = 0, exc = 0, n = 120, mixed = 0;
for (let i = 0; i < n; i++) {
  const board = i % 4 === 3 ? 'classic' : 'mini'; let g;
  try {
    g = E.newGame([mk(), mk()], ['A', 'B'], i + 1, { board, randomStart: true, crazy: i % 5 === 0, bots: [true, true] }); ok(g.board === board, 'game remembers its board');
    for (let st = 0; st < 400 && !g.over; st++) {
      const seat = g.phase === 'choose' ? g.pending.task.seat : g.cur; const v = E.view(g, seat); if (v.board !== board) mixed++;
      const a = bot.botAct(g, seat, rnd, 0.4, null); if (!a) { E.apply(g, seat, { t: 'pass' }); continue; } const r = E.apply(g, seat, a); if (r && r.error) E.apply(g, seat, { t: 'pass' });
    }
    if (g.over) fin++;
  } catch (e) { exc++; if (exc < 3) console.log(e.stack.split('\n').slice(0, 4).join(' | ')); }
}
ok(exc === 0, 'no exceptions in ' + n + ' games (' + exc + ')'); ok(fin >= n * 0.9, 'games finish (' + fin + '/' + n + ')'); ok(mixed === 0, 'views always carry the right board');
console.log(`mini arena tests: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
