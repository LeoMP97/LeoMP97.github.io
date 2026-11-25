"""Alt text for the figures in the notes.

The figures that come from a macro in the notes (number lines, rise/run graphs, geoboards, fraction pictures,
factor trees) are described automatically from the macro's own arguments, so the description always matches the picture.
The one-off TikZ drawings are described by hand in TIKZ_ALT below, keyed by the figure's hash. If you edit one of those
drawings its hash changes, and build_site.py prints a warning until you add a new description here.
"""
import re
from texconv import match_brace


def plain(t):
    """TeX fragment -> plain text a screen reader reads sensibly: \\frac{3}{5} -> 3/5, -x -> −x, y=2x-1 -> y = 2x − 1."""
    t = t.replace('$', '').strip()
    arg = r'(\{[^{}]*\}|\d)'
    def fr(m):
        a, b = m.group(1).strip('{}'), m.group(2).strip('{}')
        return '(%s/%s)' % (a, b) if m.end() < len(t) and t[m.end():m.end() + 1].isalpha() else '%s/%s' % (a, b)
    t = re.sub(r'\\d?frac\s*' + arg + r'\s*' + arg, fr, t)
    for a, b in (('\\cdot', '·'), ('\\times', '×'), ('\\geq', '≥'), ('\\leq', '≤'), ('\\ge', '≥'), ('\\le', '≤'), ('\\infty', '∞')):
        t = t.replace(a, b)
    t = t.replace('{', '').replace('}', '').replace('\\', '')
    t = re.sub(r'(?<=[^\s=(+\-])\s*-\s*', ' − ', t)      # binary minus
    t = t.replace('-', '−')                                # leading minus
    t = re.sub(r'\s*=\s*', ' = ', t)
    t = re.sub(r'\s*\+\s*', ' + ', t)
    return re.sub(r'\s+', ' ', t).strip()


def num(v):
    v = v.strip()
    try:
        f = float(v)
        s = ('%g' % f)
    except ValueError:
        return plain(v)
    return s.replace('-', '−')


def args(tex, name, n):
    """The n brace-delimited arguments following \\name."""
    i = tex.index('\\' + name) + len(name) + 1
    out = []
    for _ in range(n):
        while i < len(tex) and tex[i] != '{': i += 1
        j = match_brace(tex, i)
        out.append(tex[i + 1:j]); i = j + 1
    return out


def pt(x, y):
    return '(%s, %s)' % (num(x), num(y))


def ineqline(tex):
    lo, hi, p, typ, label = args(tex, 'ineqline', 5)
    where = plain(label) if label.strip() else num(p)
    head = 'Number line from %s to %s' % (num(lo), num(hi))
    typ = int(typ)
    if typ == 5:
        return head + ', shaded in both directions with arrows at both ends: every number is included.'
    right = typ in (1, 2)
    closed = typ in (2, 4)
    rel = ('greater than' if right else 'less than') + (' or equal to' if closed else '')
    return '%s. A %s at %s with the line shaded to the %s: all numbers %s %s.' % (
        head, 'bracket' if closed else 'parenthesis', where, 'right' if right else 'left', rel, where)


def title_of(opts):
    i = opts.find('title=')
    if i < 0: return ''
    j = opts.index('{', i)
    return plain(opts[j + 1:match_brace(opts, j)])


def slopefig(tex):
    opts, x1, y1, x2, y2, fn, d1, d2 = args(tex, 'slopefig', 8)
    eq = title_of(opts)
    dy = float(y2) - float(y1)
    return ('Graph of %son a coordinate grid. The line passes through %s and %s. A red right triangle joins the two points: '
            'a horizontal run from %s to %s, then a vertical rise %s %s.') % (
        ('the line ' + eq + ' ') if eq else 'a line ', pt(x1, y1), pt(x2, y2), pt(x1, y1), pt(x2, y1),
        'up to' if dy > 0 else 'going down to', pt(x2, y2))


