#!/usr/bin/env python3
"""Build the static MAT040 site from the combined LaTeX notes."""
import re, os, sys, json, html, subprocess, shutil, hashlib, glob
import figalt
sys.path.insert(0, os.path.dirname(__file__))
from texconv import Converter, strip_comments

HERE = os.path.dirname(os.path.abspath(__file__))
MASTER = HERE + '/MAT040_notes.tex'      # the notes source the pages are built from
SITE = os.path.dirname(HERE)              # the website folder (this tools/ folder sits inside it)
BUILD = HERE + '/.build'                  # scratch files (safe to delete)
os.makedirs(BUILD, exist_ok=True)
FIGDIR = SITE + '/assets/figures'

SLUGS = {
    'numsets': '01-number-sets', 'arith': '02-arithmetic-review', 'div': '03-divisibility-tests', 'frac': '04-fractions',
    'dec': '05-decimals-and-percents', 'vars': '06-introduction-to-variables', 'lin1': '07-linear-equations-one-variable',
    'ineq': '08-linear-inequalities', 'lin2': '09-linear-equations-two-variables', 'slope': '10-slope',
    'slopeint': '11-slope-intercept-form', 'eqline': '12-equation-of-a-line', 'systems': '13-systems-of-equations',
}
BOOK_URL = {
    'Prealgebra': 'https://openstax.org/details/books/prealgebra-2e',
    'Elementary Algebra': 'https://openstax.org/details/books/elementary-algebra',
    'Elementary Algebra 2e': 'https://openstax.org/details/books/elementary-algebra-2e',
}

# ---------------------------------------------------------------------------- parse master
src = open(MASTER).read()

# Website-only rewording: sentences in the notes that point at the specific numbers of an example,
# which are now randomized. (The PDF/tex source keeps the original wording.)
SITE_PATCHES = [
    ('Using $(-3,7)$ and $(6,1)$ on the same line from Example 4 gives a rise of $-6$ and a run of $9$:',
     'For example, the line $y=-\\frac23x+5$ passes through $(-3,7)$ and $(6,1)$. These two points give a rise of $-6$ and a run of $9$:'),
    ('In Example 4 it is easiest to solve for $y$ in the first equation, because it has a coefficient of $1$. In Example 5 it is easiest to solve for $x$.',
     'When you have to solve for a variable first, choose one whose coefficient is $1$ or $-1$. That avoids fractions, so look for one before you start.'),
]
for _old, _new in SITE_PATCHES:
    assert _old in src, 'site patch no longer matches: ' + _old[:50]
    src = src.replace(_old, _new)
src = src.split('\\end{document}')[0]
chunks = re.split(r'\\def\\chp\{(\w+)\}', src)
chapters = []
pending_part = None
last_part = None
for i in range(1, len(chunks), 2):
    key, body = chunks[i], chunks[i + 1]
    pm = re.search(r'\\part\{([^}]*)\}', body)
    this_part = None
    if pm:
        # this \part belongs to the NEXT chapter
        next_part = pm.group(1)
        body = body[:pm.start()] + body[pm.end():]
    else:
        next_part = None
    # chapters preceded by a part heading
    if i == 1:
        this_part = re.search(r'\\part\{([^}]*)\}', chunks[0]).group(1) if '\\part{' in chunks[0] else None
    if pending_part: this_part = pending_part
    pending_part = next_part
    sm = re.search(r'\\source\{([^}]*)\}', body)
    book = sm.group(1) if sm else None
    title = re.search(r'\\section\{([^}]*)\}', body).group(1)
    body = body[body.index('\\section{'):]
    body = re.sub(r'\\section\{[^}]*\}\n', '', body, count=1)
    body = body.replace('\\clearpage', '').replace('\\lfoot{}', '')
    if this_part: last_part = this_part
    chapters.append({'key': key, 'title': title, 'book': book, 'part': last_part, 'body': body, 'slug': SLUGS[key], 'num': len(chapters) + 1})
