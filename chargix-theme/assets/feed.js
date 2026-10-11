/* ChargiX Feed interactions: bouncing headlines, the self-scrolling phone,
   sticker tapes that react to scroll speed, the pinned trending reel,
   stacking cards, the spinning drop, a sticker cursor, click bursts and
   swipeable product photos. Page-to-page transitions are CSS (feed.css),
   started from motion.js. */
(() => {
  const html = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Arrival: clear direction classes once the swipe has played ---------- */
  if (html.classList.contains('is-arriving')) {
    setTimeout(() => html.classList.remove('is-arriving', 'dir-next', 'dir-prev'), 1000);
  }
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) html.classList.remove('is-warping', 'is-arriving', 'dir-next', 'dir-prev');
  });

  /* ---------- Bouncing headlines: split into words and letters ---------- */
  const bouncers = $$('[data-bounce]');
  bouncers.forEach((el) => {
    if (el.dataset.split) return;
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    el.dataset.split = '1';
    el.setAttribute('aria-label', text);
    el.textContent = '';
    let n = 0;
    text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span');
      w.className = 'wd';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((ch) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--c', n++);
        s.textContent = ch;
        w.appendChild(s);
      });
      el.appendChild(w);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
    });
    if (!reduced) el.classList.add('is-split');
  });
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    }), { rootMargin: '0px 0px -10% 0px' });
    bouncers.forEach((el) => io.observe(el));
  } else {
    bouncers.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Hero: the phone plays the feed ---------- */
  $$('[data-fhero]').forEach((hero) => {
    const feed = $('[data-feed]', hero);
    const reels = feed ? $$('.reel', feed) : [];
    const bar = $('.phone__progress', hero);
    const MS = 2800;
    let i = 0, timer = 0, visible = true, hovering = false;
    const show = (k) => {
      i = (k + reels.length) % reels.length;
      feed.style.transform = `translateY(${-i * 100}%)`;
      reels.forEach((r, j) => r.classList.toggle('is-on', j === i));
      if (bar) { bar.classList.remove('is-run'); void bar.offsetWidth; bar.classList.add('is-run'); }
      // a little like lands half way through each clip
      setTimeout(() => reels[i] && reels[i].classList.add('is-liked'), MS * 0.45);
      reels.forEach((r, j) => { if (j !== i) r.classList.remove('is-liked'); });
    };
    const loop = () => {
      clearTimeout(timer);
      if (reduced || !visible || hovering) return;
      timer = setTimeout(() => { show(i + 1); loop(); }, MS);
    };
    if (reels.length) {
      if (bar) bar.style.setProperty('--reel-ms', MS + 'ms');
      show(0);
      loop();
      const phone = $('.phone', hero);
      phone.addEventListener('pointerenter', () => { hovering = true; clearTimeout(timer); });
      phone.addEventListener('pointerleave', () => { hovering = false; loop(); });
      // swipe or wheel inside the phone to scroll the feed by hand
      let sy = null;
      phone.addEventListener('pointerdown', (e) => { sy = e.clientY; });
      phone.addEventListener('pointerup', (e) => {
        if (sy == null) return;
        const d = e.clientY - sy; sy = null;
        if (Math.abs(d) > 30) { show(i + (d < 0 ? 1 : -1)); }
      });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([en]) => { visible = en.isIntersecting; loop(); }).observe(hero);
      }
    }
    // stickers and badges drift with the pointer at different depths
    if (fine && !reduced) {
      const items = $$('[data-depth]', hero);
      let raf = 0;
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => items.forEach((el) => {
          const k = parseFloat(el.dataset.depth) || 1;
          el.style.transform = el.classList.contains('phone')
            ? `rotate(${4 + x * 6}deg) translate(${x * 18}px, ${y * 12}px)`
            : `translate(${x * 40 * k}px, ${y * 40 * k}px)`;
        }));
      });
      hero.addEventListener('pointerleave', () => items.forEach((el) => { el.style.transform = ''; }));
    }
  });

  /* ---------- Scroll-linked effects share one loop ---------- */
  const scrollers = [];
  let lastY = window.scrollY, velocity = 0, ticking = false;
  const runScroll = () => {
    ticking = false;
    const y = window.scrollY;
    velocity = y - lastY;
    lastY = y;
    scrollers.forEach((fn) => fn(y));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
  window.addEventListener('resize', () => requestAnimationFrame(runScroll));

  /* ---------- Sticker tapes: speed and direction follow your scroll ---------- */
  const tapes = $$('[data-tape]');
  if (tapes.length && !reduced) {
    const state = tapes.map((t) => ({ el: $('[data-tape-track]', t), dir: parseFloat(t.dataset.dir) || 1, x: 0, w: 0 }));
    const measure = () => state.forEach((s) => { s.w = s.el.scrollWidth / 4; });
    measure();
    window.addEventListener('resize', measure);
    let boost = 0, flip = 1, last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      boost += (Math.min(Math.abs(velocity) * 6, 900) - boost) * 0.08;
      if (Math.abs(velocity) > 2) flip = velocity > 0 ? 1 : -1;
      velocity *= 0.9;
      state.forEach((s) => {
        if (!s.w) return;
        s.x += s.dir * flip * (60 + boost) * dt;
        s.x = ((s.x % s.w) + s.w) % s.w;
        s.el.style.transform = `translate3d(${-s.x}px, 0, 0)`;
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /* ---------- Trending reel: pin the section and slide the row ---------- */
  $$('[data-hreel]').forEach((sec) => {
    const pin = $('[data-hreel-pin]', sec);
    const track = $('[data-hreel-track]', sec);
    const nEl = $('[data-hreel-n]', sec);
    const barEl = $('[data-hreel-bar]', sec);
    const cards = $$('.tcard:not(.tcard--more)', track);
    const total = cards.length;
    const countEl = nEl && nEl.parentElement;
    if (countEl) countEl.lastChild.textContent = ' / ' + String(total).padStart(2, '0');
    const setCount = (p) => {
      const k = clamp(Math.round(p * (total - 1)) + 1, 1, total);
      if (nEl) nEl.textContent = String(k).padStart(2, '0');
      if (barEl) barEl.style.setProperty('--p', Math.max(0.05, p).toFixed(3));
    };
    const desktop = window.matchMedia('(min-width: 990px)');
    let dist = 0;
    const layout = () => {
      if (desktop.matches && !reduced) {
        sec.classList.add('is-pinned');
        dist = Math.max(0, track.scrollWidth - track.clientWidth);
        sec.style.height = `calc(100svh + ${dist}px)`;
      } else {
        sec.classList.remove('is-pinned');
        sec.style.height = '';
        track.style.transform = '';
        dist = 0;
      }
    };
    layout();
    desktop.addEventListener('change', () => { layout(); runScroll(); });
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    scrollers.push(() => {
      if (!sec.classList.contains('is-pinned')) return;
      const r = sec.getBoundingClientRect();
      const p = dist ? clamp(-r.top / dist, 0, 1) : 0;
      track.style.transform = `translate3d(${-p * dist}px, 0, 0)`;
      setCount(p);
    });
    track.addEventListener('scroll', () => {
      if (sec.classList.contains('is-pinned')) return;
      const max = track.scrollWidth - track.clientWidth;
      setCount(max > 0 ? track.scrollLeft / max : 0);
    }, { passive: true });
    setCount(0);
  });

  /* ---------- Stacking cards: covered cards sink back ---------- */
  $$('[data-stack]').forEach((stack) => {
    const cards = $$('[data-scard]', stack);
    const wide = window.matchMedia('(min-width: 900px)');
    if (reduced || cards.length < 2) return;
    scrollers.push(() => {
      if (!wide.matches) { cards.forEach((c) => { c.style.transform = ''; c.style.filter = ''; }); return; }
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const a = c.getBoundingClientRect();
        const b = next.getBoundingClientRect();
        const p = clamp(1 - (b.top - a.top) / a.height, 0, 1);
        c.style.transform = `scale(${1 - p * 0.08}) rotate(${(i % 2 ? 1 : -1) * p * 2.5}deg)`;
        c.style.filter = `brightness(${1 - p * 0.22})`;
      });
    });
  });

  /* ---------- The drop: disc spins, product rises, the word slides ---------- */
  $$('[data-drop]').forEach((drop) => {
    if (reduced) return;
    const disc = $('[data-drop-disc]', drop);
    const img = $('[data-drop-img]', drop);
    const word = $('[data-drop-word]', drop);
    scrollers.push(() => {
      const r = drop.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      if (disc) disc.style.transform = `rotate(${p * 300}deg)`;
      if (img) img.style.transform = `translateY(${(0.5 - p) * 90}px) rotate(${(0.5 - p) * -16}deg) scale(${0.92 + Math.sin(p * Math.PI) * 0.1})`;
      if (word) word.style.transform = `translate(${(0.2 - p) * 60}%, -50%)`;
    });
  });

  runScroll();

  /* ---------- Product photos: swipe the stage like a story ---------- */
  const stage = $('.pdp__stage');
  if (stage) {
    const thumbs = $$('[data-thumb]');
    let hint = null;
    if (thumbs.length > 1) {
      hint = document.createElement('span');
      hint.className = 'pdp__stage-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML = thumbs.map(() => '<i></i>').join('');
      stage.appendChild(hint);
    }
    const active = () => Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const sync = () => { if (hint) $$('i', hint).forEach((d, j) => d.classList.toggle('is-on', j === active())); };
    thumbs.forEach((t) => t.addEventListener('click', () => requestAnimationFrame(sync)));
    sync();
    const go = (d) => { if (thumbs.length < 2) return; const k = (active() + d + thumbs.length) % thumbs.length; thumbs[k].click(); };
    let sx = null;
    stage.addEventListener('pointerdown', (e) => { sx = e.clientX; });
    stage.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const d = e.clientX - sx; sx = null;
      if (Math.abs(d) > 40) go(d < 0 ? 1 : -1);
    });
    stage.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
    // variant changes also move the dots
    new MutationObserver(sync).observe(stage.closest('.pdp__gallery') || stage, { attributes: true, subtree: true, attributeFilter: ['class'] });
  }

  /* ---------- Click burst: every press throws a handful of confetti ---------- */
  const COLORS = ['#ff2e88', '#c8ff2e', '#ff7a1a', '#7b5cff', '#22e6b8', '#ffe45c'];
  if (!reduced) {
    document.addEventListener('pointerdown', (e) => {
      const t = e.target.closest && e.target.closest('a, button, label.pill, summary');
      if (!t || e.button !== 0) return;
      const b = document.createElement('span');
      b.className = 'burst';
      b.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      for (let k = 0; k < 12; k++) {
        const i = document.createElement('i');
        const a = (k / 12) * Math.PI * 2 + Math.random() * 0.5;
        const d = 34 + Math.random() * 46;
        i.style.background = COLORS[k % COLORS.length];
        i.style.setProperty('--dx', `${Math.cos(a) * d}px`);
        i.style.setProperty('--dy', `${Math.sin(a) * d}px`);
        i.style.setProperty('--dr', `${Math.random() * 360}deg`);
        b.appendChild(i);
      }
      body.appendChild(b);
      setTimeout(() => b.remove(), 700);
    }, { passive: true });
  }

  if (reduced) return;

  /* ---------- Smooth, weighted scrolling ---------- */
  if (window.Lenis && body.dataset.smooth !== 'false' && fine) {
    const lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
    window.ChargixLenis = lenis;
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    new MutationObserver(() => (body.style.overflow === 'hidden' ? lenis.stop() : lenis.start()))
      .observe(body, { attributes: true, attributeFilter: ['style'] });
    $$('[data-cart-drawer], .menu-drawer, .search-dialog, .reel-sec__track, .chips').forEach((el) => el.setAttribute('data-lenis-prevent', ''));
  }

  /* ---------- Sticker cursor ---------- */
  const cur = $('.sticker-cursor');
  if (cur && fine && body.dataset.cursor !== 'false') {
    const label = $('span', cur);
    let x = -100, y = -100, cx = -100, cy = -100, raf = 0;
    const loop = () => {
      cx += (x - cx) * 0.28; cy += (y - cy) * 0.28;
      cur.style.setProperty('--cx', `${cx}px`);
      cur.style.setProperty('--cy', `${cy}px`);
      raf = Math.abs(x - cx) + Math.abs(y - cy) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    document.addEventListener('pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      if (!raf) raf = requestAnimationFrame(loop);
      const t = e.target.closest ? e.target : null;
      const view = t && t.closest('.card__link, .tcard__link, .tile, .reel__link, .scard__media, .drop__visual, .pnav__link, .cat-tile');
      const link = !view && t && t.closest('a, button, label, summary, select, input');
      cur.classList.toggle('is-view', !!view);
      cur.classList.toggle('is-link', !!link);
      if (view && label) label.textContent = view.matches('.tile, .cat-tile') ? 'Open' : view.matches('.pnav__link') ? 'Swipe' : 'View';
    }, { passive: true });
    document.addEventListener('pointerdown', () => cur.classList.add('is-down'));
    document.addEventListener('pointerup', () => cur.classList.remove('is-down'));
    document.documentElement.addEventListener('pointerleave', () => { x = y = -100; if (!raf) raf = requestAnimationFrame(loop); });
  }
})();
