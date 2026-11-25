/* Chapter 11: Slope-intercept form */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd, lcm = MAT.lcm;
  var WIN = { xmin: -6, xmax: 6, ymin: -6, ymax: 6, step: 1 };
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function fr(n, d) { return '\\dfrac{' + n + '}{' + d + '}'; }
  function pt(p) { return '(' + p[0] + ', ' + p[1] + ')'; }
  // slope p/q (reduced, q>0 unless integer) with |p|<=maxP, q in qs
  function randSlope(R, maxP, qs) {
    var p, q;
    do { q = R.pick(qs); p = R.int(1, maxP); } while (gcd(p, q) !== 1);
    return Q(R.sign() * p, q);
  }
  function slopeFields(m, b) {
    return [H.num(m, { label: 'slope', width: 7, placeholder: 'e.g. 2/3' }), H.pair(0, b, { label: 'y-intercept', width: 9, placeholder: '(0, 1)' })];
  }
  // the lattice step (run, rise) for a slope
  function step(m) { return { run: m.d, rise: m.n }; }

  // ---- 1, 2: read slope and y-intercept off a graph
  function fromGraph(R, m, b, extra) {
    var s = step(m), p0 = [0, b], p1 = [s.run, b + s.rise];
    var w = { xmin: -6, xmax: 6, ymin: -7, ymax: 7, step: 1 };
    var raw = MAT.svg.plane({ xmin: w.xmin, xmax: w.xmax, ymin: w.ymin, ymax: w.ymax, step: 1, title: '', lines: [{ m: m.num(), b: b }], points: [{ x: p0[0], y: p0[1] }, { x: p1[0], y: p1[1] }] });
    var eq = T.slopeInt(m, b);
    var sol = 'Choose two points on the line, $' + pt(p0) + '$ and $' + pt(p1) + '$. The rise is $' + s.rise + '$ and the run is $' + s.run + '$: $$m=\\frac{\\text{rise}}{\\text{run}}=' + fr(s.rise, s.run) + (s.run === 1 ? '=' + s.rise : '') + '.$$ The $y$-intercept is the point $' + pt(p0) + '$. So $m=' + D(m) + '$ and the $y$-intercept is $' + pt(p0) + '$, and $$y=\\mathbf{' + D(m) + '}x' + T.plus(b) + '\\qquad\\text{compared to}\\qquad y=mx+b.$$ The slope is the coefficient of $x$, and the $y$-coordinate of the $y$-intercept is the constant term.' +
      H.planeFig(w, [H.lineMB(m, b)], [p0, p1]);
    return {
      instr: 'Use the graph to find the slope and $y$-intercept of the line $' + eq + '$. Compare these values to the equation $y=mx+b$.',
      figure: raw,
      hint: 'Enter the slope as an integer or fraction, and the $y$-intercept as an ordered pair like <code>(0, 1)</code>.',
      parts: [H.part('', '', slopeFields(m, b), sol)]
    };
  }
  MAT.def('slopeint', 1, function (R) { return fromGraph(R, F(R.sign() * R.int(1, 3)), R.int(-3, 3)); });
  MAT.def('slopeint', 2, function (R) { return fromGraph(R, randSlope(R, 3, [2, 3, 4]), R.int(-3, 3)); });

  // ---- 3: identify from y = mx + b
  MAT.def('slopeint', 3, function (R) {
    var items = [
      { m: F(R.sign() * R.int(2, 9)), b: R.nonzero(-9, 9) },
      { m: randSlope(R, 7, [2, 3, 4, 5]), b: R.nonzero(-9, 9) },
      { m: F(R.sign()), b: R.nonzero(-9, 9) }
    ];
    return {
      instr: 'Identify the slope and $y$-intercept of each line.',
      hint: 'Compare each equation to $y=mx+b$. Enter the $y$-intercept as an ordered pair like <code>(0, 5)</code>.',
      parts: R.shuffle(items).map(function (it, i) {
        var eq = T.slopeInt(it.m, it.b);
        return H.part(H.lab(i), '$' + eq + '$', slopeFields(it.m, it.b), 'Compare $' + eq + '$ to $y=mx+b$: the slope is $m=' + D(it.m) + '$ and the $y$-intercept is $(0,' + it.b + ')$.');
      })
    };
  });

  // ---- standard form -> slope-intercept steps
  function stdToSI(A, B, C) {
    var m = Q(-A, B), b = Q(C, B);
    var rhs1 = T.lin([[-A, 'x'], [C, '']]), ax = (Math.abs(A) === 1 ? '' : Math.abs(A)) + 'x';
    var tex = '\\begin{aligned}' +
      H.stdTex(A, B, C).replace('=', '&=') + '\\\\' +
      T.coef(B, 'y') + '&=' + rhs1 + '&&\\text{' + (A < 0 ? 'add $' + ax + '$ to' : 'subtract $' + ax + '$ from') + ' both sides}\\\\' +
      '\\frac{' + T.coef(B, 'y') + '}{' + B + '}&=\\frac{' + rhs1 + '}{' + B + '}&&\\text{divide both sides by $' + B + '$}\\\\' +
      T.slopeInt(m, b).replace('=', '&=') + '\\end{aligned}';
    return { m: m, b: b, tex: tex };
  }

  // ---- 4: slope and y-intercept from standard form
  MAT.def('slopeint', 4, function (R) {
    var A = R.sign() * R.int(1, 6), B = R.int(2, 5), b = R.nonzero(-5, 5), C = B * b;
    var r = stdToSI(A, B, C);
    return {
      instr: 'Identify the slope and $y$-intercept of the line $' + H.stdTex(A, B, C) + '$.',
      hint: 'First solve the equation for $y$. Enter the $y$-intercept as an ordered pair like <code>(0, 3)</code>.',
      parts: [H.part('', '', slopeFields(r.m, r.b), 'This equation is not in slope-intercept form, so solve for $y$. $$' + r.tex + '$$ The slope is $m=' + D(r.m) + '$ and the $y$-intercept is $(0,' + r.b.str() + ')$.')]
    };
  });

  // ---- 5-8: graph the line from its slope and y-intercept
  function graphSpec(m, b, eqTex, intro) {
    b = F(b).num();
    var s = step(m), p0 = [0, b], p1 = [s.run, b + s.rise];
    var line = H.lineMB(m, b);
    var rr = s.rise > 0 ? 'up ' + s.rise : 'down ' + (-s.rise);
    var sol = (intro || '') + '<br>$m=' + D(m) + '$ and the $y$-intercept is $(0,' + b + ')$. Plot $(0,' + b + ')$. The rise is $' + s.rise + '$ and the run is $' + s.run + '$: ' + rr + ', right ' + s.run + ' gives $' + pt(p1) + '$. Connect the points.' +
      H.planeFig(WIN, [line], [p0, p1], { slope: { x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1] } });
    return { line: line, sol: sol };
  }
  function graphEx(R, m, b) {
    var eq = T.slopeInt(m, b), g = graphSpec(m, b, eq);
    return {
      instr: 'Graph the line $' + eq + '$ using its slope and $y$-intercept. Click two grid points on the line.',
      parts: [H.part('', '', H.lineGraphField(g.line, WIN), '$' + eq + '$ is already in slope-intercept form.' + g.sol)]
    };
  }
  MAT.def('slopeint', 5, function (R) { return graphEx(R, F(R.sign() * R.int(2, 4)), R.int(-2, 2)); });
  MAT.def('slopeint', 6, function (R) { return graphEx(R, F(R.sign()), R.nonzero(-4, 4)); });
  MAT.def('slopeint', 7, function (R) { return graphEx(R, randSlope(R, 3, [2, 3, 4]), R.int(-3, 3)); });
  MAT.def('slopeint', 8, function (R) {
    for (;;) {
      var m = randSlope(R, 3, [2, 3, 4]), B = R.sign() * R.int(2, 4), b = R.nonzero(-3, 3);
      var A = m.neg().mul(B);
      if (!A.isInt() || Math.abs(A.n) > 9 || Math.abs(A.n) < 1) continue;
      var Ai = A.n, C = B * b, r = stdToSI(Ai, B, C), g = graphSpec(r.m, r.b, '');
      return {
        instr: 'Graph the line $' + H.stdTex(Ai, B, C) + '$ using its slope and $y$-intercept. Click two grid points on the line.',
        hint: 'First write the equation in slope-intercept form.',
        parts: [H.part('', '', H.lineGraphField(g.line, WIN), 'First find the slope-intercept form. $$' + r.tex + '$$' + g.sol)]
      };
    }
  });

  // ---- 9: the most convenient method
  var OPT = ['Graph the horizontal line', 'Graph the vertical line', 'Find the intercepts', 'Use the slope and $y$-intercept'];
  MAT.def('slopeint', 9, function (R) {
    var kinds = R.shuffle([0, 1, 2, 3]);
    return {
      instr: 'Determine the most convenient method to graph each line.',
      parts: kinds.map(function (k, i) {
        var eq, why;
        if (k === 0) { var c = R.nonzero(-9, 9); eq = 'y=' + c; why = '$' + eq + '$ has only one variable. Its graph is a horizontal line crossing the $y$-axis at $' + c + '$.'; }
        else if (k === 1) { var a = R.nonzero(-9, 9); eq = 'x=' + a; why = '$' + eq + '$ has only one variable. The graph is a vertical line crossing the $x$-axis at $' + a + '$.'; }
        else if (k === 2) {
          var A = R.int(2, 6), B = R.sign() * R.int(2, 6), C = lcm(A, Math.abs(B)) * R.sign() * R.int(1, 2);
          eq = H.stdTex(A, B, C); why = '$' + eq + '$ is of the form $Ax+By=C$. The easiest way to graph it is to find the intercepts.';
        } else {
          var m = randSlope(R, 7, [2, 3, 4, 5]), b = R.nonzero(-9, 9);
          eq = T.slopeInt(m, b); why = '$' + eq + '$ is in $y=mx+b$ form, so it is easiest to graph using the slope and $y$-intercept.';
        }
        return H.part(H.lab(i), '$' + eq + '$', H.choice(OPT, k), why);
      })
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
