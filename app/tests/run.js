/*
 * run.js — ejecuta todas las verificaciones en Node:   node app/tests/run.js
 * (Node solo se usa para los tests; la aplicación no necesita Node.)
 *
 * El repositorio se construye por etapas (ver docs/GIT_WORKFLOW.md): mientras un módulo o su test todavía no se ha
 * integrado, se omite y se avisa. Con todo integrado no se omite nada, y test_architecture.js exige que estén todos.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { MODULES } = require('./manifest.js');

require('./harness.js');
const skipped = [];
const load = (file, label) => { if (fs.existsSync(file)) require(file); else skipped.push(label); };

for (const m of MODULES) {
  if (m === 'ui/main') continue;                                   // main.js solo corre en el navegador
  load(path.join(__dirname, '..', 'src', m + '.js'), 'src/' + m + '.js');
}
for (const f of [
  'test_linalg', 'test_scene', 'test_camera_projection', 'test_homography', 'test_animation', 'test_demo',
  'test_input', 'test_controller', 'test_hud', 'test_architecture',
]) load(path.join(__dirname, f + '.js'), 'tests/' + f + '.js');

if (skipped.length) console.log('(etapa parcial) aún no integrados: ' + skipped.join(', ') + '\n');
const r = Harness.run();
console.log(r.lines.join('\n'));
process.exit(r.failed ? 1 : 0);
