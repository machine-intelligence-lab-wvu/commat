/* MILab hero: a real crystal from the public CoMMat gallery (huggingface.co/spaces/imranrimon/CoMMat,
   site/assets/gallery.json; CHGNet-relaxed, symmetrized to the conventional cell). On load the atoms move from random
   positions to their lattice sites in four steps, an illustration of few-step generation (not a recorded sampling path). */
(function () {
  const CRYSTALS = [{"formula":"Tb3PbC","sg":"Pm-3m","lattice":[[4.9551,0.0,0.0],[0.0,4.9551,0.0],[0.0,0.0,4.9551]],"species":["Tb","Tb","Tb","Pb","C"],"frac":[[0.0,0.5,0.0],[0.5,0.0,0.0],[0.0,0.0,0.5],[0.5,0.5,0.5],[0.0,0.0,0.0]]},{"formula":"TiBeRu2","sg":"Fm-3m","lattice":[[5.9019,0.0,0.0],[0.0,5.9019,0.0],[0.0,0.0,5.9019]],"species":["Ti","Ti","Ti","Ti","Be","Be","Be","Be","Ru","Ru","Ru","Ru","Ru","Ru","Ru","Ru"],"frac":[[0.0,0.5,0.5],[0.0,0.0,0.0],[0.5,0.5,0.0],[0.5,0.0,0.5],[0.0,0.5,0.0],[0.0,0.0,0.5],[0.5,0.5,0.5],[0.5,0.0,0.0],[0.75,0.75,0.75],[0.25,0.75,0.75],[0.75,0.25,0.25],[0.25,0.25,0.25],[0.25,0.75,0.25],[0.75,0.75,0.25],[0.25,0.25,0.75],[0.75,0.25,0.75]]},{"formula":"Ta2V3Ru","sg":"P6_3/mmc","lattice":[[2.5233,-4.3705,0.0],[2.5233,4.3705,0.0],[0.0,0.0,8.2249]],"species":["Ta","Ta","Ta","Ta","V","V","V","V","V","V","Ru","Ru"],"frac":[[0.6667,0.3333,0.9378],[0.3333,0.6667,0.4378],[0.3333,0.6667,0.0622],[0.6667,0.3333,0.5622],[0.6507,0.8253,0.75],[0.1747,0.8253,0.75],[0.8253,0.6507,0.25],[0.1747,0.3493,0.75],[0.3493,0.1747,0.25],[0.8253,0.1747,0.25],[0.0,0.0,0.0],[0.0,0.0,0.5]]}];
  // Element colours (muted CPK-style) and drawing radii (angstrom-like units)
  const EL = {
    Tb: ['#2ba59a', 1.75], Pb: ['#5b6271', 1.75], C: ['#7b8494', 0.8],
    Ti: ['#9ea8b6', 1.47], Be: ['#a9c23f', 1.12], Ru: ['#2f8a8a', 1.34],
    Ta: ['#3d7cc9', 1.46], V: ['#a39fb8', 1.34]
  };
  const svg = document.getElementById('crystal');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const W = 560, H = 480, PAD = 46;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0, timers = [];

  function mix(hex, to, t) {  // blend a colour toward white ('w') or black ('k') by fraction t
    const a = parseInt(hex.slice(1), 16), b = to === 'w' ? 255 : 0;
    return '#' + [16, 8, 0].map(sh => {
      const v = (a >> sh) & 255;
      return Math.round(v + (b - v) * t).toString(16).padStart(2, '0');
    }).join('');
  }
  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function cart(f, L) {
    return [0, 1, 2].map(j => f[0] * L[0][j] + f[1] * L[1][j] + f[2] * L[2][j]);
  }
  // view: rotate about the c axis, then look slightly down onto the ab plane
  const phi = -0.62, eps = 0.36;
  function view(p) {
    const x1 = p[0] * Math.cos(phi) - p[1] * Math.sin(phi);
    const y1 = p[0] * Math.sin(phi) + p[1] * Math.cos(phi);
    const z1 = p[2];
    return { x: x1, y: -(z1 * Math.cos(eps) + y1 * Math.sin(eps)), d: y1 * Math.cos(eps) - z1 * Math.sin(eps) };
  }
  function build(c) {
    const L = c.lattice, sites = [];
    c.species.forEach((sp, i) => {
      const f = c.frac[i];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let g = -1; g <= 1; g++) {
        const q = [f[0] + a, f[1] + b, f[2] + g];
        if (q.every(v => v > -0.02 && v < 1.02)) sites.push({ sp, f: q });
      }
    });
    const corners = [];
    for (let i = 0; i < 8; i++) corners.push([(i >> 0) & 1, (i >> 1) & 1, (i >> 2) & 1]);
    const all = corners.map(f => view(cart(f, L))).concat(sites.map(s => view(cart(s.f, L))));
    const xs = all.map(p => p.x), ys = all.map(p => p.y);
    const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
    const s = Math.min((W - 2 * PAD) / (maxx - minx), (H - 2 * PAD) / (maxy - miny));
    const ox = (W - s * (maxx - minx)) / 2 - s * minx, oy = (H - s * (maxy - miny)) / 2 - s * miny;
    const P = f => { const v = view(cart(f, L)); return { x: ox + s * v.x, y: oy + s * v.y, d: v.d }; };
    const cp = corners.map(P);
    const far = cp.reduce((k, p, i) => (p.d > cp[k].d ? i : k), 0);
    const edges = [];
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
      const diff = corners[i].map((v, k) => Math.abs(v - corners[j][k])).reduce((u, v) => u + v, 0);
      if (diff === 1) edges.push({ a: cp[i], b: cp[j], back: i === far || j === far });
    }
    return { edges, scale: s, sites: sites.map(t => Object.assign({}, t, P(t.f))), P };
  }
  function render(idx, animate) {
    timers.forEach(clearTimeout); timers = [];
    const c = CRYSTALS[idx], g = build(c);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const title = el('title', { id: 'crystal-title' }, svg);
    title.textContent = c.formula + ' crystal structure (' + c.sg + '), from the CoMMat gallery';
    const defs = el('defs', {}, svg);
    Object.keys(EL).forEach(sym => {
      const base = EL[sym][0], rg = el('radialGradient', { id: 'g-' + sym, cx: '36%', cy: '32%', r: '72%' }, defs);
      el('stop', { offset: '0%', 'stop-color': mix(base, 'w', 0.55) }, rg);
      el('stop', { offset: '55%', 'stop-color': base }, rg);
      el('stop', { offset: '100%', 'stop-color': mix(base, 'k', 0.35) }, rg);
    });
    const lines = el('g', { class: 'cell' }, svg);
    g.edges.forEach(e => el('line', { x1: e.a.x, y1: e.a.y, x2: e.b.x, y2: e.b.y, class: e.back ? 'back' : '' }, lines));
    const atoms = el('g', { class: 'atoms' }, svg);
    const order = g.sites.slice().sort((p, q) => q.d - p.d);
    const nodes = order.map(t => el('circle', { cx: t.x, cy: t.y, r: 0.36 * EL[t.sp][1] * g.scale, fill: 'url(#g-' + t.sp + ')' }, atoms));
    document.getElementById('crystal-name').innerHTML = c.formula.replace(/(\d+)/g, '<sub>$1</sub>');
    const legend = document.getElementById('crystal-legend');
    legend.innerHTML = '';
    [...new Set(c.species)].forEach(sym => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="dot" style="background:' + EL[sym][0] + '"></span>' + sym;
      legend.appendChild(li);
    });
    if (!animate || reduce) return;
    // noise -> lattice in four discrete steps: each atom starts offset toward a random point in the cell and the
    // offset shrinks to 3/4, 1/2, 1/4, 0 (timers + a CSS transition, so it runs the same in every browser)
    const noise = order.map(() => g.P([Math.random(), Math.random(), Math.random()]));
    const K = 4, STEP = 410;
    const shift = (w) => nodes.forEach((n, i) => {
      n.style.transform = 'translate(' + ((noise[i].x - order[i].x) * w).toFixed(2) + 'px,' +
                                         ((noise[i].y - order[i].y) * w).toFixed(2) + 'px)';
    });
    nodes.forEach(n => { n.style.transition = 'none'; });
    shift(1);
    svg.getBoundingClientRect();  // commit the start positions before transitions are switched on
    nodes.forEach(n => { n.style.transition = 'transform 300ms cubic-bezier(.2,.7,.2,1)'; });
    for (let k = 1; k <= K; k++) timers.push(setTimeout(() => shift(1 - k / K), 120 + (k - 1) * STEP));
  }
  const next = document.getElementById('crystal-next');
  if (next) next.addEventListener('click', () => { current = (current + 1) % CRYSTALS.length; render(current, true); });
  const q = parseInt(new URLSearchParams(location.search).get('c'), 10);  // ?c=1 opens another crystal
  if (q >= 0 && q < CRYSTALS.length) current = q;
  render(current, true);
})();
