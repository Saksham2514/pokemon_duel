'use strict';
const $ = s => document.querySelector(s);
const el = (tag, attrs, ...kids) => { const e = document.createElement(tag); for (const k in attrs || {}) { if (attrs[k] == null || attrs[k] === false) continue; if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } kids.flat().forEach(c => e.append(c && c.nodeType ? c : document.createTextNode(c == null ? '' : c))); return e; };
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, ...kids) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs || {}) { if (k === 'href') e.setAttributeNS('http://www.w3.org/1999/xlink', 'href', attrs[k]); else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } kids.flat().forEach(c => e.append(c && c.nodeType ? c : document.createTextNode(c == null ? '' : c))); return e; };
const COL = { White: '#f2f2f2', Red: '#e0453a', Blue: '#3a7be0', Purple: '#9b59d0', Gold: '#e6b800', Pink: '#f78fb3' };
const CLS = { White: 'cW', Red: 'cR', Blue: 'cB', Purple: 'cP', Gold: 'cG' };
const ST_ICON = { poisoned: '☠', noxious: '☠☠', paralyzed: '⚡', burned: '🔥', frozen: '❄', confused: '💫', asleep: '💤' };
const ph = (name) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#1b2742"/><text x="48" y="58" font-size="34" fill="#8fa0c4" text-anchor="middle" font-family="sans-serif">${(name || '?')[0]}</text></svg>`);
const img = (f, cls) => { const i = el('img', { src: f.picture, alt: f.name, loading: 'lazy', class: cls || '' }); i.onerror = () => { i.onerror = null; i.src = ph(f.name); }; return i; };

let DATA = null, FIG = {}, PL = {}, BOARD = null;
let ws = null, session = null, V = null, ui = { sel: null, info: null, plate: null, z: '' };
let deck = { figs: [], plates: [] }, myName = '';
try { const d = JSON.parse(localStorage.getItem('duel_deck') || 'null'); if (d) deck = d; myName = localStorage.getItem('duel_name') || ''; } catch (e) { }

// ------------------------------------------------------------ boot
fetch('/api/data').then(r => r.json()).then(d => { DATA = d; d.figures.forEach(f => (FIG[f.id] = f)); PL = d.plates; BOARD = d.board; deck.figs = deck.figs.filter(i => FIG[i]); deck.plates = deck.plates.filter(k => PL[k]); initUI(); if (window.Camp) Camp.init(); connect(); }).catch(e => { $('#conn').textContent = 'Failed to load data: ' + e; });

function show(screen) { if (screen === 'deck' && window.Camp && Camp.lobbyPanel) { try { Camp.lobbyPanel($('#lobbyOwn')); } catch (e) { } } for (const s of ['lobby', 'camp', 'deck', 'draft', 'game']) $('#' + s).classList.toggle('hidden', s !== screen); $('#btnMenu').classList.toggle('hidden', screen !== 'game'); $('#btnRestart').classList.toggle('hidden', screen !== 'game'); }
function saveDeck() { try { localStorage.setItem('duel_deck', JSON.stringify(deck)); localStorage.setItem('duel_name', $('#name').value); } catch (e) { } }

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(proto + '://' + location.host);
  ws.onopen = () => {
    $('#conn').textContent = 'Connected.';
    try { const s = JSON.parse(sessionStorage.getItem('duel_session') || 'null'); if (s) send({ t: 'rejoin', code: s.code, token: s.token }); } catch (e) { }
  };
  ws.onclose = () => { $('#conn').textContent = 'Disconnected – retrying…'; setTimeout(connect, 1500); };
  ws.onmessage = ev => onMsg(JSON.parse(ev.data));
}
const send = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
const SFX = (() => {
  let ctx = null, on = true; try { on = localStorage.getItem('duel_snd') !== '0'; } catch (e) { }
  const tone = (f, d, type, v, t0, f2) => { const t = ctx.currentTime + (t0 || 0); const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(v || 0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + 0.02); };
  const S = {
    select: () => tone(660, .07, 'triangle', .05), move: () => { tone(420, .09, 'triangle', .06); tone(560, .1, 'triangle', .06, .08); },
    plate: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .16, 'square', .04, i * .07)), spin: () => { for (let i = 0; i < 8; i++) tone(300 + i * 40, .05, 'square', .025, i * .09); },
    hit: () => tone(180, .18, 'sawtooth', .09, 0, 60), ko: () => { tone(300, .5, 'sawtooth', .09, 0, 50); tone(120, .5, 'square', .06, .05, 40); },
    turn: () => { tone(880, .1, 'sine', .05); tone(1175, .14, 'sine', .05, .1); }, win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .25, 'triangle', .07, i * .12)),
    lose: () => [392, 349, 311, 261].forEach((f, i) => tone(f, .3, 'sawtooth', .05, i * .18)), err: () => tone(160, .15, 'square', .05)
  };
  return { get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('duel_snd', on ? '1' : '0'); } catch (e) { } return on; }, play(n) { if (!on || !S[n]) return; try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); S[n](); } catch (e) { } } };
})();
const act = a => { if (a && a.t === 'move') SFX.play('move'); send({ t: 'act', a }); };

