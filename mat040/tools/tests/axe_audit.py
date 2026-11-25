"""Accessibility audit: runs axe-core (WCAG 2.0/2.1/2.2 A and AA rules plus best practices) on every page,
in light and dark mode, with all worked solutions open and some answers entered so that feedback colours are checked too.

setup (once):  cd tools && npm install axe-core
usage:         python3 tools/tests/axe_audit.py [page-substring] [--light | --dark] [--mobile]
The site root is the folder that contains the landing page index.html (two levels above mat040/tools/tests).
"""
import sys, os, glob, json, subprocess, time
from collections import defaultdict
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
CLASS_DIR = os.path.abspath(os.path.join(HERE, '..', '..'))            # .../mat040
ROOT = os.path.dirname(CLASS_DIR)                                      # site root (landing page)
AXE = next((p for p in (os.path.join(CLASS_DIR, 'tools', 'node_modules', 'axe-core', 'axe.min.js'),
                        os.environ.get('AXE_PATH', ''), '/tmp/axe/node_modules/axe-core/axe.min.js') if p and os.path.exists(p)), None)
if not AXE:
    sys.exit('axe-core not found: run "npm install axe-core" inside mat040/tools')
PORT = 8781
args = [a for a in sys.argv[1:] if not a.startswith('--')]
only = args[0] if args else ''
schemes = ['light', 'dark']
MOBILE = '--mobile' in sys.argv      # 390px wide phone: checks the off-screen chapter menu, reflow and target sizes
if '--light' in sys.argv: schemes = ['light']
if '--dark' in sys.argv: schemes = ['dark']
TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

pages = ['index.html'] + sorted(os.path.relpath(f, ROOT) for f in glob.glob(CLASS_DIR + '/[0-9][0-9]-*.html')) + \
        [os.path.relpath(CLASS_DIR + '/index.html', ROOT)]
extra = sorted(os.path.relpath(f, ROOT) for f in glob.glob(ROOT + '/*/index.html') if os.path.dirname(f) != CLASS_DIR)   # teaching, research, projects, cv, class-template, other classes' home pages
pages += extra
pages = [p for p in pages if only in p]

srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(.8)
axe_src = open(AXE).read()
summary = defaultdict(lambda: defaultdict(list))
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for scheme in schemes:
            ctx = b.new_context(viewport={'width': 390 if MOBILE else 1200, 'height': 800 if MOBILE else 900}, color_scheme=scheme)
            for path in pages:
                pg = ctx.new_page()
                pg.goto('http://127.0.0.1:%d/%s?seed=5' % (PORT, path)); pg.wait_for_timeout(500)
                # open every worked solution and every video box, enter a wrong answer in the first text box of each example
                pg.evaluate('''() => {
                  document.querySelectorAll('.ex-foot button, .ex-btns button').forEach(b => { if (/worked solution/i.test(b.textContent)) b.click(); });
                  document.querySelectorAll('section.example').forEach(s => {
                    const i = s.querySelector('input.answer'); if (i) { i.value = '9999'; const c = s.querySelector('button.primary'); if (c) c.click(); }
                  });
                }''')
                pg.wait_for_timeout(200)
                pg.add_script_tag(content=axe_src)
                # empty-table-header is switched off: axe cannot see KaTeX math (MathML) as text, so it reports headers like "x" or "1/10" as empty.
                # Those headers carry an aria-label (see nameMathHeaders in engine.js) and MathML, so assistive technology reads them.
                res = pg.evaluate('(tags) => axe.run(document, {runOnly: {type: "tag", values: tags}, rules: {"empty-table-header": {enabled: false}}})', TAGS)
                for v in res['violations']:
                    for n in v['nodes']:
                        summary[(scheme, v['id'], v['impact'], v['help'])][path].append(n['target'][0] if n['target'] else '?')
                pg.close()
            ctx.close()
        b.close()
finally:
    srv.terminate()

if not summary:
    print('axe: no violations on %d pages (%s)' % (len(pages), ', '.join(schemes)))
    sys.exit(0)
total = 0
for (scheme, rid, impact, help_), by_page in sorted(summary.items(), key=lambda kv: (kv[0][0], kv[0][1])):
    n = sum(len(v) for v in by_page.values()); total += n
    print('[%s] %s (%s): %s  -- %d nodes on %d pages' % (scheme, rid, impact, help_, n, len(by_page)))
    for path, tg in list(by_page.items())[:3]:
        print('      %s: %s' % (path, ' | '.join(str(t)[:70] for t in tg[:2])))
print('\nTOTAL violating nodes: %d' % total)
sys.exit(1)