print('chapters:', [(c['num'], c['key'], c['part']) for c in chapters])

# which examples have a generator?
GEN = set()
for f in glob.glob(SITE + '/assets/js/problems/*.js'):
    for m in re.finditer(r"MAT\.def\(\s*'(\w+)'\s*,\s*'?(\w+)'?", open(f).read()):
        GEN.add('%s.%s' % (m.group(1), m.group(2)))
print('generators:', len(GEN))

conv = Converter()


def split_solutions(body):
    marker = '\\subsection{Examples}'
    if marker not in body:
        return body, {}
    k = body.rindex(marker)
    main, sols_txt = body[:k], body[k + len(marker):]
    parts = re.split(r'\\solsec\{(\w+)\}', sols_txt)
    sols = {}
    for j in range(1, len(parts), 2):
        sols[parts[j]] = parts[j + 1].strip()
    return main, sols


def split_examples(main):
    """Return list of ('text', str) / ('example', n, statement_tex)."""
    lines = main.split('\n')
    segs, cur, i = [], [], 0
    block_start = re.compile(r'\s*(\\begin\{(center|enumerate)\}|\\\[)')

    def take_block(j):
        """take one environment/display block starting at line j; return end index"""
        depth = 0
        k = j
        mathopen = False
        while k < len(lines):
            l = lines[k]
            depth += len(re.findall(r'\\begin\{', l)) - len(re.findall(r'\\end\{', l))
            if re.search(r'(?<!\\)\\\[', l) and not re.search(r'(?<!\\)\\\]', l): mathopen = True
            if re.search(r'(?<!\\)\\\]', l): mathopen = False
            k += 1
            if depth == 0 and not mathopen:
                break
        return k

    while i < len(lines):
        L = lines[i]
        m = re.search(r'\\exbox\{(\w+)\}', L)
        if m and not L.strip().startswith('%'):
            n = m.group(1)
            if cur: segs.append(('text', '\n'.join(cur))); cur = []
            j, depth, mathopen, stmt = i, 0, False, []
            while j < len(lines):
                l = lines[j]
                if l.strip() == '' and depth == 0 and not mathopen:
                    break
                if j > i and '\\exbox{' in l and depth == 0 and not mathopen:
                    break
                depth += len(re.findall(r'\\begin\{', l)) - len(re.findall(r'\\end\{', l))
                if re.search(r'(?<!\\)\\\[', l) and not re.search(r'(?<!\\)\\\]', l): mathopen = True
                if re.search(r'(?<!\\)\\\]', l): mathopen = False
                stmt.append(l); j += 1
            # absorb one following block (separated by blank lines)
            k = j
            while k < len(lines) and lines[k].strip() == '':
                k += 1
            if k < len(lines) and block_start.match(lines[k]):
                e = take_block(k)
                stmt.extend(lines[j:e])
                j = e
            segs.append(('example', n, '\n'.join(stmt)))
            i = j
            continue
        cur.append(L)
        i += 1
    if cur: segs.append(('text', '\n'.join(cur)))
    return segs


def clean_statement(stmt, n):
    stmt = re.sub(r'\\exbox\{%s\}' % re.escape(n), '', stmt)
    stmt = re.sub(r'\\seesol\{%s\}(\\\\)?' % re.escape(n), '', stmt)
    return stmt.strip()


def slugify(t, used):
    s = re.sub(r'<[^>]+>', '', t)
    s = re.sub(r'\x00M\d+\x00', '', s)
    s = re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-') or 'section'
    base, k = s, 2
    while s in used:
        s = '%s-%d' % (base, k); k += 1
    used.add(s)
    return s


