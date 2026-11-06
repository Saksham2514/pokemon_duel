'use strict';
// Region data sanity: every stage has a valid ace of an allowed type, every region has a big enough Pokémon pool for each rarity tier it uses.
global.window = {}; require('../public/campaign_regions.js'); require('../public/campaign_regions2.js'); const { LIST } = require('../lib/figures');
let fail = 0; const bad = m => { fail++; console.log('FAIL', m); };
const R = window.CAMP_REGIONS; if (R.length < 6) bad('too few regions');
for (const r of R) {
  if (r.fights.length !== 6) bad(r.id + ' needs 6 stages');
  const okT = f => !r.allow.length || f.types.some(t => r.allow.includes(t));
  if (new Set(LIST.filter(okT).map(f => f.name)).size < 40) bad(r.id + ' pool too small');
  for (const f of r.fights) {
    const a = LIST.filter(x => (x.name.toLowerCase() === f[3].toLowerCase() || x.name.toLowerCase().startsWith(f[3].toLowerCase() + ' ')) && okT(x));
    if (!a.length) bad(`${r.id}: ${f[0]} ace ${f[3]} missing or off-type`);
    if (f[2].length && r.allow.length && !f[2].every(t => r.allow.includes(t))) bad(`${r.id}: ${f[0]} themed types outside allow`);
  }
}
console.log(`region tests: ${fail ? fail + ' FAILED' : 'all passed'} (${R.length} regions)`); process.exit(fail ? 1 : 0);
