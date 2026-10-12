// ChargiX Halloween hero: a carved jack-o'-lantern that watches the pointer,
// ghosts that circle it and lunge at the camera, bats, rising embers and a
// full moon in purple fog. Lightning flashes now and then. Pauses off screen.
import * as THREE from 'three';

const hero = document.querySelector('[data-haunt]');
const canvas = hero && hero.querySelector('[data-haunt-canvas]');
if (hero && canvas) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    hero.classList.add('is-flat');
    return;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 749px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x1a0d2e, 0.045);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);
  camera.position.set(0, 0.2, 10);

  // ---- light ---------------------------------------------------------------
  const ambient = new THREE.HemisphereLight(0x9a7bff, 0x12061f, 0.75);
  scene.add(ambient);
  const moonLight = new THREE.DirectionalLight(0xdcd6ff, 1.1);
  moonLight.position.set(-4, 6, -3);
  scene.add(moonLight);
  const rim = new THREE.PointLight(0xa3ff2b, 14, 14, 2);
  rim.position.set(3.6, -1.2, 1.5);
  scene.add(rim);
  const front = new THREE.PointLight(0xff8a3d, 10, 16, 2);
  front.position.set(-1.5, 1.5, 5);
  scene.add(front);

  // ---- textures drawn on canvas -------------------------------------------
  const tex = (w, h, draw) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  const glow = (inner, outer) => tex(256, 256, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, inner); r.addColorStop(1, outer);
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  });

  // The carved face sits at u = 0.25 (the side facing the camera).
  const face = (g, w, h, col) => {
    const cx = w * 0.25, cy = h * 0.5;
    g.fillStyle = col;
    const tri = (x, y, s, flip) => { g.beginPath(); g.moveTo(x - s, y + (flip ? -s : s) * 0.6); g.lineTo(x + s, y + (flip ? -s : s) * 0.6); g.lineTo(x + s * 0.15, y - (flip ? -s : s) * 0.9); g.closePath(); g.fill(); };
    tri(cx - 62, cy - 52, 34, false);
    tri(cx + 62, cy - 52, 34, false);
    tri(cx, cy + 4, 15, false);
    g.beginPath();
    const mw = 120, my = cy + 50;
    g.moveTo(cx - mw, my - 12);
    g.quadraticCurveTo(cx, my + 34, cx + mw, my - 12);
    g.lineTo(cx + mw * 0.78, my + 30);
    for (let k = 4; k >= -4; k--) {
      const x = cx + k * mw * 0.19;
      g.lineTo(x, my + (k % 2 ? 46 : 64));
    }
    g.lineTo(cx - mw * 0.78, my + 30);
    g.closePath();
    g.fill();
    // a tooth or two left standing
    g.globalCompositeOperation = 'destination-out';
    g.fillRect(cx - 34, my + 14, 18, 22);
    g.fillRect(cx + 26, my + 18, 16, 18);
    g.globalCompositeOperation = 'source-over';
  };
  const skinTex = tex(1024, 512, (g, w, h) => {
    const lin = g.createLinearGradient(0, 0, 0, h);
    lin.addColorStop(0, '#d9480f'); lin.addColorStop(0.5, '#ff7a1f'); lin.addColorStop(1, '#b23a07');
    g.fillStyle = lin; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${120 + Math.random() * 80},${40 + Math.random() * 30},0,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 6 + Math.random() * 18);
    }
    face(g, w, h, '#ffd27a');
  });
  const glowTex = tex(1024, 512, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); face(g, w, h, '#fff'); });

  // ---- moon -----------------------------------------------------------------
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 48, 32),
    new THREE.MeshBasicMaterial({ map: tex(512, 256, (g, w, h) => {
      g.fillStyle = '#fff3c4'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        const r = 4 + Math.random() * 22;
        g.fillStyle = `rgba(190,160,110,${0.15 + Math.random() * 0.25})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); g.fill();
      }
    }), fog: false })
  );
  moon.position.set(small ? 2.4 : 4.6, small ? 6.2 : 2.6, -16);
  if (small) moon.scale.setScalar(0.55);
  scene.add(moon);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,236,170,0.55)', 'rgba(255,236,170,0)'), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  halo.scale.set(small ? 9 : 16, small ? 9 : 16, 1);
  halo.position.copy(moon.position);
  scene.add(halo);

  // ---- jack-o'-lantern ------------------------------------------------------
  const pumpkin = new THREE.Group();
  const geo = new THREE.SphereGeometry(1.45, 128, 80);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const th = Math.atan2(v.z, v.x);
    const groove = 1 - 0.085 * Math.pow(1 - Math.abs(Math.sin(5 * th)), 5);
    const rxz = Math.hypot(v.x, v.z) / 1.45;
    v.x *= groove * 1.12; v.z *= groove * 1.12;
    v.y *= 0.8;
    v.y -= Math.sign(v.y) * 0.22 * Math.pow(1 - rxz, 3);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const skin = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.62, metalness: 0, emissive: 0xffa21a, emissiveMap: glowTex, emissiveIntensity: 2.4 });
  const body = new THREE.Mesh(geo, skin);
  pumpkin.add(body);
  const stemGeo = new THREE.CylinderGeometry(0.11, 0.2, 0.62, 10, 6);
  const sp = stemGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); sp.setX(i, sp.getX(i) + Math.pow(y + 0.31, 2) * 0.35); }
  stemGeo.computeVertexNormals();
  const stem = new THREE.Mesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x46612a, roughness: 0.9 }));
  stem.position.y = 1.25;
  stem.rotation.z = -0.2;
  pumpkin.add(stem);
  const candle = new THREE.PointLight(0xff9a2e, 18, 7, 2);
  candle.position.set(0, 0, 0.6);
  pumpkin.add(candle);
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow('rgba(255,140,40,0.55)', 'rgba(255,90,20,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  aura.scale.set(6.5, 6.5, 1);
  aura.position.z = -0.6;
  pumpkin.add(aura);
  const pumpkinHome = new THREE.Vector3(small ? 0.2 : 1.7, small ? -1.5 : -1.05, 0.6);
  pumpkin.position.copy(pumpkinHome);
  pumpkin.scale.setScalar(small ? 0.78 : 1);
  scene.add(pumpkin);

  // ---- ghosts ---------------------------------------------------------------
  const ghostProfile = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const y = 1 - t * 1.75;
    const r = t < 0.45 ? Math.sin((t / 0.45) * Math.PI / 2) * 0.55 : 0.55 + (t - 0.45) * 0.22;
    ghostProfile.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0xf6f1ff, emissive: 0xb9a6ff, emissiveIntensity: 0.32, roughness: 0.85, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0a0612 });
  const ghosts = [];
  const N_GHOSTS = small ? 2 : 3;
  for (let k = 0; k < N_GHOSTS; k++) {
    const g = new THREE.Group();
    const lg = new THREE.LatheGeometry(ghostProfile, 40);
    const base = Float32Array.from(lg.attributes.position.array);
    const m = new THREE.Mesh(lg, ghostMat);
    g.add(m);
    const eye = new THREE.SphereGeometry(0.075, 12, 10);
    const e1 = new THREE.Mesh(eye, eyeMat); e1.scale.set(1, 1.5, 0.6); e1.position.set(-0.17, 0.42, 0.5);
    const e2 = e1.clone(); e2.position.x = 0.17;
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), eyeMat); mouth.scale.set(1, 1.4, 0.5); mouth.position.set(0, 0.12, 0.54);
    g.add(e1, e2, mouth);
    g.userData = { lg, base, mouth, r: 2.9 + k * 0.6, speed: 0.22 + k * 0.07, phase: k * 2.1, h: -0.2 + k * 0.7, boo: 0 };
    g.scale.setScalar(small ? 0.65 : 0.8 - k * 0.08);
    scene.add(g);
    ghosts.push(g);
  }

  // ---- bats -------------------------------------------------------------------
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.quadraticCurveTo(0.35, 0.28, 0.85, 0.18);
  wingShape.quadraticCurveTo(0.7, 0.02, 0.78, -0.12);
  wingShape.quadraticCurveTo(0.6, -0.04, 0.5, -0.16);
  wingShape.quadraticCurveTo(0.38, -0.05, 0.24, -0.15);
  wingShape.quadraticCurveTo(0.14, -0.05, 0, -0.06);
  const wingGeo = new THREE.ShapeGeometry(wingShape);
  const batMat = new THREE.MeshBasicMaterial({ color: 0x07030c, side: THREE.DoubleSide });
  const bats = [];
  const N_BATS = small ? 4 : 7;
  for (let k = 0; k < N_BATS; k++) {
    const b = new THREE.Group();
    const l = new THREE.Mesh(wingGeo, batMat);
    const r = new THREE.Mesh(wingGeo, batMat); r.scale.x = -1;
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), batMat); torso.scale.set(1, 1.3, 1);
    b.add(l, r, torso);
    b.userData = { l, r, a: 3 + Math.random() * 4, b: 1 + Math.random() * 1.6, z: -2 - Math.random() * 6, s: 0.25 + Math.random() * 0.3, p: Math.random() * 10, f: 14 + Math.random() * 8 };
    b.scale.setScalar(0.5 + Math.random() * 0.4);
    scene.add(b);
    bats.push(b);
  }

  // ---- embers -----------------------------------------------------------------
  const N_EMBERS = small ? 120 : 260;
  const ep = new Float32Array(N_EMBERS * 3);
  const ec = new Float32Array(N_EMBERS * 3);
  const pal = [new THREE.Color(0xff8a2e), new THREE.Color(0xa3ff2b), new THREE.Color(0xb68cff)];
  for (let i = 0; i < N_EMBERS; i++) {
    ep[i * 3] = (Math.random() - 0.5) * 18;
    ep[i * 3 + 1] = (Math.random() - 0.5) * 10;
    ep[i * 3 + 2] = -Math.random() * 8 + 2;
    const c = pal[i % 3];
    ec[i * 3] = c.r; ec[i * 3 + 1] = c.g; ec[i * 3 + 2] = c.b;
  }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, map: glow('rgba(255,255,255,1)', 'rgba(255,255,255,0)') }));
  scene.add(embers);

  // ---- fog banks ------------------------------------------------------------
  const fogTex = glow('rgba(190,160,255,0.42)', 'rgba(190,160,255,0)');
  const fogs = [];
  for (let k = 0; k < 5; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.2), new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.55 }));
    f.position.set(-8 + k * 4, -2.6 - Math.random() * 0.6, -1 - k * 0.8);
    f.userData.v = 0.15 + Math.random() * 0.2;
    scene.add(f);
    fogs.push(f);
  }

  // ---- interaction ----------------------------------------------------------
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { ptr.tx = 0; ptr.ty = 0; });
  let laugh = 0;
  hero.addEventListener('pointerdown', () => { laugh = 1; ghosts[(Math.random() * ghosts.length) | 0].userData.boo = 1; });

  let flash = 0, nextFlash = 3 + Math.random() * 4;
  const flashEvent = () => window.dispatchEvent(new CustomEvent('haunt:flash'));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  let visible = true, running = false, last = performance.now(), t = 0;
  const clock = () => {
    if (!visible || document.hidden) { running = false; return; }
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    t += reduced ? dt * 0.25 : dt;
    frame(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(clock);
  };
  const start = () => { if (running) return; running = true; last = performance.now(); requestAnimationFrame(clock); };
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => { visible = en.isIntersecting; start(); }).observe(hero);
  document.addEventListener('visibilitychange', start);

  const look = new THREE.Vector3();
  function frame(dt) {
    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;

    // scroll: the scene sinks and the camera leans in as the hero leaves
    const r = hero.getBoundingClientRect();
    const sp = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));

    camera.position.x = ptr.x * 0.6;
    camera.position.y = 0.2 + ptr.y * 0.35 - sp * 1.2;
    camera.position.z = 10 - sp * 2.4;
    camera.lookAt(0, -sp * 0.8, 0);

    // pumpkin: watches the pointer, breathes, and cackles on click
    laugh *= 0.94;
    pumpkin.rotation.y += ((ptr.x * 0.55 - 0.18) - pumpkin.rotation.y) * 0.08 + Math.sin(t * 22) * laugh * 0.04;
    pumpkin.rotation.x += ((-ptr.y * 0.25) - pumpkin.rotation.x) * 0.08;
    pumpkin.rotation.z = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 30) * laugh * 0.05;
    pumpkin.position.y = pumpkinHome.y + Math.sin(t * 1.3) * 0.08 + laugh * 0.25;
    const s = (small ? 0.78 : 1) * (1 + laugh * 0.08);
    pumpkin.scale.set(s, s * (1 - laugh * 0.05), s);
    const flicker = 0.75 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29.7) * 0.07 + Math.random() * 0.1;
    skin.emissiveIntensity = 2.2 * flicker + laugh * 2;
    candle.intensity = 18 * flicker + laugh * 20;
    aura.material.opacity = 0.75 * flicker;

    // ghosts: orbit, bob, face the camera, and now and then lunge at you
    ghosts.forEach((g, k) => {
      const u = g.userData;
      const a = t * u.speed + u.phase;
      if (u.boo > 0) u.boo = Math.max(0, u.boo - dt * 0.7);
      const lunge = Math.sin(Math.min(1, u.boo) * Math.PI);
      g.position.set(
        pumpkinHome.x * 0.5 + Math.cos(a) * u.r * (1 - lunge * 0.6),
        u.h + Math.sin(t * 1.7 + k) * 0.3 + lunge * 0.4,
        Math.sin(a) * u.r * 0.7 - 1 + lunge * 5.5
      );
      look.set(camera.position.x, camera.position.y, camera.position.z);
      g.lookAt(look);
      g.rotation.z = Math.sin(t * 2 + k) * 0.12;
      u.mouth.scale.set(1 + lunge * 0.8, 1.4 + lunge * 2.4, 0.5);
      // wavy hem
      const arr = u.lg.attributes.position.array;
      for (let i = 0; i < arr.length; i += 3) {
        const y = u.base[i + 1];
        if (y < -0.25) {
          const th = Math.atan2(u.base[i + 2], u.base[i]);
          const w = (-0.25 - y) * 0.45;
          arr[i + 1] = y + Math.sin(th * 6 + t * 5 + k) * w;
          const pull = 1 + Math.sin(th * 3 - t * 3) * w * 0.4;
          arr[i] = u.base[i] * pull;
          arr[i + 2] = u.base[i + 2] * pull;
        }
      }
      u.lg.attributes.position.needsUpdate = true;
    });
    if (!reduced && Math.random() < dt * 0.06) ghosts[(Math.random() * ghosts.length) | 0].userData.boo = 1;

    // bats: figure-eight flights with flapping wings
    bats.forEach((b) => {
      const u = b.userData;
      const a = t * u.s + u.p;
      b.position.set(Math.sin(a) * u.a, 1.4 + Math.sin(a * 2) * u.b, u.z + Math.cos(a) * 1.2);
      const dx = Math.cos(a) * u.a, dy = Math.cos(a * 2) * 2 * u.b;
      b.rotation.z = Math.atan2(dy, dx) * 0.25;
      b.rotation.y = dx > 0 ? 0.3 : -0.3;
      const flap = Math.sin(t * u.f) * 0.9;
      u.l.rotation.y = flap; u.r.rotation.y = -flap;
    });

    // embers rise and wrap
    const p = eg.attributes.position.array;
    for (let i = 0; i < N_EMBERS; i++) {
      p[i * 3 + 1] += dt * (0.25 + (i % 7) * 0.05);
      p[i * 3] += Math.sin(t + i) * dt * 0.08;
      if (p[i * 3 + 1] > 5) p[i * 3 + 1] = -5;
    }
    eg.attributes.position.needsUpdate = true;

    fogs.forEach((f) => { f.position.x += f.userData.v * dt; if (f.position.x > 10) f.position.x = -10; });

    // lightning
    if (!reduced) {
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 1; nextFlash = 7 + Math.random() * 9; flashEvent(); }
    }
    flash *= 0.86;
    const strobe = flash > 0.05 ? flash * (0.6 + Math.random() * 0.8) : 0;
    ambient.intensity = 0.75 + strobe * 5;
    moonLight.intensity = 1.1 + strobe * 6;
  }

  frame(0);
  renderer.render(scene, camera);
  hero.classList.add('is-live');
  start();
}
