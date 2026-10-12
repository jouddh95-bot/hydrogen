/* ChargiX motion layer: page transitions, reveals, tilt, magnetic buttons,
   category deck, scroll story, and the product page interactions. */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const transitionsOn = body.dataset.transitions !== 'false';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Header state ---------- */
  const onScroll = () => body.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Page transitions ----------
     Script-driven so it plays the same in every browser: a colour panel
     swipes over the page (sideways for next / previous product), the clicked
     product photo flies to the centre, then the browser navigates. The next
     page paints with the same panel and photo in place (layout/theme.liquid)
     and slides them away, landing the photo on the product hero. */
  const samePath = (a, b) => {
    try { return new URL(a, location.href).pathname === new URL(b, location.href).pathname; } catch (e) { return false; }
  };
  const productPath = (u) => { try { return /\/products\//.test(new URL(u, location.href).pathname); } catch (e) { return false; } };
  const themeCovers = getComputedStyle(root).getPropertyValue('--covers').split(',').map((c) => c.trim()).filter(Boolean);
  const COVERS = themeCovers.length ? themeCovers : ['#ff2e88', '#7b5cff', '#ff7a1a', '#22e6b8', '#c8ff2e', '#ffe45c'];
  const nextCover = () => {
    let k = 0;
    try { k = (parseInt(sessionStorage.getItem('chargix:cover') || '0', 10) + 1) % COVERS.length; sessionStorage.setItem('chargix:cover', k); } catch (e) {}
    return COVERS[k];
  };
  const imgFor = (a) => {
    const holder = a.closest('.card, .tcard, .scard, .reel, .pnav__link, .tile, .drop, .fhero__sticker') || a;
    const img = $('img', holder) || $('img', a);
    if (!img || !img.complete || !img.naturalWidth) return null;
    const r = img.getBoundingClientRect();
    if (r.width < 24 || r.bottom < 0 || r.top > innerHeight) return null;
    return img;
  };
  const coverSize = () => Math.round(Math.min(innerWidth * 0.62, innerHeight * 0.56, 520));
  const DIRS = ['dir-next', 'dir-prev'];
  let leaving = false;

  // Warm the next page while the pointer is on its way.
  const warmed = new Set();
  const canSpec = HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules');
  const warm = (a) => {
    if (!a || a.origin !== location.origin || warmed.has(a.href) || warmed.size > 30) return;
    if (a.matches('[data-cart-open], [data-search-open]') || samePath(a.href, location.href)) return;
    warmed.add(a.href);
    if (canSpec) {
      const s = document.createElement('script');
      s.type = 'speculationrules';
      s.textContent = JSON.stringify({ prefetch: [{ source: 'list', urls: [a.href] }] });
      document.head.appendChild(s);
    } else {
      const l = document.createElement('link');
      l.rel = 'prefetch'; l.href = a.href;
      document.head.appendChild(l);
    }
  };
  const warmFrom = (e) => warm(e.target.closest && e.target.closest('a[href]'));
  document.addEventListener('pointerover', warmFrom, { passive: true });
  document.addEventListener('touchstart', warmFrom, { passive: true });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.hash && samePath(a.href, location.href)) return;
    if (a.matches('[data-cart-open], [data-search-open], [data-no-swipe]')) return;
    if (!/^https?:$/.test(a.protocol)) return;
    body.classList.add('is-navigating');
    if (!transitionsOn || reduced) return;
    e.preventDefault();
    if (leaving) return;
    leaving = true;

    const dir = a.dataset.dir || '';
    const color = nextCover();
    const img = productPath(a.href) ? imgFor(a) : null;
    const nav = { t: Date.now(), dir, color };
    if (img) nav.img = img.currentSrc || img.src;
    try { sessionStorage.setItem('chargix:nav', JSON.stringify(nav)); } catch (err) {}

    root.classList.remove('is-arriving', 'is-revealed', ...DIRS);
    if (dir) root.classList.add('dir-' + dir);
    root.style.setProperty('--cover', color);
    void document.body.offsetWidth;
    root.classList.add('is-leaving');

    let fly = null;
    if (img) {
      const r = img.getBoundingClientRect();
      const S = coverSize();
      const L = (innerWidth - S) / 2, T = (innerHeight - S) / 2;
      fly = document.createElement('img');
      fly.className = 'arrive-img is-flying';
      fly.alt = '';
      fly.src = nav.img;
      body.appendChild(fly);
      fly.animate([
        { transform: `translate(${r.left - L}px, ${r.top - T}px) scale(${r.width / S}, ${r.height / S})`, borderRadius: '40px' },
        { transform: 'none', borderRadius: '28px' },
      ], { duration: 560, easing: 'cubic-bezier(0.5, 0, 0.15, 1)', fill: 'both' });
    }
    const go = () => { location.href = a.href; };
    setTimeout(go, img ? 560 : 460);
  });

  // Arriving: slide the cover away; land the flown photo on the product hero.
  const reveal = () => {
    if (!root.classList.contains('is-arriving') || root.classList.contains('is-revealed-js')) return;
    root.classList.add('is-revealed-js');
    const fly = $('.arrive-img');
    const main = $('.pdp__main');
    const start = () => {
      root.classList.add('is-revealed');
      if (fly) {
        const t = main && main.getBoundingClientRect();
        const S = fly.getBoundingClientRect();
        const frames = t && t.width
          ? [{ transform: 'none' }, { transform: `translate(${t.left - S.left}px, ${t.top - S.top}px) scale(${t.width / S.width}, ${t.height / S.height})`, borderRadius: '28px' }]
          : [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-60vh) rotate(-8deg) scale(0.6)', opacity: 0 }];
        const anim = fly.animate(frames, { duration: 650, easing: 'cubic-bezier(0.3, 1.15, 0.4, 1)', fill: 'forwards' });
        anim.finished.then(() => fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).finished).finally(() => fly.remove());
      }
      setTimeout(() => root.classList.remove('is-arriving', 'is-revealed', 'is-revealed-js', ...DIRS), 900);
    };
    const hero = main && $('img', main);
    const ready = hero && hero.decode ? Promise.race([hero.decode().catch(() => {}), new Promise((r) => setTimeout(r, 700))]) : Promise.resolve();
    ready.then(() => requestAnimationFrame(start));
  };
  if (root.classList.contains('is-arriving')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal); else reveal();
  }
  window.addEventListener('pageshow', (e) => {
    body.classList.remove('is-leaving', 'is-navigating');
    if (!e.persisted) return;
    // Back / forward cache: undo a half-played exit.
    leaving = false;
    root.classList.remove('is-leaving', 'is-arriving', 'is-revealed', 'is-revealed-js', ...DIRS);
    $$('.arrive-img').forEach((el) => el.remove());
  });

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (!reduced && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        en.target.classList.remove('is-armed');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach((el) => {
      // Only arm what starts below the fold, so the first frame is complete.
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('is-armed');
        io.observe(el);
      }
    });
  }

  /* ---------- 3D tilt with glare ---------- */
  if (finePointer && !reduced) {
    $$('[data-tilt]').forEach((el) => {
      const strength = parseFloat(el.dataset.tiltStrength || '10');
      let raf = 0;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.classList.add('is-tilting');
          el.style.setProperty('--ry', `${(px - 0.5) * strength}deg`);
          el.style.setProperty('--rx', `${(0.5 - py) * strength}deg`);
          el.style.setProperty('--gx', `${px * 100}%`);
          el.style.setProperty('--gy', `${py * 100}%`);
        });
      });
      el.addEventListener('pointerleave', () => {
        cancelAnimationFrame(raf);
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.32;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Cursor glow ---------- */
  const glow = $('.cursor-glow');
  if (glow && finePointer && !reduced && body.dataset.cursor !== 'false') {
    window.addEventListener('pointermove', (e) => {
      glow.style.setProperty('--cx', `${e.clientX}px`);
      glow.style.setProperty('--cy', `${e.clientY}px`);
    }, { passive: true });
  }

  /* ---------- Menu drawer & search ---------- */
  const drawer = $('[data-menu-drawer]');
  const menuBtn = $('[data-menu-open]');
  const closeMenu = () => { if (!drawer) return; drawer.hidden = true; menuBtn && menuBtn.setAttribute('aria-expanded', 'false'); body.style.overflow = ''; };
  menuBtn && menuBtn.addEventListener('click', () => {
    drawer.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); body.style.overflow = 'hidden';
    const first = $('a, button', drawer); first && first.focus();
  });
  drawer && drawer.addEventListener('click', (e) => { if (e.target === drawer || e.target.closest('[data-menu-close]')) closeMenu(); });

  const search = $('[data-search-dialog]');
  const searchOpen = $('[data-search-open]');
  if (search && searchOpen && typeof search.showModal === 'function') {
    searchOpen.addEventListener('click', (e) => { e.preventDefault(); search.showModal(); $('input[type="search"]', search).focus(); });
    search.addEventListener('click', (e) => { if (e.target === search || e.target.closest('[data-search-close]')) search.close(); });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Category deck (coverflow) ---------- */
  $$('[data-deck]').forEach((deck) => {
    const scroller = $('[data-deck-scroller]', deck);
    const cards = $$('[data-deck-card]', scroller);
    if (!scroller || !cards.length) return;
    const update = () => {
      const mid = scroller.scrollLeft + scroller.clientWidth / 2;
      cards.forEach((c) => {
        const center = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.max(-2, Math.min(2, (center - mid) / c.offsetWidth));
        c.style.setProperty('--d', reduced ? 0 : d.toFixed(3));
      });
    };
    let raf = 0;
    scroller.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    const step = (dir) => scroller.scrollBy({ left: dir * (cards[0].offsetWidth + 20), behavior: reduced ? 'auto' : 'smooth' });
    const prev = $('[data-deck-prev]', deck);
    const next = $('[data-deck-next]', deck);
    prev && prev.addEventListener('click', () => step(-1));
    next && next.addEventListener('click', () => step(1));
    // open on the second card so the deck reads as 3D immediately
    if (cards[1]) scroller.scrollLeft = cards[1].offsetLeft + cards[1].offsetWidth / 2 - scroller.clientWidth / 2;
    update();
  });

  /* ---------- Rails ---------- */
  $$('[data-rail]').forEach((rail) => {
    const track = $('[data-rail-track]', rail);
    if (!track) return;
    const step = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: reduced ? 'auto' : 'smooth' });
    const prev = $('[data-rail-prev]', rail);
    const next = $('[data-rail-next]', rail);
    prev && prev.addEventListener('click', () => step(-1));
    next && next.addEventListener('click', () => step(1));
  });

  /* ---------- Scroll story ---------- */
  $$('[data-story]').forEach((story) => {
    const chapters = $$('[data-story-chapter]', story);
    const scenes = $$('[data-story-scene]', story);
    const dots = $$('[data-story-dot]', story);
    const activate = (i) => {
      chapters.forEach((c, j) => c.classList.toggle('is-active', i === j));
      scenes.forEach((s, j) => s.classList.toggle('is-active', i === j));
      dots.forEach((d, j) => d.classList.toggle('is-active', i === j));
    };
    activate(0);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) activate(chapters.indexOf(en.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    chapters.forEach((c) => io.observe(c));
  });

  /* ---------- Parallax ---------- */
  const parallaxRoots = $$('[data-parallax-root]');
  if (parallaxRoots.length && !reduced) {
    const items = parallaxRoots.flatMap((r) => $$('[data-parallax]', r).map((el) => ({ el, r, k: parseFloat(el.dataset.parallax) })));
    const tick = () => {
      const vh = window.innerHeight;
      items.forEach(({ el, r, k }) => {
        const rect = r.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const p = (rect.top + rect.height / 2 - vh / 2) / vh;
        el.style.translate = `0 ${(p * k * 160).toFixed(1)}px`;
      });
    };
    window.addEventListener('scroll', () => requestAnimationFrame(tick), { passive: true });
    tick();
  }

  /* ---------- Split collection titles into letters ---------- */
  if (!reduced) {
    $$('[data-split]').forEach((el) => {
      const text = el.textContent.trim();
      el.setAttribute('aria-label', text);
      el.textContent = '';
      let n = 0;
      text.split(' ').forEach((word, wi, arr) => {
        const w = document.createElement('span');
        w.style.display = 'inline-block';
        w.setAttribute('aria-hidden', 'true');
        [...word].forEach((ch) => {
          const s = document.createElement('span');
          s.className = 'char';
          s.style.setProperty('--c', n++);
          s.textContent = ch;
          w.appendChild(s);
        });
        el.appendChild(w);
        if (wi < arr.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  }

  /* ---------- Sorting ---------- */
  const sort = $('[data-sort]');
  sort && sort.addEventListener('change', () => {
    const url = new URL(location.href);
    url.searchParams.set('sort_by', sort.value);
    url.searchParams.delete('page');
    location.href = url.toString();
  });

  /* ---------- Product page ---------- */
  const pdp = $('[data-product]');
  if (pdp) {
    const data = JSON.parse($('[data-product-json]', pdp).textContent);
    const form = $('form[data-add-form]', pdp);
    const idInput = $('[data-variant-id]', pdp);
    const mainImg = $('.pdp__main-img', pdp);
    const thumbs = $$('[data-thumb]', pdp);
    const addBtn = $('[data-add-button]', pdp);
    const addLabel = $('[data-add-label]', pdp);
    const priceWrap = $('[data-price-wrap]', pdp);
    const stickyPrice = $('[data-sticky-price]', pdp);
    const fmt = (cents) => window.ChargixMoney ? window.ChargixMoney(cents) : (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });

    // Gallery: the next image wipes across the stage with a flash of light.
    let activeIndex = Math.max(0, thumbs.findIndex((t) => t.classList.contains('is-active')));
    const swapImage = (src, back) => {
      if (!mainImg || !src) return;
      const full = src.startsWith('//') ? 'https:' + src : src;
      if (mainImg.currentSrc === full || mainImg.src === full) return;
      const holder = mainImg.parentElement;
      const pre = new Image();
      pre.onload = () => {
        if (reduced) { mainImg.removeAttribute('srcset'); mainImg.src = full; return; }
        $$('.pdp__wipe', holder).forEach((n) => n.remove());
        pre.className = 'pdp__wipe' + (back ? ' is-back' : '');
        pre.alt = '';
        holder.appendChild(pre);
        pre.addEventListener('animationend', () => {
          mainImg.removeAttribute('srcset');
          mainImg.src = full;
          const done = () => pre.remove();
          mainImg.complete ? done() : mainImg.addEventListener('load', done, { once: true });
        }, { once: true });
      };
      pre.src = full;
    };

    thumbs.forEach((t, i) => t.addEventListener('click', () => {
      thumbs.forEach((x) => x.classList.toggle('is-active', x === t));
      swapImage(t.dataset.src, i < activeIndex);
      activeIndex = i;
    }));

    const inputs = $$('[data-option-input]', pdp);
    const selected = () => $$('.opt', pdp).map((fs) => { const c = $('input:checked', fs); return c ? c.value : null; });
    const renderPrice = (v) => {
      const sale = v.compare_at_price && v.compare_at_price > v.price;
      const save = sale ? Math.round(((v.compare_at_price - v.price) / v.compare_at_price) * 100) : 0;
      priceWrap.innerHTML = `<div class="price${sale ? ' price--sale' : ''}"><span class="price__now">${fmt(v.price)}</span>${sale ? `<s class="price__was">${fmt(v.compare_at_price)}</s><span class="price__save">-${save}%</span>` : ''}</div>`;
      if (stickyPrice) stickyPrice.textContent = fmt(v.price);
      const pr = $('.price', priceWrap);
      if (pr && !reduced) pr.classList.add('is-flash');
    };
    inputs.forEach((input) => input.addEventListener('change', () => {
      const values = selected();
      $$('.opt', pdp).forEach((fs, i) => { const l = $('[data-option-label]', fs); if (l) l.textContent = values[i]; });
      const v = data.variants.find((x) => x.options.every((o, i) => o === values[i]));
      if (!v) { addBtn.disabled = true; addLabel.textContent = addBtn.dataset.unavailable || 'Unavailable'; return; }
      idInput.value = v.id;
      addBtn.disabled = !v.available;
      addLabel.textContent = v.available ? (addBtn.dataset.addText || addLabel.dataset.text || 'Add to cart') : 'Sold out';
      renderPrice(v);
      if (v.featured_image) {
        const ni = thumbs.findIndex((t) => t.dataset.mediaId === String(v.featured_media && v.featured_media.id));
        swapImage(v.featured_image.src, ni > -1 && ni < activeIndex);
        thumbs.forEach((t, i) => t.classList.toggle('is-active', i === ni));
        if (ni > -1) activeIndex = ni;
      }
      const url = new URL(location.href);
      url.searchParams.set('variant', v.id);
      history.replaceState(null, '', url);
    }));
    if (addLabel) addBtn.dataset.addText = addLabel.textContent.trim();

    const qty = $('[data-qty]', pdp);
    qty && qty.addEventListener('click', (e) => {
      const b = e.target.closest('[data-qty-step]');
      if (!b) return;
      const input = $('input', qty);
      input.value = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(b.dataset.qtyStep, 10));
    });

    const sticky = $('[data-sticky-buy]', pdp);
    if (sticky && addBtn && 'IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { sticky.hidden = en.isIntersecting || en.boundingClientRect.top > 0; }).observe(addBtn);
      $('[data-sticky-add]', sticky).addEventListener('click', () => form.requestSubmit ? form.requestSubmit() : form.submit());
    }
  }
})();
