/*
 * motion.js — MÓDULO APLICACIÓN (rol C) · interpolación de poses 3D.
 *
 * Todo movimiento animado es una ACCIÓN `set_pose` para el módulo escena (pose rígida: R ortonormal con
 * det = +1, t). Nunca se animan coordenadas de pantalla. Las orientaciones se interpolan con matrices de
 * rotación reales por el camino geodésico: R(s) = Rot(eje, s·ángulo)·R0.
 *
 * API pública (puras; nunca lanzan: entradas inválidas -> null):
 *   interpolate_rotation(R0, R1, s)               R(s) entre dos rotaciones
 *   rotation_action(scene, id, axis, turns, s)    pose intermedia de un giro de 90°·turns
 *   translation_action(scene, id, delta, s)       pose intermedia de una traslación
 *   pose_action(id, R, t)                         acción set_pose
 *   apply_actions(scene, actions)                 aplica una lista de acciones en orden (ignora nulas)
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');
  const Scene = root.Scene || require('../scene/scene.js');

  const AXIS_VEC = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const find = (scene, id) => (scene && Array.isArray(scene.pieces) ? scene.pieces.find((p) => p.id === id) : null);

  function pose_action(id, R, t) { return { type: 'set_pose', id, R, t }; }

  /** Interpolación geodésica entre dos rotaciones: R(0) = R0, R(1) = R1, y R(s) es siempre una rotación. */
  function interpolate_rotation(R0, R1, s) {
    if (!LA.isRotation(R0, 1e-6) || !LA.isRotation(R1, 1e-6) || !Number.isFinite(s)) return null;
    const aa = LA.rotationAxisAngle(LA.matMul(R1, LA.transpose(R0)));
    if (!aa) return null;
    return LA.matMul(LA.axisAngle(aa.axis, aa.angle * s), R0);
  }

  /** Giro de 90°·turns alrededor del eje del MUNDO que pasa por el pivote: R(s) = Rot(θ·s)·R0, t sin cambios. */
  function rotation_action(scene, id, axis, turns, s) {
    const p = find(scene, id);
    if (!p || !Object.prototype.hasOwnProperty.call(AXIS_VEC, axis) || !Number.isFinite(turns) || !Number.isFinite(s)) return null;
    return pose_action(id, LA.matMul(LA.axisAngle(AXIS_VEC[axis], turns * (Math.PI / 2) * s), p.R), p.t.slice());
  }

  /** Traslación: t(s) = t0 + s·delta, con R sin cambios. */
  function translation_action(scene, id, delta, s) {
    const p = find(scene, id);
    if (!p || !Array.isArray(delta) || delta.length !== 3 || !LA.allFinite(delta) || !Number.isFinite(s)) return null;
    return pose_action(id, LA.clone(p.R), [p.t[0] + s * delta[0], p.t[1] + s * delta[1], p.t[2] + s * delta[2]]);
  }

  function apply_actions(scene, actions) {
    let sc = scene;
    for (const a of Array.isArray(actions) ? actions : []) if (a) sc = Scene.apply_action(sc, a);
    return sc;
  }

  const Motion = { AXIS_VEC, pose_action, interpolate_rotation, rotation_action, translation_action, apply_actions };
  root.Motion = Motion;
  if (typeof module !== 'undefined' && module.exports) module.exports = Motion;
})(typeof globalThis !== 'undefined' ? globalThis : this);