def geoboard(tex):
    paths = []
    for m in re.finditer(r'\\draw\[[^\]]*\]\s*((?:\(\s*-?\d+\s*,\s*-?\d+\s*\)\s*(?:--)?\s*)+);', tex):
        paths.append(re.findall(r'\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)', m.group(1)))
    parts = []
    for k, p in enumerate(paths):
        pts = ['peg ' + pt(x, y) for x, y in p]
        parts.append('%s orange rubber band from %s' % ('An' if k == 0 else 'Another', ' to '.join(pts)))
    s = 'Geoboard: a square board with a 5 by 5 grid of pegs, numbered 0 to 4 from the bottom left. ' + '. '.join(parts) + '.'
    if len(paths) == 2:
        s += ' Together the bands form a right triangle.'
    return s


def fracgrid(tex):
    r, c, s = [int(a) for a in args(tex, 'fracgrid', 3)]
    return 'Rectangle made of %d equal squares in %d row%s and %d column%s. %d of the squares %s shaded.' % (
        r * c, r, '' if r == 1 else 's', c, '' if c == 1 else 's', s, 'is' if s == 1 else 'are')


def fracpie(tex):
    n, s = [int(a) for a in args(tex, 'fracpie', 2)]
    return 'Circle cut into %d equal slices. %d of the slices %s shaded.' % (n, s, 'is' if s == 1 else 'are')


def ftree(tex):
    n, steps, _ = args(tex, 'ftree', 3)
    cur, out = n.strip(), []
    for item in steps.split(','):
        p, rest = item.strip().split('/')
        out.append('%s splits into %s and %s' % (cur, p, rest))
        cur = rest
    return 'Factor tree for %s: %s.' % (n.strip(), ', '.join(out))


