/* MAT040 notes: SVG helpers (coordinate planes, number lines, geoboards)
   and the "graph it" widgets. Every figure gets a text description (alt text) generated from what it draws,
   and every widget can be used without a mouse: points are added by typing coordinates, the number-line endpoint by typing a number. */
(function (root) {
  'use strict';
  var MAT = root.MAT || (root.MAT = {});
  var uid = 0;

  // ------------------------------------------------------------------ text helpers
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function minus(s) { return String(s).replace(/-/g, '−'); }
  // a number as a short readable string: 3, -2, 5/2, 0.35
  function fmt(v) {
    v = Math.round(v * 1e6) / 1e6;
    if (Number.isInteger(v)) return minus(v);
    for (var d = 2; d <= 12; d++) {
      var n = Math.round(v * d);
      if (Math.abs(v * d - n) < 1e-6) return minus(n) + '/' + d;
    }
    return minus(Math.round(v * 100) / 100);
  }
  function pt(x, y) { return '(' + fmt(x) + ', ' + fmt(y) + ')'; }
  function plainTitle(t) { return String(t || '').replace(/\$/g, '').replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/[\\{}]/g, ''); }

  // ------------------------------------------------------------------ geometry shared by plane(), the widget and the tests
  // returns the pixel size of one grid unit, the paddings and the size of the drawing
  function planeGeom(xmin, xmax, ymin, ymax, unit, hasTitle) {
    var u = unit || Math.min(40, Math.floor(480 / Math.max(xmax - xmin, ymax - ymin)));
    var padL = 28, padT = hasTitle ? 30 : 14, padR = 26, padB = 24;
    return { u: u, padL: padL, padT: padT, padR: padR, padB: padB, W: padL + padR + (xmax - xmin) * u, H: padT + padB + (ymax - ymin) * u };
  }
  var NL = { W: 560, pad: 24, y: 42, H: 76 };    // number line drawing

  // ------------------------------------------------------------------ descriptions (alt text)
  // Lines are described by points they pass through (or by their position if vertical/horizontal), not by their equation,
  // so that a graph the student must read an equation from is not given away by its description.
  function describePlane(o) {
    var xmin = o.xmin, xmax = o.xmax, ymin = o.ymin, ymax = o.ymax;
    var s = 'Coordinate plane, x from ' + fmt(xmin) + ' to ' + fmt(xmax) + ' and y from ' + fmt(ymin) + ' to ' + fmt(ymax) + '.';
    var t = plainTitle(o.title);
    if (t) s += ' Title: ' + t + '.';
    (o.lines || []).forEach(function (L) {
      if (L.x !== undefined) { s += ' A vertical line at x = ' + fmt(L.x) + '.'; return; }
      if (L.y !== undefined) { s += ' A horizontal line at y = ' + fmt(L.y) + '.'; return; }
      var cand = [], x, y;
      for (x = Math.ceil(xmin); x <= xmax; x++) { y = L.m * x + L.b; if (y >= ymin - 1e-9 && y <= ymax + 1e-9 && Math.abs(y - Math.round(y)) < 1e-9) cand.push([x, Math.round(y)]); }
      if (cand.length < 2) {            // no (or one) whole-number point: use where the line meets the edges of the grid
        cand = [];
        [[xmin, L.m * xmin + L.b], [xmax, L.m * xmax + L.b], [(ymin - L.b) / L.m, ymin], [(ymax - L.b) / L.m, ymax]].forEach(function (p) {
          if (p[0] >= xmin - 1e-9 && p[0] <= xmax + 1e-9 && p[1] >= ymin - 1e-9 && p[1] <= ymax + 1e-9 &&
              !cand.some(function (q) { return Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6; })) cand.push(p);
        });
      }
      var dir = L.m > 0 ? 'sloping up to the right' : (L.m < 0 ? 'sloping down to the right' : 'horizontal');
      if (cand.length >= 2) s += ' A line ' + dir + ', passing through ' + pt(cand[0][0], cand[0][1]) + ' and ' + pt(cand[cand.length - 1][0], cand[cand.length - 1][1]) + '.';
      else s += ' A line ' + dir + '.';
    });
    (o.segs || []).forEach(function (g) { s += ' A segment from ' + pt(g[0], g[1]) + ' to ' + pt(g[2], g[3]) + '.'; });
    var pts = o.points || [];
    if (pts.length) s += ' ' + (pts.length === 1 ? 'Point: ' : 'Points: ') + pts.map(function (p) { return pt(p.x, p.y); }).join(', ') + '.';
    else if (o.empty !== false && !(o.lines || []).length && !(o.segs || []).length) s += ' No points plotted.';
    if (o.slope) s += ' A red right triangle shows the run from ' + pt(o.slope.x1, o.slope.y1) + ' to ' + pt(o.slope.x2, o.slope.y1) + ' and the rise to ' + pt(o.slope.x2, o.slope.y2) + '.';
    return s;
  }
  // type: 0 nothing drawn, 1 x>a  2 x>=a  3 x<a  4 x<=a
  function describeNumberLine(lo, hi, point, type) {
    var s = 'Number line from ' + fmt(lo) + ' to ' + fmt(hi) + '.';
    if (!type) return s + ' Nothing is marked.';
    var right = type === 1 || type === 2, closed = type === 2 || type === 4;
    return s + ' A ' + (closed ? 'bracket' : 'parenthesis') + ' at ' + fmt(point) + ', with the line shaded to the ' + (right ? 'right' : 'left') + '.';
  }
  function describeGeoboard(x1, y1, x2, y2) {
    return 'Geoboard: a square board with a 5 by 5 grid of pegs, numbered 0 to 4 from the bottom left. An orange rubber band stretches from peg ' + pt(x1, y1) + ' to peg ' + pt(x2, y2) + '.';
  }

  // ------------------------------------------------------------------ coordinate plane
  // opts: xmin,xmax,ymin,ymax, unit (px per grid unit), step (label step), title,
  //       lines:[{m,b} | {x:a} | {y:b}], points:[{x,y,label,color,pos}], segs:[[x1,y1,x2,y2,color]],
  //       slope:{x1,y1,x2,y2}  draws the rise/run triangle,  alt: text description (made automatically if left out)
  function plane(o) {
    var xmin = o.xmin, xmax = o.xmax, ymin = o.ymin, ymax = o.ymax;
    var g = planeGeom(xmin, xmax, ymin, ymax, o.unit, !!o.title);
    var u = g.u, padL = g.padL, padT = g.padT, W = g.W, H = g.H;
    var step = o.step || ((xmax - xmin) > 14 ? 2 : 1);
    var id = 'clip' + (++uid);
    function sx(x) { return padL + (x - xmin) * u; }
    function sy(y) { return padT + (ymax - y) * u; }
    var s = '<svg class="plane" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="' + esc(o.alt || describePlane(o)) + '">';
    s += '<defs><clipPath id="' + id + '"><rect x="' + sx(xmin) + '" y="' + sy(ymax) + '" width="' + (xmax - xmin) * u + '" height="' + (ymax - ymin) * u + '"/></clipPath></defs>';
    if (o.title) s += '<text x="' + W / 2 + '" y="19" text-anchor="middle" class="ptitle">' + o.title + '</text>';
    var i;
    for (i = Math.ceil(xmin); i <= xmax; i++) s += '<line x1="' + sx(i) + '" y1="' + sy(ymin) + '" x2="' + sx(i) + '" y2="' + sy(ymax) + '" class="grid"/>';
    for (i = Math.ceil(ymin); i <= ymax; i++) s += '<line x1="' + sx(xmin) + '" y1="' + sy(i) + '" x2="' + sx(xmax) + '" y2="' + sy(i) + '" class="grid"/>';
    // axes
    var ax0 = Math.min(Math.max(0, xmin), xmax), ay0 = Math.min(Math.max(0, ymin), ymax);
    s += '<line x1="' + sx(xmin) + '" y1="' + sy(ay0) + '" x2="' + sx(xmax) + '" y2="' + sy(ay0) + '" class="axis"/>';
    s += '<line x1="' + sx(ax0) + '" y1="' + sy(ymin) + '" x2="' + sx(ax0) + '" y2="' + sy(ymax) + '" class="axis"/>';
    s += '<text x="' + (sx(xmax) + 5) + '" y="' + (sy(ay0) + 5) + '" class="alabel">x</text>';
    s += '<text x="' + (sx(ax0) + 6) + '" y="' + (sy(ymax) - 4) + '" class="alabel">y</text>';
    for (i = Math.ceil(xmin); i <= xmax; i++) if (i !== 0 && i % step === 0) {
      s += '<text x="' + sx(i) + '" y="' + (sy(ay0) + 16) + '" text-anchor="middle" class="tick">' + (i < 0 ? '−' + (-i) : i) + '</text>';
    }
    for (i = Math.ceil(ymin); i <= ymax; i++) if (i !== 0 && i % step === 0) {
      s += '<text x="' + (sx(ax0) - 5) + '" y="' + (sy(i) + 4) + '" text-anchor="end" class="tick">' + (i < 0 ? '−' + (-i) : i) + '</text>';
    }
    // lines (clipped to the grid)
    s += '<g clip-path="url(#' + id + ')">';
    (o.lines || []).forEach(function (L) {
      var x1, y1, x2, y2;
      if (L.x !== undefined) { x1 = x2 = L.x; y1 = ymin - 1; y2 = ymax + 1; }
      else if (L.y !== undefined) { y1 = y2 = L.y; x1 = xmin - 1; x2 = xmax + 1; }
      else { x1 = xmin - 1; x2 = xmax + 1; y1 = L.m * x1 + L.b; y2 = L.m * x2 + L.b; }
      s += '<line x1="' + sx(x1) + '" y1="' + sy(y1) + '" x2="' + sx(x2) + '" y2="' + sy(y2) + '" class="gline" style="stroke:' + (L.color || '') + '"/>';
    });
    (o.segs || []).forEach(function (g2) {
      s += '<line x1="' + sx(g2[0]) + '" y1="' + sy(g2[1]) + '" x2="' + sx(g2[2]) + '" y2="' + sy(g2[3]) + '" class="seg" style="stroke:' + (g2[4] || '') + '"/>';
    });
    s += '</g>';
    if (o.slope) {
      var sl = o.slope;
      s += '<polyline points="' + sx(sl.x1) + ',' + sy(sl.y1) + ' ' + sx(sl.x2) + ',' + sy(sl.y1) + ' ' + sx(sl.x2) + ',' + sy(sl.y2) + '" class="rr"/>';
    }
    (o.points || []).forEach(function (p) {
      s += '<circle cx="' + sx(p.x) + '" cy="' + sy(p.y) + '" r="' + (p.r || 5) + '" class="pt" style="fill:' + (p.color || '') + '"/>';
      if (p.label) {
        var pos = p.pos || 'ur', dx = pos[1] === 'r' ? 8 : -8, dy = pos[0] === 'u' ? -8 : 16, an = pos[1] === 'r' ? 'start' : 'end';
        s += '<text x="' + (sx(p.x) + dx) + '" y="' + (sy(p.y) + dy) + '" text-anchor="' + an + '" class="plabel">' + p.label + '</text>';
      }
    });
    s += '</svg>';
    return s;
  }

  // ------------------------------------------------------------------ number line (for inequalities)
  // type: 1 x>a   2 x>=a   3 x<a   4 x<=a
  function numberLine(lo, hi, point, type, o) {
    o = o || {};
    var W = NL.W, pad = NL.pad, y = NL.y, H = NL.H;
    var u = (W - 2 * pad) / (hi - lo);
    function sx(x) { return pad + (x - lo) * u; }
    var s = '<svg class="numline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="' + esc(o.alt || describeNumberLine(lo, hi, point, type)) + '">';
    s += '<defs><marker id="ar' + (++uid) + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="arrowhead"/></marker></defs>';
    var mk = 'ar' + uid;
    s += '<line x1="' + (pad - 12) + '" y1="' + y + '" x2="' + (W - pad + 12) + '" y2="' + y + '" class="axis" marker-start="url(#' + mk + ')" marker-end="url(#' + mk + ')"/>';
    var step = (hi - lo) > 14 ? 2 : (o.step || 1);
    for (var i = Math.ceil(lo); i <= hi; i += 1) {
      s += '<line x1="' + sx(i) + '" y1="' + (y - 6) + '" x2="' + sx(i) + '" y2="' + (y + 6) + '" class="axis"/>';
      if ((i - Math.ceil(lo)) % step === 0) s += '<text x="' + sx(i) + '" y="' + (y + 24) + '" text-anchor="middle" class="tick">' + (i < 0 ? '−' + (-i) : i) + '</text>';
    }
    if (type) {
      var right = type === 1 || type === 2, closed = type === 2 || type === 4;
      var px = sx(point), end = right ? W - pad + 12 : pad - 12;
      s += '<line x1="' + px + '" y1="' + y + '" x2="' + end + '" y2="' + y + '" class="shade" marker-end="url(#' + mk + ')"/>';
      var dir = right ? 1 : -1;
      if (closed) {
        s += '<path d="M' + (px + dir * 7) + ' ' + (y - 13) + ' L' + px + ' ' + (y - 13) + ' L' + px + ' ' + (y + 13) + ' L' + (px + dir * 7) + ' ' + (y + 13) + '" class="brk"/>';
      } else {
        s += '<path d="M' + (px + dir * 5) + ' ' + (y - 13) + ' Q' + (px - dir * 5) + ' ' + y + ' ' + (px + dir * 5) + ' ' + (y + 13) + '" class="brk"/>';
      }
      if (o.label) s += '<text x="' + px + '" y="' + (y - 19) + '" text-anchor="middle" class="plabel">' + o.label + '</text>';
    }
    s += '</svg>';
    return s;
  }

  // ------------------------------------------------------------------ geoboard
  function geoboard(x1, y1, x2, y2, alt) {
    var u = 40, pad = 24, n = 4, W = n * u + 2 * pad;
    var s = '<svg class="geoboard" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + W + '" width="' + W + '" role="img" aria-label="' + esc(alt || describeGeoboard(x1, y1, x2, y2)) + '">';
    s += '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (W - 4) + '" rx="6" class="gb"/>';
    for (var gx = 0; gx <= n; gx++) for (var gy = 0; gy <= n; gy++) s += '<circle cx="' + (pad + gx * u) + '" cy="' + (W - pad - gy * u) + '" r="4" class="peg"/>';
    s += '<line x1="' + (pad + x1 * u) + '" y1="' + (W - pad - y1 * u) + '" x2="' + (pad + x2 * u) + '" y2="' + (W - pad - y2 * u) + '" class="band"/>';
    s += '</svg>';
    return s;
  }

  // ------------------------------------------------------------------ small DOM helpers for the widgets
  function mk(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function mkBtn(text, label) {
    var b = mk('button', 'btn small', text); b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    return b;
  }
  function numInput(label, min, max) {
    var lab = mk('label'), span = mk('span', null, label), inp = mk('input', 'gw-num');
    inp.type = 'number'; inp.step = 'any'; inp.min = min; inp.max = max; inp.setAttribute('inputmode', 'decimal'); inp.autocomplete = 'off';
    lab.appendChild(span); lab.appendChild(inp);
    return { label: lab, input: inp };
  }

  // ------------------------------------------------------------------ interactive plane widget
  // opts: xmin,xmax,ymin,ymax, mode:'points'|'line', count (points mode: how many points to place)
  // Points are placed by clicking the grid OR by typing coordinates. get() gives an array of [x,y].
  function planeWidget(container, o) {
    var g = planeGeom(o.xmin, o.xmax, o.ymin, o.ymax, o.unit, false);
    var u = g.u, padL = g.padL, padT = g.padT, W = g.W, H = g.H;
    var pts = [];
    var cid = 'gwclip' + (++uid);
    var lineMode = o.mode === 'line';
    var wrap = mk('div', 'graphwidget');
    wrap.appendChild(mk('div', 'gw-msg', lineMode
      ? 'Click two grid points to draw the line, or type the coordinates of two points below.'
      : 'Click the grid to plot each point (click a point again to remove it), or type coordinates below.'));
    var svgHost = mk('div');
    wrap.appendChild(svgHost);
    // typed entry (keyboard and screen-reader route)
    var coords = mk('div', 'gw-coords');
    var cx = numInput('x', o.xmin, o.xmax), cy = numInput('y', o.ymin, o.ymax);
    cx.input.setAttribute('aria-label', 'x-coordinate'); cy.input.setAttribute('aria-label', 'y-coordinate');
    var addBtn = mkBtn('Add point'), clearBtn = mkBtn('Clear');
    coords.appendChild(cx.label); coords.appendChild(cy.label); coords.appendChild(addBtn); coords.appendChild(clearBtn);
    wrap.appendChild(coords);
    var status = mk('div', 'gw-err'); status.setAttribute('role', 'status');
    wrap.appendChild(status);
    var list = mk('div', 'gw-list');
    wrap.appendChild(list);
    container.appendChild(wrap);

    function sx(x) { return padL + (x - o.xmin) * u; }
    function sy(y) { return padT + (o.ymax - y) * u; }
    function ptsText() { return pts.map(function (p) { return pt(p[0], p[1]); }).join(', '); }
    function altText() {
      var s = 'Coordinate grid, x from ' + fmt(o.xmin) + ' to ' + fmt(o.xmax) + ' and y from ' + fmt(o.ymin) + ' to ' + fmt(o.ymax) + '. ';
      if (!pts.length) return s + 'No points plotted yet.';
      s += (pts.length === 1 ? 'Point plotted: ' : 'Points plotted: ') + ptsText() + '.';
      if (lineMode && pts.length === 2) s += ' A line is drawn through them.';
      return s;
    }
    function draw() {
      var base = plane({ xmin: o.xmin, xmax: o.xmax, ymin: o.ymin, ymax: o.ymax, unit: u, step: o.step, alt: altText(),
        points: pts.map(function (p) { return { x: p[0], y: p[1], color: 'var(--svg-red)', label: '(' + p[0] + ', ' + p[1] + ')', pos: 'ur' }; }) });
      var inject = '';
      if (lineMode && pts.length === 2) {
        var a = pts[0], b = pts[1];
        var dx = b[0] - a[0], dy = b[1] - a[1], L = 40;
        inject = '<line x1="' + sx(a[0] - dx * L) + '" y1="' + sy(a[1] - dy * L) + '" x2="' + sx(a[0] + dx * L) + '" y2="' + sy(a[1] + dy * L) + '" class="gline" clip-path="url(#' + cid + ')"/>';
      }
      // overlay for mouse clicks, and the clip path for the user-drawn line
      var overlay = '<defs><clipPath id="' + cid + '"><rect x="' + padL + '" y="' + padT + '" width="' + (o.xmax - o.xmin) * u + '" height="' + (o.ymax - o.ymin) * u + '"/></clipPath></defs>';
      base = base.replace(/(<svg[^>]*>)/, '$1' + overlay).replace('</svg>', inject + '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="transparent" class="hit"/></svg>');
      svgHost.innerHTML = base;
      var svg = svgHost.firstChild;
      svg.setAttribute('width', W);
      svg.addEventListener('click', function (ev) {
        var r = svg.getBoundingClientRect();
        var scale = W / r.width;
        var px = (ev.clientX - r.left) * scale, py = (ev.clientY - r.top) * scale;
        var x = Math.round((px - padL) / u) + o.xmin, y = o.ymax - Math.round((py - padT) / u);
        if (x < o.xmin || x > o.xmax || y < o.ymin || y > o.ymax) return;
        toggle(x, y, true);
      });
      renderList();
    }
    function renderList() {
      list.innerHTML = '';
      if (!pts.length) { list.appendChild(document.createTextNode('No points plotted yet.')); return; }
      list.appendChild(document.createTextNode(pts.length === 1 ? 'Plotted point:' : 'Plotted points:'));
      var ul = mk('ul');
      pts.forEach(function (p) {
        var li = mk('li'), b = mkBtn('Remove', 'Remove point ' + pt(p[0], p[1]));
        li.appendChild(mk('span', null, pt(p[0], p[1]))); li.appendChild(b);
        b.addEventListener('click', function () { remove(p[0], p[1]); cx.input.focus(); });
        ul.appendChild(li);
      });
      list.appendChild(ul);
    }
    function changed(msg, isErr) {
      draw();
      status.className = 'gw-err' + (isErr ? '' : ' gw-ok');
      status.textContent = msg || '';
      if (o.onChange) o.onChange();
    }
    function indexOf(x, y) { var idx = -1; pts.forEach(function (p, i) { if (p[0] === x && p[1] === y) idx = i; }); return idx; }
    function remove(x, y) {
      var i = indexOf(x, y);
      if (i < 0) return;
      pts.splice(i, 1);
      changed('Removed point ' + pt(x, y) + '. ' + pts.length + (pts.length === 1 ? ' point' : ' points') + ' plotted.');
    }
    // fromClick: clicking an existing point removes it; typing an existing point just says so
    function toggle(x, y, fromClick) {
      var i = indexOf(x, y);
      if (i >= 0) {
        if (fromClick) remove(x, y); else { status.className = 'gw-err'; status.textContent = pt(x, y) + ' is already plotted.'; }
        return;
      }
      if (lineMode) { if (pts.length >= 2) pts.shift(); pts.push([x, y]); }
      else {
        if (o.count && pts.length >= o.count) { status.className = 'gw-err'; status.textContent = 'You already have ' + o.count + ' points. Remove one first.'; return; }
        pts.push([x, y]);
      }
      changed('Plotted ' + pt(x, y) + '. ' + pts.length + (lineMode ? ' of 2' : (o.count ? ' of ' + o.count : '')) + (pts.length === 1 && !o.count && !lineMode ? ' point' : ' points') + ' plotted.');
    }
    function addTyped() {
      var x = cx.input.value.trim(), y = cy.input.value.trim();
      var nx = Number(x), ny = Number(y);
      if (x === '' || y === '' || !Number.isInteger(nx) || !Number.isInteger(ny) || nx < o.xmin || nx > o.xmax || ny < o.ymin || ny > o.ymax) {
        status.className = 'gw-err';
        status.textContent = 'Enter whole numbers from ' + fmt(o.xmin) + ' to ' + fmt(o.xmax) + ' for x and from ' + fmt(o.ymin) + ' to ' + fmt(o.ymax) + ' for y.';
        return;
      }
      toggle(nx, ny, false);
      if (indexOf(nx, ny) >= 0) { cx.input.value = ''; cy.input.value = ''; }
    }
    addBtn.addEventListener('click', addTyped);
    [cx.input, cy.input].forEach(function (inp) { inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addTyped(); } }); });
    clearBtn.addEventListener('click', function () { pts = []; changed('Cleared. No points plotted.'); });
    draw();
    return { el: wrap, get: function () { return pts.slice(); }, reset: function () { pts = []; status.textContent = ''; draw(); } };
  }

  // ------------------------------------------------------------------ interactive number-line widget
  // opts: lo, hi. The student clicks the line (or types the number), then toggles open/closed and the direction.
  // get() returns {x, closed, dir:'left'|'right'} or null
  function numberLineWidget(container, o) {
    var state = { x: null, closed: false, dir: 'right' };
    var wrap = mk('div', 'graphwidget');
    wrap.appendChild(mk('div', 'gw-msg', 'Click the number line, or type the number below, to place the endpoint. Then choose the endpoint style and the direction to shade.'));
    var host = mk('div');
    var ctr = mk('div', 'gw-controls');
    var nx = numInput('Endpoint', o.lo, o.hi);
    nx.input.setAttribute('aria-label', 'Endpoint, a number from ' + fmt(o.lo) + ' to ' + fmt(o.hi));
    ctr.appendChild(nx.label);
    var bClosed = mkBtn(''), bDir = mkBtn('');
    ctr.appendChild(bClosed); ctr.appendChild(bDir);
    var status = mk('div', 'gw-err'); status.setAttribute('role', 'status');
    wrap.appendChild(host); wrap.appendChild(ctr); wrap.appendChild(status);
    container.appendChild(wrap);
    var W = NL.W, pad = NL.pad, u = (W - 2 * pad) / (o.hi - o.lo);
    function typeNum() { return state.x == null ? 0 : (state.dir === 'right' ? (state.closed ? 2 : 1) : (state.closed ? 4 : 3)); }
    function refresh() {
      bClosed.textContent = state.closed ? 'Endpoint: bracket [ ] (included)' : 'Endpoint: parenthesis ( ) (not included)';
      bDir.textContent = state.dir === 'right' ? 'Shade: to the right →' : 'Shade: to the left ←';
      var type = typeNum();
      host.innerHTML = numberLine(o.lo, o.hi, state.x == null ? 0 : state.x, type, {});
      var svg = host.firstChild;
      var hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hit.setAttribute('x', 0); hit.setAttribute('y', 0); hit.setAttribute('width', W); hit.setAttribute('height', NL.H); hit.setAttribute('fill', 'transparent');
      hit.setAttribute('class', 'hit');
      svg.appendChild(hit);
      svg.addEventListener('click', function (ev) {
        var r = svg.getBoundingClientRect(), px = (ev.clientX - r.left) * (W / r.width);
        var snap = o.snap || 1;
        var v = Math.round(((px - pad) / u + o.lo) / snap) * snap;
        if (v < o.lo || v > o.hi) return;
        state.x = v; nx.input.value = String(v); changed();
      });
    }
    function changed() {
      refresh();
      status.className = 'gw-err gw-ok';
      status.textContent = describeNumberLine(o.lo, o.hi, state.x == null ? 0 : state.x, typeNum());
      if (o.onChange) o.onChange();
    }
    nx.input.addEventListener('input', function () {
      var v = parseFloat(nx.input.value);
      if (nx.input.value.trim() === '' || isNaN(v)) { state.x = null; changed(); return; }
      if (v < o.lo || v > o.hi) { status.className = 'gw-err'; status.textContent = 'Enter a number from ' + fmt(o.lo) + ' to ' + fmt(o.hi) + '.'; return; }
      state.x = v; changed();
    });
    bClosed.addEventListener('click', function () { state.closed = !state.closed; changed(); });
    bDir.addEventListener('click', function () { state.dir = state.dir === 'right' ? 'left' : 'right'; changed(); });
    refresh();
    return {
      el: wrap,
      get: function () { return state.x == null ? null : { x: state.x, closed: state.closed, dir: state.dir }; },
      reset: function () { state = { x: null, closed: false, dir: 'right' }; nx.input.value = ''; status.textContent = ''; refresh(); }
    };
  }

  MAT.svg = { plane: plane, numberLine: numberLine, geoboard: geoboard };
  MAT.planeGeom = planeGeom;
  MAT.numLineGeom = NL;
  MAT.planeWidget = planeWidget;
  MAT.numberLineWidget = numberLineWidget;
  if (typeof module !== 'undefined' && module.exports) module.exports = MAT;
})(typeof window !== 'undefined' ? window : globalThis);
