/* Chapter 6: Variables and expressions */
(function (root) {
  var MAT = root.MAT, H = MAT.H;
  var LETTERS = ['x', 'y', 'z', 'n', 't', 'a', 'b', 'k', 'm', 'p', 'w'];
  // ---- 1: variable and constant
  MAT.def('vars', 1, function (R) {
    var vs = R.shuffle(LETTERS).slice(0, 3);
    var forms = R.shuffle(['v+c', 'c-v', 'c+v', 'v+c', 'c-v']).slice(0, 3);
    return {
      instr: 'Identify the variable and the constant in each expression.',
      parts: forms.map(function (f, i) {
        var v = vs[i], c = R.int(2, 60);
        var tex = f === 'v+c' ? v + '+' + c : f === 'c-v' ? c + '-' + v : c + '+' + v;
        return H.part(H.lab(i), '$' + tex + '$', [
          H.text(v, { label: 'variable', width: 4, aria: 'the variable' }),
          H.num(c, { label: 'constant', width: 5, form: 'int', aria: 'the constant' })
        ], '$' + v + '$ is the variable and $' + c + '$ is the constant.');
      })
    };
  });
})(typeof window !== 'undefined' ? window : globalThis);
