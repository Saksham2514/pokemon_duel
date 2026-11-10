'use strict';
// Mini Arena through the real server: mini and classic queues never mix; the mini game carries its board to both clients.
const { spawn } = require('child_process'); const WebSocket = require('ws'); const { LIST } = require('../lib/figures');
const srv = spawn('node', ['server.js'], { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, PORT: 3117, DUEL_DB: '/tmp/mini_e2e.db' }, cwd: __dirname + '/..' });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } }; const wait = ms => new Promise(r => setTimeout(r, ms));
const conn = () => new Promise(res => { const ws = new WebSocket('ws://localhost:3117'); const msgs = []; ws.on('message', m => msgs.push(JSON.parse(m))); ws.on('open', () => res({ ws, msgs })); });
const ids = LIST.filter(f => f.mp >= 1 && !/^(Mega|Primal|Shiny) /.test(f.name)); const mk = o => { const d = [], u = {}; for (const f of ids.slice(o)) { const b = f.name.split(' ')[0]; if (u[b]) continue; u[b] = 1; d.push(f.id); if (d.length === 6) break; } return { figs: d, plates: [] }; };
(async () => { await wait(1500);
  const a = await conn(), b = await conn(), c = await conn();
  a.ws.send(JSON.stringify({ t: 'quick', mini: true, name: 'A', deck: mk(10) })); await wait(300);
  c.ws.send(JSON.stringify({ t: 'quick', name: 'C', deck: mk(30) })); await wait(500);
  ok(!c.msgs.some(m => m.t === 'start') && !a.msgs.some(m => m.t === 'start'), 'a classic queue does not match a Mini Arena player');
  b.ws.send(JSON.stringify({ t: 'quick', mini: true, name: 'B', deck: mk(50) })); await wait(1500);
  const sa = a.msgs.filter(m => m.t === 'state').pop(), sb = b.msgs.filter(m => m.t === 'state').pop();
  ok(a.msgs.some(m => m.t === 'start') && b.msgs.some(m => m.t === 'start'), 'two Mini Arena players are matched');
  ok(sa && sb && sa.v.board === 'mini' && sb.v.board === 'mini', 'both clients receive board = mini');
  const cur = sa && sa.v.cur === sa.v.seat ? a : b; const sv = (cur === a ? sa : sb).v; const mv = Object.entries(sv.legal.moves)[0];
  ok(!!mv, 'the player to move has legal moves on the mini board'); if (mv) { const dest = mv[1][0]; ok(sv.figs && Object.keys(sa.v.figs).length > 0, 'figures listed'); cur.ws.send(JSON.stringify({ t: 'move', uid: +mv[0], to: dest })); await wait(600); ok(!cur.msgs.some(m => m.t === 'err'), 'a move on the mini board is accepted'); }
  const dd = await new Promise(r => { const http = require('http'); http.get('http://localhost:3117/api/data', x => { let s = ''; x.on('data', d => s += d); x.on('end', () => r(JSON.parse(s))); }); });
  ok(dd.boards && dd.boards.mini && dd.boards.classic && dd.boards.mini.points.length === 13 && dd.boards.classic.points.length === 26, '/api/data lists both boards');
  console.log(`mini e2e tests: ${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0); })();
