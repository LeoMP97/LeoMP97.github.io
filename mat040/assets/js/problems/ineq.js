/* Chapter 8: Solving linear inequalities */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, Q = MAT.Q, T = MAT.T, gcd = MAT.gcd, lcm = MAT.lcm;
  var OPS = ['<', '<=', '>', '>='];
  function opT(op) { return H.opTex(op); }
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function holds(l, op, r) {
    var c = l.cmp(r);
    return op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
  }
  function inIv(iv, x) {
    if (iv.lo !== -Infinity) { var c = x.cmp(iv.lo); if (c < 0 || (c === 0 && !iv.loInc)) return false; }
    if (iv.hi !== Infinity) { var c2 = x.cmp(iv.hi); if (c2 > 0 || (c2 === 0 && !iv.hiInc)) return false; }
    return true;
  }
  function graphable(s) { return s.d <= 2 && Math.abs(s.num()) <= 40; }
  function window_(s) { var lo = Math.round(s.num()) - 5; return [lo, lo + 10]; }
  function numLineSvg(iv, s) {
    var w = window_(s), right = iv.hi === Infinity, inc = right ? iv.loInc : iv.hiInc;
    var type = right ? (inc ? 2 : 1) : (inc ? 4 : 3);
    return '<div class="ex-figure">' + MAT.svg.numberLine(w[0], w[1], s.num(), type, { label: '$' + (s.d === 1 ? s.n : s.tex()) + '$' }) + '</div>';
  }
  function ivTex(iv) { return T.interval(iv.lo, iv.loInc, iv.hi, iv.hiInc); }

  // generic finish for the "solve, graph, write in interval notation" examples
  function finish(v, stmt, steps, op, s) {
    var iv = H.ivFor(op, s);
    var fields = [
      H.ineq(iv, v, { label: 'solution', width: 9, placeholder: v + '<5', aria: 'solution as an inequality' }),
      H.interval(iv, { label: 'interval notation', width: 12, placeholder: '(2, inf)', aria: 'solution in interval notation' })
    ];
    var gr = '';
    if (graphable(s)) {
      var w = window_(s);
      fields.push(H.numberLineField(iv, w[0], w[1], s.d === 1 ? 1 : 0.5));
      gr = numLineSvg(iv, s);
    }
    return {
      instr: 'Solve ' + stmt + ', write the solution as an inequality and in interval notation' + (graphable(s) ? ', and graph it on the number line.' : '.'),
      hint: 'Type <code>&lt;=</code> for \u2264, <code>&gt;=</code> for \u2265 and <code>inf</code> for \u221e. For example: <code>x&gt;=2</code> and <code>[2, inf)</code>.',
      parts: [H.part('', '', fields, '$$\\begin{aligned}' + steps + '\\end{aligned}$$ The solution is $' + v + opT(op) + D(s) + '$. Interval notation: $' + ivTex(iv) + '$.' + gr)]
    };
  }
  // check the answer against the original inequality using sample values
  function withVerify(spec, iv, s, predicate) {
    spec.verify = function () {
      var pts = [s, s.add(Q(1, 3)), s.sub(Q(1, 3)), s.add(7), s.sub(7), s.add(Q(1, 100)), s.sub(Q(1, 100)), F(0), F(-5), F(5)];
      return pts.every(function (x) { return predicate(x) === inIv(iv, x); });
    };
    return spec;
  }
  function mkSpec(v, stmt, steps, op, s, predicate) {
    return withVerify(finish(v, stmt, steps, op, s), H.ivFor(op, s), s, predicate);
  }
  // dividing both sides by a coefficient c: returns [step line, resulting op]
  function divLine(coefTex, v, rhsTex, c, op, kVal, s) {
    var neg = c.sign() < 0, op2 = neg ? H.flip(op) : op;
    var cT = c.tex(), line = '\\frac{' + coefTex + '}{' + cT + '}&' + opT(neg ? op2 : op) + '\\frac{' + rhsTex + '}{' + cT + '}&&\\text{divide both sides by $' + cT + '$' + (neg ? ' and reverse the inequality' : '; the sign stays') + '}\\\\' + v + '&' + opT(op2) + D(s);
    return { line: line, op: op2 };
  }

  // ------------------------------------------------------------------ 1: graph on the number line
  MAT.def('ineq', 1, function (R) {
    var ops = R.shuffle(OPS).slice(0, 3), used = {}, parts = [];
    ops.forEach(function (op, i) {
      var s; do { s = R.int(-4, 4); } while (used[s]); used[s] = 1;
      var iv = H.ivFor(op, s);
      var right = iv.hi === Infinity, inc = right ? iv.loInc : iv.hiInc, type = right ? (inc ? 2 : 1) : (inc ? 4 : 3);
      parts.push(H.part(H.lab(i), '$x' + opT(op) + s + '$', H.numberLineField(iv, -5, 5, 1),
        '$x' + opT(op) + s + '$ means all numbers ' + H.opWords(op) + ' $' + s + '$. Shade to the ' + (right ? 'right' : 'left') + ' of $' + s + '$ and use a ' + (inc ? 'bracket' : 'parenthesis') + ' at $' + s + '$.' +
        '<div class="ex-figure">' + MAT.svg.numberLine(-5, 5, s, type, {}) + '</div>'));
    });
    return { instr: 'Graph each inequality on the number line.', parts: parts };
  });

  // ------------------------------------------------------------------ 2: graph and interval notation
  MAT.def('ineq', 2, function (R) {
    var specs = [
      { op: R.pick(['>=', '>']), s: F(R.int(-4, 4)) },
      { op: R.pick(['<', '<=']), s: Q(2 * R.int(-5, 4) + 1, 2) },
      { op: R.pick(['<=', '>=']), s: Q(2 * R.int(-4, 4) + 1, 2) }
    ];
    specs[1].dec = true;
    var parts = specs.map(function (sp, i) {
      var iv = H.ivFor(sp.op, sp.s), right = iv.hi === Infinity, inc = right ? iv.loInc : iv.hiInc;
      var valTex = sp.dec ? sp.s.dec() : (sp.s.d === 1 ? String(sp.s.n) : D(sp.s));
      var tex = 'x' + opT(sp.op) + valTex;
      var type = right ? (inc ? 2 : 1) : (inc ? 4 : 3);
      return H.part(H.lab(i), '$' + tex + '$', [
        H.numberLineField(iv, -5, 5, sp.s.d === 1 ? 1 : 0.5),
        H.interval(iv, { label: 'interval notation', width: 12, placeholder: '[2, inf)' })
      ], '$' + tex + '$: shade to the ' + (right ? 'right' : 'left') + ' with a ' + (inc ? 'bracket' : 'parenthesis') + '. Interval notation: $' + ivTex(iv) + '$.' +
        '<div class="ex-figure">' + MAT.svg.numberLine(-5, 5, sp.s.num(), type, { label: '$' + valTex + '$' }) + '</div>');
    });
    return {
      instr: 'Graph each inequality on the number line and write it in interval notation.',
      hint: 'Interval notation: use <code>inf</code> for ∞, for example <code>(-inf, 2.5)</code>.',
      parts: parts
    };
  });

  // ------------------------------------------------------------------ 3: x + a ? b
  MAT.def('ineq', 3, function (R) {
    var op = R.pick(OPS), s = F(R.int(-9, 9)), a = R.int(2, 12), b = s.add(a);
    var stmt = '$x+' + a + opT(op) + b.n + '$';
    var steps = 'x+' + a + '&' + opT(op) + b.n + '\\\\x+' + a + '-' + a + '&' + opT(op) + b.n + '-' + a + '&&\\text{subtract $' + a + '$ from both sides}\\\\x&' + opT(op) + s.n;
    return mkSpec('x', stmt, steps, op, s, function (x) { return holds(x.add(a), op, b); });
  });

  // ------------------------------------------------------------------ 4: x - a ? b
  MAT.def('ineq', 4, function (R) {
    var op = R.pick(OPS), s = F(R.int(-9, 9)), a = R.int(2, 12), b = s.sub(a);
    var stmt = '$x-' + a + opT(op) + b.n + '$';
    var steps = 'x-' + a + '&' + opT(op) + T.p(b) + '\\\\x-' + a + '+' + a + '&' + opT(op) + T.p(b) + '+' + a + '&&\\text{add $' + a + '$ to both sides}\\\\x&' + opT(op) + s.n;
    return mkSpec('x', stmt, steps, op, s, function (x) { return holds(x.sub(a), op, b); });
  });

  // ------------------------------------------------------------------ 5: n - fraction ? fraction
  MAT.def('ineq', 5, function (R) {
    var op = R.pick(['<=', '<', '>=', '>']);
    var f, g, s, tries = 0;
    do {
      f = Q(R.int(1, 3), R.pick([2, 3, 4, 6]));
      g = Q(R.int(1, 7), R.pick([2, 3, 4, 5, 6, 8]));
      s = g.add(f);
    } while ((f.d === 1 || g.d === 1 || s.d > 12 || Math.abs(s.num()) > 6) && tries++ < 200);
    var L = lcm(f.d, g.d);
    var stmt = '$n-' + D(f) + opT(op) + D(g) + '$';
    var steps = 'n-' + D(f) + '&' + opT(op) + D(g) + '\\\\n-' + D(f) + '+' + D(f) + '&' + opT(op) + D(g) + '+' + D(f) + '&&\\text{add $' + D(f) + '$ to both sides}\\\\n&' + opT(op) + '\\dfrac{' + (g.n * L / g.d) + '}{' + L + '}+\\dfrac{' + (f.n * L / f.d) + '}{' + L + '}=\\dfrac{' + (g.n * L / g.d + f.n * L / f.d) + '}{' + L + '}' + (s.d !== L ? '=' + D(s) : '');
    return mkSpec('n', stmt, steps, op, s, function (x) { return holds(x.sub(f), op, g); });
  });

  // ------------------------------------------------------------------ 6: c y ? k  (c > 0)
  MAT.def('ineq', 6, function (R) {
    var op = R.pick(OPS), c = R.int(2, 9), s = F(R.int(-9, 12)), k = s.mul(c), v = R.pick(['y', 'z', 'w', 'k']);
    if (v === 'k') v = 'y';
    var stmt = '$' + c + v + opT(op) + k.n + '$';
    var dl = divLine(c + v, v, String(k.n), F(c), op, k, s);
    var steps = c + v + '&' + opT(op) + k.n + '\\\\' + dl.line;
    return mkSpec(v, stmt, steps, op, s, function (x) { return holds(x.mul(c), op, k); });
  });

  // ------------------------------------------------------------------ 7: -c a ? k
  MAT.def('ineq', 7, function (R) {
    var op = R.pick(OPS), c = R.int(2, 12), s = F(R.int(-9, 9)), k = s.mul(-c), v = R.pick(['a', 'b', 'c']);
    var solOp = H.flip(op);
    var stmt = '$-' + c + v + opT(op) + k.n + '$';
    var steps = '-' + c + v + '&' + opT(op) + k.n + '\\\\\\dfrac{-' + c + v + '}{-' + c + '}&' + opT(solOp) + '\\dfrac{' + k.n + '}{-' + c + '}&&\\text{divide both sides by $-' + c + '$ and reverse the inequality}\\\\' + v + '&' + opT(solOp) + s.n;
    return mkSpec(v, stmt, steps, solOp, s, function (x) { return holds(x.mul(-c), op, k); });
  });

  // ------------------------------------------------------------------ 8: k ? (p/q) u
  MAT.def('ineq', 8, function (R) {
    var op0 = R.pick(OPS), p = R.int(2, 7), q = R.pick([3, 4, 5, 6, 7, 8, 9].filter(function (x) { return gcd(p, x) === 1; }));
    var t = R.int(-6, 6) || 3, k = F(p * t), s = F(q * t), v = R.pick(['u', 'v', 'w']);
    var solOp = H.flip(op0);
    var stmt = '$' + k.n + opT(op0) + '\\dfrac{' + p + '}{' + q + '}' + v + '$';
    var steps = k.n + '&' + opT(op0) + '\\dfrac{' + p + '}{' + q + '}' + v + '\\\\\\dfrac{' + q + '}{' + p + '}\\cdot ' + T.p(k) + '&' + opT(op0) + '\\dfrac{' + q + '}{' + p + '}\\cdot\\dfrac{' + p + '}{' + q + '}' + v + '&&\\text{multiply both sides by the reciprocal, $\\tfrac{' + q + '}{' + p + '}$}\\\\' + s.n + '&' + opT(op0) + v + '\\\\' + v + '&' + opT(solOp) + s.n;
    var spec = finish(v, stmt, steps, solOp, s);
    return withVerify(spec, H.ivFor(solOp, s), s, function (x) { return holds(k, op0, x.mul(Q(p, q))); });
  });

  // ------------------------------------------------------------------ 9: t/(-c) ? k
  MAT.def('ineq', 9, function (R) {
    var op = R.pick(OPS), c = R.int(2, 9), k = F(R.int(-9, 12) || 4), s = k.mul(-c), v = R.pick(['t', 'r', 's']);
    var solOp = H.flip(op);
    var stmt = '$\\dfrac{' + v + '}{-' + c + '}' + opT(op) + k.n + '$';
    var steps = '\\dfrac{' + v + '}{-' + c + '}&' + opT(op) + k.n + '\\\\(-' + c + ')\\dfrac{' + v + '}{-' + c + '}&' + opT(solOp) + '(-' + c + ')(' + k.n + ')&&\\text{multiply both sides by $-' + c + '$ and reverse the inequality}\\\\' + v + '&' + opT(solOp) + s.n;
    var spec = finish(v, stmt, steps, solOp, s);
    return withVerify(spec, H.ivFor(solOp, s), s, function (x) { return holds(x.div(-c), op, k); });
  });

  // ------------------------------------------------------------------ 10: alpha m ? beta m + k
  MAT.def('ineq', 10, function (R) {
    var op = R.pick(OPS), c, al, be, v = R.pick(['m', 'n', 'q']);
    do { c = R.int(-6, 6); } while (c === 0 || Math.abs(c) === 1);
    if (c < 0) { al = R.int(2, 8); be = al - c; } else { be = R.int(2, 8); al = be + c; }
    var s = F(R.int(-8, 8)), k = s.mul(c);
    var solOp = c < 0 ? H.flip(op) : op;
    var stmt = '$' + al + v + opT(op) + T.lin([[be, v], [k, '']]) + '$';
    var cT = String(c);
    var steps = al + v + '&' + opT(op) + T.lin([[be, v], [k, '']]) + '\\\\' + al + v + '-' + be + v + '&' + opT(op) + T.lin([[be, v], [k, '']]) + '-' + be + v + '&&\\text{subtract $' + be + v + '$ from both sides}\\\\' +
      T.lin([[c, v]]) + '&' + opT(op) + k.n + '\\\\\\dfrac{' + T.lin([[c, v]]) + '}{' + c + '}&' + opT(solOp) + '\\dfrac{' + k.n + '}{' + c + '}&&\\text{divide both sides by $' + c + '$' + (c < 0 ? ' and reverse the inequality' : '; the sign stays') + '}\\\\' + v + '&' + opT(solOp) + s.n;
    var spec = finish(v, stmt, steps, solOp, s);
    return withVerify(spec, H.ivFor(solOp, s), s, function (x) { return holds(x.mul(al), op, x.mul(be).add(k)); });
  });

  // ------------------------------------------------------------------ 11: distribute and combine
  MAT.def('ineq', 11, function (R) {
    var op = R.pick(OPS), v = R.pick(['p', 'x', 'y']), al, ga, de, be, ka, c, s, tries = 0;
    do {
      al = R.int(2, 9); ga = R.int(2, 5); de = R.int(2, 15); be = R.int(2, 12); ka = R.int(-30, 30);
      c = al + ga - be; s = Q(ka + ga * de, c || 1);
    } while ((c === 0 || s.d > 2 || Math.abs(s.num()) > 12) && tries++ < 3000);
    var k2 = ka + ga * de, solOp = c < 0 ? H.flip(op) : op;
    var stmt = '$' + al + v + '+' + ga + '(' + v + '-' + de + ')' + opT(op) + T.lin([[be, v], [ka, '']]) + '$';
    var steps = al + v + '+' + ga + '(' + v + '-' + de + ')&' + opT(op) + T.lin([[be, v], [ka, '']]) + '\\\\' +
      al + v + '+' + ga + v + '-' + (ga * de) + '&' + opT(op) + T.lin([[be, v], [ka, '']]) + '&&\\text{distribute}\\\\' +
      T.lin([[al + ga, v], [-ga * de, '']]) + '&' + opT(op) + T.lin([[be, v], [ka, '']]) + '&&\\text{combine like terms}\\\\' +
      T.lin([[al + ga, v], [-ga * de, '']]) + '-' + be + v + '&' + opT(op) + T.lin([[be, v], [ka, '']]) + '-' + be + v + '&&\\text{subtract $' + be + v + '$}\\\\' +
      T.lin([[c, v], [-ga * de, '']]) + '&' + opT(op) + ka + '\\\\' +
      T.lin([[c, v], [-ga * de, '']]) + '+' + (ga * de) + '&' + opT(op) + T.p(ka) + '+' + (ga * de) + '&&\\text{add $' + (ga * de) + '$}\\\\' +
      T.lin([[c, v]]) + '&' + opT(op) + k2 + '\\\\' + v + '&' + opT(solOp) + D(s) + '&&\\text{divide by $' + c + '$' + (c < 0 ? ' and reverse the inequality' : '; the sign stays') + '}';
    var spec = finish(v, stmt, steps, solOp, s);
    return withVerify(spec, H.ivFor(solOp, s), s, function (x) { return holds(x.mul(al).add(x.sub(de).mul(ga)), op, x.mul(be).add(ka)); });
  });

  // ------------------------------------------------------------------ 12: identity or contradiction (integers)
  MAT.def('ineq', 12, function (R) {
    var al = R.int(3, 9), ga = R.int(2, 4), ep = R.int(2, 5), be = al + ga - ep, v = R.pick(['x', 'y', 'a']);
    var de = R.int(2, 9), ze = R.int(2, 12), op = R.pick(OPS);
    var Lc = -ga * de, Rc = ep * ze, truth = holds(F(Lc), op, F(Rc));
    var stmt = '$' + al + v + '-' + ga + '(' + de + '-' + v + ')' + opT(op) + ep + '(' + v + '+' + ze + ')+' + be + v + '$';
    var steps = al + v + '-' + ga + '(' + de + '-' + v + ')&' + opT(op) + ep + '(' + v + '+' + ze + ')+' + be + v + '\\\\' +
      al + v + '-' + (ga * de) + '+' + ga + v + '&' + opT(op) + ep + v + '+' + (ep * ze) + '+' + be + v + '&&\\text{distribute}\\\\' +
      T.lin([[al + ga, v], [Lc, '']]) + '&' + opT(op) + T.lin([[ep + be, v], [Rc, '']]) + '&&\\text{combine like terms}\\\\' +
      T.lin([[al + ga, v], [Lc, '']]) + '-' + (al + ga) + v + '&' + opT(op) + T.lin([[ep + be, v], [Rc, '']]) + '-' + (al + ga) + v + '&&\\text{subtract $' + (al + ga) + v + '$}\\\\' + Lc + '&' + opT(op) + Rc;
    var ans = truth ? 'all' : 'none';
    return {
      instr: 'Solve ' + stmt + ' and write the solution as an inequality or as a set. (If every real number works, write <em>all real numbers</em>. If none do, write <em>no solution</em>.)',
      parts: [H.part('', '', H.solset(ans, { label: 'solution', width: 16, placeholder: 'all real numbers or no solution' }),
        '$$\\begin{aligned}' + steps + '\\end{aligned}$$ The ' + v + '’s are gone and we are left with a ' + (truth ? '<strong>true</strong> statement, so the inequality is an <strong>identity</strong>. The solution is all real numbers, $(-\\infty,\\infty)$.' : '<strong>false</strong> statement, so the inequality is a <strong>contradiction</strong>. There is <strong>no solution</strong>.'))],
      verify: function () {
        var probes = [F(0), F(1), F(-3), Q(17, 3), F(-100)];
        return probes.every(function (x) { return holds(x.mul(al).sub(F(ga).mul(F(de).sub(x))), op, x.add(ze).mul(ep).add(x.mul(be))) === truth; });
      }
    };
  });

  // ------------------------------------------------------------------ 13: fractions, identity or contradiction
  MAT.def('ineq', 13, function (R) {
    var f1, f2, f3, f4, L, tries = 0, op = R.pick(OPS), v = R.pick(['a', 'b', 'c']);
    do {
      f1 = Q(R.int(1, 5), R.pick([2, 3, 4, 6, 8]));
      f2 = Q(R.int(1, 3), R.pick([4, 6, 8, 12]));
      f3 = f1.sub(f2);
      f4 = Q(R.int(-7, 7) || 3, R.pick([2, 3, 4, 8]));
      L = [f1, f2, f3, f4].reduce(function (a, f) { return lcm(a, f.d); }, 1);
    } while ((f3.sign() <= 0 || f1.d === 1 || f2.d === 1 || f3.d === 1 || L > 48 || f4.d === 1) && tries++ < 3000);
    var truth = holds(F(0), op, f4);
    var stmt = '$' + D(f1) + v + '-' + D(f2) + v + opT(op) + D(f3) + v + (f4.sign() < 0 ? '-' + D(f4.abs()) : '+' + D(f4)) + '$';
    var m = function (f) { return f.mul(L); };
    var steps = D(f1) + v + '-' + D(f2) + v + '&' + opT(op) + D(f3) + v + (f4.sign() < 0 ? '-' + D(f4.abs()) : '+' + D(f4)) + '\\\\' +
      L + '\\left(' + D(f1) + v + '-' + D(f2) + v + '\\right)&' + opT(op) + L + '\\left(' + D(f3) + v + (f4.sign() < 0 ? '-' + D(f4.abs()) : '+' + D(f4)) + '\\right)&&\\text{multiply both sides by the LCD, $' + L + '$}\\\\' +
      m(f1).n + v + '-' + m(f2).n + v + '&' + opT(op) + m(f3).n + v + (f4.sign() < 0 ? '-' + (-m(f4).n) : '+' + m(f4).n) + '\\\\' +
      m(f3).n + v + '&' + opT(op) + m(f3).n + v + (f4.sign() < 0 ? '-' + (-m(f4).n) : '+' + m(f4).n) + '&&\\text{combine like terms}\\\\' +
      m(f3).n + v + '-' + m(f3).n + v + '&' + opT(op) + m(f3).n + v + (f4.sign() < 0 ? '-' + (-m(f4).n) : '+' + m(f4).n) + '-' + m(f3).n + v + '&&\\text{subtract $' + m(f3).n + v + '$}\\\\0&' + opT(op) + m(f4).n;
    var ans = truth ? 'all' : 'none';
    return {
      instr: 'Solve ' + stmt + ' and write the solution as an inequality or as a set. (If every real number works, write <em>all real numbers</em>. If none do, write <em>no solution</em>.)',
      parts: [H.part('', '', H.solset(ans, { label: 'solution', width: 16, placeholder: 'all real numbers or no solution' }),
        '$$\\begin{aligned}' + steps + '\\end{aligned}$$ The statement is ' + (truth ? '<strong>true</strong>, so the inequality is an <strong>identity</strong>. The solution is all real numbers.' : '<strong>false</strong>, so the inequality is a <strong>contradiction</strong>. There is <strong>no solution</strong>.'))],
      verify: function () {
        return [F(0), F(1), F(-3), Q(17, 3)].every(function (x) { return holds(x.mul(f1).sub(x.mul(f2)), op, x.mul(f3).add(f4)) === truth; });
      }
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
