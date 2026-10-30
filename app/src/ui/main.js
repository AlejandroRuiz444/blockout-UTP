/*
 * main.js — MÓDULO APLICACIÓN (rol C) · arranque: conecta el DOM con el controlador.
 *
 * Solo hace cableado; la lógica vive en otros archivos:
 *   Input (teclado/ratón -> comandos) -> Controller (estado, animaciones) -> Scene.get_geometry (MUNDO)
 *   -> Camera.build_camera (K, R, t, P) -> Projection.project (recorte + perspectiva) -> Render (canvas) + Hud (texto)
 * Nota: ctx.setTransform se usa SOLO para escalar por devicePixelRatio; la geometría 3D no pasa por ninguna
 * transformación del navegador.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const canvas = $("view"),
    ctx = canvas.getContext("2d");

  const ctrl = Controller.create();
  const hud = Hud.mount(document, (index) =>
    send({ type: "piece", action: { type: "select", index } }),
  );
  const panel = HomographyPanel.create(document, {
    get_camera_params: () => ctrl.state.cam,
  });
  let viewport = { width: 960, height: 640 };

  /** Un comando de teclado/ratón/botón: el panel de homografía tiene prioridad y bloquea lo demás cuando está abierto. */
  function send(cmd) {
    const now = performance.now();
    if (cmd.type === "app" && cmd.op === "homography") {
      panel.toggle();
      if (!panel.is_open()) canvas.focus();
      return;
    }
    if (cmd.type === "app" && cmd.op === "stop" && panel.is_open()) {
      panel.close();
      canvas.focus();
      return;
    }
    if (panel.is_open()) return;
    ctrl.dispatch(cmd, now);
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(100, Math.floor(r.width)),
      h = Math.max(100, Math.floor(r.height));
    if (
      canvas.width !== Math.floor(w * dpr) ||
      canvas.height !== Math.floor(h * dpr)
    ) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // solo densidad de píxeles
    viewport = { width: w, height: h };
  }

  function frame(now) {
    try {
      resize();
      const view = ctrl.tick(now);
      const geometry = Scene.get_geometry(view.scene); // MUNDO
      const camera = Camera.build_camera(
        Object.assign({}, view.camera_params, { viewport }),
      ); // K, R, t, P
      const prims = Projection.project(geometry, camera, viewport); // 2D
      Render.draw_scene(ctx, prims, viewport.width, viewport.height);
      hud.render(view, camera, prims);
    } catch (e) {
      // la interfaz debe sobrevivir a cualquier error inesperado
      hud.set_status_error("Error interno: " + e.message);
    }
    window.requestAnimationFrame(frame);
  }

  hud.build_piece_buttons(ctrl.state.scene);
  Input.attach(window, canvas, send);
  const on = (id, cmd) =>
    $(id).addEventListener("click", () => {
      send(cmd);
      if (!panel.is_open()) canvas.focus();
    });
  on("btn-victory", { type: "app", op: "victory" });
  on("btn-demo", { type: "app", op: "demo" });
  on("btn-homography", { type: "app", op: "homography" });
  on("btn-reset", { type: "camera_reset" });
  ctrl.state.note =
    "Listo. Pieza activa: " +
    ctrl.state.scene.active +
    ". Pulsa M para la demostración.";
  window.requestAnimationFrame(frame);
  canvas.focus();
})();
