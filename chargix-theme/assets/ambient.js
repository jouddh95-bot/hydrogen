/* ChargiX ambient: drifting holographic dust.
   Fine pink, tangerine, violet and mint motes and a few soft out-of-focus orbs float upward through the page
   on three depth planes, with parallax as you scroll and a slow twinkle.
   ~30fps, sleeps when the tab is hidden, one still frame for reduced motion. */
(() => {
  const canvas = document.querySelector('[data-ambient-circuit]');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const PINK = (css.getPropertyValue('--volt-rgb').trim() || '255, 61, 154');
  const VIOLET = (css.getPropertyValue('--lux-rgb').trim() || '169, 139, 255');
  const TANGERINE = (css.getPropertyValue('--spark-rgb').trim() || '255, 154, 60');
  const MINT = '122, 240, 208';
  const TONES = [PINK, PINK, VIOLET, VIOLET, TANGERINE, MINT, '255, 246, 252'];
  const ORB_TONES = [PINK, VIOLET, TANGERINE, MINT];

  let W = 0, H = 0, dpr = 1, motes = [], orbs = [], raf = 0, last = 0, t = 0;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const n = Math.min(170, Math.round((W * H) / 8500));
    motes = Array.from({ length: n }, () => {
      const z = Math.random();
      return {
        x: Math.random() * W, y: Math.random() * H, z,
        r: 0.5 + z * z * 2.2,
        vy: 4 + z * 14, sway: 6 + Math.random() * 18, ph: Math.random() * Math.PI * 2,
        tw: 0.6 + Math.random() * 1.8, a: 0.25 + z * 0.65,
        c: TONES[(Math.random() * TONES.length) | 0],
      };
    });
    orbs = Array.from({ length: W < 700 ? 4 : 7 }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: 30 + Math.random() * 90,
      vy: 2 + Math.random() * 5, ph: Math.random() * Math.PI * 2, a: 0.05 + Math.random() * 0.06,
      c: ORB_TONES[(Math.random() * ORB_TONES.length) | 0],
    }));
  }

  const wrap = (v, m) => ((v % m) + m) % m;

  function draw(dt) {
    t += dt;
    const sy = window.scrollY || 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';

    orbs.forEach((o) => {
      o.y -= o.vy * dt;
      const y = wrap(o.y - sy * 0.04, H + o.r * 2) - o.r;
      const x = o.x + Math.sin(t * 0.2 + o.ph) * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, o.r);
      g.addColorStop(0, `rgba(${o.c}, ${o.a})`);
      g.addColorStop(0.6, `rgba(${o.c}, ${o.a * 0.4})`);
      g.addColorStop(1, `rgba(${o.c}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, o.r, 0, Math.PI * 2); ctx.fill();
    });

    motes.forEach((m) => {
      m.y -= m.vy * dt;
      const y = wrap(m.y - sy * (0.06 + m.z * 0.3), H + 20) - 10;
      const x = wrap(m.x + Math.sin(t * 0.35 + m.ph) * m.sway, W);
      const tw = 0.55 + 0.45 * Math.sin(t * m.tw + m.ph);
      const a = m.a * tw;
      if (m.r > 1.6) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, m.r * 3.2);
        g.addColorStop(0, `rgba(${m.c}, ${a})`);
        g.addColorStop(1, `rgba(${m.c}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, m.r * 3.2, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = `rgba(${m.c}, ${a})`;
        ctx.beginPath(); ctx.arc(x, y, m.r, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalCompositeOperation = 'source-over';
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 33) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    draw(dt);
  }
  function start() { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  build();
  if (reduced) draw(0); else start();
  canvas.classList.add('is-live');

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(window.innerWidth - W) < 2 && Math.abs(window.innerHeight - H) < 120) return;
      build(); if (reduced) draw(0);
    }, 200);
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
})();
