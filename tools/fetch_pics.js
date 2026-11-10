'use strict';
// Download every Pokémon picture once and store it in the repo (pics/<id>.jpg) so the game never depends on the upstream site again.
//   node tools/fetch_pics.js          (run on your own computer - it needs internet access to the picture host)
// Then commit the pics/ folder. Already-downloaded files are skipped, so it is safe to re-run.
const fs = require('fs'), path = require('path'); const { LIST } = require('../lib/figures');
const dir = path.join(__dirname, '..', 'pics'); fs.mkdirSync(dir, { recursive: true });
let done = 0, skipped = 0; const failed = []; let i = 0;
async function worker() {
  while (i < LIST.length) {
    const f = LIST[i++]; const file = path.join(dir, f.id + '.jpg');
    if (fs.existsSync(file) && fs.statSync(file).size > 100) { skipped++; continue; }
    try { const r = await fetch(f.picture, { signal: AbortSignal.timeout(15000) }); const ct = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//.test(ct)) throw new Error(r.status + ' ' + ct); fs.writeFileSync(file, Buffer.from(await r.arrayBuffer())); done++;
    } catch (e) { failed.push(f.id + ' ' + f.name + ' (' + e.message + ')'); }
    if ((done + failed.length) % 50 === 0) console.log(done + skipped + failed.length, '/', LIST.length);
  }
}
Promise.all([worker(), worker(), worker(), worker()]).then(() => { console.log(`downloaded ${done}, already present ${skipped}, failed ${failed.length}`); if (failed.length) console.log(failed.join('\n')); const bytes = fs.readdirSync(dir).reduce((a, n) => a + fs.statSync(path.join(dir, n)).size, 0); console.log('pics/ total ' + (bytes / 1048576).toFixed(1) + ' MB'); });
