/* ChargiX ambient circuit field.
   Draws a printed-circuit pattern (orthogonal traces with 45° bends, vias and
   pads) once to an offscreen canvas, then sends pulses of current along the
   traces. Runs at ~30fps, sleeps when the tab is hidden, and renders a single
   still frame for reduced-motion visitors. */
(() => {
  const canvas = document.querySelector('[data-ambient-circuit]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const rgb = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  const VOLT = rgb('--volt-rgb', '61, 124, 255');
  const LUX = rgb('--lux-rgb', '230, 201, 143');

  const CELL = 26;
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let W = 0, H = 0, dpr = 1, traces = [], pulses = [], base = null, raf = 0, last = 0, seed = 7;

  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    seed = 7;
    const cols = Math.ceil(W / CELL) + 1, rows = Math.ceil(H / CELL) + 1;
    const used = new Set();
    const key = (x, y) => x + ',' + y;
    traces = [];
    const count = Math.round((cols * rows) / 34);
    for (let n = 0; n < count; n++) {
      let x = Math.floor(rand() * cols), y = Math.floor(rand() * rows);
      if (used.has(key(x, y))) continue;
      // Keep the reading column calmer: fewer starts near the centre.
      const cx = Math.abs(x / cols - 0.5), cy = Math.abs(y / rows - 0.45);
      if (cx < 0.22 && cy < 0.3 && rand() < 0.75) continue;
      let d = Math.floor(rand() * 4) * 2; // start orthogonal
      const pts = [[x, y]];
      used.add(key(x, y));
      const len = 4 + Math.floor(rand() * 22);
      for (let i = 0; i < len; i++) {
        if (rand() < 0.18) d = (d + (rand() < 0.5 ? 1 : 7)) % 8; // 45° bend
        const [dx, dy] = DIRS[d];
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || used.has(key(nx, ny))) break;
        x = nx; y = ny; used.add(key(x, y));
        const prev = pts[pts.length - 1];
        const pd = pts.length > 1 ? [Math.sign(prev[0] - pts[pts.length - 2][0]), Math.sign(prev[1] - pts[pts.length - 2][1])] : null;
        if (pd && pd[0] === dx && pd[1] === dy) pts[pts.length - 1] = [x, y];
        else pts.push([x, y]);
      }
      if (pts.length < 2) continue;
      const px = pts.map(([a, b]) => [a * CELL + 0.5, b * CELL + 0.5]);
      let total = 0;
      const segs = [];
      for (let i = 1; i < px.length; i++) {
        const l = Math.hypot(px[i][0] - px[i - 1][0], px[i][1] - px[i - 1][1]);
        segs.push(l); total += l;
      }
      if (total < CELL * 3) continue;
      traces.push({ px, segs, total, gold: rand() < 0.22 });
    }

    // Static layer: traces, vias, a few chip pads.
    base = document.createElement('canvas');
    base.width = canvas.width; base.height = canvas.height;
    const b = base.getContext('2d');
    b.scale(dpr, dpr);
    b.lineCap = 'round'; b.lineJoin = 'round';
    traces.forEach((t) => {
      b.strokeStyle = t.gold ? `rgba(${LUX}, 0.16)` : 'rgba(150, 172, 230, 0.085)';
      b.lineWidth = t.gold ? 1.2 : 1;
      b.beginPath();
      t.px.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y)));
      b.stroke();
      [t.px[0], t.px[t.px.length - 1]].forEach(([x, y]) => {
        b.beginPath(); b.arc(x, y, 2.6, 0, Math.PI * 2);
        b.strokeStyle = t.gold ? `rgba(${LUX}, 0.35)` : 'rgba(170, 190, 240, 0.22)';
        b.stroke();
        b.beginPath(); b.arc(x, y, 0.9, 0, Math.PI * 2);
        b.fillStyle = 'rgba(10, 14, 28, 1)'; b.fill();
      });
    });
    const chips = Math.max(2, Math.round((W * H) / 380000));
    for (let i = 0; i < chips; i++) {
      const w = (3 + Math.floor(rand() * 4)) * CELL, h = (2 + Math.floor(rand() * 3)) * CELL;
      const x = Math.floor(rand() * (cols - 6)) * CELL, y = Math.floor(rand() * (rows - 4)) * CELL;
      if (Math.abs(x + w / 2 - W / 2) < W * 0.25 && Math.abs(y + h / 2 - H * 0.45) < H * 0.3) continue;
      b.strokeStyle = 'rgba(170, 190, 240, 0.12)'; b.lineWidth = 1;
      b.strokeRect(x + 0.5, y + 0.5, w, h);
      b.fillStyle = 'rgba(170, 190, 240, 0.08)';
      for (let p = CELL / 2; p < w; p += CELL / 2) { b.fillRect(x + p - 1, y - 5, 2, 5); b.fillRect(x + p - 1, y + h + 1, 2, 5); }
    }
    pulses = [];
  }

  function pointAt(t, d) {
    let acc = 0;
    for (let i = 0; i < t.segs.length; i++) {
      if (acc + t.segs[i] >= d) {
        const k = (d - acc) / t.segs[i];
        const [x0, y0] = t.px[i], [x1, y1] = t.px[i + 1];
        return [x0 + (x1 - x0) * k, y0 + (y1 - y0) * k];
      }
      acc += t.segs[i];
    }
    return t.px[t.px.length - 1];
  }

  function spawn() {
    if (!traces.length) return;
    const t = traces[Math.floor(Math.random() * traces.length)];
    pulses.push({ t, d: 0, speed: 90 + Math.random() * 160, tail: 50 + Math.random() * 70, gold: t.gold || Math.random() < 0.25 });
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const target = Math.max(6, Math.round((W * H) / 90000));
    while (pulses.length < target) spawn();
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    pulses = pulses.filter((p) => {
      p.d += p.speed * dt;
      if (p.d - p.tail > p.t.total) return false;
      const head = Math.min(p.d, p.t.total);
      const steps = 8;
      const col = p.gold ? LUX : VOLT;
      for (let s = 0; s < steps; s++) {
        const a = head - (p.tail * s) / steps, bb = head - (p.tail * (s + 1)) / steps;
        if (a < 0) break;
        const [x0, y0] = pointAt(p.t, Math.max(bb, 0));
        const [x1, y1] = pointAt(p.t, a);
        ctx.strokeStyle = `rgba(${col}, ${0.6 * (1 - s / steps)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
      if (p.d <= p.t.total) {
        const [hx, hy] = pointAt(p.t, head);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 10);
        g.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
        g.addColorStop(0.3, `rgba(${col}, 0.6)`);
        g.addColorStop(1, `rgba(${col}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(hx, hy, 10, 0, Math.PI * 2); ctx.fill();
      }
      return true;
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function still() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
  }

  function start() { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  build();
  if (reduced) still(); else start();
  canvas.classList.add('is-live');

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(window.innerWidth - W) < 2 && Math.abs(window.innerHeight - H) < 120) return; // mobile URL bar
      build(); if (reduced) still();
    }, 200);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
