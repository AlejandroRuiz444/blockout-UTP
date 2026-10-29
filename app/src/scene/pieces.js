/*
 * pieces.js — MÓDULO ESCENA (rol A) · catálogo de piezas (solo DATOS y su preprocesado).
 *
 * Cada pieza es un policubo: celdas unitarias enteras [x,y,z] en su sistema LOCAL, tomadas de
 * BlockOut/InitPolyCube.cpp. `orig` = índice en allPolyCube[]; `orig_orientations` = nº de AddOrientation()
 * en BlockOrientation.h (verificación cruzada en los tests).
 *
 * Catálogo (7 piezas, 3 no planas). La pieza 7 es la más simple del juego original después del domino:
 * el tricubo recto (I3, allPolyCube[2]).
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');

  const RAW = [
    ['L3', 'Tricubo L (plano)', 5, 12, [[0, 0, 0], [1, 0, 0], [1, 1, 0]]],
    ['T4', 'Tetracubo T (plano)', 7, 12, [[0, 0, 0], [1, 0, 0], [2, 0, 0], [1, 1, 0]]],
    ['S4', 'Tetracubo S (plano)', 8, 12, [[1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 0]]],
    ['O4', 'Tetracubo cuadrado (plano)', 6, 3, [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]]],
    ['SCREW', 'Tornillo (3D)', 32, 12, [[1, 0, 0], [1, 0, 1], [0, 0, 1], [0, 1, 1]]],
    ['CORNER3D', 'Esquina 3D (3D)', 34, 8, [[1, 0, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1]]],
    ['I3', 'Tricubo recto (plano)', 2, 3, [[0, 0, 0], [0, 1, 0], [0, 2, 0]]],
  ];

  /**
   * Pivote de rotación de una pieza (sistema local): centro del CUBO OCUPADO más cercano al centroide de la
   * pieza (empate: el primero de la lista). Al ser el centro de una celda, sus tres coordenadas son
   * semienteras (k + 0.5): R·(c − p) + p cae exactamente en el centro de otra celda para cualquier R de 90°
   * (permutación con signos), así que los giros respetan la retícula.
   */
  function pivot_of(cubes) {
    const n = cubes.length;
    const cen = [0, 1, 2].map((a) => cubes.reduce((s, c) => s + c[a] + 0.5, 0) / n);
    let best = null, bd = Infinity;
    for (const c of cubes) {
      const p = [c[0] + 0.5, c[1] + 0.5, c[2] + 0.5];
      const d = LA.norm(LA.vsub(p, cen));
      if (d < bd - 1e-12) { bd = d; best = p; }
    }
    return best;
  }

  /** true si todos los cubos están en una misma capa axial (pieza "plana"). */
  function is_planar(cubes) {
    return [0, 1, 2].some((a) => cubes.every((c) => c[a] === cubes[0][a]));
  }

  const DEFS = {};
  const ORDER = [];
  for (const [type, name, orig, nor, cubes] of RAW) {
    const size = [0, 1, 2].map((a) => Math.max(...cubes.map((c) => c[a])) + 1);
    DEFS[type] = { type, name, orig, orig_orientations: nor, cubes, size, planar: is_planar(cubes), pivot: pivot_of(cubes) };
    ORDER.push(type);
  }

  const Pieces = { DEFS, ORDER, pivot_of, is_planar };
  root.Pieces = Pieces;
  if (typeof module !== 'undefined' && module.exports) module.exports = Pieces;
})(typeof globalThis !== 'undefined' ? globalThis : this);
