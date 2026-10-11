// ChargiX hero: a breathing energy core that "charges" as the visitor scrolls.
// Particles stream into the core, coils spin up, and featured products orbit it.
import * as THREE from 'three';

const hero = document.querySelector('[data-hero]');
const canvas = hero && hero.querySelector('[data-hero-canvas]');

if (hero && canvas) init();

function init() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    hero.classList.add('hero--no-webgl');
    return;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 749px)').matches;
  const volt = new THREE.Color(canvas.dataset.volt || '#3d7cff');
  const spark = new THREE.Color(canvas.dataset.spark || '#ffb547');

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const world = new THREE.Group();
  scene.add(world);

  const uniforms = {
    uTime: { value: 0 },
    uCharge: { value: 0 },
    uPulse: { value: 0 },
    uVolt: { value: volt },
    uSpark: { value: spark },
  };

  // ---- Core -------------------------------------------------------------
  const noise = /* glsl */ `
    vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+2.0*C.xxx;vec3 x3=x0-1.0+3.0*C.xxx;
      i=mod(i,289.0);
      vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=1.0/7.0;vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
      vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }`;

  const coreMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uCharge; uniform float uPulse;
      varying vec3 vNormal; varying vec3 vView; varying float vNoise; varying vec3 vPos;
      ${noise}
      void main(){
        float speed = 0.35 + uCharge * 0.9;
        float n = snoise(normal * 1.6 + vec3(uTime * speed));
        float amp = 0.06 + uCharge * 0.08 + uPulse * 0.3;
        vec3 p = position + normal * n * amp;
        vNoise = n; vPos = p;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uCharge; uniform float uPulse;
      uniform vec3 uVolt; uniform vec3 uSpark;
      varying vec3 vNormal; varying vec3 vView; varying float vNoise; varying vec3 vPos;
      void main(){
        float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
        vec3 hue = mix(uVolt, uSpark, smoothstep(0.55, 1.0, uCharge));
        // charging bands sweep upward through the core
        float band = smoothstep(0.92, 1.0, sin(vPos.y * 9.0 - uTime * (2.0 + uCharge * 6.0)) * 0.5 + 0.5);
        float fill = smoothstep(-1.3, 1.3, vPos.y) < uCharge ? 1.0 : 0.25;
        vec3 base = vec3(0.02, 0.03, 0.07);
        vec3 col = base + hue * (fres * 1.25 + band * 0.35 * fill + max(vNoise, 0.0) * 0.06 * fill);
        col += hue * uPulse * 0.8;
        gl_FragColor = vec4(col, 0.96);
      }`,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, small ? 32 : 64), coreMat);
  world.add(core);

  // Soft halo behind the core
  const haloMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uCharge; uniform float uPulse; uniform vec3 uVolt; uniform vec3 uSpark; varying vec2 vUv;
      void main(){
        float d = distance(vUv, vec2(0.5));
        float g = smoothstep(0.5, 0.0, d);
        vec3 hue = mix(uVolt, uSpark, smoothstep(0.55, 1.0, uCharge));
        vec3 c = hue * g * g * g * (0.28 + uCharge * 0.3 + uPulse * 0.8);
        // Alpha follows brightness so the halo glows over the page instead of
        // painting an opaque black panel behind it.
        float a = clamp(max(c.r, max(c.g, c.b)), 0.0, 1.0);
        gl_FragColor = vec4(c / max(a, 0.001), a);
      }`,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), haloMat);
  halo.position.z = -1.2;
  world.add(halo);

  // ---- Coils ------------------------------------------------------------
  const coils = [];
  const coilSpecs = [
    { r: 1.75, tube: 0.008, tilt: [1.2, 0.2, 0] },
    { r: 2.05, tube: 0.006, tilt: [0.4, 1.1, 0.3] },
    { r: 2.4, tube: 0.005, tilt: [1.6, -0.6, 0.8] },
  ];
  coilSpecs.forEach((s, i) => {
    const m = new THREE.MeshBasicMaterial({ color: i === 1 ? spark : volt, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
    const c = new THREE.Mesh(new THREE.TorusGeometry(s.r, s.tube, 8, 220), m);
    c.rotation.set(...s.tilt);
    c.userData.speed = 0.12 + i * 0.07;
    coils.push(c);
    world.add(c);
  });

  // ---- Current: particles spiralling into the core -----------------------
  const COUNT = small ? 900 : 2200;
  const seed = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    seed[i * 4] = Math.random() * Math.PI * 2; // angle
    seed[i * 4 + 1] = Math.random(); // phase
    seed[i * 4 + 2] = (Math.random() - 0.5) * 2.2; // height
    seed[i * 4 + 3] = 0.5 + Math.random(); // speed
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  pGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const pMat = new THREE.ShaderMaterial({
    uniforms: { ...uniforms, uSize: { value: renderer.getPixelRatio() * (small ? 16 : 20) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uCharge; uniform float uSize;
      attribute vec4 aSeed; varying float vLife;
      void main(){
        float speed = aSeed.w * (0.08 + uCharge * 0.32);
        float life = fract(aSeed.y - uTime * speed);
        float r = 1.25 + life * 4.2;
        float a = aSeed.x + (1.0 - life) * (2.4 + uCharge * 2.0);
        vec3 p = vec3(cos(a) * r, aSeed.z * life * 1.4, sin(a) * r * 0.55);
        vLife = life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.25 + (1.0 - life) * 0.75) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uCharge; uniform vec3 uVolt; uniform vec3 uSpark; varying float vLife;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * smoothstep(1.0, 0.6, vLife) * smoothstep(0.0, 0.08, vLife);
        vec3 hue = mix(uVolt, uSpark, smoothstep(0.4, 0.0, vLife) * uCharge);
        gl_FragColor = vec4(hue, a);
      }`,
  });
  const current = new THREE.Points(pGeo, pMat);
  current.frustumCulled = false;
  world.add(current);

  // ---- Orbiting product cards -------------------------------------------
  const orbiters = [];
  const urls = (canvas.dataset.images || '').split('|').filter(Boolean);
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const cardGeo = new THREE.PlaneGeometry(1, 1, 1, 1);
  urls.forEach((u, i) => {
    const src = u.startsWith('//') ? 'https:' + u : u;
    loader.load(src, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uVolt: uniforms.uVolt, uCharge: uniforms.uCharge, uHover: { value: 0 } },
        transparent: true,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uVolt; uniform float uHover; varying vec2 vUv;
          float rbox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q,0.0)) + min(max(q.x,q.y),0.0) - r; }
          void main(){
            float d = rbox(vUv - 0.5, vec2(0.5), 0.12);
            if (d > 0.0) discard;
            vec4 c = texture2D(uMap, vUv);
            float edge = smoothstep(-0.03, 0.0, d);
            vec3 col = mix(c.rgb, uVolt, edge * (0.8 + uHover));
            gl_FragColor = vec4(col, 0.92 + uHover * 0.08);
          }`,
      });
      const m = new THREE.Mesh(cardGeo, mat);
      const scale = small ? 0.62 : 0.78;
      m.scale.setScalar(scale);
      m.userData = { phase: (i / urls.length) * Math.PI * 2, base: scale };
      orbiters.push(m);
      world.add(m);
    });
  });

  // ---- Interaction ------------------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const valueEl = hero.querySelector('[data-charge-value]');
  const fillEl = hero.querySelector('[data-charge-fill]');
  let boot = 0; // intro animation 0 -> 1
  let charge = 0;
  let pulsed = false;

  function scrollProgress() {
    const rect = hero.getBoundingClientRect();
    return Math.min(Math.max(-rect.top / (rect.height * 0.75), 0), 1);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the core off-centre on wide screens so the headline breathes
    const wide = w > 990;
    world.position.x = wide ? 2.2 : 0;
    world.position.y = wide ? 0.1 : 1.55;
    world.scale.setScalar(wide ? 1 : 0.7);
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 }).observe(hero);

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    boot = Math.min(boot + dt * 0.6, 1);
    const target = reduced ? 1 : Math.max(easeOut(boot) * 0.22, 0.22 + scrollProgress() * 0.78);
    charge += (target - charge) * (reduced ? 1 : 0.08);

    if (charge > 0.985 && !pulsed) { pulsed = true; uniforms.uPulse.value = 1; hero.classList.add('is-charged'); }
    if (charge < 0.9 && pulsed) { pulsed = false; hero.classList.remove('is-charged'); }
    uniforms.uPulse.value *= 0.94;

    uniforms.uTime.value = t;
    uniforms.uCharge.value = charge;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    world.rotation.y = pointer.x * 0.35;
    world.rotation.x = pointer.y * 0.2;
    core.rotation.y = t * 0.15;

    coils.forEach((c) => { c.rotation.z += dt * c.userData.speed * (1 + charge * 4); });

    const R = small ? 2.5 : 2.35;
    orbiters.forEach((m) => {
      const a = m.userData.phase + t * (0.12 + charge * 0.18);
      m.position.set(Math.cos(a) * R, Math.sin(a * 2) * 0.35, Math.sin(a) * R * 0.6);
      m.lookAt(camera.position);
      const depth = (m.position.z + R) / (2 * R);
      m.scale.setScalar(m.userData.base * (0.75 + depth * 0.4));
      m.renderOrder = depth > 0.5 ? 2 : 0;
    });

    const pct = Math.round(charge * 100);
    if (valueEl) valueEl.textContent = String(pct).padStart(3, '0');
    if (fillEl) fillEl.style.transform = `scaleX(${charge})`;

    renderer.render(scene, camera);
  }

  function loop() {
    if (visible && !document.hidden) frame();
    requestAnimationFrame(loop);
  }

  if (reduced) {
    frame();
    window.addEventListener('resize', () => { resize(); frame(); });
  } else {
    loop();
  }
  hero.classList.add('hero--ready');
}

function easeOut(x) { return 1 - Math.pow(1 - x, 3); }
