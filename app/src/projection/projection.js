/*
 * projection.js — MÓDULO PROYECCIÓN (rol B, parte 2: proyección en perspectiva y recorte).
 *
 * Recibe geometría YA en coordenadas del mundo (Geometry3D) y una Camera; no sabe nada de las reglas
 * de las piezas. Implementa explícitamente:
 *     X_c = R·X_w + t           (mundo -> cámara)
 *     [p1 p2 p3]ᵀ = K·X_c ,  λ = p3 = z_c ,  u = p1/λ ,  v = p2/λ    (división en perspectiva)
 * con recorte de cada segmento contra el plano cercano z_c ≥ near ANTES de dividir, y recorte 2D contra
 * el viewport (Liang–Barsky).
 *
 * API pública:
 *   project(geometry3D, camera, viewport) -> DrawPrimitives2D
 *   project_point(X_world, camera)        -> { ok, u, v, z_cam, X_cam, reason }
 *   project_points(points, camera)        -> arreglo de lo anterior
 *   to_camera(X_world, camera) / camera_to_pixel(X_cam, K) / clip_segment_near / clip_segment_viewport
 *
 * Política de errores: NINGUNA función lanza. Cámara/viewport/geometría inválidos -> resultado vacío con
 * `error` descriptivo. Vértices NaN/±Infinity -> el segmento se descarta y se cuenta en stats.invalid.
 * Un punto con z_c < near -> ok:false (reason 'behind_near'); nunca se divide por cero.
 */
