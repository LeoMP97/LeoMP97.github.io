"""LaTeX (the subset used in the MAT040 notes) -> HTML.
Math is not rendered here: it is collected as placeholders and rendered by KaTeX in Node."""
import re, hashlib, html

FIG_MACROS = {'ineqline': 5, 'geoboard': 1, 'slopefig': 8, 'fracgrid': 3, 'fracpie': 2, 'ftree': 3}
FIG_ALT = {
    'ineqline': 'Number line graph of an inequality',
    'geoboard': 'Geoboard with a rubber band stretched between two pegs',
    'slopefig': 'Graph of a line with the rise and run marked',
    'fracgrid': 'Grid of squares with some of the squares shaded',
    'fracpie': 'Circle divided into equal slices with some slices shaded',
    'ftree': 'Factor tree',
    'tikzpicture': 'Diagram',
}
MATH_ENVS = ('align*', 'align', 'gather*', 'gather', 'equation*', 'equation', 'aligned', 'multline*', 'cases')


def match_brace(s, i, open_='{', close='}'):
    """s[i] == open_. Return index of the matching close."""
    depth = 0
    j = i
    while j < len(s):
        c = s[j]
        if c == '\\':
            j += 2
            continue
        if c == open_:
            depth += 1
        elif c == close:
            depth -= 1
            if depth == 0:
                return j
        j += 1
    raise ValueError('Unbalanced braces near: ' + s[i:i + 60])


def read_args(s, i, n):
    """Read n brace arguments starting at i (skipping spaces). Returns (args, end)."""
    args = []
    for _ in range(n):
        while i < len(s) and s[i] in ' \n':
            i += 1
        if s[i] != '{':
            raise ValueError('Expected { in args near ' + s[i - 20:i + 20])
        j = match_brace(s, i)
        args.append(s[i + 1:j])
        i = j + 1
    return args, i


def find_env_end(s, start, env):
    """start points just after \\begin{env}. Return (content_end, after_end) handling nesting of same env."""
    depth = 1
    pat = re.compile(r'\\(begin|end)\{' + re.escape(env) + r'\}')
    for m in pat.finditer(s, start):
        if m.group(1) == 'begin':
            depth += 1
        else:
            depth -= 1
            if depth == 0:
                return m.start(), m.end()
    raise ValueError('Unclosed environment ' + env)


def strip_comments(s):
    out = []
    for line in s.split('\n'):
        m = re.search(r'(?<!\\)%', line)
        out.append(line[:m.start()] if m else line)
    return '\n'.join(out)


