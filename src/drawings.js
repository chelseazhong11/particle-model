// Static SVG drawings: small jar icons (panel 4) and the
// solid <-> liquid <-> gas diagram (panel 5). Every state uses 9 particles,
// because heating and cooling never change how many particles there are.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Particle centers for 9 particles in a 100 x 100 box.
const LAYOUTS = {
  solid: [
    [34, 50], [50, 50], [66, 50],
    [34, 66], [50, 66], [66, 66],
    [34, 82], [50, 82], [66, 82],
  ],
  liquid: [
    [22, 82], [38, 82], [54, 82], [70, 82], [86, 80],
    [30, 68], [46, 69], [62, 68], [78, 67],
  ],
  gas: [
    [24, 22], [70, 18], [48, 38], [82, 44], [22, 54],
    [58, 60], [36, 78], [76, 76], [52, 88],
  ],
};

function el(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function particles(kind, r, transform = '') {
  const g = el('g', { transform, class: 'svg-particles' });
  for (const [x, y] of LAYOUTS[kind]) g.append(el('circle', { cx: x, cy: y, r }));
  return g;
}

export function jarIcon(kind) {
  const svg = el('svg', { viewBox: '0 0 100 110', class: 'jar-icon', 'aria-hidden': 'true' });
  svg.append(
    el('rect', { x: 10, y: 14, width: 80, height: 92, rx: 14, class: 'svg-glass' }),
    el('rect', { x: 6, y: 4, width: 88, height: 14, rx: 5, class: 'svg-lid' }),
    particles(kind, 7.5, 'translate(0 14)'),
  );
  return svg;
}

export function cycleDiagram() {
  const svg = el('svg', {
    viewBox: '0 0 640 340',
    class: 'cycle-diagram',
    role: 'img',
    'aria-label':
      'Solid, liquid, and gas boxes with 9 particles each. Heating arrows: melting then evaporating. Cooling arrows: condensing then freezing.',
  });

  const defs = el('defs');
  for (const [id, cls] of [['arrow-heat', 'svg-heat'], ['arrow-cool', 'svg-cool']]) {
    const marker = el('marker', {
      id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse',
    });
    marker.append(el('path', { d: 'M0,0 L10,5 L0,10 z', class: cls }));
    defs.append(marker);
  }
  svg.append(defs);

  const boxes = [
    ['solid', 'Solid', 30],
    ['liquid', 'Liquid', 250],
    ['gas', 'Gas', 470],
  ];
  for (const [kind, label, x] of boxes) {
    svg.append(
      el('rect', { x, y: 70, width: 140, height: 175, rx: 14, class: `svg-box svg-box-${kind}` }),
      particles(kind, 8, `translate(${x + 20} 82)`),
    );
    const name = el('text', { x: x + 70, y: 214, class: 'svg-label' });
    name.textContent = label;
    const count = el('text', { x: x + 70, y: 234, class: 'svg-small' });
    count.textContent = '9 particles';
    svg.append(name, count);
  }

  // Cooling arrows arc over the top (right to left), heating arrows under
  // the bottom (left to right), like the storyboard.
  const arrows = [
    ['M 530 62 C 500 10, 360 10, 330 62', 'cool', 'condensing', 430, 14],
    ['M 310 62 C 280 10, 140 10, 110 62', 'cool', 'freezing', 210, 14],
    ['M 110 253 C 140 305, 280 305, 310 253', 'heat', 'melting', 210, 330],
    ['M 330 253 C 360 305, 500 305, 530 253', 'heat', 'evaporating', 430, 330],
  ];
  for (const [d, kind, word, tx, ty] of arrows) {
    svg.append(el('path', { d, class: `svg-arrow svg-${kind}`, 'marker-end': `url(#arrow-${kind})` }));
    const t = el('text', { x: tx, y: ty, class: `svg-word svg-${kind}-text` });
    t.textContent = word;
    svg.append(t);
  }
  return svg;
}