let stateQ = [], animating = false;
let lastPos = {}, activeAnim = {}, ghosts = [];
function pathBetween(a, b) {
  const prev = { [a]: null }, q = [a];
  while (q.length) { const x = q.shift(); if (x === b) break; for (const n of BOARD.adj[x]) if (!(n in prev) && !n.startsWith('G')) { prev[n] = x; q.push(n); } }
  if (!(b in prev)) return [a, b];
  const out = []; let x = b; while (x != null) { out.push(x); x = prev[x]; } return out.reverse();
}
function playRec(g, rec) {
  const pts = rec.path.map(PT), end = pts[pts.length - 1]; const enter = rec.type === 'enter';
  g.style.transformOrigin = `${end.x}px ${end.y}px`; g.style.transformBox = 'view-box';
  let frames = pts.map((p, i) => ({ transform: `translate(${p.x - end.x}px,${p.y - end.y}px) scale(${enter && i === 0 ? 0.2 : 1})`, opacity: enter && i === 0 ? 0 : 1, offset: pts.length > 1 ? i / (pts.length - 1) : 0 }));
  if (pts.length === 1) frames = [{ transform: 'scale(0.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }];
  const an = g.animate(frames, { duration: rec.dur, easing: 'ease-in-out', fill: 'backwards' });
  an.currentTime = Math.min(rec.dur - 1, Math.max(0, performance.now() - rec.start));
}
function planAnims() {
  const now = performance.now(), fresh = Object.keys(lastPos).length > 0;
  if (fresh) for (const f of V.figs) {
    const prev = lastPos[f.uid]; if (!prev) continue;
    if (f.loc === 'field' && prev.loc === 'field' && prev.pos !== f.pos) { const path = pathBetween(prev.pos, f.pos); activeAnim[f.uid] = { type: 'move', path, start: now, dur: Math.min(1200, 280 * Math.max(1, path.length - 1)) }; }
    else if (f.loc === 'field' && prev.loc !== 'field') { const cand = BOARD.entry[f.owner].map(e => pathBetween(e, f.pos)).sort((x, y) => x.length - y.length)[0]; activeAnim[f.uid] = { type: 'enter', path: cand, start: now, dur: 420 + 260 * (cand.length - 1) }; }
    else if (f.loc !== 'field' && prev.loc === 'field') ghosts.push({ fid: prev.fid, pos: prev.pos, owner: prev.owner, start: now, dur: 650 });
  }
  for (const f of V.figs) lastPos[f.uid] = { loc: f.loc, pos: f.pos, fid: f.fid || (lastPos[f.uid] && lastPos[f.uid].fid), owner: f.owner };
  for (const k in activeAnim) if (now - activeAnim[k].start >= activeAnim[k].dur) delete activeAnim[k];
  ghosts = ghosts.filter(x => now - x.start < x.dur);
}
function drain() {
  if (animating) return;
  const m = stateQ.shift(); if (!m) return;
  if (m.battle && V) playBattle(m); else { V = m.v; render(); drain(); }
}
function onMsg(m) {
  if (m.t === 'room') { session = { code: m.code, seat: m.seat, token: m.token, bot: !!m.bot }; try { sessionStorage.setItem('duel_session', JSON.stringify(session)); } catch (e) { } }
  else if (m.t === 'waiting' && m.quick && window.pvpMode) { Camp.pvpMsg('Searching for a duelist… (if nobody is found in a few seconds you will get a casual match that does not count for the ladder)'); const pn = document.getElementById('pvpNote'); if (pn) pn.append(' ', el('button', { class: 'ghost', onclick: () => { send({ t: 'cancelq' }); pn.classList.add('hidden'); } }, 'Cancel search')); }
  else if (m.t === 'waiting' && window.pvpMode) { Camp.pvpMsg('Room code: ' + m.code + ' — tell your opponent to open Campaign → PvP and join this code. Waiting for them…'); }
  else if (m.t === 'waiting' && m.quick) { const w = $('#waitMsg'); w.classList.remove('hidden'); w.textContent = 'Searching for an opponent…'; $('#btnCancelQ').classList.remove('hidden'); }
  else if (m.t === 'waiting') { const w = $('#waitMsg'); w.classList.remove('hidden'); w.textContent = 'Room code: ' + m.code + ' — share it with your opponent. Waiting for them to join…'; }
  else if (m.t === 'start') { $('#waitMsg').classList.add('hidden'); $('#btnCancelQ').classList.add('hidden'); lastPlateN = null; lastPos = {}; activeAnim = {}; ghosts = []; stateQ = []; animating = false; seenBadges = {}; badgeStart = {}; endShown = false; if (window.Camp) Camp.reset(); show('game'); ui = { sel: null, info: null, plate: null, z: '' }; $('#chat').innerHTML = ''; $('#endOverlay').classList.add('hidden'); }
  else if (m.t === 'draft') { $('#waitMsg').classList.add('hidden'); $('#btnCancelQ').classList.add('hidden'); drawDraft(m); }
  else if (m.t === 'draftWait') { drState.picks = m.picks; drawDraftTeam(); drLock('Pick locked in – waiting for your opponent…'); }
  else if (m.t === 'draftOpp') { drState.opp = m.n; $('#drOpp').textContent = 'Opponent has picked ' + m.n + ' of 6.'; }
  else if (m.t === 'draftDone') { drDone(m); }
  else if (m.t === 'state') { stateQ.push(m); drain(); }
  else if (m.t === 'err') { if (window.pvpMode && Camp.pvpMsg(m.msg, true)) return; toast(m.msg); if (m.fatal) { sessionStorage.removeItem('duel_session'); } $('#deckErr').textContent = m.msg; }
  else if (m.t === 'chat') { const c = $('#chat'); c.append(el('div', {}, el('b', {}, m.from + ': '), m.text)); c.scrollTop = c.scrollHeight; }
}
let toastT; function toast(msg) { const b = $('#turnBanner'); if (!b) return; b.textContent = '⚠ ' + msg; clearTimeout(toastT); toastT = setTimeout(() => render(), 2200); }

// ------------------------------------------------------------ lobby / deck builder
function initUI() {
  $('#name').value = myName;
  $('#goDeck').onclick = () => { saveDeck(); show('deck'); renderDeck(); };
  $('#btnHelp').onclick = () => $('#helpModal').classList.remove('hidden');
  $('#helpClose').onclick = () => $('#helpModal').classList.add('hidden');
  $('#btnRestart').onclick = () => { { if (window.pvpMode) return Camp.pvpRematch(); const cf = !!window.campFight; if (confirm((session && session.bot ? 'Restart now' : 'Ask your opponent for a rematch') + (cf ? ' of this fight?' : ' with new random teams?'))) send({ t: 'rematch', random: !cf }); } };
  try { const ts = $('#themeSel'); [['random', 'Random each game'], ...THEME_LIST].forEach(([v, n]) => ts.append(el('option', { value: v }, n))); ts.value = localStorage.getItem('duel_theme') || 'marble'; ts.onchange = () => { try { localStorage.setItem('duel_theme', ts.value); } catch (e) { } }; } catch (e) { }
  $('#btnForfeit').onclick = () => $('#btnMenu').click();
  $('#btnInfoToggle').onclick = () => { if (window.matchMedia('(max-width:900px)').matches) { $('.sidebar').classList.add('open'); $('#drawer').open = true; return; } const d = $('#drawer'); d.open = !d.open; if (d.open) d.scrollIntoView({ behavior: 'smooth' }); };
  $('#btnCloseSide').onclick = () => $('.sidebar').classList.remove('open');
  
  $('#btnMenu').onclick = () => { if (V && !V.over && !confirm('Leave the duel? You will forfeit.')) return; if (V && !V.over) act({ t: 'resign' }); if (window.campFight || window.pvpMode) return Camp.leaveToCamp(); sessionStorage.removeItem('duel_session'); V = null; show('deck'); renderDeck(); };
  for (const id of ['fSearch', 'fRarity', 'fMp']) $('#' + id).oninput = renderGrid;
  $('#rndTeam').onclick = () => { const L = DATA.figures; deck.figs = []; const nm = {}; while (deck.figs.length < 6) { const f = L[(Math.random() * L.length) | 0]; const b = f.name.split(' ').pop(); if ((nm[b] || 0) >= 2) continue; nm[b] = (nm[b] || 0) + 1; deck.figs.push(f.id); } deck.plates = []; for (const k of Object.keys(PL).sort(() => Math.random() - 0.5)) if (cost() + PL[k].cost <= 6) deck.plates.push(k); renderDeck(); };
  $('#clrTeam').onclick = () => { deck.figs = []; deck.plates = []; renderDeck(); };
  $('#btnBot').onclick = () => { window.pvpMode = false; saveDeck(); send({ t: 'bot', name: $('#name').value, deck }); };
  $('#goQuick').onclick = () => { show('deck'); if (deck.figs.length === 6) $('#btnQuick').click(); else toast('Build a team of 6 first, then press Quick match.'); };
  $('#btnDraft').onclick = () => { window.pvpMode = false; send({ t: 'quick', draft: true, name: $('#name').value }); };
  $('#btnDraftBot').onclick = () => { window.pvpMode = false; send({ t: 'draftBot', name: $('#name').value }); };
  $('#btnCrazy').onclick = () => { window.pvpMode = false; send({ t: 'quick', crazy: true, name: $('#name').value }); };
  $('#btnCrazyDraft').onclick = () => { window.pvpMode = false; send({ t: 'quick', crazy: true, draft: true, name: $('#name').value }); };
  $('#btnRandQ').onclick = () => { window.pvpMode = false; send({ t: 'quick', random: true, name: $('#name').value }); };
  $('#btnQuick').onclick = () => { window.pvpMode = false; saveDeck(); send({ t: 'quick', name: $('#name').value, deck }); };
  $('#btnCancelQ').onclick = () => { send({ t: 'cancelq' }); $('#waitMsg').classList.add('hidden'); $('#btnCancelQ').classList.add('hidden'); };
  $('#btnCreate').onclick = () => { window.pvpMode = false; saveDeck(); send({ t: 'create', name: $('#name').value, deck }); };
  $('#btnJoin').onclick = () => { window.pvpMode = false; saveDeck(); send({ t: 'join', code: $('#joinCode').value, name: $('#name').value, deck }); };
  $('#chatSend').onclick = sendChat; $('#chatIn').onkeydown = e => { if (e.key === 'Enter') sendChat(); };
  $('#name').oninput = saveDeck;
  updateSummary();
}
function sendChat() { const i = $('#chatIn'); if (i.value.trim()) send({ t: 'chat', text: i.value }); i.value = ''; }
function updateSummary() { $('#deckSummary').textContent = deck.figs.length ? 'Saved team: ' + deck.figs.map(i => FIG[i].name).join(', ') : 'No team saved yet.'; }
const cost = () => deck.plates.reduce((a, k) => a + PL[k].cost, 0);
function renderDeck() {
  renderGrid();
  const slots = $('#slots'); slots.innerHTML = '';
  for (let i = 0; i < 6; i++) { const id = deck.figs[i]; const s = el('div', { class: 'slot', onclick: () => { if (id) { deck.figs.splice(i, 1); renderDeck(); } } }); if (id) { s.append(img(FIG[id]), FIG[id].name); s.onmouseenter = () => infoCard($('#infoCard'), FIG[id]); } else s.append('Empty'); slots.append(s); }
  $('#teamCount').textContent = `(${deck.figs.length}/6)`;
  const pl = $('#plateList'); pl.innerHTML = '';
  for (const k of Object.keys(PL)) { const Pp = PL[k]; const on = deck.plates.includes(k); pl.append(el('div', { class: 'plate' + (on ? ' on' : ''), onclick: () => { if (on) deck.plates = deck.plates.filter(x => x !== k); else if (cost() + Pp.cost <= 6) deck.plates.push(k); renderDeck(); } }, el('span', { class: 'dot', style: 'background:' + (COL[Pp.color] || '#f78fb3') }), el('div', {}, `${Pp.name} (${Pp.cost})`, el('small', {}, Pp.text)))); }
  $('#plateCost').textContent = `(${cost()}/6)`;
  const ok = deck.figs.length === 6; $('#btnQuick').disabled = $('#btnBot').disabled = $('#btnCreate').disabled = $('#btnJoin').disabled = !ok;
  $('#deckErr').textContent = ok ? '' : 'Pick 6 Pokémon to play.'; saveDeck(); updateSummary();
}
function renderGrid() {
  const q = $('#fSearch').value.toLowerCase(), r = $('#fRarity').value, mp = $('#fMp').value; const g = $('#figGrid'); g.innerHTML = '';
  let n = 0;
  for (const f of DATA.figures) {
    if (q && !(f.name.toLowerCase().includes(q) || f.types.join(' ').includes(q))) continue;
    if (r && f.rarity !== r) continue; if (mp !== '' && f.mp !== +mp) continue; if (++n > 240) break;
    const c = el('div', { class: 'fig' + (deck.figs.includes(f.id) ? ' picked' : ''), onclick: () => { if (deck.figs.length < 6) { deck.figs.push(f.id); renderDeck(); } }, onmouseenter: () => infoCard($('#infoCard'), f) }, img(f), el('span', { class: 'mp' }, f.mp), el('span', { class: 'r' }, f.rarity), f.name);
    g.append(c);
  }
  if (n > 240) g.append(el('div', { class: 'muted' }, 'Refine the search to see more…'));
}

// ------------------------------------------------------------ info card + wheel
function wheelSvg(segs, size) {
  size = size || 110; const tot = segs.reduce((a, s) => a + s.s, 0); const r = size / 2 - 2, c = size / 2; let a0 = -Math.PI / 2;
  const svg = sv('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}` });
  for (const s of segs) {
    const a1 = a0 + (s.s / tot) * Math.PI * 2; const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = segs.length === 1 ? `M${c},${c - r} A${r},${r} 0 1 1 ${c - 0.01},${c - r} Z` : `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`;
    svg.append(sv('path', { d, fill: COL[s.c], stroke: '#0d1424', 'stroke-width': 1 }, sv('title', {}, s.n)));
    a0 = a1;
  }
  return svg;
}
function dmgStr(d) { if (!d) return ''; if (d.kind === 'num') return d.n; if (d.kind === 'mult') return d.n + '×'; if (d.kind === 'plus') return d.n + '+'; if (d.kind === 'stars') return '☆'.repeat(d.stars); return ''; }
function segList(segs) {
  const tot = segs.reduce((a, s) => a + s.s, 0);
  return el('div', { class: 'seglist' }, segs.map(s => el('div', { class: 'seg' }, el('i', { style: 'background:' + COL[s.c] }), el('div', {}, el('b', {}, s.n), ' ', dmgStr(s.d), ` · ${Math.round(s.s / tot * 100)}%`, s.t ? el('div', { class: 'muted' }, s.t, s.ok ? '' : el('span', { class: 'nsim' }, ' (effect not simulated)')) : ''))));
}
function infoCard(root, f) {
  root.innerHTML = ''; if (!f) { root.append(el('span', { class: 'muted' }, 'Hover or click a Pokémon for details.')); return; }
  const active = f.active && f.active.length;
  root.append(el('h4', {}, f.name, ' ', el('span', { class: 'muted' }, `${f.rarity} · MP ${f.mp}`)), el('div', { class: 'tags' }, f.types.map(t => el('span', {}, t))));
  root.append(el('div', { class: 'wheelrow' }, wheelSvg(f.segs), segList(f.segs)));
  if (f.z.length) { root.append(el('div', { class: 'muted small' }, 'Z-Moves'), el('div', { class: 'wheelrow' }, segList(f.z))); }
  if (f.ability && !/^none/i.test(f.ability)) root.append(el('div', {}, el('b', {}, 'Ability: '), f.ability, el('div', { class: 'small ' + (active ? '' : 'muted') }, active ? '✔ Ability is active in battles' : 'ⓘ Flavour text only – this ability has no in-game effect yet')));
}

// ------------------------------------------------------------ game rendering
const rot = () => session && session.seat === 1;
function PT(p) { const q = BOARD.xy[p]; let x = q.x, y = q.y; if (rot()) { x = 594 - x; y = 840 - y; } return { x: 55 + (x - 67) * 1.25, y: 70 + (y - 232) * 1.4 }; }
const fmt = ms => { if (ms == null) return "∞"; ms = Math.max(0, ms | 0); const s = (ms / 1000) | 0; return ((s / 60) | 0) + ':' + String(s % 60).padStart(2, '0'); };

const ST_COL = { poisoned: '#a24bd6', noxious: '#7a1fa2', paralyzed: '#e6c200', burned: '#ff6a2b', frozen: '#4cc9f0', confused: '#ff7bd1', asleep: '#7d8cff' };
let seenBadges = {}, badgeStart = {}, endShown = false;
const PICKK = ['pickOther', 'pickSwap', 'pickFx', 'illusion'];
function badgeList(f) {
  const L = []; for (const s of f.st || []) L.push({ k: s, icon: ST_ICON[s], col: ST_COL[s], tip: s });
  if (f.mpMark > 0) L.push({ k: 'mp' + f.mpMark, icon: '−' + f.mpMark, col: '#3b4cca', tip: 'MP-' + f.mpMark + ' marker', txt: true });
  if (f.cracked) L.push({ k: 'cracked', icon: '💥', col: '#c0392b', tip: 'Cracked marker' });
  if (f.curse) L.push({ k: 'curse', icon: '👁', col: '#6c2bd9', tip: 'Curse marker' });
  if (f.focus) L.push({ k: 'focus', icon: '🎗', col: '#2d8f6f', tip: 'Focus Band' });
  if (f.fs) L.push({ k: 'fs' + f.fs, icon: '♪' + f.fs, col: '#7a2bd9', tip: 'Final Song marker – this Pokémon is knocked out in ' + f.fs + ' turn' + (f.fs > 1 ? 's' : ''), txt: true });
  if (f.af && FIG[f.af]) L.push({ k: 'af', icon: '🌀', col: '#d63384', tip: 'Crazy Mode – this Pokémon now has the ability “' + (FIG[f.af].abilityName || '?') + '” from ' + FIG[f.af].name });
  if (f.sym) L.push({ k: 'sym', icon: '🧬', col: '#1f9d8b', tip: 'Symbiont marker – only the opposing player can move this Pokémon (MP move). Removed by tagging.' });
  return L;
}

function zone(i, isMe) {
  const p = V.players[i]; const ptg = new Set(plateTargetUids()); const mineTurn = V.legal && V.phase === 'main';
  const z = el('div', { class: 'zone ' + (isMe ? 'me' : 'opp'), id: isMe ? 'myZone' : 'oppZone' });
  z.append(el('div', { class: 'bar' }, el('span', { class: 'nm', style: 'color:' + (isMe ? 'var(--me)' : 'var(--opp)') }, p.name + (isMe ? ' (you)' : '')), (p.clock == null ? '' : el('span', { class: 'clock' + (V.cur === i ? ' active' : '') }, fmt(p.clock))),
    el('span', {}, 'Z ', el('span', { class: 'gauge' + (p.gauge >= 100 ? ' full' : '') }, el('i', { style: 'width:' + p.gauge + '%' }))), el('span', { class: 'small muted' }, `plates left ${p.platesLeft}`)));
  const row = el('div', { class: 'zrow' }); const bench = el('div', { class: 'benchrow' });
  const bf = V.figs.filter(f => f.owner === i && f.loc === 'bench');
  for (let k = 0; k < 6; k++) {
    const f = bf[k];
    if (!f) { bench.append(el('div', { class: 'bslot empty' })); continue; }
    if (!isMe || f.hidden) { bench.append(el('div', { class: 'bslot ball', title: 'Benched Pokémon (hidden)' }, el('span', { class: 'pball' }))); continue; }
    const d = FIG[f.fid]; const can = mineTurn && V.legal.moves[f.uid];
    bench.append(el('div', { class: 'chip' + (ui.sel === f.uid ? ' sel' : '') + (can ? ' can' : '') + (f.wait > 0 ? ' wait' : '') + (ptg.has(f.uid) ? ' tgt' : ''), onclick: () => clickFig(f), onmouseenter: () => infoCard($('#info'), d), title: d.name }, img(d), el('div', {}, d.name.length > 10 ? d.name.slice(0, 9) + '…' : d.name), el('span', { class: 'b' }, f.wait > 0 ? 'W' + f.wait : 'MP' + f.mp)));
  }
  V.figs.filter(f => f.owner === i && (f.loc === 'excluded' || f.loc === 'removed' || f.loc === 'ultra') && f.fid).forEach(f => bench.append(el('div', { class: 'chip wait', title: f.loc === 'removed' ? 'Removed from the duel' : 'Temporarily excluded' }, img(FIG[f.fid], 'ko'), el('span', { class: 'b' }, f.loc === 'removed' ? 'X' : '⏳' + f.ret))));
  const slots = [0, 1].map(k => {
    const f = p.pc[k] != null && V.figs.find(x => x.uid === p.pc[k]);
    if (!f || !f.fid) return el('div', { class: 'pcslot' }, el('div', { class: 'pcring empty' }, '+'), el('div', { class: 'pcn' }, k + 1));
    return el('div', { class: 'pcslot' + (ptg.has(f.uid) ? ' tgt' : ''), onclick: () => clickFig(f), onmouseenter: () => infoCard($('#info'), FIG[f.fid]), title: FIG[f.fid].name + ' (in P.C.)' }, el('div', { class: 'pcring' }, img(FIG[f.fid])), el('div', { class: 'pcn' }, k + 1));
  });
  row.append(bench, el('div', { class: 'pcbox' }, el('div', { class: 'pclabel' }, 'P.C.'), el('div', { class: 'pcslots' }, slots)));
  z.append(row); return z;
}

let lastPlateN = null, lastCurSeen = null;
const PICON = { plus_power: '💪', plus_power_2: '💥', threat: '🎯', switch: '🔁', hurdle_jump: '🦘', speed_boost: '⚡', retreat: '↩️', goal_block: '🛡️', focus_band: '🎀', big_guard: '🧱', double_chance: '🎲', respin_all: '🥚', revive: '💖', full_heal: '💊', wake_up: '⏰', z_charge: '💎' };
function plateAnim(ev) {
  const Pp = PL && PL[ev.key]; if (!Pp) return; const mineUse = ev.seat === V.seat; const who = mineUse ? 'You' : (V.players[ev.seat].name || 'Opponent');
  const old = document.getElementById('plateAnim'); if (old) old.remove();
  const box = el('div', { id: 'plateAnim', class: 'plateAnim', style: '--pc:' + (COL[Pp.color] || '#f78fb3') },
    el('div', { class: 'pa-icon' }, PICON[ev.key] || '🔶'),
    el('div', { class: 'pa-body' }, el('div', { class: 'pa-who' }, who + (mineUse ? ' used a plate' : ' used a plate')),
      el('div', { class: 'pa-name' }, Pp.name, el('span', { class: 'pa-tag' }, Pp.color + ' plate · cost ' + Pp.cost)),
      ev.targets && ev.targets.length ? el('div', { class: 'pa-tgt' }, '→ ' + ev.targets.join(' & ')) : '',
      el('div', { class: 'pa-txt' }, Pp.text), el('div', { class: 'pa-note' }, 'Plates are one-use per duel and are played before moving.')));
  SFX.play('plate'); document.body.append(box); setTimeout(() => box.classList.add('out'), 3600); setTimeout(() => box.remove(), 4200);
}
function render() {
  if (!V || !BOARD) return;
  if (!V.over && V.cur === V.seat && lastCurSeen !== V.turn + ':' + V.cur) { lastCurSeen = V.turn + ':' + V.cur; if (V.turn > 1 || V.cur === V.seat) SFX.play('turn'); }
  if (V.plateEv) { if (lastPlateN !== null && V.plateEv.n !== lastPlateN) plateAnim(V.plateEv); lastPlateN = V.plateEv.n; } else if (lastPlateN === null) lastPlateN = 0;
  const me = V.seat, opp = 1 - me, mine = V.cur === me && !V.over;
  $('#oppZone').replaceWith(zone(opp, false)); $('#myZone').replaceWith(zone(me, true));
  const b = $('#turnBanner'); const ch = V.legal && V.legal.choose;
  if (V.over) { b.className = 'banner'; b.textContent = 'Game over — ' + V.reason; }
  else if (ch) { b.className = 'banner mine'; b.textContent = ch.kind === 'illusion' ? 'Illusion! Click a glowing Pokémon to switch places with it before the battle, or fight normally.' : ch.kind === 'evade' ? 'Surprise Back! Click a glowing point to retreat without battling, or fight normally.' : ch.kind === 'pickFx' ? 'Choose a glowing Pokémon for this effect, or Skip.' : ['pickOther', 'pickSwap'].includes(ch.kind) ? 'Choose which Pokémon to move (glowing).' : 'Choose a destination for ' + FIG[V.figs.find(f => f.uid === ch.uid).fid].name + '.'; }
  else if (V.phase === 'choose') { b.className = 'banner theirs'; b.textContent = 'Opponent is choosing a position…'; }
  else if (V.phase === 'battleChoice' && mine) { b.className = 'banner mine'; b.textContent = 'Click the enemy to battle it — or choose not to battle.'; }
  else { b.className = 'banner ' + (mine ? 'mine' : 'theirs'); b.textContent = (mine ? 'Your turn' : V.players[V.cur].name + "'s turn") + ' · turn ' + V.turn; }
  { const cb = $('#crazyBar'); if (cb) { if (V.crazy && !V.over) { const left = Math.max(0, V.crazy.next - V.turn); cb.classList.remove('hidden'); cb.textContent = '🌀 Crazy Mode · ' + (V.crazy.last ? V.crazy.last.text + ' · ' : '') + (left > 0 ? 'next change in ~' + left + ' turn' + (left > 1 ? 's' : '') : 'a change is coming!'); } else cb.classList.add('hidden'); } }
  $('#topinfo').textContent = session ? 'Room ' + session.code : '';
  drawHud(me, opp);
  drawBoard(); drawFightPrompt(mine); drawActions(); infoCard($('#info'), ui.info ? FIG[ui.info] : null);
  const L = $('#log'); L.innerHTML = ''; V.log.forEach(e => L.append(el('div', {}, e.msg))); L.scrollTop = L.scrollHeight;
  if (V.over) showEnd();
}
function drawHud(me, opp) {
  let h = $('#hud'); if (!h) { h = el('div', { id: 'hud' }); $('.boardwrap').prepend(h); }
  const side = (i, cls) => { const p = V.players[i]; return el('div', { class: 'hs ' + cls + (V.cur === i && !V.over ? ' on' : '') }, el('div', { class: 'hn' }, p.name + (i === me ? ' (you)' : '')), el('div', { class: 'hc' }, p.clock == null ? '–' : fmt(p.clock))); };
  h.replaceChildren(side(me, 'me'), el('div', { class: 'hturn' }, el('small', {}, 'TURN'), el('b', {}, String(V.turn))), side(opp, 'opp'));
}
function drawFightPrompt(mine) {
  let p = $('#fightPrompt'); if (p) p.remove();
  if (!(V.phase === 'battleChoice' && mine && V.legal && V.legal.battle)) return;
  const att = V.figs.find(f => f.uid === (V.pendingAttacker != null ? V.pendingAttacker : -1));
  p = el('div', { id: 'fightPrompt' }, el('div', { class: 'fp-title' }, '⚔️ Battle time!'), el('div', { class: 'fp-sub' }, 'Your Pokémon is next to an enemy. Attack it, or hold back? (A battle ends your turn.)'),
    el('div', { class: 'fp-btns' }, ...V.legal.battle.map(u => { const f = V.figs.find(x => x.uid === u); const d = f && f.fid && FIG[f.fid]; return el('button', { class: 'fp-fight', onclick: () => act({ t: 'battle', target: u }) }, d ? img(d) : '', el('span', {}, el('b', {}, 'FIGHT'), el('small', {}, d ? d.name : 'enemy'))); }),
      V.legal.mustBattle ? '' : el('button', { class: 'fp-skip', onclick: () => act({ t: 'battle', target: 'skip' }) }, el('span', {}, el('b', {}, 'HOLD BACK'), el('small', {}, 'end turn, no fight')))));
  $('.boardwrap').append(p);
}
function dests() { if (!V.legal || ui.sel == null) return []; return V.legal.moves[ui.sel] || []; }
function plateTargetUids() { if (V.legal && V.legal.choose && PICKK.includes(V.legal.choose.kind)) return V.legal.choose.options; if (!ui.plate || !V.players[V.seat].ownPlates) return []; const T = V.players[V.seat].ownPlates[ui.plate.idx].targets; if (!T) return []; return ui.plate.step === 'a' ? T.a : (T.b || []); }

function previewDests(uid) { clearPreview(); const svg = $('#board'); const ds = (V.legal && V.legal.moves[uid]) || []; ds.forEach(p => { const q = PT(p); if (p === (V.figs.find(x => x.uid === uid) || {}).pos) return; svg.insertBefore(sv('circle', { cx: q.x, cy: q.y, r: 22, class: 'hprev', fill: '#ffcb0522', stroke: '#ffcb05', 'stroke-width': 3, 'stroke-dasharray': '5 4' }), svg.querySelector('g')); }); }
function clearPreview() { document.querySelectorAll('#board .hprev').forEach(e => e.remove()); }
function koFlash(text) { const bw = document.querySelector('.boardwrap'); if (!bw) return; const b = $('#board'); b.classList.remove('shake'); void b.getBoundingClientRect(); b.classList.add('shake'); const pop = el('div', { class: 'kopop' }, text); bw.append(pop); setTimeout(() => pop.remove(), 1500); }
function curTheme() {
  let t = 'marble';
  try { const cf = window.campFight; const m = cf && /^c\d+/.exec(String(cf.id || '')); if (m && THEME_BY_CH[m[0]]) t = THEME_BY_CH[m[0]]; else { const s = localStorage.getItem('duel_theme') || 'marble'; t = s === 'random' ? THEME_LIST[(String((session && session.code) || V.turn0 || 'x').split('').reduce((h, c) => h + c.charCodeAt(0), 0)) % THEME_LIST.length][0] : s; } } catch (e) { }
  const g = $('#game'); if (g) g.style.setProperty('--room', THEME_ROOM[t] || '#2a160b');
  return t;
}
function drawSlab(svg, defs) {
  const lg = (id, stops, a) => defs.append(sv('linearGradient', Object.assign({ id, x1: 0, y1: 0, x2: 0, y2: 1 }, a || {}), ...stops.map(([o, col, op]) => sv('stop', { offset: o, 'stop-color': col, 'stop-opacity': op == null ? 1 : op }))));
  const rg = (id, stops, a) => defs.append(sv('radialGradient', Object.assign({ id }, a || {}), ...stops.map(([o, col, op]) => sv('stop', { offset: o, 'stop-color': col, 'stop-opacity': op == null ? 1 : op }))));
  lg('slFrame', [[0, '#f4e3b0'], [0.18, '#b98a3c'], [0.5, '#6d4a1c'], [0.82, '#a87a32'], [1, '#3b2610']]);
  lg('slSurf', [[0, '#0a1020', 0.3], [0.5, '#0a1020', 0.1], [1, '#0a1020', 0.35]]);
  rg('slLight', [[0, '#ffffff', 0.28], [0.55, '#ffffff', 0.05], [1, '#ffffff', 0]], { cx: 0.5, cy: 0.38, r: 0.62 });
  rg('slVig', [[0.55, '#000', 0], [1, '#000', 0.6]], { cx: 0.5, cy: 0.5, r: 0.78 });
  lg('slSheen', [[0, '#fff', 0.2], [0.35, '#fff', 0], [1, '#fff', 0]], { x1: 0, y1: 0, x2: 1, y2: 0.7 });
  lg('slPadO', [[0, '#ffb347', 0.4], [1, '#ff7a1a', 0.08]]); lg('slPadB', [[0, '#4da3ff', 0.08], [1, '#4da3ff', 0.4]]);
  defs.append(sv('pattern', { id: 'slTile', width: 44, height: 44, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
    sv('rect', { width: 44, height: 44, fill: 'none' }), sv('path', { d: 'M0 0H44M0 0V44', stroke: '#fff', 'stroke-opacity': 0.07, 'stroke-width': 1.2 }), sv('circle', { cx: 22, cy: 22, r: 1.6, fill: '#fff', 'fill-opacity': 0.09 })));
  defs.append(sv('pattern', { id: 'slHaz', width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(-45)' }, sv('rect', { width: 9, height: 18, fill: '#fff', 'fill-opacity': 0.14 })));
  const X = -20, Y = -98, W = 700, H = 830;
  svg.append(
    sv('rect', { x: X + 6, y: Y + 12, width: W, height: H, rx: 34, fill: '#000', opacity: 0.45 }),
    sv('rect', { x: X, y: Y, width: W, height: H, rx: 30, fill: 'url(#slFrame)' }),
    sv('rect', { x: X + 11, y: Y + 11, width: W - 22, height: H - 22, rx: 22, fill: '#1a0f06' }),
    sv('rect', { x: X + 15, y: Y + 15, width: W - 30, height: H - 30, rx: 19, fill: 'none', stroke: '#ffe9a8', 'stroke-opacity': 0.35, 'stroke-width': 1.5 }),
    sv('rect', { x: X + 18, y: Y + 18, width: W - 36, height: H - 36, rx: 16, fill: 'url(#slSurf)' }),
    sv('rect', { x: X + 18, y: Y + 18, width: W - 36, height: H - 36, rx: 16, fill: 'url(#slTile)' }),
    sv('rect', { x: X + 18, y: Y + 18, width: W - 36, height: H - 36, rx: 16, fill: 'url(#slLight)' }),
    sv('rect', { x: X + 18, y: Y + 18, width: W - 36, height: H - 36, rx: 16, fill: 'url(#slVig)' }),
    sv('rect', { x: X + 18, y: Y + 18, width: W - 36, height: H - 36, rx: 16, fill: 'none', stroke: '#000', 'stroke-opacity': 0.55, 'stroke-width': 5 }));
  // bench trays + centre line
  [[-98, 70], [680, 70]].forEach(([ty, th]) => svg.append(sv('rect', { x: 14, y: ty + 4, width: 632, height: th, rx: 18, fill: '#000', 'fill-opacity': 0.28, stroke: '#fff', 'stroke-opacity': 0.12, 'stroke-width': 2 })));
  const mid = PT('I01'); svg.append(sv('line', { x1: -4, y1: mid.y, x2: 664, y2: mid.y, stroke: '#fff', 'stroke-opacity': 0.12, 'stroke-width': 2, 'stroke-dasharray': '4 10' }));
  // goal pads
  ['G0', 'G1'].forEach(g => { const q = PT(g); const mine = g === BOARD.goals[V.seat]; const top = q.y < 300; const y0 = top ? 8 : q.y - 52;
    svg.append(sv('rect', { x: q.x - 92, y: y0, width: 184, height: 112, rx: 26, fill: `url(#${mine ? 'slPadO' : 'slPadB'})`, stroke: mine ? '#ffb347' : '#53a8ff', 'stroke-opacity': 0.6, 'stroke-width': 3 }), sv('rect', { x: q.x - 92, y: y0, width: 184, height: 112, rx: 26, fill: 'url(#slHaz)' })); });
}
function drawBoard() {
  planAnims();
  const svg = $('#board'); svg.innerHTML = ''; const defs = sv('defs'); svg.append(defs);
  defs.append(
    sv('filter', { id: 'glow', filterUnits: 'userSpaceOnUse', x: -50, y: -150, width: 760, height: 950 }, sv('feGaussianBlur', { stdDeviation: 3, result: 'b' }), sv('feMerge', {}, sv('feMergeNode', { in: 'b' }), sv('feMergeNode', { in: 'SourceGraphic' }))),
    sv('radialGradient', { id: 'nodeG', cx: 0.4, cy: 0.35, r: 0.8 }, sv('stop', { offset: 0, 'stop-color': '#fff' }), sv('stop', { offset: 1, 'stop-color': '#b8c4e4' })),
    sv('radialGradient', { id: 'gOrange' }, sv('stop', { offset: '0', 'stop-color': '#ffd27a' }), sv('stop', { offset: '0.55', 'stop-color': '#ff9a2e' }), sv('stop', { offset: '1', 'stop-color': '#ff7a0000' })),
    sv('radialGradient', { id: 'gBlue' }, sv('stop', { offset: '0', 'stop-color': '#bfe4ff' }), sv('stop', { offset: '0.55', 'stop-color': '#3d9bff' }), sv('stop', { offset: '1', 'stop-color': '#2a6cff00' })));
  paintTheme(curTheme(), sv, defs, svg, { x: -30, y: -130, w: 720, h: 910 });
  drawSlab(svg, defs);
  svg.append(
    sv('line', { x1: -4, y1: 30, x2: 664, y2: 30, stroke: '#f2b705', 'stroke-opacity': 0.75, 'stroke-width': 4, 'stroke-dasharray': '14 8', 'stroke-linecap': 'round', filter: 'url(#glow)' }), sv('line', { x1: -4, y1: 640, x2: 664, y2: 640, stroke: '#f2b705', 'stroke-opacity': 0.75, 'stroke-width': 4, 'stroke-dasharray': '14 8', 'stroke-linecap': 'round', filter: 'url(#glow)' }));
  const seen = new Set();
  for (const a in BOARD.adj) for (const b of BOARD.adj[a]) { const k = [a, b].sort().join('|'); if (seen.has(k)) continue; seen.add(k); const A = PT(a), Bp = PT(b); const ln = (w, s, o, f) => sv('line', { x1: A.x, y1: A.y, x2: Bp.x, y2: Bp.y, stroke: s, 'stroke-width': w, 'stroke-linecap': 'round', opacity: o, filter: f }); svg.append(ln(13, '#000', 0.4), ln(8, '#dfe8ff', 1, 'url(#glow)'), ln(3.5, '#ffffff', 1)); }
  const choose = V.legal && V.legal.choose;
  const D = new Set(choose ? (PICKK.includes(choose.kind) ? [] : choose.options) : (V.legal && V.phase === 'main' ? dests() : []));
  const goalMine = BOARD.goals[V.seat];
  for (const g of ['G0', 'G1']) { const q = PT(g); const isTarget = g === goalMine; const gid = isTarget ? 'gOrange' : 'gBlue';
    svg.append(sv('circle', { cx: q.x, cy: q.y, r: 56, fill: `url(#${gid})`, class: 'goalpulse' }), sv('circle', { cx: q.x, cy: q.y, r: 27, fill: isTarget ? '#ffb347' : '#53a8ff', stroke: '#fff', 'stroke-width': 4, filter: 'url(#glow)' }),
      sv('path', { d: isTarget ? `M${q.x + 9},${q.y - 13} L${q.x - 12},${q.y} L${q.x + 9},${q.y + 13} Z` : `M${q.x - 9},${q.y - 13} L${q.x + 12},${q.y} L${q.x - 9},${q.y + 13} Z`, fill: '#fff' }),
      sv('text', { x: q.x, y: q.y + (V.figs.some(f => f.loc === 'field' && f.pos === g) ? 62 : 52), 'text-anchor': 'middle', fill: isTarget ? '#b45f00' : '#1b5fb8', 'font-size': 12, 'font-weight': 800 }, isTarget ? 'ENEMY GOAL' : 'YOUR GOAL')); if (D.has(g)) svg.append(sv('circle', { cx: q.x, cy: q.y, r: 40, fill: '#ffcb0555', stroke: '#ffcb05', 'stroke-width': 5, class: 'dest', style: 'cursor:pointer', onclick: () => doMove(g) })); }
  const entryMine = BOARD.entry[V.seat], entryOpp = BOARD.entry[1 - V.seat];
  const figAt = {}; V.figs.filter(f => f.loc === 'field').forEach(f => (figAt[f.pos] = f));
  for (const p of BOARD.points) {
    const q = PT(p); const isE = entryMine.includes(p), isO = entryOpp.includes(p);
    svg.append(sv('circle', { cx: q.x, cy: q.y + 3, r: isE || isO ? 21 : 12, fill: '#000', opacity: 0.4 }), sv('circle', { cx: q.x, cy: q.y, r: isE || isO ? 20 : 11, fill: isE || isO ? '#ffffff55' : 'url(#nodeG)', stroke: isE || isO ? '#fff' : '#8fa0c8', 'stroke-width': isE || isO ? 4 : 2.5, filter: isE || isO ? 'url(#glow)' : null }));
    if (!(isE || isO)) svg.append(sv('circle', { cx: q.x - 3, cy: q.y - 3, r: 3, fill: '#fff', opacity: 0.9 }));
    if (isE || isO) svg.append(sv('circle', { cx: q.x, cy: q.y, r: 11, fill: 'none', stroke: isE ? '#2f7de1' : '#e0453a', 'stroke-width': 3 }), sv('circle', { cx: q.x, cy: q.y, r: 4, fill: isE ? '#2f7de1' : '#e0453a' }));
  }
  const tgSet = new Set(V.legal && V.phase === 'battleChoice' ? V.legal.battle : []); if (choose && PICKK.includes(choose.kind)) choose.options.forEach(u => tgSet.add(u)); else if (choose) tgSet.add(choose.uid);
  const ptg = new Set(plateTargetUids()); const now = performance.now(); const fresh = Object.keys(seenBadges).length > 0;
  const drawPiece = (f, q, onBench) => {
    const d = FIG[f.fid]; const mineF = f.owner === V.seat; const sel = ui.sel === f.uid;
    const g = sv('g', { style: 'cursor:pointer', onclick: () => clickFig(f), onmouseenter: () => { ui.info = f.fid; infoCard($('#info'), d); if (mineF && V.legal && V.phase === 'main' && !ui.plate && ui.sel !== f.uid) previewDests(f.uid); }, onmouseleave: clearPreview });
    const cid = 'cp' + f.uid; defs.append(sv('clipPath', { id: cid }, sv('circle', { cx: q.x, cy: q.y, r: 29 })));
    g.append(sv('ellipse', { cx: q.x, cy: q.y + 30, rx: 36, ry: 11, fill: '#0006' }), sv('circle', { cx: q.x, cy: q.y, r: 34, fill: mineF ? '#1e5fd0' : '#c8372d', stroke: sel ? '#ffe45c' : (mineF ? '#7cb8ff' : '#ff9a90'), 'stroke-width': sel ? 7 : 4 }), sv('circle', { cx: q.x, cy: q.y, r: 30, fill: '#10172b' }));
    g.append(sv('text', { x: q.x, y: q.y + 6, 'text-anchor': 'middle', fill: '#8fa0c4', 'font-size': 20 }, d.name[0]));
    const im = sv('image', { href: d.picture, x: q.x - 29, y: q.y - 29, width: 58, height: 58, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMid slice' }); im.addEventListener('error', () => im.setAttribute('visibility', 'hidden')); g.append(im);
    if (ui.hi && (ui.hi.a === f.uid || ui.hi.d === f.uid)) g.append(sv('circle', { cx: q.x, cy: q.y, r: 45, fill: 'none', stroke: ui.hi.a === f.uid ? '#ffcb05' : '#ff6b6b', 'stroke-width': 5, class: 'dest' }), sv('text', { x: q.x, y: q.y - 50, 'text-anchor': 'middle', 'font-size': 18 }, ui.hi.a === f.uid ? '⚔' : '🛡'));
    if (V.phase === 'battleChoice' && V.legal && V.legal.battle && V.legal.battle.includes(f.uid)) g.append(sv('circle', { cx: q.x, cy: q.y, r: 46, fill: '#ff2d2d22', stroke: '#ff3b3b', 'stroke-width': 5, class: 'dest' }), sv('text', { x: q.x, y: q.y - 52, 'text-anchor': 'middle', 'font-size': 30, class: 'swordpulse', style: 'paint-order:stroke;stroke:#000;stroke-width:3px' }, '⚔️'));
    if (tgSet.has(f.uid) || ptg.has(f.uid)) g.append(sv('circle', { cx: q.x, cy: q.y, r: 41, fill: 'none', stroke: '#ffcb05', 'stroke-width': 4, 'stroke-dasharray': '6 4', class: 'dest' }));
    g.append(sv('circle', { cx: q.x + 27, cy: q.y + 24, r: 13, fill: mineF ? '#2f7de1' : '#e0453a', stroke: '#fff', 'stroke-width': 2.5 }), sv('text', { x: q.x + 27, y: q.y + 30, 'text-anchor': 'middle', fill: '#fff', 'font-size': 17, 'font-weight': 900 }, String(f.mp)), sv('title', {}, 'MP ' + f.mp));
    if (f.wait > 0) g.append(sv('rect', { x: q.x - 38, y: q.y + 22, width: 32, height: 16, rx: 6, fill: '#8a5a00' }), sv('text', { x: q.x - 22, y: q.y + 34, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11 }, 'W' + f.wait));
    // condition / marker badges
    const bl = badgeList(f); const had = seenBadges[f.uid] || new Set(); const keys = new Set();
    bl.forEach((bd, k) => {
      const cx = q.x - 28 + k * 23, cy = q.y - 40; keys.add(bd.k);
      const bg = sv('g', {}, sv('title', {}, bd.tip), sv('circle', { cx, cy, r: 11, fill: bd.col, stroke: '#0b1226', 'stroke-width': 2 }), sv('text', { x: cx, y: cy + (bd.txt ? 4 : 4.5), 'text-anchor': 'middle', 'font-size': bd.txt ? 10 : 12, 'font-weight': 700, fill: '#fff' }, bd.icon));
      bg.style.transformOrigin = `${cx}px ${cy}px`; g.append(bg);
      const key = f.uid + '|' + bd.k; if (fresh && !had.has(bd.k) && !badgeStart[key]) badgeStart[key] = now;
      if (badgeStart[key] && now - badgeStart[key] < 700) { const an = bg.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.7)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, easing: 'ease-out' }); an.currentTime = now - badgeStart[key]; }
    });
    seenBadges[f.uid] = keys;
    svg.append(g);
    if (!onBench && activeAnim[f.uid]) playRec(g, activeAnim[f.uid]);
  };
  // ---- benches + P.C. drawn on the board itself (like the original)
  const BX = k => 60 + k * 100, BYo = -62, BYm = 716;
  [[1 - V.seat, BYo, false], [V.seat, BYm, true]].forEach(([si, by, isMe]) => {
    const bf = V.figs.filter(f => f.owner === si && f.loc === 'bench');
    for (let k = 0; k < 6; k++) {
      const f = bf[k]; const x = BX(k);
      if (!f) { svg.append(sv('circle', { cx: x, cy: by, r: 31, fill: '#ffffff18', stroke: '#fff', 'stroke-width': 4, filter: 'url(#glow)' })); continue; }
      if (!isMe || f.hidden) { svg.append(sv('circle', { cx: x, cy: by, r: 29, fill: '#fff', stroke: '#10172b', 'stroke-width': 4 }), sv('path', { d: `M${x - 29},${by} A29,29 0 0 1 ${x + 29},${by} Z`, fill: '#e0453a' }), sv('line', { x1: x - 29, y1: by, x2: x + 29, y2: by, stroke: '#10172b', 'stroke-width': 4 }), sv('circle', { cx: x, cy: by, r: 9, fill: '#fff', stroke: '#10172b', 'stroke-width': 4 })); continue; }
      drawPiece(f, { x, y: by }, true);
    }
    const p = V.players[si];
    svg.append(sv('text', { x: 640, y: (isMe ? 646 : -120), 'text-anchor': 'middle', fill: '#fff', 'font-size': 13, 'font-weight': 800, opacity: 0.9, style: 'paint-order:stroke;stroke:#000a;stroke-width:3px' }, 'P.C.'));
    [0, 1].forEach(k => {
      const f = p.pc[k] != null && V.figs.find(x => x.uid === p.pc[k]); const cy = (isMe ? 676 : -92) + k * 54;
      if (!f || !f.fid) { svg.append(sv('circle', { cx: 640, cy, r: 22, fill: '#00000033', stroke: '#fff', 'stroke-width': 3, 'stroke-dasharray': '4 3' })); return; }
      const d = FIG[f.fid]; const cid = 'pc' + f.uid; defs.append(sv('clipPath', { id: cid }, sv('circle', { cx: 640, cy, r: 20 })));
      const g = sv('g', { style: 'cursor:pointer', onclick: () => clickFig(f) }, sv('circle', { cx: 640, cy, r: 24, fill: '#10172b', stroke: ptg.has(f.uid) ? '#ffcb05' : '#8a93a8', 'stroke-width': ptg.has(f.uid) ? 5 : 3 }), sv('image', { href: d.picture, x: 620, y: cy - 20, width: 40, height: 40, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMid slice', opacity: 0.6 }), sv('title', {}, d.name + ' (in P.C.)')); svg.append(g);
    });
  });
  for (const f of Object.values(figAt)) drawPiece(f, PT(f.pos), false);
  for (const f of V.figs) if (f.loc !== 'field' && !seenBadges[f.uid]) seenBadges[f.uid] = new Set();
  for (const gh of ghosts) {
    const q = PT(gh.pos), d = FIG[gh.fid]; if (!d) continue; const cid = 'gh' + gh.start + gh.pos; defs.append(sv('clipPath', { id: cid }, sv('circle', { cx: q.x, cy: q.y, r: 29 })));
    const g = sv('g', {}, sv('circle', { cx: q.x, cy: q.y, r: 34, fill: '#10172b', stroke: gh.owner === V.seat ? '#7cb8ff' : '#ff9a90', 'stroke-width': 4 }), sv('text', { x: q.x, y: q.y + 6, 'text-anchor': 'middle', fill: '#8fa0c4', 'font-size': 20 }, d.name[0]), sv('image', { href: d.picture, x: q.x - 29, y: q.y - 29, width: 58, height: 58, 'clip-path': `url(#${cid})`, preserveAspectRatio: 'xMidYMid slice' }));
    g.style.transformOrigin = `${q.x}px ${q.y}px`; svg.append(g);
    const an = g.animate([{ opacity: 1, transform: 'scale(1) rotate(0deg)' }, { opacity: 0, transform: 'scale(0.3) rotate(25deg)' }], { duration: gh.dur, easing: 'ease-in', fill: 'forwards' }); an.currentTime = performance.now() - gh.start;
  }
  const enemyAt = pt => (BOARD.adj[pt] || []).some(n => V.figs.some(x => x.loc === 'field' && x.pos === n && x.owner !== V.seat));
  for (const p of D) { if (!p.startsWith('G') && V.phase === 'main' && enemyAt(p)) { const qq = PT(p); svg.append(sv('text', { x: qq.x, y: qq.y - 40, 'text-anchor': 'middle', 'font-size': 26, class: 'swordpulse', style: 'pointer-events:none;paint-order:stroke;stroke:#000;stroke-width:3px' }, '⚔️')); } if (p.startsWith('G')) continue; const q = PT(p); svg.append(sv('circle', { cx: q.x, cy: q.y, r: 26, fill: '#ffd83a66', stroke: '#ffcb05', 'stroke-width': 5, class: 'dest', filter: 'url(#glow)', style: 'cursor:pointer', onclick: () => doMove(p) })); }
  if (V.lockedGoal[V.seat] > 0 || V.lockedGoal[1 - V.seat] > 0) svg.append(sv('text', { x: 342, y: 655, 'text-anchor': 'middle', fill: '#e9b44c', 'font-size': 13 }, V.lockedGoal[V.seat] > 0 ? '🛡 Your goal is blocked for the opponent this turn' : '🛡 Enemy goal is blocked this turn'));
}
function clickFig(f) {
  if (f.hidden) return; ui.info = f.fid; SFX.play('select');
  if (V.legal && V.legal.choose) { if (PICKK.includes(V.legal.choose.kind) && V.legal.choose.options.includes(f.uid)) act({ t: 'choose', to: f.uid }); else render(); return; }
  if (ui.plate) {
    if (plateTargetUids().includes(f.uid)) {
      const pl = ui.plate; const T = V.players[V.seat].ownPlates[pl.idx].targets;
      if (pl.step === 'a') { pl.a = f.uid; if (T.b) { pl.step = 'b'; render(); return; } } else pl.b = f.uid;
      act({ t: 'plate', idx: pl.idx, a: pl.a, b: pl.b }); ui.plate = null; ui.sel = null; return;
    }
  }
  if (V.legal && V.phase === 'battleChoice' && V.legal.battle.includes(f.uid)) { act({ t: 'battle', target: f.uid }); return; }
  if (V.legal && V.phase === 'main' && V.legal.moves[f.uid]) { ui.sel = ui.sel === f.uid ? null : f.uid; ui.plate = null; ui.z = ''; }
  render();
}
function doMove(to) {
  if (V.legal && V.legal.choose) { act({ t: 'choose', to }); return; }
  if (ui.sel == null) return; act({ t: 'move', uid: ui.sel, to, z: ui.z || undefined }); ui.sel = null; ui.z = '';
}

function mineTurnNow() { return V && V.cur === V.seat && !V.over; }
function drawActions() {
  const a = $('#actions'); a.innerHTML = ''; if (!V.legal || V.over) { a.append(el('span', { class: 'muted' }, V.over ? '' : 'Waiting for the opponent…')); return; }
  if (V.legal.choose) { a.append(el('div', { class: 'notice' }, V.legal.choose.kind === 'illusion' ? 'Click a glowing Pokémon to switch places with it. ' : 'Click a glowing point to place it. '), el('button', { onclick: () => act({ t: 'choose', to: null }) }, V.legal.choose.kind === 'illusion' ? 'No – battle normally' : PICKK.includes(V.legal.choose.kind) ? 'Skip' : V.legal.choose.kind === 'evade' ? 'Fight normally' : 'Stay where it is')); return; }
  if (V.phase === 'battleChoice') { if (!mineTurnNow()) a.append('Waiting…'); else a.append(el('div', { class: 'muted small' }, 'Choose FIGHT or HOLD BACK above.')); return; }
  const me = V.players[V.seat];
  if (V.legal.loyalty && V.legal.loyalty.length && !V.moved) a.append(el('div', { class: 'row' }, ...V.legal.loyalty.map(u => { const f = V.figs.find(x => x.uid === u); return el('button', { class: 'platecard', style: '--pc:#f78fb3', title: 'Loyalty: move it to your bench, then you can use it again right away (clears its Wait).', onclick: () => act({ t: 'loyalty', uid: u }) }, el('span', { class: 'pc-ic' }, '🐾'), el('span', { class: 'pc-nm' }, 'Loyalty: ' + FIG[f.fid].name + ' → bench')); })));
  if (V.legal.preswap && V.legal.preswap.length && !V.moved) a.append(el('div', { class: 'row' }, ...V.legal.preswap.flatMap(ps => ps.with.map(w => { const f = V.figs.find(x => x.uid === ps.uid), o = V.figs.find(x => x.uid === w); return el('button', { class: 'platecard', style: '--pc:#74b9ff', title: ps.kind === 'volt' ? 'Volt Swap: switch with a paralyzed Electric Pokémon; opposing Pokémon on your entry points become paralyzed.' : 'Swap places with this ally before moving.', onclick: () => act({ t: 'preswap', uid: ps.uid, with: w }) }, el('span', { class: 'pc-ic' }, '↔'), el('span', { class: 'pc-nm' }, FIG[f.fid].name + ' ⇄ ' + FIG[o.fid].name)); }))));
  if (V.turn <= 3) a.append(el('div', { class: 'howto' }, el('b', {}, 'How to play: '), '① (optional) use a plate  ② tap one of your Pokémon  ③ tap a glowing point to move. ', el('span', { class: 'swordnote' }, '⚔️ on a point = you can start a battle from there.')));
  if (ui.plate) a.append(el('div', { class: 'notice' }, 'Plate: choose a ' + (ui.plate.step === 'a' ? 'target' : 'bench Pokémon') + ' (highlighted). ', el('button', { onclick: () => { ui.plate = null; render(); } }, 'Cancel')));
  const row = el('div', { class: 'row' });
  for (const p of me.ownPlates) {
    const Pp = PL[p.key]; const usable = !p.used && V.legal.plates.includes(p.idx) && !V.moved && p.targets && (Pp.target === 'none' || p.targets.a.length > 0);
    const btn = el('button', { class: 'platecard' + (p.used ? ' used' : ''), title: Pp.name + ' – ' + Pp.text, style: '--pc:' + (COL[Pp.color] || '#f78fb3'), onclick: () => { if (Pp.target === 'none') act({ t: 'plate', idx: p.idx }); else { ui.plate = { idx: p.idx, step: 'a' }; ui.sel = null; render(); } } }, el('span', { class: 'pc-ic' }, PICON[p.key] || '🔶'), el('span', { class: 'pc-nm' }, Pp.name), el('span', { class: 'pc-cost' }, '●'.repeat(Pp.cost)));
    btn.disabled = !usable; row.append(btn);
  }
  a.append(row);
  a.append(zPanel(me));
}

function zPanel(me) {
  const box = el('div', { class: 'zpanel' + (me.gauge >= 100 ? ' ready' : '') });
  if (me.gauge < 100) { box.append(el('b', {}, '⚡ Z-Move gauge ' + me.gauge + '%'), el('span', { class: 'small muted' }, ' · +20% every battle you or your opponent fight. At 100% you can power up one attack.')); return box; }
  box.append(el('b', {}, '⚡ Z-Move READY!'), el('div', { class: 'small muted' }, 'How to use: 1) click one of your Pokémon, 2) choose which of its Z-Moves to use below (if it has two, pick one), 3) move it next to an enemy (or attack from where it stands). That battle uses the Z-Move wheel, and the gauge resets.'));
  const f = ui.sel != null ? V.figs.find(x => x.uid === ui.sel) : null; const d = f && f.fid ? FIG[f.fid] : null;
  if (!d) { box.append(el('div', { class: 'small' }, 'Select a Pokémon to see its Z-Moves.')); return box; }
  const zs = (d.z || []).filter((x, i, arr) => arr.findIndex(y => y.n === x.n) === i);
  if (!zs.length) { box.append(el('div', { class: 'small' }, d.name + ' has no Z-Move.')); return box; }
  const row = el('div', { class: 'row' });
  zs.forEach(zz => row.append(el('button', { class: 'zbtn' + (ui.z === zz.n ? ' on' : ''), title: zz.t || '', onclick: () => { ui.z = ui.z === zz.n ? '' : zz.n; render(); } }, '⚡ ' + zz.n + ' (' + zz.c + ' ' + dmgStr(zz.d) + ')')));
  row.append(el('button', { class: 'ghost' + (!ui.z ? ' on' : ''), onclick: () => { ui.z = ''; render(); } }, 'Normal attack'));
  box.append(row, el('div', { class: 'small ' + (ui.z ? 'zarmed' : 'muted') }, ui.z ? '⚡ Z-Move armed – now click a glowing destination to attack with it.' : 'No Z-Move chosen – this attack will be normal.'));
  return box;
}
let WID = 0;
function animWheel(info, size, slow, ring) {
  const segs = info.segs, tot = segs.reduce((a, s) => a + s.s, 0), r = size / 2 - 6, c = size / 2;
  const svg = sv('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, class: 'awheel' });
  const rotor = sv('g', { style: `transform-origin:${c}px ${c}px` });
  let a0 = -Math.PI / 2, mids = [], acc = 0;
  segs.forEach(s => {
    const a1 = a0 + (s.s / tot) * Math.PI * 2; const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = segs.length === 1 ? `M${c},${c - r} A${r},${r} 0 1 1 ${c - 0.01},${c - r} Z` : `M${c},${c} L${c + r * Math.cos(a0)},${c + r * Math.sin(a0)} A${r},${r} 0 ${large} 1 ${c + r * Math.cos(a1)},${c + r * Math.sin(a1)} Z`;
    rotor.append(sv('path', { d, fill: COL[s.c], stroke: '#0a0a0a', 'stroke-width': 2 }));
    if ((s.c === 'White' || s.c === 'Gold') && segs.length > 1 && size >= 120) { const n = Math.max(2, Math.round((a1 - a0) / 0.16)); for (let k = 0; k < n; k += 2) { const b0 = a0 + (a1 - a0) * k / n, b1 = a0 + (a1 - a0) * (k + 1) / n; rotor.append(sv('path', { d: `M${c},${c} L${c + r * Math.cos(b0)},${c + r * Math.sin(b0)} A${r},${r} 0 0 1 ${c + r * Math.cos(b1)},${c + r * Math.sin(b1)} Z`, fill: s.c === 'Gold' ? '#00000014' : '#0000000f' })); } }
    mids.push([acc / tot * 360, (acc + s.s) / tot * 360]); acc += s.s;
    const frac = s.s / tot, am = (a0 + a1) / 2, ink = (s.c === 'White' || s.c === 'Gold') ? '#1a1a1a' : '#fff';
    if (frac > 0.09 && s.n && size >= 120) {
      // curved move name along the rim (flipped in the lower half so it reads upright)
      const lower = Math.sin(am) > 0, rr = r * 0.8, id = 'wp' + (++WID); const sa = lower ? a1 - 0.03 : a0 + 0.03, ea = lower ? a0 + 0.03 : a1 - 0.03;
      const pd = `M${c + rr * Math.cos(sa)},${c + rr * Math.sin(sa)} A${rr},${rr} 0 ${Math.abs(a1 - a0) > Math.PI ? 1 : 0} ${lower ? 0 : 1} ${c + rr * Math.cos(ea)},${c + rr * Math.sin(ea)}`;
      const nm = s.n.length > 16 ? s.n.slice(0, 15) + '…' : s.n;
      rotor.append(sv('path', { id, d: pd, fill: 'none' }), sv('text', { 'font-size': Math.max(9, size * 0.058), 'font-weight': 800, fill: ink, opacity: 0.92, 'letter-spacing': 0.5 }, sv('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' }, nm)));
    }
    if (frac > 0.05) {
      const lab = s.d && s.d.kind === 'num' && s.d.n ? String(s.d.n) : s.d && s.d.kind === 'mult' ? s.d.n + '×' : s.d && s.d.kind === 'plus' ? s.d.n + '+' : s.c === 'Red' ? '✕' : s.c === 'Purple' && s.d && s.d.stars ? '★'.repeat(Math.min(3, s.d.stars)) : '';
      if (lab !== '') { const deg = am * 180 / Math.PI, flip = Math.cos(am) < 0; rotor.append(sv('text', { transform: `translate(${c},${c}) rotate(${flip ? deg + 180 : deg})`, x: flip ? -r * 0.46 : r * 0.46, y: size * 0.04, 'text-anchor': 'middle', 'font-size': size * (lab.length > 3 ? 0.07 : 0.11), 'font-weight': 900, fill: ink }, lab)); }
    }
    a0 = a1;
  });
  svg.append(rotor, sv('circle', { cx: c, cy: c, r: r + 1, fill: 'none', stroke: '#0a0a0a', 'stroke-width': 9 }), sv('circle', { cx: c, cy: c, r: r + 7, fill: 'none', stroke: ring || '#dfe5f2', 'stroke-width': 3, filter: ring ? 'drop-shadow(0 0 6px ' + ring + ')' : '' }), sv('circle', { cx: c, cy: c, r: 13, fill: '#0d1424', stroke: '#c9d2e6', 'stroke-width': 3 }), sv('circle', { cx: c, cy: c, r: 5, fill: '#4a5678' }), sv('polygon', { points: `${c - 10},0 ${c + 10},0 ${c},26`, fill: '#e8261b', stroke: '#fff', 'stroke-width': 2, filter: 'drop-shadow(0 0 4px #ff4a3d)' }));
  const spins = info.spins && info.spins.length ? info.spins : [info.idx]; const plan = []; let rotAcc = 0;
  const drifts = (info.drifts && info.drifts.length === spins.length) ? info.drifts : [];
  const aim = (idx, i, fast) => { const [d0, d1] = mids[idx] || [0, 360]; const jit = (Math.random() - 0.5) * (d1 - d0) * 0.5; const want = 360 - ((d0 + d1) / 2 + jit);
    const cur = ((rotAcc % 360) + 360) % 360; let delta = (((want - cur) % 360) + 360) % 360; delta += fast ? 0 : 360 * (i === 0 ? 4 : 2); rotAcc += delta; return rotAcc; };
  spins.forEach((idx, i) => {
    const from = drifts[i] != null && drifts[i] >= 0 && drifts[i] !== idx && segs[drifts[i]] ? drifts[i] : -1;
    if (from >= 0) {
      plan.push({ rot: aim(from, i, false), dur: (i === 0 ? 2.0 : 1.2) * (i === 0 && slow ? 1.25 : 1), idx: from, pre: true });
      plan.push({ rot: aim(idx, i, true), dur: 0.9, idx, drift: from, ease: 'cubic-bezier(.3,1.6,.5,1)' });
    } else plan.push({ rot: aim(idx, i, false), dur: (i === 0 ? 2.0 : 1.2) * (i === 0 && slow ? 1.25 : 1), idx });
  });
  const lbl = el('div', { class: 'spinlbl' }, (info.confused ? '💫 Confused – the pointer drifts! ' : '') + ((info.cond || []).some(s => s === 'paralyzed' || s === 'burned') ? '⚡ Paralyzed/Burned – its weakest attack is now a Miss! ' : '') + (spins.length > 1 ? 'Multiple spins!' : '')); const timers = [];
  const total = plan.reduce((a, p) => a + p.dur + (p.pre ? 0.55 : 0.4), 0.1);
  const run = () => { let t = 0.06; plan.forEach((p, i) => { timers.push(setTimeout(() => { rotor.style.transition = `transform ${p.dur}s ${p.ease || 'cubic-bezier(.12,.65,.1,1)'}`; rotor.style.transform = `rotate(${p.rot}deg)`; if (p.drift != null) { lbl.textContent = `💫 Confused! The pointer slips from ${segs[p.drift].n} to ${segs[p.idx].n}!`; lbl.classList.add('drift'); SFX && SFX.tick && SFX.tick(); } else if (spins.length > 1) lbl.textContent = `Spin ${i + 1} / ${spins.length}: ${segs[p.idx].n}`; }, t * 1000)); t += p.dur + (p.pre ? 0.55 : 0.4); }); };
  const finishNow = () => { timers.forEach(clearTimeout); rotor.style.transition = 'none'; rotor.style.transform = `rotate(${plan[plan.length - 1].rot}deg)`; if (spins.length > 1) lbl.textContent = `${spins.length} spins`; };
  return { svg, lbl, run, finishNow, total, rotor };
}
function playBattle(m) {
  animating = true; const post = m.v, b = m.battle;
  const pre = {}; b.pre.forEach(p => (pre[p.uid] = p));
  const preV = { ...post, over: false, legal: null, phase: 'main', figs: post.figs.map(f => (pre[f.uid] ? { ...f, ...pre[f.uid] } : f)) };
  const A = preV.figs.find(f => f.uid === b.attacker.uid), D = preV.figs.find(f => f.uid === b.defender.uid);
  if (!A || !D || !A.fid || !D.fid) { animating = false; V = post; render(); drain(); return; }
  V = preV; ui.hi = { a: A.uid, d: D.uid }; render();
  const o = $('#battleOverlay'); o.innerHTML = '';
  const wait = Math.min(1100, Math.max(250, ...Object.values(activeAnim).map(r => r.start + r.dur - performance.now() + 250)));
  setTimeout(() => startBattleOverlay(m, A, D, post, b, o), wait);
}
function startBattleOverlay(m, A, D, post, b, o) {
  o.classList.remove('hidden');
  const fa = FIG[A.fid], fd = FIG[D.fid]; SFX.play('spin');
  const rc = o2 => (o2.owner === post.seat ? '#3d8bff' : '#ff4a4a');
  const wa = animWheel(b.aw, 400, false, rc(A)), wd = animWheel(b.dw, 400, true, rc(D));
  const resA = el('div', { class: 'bres' }), resD = el('div', { class: 'bres' }), mid = el('div', { class: 'bmid bcenter' });
  const nameA = post.players[A.owner].name, nameD = post.players[D.owner].name;
  const mineIsA = A.owner === post.seat; const M = mineIsA ? { f: fa, w: wa, res: resA, n: nameA } : { f: fd, w: wd, res: resD, n: nameD }, O = mineIsA ? { f: fd, w: wd, res: resD, n: nameD } : { f: fa, w: wa, res: resA, n: nameA };
  mid.append(el('div', { class: 'bresult' }), el('ul', { class: 'bevents' }));
  o.append(el('div', { class: 'bstage' },
    el('div', { class: 'bw top' }, O.w.svg), el('div', { class: 'bw bot' }, M.w.svg),
    el('div', { class: 'bbeam' }),
    el('div', { class: 'bcorner tl' }, el('div', { class: 'bwho' }, O.n + ' · ' + O.f.name), O.res, O.w.lbl),
    el('div', { class: 'bcorner br' }, M.res, M.w.lbl),
    el('div', { class: 'bport' }, img(M.f), el('div', { class: 'bpn' }, M.n + (' (you)') + ' · ' + M.f.name)),
    mid), el('div', { class: 'small muted bskip' }, 'tap to skip'));
  wa.run(); wd.run();
  let stage = 0, timers = [];
  const fill = (r, s) => { r.innerHTML = ''; r.append(el('div', { class: 'dm ' + CLS[s.color] }, (s.color === 'White' || s.color === 'Gold') ? s.dmg : s.color === 'Purple' && s.stars ? '★'.repeat(s.stars) : s.color === 'Red' ? '✕' : s.color === 'Blue' ? '🛡' : ''), el('div', { class: 'mv ' + CLS[s.color] }, (s.z ? 'Z · ' : '') + s.seg), s.notes ? el('div', { class: 'bnote' }, s.notes) : ''); };
  const reveal = () => {
    if (stage >= 1) return; stage = 1; wa.finishNow(); wd.finishNow(); fill(resA, b.attacker); fill(resD, b.defender);
    const t = ((b.aKO ? fa.name + ' is knocked out! ' : '') + (b.dKO ? fd.name + ' is knocked out!' : '')) || b.text || 'No knock-out'; mid.querySelector('.bresult').textContent = t;
    const ul = mid.querySelector('.bevents'); (b.events || []).slice(0, 7).forEach((x, k) => { const li = el('li', { style: `animation-delay:${k * 0.15}s` }, x); ul.append(li); });
    timers.push(setTimeout(() => (b.effSpins && b.effSpins.length ? effects() : finish()), 2200 + (b.events || []).length * 250));
  };
  const effects = () => {
    if (stage >= 2) return; stage = 1.5; const list = b.effSpins.slice(0, 12); const size = list.length > 6 ? 108 : list.length > 3 ? 130 : 160;
    o.innerHTML = ''; const grid = el('div', { class: 'effgrid' }); const ws = [];
    list.forEach(sp => { const f = FIG[sp.fid]; const w = animWheel(sp.info, size, false); ws.push(w); const res = el('div', { class: 'effres' }, '…');
      grid.append(el('div', { class: 'effitem' }, el('div', { class: 'bname', style: 'color:' + (sp.owner === post.seat ? 'var(--me)' : 'var(--opp)') }, f ? f.name : ''), w.svg, w.lbl, res)); sp._res = res; });
    o.append(el('div', { class: 'battle effbattle' }, el('div', { class: 'efftitle' }, 'Effect spin!'), grid), el('div', { class: 'small muted', style: 'position:absolute;bottom:14px' }, 'click to skip'));
    ws.forEach(w => w.run()); let shown = false;
    const showRes = () => { if (shown) return; shown = true; ws.forEach(w => w.finishNow()); list.forEach(sp => { sp._res.className = 'effres ' + CLS[sp.color]; sp._res.textContent = sp.seg + ((sp.color === 'White' || sp.color === 'Gold') ? ' · ' + sp.dmg : ''); }); timers.push(setTimeout(finish, 2600)); };
    timers.push(setTimeout(showRes, Math.max(...ws.map(w => w.total)) * 1000 + 300)); o.onclick = () => { if (!shown) showRes(); else finish(); };
  };
  const finish = () => { if (stage >= 2) return; stage = 2; timers.forEach(clearTimeout); o.classList.add('hidden'); ui.hi = null; V = post; animating = false; render(); if (b.aKO || b.dKO) { SFX.play('ko'); koFlash('💥 ' + ((b.aKO ? fa.name : '') + (b.aKO && b.dKO ? ' & ' : '') + (b.dKO ? fd.name : '')) + ' KO!'); } else SFX.play('hit'); drain(); };
  timers.push(setTimeout(reveal, Math.max(wa.total, wd.total) * 1000 + 400));
  o.onclick = () => { if (stage === 0) reveal(); else if (stage === 1 && b.effSpins && b.effSpins.length) { timers.forEach(clearTimeout); effects(); } else finish(); };
}

function confetti(box, n) {
  const cols = ['#ffcb05', '#34c38f', '#ef6b6b', '#6aa5ff', '#c58cf2', '#fff'];
  for (let i = 0; i < n; i++) { const p = el('i', { class: 'cf' }); p.style.cssText = `left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 2.5}s;animation-duration:${2.6 + Math.random() * 2.4}s;transform:rotate(${Math.random() * 360}deg);width:${6 + Math.random() * 6}px;height:${10 + Math.random() * 8}px`; box.append(p); }
}
// ---- Draft screen
const DRC = { C: '#9aa3b5', UC: '#58c26b', R: '#4aa8ff', EX: '#c58cf2', UX: '#ffcb05' }; let drState = { picks: [], opp: 0 }, drTimerId = null;
function drLock(msg) { $('#drOpts').querySelectorAll('button').forEach(b => (b.disabled = true)); const s = $('#drStatus'); s.classList.remove('hidden'); s.textContent = msg; }
function drawDraftTeam() { const t = $('#drTeam'); t.innerHTML = ''; for (let i = 0; i < 6; i++) { const id = drState.picks[i]; const f = id != null ? FIG[id] : null; t.append(f ? el('div', { class: 'drslot', style: '--rc:' + DRC[f.rarity], title: f.name, onclick: () => infoCard($('#drInfo'), f) }, img(f), el('span', {}, f.name)) : el('div', { class: 'drslot empty' }, String(i + 1))); } }
function drawDraft(m) {
  show('draft'); window.scrollTo(0, 0); drState = { picks: m.picks || [], opp: m.oppPicks || 0 }; $('#drReveal').classList.add('hidden'); $('#drOpts').classList.remove('hidden');
  $('#drTitle').textContent = '🃏 Draft – pick ' + (m.round + 1) + ' of ' + m.total; $('#drSub').textContent = 'Both players are offered 2 ' + ({ C: 'Common', UC: 'Uncommon', R: 'Rare', EX: 'EX', UX: 'Ultra' }[m.rarity] || '') + ' Pokémon this round. Pick one – your opponent picks at the same time, and teams are revealed at the end.';
  const box = $('#drOpts'); box.innerHTML = ''; $('#drStatus').classList.add('hidden'); $('#drOpp').textContent = 'Opponent has picked ' + drState.opp + ' of 6.';
  m.options.forEach((id, idx) => { const f = FIG[id];
    box.append(el('div', { class: 'dcard', style: '--rc:' + DRC[f.rarity] }, el('div', { class: 'dtop' }, img(f), el('div', {}, el('b', {}, f.name), el('div', { class: 'small' }, f.rarity + ' · MP ' + f.mp), el('div', { class: 'tags' }, f.types.map(t => el('span', {}, t))))),
      wheelSvg(f.segs), (f.ability && !/^none/i.test(f.ability)) ? el('div', { class: 'small dab' }, el('b', {}, 'Ability: '), f.ability) : el('div', { class: 'small muted' }, 'No ability'),
      el('button', { class: 'primary', onclick: () => { send({ t: 'draftPick', idx }); drLock('Pick locked in – waiting for your opponent…'); } }, 'Pick ' + f.name))); });
  if (m.picked) drLock('Pick locked in – waiting for your opponent…');
  drawDraftTeam(); clearInterval(drTimerId); const tick = () => { const s = Math.max(0, Math.ceil((m.deadline - Date.now()) / 1000)); $('#drTimer').textContent = '⏱ ' + s + 's'; $('#drTimer').classList.toggle('low', s <= 7); }; tick(); drTimerId = setInterval(tick, 500);
}
function drDone(m) {
  clearInterval(drTimerId); $('#drTimer').textContent = ''; $('#drOpts').classList.add('hidden'); $('#drStatus').classList.add('hidden'); $('#drTitle').textContent = '🃏 Teams revealed!'; $('#drSub').textContent = 'The duel starts in a moment…'; drState.picks = m.mine; drawDraftTeam();
  const r = $('#drReveal'); r.classList.remove('hidden'); r.innerHTML = ''; r.append(el('h4', {}, 'Opponent’s team'), el('div', { class: 'drteam' }, ...m.theirs.map(id => { const f = FIG[id]; return el('div', { class: 'drslot', style: '--rc:' + DRC[f.rarity], title: f.name }, img(f), el('span', {}, f.name)); })), el('div', { class: 'small muted' }, 'Plates were dealt at random (' + (m.plates || []).map(k => (PL[k] || {}).name || k).join(', ') + ').'));
}
function showEnd() {
  if (endShown) return; endShown = true; const o = $('#endOverlay');
  setTimeout(() => {
    if (!V || !V.over) return;
    const draw = V.winner == null, won = V.winner === V.seat; const cls = draw ? 'draw' : won ? 'win' : 'lose';
    SFX.play(draw ? 'hit' : won ? 'win' : 'lose'); const title = draw ? 'DRAW' : won ? 'VICTORY!' : 'DEFEAT'; const me = V.players[V.seat], opp = V.players[1 - V.seat];
    const card = el('div', { class: 'endcard ' + cls }, el('div', { class: 'endglow' }));
    card.append(el('div', { class: 'endtitle' }, ...title.split('').map((ch, i) => el('span', { style: `animation-delay:${0.15 + i * 0.07}s` }, ch))));
    if (V.endFid && FIG[V.endFid]) card.append(el('div', { class: 'endfig' }, el('div', { class: 'ring' }), img(FIG[V.endFid]), el('div', { class: 'endfigname' }, FIG[V.endFid].name)));
    card.append(el('div', { class: 'endreason' }, V.reason));
    card.append(el('div', { class: 'endstats' }, el('div', {}, el('b', {}, V.turn), 'turns'), el('div', {}, el('b', {}, opp.kos), 'enemies defeated'), el('div', {}, el('b', {}, me.kos), 'Pokémon lost'), ));
    const btns = el('div', { class: 'endbtns' }); const camp = window.campFight; const pvp = !!window.pvpMode;
    const rem = random => () => { send({ t: 'rematch', random, deck: camp ? undefined : deck }); if (!(session && session.bot)) { btns.querySelectorAll('button.rm').forEach(b => { b.disabled = true; }); note.textContent = 'Waiting for your opponent to accept…'; } else o.classList.add('hidden'); };
    const note = el('div', { class: 'small muted' }, '');
    if (camp && window.Camp) { const rw = Camp.finish(V); if (rw) card.append(rw); }
    btns.append(el('button', { class: 'primary rm', onclick: pvp ? () => { Camp.pvpRematch(); btns.querySelectorAll('button.rm').forEach(b => { b.disabled = true; }); note.textContent = 'Waiting for your opponent to accept…'; } : rem(false) }, '⚔ Rematch'));
    if (pvp) card.append(el('div', { class: 'small muted' }, 'Collection PvP – this result is saved to your PvP record.'));
    if (!camp && !pvp) btns.append(el('button', { class: 'rm', onclick: rem(true) }, '🎲 Rematch · random team'));
    btns.append(camp || pvp ? el('button', { onclick: () => { o.classList.add('hidden'); Camp.leaveToCamp(); } }, pvp ? '🤝 Back to PvP lobby' : '⭐ Back to campaign') : el('button', { onclick: () => { o.classList.add('hidden'); sessionStorage.removeItem('duel_session'); V = null; show('deck'); renderDeck(); } }, 'Team builder'));
    card.append(btns, note); if (won) { const cf = el('div', { class: 'confetti' }); confetti(cf, 110); card.append(cf); }
    o.innerHTML = ''; o.append(card); o.classList.remove('hidden');
  }, 1300);
}

document.addEventListener('visibilitychange', () => { if (session && session.bot) send({ t: 'vis', hidden: document.hidden }); });

(function () { const b = document.getElementById('btnSnd'); if (!b) return; const upd = () => (b.textContent = SFX.on ? '🔊' : '🔇'); upd(); b.onclick = () => { SFX.toggle(); upd(); SFX.play('select'); };
  document.addEventListener('keydown', e => { if (/input|textarea/i.test((e.target || {}).tagName || '')) return; if (e.key === 'm' || e.key === 'M') { SFX.toggle(); upd(); } if (e.key === 'Escape' && typeof V !== 'undefined' && V) { ui.sel = null; ui.plate = null; clearPreview(); render(); } }); })();
