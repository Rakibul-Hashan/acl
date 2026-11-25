/* ============================================================
   ACL storefront — router, views, cart, checkout.
   No build step: plain ES modules. 3D lives in jar3d.js.
   ============================================================ */
import { CONFIG, asset, HAS_WA, SITE, CALL } from './config.js';
import { PRODUCTS, BUNDLES, FAQ, REVIEWS, bySlug, sizeOf, bundlePricing, minPrice, validateCatalog } from './data.js';
import { DISTRICTS, docs } from './pages.js';
import { I } from './icons.js';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BN = '০১২৩৪৫৬৭৮৯';
const bn = v => String(v).replace(/\d/g, d => BN[d]);
const toEn = s => String(s).replace(/[০-৯]/g, d => BN.indexOf(d));
const tk = n => '৳' + bn(Math.round(n).toLocaleString('en-IN'));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const waLink = text => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
const labelImg = (p, s) => asset(`assets/labels/${(s && s.label) || p.label}.webp`);
const thumbOf = (p, s) => (p.cardImg ? asset(p.cardImg) : labelImg(p, s));
const patOf = p => (p.slug === 'seed-mix' ? 'seed-mix' : p.label);
const assetURL = path => { const a = asset(path); return a.startsWith('data:') ? a : new URL(a, document.baseURI).href; };
const vars = p => `--accent:${p.accent};--soft:${p.soft};--pat:url('${assetURL(`assets/patterns/${patOf(p)}.webp`)}')`;
const nameOf = p => p.bnShort || p.bn;
const debounce = (fn, ms) => { let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; d.cancel = () => clearTimeout(t); return d; };
// compact, URL-safe encoding so an order can travel inside a share link
const b64e = obj => { const b = new TextEncoder().encode(JSON.stringify(obj)); let s = ''; b.forEach(c => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64d = str => { try { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); return JSON.parse(new TextDecoder().decode(Uint8Array.from(s, c => c.charCodeAt(0)))); } catch { return null; } };
const orders = {
  all: () => store.get('acl_orders', []),
  get: id => orders.all().find(o => o.id === id),
  save(o) { const a = orders.all().filter(x => x.id !== o.id); a.push(o); store.set('acl_orders', a.slice(-20)); },
  patch(id, ch) { const o = orders.get(id); if (o) { Object.assign(o, ch); orders.save(o); } return o; },
};
const perGram = (s) => `প্রতি ১০০ গ্রাম ${tk((s.price / s.g) * 100)}`;
function track(ev, data = {}) { try { window.fbq?.('track', ev, data); window.gtag?.('event', ev, data); } catch { /* noop */ } }



/* ---------- time-aware bits ---------- */
function dhakaHour() {
  return +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Dhaka' }).format(new Date());
}
function clock(h) { const p = h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : 'রাত'; return `${p} ${bn(h % 12 || 12)}টা`; }
function onlineState() {
  const h = dhakaHour(), on = h >= CONFIG.hours.open && h < CONFIG.hours.close;
  return { on, text: on ? 'এখন WhatsApp এ উত্তর দিচ্ছি' : `এখন অফলাইন · ${clock(CONFIG.hours.open)}য় উত্তর দেব, অর্ডার এখনই দিতে পারেন` };
}
function etaRange(area) {
  const [a, b] = area === 'in' ? CONFIG.delivery.daysInside : CONFIG.delivery.daysOutside;
  const f = d => new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' }).format(new Date(Date.now() + d * 864e5));
  return `${f(a)} – ${f(b)}`;
}

/* ---------- pricing ---------- */
function lineInfo(l) {
  if (l.type === 'b') {
    const b = BUNDLES.find(x => x.id === l.id), pr = bundlePricing(b);
    return { name: b.bn, sub: pr.parts.map(x => nameOf(x.p)).join(' + '), img: thumbOf(pr.parts[0].p, pr.parts[0].s), unit: pr.price, full: pr.full };
  }
  const p = bySlug[l.slug], s = sizeOf(p, l.size);
  return { name: nameOf(p), sub: s.bn, img: thumbOf(p, s), unit: s.price, full: s.price };
}
function totals(lines, area = 'in') {
  let sub = 0, full = 0;
  for (const l of lines) { const i = lineInfo(l); sub += i.unit * l.qty; full += i.full * l.qty; }
  const d = CONFIG.delivery;
  const del = sub === 0 ? 0 : (d.freeAbove && sub >= d.freeAbove ? 0 : (area === 'in' ? d.insideDhaka : d.outsideDhaka));
  return { sub, save: full - sub, del, total: sub + del };
}

/* ---------- cart ---------- */
let cart = store.get('acl_cart', []).filter(l => (l.type === 'b' ? BUNDLES.some(b => b.id === l.id) : bySlug[l.slug]));
const keyOf = l => (l.type === 'b' ? 'b:' + l.id : `p:${l.slug}:${l.size}`);
let activeCheckout = null;

function saveCart() {
  store.set('acl_cart', cart);
  const n = cart.reduce((a, l) => a + l.qty, 0);
  $('#cartCount').textContent = n ? bn(n) : '';
  if ($('#drawer').classList.contains('open')) renderDrawer();
  if (activeCheckout && activeCheckout.isCart) activeCheckout.render();
}
function addToCart(line, fromImg) {
  const k = keyOf(line), ex = cart.find(l => keyOf(l) === k);
  if (ex) ex.qty += line.qty; else cart.push({ ...line });
  saveCart(); fly(fromImg);
  const i = lineInfo(line);
  toast(`কার্টে যোগ হয়েছে: ${i.name}`);
  if (line.type === 'b') burst(fromImg);
  track('AddToCart', { value: i.unit * line.qty, currency: 'BDT' });
}
function bump() { const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
function fly(img) {
  if (!img || reduced || !img.animate) return bump();
  const r = img.getBoundingClientRect(), t = $('#cartBtn').getBoundingClientRect();
  const f = img.cloneNode(); f.className = 'flyer'; f.removeAttribute('loading');
  Object.assign(f.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.append(f);
  const dx = t.left + t.width / 2 - r.left - r.width / 2, dy = t.top + t.height / 2 - r.top - r.height / 2;
  f.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.1)`, opacity: .5 }],
    { duration: 700, easing: 'cubic-bezier(.5,-.25,.7,1)' }).onfinish = () => { f.remove(); bump(); };
}
function burst(el, big = false) {
  if (reduced || typeof window.confetti !== 'function') return;
  const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  try {
    window.confetti({ particleCount: big ? 160 : 90, spread: big ? 100 : 70, startVelocity: big ? 42 : 32, scalar: .9, ticks: 180, zIndex: 95,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
      colors: ['#e2312a', '#f2b33d', '#1fa855', '#e07614', '#ffffff'] });
  } catch { /* decorative only */ }
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }

/* ---------- shared fragments ---------- */
function lineRow(l, i, editable) {
  const x = lineInfo(l);
  const ctl = editable
    ? `<div class="row" style="justify-content:flex-start;gap:12px;margin-top:4px"><span class="qty"><button type="button" data-q="-1" data-i="${i}" aria-label="কমান">${I.minus}</button><output>${bn(l.qty)}</output><button type="button" data-q="1" data-i="${i}" aria-label="বাড়ান">${I.plus}</button></span>${editable === 'rm' ? `<button type="button" class="x" data-rm="${i}">বাদ দিন</button>` : ''}</div>`
    : `<div class="sub">পরিমাণ: ${bn(l.qty)}</div>`;
  return `<li class="line"><img src="${x.img}" alt=""><div><div class="nm">${esc(x.name)}</div><div class="sub">${esc(x.sub)} · ${tk(x.unit)}</div>${ctl}</div><b class="price">${tk(x.unit * l.qty)}</b></li>`;
}
function meter(sub) {
  const f = CONFIG.delivery.freeAbove; if (!f || !sub) return '';
  const pct = Math.min(100, (sub / f) * 100);
  const msg = sub >= f ? '<b style="color:var(--wa)">আপনি ফ্রি ডেলিভারি পাচ্ছেন!</b>' : `আর ${tk(f - sub)} এর পণ্য নিলে ডেলিভারি ফ্রি। প্রতিবেশীর সাথে মিলে অর্ডার করতে পারেন।`;
  return `<div class="meter">${msg}<i><b data-w="${pct}"></b></i></div>`;
}
function animateMeters(root) { requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', root).forEach(b => { b.style.width = b.dataset.w + '%'; }))); }
function productCard(p) {
  const s = p.sizes[0], from = minPrice(p);
  return `<article class="card rv" data-cat="${p.cat}" style="${vars(p)}">
    <a class="card-img" href="#${p.slug}" aria-label="${esc(p.bn)} বিস্তারিত"><img src="${thumbOf(p, s)}" alt="${esc(p.bn)} — ${esc(p.en)}" loading="lazy" width="900" height="1128"></a>
    <div class="card-body"><h3><a href="#${p.slug}">${esc(nameOf(p))}</a></h3><div class="meta">${esc(p.en)} · ${p.sizes.map(x => x.bn).join(' / ')}</div>
      <div class="card-foot"><span class="price">${p.sizes.length > 1 ? '<small class="meta">শুরু </small>' : ''}${tk(from)}</span><button class="btn btn-red btn-sm" data-add="${p.slug}" aria-label="${esc(nameOf(p))} কার্টে নিন">${I.cart}<span>কার্টে নিন</span></button></div></div>
  </article>`;
}
/* gift-wrapped combo card: fanned labels, satin ribbon + bow, hanging tag, confetti */
const CONFETTI = [[6, 18, 0, -20], [14, 70, 1, 35], [24, 34, 2, 60], [33, 82, 3, -40], [44, 12, 1, 15], [57, 88, 0, 70],
  [66, 22, 2, -55], [75, 64, 3, 25], [84, 30, 0, -10], [92, 78, 1, 50], [50, 50, 2, 80], [18, 50, 3, -70], [88, 52, 2, 10], [38, 60, 0, 45]];
const CONF_COLORS = ['#e2312a', '#f2b33d', '#1fa855', '#e07614'];
const bowSVG = id => `<svg class="bow" viewBox="0 0 120 84" aria-hidden="true"><defs>
  <linearGradient id="rb-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b60"/><stop offset=".5" stop-color="#e2312a"/><stop offset="1" stop-color="#a3170f"/></linearGradient></defs>
  <path d="M55 42 L38 80 L46 75 L50 84 L61 46Z" fill="url(#rb-${id})"/><path d="M65 42 L82 80 L74 75 L70 84 L59 46Z" fill="url(#rb-${id})"/>
  <path d="M58 39 C40 6 4 6 9 31 C13 50 41 52 58 43Z" fill="url(#rb-${id})"/><path d="M53 40 C40 22 19 19 19 30 C21 39 38 43 53 41Z" fill="#000" opacity=".2"/>
  <path d="M62 39 C80 6 116 6 111 31 C107 50 79 52 62 43Z" fill="url(#rb-${id})"/><path d="M67 40 C80 22 101 19 101 30 C99 39 82 43 67 41Z" fill="#000" opacity=".2"/>
  <path d="M20 22 C28 14 40 16 48 26" stroke="#fff" stroke-opacity=".45" stroke-width="3" fill="none" stroke-linecap="round"/>
  <rect x="51" y="31" width="18" height="18" rx="6" fill="#c0241e"/><rect x="54" y="33" width="9" height="4" rx="2" fill="#fff" opacity=".35"/></svg>`;
function comboCard(b) {
  const pr = bundlePricing(b), pct = Math.round((pr.save / pr.full) * 100);
  return `<article class="combo rv" style="--n:${pr.parts.length}">
    <div class="gift">
      <div class="confetti" aria-hidden="true">${CONFETTI.map(([x, y, c, r], i) => `<i class="cf s${i % 3}" style="left:${x}%;top:${y}%;--r:${r}deg;--d:${(i % 5) * .4}s;background:${CONF_COLORS[c]}"></i>`).join('')}</div>
      <div class="stack">${pr.parts.map((x, i) => `<img src="${thumbOf(x.p, x.s)}" alt="${esc(x.p.bn)}" loading="lazy" style="--i:${i - (pr.parts.length - 1) / 2}">`).join('')}</div>
      <span class="ribbon" aria-hidden="true"></span>
      ${bowSVG(b.id)}
      <div class="gtag"><b>${tk(pr.save)}</b><span>সাশ্রয়</span></div>
    </div>
    <div class="combo-body">
      <h3>${esc(b.bn)}</h3><p class="meta">${esc(b.note)}</p>
      <ul class="incl">${pr.parts.map(x => `<li>${I.check}<span>${esc(nameOf(x.p))}</span><span class="meta">${x.s.bn}</span></li>`).join('')}</ul>
      <div class="pr"><b>${tk(pr.price)}</b><s>${tk(pr.full)}</s><span class="off">${bn(pct)}% কম</span></div>
      <button class="btn btn-red btn-block" data-addb="${b.id}">${I.cart}<span>কম্বো কার্টে নিন</span></button>
    </div></article>`;
}
const STEPS = [
  ['basket', 'নিজেরা দেখে কেনা', 'কাঁচামাল আমরা নিজেরা বাজার থেকে দেখে-বেছে কিনে আনি।'],
  ['sun', 'ভালো করে শুকানো', 'ভালোভাবে শুকিয়ে নিই, যাতে গুঁড়া জমাট না বাঁধে।'],
  ['mill', 'নিজেরা ভাঙানো', 'মসলা ছোট ছোট ব্যাচে ভাঙাই; বীজ বেছে পরিষ্কার করি।'],
  ['jar', 'এয়ারটাইট জারে প্যাক', 'জারের লেবেলে ব্যাচ নম্বর, উৎপাদন ও মেয়াদের তারিখ থাকে।'],
];
const stepsHTML = () => `<div class="steps" id="steps"><span class="bar"></span>${STEPS.map(([ic, h, t], n) => `<div class="step"><div class="ic">${I[ic]}<span class="n">${bn(n + 1)}</span></div><div><h3>${h}</h3><p>${t}</p></div></div>`).join('')}</div>`;
const faqHTML = list => `<div class="faq">${list.map(([q, a]) => `<details class="rv"><summary><span>${esc(q)}</span>${I.chevron}</summary><p>${esc(a)}</p></details>`).join('')}</div>`;
function reviewsHTML(slug) {
  const list = REVIEWS.filter(r => !slug || !r.product || r.product === slug);
  if (!list.length) return '';
  return `<section class="band"><div class="wrap"><h2 class="rv">ক্রেতারা যা বলছেন</h2>
    <div class="reviews">${list.map(r => `<figure class="review rv">${I.quote}<blockquote>${esc(r.text)}</blockquote>
      <figcaption><b>${esc(r.name)}</b>${r.area ? `<span class="meta">${esc(r.area)}</span>` : ''}${r.product && bySlug[r.product] ? `<a class="meta" href="#${r.product}">${esc(nameOf(bySlug[r.product]))}</a>` : ''}</figcaption></figure>`).join('')}</div></div></section>`;
}
const waBand = (msg, title = 'অর্ডার দিতে ঝামেলা লাগছে?', sub = 'WhatsApp এ শুধু পণ্যের নাম আর ঠিকানা লিখে পাঠান, বাকিটা আমরা দেখব।') =>
  `<div class="waband rv"><div><h2 style="color:#fff">${title}</h2><p>${sub}</p></div><a class="btn" href="${waLink(msg)}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp এ লিখুন</span></a></div>`;
const trustChips = () => `<ul class="chips">
  <li>${I.cash} ক্যাশ অন ডেলিভারি</li><li>${I.eye} দেখে নিয়ে টাকা</li><li>${I.truck} সারা দেশে ডেলিভারি</li>
  ${CONFIG.delivery.freeAbove ? `<li>${I.tag} ${tk(CONFIG.delivery.freeAbove)}+ এ ফ্রি ডেলিভারি</li>` : ''}</ul>`;

/* ---------- 3D ---------- */
let jarPromise = null;
const loadJar = () => (jarPromise ||= import('./jar3d.js'));
let stage = null, viewToken = 0;
async function mountStage(el, p, size) {
  const tok = viewToken;
  try {
    const m = await loadJar();
    if (!m.webglOK() || tok !== viewToken) return null;
    const s = new m.JarStage(el, { onReady: () => el.classList.add('is-3d') });
    await s.setProduct(p, size, false);
    if (tok !== viewToken) { s.dispose(); return null; }
    stage = s; return s;
  } catch (e) { console.warn('3D unavailable, showing flat label', e); return null; }
}

/* ---------- views ---------- */
const view = $('#view');
let current = '', timers = [], observers = [], viewAC = new AbortController();
function cleanup() {
  viewToken++;
  viewAC.abort(); viewAC = new AbortController();
  if (stage) { stage.dispose(); stage = null; }
  timers.forEach(clearInterval); timers = [];
  observers.forEach(o => o.disconnect()); observers = [];
  activeCheckout = null;
  document.body.classList.remove('has-sticky'); $('#sticky').classList.remove('show');
}
function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv, .steps', view).forEach(el => io.observe(el)); observers.push(io);
}
/* schema.org structured data for search engines */
function setLD(data) {
  let el = document.getElementById('ld');
  if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = 'ld'; document.head.append(el); }
  el.textContent = JSON.stringify({ '@context': 'https://schema.org', ...data });
}
const ORG = () => ({ '@type': 'Organization', '@id': SITE() + '/#org', name: 'ACL', legalName: CONFIG.brand.company, url: SITE() + '/',
  logo: SITE() + '/assets/logo.webp', slogan: CONFIG.brand.tagline, ...(CALL() ? { contactPoint: { '@type': 'ContactPoint', telephone: CALL(), contactType: 'customer service', areaServed: 'BD', availableLanguage: ['bn'] } } : {}) });
function productLD(p) {
  const url = `${SITE()}/${p.slug}.html`;
  return { '@graph': [ORG(), {
    '@type': 'Product', '@id': url + '#product', name: `${p.bn} (${p.en})`, description: p.short, sku: p.slug, brand: { '@type': 'Brand', name: 'ACL' },
    image: [`${SITE()}/assets/og/${p.slug}.jpg`], category: p.cat === 'spice' ? 'মসলা' : p.cat === 'ghee' ? 'ঘি' : 'বীজ',
    offers: p.sizes.map(s => ({ '@type': 'Offer', sku: `${p.slug}-${s.id}`, name: s.bn, price: s.price, priceCurrency: 'BDT', availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition', url, seller: { '@id': SITE() + '/#org' } })),
  }, { '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'হোম', item: SITE() + '/' },
    { '@type': 'ListItem', position: 2, name: 'সব পণ্য', item: SITE() + '/#products' },
    { '@type': 'ListItem', position: 3, name: p.bn, item: url }] }] };
}

function setFab(msg) { const h = waLink(msg); $('#fab').href = h; $('#hdrWa').href = h; }
function goTo(id) { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }

function renderHome() {
  document.title = 'ACL মসলা ও বীজ — নিজেরা শুকিয়ে ভাঙানো';
  setLD({ '@graph': [ORG(), { '@type': 'WebSite', name: 'ACL', url: SITE() + '/', inLanguage: 'bn' },
    { '@type': 'ItemList', itemListElement: PRODUCTS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE()}/${p.slug}.html`, name: p.bn })) }] });
  setFab('আসসালামু আলাইকুম, আমি ACL এর পণ্য অর্ডার করতে চাই।');
  const p0 = bySlug.chilli, on = onlineState();
  const maxOff = Math.round(Math.max(...BUNDLES.map(b => b.off)) * 100);
  const tick = ['ক্যাশ অন ডেলিভারি', 'পণ্য দেখে টাকা দিন', 'নিজেরা শুকিয়ে ভাঙানো মসলা', `কম্বোতে ${bn(maxOff)}% পর্যন্ত সাশ্রয়`, 'একটা জারও অর্ডার করা যায়', 'সারা বাংলাদেশে ডেলিভারি'];
  view.innerHTML = `
  <section class="hero" id="hero" style="${vars(p0)}">
    <div class="wrap"><div class="hero-grid">
    <div class="pattern"></div>
      <div class="hero-copy">
        <h1>নিজেরা শুকিয়ে, নিজেরা ভাঙানো খাঁটি মসলা আর বাছাই করা বীজ</h1>
        <p class="lead">কাঁচামাল আমরা নিজেরা কিনে আনি, শুকাই, ভাঙাই, তারপর এয়ারটাইট জারে ভরি। টাকা দেবেন পণ্য হাতে পেয়ে।</p>
        ${trustChips()}
        <div class="ctas"><button class="btn btn-red" data-go="sec-products">${I.basket}<span>পণ্য দেখুন</span></button><a class="btn btn-wa" href="${waLink('আসসালামু আলাইকুম, আমি অর্ডার করতে চাই।')}" target="_blank" rel="noopener">${I.wa}<span>WhatsApp<span class="d-lg"> এ অর্ডার</span></span></a></div>
        ${HAS_WA ? `<div class="live"><span class="dot ${on.on ? 'on' : ''}"></span>${on.text}</div>` : ''}
      </div>
      <div class="hero-stagecol">
        <div class="stage" id="heroStage"><img class="fallback" id="heroFb" src="${labelImg(p0)}" alt="${esc(p0.bn)} জার"><span class="hint">${I.rotate} টেনে ঘুরিয়ে দেখুন</span></div>
        <div class="now"><div><b id="nowName"></b><small id="nowMeta"></small></div><a class="btn btn-ghost btn-sm" id="nowLink" href="#chilli"><span>বিস্তারিত</span>${I.arrow}</a></div>
        <div class="switch" role="group" aria-label="জারে পণ্য বদলান">${PRODUCTS.map(p => `<button type="button" data-hero="${p.slug}" style="--c:${p.accent}" aria-pressed="${p === p0}"><i></i>${esc(nameOf(p))}</button>`).join('')}</div>
      </div>
    </div></div>
  </section>
  <div class="ticker" aria-hidden="true"><div>${[...tick, ...tick].map(t => `<span>${I.leaf}${t}</span>`).join('')}</div></div>

  <section class="band" id="sec-offer"><div class="wrap">
    <h2 class="rv">বাজেট টাইট? আমরা বুঝি।</h2>
    <p class="lead rv">জিনিসপত্রের দাম বেড়েছে, অনলাইনে আগে টাকা দিতে ভয়ও লাগে। তাই আমাদের নিয়ম সহজ।</p>
    <div class="grid4">
      <div class="tile rv" style="--soft:#fde4df;--accent:#e2312a"><div class="ic">${I.eye}</div><h3>আগে দেখুন, পরে টাকা</h3><p>কোনো অগ্রিম নেই। পণ্য হাতে পেয়ে, দেখে, তারপর টাকা দিন।</p></div>
      <div class="tile rv" style="--soft:#f8f0cc;--accent:#c46f0c"><div class="ic">${I.jar}</div><h3>একটা জারও চলবে</h3><p>কোনো মিনিমাম অর্ডার নেই। যতটুকু দরকার, ততটুকুই নিন।</p></div>
      <div class="tile rv" style="--soft:#e4ecdc;--accent:#4d7b3c"><div class="ic">${I.tag}</div><h3>কম্বোতে ${bn(maxOff)}% পর্যন্ত সাশ্রয়</h3><p>একসাথে নিলে আলাদা কেনার চেয়ে কম দাম—হিসাব কার্টেই দেখবেন।</p></div>
      <div class="tile rv" style="--soft:#f4e9dc;--accent:#9b6537"><div class="ic">${I.users}</div><h3>মিলে অর্ডার করুন</h3><p>প্রতিবেশী বা অফিসের সাথে এক ঠিকানায় অর্ডার দিন—ডেলিভারি চার্জ ভাগ হবে${CONFIG.delivery.freeAbove ? `, ${tk(CONFIG.delivery.freeAbove)} হলে ফ্রি` : ''}।</p></div>
    </div>
  </div></section>

  <section class="band tinted" id="sec-products" style="--soft:#f6ecdc"><div class="wrap">
    <h2 class="rv">আমাদের পণ্য</h2>
    <div class="tabs" role="group" aria-label="ক্যাটাগরি"><button data-f="all" aria-pressed="true">সব</button><button data-f="spice" aria-pressed="false">মসলা গুঁড়া</button><button data-f="seed" aria-pressed="false">বীজ</button><button data-f="ghee" aria-pressed="false">ঘি</button></div>
    <div class="products" id="grid">${PRODUCTS.map(productCard).join('')}</div>
  </div></section>

  <section class="band" id="sec-combos"><div class="wrap">
    <h2 class="rv">কম্বো অফার</h2>
    <p class="lead rv">যেগুলো একসাথে বেশি লাগে, সেগুলো একসাথে কম দামে।</p>
    <div class="combos">${BUNDLES.map(comboCard).join('')}</div>
  </div></section>

  <section class="band tinted" id="sec-process" style="--soft:#fde4df"><div class="wrap center">
    <h2 class="rv">যেভাবে তৈরি করি</h2>
    <p class="lead rv">কারখানার বড় চালান নয়—কেনা থেকে প্যাকিং পর্যন্ত পুরোটা আমাদের নিজেদের হাতে।</p>
    ${stepsHTML()}
  </div></section>

  ${reviewsHTML()}
  <section class="band" id="sec-faq"><div class="wrap">
    <h2 class="rv center">প্রশ্ন-উত্তর</h2>
    ${faqHTML(FAQ)}
    <div style="margin-top:48px">${waBand('আসসালামু আলাইকুম, আমি অর্ডার করতে চাই।')}</div>
  </div></section>`;

  // hero product switcher
  let idx = 0, userPicked = false;
  // scroll only the chip row sideways; never move the page
  const centerChip = slug => {
    const row = $('#hero .switch'), btn = row && row.querySelector(`[data-hero="${slug}"]`);
    if (!btn) return;
    row.scrollTo({ left: btn.offsetLeft - row.offsetLeft - (row.clientWidth - btn.offsetWidth) / 2, behavior: reduced ? 'auto' : 'smooth' });
  };
  const setHero = (p, anim = true) => {
    const hero = $('#hero'); if (!hero) return;
    hero.setAttribute('style', vars(p));
    $('#heroFb').src = labelImg(p);
    $('#nowName').textContent = nameOf(p);
    $('#nowMeta').textContent = `${p.en} · ${p.sizes.map(x => x.bn).join(' / ')} · ${tk(minPrice(p))} থেকে`;
    $('#nowLink').href = '#' + p.slug;
    $$('[data-hero]').forEach(b => b.setAttribute('aria-pressed', b.dataset.hero === p.slug));
    stage?.setProduct(p, p.sizes[0], anim);
  };
  setHero(p0, false);
  mountStage($('#heroStage'), p0).then(s => { if (s && idx) s.setProduct(PRODUCTS[idx], PRODUCTS[idx].sizes[0], false); });
  view.addEventListener('click', e => {
    const b = e.target.closest('[data-hero]'); if (!b) return;
    userPicked = true; idx = PRODUCTS.findIndex(p => p.slug === b.dataset.hero); setHero(PRODUCTS[idx]);
  }, { signal: viewAC.signal });
  $('#heroStage').addEventListener('pointerdown', () => { userPicked = true; });
  if (!reduced) timers.push(setInterval(() => {
    if (userPicked || document.hidden || !stage) return;
    if (!stage.visible) return; // hero scrolled away: don't cycle in the background
    idx = (idx + 1) % PRODUCTS.length; setHero(PRODUCTS[idx]);
    centerChip(PRODUCTS[idx].slug);
  }, 6000));

  if (window.gsap && !reduced) window.gsap.from('.hero-copy > *', { y: 22, opacity: 0, duration: .7, stagger: .08, ease: 'power2.out' });
}

function renderPDP(p) {
  const st = { size: p.sizes[0].id, qty: 1, addons: new Set() };
  document.title = `${p.bn} — ACL`;
  setLD(productLD(p));
  setFab(`আসসালামু আলাইকুম, আমি ${p.bn} সম্পর্কে জানতে চাই।`);
  track('ViewContent', { content_ids: [p.slug], content_type: 'product', value: p.sizes[0].price, currency: 'BDT' });
  const size = () => sizeOf(p, st.size);
  const combos = BUNDLES.filter(b => b.items.some(([s]) => s === p.slug));
  const addonPool = PRODUCTS.filter(x => x.cat === p.cat && x !== p).slice(0, 4);
  const gallery = [labelImg(p), ...p.photos.map(asset)];

  view.innerHTML = `
  <section class="pdp" style="${vars(p)}">
    <div class="wrap"><div class="pdp-grid">
    <div class="pattern"></div>
      <div class="viewer" id="viewer">
        <div class="stage" id="pdpStage"><img class="fallback" id="pdpFb" src="${labelImg(p)}" alt="${esc(p.bn)} জার"><span class="hint">${I.rotate} টেনে ঘুরিয়ে দেখুন</span></div>
        <div class="flat"><img id="flatImg" alt="${esc(p.bn)} লেবেল"></div>
        <div class="thumbs" role="group" aria-label="ভিউ বদলান"><button type="button" data-v="3d" aria-pressed="true">৩ডি</button>${gallery.map(g => `<button type="button" data-v="${g}" aria-pressed="false"><img src="${g}" alt="" loading="lazy"></button>`).join('')}</div>
      </div>
      <div>
        <nav class="crumb" aria-label="অবস্থান"><a href="#home">হোম</a> / <a href="#products">সব পণ্য</a> / ${esc(nameOf(p))}</nav>
        <h1>${esc(p.bn)}</h1>
        <div class="en">${esc(p.en)}</div>
        <p class="lead">${esc(p.pitch)}</p>
        <ul class="hl">${p.highlights.map(h => `<li>${I.check}${esc(h)}</li>`).join('')}</ul>
        <div class="buybox" id="buybox">
          ${p.sizes.length > 1 ? `<div><div class="legend" style="margin-bottom:8px">জারের সাইজ</div><div class="sizes">${p.sizes.map((s, i) => `<label><input type="radio" name="sz" value="${s.id}" ${i ? '' : 'checked'}><span>${s.bn}<b class="sp">${tk(s.price)}</b><small>${perGram(s)}</small></span></label>`).join('')}</div></div>` : ''}
          <div class="row"><div><div class="meta">মূল্য · <span id="szLabel">${size().bn}</span></div><div class="bigprice" id="bp">${tk(size().price)}</div></div>
            <div><div class="meta">পরিমাণ</div><span class="qty"><button type="button" data-pq="-1" aria-label="কমান">${I.minus}</button><output id="pq">${bn(1)}</output><button type="button" data-pq="1" aria-label="বাড়ান">${I.plus}</button></span></div></div>
          <button class="btn btn-red btn-block" data-go="order">${I.truck}<span>এখনই অর্ডার করুন<span class="d-lg"> · ক্যাশ অন ডেলিভারি</span></span></button>
          <div class="row" style="gap:10px"><button class="btn btn-ghost" style="flex:1" data-addcur>${I.cart}<span>কার্টে রাখুন</span></button><a class="btn btn-wa" style="flex:1" href="${waLink(`আসসালামু আলাইকুম, ${p.bn} সম্পর্কে জানতে চাই।`)}" target="_blank" rel="noopener">${I.wa}<span>প্রশ্ন করুন</span></a></div>
          <div class="eta">${I.truck}<span>আজ অর্ডার করলে আনুমানিক পৌঁছাবে—ঢাকায় <b class="nowrap">${etaRange('in')}</b>, ঢাকার বাইরে <b class="nowrap">${etaRange('out')}</b></span></div>
        </div>
      </div>
    </div></div>
  </section>

  <section class="band"><div class="wrap" style="${vars(p)}">
    <h2 class="rv">যেভাবে ব্যবহার করবেন</h2>
    <div class="uses">${p.uses.map(([h, t]) => `<div class="use rv"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div>
  </div></section>

  <section class="band tinted" style="${vars(p)}"><div class="wrap center">
    <h2 class="rv">${esc(nameOf(p))} যেভাবে তৈরি হয়</h2>
    <p class="lead rv">কেনা থেকে জারে ভরা পর্যন্ত পুরোটা আমাদের নিজেদের হাতে।</p>
    ${stepsHTML()}
  </div></section>

  <section class="band"><div class="wrap split">
    <div class="tile rv" style="${vars(p)}"><h3>জারে যা পাবেন</h3><ul class="checklist">
      <li>${I.check}${esc(p.bn)} — নিট ওজন ${p.sizes.map(s => s.bn).join(' অথবা ')}</li>
      <li>${I.check}শক্ত ঢাকনার এয়ারটাইট জার</li>
      <li>${I.check}লেবেলে ব্যাচ নম্বর, উৎপাদন ও মেয়াদের তারিখ</li>
      <li>${I.check}প্রস্তুতকারক: ${esc(CONFIG.brand.company)}</li></ul></div>
    <div class="tile rv" style="${vars(p)}"><h3>সংরক্ষণ</h3><ul class="checklist">${p.storage.map(s => `<li>${I.check}${esc(s)}</li>`).join('')}</ul></div>
  </div></section>

  <section class="band tinted" style="--soft:#f6ecdc"><div class="wrap">
    <h2 class="rv">${combos.length ? 'কম্বোতে নিলে আরও সাশ্রয়' : 'আরও সাশ্রয়ের কম্বো'}</h2>
    <div class="combos">${(combos.length ? combos : BUNDLES.slice(0, 2)).map(comboCard).join('')}</div>
  </div></section>

  ${reviewsHTML(p.slug)}
  <section class="band"><div class="wrap">
    <h2 class="rv center">প্রশ্ন-উত্তর</h2>
    ${faqHTML([...p.faq, ...FAQ.slice(0, 4)])}
  </div></section>

  <section class="band tinted" id="order" style="${vars(p)}"><div class="wrap">
    <h2 class="rv">অর্ডার করুন</h2>
    <p class="lead rv">শুধু নাম, নম্বর আর ঠিকানা দিন। টাকা দেবেন পণ্য হাতে পেয়ে।</p>
    <div id="coRoot"></div>
  </div></section>`;

  mountStage($('#pdpStage'), p, size());

  const co = mountCheckout($('#coRoot'), {
    getLines: () => [{ type: 'p', slug: p.slug, size: st.size, qty: st.qty }, ...[...st.addons].map(s => ({ type: 'p', slug: s, size: bySlug[s].sizes[0].id, qty: 1 }))],
    editable: i => (i === 0 ? 'q' : false),
    onQty: (i, d) => { if (i === 0) setQty(st.qty + d); },
    addons: addonPool, picked: st.addons,
    onAddon: (slug, on) => { on ? st.addons.add(slug) : st.addons.delete(slug); co.render(); },
    onDone: () => { st.addons.clear(); co.render(); },
  });

  const setPrice = () => {
    const el = $('#bp'), to = size().price * st.qty, from = +el.dataset.v || to; el.dataset.v = to;
    if (window.gsap && !reduced) { const o = { v: from }; window.gsap.to(o, { v: to, duration: .45, ease: 'power2.out', onUpdate: () => { el.textContent = tk(o.v); } }); }
    else el.textContent = tk(to);
    $('#szLabel').textContent = st.qty > 1 ? `${size().bn}, ${bn(st.qty)}টি` : size().bn;
    $('#stP') && ($('#stP').textContent = `${size().bn} · ${tk(to)}`);
  };
  const setQty = q => { st.qty = Math.max(1, Math.min(20, q)); $('#pq').textContent = bn(st.qty); setPrice(); co.render(); };
  $('#bp').dataset.v = size().price;

  view.addEventListener('change', e => {
    if (e.target.name !== 'sz') return;
    st.size = e.target.value; setPrice(); co.render();
    stage?.setProduct(p, size(), true); $('#pdpFb').src = labelImg(p, size());
  }, { signal: viewAC.signal });
  view.addEventListener('click', e => {
    const q = e.target.closest('[data-pq]'); if (q) setQty(st.qty + +q.dataset.pq);
    if (e.target.closest('[data-addcur]')) addToCart({ type: 'p', slug: p.slug, size: st.size, qty: st.qty }, $('#pdpFb'));
    const v = e.target.closest('[data-v]');
    if (v) {
      $$('[data-v]').forEach(b => b.setAttribute('aria-pressed', b === v));
      const vw = $('#viewer');
      if (v.dataset.v === '3d') vw.classList.remove('show-flat'); else { $('#flatImg').src = v.dataset.v; vw.classList.add('show-flat'); }
    }
  }, { signal: viewAC.signal });

  // sticky mobile order bar
  const sticky = $('#sticky');
  sticky.innerHTML = `<div class="nm"><b>${esc(nameOf(p))}</b><span id="stP" class="meta">${size().bn} · ${tk(size().price)}</span></div><button class="btn btn-red" data-go="order">${I.truck}<span>অর্ডার করুন</span></button>`;
  document.body.classList.add('has-sticky');
  const vis = { buy: true, order: false };
  const sio = new IntersectionObserver(es => {
    es.forEach(e => { vis[e.target.id === 'order' ? 'order' : 'buy'] = e.isIntersecting; });
    sticky.classList.toggle('show', !vis.buy && !vis.order);
  });
  sio.observe($('#buybox')); sio.observe($('#order')); observers.push(sio);
}

function renderCheckoutPage() {
  document.title = 'চেকআউট — ACL';
  setFab('আসসালামু আলাইকুম, অর্ডার করতে সাহায্য দরকার।');
  view.innerHTML = `<section class="band"><div class="wrap">
    <nav class="crumb"><a href="#home">হোম</a> / চেকআউট</nav>
    <h1>চেকআউট</h1><p class="lead">ক্যাশ অন ডেলিভারি—পণ্য হাতে পেয়ে টাকা দিন।</p>
    <div id="coRoot"></div></div></section>`;
  track('InitiateCheckout', { value: totals(cart).sub, currency: 'BDT' });
  const co = mountCheckout($('#coRoot'), {
    isCart: true,
    getLines: () => cart,
    editable: () => 'rm',
    onQty: (i, d) => { cart[i].qty = Math.max(1, cart[i].qty + d); saveCart(); },
    onRemove: i => { cart.splice(i, 1); saveCart(); },
    onDone: () => { cart = []; saveCart(); },
  });
  co.isCart = true;
}

function renderDoc(key) {
  const d = docs({ bn, tk })[key];
  document.title = `${d.title} — ACL`;
  setFab('আসসালামু আলাইকুম, একটা বিষয় জানতে চাই।');
  view.innerHTML = `<section class="band doc"><div class="wrap narrow">
    <nav class="crumb"><a href="#home">হোম</a> / ${d.title}</nav>
    <div class="doc-head"><span class="doc-ic">${I[d.icon]}</span><h1>${d.title}</h1></div>
    <p class="lead">${esc(d.lead)}</p>
    ${d.sections.map(([h, body]) => `<section class="doc-sec rv"><h2>${esc(h)}</h2>${Array.isArray(body)
      ? body.map(t => `<p>${esc(t)}</p>`).join('')
      : `<ul class="checklist">${body.list.map(t => `<li>${I.check}<span>${esc(t)}</span></li>`).join('')}</ul>`}</section>`).join('')}
    <div style="margin-top:36px">${waBand('আসসালামু আলাইকুম, একটা বিষয় জানতে চাই।', 'আরও কিছু জানার আছে?', 'WhatsApp এ লিখুন, আমরা উত্তর দেব।')}</div>
  </div></section>`;
}

function renderOrders() {
  document.title = 'আমার অর্ডার — ACL';
  setFab('আসসালামু আলাইকুম, আমার অর্ডার সম্পর্কে জানতে চাই।');
  const list = store.get('acl_orders', []).slice().reverse();
  const when = fmtWhen;
  view.innerHTML = `<section class="band"><div class="wrap narrow">
    <nav class="crumb"><a href="#home">হোম</a> / আমার অর্ডার</nav>
    <div class="doc-head"><span class="doc-ic">${I.receipt}</span><h1>আমার অর্ডার</h1></div>
    <p class="lead">এই ফোন বা কম্পিউটার থেকে দেওয়া অর্ডারগুলো। অর্ডারের অবস্থা জানতে WhatsApp এ অর্ডার নম্বর পাঠান।</p>
    ${list.length ? `<div class="orders">${list.map((o, i) => `<article class="panel order rv">
      <div class="row"><div><a class="oid" href="#order-${esc(o.id)}">${esc(o.id)}</a><div class="meta">${when(o.at)}</div></div><b class="price ototal">${tk(o.total)}</b></div>
      <ul class="olines">${(o.lines || []).map(l => `<li><span>${esc(l.name)} <span class="meta">${esc(l.detail)}</span></span><span class="nowrap">${bn(l.qty)}টি</span></li>`).join('')}</ul>
      <div class="meta">${esc(o.name)} · ${esc(o.district || '')} · ${esc(o.phone)}</div>
      <div class="row" style="gap:10px;margin-top:6px">
        <a class="btn btn-wa btn-sm" style="flex:1" target="_blank" rel="noopener" href="${waLink(`আসসালামু আলাইকুম, আমার অর্ডার ${o.id} এর অবস্থা জানতে চাই।`)}">${I.wa}<span>অবস্থা জানুন</span></a>
        ${o.msg ? `<a class="btn btn-ghost btn-sm" style="flex:1" target="_blank" rel="noopener" href="${waLink(o.msg)}">${I.arrow}<span>আবার পাঠান</span></a>` : ''}
        ${o.src ? `<button class="btn btn-ghost btn-sm" style="flex:1" data-reorder="${list.length - 1 - i}">${I.refresh}<span>আবার কিনুন</span></button>` : ''}
      </div></article>`).join('')}</div>`
    : `<div class="panel center" style="margin-top:24px"><p class="empty">এই ডিভাইস থেকে এখনো কোনো অর্ডার দেওয়া হয়নি।</p><a class="btn btn-red" href="#products">${I.basket}<span>পণ্য দেখুন</span></a></div>`}
  </div></section>`;
}

/* ---------- checkout component ---------- */
function field(id, label, type, attrs, err) {
  const ctl = type === 'textarea' ? `<textarea id="f-${id}" name="${id}" ${attrs}></textarea>` : `<input id="f-${id}" name="${id}" type="${type}" ${attrs}>`;
  return `<div class="field"><label for="f-${id}">${label}</label>${ctl}${err ? `<span class="err">${err}</span>` : ''}</div>`;
}
function mountCheckout(root, o) {
  const d = CONFIG.delivery;
  root.innerHTML = `<div class="co"><form class="panel" id="coForm" novalidate>
    <h3>ডেলিভারির তথ্য</h3>
    ${field('name', 'আপনার নাম', 'text', 'autocomplete="name" required', 'নাম লিখুন')}
    ${field('phone', 'মোবাইল নম্বর', 'tel', 'inputmode="numeric" autocomplete="tel" placeholder="01XXXXXXXXX" required', 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন')}
    <div class="field"><label for="f-district">জেলা</label>
      <select id="f-district" name="district" required><option value="">জেলা বেছে নিন</option>${DISTRICTS.map(([dv, list]) => `<optgroup label="${dv}">${list.map(x => `<option>${x}</option>`).join('')}</optgroup>`).join('')}</select>
      <span class="err">জেলা বেছে নিন</span></div>
    <div class="legend">ডেলিভারি এলাকা</div>
    <div class="radios">
      <label><input type="radio" name="area" value="in" checked><span>ঢাকার ভেতরে<small>${tk(d.insideDhaka)} · ${bn(d.daysInside.join('–'))} দিন</small></span></label>
      <label><input type="radio" name="area" value="out"><span>ঢাকার বাইরে<small>${tk(d.outsideDhaka)} · ${bn(d.daysOutside.join('–'))} দিন</small></span></label>
    </div>
    ${field('address', 'পূর্ণ ঠিকানা', 'textarea', 'autocomplete="street-address" placeholder="বাসা/রোড, এলাকা, থানা, জেলা" required', 'ঠিকানা লিখুন')}
    ${field('note', 'বিশেষ নির্দেশনা (ঐচ্ছিক)', 'text', 'placeholder="যেমন: বিকেলে ডেলিভারি দিন"', '')}
    <div class="pay">${I.cash}<span>ক্যাশ অন ডেলিভারি — পণ্য হাতে পেয়ে, দেখে টাকা দিন</span></div>
    <button class="btn btn-red btn-block" type="submit" id="coSubmit">অর্ডার কনফার্ম করুন</button>
    <p class="meta center" style="margin:10px 0 0">অর্ডারের পর আমরা ফোন বা WhatsApp এ কনফার্ম করব।</p>
  </form><div class="panel summary"><h3>অর্ডার সামারি</h3><div id="sumBody"></div></div></div>`;

  const form = $('#coForm', root), F = form.elements, sum = $('#sumBody', root);
  const draft = store.get('acl_draft', {});
  ['name', 'phone', 'address', 'district'].forEach(k => { if (draft[k]) F[k].value = draft[k]; });
  if (draft.area) F.area.value = draft.area;
  const saveDraft = debounce(() => store.set('acl_draft', { name: F.name.value, phone: F.phone.value, address: F.address.value, district: F.district.value, area: F.area.value }), 400);
  const cleanPhone = v => toEn(v).replace(/[\s-]/g, '').replace(/^\+?88/, '');
  const RULES = {
    name: v => (v.trim().length >= 2 ? '' : 'নাম লিখুন'),
    phone: v => { const p = cleanPhone(v); if (/^01[3-9]\d{8}$/.test(p)) return ''; if (/^\d*$/.test(p) && p.length < 11) return `আরও ${bn(11 - p.length)}টি সংখ্যা দিন (০১ দিয়ে শুরু)`; return 'সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন'; },
    district: v => (v ? '' : 'জেলা বেছে নিন'),
    address: v => (v.trim().length >= 8 ? '' : 'বাসা/রোড, এলাকা ও থানাসহ পূর্ণ ঠিকানা লিখুন'),
  };
  const touched = new Set();
  const check = k => {
    const f = F[k].closest('.field'), msg = RULES[k](F[k].value), err = f.querySelector('.err');
    f.classList.toggle('bad', !!msg); f.classList.toggle('ok', !msg); if (err && msg) err.textContent = msg;
    F[k].setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const liveCheck = debounce(k => { if (touched.has(k)) check(k); }, 450);
  form.addEventListener('input', e => {
    const k = e.target.name;
    if (RULES[k]) { if (e.target.closest('.field').classList.contains('bad')) check(k); else liveCheck(k); }
    saveDraft();
  });
  form.addEventListener('focusout', e => { const k = e.target.name; if (RULES[k] && e.target.value) { touched.add(k); check(k); } });

  const api = {
    isCart: !!o.isCart,
    render() {
      const lines = o.getLines(), t = totals(lines, F.area.value);
      $('#coSubmit', root).textContent = lines.length ? `অর্ডার কনফার্ম করুন · ${tk(t.total)}` : 'কার্ট খালি';
      $('#coSubmit', root).disabled = !lines.length;
      if (!lines.length) { sum.innerHTML = `<p class="empty">কার্ট খালি।</p><a class="btn btn-red btn-block" href="#products">পণ্য দেখুন</a>`; return; }
      sum.innerHTML = `<ul class="lines">${lines.map((l, i) => lineRow(l, i, o.editable(i))).join('')}</ul>
        ${o.addons && o.addons.length ? `<div class="addons"><p>সাথে নিতে পারেন</p>${o.addons.map(a => `<label class="addon"><input type="checkbox" data-addon="${a.slug}" ${o.picked.has(a.slug) ? 'checked' : ''}><img src="${thumbOf(a)}" alt=""><span>${esc(nameOf(a))} <span class="meta">${a.sizes[0].bn}</span></span><b class="price">+${tk(a.sizes[0].price)}</b></label>`).join('')}</div>` : ''}
        ${meter(t.sub)}
        <div class="totals">
          <div><span>পণ্যের দাম</span><span class="price">${tk(t.sub)}</span></div>
          ${t.save ? `<div class="green"><span>কম্বো সাশ্রয়</span><span class="price">-${tk(t.save)}</span></div>` : ''}
          <div><span>ডেলিভারি চার্জ</span><span class="price">${t.del ? tk(t.del) : 'ফ্রি'}</span></div>
          <div class="grand"><span>মোট</span><span class="price">${tk(t.total)}</span></div>
        </div>`;
      animateMeters(sum);
    },
  };
  form.addEventListener('change', e => {
    if (e.target.name === 'district' && e.target.value) {
      F.area.value = CONFIG.delivery.insideDistricts.includes(e.target.value) ? 'in' : 'out';
      e.target.closest('.field').classList.remove('bad');
    }
    if (e.target.name === 'area' || e.target.name === 'district') {
      api.render(); saveDraft();
    }
  });
  sum.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'); if (q) o.onQty(+q.dataset.i, +q.dataset.q);
    const r = e.target.closest('[data-rm]'); if (r) o.onRemove(+r.dataset.rm);
  });
  sum.addEventListener('change', e => { const a = e.target.closest('[data-addon]'); if (a) o.onAddon(a.dataset.addon, a.checked); });

  let submitting = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (submitting) return;
    const bad = Object.keys(RULES).filter(k => !check(k));
    if (bad.length) { const el = F[bad[0]]; el.focus(); el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return; }
    const lines = o.getLines(); if (!lines.length) return;
    const phone = cleanPhone(F.phone.value), area = F.area.value, t = totals(lines, area);
    // same phone + same items + same total within 2 minutes = a double tap, not a new order
    const sig = `${phone}|${t.total}|${lines.map(keyOf).join(',')}`;
    const prev = orders.all().reverse().find(x => x.sig === sig && Date.now() - new Date(x.at).getTime() < 120000);
    if (prev) { location.hash = 'order-' + prev.id; return; }

    submitting = true;
    const btn = $('#coSubmit', root); btn.disabled = true; btn.innerHTML = `<span class="spin"></span><span>অর্ডার হচ্ছে…</span>`;
    const order = {
      id: 'ACL-' + Date.now().toString(36).slice(-5).toUpperCase(), at: new Date().toISOString(), sig,
      name: F.name.value.trim(), phone, district: F.district.value, area, address: F.address.value.trim(), note: F.note.value.trim(),
      lines: lines.map(l => { const x = lineInfo(l); return { name: x.name, detail: x.sub, qty: l.qty, unit: x.unit }; }), ...t,
      src: lines.map(l => ({ ...l })), notify: 'pending',
    };
    order.msg = [
      `নতুন অর্ডার ${order.id}`, `নাম: ${order.name}`, `মোবাইল: ${order.phone}`,
      `জেলা: ${order.district} (${area === 'in' ? 'ঢাকার ভেতরে' : 'ঢাকার বাইরে'})`, `ঠিকানা: ${order.address}`, order.note ? `নির্দেশনা: ${order.note}` : '',
      '', 'পণ্য:', ...order.lines.map(l => `- ${l.name} (${l.detail}), ${bn(l.qty)}টি = ${tk(l.unit * l.qty)}`), '',
      `পণ্যের দাম: ${tk(t.sub)}`, t.save ? `কম্বো সাশ্রয়: ${tk(t.save)}` : '', `ডেলিভারি: ${t.del ? tk(t.del) : 'ফ্রি'}`, `মোট: ${tk(t.total)}`,
      'পেমেন্ট: ক্যাশ অন ডেলিভারি',
    ].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
    orders.save(order);
    track('Purchase', { value: t.total, currency: 'BDT', content_ids: lines.map(keyOf) });

    // empty the form completely, forget the draft, then go to the order's status page
    saveDraft.cancel(); liveCheck.cancel();
    try { localStorage.removeItem('acl_draft'); } catch { /* ignore */ }
    form.reset(); touched.clear(); $$('.field', form).forEach(f => f.classList.remove('bad', 'ok'));
    o.onDone?.();
    freshOrder = order.id;
    location.hash = 'order-' + order.id;
    sendOrder(order); // fire-and-forget; the status page updates when it finishes
  });

  api.render();
  activeCheckout = api;
  return api;
}

/* ---------- send order to the owner (no server) ---------- */
let freshOrder = null; const thanked = new Set(); // orders placed in this visit keep the thank-you title
async function sendOrder(order) {
  const jobs = [];
  const n = CONFIG.notify || {};
  if (n.web3formsKey) {
    jobs.push(fetch('https://api.web3forms.com/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: n.web3formsKey, subject: `নতুন অর্ডার ${order.id} — ${tk(order.total)}`, from_name: 'ACL Website',
        'অর্ডার নম্বর': order.id, 'নাম': order.name, 'মোবাইল': order.phone, 'জেলা': order.district, 'ঠিকানা': order.address,
        'মোট': order.total, message: order.msg, botcheck: '',
      }),
    }).then(r => r.json()).then(j => { if (!j.success) throw new Error(j.message || 'web3forms'); return 'email'; }));
  }
  if (CONFIG.orderWebhook) {
    // Apps Script cannot answer CORS, so this is sent blind (no-cors) and counted as sent
    jobs.push(fetch(CONFIG.orderWebhook, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ ...order, key: CONFIG.orderWebhookKey }) }).then(() => 'sheet'));
  }
  let state = 'none';
  if (jobs.length) {
    const res = await Promise.allSettled(jobs);
    state = res.some(r => r.status === 'fulfilled') ? 'sent' : 'failed';
  }
  orders.patch(order.id, { notify: state });
  if (current === 'order-' + order.id) renderStatus(order.id);
}