class Converter:
    def __init__(self):
        self.math = []          # list of (tex, display)
        self.figs = {}          # hash -> tex
        self.fig_kinds = {}     # hash -> kind
        self.unknown = {}       # command -> count
        self.fig_labels = {}    # label -> number
        self.fig_counter = 0

    def prescan(self, text):
        """Number the figures of one chapter before converting, so a reference can come before its figure."""
        self.fig_counter = 0
        n = 0
        for m in re.finditer(r'\\begin\{figure\}.*?\\end\{figure\}', text, re.S):
            n += 1
            lab = re.search(r'\\label\{([^}]*)\}', m.group(0))
            if lab: self.fig_labels[lab.group(1)] = n

    # ---------------------------------------------------------------- math placeholders
    def add_math(self, tex, display):
        self.math.append((tex.strip(), display))
        return '\x00M%d\x00' % (len(self.math) - 1)

    def add_fig(self, tex, kind):
        h = hashlib.md5(tex.encode()).hexdigest()[:10]
        self.figs[h] = tex
        self.fig_kinds[h] = kind
        return '<img class="fig fig-%s" src="@@FIGDIR@@/fig-%s.svg" alt="%s" data-fig="%s">' % (kind, h, FIG_ALT.get(kind, 'Diagram'), h)

    # ---------------------------------------------------------------- inline
    def inline(self, s):
        """Convert inline LaTeX text to HTML (math becomes placeholders)."""
        out = []
        i = 0
        n = len(s)
        while i < n:
            c = s[i]
            if c == '$':
                if s[i:i + 2] == '$$':
                    j = s.index('$$', i + 2)
                    out.append(self.add_math(s[i + 2:j], True)); i = j + 2; continue
                j = i + 1
                while j < n:
                    if s[j] == '\\':
                        j += 2; continue
                    if s[j] == '$':
                        break
                    j += 1
                out.append(self.add_math(s[i + 1:j], False)); i = j + 1; continue
            if c == '\\':
                m = re.match(r'\\([a-zA-Z]+\*?)', s[i:])
                if not m:
                    nxt = s[i + 1] if i + 1 < n else ''
                    if nxt == '\\':
                        k = i + 2
                        mm = re.match(r'\[[^\]]*\]', s[k:])
                        if mm: k += mm.end()
                        out.append('<br>'); i = k; continue
                    if nxt in '%&$_#{}':
                        out.append(html.escape(nxt)); i += 2; continue
                    if nxt in ',;! ':
                        out.append('&thinsp;' if nxt in ',;!' else ' '); i += 2; continue
                    if nxt == '(':
                        j = s.index('\\)', i)
                        out.append(self.add_math(s[i + 2:j], False)); i = j + 2; continue
                    out.append(html.escape(nxt)); i += 2; continue
                name = m.group(1)
                i += m.end()
                if name in FIG_MACROS:
                    args, i = read_args(s, i, FIG_MACROS[name])
                    tex = '\\' + name + ''.join('{' + a + '}' for a in args)
                    out.append(self.add_fig(tex, name)); continue
                if name in ('textbf', 'textit', 'emph', 'underline', 'texttt', 'textsc', 'textsuperscript'):
                    args, i = read_args(s, i, 1)
                    tag = {'textbf': 'strong', 'textit': 'em', 'emph': 'em', 'underline': 'u', 'texttt': 'code', 'textsc': 'span', 'textsuperscript': 'sup'}[name]
                    out.append('<%s>%s</%s>' % (tag, self.inline(args[0]), tag)); continue
                if name == 'url':
                    args, i = read_args(s, i, 1)
                    out.append('<a href="%s">%s</a>' % (args[0], html.escape(args[0]))); continue
                if name == 'texorpdfstring':
                    args, i = read_args(s, i, 2)
                    out.append(self.inline(args[0])); continue
                if name == 'seesol':
                    args, i = read_args(s, i, 1)
                    out.append('@@SEESOL:%s@@' % args[0]); continue
                if name == 'ref':
                    args, i = read_args(s, i, 1)
                    out.append(str(self.fig_labels.get(args[0], '?'))); continue
                if name in ('label', 'hspace', 'hspace*', 'vspace', 'vspace*'):
                    args, i = read_args(s, i, 1)
                    if name.startswith('hspace'): out.append('&emsp;')
                    continue
                if name in ('quad', 'qquad'):
                    out.append('&emsp;' if name == 'quad' else '&emsp;&emsp;'); continue
                if name in ('noindent', 'phantomsection', 'centering', 'small', 'footnotesize', 'large', 'Large', 'scriptsize',
                            'normalsize', 'bigskip', 'medskip', 'smallskip', 'pagebreak', 'clearpage', 'newpage', 'hfill', 'relax'):
                    continue
                if name == 'ldots':
                    out.append('\u2026'); continue
                if name == 'checkmark':
                    out.append('\u2713'); continue
                if name == 'par':
                    out.append('\n\n'); continue
                self.unknown[name] = self.unknown.get(name, 0) + 1
                continue
            if c == '`' and s[i:i + 2] == '``':
                out.append('\u201c'); i += 2; continue
            if c == "'" and s[i:i + 2] == "''":
                out.append('\u201d'); i += 2; continue
            if c == '-' and s[i:i + 3] == '---':
                out.append('\u2014'); i += 3; continue
            if c == '-' and s[i:i + 2] == '--':
                out.append('\u2013'); i += 2; continue
            if c == '~':
                out.append('&nbsp;'); i += 1; continue
            if c in '<>&':
                out.append(html.escape(c)); i += 1; continue
            if c == '{' or c == '}':
                i += 1; continue
            if c == "'":
                out.append('\u2019'); i += 1; continue
            out.append(c); i += 1
        return ''.join(out)

    # ---------------------------------------------------------------- blocks
    def paragraphs(self, s):
        s = s.replace('\\par ', '\n\n').replace('\\par\n', '\n\n')
        chunks = re.split(r'\n\s*\n', s)
        out = []
        for ch in chunks:
            ch = ch.strip()
            if not ch:
                continue
            h = self.inline(ch)
            h = re.sub(r'^(<br>\s*)+', '', h)
            h = re.sub(r'(\s*<br>)+\s*$', '', h)
            h = h.strip()
            if not h:
                continue
            out.append('<p>%s</p>' % h)
        return '\n'.join(out)

    def blocks(self, s):
        """Convert a chunk containing environments, display math, and paragraphs."""
        s = strip_comments(s)
        out = []
        pos = 0
        tok = re.compile(r'\\begin\{([a-zA-Z*]+)\}(?:\[[^\]]*\])?|(?<!\\)\\\[|\\subsection\*?\{|\\subsubsection\*?\{|\\(?:clearpage|pagebreak|newpage)\b|\\renewcommand\{\\arraystretch\}\{[^}]*\}')
        while pos < len(s):
            m = tok.search(s, pos)
            if not m:
                out.append(self.paragraphs(s[pos:])); break
            out.append(self.paragraphs(s[pos:m.start()]))
            t = m.group(0)
            if t.startswith('\\begin'):
                env = m.group(1)
                opt = re.match(r'\\begin\{[a-zA-Z*]+\}(\[[^\]]*\])?', t).group(1)
                # tabular has a mandatory column spec right after \begin{tabular}
                cs = None
                after = m.end()
                if env in ('tabular',):
                    (cs,), after = read_args(s, after, 1)
                cend, aend = find_env_end(s, after, env)
                inner = s[after:cend]
                out.append(self.environment(env, inner, opt, cs))
                pos = aend
            elif t == '\\[':
                j = s.index('\\]', m.end())
                out.append('<div class="display">%s</div>' % self.add_math(s[m.end():j], True))
                pos = j + 2
            elif t.startswith('\\subsubsection'):
                j = match_brace(s, m.end() - 1)
                out.append('<h3>%s</h3>' % self.inline(s[m.end():j]))
                pos = j + 1
            elif t.startswith('\\subsection'):
                j = match_brace(s, m.end() - 1)
                out.append('<h2>%s</h2>' % self.inline(s[m.end():j]))
                pos = j + 1
            else:
                pos = m.end()
        return '\n'.join(x for x in out if x)

    def environment(self, env, inner, opt, cs):
        if env == 'keybox':
            return '<div class="keybox">%s</div>' % self.blocks(inner)
        if env == 'center':
            return '<div class="center">%s</div>' % self.blocks(inner)
        if env in MATH_ENVS:
            return '<div class="display">%s</div>' % self.add_math('\\begin{%s}%s\\end{%s}' % (env, inner, env), True)
        if env in ('itemize', 'enumerate'):
            return self.list_env(env, inner, opt)
        if env == 'tabular':
            return self.tabular(inner, cs)
        if env == 'tikzpicture':
            tex = '\\begin{tikzpicture}%s%s\\end{tikzpicture}' % (opt or '', inner)
            return '<div class="figure-inline">%s</div>' % self.add_fig(tex, 'tikzpicture')
        if env == 'figure':
            self.fig_counter += 1
            cap = re.search(r'\\caption\{', inner)
            caption = ''
            if cap:
                j = match_brace(inner, cap.end() - 1)
                caption = self.inline(inner[cap.end():j])
                lab = re.search(r'\\label\{([^}]*)\}', inner[j:])
                if lab: self.fig_labels[lab.group(1)] = self.fig_counter
                inner = inner[:cap.start()] + inner[j + 1:]
            return '<figure>%s<figcaption>Figure %d. %s</figcaption></figure>' % (self.blocks(inner), self.fig_counter, caption)
        self.unknown['env:' + env] = self.unknown.get('env:' + env, 0) + 1
        return self.blocks(inner)

    def list_env(self, env, inner, opt):
        parts = re.split(r'\\item\b', inner)
        head, items = parts[0], parts[1:]
        tag = 'ul' if env == 'itemize' else 'ol'
        attrs = ''
        if opt:
            if 'alph' in opt: attrs = ' type="a"'
            elif 'Alph' in opt: attrs = ' type="A"'
        lis = []
        for it in items:
            it = it.strip()
            lab = re.match(r'\[([^\]]*)\]', it)
            if lab: it = it[lab.end():]
            body = self.blocks(it)
            lis.append('<li>%s</li>' % body)
        cls = ' class="plain"' if opt and 'itemsep' in opt and 'label' not in opt else ''
        return '<%s%s%s>%s</%s>' % (tag, attrs, cls, ''.join(lis), tag)

    def tabular(self, inner, cs):
        # column spec -> alignment and vertical rules
        cols = []
        k = 0
        spec = cs
        bordl = False
        while k < len(spec):
            ch = spec[k]
            if ch == '|':
                if cols: cols[-1]['r'] = True
                else: bordl = True
                k += 1
            elif ch in 'clr':
                cols.append({'a': {'c': 'center', 'l': 'left', 'r': 'right'}[ch], 'r': False, 'l': bordl}); bordl = False; k += 1
            elif ch == 'p':
                k += 1
                j = match_brace(spec, k)
                cols.append({'a': 'left', 'r': False, 'l': bordl, 'p': True}); bordl = False; k = j + 1
            else:
                k += 1
        inner = re.sub(r'\\renewcommand\{\\arraystretch\}\{[^}]*\}', '', inner)
        rows = split_top(inner, '\\\\')
        html_rows = []
        pending_hline = False
        for r in rows:
            r = re.sub(r'^\s*\[[^\]]*\]', '', r)   # \\[4pt]
            hl = False
            while True:
                mm = re.match(r'\s*\\hline', r)
                if not mm: break
                hl = True; r = r[mm.end():]
            if not r.strip():
                if hl: pending_hline = True
                continue
            cells = split_top(r, '&')
            tds = []
            ci = 0
            for cell in cells:
                cell = cell.strip()
                span = 1
                align = None
                mc = re.match(r'\\multicolumn\{(\d+)\}\{([^}]*)\}\{', cell)
                if mc:
                    span = int(mc.group(1))
                    j = match_brace(cell, mc.end() - 1)
                    content = cell[mc.end():j]
                    al = 'center' if 'c' in mc.group(2) else ('right' if 'r' in mc.group(2) else 'left')
                    align = al
                else:
                    content = cell
                c = cols[ci] if ci < len(cols) else {'a': 'left', 'r': False, 'l': False}
                a = align or c['a']
                cls = []
                if c.get('r'): cls.append('br')
                if c.get('l'): cls.append('bl')
                tds.append('<td%s style="text-align:%s"%s>%s</td>' % (
                    (' colspan="%d"' % span) if span > 1 else '', a, (' class="%s"' % ' '.join(cls)) if cls else '', self.inline(content)))
                ci += span
            cls_tr = ' class="hl"' if (hl or pending_hline) else ''
            pending_hline = False
            html_rows.append('<tr%s>%s</tr>' % (cls_tr, ''.join(tds)))
        # rows above the first horizontal rule are column headers (empty header cells stay plain cells)
        first_hl = next((i for i, r in enumerate(html_rows) if r.startswith('<tr class="hl">')), 0)
        def as_th(m):
            span = m.group(1)
            return '<th scope="%s"%s%s%s>%s</th>' % ('colgroup' if span else 'col', span or '', m.group(2) or '', m.group(3) or '', m.group(4))
        for i in range(first_hl):
            html_rows[i] = re.sub(r'<td( colspan="\d+")?( style="[^"]*")?( class="[^"]*")?>(.+?)</td>', as_th, html_rows[i])
        return '<div class="tablewrap"><table class="nt">%s</table></div>' % ''.join(html_rows)


def split_top(s, sep):
    """Split on sep at brace depth 0, outside math ($...$)."""
    parts, cur, depth, i, inmath = [], [], 0, 0, False
    while i < len(s):
        c = s[i]
        if c == '\\':
            if s[i:i + len(sep)] == sep and sep == '\\\\' and depth == 0 and not inmath:
                parts.append(''.join(cur)); cur = []; i += 2; continue
            cur.append(s[i:i + 2]); i += 2; continue
        if c == '$':
            inmath = not inmath
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
        if sep != '\\\\' and c == sep and depth == 0 and not inmath:
            parts.append(''.join(cur)); cur = []; i += 1; continue
        cur.append(c); i += 1
    parts.append(''.join(cur))
    return parts
