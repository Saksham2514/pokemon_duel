'use strict';
// Picture proxy: fetched once from upstream, then served from the server with permanent caching; falls back to a redirect if upstream is down.
const http = require('http'); const { spawn } = require('child_process'); const fs = require('fs');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } }; const wait = ms => new Promise(r => setTimeout(r, ms));
let hits = 0; const jpg = Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex');
const up = http.createServer((q, r) => { hits++; if (/\/duel\/figures\/th\/2\.jpg$/.test(q.url)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'image/jpeg' }); r.end(jpg); }).listen(3116);
const dir = __dirname + '/../data/pics'; fs.rmSync(dir, { recursive: true, force: true });
const srv = spawn('node', ['server.js'], { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, PORT: 3117, DUEL_DB: '/tmp/pics.db', PIC_ORIGIN: 'http://localhost:3116', PIC_PREFETCH: '0' }, cwd: __dirname + '/..' });
(async () => { await wait(1500);
  const get = p => fetch('http://localhost:3117' + p, { redirect: 'manual' });
  const d = await (await get('/api/data')).json(); ok(d.figures[0].picture === '/pic/' + d.figures[0].id + '.jpg', 'figures point at the local picture route');
  const r1 = await get('/pic/1.jpg'); ok(r1.status === 200 && r1.headers.get('content-type') === 'image/jpeg' && /immutable/.test(r1.headers.get('cache-control')) && (await r1.arrayBuffer()).byteLength === jpg.length, 'first request fetched from upstream and served with immutable caching');
  const r2 = await get('/pic/1.jpg'); await r2.arrayBuffer(); ok(r2.status === 200 && hits === 1, 'second request served from the cache (upstream hit once)');
  const r3 = await get('/pic/2.jpg'); ok(r3.status === 302 && /serebii|duel\/figures/.test(r3.headers.get('location') || ''), 'upstream error -> redirect to the original link');
  const r4 = await get('/pic/999999.jpg'); ok(r4.status === 404, 'unknown id -> 404');
  await wait(300); ok(fs.existsSync(dir + '/1.img'), 'picture also stored on disk for restarts');
  fs.mkdirSync(__dirname + '/../pics', { recursive: true }); fs.writeFileSync(__dirname + '/../pics/7.jpg', Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9bb', 'hex'));
  const before = hits; const r5 = await get('/pic/7.jpg'); ok(r5.status === 200 && (await r5.arrayBuffer()).byteLength === jpg.length + 1 && hits === before, 'a picture committed to pics/ is served without touching upstream'); fs.rmSync(__dirname + '/../pics/7.jpg');
  console.log(`picture proxy tests: ${pass} passed, ${fail} failed`); srv.kill(); up.close(); fs.rmSync(dir, { recursive: true, force: true }); process.exit(fail ? 1 : 0); })();
