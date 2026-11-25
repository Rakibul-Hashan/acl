/* ============================================================
   JarStage — Three.js PET jar modelled on the reference jars:
     tall  : round 250 g jar, heel ring at the base, neck ring under the cap
     wideS : squat wide-mouth 150–200 g jar
     wide / big : larger wide-mouth jars for 500 g / 1 kg
   Caps are frosted translucent white with fine vertical ribs.
   Labels:
     portrait art (spices, seeds) -> composed into a full wrap-around label
     long pouch art (seed mix, ghee) -> applied as a front sticker of its true proportions
   Printed net weight / price badges are repainted when the chosen size differs.
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG, asset } from './config.js';
import { labelMeta, jarShape } from './data.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 || Math.min(screen.width, screen.height) < 400;
const BN = '০১২৩৪৫৬৭৮৯';
const toBn = v => String(v).replace(/\d/g, d => BN[d]);

/* r = body radius, h = body height (without cap) */
const SHAPES = {
  // proportions measured from the reference photos (height incl. cap : width ≈ 2 : 1 tall, ≈ 1 : 1 wide)
  tall: { r: 0.92, h: 3.3, kind: 'tall', capR: 0.955, capH: 0.48 },
  wideS: { r: 1.1, h: 1.9, kind: 'wide', capR: 1.02, capH: 0.36 },
  wide: { r: 1.25, h: 2.2, kind: 'wide', capR: 1.16, capH: 0.38 },
  big: { r: 1.38, h: 2.65, kind: 'wide', capR: 1.28, capH: 0.42 },
};

function profile(S) {
  const { r: R, h: H } = S;
  const pts = S.kind === 'tall'
    ? [[0, 0], [R * .86, 0], [R * .96, .03], [R, .11], [R, .3], [R * .962, .37], [R * .962, .43], [R * .985, .5],
      [R * .985, H - .34], [R * .965, H - .24], [R * .925, H - .17], [R * .95, H - .13], [R * .95, H - .06], [R * .9, H - .04], [R * .9, H]]
    : [[0, 0], [R * .84, 0], [R * .95, .03], [R * .99, .12], [R, .28], [R * 1.005, H * .55], [R, H - .44],
      [R * .97, H - .28], [R * .9, H - .17], [R * .87, H - .13], [R * .89, H - .1], [R * .89, H - .04], [R * .85, H - .02], [R * .85, H]];
  return pts.map(([x, y]) => new THREE.Vector2(x, y));
}
// label band on the straight part of the body
const band = S => (S.kind === 'tall' ? { y0: .62, h: S.h - 1.05, r: S.r * .985 + .012 } : { y0: .32, h: S.h - .86, r: S.r * 1.005 + .012 });

const imgCache = new Map();
function loadImg(src) {
  if (!imgCache.has(src)) {
    imgCache.set(src, new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = asset(src); }));
  }
  return imgCache.get(src);
}
async function fontsReady() {
  try {
    await Promise.all([document.fonts.load('700 60px "Hind Siliguri"'), document.fonts.load('500 44px "Hind Siliguri"'),
      document.fonts.load('700 60px "Noto Serif Bengali"', '০১২৩৪৫৬৭৮৯')]);
  } catch { /* system fonts */ }
}
function wrapText(ctx, text, x, y, maxW, lh) {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; } else line = t;
  }
  if (line) ctx.fillText(line, x, y);
  return y + lh;
}
const FONT = (w, px) => `${w} ${px}px "Noto Serif Bengali", "Hind Siliguri", sans-serif`;

