/* Chapter 10: Slope */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd;
  function fr(n, d) { return '\\dfrac{' + n + '}{' + d + '}'; }
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function coprime(a, b) { return gcd(Math.abs(a), Math.abs(b)) === 1; }
  function slopeField(m, o) { var f = H.num(m, { label: 'slope', width: 7, placeholder: 'e.g. 3/4' }); if (o) for (var k in o) f[k] = o[k]; return f; }

  // ---- geoboards (1, 2)
  function geoboard(R, sign) {
    var run, rise;
    do { run = R.int(1, 4); rise = R.int(1, 4); } while (run === 1 && rise === 1 && R.bool(0.7));
    var x1 = R.int(0, 4 - run), x2 = x1 + run, y1, y2;
    if (sign > 0) { y1 = R.int(0, 4 - rise); y2 = y1 + rise; } else { y1 = R.int(rise, 4); y2 = y1 - rise; }
    var m = Q(sign * rise, run);
    var red = (gcd(rise, run) > 1 || sign < 0) ? '=' + D(m) : '';
    var solution = sign > 0
      ? 'Use the definition of slope, $m=\\dfrac{\\text{rise}}{\\text{run}}$. Start at the left peg and stretch the band up and to the right. The rise is $' + rise + '$ and the run is $' + run + '$, so $$m=' + fr(rise, run) + red + '.$$'
      : 'Start at the left peg. This time the band goes down to reach the peg on the right, so the rise is negative. The rise is $-' + rise + '$ and the run is $' + run + '$: $$m=' + fr('-' + rise, run) + red + '.$$';
    return {
      instr: 'What is the slope of the line on the geoboard?',
      figure: MAT.svg.geoboard(x1, y1, x2, y2),
      hint: 'Enter your answer as a fraction in lowest terms, like <code>3/4</code> or <code>-1/2</code>.',
      parts: [H.part('', '', slopeField(m), solution)]
    };
  }
  MAT.def('slope', 1, function (R) { return geoboard(R, 1); });
  MAT.def('slope', 2, function (R) { return geoboard(R, -1); });

  // ---- slope from a graph (3, 4, 5)
  function winFor(pts) {
    var xs = pts.map(function (p) { return p[0]; }).concat([0]), ys = pts.map(function (p) { return p[1]; }).concat([0]);
    var w = { xmin: Math.min.apply(null, xs) - 1, xmax: Math.max.apply(null, xs) + 1, ymin: Math.min.apply(null, ys) - 1, ymax: Math.max.apply(null, ys) + 1 };
    while (w.xmax - w.xmin < 6) { w.xmin--; w.xmax++; }
    while (w.ymax - w.ymin < 6) { w.ymin--; w.ymax++; }
    return w;
  }
  function slopeFig(p1, p2, triangle) {
    var w = winFor([p1, p2]), m = (p2[1] - p1[1]) / (p2[0] - p1[0]);
    var left = p1[0] < p2[0] ? p1 : p2, right = left === p1 ? p2 : p1;
    var o = { xmin: w.xmin, xmax: w.xmax, ymin: w.ymin, ymax: w.ymax, step: 1,
      lines: [{ m: m, b: p1[1] - m * p1[0] }],
      points: [{ x: left[0], y: left[1], label: '(' + left[0] + ', ' + left[1] + ')', pos: m > 0 ? 'dr' : 'ur' },
               { x: right[0], y: right[1], label: '(' + right[0] + ', ' + right[1] + ')', pos: m > 0 ? 'ul' : 'dl' }] };
    if (triangle) o.slope = { x1: left[0], y1: left[1], x2: right[0], y2: right[1] };
    return MAT.svg.plane(o);
  }
  function graphSlope(R, kind) {
    var rise, run;
    do { run = R.int(2, 6); rise = R.int(1, 5); } while (!coprime(rise, run));
    if (kind === 'neg') rise = -rise;
    var x1, y1;
    if (kind === 'general') { x1 = R.int(1, 3); y1 = R.int(1, 4); if (rise < 0) y1 += 4; }
    else { x1 = 0; y1 = R.int(-3, 4); if (rise < 0 && y1 < 1) y1 = R.int(1, 5); }
    var p1 = [x1, y1], p2 = [x1 + run, y1 + rise];
    var m = Q(rise, run);
    var pt = function (p) { return '(' + p[0] + ',' + p[1] + ')'; };
    var risePhrase = rise > 0 ? '(up ' + rise + ' units)' : '(down ' + (-rise) + ', so negative)';
    var sol = '$$\\begin{aligned}\\text{rise}&=' + rise + '&&\\text{' + risePhrase + '}\\\\\\text{run}&=' + run + '\\\\ m&=\\frac{\\text{rise}}{\\text{run}}=' + D(m) + '\\end{aligned}$$'
      + 'The slope is ' + (rise > 0 ? 'positive since the line slants upward' : 'negative since the line slants downward') + ' from left to right.'
      + '<div class="ex-figure">' + slopeFig(p1, p2, true) + '</div>';
    return {
      instr: 'Find the slope of the line through $' + pt(p1) + '$ and $' + pt(p2) + '$ shown below.',
      figure: slopeFig(p1, p2, false),
      hint: 'Count the rise (up or down) and the run (to the right) between the two points. Enter the slope as a fraction in lowest terms.',
      parts: [H.part('', '', slopeField(m), sol)]
    };
  }
  MAT.def('slope', 3, function (R) { return graphSlope(R, 'pos'); });
  MAT.def('slope', 4, function (R) { return graphSlope(R, 'neg'); });
  MAT.def('slope', 5, function (R) { return graphSlope(R, 'general'); });

  // ---- 6: vertical and horizontal lines
  var UNDEF = ['undefined', 'undef', 'no slope', 'not defined', 'does not exist', 'dne', 'is undefined', 'slope is undefined', 'undefined slope'];
  MAT.def('slope', 6, function (R) {
    var kinds = R.shuffle(['v', 'h', R.pick(['v', 'h'])]);
    var A = R.nonzero(-9, 9), used = {};
    return {
      instr: 'Find the slope of each line.',
      hint: 'If the slope does not exist, type <code>undefined</code>.',
      parts: kinds.map(function (k, i) {
        var a; do { a = R.nonzero(-9, 9); } while (used[k + a]); used[k + a] = 1;
        if (k === 'v') return H.part(H.lab(i), '$x=' + a + '$', H.text(UNDEF, { width: 10, label: 'slope', aria: 'slope' }), '$x=' + a + '$ is a vertical line, so its slope is $\\textbf{undefined}$.');
        return H.part(H.lab(i), '$y=' + a + '$', H.text(['0', 'zero'], { width: 10, label: 'slope', aria: 'slope' }), '$y=' + a + '$ is a horizontal line, so its slope is $\\mathbf{0}$.');
      })
    };
  });

  // ---- 7-10: slope between two points
  function twoPoints(p1, p2) {
    var x1 = p1[0], y1 = p1[1], x2 = p2[0], y2 = p2[1], n = y2 - y1, d = x2 - x1, m = Q(n, d);
    var sub = function (a, b) { return a + '-' + (b < 0 ? '(' + b + ')' : b); };
    var simp = function (a, b) { return b < 0 ? a + '+' + (-b) : a + '-' + b; };
    var tex = 'm=\\frac{y_2-y_1}{x_2-x_1}=\\frac{' + sub(y2, y1) + '}{' + sub(x2, x1) + '}';
    if (y1 < 0 || x1 < 0) tex += '=\\frac{' + (y1 < 0 ? simp(y2, y1) : sub(y2, y1)) + '}{' + (x1 < 0 ? simp(x2, x1) : sub(x2, x1)) + '}';
    var s3 = '\\frac{' + n + '}{' + d + '}';
    tex += '=' + s3;
    if (m.tex() !== s3) tex += '=' + m.tex();
    return { m: m, tex: tex };
  }
  function pointsSpec(p1, p2) {
    var pt = function (p) { return '(' + p[0] + ',' + p[1] + ')'; };
    var r = twoPoints(p1, p2);
    return {
      instr: 'Find the slope of the line between $' + pt(p1) + '$ and $' + pt(p2) + '$.',
      hint: 'Enter the slope as an integer or a fraction in lowest terms.',
      parts: [H.part('', '', slopeField(r.m), 'Call $' + pt(p1) + '$ point $\\#1$ $(x_1,y_1)$ and $' + pt(p2) + '$ point $\\#2$ $(x_2,y_2)$. $$' + r.tex + '$$')]
    };
  }
  MAT.def('slope', 7, function (R) {     // both coordinates increase
    var x1 = R.int(1, 5), y1 = R.int(1, 6), dx = R.int(2, 5), dy = R.int(1, 6);
    return pointsSpec([x1, y1], [x1 + dx, y1 + dy]);
  });
  MAT.def('slope', 8, function (R) {     // positive coordinates, negative slope
    var dx = R.int(2, 5), dy = R.int(1, 5), x1 = R.int(1, 9), y1 = R.int(dy + 1, 9);
    return pointsSpec([x1, y1], [x1 + dx, y1 - dy]);
  });
  MAT.def('slope', 9, function (R) {     // negative x-coordinates
    var x1 = R.int(-5, -2), x2 = x1 - R.int(2, 6), y1 = R.int(-6, -1), y2 = R.int(1, 7);
    if (R.bool()) { var t = x1; x1 = x2; x2 = t; }
    return pointsSpec([x1, y1], [x2, y2]);
  });
  MAT.def('slope', 10, function (R) {    // mixed signs, whole-number slope
    for (;;) {
      var s = R.sign() * R.int(1, 3), dx = R.int(3, 6), x1 = R.int(-5, -1), x2 = x1 + dx;
      var y1 = s > 0 ? R.int(-8, -1) : R.int(1, 8), y2 = y1 + s * dx;
      if (x2 >= 1 && Math.abs(y2) <= 12 && y2 !== 0 && (y1 > 0) !== (y2 > 0)) return pointsSpec([x1, y1], [x2, y2]);
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
