/*
 * trace.js — imprime la traza numérica completa de un vértice: coordenadas del objeto -> M -> mundo ->
 * [R|t] -> cámara -> K -> píxeles.   node app/tests/trace.js
 * Sus valores se copian a docs/GUIA_DEMO.md (la guía contiene la salida real de este script).
 */
'use strict';
const path = require('path');
const SRC = { linalg: 'core', scene: 'scene', camera: 'projection', projection: 'projection', homography: 'projection' };
const js = (f) => require(path.join(__dirname, '..', 'src', SRC[f], f + '.js'));
const LA = js('linalg'), Scene = js('scene'), Camera = js('camera'), Projection = js('projection');

const fmt = (v, d) => (Math.abs(v) < 5e-10 ? 0 : v).toFixed(d === undefined ? 4 : d).padStart(10);
const row = (r, d) => '[' + r.map((v) => fmt(v, d)).join(' ') + ' ]';

let scene = Scene.create_scene();
for (const a of [
  { type: 'select', id: 'p5' },
  { type: 'rotate', axis: 'x', turns: 1 },
  { type: 'translate', delta: [0, 0, 1] },
]) scene = Scene.apply_action(scene, a);

const piece = scene.pieces.find((p) => p.id === 'p5');
const def = Scene.PIECE_DEFS[piece.type];
const geom = Scene.get_geometry(scene).objects.find((o) => o.id === 'p5');
const camera = Camera.build_camera(Camera.default_params());

console.log('Pieza: ' + def.name + ' (' + piece.id + '), acciones: rotate x +90°, translate (0,0,+1) desde la escena por defecto');
console.log('Pivote local p = (' + def.pivot.join(', ') + ')');
console.log('R =\n' + piece.R.map((r) => '  ' + row(r, 0)).join('\n'));
console.log('t = (' + piece.t.join(', ') + ')\n');

const M = Scene.model_matrix(piece);
console.log('M = T(p + t) · [R 0; 0 1] · T(−p)   (4×4, local -> mundo)\n' + M.map((r) => '  ' + row(r, 3)).join('\n') + '\n');

const idx = geom.vertices_local.findIndex((v) => v.join() === '2,1,2');
const Xl = geom.vertices_local[idx >= 0 ? idx : 0];
console.log('PASO 1  vértice en coordenadas del OBJETO:   X_l = (' + Xl.join(', ') + ')');
const Xw4 = LA.mulPoint4(M, Xl);
console.log('PASO 2  M·[X_l 1]ᵀ  -> MUNDO:               X_w = (' + Xw4.slice(0, 3).map((v) => fmt(v, 4).trim()).join(', ') + ')   w = ' + Xw4[3]);
console.log('        (comprobación con la geometría que entrega la escena: (' + geom.vertices[idx >= 0 ? idx : 0].map((v) => fmt(v, 4).trim()).join(', ') + '))\n');

const p = camera.params;
console.log('Cámara por defecto: acimut ' + (p.azimuth * 180 / Math.PI).toFixed(1) + '°, elevación ' + (p.elevation * 180 / Math.PI).toFixed(1) + '°, distancia ' + p.distance +
  ', objetivo (' + p.target.join(', ') + '), FOV vertical ' + (p.fov_y * 180 / Math.PI).toFixed(1) + '°, viewport ' + p.viewport.width + '×' + p.viewport.height + ', near ' + p.near);
console.log('Centro de cámara C = (' + camera.C.map((v) => v.toFixed(4)).join(', ') + ')');
console.log('R (mundo -> cámara) =\n' + camera.R.map((r) => '  ' + row(r, 5)).join('\n'));
console.log('t = −R·C = (' + camera.t.map((v) => v.toFixed(4)).join(', ') + ')');
console.log('K =\n' + camera.K.map((r) => '  ' + row(r, 3)).join('\n') + '\n');

const Xc = Projection.to_camera(Xw4.slice(0, 3), camera);
console.log('PASO 3  [R|t]·[X_w 1]ᵀ -> CÁMARA:            X_c = (' + Xc.map((v) => fmt(v, 4).trim()).join(', ') + ')   (z_c = ' + Xc[2].toFixed(4) + ' > near)');
const pk = LA.mulVec(camera.K, Xc);
console.log('PASO 4  K·X_c:                               (' + pk.map((v) => fmt(v, 3).trim()).join(', ') + ')   λ = ' + pk[2].toFixed(4));
console.log('PASO 5  división en perspectiva (÷ λ):       (u, v) = (' + (pk[0] / pk[2]).toFixed(3) + ', ' + (pk[1] / pk[2]).toFixed(3) + ') px');
const h = LA.mulVec(camera.P, Xw4.slice(0, 3).concat([1]));
console.log('Comprobación con P = K[R|t] (3×4):           P·[X_w 1]ᵀ = (' + h.map((v) => v.toFixed(3)).join(', ') + ') -> (u, v) = (' + (h[0] / h[2]).toFixed(3) + ', ' + (h[1] / h[2]).toFixed(3) + ')');
const r = Projection.project_point(Xw4.slice(0, 3), camera);
console.log('Comprobación con project_point():            (u, v) = (' + r.u.toFixed(3) + ', ' + r.v.toFixed(3) + ')');