/* Repaint printed weight / price where the chosen size differs from what is printed. */
function patchLabel(x, img, dx, dy, dw, dh, meta, size) {
  if (size.g === meta.native) return;
  // sample the label's own background just left of a spot so the patch blends in
  let sample;
  try {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0);
    sample = sp => { const d = cx.getImageData(Math.max(0, (sp[0] - sp[2] / 2) * img.width - 6), sp[1] * img.height, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
  } catch { sample = () => '#ffffff'; }
  const en = size.g >= 1000 ? `Net weight: ${size.g / 1000} Kg` : `Net weight: ${size.g} g`;
  for (const sp of meta.spots || []) {
    const [fx, fy, fw, fh, lang] = sp, w = fw * dw, h = fh * dh, cx = dx + fx * dw, cy = dy + fy * dh;
    x.fillStyle = sample(sp); x.fillRect(cx - w / 2, cy - h / 2, w, h);
    x.fillStyle = '#1a0f08'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = FONT(700, Math.round(h * .62));
    x.fillText(lang === 'en' ? en : `নিট ওজনঃ ${size.bn}`, cx, cy);
  }
  for (const [fx, fy, fr, lang] of meta.badges || []) {
    const r = fr * dh, cx = dx + fx * dw, cy = dy + fy * dh;
    x.save(); x.translate(cx, cy); x.rotate(-.26);
    x.fillStyle = '#ec3550'; x.beginPath();
    for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, rr = i % 2 ? r * .9 : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill();
    x.fillStyle = '#fff8e0'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = FONT(700, Math.round(r * .62));
    x.fillText(lang === 'en' ? String(size.price) : toBn(size.price), 0, -r * .12);
    x.font = FONT(600, Math.round(r * .32)); x.fillText(lang === 'en' ? 'Tk' : 'টাকা', 0, r * .42);
    x.restore();
  }
  x.textAlign = 'start'; x.textBaseline = 'alphabetic';
}

const texCache = new Map();
/* Returns { tex, arc, frontX }: texture plus how much of the circumference it should cover. */
export async function composeLabel(p, size, shapeKey, maxTex = 4096) {
  const key = `${p.slug}|${size.id}|${shapeKey}`;
  if (texCache.has(key)) return texCache.get(key);
  await fontsReady();
  const S = SHAPES[shapeKey], B = band(S), meta = labelMeta(p, size);
  const img = await loadImg(`assets/labels/${size.label || p.label}.webp`);
  const c = document.createElement('canvas'), x = c.getContext('2d');
  let arc, frontX;

  if (meta.wide) {
    // pouch-style long label: keep its real proportions, wrap only as far as it reaches
    const aspect = img.width / img.height;
    arc = Math.min(Math.PI * 2, (B.h * aspect) / B.r);
    frontX = meta.frontX;
    c.width = Math.min(maxTex, 4096); c.height = Math.round(c.width / aspect);
    x.drawImage(img, 0, 0, c.width, c.height);
    patchLabel(x, img, 0, 0, c.width, c.height, meta, size);
  } else {
    arc = Math.PI * 2; frontX = .5;
    const W = Math.min(maxTex, 8192), H = Math.round(W / ((arc * B.r) / B.h));
    c.width = W; c.height = H;
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#ffffff'); g.addColorStop(1, p.soft);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // ornament band from the label's own pattern, mirrored tiles
    const sx = img.width / 1172, tw = 300 * sx, th = 480 * sx;
    const bandC = document.createElement('canvas'); bandC.width = W; bandC.height = Math.round(H * .42);
    const b = bandC.getContext('2d'), dh = bandC.height, dw = dh * (tw / th);
    for (let i = 0, px = 0; px < W; i++, px += dw) {
      b.save();
      if (i % 2) { b.translate(px + dw, 0); b.scale(-1, 1); b.drawImage(img, 0, 0, tw, th, 0, 0, dw, dh); } else b.drawImage(img, 0, 0, tw, th, px, 0, dw, dh);
      b.restore();
    }
    b.globalCompositeOperation = 'destination-in';
    const fade = b.createLinearGradient(0, 0, 0, dh);
    fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(.7, 'rgba(0,0,0,.75)'); fade.addColorStop(1, 'rgba(0,0,0,.35)');
    b.fillStyle = fade; b.fillRect(0, 0, W, dh);
    x.drawImage(bandC, 0, 0);
    // front: label art full height
    const fw = H * (img.width / img.height), fx = W / 2 - fw / 2;
    x.drawImage(img, fx, 0, fw, H);
    patchLabel(x, img, fx, 0, fw, H, meta, size);
    // side info panels (scaled to the band height)
    const k = H / 1132, pw = Math.min(1160 * k, fx - 120 * k);
    const panel = (px, draw) => {
      if (pw < 300 * k) return;
      const py = H * .3, ph = H * .62;
      x.save(); x.fillStyle = '#fff'; x.beginPath();
      if (x.roundRect) x.roundRect(px, py, pw, ph, 40 * k); else x.rect(px, py, pw, ph);
      x.fill(); x.strokeStyle = p.accent; x.globalAlpha = .7; x.lineWidth = 6 * k; x.stroke(); x.globalAlpha = 1;
      draw(px + 60 * k, py + 100 * k, pw - 120 * k); x.restore();
    };
    const head = (t, X, Y) => { x.fillStyle = p.accent; x.font = FONT(700, Math.round(64 * k)); x.fillText(t, X, Y); };
    const body = (t, X, Y, Wd) => { x.fillStyle = '#1a0f08'; x.font = FONT(600, Math.round(46 * k)); return wrapText(x, t, X, Y, Wd, 60 * k); };
    panel(fx - pw - 120 * k, (X, Y, Wd) => {
      head('পণ্য পরিচিতি', X, Y);
      const y = body(p.short, X, Y + 80 * k, Wd);
      head('ব্যবহার', X, y + 40 * k);
      body(p.uses.map(u => u[0]).join(', ') + '।', X, y + 120 * k, Wd);
    });
    panel(fx + fw + 120 * k, (X, Y, Wd) => {
      head(`নিট ওজন: ${size.bn}`, X, Y);
      let y = body('শুষ্ক ও ঠান্ডা স্থানে রাখুন।', X, Y + 80 * k, Wd);
      y = body('ব্যাচ নং:            উৎপাদন:', X, y + 10 * k, Wd);
      y = body('মেয়াদ:', X, y, Wd);
      x.fillStyle = '#1a0f08'; x.font = FONT(600, Math.round(40 * k)); x.fillText('প্রস্তুতকারক ও বাজারজাতকারী', X, y + 50 * k);
      x.font = FONT(700, Math.round(56 * k)); x.fillText(CONFIG.brand.company, X, y + 120 * k);
    });
    x.fillStyle = p.accent; x.globalAlpha = .9; x.fillRect(0, H - 26 * k, W, 26 * k); x.globalAlpha = 1;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const out = { tex, arc, frontX };
  texCache.set(key, out);
  return out;
}

function fillTexture(p) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = p.fill; x.fillRect(0, 0, 512, 512);
  if (p.solid) { // ghee: soft grainy swirl
    for (let i = 0; i < 1400; i++) { x.fillStyle = Math.random() < .5 ? p.fill2 : 'rgba(255,248,220,.5)'; x.globalAlpha = .15 + Math.random() * .25; x.beginPath(); x.arc(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 0, 6.3); x.fill(); }
  } else {
    const n = p.seeds ? 900 : 5000;
    for (let i = 0; i < n; i++) {
      x.fillStyle = Math.random() < .5 ? p.fill2 : 'rgba(255,255,255,.25)'; x.globalAlpha = .25 + Math.random() * .5;
      if (p.seeds) { x.save(); x.translate(Math.random() * 512, Math.random() * 512); x.rotate(Math.random() * 6.3); x.beginPath(); x.ellipse(0, 0, 10, 4.5, 0, 0, 6.3); x.fill(); x.restore(); }
      else x.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, inner); g.addColorStop(1, outer); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function ribTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 8;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 8);
  for (let i = 0; i < 1024; i += 8) { x.fillStyle = '#fff'; x.fillRect(i, 0, 3, 8); }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
}

export class JarStage {
  constructor(host, { interactive = true, onReady } = {}) {
    this.host = host; this.interactive = interactive; this.onReady = onReady;
    const R = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(devicePixelRatio, lowEnd ? 1.5 : 2));
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.toneMapping = THREE.NoToneMapping; // keeps the printed label colours true
    host.appendChild(R.domElement);
    this.maxTex = R.capabilities.maxTextureSize;

    const scene = this.scene = new THREE.Scene();
    scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xe8dccf, .35));
    const key = new THREE.DirectionalLight(0xffffff, .9); key.position.set(2.5, 4, 7); scene.add(key);
    const rim = new THREE.PointLight(0xffffff, 8, 14); rim.position.set(-3, 3, -2.5); scene.add(rim);
    this.camera = new THREE.PerspectiveCamera(28, 1, .1, 100);

    this.jar = new THREE.Group(); scene.add(this.jar);
    this.mats = {
      body: lowEnd
        ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .2, roughness: .05, clearcoat: 1, depthWrite: false })
        : new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: .12, roughness: .05, ior: 1.45, clearcoat: 1, clearcoatRoughness: .05, transparent: true }),
      cap: new THREE.MeshPhysicalMaterial({ color: 0xf3f5f7, roughness: .42, metalness: 0, clearcoat: .25, bumpMap: ribTexture(), bumpScale: 1.6,
        transmission: lowEnd ? 0 : .45, thickness: .4, transparent: true, opacity: lowEnd ? .94 : 1 }),
      capTop: new THREE.MeshPhysicalMaterial({ color: 0xf6f7f9, roughness: .3, transmission: lowEnd ? 0 : .55, thickness: .2, transparent: true, opacity: lowEnd ? .9 : 1 }),
      fill: new THREE.MeshStandardMaterial({ roughness: 1 }),
      label: new THREE.MeshStandardMaterial({ roughness: .6, metalness: 0, envMapIntensity: .35, emissive: 0xffffff, emissiveIntensity: .42, side: THREE.FrontSide }),
    };

    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(40,20,10,.42)', 'rgba(40,20,10,0)'), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = -.01; scene.add(sh); this.shadow = sh;

    const N = reduced ? 0 : (lowEnd ? 70 : 140), pos = new Float32Array(N * 3); this.seeds = [];
    for (let i = 0; i < N; i++) { const a = Math.random() * 6.28, r = 1.9 + Math.random() * 1.6; pos.set([Math.cos(a) * r, Math.random() * 3.6, Math.sin(a) * r - .5], i * 3); this.seeds.push(.15 + Math.random() * .35); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dustMat = new THREE.PointsMaterial({ size: .07, map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: .7 });
    this.dust = new THREE.Points(pg, this.dustMat); scene.add(this.dust);

    this.rotY = -.35; this.vel = 0; this.tilt = 0; this.tiltTarget = 0; this.spin = null;
    this.camD = 10; this.camDT = 10; this.camY = 1.4; this.camYT = 1.4;
    this.visible = true; this.t0 = performance.now();
    this.bind(); this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }); this.io.observe(host);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }

  buildJar(shapeKey) {
    if (this.shapeKey === shapeKey) return;
    this.shapeKey = shapeKey;
    for (const m of [...this.jar.children]) { m.geometry.dispose(); this.jar.remove(m); }
    const S = this.S = SHAPES[shapeKey], B = band(S);
    this.jar.add(new THREE.Mesh(new THREE.LatheGeometry(profile(S), 112), this.mats.body));
    const fillH = Math.min(S.h - .3, B.y0 + B.h + .14);
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(S.r * .935, S.r * .92, fillH - .05, 72), this.mats.fill);
    fill.position.y = .05 + (fillH - .05) / 2; this.jar.add(fill);
    // cap: ribbed side, slightly domed translucent top, lip ring
    const capY = S.h - .14 + S.capH / 2;
    const side = new THREE.Mesh(new THREE.CylinderGeometry(S.capR, S.capR, S.capH, 128, 1, true), this.mats.cap);
    side.position.y = capY; this.jar.add(side);
    const top = new THREE.Mesh(new THREE.CircleGeometry(S.capR - .01, 96), this.mats.capTop);
    top.rotation.x = -Math.PI / 2; top.position.y = capY + S.capH / 2 - .005; this.jar.add(top);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(S.capR - .025, .03, 10, 128), this.mats.capTop);
    lip.rotation.x = Math.PI / 2; lip.position.y = capY + S.capH / 2 - .02; this.jar.add(lip);
    const skirt = new THREE.Mesh(new THREE.TorusGeometry(S.capR - .01, .022, 8, 128), this.mats.cap);
    skirt.rotation.x = Math.PI / 2; skirt.position.y = capY - S.capH / 2 + .02; this.jar.add(skirt);
    this.labelMesh = null;
    // camera framing for this jar
    this.camYT = (S.h + S.capH) / 2; this.fitT = { h: S.h + S.capH, w: S.capR > S.r ? S.capR * 2 : S.r * 2 };
    this.resize();
  }

  setLabel({ tex, arc, frontX }) {
    const S = this.S, B = band(S);
    if (this.labelMesh) { this.labelMesh.geometry.dispose(); this.jar.remove(this.labelMesh); }
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.mats.label.map = tex; this.mats.label.emissiveMap = tex; this.mats.label.needsUpdate = true;
    const geo = new THREE.CylinderGeometry(B.r, B.r, B.h, 160, 1, true, -frontX * arc, arc);
    this.labelMesh = new THREE.Mesh(geo, this.mats.label);
    this.labelMesh.position.y = B.y0 + B.h / 2; this.jar.add(this.labelMesh);
  }

  bind() {
    const el = this.renderer.domElement;
    el.style.touchAction = 'pan-y';
    let down = false, lx = 0, ly = 0, horiz = null;
    el.addEventListener('pointerdown', e => { if (!this.interactive) return; down = true; lx = e.clientX; ly = e.clientY; horiz = null; this.idleAt = performance.now(); });
    this.onUp = () => { down = false; }; addEventListener('pointerup', this.onUp);
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect(); this.tiltTarget = ((e.clientY - r.top) / r.height - .5) * .25;
      if (!down) return;
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (horiz === null && Math.abs(dx) + Math.abs(dy) > 6) horiz = Math.abs(dx) > Math.abs(dy);
      if (horiz) { this.vel = dx * .012; this.rotY += this.vel; this.host.classList.add('touched'); }
      lx = e.clientX; ly = e.clientY; this.idleAt = performance.now();
    });
    el.addEventListener('pointerleave', () => { this.tiltTarget = 0; });
  }

  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    const f = this.fitT || { h: 3, w: 2.1 }, t = Math.tan((this.camera.fov / 2) * Math.PI / 180);
    this.camDT = Math.max((f.h * 1.22) / 2 / t, (f.w * 1.5) / 2 / (t * this.camera.aspect)) + 1;
    if (!this.framed) { this.camD = this.camDT; this.camY = this.camYT; }
  }

  async setProduct(p, size, animate = true) {
    size = size || p.sizes[0];
    const shapeKey = jarShape(size.g || 250);
    const label = await composeLabel(p, size, shapeKey, this.maxTex);
    const apply = () => {
      this.buildJar(shapeKey); this.setLabel(label);
      if (this.mats.fill.map) this.mats.fill.map.dispose();
      this.mats.fill.map = fillTexture(p); this.mats.fill.roughness = p.solid ? .35 : 1; this.mats.fill.needsUpdate = true;
      this.dustMat.color.set(p.accent);
      this.framed = true;
    };
    if (animate && this.labelMesh && !reduced) this.spin = { t: 0, from: this.rotY, apply, done: false };
    else { apply(); this.camD = this.camDT; this.camY = this.camYT; }
    if (this.onReady) { this.onReady(); this.onReady = null; }
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden) return;
    const t = (now - this.t0) / 1000;
    if (this.spin) {
      const s = this.spin; s.t = Math.min(1, s.t + .022);
      const e = s.t < .5 ? 4 * s.t ** 3 : 1 - (-2 * s.t + 2) ** 3 / 2;
      this.rotY = s.from + e * Math.PI * 2;
      if (s.t > .5 && !s.done) { s.apply(); s.done = true; }
      this.jar.scale.setScalar(1 - Math.sin(s.t * Math.PI) * .08);
      if (s.t >= 1) this.spin = null;
    } else {
      const idle = !this.idleAt || now - this.idleAt > 2500;
      this.vel *= .93; this.rotY += this.vel;
      if (idle && !reduced) this.rotY += .0035;
    }
    // ease camera to the current jar's framing
    this.camD += (this.camDT - this.camD) * .08; this.camY += (this.camYT - this.camY) * .08;
    this.camera.position.set(0, this.camY + .7, this.camD); this.camera.lookAt(0, this.camY, 0);
    this.tilt += (this.tiltTarget - this.tilt) * .06;
    this.jar.rotation.set(this.tilt, this.rotY, 0);
    this.jar.position.y = reduced ? 0 : Math.sin(t * 1.3) * .05;
    this.shadow.scale.setScalar((this.S ? this.S.r / 1.1 : 1) * (1 - this.jar.position.y * .6));
    const a = this.dust.geometry.attributes.position;
    if (a.count) { for (let i = 0; i < a.count; i++) { let y = a.getY(i) + this.seeds[i] * .006; if (y > 3.8) y = 0; a.setY(i, y); } a.needsUpdate = true; this.dust.rotation.y = t * .05; }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf); this.ro.disconnect(); this.io.disconnect(); removeEventListener('pointerup', this.onUp);
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
