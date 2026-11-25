/* MAT040 notes: helpers shared by the problem generators. */
(function (root) {
  'use strict';
  var MAT = root.MAT, F = MAT.F, Frac = MAT.Frac, T = MAT.T;
  var H = MAT.H = {};

  // ------------------------------------------------------------------ field constructors
  function mk(type) { return function (ans, o) { var f = { type: type, ans: ans }; if (o) for (var k in o) f[k] = o[k]; return f; }; }
  H.num = mk('num');          // exact number: integer, decimal, fraction or mixed number
  H.expr = mk('expr');        // algebraic expression, compared by value
  H.eq = mk('eq');            // equation, compared up to a constant multiple
  H.pair = function (x, y, o) { var f = { type: 'pair', ans: [F(x), F(y)] }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.sys = function (ans, o) { var f = { type: 'sys', ans: ans === 'none' || ans === 'inf' ? ans : [F(ans[0]), F(ans[1])] }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.ineq = function (iv, v, o) { var f = { type: 'ineq', ans: iv, variable: v }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.interval = function (iv, o) { var f = { type: 'interval', ans: iv }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.list = function (ans, o) { var f = { type: 'list', ans: ans.map(F) }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.primefact = mk('primefact');
  H.exact = mk('exact');
  H.expanded = mk('expanded');
  H.solset = mk('solset');   // 'all' or 'none'
  H.text = mk('text');
  H.choice = function (options, ans, o) { var f = { type: 'choice', options: options, ans: ans }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.multi = function (options, ans, o) { var f = { type: 'multi', options: options, ans: ans }; if (o) for (var k in o) f[k] = o[k]; return f; };
  H.yesno = function (yes, o) { return H.choice(['Yes', 'No'], yes ? 0 : 1, o); };
  H.part = function (label, q, fields, sol, extra) {
    var p = { label: label, q: q, fields: [].concat(fields), sol: sol };
    if (extra) for (var k in extra) p[k] = extra[k];
    return p;
  };
  var LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  H.lab = function (i) { return LETTERS[i] + '.'; };

  // ------------------------------------------------------------------ number helpers
  H.ivToIneq = function (iv, v) {
    var lo = iv.lo, hi = iv.hi;
    if (lo === -Infinity) return v + (iv.hiInc ? '<=' : '<') + hi.str();
    return v + (iv.loInc ? '>=' : '>') + lo.str();
  };
  H.ivToInterval = function (iv) {
    var a = iv.lo === -Infinity ? '-inf' : iv.lo.str(), b = iv.hi === Infinity ? 'inf' : iv.hi.str();
    return (iv.loInc ? '[' : '(') + a + ', ' + b + (iv.hiInc ? ']' : ')');
  };
  H.mixedStr = function (v) {
    if (v.d === 1) return String(v.n);
    var a = Math.abs(v.n), w = Math.floor(a / v.d), r = a % v.d;
    return (v.n < 0 ? '-' : '') + (w ? w + ' ' : '') + r + '/' + v.d;
  };
  // x op value interval for a solved inequality "var op s" (op in <,<=,>,>=)
  H.ivFor = function (op, s) {
    s = F(s);
    if (op === '<') return MAT.mkInterval(-Infinity, false, s, false);
    if (op === '<=') return MAT.mkInterval(-Infinity, false, s, true);
    if (op === '>') return MAT.mkInterval(s, false, Infinity, false);
    return MAT.mkInterval(s, true, Infinity, false);
  };
  H.flip = function (op) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[op]; };
  H.opTex = function (op) { return { '<': '<', '>': '>', '<=': '\\leq ', '>=': '\\geq ' }[op]; };
  H.opWords = function (op) { return { '<': 'less than', '>': 'greater than', '<=': 'less than or equal to', '>=': 'greater than or equal to' }[op]; };
  // dollar-style amount with commas in TeX
  H.commas = T.commas;

  // ------------------------------------------------------------------ the sample input used by the automated tests
  MAT.sampleInput = function (f) {
    switch (f.type) {
      case 'num': {
        var v = F(f.ans);
        if (f.form === 'mixed') return H.mixedStr(v);
        if (f.form === 'dec') return v.dec();
        return v.str();
      }
      case 'expr': case 'eq': case 'exact': case 'text': return [].concat(f.ans)[0];
      case 'pair': return '(' + f.ans[0].str() + ', ' + f.ans[1].str() + ')';
      case 'sys': return f.ans === 'none' ? 'no solution' : f.ans === 'inf' ? 'infinitely many solutions' : '(' + f.ans[0].str() + ', ' + f.ans[1].str() + ')';
      case 'ineq': return H.ivToIneq(f.ans, f.variable || 'x');
      case 'interval': return H.ivToInterval(f.ans);
      case 'list': return f.ans.map(function (v) { return v.str(); }).join(', ');
      case 'primefact': return MAT.primeFactorTex(f.ans).replace(/\\cdot/g, '*').replace(/[{}]/g, '');
      case 'solset': return f.ans === 'all' ? 'all real numbers' : 'no solution';
      case 'expanded': return f.ans.map(function (v) { return F(v).str(); }).join(' + ');
      case 'choice': return String([].concat(f.ans)[0]);
      case 'multi': return f.ans.map(String);
      case 'custom': return f.sample();
    }
    throw new Error('no sample for ' + f.type);
  };

  // ------------------------------------------------------------------ figures: lattice points on a line
  // all integer points (x,y) with xmin<=x<=xmax, ymin<=y<=ymax on y = m x + b  (m,b are Frac)
  H.latticePoints = function (m, b, xmin, xmax, ymin, ymax) {
    var pts = [];
    for (var x = xmin; x <= xmax; x++) {
      var y = m.mul(x).add(b);
      if (y.isInt() && y.n >= ymin && y.n <= ymax) pts.push([x, y.n]);
    }
    return pts;
  };


  // ------------------------------------------------------------------ figures for solutions
  // A x + B y = C  ->  {m,b} (slanted), {x:a} (vertical) or {y:b} (horizontal), as plain numbers for the SVG helper
  H.lineForSvg = function (line) {
    var A = F(line.A), B = F(line.B), C = F(line.C);
    if (B.isZero()) return { x: C.div(A).num() };
    if (A.isZero()) return { y: C.div(B).num() };
    return { m: A.neg().div(B).num(), b: C.div(B).num() };
  };
  // a plane with the line(s) and labelled points, wrapped for use inside text
  H.planeFig = function (win, lines, pts, o) {
    o = o || {};
    var opt = { xmin: win.xmin, xmax: win.xmax, ymin: win.ymin, ymax: win.ymax, step: win.step, title: o.title,
      lines: (lines || []).map(function (l) { return H.lineForSvg(l); }),
      points: (pts || []).map(function (p) { return { x: p[0], y: p[1], label: p[2] === false ? '' : '(' + p[0] + ', ' + p[1] + ')', pos: p[3] || 'ur' }; }) };
    if (o.slope) opt.slope = o.slope;
    if (o.alt) opt.alt = o.alt;
    return '<div class="ex-figure">' + MAT.svg.plane(opt) + '</div>';
  };
  // the line y = m x + b as {A,B,C}
  H.lineMB = function (m, b) { return { A: F(m).neg(), B: F(1), C: F(b) }; };
  // the standard-form equation text for A x + B y = C
  H.stdTex = function (A, B, C) { return T.lin([[A, 'x'], [B, 'y']]) + '=' + F(C).tex(); };


  // plain-text slope-intercept equation for a field answer: y=-2/3x+4
  H.siStr = function (m, b) {
    m = F(m); b = F(b);
    var xs = m.isZero() ? '' : m.eq(1) ? 'x' : m.eq(-1) ? '-x' : m.str() + 'x';
    var bs = b.isZero() ? '' : (b.sign() < 0 || !xs ? b.str() : '+' + b.str());
    return 'y=' + (xs + bs || '0');
  };

  // ------------------------------------------------------------------ interactive graphing fields
  // student clicks two grid points; line must be the graph of y = m x + b (or vertical x = a)
  // line spec: {A,B,C} meaning A x + B y = C   (integers or Fracs)
  H.lineGraphField = function (line, win, o) {
    o = o || {};
    var A = F(line.A), B = F(line.B), C = F(line.C);
    var on = function (p) { return A.mul(p[0]).add(B.mul(p[1])).eq(C); };
    var sample = function () {
      var pts = [];
      for (var x = win.xmin; x <= win.xmax && pts.length < 2; x++) for (var y = win.ymin; y <= win.ymax && pts.length < 2; y++) {
        if (on([x, y]) && !(pts.length && pts[0][0] === x && pts[0][1] === y)) pts.push([x, y]);
      }
      return pts;
    };
    return {
      type: 'custom',
      win: win,
      sample: sample,
      render: function (host, onChange) {
        return MAT.planeWidget(host, { xmin: win.xmin, xmax: win.xmax, ymin: win.ymin, ymax: win.ymax, mode: 'line', step: win.step, onChange: onChange });
      },
      check: function (pts) {
        if (!pts || pts.length < 2) return { ok: false, msg: 'Click two points on the grid to draw the line.', invalid: true };
        if (on(pts[0]) && on(pts[1])) return { ok: true };
        return { ok: false, msg: 'The line you drew does not match the equation. Check that both points satisfy it.' };
      }
    };
  };

  // student plots a set of points
  H.plotPointsField = function (points, win) {
    var key = function (p) { return p[0] + ',' + p[1]; };
    return {
      type: 'custom',
      win: win,
      sample: function () { return points.map(function (p) { return p.slice(); }); },
      render: function (host, onChange) {
        return MAT.planeWidget(host, { xmin: win.xmin, xmax: win.xmax, ymin: win.ymin, ymax: win.ymax, mode: 'points', step: win.step, count: points.length, onChange: onChange });
      },
      check: function (pts) {
        if (!pts || pts.length < points.length) return { ok: false, msg: 'Plot all ' + points.length + ' points.', invalid: true };
        var want = points.map(key).sort().join('|'), got = pts.map(key).sort().join('|');
        return want === got ? { ok: true } : { ok: false, msg: 'One or more points are in the wrong place.' };
      }
    };
  };

  // number-line graph field for a solved inequality; iv is the solution interval (one infinite end)
  H.numberLineField = function (iv, lo, hi, snap) {
    return {
      type: 'custom',
      nl: { lo: lo, hi: hi },
      sample: function () {
        var right = iv.hi === Infinity;
        return { x: (right ? iv.lo : iv.hi).num(), closed: right ? iv.loInc : iv.hiInc, dir: right ? 'right' : 'left' };
      },
      render: function (host, onChange) {
        return MAT.numberLineWidget(host, { lo: lo, hi: hi, snap: snap || 1, onChange: onChange });
      },
      check: function (v) {
        if (!v) return { ok: false, msg: 'Click a number on the line to place the endpoint.', invalid: true };
        var right = iv.hi === Infinity, end = right ? iv.lo : iv.hi, inc = right ? iv.loInc : iv.hiInc;
        if (!F(v.x).eq(end)) return { ok: false, msg: 'The endpoint is in the wrong place.' };
        if (v.dir !== (right ? 'right' : 'left')) return { ok: false, msg: 'Shade the other direction.' };
        if (v.closed !== inc) return { ok: false, msg: inc ? 'This endpoint is included, so use a bracket.' : 'This endpoint is not included, so use a parenthesis.' };
        return { ok: true };
      }
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = H;
})(typeof window !== 'undefined' ? window : globalThis);
