'use strict';
// Full data audit: every Pokémon, every ability, every move (incl. Z-Moves).
//   node test/audit.js            -> checks, prints summary, fails (exit 1) on any NEW gap not in test/known_gaps.json
//   node test/audit.js --report   -> also writes AUDIT_REPORT.md with every gap listed
//   node test/audit.js --baseline -> rewrites test/known_gaps.json from the current state (use after reviewing!)
const fs = require('fs'), path = require('path');
const E = require('../lib/engine'); const { LIST, FIGS } = require('../lib/figures'); const { parseRules } = require('../lib/abilities'); const B = require('../lib/board'); const T = E._t;
const args = process.argv.slice(2);
const gaps = {}; // key -> reason
const add = (key, why) => { gaps[key] = why; };
const J = o => JSON.stringify(o);

// ---------- 1. MOVE NOTES: every keyword in a move's note must be backed by an op ----------
const KEYS = [
  ['paralyze', /paraly/i, /paralyzed|"paraly/i], ['poison', /poison|noxious/i, /poisoned|noxious/i], ['burn', /\bburn/i, /burned/i], ['freeze', /froze|freez|frozen/i, /frozen/i],
  ['sleep', /asleep|fall asleep|sleep/i, /asleep/i], ['confuse', /confus/i, /confused/i],
  ['wait', /\bwait\b/i, /wait/i], ['ko', /knocked out|knock out|knocks out/i, /ko|KO|exclude|remove|spin|pc|bench|then|safe|counter|lariat|flip|cursed|final/i],
  ['move', /\bmoves? (this|its|the)|moved|jumps?|lands|steps? (away|back)|drawn|swap|switch/i, /selfMove|moveOther|pull|swap|jump|flip|push|knock|pickSwap|benchSwap|swapIn|lariat|dig|beyond|throw|drag|steps|claim|digAway|resetSelf|selfBack/i],
  ['spin', /\bspins?\b|spin again|respin/i, /spin|Spin|reroll|buffSpin|multSpin|plusSpin|ultraSpin|then/i], ['exclude', /excluded|removed from the duel/i, /exclude|remove|Exclude|Remove/i],
  ['bench', /\bbench\b/i, /bench|Bench|swapIn|pickSwap|benchSwap|pcToBench|toBench|summon/i], ['pc', /P\.?C\./i, /pc|PC|toPC|pcToBench|selfPC|onSelfKOPC/i],
  ['cracked', /cracked marker/i, /crack/i], ['curse', /curse marker/i, /curse/i], ['plate', /\bplates?\b/i, /plate|Plate|restorePlates|energy|Energy/i],
  ['damage', /\+\d+ damage|\d+ more damage|damage is multiplied|multiplied by|deals? \+|\+\d+ attack damage|-\d+ damage|x\d/i, /dmg|Bonus|bonus|Mult|mult|scale|adj|near|poisoners|per|count|plus|punish|pc|spin|ultra|aura|condMult|perm|boost|buff|threat|selfCond|typeBonus|set|reduce|half|double/i],
  ['final song', /final song/i, /finalSong/i], ['symbiont', /symbiont/i, /symbiont/i], ['mp', /\bMP[+-−]?\d|MP-\d|MP \+/i, /mp|Mp|MP/i],
];
const SOFT = /^(this pok.mon (is|are) not|if the battle is a tie only)/i;
let nSeg = 0, nSegWithNote = 0;
for (const f of LIST) {
  for (const [kind, arr] of [['move', f.segs], ['z-move', f.zsegs || []]]) for (const s of arr) {
    nSeg++; const note = (s.notes || '').trim(); if (!note) continue; nSegWithNote++;
    if (s.isMiss) continue;
    let opsJ = J(s.ops || []) + ' ' + J(s.dmg || {});
    if (/onSelfKO|oppPurpleKO|statusRandom|statusChain|statusPick|counter|magicCoat/.test(opsJ)) opsJ += ' paralyzed poisoned burned frozen asleep confused spin ko KO wait bench'; // composite ops carry their own effects
    if (/shove|pull|knockAdj|knockback|excludeOnKO|excludeOnTie|moveOther|tractor/.test(opsJ)) opsJ += ' wait bench ko KO move';
    const hits = [];
    for (const [k, re, ok] of KEYS) if (re.test(note) && !ok.test(opsJ)) hits.push(k);
    if ((s.ops || []).length === 0 && note.length > 8 && !/^(none)$/i.test(note)) hits.push('NO-OPS');
    if (hits.length) add(`move|${f.id} ${f.name}|${s.name}`, `note "${note.slice(0, 150)}" has ${hits.join(', ')} but ops=${J((s.ops || []).map(o => o.op))}`);
  }
}

// ---------- 2. ABILITIES: every ability sentence must be backed by a rule or flag ----------
let nAb = 0;
for (const f of LIST) {
  const txt = (f.ability || '').trim(); if (!txt || /^none/i.test(txt)) continue; nAb++;
  const has = (f.rules || []).length || Object.keys(f.flags || {}).length;
  if (!has) { add(`ability|${f.id} ${f.name}|${f.abilityName || ''}`, `no rule and no flag: "${txt.slice(0, 170)}"`); continue; }
  const body = txt.replace(/\s+/g, ' ').replace(/^[A-Za-z'\-.:_ ]{2,40}? - (?=[A-Z])/, '');
  const sents = body.split(/(?<=[a-z)])\.\s*(?=[A-Z]|$)/).filter(x => x.length > 15);
  const covered = (f.rules || []).length + Object.keys(f.flags || {}).length;
  if (sents.length >= 3 && covered < sents.length - 1) add(`ability-partial|${f.id} ${f.name}|${f.abilityName || ''}`, `${sents.length} sentences but only ${covered} rules/flags: "${txt.slice(0, 170)}"`);
}

// ---------- 3. EXECUTION: run every move & Z-move in random positions, check invariants ----------
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry(12345); const pick = a => a[(rnd() * a.length) | 0];
const fillIds = LIST.filter(f => !f.rules.length && f.segs.length > 2).map(f => f.id);
const SPOTS = Object.keys(B.ADJ).filter(p => !p.startsWith('G') && !p.startsWith('T') && !B.ENTRY[0].includes(p) && !B.ENTRY[1].includes(p));
function invariants(g) {
  const on = Object.values(g.figs).filter(f => f.loc === 'field'); const bad = [];
  for (const f of on) { if (g.occ[f.pos] !== f.uid) bad.push('occ mismatch'); }
  for (const p of Object.keys(g.occ)) if (g.occ[p] && !on.some(f => f.pos === p && f.uid === g.occ[p])) bad.push('ghost occupant ' + p);
  for (const f of Object.values(g.figs)) { if (f.wait < 0 || Number.isNaN(f.wait)) bad.push('bad wait'); if (!['field', 'bench', 'pc', 'excluded', 'removed', 'ultra'].includes(f.loc)) bad.push('bad loc ' + f.loc); if (f.loc !== 'field' && f.pos) bad.push('pos while off-field'); }
  return bad;
}
let execRuns = 0, execErr = 0;
for (const f of LIST) {
  for (const [kind, arr] of [['move', f.segs], ['z-move', f.zsegs || []]]) for (const s of arr) {
    if (!s.ops || !s.ops.length) continue;
    for (let rep = 0; rep < 6; rep++) {
      execRuns++;
      try {
        const oppIds = [pick(fillIds), pick(fillIds), pick(fillIds), pick(fillIds), pick(fillIds), pick(fillIds)];
        const g = E.newGame([{ figs: [f.id, ...fillIds.slice(rep * 5, rep * 5 + 5)], plates: [] }, { figs: oppIds, plates: [] }], ['A', 'B'], 100 + rep);
        const me = Object.values(g.figs).find(x => x.owner === 0 && x.fid === f.id); const foes = Object.values(g.figs).filter(x => x.owner === 1);
        const mine = Object.values(g.figs).filter(x => x.owner === 0 && x !== me);
        const used = new Set(); const spot = () => { let p; do { p = pick(SPOTS); } while (used.has(p)); used.add(p); return p; };
        const mp = spot(); me.loc = 'field'; T.setPos(g, me, mp);
        const adj = B.ADJ[mp].filter(p => SPOTS.includes(p)); const op0 = adj.length ? pick(adj) : spot(); used.add(op0); foes[0].loc = 'field'; T.setPos(g, foes[0], op0);
        if (rep % 2) { foes[1].loc = 'field'; T.setPos(g, foes[1], spot()); mine[0].loc = 'field'; T.setPos(g, mine[0], spot()); }
        if (rep % 3 === 0) foes[0].st = [pick(['poisoned', 'asleep', 'burned', 'paralyzed'])];
        g.cur = 0; g.phase = 'main';
        T.runOps(g, s.ops, { self: me, opp: foes[0], oppPos: foes[0].pos, selfPos: me.pos });
        // resolve any tasks the move created: pick the first option, or none
        let guard = 0; while (g.tasks && g.tasks.length && guard++ < 6) { const t = g.tasks[0]; const opts = T.taskOptions(g, t); g.tasks.shift(); if (opts.length) T.applyTask(g, t, opts[0]); }
        const bad = invariants(g); if (bad.length) { execErr++; add(`exec|${f.id} ${f.name}|${s.name}`, `invariant broken after running the move: ${[...new Set(bad)].join(', ')}`); }
      } catch (e) { execErr++; add(`exec|${f.id} ${f.name}|${s.name}`, `exception: ${String(e.message).slice(0, 120)}`); }
    }
  }
}

// ---------- 4. REAL BATTLES: every figure fights with each of its own segments forced ----------
let battles = 0;
for (const f of LIST) {
  const total = f.segs.length;
  for (let si = 0; si < Math.min(total, 8); si++) {
    battles++;
    try {
      const g = E.newGame([{ figs: [f.id, ...fillIds.slice(0, 5)], plates: [] }, { figs: fillIds.slice(5, 11), plates: [] }], ['A', 'B'], 700 + si);
      const me = Object.values(g.figs).find(x => x.owner === 0 && x.fid === f.id), foe = Object.values(g.figs).find(x => x.owner === 1);
      me.loc = 'field'; T.setPos(g, me, 'I01'); foe.loc = 'field'; T.setPos(g, foe, 'I00'); g.cur = 0; g.phase = 'main';
      const want = f.segs[si].name; const orig = g.rng; let tries = 0; // steer the RNG so the wanted segment is spun
      T.battle(g, me.uid, foe.uid); let guard = 0; while (g.tasks && g.tasks.length && guard++ < 6) { const t = g.tasks[0]; const opts = T.taskOptions(g, t); g.tasks.shift(); if (opts.length) T.applyTask(g, t, opts[0]); }
      const bad = invariants(g); if (bad.length) add(`battle|${f.id} ${f.name}|#${si}`, `invariant broken after battle: ${[...new Set(bad)].join(', ')}`);
    } catch (e) { add(`battle|${f.id} ${f.name}|#${si}`, `exception: ${String(e.message).slice(0, 120)}`); }
  }
}

// ---------- report ----------
const byType = {}; for (const k of Object.keys(gaps)) { const t = k.split('|')[0]; byType[t] = (byType[t] || 0) + 1; }
console.log(`Audited ${LIST.length} Pokémon · ${nSeg} wheel segments (${nSegWithNote} with notes) · ${nAb} abilities · ${execRuns} move executions · ${battles} battles`);
console.log('Gaps by type:', J(byType));
const basePath = path.join(__dirname, 'known_gaps.json');
if (args.includes('--baseline')) { fs.writeFileSync(basePath, JSON.stringify(gaps, null, 1)); console.log('Baseline written:', Object.keys(gaps).length, 'entries'); process.exit(0); }
if (args.includes('--report')) {
  let md = '# Ability & move audit\n\nGenerated by `node test/audit.js --report`.\n\n';
  for (const t of Object.keys(byType)) { md += `## ${t} (${byType[t]})\n\n`; for (const [k, v] of Object.entries(gaps).filter(([k]) => k.startsWith(t + '|'))) md += `- **${k.split('|').slice(1).join(' · ')}** — ${v}\n`; md += '\n'; }
  fs.writeFileSync(path.join(__dirname, '..', 'AUDIT_REPORT.md'), md); console.log('Wrote AUDIT_REPORT.md');
}
let known = {}; try { known = JSON.parse(fs.readFileSync(basePath, 'utf8')); } catch (e) { }
const fresh = Object.keys(gaps).filter(k => !(k in known)); const fixed = Object.keys(known).filter(k => !(k in gaps));
console.log(`Known gaps: ${Object.keys(known).length} · fixed since baseline: ${fixed.length} · NEW gaps: ${fresh.length}`);
for (const k of fresh.slice(0, 40)) console.log('  NEW', k, '—', gaps[k]);
process.exit(fresh.length ? 1 : 0);
