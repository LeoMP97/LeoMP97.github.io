// Runs every registered generator many times and checks it.
const fs = require('fs'), path = require('path');
const MAT = require(require('path').join(__dirname, '..', '..') + '/assets/js/core.js');
require(require('path').join(__dirname, '..', '..') + '/assets/js/graphs.js');
require(require('path').join(__dirname, '..', '..') + '/assets/js/helpers.js');
const katex = require(require('path').join(__dirname, '..', '..') + '/assets/vendor/katex/katex.min.js');
const dir = require('path').join(__dirname, '..', '..') + '/assets/js/problems';
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) require(path.join(dir, f));
const only = process.argv[2];
const RUNS = +(process.argv[3] || 300);
let problems = 0, checked = 0;
const seen = {};
function bad(key, msg) { problems++; if ((seen[key + msg] = (seen[key + msg] || 0) + 1) <= 1) console.log('PROBLEM', key, msg); }

function leaks(key, str) {
  if (/\[object|NaN|\bnull\b|Infinity/.test(str) || (/(^|[^a-z])undefined(?![a-z])/.test(str) && !/slope/i.test(str))) bad(key, 'leaked JS value in: ' + String(str).replace(/<[a-z\/][^>]*>/g, "").slice(0, 120));
}
function texOk(key, str) {
  if (!str) return;
  leaks(key, str);
  str = String(str).replace(/\\\$/g, '\u0001');
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g; let m;
  while ((m = re.exec(str))) {
    const tex = m[1] !== undefined ? m[1] : m[2];
    try { katex.renderToString(tex, { throwOnError: true, strict: 'ignore', macros: {} }); }
    catch (e) { bad(key, 'TeX error: ' + e.message.slice(0, 100) + ' in ' + tex.slice(0, 80)); }
  }
  const dollars = (str.match(/\$/g) || []).length;
  if (dollars % 2) bad(key, 'odd number of $ in: ' + str.slice(0, 80));
}

function wrongInputs(f) {
  const out = [];
  const F = MAT.F;
  switch (f.type) {
    case 'num': { const v = F(f.ans); out.push(v.add(1).str(), v.add(F(1).div(2)).str(), v.neg().add(v.isZero() ? 1 : 0).str()); if (!v.isZero()) out.push(v.neg().str()); break; }
    case 'expr': out.push('7x^3+1', '0'); break;
    case 'eq': out.push('y=7x^2', 'x=1234'); break;
    case 'pair': out.push('(' + f.ans[0].add(1).str() + ',' + f.ans[1].str() + ')', '(' + f.ans[1].str() + ',' + f.ans[0].add(2).str() + ')'); break;
    case 'sys': out.push(f.ans === 'none' ? 'inf' : f.ans === 'inf' ? 'no solution' : 'no solution', (f.ans === 'none' || f.ans === 'inf') ? '(1000,1000)' : '(' + f.ans[0].add(1).str() + ',' + f.ans[1].str() + ')'); break;
    case 'ineq': { const s = MAT.H.ivToIneq(f.ans, f.variable || 'x'); out.push(s.replace(/[<>]=?/, m => m === '<' ? '>' : m === '>' ? '<' : m === '<=' ? '>=' : '<='), s.indexOf('=') >= 0 ? s.replace('=', '') : s.replace(/([<>])/, '$1=')); break; }
    case 'interval': out.push('(5000, 6000)', MAT.H.ivToInterval(f.ans).replace('(', '[').replace(')', ']')); break;
    case 'list': { const a = f.ans.map(v => v.str()); if (a.length > 1) { const b = a.slice().reverse(); if (f.ordered && b.join() !== a.join()) out.push(b.join(', ')); } out.push(a.slice(0, -1).concat(['9999']).join(', ')); break; }
    case 'primefact': out.push('2*2*2*2*2*2*2*2*2*2*2*2', '3'); break;
    case 'exact': out.push('zzz'); break;
    case 'solset': out.push(f.ans === 'all' ? 'no solution' : 'all real numbers', 'x>3'); break;
    case 'text': out.push('zzz'); break;
    case 'expanded': out.push('1+1'); break;
    case 'choice': { const ans = [].concat(f.ans).map(String); f.options.forEach((o, i) => { if (!ans.includes(String(i))) out.push(String(i)); }); break; }
    case 'multi': { const a = f.ans.map(String); f.options.forEach((o, i) => { const b = a.includes(String(i)) ? a.filter(x => x !== String(i)) : a.concat([String(i)]); out.push(b); }); break; }
    case 'custom': break;
  }
  return out;
}

for (const key of Object.keys(MAT.defs).sort()) {
  if (only && !key.startsWith(only)) continue;
  const fn = MAT.defs[key];
  let distinct = new Set();
  for (let seed = 1; seed <= RUNS; seed++) {
    const R = MAT.makeRng(seed * 7919 + key.length);
    let spec;
    try { spec = fn(R, MAT); } catch (e) { bad(key, 'generator threw: ' + e.stack.split('\n').slice(0, 3).join(' | ')); continue; }
    if (!spec || !spec.parts || !spec.parts.length) { bad(key, 'no parts'); continue; }
    distinct.add(JSON.stringify([spec.instr, spec.display, spec.figure, spec.parts.map(p => p.q)]));
    texOk(key, spec.instr); texOk(key, spec.display); texOk(key, spec.solution); texOk(key, spec.hint);
    if (spec.verify) { try { if (spec.verify() !== true) bad(key, 'verify() failed'); } catch (e) { bad(key, 'verify threw ' + e.message); } }
    for (const p of spec.parts) {
      texOk(key, p.q); texOk(key, p.sol); texOk(key, p.label); texOk(key, p.hint);
      if (!p.sol && !spec.solution) bad(key, 'part without a solution');
      const fields = p.fields || [];
      if (!fields.length) bad(key, 'part without fields');
      for (const f of fields) {
        texOk(key, f.label); texOk(key, f.suffix);
        (f.options || []).forEach(o => texOk(key, o));
        checked++;
        let r;
        try { r = MAT.check(f, MAT.sampleInput(f)); } catch (e) { bad(key, 'check threw for ' + f.type + ': ' + e.message); continue; }
        // graph widgets: the answer must be placeable inside the window the student sees
        if (f.type === 'custom') {
          const smp = MAT.sampleInput(f);
          if (f.nl && (smp.x < f.nl.lo || smp.x > f.nl.hi)) bad(key, 'number-line answer ' + smp.x + ' outside window ' + f.nl.lo + '..' + f.nl.hi);
          if (f.win && Array.isArray(smp)) smp.forEach(p => { if (Array.isArray(p) && (p[0] < f.win.xmin || p[0] > f.win.xmax || p[1] < f.win.ymin || p[1] > f.win.ymax)) bad(key, 'plotted answer (' + p + ') outside the grid window'); });
        }
        if (!r.ok) bad(key, 'own answer rejected (' + f.type + '): ' + JSON.stringify(MAT.sampleInput(f)) + ' -> ' + r.msg);
        for (const w of wrongInputs(f)) {
          let rr; try { rr = MAT.check(f, w); } catch (e) { continue; }
          if (rr.ok) bad(key, 'wrong answer accepted (' + f.type + '): ' + JSON.stringify(w) + ' vs ' + JSON.stringify(MAT.sampleInput(f)));
        }
      }
    }
  }
  if (distinct.size < Math.min(RUNS / 3, 8)) bad(key, 'low variety: only ' + distinct.size + ' distinct problems in ' + RUNS + ' runs');
}
console.log('generators:', Object.keys(MAT.defs).filter(k => !only || k.startsWith(only)).length, ' fields checked:', checked, ' problems:', problems);
process.exit(problems ? 1 : 0);