# Chapters whose notes have no numbered examples get randomized practice sets. Each entry puts the
# listed sets just before the subsection with that title ('' = at the end of the chapter).
PRACTICE = {
    'lin1': [('Evaluating Variable Expressions', ['P1']),
             ('The Addition Property of Equality', ['P2', 'P3']),
             ('The Multiplication Property of Equality', ['P4', 'P5']),
             ('Equations Containing Decimals', ['P6', 'P7']),
             ('Applications', ['P8']),
             ('Evaluating Formulas', ['P9']),
             ('', ['P10'])],
}


def add_practice_markers(ch, main):
    for title, keys in PRACTICE.get(ch['key'], []):
        marker = ''.join('\\practice{%s}\n' % k for k in keys if '%s.%s' % (ch['key'], k) in GEN)
        if not marker: continue
        if title:
            tag = '\\subsection{%s}' % title
            assert tag in main, tag
            main = main.replace(tag, marker + tag, 1)
        else:
            main = main.rstrip() + '\n' + marker
    return main


def practice_html(ch, n):
    key = '%s.%s' % (ch['key'], n)
    ch.setdefault('practice', []).append(n)
    return ('<section class="example practice has-generator" id="ex-%s-%s" data-key="%s" data-n="%s">'
            '<header class="ex-head"><span class="ex-label">Practice %s</span></header>'
            '<div class="ex-body"><noscript><p>This practice problem needs JavaScript.</p></noscript></div>'
            '<div class="ex-video" hidden></div></section>') % (ch['key'], n, key, n, n[1:])


def render_chapter(ch):
    main, sols = split_solutions(ch['body'])
    main = add_practice_markers(ch, main)
    conv.prescan(main)
    segs = split_examples(main)
    out = []
    ch['examples'] = []
    for seg in segs:
        if seg[0] == 'text':
            txt = seg[1]
            # the review-problems block with a worked-solutions panel (fractions)
            if '\\seesol{R}' in txt and 'R' in sols:
                a = txt.index('\\begin{enumerate}[label=\\arabic*.]')
                out.append(conv.blocks(txt[:a]))
                out.append(example_html(ch, 'R', txt[a:], sols['R'], 'Review Problems'))
                continue
            for k, piece in enumerate(re.split(r'\\practice\{(\w+)\}', txt)):
                if k % 2 == 0:
                    if piece.strip(): out.append(conv.blocks(piece))
                else:
                    out.append(practice_html(ch, piece))
        else:
            _, n, stmt = seg
            ch['examples'].append(n)
            out.append(example_html(ch, n, clean_statement(stmt, n), sols.get(n, '')))
    return '\n'.join(out)


def example_html(ch, n, stmt_tex, sol_tex, label=None):
    key = '%s.%s' % (ch['key'], n)
    stmt_tex = re.sub(r'\\seesol\{R\}', '', stmt_tex)
    body = conv.blocks(stmt_tex)
    sol = conv.blocks(sol_tex) if sol_tex else '<p>(No worked solution has been written for this example yet.)</p>'
    label = label or 'Example %s' % n
    interactive = key in GEN
    return ('<section class="example%s" id="ex-%s-%s" data-key="%s" data-n="%s">'
            '<header class="ex-head"><span class="ex-label">%s</span></header>'
            '<div class="ex-body">%s</div><div class="ex-video" hidden></div>'
            '<footer class="ex-foot"><button type="button" class="btn ghost small show-solution">Show worked solution</button>'
            '<div class="solution">%s</div></footer></section>') % (' has-generator' if interactive else '', ch['key'], n, key, n, label, body, sol)


# ---------------------------------------------------------------------------- run conversion
for ch in chapters:
    ch['html'] = render_chapter(ch)
print('unknown commands:', conv.unknown)
print('math items:', len(conv.math), ' figures:', len(conv.figs))

