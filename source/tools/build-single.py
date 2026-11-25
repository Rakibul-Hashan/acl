"""Bundle the ACL site into one self-contained index.html (for sandboxed viewers)."""
import base64, json, re, pathlib, sys
SRC = pathlib.Path(sys.argv[1]); OUT = pathlib.Path(sys.argv[2])
rd = lambda p: (SRC / p).read_text(encoding='utf-8')

assets = {}
for f in sorted((SRC / 'assets').rglob('*.webp')):
    rel = f.relative_to(SRC).as_posix()
    assets[rel] = base64.b64encode(f.read_bytes()).decode()

def strip(js):
    js = re.sub(r"^import .*?;\s*$", "", js, flags=re.M)
    return re.sub(r"^export ", "", js, flags=re.M)

jar = strip(rd('js/jar3d.js'))
jar = ("async function __loadJar3d() {\n"
       "  const THREE = await import('three');\n"
       "  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');\n"
       + jar + "\n  return { JarStage, webglOK };\n}\n")
app = strip(rd('js/app.js')).replace("import('./jar3d.js')", "__loadJar3d()")
module = "\n".join([strip(rd('js/config.js')), strip(rd('js/data.js')), strip(rd('js/icons.js')), strip(rd('js/pages.js')), jar, app])

boot = ("<script>(function(){var B=%s,A={};for(var k in B){try{var s=atob(B[k]),u=new Uint8Array(s.length);"
        "for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);A[k]=URL.createObjectURL(new Blob([u],{type:'image/webp'}));}"
        "catch(e){A[k]='data:image/webp;base64,'+B[k];}}window.__ASSETS=A;})();</script>") % json.dumps(assets)

html = rd('index.html')
logo = 'data:image/webp;base64,' + assets['assets/logo.webp']
html = html.replace('src="assets/logo.webp"', f'src="{logo}"')
html = html.replace('<link rel="icon" href="assets/logo.webp">\n', '')
html = html.replace('<meta property="og:image" content="assets/labels/chilli.webp">\n', '')
html = html.replace('<link rel="stylesheet" href="css/styles.css">', '<style>\n' + rd('css/styles.css') + '\n</style>\n' + boot)
html = html.replace('<script type="module" src="js/app.js"></script>', '<script type="module">\n' + module.replace('</script', '<\\/script') + '\n</script>')
OUT.write_text(html, encoding='utf-8')
print(OUT, round(OUT.stat().st_size / 1e6, 2), 'MB')
