'use strict';
// Draft: 3 rounds, pick 1 of 2; the card you leave goes to the opponent => each final team = 3 own picks + 3 opponent leftovers.
const { spawn } = require('child_process'); const WebSocket = require('ws');
const srv = spawn('node', ['server.js'], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PORT: 3115, DUEL_DB: '/tmp/draft_flow.db' }, cwd: __dirname + '/..' });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } }; const wait = ms => new Promise(r => setTimeout(r, ms));
const conn = () => new Promise(res => { const ws = new WebSocket('ws://localhost:3115'); const msgs = []; ws.on('message', m => msgs.push(JSON.parse(m))); ws.on('open', () => res({ ws, msgs })); });
(async () => { await wait(1500);
  const a = await conn(), b = await conn(); const deck = { figs: [], plates: [] };
  a.ws.send(JSON.stringify({ t: 'quick', draft: true, name: 'A', deck })); await wait(300); b.ws.send(JSON.stringify({ t: 'quick', draft: true, name: 'B', deck })); await wait(1200);
  const offers = [[], []], picked = [[], []]; let rounds = 0;
  for (let r = 0; r < 3; r++) {
    for (const [i, c] of [a, b].entries()) { const m = c.msgs.filter(x => x.t === 'draft').pop(); ok(m && m.round === r && m.total === 3 && m.options.length === 2, 'round ' + (r + 1) + ' of 3, two options for ' + 'AB'[i]); offers[i].push(m.options); picked[i].push(r % 2); c.ws.send(JSON.stringify({ t: 'draftPick', idx: r % 2 })); }
    await wait(1400); rounds++;
  }
  await wait(800);
  const da = a.msgs.find(x => x.t === 'draftDone'), db = b.msgs.find(x => x.t === 'draftDone'); ok(da && db, 'draft completes after 3 rounds');
  const mineA = offers[0].map((o, r) => o[picked[0][r]]), leftA = offers[0].map((o, r) => o[1 - picked[0][r]]), mineB = offers[1].map((o, r) => o[picked[1][r]]), leftB = offers[1].map((o, r) => o[1 - picked[1][r]]);
  ok(JSON.stringify(da.mine) === JSON.stringify(mineA) && JSON.stringify(db.mine) === JSON.stringify(mineB), 'draftDone reports each player\'s own 3 picks');
  ok(da.received === 3 && db.received === 3 && !('theirs' in da), 'the 3 received Pokémon are not revealed in the draft summary');
  await wait(5200);
  const sa = a.msgs.filter(x => x.t === 'state').pop(); ok(!!sa, 'the duel starts');
  if (sa) { const mineIds = sa.v.figs.filter(f => f.owner === sa.v.seat).map(f => f.fid).sort((x, y) => x - y), exp = [...mineA, ...leftB].sort((x, y) => x - y);
    ok(JSON.stringify(mineIds) === JSON.stringify(exp), 'A\'s team = A\'s 3 picks + the 3 cards B left (' + mineIds + ' vs ' + exp + ')');
    const sb = b.msgs.filter(x => x.t === 'state').pop(); const idsB = sb.v.figs.filter(f => f.owner === sb.v.seat).map(f => f.fid).sort((x, y) => x - y); ok(JSON.stringify(idsB) === JSON.stringify([...mineB, ...leftA].sort((x, y) => x - y)), 'B\'s team = B\'s 3 picks + the 3 cards A left'); }
  console.log(`draft flow tests: ${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0); })();
