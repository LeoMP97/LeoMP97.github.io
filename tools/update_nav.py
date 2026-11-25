#!/usr/bin/env python3
"""Keeps the top-bar navigation identical on every page of the site.

Edit the NAV list below (label, page), run `python3 tools/update_nav.py` from the top-level folder, and every page that
contains the two marker comments
    <!-- nav:start -->   and   <!-- nav:end -->
gets the brand link and menu rewritten, with the right relative links and aria-current on the page you are on.
You do not have to use this script: the menu is ordinary HTML and can be edited by hand in each page instead.
"""
import os, re, sys, html

SITE_NAME = 'Leonardo Pierre'
NAV = [                      # (label shown in the menu, page it opens)
    ('Home', 'index.html'),
    ('Teaching', 'teaching/index.html'),
    ('Research', 'research/index.html'),
    ('Projects', 'projects/index.html'),
    ('CV', 'cv/index.html'),
]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START, END = '<!-- nav:start -->', '<!-- nav:end -->'
SKIP_DIRS = {'tools', 'node_modules', '.git', 'assets'}      # mat040/ has its own top bar and no markers, so it is left alone


def block(page_rel):
    depth = page_rel.count('/')
    up = '../' * depth
    here_dir = os.path.dirname(page_rel)
    items = []
    for label, target in NAV:
        cur = ''
        if target == page_rel:
            cur = ' aria-current="page"'
        elif here_dir and os.path.dirname(target) == here_dir:
            cur = ' aria-current="true"'                    # another page inside the same section
        items.append('      <li><a href="%s%s"%s>%s</a></li>' % (up, target, cur, html.escape(label)))
    return ('<a class="brand" href="%sindex.html">%s</a>\n'
            '  <nav class="sitenav" aria-label="Main">\n    <ul>\n%s\n    </ul>\n  </nav>\n  ' % (up, html.escape(SITE_NAME), '\n'.join(items)))


def main():
    changed = 0
    for dp, dns, fns in os.walk(ROOT):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith('.')]
        for fn in fns:
            if not fn.endswith('.html'): continue
            path = os.path.join(dp, fn)
            src = open(path, encoding='utf-8').read()
            if START not in src or END not in src: continue
            rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
            new = re.sub(re.escape(START) + r'.*?' + re.escape(END),
                         lambda m: START + '\n  ' + block(rel) + END, src, count=1, flags=re.S)
            if new != src:
                open(path, 'w', encoding='utf-8').write(new); changed += 1
            print('nav ok  ', rel)
    print('updated %d page(s)' % changed)


if __name__ == '__main__':
    main()
