/* Chapter 13: Systems of equations (substitution and elimination) */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd, lcm = MAT.lcm;

  // ------------------------------------------------------------------ small helpers
  // equations are arrays [a, b, c] meaning a x + b y = c
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function PV(v) { v = F(v); return (v.d === 1 && v.n >= 0) ? String(v.n) : '\\left(' + D(v) + '\\right)'; }     // value in a product
  function std(e) { return H.stdTex(e[0], e[1], e[2]); }
  function det(e1, e2) { return e1[0] * e2[1] - e2[0] * e1[1]; }
  function cramer(e1, e2) {
    var d = det(e1, e2); if (!d) return null;
    return [Q(e1[2] * e2[1] - e2[2] * e1[1], d), Q(e1[0] * e2[2] - e2[0] * e1[2], d)];
  }
  function holds(e, x, y) { return F(e[0]).mul(x).add(F(e[1]).mul(y)).eq(e[2]); }
  function sysDisplay(a, b) { return '$$' + T.system(a, b) + '$$'; }
  function ptTex(x, y) {
    x = F(x); y = F(y);
    return (x.d === 1 && y.d === 1) ? '(' + x.n + ',' + y.n + ')' : '\\left(' + D(x) + ',' + D(y) + '\\right)';
  }
  // signed sum of [coefficient, body] terms, e.g. [[2,'x'],[-1,'3']] -> 2x-3 (bodies with no leading sign)
  function joinT(parts) {
    var s = '';
    parts.forEach(function (p) {
      var c = p[0]; if (c === 0) return;
      s += (s === '' ? (c < 0 ? '-' : '') : (c < 0 ? '-' : '+')) + p[1];
    });
    return s === '' ? '0' : s;
  }
  function vcoef(c, v) { return Math.abs(c) === 1 ? v : Math.abs(c) + v; }
  function pv(n) { return n < 0 ? '(' + n + ')' : String(n); }
  function evalTex(e, x, y) {
    var s = '';
    [[e[0], x], [e[1], y]].forEach(function (t, i) {
      var c = t[0], v = t[1]; if (c === 0) return;
      var ac = Math.abs(c), body = ac === 1 ? ((s === '' && c > 0) ? String(v) : pv(v)) : ac + '(' + v + ')';
      s += s === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? '-' : '+') + body;
    });
    return s;
  }
  function checkLine(e1, e2, x, y) {
    x = F(x); y = F(y);
    if (x.d !== 1 || y.d !== 1) return '';
    return '<br>Check: $' + evalTex(e1, x.n, y.n) + '=' + e1[2] + '\\checkmark$ and $' + evalTex(e2, x.n, y.n) + '=' + e2[2] + '\\checkmark$.';
  }
  var SYS_HINT = 'Enter the solution as an ordered pair like <code>(2, -3)</code>. Fractions are fine, for example <code>(5/4, -1/2)</code>.';
  var SYS_HINT_ALL = 'Enter an ordered pair like <code>(2, -3)</code>. If the lines never meet, write <code>no solution</code>. If the equations describe the same line, write <code>infinitely many solutions</code>.';
  function sysField(ans) { return H.sys(ans, { width: 22, placeholder: '(x, y)', aria: 'solution of the system' }); }
  function randSol(R, lim) { var x, y; do { x = R.int(-lim, lim); y = R.int(-lim, lim); } while (x === 0 && y === 0); return [x, y]; }
  function mk(a, b, sol) { return [a, b, a * sol[0] + b * sol[1]]; }

  // ------------------------------------------------------------------ substitution
  // equation eq with the variable v replaced by (k w + t); returns the work as aligned lines and the value of w
  function substInto(eq, v, k, t) {
    var iv = v === 'x' ? 0 : 1, w = v === 'x' ? 'y' : 'x', cb = eq[iv], ob = eq[1 - iv], r = eq[2];
    var vexpr = T.lin([[k, w], [t, '']]);
    var inner = '(' + vexpr + ')';
    var subTerm = [cb, Math.abs(cb) === 1 ? inner : Math.abs(cb) + inner], oTerm = [ob, vcoef(ob, w)];
    var l0 = joinT(iv === 0 ? [subTerm, oTerm] : [oTerm, subTerm]) + '&=' + r;
    var kT = [cb * k, vcoef(cb * k, w)], tT = [cb * t, String(Math.abs(cb * t))];
    var l1 = joinT(iv === 0 ? [kT, tT, oTerm] : [oTerm, kT, tT]) + '&=' + r;
    var K = cb * k + ob, rr = r - cb * t;
    var l2 = T.coef(K, w) + '&=' + rr + '&&\\text{combine like terms and move the constant}';
    var wVal = Q(rr, K), lines = [l0 + '&&\\text{substitute}', l1 + '&&\\text{distribute}', l2];
    if (Math.abs(K) !== 1) lines.push(w + '&=' + D(wVal) + '&&\\text{divide both sides by $' + K + '$}');
    else if (K === -1) lines.push(w + '&=' + D(wVal));
    return { lines: lines, w: w, wVal: wVal, K: K };
  }
  // v = k w + t evaluated at w = wVal
  function backSolved(v, k, t, w, wVal) {
    var vVal = F(k).mul(wVal).add(t);
    var prod = k === 1 ? D(wVal) : k === -1 ? '-' + PV(wVal) : k + PV(wVal);
    var s = v + '=' + prod + (t === 0 ? '' : T.plus(t)) + '=' + D(vVal);
    return { tex: s, vVal: vVal };
  }
  // full "solve one equation for a variable with coefficient +-1, substitute into the other" solution
  function substitutionSol(solveEq, v, otherEq, which) {
    var iv = v === 'x' ? 0 : 1, w = v === 'x' ? 'y' : 'x', cv = solveEq[iv], co = solveEq[1 - iv], c1 = solveEq[2];
    var k = -cv * co, t = cv * c1, form = v + '=' + T.lin([[k, w], [t, '']]);
    var s = substInto(otherEq, v, k, t), bs = backSolved(v, k, t, w, s.wVal);
    var vals = {}; vals[w] = s.wVal; vals[v] = bs.vVal;
    var x = vals.x, y = vals.y;
    var html = '<strong>Step 1.</strong> Solve the ' + which + ' equation for $' + v + '$: $' + std(solveEq) + '\\ \\to\\ ' + form + '$.<br>' +
      '<strong>Step 2.</strong> Substitute into the ' + (which === 'first' ? 'second' : 'first') + ' equation and solve for $' + w + '$:' +
      '$$\\begin{aligned}' + s.lines.join('\\\\') + '\\end{aligned}$$' +
      '<strong>Step 3.</strong> Substitute $' + w + '=' + D(s.wVal) + '$ into $' + form + '$: $' + bs.tex + '$.<br>' +
      'The solution is $' + ptTex(x, y) + '$.';
    return { html: html, x: x, y: y };
  }
  // substitution where one equation is already solved for a variable: y = k x + t
  function givenSolvedSol(solved, v, k, t, other) {
    var w = v === 'x' ? 'y' : 'x', s = substInto(other, v, k, t), bs = backSolved(v, k, t, w, s.wVal);
    var vals = {}; vals[w] = s.wVal; vals[v] = bs.vVal;
    var html = 'The ' + solved + ' equation is already solved for $' + v + '$. Substitute $' + T.lin([[k, w], [t, '']]) + '$ for $' + v + '$ in the other equation.' +
      '$$\\begin{aligned}' + s.lines.join('\\\\') + '\\end{aligned}$$' +
      'Substitute $' + w + '=' + D(s.wVal) + '$ into $' + v + '=' + T.lin([[k, w], [t, '']]) + '$: $' + bs.tex + '$. The solution is $' + ptTex(vals.x, vals.y) + '$.';
    return { html: html, x: vals.x, y: vals.y };
  }

  function uniqueSpec(instr, e1, e2, sol, verifyPts) {
    var spec = {
      instr: instr, display: sysDisplay(std(e1), std(e2)), hint: SYS_HINT,
      parts: [H.part('', '', sysField([sol.x, sol.y]), sol.html + checkLine(e1, e2, sol.x, sol.y))]
    };
    spec.verify = function () {
      var c = cramer(e1, e2);
      return !!c && c[0].eq(sol.x) && c[1].eq(sol.y) && holds(e1, sol.x, sol.y) && holds(e2, sol.x, sol.y);
    };
    return spec;
  }
  function pickSystem(R, make) {   // retry until the generator returns a system
    for (var i = 0; i < 400; i++) { var r = make(); if (r) return r; }
    throw new Error('could not build a system');
  }

  // ---- 1: is the ordered pair a solution?
  MAT.def('systems', 1, function (R) {
    var e1, e2, sol, wrong;
    for (;;) {
      sol = randSol(R, 6);
      e1 = mk(R.nonzero(-3, 3), R.nonzero(-3, 3), sol); e2 = mk(R.nonzero(-3, 3), R.nonzero(-3, 3), sol);
      if (!det(e1, e2)) continue;
      // a point on exactly one of the lines
      var which = R.bool() ? e1 : e2, g = gcd(Math.abs(which[0]), Math.abs(which[1])), t = R.sign() * R.int(1, 2);
      wrong = [sol[0] + t * which[1] / g, sol[1] - t * which[0] / g];
      if (Math.abs(wrong[0]) > 9 || Math.abs(wrong[1]) > 9) continue;
      if (holds(e1, wrong[0], wrong[1]) && holds(e2, wrong[0], wrong[1])) continue;
      break;
    }
    var pairs = R.shuffle([{ p: sol, yes: true }, { p: wrong, yes: false }]);
    function part(item, i) {
      var p = item.p, ok1 = holds(e1, p[0], p[1]), ok2 = holds(e2, p[0], p[1]);
      var l1 = evalTex(e1, p[0], p[1]) + '=' + (e1[0] * p[0] + e1[1] * p[1]) + (ok1 ? '\\ \\checkmark' : '\\neq' + e1[2] + '\\ \\times');
      var l2 = evalTex(e2, p[0], p[1]) + '=' + (e2[0] * p[0] + e2[1] * p[1]) + (ok2 ? '\\ \\checkmark' : '\\neq' + e2[2] + '\\ \\times');
      return H.part(H.lab(i), '$' + ptTex(p[0], p[1]) + '$', H.yesno(item.yes, { label: 'Is it a solution?' }),
        'Substitute $x=' + p[0] + '$, $y=' + p[1] + '$: $$' + l1 + '\\qquad\\qquad' + l2 + '$$ $' + ptTex(p[0], p[1]) + '$ is ' + (item.yes ? '<strong>a solution</strong>' : '<strong>not</strong> a solution') + ' (it must satisfy both equations).');
    }
    return { instr: 'Determine whether each ordered pair is a solution to the system.', display: sysDisplay(std(e1), std(e2)), parts: pairs.map(part),
      verify: function () { return pairs.every(function (it) { return (holds(e1, it.p[0], it.p[1]) && holds(e2, it.p[0], it.p[1])) === it.yes; }); } };
  });

  // ---- 2: substitution, one equation has a y with coefficient 1
  MAT.def('systems', 2, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 5), e1 = mk(R.nonzero(-4, 4), 1, sol), e2 = mk(R.pick([1, 1, 2, 3]) * R.sign(), R.nonzero(-4, 4), sol);
      return det(e1, e2) ? [e1, e2, sol] : null;
    });
    var e1 = r[0], e2 = r[1];
    return uniqueSpec('Solve by substitution.', e1, e2, substitutionSol(e1, 'y', e2, 'first'));
  });

  // ---- 3: one equation already solved for y
  MAT.def('systems', 3, function (R) {
    var r = pickSystem(R, function () {
      var k = R.pick([1, 1, 2, 3, -2]), t = R.nonzero(-7, 7), x0 = R.int(-5, 5), y0 = k * x0 + t;
      if (Math.abs(y0) > 12) return null;
      return { k: k, t: t, e1: [1, 1, x0 + y0] };
    });
    var e2std = [-r.k, 1, r.t], sol = givenSolvedSol('second', 'y', r.k, r.t, r.e1);
    var spec = {
      instr: 'Solve by substitution.', display: sysDisplay(std(r.e1), T.slopeInt(r.k, r.t)), hint: SYS_HINT,
      parts: [H.part('', '', sysField([sol.x, sol.y]), sol.html + checkLine(r.e1, e2std, sol.x, sol.y))]
    };
    spec.verify = function () { var c = cramer(r.e1, e2std); return c[0].eq(sol.x) && c[1].eq(sol.y); };
    return spec;
  });

  // ---- 4: y has coefficient 1 in one equation, the other has larger coefficients
  MAT.def('systems', 4, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 5), e1 = mk(R.sign() * R.int(2, 5), 1, sol), e2 = mk(R.sign() * R.int(2, 4), R.sign() * R.int(2, 5), sol);
      return det(e1, e2) ? [e1, e2] : null;
    });
    return uniqueSpec('Solve by substitution.', r[0], r[1], substitutionSol(r[0], 'y', r[1], 'first'));
  });

  // ---- 5: x has coefficient 1
  MAT.def('systems', 5, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 6), e1 = mk(1, R.sign() * R.int(1, 3), sol), e2 = mk(R.sign() * R.int(2, 4), R.sign() * R.int(1, 4), sol);
      return det(e1, e2) && Math.abs(e1[1]) !== 1 ? [e1, e2] : null;
    });
    return uniqueSpec('Solve by substitution.', r[0], r[1], substitutionSol(r[0], 'x', r[1], 'first'));
  });

  // ---- 6: both equations solved for y, one with a fraction
  MAT.def('systems', 6, function (R) {
    var p = R.int(1, 3), q = R.int(2, 4);
    while (gcd(p, q) !== 1) p = R.int(1, 3);
    var m1 = Q(R.sign() * p, q), m2 = F(R.nonzero(-4, 4));
    var k = R.sign() * R.int(1, 3), x0 = q * k, y0 = m1.mul(x0), b2 = y0.sub(m2.mul(x0));
    if (m1.eq(m2) || !b2.isInt() || b2.isZero()) return MAT.defs['systems.6'](R);
    var b = b2.n, pn = m1.n;
    var K = pn - q * m2.n, rhs = q * b;
    var lines = [
      D(m1) + 'x&=' + T.lin([[m2, 'x'], [b, '']]),
      q + '\\left(' + D(m1) + 'x\\right)&=' + q + '(' + T.lin([[m2, 'x'], [b, '']]) + ')&&\\text{clear the fraction}',
      T.coef(pn, 'x') + '&=' + T.lin([[q * m2.n, 'x'], [q * b, '']]) + '&&\\text{distribute}',
      T.coef(K, 'x') + '&=' + rhs + '&&\\text{move the $x$ terms to one side}'
    ];
    if (Math.abs(K) !== 1) lines.push('x&=' + x0 + '&&\\text{divide both sides by $' + K + '$}');
    var e1 = [-m1.n, q, 0], e2 = [-m2.n, 1, b];       // standard forms, for the check
    var spec = {
      instr: 'Solve by substitution.', display: sysDisplay(T.slopeInt(m1, 0), T.slopeInt(m2, b)), hint: SYS_HINT,
      parts: [H.part('', '', sysField([x0, y0]),
        'Both equations are solved for $y$, so substitute $' + D(m1) + 'x$ for $y$ in the second equation. $$\\begin{aligned}' + lines.join('\\\\') + '\\end{aligned}$$ Substitute into $y=' + D(m1) + 'x$: $y=' + D(m1) + '\\cdot' + PV(x0) + '=' + D(y0) + '$. The solution is $' + ptTex(x0, y0) + '$.')]
    };
    spec.verify = function () { var c = cramer(e1, e2); return c && c[0].eq(x0) && c[1].eq(y0); };
    return spec;
  });

  // ---- 7: a solution that is a fraction
  MAT.def('systems', 7, function (R) {
    var r = pickSystem(R, function () {
      var s = [R.sign() * R.int(1, 6), -1 * R.sign(), R.int(-9, 9)], o = [R.sign() * R.int(2, 6), R.sign() * R.pick([2, 3, 4]), R.int(-9, 9)];
      var c = cramer(s, o);
      if (!c) return null;
      var okFrac = (c[0].d > 1 || c[1].d > 1) && c[0].d <= 4 && c[1].d <= 4 && Math.abs(c[0].num()) <= 6 && Math.abs(c[1].num()) <= 6;
      return okFrac ? { s: s, o: o } : null;
    });
    var first = R.bool(), e1 = first ? r.s : r.o, e2 = first ? r.o : r.s;
    var sol = substitutionSol(r.s, 'y', r.o, first ? 'first' : 'second');
    return uniqueSpec('Solve by substitution.', e1, e2, sol);
  });

  // ---- 8: dependent or inconsistent, both equations in standard form (randomly one of the two)
  MAT.def('systems', 8, function (R) {
    var r = pickSystem(R, function () {
      var a = R.sign() * R.int(2, 6), b = R.sign() * R.int(2, 6);
      return gcd(Math.abs(a), Math.abs(b)) === 1 ? { a: a, b: b, c: R.nonzero(-9, 9), k: R.sign() * R.int(2, 5) } : null;
    });
    var inf = R.bool(), d = inf ? 0 : R.nonzero(-5, 5), a = r.a, b = r.b, c = r.c, k = r.k;
    var ka = k * a, kb = k * b, kc = k * c, rhs = kc + d, swap = R.bool();
    var e1 = [a, b, c], e2 = swap ? [ka, kb, rhs] : [ka, kb, rhs];
    var kx = Q(-b, a), tx = Q(c, a), xexp = T.lin([[kx, 'y'], [tx, '']]);
    var xT = [ka, Math.abs(ka) + '\\left(' + xexp + '\\right)'], yT = [kb, vcoef(kb, 'y')];
    var e2Tex = swap ? T.lin([[kb, 'y'], [ka, 'x']]) + '=' + rhs : std(e2);
    var l0 = joinT(swap ? [yT, xT] : [xT, yT]) + '&=' + rhs + '&&\\text{substitute}';
    var yA = [-kb, vcoef(kb, 'y')], yB = [kb, vcoef(kb, 'y')], cT = [kc, String(Math.abs(kc))];
    var l1 = joinT(swap ? [yB, yA, cT] : [yA, cT, yB]) + '&=' + rhs + '&&\\text{distribute}';
    var lines = [l0, l1, kc + '&=' + rhs + '&&\\text{the $y$ terms cancel}'];
    if (inf) lines.push('0&=0&&\\text{' + (kc < 0 ? 'add $' + (-kc) + '$ to' : 'subtract $' + kc + '$ from') + ' both sides}');
    var text = 'Solve the first equation for $x$: $' + std(e1) + '\\ \\to\\ x=' + xexp + '$. Substitute into the second equation.' +
      '$$\\begin{aligned}' + lines.join('\\\\') + '\\end{aligned}$$' +
      (inf ? 'Since $0=0$ is a true statement, the system is consistent and the equations are dependent. The system has <strong>infinitely many solutions</strong>.'
        : 'Since $' + kc + '=' + rhs + '$ is a false statement, the equations are inconsistent. The system has <strong>no solution</strong>.');
    var spec = { instr: 'Solve by substitution.', display: sysDisplay(std(e1), e2Tex), hint: SYS_HINT_ALL, parts: [H.part('', '', sysField(inf ? 'inf' : 'none'), text)] };
    spec.verify = function () { return det(e1, e2) === 0 && (inf ? e2[2] === k * e1[2] : e2[2] !== k * e1[2]); };
    return spec;
  });

  // ---- 9: one equation solved for y with a fraction: y = (a/b) x  (dependent when c = 0, otherwise inconsistent)
  MAT.def('systems', 9, function (R) {
    var r = pickSystem(R, function () {
      var a = R.sign() * R.int(1, 7), b = R.int(2, 5);
      return gcd(Math.abs(a), b) === 1 ? { a: a, b: b } : null;
    });
    var a = r.a, b = r.b, inf = R.bool(), c = inf ? 0 : R.nonzero(-12, 12) , flip = R.bool();
    // a x - b y = c  and  y = (a/b) x
    var e1 = [a, -b, c], m = Q(a, b);
    var l0 = (flip ? '' : '') + T.lin([[a, 'x'], [-b, 'y']]);
    var yT = [-b, Math.abs(b) + '\\left(' + D(m) + 'x\\right)'];
    var sub = joinT([[a, vcoef(a, 'x')], yT]) + '&=' + c + '&&\\text{substitute}';
    var dist = joinT([[a, vcoef(a, 'x')], [-a, vcoef(a, 'x')]]) + '&=' + c + '&&\\text{distribute}';
    var lines = [sub, dist, '0&=' + c];
    var text = 'Substitute $' + D(m) + 'x$ for $y$ in the first equation. $$\\begin{aligned}' + lines.join('\\\\') + '\\end{aligned}$$' +
      (inf ? 'Since $0=0$ is a true statement, the system is consistent and the equations are dependent. The system has <strong>infinitely many solutions</strong>.'
        : 'Since $0=' + c + '$ is a false statement, the equations are inconsistent. The system has <strong>no solution</strong>.');
    var second = 'y=' + D(m) + 'x';
    var spec = { instr: 'Solve by substitution.', display: sysDisplay(flip ? second : std(e1), flip ? std(e1) : second), hint: SYS_HINT_ALL, parts: [H.part('', '', sysField(inf ? 'inf' : 'none'), text)] };
    var e2 = [-a, b, 0];
    spec.verify = function () { return det(e1, e2) === 0 && ((c === 0) === inf); };
    return spec;
  });

  // ------------------------------------------------------------------ elimination
  function lhs(e) { return T.lin([[e[0], 'x'], [e[1], 'y']]); }
  // one row of the aligned addition: x-term | y-term | = | constant
  function rowTex(e) {
    var a = e[0], b = e[1];
    var xc = a === 0 ? '' : T.coef(a, 'x');
    var yc = b === 0 ? '' : (a === 0 ? T.coef(b, 'y') : (b < 0 ? '-' : '+') + vcoef(b, 'y'));
    return xc + '&' + yc + '&=&' + e[2];
  }
  // multipliers that make the coefficients of the eliminated variable opposites
  function autoMult(e1, e2, elim) {
    var i = elim === 'x' ? 0 : 1, b1 = e1[i], b2 = e2[i], A1 = Math.abs(b1), A2 = Math.abs(b2);
    if (A1 === A2) return b1 === b2 ? [1, -1] : [1, 1];
    if (A2 % A1 === 0) return [-b2 / b1, 1];
    if (A1 % A2 === 0) return [1, -b1 / b2];
    var L = lcm(A1, A2), m1 = L / A1, m2 = L / A2;
    return b1 * b2 > 0 ? [m1, -m2] : [m1, m2];
  }
  function backSub(eq, known, val, unknown) {
    var ik = known === 'x' ? 0 : 1, iu = 1 - ik, ck = eq[ik], cu = eq[iu], c = eq[2];
    var kBody = Math.abs(ck) === 1 ? ((ik === 0 && ck > 0) ? D(val) : PV(val)) : Math.abs(ck) + '\\left(' + D(val) + '\\right)';
    var kT = [ck, kBody], uT = [cu, vcoef(cu, unknown)];
    var l1 = joinT(ik === 0 ? [kT, uT] : [uT, kT]) + '=' + c;
    var cc = F(c).sub(F(ck).mul(val)), uVal = cc.div(cu);
    var l2 = T.coef(cu, unknown) + '=' + D(cc);
    var s = 'Substitute $' + known + '=' + D(val) + '$ into $' + std(eq) + '$: $' + l1 + '$, so $' + l2 + '$' + (cu === 1 ? '' : ' and $' + unknown + '=' + D(uVal) + '$') + '.';
    return { html: s, val: uVal };
  }
  // full elimination write-up for e1, e2 eliminating `elim`
  function elimSol(e1, e2, elim, prefix) {
    var ie = elim === 'x' ? 0 : 1, ir = 1 - ie, rem = elim === 'x' ? 'y' : 'x';
    var mm = autoMult(e1, e2, elim), m1 = mm[0], m2 = mm[1];
    var s1 = e1.map(function (v) { return v * m1; }), s2 = e2.map(function (v) { return v * m2; });
    var sum = [s1[0] + s2[0], s1[1] + s2[1], s1[2] + s2[2]];
    function multTxt(e, m, which, sc) { return 'Multiply the ' + which + ' equation by $' + m + '$: $' + m + '\\left(' + lhs(e) + '\\right)=' + m + '(' + e[2] + ')\\ \\to\\ ' + std(sc) + '$.'; }
    var html = prefix || '';
    if (m1 === 1 && m2 === 1) html += 'The coefficients of $' + elim + '$ are already opposites. Add the equations:';
    else {
      var parts = [];
      if (m1 !== 1) parts.push(multTxt(e1, m1, 'first', s1));
      if (m2 !== 1) parts.push(multTxt(e2, m2, 'second', s2));
      html += 'To make the coefficients of $' + elim + '$ opposites: ' + parts.join(' ') + ' Add the equations:';
    }
    var sumRow = sum[ir] === 0 ? '0&&=&' + sum[2] : (ir === 0 ? T.coef(sum[0], 'x') + '&&=&' + sum[2] : '&' + T.coef(sum[1], 'y') + '&=&' + sum[2]);
    html += '$$\\begin{array}{rrcr}' + rowTex(s1) + '\\\\' + rowTex(s2) + '\\\\\\hline ' + sumRow + '\\end{array}$$';
    if (sum[ir] === 0) {
      var inf = sum[2] === 0;
      html += inf
        ? 'This is a true statement. The equations are consistent but dependent. The system has <strong>infinitely many solutions</strong>.'
        : 'This statement is false. The equations are inconsistent. The system has <strong>no solution</strong>.';
      return { html: html, kind: inf ? 'inf' : 'none' };
    }
    var remVal = Q(sum[2], sum[ir]);
    html += 'So $' + rem + '=' + D(remVal) + '$. ';
    var useEq = Math.abs(e1[ie]) <= Math.abs(e2[ie]) ? e1 : e2;
    var bs = backSub(useEq, rem, remVal, elim);
    var vals = {}; vals[rem] = remVal; vals[elim] = bs.val;
    html += bs.html + ' The solution is $' + ptTex(vals.x, vals.y) + '$.' + checkLine(e1, e2, vals.x, vals.y);
    return { html: html, x: vals.x, y: vals.y };
  }
  function elimSpec(e1, e2, elim, instr, o) {
    o = o || {};
    var sol = elimSol(e1, e2, elim, o.prefix);
    var spec = { instr: instr || 'Solve by elimination.', display: o.display || sysDisplay(std(e1), std(e2)), hint: sol.kind ? SYS_HINT_ALL : SYS_HINT };
    spec.parts = [H.part('', '', sysField(sol.kind || [sol.x, sol.y]), sol.html)];
    spec.verify = function () {
      var c = cramer(e1, e2);
      if (sol.kind) return !c && (sol.kind === 'inf') === (e1[2] * e2[0] === e2[2] * e1[0] && e1[2] * e2[1] === e2[2] * e1[1]);
      return !!c && c[0].eq(sol.x) && c[1].eq(sol.y);
    };
    return spec;
  }
  // build a system in either orientation (eliminate y, or the transposed system and eliminate x)
  function orient(R, e1, e2) {
    if (R.bool()) return { e1: e1, e2: e2, elim: 'y' };
    return { e1: [e1[1], e1[0], e1[2]], e2: [e2[1], e2[0], e2[2]], elim: 'x' };
  }

  // ---- 10: same family as 2, by elimination
  MAT.def('systems', 10, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 5), q = R.int(2, 4), e1 = mk(R.nonzero(-4, 4), 1, sol), e2 = mk(R.nonzero(-3, 3), -q, sol);
      return q * e1[0] + e2[0] !== 0 ? [e1, e2] : null;
    });
    var o = orient(R, r[0], r[1]);
    return elimSpec(o.e1, o.e2, o.elim);
  });

  // ---- 11: coefficients already opposites
  MAT.def('systems', 11, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 7), b = R.sign() * R.int(1, 3), a1 = R.sign() * R.int(1, 3), a2 = R.sign() * R.int(1, 3);
      return a1 + a2 !== 0 ? [mk(a1, b, sol), mk(a2, -b, sol)] : null;
    });
    var o = orient(R, r[0], r[1]);
    return elimSpec(o.e1, o.e2, o.elim);
  });

  // ---- 12: multiply one equation
  MAT.def('systems', 12, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 5), b1 = R.sign() * R.int(1, 3), k = R.pick([2, 3, -2, -3]);
      if (Math.abs(k * b1) > 9) return null;
      var e1 = mk(R.nonzero(-5, 5), b1, sol), e2 = mk(R.nonzero(-5, 5), k * b1, sol);
      return -k * e1[0] + e2[0] !== 0 ? [e1, e2] : null;
    });
    var flip = R.bool(), a = flip ? r[1] : r[0], b = flip ? r[0] : r[1], o = orient(R, a, b);
    return elimSpec(o.e1, o.e2, o.elim);
  });

  // ---- 13: multiply both equations
  function twoMultSystem(R, lim, coefMax) {
    return pickSystem(R, function () {
      var b1 = R.sign() * R.int(2, coefMax), b2 = R.sign() * R.int(2, coefMax), A1 = Math.abs(b1), A2 = Math.abs(b2);
      if (A1 === A2 || A1 % A2 === 0 || A2 % A1 === 0) return null;
      var sol = randSol(R, lim), e1 = mk(R.nonzero(-coefMax, coefMax), b1, sol), e2 = mk(R.nonzero(-coefMax, coefMax), b2, sol);
      return det(e1, e2) ? [e1, e2] : null;
    });
  }
  MAT.def('systems', 13, function (R) {
    var r = twoMultSystem(R, 5, 7), o = orient(R, r[0], r[1]);
    return elimSpec(o.e1, o.e2, o.elim);
  });

  // ---- 14: fractions
  MAT.def('systems', 14, function (R) {
    var r = pickSystem(R, function () {
      var sol = randSol(R, 6), pair;
      if (R.bool()) pair = twoMultSystem(R, 6, 4);
      else { var b1 = R.sign() * R.int(1, 3), k = R.pick([2, 3, -2, -3]); pair = [mk(R.nonzero(-4, 4), b1, sol), mk(R.nonzero(-4, 4), k * b1, sol)]; }
      var d1 = R.pick([2, 3, 4, 6]), d2 = R.pick([2, 3, 4, 6]);
      var ok = function (e, d) { return gcd(gcd(Math.abs(e[0]), Math.abs(e[1])), gcd(Math.abs(e[2]), d)) === 1; };
      if (!ok(pair[0], d1) || !ok(pair[1], d2) || !det(pair[0], pair[1])) return null;
      if (Math.abs(pair[0][2]) > 40 || Math.abs(pair[1][2]) > 40) return null;
      return { e1: pair[0], e2: pair[1], d1: d1, d2: d2 };
    });
    var e1 = r.e1, e2 = r.e2, d1 = r.d1, d2 = r.d2;
    function shown(e, d) { return H.stdTex(Q(e[0], d), Q(e[1], d), Q(e[2], d)); }
    function clear(e, d) {
      return d + '\\left(' + T.lin([[Q(e[0], d), 'x'], [Q(e[1], d), 'y']]) + '\\right)&=' + d + '\\left(' + Q(e[2], d).tex() + '\\right)&\\to\\quad ' + lhs(e) + '&=' + e[2];
    }
    var prefix = 'Clear the fractions: multiply the first equation by $' + d1 + '$ and the second by $' + d2 + '$.' +
      '$$\\begin{aligned}' + clear(e1, d1) + '\\\\' + clear(e2, d2) + '\\end{aligned}$$';
    var o = R.bool() ? 'y' : 'x';
    var spec = elimSpec(e1, e2, o, 'Solve by elimination.', { prefix: prefix, display: sysDisplay(shown(e1, d1), shown(e2, d2)) });
    return spec;
  });

  // ---- 15: one equation in standard form, the other solved for y with a fraction
  MAT.def('systems', 15, function (R) {
    var r = pickSystem(R, function () {
      var a = R.sign() * R.int(1, 7), b = R.int(2, 5);
      if (gcd(Math.abs(a), b) !== 1) return null;
      var t = R.nonzero(-5, 6), inf = R.bool(), d = inf ? 0 : R.nonzero(-3, 3);
      return t + d !== 0 ? { a: a, b: b, t: t, d: d, inf: inf } : null;
    });
    var a = r.a, b = r.b, t = r.t, d = r.d, e1 = [a, b, b * t], tt = t + d;
    var e2 = [a, b, b * tt], second = 'y=' + T.lin([[tt, ''], [Q(-a, b), 'x']]);
    var prefix = 'Write the second equation in standard form: $' + T.lin([[Q(a, b), 'x'], [1, 'y']]) + '=' + tt + '$. Clear the fractions by multiplying by $' + b + '$: $' + std(e2) + '$. Now the system is $$' + T.system(std(e1), std(e2)) + '$$';
    var flip = R.bool();
    var spec = elimSpec(e1, e2, 'y', 'Solve by elimination.', { prefix: prefix, display: sysDisplay(flip ? second : std(e1), flip ? std(e1) : second) });
    return spec;
  });

  // ---- 16: both equations in standard form, one a multiple of the other (dependent or inconsistent)
  MAT.def('systems', 16, function (R) {
    var r = pickSystem(R, function () {
      var a = R.sign() * R.int(1, 5), b = R.sign() * R.int(1, 5);
      return gcd(Math.abs(a), Math.abs(b)) === 1 ? { a: a, b: b } : null;
    });
    var k = R.sign() * R.int(2, 4), c0 = R.nonzero(-9, 9), inf = R.bool(), d = inf ? 0 : R.nonzero(-6, 6);
    var small = [r.a, r.b, c0], big = [k * r.a, k * r.b, k * c0 + d];
    var e1 = R.bool() ? small : big, e2 = e1 === small ? big : small;
    return elimSpec(e1, e2, 'y');
  });
})(typeof window !== 'undefined' ? window : globalThis);
