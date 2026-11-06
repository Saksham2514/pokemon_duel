'use strict';
// Leaving a draft: the other player is told, the room is removed, and no game starts afterwards.
const { spawn } = require('child_process'); const WebSocket = require('ws');
const srv = spawn('node', ['server.js'], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PORT: 3114, DUEL_DB: '/tmp/draft_leave.db' }, cwd: __dirname + '/..' });
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } }; const wait = ms => new Promise(r => setTimeout(r, ms));
const conn = () => new Promise(res => { const ws = new WebSocket('ws://localhost:3114'); const msgs = []; ws.on('message', m => msgs.push(JSON.parse(m))); ws.on('open', () => res({ ws, msgs })); });
(async () => { await wait(1500);
  const a = await conn(), b = await conn(); const deck = { figs: [], plates: [] };
  a.ws.send(JSON.stringify({ t: 'quick', draft: true, name: 'A', deck })); await wait(300); b.ws.send(JSON.stringify({ t: 'quick', draft: true, name: 'B', deck })); await wait(1200);
  ok(a.msgs.some(m => m.t === 'draft') && b.msgs.some(m => m.t === 'draft'), 'both players are in the draft');
  a.ws.send(JSON.stringify({ t: 'leaveDraft' })); await wait(600);
  ok(b.msgs.some(m => m.t === 'draftLeft'), 'the opponent is told that A left the draft');
  await wait(1500); ok(!b.msgs.some(m => m.t === 'start' || m.t === 'state'), 'no game starts after someone leaves');
  console.log(`draft leave tests: ${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0); })();
