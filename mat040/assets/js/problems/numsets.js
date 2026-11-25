/* Chapter 1: Number sets */
(function (root) {
  var MAT = root.MAT, H = MAT.H, F = MAT.F, T = MAT.T;

  // a list of numbers; the student picks the counting numbers and the whole numbers
  function numberSetExample(count) {
    return function (R) {
      var items = [];
      function add(tex, counting, whole) { items.push({ tex: tex, counting: counting, whole: whole }); }
      var nCounting = R.int(2, 3);
      R.distinct(nCounting, 1, 250).forEach(function (v) { add(String(v), true, true); });
      if (R.bool(0.85)) add('0', false, true);
      // not whole numbers
      var kinds = R.shuffle(['frac', 'dec', 'negint', 'negdec', 'frac2']);
      var i = 0;
      while (items.length < count) {
        var k = kinds[i++ % kinds.length], tex;
        if (k === 'frac' || k === 'frac2') { var d = R.int(2, 9), n = R.int(1, 9); if (n % d === 0) n++; tex = '\\tfrac{' + n + '}{' + d + '}'; }
        else if (k === 'dec') tex = R.int(1, 19) + '.' + R.int(1, 9);
        else if (k === 'negint') tex = '-' + R.int(1, 9);
        else tex = '-' + R.int(1, 9) + '.' + R.int(1, 9);
        add(tex, false, false);
      }
      items = R.shuffle(items);
      var opts = items.map(function (it) { return '$' + it.tex + '$'; });
      var pick = function (key) { var a = []; items.forEach(function (it, ix) { if (it[key]) a.push(ix); }); return a; };
      var list = function (key, extra) {
        var ts = items.filter(function (it) { return it[key]; }).map(function (it) { return '$' + it.tex + '$'; });
        return ts.length ? ts.join(', ') : 'none of them';
      };
      var neither = items.filter(function (it) { return !it.whole; }).map(function (it) { return '$' + it.tex + '$'; }).join(', ');
      return {
        instr: 'Which of the following are (a) counting numbers? (b) whole numbers? Select every one that applies.',
        display: '$' + items.map(function (it) { return it.tex; }).join(',\\ ') + '$',
        parts: [
          H.part('a.', 'Counting numbers', H.multi(opts, pick('counting')), 'Counting numbers start at $1$, so $0$ is not one. The counting numbers are ' + list('counting') + '.'),
          H.part('b.', 'Whole numbers', H.multi(opts, pick('whole')), 'Whole numbers are the counting numbers together with $0$. The whole numbers are ' + list('whole') + '. ' + (neither ? neither + ' are neither counting numbers nor whole numbers.' : ''))
        ]
      };
    };
  }
  MAT.def('numsets', 1, numberSetExample(6));
  MAT.def('numsets', 2, numberSetExample(6));
  MAT.def('numsets', 3, numberSetExample(7));
})(typeof window !== 'undefined' ? window : globalThis);
