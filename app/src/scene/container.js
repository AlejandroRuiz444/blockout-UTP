/*
 * container.js — MÓDULO ESCENA (rol A) · geometría estática: contenedor, rejilla y ejes del mundo.
 *
 * Mundo: X, Y horizontales, Z hacia arriba; el contenedor ocupa [0,W]×[0,H]×[0,D] y su piso es Z = 0.
 */
(function (root) {
  'use strict';
  const Mesh = root.Mesh || require('./mesh.js');

  const AXIS_LEN = 2;   // longitud de los ejes del mundo dibujados en el origen

  /** 12 aristas del marco (caja envolvente). */
  function frame_segments(W, H, D) {
    const segs = [];
    for (const z of [0, D]) {
      segs.push([[0, 0, z], [W, 0, z]], [[W, 0, z], [W, H, z]], [[W, H, z], [0, H, z]], [[0, H, z], [0, 0, z]]);
    }
    for (const [x, y] of [[0, 0], [W, 0], [W, H], [0, H]]) segs.push([[x, y, 0], [x, y, D]]);
    return segs;
  }

  /** Rejilla: líneas cada celda en el piso, verticales en las 4 paredes y un anillo por nivel. */
  function grid_segments(W, H, D) {
    const segs = [];
    for (let i = 1; i < W; i++) segs.push([[i, 0, 0], [i, H, 0]]);
    for (let j = 1; j < H; j++) segs.push([[0, j, 0], [W, j, 0]]);
    for (let i = 1; i < W; i++) segs.push([[i, 0, 0], [i, 0, D]], [[i, H, 0], [i, H, D]]);
    for (let j = 1; j < H; j++) segs.push([[0, j, 0], [0, j, D]], [[W, j, 0], [W, j, D]]);
    for (let k = 1; k < D; k++) {
      segs.push([[0, 0, k], [W, 0, k]], [[W, 0, k], [W, H, k]], [[W, H, k], [0, H, k]], [[0, H, k], [0, 0, k]]);
    }
    return segs;
  }

  /** Objetos 3D estáticos del contenedor de tamaño [W,H,D]: marco, rejilla y los tres ejes. */
  function objects(size) {
    const [W, H, D] = size;
    return [
      Mesh.static_object('container', 'container', frame_segments(W, H, D)),
      Mesh.static_object('grid', 'grid', grid_segments(W, H, D)),
      Mesh.static_object('axis_x', 'axis', [[[0, 0, 0], [AXIS_LEN, 0, 0]]]),
      Mesh.static_object('axis_y', 'axis', [[[0, 0, 0], [0, AXIS_LEN, 0]]]),
      Mesh.static_object('axis_z', 'axis', [[[0, 0, 0], [0, 0, AXIS_LEN]]]),
    ];
  }

  const Container = { AXIS_LEN, frame_segments, grid_segments, objects };
  root.Container = Container;
  if (typeof module !== 'undefined' && module.exports) module.exports = Container;
})(typeof globalThis !== 'undefined' ? globalThis : this);
