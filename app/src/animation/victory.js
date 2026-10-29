/*
 * victory.js — MÓDULO APLICACIÓN (rol C) · animación de victoria "ensamblado en torre".
 *
 * Función PURA del tiempo: actions(scene, t) devuelve una acción `set_pose` por pieza (poses 3D rígidas) que la
 * aplicación aplica con scene.apply_action; después todo pasa por get_geometry -> build_camera -> project como
 * la escena principal. No se animan coordenadas de pantalla. Los controles de cámara no intervienen.
 *
 * Guion (8 s, 7 piezas escalonadas 0.1 s):
 *   0.0 – 2.5   VUELO       cada pieza sale de su posición en ESPIRAL alrededor del eje del contenedor, con un arco
 *                           vertical, mientras su orientación se interpola (geodésica) hasta la identidad, y se
 *                           ensambla en una TORRE centrada (capas apiladas sobre el piso)
 *   2.5 – 3.0   pausa       torre ensamblada
 *   3.0 – 5.0   GIRO        cada capa gira 360° alrededor del eje vertical del contenedor, alternando sentido
 *   5.0 – 5.5   pausa
 *   5.5 – 8.0   REGRESO     el vuelo al revés (la última pieza en entrar es la primera en salir) hasta la pose original
 * Empieza y termina EXACTAMENTE en las poses originales: fuera de (0, DURATION) devuelve [] (escena intacta).
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');
  const Scene = root.Scene || require('../scene/scene.js');
  const Easing = root.Easing || require('./easing.js');
  const Motion = root.Motion || require('./motion.js');

  const TWO_PI = 2 * Math.PI;
  const DURATION = 8.0;
  const SCHEDULE = { fly_in: [0, 2.5], hold1: [2.5, 3.0], spin: [3.0, 5.0], hold2: [5.0, 5.5], fly_out: [5.5, 8.0] };
  const FLY = 1.8;          // duración del vuelo de cada pieza (s)
  const STAGGER = 0.1;      // retardo entre piezas consecutivas (s); se satura en MAX_STAGGER piezas
  const MAX_STAGGER = 7;
  const ARC = 2.2;          // altura máxima del arco de vuelo (unidades)
  const GAP = 0.1;          // separación vertical entre capas de la torre

  /** Poses de la torre: piezas apiladas por capas, orientación original del catálogo (R = I), centradas en el eje. */
  function tower_layout(scene) {
    const cx = scene.container.size[0] / 2, cy = scene.container.size[1] / 2;
    let z = 0;
    return scene.pieces.map((piece) => {
      const [w, h, d] = Scene.PIECE_DEFS[piece.type].size;
      const t = [cx - w / 2, cy - h / 2, z];
      z += d + GAP;
      return { R: LA.identity(3), t };
    });
  }

  /**
   * Pose de la pieza a lo largo del vuelo original -> torre, e ∈ [0,1]: orientación geodésica; posición del pivote
   * en coordenadas cilíndricas alrededor del eje del contenedor (radio lineal, ángulo = diferencia + 1 vuelta
   * completa), altura lineal + arco ARC·sin(πe).
   */
  function fly(piece, target, e, i, n, c) {
    const pivot = Scene.PIECE_DEFS[piece.type].pivot;
    const R = Motion.interpolate_rotation(piece.R, target.R, e);
    const p0 = Scene.pivot_world(piece);
    const p1 = [pivot[0] + target.t[0], pivot[1] + target.t[1], pivot[2] + target.t[2]];
    const v0 = [p0[0] - c[0], p0[1] - c[1]], v1 = [p1[0] - c[0], p1[1] - c[1]];
    const r0 = Math.hypot(v0[0], v0[1]), r1 = Math.hypot(v1[0], v1[1]);
    const a0 = r0 > 1e-9 ? Math.atan2(v0[1], v0[0]) : TWO_PI * i / n;
    const a1 = r1 > 1e-9 ? Math.atan2(v1[1], v1[0]) : a0;
    let da = a1 - a0;
    da -= TWO_PI * Math.round(da / TWO_PI);                       // diferencia en (−π, π]
    const ang = a0 + (da + TWO_PI) * e;
    const r = r0 + (r1 - r0) * e;
    const z = p0[2] + (p1[2] - p0[2]) * e + ARC * (1 + 0.2 * (i % 3)) * Math.sin(Math.PI * e);
    const pw = [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang), z];
    return { R, t: [pw[0] - pivot[0], pw[1] - pivot[1], pw[2] - pivot[2]] };
  }

  /** Giro de una capa de la torre alrededor del eje vertical del contenedor (ángulo alpha). */
  function spin(piece, target, alpha, c) {
    const pivot = Scene.PIECE_DEFS[piece.type].pivot;
    const Rz = LA.rotZ(alpha);
    const p1 = [pivot[0] + target.t[0], pivot[1] + target.t[1], pivot[2] + target.t[2]];
    const q = LA.mulVec(Rz, [p1[0] - c[0], p1[1] - c[1], 0]);
    return { R: LA.matMul(Rz, target.R), t: [c[0] + q[0] - pivot[0], c[1] + q[1] - pivot[1], p1[2] - pivot[2]] };
  }

  /** Fase en curso y texto para el pie de pantalla. */
  function phase_at(t) {
    if (t < SCHEDULE.fly_in[1]) return { name: 'fly_in', caption: 'Las piezas vuelan en espiral y se ensamblan en una torre' };
    if (t < SCHEDULE.spin[0]) return { name: 'hold', caption: 'Torre ensamblada' };
    if (t < SCHEDULE.spin[1]) return { name: 'spin', caption: 'Cada capa gira 360° alrededor del contenedor' };
    if (t < SCHEDULE.fly_out[0]) return { name: 'hold', caption: 'Torre ensamblada' };
    return { name: 'fly_out', caption: 'Las piezas regresan a su posición original' };
  }

  /** Acciones set_pose de la victoria en el instante t (s). [] fuera de (0, DURATION) o con escena inválida. */
  function actions(scene, t) {
    if (!scene || !Array.isArray(scene.pieces) || !scene.container || !(t > 0 && t < DURATION)) return [];
    const n = scene.pieces.length;
    const layout = tower_layout(scene);
    const c = [scene.container.size[0] / 2, scene.container.size[1] / 2, 0];
    const delay = (i) => STAGGER * Math.min(i, MAX_STAGGER);
    return scene.pieces.map((piece, i) => {
      let pose;
      if (t < SCHEDULE.fly_in[1]) {
        pose = fly(piece, layout[i], Easing.in_out_cubic((t - delay(i)) / FLY), i, n, c);
      } else if (t < SCHEDULE.spin[0] || (t >= SCHEDULE.spin[1] && t < SCHEDULE.fly_out[0])) {
        pose = spin(piece, layout[i], 0, c);
      } else if (t < SCHEDULE.spin[1]) {
        const alpha = (i % 2 ? 1 : -1) * TWO_PI * Easing.in_out_cubic((t - SCHEDULE.spin[0]) / (SCHEDULE.spin[1] - SCHEDULE.spin[0]));
        pose = spin(piece, layout[i], alpha, c);
      } else {
        const e = Easing.in_out_cubic((t - SCHEDULE.fly_out[0] - delay(n - 1 - i)) / FLY);
        pose = fly(piece, layout[i], 1 - e, i, n, c);
      }
      return Motion.pose_action(piece.id, pose.R, pose.t);
    });
  }

  const Victory = { DURATION, SCHEDULE, FLY, STAGGER, ARC, GAP, tower_layout, phase_at, actions };
  root.Victory = Victory;
  if (typeof module !== 'undefined' && module.exports) module.exports = Victory;
})(typeof globalThis !== 'undefined' ? globalThis : this);
