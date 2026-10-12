/* ChargiX Halloween layer: countdown to Halloween night, bat flocks that cross
   the screen, a spider that drops from the header when you scroll, glowing
   eyes that follow the pointer from dark corners, lightning flashes and
   flickering letters. Everything sleeps off screen and respects reduced motion. */
(() => {
  const html = document.documentElement;
  const body = document.body;
  if (!body.classList.contains('is-haunted')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Countdown to Halloween night (31 Oct, 6 pm local) ---------- */
  $$('[data-countdown]').forEach((el) => {
    const cells = { d: $('[data-cd="d"]', el), h: $('[data-cd="h"]', el), m: $('[data-cd="m"]', el), s: $('[data-cd="s"]', el) };
    const target = () => {
      const now = new Date();
      let t = new Date(now.getFullYear(), 9, 31, 18, 0, 0);
      if (now - t > 6 * 3600e3) t = new Date(now.getFullYear() + 1, 9, 31, 18, 0, 0);
      return t;
    };
    const T = target();
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let ms = Math.max(0, T - Date.now());
      if (!ms) { el.classList.add('is-now'); $('.haunt__count-label', el).textContent = 'It is Halloween night'; }
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      cells.d.textContent = pad(d); cells.h.textContent = pad(h); cells.m.textContent = pad(m);
      if (cells.s.textContent !== pad(s)) { cells.s.textContent = pad(s); cells.s.classList.remove('tick'); void cells.s.offsetWidth; cells.s.classList.add('tick'); }
    };
    tick();
    setInterval(tick, 1000);
  });

  if (reduced) return;

  /* ---------- Lightning: a white flash over the whole page ---------- */
  const flash = document.createElement('div');
  flash.className = 'haunt-flash';
  flash.setAttribute('aria-hidden', 'true');
  body.appendChild(flash);
  const strike = () => {
    flash.classList.remove('is-on');
    void flash.offsetWidth;
    flash.classList.add('is-on');
  };
  window.addEventListener('haunt:flash', strike);
  // pages without the 3D hero still get the odd strike
  if (!$('[data-haunt]')) setInterval(() => { if (!document.hidden && Math.random() < 0.5) strike(); }, 16000);

  /* ---------- Bats: a small flock crosses the screen now and then ---------- */
  const BAT = '<svg viewBox="0 0 64 28" aria-hidden="true"><path class="w" d="M32 14c-3-5-9-9-16-9 2 2 3 4 3 6-3-2-7-2-10-1 2 1 4 3 4 5-3-1-7 0-9 2 6 0 11 1 15 4 3-3 8-5 13-7z"/><path class="w r" d="M32 14c3-5 9-9 16-9-2 2-3 4-3 6 3-2 7-2 10-1-2 1-4 3-4 5 3-1 7 0 9 2-6 0-11 1-15 4-3-3-8-5-13-7z"/><ellipse cx="32" cy="15" rx="3.2" ry="5"/><path d="M29.5 10.5l1-3 1.5 2.5M34.5 10.5l-1-3-1.5 2.5"/></svg>';
  const flock = () => {
    if (document.hidden) return;
    const n = 3 + Math.floor(Math.random() * 4);
    const fromLeft = Math.random() < 0.5;
    const y0 = 8 + Math.random() * 40;
    for (let i = 0; i < n; i++) {
      const b = document.createElement('span');
      b.className = 'bat';
      b.innerHTML = BAT;
      const s = 0.55 + Math.random() * 0.7;
      const y = y0 + (Math.random() - 0.5) * 18;
      const dur = 5200 + Math.random() * 2600;
      b.style.setProperty('--s', s);
      body.appendChild(b);
      const x0 = fromLeft ? -10 : 110, x1 = fromLeft ? 112 : -12;
      const anim = b.animate([
        { transform: `translate(${x0}vw, ${y}vh) scale(${s})` },
        { transform: `translate(${(x0 + x1) / 2}vw, ${y - 10 + Math.random() * 20}vh) scale(${s * 1.15})`, offset: 0.5 },
        { transform: `translate(${x1}vw, ${y - 14}vh) scale(${s * 0.8})` },
      ], { duration: dur, delay: i * (120 + Math.random() * 260), easing: 'cubic-bezier(.4,.1,.6,.9)', fill: 'both' });
      if (!fromLeft) b.classList.add('is-flip');
      anim.finished.then(() => b.remove(), () => b.remove());
    }
  };
  setTimeout(flock, 1800);
  setInterval(flock, 19000);

  /* ---------- The spider drops from the header as you scroll down ---------- */
  const spider = document.createElement('div');
  spider.className = 'spider';
  spider.setAttribute('aria-hidden', 'true');
  spider.innerHTML = '<span class="spider__thread"></span><svg class="spider__body" viewBox="0 0 60 60"><g stroke="#0a0612" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M24 30 Q12 22 4 26M24 33 Q10 32 2 38M25 36 Q12 42 6 52M27 38 Q20 48 16 58"/><path d="M36 30 Q48 22 56 26M36 33 Q50 32 58 38M35 36 Q48 42 54 52M33 38 Q40 48 44 58"/></g><ellipse cx="30" cy="34" rx="9" ry="10" fill="#0a0612"/><circle cx="30" cy="22" r="6.5" fill="#0a0612"/><circle cx="27.5" cy="21.5" r="1.8" fill="#ff3b3b"/><circle cx="32.5" cy="21.5" r="1.8" fill="#ff3b3b"/><path d="M26 40 q4 3 8 0" stroke="#ff7a1a" stroke-width="1.6" fill="none"/></svg>';
  body.appendChild(spider);
  let drop = 0, target = 0, lastY = window.scrollY, idle = 0, sRaf = 0;
  const spiderLoop = () => {
    drop += (target - drop) * 0.12;
    spider.style.setProperty('--drop', drop.toFixed(1) + 'px');
    sRaf = Math.abs(target - drop) > 0.4 ? requestAnimationFrame(spiderLoop) : 0;
  };
  const kick = () => { if (!sRaf) sRaf = requestAnimationFrame(spiderLoop); };
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const d = y - lastY;
    lastY = y;
    if (d > 0 && y > 200) target = Math.min(window.innerHeight * 0.3, target + d * 0.3);
    else if (d < 0) target = Math.max(0, target + d * 0.6);
    clearTimeout(idle);
    idle = setTimeout(() => { target = 0; kick(); }, 1600);
    kick();
  }, { passive: true });
  spider.addEventListener('pointerenter', () => { target = 0; spider.classList.add('is-scared'); kick(); setTimeout(() => spider.classList.remove('is-scared'), 600); });

  /* ---------- Eyes in the dark follow the pointer ---------- */
  const eyeSpots = $$('[data-eyes]');
  if (eyeSpots.length && fine) {
    const pairs = [];
    eyeSpots.forEach((spot) => {
      const n = parseInt(spot.dataset.eyes, 10) || 2;
      for (let i = 0; i < n; i++) {
        const e = document.createElement('span');
        e.className = 'eyes';
        e.style.left = (Math.random() < 0.5 ? 2 + Math.random() * 8 : 86 + Math.random() * 8) + '%';
        e.style.top = (10 + Math.random() * 70) + '%';
        e.style.setProperty('--blink', (3 + Math.random() * 5).toFixed(1) + 's');
        e.style.setProperty('--d', (Math.random() * 4).toFixed(1) + 's');
        e.innerHTML = '<i><b></b></i><i><b></b></i>';
        spot.appendChild(e);
        pairs.push(e);
      }
    });
    let mx = innerWidth / 2, my = innerHeight / 2, eRaf = 0;
    const aim = () => {
      eRaf = 0;
      pairs.forEach((e) => {
        const r = e.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const a = Math.atan2(my - (r.top + r.height / 2), mx - (r.left + r.width / 2));
        e.style.setProperty('--px', (Math.cos(a) * 3).toFixed(2) + 'px');
        e.style.setProperty('--py', (Math.sin(a) * 3).toFixed(2) + 'px');
      });
    };
    document.addEventListener('pointermove', (ev) => { mx = ev.clientX; my = ev.clientY; if (!eRaf) eRaf = requestAnimationFrame(aim); }, { passive: true });
  }

  /* ---------- Headlines: a letter or two flickers like a dying bulb ---------- */
  const flickerOne = () => {
    if (document.hidden) return;
    const pool = $$('[data-bounce].is-in .ch').filter((c) => { const r = c.getBoundingClientRect(); return r.top > 0 && r.bottom < innerHeight; });
    if (!pool.length) return;
    const c = pool[(Math.random() * pool.length) | 0];
    c.classList.remove('is-flicker');
    void c.offsetWidth;
    c.classList.add('is-flicker');
  };
  setInterval(flickerOne, 2400);

  /* ---------- Cards: a ghost peeks from behind on hover (CSS), plus a shiver ---------- */
  if (fine) {
    document.addEventListener('pointerover', (e) => {
      const card = e.target.closest && e.target.closest('.card, .tcard, .cat-tile, .tile');
      if (!card || card.classList.contains('is-shiver')) return;
      card.classList.add('is-shiver');
      setTimeout(() => card.classList.remove('is-shiver'), 520);
    }, { passive: true });
  }
})();
