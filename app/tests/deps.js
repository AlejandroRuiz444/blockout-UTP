/*
 * deps.js — imprime el grafo REAL de dependencias entre módulos (leído del código, sin comentarios ni cadenas).
 *   node app/tests/deps.js
 * Su salida se copia a docs/ARQUITECTURA.md; test_architecture.js impone las reglas de capas sobre estos mismos datos.
 */
'use strict';
const fs = require('fs'), path = require('path');
const { MODULES, NAMESPACES } = require('./manifest.js');
const root = path.join(__dirname, '..');
const raw = (m) => fs.readFileSync(path.join(root, 'src', m + '.js'), 'utf8');
const code = (m) => raw(m)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
  .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''");

let layer = '';
for (const m of MODULES) {
  const l = m.split('/')[0];
  if (l !== layer) { layer = l; console.log('\n[' + layer + ']'); }
  const c = code(m);
  const uses = Object.entries(NAMESPACES)
    .filter(([ns, i]) => i.file !== m && new RegExp('\\b' + ns + '\\b').test(c)).map(([ns]) => ns);
  const own = Object.entries(NAMESPACES).find(([, i]) => i.file === m);
  const lines = raw(m).split('\n').length;
  console.log('  ' + (m.split('/')[1] + '.js').padEnd(22) + (own ? own[0] : '(arranque)').padEnd(17) +
    String(lines).padStart(4) + ' líneas   usa: ' + (uses.length ? uses.join(', ') : '—'));
}