# ---------------------------------------------------------------------------- math rendering
json.dump([{'tex': t, 'display': d} for t, d in conv.math], open(BUILD + '/math.json', 'w'))
r = subprocess.run(['node', HERE + '/render_math.js', BUILD + '/math.json', BUILD + '/math_out.json'], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip()[:500])
math_out = json.load(open(BUILD + '/math_out.json'))
bad = [m for m in math_out if 'err' in m]
for b in bad[:30]:
    print('KATEX ERROR:', b['err'][:160], '|', b['tex'][:100].replace('\n', ' '))
if bad:
    sys.exit('math errors: %d' % len(bad))


def fill_math(h):
    return re.sub(r'\x00M(\d+)\x00', lambda m: math_out[int(m.group(1))]['html'], h)


# ---------------------------------------------------------------------------- figures -> SVG
os.makedirs(FIGDIR, exist_ok=True)
FIG_PREAMBLE = None


def fig_preamble():
    t = open(MASTER).read().split('\\begin{document}')[0]
    t = t.split('\\documentclass[letter]{article}')[1]
    keep = []
    skip = ('fancyhdr', 'pagestyle', 'lhead', 'rhead', 'cfoot', 'lfoot', 'rfoot', 'sectionmark', 'subsectionmark', 'setcounter{tocdepth}',
            '\\title', '\\author', '\\date', 'headheight', 'parskip', 'parindent', 'hyperref', 'colorlinks', 'linkcolor', 'urlcolor', 'citecolor',
            '\\newcommand{\\source}', 'solsec', 'seesol', 'exbox', 'keybox', 'keyboxsave', '\\newcommand{\\chp}')
    lines = t.split('\n')
    i = 0
    out = []
    # drop the hyperref option block \usepackage[ ... ]{hyperref}
    txt = t
    txt = re.sub(r'\\usepackage\[\s*colorlinks.*?\]\{hyperref\}', '', txt, flags=re.S)
    txt = re.sub(r'\\newsavebox\{\\keyboxsave\}.*?\\newcommand\{\\exbox\}\[1\]\{[^\n]*\}\n', '', txt, flags=re.S)
    for l in txt.split('\n'):
        if any(s in l for s in skip): continue
        out.append(l)
    return '\n'.join(out)


def compile_figs():
    pre = fig_preamble()
    todo = []
    for h, tex in conv.figs.items():
        svg = '%s/fig-%s.svg' % (FIGDIR, h)
        if not os.path.exists(svg):
            todo.append((h, tex))
    print('figures to compile:', len(todo))
    wd = BUILD + '/figs'
    os.makedirs(wd, exist_ok=True)
    procs = []
    for h, tex in todo:
        doc = '\\documentclass[border=3pt]{standalone}\n' + pre + '\n\\begin{document}\n' + tex + '\n\\end{document}\n'
        open('%s/fig-%s.tex' % (wd, h), 'w').write(doc)
    # compile 2 at a time
    import concurrent.futures as cf

    def one(h):
        r = subprocess.run(['pdflatex', '-interaction=nonstopmode', '-halt-on-error', 'fig-%s.tex' % h], cwd=wd, capture_output=True, text=True)
        if r.returncode != 0:
            i = r.stdout.find('\n!')
            return h, 'ERR ' + r.stdout[i:i + 400]
        r2 = subprocess.run(['pdftocairo', '-svg', 'fig-%s.pdf' % h, 'fig-%s.svg' % h], cwd=wd, capture_output=True, text=True)
        if r2.returncode != 0: return h, 'ERR pdftocairo ' + r2.stderr
        shutil.copy('%s/fig-%s.svg' % (wd, h), '%s/fig-%s.svg' % (FIGDIR, h))
        return h, 'ok'
    errs = 0
    with cf.ThreadPoolExecutor(2) as ex:
        for h, st in ex.map(one, [h for h, _ in todo]):
            if st != 'ok':
                errs += 1
                print('FIG', h, st, conv.figs[h][:120].replace('\n', ' '))
    print('figure errors:', errs)
    return errs


if '--no-figs' not in sys.argv:
    if compile_figs():
        sys.exit('figure errors')


