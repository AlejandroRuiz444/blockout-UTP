/*
 * main.js — PROTOTIPO del Hito 2 (primera integración): un contenedor 3D y una pieza, proyectados con la matriz de
 * cámara y dibujados en pantalla. La cámara orbita sola despacio para que se vea que cambian K, R, t pero no el mundo.
 * Se reemplaza por el main.js definitivo (controlador, entrada, HUD) en la etapa de integración final.
 */
(function () {
  'use strict';
  const canvas = document.getElementById('view'), ctx = canvas.getContext('2d');
  const scene = Scene.create_scene({ pieces: [{ type: 'L3', t: [1, 1, 0] }] });   // MUNDO: contenedor 5×5×12 y una pieza
  let params = Camera.default_params();

  function frame() {
    const r = canvas.getBoundingClientRect();
    const viewport = { width: Math.max(100, Math.floor(r.width)), height: Math.max(100, Math.floor(r.height)) };
    canvas.width = viewport.width; canvas.height = viewport.height;

    params = Camera.adjust(params, { d_azimuth: 0.004 });                                       // solo cambia la cámara
    const geometry = Scene.get_geometry(scene);                                                 // vértices en el mundo
    const camera = Camera.build_camera(Object.assign({}, params, { viewport }));                // K, R, t, P
    const prims = Projection.project(geometry, camera, viewport);                               // recorte + perspectiva
    Render.draw_scene(ctx, prims, viewport.width, viewport.height);                             // líneas 2D en el canvas
    window.requestAnimationFrame(frame);
  }
  window.requestAnimationFrame(frame);
})();
