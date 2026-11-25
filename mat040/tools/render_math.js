// Render a JSON list of {tex, display} with KaTeX (same copy the site ships).
const katex = require(require('path').join(__dirname, '..', 'assets', 'vendor', 'katex', 'katex.min.js'));
const fs = require('fs');
const items = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const macros = { '\\chk': '\\ \\checkmark' };
const out = items.map(it => {
  try {
    return { html: katex.renderToString(it.tex, { displayMode: it.display, throwOnError: true, strict: 'ignore', macros: Object.assign({}, macros), trust: false }) };
  } catch (e) { return { err: String(e.message || e), tex: it.tex }; }
});
fs.writeFileSync(process.argv[3], JSON.stringify(out));
console.log('rendered', out.length, 'errors', out.filter(o => o.err).length);
