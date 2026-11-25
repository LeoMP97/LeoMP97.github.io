/* MAT040 notes: core math utilities.
   Exact rational arithmetic, polynomial parsing, and the answer checkers used by the
   interactive examples. Works in the browser (window.MAT) and in Node (module.exports). */
(function (root) {
  'use strict';
  var MAT = root.MAT || (root.MAT = {});

  // ------------------------------------------------------------------ random numbers
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    var f = mulberry32(seed == null ? Math.floor(Math.random() * 4294967296) : seed);
    var R = {
      next: f,
      int: function (a, b) { return a + Math.floor(f() * (b - a + 1)); },          // inclusive
      pick: function (arr) { return arr[Math.floor(f() * arr.length)]; },
      sign: function () { return f() < 0.5 ? -1 : 1; },
      nonzero: function (a, b) { var v; do { v = R.int(a, b); } while (v === 0); return v; },
      bool: function (p) { return f() < (p == null ? 0.5 : p); },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
        return a;
      },
      // k distinct integers from [a,b]
      distinct: function (k, a, b) {
        var pool = []; for (var i = a; i <= b; i++) pool.push(i);
        return R.shuffle(pool).slice(0, k);
      },
      // fraction with denominator in dens, numerator in [1, d*max-1] not reducible
      frac: function (dens, maxWhole) {
        var d = R.pick(dens), n;
        do { n = R.int(1, d * (maxWhole || 1) - 1); } while (gcd(n, d) !== 1);
        return new Frac(n, d);
      }
    };
    return R;
  }

  // ------------------------------------------------------------------ fractions
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return Math.abs(a * b) / gcd(a, b); }

  function Frac(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('Division by zero');
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d) || 1;
    this.n = n / g; this.d = d / g;
  }
  Frac.prototype = {
    add: function (o) { o = F(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); },
    sub: function (o) { o = F(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); },
    mul: function (o) { o = F(o); return new Frac(this.n * o.n, this.d * o.d); },
    div: function (o) { o = F(o); return new Frac(this.n * o.d, this.d * o.n); },
    neg: function () { return new Frac(-this.n, this.d); },
    abs: function () { return new Frac(Math.abs(this.n), this.d); },
    pow: function (k) { var r = new Frac(1); for (var i = 0; i < k; i++) r = r.mul(this); return r; },
    recip: function () { return new Frac(this.d, this.n); },
    cmp: function (o) { o = F(o); var x = this.n * o.d - o.n * this.d; return x < 0 ? -1 : x > 0 ? 1 : 0; },
    eq: function (o) { o = F(o); return this.n === o.n && this.d === o.d; },
    isInt: function () { return this.d === 1; },
    isZero: function () { return this.n === 0; },
    sign: function () { return this.n < 0 ? -1 : this.n > 0 ? 1 : 0; },
    num: function () { return this.n / this.d; },
    // does the decimal expansion terminate?
    terminates: function () { var d = this.d; while (d % 2 === 0) d /= 2; while (d % 5 === 0) d /= 5; return d === 1; },
    // plain text such as -3/4
    str: function () { return this.d === 1 ? String(this.n) : this.n + '/' + this.d; },
    // TeX such as -\frac{3}{4}
    tex: function () {
      if (this.d === 1) return String(this.n);
      return (this.n < 0 ? '-' : '') + '\\frac{' + Math.abs(this.n) + '}{' + this.d + '}';
    },
    // TeX using \tfrac (for use in tight places)
    ttex: function () {
      if (this.d === 1) return String(this.n);
      return (this.n < 0 ? '-' : '') + '\\tfrac{' + Math.abs(this.n) + '}{' + this.d + '}';
    },
    // decimal text if it terminates
    dec: function () {
      if (!this.terminates()) return null;
      var s = (Math.abs(this.n) / this.d).toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
      return (this.n < 0 ? '-' : '') + s;
    },
    // mixed-number TeX: 3\frac{1}{3}
    mixedTex: function () {
      if (this.d === 1) return String(this.n);
      var a = Math.abs(this.n), w = Math.floor(a / this.d), r = a % this.d;
      var sgn = this.n < 0 ? '-' : '';
      if (w === 0) return sgn + '\\frac{' + r + '}{' + this.d + '}';
      return sgn + w + '\\frac{' + r + '}{' + this.d + '}';
    }
  };
  function F(x) {
    if (x instanceof Frac) return x;
    if (typeof x === 'number') {
      if (Number.isInteger(x)) return new Frac(x, 1);
      // finite decimal
      var s = String(x), k = s.indexOf('.');
      var dec = s.length - k - 1;
      return new Frac(Math.round(x * Math.pow(10, dec)), Math.pow(10, dec));
    }
    throw new Error('Cannot convert to fraction');
  }

  // ------------------------------------------------------------------ TeX helpers
  var T = {
    // signed number for use after the first term: " + 3" / " - 3"
    plus: function (v) { v = F(v); return v.sign() < 0 ? ' - ' + v.abs().tex() : ' + ' + v.tex(); },
    // coefficient times variable: 1x -> x, -1x -> -x, 3/2 x -> \frac32x
    coef: function (c, v) {
      c = F(c);
      if (c.eq(1)) return v;
      if (c.eq(-1)) return '-' + v;
      return c.tex() + v;
    },
    // a x + b y + c style linear expression; terms = [[coef,'x'], [coef,'y'], [const,'']]
    lin: function (terms) {
      var s = '';
      terms.forEach(function (t) {
        var c = F(t[0]), v = t[1];
        if (c.isZero() && !(terms.length === 1)) return;
        var body = v === '' ? c.abs().tex() : (c.abs().eq(1) ? v : c.abs().tex() + v);
        if (s === '') s = (c.sign() < 0 ? '-' : '') + body;
        else s += (c.sign() < 0 ? ' - ' : ' + ') + body;
      });
      return s === '' ? '0' : s;
    },
    // y = mx + b
    slopeInt: function (m, b) { return 'y=' + T.lin([[m, 'x'], [b, '']]); },
    // parenthesise negatives: (-3)
    p: function (v) { v = F(v); return v.sign() < 0 ? '(' + v.tex() + ')' : v.tex(); },
    // interval notation
    interval: function (lo, loInc, hi, hiInc) {
      var a = lo === -Infinity ? '-\\infty' : F(lo).tex();
      var b = hi === Infinity ? '\\infty' : F(hi).tex();
      return (lo === -Infinity ? '(' : (loInc ? '[' : '(')) + a + ',\\ ' + b + (hi === Infinity ? ')' : (hiInc ? ']' : ')'));
    },
    // inequality x op value
    ineq: function (v, op, val) { return v + ({ '<': '<', '>': '>', '<=': '\\leq ', '>=': '\\geq ' }[op]) + F(val).tex(); },
    // system of two equations
    system: function (a, b) { return '\\begin{cases}' + a + '\\\\' + b + '\\end{cases}'; },
    // "Name" for a number in words (for exponent reading)
    ordinal: function (n) { return ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'][n]; },
    cardinal: function (n) { return ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n]; },
    commas: function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}'); }
  };

  // ------------------------------------------------------------------ number parsing
  function clean(s) {
    return String(s).replace(/[−–—]/g, '-').replace(/[×⋅·]/g, '*').replace(/÷/g, '/')
      .replace(/ /g, ' ').trim();
  }
  // Parse a single numeric literal. Returns {ok, v:Frac, kind:'int'|'dec'|'frac'|'mixed'} or {ok:false}
  function parseNumber(str) {
    var s = clean(str).replace(/[$,]/g, '');
    s = s.replace(/^[a-zA-Z]\s*=\s*/, '');              // allow "x = 5"
    var m;
    if ((m = /^([+-]?)\s*(\d+)$/.exec(s))) return { ok: true, v: new Frac((m[1] === '-' ? -1 : 1) * +m[2]), kind: 'int' };
    if ((m = /^([+-]?)\s*(\d*)\.(\d+)$/.exec(s)) || (m = /^([+-]?)\s*(\d+)\.()$/.exec(s))) {
      var digits = m[3] || '';
      var val = new Frac((m[1] === '-' ? -1 : 1) * +((m[2] || '0') + digits), Math.pow(10, digits.length));
      return { ok: true, v: val, kind: 'dec' };
    }
    if ((m = /^([+-]?)\s*\(?\s*([+-]?\d+)\s*\)?\s*\/\s*\(?\s*([+-]?\d+)\s*\)?$/.exec(s))) {
      var d = +m[3]; if (d === 0) return { ok: false, msg: 'The denominator can’t be 0.' };
      var n = +m[2] * (m[1] === '-' ? -1 : 1);
      var raw = { n: n, d: d };
      var v = new Frac(n, d);
      return { ok: true, v: v, kind: 'frac', reduced: gcd(n, d) === 1 && d > 0 };
    }
    if ((m = /^([+-]?)\s*(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s))) {
      var dd = +m[4]; if (dd === 0) return { ok: false };
      var tot = new Frac(+m[2] * dd + +m[3], dd);
      return { ok: true, v: m[1] === '-' ? tot.neg() : tot, kind: 'mixed', reduced: gcd(+m[3], dd) === 1 && +m[3] < dd };
    }
    return { ok: false };
  }

  // ------------------------------------------------------------------ polynomials
  // A polynomial is a map {monomialKey: Frac}. Monomial key like "x", "x^2", "x*y", "" (constant)
  function Poly(map) { this.t = map || {}; }
  function monoMul(a, b) {
    var ea = monoExp(a), eb = monoExp(b);
    for (var k in eb) ea[k] = (ea[k] || 0) + eb[k];
    return monoKey(ea);
  }
  function monoExp(key) {
    var e = {};
    if (!key) return e;
    key.split('*').forEach(function (p) {
      var m = /^([a-zA-Z])(?:\^(\d+))?$/.exec(p);
      e[m[1]] = (e[m[1]] || 0) + (m[2] ? +m[2] : 1);
    });
    return e;
  }
  function monoKey(e) {
    return Object.keys(e).filter(function (k) { return e[k] > 0; }).sort().map(function (k) { return e[k] === 1 ? k : k + '^' + e[k]; }).join('*');
  }
  Poly.constant = function (c) { var t = {}; c = F(c); if (!c.isZero()) t[''] = c; return new Poly(t); };
  Poly.variable = function (v) { var t = {}; t[v] = new Frac(1); return new Poly(t); };
  Poly.prototype = {
    add: function (o) {
      var t = {}, k;
      for (k in this.t) t[k] = this.t[k];
      for (k in o.t) { t[k] = t[k] ? t[k].add(o.t[k]) : o.t[k]; if (t[k].isZero()) delete t[k]; }
      return new Poly(t);
    },
    neg: function () { var t = {}; for (var k in this.t) t[k] = this.t[k].neg(); return new Poly(t); },
    sub: function (o) { return this.add(o.neg()); },
    mul: function (o) {
      var t = {};
      for (var a in this.t) for (var b in o.t) {
        var k = monoMul(a, b), c = this.t[a].mul(o.t[b]);
        t[k] = t[k] ? t[k].add(c) : c;
        if (t[k].isZero()) delete t[k];
      }
      return new Poly(t);
    },
    scale: function (c) { return this.mul(Poly.constant(c)); },
    pow: function (n) { var r = Poly.constant(1); for (var i = 0; i < n; i++) r = r.mul(this); return r; },
    isConst: function () { for (var k in this.t) if (k !== '') return false; return true; },
    constVal: function () { return this.t[''] || new Frac(0); },
    isZero: function () { return Object.keys(this.t).length === 0; },
    eq: function (o) { return this.sub(o).isZero(); },
    // is this polynomial a rational multiple of another (nonzero)?
    proportional: function (o) {
      if (this.isZero() || o.isZero()) return false;
      var keys = {}, k;
      for (k in this.t) keys[k] = 1;
      for (k in o.t) keys[k] = 1;
      var ratio = null;
      for (k in keys) {
        if (!this.t[k] || !o.t[k]) return false;
        var r = this.t[k].div(o.t[k]);
        if (ratio === null) ratio = r; else if (!ratio.eq(r)) return false;
      }
      return true;
    }
  };

  // tokenizer + recursive-descent parser:  expr := term (('+'|'-') term)*  etc.
  function tokenize(s) {
    s = clean(s).replace(/\[/g, '(').replace(/\]/g, ')').replace(/\{/g, '(').replace(/\}/g, ')');
    var toks = [], i = 0, m;
    while (i < s.length) {
      var c = s[i];
      if (c === ' ') { i++; continue; }
      if ((m = /^\d+\.?\d*|^\.\d+/.exec(s.slice(i)))) { toks.push({ t: 'num', v: m[0] }); i += m[0].length; continue; }
      if (/[a-zA-Z]/.test(c)) { toks.push({ t: 'var', v: c }); i++; continue; }
      if ('+-*/^()'.indexOf(c) >= 0) { toks.push({ t: c }); i++; continue; }
      throw new Error('Unexpected character "' + c + '"');
    }
    return toks;
  }
  function parsePoly(str) {
    var toks = tokenize(str), pos = 0;
    function peek() { return toks[pos]; }
    function eat(t) { var k = toks[pos]; if (!k || (t && k.t !== t)) throw new Error('Syntax error'); pos++; return k; }
    function numPoly(v) {
      var m = /^(\d*)\.?(\d*)$/.exec(v);
      var dec = (v.split('.')[1] || '').length;
      return Poly.constant(new Frac(+v.replace('.', ''), Math.pow(10, dec)));
    }
    function startsAtom(k) { return k && (k.t === 'num' || k.t === 'var' || k.t === '('); }
    function parseExpr() {
      var neg = false, k = peek();
      while (k && (k.t === '+' || k.t === '-')) { if (k.t === '-') neg = !neg; pos++; k = peek(); }
      var r = parseTerm(); if (neg) r = r.neg();
      for (;;) {
        k = peek();
        if (!k || (k.t !== '+' && k.t !== '-')) return r;
        pos++;
        var sg = k.t === '-';
        // allow stacked signs: 3 - -2
        k = peek();
        while (k && (k.t === '+' || k.t === '-')) { if (k.t === '-') sg = !sg; pos++; k = peek(); }
        var t = parseTerm();
        r = sg ? r.sub(t) : r.add(t);
      }
    }
    function parseTerm() {
      var r = parseFactor();
      for (;;) {
        var k = peek();
        if (k && k.t === '*') { pos++; r = r.mul(parseFactor()); }
        else if (k && k.t === '/') {
          pos++;
          var d = parseFactor();
          if (!d.isConst() || d.constVal().isZero()) throw new Error('Can only divide by a nonzero number');
          r = r.scale(d.constVal().recip());
        }
        else if (startsAtom(k)) { r = r.mul(parseFactor()); }   // implicit multiplication
        else return r;
      }
    }
    function parseFactor() {
      var k = peek();
      if (k && (k.t === '-' || k.t === '+')) { pos++; var f = parseFactor(); return k.t === '-' ? f.neg() : f; }
      var base = parseAtom();
      k = peek();
      if (k && k.t === '^') {
        pos++;
        var e;
        var nk = peek();
        if (nk && nk.t === '(') { pos++; e = parseExpr(); eat(')'); }
        else if (nk && nk.t === '-') { throw new Error('Negative exponents are not used here'); }
        else e = Poly.constant(+eat('num').v);
        if (!e.isConst() || !e.constVal().isInt() || e.constVal().sign() < 0 || e.constVal().n > 12) throw new Error('Unsupported exponent');
        base = base.pow(e.constVal().n);
      }
      return base;
    }
    function parseAtom() {
      var k = peek();
      if (!k) throw new Error('Incomplete expression');
      if (k.t === 'num') { pos++; return numPoly(k.v); }
      if (k.t === 'var') { pos++; return Poly.variable(k.v); }
      if (k.t === '(') { pos++; var r = parseExpr(); eat(')'); return r; }
      throw new Error('Syntax error');
    }
    var res = parseExpr();
    if (pos < toks.length) throw new Error('Syntax error');
    return res;
  }
  function tryPoly(s) { try { return { ok: true, p: parsePoly(s) }; } catch (e) { return { ok: false, msg: e.message }; } }

  // Is the expression written without un-combined like terms or parentheses?
  function looksSimplified(str) {
    var s = clean(str);
    if (/[()\[\]]/.test(s)) return false;
    // split into top-level terms at + and - (not at the start, not after another operator or ^)
    var terms = [], cur = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if ((c === '+' || c === '-') && cur.trim() !== '' && !/[*\/^]$/.test(cur.trim())) { terms.push(cur); cur = c; }
      else cur += c;
    }
    terms.push(cur);
    var seen = {};
    for (var j = 0; j < terms.length; j++) {
      var p = tryPoly(terms[j]);
      if (!p.ok) return false;
      var keys = Object.keys(p.p.t);
      if (keys.length !== 1) { if (keys.length === 0) continue; return false; }
      if (seen[keys[0]]) return false;
      seen[keys[0]] = 1;
    }
    return true;
  }

  // ------------------------------------------------------------------ intervals / inequalities
  // interval: {lo:Frac|-Infinity, loInc:bool, hi:Frac|Infinity, hiInc:bool, empty:bool}
  function mkInterval(lo, loInc, hi, hiInc) {
    if (lo === -Infinity) loInc = false;
    if (hi === Infinity) hiInc = false;
    return { lo: lo, loInc: !!loInc, hi: hi, hiInc: !!hiInc, empty: false };
  }
  function intervalEq(a, b) {
    if (a.empty || b.empty) return !!(a.empty && b.empty);
    function same(x, y) { return (x === y) || (x instanceof Frac && y instanceof Frac && x.eq(y)); }
    return same(a.lo, b.lo) && same(a.hi, b.hi) && a.loInc === b.loInc && a.hiInc === b.hiInc;
  }
  function constVal(str) {
    var r = tryPoly(str);
    if (!r.ok || !r.p.isConst()) return null;
    return r.p.constVal();
  }
  // parse "x<=3", "3>x", "-2<x<=5"
  function parseInequality(str, variable) {
    var s = clean(str).replace(/\s+/g, ' ');
    s = s.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/=</g, '<=').replace(/=>/g, '>=').replace(/≠/g, '!=');
    var parts = s.split(/(<=|>=|<|>)/);
    if (parts.length !== 3 && parts.length !== 5) return { ok: false, msg: 'Write an inequality such as x<3.' };
    var operands = [], ops = [];
    for (var i = 0; i < parts.length; i++) (i % 2 ? ops : operands).push(parts[i].trim());
    var isVar = function (t) { return /^[a-zA-Z]$/.test(t) && (!variable || t === variable); };
    if (parts.length === 3) {
      var a = operands[0], b = operands[1], op = ops[0];
      var flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=' };
      if (isVar(a)) { /* x op c */ }
      else if (isVar(b)) { var tmp = a; a = b; b = tmp; op = flip[op]; }
      else return { ok: false, msg: 'Use the variable ' + (variable || 'x') + ' in your answer.' };
      var c = constVal(b);
      if (c === null) return { ok: false, msg: 'Could not read the number.' };
      if (op === '<') return { ok: true, iv: mkInterval(-Infinity, false, c, false) };
      if (op === '<=') return { ok: true, iv: mkInterval(-Infinity, false, c, true) };
      if (op === '>') return { ok: true, iv: mkInterval(c, false, Infinity, false) };
      return { ok: true, iv: mkInterval(c, true, Infinity, false) };
    }
    // compound a op x op b
    if (!isVar(operands[1])) return { ok: false, msg: 'Put the variable in the middle, like 2<x<5.' };
    var lo = constVal(operands[0]), hi = constVal(operands[2]);
    if (lo === null || hi === null) return { ok: false, msg: 'Could not read the numbers.' };
    var o1 = ops[0], o2 = ops[1];
    if ((o1[0] === '<') && (o2[0] === '<')) return { ok: true, iv: mkInterval(lo, o1 === '<=', hi, o2 === '<=') };
    if ((o1[0] === '>') && (o2[0] === '>')) return { ok: true, iv: mkInterval(hi, o2 === '>=', lo, o1 === '>=') };
    return { ok: false, msg: 'That compound inequality does not make sense.' };
  }
  function parseEndpoint(t) {
    t = clean(t).replace(/\s+/g, '').toLowerCase();
    if (/^(-)(inf|infinity|∞|oo)$/.test(t)) return -Infinity;
    if (/^(\+)?(inf|infinity|∞|oo)$/.test(t)) return Infinity;
    return constVal(t);
  }
  function parseIntervalNotation(str) {
    var s = clean(str).toLowerCase().replace(/\s+/g, ' ');
    if (/^(all real numbers|all reals|\(-inf(inity)?,\s*inf(inity)?\))$/.test(s)) return { ok: true, iv: mkInterval(-Infinity, false, Infinity, false) };
    var m = /^([\(\[])\s*([^,]+?)\s*,\s*([^,]+?)\s*([\)\]])$/.exec(s);
    if (!m) return { ok: false, msg: 'Write interval notation like [2, 5) or (-∞, 3].' };
    var lo = parseEndpoint(m[2]), hi = parseEndpoint(m[3]);
    if (lo === null || hi === null) return { ok: false, msg: 'Could not read the endpoints.' };
    if ((lo === -Infinity && m[1] === '[') || (hi === Infinity && m[4] === ']')) return { ok: false, msg: 'Infinity always gets a parenthesis, never a bracket.' };
    if (lo !== -Infinity && hi !== Infinity && lo.cmp(hi) > 0) return { ok: false, msg: 'The smaller number goes first.' };
    return { ok: true, iv: mkInterval(lo, m[1] === '[', hi, m[4] === ']') };
  }

  // ------------------------------------------------------------------ pairs
  function parsePair(str) {
    var s = clean(str).replace(/\s+/g, ' ').trim();
    if (s[0] === '(' && s[s.length - 1] === ')') s = s.slice(1, -1);
    var parts = s.split(',');
    if (parts.length !== 2) return { ok: false, msg: 'Write the ordered pair like (3, -2).' };
    var a = parseNumber(parts[0]), b = parseNumber(parts[1]);
    if (!a.ok || !b.ok) return { ok: false, msg: 'Could not read the numbers in your ordered pair.' };
    return { ok: true, x: a.v, y: b.v };
  }

  // ------------------------------------------------------------------ prime factorisation
  function primeFactors(n) {
    var f = {};
    for (var p = 2; p * p <= n; p++) while (n % p === 0) { f[p] = (f[p] || 0) + 1; n /= p; }
    if (n > 1) f[n] = (f[n] || 0) + 1;
    return f;
  }
  function isPrime(n) { if (n < 2) return false; for (var p = 2; p * p <= n; p++) if (n % p === 0) return false; return true; }
  function primeFactorTex(n) {
    var f = primeFactors(n), ps = Object.keys(f).map(Number).sort(function (a, b) { return a - b; });
    return ps.map(function (p) { return f[p] > 1 ? p + '^{' + f[p] + '}' : String(p); }).join('\\cdot');
  }
  function parseFactorization(str) {
    var s = clean(str).replace(/\s+/g, '').replace(/x/gi, '*').replace(/\)\(/g, ')*(');
    if (!s) return { ok: false };
    var f = {}, parts = s.split('*');
    for (var i = 0; i < parts.length; i++) {
      var m = /^\(?(\d+)(?:\^\(?(\d+)\)?)?\)?$/.exec(parts[i]);
      if (!m) return { ok: false, msg: 'Write the factorization like 2^3*5.' };
      var base = +m[1], e = m[2] ? +m[2] : 1;
      f[base] = (f[base] || 0) + e;
    }
    return { ok: true, f: f };
  }
  function factorsEqual(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(function (k) { return a[k] === b[k]; });
  }

  // ------------------------------------------------------------------ the checkers
  // Each returns {ok: bool, msg: string}. 'field' is the field spec from the generator.
  var checkers = {};

  checkers.num = function (input, f) {
    var ans = F(f.ans);
    var r = parseNumber(input);
    if (!r.ok && f.allowArith) {
      var c = constVal(input);
      if (c !== null) r = { ok: true, v: c, kind: 'int' };
    }
    if (!r.ok) return { ok: false, msg: r.msg || 'Enter a number (for example 12, -3/4, or 0.5).', invalid: true };
    if (!r.v.eq(ans)) return { ok: false, msg: f.hintWrong || '' };
    var form = f.form;
    if (form === 'int' && r.kind !== 'int') return { ok: false, msg: 'Write your answer as a whole number.' };
    if (form === 'dec' && (r.kind === 'frac' || r.kind === 'mixed')) return { ok: false, msg: 'Write your answer as a decimal.' };
    if (form === 'frac' && (r.kind === 'dec' || r.kind === 'mixed')) return { ok: false, msg: 'Write your answer as a fraction.' };
    if (form === 'mixed') {
      if (r.kind === 'frac' && Math.abs(r.v.n) > r.v.d) return { ok: false, msg: 'Write your answer as a mixed number, like 2 1/3.' };
      if (r.kind === 'dec') return { ok: false, msg: 'Write your answer as a mixed number, like 2 1/3.' };
    }
    if (form === 'improper' && r.kind === 'mixed') return { ok: false, msg: 'Write your answer as an improper fraction.' };
    if ((r.kind === 'frac' || r.kind === 'mixed') && f.lowest !== false && !r.reduced) {
      return { ok: false, msg: 'That value is right, but it needs to be reduced to lowest terms.' };
    }
    return { ok: true };
  };

  checkers.expr = function (input, f) {
    var p;
    try { p = parsePoly(input); } catch (e) { return { ok: false, msg: 'Couldn’t read that expression (' + e.message + ').', invalid: true }; }
    var ans = typeof f.ans === 'string' ? parsePoly(f.ans) : f.ans;
    if (!p.eq(ans)) return { ok: false, msg: '' };
    if (f.simplify && !looksSimplified(input)) return { ok: false, msg: 'That is equivalent, but it isn’t fully simplified yet.' };
    return { ok: true };
  };

  checkers.eq = function (input, f) {
    var s = clean(input);
    if ((s.match(/=/g) || []).length !== 1) return { ok: false, msg: 'Write an equation with one equals sign, like y = 2x + 1.', invalid: true };
    var sides = s.split('=');
    var L, R2;
    try { L = parsePoly(sides[0]); R2 = parsePoly(sides[1]); } catch (e) { return { ok: false, msg: 'Couldn’t read that equation (' + e.message + ').', invalid: true }; }
    var want = typeof f.ans === 'string' ? (function () { var q = f.ans.split('='); return parsePoly(q[0]).sub(parsePoly(q[1])); })() : f.ans;
    var got = L.sub(R2);
    if (!got.proportional(want)) return { ok: false, msg: '' };
    if (f.lhs) {
      var l = sides[0].replace(/\s+/g, '').toLowerCase();
      if (l !== f.lhs) return { ok: false, msg: 'That equation is correct, but solve it for ' + f.lhs + ' so it reads ' + f.lhs + ' = …' };
      if (f.lhs && new RegExp(f.lhs).test(sides[1].toLowerCase())) return { ok: false, msg: 'Get ' + f.lhs + ' alone on one side.' };
    }
    if (f.slopeInt) {
      // the right side must be written as mx + b: no brackets (other than around a plain number) and no repeated terms
      var rhs = sides[1].replace(/\(\s*[+-]?\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+)?\s*\)/g, function (m) { return m.replace(/[()\s]/g, ''); });
      if (!looksSimplified(rhs)) return { ok: false, msg: 'That equation is correct, but it is not in slope-intercept form yet. Simplify the right side to the form y = mx + b.' };
    }
    return { ok: true };
  };

  checkers.pair = function (input, f) {
    var r = parsePair(input);
    if (!r.ok) return { ok: false, msg: r.msg, invalid: true };
    var ans = f.ans;
    if (r.x.eq(ans[0]) && r.y.eq(ans[1])) return { ok: true };
    return { ok: false, msg: '' };
  };

  // system answer: pair, or "no solution", or "infinitely many"
  checkers.sys = function (input, f) {
    var s = clean(input).toLowerCase();
    var none = /no solution|none|inconsistent|no sol|empty|∅/.test(s);
    var inf = /infinite|infinitely|many|dependent|all real|same line/.test(s);
    if (f.ans === 'none') return none ? { ok: true } : { ok: false, msg: /\d/.test(s) ? '' : 'Try writing “no solution” if the lines never meet.' };
    if (f.ans === 'inf') return inf ? { ok: true } : { ok: false, msg: '' };
    if (none || inf) return { ok: false, msg: '' };
    return checkers.pair(input, f);
  };

  checkers.ineq = function (input, f) {
    var r = parseInequality(input, f.variable);
    if (!r.ok) return { ok: false, msg: r.msg, invalid: true };
    return intervalEq(r.iv, f.ans) ? { ok: true } : { ok: false, msg: '' };
  };

  checkers.interval = function (input, f) {
    var r = parseIntervalNotation(input);
    if (!r.ok) return { ok: false, msg: r.msg, invalid: true };
    return intervalEq(r.iv, f.ans) ? { ok: true } : { ok: false, msg: '' };
  };

  // comma separated list of numbers; ordered or not
  checkers.list = function (input, f) {
    var items = clean(input).replace(/[;]/g, ',').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
    if (!items.length) return { ok: false, msg: 'Enter your answers separated by commas.', invalid: true };
    var vals = [];
    for (var i = 0; i < items.length; i++) {
      var r = parseNumber(items[i]);
      if (!r.ok) return { ok: false, msg: 'Could not read “' + items[i] + '” as a number.', invalid: true };
      vals.push(r.v);
    }
    var ans = f.ans.map(F);
    if (vals.length !== ans.length) return { ok: false, msg: vals.length < ans.length ? 'You need ' + ans.length + ' numbers.' : 'That is more than ' + ans.length + ' numbers.' };
    if (f.ordered) return vals.every(function (v, i) { return v.eq(ans[i]); }) ? { ok: true } : { ok: false, msg: '' };
    var used = [];
    var ok = vals.every(function (v) {
      for (var j = 0; j < ans.length; j++) if (!used[j] && ans[j].eq(v)) { used[j] = true; return true; }
      return false;
    });
    return ok ? { ok: true } : { ok: false, msg: '' };
  };

  checkers.primefact = function (input, f) {
    var r = parseFactorization(input);
    if (!r.ok) return { ok: false, msg: r.msg || 'Write the factorization like 2^3*5.', invalid: true };
    for (var k in r.f) if (!isPrime(+k)) return { ok: false, msg: k + ' is not prime, so keep factoring.' };
    return factorsEqual(r.f, primeFactors(f.ans)) ? { ok: true } : { ok: false, msg: '' };
  };

  // single-select (index or string)
  checkers.choice = function (input, f) {
    if (input == null) return { ok: false, msg: 'Choose an answer first.', invalid: true, empty: true };
    return [].concat(f.ans).map(String).indexOf(String(input)) >= 0 ? { ok: true } : { ok: false, msg: '' };
  };
  // "all real numbers" or "no solution" answers
  checkers.solset = function (input, f) {
    var s = clean(input).toLowerCase().replace(/\s+/g, ' ');
    var all = /all real|all reals|every real|\(-inf(inity)?,\s*inf(inity)?\)|\(-\u221e,\s*\u221e\)|\u211d|identity|infinitely many/.test(s);
    var none = /no solution|no sol|none|\u2205|empty|contradiction|no real/.test(s);
    if (f.ans === 'all') return all ? { ok: true } : { ok: false, msg: none ? '' : 'Write \u201call real numbers\u201d or \u201cno solution\u201d.' };
    return none ? { ok: true } : { ok: false, msg: all ? '' : 'Write \u201call real numbers\u201d or \u201cno solution\u201d.' };
  };
  // exact typed form (spaces and bracket style ignored), e.g. 12+(15+8)
  checkers.exact = function (input, f) {
    function norm(t) { return clean(t).toLowerCase().replace(/\s+/g, '').replace(/\[/g, '(').replace(/\]/g, ')'); }
    var want = [].concat(f.ans).map(norm), got = norm(input);
    if (want.indexOf(got) >= 0) return { ok: true };
    return { ok: false, msg: f.hintWrong || '' };
  };
  // expanded form: a sum of place-value terms, e.g. 3000+500+2+2/10+3/100 (zero terms optional)
  checkers.expanded = function (input, f) {
    var terms = clean(input).split('+').map(function (t) { return t.trim(); });
    var vals = [];
    for (var i = 0; i < terms.length; i++) {
      var r = parseNumber(terms[i]);
      if (!r.ok) return { ok: false, msg: 'Write each place value as a term, like 3000 + 500 + 2/10.', invalid: true };
      if (!r.v.isZero()) vals.push(r.v);
    }
    var want = f.ans.map(F).filter(function (v) { return !v.isZero(); });
    if (vals.length !== want.length) return { ok: false, msg: vals.length < want.length ? 'Some place values are missing.' : 'Write one term for each digit, in expanded form.' };
    var used = [];
    var ok = vals.every(function (v) {
      for (var j = 0; j < want.length; j++) if (!used[j] && want[j].eq(v)) { used[j] = true; return true; }
      return false;
    });
    return ok ? { ok: true } : { ok: false, msg: 'Check the value of each digit.' };
  };
  // multi-select; input is an array of selected values
  checkers.multi = function (input, f) {
    var a = (input || []).map(String).sort().join('|'), b = f.ans.map(String).sort().join('|');
    return a === b ? { ok: true } : { ok: false, msg: '' };
  };
  // free text compared with accepted answers
  checkers.text = function (input, f) {
    var n = String(input).toLowerCase().replace(/[^a-z0-9\-\/ ]/g, '').replace(/\s+/g, ' ').trim();
    var list = [].concat(f.ans).map(function (s) { return s.toLowerCase().replace(/\s+/g, ' ').trim(); });
    return list.indexOf(n) >= 0 ? { ok: true } : { ok: false, msg: '' };
  };
  // graph widgets give their own validation functions (see graphs.js), the engine passes the value
  checkers.custom = function (value, f) { return f.check(value); };

  function check(field, input) {
    var fn = checkers[field.type];
    if (!fn) throw new Error('Unknown field type ' + field.type);
    if (field.type !== 'choice' && field.type !== 'multi' && field.type !== 'custom') {
      if (input == null || String(input).trim() === '') return { ok: false, msg: 'Type an answer first.', invalid: true, empty: true };
    }
    return fn(input, field);
  }

  // ------------------------------------------------------------------ exports
  MAT.makeRng = makeRng;
  MAT.Frac = Frac; MAT.F = F;
  MAT.Q = function (n, d) { return F(n).div(F(d)); };   // the fraction n/d
  MAT.gcd = gcd; MAT.lcm = lcm;
  MAT.T = T;
  MAT.Poly = Poly; MAT.parsePoly = parsePoly; MAT.tryPoly = tryPoly; MAT.looksSimplified = looksSimplified;
  MAT.parseNumber = parseNumber; MAT.parsePair = parsePair;
  MAT.parseInequality = parseInequality; MAT.parseIntervalNotation = parseIntervalNotation;
  MAT.mkInterval = mkInterval; MAT.intervalEq = intervalEq;
  MAT.primeFactors = primeFactors; MAT.isPrime = isPrime; MAT.primeFactorTex = primeFactorTex;
  MAT.check = check; MAT.checkers = checkers;
  MAT.defs = MAT.defs || {};
  MAT.def = function (chapter, n, fn) { MAT.defs[chapter + '.' + n] = fn; };

  if (typeof module !== 'undefined' && module.exports) module.exports = MAT;
})(typeof window !== 'undefined' ? window : globalThis);