(function (root) {
  'use strict';
  const LA = root.LinAlg || require('../core/linalg.js');

  function is_camera(c) {
    return !!c && typeof c === 'object'
      && Array.isArray(c.K) && c.K.length === 3 && Array.isArray(c.R) && c.R.length === 3
      && Array.isArray(c.t) && c.t.length === 3 && LA.allFinite(c.K) && LA.allFinite(c.R) && LA.allFinite(c.t)
      && typeof c.near === 'number' && Number.isFinite(c.near) && c.near > 0;
  }

  /** X_c = R·X_w + t. Devuelve null si X_w no es un Vec3 finito. */
  function to_camera(X, camera) {
    if (!Array.isArray(X) || X.length < 3 || !LA.allFinite([X[0], X[1], X[2]])) return null;
    const R = camera.R, t = camera.t;
    return [
      R[0][0] * X[0] + R[0][1] * X[1] + R[0][2] * X[2] + t[0],
      R[1][0] * X[0] + R[1][1] * X[1] + R[1][2] * X[2] + t[1],
      R[2][0] * X[0] + R[2][1] * X[1] + R[2][2] * X[2] + t[2],
    ];
  }

  /** p = K·X_c; λ = p3; (u,v) = (p1/λ, p2/λ). Devuelve null si λ no es > 0 o el resultado no es finito. */
  function camera_to_pixel(Xc, K) {
    const p = LA.mulVec(K, Xc);
    const lambda = p[2];
    if (!(lambda > 0)) return null;
    const u = p[0] / lambda, v = p[1] / lambda;
    if (!Number.isFinite(u) || !Number.isFinite(v)) return null;
    return { u, v, lambda };
  }

  /**
   * Recorta el segmento A–B (coordenadas de CÁMARA) contra el semiespacio z ≥ near.
   * Devuelve null si queda totalmente fuera; si cruza el plano, sustituye el extremo exterior por la
   * intersección P = A + s·(B − A), s = (near − zA)/(zB − zA) (la perspectiva conserva las rectas, así que
   * interpolar en 3D es exacto). Resultado: { A, B, clipped }.
   */
  function clip_segment_near(A, B, near) {
    const inA = A[2] >= near, inB = B[2] >= near;
    if (inA && inB) return { A, B, clipped: false };
    if (!inA && !inB) return null;
    const s = (near - A[2]) / (B[2] - A[2]);
    const P = [A[0] + s * (B[0] - A[0]), A[1] + s * (B[1] - A[1]), near];
    return inA ? { A, B: P, clipped: true } : { A: P, B, clipped: true };
  }

  /** Liang–Barsky contra [0,w]×[0,h]. Devuelve [x1,y1,x2,y2] recortado o null si queda fuera. */
  function clip_segment_viewport(x1, y1, x2, y2, w, h) {
    const dx = x2 - x1, dy = y2 - y1;
    let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dy, dy];
    const q = [x1, w - x1, y1, h - y1];
    for (let i = 0; i < 4; i++) {
      if (p[i] === 0) {
        if (q[i] < 0) return null;
      } else {
        const r = q[i] / p[i];
        if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
        else { if (r < t0) return null; if (r < t1) t1 = r; }
      }
    }
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  }

  /** Proyecta un punto del mundo. ok:false con reason 'invalid' | 'behind_near' (sin u,v). */
  function project_point(X, camera) {
    if (!is_camera(camera)) return { ok: false, reason: 'invalid_camera' };
    const Xc = to_camera(X, camera);
    if (!Xc || !LA.allFinite(Xc)) return { ok: false, reason: 'invalid' };
    if (!(Xc[2] >= camera.near)) return { ok: false, reason: 'behind_near', z_cam: Xc[2], X_cam: Xc };
    const px = camera_to_pixel(Xc, camera.K);
    if (!px) return { ok: false, reason: 'invalid', z_cam: Xc[2], X_cam: Xc };
    return { ok: true, u: px.u, v: px.v, z_cam: Xc[2], X_cam: Xc };
  }

  function project_points(points, camera) {
    return Array.isArray(points) ? points.map((X) => project_point(X, camera)) : [];
  }

  function empty_primitives(viewport, error) {
    return {
      viewport: viewport || { width: 0, height: 0 }, lines: [], error: error || null,
      stats: { edges_total: 0, edges_drawn: 0, clipped_near: 0, culled_behind: 0, offscreen: 0, invalid: 0, objects_skipped: 0 },
    };
  }

  /**
   * project(geometry3D, camera, viewport) -> DrawPrimitives2D
   *   geometry3D = { objects:[{id, role, type?, active, vertices (mundo), edges}] }  (ver scene.get_geometry)
   *   viewport   = { width, height } en píxeles (debe coincidir con el usado en build_camera: ahí está cx, cy)
   *   DrawPrimitives2D = { viewport, lines:[{id, role, type, active, x1,y1,x2,y2, z1,z2}], stats, error }
   *     (x,y) = (u,v) en píxeles; z1,z2 = profundidad z_c de los extremos (tras el recorte).
   */
  function project(geometry, camera, viewport) {
    const vp = viewport && Number.isFinite(viewport.width) && Number.isFinite(viewport.height)
      && viewport.width > 0 && viewport.height > 0 ? { width: viewport.width, height: viewport.height } : null;
    if (!vp) return empty_primitives(null, 'viewport inválido');
    if (!is_camera(camera)) return empty_primitives(vp, 'cámara inválida');
    if (!geometry || !Array.isArray(geometry.objects)) return empty_primitives(vp, 'geometría inválida');

    const out = empty_primitives(vp, null);
    const st = out.stats;
    for (const obj of geometry.objects) {
      if (!obj || !Array.isArray(obj.vertices) || !Array.isArray(obj.edges)) { st.objects_skipped++; continue; }
      const Xc = obj.vertices.map((X) => to_camera(X, camera));
      for (const e of obj.edges) {
        st.edges_total++;
        const A = Xc[e[0]], B = Xc[e[1]];
        if (!A || !B) { st.invalid++; continue; }
        const c = clip_segment_near(A, B, camera.near);
        if (!c) { st.culled_behind++; continue; }
        if (c.clipped) st.clipped_near++;
        const pa = camera_to_pixel(c.A, camera.K), pb = camera_to_pixel(c.B, camera.K);
        if (!pa || !pb) { st.invalid++; continue; }
        const s = clip_segment_viewport(pa.u, pa.v, pb.u, pb.v, vp.width, vp.height);
        if (!s) { st.offscreen++; continue; }
        st.edges_drawn++;
        out.lines.push({
          id: obj.id, role: obj.role, type: obj.type, active: !!obj.active,
          x1: s[0], y1: s[1], x2: s[2], y2: s[3], z1: c.A[2], z2: c.B[2],
        });
      }
    }
    return out;
  }

  const Projection = { project, project_point, project_points, to_camera, camera_to_pixel, clip_segment_near, clip_segment_viewport, is_camera };
  root.Projection = Projection;
  if (typeof module !== 'undefined' && module.exports) module.exports = Projection;
})(typeof globalThis !== 'undefined' ? globalThis : this);
