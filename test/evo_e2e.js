'use strict';
// Real WebSocket game with an evolution deck: waits for the Evolve option after a battle, evolves, and checks the form changed.
const { spawn } = require('child_process'); const WebSocket = require('ws'); const { LIST } = require('../lib/figures'); const { botDeck } = require('../lib/bot');
const srv = spawn('node', ['server.js'], { env: { ...process.env, PORT: 3112, DUEL_DB: '/tmp/evo_e2e.db' }, cwd: __dirname + '/..' });
const id = n => LIST.find(f => f.name === n).id;
setTimeout(() => {
  const d = botDeck(Math.random); d.figs = d.figs.slice(); d.figs[0] = id('Charmander'); d.figs = d.figs.filter((x, i) => i === 0 || x !== d.figs[0]);
  while (d.figs.length < 6) d.figs.push(LIST[(Math.random() * LIST.length) | 0].id);
  d.evo = [[id('Charmeleon'), id('Charizard')], [], [], [], [], []]; d.mega = [0, 0, 0, 0, 0, 0];
  const ws = new WebSocket('ws://localhost:3112'); let seat = 0, evolved = 0, sent = null, beforeFid = null, ok = null;
  ws.on('open', () => ws.send(JSON.stringify({ t: 'bot', name: 'EvoTester', deck: d })));
  ws.on('message', raw => { const m = JSON.parse(raw);
    if (m.t === 'room') seat = m.seat; if (m.t === 'err') console.log('ERR', m.msg);
    if (m.t !== 'state') return; const v = m.v;
    if (sent) { const f = v.figs.find(x => x.uid === sent.uid); if (f && f.fid !== beforeFid) { console.log('EVOLVED OK ->', f.fid, 'evoFx', JSON.stringify(v.evoFx)); finish(0); } }
    if (v.over) { console.log('game over before evolving (no Charmander battle?)', v.reason); return finish(2); }
    if (v.legal && v.legal.choose) return ws.send(JSON.stringify({ t: 'act', a: { t: 'choose', to: v.legal.choose.options[0] } }));
    if (v.cur === seat && v.legal) {
      if (v.legal.evolve && v.legal.evolve.length && !sent) { const e = v.legal.evolve[0]; sent = e; beforeFid = v.figs.find(x => x.uid === e.uid).fid; console.log('Evolve offered', JSON.stringify(e)); return ws.send(JSON.stringify({ t: 'act', a: { t: 'evolve', uid: e.uid } })); }
      if (v.phase === 'battleChoice') return ws.send(JSON.stringify({ t: 'act', a: { t: 'battle', target: v.legal.battle[0] } }));
      const uids = Object.keys(v.legal.moves); if (!uids.length) return; const u = uids[(Math.random() * uids.length) | 0]; ws.send(JSON.stringify({ t: 'act', a: { t: 'move', uid: +u, to: v.legal.moves[u][(Math.random() * v.legal.moves[u].length) | 0] } }));
    } });
  function finish(c) { ws.close(); srv.kill(); process.exit(c); }
}, 1000);
setTimeout(() => { console.log('TIMEOUT'); srv.kill(); process.exit(1); }, 100000);
