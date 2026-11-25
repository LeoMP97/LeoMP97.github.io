/* Chapter 12: Finding the equation of a line */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd;
  var WIN = { xmin: -6, xmax: 6, ymin: -6, ymax: 6, step: 1 };
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function pt(p) { return '(' + p[0] + ',' + p[1] + ')'; }
  function randSlope(R, maxP, qs) {
    var p, q;
    do { q = R.pick(qs); p = R.int(1, maxP); } while (gcd(p, q) !== 1);
    return Q(R.sign() * p, q);
  }
  function siField(m, b, label) {
    return H.eq(H.siStr(m, b), { lhs: 'y', slopeInt: true, label: label || '', width: 18, placeholder: 'y = mx + b', aria: 'equation of the line' });
  }
  var HINT_SI = 'Type your equation like <code>y = 2/3x - 4</code>.';

  // point-slope work, shown as an aligned block, ending in y = mx + b
  function pointSlope(m, x1, y1) {
    var b = F(y1).sub(m.mul(x1)), mx1 = m.mul(x1);
    var mT = m.tex(), mTp = m.eq(1) ? '' : m.eq(-1) ? '-' : mT;
    var lhs0 = 'y-' + T.p(y1), rhs0 = mTp + '(x-' + T.p(x1) + ')';
    if (m.abs().d !== 1 || m.d !== 1) rhs0 = mT + '(x-' + T.p(x1) + ')';
    var lhs1 = y1 < 0 ? 'y+' + (-y1) : y1 === 0 ? 'y' : 'y-' + y1;
    var lines = ['m&=' + D(m) + ',\\qquad(x_1,y_1)=' + pt([x1, y1]), 'y-y_1&=m(x-x_1)', lhs0 + '&=' + rhs0];
    if (y1 < 0 || x1 < 0) lines.push(lhs1 + '&=' + mTp + '(x' + (x1 < 0 ? '+' + (-x1) : '-' + x1) + ')');
    lines.push(lhs1 + '&=' + T.lin([[m, 'x'], [mx1.neg(), '']]) + '&&\\text{distribute}');
    if (!mx1.isInt() || !F(y1).isInt()) lines.push('y&=' + T.lin([[m, 'x'], [mx1.neg(), ''], [y1, '']]) + '&&\\text{' + (y1 < 0 ? 'subtract $' + (-y1) + '$ from' : 'add $' + y1 + '$ to') + ' both sides}');
    lines.push('y&=' + T.lin([[m, 'x'], [b, '']]) + (mx1.isInt() && F(y1).isInt() ? '&&\\text{' + (y1 < 0 ? 'subtract $' + (-y1) + '$ from' : y1 === 0 ? 'simplify' : 'add $' + y1 + '$ to') + ' both sides}' : ''));
    return { b: b, tex: '\\begin{aligned}' + lines.join('\\\\') + '\\end{aligned}', texNoHeader: '\\begin{aligned}' + lines.slice(1).join('\\\\') + '\\end{aligned}' };
  }

  // ---- 1: slope and y-intercept given
  MAT.def('eqline', 1, function (R) {
    var m1 = F(R.sign() * R.int(2, 9)), b1 = R.nonzero(-9, 9);
    var m2 = randSlope(R, 7, [2, 3, 4, 5]), b2 = R.nonzero(-9, 9);
    function part(i, m, b) {
      return H.part(H.lab(i), 'slope $' + (m.d === 1 ? m.n : D(m)) + '$ and $y$-intercept $(0,' + b + ')$', siField(m, b),
        'We are given the slope and $y$-intercept, so substitute into $y=mx+b$. $$\\begin{aligned}m&=' + D(m) + '\\\\b&=' + b + '\\quad\\text{(the $y$-intercept is $(0,' + b + ')$)}\\\\y&=' + D(m) + 'x+' + T.p(b) + '\\\\y&=' + T.lin([[m, 'x'], [b, '']]) + '\\end{aligned}$$');
    }
    return { instr: 'Find an equation of a line with the given slope and $y$-intercept.', hint: HINT_SI, parts: [part(0, m1, b1), part(1, m2, b2)] };
  });

  // ---- 2: equation from a graph
  MAT.def('eqline', 2, function (R) {
    var m = randSlope(R, 3, [2, 3, 4]), b = R.int(-3, 3), run = m.d, rise = m.n;
    var p0 = [0, b], p1 = [run, b + rise];
    var fig = MAT.svg.plane({ xmin: WIN.xmin, xmax: WIN.xmax, ymin: WIN.ymin, ymax: WIN.ymax, step: 1, lines: [{ m: m.num(), b: b }], points: [{ x: p0[0], y: p0[1] }, { x: p1[0], y: p1[1] }] });
    return {
      instr: 'Find the equation of the line shown.',
      figure: fig,
      hint: HINT_SI,
      parts: [H.part('', '', siField(m, b),
        'The $y$-intercept is $(0,' + b + ')$ and the graph passes through $' + pt(p1) + '$. Count the rise and run: the rise is $' + rise + '$ and the run is $' + run + '$, so $m=' + D(m) + '$. Substitute into $y=mx+b$: $$' + T.slopeInt(m, b) + '.$$' +
        H.planeFig(WIN, [H.lineMB(m, b)], [p0, p1], { slope: { x1: 0, y1: b, x2: run, y2: b + rise } }))]
    };
  });

  // ---- 3, 4: slope and a point
  function slopePoint(R, sign) {
    var p = R.int(1, 3), q = R.pick([2, 3, 4, 5]);
    while (gcd(p, q) !== 1) p = R.int(1, 3);
    var m = Q(sign * p, q), k = R.sign() * R.int(1, 3), x1 = q * k, b = R.int(-4, 4), y1 = m.mul(x1).add(b).n;
    var r = pointSlope(m, x1, y1);
    return {
      instr: 'Find an equation of a line with slope $m=' + D(m) + '$ that contains the point $' + pt([x1, y1]) + '$. Write the equation in slope-intercept form.',
      hint: HINT_SI,
      parts: [H.part('', '', siField(m, b), '$$' + r.tex + '$$')]
    };
  }
  MAT.def('eqline', 3, function (R) { return slopePoint(R, 1); });
  MAT.def('eqline', 4, function (R) { return slopePoint(R, -1); });

  // ---- 5: horizontal line through a point
  MAT.def('eqline', 5, function (R) {
    var x1 = R.nonzero(-9, 9), y1 = R.nonzero(-9, 9);
    return {
      instr: 'Find an equation of a horizontal line that contains the point $' + pt([x1, y1]) + '$. Write the equation in slope-intercept form.',
      hint: HINT_SI,
      parts: [H.part('', '', siField(0, y1),
        'Every horizontal line has slope $0$, so $m=0$ and $(x_1,y_1)=' + pt([x1, y1]) + '$. $$\\begin{aligned}y-' + T.p(y1) + '&=0(x-' + T.p(x1) + ')\\\\' + (y1 < 0 ? 'y+' + (-y1) : 'y-' + y1) + '&=0\\\\y&=' + y1 + '\\end{aligned}$$ This is the horizontal line $y=a$ with $a=' + y1 + '$. In slope-intercept form it is $y=0x' + T.plus(y1) + '$.')]
    };
  });

  // ---- 6, 7: two points
  function twoPoint(p1, p2) {
    var m = Q(p2[1] - p1[1], p2[0] - p1[0]), r = pointSlope(m, p2[0], p2[1]);
    var sub = function (a, b) { return a + '-' + (b < 0 ? '(' + b + ')' : b); };
    var n = p2[1] - p1[1], d = p2[0] - p1[0];
    var slopeTex = 'm=\\dfrac{' + sub(p2[1], p1[1]) + '}{' + sub(p2[0], p1[0]) + '}=\\dfrac{' + n + '}{' + d + '}' + (m.tex() !== '\\frac{' + n + '}{' + d + '}' ? '=' + D(m) : '');
    return {
      instr: 'Find an equation of a line that contains the points $' + pt(p1) + '$ and $' + pt(p2) + '$. Write the equation in slope-intercept form.',
      hint: HINT_SI,
      parts: [H.part('', '', siField(m, r.b),
        '<strong>Step 1.</strong> Find the slope: $' + slopeTex + '$.<br><strong>Step 2.</strong> Choose one point, $(x_1,y_1)=' + pt(p2) + '$.<br><strong>Step 3.</strong> Substitute into point-slope form. $$' + r.texNoHeader + '$$')]
    };
  }
  MAT.def('eqline', 6, function (R) {       // whole-number slope and intercept
    var m = R.sign() * R.int(1, 3), b = R.int(-6, 6), x1 = R.int(-4, 5), x2;
    do { x2 = R.int(-4, 7); } while (x2 === x1 || Math.abs(x2 - x1) > 4);
    return twoPoint([x1, m * x1 + b], [x2, m * x2 + b]);
  });
  MAT.def('eqline', 7, function (R) {       // fraction slope
    var p = R.int(1, 2), q = R.int(3, 6);
    while (gcd(p, q) !== 1) q = R.int(3, 6);
    var s = R.sign(), x1 = R.int(-5, -1), y1 = R.int(-4, 4);
    return twoPoint([x1, y1], [x1 + q, y1 + s * p]);
  });

  // ---- 8: vertical line
  MAT.def('eqline', 8, function (R) {
    var a = R.nonzero(-8, 8), y1 = R.int(-8, 8), y2;
    do { y2 = R.int(-8, 8); } while (y2 === y1);
    var p1 = [a, y1], p2 = [a, y2], n = y2 - y1;
    return {
      instr: 'Find an equation of a line that contains the points $' + pt(p1) + '$ and $' + pt(p2) + '$. Write the equation in slope-intercept form if you can.',
      hint: 'If the slope does not exist, type <code>undefined</code> for the slope. Write the equation of the line like <code>x = 5</code>.',
      parts: [H.part('', '', [
        H.text(['undefined', 'undef', 'no slope', 'not defined', 'does not exist', 'dne', 'is undefined'], { label: 'slope', width: 10, aria: 'slope' }),
        H.eq('x=' + a, { lhs: 'x', label: 'equation', width: 10, placeholder: 'x = ?', aria: 'equation of the line' })
      ], 'Find the slope: $m=\\dfrac{' + y2 + '-' + (y1 < 0 ? '(' + y1 + ')' : y1) + '}{' + a + '-' + (a < 0 ? '(' + a + ')' : a) + '}=\\dfrac{' + n + '}{0}$, which is <strong>undefined</strong>. This tells us the line is vertical. Both points have an $x$-coordinate of $' + a + '$, so the equation of the line is $x=' + a + '$. Since there is no $y$, we cannot write it in slope-intercept form.')]
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
