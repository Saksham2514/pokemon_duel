'use strict';
// Persistence. Accounts, sessions and campaign saves are kept in memory for speed and written through to a SQLite database.
//  - Production (survives restarts): a free Turso (hosted SQLite) database -> set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
//  - Otherwise: a local SQLite file, data/duel.sqlite (override with DUEL_DB).
const path = require('path'), crypto = require('crypto'), fs = require('fs');
const { createClient } = require('@libsql/client');

const remote = !!process.env.TURSO_DATABASE_URL;
let client;
if (remote) client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
else { const file = process.env.DUEL_DB || path.join(__dirname, '..', 'data', 'duel.sqlite'); fs.mkdirSync(path.dirname(file), { recursive: true }); client = createClient({ url: 'file:' + file }); }

const users = new Map();      // lower-case name -> row
const sessions = new Map();   // token -> name
const dirtyUsers = new Set(), newSessions = [];
let flushing = null, timer = null, lastError = null;
const key = n => String(n || '').toLowerCase();

async function init() {
  await client.batch([
    'CREATE TABLE IF NOT EXISTS users(name TEXT PRIMARY KEY COLLATE NOCASE, salt TEXT, hash TEXT, save TEXT, updated INTEGER, created INTEGER, tower INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, result TEXT, pvp_w INTEGER DEFAULT 0, pvp_l INTEGER DEFAULT 0)',
    'CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, name TEXT, created INTEGER)',
  ], 'write');
  for (const col of ['pvp_w', 'pvp_l']) { try { await client.execute(`ALTER TABLE users ADD COLUMN ${col} INTEGER DEFAULT 0`); } catch (e) { } }
  const u = await client.execute('SELECT name,salt,hash,save,updated,created,tower,wins,result,pvp_w,pvp_l FROM users');
  for (const r of u.rows) users.set(key(r.name), { name: r.name, salt: r.salt, hash: r.hash, save: r.save, updated: +r.updated || 0, created: +r.created || 0, tower: +r.tower || 0, wins: +r.wins || 0, result: r.result, pvp_w: +r.pvp_w || 0, pvp_l: +r.pvp_l || 0 });
  const s = await client.execute('SELECT token,name FROM sessions');
  for (const r of s.rows) sessions.set(r.token, r.name);
  console.log(`Database ready (${remote ? 'Turso' : 'local file'}): ${users.size} accounts, ${sessions.size} sessions.`);
}

// ---- write-behind
function schedule() { if (timer) return; timer = setTimeout(() => { timer = null; flush(); }, 250); }
function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      while (dirtyUsers.size || newSessions.length) {
        const names = [...dirtyUsers]; dirtyUsers.clear(); const ses = newSessions.splice(0);
        const stmts = [];
        for (const k of names) { const u = users.get(k); if (!u) continue; stmts.push({ sql: 'INSERT INTO users(name,salt,hash,save,updated,created,tower,wins,result,pvp_w,pvp_l) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(name) DO UPDATE SET save=excluded.save, updated=excluded.updated, tower=excluded.tower, wins=excluded.wins, result=excluded.result, pvp_w=excluded.pvp_w, pvp_l=excluded.pvp_l', args: [u.name, u.salt, u.hash, u.save, u.updated, u.created, u.tower, u.wins, u.result, u.pvp_w, u.pvp_l] }); }
        for (const t of ses) stmts.push({ sql: 'INSERT OR REPLACE INTO sessions(token,name,created) VALUES(?,?,?)', args: [t.token, t.name, t.created] });
        try { if (stmts.length) await client.batch(stmts, 'write'); lastError = null; }
        catch (e) { lastError = e; console.error('DB write failed, will retry:', e.message); names.forEach(k => dirtyUsers.add(k)); newSessions.unshift(...ses); await new Promise(r => setTimeout(r, 2000)); }
      }
    } finally { flushing = null; }
  })();
  return flushing;
}
const markUser = k => { dirtyUsers.add(k); schedule(); };

// ---- accounts
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const clean = n => String(n || '').trim().slice(0, 20);
function register(name, pw) {
  name = clean(name); pw = String(pw || '');
  if (!/^[A-Za-z0-9_ .-]{3,20}$/.test(name)) return { error: 'Name must be 3-20 letters/numbers.' };
  if (pw.length < 4 || pw.length > 64) return { error: 'Passcode must be 4-64 characters.' };
  if (users.has(key(name))) return { error: 'That name is taken.' };
  const salt = crypto.randomBytes(12).toString('hex');
  users.set(key(name), { name, salt, hash: hash(pw, salt), save: null, updated: Date.now(), created: Date.now(), tower: 0, wins: 0, result: null, pvp_w: 0, pvp_l: 0 });
  markUser(key(name));
  return session(name);
}
function login(name, pw) {
  const u = users.get(key(clean(name)));
  if (!u || !crypto.timingSafeEqual(Buffer.from(hash(String(pw || ''), u.salt)), Buffer.from(u.hash))) return { error: 'Wrong name or passcode.' };
  return session(u.name);
}
function session(name) { const token = crypto.randomBytes(24).toString('hex'); sessions.set(token, name); newSessions.push({ token, name, created: Date.now() }); schedule(); return { token, name }; }
const who = token => { const n = token && sessions.get(String(token)); return n && users.has(key(n)) ? users.get(key(n)).name : null; };
const getSave = name => { const u = users.get(key(name)); try { return u && u.save ? JSON.parse(u.save) : null; } catch (e) { return null; } };
function putSave(name, s) {
  const u = users.get(key(name)); if (!u) return false; const j = JSON.stringify(s); if (j.length > 400000) return false;
  u.save = j; u.updated = Date.now(); u.tower = +(s.tower && s.tower.best) || 0; u.wins = +s.wins || 0; markUser(key(name)); return true;
}
function setResult(name, r) { const u = users.get(key(name)); if (u) { u.result = JSON.stringify(r); markUser(key(name)); } }
function takeResult(name) { const u = users.get(key(name)); if (!u || !u.result) return null; const r = u.result; u.result = null; markUser(key(name)); try { return JSON.parse(r); } catch (e) { return null; } }
const leaderboard = () => [...users.values()].filter(u => u.tower > 0 || u.wins > 0).sort((a, b) => b.tower - a.tower || b.wins - a.wins).slice(0, 20).map(u => ({ name: u.name, tower: u.tower, wins: u.wins }));
function addPvp(name, win) { const u = users.get(key(name)); if (!u) return; if (win) u.pvp_w++; else u.pvp_l++; markUser(key(name)); }
const pvpInfo = name => { const u = users.get(key(name)); return { me: u ? { w: u.pvp_w, l: u.pvp_l } : { w: 0, l: 0 }, top: [...users.values()].filter(x => x.pvp_w > 0).sort((a, b) => b.pvp_w - a.pvp_w || a.pvp_l - b.pvp_l).slice(0, 10).map(x => ({ name: x.name, w: x.pvp_w, l: x.pvp_l })) }; };
module.exports = { init, flush, addPvp, pvpInfo, register, login, who, getSave, putSave, setResult, takeResult, leaderboard, status: () => ({ remote, accounts: users.size, pending: dirtyUsers.size + newSessions.length, lastError: lastError && lastError.message }) };
