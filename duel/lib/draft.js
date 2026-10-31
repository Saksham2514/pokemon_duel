'use strict';
// Draft mode: 6 rounds, each player is offered 2 Pokémon of the same rarity band and keeps one.
const { LIST } = require('./figures'); const { PLATES } = require('./plates'); const E = require('./engine');
const baseName = f => f.name.replace(/^(Mega|Shiny|Alolan|Galarian|Hisuian|Primal|Origin|Therian|Incarnate)\s+/i, '').split(/[ (]/)[0];
const POOL = LIST.filter(f => f.mp >= 1 && !/can only be set as a form/i.test(f.ability || ''));
const TEMPLATES = [['UC', 'UC', 'R', 'R', 'EX', 'UX'], ['C', 'UC', 'R', 'EX', 'EX', 'UX'], ['UC', 'R', 'R', 'R', 'EX', 'EX'], ['C', 'R', 'R', 'EX', 'UX', 'UX'], ['UC', 'UC', 'R', 'EX', 'EX', 'UX']];
const shuffle = (a, rnd) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Both players see the same rarity sequence; every one of the 12 offered Pokémon has a different base name, so any combination of picks is a legal deck.
function makeOffers(rnd) {
  rnd = rnd || Math.random; const rar = shuffle(TEMPLATES[(rnd() * TEMPLATES.length) | 0], rnd); const used = new Set();
  const offers = [[], []];
  for (const seat of [0, 1]) for (const r of rar) {
    const cand = shuffle(POOL.filter(f => f.rarity === r && !used.has(baseName(f))), rnd); const pair = [];
    for (const f of cand) { if (pair.length >= 2) break; if (pair.some(p => baseName(LIST.find(x => x.id === p)) === baseName(f))) continue; pair.push(f.id); used.add(baseName(f)); }
    offers[seat].push(pair);
  }
  return { rar, offers };
}
function plateSet(rnd) { rnd = rnd || Math.random; const pl = []; let c = 0; for (const k of shuffle(Object.keys(PLATES), rnd)) if (c + PLATES[k].cost <= E.MAX_COST) { pl.push(k); c += PLATES[k].cost; } return pl; }
module.exports = { makeOffers, plateSet, POOL };