/* ---------- order status page ---------- */
const shareData = o => b64e({ i: o.id, t: o.at, n: (o.name || '').split(' ')[0], d: o.district, a: o.area,
  l: o.lines.map(l => [l.name, l.detail, l.qty, l.unit]), s: o.sub, v: o.save, e: o.del, T: o.total });
const fromShare = (id, data) => { const x = b64d(data || ''); if (!x || x.i !== id) return null;
  return { id: x.i, at: x.t, name: x.n, district: x.d, area: x.a, lines: (x.l || []).map(([name, detail, qty, unit]) => ({ name, detail, qty, unit })), sub: x.s, save: x.v, del: x.e, total: x.T, shared: true }; };

function renderStatus(id, data) {
  const local = orders.get(id), o = local || fromShare(id, data);
  const fresh = freshOrder === id; freshOrder = null; if (fresh) thanked.add(id);
  document.title = `অর্ডার ${id} — ACL`;
  setFab(`আসসালামু আলাইকুম, আমার অর্ডার ${id} সম্পর্কে জানতে চাই।`);
  if (!o) {
    view.innerHTML = `<section class="band"><div class="wrap narrow center"><div class="doc-head" style="justify-content:center"><span class="doc-ic">${I.receipt}</span><h1>অর্ডার ${esc(id)}</h1></div>
      <p class="lead">এই অর্ডারের বিবরণ এই ডিভাইসে নেই। অর্ডার নম্বরটি WhatsApp এ পাঠালে আমরা অবস্থা জানিয়ে দেব।</p>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="${waLink(`আসসালামু আলাইকুম, অর্ডার ${id} এর অবস্থা জানতে চাই।`)}">${I.wa}<span>অবস্থা জানুন</span></a></div></section>`;
    return;
  }
  const when = fmtWhen(o.at);
  const shareUrl = `${location.href.split('#')[0]}#order-${o.id}.${shareData(o)}`;
  const n = o.notify;
  const step2 = o.shared ? { s: 'done', t: 'অর্ডার আমাদের কাছে', d: 'অর্ডার দেওয়া হয়েছে' }
    : n === 'pending' ? { s: 'now', t: 'আমাদের কাছে পাঠানো হচ্ছে…', d: 'কয়েক সেকেন্ড লাগতে পারে' }
    : n === 'sent' ? { s: 'done', t: 'অর্ডার আমাদের কাছে পৌঁছেছে', d: 'কোনো কিছু করতে হবে না' }
    : HAS_WA ? { s: 'act', t: 'WhatsApp এ অর্ডারটি পাঠিয়ে দিন', d: 'নিচের সবুজ বাটনে চাপ দিলেই অর্ডার আমাদের কাছে পৌঁছাবে' }
    : n === 'failed' ? { s: 'act', t: 'অর্ডার পাঠানো যায়নি', d: 'ইন্টারনেট সংযোগ দেখে নিচের "আবার পাঠান" বাটনে চাপ দিন' }
    : { s: 'now', t: 'অর্ডার গ্রহণ করা হয়েছে', d: 'আমরা শীঘ্রই আপনার নম্বরে ফোন করব' };
  const steps = [
    { s: 'done', t: 'অর্ডার দেওয়া হয়েছে', d: when },
    step2,
    { s: step2.s === 'done' ? 'now' : 'todo', t: 'ফোনে কনফার্মেশন', d: 'আমরা শীঘ্রই ফোন বা WhatsApp এ যোগাযোগ করব' },
    { s: 'todo', t: 'ডেলিভারি', d: `আনুমানিক ${etaRange(o.area === 'in' ? 'in' : 'out')} · পণ্য দেখে টাকা দিন` },
  ];
  view.innerHTML = `<section class="band status"><div class="wrap narrow">
    <div class="st-hero rv in">
      <div class="st-tick">${I.check}</div>
      <h1>${thanked.has(id) ? `ধন্যবাদ${o.name ? ', ' + esc(o.name.split(' ')[0]) : ''}! অর্ডার সফল হয়েছে` : 'অর্ডারের অবস্থা'}</h1>
      <p class="st-id">অর্ডার নম্বর <b>${esc(o.id)}</b><button class="iconbtn sm" data-copy="${esc(o.id)}" aria-label="অর্ডার নম্বর কপি করুন">${I.doc}</button></p>
      <p class="meta">${o.shared ? 'শেয়ার করা লিংক থেকে দেখছেন' : 'এই পেজটি বুকমার্ক বা শেয়ার করে রাখতে পারেন'}</p>
    </div>
    <ol class="timeline">${steps.map(x => `<li class="tl s-${x.s}"><span class="dotc">${x.s === 'done' ? I.check : x.s === 'act' ? I.wa : ''}</span><div><b>${x.t}</b><span class="meta">${esc(x.d)}</span></div></li>`).join('')}</ol>
    ${!o.shared ? `<div class="st-actions">
      <a class="btn ${n === 'sent' ? 'btn-ghost' : 'btn-wa'}" target="_blank" rel="noopener" href="${waLink(o.msg)}">${I.wa}<span>${n === 'sent' ? 'WhatsApp এ কপি পাঠান' : 'WhatsApp এ অর্ডার পাঠান'}</span></a>
      ${n === 'failed' ? `<button class="btn btn-red" data-resend="${esc(o.id)}">${I.refresh}<span>আবার পাঠান</span></button>` : ''}
      <button class="btn btn-ghost" data-copy="${esc(shareUrl)}">${I.arrow}<span>শেয়ার লিংক কপি</span></button>
    </div>` : ''}
    <div class="panel st-sum">
      <h3>অর্ডার সামারি</h3>
      <ul class="olines">${o.lines.map(l => `<li><span>${esc(l.name)} <span class="meta">${esc(l.detail)} · ${bn(l.qty)}টি</span></span><span class="price">${tk(l.unit * l.qty)}</span></li>`).join('')}</ul>
      <div class="totals">
        <div><span>পণ্যের দাম</span><span class="price">${tk(o.sub)}</span></div>
        ${o.save ? `<div class="green"><span>কম্বো সাশ্রয়</span><span class="price">-${tk(o.save)}</span></div>` : ''}
        <div><span>ডেলিভারি</span><span class="price">${o.del ? tk(o.del) : 'ফ্রি'}</span></div>
        <div class="grand"><span>মোট (ক্যাশ অন ডেলিভারি)</span><span class="price">${tk(o.total)}</span></div>
      </div>
      ${local ? `<div class="st-addr"><b>ডেলিভারির ঠিকানা</b><span>${esc(o.name)} · ${esc(o.phone)}</span><span>${esc(o.address)}, ${esc(o.district)}</span>${o.note ? `<span class="meta">নির্দেশনা: ${esc(o.note)}</span>` : ''}</div>`
        : `<p class="meta" style="margin:12px 0 0">${esc(o.district || '')} · ঠিকানা ও ফোন নম্বর শুধু অর্ডারকারীর ডিভাইসে দেখা যায়।</p>`}
    </div>
    <div class="row" style="gap:10px;margin-top:16px">
      <a class="btn btn-ghost" style="flex:1" href="#products">${I.basket}<span>আরও কিনুন</span></a>
      ${local ? `<a class="btn btn-ghost" style="flex:1" href="#orders">${I.receipt}<span>আমার সব অর্ডার</span></a>` : ''}
    </div>
  </div></section>`;
  if (fresh) setTimeout(() => burst($('.st-tick'), true), 300);
}
function fmtWhen(iso) {
  try {
    const d = new Date(iso), day = new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', timeZone: 'Asia/Dhaka' }).format(d);
    const [h, m] = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Dhaka' }).format(d).split(':').map(Number);
    const part = h < 5 ? 'রাত' : h < 12 ? 'সকাল' : h < 16 ? 'দুপুর' : h < 18 ? 'বিকাল' : h < 20 ? 'সন্ধ্যা' : 'রাত';
    return `${day}, ${part} ${bn(h % 12 || 12)}:${bn(String(m).padStart(2, '0'))}`;
  } catch { return ''; }
}
async function copyText(text, okMsg) {
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast(okMsg); } catch { toast('কপি করা গেল না'); } ta.remove(); }
}

