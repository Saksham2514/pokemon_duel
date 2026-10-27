'use strict';
// Procedural board backgrounds. paintTheme(name, sv, defs, svg, box) appends SVG nodes only.
const THEME_LIST = [['marble', 'Marble'], ['cave', 'Rock cave'], ['ocean', 'Ocean'], ['foil', 'Silver foil'], ['crystal', 'Crystal'], ['lava', 'Lava'], ['forest', 'Forest'], ['ice', 'Ice'], ['shadow', 'Shadow'], ['cosmos', 'Cosmos'], ['desert', 'Desert']];
const THEME_BY_CH = { c1: 'cave', c2: 'ocean', c3: 'foil', c4: 'crystal', c5: 'lava', c6: 'forest', c7: 'ice', c8: 'marble', c9: 'marble', c10: 'shadow', c11: 'cosmos', c12: 'desert' };
const THEME_ROOM = { marble: '#6b3f22', cave: '#3a3028', ocean: '#0c2f55', foil: '#2c3038', crystal: '#2a1050', lava: '#4a1008', forest: '#123016', ice: '#1c3a52', shadow: '#150a22', cosmos: '#050816', desert: '#5a3c18' };
function themeRand(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function paintTheme(name, sv, defs, svg, B) {
  const R = { x: B.x, y: B.y, width: B.w, height: B.h };
  const noise = (id, bf, oct, seed, matrix) => defs.append(sv('filter', { id, filterUnits: 'userSpaceOnUse', x: B.x, y: B.y, width: B.w, height: B.h }, sv('feTurbulence', { type: 'fractalNoise', baseFrequency: bf, numOctaves: oct, seed, result: 'n' }), sv('feColorMatrix', { in: 'n', type: 'matrix', values: matrix })));
  const rect = (fill, extra) => svg.append(sv('rect', Object.assign({}, R, { fill }, extra || {})));
  const layer = (id, op, blend) => svg.append(sv('rect', Object.assign({}, R, { filter: `url(#${id})`, opacity: op, style: blend ? 'mix-blend-mode:' + blend : '' })));
  const grad = (id, stops, attrs) => defs.append(sv('linearGradient', Object.assign({ id, x1: 0, y1: 0, x2: 0, y2: 1 }, attrs || {}), ...stops.map(([o, c]) => sv('stop', { offset: o, 'stop-color': c }))));
  switch (name) {
    case 'lava': {
      rect('#150403'); noise('tn3', '0.012 0.016', 5, 5, '0 0 0 0 0.12  0 0 0 0 0.04  0 0 0 0 0.03  0 4 0 0 -1.6'); layer('tn3', 0.95);
      noise('tn1', '0.011 0.015', 5, 3, '0 0 0 0 1  0 0 0 0 0.28  0 0 0 0 0.03  0 11 0 0 -6.0'); layer('tn1', 1);
      noise('tn2', '0.011 0.015', 5, 3, '0 0 0 0 1  0 0 0 0 0.85  0 0 0 0 0.35  0 16 0 0 -9.6'); layer('tn2', 0.45, 'screen'); break; }
    case 'ocean': {
      grad('tg', [[0, '#0a5ea8'], [1, '#07264f']]); rect('url(#tg)'); noise('tn1', '0.008 0.05', 4, 2, '0 0 0 0 0.8  0 0 0 0 0.95  0 0 0 0 1  2 2 0 0 -1.15'); layer('tn1', 0.7, 'screen');
      noise('tn2', '0.02 0.012', 3, 7, '0 0 0 0 0.5  0 0 0 0 0.85  0 0 0 0 1  1.6 1.6 0 0 -0.8'); layer('tn2', 0.35, 'screen'); break; }
    case 'foil': {
      grad('tg', [[0, '#c4c9d1'], [0.5, '#8f959f'], [1, '#b9bec6']]); rect('url(#tg)'); noise('tn1', '0.015 0.02', 5, 11, '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2.2 2.2 2.2 0 -1.1'); layer('tn1', 0.9);
      noise('tn2', '0.006 0.01', 3, 21, '1.6 0 0 0 0  0 1.6 0 0 0  0 0 1.6 0 0  0 0 0 0 0.55'); layer('tn2', 0.45, 'overlay');
      grad('tr', [[0, '#ff4d6d'], [0.25, '#ffd24d'], [0.5, '#4dff88'], [0.75, '#4dc3ff'], [1, '#b04dff']], { x1: 0, y1: 0, x2: 1, y2: 1 }); rect('url(#tr)', { opacity: 0.16 }); break; }
    case 'crystal': {
      rect('#2a0f4a'); const rnd = themeRand(77); const cols = ['#4b1d86', '#6a2fb5', '#37146a', '#7d3fd0', '#a066e8', '#2a0f4a', '#5a24a0'];
      for (let i = 0; i < 70; i++) { const cx = B.x + rnd() * B.w, cy = B.y + rnd() * B.h, r = 60 + rnd() * 140, a = rnd() * 6.28, pts = [0, 1, 2].map(k => { const t = a + k * 2.1 + rnd() * 0.6; const rr = r * (0.55 + rnd() * 0.6); return (cx + Math.cos(t) * rr).toFixed(0) + ',' + (cy + Math.sin(t) * rr).toFixed(0); }).join(' '); svg.append(sv('polygon', { points: pts, fill: cols[(rnd() * cols.length) | 0], opacity: 0.55, stroke: '#c7a0ff33', 'stroke-width': 1.5 })); }
      grad('tg', [[0, '#ffffff22'], [0.5, '#ffffff00'], [1, '#00000066']]); rect('url(#tg)'); break; }
    case 'forest': {
      rect('#143a14'); noise('tn1', '0.02 0.02', 5, 4, '0 0 0 0 0.25  0 0 0 0 0.62  0 0 0 0 0.2  2 2 0 0 -0.9'); layer('tn1', 0.8); noise('tn2', '0.05 0.05', 3, 8, '0 0 0 0 0.04  0 0 0 0 0.16  0 0 0 0 0.05  2.5 2.5 2.5 0 -1.2'); layer('tn2', 0.75);
      const rnd = themeRand(5); for (let i = 0; i < 25; i++) svg.append(sv('ellipse', { cx: B.x + rnd() * B.w, cy: B.y + rnd() * B.h, rx: 30 + rnd() * 60, ry: 12 + rnd() * 20, fill: '#9be56a', opacity: 0.08 + rnd() * 0.08, transform: `rotate(${(rnd() * 80 - 40) | 0})` })); break; }
    case 'ice': {
      grad('tg', [[0, '#dff3ff'], [1, '#8fc4e8']]); rect('url(#tg)'); noise('tn0', '0.008 0.012', 5, 2, '0 0 0 0 0.3  0 0 0 0 0.55  0 0 0 0 0.85  2.2 2.2 2.2 0 -0.9'); layer('tn0', 0.7); noise('tn1', '0.01 0.03', 5, 6, '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3 3 3 0 -1.6'); layer('tn1', 0.95);
      noise('tn2', '0.03 0.008', 3, 13, '0 0 0 0 0.3  0 0 0 0 0.6  0 0 0 0 0.9  2 2 2 0 -1.1'); layer('tn2', 0.5); break; }
    case 'shadow': {
      grad('tg', [[0, '#1a0b2e'], [1, '#08030f']]); rect('url(#tg)'); noise('tn1', '0.008 0.012', 5, 17, '0 0 0 0 0.5  0 0 0 0 0.2  0 0 0 0 0.85  2 2 0 0 -1.15'); layer('tn1', 0.7, 'screen');
      noise('tn2', '0.02 0.02', 4, 3, '0 0 0 0 0.1  0 0 0 0 0.9  0 0 0 0 0.7  2.8 0 0 0 -1.9'); layer('tn2', 0.35, 'screen'); break; }
    case 'cosmos': {
      grad('tg', [[0, '#0a1240'], [1, '#02030c']]); rect('url(#tg)'); noise('tn1', '0.006 0.008', 5, 31, '0 0 0 0 0.7  0 0 0 0 0.3  0 0 0 0 1  2 2 0 0 -1.1'); layer('tn1', 0.65, 'screen');
      noise('tn2', '0.01 0.01', 4, 41, '0 0 0 0 0.2  0 0 0 0 0.7  0 0 0 0 1  2 0 2 0 -1.2'); layer('tn2', 0.5, 'screen');
      const rnd = themeRand(9); for (let i = 0; i < 160; i++) svg.append(sv('circle', { cx: B.x + rnd() * B.w, cy: B.y + rnd() * B.h, r: 0.6 + rnd() * 1.8, fill: '#fff', opacity: 0.4 + rnd() * 0.6 })); break; }
    case 'desert': {
      grad('tg', [[0, '#e0bb70'], [1, '#b98c45']]); rect('url(#tg)'); noise('tn1', '0.003 0.04', 5, 14, '0 0 0 0 0.45  0 0 0 0 0.28  0 0 0 0 0.08  3 3 0 0 -1.7'); layer('tn1', 0.8);
      noise('tn2', '0.03 0.03', 3, 3, '0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.8  2 2 2 0 -1.2'); layer('tn2', 0.35); break; }
    case 'cave': {
      rect('#5d554a'); noise('tn1', '0.03 0.03', 6, 12, '0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  3.2 3.2 3.2 0 -1.5'); layer('tn1', 0.9); noise('tn2', '0.015 0.015', 5, 7, '0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.75  3 3 3 0 -1.9'); layer('tn2', 0.55, 'screen'); noise('tn3', '0.06 0.06', 3, 2, '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 3 3 0 -1.6'); layer('tn3', 0.5); break; }
    default: { // marble
      rect('#a9b2c1'); noise('tn1', '0.008 0.014', 5, 7, '0 0 0 0 0.3  0 0 0 0 0.36  0 0 0 0 0.48  0 7 0 0 -3.8'); layer('tn1', 0.8);
      noise('tn2', '0.01 0.016', 5, 3, '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 -7 0 0 3.2'); layer('tn2', 0.7); noise('tn3', '0.03 0.02', 4, 9, '0 0 0 0 0.15  0 0 0 0 0.2  0 0 0 0 0.3  0 9 0 0 -5.2'); layer('tn3', 0.5); }
  }
  defs.append(sv('radialGradient', { id: 'vig', cx: '50%', cy: '50%', r: '75%' }, sv('stop', { offset: '0.6', 'stop-color': '#000', 'stop-opacity': 0 }), sv('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': 0.4 })));
  svg.append(sv('rect', Object.assign({}, R, { fill: 'url(#vig)' })));
}
