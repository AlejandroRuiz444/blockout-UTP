/*
 * homography_panel.js — MÓDULO APLICACIÓN (rol C) · panel del experimento de homografía (plano Z = 0).
 *
 * Dibuja las dos vistas del experimento y las tablas que calcula el módulo de proyección (Homography.run_experiment):
 * puntos reales (verde), predichos por H21 (cruces / ×), predicción del DLT con ruido σ (rombos) y el error de
 * paralaje fuera del plano (segmentos rojos). No calcula nada geométrico: solo presenta resultados.
 *
 *   const panel = HomographyPanel.create(document, { get_camera_params })   // get_camera_params(): cámara principal actual
 *   panel.open() / panel.close() / panel.toggle() / panel.is_open()
 */
(function (root) {
  'use strict';
  const Scene = root.Scene || require('../scene/scene.js');
  const Projection = root.Projection || require('../projection/projection.js');
  const Homography = root.Homography || require('../projection/homography.js');
  const Render = root.Render || require('./render.js');

  const DEG = 180 / Math.PI;
  const f = (x, d) => (Number.isFinite(x) ? x.toFixed(d === undefined ? 3 : d) : '—');

  function create(doc, opts) {
    const $ = (id) => doc.getElementById(id);
    const cache = new Map();
    const set = (el, str) => { if (cache.get(el) !== str) { el.textContent = str; cache.set(el, str); } };
    const hp = { mode: 'preset', base: null, report: null };
    // contenedor bajo (5×5×3): solo para ver el piso y los puntos con Z ≤ 3; el plano resaltado es el piso Z = 0
    const containerGeom = Scene.get_geometry(Scene.create_scene({ size: [5, 5, 3], pieces: [] }));
    const floorObj = { id: 'floor', role: 'container', vertices: [[0, 0, 0], [5, 0, 0], [5, 5, 0], [0, 5, 0]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] };

    function compute() {
      if (!hp.base) hp.base = Homography.run_experiment();
      if (hp.mode === 'live') {
        const p = opts.get_camera_params();
        hp.report = Homography.run_experiment({ view2: { azimuth: p.azimuth, elevation: p.elevation, distance: p.distance, target: p.target, fov_y: p.fov_y } });
      } else hp.report = hp.base;
    }

    function draw_view(canvasEl, cam, vp, draw_points) {
      const c = canvasEl.getContext('2d');
      c.setTransform(1, 0, 0, 1, 0, 0);
      Render.clear(c, vp.width, vp.height);
      Render.draw_primitives(c, Projection.project(containerGeom, cam, vp), { depth_cue: false });
      for (const l of Projection.project({ objects: [floorObj] }, cam, vp).lines) Render.line(c, l.x1, l.y1, l.x2, l.y2, '#58a6ff', 3, 1);
      draw_points(c);
    }

    function draw() {
      const r = hp.report;
      const sum = $('h-summary');
      if (!r || r.error) { set(sum, 'Experimento no disponible: ' + (r && r.error) + '. Prueba con otra cámara.'); return; }
      const vp = r.config.viewport;
      const sigma = Number($('h-sigma').value);
      $('h-sigma-out').textContent = sigma.toFixed(1) + ' px';
      const rot = hp.mode === 'rotation' && r.pure_rotation && r.pure_rotation.ok ? r.pure_rotation : null;
      const cam2 = rot ? rot.cam2 : r.cam2;
      const levels = rot ? rot.levels : r.off_plane.levels;
      const detail = levels.find((q) => q.Z === r.off_plane.detail_z) || levels[0];
      const noisy = Homography.noisy_fit(r.plane.points, sigma, r.config.example_seed);
      const plane = r.plane.points;
      const pt = (c, p, shape, color, size) => { if (p) Render.marker(c, p[0], p[1], shape, color, size); };

      draw_view($('h-c1'), r.cam1, vp, (c) => {
        plane.forEach((p) => pt(c, p.x1, p.used_for_dlt ? 'dot' : 'ring', '#58a6ff', 6));
        detail.points.forEach((p) => pt(c, p.x1, 'ring', '#d2a8ff', 6));
        Render.text(c, 'puntos del plano Z=0 (azul) y puntos a Z=' + detail.Z + ' (lila)', 10, 18, '#c9d1d9', '13px system-ui');
      });
      draw_view($('h-c2'), cam2, vp, (c) => {
        plane.forEach((p, i) => {
          pt(c, p.x2_true, 'ring', '#3fb950', 8);
          pt(c, p.x2_H, 'cross', '#39d0d8', 6);
          const q = noisy && noisy.points[i].x2_noisy_dlt;
          if (q && sigma > 0) { Render.line(c, p.x2_true[0], p.x2_true[1], q[0], q[1], '#ffa657', 1.5, 1); pt(c, q, 'diamond', '#ffa657', 5); }
        });
        detail.points.forEach((p) => {
          pt(c, p.x2_true, 'ring', '#3fb950', 8);
          Render.line(c, p.x2_true[0], p.x2_true[1], p.x2_pred[0], p.x2_pred[1], '#f85149', 1.8, 1);
          pt(c, p.x2_pred, 'x', '#f85149', 6);
        });
        Render.text(c, 'vista 2: real (verde) vs predicho por H (cruces/×); error de paralaje en rojo', 10, 18, '#c9d1d9', '13px system-ui');
      });
      const az = (cam) => f(cam.params.azimuth * DEG, 0) + '°/' + f(cam.params.elevation * DEG, 0) + '°';
      set($('h-cap1'), 'Vista 1 (acimut/elevación ' + az(r.cam1) + ', ' + vp.width + '×' + vp.height + ' px)');
      set($('h-cap2'), rot ? 'Vista 2: MISMO centro de cámara, otra orientación y otra focal'
        : 'Vista 2 (acimut/elevación ' + az(cam2) + '); distancia entre centros de cámara = ' + f(r.baseline, 2));
      if (rot) {
        set(sum, 'Rotación pura (mismo centro; H = K2·R21·K1⁻¹): error a Z=' + detail.Z + ': RMS = ' + f(detail.rms, 9) + ' px. ' +
          'Con el mismo centro de cámara, la homografía vale para TODO punto 3D, no solo para los del plano.');
      } else {
        set(sum, 'Plano Z=0: RMS de H analítica = ' + f(r.plane.rms_H, 12) + ' px; RMS del DLT sin ruido = ' + f(r.plane.rms_dlt, 12) + ' px; ' +
          'DLT con σ=' + f(sigma, 1) + ' px: RMS = ' + (noisy ? f(noisy.rms, 3) : '—') + ' px. ' +
          'Fuera del plano (Z=' + detail.Z + '): RMS = ' + f(detail.rms, 2) + ' px (máx. ' + f(detail.max, 2) + ' px) → H21 NO sirve: ' +
          'predice la imagen del punto donde el rayo de la vista 1 corta el plano Z=0, no la del punto real (paralaje; solo desaparece si el centro de cámara no cambia).');
      }
      set($('h-report'), Homography.report_markdown(r));
    }

    const is_open = () => !$('hpanel').hidden;
    function open() { $('hpanel').hidden = false; compute(); draw(); }
    function close() { $('hpanel').hidden = true; }
    function toggle() { if (is_open()) close(); else open(); }

    $('h-close').addEventListener('click', close);
    $('h-mode').addEventListener('change', (e) => { hp.mode = e.target.value; compute(); draw(); });
    $('h-sigma').addEventListener('input', draw);

    return { open, close, toggle, is_open };
  }

  const HomographyPanel = { create };
  root.HomographyPanel = HomographyPanel;
  if (typeof module !== 'undefined' && module.exports) module.exports = HomographyPanel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
