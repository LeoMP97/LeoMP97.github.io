/* Chapter 3: Divisibility tests */
(function (root) {
  var MAT = root.MAT, H = MAT.H, T = MAT.T;
  var DIVS = [2, 3, 4, 5, 6, 8, 9, 10];

  function divisors(N) { return DIVS.filter(function (d) { return N % d === 0; }); }
  function digitSum(N) { return String(N).split('').reduce(function (a, c) { return a + +c; }, 0); }
  function fmt(N) { return N >= 1000 ? T.commas(N) : String(N); }

  function solution(N) {
    var s = String(N), last = +s[s.length - 1], l2 = +s.slice(-2), l3 = +s.slice(-3), ds = digitSum(N);
    var yes = function (b) { return b ? '<strong>Yes</strong>' : '<strong>No</strong>'; };
    var lines = [];
    lines.push('By $2$: the last digit is $' + last + '$, ' + (last % 2 === 0 ? 'which is even' : 'which is odd') + '. ' + yes(N % 2 === 0));
    lines.push('By $3$: the digits add to $' + s.split('').join('+') + '=' + ds + '$, and $' + ds + (ds % 3 === 0 ? '$ is' : '$ is not') + ' divisible by $3$. ' + yes(N % 3 === 0));
    lines.push('By $4$: the last two digits are $' + l2 + '$, and $' + l2 + (l2 % 4 === 0 ? '$ is' : '$ is not') + ' divisible by $4$. ' + yes(N % 4 === 0));
    lines.push('By $5$: the last digit is $' + last + '$' + (last === 0 || last === 5 ? ', which is $0$ or $5$. ' : ', which is not $0$ or $5$. ') + yes(N % 5 === 0));
    lines.push('By $6$: divisible by both $2$ and $3$? ' + (N % 2 === 0 ? 'Yes' : 'No') + ' and ' + (N % 3 === 0 ? 'yes' : 'no') + '. ' + yes(N % 6 === 0));
    lines.push('By $8$: the last three digits are $' + l3 + '$, and $' + l3 + (l3 % 8 === 0 ? '$ is' : '$ is not') + ' divisible by $8$. ' + yes(N % 8 === 0));
    lines.push('By $9$: the digits add to $' + ds + '$, and $' + ds + (ds % 9 === 0 ? '$ is' : '$ is not') + ' divisible by $9$. ' + yes(N % 9 === 0));
    lines.push('By $10$: the last digit is $' + last + '$' + (last === 0 ? ', which is $0$. ' : ', which is not $0$. ') + yes(N % 10 === 0));
    var d = divisors(N), no = DIVS.filter(function (x) { return d.indexOf(x) < 0; });
    var word = function (a) { return a.length ? a.map(function (x) { return '$' + x + '$'; }).join(', ') : 'none of them'; };
    return lines.join('<br>') + '<br><br>So $' + fmt(N) + '$ is divisible by ' + word(d) + ', but not by ' + word(no) + '.';
  }

  function make(lo, hi) {
    return function (R) {
      var N, c = 0;
      do { N = R.int(lo, hi); c = divisors(N).length; } while (c < 2 || c > 6);
      var opts = DIVS.map(function (d) { return '$' + d + '$'; });
      return {
        instr: 'Determine whether $' + fmt(N) + '$ is divisible by $2, 3, 4, 5, 6, 8, 9$ or $10$. Select every number that divides it evenly.',
        parts: [H.part('', '', H.multi(opts, divisors(N).map(function (d) { return DIVS.indexOf(d); })), '')],
        solution: solution(N),
        verify: function () { return divisors(N).every(function (d) { return N % d === 0; }); }
      };
    };
  }
  // the helper wants a solution per part or a general solution; generators supply a general one
  MAT.def('div', 1, make(20, 99));
  MAT.def('div', 2, make(100, 999));
  MAT.def('div', 3, make(1000, 4999));
  MAT.def('div', 4, make(1000, 9999));
})(typeof window !== 'undefined' ? window : globalThis);