TIKZ_ALT = {
    '60a9839ad1': 'Number line marked 0 through 6. A blue arrow pointing left is labeled “smaller” and a blue arrow pointing right is labeled “larger”: numbers get larger to the right and smaller to the left.',
    '7fb6d8d8d2': 'Number line marked with the whole numbers 0 through 7, with an arrowhead on the right end.',
    '3bb216b60a': 'Two perpendicular axes, one horizontal and one vertical, labeled “two dimensions”.',
    '988ce942d5': 'Three axes meeting at one point: one horizontal, one vertical, and one pointing down and to the left, labeled “three dimensions”.',
    'aa7240c60e': 'Number line from −5 to 5 with arrowheads on both ends. The side to the left of 0 is labeled “negative”, the side to the right is labeled “positive”, and 0 is labeled “origin”.',
    '1015d908ce': 'Number line from −3 to 3. A red double arrow from 0 to 2 and a blue double arrow from −2 to 0 are each labeled 2: both 2 and −2 are 2 units from zero.',
    '58935d4b38': 'Two shapes. A square with each side labeled s, with area s squared and perimeter 4s. A rectangle with length l and width w, with area l times w and perimeter 2l + 2w.',
    '850f857bba': 'A square cut into fractions. The right half is labeled 1/2. The left half is cut into a lower-left quarter labeled 1/4 and an upper part. The upper part is cut into a piece labeled 1/8 and a left strip split into two pieces each labeled 1/16.',
    'c236b2c211': 'Number line from 0 to 1 marked at 0, 1/4, 2/4, 3/4 and 1, with a brace over each fourth. Below it, four arrows start at 0 and reach 1/4, 2/4, 3/4 and 4/4, each one longer than the last.',
    'f25f7882c0': 'A triangle with base b along the bottom and a dashed vertical height h from the top corner down to the base, meeting it at a right angle.',
    'e544ac3760': 'Number line from −3 to 3 with a tick at every whole number and a tick halfway between, labeled −5/2, −3/2, −1/2, 1/2, 3/2 and 5/2.',
    '04347d73cc': 'Complementary angles. A horizontal ray and a vertical ray meet at a right angle. A third ray between them splits the right angle into angle B, next to the horizontal ray, and angle A, next to the vertical ray.',
    '2025d62e53': 'A rectangle with its length l marked along the bottom and its width w marked along the right side.',
    '4df3801164': 'Graph of speed against time, with x from 0 to 7 and y from 0 to 250. Points at (0, 0), (1, 72.7), (2, 129.9), (3, 162.8), (4, 192.2), (5, 212.4) and (6, 228.1) are joined by a smooth curve that rises steeply at first and then levels off.',
    '861474aa2c': 'Graph titled “Odd numbers” with points at (0, 0), (1, 1), (2, 3), (3, 5), (4, 7) and (5, 9). From x = 1 on, the points rise in a straight line.',
    'c0057d0408': 'Graph titled “Squares” with points at (0, 0), (1, 1), (2, 4), (3, 9), (4, 16) and (5, 25) joined by a smooth curve that bends upward, rising faster as x increases.',
    'ed4113fcc9': 'Coordinate grid from −1 to 5 on both axes. A red arrow runs right along the x-axis from (0, 0) to (2, 0), then a blue arrow runs straight up from (2, 0) to the plotted point (2, 3).',
    'c7327f7252': 'Coordinate plane with x and y axes from −3 to 3. The upper right region is labeled Quadrant I, the upper left Quadrant II, the lower left Quadrant III and the lower right Quadrant IV. The origin is marked where the axes cross.',
    'f267a5b0a6': 'Coordinate plane with four red points, one in each quadrant: (3, 4), (3, −4), (−3, 4) and (−3, −4).',
    'eb2499f0bf': 'Graph of y = 2x − 1: a blue line sloping up to the right through the plotted points (−3, −7), (−2, −5), (−1, −3), (0, −1), (1, 1), (2, 3) and (3, 5).',
    '46e7b53689': 'Graph of x + y = 5: a green line sloping down to the right through the plotted points (−3, 8), (−2, 7), (−1, 6), (0, 5), (1, 4), (2, 3) and (3, 2).',
    '52ceb24ff0': 'Graph of y = 3x − 1: a red line sloping steeply up to the right through the plotted points (−2, −7), (−1, −4), (0, −1), (1, 2), (2, 5) and (3, 8).',
    '36028c77dd': 'Graph of y = −(1/3)x + 2: a purple line sloping gently down to the right through the plotted points (−6, 4), (−3, 3), (0, 2), (3, 1) and (6, 0).',
    '18a0e01193': 'Graph of 3x − 2y = 6: a blue line sloping up to the right through the plotted points (−2, −6), (0, −3), (2, 0), (4, 3) and (6, 6).',
    'c76e57167e': 'Graph of y = (1/2)x: a green line through the origin, sloping up to the right, with plotted points at (−6, −3), (−4, −2), (−2, −1), (0, 0), (2, 1), (4, 2) and (6, 3).',
    '54b3721547': 'Graph of x = 3: a vertical blue line through the plotted points (3, −4), (3, −2), (3, 0), (3, 2) and (3, 4).',
    '021509e837': 'Graph of y = −2: a horizontal gray line through the plotted points (−4, −2), (−2, −2), (0, −2), (2, −2) and (4, −2).',
    'db3ba3f8e1': 'Graph of the line y = x + 1 sloping up to the right through the plotted points (−3, −2), (−2, −1), (−1, 0), (0, 1), (1, 2) and (2, 3). The points (0, 1) and (−1, 0) are labeled.',
    '5042cda18a': 'Four small arrows, each labeled with a kind of slope: a line rising to the right is labeled positive, a line falling to the right is labeled negative, a horizontal line is labeled zero, and a vertical line is labeled undefined.',
    '0ba4c1514e': 'Graph of y = (1/2)x + 3 through the plotted points (0, 3), (2, 4) and (4, 5). A red right triangle goes from (0, 3) right to (2, 3), labeled run = 2, then up to (2, 4), labeled rise = 1.',
}

MACRO_ALT = {'ineqline': ineqline, 'slopefig': slopefig, 'geoboard': geoboard, 'fracgrid': fracgrid, 'fracpie': fracpie, 'ftree': ftree}


def describe(kind, tex, h):
    """Returns (alt text, is_specific)."""
    if kind in MACRO_ALT:
        return MACRO_ALT[kind](tex), True
    if h in TIKZ_ALT:
        return TIKZ_ALT[h], True
    return 'Diagram', False