def strengthen_figs():
    """The shaded parts of the fraction pictures are drawn in a pale grey (about 1.7:1 against white). WCAG 1.4.11 asks for 3:1
    on graphics you need to understand the content, so darken it here. Done on the SVG files (not the .tex) so the PDF notes are untouched."""
    n = 0
    for f in glob.glob(FIGDIR + '/fig-*.svg'):
        s = open(f).read()
        t = s.replace('rgb(77.49939%, 77.49939%, 77.49939%)', 'rgb(52%, 52%, 52%)')
        if t != s:
            open(f, 'w').write(t); n += 1
    print('figures with darker shading:', n)


strengthen_figs()


def svg_size(h):
    s = open('%s/fig-%s.svg' % (FIGDIR, h)).read(2000)
    m = re.search(r'width="([\d.]+)(?:pt|px)?" height="([\d.]+)(?:pt|px)?"', s)
    if not m: return None
    return float(m.group(1)), float(m.group(2))


# how much bigger than the drawing's natural size each kind of figure is shown (never wider than MAX_FIG_W px)
FIG_SCALE = {'fracgrid': 3.0, 'fracpie': 2.8, 'ftree': 2.2, 'ineqline': 2.0, 'geoboard': 2.2, 'slopefig': 2.2, 'tikzpicture': 2.0}
MAX_FIG_W = 640
missing_alt = []


def fix_figs(h):
    def rep(m):
        fh, kind = m.group(2), m.group(1)
        tag = m.group(0)
        alt, ok = figalt.describe(conv.fig_kinds[fh], conv.figs[fh], fh)
        if not ok and fh not in missing_alt: missing_alt.append(fh)
        tag = re.sub(r' alt="[^"]*"', ' alt="%s"' % html.escape(alt, quote=True), tag, count=1)
        sz = svg_size(fh) if os.path.exists('%s/fig-%s.svg' % (FIGDIR, fh)) else None
        if sz:
            k = min(FIG_SCALE.get(kind, 2.0), MAX_FIG_W / sz[0])
            tag = tag.replace('<img ', '<img width="%d" height="%d" ' % (round(sz[0] * k), round(sz[1] * k)), 1)
        return tag
    h = re.sub(r'<img class="fig fig-(\w+)" src="@@FIGDIR@@/fig-(\w+)\.svg"[^>]*>', rep, h)
    return h.replace('@@FIGDIR@@', 'assets/figures')


# ---------------------------------------------------------------------------- pages
def see_links(h, ch):
    return re.sub(r'@@SEESOL:(\w+)@@', lambda m: '<a href="#ex-%s-%s">Example %s</a>' % (ch['key'], m.group(1), m.group(1)), h)


def add_heading_ids(h):
    used = set()
    toc = []

    def rep(m):
        tag, inner = m.group(1), m.group(2)
        sid = slugify(inner, used)
        if tag == 'h2':
            toc.append((sid, re.sub(r'<[^>]+>', '', inner)))
        return '<%s id="%s">%s</%s>' % (tag, sid, inner, tag)
    h = re.sub(r'<(h2|h3)>(.*?)</\1>', rep, h, flags=re.S)
    return h, toc


def sidebar(cur):
    s = ['<nav class="sidebar" id="sidebar" aria-label="Chapters"><a class="all-classes" href="../teaching/index.html">&larr; All classes</a><a class="all-classes" href="../index.html">&larr; Home page</a>'
         '<a class="home-link%s" href="index.html"%s>MAT040 Beginning Algebra</a>' % (
             ' current' if cur is None else '', ' aria-current="page"' if cur is None else '')]
    part = None
    for c in chapters:
        if c['part'] and c['part'] != part:
            part = c['part']
            s.append('<div class="part-title">%s</div>' % html.escape(part))
        is_cur = c is cur
        s.append('<a%s href="%s.html"%s><span class="num">%d</span> %s</a>' % (
            ' class="current"' if is_cur else '', c['slug'], ' aria-current="page"' if is_cur else '', c['num'], html.escape(c['title'])))
        if is_cur:
            s.append('<div class="onpage" role="group" aria-label="On this page">' + ''.join('<a href="#%s">%s</a>' % (sid, html.escape(t)) for sid, t in c['toc']) + '<a href="#videos">Worked-example videos</a></div>')
    s.append('</nav>')
    return '\n'.join(s)


