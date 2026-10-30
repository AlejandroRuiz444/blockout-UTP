/*
 * homography.js — MÓDULO PROYECCIÓN (rol B, parte 3: experimento de homografía).
 *
 * Terminología (precisión que exige el enunciado):
 *   - La cámara es una proyección 3D->2D de 3×4 (P = K[R|t]); NO es una homografía.
 *   - Una transformación proyectiva 3D es una matriz 4×4 no singular (las rígidas son un caso particular).
 *   - Una HOMOGRAFÍA relaciona las imágenes de puntos de un PLANO y es una matriz 3×3.
 *
 * Derivación (plano Z = z0 del mundo). Un punto del plano es X = [X, Y, z0]. Con P = K[r1 r2 r3 t]:
 *     λ·x = K·(r1·X + r2·Y + r3·z0 + t) = K·[r1 r2 (z0·r3 + t)]·[X Y 1]ᵀ   =>   H_i = K_i·[r1 r2 (z0·r3 + t_i)]
 *   (para z0 = 0: H_i = K_i·[r1 r2 t_i], es decir, las columnas 1, 2 y 4 de P_i). Entre dos vistas:
 *     x_2 ~ H_2·H_1⁻¹·x_1   =>   H_21 = H_2·H_1⁻¹.
 *   Rotación pura (mismo centro de cámara): x_2 ~ K_2·R_21·K_1⁻¹·x_1 con R_21 = R_2·R_1ᵀ, válida para TODO punto 3D.
 *
 * Política de errores: ninguna función lanza. Entradas inválidas -> null (o {ok:false, error}) y
 * run_experiment devuelve { error } si no puede construirse.
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');
  const Camera = root.Camera || require('./camera.js');
  const Projection = root.Projection || require('./projection.js');
  const DEG = Math.PI / 180;

  // ------------------------------------------------------------------ núcleo
  /** H_i = K·[r1 r2 (z0·r3 + t)] (3×3), imagen del plano Z = z0. null si la cámara es inválida. */
  function plane_homography(camera, z0) {
    if (!Projection.is_camera(camera)) return null;
    z0 = Number.isFinite(z0) ? z0 : 0;
    const R = camera.R, t = camera.t;
    const Hn = [0, 1, 2].map((i) => [R[i][0], R[i][1], z0 * R[i][2] + t[i]]);
    return LA.matMul(camera.K, Hn);
  }

  /** H_21 = H_2·H_1⁻¹: imagen 1 -> imagen 2 de los puntos del plano Z = z0. null si H_1 es singular. */
  function between_views(cam1, cam2, z0) {
    const H1 = plane_homography(cam1, z0), H2 = plane_homography(cam2, z0);
    if (!H1 || !H2) return null;
    const inv = LA.inverse(H1);
    return inv ? LA.matMul(H2, inv) : null;
  }

  /** Aplica H a un punto de imagen [u,v] (coordenadas homogéneas + división). null si w ≈ 0 o no finito. */
  function apply(H, p) {
    if (!Array.isArray(H) || !Array.isArray(p) || !LA.allFinite(H) || !LA.allFinite([p[0], p[1]])) return null;
    const x = H[0][0] * p[0] + H[0][1] * p[1] + H[0][2];
    const y = H[1][0] * p[0] + H[1][1] * p[1] + H[1][2];
    const w = H[2][0] * p[0] + H[2][1] * p[1] + H[2][2];
    if (!(Math.abs(w) > 1e-12)) return null;
    const u = x / w, v = y / w;
    return Number.isFinite(u) && Number.isFinite(v) ? [u, v] : null;
  }

  /** H = K2·R21·K1⁻¹ con R21 = R2·R1ᵀ. Solo es válida si los centros coinciden. */
  function rotation_homography(cam1, cam2) {
    if (!Projection.is_camera(cam1) || !Projection.is_camera(cam2)) return { ok: false, error: 'cámara inválida' };
    const R21 = LA.matMul(cam2.R, LA.transpose(cam1.R));
    const K1inv = LA.inverse(cam1.K);
    if (!K1inv) return { ok: false, error: 'K1 singular' };
    const dc = LA.norm(LA.vsub(cam1.C, cam2.C));
    return { ok: true, H: LA.matMul(cam2.K, LA.matMul(R21, K1inv)), center_distance: dc };
  }

  /** Normalización de Hartley: T lleva el centroide al origen y la distancia media a √2. null si degenera. */
  function normalization(pts) {
    const n = pts.length;
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p[0]; cy += p[1]; }
    cx /= n; cy /= n;
    let d = 0;
    for (const p of pts) d += Math.hypot(p[0] - cx, p[1] - cy);
    d /= n;
    if (!(d > 1e-12)) return null;
    const s = Math.SQRT2 / d;
    return [[s, 0, -s * cx], [0, s, -s * cy], [0, 0, 1]];
  }

  function valid_pts(a) { return Array.isArray(a) && a.every((p) => Array.isArray(p) && p.length >= 2 && LA.allFinite([p[0], p[1]])); }

  /**
   * DLT (Direct Linear Transform) para H tal que dst ~ H·src, con ≥ 4 correspondencias [u,v].
   * Cada par aporta 2 filas de A (2n×9); h = autovector de AᵀA con el menor autovalor (Jacobi), con
   * normalización de Hartley opcional (opts.normalize, por defecto true). Devuelve { ok, H, error }.
   */
  function dlt(src, dst, opts) {
    const normalize = !opts || opts.normalize !== false;
    if (!valid_pts(src) || !valid_pts(dst) || src.length !== dst.length || src.length < 4) {
      return { ok: false, H: null, error: 'se necesitan ≥ 4 correspondencias [u,v] finitas' };
    }
    const T1 = normalize ? normalization(src) : LA.identity(3);
    const T2 = normalize ? normalization(dst) : LA.identity(3);
    if (!T1 || !T2) return { ok: false, H: null, error: 'puntos degenerados (todos iguales)' };
    const A = [];
    for (let i = 0; i < src.length; i++) {
      const a = LA.mulVec(T1, [src[i][0], src[i][1], 1]), b = LA.mulVec(T2, [dst[i][0], dst[i][1], 1]);
      const x = a[0] / a[2], y = a[1] / a[2], xp = b[0] / b[2], yp = b[1] / b[2];
      A.push([-x, -y, -1, 0, 0, 0, xp * x, xp * y, xp]);
      A.push([0, 0, 0, -x, -y, -1, yp * x, yp * y, yp]);
    }
    const S = LA.matMul(LA.transpose(A), A);
    const h = LA.symEigen(S).vectors[0];
    const Hn = [h.slice(0, 3), h.slice(3, 6), h.slice(6, 9)];
    const T2inv = LA.inverse(T2);
    if (!T2inv) return { ok: false, H: null, error: 'normalización singular' };
    let H = LA.matMul(T2inv, LA.matMul(Hn, T1));
    const s = Math.abs(H[2][2]) > 1e-12 ? H[2][2] : Math.sqrt(H.reduce((acc, r) => acc + r.reduce((q, v) => q + v * v, 0), 0));
    H = LA.scale(H, 1 / s);
    if (!LA.allFinite(H)) return { ok: false, H: null, error: 'DLT no finito' };
    return { ok: true, H, error: null };
  }

  /** Menor área de triángulo entre todas las ternas (0 ⇒ hay 3 colineales). Para validar "posición general". */
  function min_triangle_area(pts) {
    let m = Infinity;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) for (let k = j + 1; k < pts.length; k++) {
      const a = Math.abs((pts[j][0] - pts[i][0]) * (pts[k][1] - pts[i][1]) - (pts[k][0] - pts[i][0]) * (pts[j][1] - pts[i][1])) / 2;
      if (a < m) m = a;
    }
    return m;
  }

  // ------------------------------------------------------ ruido reproducible
  /** PRNG mulberry32 (determinista para una semilla dada). */
  function make_rng(seed) {
    let a = seed | 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** N(0,1) por Box–Muller. */
  function gaussian(rng) { return Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng()); }

  /**
   * Una realización del DLT con ruido: perturba con N(0, σ²) las coordenadas (x1 y x2) de los puntos marcados
   * used_for_dlt de `points` ([{x1, x2_true, used_for_dlt}]), estima H por DLT normalizado y la evalúa en TODOS los
   * puntos contra x2_true. Determinista para una semilla dada. Devuelve null si el DLT falla.
   */
  function noisy_fit(points, sigma, seed) {
    const rng = make_rng(seed);
    const est = points.filter((p) => p.used_for_dlt);
    const ns = est.map((p) => [p.x1[0] + sigma * gaussian(rng), p.x1[1] + sigma * gaussian(rng)]);
    const nd = est.map((p) => [p.x2_true[0] + sigma * gaussian(rng), p.x2_true[1] + sigma * gaussian(rng)]);
    const f = dlt(ns, nd, { normalize: true });
    if (!f.ok) return null;
    const out = points.map((p) => { const q = apply(f.H, p.x1); return { X: p.X, x2_true: p.x2_true, x2_noisy_dlt: q, err: q ? dist2(q, p.x2_true) : NaN, used_for_dlt: p.used_for_dlt }; });
    return { sigma, seed, H: f.H, points: out, rms: rms(out.map((q) => q.err).filter(Number.isFinite)) };
  }

  // --------------------------------------------------------------- experimento
  const dist2 = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const rms = (xs) => Math.sqrt(xs.reduce((s, e) => s + e * e, 0) / (xs.length || 1));

  function default_experiment_config() {
    return {
      viewport: { width: 640, height: 480 },
      view1: { azimuth: -60 * DEG, elevation: 40 * DEG, distance: 15, target: [2.5, 2.5, 1], fov_y: 40 * DEG },
      view2: { azimuth: -5 * DEG, elevation: 30 * DEG, distance: 15, target: [2.5, 2.5, 1], fov_y: 40 * DEG },
      // puntos del plano Z = 0 (posición general: sin tres colineales)
      est_points: [[0.6, 0.7], [4.3, 0.9], [3.8, 4.4], [1.1, 3.9]],            // los 4 que usa el DLT
      val_points: [[2.2, 0.2], [3.3, 2.1], [1.9, 2.5], [2.7, 3.9], [4.7, 2.7], [0.2, 2.1]], // de comprobación (hold-out)
      off_plane_z: [0.5, 1, 2, 4, 8],
      off_plane_detail_z: 2,
      sigmas: [0, 0.1, 0.25, 0.5, 1, 2],
      trials: 300,
      seed: 20260101,
      example_sigma: 0.5,
      example_seed: 7,
      // rotación pura: mismo centro que la vista 1, otra orientación y otra focal
      pure_rotation: { look_offset: [3, -2, 2], fov_y: 55 * DEG },
    };
  }

  function make_cam(view, viewport) {
    return Camera.build_camera(Object.assign({}, view, { viewport }));
  }

  /**
   * Ejecuta TODO el experimento y devuelve el informe (JSON-friendly salvo cam1/cam2/cam_rot):
   *   plane: errores por punto (px) y RMS de la H analítica y de la H por DLT (sin ruido), sobre puntos del plano Z=0;
   *   noise: RMS del DLT (sobre puntos de comprobación) frente a σ, promediado en `trials` ensayos con semilla fija;
   *   off_plane: error de paralaje al usar H_21 con puntos de Z > 0 (centro de cámara distinto);
   *   pure_rotation: mismo experimento con el mismo centro de cámara (H = K2 R21 K1⁻¹).
   */
  function run_experiment(config) {
    try {
      return run_experiment_unsafe(config);
    } catch (e) {
      return { error: 'experimento interrumpido: ' + e.message };
    }
  }

  function run_experiment_unsafe(config) {
    const cfg = Object.assign(default_experiment_config(), config && typeof config === 'object' ? config : {});
    const cam1 = make_cam(cfg.view1, cfg.viewport), cam2 = make_cam(cfg.view2, cfg.viewport);
    const H1 = plane_homography(cam1, 0), H2 = plane_homography(cam2, 0), H21 = between_views(cam1, cam2, 0);
    if (!H1 || !H2 || !H21) return { error: 'no se pudo derivar H21 (cámara o plano degenerados)' };

    const all = cfg.est_points.concat(cfg.val_points);
    const img = (cam, X) => { const r = Projection.project_point(X, cam); return r.ok ? [r.u, r.v] : null; };
    const pts3 = all.map(([x, y]) => [x, y, 0]);
    const x1 = pts3.map((X) => img(cam1, X)), x2 = pts3.map((X) => img(cam2, X));
    if (x1.some((p) => !p) || x2.some((p) => !p)) return { error: 'algún punto del plano queda detrás de la cámara' };

    // 1) H analítica vs DLT (sin ruido): 4 correspondencias de estimación
    const nEst = cfg.est_points.length;
    const fit = dlt(x1.slice(0, nEst), x2.slice(0, nEst), { normalize: true });
    const fit_raw = dlt(x1.slice(0, nEst), x2.slice(0, nEst), { normalize: false });
    if (!fit.ok) return { error: 'DLT falló: ' + fit.error };
    const plane_points = all.map((XY, i) => {
      const pH = apply(H21, x1[i]), pD = apply(fit.H, x1[i]);
      return { X: pts3[i], used_for_dlt: i < nEst, x1: x1[i], x2_true: x2[i], x2_H: pH, x2_dlt: pD, err_H: dist2(pH, x2[i]), err_dlt: dist2(pD, x2[i]) };
    });
    const valRows = plane_points.filter((p) => !p.used_for_dlt);
    const evalHeldOut = (H) => rms(valRows.map((p, i) => dist2(apply(H, x1[nEst + i]), x2[nEst + i])));
    const plane = {
      points: plane_points,
      rms_H: rms(plane_points.map((p) => p.err_H)),
      rms_dlt: rms(plane_points.map((p) => p.err_dlt)),
      rms_dlt_heldout: rms(valRows.map((p) => p.err_dlt)),
      rms_dlt_unnormalized_heldout: fit_raw.ok ? evalHeldOut(fit_raw.H) : null,
      min_triangle_area: min_triangle_area(all),
      min_triangle_area_est: min_triangle_area(cfg.est_points),
    };

    // 2) ruido gaussiano en las 4 correspondencias (src y dst), evaluado sobre puntos de comprobación
    const noiseRows = cfg.sigmas.map((sigma, si) => {
      const rng = make_rng(cfg.seed + 7919 * si);
      const vals = [];
      for (let k = 0; k < cfg.trials; k++) {
        const ns = x1.slice(0, nEst).map((p) => [p[0] + sigma * gaussian(rng), p[1] + sigma * gaussian(rng)]);
        const nd = x2.slice(0, nEst).map((p) => [p[0] + sigma * gaussian(rng), p[1] + sigma * gaussian(rng)]);
        const f = dlt(ns, nd, { normalize: true });
        if (f.ok) vals.push(evalHeldOut(f.H));
      }
      const mean = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
      const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) * (v - mean), 0) / (vals.length || 1));
      return { sigma, mean_rms: mean, std_rms: sd, trials: vals.length };
    });
    const noise_example = noisy_fit(plane_points, cfg.example_sigma, cfg.example_seed);

    // 3) fuera del plano: la misma H_21 con puntos de Z > 0 (paralaje)
    const off_levels = cfg.off_plane_z.map((Z) => {
      const rows = [];
      for (const [x, y] of all) {
        const X = [x, y, Z], a = img(cam1, X), b = img(cam2, X);
        if (!a || !b) continue;
        const pred = apply(H21, a);
        rows.push({ X, x1: a, x2_true: b, x2_pred: pred, err: dist2(pred, b) });
      }
      return { Z, points: rows, rms: rms(rows.map((r) => r.err)), max: Math.max(...rows.map((r) => r.err)) };
    });

    // 4) caso especial: mismo centro de cámara (rotación pura)
    const pr = cfg.pure_rotation;
    const camRot = Camera.build_camera({
      eye: cam1.C, target: LA.vadd(cfg.view1.target, pr.look_offset), fov_y: pr.fov_y, viewport: cfg.viewport,
    });
    const rot = rotation_homography(cam1, camRot);
    let pure_rotation = { ok: false, error: rot.error || 'sin datos' };
    if (rot.ok) {
      const Hplane = between_views(cam1, camRot, 0);
      const norm = (H) => LA.scale(H, 1 / H[2][2]);
      const Hn = norm(rot.H), Pn = Hplane ? norm(Hplane) : null;
      const levels = [0, 1, 2, 4, 8].map((Z) => {
        const rows = [];
        for (const [x, y] of all) {
          const X = [x, y, Z], a = img(cam1, X), b = img(camRot, X);
          if (!a || !b) continue;
          rows.push({ X, x1: a, x2_true: b, x2_pred: apply(rot.H, a), err: dist2(apply(rot.H, a), b) });
        }
        return { Z, points: rows, rms: rms(rows.map((r) => r.err)), max: Math.max(...rows.map((r) => r.err)) };
      });
      pure_rotation = {
        ok: true, center_distance: rot.center_distance, H: rot.H, cam2: camRot, levels,
        max_diff_vs_plane_H: Pn ? LA.maxAbs(LA.sub(Hn, Pn)) : null,
      };
    }

    return {
      error: null, config: cfg, cam1, cam2, baseline: LA.norm(LA.vsub(cam1.C, cam2.C)),
      // comprobación estructural: para Z = 0, H_i coincide con las columnas 1, 2 y 4 de P_i
      H1, H2, H21, H_dlt: fit.H, H_vs_P_columns_diff: LA.maxAbs(LA.sub(H1, cam1.P.map((row) => [row[0], row[1], row[3]]))),
      plane, noise: { sigmas: cfg.sigmas, trials: cfg.trials, seed: cfg.seed, rows: noiseRows }, noise_example,
      off_plane: { levels: off_levels, detail_z: cfg.off_plane_detail_z }, pure_rotation,
    };
  }

  // ---------------------------------------------------------------- formateo
  function fe(x) {
    if (x === null || x === undefined || !Number.isFinite(x)) return '—';
    return Math.abs(x) < 1e-3 && x !== 0 ? x.toExponential(2) : x.toFixed(3);
  }
  const pt = (p) => (p ? '(' + p[0].toFixed(2) + ', ' + p[1].toFixed(2) + ')' : '—');
  const mat = (H) => H.map((r) => '[' + r.map((v) => v.toFixed(5)).join(', ') + ']').join('\n');

  /** Informe en tablas Markdown (legibles también en texto plano); se usa en la UI y en docs/INFORME.md. */
  function report_markdown(r) {
    if (!r || r.error) return 'Experimento no disponible: ' + (r && r.error);
    const L = [];
    L.push('Vistas: distancia entre centros de cámara (línea base) = ' + r.baseline.toFixed(3) + ' unidades; viewport ' + r.config.viewport.width + '×' + r.config.viewport.height + ' px.');
    L.push('Puntos en posición general: menor área de triángulo entre todas las ternas posibles = ' + r.plane.min_triangle_area.toFixed(3) + ' (>0: no hay 3 colineales).');
    L.push('');
    L.push('### Plano Z = 0: H analítica (H21 = H2·H1⁻¹) vs DLT normalizado, sin ruido (error en px respecto de la proyección real)');
    L.push('');
    L.push('| punto (X, Y, 0) | usado en DLT | x1 (u, v) | x2 real (u, v) | error H analítica [px] | error DLT [px] |');
    L.push('|---|---|---|---|---|---|');
    for (const p of r.plane.points) {
      L.push('| (' + p.X[0].toFixed(1) + ', ' + p.X[1].toFixed(1) + ', 0) | ' + (p.used_for_dlt ? 'sí' : 'no') + ' | ' + pt(p.x1) + ' | ' + pt(p.x2_true) + ' | ' + fe(p.err_H) + ' | ' + fe(p.err_dlt) + ' |');
    }
    L.push('');
    L.push('RMS H analítica (10 puntos) = ' + fe(r.plane.rms_H) + ' px · RMS DLT (10 puntos) = ' + fe(r.plane.rms_dlt) + ' px · RMS DLT solo en los 6 puntos no usados = ' + fe(r.plane.rms_dlt_heldout) + ' px (sin normalizar: ' + fe(r.plane.rms_dlt_unnormalized_heldout) + ' px).');
    L.push('');
    L.push('### Ruido gaussiano en las 4 correspondencias del DLT (σ en px; RMS medio sobre los 6 puntos no usados; ' + r.noise.trials + ' ensayos, semilla ' + r.noise.seed + ')');
    L.push('');
    L.push('| σ [px] | RMS medio [px] | desv. típica [px] | RMS/σ |');
    L.push('|---|---|---|---|');
    for (const q of r.noise.rows) L.push('| ' + q.sigma + ' | ' + fe(q.mean_rms) + ' | ' + fe(q.std_rms) + ' | ' + (q.sigma > 0 ? (q.mean_rms / q.sigma).toFixed(2) : '—') + ' |');
    L.push('');
    L.push('### Fuera del plano: la misma H21 con puntos de Z > 0 (centros de cámara distintos) — error de paralaje en px');
    L.push('');
    L.push('| Z | RMS [px] | máximo [px] |');
    L.push('|---|---|---|');
    for (const q of r.off_plane.levels) L.push('| ' + q.Z + ' | ' + fe(q.rms) + ' | ' + fe(q.max) + ' |');
    const det = r.off_plane.levels.find((q) => q.Z === r.off_plane.detail_z);
    if (det) {
      L.push('');
      L.push('Detalle para Z = ' + det.Z + ':');
      L.push('');
      L.push('| punto (X, Y, Z) | x2 real (u, v) | x2 predicho por H21 (u, v) | error [px] |');
      L.push('|---|---|---|---|');
      for (const p of det.points) L.push('| (' + p.X.map((v) => v.toFixed(1)).join(', ') + ') | ' + pt(p.x2_true) + ' | ' + pt(p.x2_pred) + ' | ' + fe(p.err) + ' |');
    }
    const pr = r.pure_rotation;
    L.push('');
    L.push('### Caso especial: mismo centro de cámara (rotación pura, H = K2·R21·K1⁻¹)');
    L.push('');
    if (pr && pr.ok) {
      L.push('Distancia entre centros = ' + fe(pr.center_distance) + ' (≈ 0). H coincide con la H inducida por el plano salvo ' + fe(pr.max_diff_vs_plane_H) + ' (matrices normalizadas con h33 = 1).');
      L.push('');
      L.push('| Z | RMS [px] | máximo [px] |');
      L.push('|---|---|---|');
      for (const q of pr.levels) L.push('| ' + q.Z + ' | ' + fe(q.rms) + ' | ' + fe(q.max) + ' |');
    } else {
      L.push('No disponible: ' + (pr && pr.error));
    }
    return L.join('\n');
  }

  const Homography = {
    plane_homography, between_views, apply, rotation_homography, dlt, normalization, min_triangle_area,
    make_rng, gaussian, noisy_fit, default_experiment_config, run_experiment, report_markdown, matrix_text: mat,
  };
  root.Homography = Homography;
  if (typeof module !== 'undefined' && module.exports) module.exports = Homography;
})(typeof globalThis !== 'undefined' ? globalThis : this);
