/* Chapter 4: Fractions */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, T = MAT.T, gcd = MAT.gcd, lcm = MAT.lcm;
  function D(v) { v = F(v); return v.d === 1 ? String(v.n) : (v.n < 0 ? '-' : '') + '\\dfrac{' + Math.abs(v.n) + '}{' + v.d + '}'; }
  function fr(n, d) { return '\\dfrac{' + n + '}{' + d + '}'; }
  function coprimeNum(R, d, lo, hi) { var n; do { n = R.int(lo, hi); } while (gcd(n, d) !== 1); return n; }

  // ---- 1: numerator and denominator
  MAT.def('frac', 1, function (R) {
    var kinds = R.shuffle(['small', 'big', 'letter', 'over1']), parts = [];
    kinds.forEach(function (k, i) {
      var n, d, numAns, tex;
      if (k === 'small') { d = R.int(2, 9); n = R.int(1, 9); }
      else if (k === 'big') { d = R.int(10, 20); n = R.int(2, 19); }
      else if (k === 'letter') { d = R.int(5, 20); n = R.pick(['a', 'b', 'c', 'n', 'p', 'k']); }
      else { n = R.int(2, 29); d = 1; }
      numAns = String(n);
      tex = '\\dfrac{' + n + '}{' + d + '}';
      parts.push(H.part(H.lab(i), '$' + tex + '$', [
        H.expr(numAns, { label: 'numerator', width: 5 }),
        H.num(d, { label: 'denominator', width: 5, form: 'int' })
      ], 'Numerator $' + n + '$, denominator $' + d + '$.'));
    });
    return { instr: 'Name the numerator and the denominator of each fraction.', parts: parts };
  });

  // ---- 2: fractions that are whole numbers
  MAT.def('frac', 2, function (R) {
    var d1 = R.int(2, 12), d2 = R.int(3, 12), d3 = R.int(3, 12);
    var specs = R.shuffle([
      { n: R.int(2, 30), d: 1 },
      { n: d1, d: d1 },
      { n: 2 * d2, d: d2 },
      { n: R.int(3, 5) * d3, d: d3 }
    ]);
    return {
      instr: 'Write each fraction as a whole number.',
      parts: specs.map(function (s, i) {
        var v = s.n / s.d;
        return H.part(H.lab(i), '$' + fr(s.n, s.d) + '$', H.num(v, { form: 'int', width: 5 }), '$' + fr(s.n, s.d) + '=' + v + '$ (since $' + s.d + '\\cdot ' + v + '=' + s.n + '$)');
      })
    };
  });

  // ---- 3: write over 24, order
  MAT.def('frac', 3, function (R) {
    var dens = [2, 3, 4, 6, 8, 12], fracs = [], seen = {};
    while (fracs.length < 4) {
      var d = R.pick(dens), n = coprimeNum(R, d, 1, d - 1);
      if (d === 2) n = 1;
      var v = F(n).div(d), key = v.str();
      if (seen[key]) continue;
      seen[key] = 1; fracs.push({ n: n, d: d, v: v, n24: n * (24 / d) });
    }
    var sorted = fracs.slice().sort(function (a, b) { return a.v.cmp(b.v); });
    var shown = fracs.map(function (f) { return fr(f.n, f.d); }).join(',\\ ');
    var conv = fracs.map(function (f) { return fr(f.n + '\\cdot ' + (24 / f.d), f.d + '\\cdot ' + (24 / f.d)) + '=' + fr(f.n24, 24); }).join(',\\quad ');
    var ord = sorted.map(function (f) { return fr(f.n24, 24); }).join('<'), ord2 = sorted.map(function (f) { return fr(f.n, f.d); }).join('<');
    return {
      instr: 'Which of $' + shown + '$ is the smallest? Write all four with a denominator of $24$ and then order them from smallest to largest.',
      parts: [
        H.part('a.', 'Write each fraction with denominator $24$. Enter the four numerators, in the order shown, separated by commas.', H.list(fracs.map(function (f) { return f.n24; }), { ordered: true, width: 14, placeholder: 'e.g. 3, 7, 9, 10' }), '$' + conv + '$'),
        H.part('b.', 'Which fraction is the smallest?', H.num(sorted[0].v, { width: 6, form: 'frac' }), 'Comparing numerators over $24$: $' + ord + '$, so the smallest is $' + fr(sorted[0].n, sorted[0].d) + '$.'),
        H.part('c.', 'Order the fractions from smallest to largest (separated by commas).', H.list(sorted.map(function (f) { return f.v; }), { ordered: true, width: 20, placeholder: 'e.g. 1/2, 2/3, 3/4, 5/6' }), '$' + ord2 + '$')
      ]
    };
  });

  // ---- 4: prime or composite
  MAT.def('frac', 4, function (R) {
    var primes = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    var comps = [];
    for (var n = 12; n < 130; n++) if (!MAT.isPrime(n) && n % 2 && n % 5) comps.push(n);       // odd composites are the interesting ones
    comps = comps.concat([12, 14, 15, 16, 18, 20, 21, 24, 25]);
    var items = R.shuffle([R.pick(primes), R.pick(comps), R.pick(R.bool() ? primes : comps)]);
    return {
      instr: 'Identify each number as prime or composite.',
      parts: items.map(function (n, i) {
        var isP = MAT.isPrime(n), f = 2;
        while (f * f <= n && n % f) f++;
        return H.part(H.lab(i), '$' + n + '$', H.choice(['Prime', 'Composite'], isP ? 0 : 1),
          isP ? '$' + n + '$ is not divisible by any prime smaller than itself (none of $2,3,5,7,\\ldots$ divide it evenly), so it is <strong>prime</strong>.'
              : '$' + n + '\\div ' + f + '=' + (n / f) + '$ is a whole number, so $' + n + '$ is <strong>composite</strong>.');
      })
    };
  });

  // ---- 5: prime factorizations
  MAT.def('frac', 5, function (R) {
    var a, b, c;
    do { a = Math.pow(2, R.int(1, 3)) * R.pick([3, 5, 7]) * R.pick([3, 5, 7, 1]); } while (a < 30 || a > 900 || MAT.isPrime(a));
    var p = R.pick([7, 11, 13, 17]); b = Math.pow(2, R.int(3, 6)) * p;
    var q = R.pick([3, 5, 7]); c = Math.pow(q, 3);
    var parts = R.shuffle([a, b, c]).map(function (n, i) {
      var steps = [], m = n, f = 2, fs = [];
      while (m > 1) { while (m % f === 0) { fs.push(f); m /= f; } f++; }
      var div = []; m = n; fs.forEach(function (x) { div.push(m + '\\div ' + x + '=' + (m / x)); m /= x; });
      return H.part(H.lab(i), '$' + n + '$', H.primefact(n, { width: 12, placeholder: 'e.g. 2^3*5' }),
        '$' + n + '=' + fs.join('\\cdot ') + '=' + MAT.primeFactorTex(n) + '$');
    });
    return { instr: 'Find the prime factorization of each number. Write exponents with <code>^</code>, for example <code>2^3*5</code> for $2^3\\cdot 5$.', parts: parts };
  });

  // ---- 6: reduce to lowest terms
  MAT.def('frac', 6, function (R) {
    var specs = R.shuffle([[false, false], [false, false], [false, false], [true, true], [false, true]]);
    var parts = specs.map(function (s, i) {
      var q = R.int(2, 14), p, g = R.int(2, 9);
      if (s[1]) { do { p = R.int(q + 1, 3 * q); } while (gcd(p, q) !== 1); }
      else { do { p = R.int(1, q - 1); } while (gcd(p, q) !== 1); }
      var n = g * p, d = g * q, sg = s[0] ? -1 : 1;
      var ans = F(sg * p).div(q);
      var sol = (sg < 0 ? '-' : '') + fr(n, d) + '=' + (sg < 0 ? '-' : '') + fr(p + '\\cdot ' + g, q + '\\cdot ' + g) + '=' + D(ans);
      return H.part(H.lab(i), '$' + (sg < 0 ? '-' : '') + fr(n, d) + '$', H.num(ans, { form: 'frac', width: 7 }), '$' + sol + '$ (divide top and bottom by their greatest common factor, $' + g + '$)');
    });
    return { instr: 'Reduce each fraction to lowest terms.', parts: parts };
  });

  // ---- 7: division
  MAT.def('frac', 7, function (R) {
    var p = coprimeNum(R, 35, 1, 20), q1 = R.pick([9, 15, 16, 21, 25, 35]), k = R.pick([2, 3, 4, 6, 8, 9]);
    var a1 = F(coprimeNum(R, q1, 1, q1 * 2)).div(q1);
    var parts = [];
    // a: fraction divided by a whole number
    var ans1 = a1.div(k);
    parts.push(H.part('a.', '$' + D(a1) + '\\div ' + k + '$', H.num(ans1, { form: 'frac', width: 7 }),
      '$' + D(a1) + '\\div ' + k + '=' + D(a1) + '\\cdot ' + fr(1, k) + '=' + D(ans1) + '$'));
    // b: whole number divided by a fraction (a whole-number answer)
    var pn = R.pick([2, 3, 4, 5]), pd = R.pick([2, 3, 4, 5, 7].filter(function (x) { return gcd(pn, x) === 1; }));
    var t = R.int(2, 9), whole = pn * t;
    var ans2 = F(whole).div(F(pn).div(pd));
    parts.push(H.part('b.', '$' + whole + '\\div ' + fr(pn, pd) + '$', H.num(ans2, { form: 'frac', width: 7 }),
      '$' + whole + '\\div ' + fr(pn, pd) + '=' + fr(whole, 1) + '\\cdot ' + fr(pd, pn) + '=' + D(ans2) + '$'));
    // c: fraction divided by a fraction
    var c1 = F(coprimeNum(R, 32, 1, 31)).div(32), c2;
    var d2 = R.pick([8, 12, 16, 9, 10]);
    c2 = F(coprimeNum(R, d2, 1, d2 + 8)).div(d2);
    var ans3 = c1.div(c2);
    parts.push(H.part('c.', '$' + D(c1) + '\\div ' + D(c2) + '$', H.num(ans3, { form: 'frac', width: 7 }),
      '$' + D(c1) + '\\div ' + D(c2) + '=' + D(c1) + '\\cdot ' + D(c2.recip()) + '=' + D(ans3) + '$ (reduced to lowest terms)'));
    return { instr: 'Divide. Give each answer in lowest terms.', parts: parts };
  });

  // ---- 8: LCD and ordering
  MAT.def('frac', 8, function (R) {
    var sets = [[2, 4, 8, 16], [3, 6, 9, 12], [4, 6, 8, 12], [2, 3, 5, 10], [3, 4, 6, 12], [5, 10, 20, 4], [6, 8, 12, 24]];
    var ds = R.pick(sets), fracs = [], seen = {};
    var tries = 0;
    while (fracs.length < 4 && tries++ < 200) {
      var d = ds[fracs.length], n = coprimeNum(R, d, 1, d - 1);
      if (d === 2) n = 1;
      var v = F(n).div(d);
      if (seen[v.str()]) continue; seen[v.str()] = 1; fracs.push({ n: n, d: d, v: v });
    }
    if (fracs.length < 4) { ds = sets[0]; fracs = [{ n: 5, d: 8 }, { n: 5, d: 16 }, { n: 3, d: 4 }, { n: 1, d: 2 }].map(function (f) { f.v = F(f.n).div(f.d); return f; }); }
    fracs = R.shuffle(fracs);
    var L = fracs.reduce(function (a, f) { return lcm(a, f.d); }, 1);
    var sorted = fracs.slice().sort(function (a, b) { return a.v.cmp(b.v); });
    var shown = fracs.map(function (f) { return fr(f.n, f.d); }).join(',\\quad ');
    var conv = fracs.map(function (f) { return fr(f.n, f.d) + '=' + fr(f.n * L / f.d, L); }).join(',\\quad ');
    return {
      instr: 'Find the least common denominator (LCD) of the fractions and write them from smallest to largest.',
      display: '$' + shown + '$',
      parts: [
        H.part('a.', 'The LCD is', H.num(L, { form: 'int', width: 5 }), 'The LCD is the smallest number that every denominator ($' + fracs.map(function (f) { return f.d; }).join(', ') + '$) divides into: $' + L + '$.'),
        H.part('b.', 'Order from smallest to largest (separated by commas)', H.list(sorted.map(function (f) { return f.v; }), { ordered: true, width: 22, placeholder: 'e.g. 1/2, 3/4, ...' }),
          'Over the LCD: $' + conv + '$. In order: $' + sorted.map(function (f) { return fr(f.n * L / f.d, L); }).join('<') + '$, so $' + sorted.map(function (f) { return fr(f.n, f.d); }).join('<') + '$.')
      ]
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
