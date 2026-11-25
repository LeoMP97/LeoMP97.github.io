/* Chapter 7: Linear equations in one variable. This chapter has no numbered examples,
   so each section ends with a randomized practice set (keys P1-P10). */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd, lcm = MAT.lcm;
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function DEC(v) { return F(v).dec(); }
  var VARS = ['x', 'x', 'x', 'y', 'n', 't', 'a', 'b', 'm', 'k'];
  // a linear expression in tex; terms [[coef, var or '']]; fmt formats a non-negative number
  function lin(terms, fmt) {
    fmt = fmt || D;
    var s = '';
    terms.forEach(function (t) {
      var c = F(t[0]); if (c.isZero()) return;
      var a = c.abs(), body = t[1] === '' ? fmt(a) : (a.eq(1) ? t[1] : fmt(a) + t[1]);
      s += s === '' ? (c.sign() < 0 ? '-' : '') + body : (c.sign() < 0 ? ' - ' : ' + ') + body;
    });
    return s || '0';
  }
  // plain-text linear expression for answer checking: 3x-2
  function lstr(a, b, v) {
    a = F(a); b = F(b); v = v || 'x';
    var s = a.isZero() ? '' : a.eq(1) ? v : a.eq(-1) ? '-' + v : a.str() + v;
    if (!b.isZero()) s += (s && b.sign() > 0 ? '+' : '') + b.str();
    return s || '0';
  }
  function shift(k, fmt) { fmt = fmt || D; k = F(k); return k.sign() > 0 ? 'subtract $' + fmt(k) + '$ from both sides' : 'add $' + fmt(k.abs()) + '$ to both sides'; }
  // steps for  A v + B = C v + E  (v is the variable name); returns {tex, val}
  function linSteps(v, A, B, C, E, fmt, pre, note) {
    fmt = fmt || D; A = F(A); B = F(B); C = F(C); E = F(E);
    var L = function (a, b) { return lin([[a, v], [b, '']], fmt); };
    var rhs0 = C.isZero() ? lin([[E, '']], fmt) : L(C, E);
    var lines = (pre || []).slice();
    lines.push(L(A, B) + '&=' + rhs0 + (note ? '&&\\text{' + note + '}' : ''));
    var E2 = E.sub(B), cur = 'A';
    if (!B.isZero()) {
      lines.push(lin([[A, v]], fmt) + '&=' + (C.isZero() ? lin([[E2, '']], fmt) : lin([[C, v], [E2, '']], fmt)) + '&&\\text{' + shift(B, fmt) + '}');
    }
    var K = A.sub(C);
    if (!C.isZero()) lines.push(lin([[K, v]], fmt) + '&=' + lin([[E2, '']], fmt) + '&&\\text{subtract $' + lin([[C, v]], fmt) + '$ from both sides}');
    var val = E2.div(K);
    if (!K.eq(1)) lines.push(v + '&=' + fmt(val.abs()).replace(/^/, val.sign() < 0 ? '-' : '') + '&&\\text{divide both sides by $' + (K.sign() < 0 ? '-' : '') + fmt(K.abs()) + '$}');
    return { tex: '\\begin{aligned}' + lines.join('\\\\') + '\\end{aligned}', val: val };
  }
  function checkTxt(v, val, A, B, fmt) {
    fmt = fmt || D;
    var lhs = F(A).mul(val).add(B);
    return ' Check: when $' + v + '=' + (fmt === DEC ? DEC(val) : D(val)) + '$ the left side is $' + (fmt === DEC ? DEC(lhs) : D(lhs)) + '$, and so is the right side.';
  }
  function numField(val, o) { return H.num(val, Object.assign({ width: 9, placeholder: 'your answer' }, o || {})); }
  var NUM_HINT = 'Enter whole numbers, decimals or fractions like <code>-2/3</code>.';

  // ------------------------------------------------------------------ P1: the steps, parentheses and fractions
  MAT.def('lin1', 'P1', function (R) {
    var v = R.pick(['x', 'x', 'y', 'n']), parts = [];
    // a. p(v + b) = c
    var p = R.int(2, 7), b = R.nonzero(-9, 9), x0 = R.nonzero(-9, 9), c = p * (x0 + b);
    var st = linSteps(v, p, p * b, 0, c, null, [p + '\\left(' + lin([[1, v], [b, '']]) + '\\right)&=' + c], 'distribute');
    parts.push(H.part('a.', '$' + p + '\\left(' + lin([[1, v], [b, '']]) + '\\right)=' + c + '$', numField(x0, { label: v + ' =' }),
      '$$' + st.tex + '$$ Check: $' + p + '(' + x0 + (b < 0 ? '-' : '+') + Math.abs(b) + ')=' + p + '(' + (x0 + b) + ')=' + c + '$.'));
    // b. v/p + v/q = r
    var dens = [2, 3, 4, 5, 6, 8, 10, 12], p1 = R.pick(dens), q1;
    do { q1 = R.pick(dens); } while (q1 === p1);
    var L = lcm(p1, q1), x1 = L * R.sign() * R.int(1, 3), r = x1 / p1 + x1 / q1, s = Q(1, p1).add(Q(1, q1));
    parts.push(H.part('b.', '$\\dfrac{' + v + '}{' + p1 + '}+\\dfrac{' + v + '}{' + q1 + '}=' + r + '$', numField(x1, { label: v + ' =' }),
      'Factor out $' + v + '$ using the distributive property: $$' + v + '\\left(\\dfrac1{' + p1 + '}+\\dfrac1{' + q1 + '}\\right)=' + r + '\\ \\to\\ ' + v + '\\cdot' + D(s) + '=' + r + '\\ \\to\\ ' + v + '=' + r + '\\cdot' + D(Q(1, 1).div(s)) + '=' + x1 + '.$$'));
    // c. p v + q = r
    var pc = R.sign() * R.int(2, 9), qc = R.nonzero(-12, 12), x2 = R.nonzero(-9, 9), rc = pc * x2 + qc;
    var st2 = linSteps(v, pc, qc, 0, rc);
    parts.push(H.part('c.', '$' + lin([[pc, v], [qc, '']]) + '=' + rc + '$', numField(x2, { label: v + ' =' }), '$$' + st2.tex + '$$' + checkTxt(v, F(x2), pc, qc)));
    return { instr: 'Solve each equation.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P2: distributive property and like terms
  MAT.def('lin1', 'P2', function (R) {
    var parts = [], ex = { simplify: true, width: 16, placeholder: 'e.g. 3x + 4' };
    // a. k(x + b)
    var k = R.int(2, 9), b = R.nonzero(-9, 9);
    parts.push(H.part('a.', 'Expand $' + k + '(' + lin([[1, 'x'], [b, '']]) + ')$.', H.expr(lstr(k, k * b), ex), '$' + k + '(' + lin([[1, 'x'], [b, '']]) + ')=' + k + 'x' + (b < 0 ? '-' : '+') + k + '\\cdot' + Math.abs(b) + '=' + lin([[k, 'x'], [k * b, '']]) + '$'));
    // b. fraction times a sum
    var q = R.int(2, 5), m = R.int(1, 4), n = R.nonzero(-6, 6), sgn = R.sign(), f = Q(sgn, q);
    parts.push(H.part('b.', 'Expand $' + (sgn < 0 ? '-' : '') + '\\dfrac1{' + q + '}\\left(' + lin([[q * m, 'x'], [q * n, '']]) + '\\right)$.', H.expr(lstr(sgn * m, sgn * n), ex),
      '$' + (sgn < 0 ? '-' : '') + '\\dfrac{' + q * m + 'x}{' + q + '}' + (sgn * n < 0 ? '-' : '+') + '\\dfrac{' + Math.abs(q * n) + '}{' + q + '}=' + lin([[sgn * m, 'x'], [sgn * n, '']]) + '$'));
    // c. combine like terms with fractions
    var qq = R.pick([3, 4, 5]), sSum = R.pick([1, 1, 2]), r1 = R.int(1, sSum * qq - 1), r2 = sSum * qq - r1, c1 = R.nonzero(-9, 9), c2 = R.nonzero(-9, 9);
    var expr = lin([[Q(r1, qq), 'x'], [c1, ''], [Q(r2, qq), 'x'], [c2, '']]);
    parts.push(H.part('c.', 'Simplify $' + expr + '$.', H.expr(lstr(sSum, c1 + c2), ex),
      'Group like terms: $' + lin([[Q(r1, qq), 'x'], [Q(r2, qq), 'x'], [c1, ''], [c2, '']]) + '=\\left(' + D(Q(r1, qq)) + '+' + D(Q(r2, qq)) + '\\right)x' + (c1 + c2 < 0 ? '-' : '+') + Math.abs(c1 + c2) + '=' + lin([[sSum, 'x'], [c1 + c2, '']]) + '$'));
    // d. two distributions
    var m1, n1, a1, b1, a2, b2;
    do { m1 = R.sign() * R.int(2, 5); n1 = R.sign() * R.int(2, 5); a1 = R.int(1, 4); b1 = R.nonzero(-6, 6); a2 = R.int(1, 4); b2 = R.nonzero(-6, 6); } while (m1 * a1 + n1 * a2 === 0);
    var tex = (m1 < 0 ? '-' : '') + Math.abs(m1) + '(' + lin([[a1, 'x'], [b1, '']]) + ')' + (n1 < 0 ? '-' : '+') + Math.abs(n1) + '(' + lin([[a2, 'x'], [b2, '']]) + ')';
    parts.push(H.part('d.', 'Simplify $' + tex + '$.', H.expr(lstr(m1 * a1 + n1 * a2, m1 * b1 + n1 * b2), ex),
      '$' + tex + '=' + lin([[m1 * a1, 'x'], [m1 * b1, ''], [n1 * a2, 'x'], [n1 * b2, '']]) + '=' + lin([[m1 * a1 + n1 * a2, 'x'], [m1 * b1 + n1 * b2, '']]) + '$'));
    return { instr: 'Simplify each expression. Write your answer with no parentheses, like <code>3x - 2</code>.', parts: parts };
  });

  // ------------------------------------------------------------------ P3: evaluating expressions
  MAT.def('lin1', 'P3', function (R) {
    var parts = [], v = 'x';
    var a = R.sign() * R.int(2, 9), b = R.nonzero(-12, 12), x0 = R.nonzero(-10, 10);
    parts.push(H.part('a.', 'Evaluate $' + lin([[a, v], [b, '']]) + '$ when $x=' + x0 + '$.', numField(a * x0 + b),
      '$' + a + '(' + (x0 < 0 ? '(' + x0 + ')' : x0) + ')' + (b < 0 ? '-' : '+') + Math.abs(b) + '=' + a * x0 + (b < 0 ? '-' : '+') + Math.abs(b) + '=' + (a * x0 + b) + '$'.replace(/^/, '')));
    var q = R.pick([2, 3, 4, 5]), pn = R.int(1, 3);
    while (gcd(pn, q) !== 1) pn = R.int(1, 3);
    var f = Q(R.sign() * pn, q), x1 = q * R.nonzero(-4, 4), c = R.nonzero(-9, 9), val = f.mul(x1).add(c);
    parts.push(H.part('b.', 'Evaluate $' + lin([[f, 'x'], [c, '']]) + '$ when $x=' + x1 + '$.', numField(val),
      '$' + D(f) + '\\left(' + x1 + '\\right)' + (c < 0 ? '-' : '+') + Math.abs(c) + '=' + D(f.mul(x1)) + (c < 0 ? '-' : '+') + Math.abs(c) + '=' + D(val) + '$'));
    var m = R.int(2, 6), n = R.nonzero(-6, 6), k = R.nonzero(-9, 9), x2 = R.nonzero(-8, 8), val2 = m * (x2 + n) + k;
    parts.push(H.part('c.', 'Evaluate $' + m + '\\left(' + lin([[1, 'x'], [n, '']]) + '\\right)' + (k < 0 ? '-' : '+') + Math.abs(k) + '$ when $x=' + x2 + '$.', numField(val2),
      '$' + m + '(' + (x2 < 0 ? '(' + x2 + ')' : x2) + (n < 0 ? '-' : '+') + Math.abs(n) + ')' + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + m + '(' + (x2 + n) + ')' + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + m * (x2 + n) + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + val2 + '$'));
    return { instr: 'Replace the variable with the number and compute.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P4: the addition property
  MAT.def('lin1', 'P4', function (R) {
    var parts = [], v = R.pick(['x', 'x', 'y', 'n']);
    // a. v +/- a = b
    var a = R.int(2, 12), x0 = R.nonzero(-12, 12), plus = R.bool(), rhs = plus ? x0 + a : x0 - a;
    parts.push(H.part('a.', '$' + v + (plus ? '+' : '-') + a + '=' + rhs + '$', numField(x0, { label: v + ' =' }),
      plus ? 'Subtract $' + a + '$ from both sides: $' + v + '=' + rhs + '-' + a + '=' + x0 + '$. Check: $' + x0 + '+' + a + '=' + rhs + '$.'
        : 'Add $' + a + '$ to both sides: $' + v + '=' + rhs + '+' + a + '=' + x0 + '$. Check: $' + x0 + '-' + a + '=' + rhs + '$.'));
    // b. combine like terms first
    var q = R.int(2, 4), c1 = R.int(1, 7), d1 = R.int(2, 9), d2 = R.int(2, 14), x1 = d1 - d2 + c1;
    parts.push(H.part('b.', '$' + (q + 1) + 'x-' + c1 + '-' + q + 'x=' + d1 + '-' + d2 + '$', numField(x1, { label: 'x =' }),
      'Combine like terms: $(' + (q + 1) + 'x-' + q + 'x)-' + c1 + '=' + (d1 - d2) + '$, so $x-' + c1 + '=' + (d1 - d2) + '$ and $x=' + (d1 - d2) + '+' + c1 + '=' + x1 + '$.'));
    // c. fractions
    var fa = R.frac([2, 3, 4, 6]), fc = R.frac([2, 4, 8]), ansC = fc.add(fa);
    parts.push(H.part('c.', '$x-' + D(fa) + '=' + D(fc) + '$', numField(ansC, { label: 'x =', placeholder: 'e.g. 11/8' }),
      'Add $' + D(fa) + '$ to both sides: $x=' + D(fc) + '+' + D(fa) + '=' + D(ansC) + '$ (use a common denominator).'));
    // d. is it a solution?
    var p1 = R.sign() * R.int(2, 9), r1 = R.sign() * R.int(2, 9);
    while (p1 === r1) r1 = R.sign() * R.int(2, 9);
    var xs = R.nonzero(-6, 6), q1 = R.nonzero(-9, 9), s1 = p1 * xs + q1 - r1 * xs, yes = R.bool(), tv = yes ? xs : xs + R.sign() * R.int(1, 3);
    var wv = tv < 0 ? '(' + tv + ')' : String(tv), left = p1 * tv + q1, right = r1 * tv + s1;
    parts.push(H.part('d.', 'Is $a=' + tv + '$ a solution to $' + lin([[p1, 'a'], [q1, '']]) + '=' + lin([[r1, 'a'], [s1, '']]) + '$?', H.yesno(yes, { label: 'Is it a solution?' }),
      'Substitute: $' + p1 + wv + (q1 < 0 ? '-' : '+') + Math.abs(q1) + '=' + r1 + wv + (s1 < 0 ? '-' : '+') + Math.abs(s1) + '\\ \\to\\ ' + left + '=' + right + '$. This is ' + (left === right ? 'true, so <strong>yes</strong>' : 'not true, so <strong>no</strong>') + ', $a=' + tv + '$ ' + (left === right ? 'is' : 'is not') + ' a solution.'));
    // e. angles
    var right90 = R.bool(), total = right90 ? 90 : 180, known = right90 ? R.int(10, 80) : R.int(20, 160);
    parts.push(H.part('e.', 'Two angles make a ' + (right90 ? 'right angle ($90^\\circ$)' : 'straight angle ($180^\\circ$)') + '. One of them is $' + known + '^\\circ$. Find the other.', numField(total - known, { suffix: '°', width: 6 }),
      '$' + known + '^\\circ+x=' + total + '^\\circ$, so $x=' + total + '^\\circ-' + known + '^\\circ=' + (total - known) + '^\\circ$.'));
    return { instr: 'Use the addition property of equality.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P5: both properties
  MAT.def('lin1', 'P5', function (R) {
    var parts = [];
    // a. p a + q = r a + s
    var v = R.pick(['a', 'x', 'n', 'y']), p = R.sign() * R.int(2, 9), r = R.sign() * R.int(2, 9);
    while (p === r) r = R.sign() * R.int(2, 9);
    var x0 = R.nonzero(-8, 8), q = R.nonzero(-12, 12), s = p * x0 + q - r * x0;
    var st = linSteps(v, p, q, r, s);
    parts.push(H.part('a.', '$' + lin([[p, v], [q, '']]) + '=' + lin([[r, v], [s, '']]) + '$', numField(x0, { label: v + ' =' }), '$$' + st.tex + '$$' + checkTxt(v, F(x0), p, q)));
    // b. m(x - n) + k = c
    var m = R.int(2, 6), n = R.nonzero(-8, 8), k = R.nonzero(-9, 9), x1 = R.nonzero(-8, 8), c = m * (x1 - n) + k;
    var st2 = linSteps('x', m, k - m * n, 0, c, null, [m + '\\left(' + lin([[1, 'x'], [-n, '']]) + '\\right)' + (k < 0 ? '-' : '+') + Math.abs(k) + '&=' + c], 'distribute');
    parts.push(H.part('b.', '$' + m + '\\left(' + lin([[1, 'x'], [-n, '']]) + '\\right)' + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + c + '$', numField(x1, { label: 'x =' }),
      '$$' + st2.tex + '$$ Check: $' + m + '(' + x1 + (n < 0 ? '+' : '-') + Math.abs(n) + ')' + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + m + '(' + (x1 - n) + ')' + (k < 0 ? '-' : '+') + Math.abs(k) + '=' + c + '$.'));
    // c. m(p x - n) + k = r x + s
    var m3 = R.int(2, 5), p3 = R.int(1, 3), n3 = R.int(1, 6), k3 = R.nonzero(-6, 6), r3 = R.nonzero(-6, 6), x3 = R.nonzero(-7, 7);
    if (m3 * p3 === r3) r3 += 1;
    var s3 = m3 * (p3 * x3 - n3) + k3 - r3 * x3;
    var st3 = linSteps('x', m3 * p3, k3 - m3 * n3, r3, s3, null, [m3 + '\\left(' + lin([[p3, 'x'], [-n3, '']]) + '\\right)' + (k3 < 0 ? '-' : '+') + Math.abs(k3) + '&=' + lin([[r3, 'x'], [s3, '']])], 'distribute');
    parts.push(H.part('c.', '$' + m3 + '\\left(' + lin([[p3, 'x'], [-n3, '']]) + '\\right)' + (k3 < 0 ? '-' : '+') + Math.abs(k3) + '=' + lin([[r3, 'x'], [s3, '']]) + '$', numField(x3, { label: 'x =' }), '$$' + st3.tex + '$$'));
    return { instr: 'Solve each equation.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P6: the multiplication property (whole numbers)
  MAT.def('lin1', 'P6', function (R) {
    var parts = [];
    var p = R.int(2, 8), c = R.nonzero(-9, 9);
    parts.push(H.part('a.', '$\\dfrac1{' + p + '}x=' + c + '$', numField(p * c, { label: 'x =' }), 'Multiply both sides by $' + p + '$: $' + p + '\\cdot\\dfrac1{' + p + '}x=' + c + '\\cdot' + p + '$, so $x=' + p * c + '$.'));
    var a = R.sign() * R.int(2, 9), x0 = R.nonzero(-9, 9);
    parts.push(H.part('b.', '$' + a + 'x=' + a * x0 + '$', numField(x0, { label: 'x =' }), 'Divide both sides by $' + a + '$: $x=\\dfrac{' + a * x0 + '}{' + a + '}=' + x0 + '$. Check: $' + a + '(' + x0 + ')=' + a * x0 + '$.'));
    var a2 = -R.int(2, 9), b2 = R.nonzero(-12, 12), x2 = R.nonzero(-9, 9), c2 = a2 * x2 + b2, st = linSteps('x', a2, b2, 0, c2);
    parts.push(H.part('c.', '$' + lin([[a2, 'x'], [b2, '']]) + '=' + c2 + '$', numField(x2, { label: 'x =' }), '$$' + st.tex + '$$' + checkTxt('x', F(x2), a2, b2)));
    var P = R.int(2, 9), Qq = R.int(2, 9);
    while (Qq === P) Qq = R.int(2, 9);
    var k = P - Qq, c3 = R.nonzero(-9, 9), x3 = R.nonzero(-8, 8), rhsTot = k * x3 + c3, d1 = R.int(2, 9), d2 = d1 - rhsTot;
    parts.push(H.part('d.', '$' + P + 'x-' + Qq + 'x' + (c3 < 0 ? '-' : '+') + Math.abs(c3) + '=' + d1 + (d2 < 0 ? '+' : '-') + Math.abs(d2) + '$', numField(x3, { label: 'x =' }),
      'Combine like terms: $(' + P + 'x-' + Qq + 'x)' + (c3 < 0 ? '-' : '+') + Math.abs(c3) + '=' + rhsTot + '$, so $' + lin([[k, 'x'], [c3, '']]) + '=' + rhsTot + '$ and $' + lin([[k, 'x']]) + '=' + (rhsTot - c3) + '$, so $x=\\dfrac{' + (rhsTot - c3) + '}{' + k + '}=' + x3 + '$.'));
    return { instr: 'Solve each equation using the multiplication property of equality.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P7: equations with fractions
  MAT.def('lin1', 'P7', function (R) {
    var parts = [];
    var p = R.int(2, 6), k = R.nonzero(-6, 6), c = R.nonzero(-9, 9), x0 = p * k, rr = k + c, st = linSteps('x', Q(1, p), c, 0, rr);
    parts.push(H.part('a.', '$' + lin([[Q(1, p), 'x'], [c, '']]) + '=' + rr + '$', numField(x0, { label: 'x =' }), '$$' + st.tex + '$$'));
    // b. -(a/b) x = c/d
    var nn, dd;
    do { dd = R.int(2, 7); nn = R.int(1, 6); } while (gcd(nn, dd) !== 1);
    var f = Q(-nn, dd), x1 = Q(R.sign() * R.int(1, 5), R.int(2, 5)), rhs = f.mul(x1);
    parts.push(H.part('b.', '$' + D(f) + 'x=' + D(rhs) + '$', numField(x1, { label: 'x =', placeholder: 'e.g. -2/3' }),
      'Multiply both sides by the reciprocal $' + D(Q(1, 1).div(f)) + '$: $x=' + D(rhs) + '\\cdot\\left(' + D(Q(1, 1).div(f)) + '\\right)=' + D(x1) + '$.'));
    // c. p x + a/b = c/d
    var pc = R.int(2, 5), x2 = Q(R.sign() * R.int(1, 5), R.pick([2, 3, 4, 5])), fa = R.frac([2, 3, 4]), rhs3 = x2.mul(pc).add(fa);
    parts.push(H.part('c.', '$' + pc + 'x+' + D(fa) + '=' + D(rhs3) + '$', numField(x2, { label: 'x =', placeholder: 'e.g. 1/8' }),
      'Subtract $' + D(fa) + '$: $' + pc + 'x=' + D(rhs3) + '-' + D(fa) + '=' + D(x2.mul(pc)) + '$. Then divide by $' + pc + '$: $x=' + D(x2) + '$.'));
    // d. n / x + c = r
    var n = R.int(1, 6), x3 = R.sign() * R.int(2, 6), c4 = R.nonzero(-5, 5), r4 = Q(n, x3).add(c4), mid = r4.sub(c4);
    parts.push(H.part('d.', '$\\dfrac{' + n + '}{x}+' + (c4 < 0 ? '(' + c4 + ')' : c4) + '=' + D(r4) + '$', numField(x3, { label: 'x =' }),
      'Subtract $' + (c4 < 0 ? '(' + c4 + ')' : c4) + '$: $\\dfrac{' + n + '}{x}=' + D(mid) + '$. Taking reciprocals, $\\dfrac{x}{' + n + '}=' + D(Q(1, 1).div(mid)) + '$, so $x=' + n + '\\cdot' + PVs(Q(1, 1).div(mid)) + '=' + x3 + '$.'));
    function PVs(v) { v = F(v); return (v.d === 1 && v.n >= 0) ? String(v.n) : '\\left(' + D(v) + '\\right)'; }
    return { instr: 'Solve each equation.', hint: NUM_HINT, parts: parts };
  });

  // ------------------------------------------------------------------ P8: decimals
  MAT.def('lin1', 'P8', function (R) {
    var parts = [], fmt = DEC;
    function hundred(lo, hi) { return Q(R.int(lo, hi), 100); }
    // a. x - a.b = c.d
    var a = Q(R.int(11, 99), 10), x0 = Q(R.int(20, 190), 10), c = x0.sub(a);
    parts.push(H.part('a.', '$x-' + DEC(a) + '=' + DEC(c) + '$', numField(x0, { label: 'x =' }), '$x=' + DEC(c) + '+' + DEC(a) + '=' + DEC(x0) + '$.'));
    // b. n y = d
    var n = R.int(2, 9), y0 = Q(R.nonzero(-99, 99), 100), d = y0.mul(n);
    parts.push(H.part('b.', '$' + n + 'y=' + DEC(d) + '$', numField(y0, { label: 'y =' }), '$y=\\dfrac{' + DEC(d) + '}{' + n + '}=' + DEC(y0) + '$.'));
    // c. (1/p) x - c1 = c2
    var p = R.int(2, 5), c1 = hundred(101, 399), c2 = hundred(101, 399), x2 = c1.add(c2).mul(p);
    parts.push(H.part('c.', '$\\dfrac1{' + p + '}x-' + DEC(c1) + '=' + DEC(c2) + '$', numField(x2, { label: 'x =' }),
      '$\\dfrac1{' + p + '}x=' + DEC(c2) + '+' + DEC(c1) + '=' + DEC(c1.add(c2)) + '\\ \\to\\ x=' + p + '\\cdot' + DEC(c1.add(c2)) + '=' + DEC(x2) + '$.'));
    // d. P a + c1 = Q a + c2
    var P = R.int(4, 9), Qv = R.int(2, P - 2), kk = P - Qv, a0 = Q(R.nonzero(-60, 60), 20), e1 = hundred(10, 99), e2 = e1.add(a0.mul(kk));
    var st = linSteps('a', P, e1, Qv, e2, DEC);
    parts.push(H.part('d.', '$' + lin([[P, 'a'], [e1, '']], DEC) + '=' + lin([[Qv, 'a'], [e2, '']], DEC) + '$', numField(a0, { label: 'a =' }), '$$' + st.tex + '$$'));
    return { instr: 'Solve each equation. Give your answer as a decimal.', hint: 'Enter decimals like <code>-0.75</code> (a fraction such as <code>-3/4</code> is also accepted).', parts: parts };
  });

  // ------------------------------------------------------------------ P9: applications
  var NAMES = [['JoAnn', 'Stacey'], ['Maria', 'Elena'], ['Dana', 'Priya'], ['Karen', 'Lily'], ['Tanya', 'Nia']];
  MAT.def('lin1', 'P9', function (R) {
    var parts = [];
    // a. number puzzle
    var x0 = R.int(2, 15), kind = R.int(0, 1);
    if (kind === 0) {
      var a = R.int(2, 9);
      parts.push(H.part('a.', 'The sum of a number and $' + a + '$ is $' + (x0 + a) + '$. Find the number.', numField(x0, { label: 'number' }),
        '$x+' + a + '=' + (x0 + a) + '\\ \\to\\ x=' + (x0 + a) + '-' + a + '=' + x0 + '$. The sum of $' + x0 + '$ and $' + a + '$ is $' + (x0 + a) + '$.'));
    } else {
      var m = R.int(2, 4), n = R.int(2, 5), c = R.int(3, 9), tot = c + (m + n) * x0;
      parts.push(H.part('a.', 'If $' + c + '$ is added to the sum of ' + ['', '', 'twice', 'three times', 'four times'][m] + ' a number and ' + ['', '', 'twice', 'three times', 'four times', 'five times'][n] + ' the number, the result is $' + tot + '$. Find the number.', numField(x0, { label: 'number' }),
        '$' + c + '+(' + m + 'x+' + n + 'x)=' + tot + '\\ \\to\\ ' + c + '+' + (m + n) + 'x=' + tot + '\\ \\to\\ ' + (m + n) + 'x=' + (tot - c) + '\\ \\to\\ x=' + x0 + '$. Check: $' + c + '+' + m * x0 + '+' + n * x0 + '=' + tot + '$.'));
    }
    // b. rectangle
    var w = R.int(3, 14), kk = R.int(2, 4), Pm = 2 * w * (kk + 1);
    parts.push(H.part('b.', 'The length of a rectangle is ' + ['', '', 'twice', 'three times', 'four times'][kk] + ' the width. The perimeter is $' + Pm + '$ cm. Find the width and the length.', [numField(w, { label: 'width', suffix: 'cm', width: 6 }), numField(kk * w, { label: 'length', suffix: 'cm', width: 6 })],
      '$l=' + kk + 'w$ and $P=2l+2w=' + Pm + '$. $$2(' + kk + 'w)+2w=' + Pm + '\\ \\to\\ ' + (2 * kk + 2) + 'w=' + Pm + '\\ \\to\\ w=' + w + '.$$ The width is $' + w + '$ cm and the length is $l=' + kk + '\\cdot' + w + '=' + kk * w + '$ cm. Check: $' + kk * w + '+' + kk * w + '+' + w + '+' + w + '=' + Pm + '$.'));
    // c. ages
    var nm = R.pick(NAMES), S = R.int(3, 14), diff = R.int(18, 32), tot2 = 2 * S + diff + 12;
    parts.push(H.part('c.', nm[0] + ' is $' + diff + '$ years older than her daughter ' + nm[1] + '. In six years the sum of their ages will be $' + tot2 + '$. How old are they now?', [numField(S, { label: nm[1] + "'s age", width: 6 }), numField(S + diff, { label: nm[0] + "'s age", width: 6 })],
      'Let $S$ be ' + nm[1] + '\'s age, so ' + nm[0] + '\'s age is $S+' + diff + '$. In six years: $(S+' + diff + '+6)+(S+6)=' + tot2 + '$. $$' + (2) + 'S+' + (diff + 12) + '=' + tot2 + '\\ \\to\\ 2S=' + (tot2 - diff - 12) + '\\ \\to\\ S=' + S + '.$$ ' + nm[1] + ' is $' + S + '$ and ' + nm[0] + ' is $' + S + '+' + diff + '=' + (S + diff) + '$.'));
    // d. rental
    var day = R.int(9, 35), cents = R.int(8, 30), days = R.int(1, 3), miles = R.int(30, 200), charge = Q(day * days * 100 + cents * miles, 100);
    function money(v) { return F(v).num().toFixed(2); }
    parts.push(H.part('d.', 'A car rental company charges \\$' + day + ' per day and ' + cents + ' cents per mile. A car was rented for ' + days + ' day' + (days > 1 ? 's' : '') + ' and the charge was \\$' + money(charge) + '. How many miles was the car driven?', numField(miles, { label: 'miles', width: 6, form: 'int' }),
      '$' + day * days + '+' + DEC(Q(cents, 100)) + 'm=' + money(charge) + '\\ \\to\\ ' + DEC(Q(cents, 100)) + 'm=' + money(charge.sub(day * days)) + '\\ \\to\\ m=\\dfrac{' + money(charge.sub(day * days)) + '}{' + DEC(Q(cents, 100)) + '}=' + miles + '$. The car was driven $' + miles + '$ miles.'));
    return { instr: 'Write an equation for each problem and solve it.', hint: 'Enter numbers only.', parts: parts };
  });

  // ------------------------------------------------------------------ P10: formulas
  MAT.def('lin1', 'P10', function (R) {
    var parts = [];
    // a. perimeter of a rectangle
    var l0 = R.int(6, 30), w = R.int(3, l0 - 1), Pm = 2 * w + 2 * l0;
    parts.push(H.part('a.', 'The perimeter of a rectangle is $2w+2l$. A pen has perimeter $' + Pm + '$ ft and width $' + w + '$ ft. What is the length?', numField(l0, { suffix: 'ft', width: 6 }),
      '$$2(' + w + ')+2l=' + Pm + '\\ \\to\\ ' + 2 * w + '+2l=' + Pm + '\\ \\to\\ 2l=' + (Pm - 2 * w) + '\\ \\to\\ l=\\dfrac{' + (Pm - 2 * w) + '}{2}=' + l0 + '\\text{ ft}$$'));
    // b. temperature
    var k = R.int(3, 20), toC = R.bool();
    if (toC) parts.push(H.part('b.', '$C=\\dfrac59(F-32)$. Find $C$ when $F$ is $' + (32 + 9 * k) + '^\\circ$.', numField(5 * k, { suffix: '°', width: 6 }),
      '$C=\\dfrac59(' + (32 + 9 * k) + '-32)=\\dfrac59(' + 9 * k + ')=' + 5 * k + '$.'));
    else parts.push(H.part('b.', '$F=\\dfrac95C+32$. Find $F$ when $C$ is $' + 5 * k + '^\\circ$.', numField(9 * k + 32, { suffix: '°', width: 6 }),
      '$F=\\dfrac95(' + 5 * k + ')+32=' + 9 * k + '+32=' + (9 * k + 32) + '$.'));
    // c. y = ax + b
    var a = R.sign() * R.int(2, 6), b = R.nonzero(-9, 9), x0 = R.nonzero(-6, 6);
    parts.push(H.part('c.', '$y=' + lin([[a, 'x'], [b, '']]) + '$. Find $y$ when $x=' + x0 + '$.', numField(a * x0 + b, { label: 'y =' }),
      '$y=' + a + '(' + (x0 < 0 ? '(' + x0 + ')' : x0) + ')' + (b < 0 ? '-' : '+') + Math.abs(b) + '=' + a * x0 + (b < 0 ? '-' : '+') + Math.abs(b) + '=' + (a * x0 + b) + '$.'));
    // d. a x + b y = c, find y
    var A = R.int(2, 6), B = R.int(2, 5), C = R.nonzero(-12, 12), x1 = R.nonzero(-5, 6), yv = Q(C - A * x1, B);
    parts.push(H.part('d.', '$' + lin([[A, 'x'], [B, 'y']]) + '=' + C + '$. Find $y$ when $x=' + x1 + '$.', numField(yv, { label: 'y =', placeholder: 'e.g. -2/3' }),
      '$$' + A + '(' + x1 + ')+' + B + 'y=' + C + '\\ \\to\\ ' + A * x1 + '+' + B + 'y=' + C + '\\ \\to\\ ' + B + 'y=' + (C - A * x1) + '\\ \\to\\ y=' + D(yv) + '$$'));
    return { instr: 'Use each formula or equation.', hint: NUM_HINT, parts: parts };
  });
})(typeof window !== 'undefined' ? window : globalThis);
