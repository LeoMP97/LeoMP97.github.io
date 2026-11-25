/* Chapter 9: Graphing linear equations (the coordinate plane) */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T;
  var WIN = { xmin: -6, xmax: 6, ymin: -6, ymax: 6, step: 1 };
  function pt(p) { return '(' + p[0] + ',' + p[1] + ')'; }
  function ptT(p) { return '(' + p[0] + ', ' + p[1] + ')'; }
  function move(p) {
    var x = p[0], y = p[1], s = [];
    if (x) s.push(Math.abs(x) + ' unit' + (Math.abs(x) === 1 ? '' : 's') + (x > 0 ? ' right' : ' left'));
    if (y) s.push(Math.abs(y) + ' unit' + (Math.abs(y) === 1 ? '' : 's') + (y > 0 ? ' up' : ' down'));
    return s.length ? s.join(', then ') : 'stay at the origin';
  }

  // ---- 1: plot points
  MAT.def('lin2', 1, function (R) {
    var a = R.int(1, 6), b = R.int(1, 6);
    while (b === a) b = R.int(1, 6);
    var sym = [[a, b], [a, -b], [-a, b], [-a, -b]];
    var q1 = [R.sign() * R.int(1, 6), R.sign() * R.int(1, 6)], q2 = [R.sign() * R.int(1, 6), 0], q3 = [0, R.sign() * R.int(1, 6)];
    var mixed = R.shuffle([q1, q2, q3]);
    var win = { xmin: -7, xmax: 7, ymin: -7, ymax: 7, step: 1 };
    function sol(pts) {
      return 'Start at the origin. ' + pts.map(function (p) { return '$' + pt(p) + '$: ' + move(p) + '.'; }).join(' ') +
        H.planeFig(win, [], pts);
    }
    return {
      instr: 'Plot each point on a coordinate plane. Click a grid point to plot it (click it again to remove it).',
      parts: [
        H.part('a.', '$' + sym.map(pt).join('\\ ') + '$', H.plotPointsField(sym, win), sol(sym)),
        H.part('b.', '$' + mixed.map(pt).join('\\ ') + '$', H.plotPointsField(mixed, win), sol(mixed))
      ]
    };
  });

  // ---- 2: quadrants
  var QOPT = ['Quadrant I', 'Quadrant II', 'Quadrant III', 'Quadrant IV', 'On the x-axis', 'On the y-axis', 'The origin'];
  MAT.def('lin2', 2, function (R) {
    var kinds = R.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 6);
    var parts = kinds.map(function (k, i) {
      var p, why;
      var nz = function () { return R.int(1, 6); };
      if (k === 0) { p = [nz(), nz()]; why = 'both coordinates are positive: Quadrant I'; }
      else if (k === 1) { p = [-nz(), nz()]; why = '$x$ is negative and $y$ is positive: Quadrant II'; }
      else if (k === 2) { p = [-nz(), -nz()]; why = 'both coordinates are negative: Quadrant III'; }
      else if (k === 3) { p = [nz(), -nz()]; why = '$x$ is positive and $y$ is negative: Quadrant IV'; }
      else if (k === 4) { p = [R.sign() * nz(), 0]; why = '$y=0$, so the point is on the $x$-axis'; }
      else if (k === 5) { p = [0, R.sign() * nz()]; why = '$x=0$, so the point is on the $y$-axis'; }
      else { p = [0, 0]; why = 'both coordinates are $0$: the origin'; }
      return H.part(H.lab(i), '$' + pt(p) + '$', H.choice(QOPT, k, { label: '' }), '$' + pt(p) + '$: ' + why + '.');
    });
    return {
      instr: 'State the quadrant of each point, or say that it lies on an axis (or at the origin).',
      parts: parts
    };
  });

  // ---- 3: graph four lines
  function lineSol(line, tex, win) {
    var A = F(line.A), B = F(line.B), C = F(line.C), pts = [];
    for (var x = win.xmin; x <= win.xmax && pts.length < 3; x++) for (var y = win.ymin; y <= win.ymax && pts.length < 3; y++) {
      if (A.mul(x).add(B.mul(y)).eq(C) && (!pts.length || pts[pts.length - 1][0] !== x)) pts.push([x, y]);
    }
    return 'Find points on the line $' + tex + '$, for example $' + pts.map(ptT).join('$, $') + '$. Plot them and draw the line through them.' + H.planeFig(win, [line], pts);
  }
  MAT.def('lin2', 3, function (R) {
    var m1 = R.sign() * R.int(1, 3), b1 = R.int(-3, 3);
    var c2 = R.int(2, 6) * R.sign(), minus = R.bool(), A2 = 1, B2 = minus ? -1 : 1;
    var m3 = R.sign() * R.int(2, 4), b3 = R.int(-2, 2);
    var q4 = R.int(2, 3), m4 = Q(R.sign(), q4), b4 = R.int(-3, 3);
    var L = [
      { line: H.lineMB(m1, b1), tex: T.slopeInt(m1, b1) },
      { line: { A: A2, B: B2, C: c2 }, tex: H.stdTex(A2, B2, c2) },
      { line: H.lineMB(m3, b3), tex: T.slopeInt(m3, b3) },
      { line: H.lineMB(m4, b4), tex: T.slopeInt(m4, b4) }
    ];
    return {
      instr: 'Graph each equation. Click two grid points on the line.',
      hint: 'Make a table of values first: choose an $x$, then find the matching $y$.',
      parts: L.map(function (l, i) {
        return H.part(H.lab(i), '$' + l.tex + '$', H.lineGraphField(l.line, WIN), lineSol(l.line, l.tex, WIN));
      })
    };
  });

  // ---- 4: y = (p/q)x, x = a, y = b
  MAT.def('lin2', 4, function (R) {
    var slopes = [Q(1, 2), Q(1, 3), Q(2, 3), Q(3, 2), F(2), F(3), F(1)];
    var m = R.pick(slopes); if (R.bool()) m = m.neg();
    var a = R.nonzero(-5, 5), b = R.nonzero(-5, 5);
    var items = [{ line: H.lineMB(m, 0), tex: T.slopeInt(m, 0), note: 'This line passes through the origin $(0,0)$ and has slope $' + m.tex() + '$.' }];
    var vert = { line: { A: 1, B: 0, C: a }, tex: 'x=' + a, pts: [[a, -2], [a, 3]], note: 'Every point has $x=' + a + '$, so this is the vertical line through $(' + a + ',0)$.' };
    var hor = { line: { A: 0, B: 1, C: b }, tex: 'y=' + b, pts: [[-3, b], [2, b]], note: 'Every point has $y=' + b + '$, so this is the horizontal line through $(0,' + b + ')$.' };
    items[0].pts = H.latticePoints(m, F(0), WIN.xmin, WIN.xmax, WIN.ymin, WIN.ymax).slice(0, 3);
    items = items.concat(R.bool() ? [vert, hor] : [hor, vert]);
    return {
      instr: 'Graph each equation. Click two grid points on the line.',
      parts: items.map(function (it, i) {
        return H.part(H.lab(i), '$' + it.tex + '$', H.lineGraphField(it.line, WIN), it.note + H.planeFig(WIN, [it.line], it.pts));
      })
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