/* ---------- drawer ---------- */
function renderDrawer() {
  const t = totals(cart);
  $('#drawerBody').innerHTML = cart.length
    ? `<ul class="lines">${cart.map((l, i) => lineRow(l, i, 'rm')).join('')}</ul>${meter(t.sub)}`
    : `<p class="empty">কার্ট এখনো খালি।</p>`;
  $('#drawerFoot').innerHTML = cart.length
    ? `<div class="totals"><div><span>পণ্যের দাম</span><span class="price">${tk(t.sub)}</span></div>${t.save ? `<div class="green"><span>কম্বো সাশ্রয়</span><span class="price">-${tk(t.save)}</span></div>` : ''}</div>
       <a class="btn btn-red btn-block" href="#checkout" data-close><span>চেকআউট করুন</span>${I.arrow}</a>
       <a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink('অর্ডার করতে চাই:\n' + cart.map(l => { const x = lineInfo(l); return `- ${x.name} (${x.sub}), ${bn(l.qty)}টি`; }).join('\n'))}">${I.wa}<span>WhatsApp এ অর্ডার</span></a>`
    : `<a class="btn btn-red btn-block" href="#products" data-close>পণ্য দেখুন</a>`;
  animateMeters($('#drawerBody'));
}
function openDrawer() { renderDrawer(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('open'); }
function openMenu() { $('#menu').classList.add('open'); $('#menu').setAttribute('aria-hidden', 'false'); $('#scrim').classList.add('open'); $('#menuBtn').setAttribute('aria-expanded', 'true'); }
function closeMenu() { const m = $('#menu'); if (!m || !m.classList.contains('open')) return; m.classList.remove('open'); m.setAttribute('aria-hidden', 'true'); $('#menuBtn').setAttribute('aria-expanded', 'false'); if (!$('#drawer').classList.contains('open') && !$('#modal').classList.contains('open')) $('#scrim').classList.remove('open'); }
function closeOverlays() {
  closeMenu(); $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#modal').classList.remove('open'); $('#scrim').classList.remove('open'); }

/* ---------- router ---------- */
const SECTIONS = { products: 'sec-products', combos: 'sec-combos', process: 'sec-process', faq: 'sec-faq', offer: 'sec-offer' };
const DOC_KEYS = ['about', 'delivery-policy', 'privacy', 'terms'];
function route() {
  // hash first; then ?p= (real hosting); then the page a generated product file was built for (e.g. chilli.html)
  const h = decodeURIComponent(location.hash.slice(1)) || new URLSearchParams(location.search).get('p') || document.documentElement.dataset.page || 'home';
  const om = /^order-(ACL-[A-Z0-9]+)(?:\.([A-Za-z0-9_-]+))?$/.exec(h);
  const target = om ? 'order-' + om[1] : bySlug[h] ? 'p:' + h : (h === 'checkout' || h === 'orders' || DOC_KEYS.includes(h)) ? h : 'home';
  closeMenu();
  if (target !== current) {
    cleanup(); current = target;
    if (om) renderStatus(om[1], om[2]);
    else if (bySlug[h]) renderPDP(bySlug[h]);
    else if (h === 'checkout') renderCheckoutPage();
    else if (h === 'orders') renderOrders();
    else if (DOC_KEYS.includes(h)) renderDoc(h);
    else renderHome();
    reveal();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  if (SECTIONS[h]) requestAnimationFrame(() => goTo(SECTIONS[h]));
}

/* ---------- global wiring ---------- */
document.addEventListener('click', e => {
  const a = e.target.closest('[data-add]');
  if (a) { const p = bySlug[a.dataset.add]; addToCart({ type: 'p', slug: p.slug, size: p.sizes[0].id, qty: 1 }, a.closest('.card')?.querySelector('img')); }
  const b = e.target.closest('[data-addb]');
  if (b) addToCart({ type: 'b', id: b.dataset.addb, qty: 1 }, b.closest('.combo')?.querySelector('img'));
  const g = e.target.closest('[data-go]'); if (g) goTo(g.dataset.go);
  const f = e.target.closest('[data-f]');
  if (f) {
    $$('[data-f]').forEach(x => x.setAttribute('aria-pressed', x === f));
    $$('#grid .card').forEach(c => { c.hidden = f.dataset.f !== 'all' && c.dataset.cat !== f.dataset.f; });
  }
  if (e.target.closest('[data-close]')) closeOverlays();
  const ro = e.target.closest('[data-reorder]');
  if (ro) {
    const o = store.get('acl_orders', [])[+ro.dataset.reorder];
    (o?.src || []).filter(l => (l.type === 'b' ? BUNDLES.some(b => b.id === l.id) : bySlug[l.slug])).forEach(l => {
      const k = keyOf(l), ex = cart.find(c => keyOf(c) === k); if (ex) ex.qty += l.qty; else cart.push({ ...l });
    });
    saveCart(); openDrawer();
  }
  const rs = e.target.closest('[data-resend]');
  if (rs) { const od = orders.patch(rs.dataset.resend, { notify: 'pending' }); if (od) { renderStatus(od.id); sendOrder(od); } }
  const cp = e.target.closest('[data-copy]');
  if (cp) copyText(cp.dataset.copy, cp.dataset.copy.startsWith('http') ? 'লিংক কপি হয়েছে' : 'অর্ডার নম্বর কপি হয়েছে');
  if (e.target.closest('#menuBtn')) openMenu();
  if (e.target.closest('#menuClose')) closeMenu();
  const dq = e.target.closest('#drawer [data-q]');
  if (dq) { const i = +dq.dataset.i; cart[i].qty = Math.max(1, cart[i].qty + +dq.dataset.q); saveCart(); }
  const dr = e.target.closest('#drawer [data-rm]'); if (dr) { cart.splice(+dr.dataset.rm, 1); saveCart(); }
});
// subtle 3D tilt on product label cards
document.addEventListener('pointermove', e => {
  if (reduced || e.pointerType !== 'mouse') return;
  const c = e.target.closest('.card-img'); if (!c) return;
  const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  c.querySelector('img').style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
});
document.addEventListener('pointerout', e => { const c = e.target.closest?.('.card-img'); if (c && !c.contains(e.relatedTarget)) c.querySelector('img').style.transform = ''; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlays(); });
$('#cartBtn').addEventListener('click', openDrawer);
$('#drawerClose').addEventListener('click', closeOverlays);
$('#scrim').addEventListener('click', closeOverlays);

// static chrome
document.body.classList.toggle('no-wa', !HAS_WA);
if (!HAS_WA && !(CONFIG.notify && CONFIG.notify.web3formsKey) && !CONFIG.orderWebhook) {
  console.error('ACL: no order channel is set. Add notify.web3formsKey and/or whatsapp in js/config.js, or orders will not reach you.');
}
$('#fab').innerHTML = I.wa; $('#hdrWa').innerHTML = I.wa;
$$('[data-icon]').forEach(el => { el.outerHTML = I[el.dataset.icon] || ''; });
$('#ftrWa').href = waLink('আসসালামু আলাইকুম');
const telHref = 'tel:' + CALL();
if (CONFIG.phoneDisplay && CALL()) $('#ftrPhone').innerHTML = `<a href="${telHref}">${esc(CONFIG.phoneDisplay)}</a>`;
else $('#ftrPhone').closest('li').remove();
const INFO_LINKS = [['about', 'আমাদের গল্প', 'info'], ['delivery-policy', 'ডেলিভারি ও রিটার্ন নীতি', 'truck'], ['privacy', 'গোপনীয়তা নীতি', 'shield'], ['terms', 'শর্তাবলি', 'doc'], ['orders', 'আমার অর্ডার', 'receipt']];
$('#ftrInfo').innerHTML = INFO_LINKS.map(([k, t]) => `<li><a href="#${k}">${t}</a></li>`).join('');
$('#menuBody').innerHTML = `
  <nav class="mnav" aria-label="মেনু">
    <a href="#home">${I.home}<span>হোম</span></a>
    <a href="#products">${I.basket}<span>সব পণ্য</span></a>
    <a href="#combos">${I.tag}<span>কম্বো অফার</span></a>
    <a href="#process">${I.mill}<span>কিভাবে বানাই</span></a>
    <a href="#faq">${I.info}<span>প্রশ্ন-উত্তর</span></a>
  </nav>
  <p class="mhead">পণ্য</p>
  <div class="mprods">${PRODUCTS.map(p => `<a href="#${p.slug}" style="--c:${p.accent}"><i></i>${esc(nameOf(p))}</a>`).join('')}</div>
  <p class="mhead">তথ্য</p>
  <nav class="mnav small">${INFO_LINKS.map(([k, t, ic]) => `<a href="#${k}">${I[ic]}<span>${t}</span></a>`).join('')}</nav>
  <div class="mfoot"><a class="btn btn-wa btn-block" target="_blank" rel="noopener" href="${waLink('আসসালামু আলাইকুম')}">${I.wa}<span>WhatsApp এ কথা বলুন</span></a>
  ${CONFIG.phoneDisplay && CALL() ? `<p class="meta center">ফোন: <a href="${telHref}">${esc(CONFIG.phoneDisplay)}</a></p>` : ''}</div>`;
$('#ftrProducts').innerHTML = PRODUCTS.map(p => `<li><a href="#${p.slug}">${esc(nameOf(p))}</a></li>`).join('');
$('#yr').textContent = bn(new Date().getFullYear());

// optional ad pixels
if (CONFIG.metaPixelId) {
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', CONFIG.metaPixelId); window.fbq('track', 'PageView');
}
if (CONFIG.gaMeasurementId) {
  const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.gaMeasurementId}`; document.head.append(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date()); window.gtag('config', CONFIG.gaMeasurementId);
}

validateCatalog();
saveCart();
addEventListener('hashchange', route);
route();
