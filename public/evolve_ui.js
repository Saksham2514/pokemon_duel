// Deck-builder helpers for evolutions and Mega forms. A deck keeps `figs` (6 slots) plus parallel arrays `evo[i]` (ordered evolution ids, max 2) and `mega[i]` (one Mega id or 0).
window.EvoUI = (function () {
  const sp = n => String(n).replace(/^Shiny\s+/, '');
  const isMega = n => /^(?:Shiny\s+)?(?:Mega|Primal)\s+/.test(n);
  const megaBase = n => sp(n).replace(/^(?:Mega|Primal)\s+/, '').replace(/\s+[XY]$/, '');
  const canEvo = (a, b) => ((DATA.evo && DATA.evo.next[sp(a)]) || []).includes(sp(b));
  const canMega = (a, m) => isMega(m) && megaBase(m) === sp(a);
  function norm(d) { d.evo = d.evo || []; d.mega = d.mega || []; for (let i = 0; i < 6; i++) { d.evo[i] = d.evo[i] || []; d.mega[i] = d.mega[i] || 0; } d.evo.length = 6; d.mega.length = 6; return d; }
  function removeSlot(d, i) { norm(d); d.figs.splice(i, 1); d.evo.splice(i, 1); d.mega.splice(i, 1); norm(d); }
  function clear(d) { d.figs = []; d.evo = []; d.mega = []; }
  const extraIds = d => [...(d.evo || []).flat(), ...(d.mega || []).filter(Boolean)];
  function options(d, i, kind, avail) {
    norm(d); const base = FIG[d.figs[i]]; if (!base) return []; const chain = [base, ...d.evo[i].map(id => FIG[id])];
    if (kind === 'evo') { if (chain.length >= 3) return []; const last = chain[chain.length - 1]; return DATA.figures.filter(f => canEvo(last.name, f.name) && avail(f.id)); }
    return DATA.figures.filter(f => chain.some(c => canMega(c.name, f.name)) && avail(f.id));
  }
  function pick(title, list, onPick) {
    const ov = el('div', { class: 'overlay chestov' }); const grid = el('div', { class: 'figgrid', style: 'max-height:60vh;overflow:auto' });
    list.forEach(f => grid.append(el('div', { class: 'fig', onclick: () => { ov.remove(); onPick(f.id); }, title: f.name }, img(f), el('span', { class: 'mp' }, f.mp), el('div', { class: 'nm' }, f.name))));
    ov.append(el('div', { class: 'chestbox storybox', style: 'max-width:640px' }, el('h3', {}, title), grid, el('div', { class: 'row' }, el('button', { onclick: () => ov.remove() }, 'Cancel')))); document.body.append(ov);
  }
  // avail(id) -> may this figure still be added (owned copy free in campaign; always true in free play)
  function extras(d, i, avail, onChange) {
    norm(d); const id = d.figs[i]; if (!id) return el('div', { class: 'slotx' });
    const w = el('div', { class: 'slotx' });
    d.evo[i].forEach((eid, k) => w.append(el('span', { class: 'xchip', title: 'Click to remove', onclick: e => { e.stopPropagation(); d.evo[i].splice(k); onChange(); } }, '✨ ' + FIG[eid].name + ' ✕')));
    if (d.mega[i]) w.append(el('span', { class: 'xchip mega', title: 'Click to remove', onclick: e => { e.stopPropagation(); d.mega[i] = 0; onChange(); } }, '💎 ' + FIG[d.mega[i]].name + ' ✕'));
    const eo = options(d, i, 'evo', avail), mo = d.mega[i] ? [] : options(d, i, 'mega', avail);
    if (eo.length) w.append(el('button', { class: 'xbtn', title: 'Choose what this Pokémon can evolve into after a battle', onclick: e => { e.stopPropagation(); pick('Evolve ' + FIG[id].name + ' into…', eo, p => { d.evo[i].push(p); onChange(); }); } }, '＋ Evolution'));
    if (mo.length) w.append(el('button', { class: 'xbtn mega', title: 'Needs the Mega Ring plate in your deck', onclick: e => { e.stopPropagation(); pick('Mega form for ' + FIG[id].name, mo, p => { d.mega[i] = p; onChange(); }); } }, '＋ Mega'));
    return w;
  }
  return { norm, removeSlot, clear, extras, extraIds, canEvo, canMega, isMega };
})();
