/* Chapter 2: Arithmetic review */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, T = MAT.T;
  var cm = T.commas;
  function neg(v) { return v < 0 ? '(' + v + ')' : String(v); }

  // ---- exponents: base, exponent, and how to say it
  function readingOptions(R, b, e) {
    var ordE = T.ordinal(e), cb = T.cardinal(b), ce = T.cardinal(e);
    var good = [cb + ' to the ' + ordE + ' power'];
    if (e === 2) good.push(cb + ' squared');
    if (e === 3) good.push(cb + ' cubed');
    var bad = [ce + ' to the ' + T.ordinal(b) + ' power', cb + ' times ' + ce];
    bad.push(cb + ' to the ' + T.ordinal(e === 2 || e === 3 ? e + 1 : e - 1) + ' power');
    var all = R.shuffle(good.concat(bad));
    var ans = [];
    all.forEach(function (o, i) { if (good.indexOf(o) >= 0) ans.push(i); });
    return { options: all, ans: ans, good: good };
  }
  function baseExp(bases, exps) {
    return function (R) {
      var parts = [], used = {};
      for (var i = 0; i < 4; i++) {
        var b, e, key;
        do { b = R.int(bases[0], bases[1]); e = i === 0 ? R.pick([2, 3]) : R.int(exps[0], exps[1]); key = b + '^' + e; } while (used[key] || b === e);
        used[key] = 1;
        var ro = readingOptions(R, b, e);
        var say = ro.good.map(function (g) { return '“' + g + '”'; }).join(' or ');
        parts.push(H.part(H.lab(i), '$' + b + '^{' + e + '}$', [
          H.num(b, { label: 'base', width: 4, form: 'int' }),
          H.num(e, { label: 'exponent', width: 4, form: 'int' }),
          H.choice(ro.options, ro.ans, { label: 'we say' })
        ], '$' + b + '^{' + e + '}$: base $' + b + '$, exponent $' + e + '$, ' + say + '.'));
      }
      return { instr: 'For each expression, what is the base and what is the exponent? How would we say it?', parts: parts };
    };
  }
  MAT.def('arith', 1, baseExp([2, 6], [2, 5]));
  MAT.def('arith', 11, baseExp([2, 9], [2, 7]));

  // ---- expand and solve
  MAT.def('arith', 2, function (R) {
    var parts = [], used = {};
    for (var i = 0; i < 4; i++) {
      var b, e;
      do { b = R.int(2, 9); e = R.int(2, b <= 3 ? 5 : b <= 5 ? 3 : 2); } while (used[b + '^' + e]);
      used[b + '^' + e] = 1;
      var val = Math.pow(b, e), steps = [], run = b;
      var prod = []; for (var k = 0; k < e; k++) prod.push(b);
      var sol = '$' + prod.join('\\cdot ') + '=';
      if (e === 2) sol += val; else if (e === 3) sol += (b * b) + '\\cdot ' + b + '=' + val; else sol += (b * b) + '\\cdot ' + (b * b) + (e === 4 ? '=' + val : '\\cdot ' + b + '=' + val);
      sol += '$';
      parts.push(H.part(H.lab(i), '$' + b + '^{' + e + '}$', H.num(val, { form: 'int', width: 6 }), sol));
    }
    return { instr: 'Expand each expression and solve.', parts: parts };
  });

  // ---- special exponents 0 and 1
  function special(R) {
    var kinds = R.shuffle([1, 1, 0, 0]), parts = [], used = {};
    kinds.forEach(function (e, i) {
      var b;
      do { b = R.int(2, 49); } while (used[b]);
      used[b] = 1;
      parts.push(H.part(H.lab(i), '$' + b + '^{' + e + '}$', H.num(e === 1 ? b : 1, { form: 'int', width: 6 }),
        '$' + b + '^{' + e + '}=' + (e === 1 ? b : 1) + '$ (' + (e === 1 ? 'an exponent of $1$ leaves the base alone' : 'any nonzero number to the power $0$ is $1$') + ').'));
    });
    return { instr: 'Evaluate each expression.', parts: parts };
  }
  MAT.def('arith', 3, special);
  MAT.def('arith', 12, special);

  // ---- greater than / less than
  function compare(R) {
    var specs = R.shuffle(['pp', 'pp', 'np', 'nn']), parts = [];
    specs.forEach(function (k, i) {
      var a, b;
      if (k === 'pp') { a = R.int(1, 150); do { b = R.int(1, 150); } while (b === a); }
      else if (k === 'np') { a = -R.int(1, 20); b = R.int(1, 20); }
      else { a = -R.int(1, 20); do { b = -R.int(1, 20); } while (b === a); }
      if (R.bool()) { var t = a; a = b; b = t; }
      var sym = a < b ? '<' : '>';
      parts.push(H.part(H.lab(i), '$' + a + '\\ \\_\\ ' + b + '$', H.choice(['$<$', '$>$'], a < b ? 0 : 1),
        '$' + a + sym + b + '$' + (a < 0 || b < 0 ? (a < 0 && b < 0 ? ' (the number farther from zero on the negative side is smaller)' : '') : '')));
    });
    return { instr: 'Choose the correct symbol, $<$ or $>$, to make each statement true.', parts: parts };
  }
  MAT.def('arith', 4, compare);
  MAT.def('arith', 13, compare);

  // ---- absolute value
  MAT.def('arith', 5, function (R) {
    var vals = [];
    var used = {};
    while (vals.length < 6) {
      var v = R.int(2, 99) * (vals.length < 5 && R.bool(0.75) ? -1 : 1);
      if (used[v]) continue; used[v] = 1; vals.push(v);
    }
    if (vals.every(function (v) { return v < 0; })) vals[5] = Math.abs(vals[5]);
    var parts = vals.map(function (v, i) { return H.part(H.lab(i), '$|' + v + '|$', H.num(Math.abs(v), { form: 'int', width: 6 }), '$|' + v + '|=' + Math.abs(v) + '$' + (v < 0 ? ' (distance from $0$)' : '')); });
    return { instr: 'Find the absolute value.', parts: parts };
  });

  // ---- commutative / associative rewrites
  MAT.def('arith', 6, function (R) {
    var parts = [], i;
    var cs = [];
    var a1 = R.int(2, 15), b1 = R.int(2, 15), a2 = R.int(2, 29), b2 = R.int(2, 29), a3 = R.int(5, 40);
    var letter = R.pick(['n', 'x', 'y', 't']), a4 = R.int(2, 12);
    var comm = [[a1 + '+' + b1, b1 + '+' + a1], [a2 + '+' + b2, b2 + '+' + a2], [a3 + '+0', '0+' + a3], [a4 + '+' + letter, letter + '+' + a4]];
    comm.forEach(function (c, k) {
      parts.push(H.part('1' + 'abcd'[k] + '.', '$' + c[0] + '$', H.exact([c[1]], { width: 10, hintWrong: 'Swap the order of the two numbers.' }), '$' + c[0] + '=' + c[1] + '$'));
    });
    var ass = [];
    for (i = 0; i < 4; i++) {
      var x = R.int(2, 40), y = R.int(2, 40), z = R.int(2, 40);
      ass.push([x, y, z]);
      parts.push(H.part('2' + 'abcd'[i] + '.', '$(' + x + '+' + y + ')+' + z + '$', H.exact([x + '+(' + y + '+' + z + ')'], { width: 12, hintWrong: 'Regroup so the parentheses are around the second and third numbers.' }),
        '$(' + x + '+' + y + ')+' + z + '=' + x + '+(' + y + '+' + z + ')$'));
    }
    return { instr: '<strong>1.</strong> Rewrite each sum using the commutative property (change the order). <strong>2.</strong> Rewrite each sum using the associative property (change the grouping). Type your answer with the parentheses, like <code>4+(5+6)</code>.', parts: parts };
  });

  // ---- sums using the properties
  MAT.def('arith', 7, function (R) {
    var sizes = [3, 3, 5, 5], parts = [];
    sizes.forEach(function (n, i) {
      var nums = []; for (var k = 0; k < n; k++) nums.push(R.int(1, 9));
      var run = nums[0], steps = [];
      for (k = 1; k < n; k++) { run += nums[k]; steps.push(run); }
      // regroup: find pairs adding to 10 first when they exist
      parts.push(H.part(H.lab(i), '$' + nums.join('+') + '$', H.num(run, { form: 'int', width: 6 }), '$' + nums.join('+') + '=' + steps.join('=') + '$'));
    });
    return { instr: 'Find each sum. Use the properties of addition to group numbers that are easy to add.', parts: parts };
  });

  // ---- division with signs
  MAT.def('arith', 8, function (R) {
    var parts = [];
    var signs = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    [0, 1].forEach(function (row) {
      var d = R.int(2, 9), q = R.int(2, 9), a = d * q;
      signs.forEach(function (s, i) {
        var num = s[0] * a, den = s[1] * d, ans = num / den;
        var tex = row === 0 ? num + '\\div ' + neg(den) : '\\dfrac{' + num + '}{' + den + '}';
        parts.push(H.part((row + 1) + 'abcd'[i] + '.', '$' + tex + '$', H.num(ans, { form: 'int', width: 6 }),
          '$' + tex + '=' + ans + '$ (' + (s[0] * s[1] > 0 ? 'same signs, so the quotient is positive' : 'different signs, so the quotient is negative') + ')'));
      });
    });
    return { instr: 'Divide.', parts: parts };
  });

  // ---- long division
  function longDiv(count, divs, qlo, qhi) {
    return function (R) {
      var parts = [], used = {};
      for (var i = 0; i < count; i++) {
        var d, q;
        do { d = R.pick(divs); q = R.int(qlo, qhi); } while (used[d * q]);
        used[d * q] = 1;
        var n = d * q;
        parts.push(H.part(H.lab(i), '$' + cm(n) + '\\div ' + d + '$', H.num(q, { form: 'int', width: 7 }),
          '$' + cm(n) + '\\div ' + d + '=' + cm(q) + '$. Check: $' + d + '\\cdot ' + cm(q) + '=' + cm(n) + '$.'));
      }
      return { instr: 'Divide using long division on paper, then type the quotient. (Check your answer by multiplying.)', parts: parts };
    };
  }
  MAT.def('arith', 9, longDiv(6, [3, 4, 5, 6, 7, 8, 9, 12, 14, 15, 16, 24, 25, 32, 35, 36, 45, 56], 25, 2200));
  MAT.def('arith', 10, longDiv(4, [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16], 15, 99));
})(typeof window !== 'undefined' ? window : globalThis);
