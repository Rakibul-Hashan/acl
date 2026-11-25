"""
Generate ad/SEO landing files from index.html:
  chilli.html, turmeric.html, ...  each with its own <title>, description, canonical and Open Graph tags
  assets/og/<slug>.jpg + home.jpg  1200x630 share images (Facebook / WhatsApp / Google previews)
  sitemap.xml, robots.txt

Usage (from the source folder):
    python3 tools/build-pages.py                      # uses CONFIG.siteUrl (or relative links if empty)
    python3 tools/build-pages.py https://acl.com.bd   # or pass the live domain directly
Requires: Python 3 + Pillow (pip install pillow), Node.js (reads js/data.js and js/config.js).
With a domain, share images / canonical / sitemap get full links (recommended for ads).
"""
import json, re, subprocess, sys, pathlib, html
from datetime import date
from PIL import Image, ImageFilter, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
OG = ROOT / 'assets' / 'og'
OG.mkdir(parents=True, exist_ok=True)

# --- read catalogue + config through Node so there is one source of truth ---
js = """
const d = await import(process.argv[1]); const c = await import(process.argv[2]);
console.log(JSON.stringify({ products: d.PRODUCTS.map(p => ({ slug: p.slug, bn: p.bn, en: p.en, pitch: p.pitch, short: p.short,
  label: p.label, card: p.cardImg || null, soft: p.soft, accent: p.accent, cat: p.cat, price: Math.min(...p.sizes.map(s => s.price)), wide: !!p.wide,
  sizes: p.sizes.map(s => ({ id: s.id, bn: s.bn, price: s.price })) })),
  siteUrl: c.CONFIG.siteUrl, company: c.CONFIG.brand.company }));
"""
# config.js touches `window` only inside a function, so it imports fine in Node
out = subprocess.run(['node', '--input-type=module', '-e', js, (ROOT / 'js/data.js').as_uri(), (ROOT / 'js/config.js').as_uri()],
                     capture_output=True, text=True)
if out.returncode:
    sys.exit(out.stderr)
data = json.loads(out.stdout)
SITE = (sys.argv[1] if len(sys.argv) > 1 else data['siteUrl'] or '').rstrip('/')
if not SITE:
    print('No domain set: pages use relative links and no sitemap is written. Run again with your domain before running ads.')
ABS = lambda path: f'{SITE}/{path}' if SITE else path

def hex2rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def canvas(soft, pattern):
    W, H = 1200, 630
    bg = Image.new('RGB', (W, H), '#ffffff')
    # soft tint fading in at the bottom, like the printed labels
    tint = Image.new('RGB', (W, H), hex2rgb(soft))
    mask = Image.linear_gradient('L').resize((W, H))
    bg = Image.composite(tint, bg, mask)
    # ornament band on top
    pat = Image.open(pattern).convert('RGB')
    ph = 230; pat = pat.resize((int(pat.width * ph / pat.height), ph))
    band = Image.new('RGB', (W, ph))
    for x in range(0, W, pat.width): band.paste(pat, (x, 0))
    fade = Image.linear_gradient('L').rotate(180).resize((W, ph)).point(lambda v: int(v * .55))
    bg.paste(band, (0, 0), fade)
    return bg

def drop(img, im, xy, rot=0):
    im = im.convert('RGBA')
    if rot: im = im.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new('RGBA', (im.width + 60, im.height + 60), (0, 0, 0, 0))
    a = im.split()[3].point(lambda v: int(v * .35))
    sh.paste((60, 30, 10, 255), (30, 40), a)
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    img.paste(sh, (xy[0] - 30, xy[1] - 30), sh)
    img.paste(im, xy, im)

def label_img(p):
    return Image.open(ROOT / (p['card'] or f"assets/labels/{p['label']}.webp")).convert('RGB')

def rounded(im, r=26):
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width, im.height), r, fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out

