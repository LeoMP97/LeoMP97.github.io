# MAT040 Beginning Algebra: interactive course notes

This folder is one class of the course-notes website (see the README one level up for hosting on GitHub Pages, adding classes, dark mode and the accessibility audit). It is plain HTML, CSS and JavaScript, made from the MAT040 teaching notes.

- 13 chapter pages plus a home page, with the math and figures from the notes.
- Every numbered example is a live problem. The numbers are chosen at random each time the page is opened (or when the student presses **New numbers**), and the answer is checked as soon as the student presses **Check** or **Enter**. Each problem has a worked solution that matches the student's own numbers.
- Chapter 7 has no numbered examples in the notes, so it has ten practice sets (Practice 1 to 10) instead.
- Graphing problems (plotting points, drawing a line, graphing an inequality on a number line) are answered by clicking on the graph.
- Every chapter ends with a "Worked-example videos" section, and each example can show its own video. You control both from one small file (see below).

## 1. Add your videos

Open `mat040/assets/js/videos.js` (on GitHub you can click the pencil icon to edit it in the browser). Add one line per video:

```js
window.MAT_VIDEOS = [
  { chapter: 7,  example: 'P2', title: 'Practice 2: distributing', url: 'https://www.youtube.com/watch?v=XXXXXXXXXXX' },
  { chapter: 10, example: 3,    title: 'Slope from two points',     url: 'https://vimeo.com/123456789', description: 'Optional note.' },
  { chapter: 9,                 title: 'Plotting points, overview', url: 'https://www.loom.com/share/abcdef123456' },
];
```

- `chapter` is the chapter number (1 to 13), as in the menu.
- `example` is optional. A video with an `example` appears behind a **Watch worked example** button on that example, and also in the chapter's video list at the bottom of the page. A video without `example` appears only in the chapter list. Chapter 7's practice sets are `'P1'` to `'P10'`, in quotes.
- `url` can be a YouTube, Vimeo, Loom or Google Drive share link, or a direct `.mp4` or `.webm` link. Anything else becomes a "Watch video" button that opens in a new tab. YouTube "Unlisted" videos work, and Google Drive files must be shared as "Anyone with the link".
- Because each student sees different numbers, the video player says that the video works a similar problem with different numbers. If you want a video to match exactly what students see, record it from a link with a fixed seed, for example `10-slope.html?seed=7`. That link always shows the same numbers.

The file has a comment block at the top that repeats these instructions.

## 2. What students can type

The home page lists the rules. In short: fractions as `3/4`, mixed numbers as `1 3/4`, decimals as `0.75`, exponents with `^` (`x^2`), `<=` and `>=` for ≤ and ≥, and `inf` for ∞. Equivalent answers are accepted, so `2/4` and `1/2` both count when the problem only asks for the value. Where the problem asks for a particular form (lowest terms, slope-intercept form, a mixed number, and so on), the checker says what is missing instead of just saying "wrong".

## 3. Changing things

| To change… | Edit |
| --- | --- |
| Which videos appear | `mat040/assets/js/videos.js` |
| Look and feel | `mat040/assets/css/style.css` (colours come from `assets/theme.css` at the top level) |
| The numbers, wording or solution steps of an example | `mat040/assets/js/problems/<chapter>.js`. Each example is one `MAT.def('chapter', N, function (R) { ... })` block. |
| The prose, definitions and figures | `mat040/tools/MAT040_notes.tex`, then rebuild (below). For a one-word fix you can also edit the `.html` file directly, but a rebuild will overwrite it. |

**Rebuilding the pages** from the notes (only needed after changing the `.tex` file): `python3 mat040/tools/build_site.py`. This needs Python 3 and Node.js. New figures also need `pdflatex` and `pdftocairo` (poppler). The 70 existing figures are cached in `mat040/assets/figures/`, so a rebuild without new figures needs neither. The script rewrites `mat040/index.html` and the 13 chapter pages (run it from the top-level folder). Sentences that point at the numbers of a specific example are reworded for the website in the `SITE_PATCHES` list at the top of `tools/build_site.py`.

## 4. Tests (optional)

```
node mat040/tools/tests/core.test.js              # the answer-parsing engine
node mat040/tools/tests/gen.test.js "" 300        # every example generator, 300 random seeds each
pip install playwright && playwright install chromium
python3 mat040/tools/tests/e2e.py "" 2            # solves every problem through the real UI in a headless browser
```

The generator test checks that each example accepts its own correct answer, rejects wrong answers, produces valid math, and never leaks an unformatted value into the text.

## Credits and licences

- Several chapters are adapted from OpenStax *Prealgebra 2e*, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The attribution appears at the bottom of the affected pages.
- Math is rendered with [KaTeX](https://katex.org) (MIT licence, copy in `mat040/assets/vendor/katex/LICENSE`), bundled in `mat040/assets/vendor/katex`, so the site makes no calls to outside servers other than your video embeds.
