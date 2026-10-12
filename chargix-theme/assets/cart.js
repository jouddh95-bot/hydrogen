/* ChargiX cart: AJAX add with a fly-to-cart arc and spark burst, plus the
   slide-out drawer with a free-shipping charge meter. */
(() => {
  const cfg = window.Chargix || { routes: {} };
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function formatMoney(cents) {
    const format = cfg.moneyFormat || '${{amount}}';
    const value = Number(cents) / 100;
    const withDelims = (n, d, t, dec) => {
      const [i, f] = n.toFixed(d).split('.');
      return i.replace(/\B(?=(\d{3})+(?!\d))/g, t) + (f ? dec + f : '');
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return withDelims(value, 0, ',', '.');
        case 'amount_with_comma_separator': return withDelims(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return withDelims(value, 0, '.', ',');
        default: return withDelims(value, 2, ',', '.');
      }
    }).replace(/<[^>]*>/g, '');
  }
  window.ChargixMoney = formatMoney;

  const drawer = $('[data-cart-drawer]');
  const itemsEl = drawer && $('[data-cart-items]', drawer);
  const totalEl = drawer && $('[data-cart-total]', drawer);
  const countEls = () => document.querySelectorAll('[data-cart-count]');
  let lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.hidden = false;
    drawer.classList.remove('is-closing');
    document.body.style.overflow = 'hidden';
    const close = $('[data-cart-close].header__icon', drawer);
    close && close.focus();
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.add('is-closing');
    setTimeout(() => { drawer.hidden = true; drawer.classList.remove('is-closing'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }, reduced ? 0 : 330);
  }

  function render(cart) {
    countEls().forEach((el) => {
      el.textContent = cart.item_count;
      el.hidden = cart.item_count === 0;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    });
    if (!drawer) return;
    totalEl.textContent = formatMoney(cart.total_price);

    const meter = $('[data-ship-meter]', drawer);
    const threshold = Number(meter.dataset.threshold || 0);
    const label = $('[data-ship-label]', meter);
    const fill = $('[data-ship-fill]', meter);
    if (!threshold) {
      label.textContent = 'Free shipping unlocked';
      fill.style.transform = 'scaleX(1)';
    } else {
      const ratio = Math.min(cart.total_price / threshold, 1);
      fill.style.transform = `scaleX(${ratio})`;
      label.textContent = ratio >= 1 ? 'Free shipping unlocked' : `${formatMoney(threshold - cart.total_price)} away from free shipping`;
    }

    if (!cart.items.length) {
      itemsEl.innerHTML = `<div class="drawer__empty"><div class="empty__battery" aria-hidden="true"><span></span></div><p>Your cart is empty. Let's charge it up.</p><a class="btn btn--volt" href="${esc(cfg.routes.root || '/')}collections/all">Continue shopping</a></div>`;
      return;
    }
    itemsEl.innerHTML = cart.items.map((item, i) => {
      const img = item.image ? item.image.replace(/(\.[a-z]+)(\?|$)/i, '$1$2') : '';
      const variant = item.product_has_only_default_variant ? '' : `<span class="d-line__variant">${esc(item.variant_title)}</span>`;
      return `<div class="d-line" style="--i:${i}">
        <a href="${esc(item.url)}">${img ? `<img src="${esc(img)}${img.includes('?') ? '&' : '?'}width=160" alt="" loading="lazy">` : ''}</a>
        <div><a class="d-line__title" href="${esc(item.url)}">${esc(item.product_title)}</a>${variant}
          <div class="d-line__qty" data-key="${esc(item.key)}">
            <button type="button" data-change="${item.quantity - 1}" aria-label="Decrease quantity"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
            <span>${item.quantity}</span>
            <button type="button" data-change="${item.quantity + 1}" aria-label="Increase quantity"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
          </div>
        </div>
        <span class="d-line__price">${formatMoney(item.final_line_price)}</span>
      </div>`;
    }).join('');
  }

  const getCart = () => fetch(`${cfg.routes.cart || '/cart'}.js`, { headers: { Accept: 'application/json' } }).then((r) => r.json());

  function flyToCart(fromImg) {
    const target = document.querySelector('[data-cart-open]');
    if (reduced || !fromImg || !target) return Promise.resolve();
    const a = fromImg.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const clone = document.createElement('img');
    clone.src = fromImg.currentSrc || fromImg.src;
    clone.className = 'fly';
    const size = Math.min(a.width, 160);
    Object.assign(clone.style, { width: `${size}px`, height: `${size}px`, left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px` });
    document.body.appendChild(clone);
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = clone.animate([
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 120}px) scale(0.6) rotate(-12deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.08) rotate(20deg)`, opacity: 0.4 },
    ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' });
    return anim.finished.then(() => { clone.remove(); burst(b.left + b.width / 2, b.top + b.height / 2); });
  }

  function burst(x, y) {
    for (let i = 0; i < 14; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = `${x}px`; s.style.top = `${y}px`;
      document.body.appendChild(s);
      const ang = (Math.PI * 2 * i) / 14;
      const dist = 26 + Math.random() * 30;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * dist}px), calc(-50% + ${Math.sin(ang) * dist}px)) scale(0)`, opacity: 0 },
      ], { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished.then(() => s.remove());
    }
  }

  document.addEventListener('submit', async (e) => {
    const form = e.target.closest('form[data-add-form]');
    if (!form) return;
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const label = form.querySelector('[data-add-label]');
    const original = label ? label.textContent : '';
    btn && (btn.disabled = true);
    if (label) label.textContent = 'Adding…';
    const card = form.closest('.card');
    const img = card ? card.querySelector('.card__img') : document.querySelector('.pdp__main-img');
    try {
      const res = await fetch(cfg.routes.cartAdd || '/cart/add.js', { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.description || json.message || 'Could not add to cart');
      await flyToCart(img);
      render(await getCart());
      if (label) { label.textContent = 'Charged into your cart'; btn.classList.add('is-charged'); }
      openDrawer();
      setTimeout(() => { if (label) label.textContent = original; btn && btn.classList.remove('is-charged'); }, 2200);
    } catch (err) {
      if (label) label.textContent = err.message;
      setTimeout(() => { if (label) label.textContent = original; }, 2600);
    } finally {
      btn && (btn.disabled = false);
    }
  });

  document.addEventListener('click', async (e) => {
    const open = e.target.closest('[data-cart-open]');
    if (open && drawer) {
      e.preventDefault();
      render(await getCart());
      openDrawer();
      return;
    }
    if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }
    const change = e.target.closest('[data-change]');
    if (change) {
      const key = change.closest('[data-key]').dataset.key;
      const res = await fetch(cfg.routes.cartChange || '/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ id: key, quantity: Math.max(0, parseInt(change.dataset.change, 10)) }),
      });
      if (res.ok) render(await res.json());
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
})();
