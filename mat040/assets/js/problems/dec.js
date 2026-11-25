/* Chapter 5: Decimals */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, T = MAT.T, gcd = MAT.gcd;
  function fr(n, d) { return '\\dfrac{' + n + '}{' + d + '}'; }
  // 12 = 2 \cdot 2 \cdot 3
  function facStr(n) {
    if (n === 1) return '1';
    var f = MAT.primeFactors(n), out = [];
    Object.keys(f).map(Number).sort(function (a, b) { return a - b; }).forEach(function (p) { for (var i = 0; i < f[p]; i++) out.push(p); });
    return out.join('\\cdot ');
  }

  // ---- 1: improper fraction -> mixed number
  MAT.def('dec', 1, function (R) {
    var parts = [];
    var dens = R.shuffle([2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    dens.forEach(function (d, i) {
      var whole = R.int(1, 5), r;
      do { r = R.int(1, d - 1); } while (gcd(r, d) !== 1);
      var n = whole * d + r;
      var work = i === 0
        ? fr(n, d) + '\\to' + Array(whole + 1).join(fr(d, d) + '+') + fr(r, d) + '=' + whole + fr(r, d)
        : fr(n, d) + '\\to' + whole + fr(r, d) + '\\quad(\\text{since }' + whole + '\\cdot' + d + '=' + whole * d + '\\text{ and }' + n + '-' + whole * d + '=' + r + ')';
      parts.push(H.part(H.lab(i), '$' + fr(n, d) + '$', H.num(F(n).div(d), { form: 'mixed', width: 8, placeholder: 'e.g. 2 1/3' }), '$' + work + '$'));
    });
    return { instr: 'Write each improper fraction in mixed notation.', hint: 'Type a mixed number with a space, like <code>3 1/3</code>.', parts: parts };
  });

  // ---- 2: place value
  var PLACES = [
    { name: 'tens', idx: 0, rep: function (d) { return d + '\\text{ tens}'; } },
    { name: 'ones', idx: 1, rep: function (d) { return d + '\\text{ ones}'; } },
    { name: 'tenths', idx: 2, rep: function (d) { return fr(d, 10); } },
    { name: 'hundredths', idx: 3, rep: function (d) { return fr(d, 100); } },
    { name: 'thousandths', idx: 4, rep: function (d) { return fr(d, 1000); } },
    { name: 'ten-thousandths', idx: 5, rep: function (d) { return fr(d, 10000); } }
  ];
  MAT.def('dec', 2, function (R) {
    var digs = R.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6);
    var num = digs[0] + '' + digs[1] + '.' + digs.slice(2).join('');
    var asked = R.shuffle(PLACES.concat([{ name: 'hundreds', idx: -1 }]));
    return {
      instr: 'Consider the number $' + num + '$.',
      parts: asked.map(function (p, i) {
        var d = p.idx < 0 ? 0 : digs[p.idx];
        var sol = p.idx < 0 ? '$0$ (there is no digit in the hundreds place)' : '$' + d + '$' + (p.idx >= 2 ? ' (it represents $' + p.rep(d) + '$)' : '');
        return H.part(H.lab(i), 'What number is in the ' + p.name + ' place?', H.num(d, { form: 'int', width: 4 }), sol);
      })
    };
  });

  // ---- 3: expanded form
  function digitsToExpanded(intDigits, decDigits) {
    var terms = [], texTerms = [], vals = [];
    intDigits.forEach(function (d, i) {
      var p = intDigits.length - 1 - i, v = d * Math.pow(10, p);
      terms.push(v); vals.push(v);
      texTerms.push(T.commas(v));
    });
    decDigits.forEach(function (d, i) {
      var den = Math.pow(10, i + 1);
      vals.push(F(d).div(den));
      texTerms.push(d === 0 ? '0' : fr(d, den));
    });
    return { vals: vals, tex: texTerms.join('+') };
  }
  function randDigits(R, n, noEnd0) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(R.int(0, 9));
    if (noEnd0 !== false) out[n - 1] = R.int(1, 9);
    return out;
  }
  MAT.def('dec', 3, function (R) {
    var shapes = R.shuffle([[4, 2], [2, 3], [3, 3], [3, 2], [2, 4]]).slice(0, 3);
    return {
      instr: 'Write each number in expanded form.',
      hint: 'Write the value of each digit and add them. Use fractions for the digits after the decimal point, for example <code>3000 + 500 + 2 + 2/10 + 3/100</code>. Terms that are zero can be left out.',
      parts: shapes.map(function (s, i) {
        var ints = randDigits(R, s[0], false), decs = randDigits(R, s[1]);
        if (ints[0] === 0) ints[0] = R.int(1, 9);
        if (s[0] === 4 && ints[1] === 0 && ints[2] === 0) ints[1] = R.int(1, 9);
        else if (s[0] === 4 && R.bool() && ints[1] !== 0) ints[2] = 0;       // a zero in the middle, like 3,502.23
        var shown = T.commas(ints.join('')) + '.' + decs.join('');
        var ex = digitsToExpanded(ints, decs);
        return H.part(H.lab(i), '$' + shown + '$', H.expanded(ex.vals, { width: 40, placeholder: 'e.g. 300 + 20 + 5 + 1/10' }), '$' + ex.tex + '$');
      })
    };
  });

  // ---- 4: decimal -> reduced fraction
  MAT.def('dec', 4, function (R) {
    function pickDec(places, maxDen, not) {
      for (;;) {
        var d = Math.pow(10, places), n = R.int(1, d - 1);
        if (n % 10 === 0) continue;
        var g = gcd(n, d), den = d / g;
        if (den > maxDen || den === 1 || (not && not.indexOf(n) >= 0)) continue;
        if (places === 3 && n % 100 === 0) continue;
        return n;
      }
    }
    var a = pickDec(2, 25), b = pickDec(3, 40), c = pickDec(3, 40, [b]);
    var items = R.shuffle([{ n: a, p: 2 }, { n: b, p: 3 }, { n: c, p: 3 }]);
    return {
      instr: 'Change each decimal to a fraction and reduce to lowest terms.',
      hint: 'Enter a fraction like <code>7/20</code>.',
      parts: items.map(function (it, i) {
        var d = Math.pow(10, it.p), g = gcd(it.n, d), n2 = it.n / g, d2 = d / g;
        var dec = '0.' + String(it.n).padStart(it.p, '0');
        var sol = dec + '=' + fr(it.n, d) + '=' + fr(facStr(it.n), facStr(d)) + '=' + fr(n2, d2);
        return H.part(H.lab(i), '$' + dec + '$', H.num(F(n2).div(d2), { form: 'frac', width: 8, placeholder: 'e.g. 7/20' }), '$' + sol + '$');
      })
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
