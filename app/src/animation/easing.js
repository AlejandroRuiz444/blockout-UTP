/*
 * easing.js — MÓDULO APLICACIÓN (rol C) · curvas de suavizado. Funciones puras x ∈ [0,1] -> [0,1].
 * Un valor fuera de [0,1] (o NaN) se recorta; NaN se trata como 0.
 */
(function (root) {
  'use strict';

  const clamp01 = (x) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
  const lerp = (a, b, s) => a + (b - a) * s;

  /** 3x² − 2x³: arranque y llegada suaves. */
  function smoothstep(x) { const s = clamp01(x); return s * s * (3 - 2 * s); }
  /** Cúbica de entrada y salida: más pausada en los extremos que smoothstep. */
  function in_out_cubic(x) { const s = clamp01(x); return s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2; }
  /** Cúbica de salida: arranca rápido y frena (respuesta inmediata a una tecla). */
  function out_cubic(x) { const s = clamp01(x); return 1 - Math.pow(1 - s, 3); }

  const Easing = { clamp01, lerp, smoothstep, in_out_cubic, out_cubic };
  root.Easing = Easing;
  if (typeof module !== 'undefined' && module.exports) module.exports = Easing;
})(typeof globalThis !== 'undefined' ? globalThis : this);
