'use strict';
// Collection PvP ownership checks with evolution/Mega decks, over real HTTP + WebSocket.
const { spawn } = require('child_process'); const WebSocket = require('ws'); const { LIST } = require('../lib/figures');
const srv = spawn('node', ['server.js'], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PORT: 3113, DUEL_DB: '/tmp/pvp_evo.db' }, cwd: __dirname + '/..' });
const id = n => LIST.find(f => f.name === n).id; let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const H = 'http://localhost:3113'; const J = async (p, method, body, tok) => { const r = await fetch(H + p, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
const filler = LIST.filter(f => !f.rules.length && !/Char/.test(f.name)).slice(0, 12).map(f => f.id);
async function account(name, extraOwned, plates) { name += (Date.now() % 100000); const r = await J('/api/register', 'POST', { name, pass: 'pass1234' }); const owned = {}; filler.forEach(i => owned[i] = 1); extraOwned.forEach(i => owned[i] = 1); await J('/api/save', 'PUT', { save: { coins: 0, plates: plates, owned, decks: [], active: 0, beaten: {}, wins: 0, losses: 0 } }, r.token); return r.token; }
const conn = () => new Promise(res => { const ws = new WebSocket('ws://localhost:3113'); const msgs = []; ws.on('message', m => msgs.push(JSON.parse(m))); ws.on('open', () => res({ ws, msgs })); });
const wait = ms => new Promise(r => setTimeout(r, ms));
const deck = (mega, plates) => ({ figs: [id('Charmander'), ...filler.slice(0, 5)], plates, evo: [[id('Charmeleon'), id('Charizard')], [], [], [], [], []], mega: [mega ? id('Mega Charizard X') : 0, 0, 0, 0, 0, 0] });
(async () => { await wait(1500);
  const full = [id('Charmander'), id('Charmeleon'), id('Charizard'), id('Mega Charizard X')];
  const A = await account('pvpA', full, { mega_evolve: 1 }), B = await account('pvpB', LIST.slice(0, 0), {});
  // 1. owns everything -> can create a room and a second player can join; game starts with the evolution queue
  const a = await conn(); a.ws.send(JSON.stringify({ t: 'create', owned: true, auth: A, name: 'pvpA', deck: deck(true, ['mega_evolve']) })); await wait(500);
  const room = a.msgs.find(m => m.t === 'room'); ok(room && !a.msgs.some(m => m.t === 'err'), 'owner of the whole line can create a Collection PvP room: ' + JSON.stringify(a.msgs.filter(m => m.t === 'err')));
  const bDeck = { figs: filler.slice(0, 6), plates: [] }; const b = await conn(); b.ws.send(JSON.stringify({ t: 'join', owned: true, auth: B, name: 'pvpB', code: room.code, deck: bDeck })); await wait(800);
  ok(b.msgs.some(m => m.t === 'state'), 'second player joins and the game starts');
  const st = a.msgs.filter(m => m.t === 'state').pop(); ok(st && st.v.figs.some(f => f.owner === room.seat && f.evo), 'my Charmander is flagged as having an evolution queue');
  a.ws.close(); b.ws.close();
  // 2. missing Charmeleon in the collection
  const C = await account('pvpC', [id('Charmander'), id('Charizard'), id('Mega Charizard X')], { mega_evolve: 1 }); const c = await conn(); c.ws.send(JSON.stringify({ t: 'create', owned: true, auth: C, name: 'pvpC', deck: deck(true, ['mega_evolve']) })); await wait(500);
  const e2 = c.msgs.find(m => m.t === 'err'); ok(e2 && /Charmeleon/.test(e2.msg), 'room refused when an evolution stage is not owned: ' + (e2 && e2.msg)); c.ws.close();
  // 3. missing Mega form
  const D = await account('pvpD', [id('Charmander'), id('Charmeleon'), id('Charizard')], { mega_evolve: 1 }); const d = await conn(); d.ws.send(JSON.stringify({ t: 'create', owned: true, auth: D, name: 'pvpD', deck: deck(true, ['mega_evolve']) })); await wait(500);
  const e3 = d.msgs.find(m => m.t === 'err'); ok(e3 && /Mega Charizard X/.test(e3.msg), 'room refused when the Mega form is not owned: ' + (e3 && e3.msg)); d.ws.close();
  // 4. missing Mega Ring plate
  const E = await account('pvpE', full, {}); const e = await conn(); e.ws.send(JSON.stringify({ t: 'create', owned: true, auth: E, name: 'pvpE', deck: deck(true, ['mega_evolve']) })); await wait(500);
  const e4 = e.msgs.find(m => m.t === 'err'); ok(e4 && /Mega Ring/.test(e4.msg), 'room refused without the Mega Ring plate: ' + (e4 && e4.msg)); e.ws.close();
  // 5. a copy cannot be used twice (one Charmeleon owned, listed on two slots)
  const F = await account('pvpF', full, {}); const f = await conn(); const dd = deck(false, []); dd.figs[1] = id('Charmeleon'); dd.figs = dd.figs.slice(0, 6); f.ws.send(JSON.stringify({ t: 'create', owned: true, auth: F, name: 'pvpF', deck: dd })); await wait(500);
  const e5 = f.msgs.find(m => m.t === 'err'); ok(!!e5, 'owning one Charmeleon cannot cover it being both a slot and an evolution: ' + (e5 && e5.msg)); f.ws.close();
  console.log(`pvp evolution tests: ${pass} passed, ${fail} failed`); srv.kill(); process.exit(fail ? 1 : 0); })();
