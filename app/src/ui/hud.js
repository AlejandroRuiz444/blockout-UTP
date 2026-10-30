/*
 * hud.js — MÓDULO APLICACIÓN (rol C) · panel lateral: texto de pieza activa, cámara, matrices y estado.
 *
 * Dos partes:
 *   - Constructores de TEXTO puros (piece_text, camera_text, matrices_text, status_text): no tocan el DOM y se
 *     prueban en Node.
 *   - mount(doc, on_select): escribe ese texto en los elementos del DOM (solo cuando cambia).
 */
(function (root) {
  'use strict';
  const Scene = root.Scene || require('../scene/scene.js');
  const Render = root.Render || require('./render.js');

  const DEG = 180 / Math.PI;
  const f = (x, d) => (Number.isFinite(x) ? x.toFixed(d === undefined ? 3 : d) : '—');
  // los valores que se redondean a cero se muestran como 0 (nunca "-0.000")
  const rowTxt = (r, d) => r.map((v) => f(Math.abs(v) < 0.5 * Math.pow(10, -(d === undefined ? 3 : d)) ? 0 : v, d).padStart(8)).join(' ');
  const matrix_text = (A, d) => A.map((r) => '[' + rowTxt(r, d) + ' ]').join('\n');
  const MODE_LABEL = { normal: 'normal', victory: 'victoria', demo: 'demostración' };

  function active_piece(scene) { return scene.pieces.find((p) => p.id === scene.active) || null; }

  function piece_text(scene) {
    const act = active_piece(scene);
    if (!act) return 'Sin pieza activa';
    const def = Scene.PIECE_DEFS[act.type];
    const cells = Scene.piece_cells(act);
    return def.name + ' — ' + act.id + '\n' +
      'cubos: ' + def.cubes.length + (def.planar ? ' (plana)' : ' (no plana)') + '  ·  original allPolyCube[' + def.orig + ']\n' +
      'pivote local p = (' + def.pivot.join(', ') + ')\n' +
      'R (local→mundo, giro alrededor de p):\n' + matrix_text(act.R, 3) + '\n' +
      't = (' + act.t.map((v) => f(v, 3)).join(', ') + ')\n' +
      (cells ? 'celdas ocupadas: ' + cells.map((c) => '(' + c.join(',') + ')').join(' ') : 'pose continua (animación): no está sobre la retícula');
  }

  function camera_text(camera) {
    const p = camera.params, k = camera.intrinsics;
    return 'acimut = ' + f(p.azimuth * DEG, 1) + '°   elevación = ' + f(p.elevation * DEG, 1) + '°\n' +
      'distancia = ' + f(p.distance, 2) + '   FOV vertical = ' + f(p.fov_y * DEG, 1) + '°\n' +
      'fx = fy = ' + f(k.fx, 1) + ' px   (cx, cy) = (' + f(k.cx, 1) + ', ' + f(k.cy, 1) + ')\n' +
      'centro de cámara C = (' + camera.C.map((v) => f(v, 2)).join(', ') + ')\n' +
      'plano cercano z_c ≥ ' + camera.near;
  }

  function matrices_text(camera, piece) {
    const Rt = camera.R.map((r, i) => r.concat([camera.t[i]]));
    return 'λ·[u v 1]ᵀ = K · [R | t] · M · [X Y Z 1]ᵀ\n\n' +
      'K (3×3):\n' + matrix_text(camera.K, 1) + '\n\n' +
      '[R | t] (3×4, mundo→cámara):\n' + matrix_text(Rt, 3) + '\n\n' +
      (piece ? 'M de ' + piece.id + ' (4×4, local→mundo):\n' + matrix_text(Scene.model_matrix(piece), 3) : '');
  }

  /** Texto del panel «Estado»: mensaje + contadores del recorte; cls = 'ok' | 'err' | ''. */
  function status_text(view, prims) {
    const last = view.last || {};
    let msg, cls = '';
    if (view.note) msg = view.note;
    else if (last.ok === false) { msg = 'Acción ' + last.action + ' rechazada: ' + last.error; cls = 'err'; }
    else { msg = 'Última acción: ' + (last.action || '—') + ' → OK'; cls = 'ok'; }
    const st = prims.stats;
    return {
      cls,
      text: msg + '\n\naristas: ' + st.edges_drawn + '/' + st.edges_total + ' dibujadas · ' + st.clipped_near +
        ' recortadas contra el plano cercano · ' + st.culled_behind + ' detrás de la cámara · ' + st.offscreen +
        ' fuera de pantalla · ' + st.invalid + ' inválidas' + (prims.error ? '\nERROR: ' + prims.error : ''),
    };
  }

  /** Conecta el HUD con el DOM. on_select(index) se llama al pulsar un botón de pieza. */
  function mount(doc, on_select) {
    const $ = (id) => doc.getElementById(id);
    const cache = new Map();
    const set = (el, str, cls) => {
      if (cache.get(el) !== str) { el.textContent = str; cache.set(el, str); }
      if (cls !== undefined && el.className !== cls) el.className = cls;
    };

    function build_piece_buttons(scene) {
      const box = $('piece-list');
      box.textContent = '';
      scene.pieces.forEach((p, i) => {
        const b = doc.createElement('button');
        b.textContent = (i + 1) + ' · ' + p.type;
        b.title = Scene.PIECE_DEFS[p.type].name;
        b.style.borderColor = Render.piece_color(p.type);
        b.dataset.id = p.id;
        b.addEventListener('click', () => on_select(i));
        box.appendChild(b);
      });
    }

    /** view: de Controller.tick; camera: de Camera.build_camera; prims: de Projection.project. */
    function render(view, camera, prims) {
      const badge = $('mode-badge');
      set(badge, 'Modo: ' + (MODE_LABEL[view.mode] || view.mode), 'badge ' + (view.mode === 'normal' ? '' : view.mode));
      const act = active_piece(view.scene);
      for (const b of $('piece-list').children) {
        const on = !!act && b.dataset.id === act.id;
        if (b.classList.contains('active') !== on) b.classList.toggle('active', on);
      }
      set($('piece-info'), piece_text(view.scene));
      set($('cam-info'), camera_text(camera));
      set($('matrices'), matrices_text(camera, act));
      const s = status_text(view, prims);
      set($('status'), s.text, s.cls);
      const cap = $('caption');
      if (view.caption) { set(cap, view.caption); cap.hidden = false; } else if (!cap.hidden) cap.hidden = true;
    }

    return { build_piece_buttons, render, set_status_error: (msg) => set($('status'), msg, 'err') };
  }

  const Hud = { matrix_text, piece_text, camera_text, matrices_text, status_text, mount };
  root.Hud = Hud;
  if (typeof module !== 'undefined' && module.exports) module.exports = Hud;
})(typeof globalThis !== 'undefined' ? globalThis : this);
