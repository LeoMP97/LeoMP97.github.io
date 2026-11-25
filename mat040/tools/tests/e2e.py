"""End-to-end test: open every chapter page in headless Chromium, solve every interactive problem through the real UI
(typing into boxes, clicking choices and graph widgets), and check that the page reports it as correct.
Also enters a wrong answer first, to make sure wrong answers are not accepted.
usage: e2e.py [page-substring] [rounds]"""
import sys, subprocess, time, glob, os, re, json
from playwright.sync_api import sync_playwright

CLASS_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))   # .../mat040
SITE = os.path.dirname(CLASS_DIR)                                                                  # site root: the server must serve ../assets too
CLASS_NAME = os.path.basename(CLASS_DIR)
PORT = 8766
only = sys.argv[1] if len(sys.argv) > 1 else ''
rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 2
srv = subprocess.Popen(['python3', '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=SITE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails, solved, wrong_checked = [], 0, 0
KEYBOARD = [False]     # graph widgets are answered with the mouse in even rounds and by typing in odd rounds
TEXTY = {'num', 'expr', 'eq', 'pair', 'sys', 'ineq', 'interval', 'list', 'primefact', 'exact', 'expanded', 'solset', 'text'}
WRONG = {'num': '987654', 'expr': '7x^3+1', 'eq': 'y=7x^2', 'pair': '(987,654)', 'sys': '(987,654)', 'ineq': 'x>987654', 'interval': '(5000, 6000)',
         'list': '987, 654', 'primefact': '3', 'exact': 'zzz', 'expanded': '1+1', 'solset': 'x>3', 'text': 'zzz'}


def plane_click(pg, sec_sel, win, pts):
    g = pg.evaluate('(w) => MAT.planeGeom(w.xmin, w.xmax, w.ymin, w.ymax)', win)      # same geometry the widget uses
    u, padL, padT, W = g['u'], g['padL'], g['padT'], g['W']
    for (x, y) in pts:
        svg = pg.locator(sec_sel + ' svg.plane').first
        svg.scroll_into_view_if_needed()
        bb = svg.bounding_box(); sc = bb['width'] / W
        pg.mouse.click(bb['x'] + (padL + (x - win['xmin']) * u) * sc, bb['y'] + (padT + (win['ymax'] - y) * u) * sc)


def plane_type(pg, sec_sel, pts):
    """keyboard route: type each point's coordinates and press Enter"""
    for (x, y) in pts:
        xi = pg.locator(sec_sel + ' .gw-coords input.gw-num').nth(0); yi = pg.locator(sec_sel + ' .gw-coords input.gw-num').nth(1)
        xi.fill(str(x)); yi.fill(str(y)); yi.press('Enter')


def numline_click(pg, sec_sel, nl, v):
    g = pg.evaluate('() => MAT.numLineGeom')
    W, pad = g['W'], g['pad']
    u = (W - 2 * pad) / (nl['hi'] - nl['lo'])
    svg = pg.locator(sec_sel + ' svg.numline').first
    svg.scroll_into_view_if_needed()
    bb = svg.bounding_box(); sc = bb['width'] / W
    pg.mouse.click(bb['x'] + (pad + (v['x'] - nl['lo']) * u) * sc, bb['y'] + g['y'] * sc)
    btns = pg.locator(sec_sel + ' .gw-controls button')
    if v['closed']: btns.nth(0).click()
    if v['dir'] == 'left': btns.nth(1).click()


def numline_type(pg, sec_sel, nl, v):
    pg.locator(sec_sel + ' .gw-controls input.gw-num').fill(str(v['x']))
    btns = pg.locator(sec_sel + ' .gw-controls button')
    if v['closed']: btns.nth(0).click()
    if v['dir'] == 'left': btns.nth(1).click()


def fill_field(pg, base, f, sample, wrong=False):
    t = f['type']
    sel = base + ' input.answer'
    if t in TEXTY:
        pg.locator(sel).fill(WRONG[t] if wrong else sample)
    elif t == 'choice':
        n = int(sample)
        if wrong: n = (n + 1) % f['nopt']
        pg.locator(base + ' input[type=radio][value="%d"]' % n).check()
    elif t == 'multi':
        vals = sample if not wrong else []
        for v in vals: pg.locator(base + ' input[type=checkbox][value="%s"]' % v).check()
        if wrong: pg.locator(base + ' input[type=checkbox]').first.check()
    elif t == 'custom':
        if f.get('win'):
            if wrong: plane_click(pg, base, f['win'], [[f['win']['xmin'], f['win']['ymin']]])
            elif KEYBOARD[0]: plane_type(pg, base, sample)
            else: plane_click(pg, base, f['win'], sample)
        elif f.get('nl'):
            if wrong:
                # click a different point, leaving the open/closed and direction buttons alone
                bad = f['nl']['lo'] if sample['x'] != f['nl']['lo'] else f['nl']['hi']
                numline_click(pg, base, f['nl'], {'x': bad, 'closed': False, 'dir': 'right'})
            elif KEYBOARD[0]: numline_type(pg, base, f['nl'], sample)
            else: numline_click(pg, base, f['nl'], sample)
        else:
            raise Exception('unknown custom widget')


def run_page(pg, name):
    global solved, wrong_checked
    errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto('http://127.0.0.1:%d/%s/%s?seed=%d' % (PORT, CLASS_NAME, name, 11))
    pg.wait_for_function('window.MAT && MAT.examples && MAT.examples.length > 0 || document.querySelectorAll("section.example").length === 0')
    keys = pg.eval_on_selector_all('section.example.interactive', 'els => els.map(e => e.dataset.key)')
    for key in keys:
        sec = 'section[data-key="%s"]' % key
        for rnd in range(rounds):
            KEYBOARD[0] = (rnd % 2 == 1)
            desc = pg.evaluate('''(key) => { const ex = MAT.examples.find(e => e.key === key); if (!ex.spec) return null;
                return ex.spec.parts.map(p => p.fields.map(f => ({type: f.type, nopt: (f.options || []).length, sample: MAT.sampleInput(f), win: f.win || null, nl: f.nl || null}))); }''', key)
            if desc is None:
                fails.append((name, key, 'no spec (generator failed?)')); break
            for pi, fields in enumerate(desc):
                part = '%s .part[data-part="%d"]' % (sec, pi)
                # 1. a wrong answer must not be accepted
                try:
                    for fi, f in enumerate(fields):
                        fill_field(pg, '%s *.field[data-field="%d"]' % (part, fi), f, f['sample'], wrong=True)
                    pg.locator(part + ' button.primary').click()
                    if pg.locator(part + '.correct').count():
                        # a few examples can legitimately accept a coincidence; report it
                        fails.append((name, key, 'wrong answer accepted in part %d (round %d)' % (pi, rnd)))
                    wrong_checked += 1
                    # clear everything before the right answer
                    pg.locator(part + ' .graphwidget button:has-text("Clear")').click() if pg.locator(part + ' .graphwidget button:has-text("Clear")').count() else None
                    # 2. the right answer must be accepted
                    for fi, f in enumerate(fields):
                        base = '%s *.field[data-field="%d"]' % (part, fi)
                        if f['type'] in TEXTY or f['type'] == 'multi':
                            if f['type'] == 'multi':
                                pg.locator(base + ' input[type=checkbox]:checked').evaluate_all('els => els.forEach(e => e.checked = false)')
                        if f['type'] == 'custom' and f.get('nl'):
                            pg.locator(base + ' .gw-controls button').first.evaluate('b => b.closest(".graphwidget").querySelector(".gw-msg")')  # no-op, keep state
                        fill_field(pg, base, f, f['sample'])
                    pg.locator(part + ' button.primary').click()
                    ok = pg.locator(part + '.correct').count() > 0
                    if not ok:
                        fb = pg.locator(part + ' .feedback').inner_text()
                        fails.append((name, key, 'part %d rejected the right answer: %s | %s' % (pi, json.dumps([f['sample'] for f in fields])[:120], fb[:100])))
                    else:
                        solved += 1
                except Exception as e:
                    fails.append((name, key, 'part %d exception: %s' % (pi, str(e).split('\n')[0][:150])))
            done = pg.locator(sec + '.done').count() > 0
            if not done and not any(f[1] == key for f in fails):
                fails.append((name, key, 'example not marked done after all parts correct'))
            # new numbers for the next round
            if rnd + 1 < rounds:
                pg.locator(sec + ' button:has-text("New numbers")').click()
    for e in errs:
        fails.append((name, '-', e[:200]))


try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pages = sorted(os.path.basename(f) for f in glob.glob(CLASS_DIR + '/[0-9][0-9]-*.html'))
        for name in pages:
            if only and only not in name: continue
            pg = b.new_page(viewport={'width': 1200, 'height': 900})
            t0 = time.time()
            n0, w0, f0 = solved, wrong_checked, len(fails)
            try:
                run_page(pg, name)
            except Exception as e:
                fails.append((name, '-', 'page exception: ' + str(e).split('\n')[0][:200]))
            print('%-40s solved %4d parts, %4d wrong-answer checks, %2d problems, %.0fs' % (name, solved - n0, wrong_checked - w0, len(fails) - f0, time.time() - t0), flush=True)
            pg.close()
        b.close()
finally:
    srv.terminate()
print('\nTOTAL: solved', solved, 'parts;', wrong_checked, 'wrong-answer checks;', len(fails), 'problems')
for f in fails[:60]: print('FAIL', f)
sys.exit(1 if fails else 0)