PAGE = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} &middot; MAT040 Beginning Algebra</title>
<meta name="description" content="{desc}">
<meta name="color-scheme" content="light dark">
<script src="../assets/theme.js"></script>
<link rel="stylesheet" href="../assets/theme.css">
<link rel="stylesheet" href="assets/vendor/katex/katex.min.css">
<link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
<a class="skip" href="#main">Skip to main content</a>
<header class="topbar">
  <button type="button" class="menu-btn" id="menu-btn" aria-label="Chapter menu" aria-expanded="false" aria-controls="sidebar"><span aria-hidden="true">&#9776;</span></button>
  <a class="brand" href="index.html">MAT040 <span>Beginning Algebra</span></a>
  <a class="top-link" href="../teaching/index.html">All classes</a>
  {score}
  <button type="button" class="theme-btn" id="theme-toggle" role="switch" aria-checked="false" hidden>
    <svg class="moon" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
    <span class="label">Dark mode</span>
    <span class="switch" aria-hidden="true"></span>
  </button>
</header>
<div class="layout">
{sidebar}
<main id="main">
{content}
</main>
</div>
<script src="assets/js/menu.js"></script>
{scripts}
</body>
</html>
'''


def scripts_for(key):
    s = ['assets/vendor/katex/katex.min.js', 'assets/js/core.js', 'assets/js/graphs.js', 'assets/js/helpers.js']
    if key and os.path.exists('%s/assets/js/problems/%s.js' % (SITE, key)):
        s.append('assets/js/problems/%s.js' % key)
    s += ['assets/js/videos.js', 'assets/js/engine.js']
    return '\n'.join('<script src="%s"></script>' % x for x in s)


def chapter_page(i, ch):
    h = fill_math(ch['html'])
    h = fix_figs(h)
    h = see_links(h, ch)
    h, toc = add_heading_ids(h)
    ch['toc'] = toc
    prev = chapters[i - 1] if i > 0 else None
    nxt = chapters[i + 1] if i + 1 < len(chapters) else None
    attrib = ''
    if ch['book']:
        attrib = ('<p class="attrib">Adapted from OpenStax <a href="%s"><em>%s</em></a>, licensed under '
                  '<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.</p>') % (BOOK_URL[ch['book']], ch['book'])
    head = '<p class="eyebrow">%s &middot; Chapter %d</p><h1>%s</h1>' % (html.escape(ch['part'] or ''), ch['num'], html.escape(ch['title']))
    videos = ('<section class="videos" id="videos" data-chapter="%s"><h2>Worked-example videos</h2>'
              '<div class="videos-body"></div></section>') % ch['key']
    pager = '<nav class="pager">%s%s</nav>' % (
        '<a class="prev" href="%s.html">&larr; %s</a>' % (prev['slug'], html.escape(prev['title'])) if prev else '<span></span>',
        '<a class="next" href="%s.html">%s &rarr;</a>' % (nxt['slug'], html.escape(nxt['title'])) if nxt else '<span></span>')
    n_inter = sum(1 for n in ch['examples'] if '%s.%s' % (ch['key'], n) in GEN) + len(ch.get('practice', []))
    score = '<div class="score" role="status"><span id="score"></span><div class="bar" aria-hidden="true"><div id="scorebar"></div></div></div>' if n_inter else '<span class="spacer"></span>'
    intro = ''
    if n_inter:
        intro = ('<p class="howto">The %s below are interactive: the numbers change every time you load the page. '
                 'Type your answer, press <kbd>Enter</kbd> or <em>Check</em>, and use <em>New numbers</em> to practice again.</p>') % ('practice sets' if ch.get('practice') and not ch['examples'] else 'numbered examples')
    content = head + intro + '\n' + h + '\n' + videos + attrib + pager
    return PAGE.format(title=html.escape(ch['title']), desc=html.escape('MAT040 Beginning Algebra notes: ' + ch['title']),
                       score=score, sidebar='@@SIDEBAR@@', content=content, scripts=scripts_for(ch['key']))


pages = []
for i, ch in enumerate(chapters):
    pages.append(chapter_page(i, ch))
for ch, page in zip(chapters, pages):
    page = page.replace('@@SIDEBAR@@', sidebar(ch))
    open('%s/%s.html' % (SITE, ch['slug']), 'w').write(page)

# index page
parts_html = []
part = None
for c in chapters:
    if c['part'] != part:
        if part is not None: parts_html.append('</ol></section>')
        part = c['part']
        parts_html.append('<section class="chapter-group"><h2>%s</h2><ol class="chapter-list" start="%d">' % (html.escape(part or ''), c['num']))
    n_inter = sum(1 for n in c['examples'] if '%s.%s' % (c['key'], n) in GEN)
    n_prac = len(c.get('practice', []))
    meta = ('%d interactive example%s' % (n_inter, '' if n_inter == 1 else 's')) if n_inter else ''
    if n_prac: meta = (meta + ' + ' if meta else '') + '%d practice set%s' % (n_prac, '' if n_prac == 1 else 's')
    parts_html.append('<li><a href="%s.html"><strong>%s</strong></a><span class="meta">%s</span></li>' % (
        c['slug'], html.escape(c['title']), meta))
parts_html.append('</ol></section>')
index = PAGE.format(title='Contents', desc='MAT040 Beginning Algebra: interactive course notes', score='<span class="spacer"></span>', sidebar='@@SIDEBAR@@',
                    content=('<h1>MAT040 Beginning Algebra</h1><p class="lead">Course notes by Leonardo Pierre, with interactive examples. '
                             'Every numbered example gives you new numbers each time you open the page, and checks your answer as soon as you submit it.</p>'
                             '<div class="howto-box"><h2>How the examples work</h2><ul>'
                             '<li>Type your answer in the box and press <kbd>Enter</kbd> or the <em>Check</em> button.</li>'
                             '<li>Fractions can be typed like <code>3/4</code>, mixed numbers like <code>1 3/4</code>, and decimals like <code>0.75</code>.</li>'
                             '<li>Use <code>^</code> for exponents (<code>x^2</code>), and <code>&lt;=</code>, <code>&gt;=</code>, <code>inf</code> for &le;, &ge;, &infin;.</li>'
                             '<li>Stuck? <em>Show worked solution</em> explains the steps, and <em>New numbers</em> gives you a fresh version of the same problem.</li>'
                             '<li>Each chapter ends with a section for worked-example videos.</li></ul></div>'
                             + '\n'.join(parts_html)), scripts='')
index = index.replace('@@SIDEBAR@@', sidebar(None))
index = index.replace('<script src="assets/js/menu.js"></script>\n', '<script src="assets/js/menu.js"></script>')
open(SITE + '/index.html', 'w').write(index)

json.dump({h: {'kind': conv.fig_kinds[h], 'tex': t} for h, t in conv.figs.items()}, open(BUILD + '/figs_dump.json', 'w'), indent=1)
json.dump([{'key': c['key'], 'slug': c['slug'], 'title': c['title'], 'examples': c['examples']} for c in chapters], open(BUILD + '/chapters.json', 'w'), indent=1)
print('built', len(chapters), 'chapter pages')
for _h in missing_alt: print('WARNING: figure %s has no description yet: add it to TIKZ_ALT in tools/figalt.py' % _h)
