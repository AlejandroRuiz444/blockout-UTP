/*
 * input.js — MÓDULO APLICACIÓN (rol C), entrada -> acciones.
 *
 * map_key(code, shiftKey) es PURA: traduce una tecla física (KeyboardEvent.code, independiente del idioma del
 * teclado) a un comando. attach() solo conecta los eventos del DOM con esa función.
 *
 * Comandos (JSON-friendly):
 *   { type:'piece', action }        acción para scene.apply_action (sin id: actúa sobre la pieza activa)
 *   { type:'camera', delta }        delta para camera.adjust ({d_azimuth, d_elevation, distance_factor, d_fov})
 *   { type:'camera_reset' }
 *   { type:'app', op }              op: 'victory' | 'demo' | 'homography' | 'stop'
 */
(function (root) {
  'use strict';

  const STEP_ANGLE = 0.1;      // rad por pulsación (≈ 5.7°)
  const STEP_FOV = 0.05;       // rad por pulsación (≈ 2.9°)
  const ZOOM = 1.1;            // factor de distancia por pulsación
  const MOUSE_ANGLE = 0.008;   // rad por píxel arrastrado

  const tr = (d) => ({ type: 'piece', action: { type: 'translate', delta: d } });
  const rot = (axis, turns) => ({ type: 'piece', action: { type: 'rotate', axis, turns } });
  const cam = (delta) => ({ type: 'camera', delta });

  const KEYS = {
    ArrowLeft: tr([-1, 0, 0]), ArrowRight: tr([1, 0, 0]), ArrowUp: tr([0, 1, 0]), ArrowDown: tr([0, -1, 0]),
    PageUp: tr([0, 0, 1]), PageDown: tr([0, 0, -1]),
    KeyQ: rot('x', 1), KeyA: rot('x', -1), KeyW: rot('y', 1), KeyS: rot('y', -1), KeyE: rot('z', 1), KeyD: rot('z', -1),
    Tab: { type: 'piece', action: { type: 'select_next' } },
    KeyJ: cam({ d_azimuth: -STEP_ANGLE }), KeyL: cam({ d_azimuth: STEP_ANGLE }),
    KeyI: cam({ d_elevation: STEP_ANGLE }), KeyK: cam({ d_elevation: -STEP_ANGLE }),
    Minus: cam({ distance_factor: ZOOM }), NumpadSubtract: cam({ distance_factor: ZOOM }),
    Equal: cam({ distance_factor: 1 / ZOOM }), NumpadAdd: cam({ distance_factor: 1 / ZOOM }),
    BracketLeft: cam({ d_fov: -STEP_FOV }), BracketRight: cam({ d_fov: STEP_FOV }),
    KeyR: { type: 'camera_reset' },
    KeyV: { type: 'app', op: 'victory' }, KeyM: { type: 'app', op: 'demo' }, KeyH: { type: 'app', op: 'homography' },
    Escape: { type: 'app', op: 'stop' },
  };

  /** Tecla -> comando (o null si no está asignada). Shift+Tab: pieza anterior; Shift+↑/↓: Z ±1; 1–9: elegir pieza. */
  function map_key(code, shiftKey) {
    if (typeof code !== 'string') return null;
    const digit = /^Digit([1-9])$/.exec(code);
    if (digit) return { type: 'piece', action: { type: 'select', index: Number(digit[1]) - 1 } };
    if (shiftKey && code === 'Tab') return { type: 'piece', action: { type: 'select_prev' } };
    if (shiftKey && code === 'ArrowUp') return tr([0, 0, 1]);
    if (shiftKey && code === 'ArrowDown') return tr([0, 0, -1]);
    return Object.prototype.hasOwnProperty.call(KEYS, code) ? KEYS[code] : null;
  }

  /**
   * Conecta teclado (en `target`, normalmente window) y ratón/rueda (en `canvas`) y llama a onCommand(cmd).
   * Arrastrar con el ratón = órbita; rueda = distancia. Devuelve una función que desconecta todo.
   */
  function attach(target, canvas, onCommand) {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
      const cmd = map_key(e.code, e.shiftKey);
      if (!cmd) return;
      e.preventDefault();
      onCommand(cmd);
    };
    let drag = null;
    const onDown = (e) => { drag = { x: e.clientX, y: e.clientY }; if (canvas.setPointerCapture && e.pointerId !== undefined) { try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignorar */ } } };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      onCommand(cam({ d_azimuth: -dx * MOUSE_ANGLE, d_elevation: dy * MOUSE_ANGLE }));
    };
    const onUp = () => { drag = null; };
    const onWheel = (e) => { e.preventDefault(); onCommand(cam({ distance_factor: Math.exp(e.deltaY * 0.001) })); };
    target.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return function detach() {
      target.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  const Input = { map_key, attach, KEYS };
  root.Input = Input;
  if (typeof module !== 'undefined' && module.exports) module.exports = Input;
})(typeof globalThis !== 'undefined' ? globalThis : this);