for p in data['products']:
    pat = ROOT / f"assets/patterns/{p['slug'] if p['slug'] in ('seed-mix', 'ghee') else p['label']}.webp"
    img = canvas(p['soft'], pat)
    if p['wide']:
        lab = Image.open(ROOT / f"assets/labels/{p['label']}.webp").convert('RGB')
        lab = lab.resize((1100, int(lab.height * 1100 / lab.width)))
        drop(img, rounded(lab, 18), ((1200 - lab.width) // 2, (630 - lab.height) // 2 + 20))
    else:
        lab = label_img(p); h = 560; lab = lab.resize((int(lab.width * h / lab.height), h))
        drop(img, rounded(lab), ((1200 - lab.width) // 2, 40))
    img.save(OG / f"{p['slug']}.jpg", quality=86, optimize=True)

# home share image: fanned labels
home = canvas('#f6edd2', ROOT / 'assets/patterns/turmeric.webp')
picks = [p for p in data['products'] if p['slug'] in ('coriander', 'chilli', 'turmeric', 'chia', 'pumpkin')]
n = len(picks)
for i, p in enumerate(picks):
    lab = label_img(p); h = 430; lab = lab.resize((int(lab.width * h / lab.height), h))
    off = i - (n - 1) / 2
    drop(home, rounded(lab, 20), (int(600 - lab.width / 2 + off * 200), int(120 + abs(off) * 22)), rot=-off * 6)
home.save(OG / 'home.jpg', quality=86, optimize=True)

# --- html files ---
tpl = (ROOT / 'index.html').read_text(encoding='utf-8')

def set_meta(doc, prop, value, attr='property'):
    pat = re.compile(rf'<meta {attr}="{re.escape(prop)}" content="[^"]*">')
    tag = f'<meta {attr}="{prop}" content="{html.escape(value, quote=True)}">'
    return pat.sub(tag, doc) if pat.search(doc) else doc.replace('</head>', tag + '\n</head>')

def set_link(doc, rel, href):
    pat = re.compile(rf'<link rel="{rel}" href="[^"]*">')
    tag = f'<link rel="{rel}" href="{html.escape(href, quote=True)}">'
    return pat.sub(tag, doc) if pat.search(doc) else doc.replace('</head>', tag + '\n</head>')

def ld_script(obj):
    return '<script type="application/ld+json" id="ld">' + json.dumps({'@context': 'https://schema.org', **obj}, ensure_ascii=False).replace('</', '<\\/') + '</script>'

def product_ld(p, url, image):
    cat = {'spice': 'মসলা', 'ghee': 'ঘি'}.get(p['cat'], 'বীজ')
    return {'@graph': [
        {'@type': 'Product', '@id': url + '#product', 'name': f"{p['bn']} ({p['en']})", 'description': p['short'], 'sku': p['slug'],
         'brand': {'@type': 'Brand', 'name': 'ACL'}, 'image': [image], 'category': cat,
         'offers': [{'@type': 'Offer', 'sku': f"{p['slug']}-{s['id']}", 'name': s['bn'], 'price': s['price'], 'priceCurrency': 'BDT',
                     'availability': 'https://schema.org/InStock', 'itemCondition': 'https://schema.org/NewCondition', 'url': url} for s in p['sizes']]},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'হোম', 'item': (SITE + '/' if SITE else './')},
            {'@type': 'ListItem', 'position': 2, 'name': p['bn'], 'item': url}]}]}

def page(doc, title, desc, url, image, slug=None, ld=None):
    doc = re.sub(r'<title>.*?</title>', f'<title>{html.escape(title)}</title>', doc, flags=re.S)
    doc = set_meta(doc, 'description', desc, 'name')
    for k, v in (('og:title', title), ('og:description', desc), ('og:url', url), ('og:image', image), ('og:type', 'website'), ('og:locale', 'bn_BD')):
        if k == 'og:url' and not SITE: continue
        doc = set_meta(doc, k, v)
    doc = set_meta(doc, 'twitter:card', 'summary_large_image', 'name')
    if SITE:
        doc = set_link(doc, 'canonical', url)
    else:  # no domain yet: drop absolute-only tags rather than point them somewhere wrong
        doc = re.sub(r'<link rel="canonical" href="[^"]*">\n?', '', doc)
        doc = re.sub(r'<meta property="og:url" content="[^"]*">\n?', '', doc)
    dp = f' data-page="{slug}"' if slug else ''
    doc = re.sub(r'<html lang="bn"[^>]*>', f'<html lang="bn"{dp}>', doc)
    doc = re.sub(r'<script type="application/ld\+json" id="ld">.*?</script>\n?', '', doc, flags=re.S)
    if ld: doc = doc.replace('</head>', ld_script(ld) + '\n</head>')
    return doc

index = page(tpl, 'ACL মসলা ও বীজ — নিজেরা শুকিয়ে ভাঙানো',
             'নিজেরা শুকিয়ে ভাঙানো মসলা ও বাছাই করা বীজ। ক্যাশ অন ডেলিভারি, সারা বাংলাদেশে।',
             (SITE + '/' if SITE else './'), ABS('assets/og/home.jpg'),
             ld={'@graph': [{'@type': 'Organization', '@id': ABS('#org'), 'name': 'ACL', 'legalName': data['company'], 'url': (SITE + '/' if SITE else './'), 'logo': ABS('assets/logo.webp')},
                            {'@type': 'WebSite', 'name': 'ACL', 'url': (SITE + '/' if SITE else './'), 'inLanguage': 'bn'}]})
(ROOT / 'index.html').write_text(index, encoding='utf-8')

urls = [(SITE + '/' if SITE else './')]
for p in data['products']:
    t = f"{p['bn']} ({p['en']}) — ৳{p['price']} থেকে | ACL"
    t = re.sub(r'\d', lambda m: '০১২৩৪৫৬৭৮৯'[int(m.group())], t)
    d = f"{p['short']} ক্যাশ অন ডেলিভারি, সারা বাংলাদেশে।"
    url = ABS(f"{p['slug']}.html")
    img = ABS(f"assets/og/{p['slug']}.jpg")
    (ROOT / f"{p['slug']}.html").write_text(page(index, t, d, url, img, p['slug'], product_ld(p, url, img)), encoding='utf-8')
    urls.append(url)

today = date.today().isoformat()
if not SITE:
    (ROOT / 'sitemap.xml').unlink(missing_ok=True)
    (ROOT / 'robots.txt').write_text('User-agent: *\nAllow: /\n', encoding='utf-8')
    print(f'Built {len(urls) - 1} product pages and share images (relative links).')
    sys.exit(0)
(ROOT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + ''.join(f'  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n', encoding='utf-8')
(ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n', encoding='utf-8')
print(f'Built {len(urls) - 1} product pages, {len(urls)} share images, sitemap.xml, robots.txt for {SITE}')
