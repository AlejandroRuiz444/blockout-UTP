/*
 * report.js — ejecuta el experimento de homografía con la configuración por defecto e imprime las tablas
 * (Markdown) y las matrices.   node app/tests/report.js
 * Sus resultados se copian a docs/INFORME.md.
 */
'use strict';
const path = require('path');
const SRC = { linalg: 'core', scene: 'scene', camera: 'projection', projection: 'projection', homography: 'projection' };
const js = (f) => require(path.join(__dirname, '..', 'src', SRC[f], f + '.js'));
const H = js('homography'), LA = js('linalg');

const t0 = Date.now();
const r = H.run_experiment();
const ms = Date.now() - t0;
if (r.error) { console.error(r.error); process.exit(1); }
const deg = (x) => (x * 180 / Math.PI).toFixed(0) + '°';
const c = r.config;
console.log('Vista 1: acimut ' + deg(c.view1.azimuth) + ', elevación ' + deg(c.view1.elevation) + ', distancia ' + c.view1.distance + ', FOV ' + deg(c.view1.fov_y) + ', objetivo (' + c.view1.target.join(', ') + ')');
console.log('Vista 2: acimut ' + deg(c.view2.azimuth) + ', elevación ' + deg(c.view2.elevation) + ', distancia ' + c.view2.distance + ', FOV ' + deg(c.view2.fov_y) + ', objetivo (' + c.view2.target.join(', ') + ')');
console.log('C1 = (' + r.cam1.C.map((v) => v.toFixed(3)).join(', ') + ')   C2 = (' + r.cam2.C.map((v) => v.toFixed(3)).join(', ') + ')');
console.log('Diferencia máxima entre H1 y las columnas 1, 2, 4 de P1: ' + r.H_vs_P_columns_diff.toExponential(2));
console.log('\nH1 =\n' + H.matrix_text(r.H1) + '\nH2 =\n' + H.matrix_text(r.H2) + '\nH21 = H2·H1⁻¹ (normalizada h33 = 1) =\n' + H.matrix_text(LA.scale(r.H21, 1 / r.H21[2][2])) + '\nH_dlt (h33 = 1) =\n' + H.matrix_text(r.H_dlt));
console.log('\nEjemplo con ruido σ = ' + r.noise_example.sigma + ' px (semilla ' + r.noise_example.seed + '): RMS sobre los 10 puntos = ' + r.noise_example.rms.toFixed(3) + ' px');
console.log('\n' + H.report_markdown(r));
console.error('(experimento completo en ' + ms + ' ms)');
