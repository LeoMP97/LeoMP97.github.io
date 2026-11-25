/* MAT040 notes: example engine.
   Turns every <section class="example" data-key="chapter.N"> into an interactive problem
   (if a generator is registered for it), checks answers, shows worked solutions and videos. */
(function (root) {
  'use strict';
  var MAT = root.MAT || (root.MAT = {});

  // ------------------------------------------------------------------ text with $math$
  function rt(str) {
    str = String(str).replace(/\\\$/g, '\u0001');
    var out = '', re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, last = 0, m;
    while ((m = re.exec(str))) {
      out += str.slice(last, m.index).replace(/\u0001/g, '$');
      var disp = m[1] !== undefined;
      out += root.katex.renderToString(disp ? m[1] : m[2], { displayMode: disp, throwOnError: false, strict: 'ignore' });
      last = re.lastIndex;
    }
    out += str.slice(last).replace(/\u0001/g, '$');
    return out;
  }
  MAT.rt = rt;

  // ------------------------------------------------------------------ accessibility helpers
  var idc = 0;
  function nid(prefix) { return prefix + (++idc); }
  // TeX -> words a screen reader can say (used for the accessible names of choices that are only math)
  function speakTex(t) {
    t = String(t).replace(/\\left|\\right|\\displaystyle|\\!|\\,|\;|\\:|\\ |\\quad|\\qquad/g, ' ');
    var prev, guard = 0;
    do {
      prev = t;
      t = t.replace(/\\d?frac\s*(?:\{([^{}]*)\}|(\d))\s*(?:\{([^{}]*)\}|(\d))/g, function (m, a1, a2, b1, b2) { return ' ' + (a1 !== undefined ? a1 : a2) + ' over ' + (b1 !== undefined ? b1 : b2) + ' '; })
           .replace(/\\sqrt\s*\{([^{}]*)\}/g, ' square root of $1 ')
           .replace(/\^\s*\{?2\}?/g, ' squared ').replace(/\^\s*\{?3\}?/g, ' cubed ')
           .replace(/\^\s*\{([^{}]*)\}/g, ' to the power $1 ').replace(/\^\s*(\w)/g, ' to the power $1 ')
           .replace(/_\s*\{([^{}]*)\}/g, ' sub $1 ')
           .replace(/\\(?:text|mathrm|textbf|mathbf)\{([^{}]*)\}/g, ' $1 ');
    } while (t !== prev && ++guard < 5);
    t = t.replace(/\\leq?\b/g, ' is less than or equal to ').replace(/\\geq?\b/g, ' is greater than or equal to ').replace(/\\neq?\b/g, ' is not equal to ')
         .replace(/\\cdot|\\times/g, ' times ').replace(/\\div/g, ' divided by ').replace(/\\pm/g, ' plus or minus ')
         .replace(/\\infty/g, ' infinity ').replace(/\\(?:to|rightarrow)\b/g, ' goes to ').replace(/\\%/g, ' percent ')
         .replace(/\\(?:checkmark|chk)\b/g, ' check ').replace(/\\(?:ldots|dots|cdots)/g, ' and so on ')
         .replace(/\\in\b/g, ' in ').replace(/\\mathbb\{([A-Z])\}/g, ' $1 ')
         .replace(/=/g, ' equals ').replace(/</g, ' is less than ').replace(/>/g, ' is greater than ')
         .replace(/\+/g, ' plus ').replace(/-|−/g, ' minus ')
         .replace(/\\[a-zA-Z]+/g, ' ').replace(/[{}\\]/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
  }
  // a string with $math$ -> speakable text
  function speakStr(str) {
    str = String(str).replace(/\\\$/g, '\u0001');
    return str.replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, function (m, d, i) { return ' ' + speakTex(d !== undefined ? d : i) + ' '; })
              .replace(/\u0001/g, '$').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  MAT.speak = speakStr;
  // spoken announcement for screen readers (new numbers loaded, etc.)
  function announce(msg) {
    var r = document.getElementById('sr-announce');
    if (!r) { r = document.createElement('div'); r.id = 'sr-announce'; r.className = 'sr-only'; r.setAttribute('role', 'status'); document.body.appendChild(r); }
    r.textContent = '';
    setTimeout(function () { r.textContent = msg; }, 50);
  }
  // table headers that contain only math get a spoken name (assistive technology that cannot read MathML still gets it)
  function nameMathHeaders() {
    Array.prototype.forEach.call(document.querySelectorAll('th'), function (th) {
      if (!th.querySelector('.katex') || th.hasAttribute('aria-label')) return;
      var c = th.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.katex'), function (k) {
        var an = k.querySelector('annotation'), t = document.createTextNode(' ' + (an ? speakTex(an.textContent) : '') + ' ');
        k.parentNode.replaceChild(t, k);
      });
      var name = c.textContent.replace(/\s+/g, ' ').trim();
      if (name) th.setAttribute('aria-label', name);
    });
  }
  // wide equations scroll sideways on small screens: make those regions reachable with the keyboard
  function markScrollable(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll('.display, .ex-display, .part-q, .sol-part, .ex-figure, .tablewrap, .katex-display, main p, main li, main figcaption, main .center, main .keybox, main .howto, main h2, main h3'), function (e) {
      if (e.scrollWidth > e.clientWidth + 1) { e.setAttribute('tabindex', '0'); e.classList.add('scrolls'); }
      else if (e.classList.contains('scrolls')) { e.removeAttribute('tabindex'); e.classList.remove('scrolls'); }
    });
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // ------------------------------------------------------------------ videos
  function parseVideo(url) {
    var m;
    if ((m = /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{6,})/.exec(url))) {
      var t = /[?&](?:t|start)=(\d+)/.exec(url);
      return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + m[1] + (t ? '?start=' + t[1] : '') };
    }
    if ((m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url))) return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + m[1] };
    if ((m = /loom\.com\/(?:share|embed)\/([\w]+)/.exec(url))) return { kind: 'iframe', src: 'https://www.loom.com/embed/' + m[1] };
    if ((m = /drive\.google\.com\/file\/d\/([\w-]+)/.exec(url))) return { kind: 'iframe', src: 'https://drive.google.com/file/d/' + m[1] + '/preview' };
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { kind: 'video', src: url };
    return { kind: 'link', src: url };
  }
  function videoEl(v) {
    var info = parseVideo(v.url), box = el('div', 'video-embed');
    if (info.kind === 'iframe') {
      var f = document.createElement('iframe');
      f.src = info.src; f.loading = 'lazy'; f.title = v.title || 'Worked example video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      box.appendChild(f);
    } else if (info.kind === 'video') {
      var vd = document.createElement('video'); vd.src = info.src; vd.controls = true; vd.preload = 'metadata'; box.appendChild(vd);
    } else {
      box.className = 'video-link';
      var a = el('a', 'btn', '▶ ' + (v.title || 'Watch video')); a.href = info.src; a.target = '_blank'; a.rel = 'noopener'; box.appendChild(a);
    }
    return box;
  }
  // videos.js may say chapter: 7 (the chapter number) or chapter: 'lin1' (the internal key)
  var CHAPTER_KEYS = ['numsets', 'arith', 'div', 'frac', 'dec', 'vars', 'lin1', 'ineq', 'lin2', 'slope', 'slopeint', 'eqline', 'systems'];
  function chapKey(c) { return /^\d+$/.test(String(c)) ? CHAPTER_KEYS[Number(c) - 1] : c; }
  function videosFor(chapter, n) {
    return (root.MAT_VIDEOS || []).filter(function (v) {
      return chapKey(v.chapter) === chapter && (n === undefined ? true : String(v.example) === String(n));
    });
  }
  function videoNote() { return el('p', 'muted video-note', 'This video works a similar problem with different numbers; the steps are the same.'); }
  function mountVideoSection(sec) {
    var chapter = sec.dataset.chapter;
    var list = videosFor(chapter);
    var body = sec.querySelector('.videos-body');
    body.innerHTML = '';
    if (!list.length) {
      body.appendChild(el('p', 'muted', 'Worked-example videos for this chapter are coming soon.'));
      return;
    }
    list.forEach(function (v) {
      var card = el('div', 'video-card');
      var title = (v.example === undefined ? '' : (/^P\d+$/.test(String(v.example)) ? 'Practice ' + String(v.example).slice(1) : 'Example ' + v.example) + ': ') + (v.title || 'Worked example');
      card.appendChild(el('h3', null, title.replace(/&/g, '&amp;').replace(/</g, '&lt;')));
      if (v.description) card.appendChild(el('p', 'muted', String(v.description).replace(/&/g, '&amp;').replace(/</g, '&lt;')));
      card.appendChild(videoEl(v));
      body.appendChild(card);
    });
  }

  // ------------------------------------------------------------------ building an example
  var examples = [];

  function updateScore() {
    var done = 0, total = 0;
    examples.forEach(function (ex) { if (ex.interactive) { total++; if (ex.done) done++; } });
    var s = document.getElementById('score');
    if (s) s.innerHTML = '<span class="sc-full">' + done + ' of ' + total + ' examples correct</span><span class="sc-short">' + done + '/' + total + ' correct</span>';
    var bar = document.getElementById('scorebar');
    if (bar) bar.style.width = (total ? 100 * done / total : 0) + '%';
  }

  function mountExample(sec) {
    var key = sec.dataset.key, parts = key.split('.');
    var chapter = parts[0], n = parts[1];
    var def = MAT.defs[key];
    var ex = { sec: sec, key: key, interactive: !!def, done: false };
    examples.push(ex);
    if (!def) { setupStatic(sec, chapter, n); return; }
    sec.classList.add('interactive');

    function generate() {
      var seedParam = /[?&]seed=(\d+)/.exec(location.search);
      var R = MAT.makeRng(seedParam ? +seedParam[1] + (+n || 0) : null);
      var spec, tries = 0;
      for (;;) {
        try { spec = def(R, MAT); break; }
        catch (e) { if (++tries > 5) { console.error('Generator ' + key + ' failed', e); sec.classList.add('static'); return; } }
      }
      render(spec);
    }

    function render(spec) {
      sec.innerHTML = '';
      ex.spec = spec;
      ex.done = false;
      var exLabel = /^P\d+$/.test(n) ? 'Practice ' + n.slice(1) : 'Example ' + n;
      var head = el('header', 'ex-head');
      head.appendChild(el('span', 'ex-label', exLabel));
      var status = el('span', 'ex-status', ''); status.setAttribute('role', 'status');
      head.appendChild(status);
      var btns = el('div', 'ex-btns');
      var vids = videosFor(chapter, n);
      var vidBtn = null;
      if (vids.length) {
        vidBtn = el('button', 'btn small', '▶ Watch worked example'); vidBtn.type = 'button';
        vidBtn.setAttribute('aria-label', 'Watch worked example video for ' + exLabel); vidBtn.setAttribute('aria-expanded', 'false');
        btns.appendChild(vidBtn);
      }
      var again = el('button', 'btn small', '<span aria-hidden="true">↻</span> New numbers'); again.type = 'button';
      again.setAttribute('aria-label', 'New numbers for ' + exLabel);
      btns.appendChild(again);
      head.appendChild(btns);
      sec.appendChild(head);

      var body = el('div', 'ex-body');
      if (spec.instr) body.appendChild(el('p', 'ex-instr', rt(spec.instr)));
      if (spec.display) body.appendChild(el('div', 'ex-display', rt(spec.display)));
      if (spec.figure) body.appendChild(el('div', 'ex-figure', spec.figure));
      if (spec.hint) body.appendChild(el('p', 'hint', rt(spec.hint)));
      var vidBox = el('div', 'ex-video'); vidBox.hidden = true; vidBox.id = nid('vid');
      if (vidBtn) vidBtn.setAttribute('aria-controls', vidBox.id);
      body.appendChild(vidBox);

      var partStates = [];
      (spec.parts || []).forEach(function (p, pi) { partStates.push(buildPart(body, p, pi, (spec.parts || []).length, onPartChange, exLabel)); });
      sec.appendChild(body);

      var foot = el('footer', 'ex-foot');
      var solBtn = el('button', 'btn ghost small', 'Show worked solution'); solBtn.type = 'button';
      solBtn.setAttribute('aria-expanded', 'false'); solBtn.setAttribute('aria-label', 'Show worked solution for ' + exLabel);
      foot.appendChild(solBtn);
      var sol = el('div', 'solution'); sol.hidden = true; sol.id = nid('sol');
      solBtn.setAttribute('aria-controls', sol.id);
      var html = '';
      if (spec.solution) html += '<div>' + rt(spec.solution) + '</div>';
      (spec.parts || []).forEach(function (p) {
        if (p.sol) html += '<div class="sol-part">' + (p.label ? '<span class="plabel">' + rt(p.label) + '</span> ' : '') + rt(p.sol) + '</div>';
      });
      sol.innerHTML = html;
      foot.appendChild(sol);
      sec.appendChild(foot);

      function onPartChange() {
        var allOk = partStates.length > 0 && partStates.every(function (s) { return s.correct; });
        ex.done = allOk;
        sec.classList.toggle('done', allOk);
        status.textContent = allOk ? '✓ All correct!' : (partStates.some(function (s) { return s.correct; }) ? partStates.filter(function (s) { return s.correct; }).length + ' of ' + partStates.length + ' correct' : '');
        updateScore();
      }
      solBtn.addEventListener('click', function () {
        sol.hidden = !sol.hidden;
        solBtn.textContent = sol.hidden ? 'Show worked solution' : 'Hide worked solution';
        solBtn.setAttribute('aria-expanded', sol.hidden ? 'false' : 'true');
        solBtn.setAttribute('aria-label', (sol.hidden ? 'Show' : 'Hide') + ' worked solution for ' + exLabel);
        markScrollable(sol);
      });
      again.addEventListener('click', function () {
        generate(); updateScore();
        var nb = sec.querySelector('.ex-btns .btn:last-child'); if (nb) nb.focus();    // the old button was replaced: keep the keyboard focus here
        announce('New numbers for ' + exLabel + '.');
      });
      if (vidBtn) vidBtn.addEventListener('click', function () {
        if (vidBox.hidden) { if (!vidBox.firstChild) { vidBox.appendChild(videoNote()); vids.forEach(function (v) { vidBox.appendChild(videoEl(v)); }); } vidBox.hidden = false; vidBtn.textContent = '▼ Hide video'; }
        else { vidBox.hidden = true; vidBtn.textContent = '▶ Watch worked example'; }
        vidBtn.setAttribute('aria-expanded', vidBox.hidden ? 'false' : 'true');
        vidBtn.setAttribute('aria-label', (vidBox.hidden ? 'Watch worked example video for ' : 'Hide video for ') + exLabel);
      });
      updateScore();
      markScrollable(sec);
    }

    generate();
  }

  // a "part" is one question line, e.g. "a. 3^2 -> base, exponent"
  function buildPart(container, p, pi, total, onChange, exLabel) {
    var state = { correct: false };
    var row = el('div', 'part');
    row.dataset.part = pi;
    if (p.label) row.appendChild(el('span', 'part-label', rt(p.label)));
    var main = el('div', 'part-main');
    var ctx = (exLabel || 'Example') + (p.label ? ', part ' + String(p.label).replace(/<[^>]+>|[^A-Za-z0-9]/g, '') : '');
    var qId = null;
    if (p.q) { var qEl = el('div', 'part-q', rt(p.q)); qId = qEl.id = nid('q'); main.appendChild(qEl); }
    if (p.figure) main.appendChild(el('div', 'ex-figure', p.figure));
    var hintId = null;
    var fieldsBox = el('div', 'fields');
    var getters = [];
    var fields = p.fields || [p.field];
    fields.forEach(function (f, fi) {
      var wrap = el('div', 'field');
      wrap.dataset.field = fi;
      // accessible name = visible label (or a plain-words fallback) + which example and part this is
      var fid = nid('f'), isText = !(f.type === 'choice' || f.type === 'multi' || f.type === 'custom');
      var labEl = null, nameId;
      if (f.label) {
        labEl = el(isText ? 'label' : 'span', 'flabel', rt(f.label)); labEl.id = fid + 'l'; if (isText) labEl.htmlFor = fid + 'i';
        wrap.appendChild(labEl); nameId = fid + 'l';
      } else if (isText) {
        labEl = el('label', 'flabel', 'Answer'); labEl.id = fid + 'l'; labEl.htmlFor = fid + 'i';
        wrap.appendChild(labEl); nameId = fid + 'l';
      } else {
        var fallback = f.aria || (f.type === 'choice' ? 'Choose one answer' : f.type === 'multi' ? 'Choose all that apply' : f.type === 'custom' ? 'Graph answer' : 'Your answer');
        wrap.appendChild(el('span', 'sr-only', fallback)).id = fid + 'n'; nameId = fid + 'n';
      }
      var ctxEl = el('span', 'sr-only', ' ' + ctx); ctxEl.id = fid + 'c'; wrap.appendChild(ctxEl);
      var nameIds = nameId + ' ' + fid + 'c';
      var get, reset;
      if (f.type === 'choice') {
        var grp = el('span', 'choices'), name = 'c' + Math.random().toString(36).slice(2);
        grp.setAttribute('role', 'radiogroup'); grp.setAttribute('aria-labelledby', nameIds);
        f.options.forEach(function (o, oi) {
          var lab = el('label', 'choice'), inp = document.createElement('input');
          inp.type = 'radio'; inp.name = name; inp.value = oi; inp.setAttribute('aria-label', speakStr(o));
          lab.appendChild(inp); lab.appendChild(el('span', null, rt(o)));
          inp.addEventListener('change', function () { clearMarks(); });
          grp.appendChild(lab);
        });
        wrap.appendChild(grp);
        get = function () { var c = grp.querySelector('input:checked'); return c ? c.value : null; };
        reset = function () { var c = grp.querySelector('input:checked'); if (c) c.checked = false; };
      } else if (f.type === 'multi') {
        var g2 = el('span', 'choices');
        g2.setAttribute('role', 'group'); g2.setAttribute('aria-labelledby', nameIds);
        f.options.forEach(function (o, oi) {
          var lab = el('label', 'choice'), inp = document.createElement('input');
          inp.type = 'checkbox'; inp.value = oi; inp.setAttribute('aria-label', speakStr(o));
          lab.appendChild(inp); lab.appendChild(el('span', null, rt(o)));
          inp.addEventListener('change', function () { clearMarks(); });
          g2.appendChild(lab);
        });
        wrap.appendChild(g2);
        get = function () { return Array.prototype.map.call(g2.querySelectorAll('input:checked'), function (i) { return i.value; }); };
        reset = function () { Array.prototype.forEach.call(g2.querySelectorAll('input:checked'), function (i) { i.checked = false; }); };
      } else if (f.type === 'custom') {
        var host = el('div', 'custom');
        host.setAttribute('role', 'group'); host.setAttribute('aria-labelledby', nameIds);
        wrap.appendChild(host);
        var w = f.render(host, function () { clearMarks(); });
        get = function () { return w.get(); };
        reset = function () { w.reset(); };
      } else {
        var inp2 = document.createElement('input');
        inp2.type = 'text'; inp2.autocomplete = 'off'; inp2.spellcheck = false;
        inp2.setAttribute('autocapitalize', 'off'); inp2.setAttribute('autocorrect', 'off');
        inp2.className = 'answer'; inp2.id = fid + 'i'; inp2.setAttribute('aria-labelledby', nameIds);
        var desc = []; if (qId) desc.push(qId); if (p.hint) desc.push(hintId || (hintId = nid('h')));
        if (desc.length) inp2.setAttribute('aria-describedby', desc.join(' '));
        if (f.placeholder) inp2.placeholder = f.placeholder;
        inp2.style.width = (f.width || 9) + 'em';
        inp2.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); doCheck(); } });
        inp2.addEventListener('input', clearMarks);
        wrap.appendChild(inp2);
        get = function () { return inp2.value; };
        reset = function () { inp2.value = ''; };
        if (f.suffix) wrap.appendChild(el('span', 'fsuffix', rt(f.suffix)));
      }
      getters.push({ get: get, reset: reset, wrap: wrap, spec: f });
      fieldsBox.appendChild(wrap);
    });
    main.appendChild(fieldsBox);
    if (p.hint) { var hEl = el('div', 'hint', rt(p.hint)); hEl.id = hintId || nid('h'); main.appendChild(hEl); }
    var checkBtn = el('button', 'btn small primary', 'Check'); checkBtn.type = 'button';
    checkBtn.setAttribute('aria-label', 'Check answer, ' + ctx);
    var fb = el('div', 'feedback'); fb.setAttribute('role', 'status'); fb.setAttribute('aria-live', 'polite');
    var line = el('div', 'checkline'); line.appendChild(checkBtn); line.appendChild(fb);
    main.appendChild(line);
    row.appendChild(main);
    container.appendChild(row);

    function clearMarks() {
      row.classList.remove('correct', 'wrong');
      getters.forEach(function (g) { g.wrap.classList.remove('ok', 'bad'); });
      fb.textContent = ''; fb.className = 'feedback';
      if (state.correct) { state.correct = false; onChange(); }
    }
    function doCheck() {
      var results = getters.map(function (g) {
        var v = g.get();
        try { return MAT.check(g.spec, v); }
        catch (e) { return { ok: false, msg: 'Something went wrong checking that.', invalid: true }; }
      });
      var anyEmpty = results.some(function (r) { return r.empty; });
      var allOk = results.every(function (r) { return r.ok; });
      row.classList.remove('correct', 'wrong');
      getters.forEach(function (g, i) { g.wrap.classList.toggle('ok', results[i].ok && fields.length > 1); g.wrap.classList.toggle('bad', !results[i].ok && !results[i].empty && fields.length > 1); });
      if (allOk) {
        state.correct = true; row.classList.add('correct');
        fb.className = 'feedback good'; fb.textContent = '✓ Correct!';
      } else if (anyEmpty) {
        state.correct = false;
        fb.className = 'feedback warn'; fb.textContent = fields.length > 1 ? 'Fill in every box, then check.' : 'Type an answer first.';
      } else {
        state.correct = false; row.classList.add('wrong');
        var firstMsg = '';
        results.forEach(function (r) { if (!firstMsg && !r.ok && r.msg) firstMsg = r.msg; });
        var anyInvalid = results.some(function (r) { return r.invalid; });
        fb.className = 'feedback ' + (anyInvalid ? 'warn' : 'bad');
        fb.textContent = anyInvalid ? firstMsg : ('✗ Not quite. ' + (firstMsg || 'Try again, or open the worked solution.'));
      }
      onChange();
    }
    checkBtn.addEventListener('click', doCheck);
    state.check = doCheck;
    return state;
  }

  // no generator: keep the static problem, make the solution collapsible
  function setupStatic(sec, chapter, n) {
    var sol = sec.querySelector('.solution');
    var btn = sec.querySelector('.show-solution');
    if (sol && btn) {
      sol.hidden = true;
      var lbl = sec.querySelector('.ex-label'), lblText = lbl ? lbl.textContent : 'this example';
      if (!sol.id) sol.id = nid('sol');
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', sol.id); btn.setAttribute('aria-label', 'Show worked solution for ' + lblText);
      btn.addEventListener('click', function () {
        sol.hidden = !sol.hidden;
        btn.textContent = sol.hidden ? 'Show worked solution' : 'Hide worked solution';
        btn.setAttribute('aria-expanded', sol.hidden ? 'false' : 'true');
        btn.setAttribute('aria-label', (sol.hidden ? 'Show' : 'Hide') + ' worked solution for ' + lblText);
        markScrollable(sol);
      });
    }
    var vids = videosFor(chapter, n);
    if (vids.length) {
      var box = sec.querySelector('.ex-video');
      if (box) { vids.forEach(function (v) { box.appendChild(videoEl(v)); }); box.hidden = false; }
    }
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('section.example'), mountExample);
    Array.prototype.forEach.call(document.querySelectorAll('section.videos'), mountVideoSection);
    updateScore();
    markScrollable(document);
    nameMathHeaders();
    var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { markScrollable(document); }, 150); });
  }
  MAT.init = init;
  MAT.examples = examples;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
