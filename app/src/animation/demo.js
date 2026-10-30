/*
 * demo.js — MÓDULO APLICACIÓN (rol C), modo demostración.
 *
 * Guion DETERMINISTA con línea de tiempo (sin aleatoriedad): el estado en el instante t es una función pura
 * de (t, escena inicial, cámara inicial). Reproducir dos veces da exactamente lo mismo.
 *
 *   0 –  3 s   1/4 Escena principal
 *   3 – 15.8 s 2/4 Transformaciones de piezas (seleccionar, trasladar y rotar con poses 3D rígidas)
 *  15.8 – 28 s 3/4 Cámara móvil (órbita, distancia, focal y vuelta a la vista inicial)
 *  28 – 36 s   4/4 Animación de victoria (Victory.DURATION = 8 s)
 *
 * Los pasos de pieza se confirman con las acciones reales del módulo escena (translate/rotate: pasos exactos
 * sobre la retícula) y mientras transcurren se muestran con poses intermedias (set_pose, matrices de rotación
 * reales). La cámara del guion se expresa como DELTAS respecto de la cámara inicial, de modo que los controles
 * de cámara del usuario siguen activos durante la demo.
 */
(function (root) {
  'use strict';
  const Scene = root.Scene || require('../scene/scene.js');
  const Camera = root.Camera || require('../projection/camera.js');
  const Easing = root.Easing || require('./easing.js');
  const Motion = root.Motion || require('./motion.js');
  const Victory = root.Victory || require('./victory.js');

  const VICTORY_START = 28;
  const DURATION = VICTORY_START + Victory.DURATION;   // 36 s

  const SECTIONS = [
    { t0: 0, t1: 3, label: '1/4 · Escena principal' },
    { t0: 3, t1: 15.8, label: '2/4 · Transformaciones de piezas' },
    { t0: 15.8, t1: 28, label: '3/4 · Cámara móvil' },
    { t0: VICTORY_START, t1: DURATION, label: '4/4 · Animación de victoria' },
  ];

  // Pasos de pieza en orden. Los 'select' son instantáneos (t1 = t0).
  const PIECE_STEPS = [
    { t0: 3.0, t1: 3.0, kind: 'select', id: 'p1', caption: 'Seleccionar la pieza L (p1)' },
    { t0: 3.2, t1: 4.4, kind: 'translate', id: 'p1', delta: [1, 1, 0], caption: 'Trasladar L +1 en X y +1 en Y' },
    { t0: 4.7, t1: 5.9, kind: 'translate', id: 'p1', delta: [0, 0, 2], caption: 'Trasladar L +2 en Z' },
    { t0: 6.2, t1: 6.2, kind: 'select', id: 'p5', caption: 'Seleccionar el tornillo 3D (p5)' },
    { t0: 6.4, t1: 7.6, kind: 'rotate', id: 'p5', axis: 'x', turns: 1, caption: 'Rotar el tornillo 90° alrededor de X' },
    { t0: 7.9, t1: 9.1, kind: 'rotate', id: 'p5', axis: 'z', turns: 1, caption: 'Rotar el tornillo 90° alrededor de Z' },
    { t0: 9.4, t1: 9.4, kind: 'select', id: 'p6', caption: 'Seleccionar la esquina 3D (p6)' },
    { t0: 9.6, t1: 10.8, kind: 'rotate', id: 'p6', axis: 'y', turns: 1, caption: 'Rotar la esquina 90° alrededor de Y' },
    { t0: 11.1, t1: 12.3, kind: 'translate', id: 'p6', delta: [2, 2, 0], caption: 'Trasladar la esquina +2 en X y Y' },
    { t0: 12.6, t1: 12.6, kind: 'select', id: 'p7', caption: 'Seleccionar el tricubo recto (p7)' },
    { t0: 12.8, t1: 14.0, kind: 'rotate', id: 'p7', axis: 'z', turns: 1, caption: 'Rotar el tricubo 90° alrededor de Z' },
    { t0: 14.3, t1: 15.5, kind: 'rotate', id: 'p7', axis: 'y', turns: 1, caption: 'Rotar el tricubo 90° alrededor de Y' },
  ];

  /** Acción real (exacta sobre la retícula) con la que se confirma un paso. */
  function commit_action(st) {
    if (st.kind === 'select') return { type: 'select', id: st.id };
    if (st.kind === 'translate') return { type: 'translate', id: st.id, delta: st.delta };
    return { type: 'rotate', id: st.id, axis: st.axis, turns: st.turns };
  }

    const seg = (t, a, b) => Easing.smoothstep((t - a) / (b - a));

  /** Deltas de cámara del guion en el instante t (todos 0 fuera de su tramo, salvo la deriva final). */
  function camera_deltas(t) {
    const sweep = seg(t, 15.8, 21.8);
    const zoom = seg(t, 21.8, 24.8);
    const fov = seg(t, 24.8, 27.8);
    const drift = seg(t, VICTORY_START, DURATION);
    const inSweep = t >= 15.8 && t < 21.8;
    return {
      d_azimuth: (inSweep ? 2 * Math.PI * sweep : 0) + 0.7 * drift,
      d_elevation: (inSweep ? 0.5 * Math.sin(Math.PI * sweep) : 0) + 0.1 * Math.sin(Math.PI * drift),
      distance_factor: t >= 21.8 && t < 24.8 ? 1 - 0.45 * Math.sin(Math.PI * zoom) : 1,
      d_fov: t >= 24.8 && t < 27.8 ? 0.5 * Math.sin(Math.PI * fov) : 0,
    };
  }

  /** Parámetros de cámara del guion = cámara inicial + deltas, recortados a los límites válidos. */
  function camera_params_at(t, cam0) {
    const base = Camera.sanitize(cam0).params;
    const d = camera_deltas(t);
    return Camera.sanitize(Object.assign({}, base, {
      azimuth: base.azimuth + d.d_azimuth,
      elevation: base.elevation + d.d_elevation,
      distance: base.distance * d.distance_factor,
      fov_y: base.fov_y + d.d_fov,
    })).params;
  }

  /**
   * state_at(t, scene0, cam0) -> { scene, camera_params, section, label, caption, victory_t, done }
   *   scene0: escena inicial (la demo siempre parte de ella); cam0: parámetros de cámara iniciales.
   *   t fuera de [0, DURATION] se recorta; t no finito se trata como 0.
   */
  function state_at(t, scene0, cam0) {
    t = Number.isFinite(t) ? Math.min(DURATION, Math.max(0, t)) : 0;
    let scene = scene0, caption = '';
    for (const st of PIECE_STEPS) {
      if (t >= st.t1) {
        scene = Scene.apply_action(scene, commit_action(st));
      } else {
        if (t >= st.t0) {
          const s = Easing.out_cubic((t - st.t0) / (st.t1 - st.t0));
          const a = st.kind === 'rotate' ? Motion.rotation_action(scene, st.id, st.axis, st.turns, s) : Motion.translation_action(scene, st.id, st.delta, s);
          scene = Motion.apply_actions(scene, [a]);
        }
        break;
      }
    }
    for (const st of PIECE_STEPS) if (t >= st.t0 && t < st.t1 + 0.6) caption = st.caption;
    const victory_t = t >= VICTORY_START ? t - VICTORY_START : 0;
    if (victory_t > 0) scene = Motion.apply_actions(scene, Victory.actions(scene, victory_t));
    const sec = SECTIONS.find((q) => t >= q.t0 && t < q.t1) || SECTIONS[SECTIONS.length - 1];
    if (t >= VICTORY_START) caption = Victory.phase_at(victory_t).caption + ' (poses 3D)';
    if (t >= 15.8 && t < 21.8) caption = 'Órbita: acimut 360° y elevación';
    else if (t >= 21.8 && t < 24.8) caption = 'Distancia: acercar y alejar';
    else if (t >= 24.8 && t < 28) caption = 'Distancia focal / FOV: cambia K, no el mundo';
    return { scene, camera_params: camera_params_at(t, cam0), section: sec.label, label: sec.label, caption, victory_t, done: t >= DURATION };
  }

  const Demo = { DURATION, VICTORY_START, SECTIONS, PIECE_STEPS, commit_action, camera_deltas, camera_params_at, state_at };
  root.Demo = Demo;
  if (typeof module !== 'undefined' && module.exports) module.exports = Demo;
})(typeof globalThis !== 'undefined' ? globalThis : this);
