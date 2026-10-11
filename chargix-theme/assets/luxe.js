/* ChargiX Pulse · Luxe interactions: first-visit intro, arrival choreography,
   cursor ring, card spotlights and serif accents on headings. The page warp
   itself lives in motion.js (click) and layout/theme.liquid (arrival). */
(() => {
  const html = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Intro: the store charges up once per session ---------- */
  if (html.classList.contains('has-intro')) {
    const pct = $('[data-intro-pct]');
    const intro = $('.intro');
    const t0 = performance.now();
    const DUR = 1450;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (pct) pct.textContent = '100';
      html.classList.add('intro-done');
      setTimeout(() => html.classList.remove('has-intro', 'intro-done'), 1400);
    };
    const tick = (now) => {
      const k = Math.min((now - t0 - 200) / (DUR - 200), 1);
      const eased = k < 0 ? 0 : 1 - Math.pow(1 - k, 3);
      if (pct) pct.textContent = String(Math.round(eased * 100));
      if (k < 1 && !finished) requestAnimationFrame(tick);
      else finish();
    };
    requestAnimationFrame(tick);
    intro && intro.addEventListener('click', finish);
  }

  /* ---------- Arrival: clear the surge once it has played ---------- */
  if (html.classList.contains('is-arriving')) {
    $$('.pdp__info > *').forEach((el, i) => el.style.setProperty('--n', i));
    setTimeout(() => html.classList.remove('is-arriving', 'dir-next', 'dir-prev'), 1700);
  }
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) html.classList.remove('is-warping', 'is-arriving', 'dir-next', 'dir-prev');
  });

  /* ---------- Serif accent: the last word of each section heading ---------- */
  $$('h2.h2, .story__heading .h2, .nf h1').forEach((h) => {
    if (h.children.length || h.dataset.luxDone) return;
    const text = h.textContent.trim();
    const i = text.lastIndexOf(' ');
    if (i < 1) return;
    h.dataset.luxDone = '1';
    h.textContent = text.slice(0, i + 1);
    const em = document.createElement('em');
    em.textContent = text.slice(i + 1);
    h.appendChild(em);
  });

  /* ---------- Horizon sparks: stagger them down the page ---------- */
  $$('main .shopify-section > .section').forEach((s, i) => s.style.setProperty('--spark-delay', (i * 1.7) % 7));

  if (reduced) return;

  /* ---------- Card spotlight: light and border follow the pointer ---------- */
  if (fine) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.card__link, .pnav__link');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------- Cursor ring ---------- */
  const ring = $('.cursor-ring');
  if (ring && fine && body.dataset.cursor !== 'false') {
    const label = $('.cursor-ring__label', ring);
    let x = -100, y = -100, rx = -100, ry = -100, raf = 0;
    const loop = () => {
      rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
      ring.style.setProperty('--rx', `${rx}px`);
      ring.style.setProperty('--ry', `${ry}px`);
      raf = Math.abs(x - rx) + Math.abs(y - ry) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    document.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
      const t = e.target.closest ? e.target : null;
      const view = t && t.closest('.card__link, .deck__card, .pnav__link, .cat-tile, .spotlight__media a, .story__frame a');
      const link = !view && t && t.closest('a, button, label, summary, select, input');
      ring.classList.toggle('is-view', !!view);
      ring.classList.toggle('is-link', !!link);
      if (view && label) label.textContent = view.matches('.deck__card, .cat-tile') ? 'Explore' : 'View';
    }, { passive: true });
    document.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    document.addEventListener('pointerup', () => ring.classList.remove('is-down'));
    document.addEventListener('pointerleave', () => { x = y = -100; });
  }
})();
