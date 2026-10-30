/*
 * controller.js — MÓDULO APLICACIÓN (rol C) · controlador de la aplicación (máquina de estados SIN DOM).
 *
 * Es el único dueño del estado de la aplicación: escena lógica, parámetros de cámara, modo
 * ('normal' | 'victory' | 'demo') y movimiento en curso. No toca el DOM ni el canvas, por eso se puede probar en Node.
 *
 *   const ctrl = Controller.create({ scene?, camera? });
 *   ctrl.dispatch(command, now_ms)   comando de Input.map_key (pieza / cámara / app)
 *   ctrl.tick(now_ms)                -> View  = { scene, camera_params, caption, mode, note, last }
 *
 * La `scene` de la View es la escena de VISUALIZACIÓN (con poses intermedias de animación); el estado lógico
 * (el que modifica el usuario) solo cambia por Scene.apply_action. Reglas:
 *   - Durante la victoria o la demo no se mueven piezas (la cámara sí). La demo arranca siempre desde la escena y la
 *     cámara iniciales y, al terminar o detenerse, restaura la escena y la cámara previas.
 *   - Un giro o traslación del usuario se muestra animado (ROTATE_MS / MOVE_MS) y se confirma con la acción exacta.
 *   - Una acción rechazada deja un aviso (toast) de TOAST_MS.
 */
(function (root) {
  'use strict';
  const Scene = root.Scene || require('../scene/scene.js');
  const Camera = root.Camera || require('../projection/camera.js');
  const Easing = root.Easing || require('../animation/easing.js');
  const Motion = root.Motion || require('../animation/motion.js');
  const Victory = root.Victory || require('../animation/victory.js');
  const Demo = root.Demo || require('../animation/demo.js');

  const ROTATE_MS = 240, MOVE_MS = 140, TOAST_MS = 2500;

  function create(opts) {
    const o = opts || {};
    const st = {
      scene: o.scene || Scene.create_scene(),
      cam: o.camera || Camera.default_params(),
      mode: 'normal',
      victory: null, demo: null, saved: null, motion: null, toast: null, note: null,
    };

    function finish_motion() {
      if (st.motion) { st.scene = st.motion.result; st.motion = null; }
    }

    function stop_animation(note) {
      if (st.mode === 'demo' && st.saved) {
        st.scene = st.saved.scene; st.cam = st.saved.cam; st.saved = null;
        note = note || 'Demo detenida: se restauró la escena y la cámara previas.';
      }
      st.demo = null; st.victory = null; st.mode = 'normal';
      if (note) st.note = note;
    }

    function start_demo(now) {
      if (st.mode === 'demo') { stop_animation(); return; }
      finish_motion();
      st.saved = { scene: st.scene, cam: st.cam };
      st.cam = Camera.default_params();                     // la demo siempre parte de la vista inicial
      st.demo = { t0: now, scene0: Scene.create_scene() };  // ... y de la escena inicial
      st.victory = null; st.mode = 'demo';
      st.note = 'Demo en curso (' + Demo.DURATION + ' s). Puedes mover la cámara; Esc la detiene.';
    }

    function start_victory(now) {
      if (st.mode === 'demo') { st.note = 'La demo ya incluye la victoria; detén la demo con Esc para lanzarla por separado.'; return; }
      finish_motion();
      st.victory = { t0: now }; st.mode = 'victory';
      st.note = 'Animación de victoria (' + Victory.DURATION + ' s): modifica poses 3D de las piezas. Los controles de cámara siguen activos.';
    }

    function dispatch(cmd, now) {
      if (!cmd || typeof cmd !== 'object') return;
      if (cmd.type === 'app') {
        if (cmd.op === 'stop') stop_animation();
        else if (cmd.op === 'demo') start_demo(now);
        else if (cmd.op === 'victory') start_victory(now);
      } else if (cmd.type === 'camera') {
        st.cam = Camera.adjust(st.cam, cmd.delta);
      } else if (cmd.type === 'camera_reset') {
        st.cam = Camera.default_params(); st.note = 'Cámara restablecida a la vista inicial.';
      } else if (cmd.type === 'piece') {
        if (st.mode !== 'normal') { st.note = 'Las piezas no se pueden mover durante una animación (Esc la detiene).'; return; }
        finish_motion();
        const a = cmd.action;
        const next = Scene.apply_action(st.scene, a);
        if (!next.last.ok) { st.toast = { text: '⚠ ' + next.last.error, until: now + TOAST_MS }; st.scene = next; st.note = null; return; }
        if (a.type === 'rotate' || a.type === 'translate') {
          st.motion = { action: a, id: a.id || st.scene.active, t0: now, dur: a.type === 'rotate' ? ROTATE_MS : MOVE_MS, from: st.scene, result: next };
        } else {
          st.scene = next;
        }
        st.note = null;
      }
    }

    function tick(now) {
      let scene = st.scene, params = st.cam, caption = '';
      if (st.mode === 'demo') {
        const s = Demo.state_at((now - st.demo.t0) / 1000, st.demo.scene0, st.cam);
        scene = s.scene; params = s.camera_params; caption = s.label + (s.caption ? ' — ' + s.caption : '');
        if (s.done) stop_animation('Demo terminada. Se restauró la escena y la cámara previas.');
      } else if (st.mode === 'victory') {
        const t = (now - st.victory.t0) / 1000;
        if (t >= Victory.DURATION) stop_animation('Animación de victoria terminada: las piezas volvieron a su pose original.');
        else {
          scene = Motion.apply_actions(st.scene, Victory.actions(st.scene, t));
          caption = Victory.phase_at(t).caption + ' — ' + t.toFixed(1) + ' s / ' + Victory.DURATION + ' s';
        }
      } else if (st.motion) {
        const m = st.motion, p = (now - m.t0) / m.dur;
        if (p >= 1) { finish_motion(); scene = st.scene; }
        else {
          const s = Easing.out_cubic(p), a = m.action;
          const act = a.type === 'rotate' ? Motion.rotation_action(m.from, m.id, a.axis, a.turns, s) : Motion.translation_action(m.from, m.id, a.delta, s);
          scene = Motion.apply_actions(m.from, [act]);
        }
      }
      if (!caption && st.toast && now < st.toast.until) caption = st.toast.text;
      const logical = st.motion ? st.motion.result : st.scene;
      return { scene, camera_params: params, caption, mode: st.mode, note: st.note, last: logical.last || {} };
    }

    return { state: st, dispatch, tick, ROTATE_MS, MOVE_MS, TOAST_MS };
  }

  const Controller = { create, ROTATE_MS, MOVE_MS, TOAST_MS };
  root.Controller = Controller;
  if (typeof module !== 'undefined' && module.exports) module.exports = Controller;
})(typeof globalThis !== 'undefined' ? globalThis : this);
